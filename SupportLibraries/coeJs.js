var time = {
    year: 2020,
    month: 6,
    day: 1,
    hour: 0,
    minute: 0,
    second: 0
}

var orbitParams = [{
    a: 8000,
    e: 0,
    i: 45,
    raan: 0,
    arg: 0,
    mA: 0
}];

var Earth, clouds, sidTime, stopRotate, Sunlight, stars, sunVec, satPoint = [],
    orbit = [],
    r = 2,
    scene, camera, renderer, controls, ecef = false,
    timeStep = 60;
var ECI = [],
    ECEF = [],
    RIC = [],
    pari = [];
var jdUTI0 = julianDateCalcStruct(time);

setupScene();
drawEarth();
drawStars();
drawLightSources();
drawOrbit(orbitParams);
drawAxes();
// drawTube();

var render = function () {
    renderer.render(scene, camera);
    controls.update();
    requestAnimationFrame(render);
    // line.attributes.position.
    // orbitParams.raan += 0.1;
    orbitParams.forEach(orbit => {
        orbit.mA += timeStep * 180 / Math.PI * Math.sqrt(398600.4418 / Math.pow(orbit.a, 3));
    })
    sidTime += timeStep / 86164 * 360;
    if (!ecef) {
        Earth.rotation.y += timeStep / 86164 * 2 * Math.PI;
        clouds.rotation.y += timeStep / 86164 * 2 * Math.PI;
        ECEF.forEach((item) => {
            item.rotation.y = sidTime * Math.PI / 180;
        })
    } else {
        let curSun = Eci2Ecef(sidTime, sunVec);
        Sunlight.position.x = -100 * curSun[0][0];
        Sunlight.position.y = 100 * curSun[2][0];
        Sunlight.position.z = 100 * curSun[1][0];
        stars.rotation.y -= timeStep / 86164 * 2 * Math.PI;
    }
    drawOrbit(orbitParams)
}

render();

