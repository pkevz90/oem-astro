const app = new Vue({
    el: '#main-app',
    data: {
        time: Date.now(),
        timeStep: 10,
        drawStep: 1,
        maneuver: {
            exist: false,
            r: 0,
            i: 0,
            c: 0,
            line: undefined,
            hist: [],
            sma: 7000,
            ecc: 0,
            inc: 0 * Math.PI / 180,
            raan: 213.1162 * Math.PI / 180,
            argP: 270.9418 * Math.PI / 180,
            mA: 0,
            tail: 0.5,
            ecef: {
                shown: false,
                animate: 0
            },
            color: '#FFFFFF',
        },
        common: false,
        jdTimeStart: 0,
        pause: false,
        Earth: undefined,
        clouds: undefined,
        stars: undefined,
        sunlight: undefined,
        threeJsVar: {},
        raanOffest: 0,
        earthRot: 2 * Math.PI / 86164,
        eci: true,
        data: false,
        sunVec: undefined,
        controls: false,
        cameraTarget: 'earth',
        satellites: [
            {
                name: 'GEO 1',
                sma: 7000,
                ecc: 0,
                inc: 0 * Math.PI / 180,
                raan: 213.1162 * Math.PI / 180,
                argP: 270.9418 * Math.PI / 180,
                mA: 0,
                hist: [],
                ecef: {
                    shown: false,
                    animate: 0,
                },
                line: undefined,
                shown: true,
                color: '#FF0000',
                tail: 1
            }
        ]
    },
    watch: {
        tail: function() {
            this.satellites.forEach(sat => sat.hist = [])
        },
        timeStep: function() {
            this.satellites.forEach(sat => sat.hist = [])
        },
        drawStep: function() {
            this.satellites.forEach(sat => sat.hist = [])
        }
    },
    methods: {
        render: function() {
            if (this.data) {
                console.time('render')
            }
            
            this.satellites.forEach(sat => {
                this.drawSatellite(sat);
                if (sat.shown && this.maneuver.exist && math.norm([this.maneuver.r, this.maneuver.i, this.maneuver.c]) > 1e-3 && this.maneuver.tail > 0) {
                    try {
                        this.maneuver.line.traj.visible = true;
                        this.maneuver.line.point.visible = true;
                    }
                    catch (err) {

                    }
                    let manCoe = {
                        a: sat.sma,
                        e: sat.ecc,
                        raan: sat.raan + this.raanOffest,
                        arg: sat.argP,
                        i: sat.inc,
                        tA: Eccentric2True(sat.ecc, solveKeplersEquation(sat.mA, sat.ecc))
                    }
                    calcManeuver(manCoe, {r: this.maneuver.r, i: this.maneuver.i, c: this.maneuver.c}, sat.ecef);
                }
                else if ((sat.shown && !this.maneuver.exist) || math.norm([this.maneuver.r, this.maneuver.i, this.maneuver.c]) < 1e-3 || this.maneuver.tail === 0) {
                    try {
                        this.maneuver.line.traj.visible = false;
                        this.maneuver.line.point.visible = false;
                    }
                    catch (err) {

                    }
                    
                }
            });
            if (this.cameraTarget !== 'earth') {
                this.threeJsVar.controls.target.x = this.satellites[this.cameraTarget].hist[0].x;
                this.threeJsVar.controls.target.y = this.satellites[this.cameraTarget].hist[0].y;
                this.threeJsVar.controls.target.z = this.satellites[this.cameraTarget].hist[0].z;
            }
            this.Earth.rotation.y  +=  this.eci ? this.earthRot * this.timeStep : 0;
            this.clouds.rotation.y +=  this.eci ? this.earthRot * this.timeStep : 0;
            this.raanOffest -= this.eci ? 0 : this.earthRot * this.timeStep;
            this.stars.rotation.y -= this.eci ? 0 : this.earthRot * this.timeStep;
            let sun = math.multiply(axis3rotation(this.raanOffest), app.sunVec)
            app.sunlight.position.set(-100 * sun[0][0], 100 * sun[2][0], 100 *sun[1][0]);
            this.threeJsVar.renderer.render(this.threeJsVar.scene, this.threeJsVar.camera);
            this.threeJsVar.controls.update();

            if (this.data) {
                console.timeEnd('render')
            }
            this.data = false;
            requestAnimationFrame(this.render);
        },
        drawSatellite: function(sat, forward = false) {
            
            sat.mA += Math.sqrt(398600.4418 / sat.sma / sat.sma / sat.sma) * this.timeStep;
            sat.hist = this.calcSatellite(sat, forward)
            
            if (sat.line === undefined) {
                sat.line = this.buildSatGeometry(sat.hist, sat.color, sat.tail !== 0);
            }
            else {
                sat.line.point.position.x = sat.hist[0].x;
                sat.line.point.position.y = sat.hist[0].y;
                sat.line.point.position.z = sat.hist[0].z;
                
                if (sat.tail !== 0) {
                    const points = new THREE.CatmullRomCurve3(sat.hist, false).getPoints( 300);
                    sat.line.traj.geometry.setFromPoints(points);
                }
                else {
                    sat.line.traj.geometry.setFromPoints(sat.hist);
                }
            }
        },
        calcSatellite: function(sat, forward = false, ecef = false) {
            let n = Math.sqrt(398600.4418 / sat.sma / sat.sma / sat.sma), hist = [], state;
            let coeCalc = {
                a: sat.sma,
                e: sat.ecc,
                raan: sat.raan + this.raanOffest,
                arg: sat.argP,
                i: sat.inc,
                mA: sat.mA,
                tA: 0
            };
            if (sat.tail === 0) {
                coeCalc.tA = Eccentric2True(coeCalc.e, solveKeplersEquation(coeCalc.mA, coeCalc.e));
                state = Coe2PosVelObject(coeCalc);
                hist.push(new THREE.Vector3(-state.x / 6371, state.z / 6371, state.y / 6371));
                return hist;
            }
            let tailTime = sat.tail * 2 * Math.PI / n;
            let nPoints = Math.floor(sat.tail * 30);
            // Calculate points based off of Eccentric Anomaly (named true anomaly by mistake, do not feel like fixing)
            let t0 = solveKeplersEquation(coeCalc.mA, coeCalc.e);
            let tf = solveKeplersEquation(coeCalc.mA - (forward ? -1 : 1 ) * (nPoints - 1) * (tailTime / (nPoints - 1)) * n, coeCalc.e);
            let tA = math.range(t0, tf, (tf - t0) / (nPoints - 1), true)._data;
            let time = tA.map(t => -(coeCalc.mA - (t - coeCalc.e * Math.sin(t))) / n)
            if (!ecef) {
                if (sat.ecef.shown && sat.ecef.animate !== 1) {
                    sat.ecef.animate = sat.ecef.animate > 1 ? 1 : sat.ecef.animate + 0.0333333 / sat.sma * 10000;
                    sat.ecef.animate = sat.ecef.animate > 1 ? 1 : sat.ecef.animate;
                }
                else if (!sat.ecef.shown && sat.ecef.animate !== 0) {
                    sat.ecef.animate = sat.ecef.animate < 0 ? 0 : sat.ecef.animate - 0.0333333 / sat.sma * 10000;
                    sat.ecef.animate = sat.ecef.animate < 0 ? 0 : sat.ecef.animate;
                }
            }
            for (let ii = 0; ii < tA.length; ii++) { 
                coeCalc.tA = Eccentric2True(coeCalc.e, tA[ii]);
                state = Coe2PosVelObject(coeCalc);
                if (ecef.shown) {
                    let r = [[state.x],[state.y],[state.z]];
                    r = math.multiply(axis3rotation(-time[ii] * this.earthRot * ecef.animate), r);
                    state = {
                        x: r[0][0],
                        y: r[1][0],
                        z: r[2][0]
                    }
                }
                else {
                    if (sat.ecef.shown | sat.ecef.animate > 0) {
                        let r = [[state.x],[state.y],[state.z]];
                        r = math.multiply(axis3rotation(-time[ii] * this.earthRot * sat.ecef.animate), r);
                        state = {
                            x: r[0][0],
                            y: r[1][0],
                            z: r[2][0]
                        }
                    }
                }
                
                hist.push(new THREE.Vector3(-state.x / 6371, state.z / 6371, state.y / 6371));
            }
            return hist;
        },
        buildSatGeometry: function(hist, color = '#FF0000', tail = true) {
            let material = new THREE.LineBasicMaterial({
                color: color,
                linewidth: 2
            }), geometry;
            if (tail) {
                const curve = new THREE.CatmullRomCurve3(hist);
                const points = curve.getPoints( 200 );
                geometry = new THREE.BufferGeometry().setFromPoints(points);
            }
            else {
                geometry = new THREE.BufferGeometry().setFromPoints(hist);
            }
            let line = {};
            line.traj = new THREE.Line(geometry, material);
            geometry = new THREE.SphereGeometry(0.05, 10, 10);
            material = new THREE.MeshPhongMaterial({
                color: 'red'
            });
            material = new THREE.MeshBasicMaterial({
                color: 'red'
            });
            line.point = new THREE.Mesh(geometry,material);
            line.point.position.x = hist[0].x;
            line.point.position.y = hist[0].z;
            line.point.position.z = hist[0].y;
            this.threeJsVar.scene.add(line.traj);
            this.threeJsVar.scene.add(line.point);
            return line;
        },
        changeSat: function(sat) {
            this.satellites.forEach(sat => {
                sat.shown = false;
            });
            this.satellites[sat].shown = true;
        },
        changeData: function(sat) {
            this.satellites[sat].hist = [];
        },
        addSatellite: function() {
            let n = this.satellites.length - 1;
            let newSat = JSON.parse(JSON.stringify(this.satellites[n]));
            // let newSat = {...this.satellites[n]};
            newSat.name = 'Sat';
            newSat.line = undefined;
            this.satellites.push(newSat);
            this.changeSat(n+1);
        },
        changeColor: function(sat) {
            let c = hexToRgb(this.satellites[sat].color);
            this.satellites[sat].line.traj.material.color.setRGB(c.r/255,c.g/255,c.b/255);
            this.satellites[sat].line.point.material.color.setRGB(c.r/255,c.g/255,c.b/255);
        },
        changeCommon: function(orbit) {
            const sat = this.satellites.findIndex(element => element.shown);
            switch (orbit) {
                case 'geo':
                    this.satellites[sat].sma = 42164;
                    this.satellites[sat].ecc = 0;
                    this.satellites[sat].inc = 0;
                    this.satellites[sat].raan = 0;
                    this.satellites[sat].argP = 0;
                    break;
                case 'iss':
                    this.satellites[sat].sma = 6797;
                    this.satellites[sat].ecc = 0;
                    this.satellites[sat].inc = 51.6 * Math.PI / 180;
                    break;
                case 'mol':
                    this.satellites[sat].sma = 26561.74383;
                    this.satellites[sat].ecc = 0.744444;
                    this.satellites[sat].inc = 64 * Math.PI / 180;
                    this.satellites[sat].argP = 270 * Math.PI / 180;
                    break;
                case 'gps':
                    this.satellites[sat].sma = 26561.74383;
                    this.satellites[sat].ecc = 0;
                    this.satellites[sat].inc = 60 * Math.PI / 180;
                    break;
                case 'gto':
                    this.satellites[sat].sma = 24582;
                    this.satellites[sat].ecc = 0.715238;
                    this.satellites[sat].inc = 28.5 * Math.PI / 180;
                    this.satellites[sat].argP = 0 * Math.PI / 180;
                    break;
                case 'sso':
                    this.satellites[sat].sma = 7000;
                    this.satellites[sat].ecc = 0;
                    this.satellites[sat].inc = 98 * Math.PI / 180;
                    this.satellites[sat].argP = 0 * Math.PI / 180;
                    break;
            }
            this.common = false;
        }
        
    }
}) 



