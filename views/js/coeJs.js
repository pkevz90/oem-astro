const app = new Vue({
    el: '#main-app',
    data: {
        time: Date.now(),
        timeStep: 120,
        drawStep: 1,
        tail: 10000,
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
        satellites: [
            {
                name: 'ISS',
                sma: 6797,
                ecc: 0,
                inc: 51.644 * Math.PI / 180,
                raan: 213.1162 * Math.PI / 180,
                argP: 106.9418 * Math.PI / 180,
                mA: 0,
                hist: [],
                histECEF: [],
                eci: true,
                ecef: true,
                line: undefined,
                lineECEF: undefined,
                shown: true
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
            
            this.threeJsVar.renderer.render(this.threeJsVar.scene, this.threeJsVar.camera);
            this.threeJsVar.controls.update();

            requestAnimationFrame(this.render);
            this.satellites.forEach(sat => {
                this.drawSatellite(sat);
            });
            if (this.eci) {
                this.Earth.rotation.y +=  this.earthRot * this.timeStep;
                this.clouds.rotation.y += this.earthRot * this.timeStep;
            }
            else {
                this.raanOffest -= this.earthRot * this.timeStep;
            }
        },
        drawSatellite: function(sat) {
                if (sat.hist.length === 0) {
                    sat.hist = this.calcSatellite(sat)
                }  
                else {
                    let n = Math.sqrt(398600.4418 / sat.sma / sat.sma / sat.sma)
                    sat.mA += this.timeStep * n;
                    for (let ii = 0; ii < this.drawStep; ii++) {
                        sat.hist.pop();
                    }
                    let coeCalc = {
                        a: sat.sma,
                        e: sat.ecc,
                        raan: sat.raan + this.raanOffest,
                        arg: sat.argP,
                        i: sat.inc,
                        mA: sat.mA,
                        tA: 0
                    }
                    let mAcalc, state;
                    for (let ii = this.drawStep-this.timeStep; ii <= 0; ii += this.timeStep / this.drawStep) {
                        mAcalc = coeCalc.mA + ii * n;
                        coeCalc.tA = Eccentric2True(coeCalc.e, solveKeplersEquation(mAcalc, coeCalc.e));
                        state = Coe2PosVelObject(coeCalc);
                        sat.hist.unshift(new THREE.Vector3(-state.x / 6371, state.z / 6371, state.y / 6371));
                    }
                }
                if (sat.ecef) {
                    if (sat.histECEF.length === 0) {
                        let r;
                        for (let ii = 0; ii < sat.hist.length; ii++) {
                            r = [[-sat.hist[ii].x],[sat.hist[ii].z],[sat.hist[ii].y]];
                            r = math.multiply(axis3rotation(ii * this.timeStep / this.drawStep * this.earthRot), r);
                            sat.histECEF.push(new THREE.Vector3(-r[0], r[2], r[1]));
                         }
                     }  
                    else {
                        
                        for (let ii = 0; ii < this.drawStep; ii++) {
                            sat.histECEF.pop();
                        }
                        let rot = axis3rotation(this.earthRot * this.timeStep), r;
                        sat.histECEF.map(element => {
                            r = [[-element.x],[element.z+0],[element.y+0]];
                            r = math.multiply(rot, r);
                            element.x = -r[0];
                            element.y = r[2];
                            element.z = r[1];
                            return element;
                        })
                        // r = [[-sat.hist[1].x],[sat.hist[1].z],[sat.hist[1].y]];
                        // r = math.multiply(axis3rotation(this.timeStep / this.drawStep * this.earthRot), r);
                        // sat.histECEF.unshift(new THREE.Vector3(-r[0], r[2], r[1]));
                        sat.histECEF.unshift(new THREE.Vector3(sat.hist[0].x, sat.hist[0].y, sat.hist[0].z));
                    }
                }
                if (sat.line === undefined) {
                    sat.line = this.buildSatGeometry(sat.ecef ? sat.histECEF : sat.hist);
                }
                else {
                    sat.line.point.position.x = sat.hist[0].x;
                    sat.line.point.position.y = sat.hist[0].y;
                    sat.line.point.position.z = sat.hist[0].z;
                    
                    sat.line.traj.geometry.setFromPoints(sat.ecef ? sat.histECEF : sat.hist);
                }
        },
        calcSatellite: function(sat, axis = 'eci') {
            let n = Math.sqrt(398600.4418 / sat.sma / sat.sma / sat.sma), hist = [], mAcalc, state;
            let coeCalc = {
                a: sat.sma,
                e: sat.ecc,
                raan: sat.raan + this.raanOffest,
                arg: sat.argP,
                i: sat.inc,
                mA: sat.mA,
                tA: 0
            }
            for (let ii = 0; ii >= -this.tail; ii -= this.timeStep / this.drawStep) {
                mAcalc = coeCalc.mA + ii * n;
                coeCalc.tA = Eccentric2True(coeCalc.e, solveKeplersEquation(mAcalc, coeCalc.e));
                state = Coe2PosVelObject(coeCalc, axis === 'eci' ? false : ii*this.earthRot);
                hist.push(new THREE.Vector3(-state.x / 6371, state.z / 6371, state.y / 6371));
            }
            return hist;
        },
        buildSatGeometry: function(hist) {
            let material = new THREE.LineBasicMaterial({
                color: 'red',
                linewidth: 2
            });
            let geometry = new THREE.BufferGeometry().setFromPoints(hist);
            let line = {};
            line.traj = new THREE.Line(geometry, material);
            geometry = new THREE.SphereGeometry(0.05, 6, 6);
            material = new THREE.MeshPhongMaterial({
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

function Coe2PosVelObject(coe, eci) {
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
    if (eci) {
        r = math.multiply(axis3rotation(-eci),r);
    }
    let state = [r, v];
    return {x: state[0][0][0], y: state[0][1][0], z: state[0][2][0], vx: state[1][0][0], vy: state[1][1][0], vz: state[1][2][0]};
}

function axis3rotation(angle) {
    return [[Math.cos(angle), -Math.sin(angle), 0],
            [Math.sin(angle), Math.cos(angle), 0],
            [0,0,1]]
} 