function setupScene() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight);
    camera.position.set(10, 10, 10);
    renderer = new THREE.WebGLRenderer({
        antialias: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    $('body').append(renderer.domElement);
    window.addEventListener('resize', () => {
        renderer.setSize(window.innerWidth, window.innerHeight);
        camera.aspect = window.innerWidth / window.innerHeight;

        camera.updateProjectionMatrix();
    })

    controls = new THREE.OrbitControls(camera, renderer.domElement);
}

function drawOrbit(orbitParams) {
    let r, r0;
    orbitParams.forEach((orbitP,index) => {
        let tA = Eccentric2True(orbitP.e, solveKeplersEquation(orbitP.mA * Math.PI / 180, orbitP.e))
        let period = 2 * Math.PI * Math.sqrt(Math.pow(orbitP.a, 3) / 398600.4418);
        let coe = [orbitP.a, orbitP.e, orbitP.i * Math.PI / 180, orbitP.raan * Math.PI / 180, orbitP.arg * Math.PI / 180, tA]

        var points = [];
        let tailLength = Number($('#optionsList input')[0].value) / 100;
        for (var ii = 0; ii <= 200; ii++) {
            r = Coe2PosVel(coe);
            r = r[0];
            if (ecef) {
                r = Eci2Ecef(sidTime - ii * tailLength * period / 199 * 360 / 86164, r)
            }
            if (ii === 0) {
                r0 = r;
            }
            // console.log(r0);

            points.push(new THREE.Vector3(-r[0][0] / 6371, r[2][0] / 6371, r[1][0] / 6371));

            coe = twoBodyProp(coe, -tailLength * period / 199);
        }
        if (orbit[index] === undefined) {
            var material = new THREE.LineBasicMaterial({
                color: 0xFFC300,
                linewidth: 2
            });
            var geometry = new THREE.BufferGeometry().setFromPoints(points);
            orbit[index] = new THREE.Line(geometry, material);
            var geometry = new THREE.SphereGeometry(0.05, 6, 6);
            var material = new THREE.MeshBasicMaterial({
                color: 0xFFC300
            });
            satPoint[index] = new THREE.Mesh(geometry, material);
            // coe = [orbitParams.a, orbitParams.e, orbitParams.i*Math.PI/180, orbitParams.raan*Math.PI/180, orbitParams.arg*Math.PI/180, tA]
            // r = Coe2PosVel(coe);
            satPoint[index].position.x = -r0[0][0] / 6371;
            satPoint[index].position.y = r0[2][0] / 6371;
            satPoint[index].position.z = r0[1][0] / 6371;

            scene.add(satPoint[index]);
            scene.add(orbit[index]);
        } else {
            // Edit orbitVar
            orbit[index].geometry.setFromPoints(points);
            satPoint[index].position.x = -r0[0][0] / 6371;
            satPoint[index].position.y = r0[2][0] / 6371;
            satPoint[index].position.z = r0[1][0] / 6371;
        }
    })

}

function drawEarth() {
    var texture = new THREE.TextureLoader().load('./SupportLibraries/Media/2_no_clouds_4k.jpg');
    var cloudsTexture = new THREE.TextureLoader().load('./SupportLibraries/Media/fair_clouds_4k.png');
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
    sidTime = thetaGMST(jdUTI0);
    Earth.rotation.y += Math.PI + sidTime * Math.PI / 180;
    clouds.rotation.y += Math.PI + sidTime * Math.PI / 180;
}

function drawAxes() {
    // ECI X
    var curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(-3, 0, 0),
    ]);
    var geometry = new THREE.TubeGeometry(curve, 4, 0.05, 8, true);
    ECI.push(new THREE.Mesh(geometry, new THREE.MeshLambertMaterial()));
    ECEF.push(new THREE.Mesh(geometry, new THREE.MeshLambertMaterial()));
    // ECI Y
    var curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, 3),
    ]);
    var geometry = new THREE.TubeGeometry(curve, 4, 0.05, 8, true);
    ECI.push(new THREE.Mesh(geometry, new THREE.MeshLambertMaterial()));
    ECEF.push(new THREE.Mesh(geometry, new THREE.MeshLambertMaterial()));
    // ECI Z
    var curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 3, 0),
    ]);
    var geometry = new THREE.TubeGeometry(curve, 4, 0.05, 8, true);
    ECI.push(new THREE.Mesh(geometry, new THREE.MeshLambertMaterial()));
    ECEF.push(new THREE.Mesh(geometry, new THREE.MeshLambertMaterial()));
    ECI.forEach((item) => {
        scene.add(item);
    })
    ECEF.forEach((item) => {
        item.rotation.y = 0.2;
        scene.add(item);
    })
}

function drawTube() {
    var curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(2, 0, 0),
    ]);
    var geometry = new THREE.TubeGeometry(curve, 4, 0.25, 8, true);
    var curveMesh = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial());
    scene.add(curveMesh);



}

function drawStars() {
    var starTexture = new THREE.TextureLoader().load('./SupportLibraries/Media/galaxy_starfield.png');

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
    sunVec = sunVectorCalc(jdUTI0);
    console.log(sunVec);
    console.log(math.norm(math.squeeze(sunVec)));

    Sunlight.position.set(-100 * sunVec[0][0], 100 * sunVec[2][0], 100 * sunVec[1][0]);
    scene.add(Sunlight);
    var light1 = new THREE.AmbientLight(0xFFFFFF, 0.2); // soft white light
    scene.add(light1);
}

