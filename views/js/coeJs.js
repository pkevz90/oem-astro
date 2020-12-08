const app = new Vue({
    el: '#main-app',
    data: {
        time: Date.now(),
        timeStep: 10,
        drawStep: 1,
        tail: 86400,
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
        satellites: [
            {
                name: 'GEO 1',
                sma: 42164,
                ecc: 0,
                inc: 0 * Math.PI / 180,
                raan: 213.1162 * Math.PI / 180,
                argP: 270.9418 * Math.PI / 180,
                mA: 0,
                hist: [],
                ecef: false,
                line: undefined,
                lineECEF: undefined,
                shown: true,
                color: '#FF0000'
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
            this.threeJsVar.renderer.render(this.threeJsVar.scene, this.threeJsVar.camera);
            this.threeJsVar.controls.update();

            requestAnimationFrame(this.render);
            this.satellites.forEach(sat => {
                this.drawSatellite(sat);
            });
            
            this.Earth.rotation.y  +=  this.eci ? this.earthRot * this.timeStep : 0;
            this.clouds.rotation.y +=  this.eci ? this.earthRot * this.timeStep : 0;
            this.raanOffest -= this.eci ? 0 : this.earthRot * this.timeStep;
            this.stars.rotation.y -= this.eci ? 0 : this.earthRot * this.timeStep;
            if (this.data) {
                console.timeEnd('render')
            }
            this.data = false;
        },
        drawSatellite: function(sat) {
            
            sat.mA += Math.sqrt(398600.4418 / sat.sma / sat.sma / sat.sma) * this.timeStep;
            sat.hist = this.calcSatellite(sat)
            
            if (sat.line === undefined) {
                sat.line = this.buildSatGeometry(sat.hist);
            }
            else {
                sat.line.point.position.x = sat.hist[0].x;
                sat.line.point.position.y = sat.hist[0].y;
                sat.line.point.position.z = sat.hist[0].z;
                
                const points = new THREE.CatmullRomCurve3(sat.hist, false).getPoints( 300 );
                sat.line.traj.geometry.setFromPoints(points);
            }
        },
        calcSatellite: function(sat) {
            let n = Math.sqrt(398600.4418 / sat.sma / sat.sma / sat.sma), hist = [], state;
            let coeCalc = {
                a: sat.sma,
                e: sat.ecc,
                raan: sat.raan + this.raanOffest,
                arg: sat.argP,
                i: sat.inc,
                mA: sat.mA,
                tA: 0
            }
            let nPoints = Math.floor(this.tail / (2 * Math.PI / n) * 40);
            // Calculate points based off of Eccentric Anomaly (named true anomaly by mistake, do not feel like fixing)
            let t0 = solveKeplersEquation(coeCalc.mA, coeCalc.e);
            let tf = solveKeplersEquation(coeCalc.mA - (nPoints - 1) * (this.tail / (nPoints - 1)) * n, coeCalc.e);
            let tA = math.range(t0, tf, (tf - t0) / (nPoints - 1), true)._data;
            let time = tA.map(t => -(coeCalc.mA - (t - coeCalc.e * Math.sin(t))) / n)
            for (let ii = 0; ii < tA.length; ii++) { 
                coeCalc.tA = Eccentric2True(coeCalc.e, tA[ii]);
                state = Coe2PosVelObject(coeCalc);
                if (sat.ecef) {
                    let r = [[state.x],[state.y],[state.z]];
                    r = math.multiply(axis3rotation(-time[ii] * this.earthRot), r);
                    state = {
                        x: r[0][0],
                        y: r[1][0],
                        z: r[2][0]
                    }
                }
                hist.push(new THREE.Vector3(-state.x / 6371, state.z / 6371, state.y / 6371));
            }
            return hist;
        },
        buildSatGeometry: function(hist) {
            let material = new THREE.LineBasicMaterial({
                color: 'red',
                linewidth: 2
            });
            const curve = new THREE.CatmullRomCurve3(hist);
            const points = curve.getPoints( 200 );
            let geometry = new THREE.BufferGeometry().setFromPoints(points);
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
            this.satellites.push({
                name: 'New Sat',
                sma: this.satellites[n].sma,
                ecc: this.satellites[n].ecc,
                inc: this.satellites[n].inc,
                argP: this.satellites[n].argP,
                raan: this.satellites[n].raan,
                mA: this.satellites[n].mA,
                hist: []
            });
        },
        changeColor: function(sat) {
            let c = hexToRgb(this.satellites[sat].color);
            this.satellites[sat].line.traj.material.color.setRGB(c.r/255,c.g/255,c.b/255);
            this.satellites[sat].line.point.material.color.setRGB(c.r/255,c.g/255,c.b/255);
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
    $('body').append(app.threeJsVar.renderer.domElement);
    window.addEventListener('resize', () => {
        app.threeJsVar.camera.aspect = window.innerWidth / window.innerHeight;
        app.threeJsVar.camera.updateProjectionMatrix();
        app.threeJsVar.renderer.setSize(window.innerWidth, window.innerHeight);S
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
    sunVec = sunVectorCalc(0);

    app.sunlight.position.set(-100 * sunVec[0][0], 100 * sunVec[2][0], 100 * sunVec[1][0]);
    app.threeJsVar.scene.add(app.sunlight);
    var light1 = new THREE.AmbientLight(0xFFFFFF, 0.2); // soft white light
    app.threeJsVar.scene.add(light1);
}


setupScene();
drawEarth();
drawStars();
drawLightSources();
app.render();

function Coe2PosVelObject(coe) {
    let p = coe.a*(1-coe.e*coe.e);
    let cTa = Math.cos(coe.tA);
    let sTa = Math.sin(coe.tA);
    let r = [[p*cTa/(1+coe.e*cTa)],
        [p*sTa/(1+coe.e*cTa)],
        [0]];
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
})

function True2Eccentric(e,ta) {
    return Math.atan(Math.sqrt((1-e)/(1+e))*Math.tan(ta/2))*2;
}