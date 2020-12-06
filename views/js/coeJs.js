const app = new Vue({
    el: '#main-app',
    data: {
        time: Date.now(),
        timeStep: 30,
        drawStep: 1,
        tail: 36000,
        jdTimeStart: 0,
        pause: false,
        satellites: [
            {
                sma: 30000,
                ecc: 0.75,
                inc: 63.4 * Math.PI / 180,
                raan: 0 * Math.PI / 180,
                argP: 270 * Math.PI / 180,
                mA: 0,
                hist: [],
                line: undefined
            },{
                sma: 30000,
                ecc: 0.75,
                inc: 63.4 * Math.PI / 180,
                raan: 120 * Math.PI / 180,
                argP: 270 * Math.PI / 180,
                mA: 120 * Math.PI / 180,
                hist: [],
                line: undefined
            },{
                sma: 30000,
                ecc: 0.75,
                inc: 63.4 * Math.PI / 180,
                raan: 240 * Math.PI / 180,
                argP: 270 * Math.PI / 180,
                mA: 240 * Math.PI / 180,
                hist: [],
                line: undefined
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
            renderer.render(scene, camera);
            controls.update();
            this.satellites.forEach(sat => {
                this.drawSatellite(sat);
            });


            requestAnimationFrame(this.render);
        },
        drawSatellite: function(sat) {
            console.time('calc')
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
                    raan: sat.raan,
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
            console.timeEnd('calc')
            console.time('geom')
            if (sat.line === undefined) {
                sat.line = this.buildSatGeometry(sat);
            }
            else {
                sat.line.point.position.x = sat.hist[0].x;
                sat.line.point.position.y = sat.hist[0].y;
                sat.line.point.position.z = sat.hist[0].z;
                
                sat.line.traj.geometry.setFromPoints(sat.hist);
            }
            console.timeEnd('geom')

        },
        calcSatellite: function(sat) {
            let n = Math.sqrt(398600.4418 / sat.sma / sat.sma / sat.sma), hist = [], mAcalc, state;
            let coeCalc = {
                a: sat.sma,
                e: sat.ecc,
                raan: sat.raan,
                arg: sat.argP,
                i: sat.inc,
                mA: sat.mA,
                tA: 0
            }
            for (let ii = 0; ii >= -this.tail; ii -= this.timeStep / this.drawStep) {
                mAcalc = coeCalc.mA + ii * n;
                coeCalc.tA = Eccentric2True(coeCalc.e, solveKeplersEquation(mAcalc, coeCalc.e));
                state = Coe2PosVelObject(coeCalc);
                hist.push(new THREE.Vector3(-state.x / 6371, state.z / 6371, state.y / 6371));
            }
            return hist;
        },
        buildSatGeometry: function(sat) {
            let material = new THREE.LineBasicMaterial({
                color: 'red',
                linewidth: 2
            });
            let geometry = new THREE.BufferGeometry().setFromPoints(sat.hist);
            let line = {};
            line.traj = new THREE.Line(geometry, material);
            geometry = new THREE.SphereGeometry(0.05, 6, 6);
            material = new THREE.MeshPhongMaterial({
                color: 'red'
            });
            line.point = new THREE.Mesh(geometry,material);
            line.point.position.x = sat.hist[0].x;
            line.point.position.y = sat.hist[0].z;
            line.point.position.z = sat.hist[0].y;
            scene.add(line.traj);
            scene.add(line.point);
            return line;
        }
    }
}) 



function setupScene() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight);
    camera.position.set(-10, 15, 10);
    renderer = new THREE.WebGLRenderer({
        antialias: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementsByTagName('body')[0].append(renderer.domElement);
    window.addEventListener('resize', () => {
        renderer.setSize(window.innerWidth, window.innerHeight);
        camera.aspect = window.inWidth / window.innerHeight;

        camera.updateProjectionMatrix();
    })
    controls = new THREE.OrbitControls(camera, renderer.domElement);
}

function drawEarth() {
    var texture = new THREE.TextureLoader().load('.//Media/2_no_clouds_4k.jpg');
    var cloudsTexture = new THREE.TextureLoader().load('./Media/fair_clouds_4k.png');
    var geometry = new THREE.SphereGeometry(1, 64, 64);
    var material = new THREE.MeshLambertMaterial({
        map: texture
    });
    Earth = new THREE.Mesh(geometry, material);
    scene.add(Earth);
    clouds = new THREE.Mesh(
        new THREE.SphereGeometry(1.003, 64, 64),
        new THREE.MeshPhongMaterial({
            map: cloudsTexture,
            transparent: true
        })
    );
    scene.add(clouds);
    Earth.position.z = 0;
    Earth.rotation.y += Math.PI;
    clouds.rotation.y += Math.PI;
}

function drawStars() {
    var starTexture = new THREE.TextureLoader().load('./Media/galaxy_starfield.png');

    stars = new THREE.Mesh(
        new THREE.SphereGeometry(90, 64, 64),
        new THREE.MeshBasicMaterial({
            map: starTexture,
            side: THREE.BackSide
        })
    );
    scene.add(stars);
}

function drawLightSources() {
    Sunlight = new THREE.PointLight(0xFFFFFF, 1, 500);
    sunVec = sunVectorCalc(0);

    Sunlight.position.set(-100 * sunVec[0][0], 100 * sunVec[2][0], 100 * sunVec[1][0]);
    scene.add(Sunlight);
    var light1 = new THREE.AmbientLight(0xFFFFFF, 0.2); // soft white light
    scene.add(light1);
}

var render = function () {
    renderer.render(scene, camera);
    controls.update();
    requestAnimationFrame(render);
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
    let state = [math.multiply(R,r),math.multiply(R,v)];
    return {x: state[0][0][0], y: state[0][1][0], z: state[0][2][0], vx: state[1][0][0], vy: state[1][1][0], vz: state[1][2][0]};
}