function setupScene() {
    app.threeJsVar.scene = new THREE.Scene();
    app.threeJsVar.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight);
    app.threeJsVar.camera.position.set(-10, 15, 10);
    app.threeJsVar.renderer = new THREE.WebGLRenderer({
        antialias: true
    });
    app.threeJsVar.renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementsByTagName('body')[0].append(app.threeJsVar.renderer.domElement);
    document.getElementsByClassName('scroll')[0].style.maxHeight = window.innerHeight * 0.8 + 'px';
    window.addEventListener('resize', () => {
        app.threeJsVar.camera.aspect = window.innerWidth / window.innerHeight;
        app.threeJsVar.camera.updateProjectionMatrix();
        app.threeJsVar.renderer.setSize(window.innerWidth, window.innerHeight);
        document.getElementsByClassName('scroll')[0].style.maxHeight = window.innerHeight * 0.8 + 'px';
    })
    app.threeJsVar.controls = new THREE.OrbitControls(app.threeJsVar.camera, app.threeJsVar.renderer.domElement);
}

function drawEarth() {
    var texture = new THREE.TextureLoader().load('.//Media/2_no_clouds_4k.jpg');
    var cloudsTexture = new THREE.TextureLoader().load('./Media/fair_clouds_4k.png');
    var geometry = new THREE.SphereGeometry(1, 64, 64);
    var material = new THREE.MeshLambertMaterial({
        map: texture
    });
    app.Earth = new THREE.Mesh(geometry, material);
    app.threeJsVar.scene.add(app.Earth);
    app.clouds = new THREE.Mesh(
        new THREE.SphereGeometry(1.003, 64, 64),
        new THREE.MeshPhongMaterial({
            map: cloudsTexture,
            transparent: true
        })
    );
    app.threeJsVar.scene.add(app.clouds);
    app.Earth.position.z = 0;
    app.Earth.rotation.y += Math.PI;
    app.clouds.rotation.y += Math.PI;
}