$('#optionsList input').on('input', () => {
    $('#optionsList span')[0].textContent = $('#optionsList input')[0].value;
    ECI.forEach((item) => {
        item.visible = $('#optionsList input')[1].checked
    })
    ECEF.forEach((item) => {
        item.visible = $('#optionsList input')[2].checked
    })
})
function sliderInput(a) {
    let p = $(a.target).parent().parent();
    let ii = $('.controls').index(p);
    orbitParams[ii] = {
        a: Number($('.slidercontainer input')[0+ii*6].value),
        e: Number($('.slidercontainer input')[1+ii*6].value),
        i: Number($('.slidercontainer input')[2+ii*6].value),
        raan: Number($('.slidercontainer input')[3+ii*6].value),
        arg: Number($('.slidercontainer input')[4+ii*6].value),
        mA: orbitParams[ii].mA
    };
    $('.controls span')[0+ii*6].textContent = $('.slidercontainer input')[0+ii*6].value;
    $('.controls span')[1+ii*6].textContent = $('.slidercontainer input')[1+ii*6].value;
    $('.controls span')[2+ii*6].textContent = $('.slidercontainer input')[2+ii*6].value;
    $('.controls span')[3+ii*6].textContent = $('.slidercontainer input')[3+ii*6].value;
    $('.controls span')[4+ii*6].textContent = $('.slidercontainer input')[4+ii*6].value;
    drawOrbit(orbitParams);
}
$('.slidercontainer input').on('input', sliderInput);

document.addEventListener('keypress', function (key) {
    let k = key.key;
    if (k.toLowerCase() === 'e') {
        ecef = !ecef;
        if (ecef) {
            $('.referenceDiv span')[0].textContent = 'Earth-Fixed';
            Earth.rotation.y = Math.PI;
            clouds.rotation.y = Math.PI;
        } else {
            $('.referenceDiv span')[0].textContent = 'Inertial';
            Earth.rotation.y = sidTime * Math.PI / 180 + Math.PI;
            clouds.rotation.y = sidTime * Math.PI / 180 + Math.PI
            Sunlight.position.x = -100 * sunVec[0][0];
            Sunlight.position.y = 100 * sunVec[2][0];
            Sunlight.position.z = 100 * sunVec[1][0];
        }
    }
    if (k === '.' || k === '>') {
        timeStep += 10;
        $('.timeStepDiv span')[0].textContent = timeStep.toFixed(0);
    }
    if (k === ',' || k === '<') {
        timeStep -= 10;
        $('.timeStepDiv span')[0].textContent = timeStep.toFixed(0);
    }

});

window.addEventListener('load', (event) => {
    $('.loadingScreen').fadeOut(500);
});

$('#orbitList p').on('click', (a) => {
    let orbit = a.target.innerHTML;
    switch (orbit) {
        case 'ISS':
            orbitParams = {
                a: 6784.2389,
                e: 0.0002297,
                i: 51.6444,
                raan: 0,
                arg: 0,
                mA: orbitParams.mA
            }
            break;
        case 'GPS':
            orbitParams = {
                a: 26561.7437,
                e: 0,
                i: 55,
                raan: 0,
                arg: 0,
                mA: orbitParams.mA
            }
            break;
        case 'Molniya':

            orbitParams = {
                a: 26561.7437,
                e: 0.74,
                i: 63.4,
                raan: 0,
                arg: 270,
                mA: orbitParams.mA
            }
            break;
        case 'Sun-Synchronous':
            orbitParams = {
                a: 6784.2389,
                e: 0.0002297,
                i: 98,
                raan: 0,
                arg: 0,
                mA: orbitParams.mA
            }
            break;
        case 'Geo-Stationary':
            orbitParams = {
                a: 42164,
                e: 0,
                i: 0,
                raan: 0,
                arg: 0,
                mA: orbitParams.mA
            }
            break;
        default:
            break;
    }
    $('.slidercontainer input')[0].value = orbitParams.a;
    $('.slidercontainer input')[1].value = orbitParams.e;
    $('.slidercontainer input')[2].value = orbitParams.i;
    $('.slidercontainer input')[3].value = orbitParams.raan;
    $('.slidercontainer input')[4].value = orbitParams.arg;
    for (var ii = 0; ii < 5; ii++) {
        $('.controls span')[ii].textContent = $('.slidercontainer input')[ii].value;
    }
})