function drawStars() {
    var starTexture = new THREE.TextureLoader().load('./Media/galaxy_starfield.png');

    app.stars = new THREE.Mesh(
        new THREE.SphereGeometry(90, 64, 64),
        new THREE.MeshBasicMaterial({
            map: starTexture,
            side: THREE.BackSide
        })
    );
    app.threeJsVar.scene.add(app.stars);
}

function drawLightSources() {
    app.sunlight = new THREE.PointLight(0xFFFFFF, 1, 500);
    app.sunVec = sunVectorCalc(0);

    app.sunlight.position.set(-100 * app.sunVec[0][0], 100 * app.sunVec[2][0], 100 * app.sunVec[1][0]);
    app.threeJsVar.scene.add(app.sunlight);
    var light1 = new THREE.AmbientLight(0xFFFFFF, 0.2); // soft white light
    app.threeJsVar.scene.add(light1);
}

function calcManeuver(coe, maneuver, ecef) {
    const {r, i, c} = maneuver;
    
    const posvelState = Coe2PosVelObject(coe, app.data);
    if (app.data) {
        console.log(coe, posvelState);
    }
    let radial = math.dotDivide([posvelState.x, posvelState.y, posvelState.z],math.norm([posvelState.x, posvelState.y, posvelState.z]));//Normalized Radial Direction
    let cross_track = math.cross([posvelState.x, posvelState.y, posvelState.z], [posvelState.vx, posvelState.vy, posvelState.vz]);
    cross_track = math.dotDivide(cross_track,math.norm(cross_track));//Normalized Cross-Track Direction
    let in_track = math.cross(cross_track, radial);//Normalized In-Track Direction
    //Scale unit vectors in RIC frame to defined deltaVs from user input
    in_track = math.dotMultiply(in_track, i / 1000);
    cross_track = math.dotMultiply(cross_track, c / 1000);
    radial = math.dotMultiply(radial, r / 1000);
    posvelState.vx += in_track[0] + cross_track[0] + radial[0];
    posvelState.vy += in_track[1] + cross_track[1] + radial[1];
    posvelState.vz += in_track[2] + cross_track[2] + radial[2];
    //Update burnOrbitParams to reflect posvelState
    let newCoe = PosVel2CoeNew(posvelState);
    newCoe.mA = True2Eccentric(newCoe.e,newCoe.tA);//Temp line for calc to mean anomaly
    newCoe.mA = newCoe.mA - newCoe.e * Math.sin(newCoe.mA);
    let burnOrbitParams = {
        a: newCoe.a,
        e: newCoe.e,
        i: newCoe.i,
        raan: newCoe.raan,
        arg: newCoe.arg,
        mA: newCoe.mA  
    };
    if (Math.abs(burnOrbitParams.raan - 2 * Math.PI) < 1e-4) {
        burnOrbitParams.raan = 0;
    }
    if (Number.isNaN(burnOrbitParams.arg)) {
        burnOrbitParams.arg = 0;
    }
    
    if (app.data) {
        console.log(burnOrbitParams);
    }
    app.maneuver.sma = burnOrbitParams.a;
    app.maneuver.ecc = burnOrbitParams.e;
    app.maneuver.raan = burnOrbitParams.raan - app.raanOffest;
    app.maneuver.inc = burnOrbitParams.i;
    app.maneuver.argP = burnOrbitParams.arg;
    app.maneuver.mA = burnOrbitParams.mA;
    // app.drawSatellite(app.maneuver, true);
    app.maneuver.hist = app.calcSatellite(app.maneuver ,true, ecef)
    if (app.maneuver.line === undefined) {
        app.maneuver.line = app.buildSatGeometry(app.maneuver.hist, app.maneuver.color);
    }
    else {
        app.maneuver.line.point.position.x = app.maneuver.hist[0].x;
        app.maneuver.line.point.position.y = app.maneuver.hist[0].y;
        app.maneuver.line.point.position.z = app.maneuver.hist[0].z;

        const points = new THREE.CatmullRomCurve3(app.maneuver.hist, false).getPoints( 300 );
        app.maneuver.line.traj.geometry.setFromPoints(points);

    }
}

setupScene();
drawEarth();
drawStars();
drawLightSources();
app.render();

function Coe2PosVelObject(coe, log = false) {
    let p = coe.a*(1-coe.e*coe.e);
    let cTa = Math.cos(coe.tA);
    let sTa = Math.sin(coe.tA);
    let r = [[p*cTa/(1+coe.e*cTa)],
        [p*sTa/(1+coe.e*cTa)],
        [0]];
    if (log) {
        console.log(r);
    }
    let constA = Math.sqrt(398600.4418/p);
    let v = [[-constA*sTa],
            [(coe.e+cTa)*constA],
            [0]];
    let cRa = Math.cos(coe.raan); let sRa = Math.sin(coe.raan); 
    let cAr = Math.cos(coe.arg); let sAr = Math.sin(coe.arg);
    let cIn = Math.cos(coe.i); let sin = Math.sin(coe.i);
    R = [[cRa*cAr-sRa*sAr*cIn, -cRa*sAr-sRa*cAr*cIn, sRa*sin],
         [sRa*cAr+cRa*sAr*cIn, -sRa*sAr+cRa*cAr*cIn, -cRa*sin],
         [sAr*sin, cAr*sin, cIn]];
    r = math.multiply(R,r);
    v = math.multiply(R,v);
    let state = [r, v];
    return {x: state[0][0][0], y: state[0][1][0], z: state[0][2][0], vx: state[1][0][0], vy: state[1][1][0], vz: state[1][2][0]};
}

function axis3rotation(angle) {
    return [[Math.cos(angle), -Math.sin(angle), 0],
            [Math.sin(angle), Math.cos(angle), 0],
            [0,0,1]]
} 

function hexToRgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)            } : null;
}

window.addEventListener('keypress', event => {
    if (event.key === ' ') {
        app.eci = !app.eci;
    }
    else if (event.key === '.') {
        app.timeStep *= 1.1;
    }
    else if (event.key === ',') {
        app.timeStep /= 1.1;
    }
    else if (event.key  === 'd') {
        app.data = true;
    }
    else if (/\d/.test(event.key)) {
        let k = Number(event.key);
        if (k === 0) {
            app.cameraTarget = 'earth';
            app.threeJsVar.controls.target.set(0,0,0);
            return;
        }
        app.cameraTarget = k - 1;
    }
})

function True2Eccentric(e,ta) {
    return Math.atan(Math.sqrt((1-e)/(1+e))*Math.tan(ta/2))*2;
}

function PosVel2CoeNew(posvel) {
    let mu = 398600.4418;
    let r = [posvel.x,posvel.y,posvel.z];
    let v = [posvel.vx,posvel.vy,posvel.vz];
    let rn = math.norm(r);
    let vn = math.norm(v);
    let h = math.cross(r,v);
    let hn = math.norm(h);
    let n = math.cross([0,0,1],h);
    let nn = math.norm(n);
    if (nn < 1e-6) {
        n = [1,0,0];
        nn = 1;
    }
    var epsilon = vn*vn/2-mu/rn;
    let a = -mu/2/epsilon;
    let e = math.subtract(math.dotDivide(math.cross(v,h),mu),math.dotDivide(r,rn));
    let en = math.norm(e);
    if (en < 1e-6) {
        e = [1,0,0];
        en = 0;
    }
    let inc = Math.acos(math.dot(h,[0,0,1])/hn);
    let ra = Math.acos(math.dot(n,[1,0,0])/nn);
    if (n[1] < 0) {
        ra = 2*Math.PI-ra;
    }
    
    let ar, arDot;
    if (en === 0) {
        arDot = math.dot(n,e) / nn;
    }
    else {
        arDot = math.dot(n,e) / en / nn;
    }
    if (arDot > 1) {
        ar = 0;
    }
    else if (arDot < -1) {
        ar = Math.PI;
    }
    else {
        ar = Math.acos(arDot);
    }
    if (e[2] < 0) {
        ar = 2*Math.PI-ar;
    }
    else if (inc < 1e-6 && e[1] < 0) {
        ar = 2*Math.PI-ar;
    }
    let ta, taDot;
    if (en === 0) {
        taDot = math.dot(r,e) / rn;
    }
    else {
        taDot = math.dot(r,e) / rn / en;
    }
    if (taDot > 1) {
        ta = 0;
    }
    else if (taDot < -1) {
        ta = Math.PI;
    }
    else {
        ta = Math.acos(taDot);
    }
    if (math.dot(v,e) > 1e-6) {
        ta = 2*Math.PI-ta;
    } 
    // console.log([a,en,inc,ra,ar,ta])
    return {a: a, e:en, i: inc, raan: ra, arg: ar, tA: ta};
}
window.addEventListener('load', () => {
    document.getElementById('loading-screen').remove();
})