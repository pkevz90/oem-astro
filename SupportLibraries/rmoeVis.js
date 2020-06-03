var time = {
    year: 2020,
    month: 6,
    day: 1,
    hour: 0,
    minute: 0,
    second: 0
}

var orbitParams = {
    a: 10,
    xd: 0,
    yd: 0,
    b: 0,
    zmax: 10,
    M: 0
};

var Earth, clouds, sidTime = 0, stopRotate, Sunlight, stars, sunVec, satPoint, orbit = undefined, r = 2, scene, scale = 10, camera, renderer, controls, ecef = false, timeStep = 60;
var ECI = [], ECEF = [], RIC = [], pari = [];
var jdUTI0 = julianDateCalcStruct(time);

setupScene();
drawEarth();
drawStars();
drawLightSources();
drawRIC();
drawOrbit(orbitParams);
// var curve = new THREE.EllipseCurve(
// 	-scale*42164/6371,  0,            // ax, aY
// 	0.005, 0.01,           // xRadius, yRadius
// 	0,  Math.PI,  // aStartAngle, aEndAngle
// 	false,            // aClockwise
// 	0                 // aRotation
// );

// var points = curve.getPoints( 50 );
// var geometry = new THREE.BufferGeometry().setFromPoints( points );

// var material = new THREE.LineBasicMaterial( { color : 0xff0000 } );

// // Create the final object to add to the scene
// var ellipse = new THREE.Line( geometry, material );
// scene.add(ellipse)
// drawAxes();
// drawTube();

var render = function() {
    let n = 2*Math.PI/86164;
    orbitParams.b += timeStep/86164*2*Math.PI;
    if (orbitParams.b > 2*Math.PI) {orbitParams.b -= 2*Math.PI}
    $('.controls span')[3].textContent = (orbitParams.b*180/Math.PI).toFixed(1);
    orbitParams.M += timeStep/86164*2*Math.PI;
    orbitParams.yd -= 1.5*n*orbitParams.xd*timeStep;
    $('.controls span')[2].textContent = orbitParams.yd.toFixed(1);
    sidTime += timeStep/86164*360;
    let curSun = Eci2Ecef (sidTime, sunVec);
    Sunlight.position.x = -100*curSun[0][0];
    Sunlight.position.y = 100*curSun[2][0];
    Sunlight.position.z = 100*curSun[1][0];
    stars.rotation.y -= timeStep/86164*2*Math.PI;
    drawOrbit(orbitParams);
    renderer.render(scene,camera);
    controls.update();
    requestAnimationFrame(render);
}

render();

function setupScene() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(45,window.innerWidth/window.innerHeight,0.01);
    camera.position.set( -scale*42164/6371-scale*0.01, scale*0.0025, scale*0.0025 );
    renderer = new THREE.WebGLRenderer({antialias: true});
    renderer.setSize(window.innerWidth,window.innerHeight);
    $('body').append(renderer.domElement);
    window.addEventListener('resize',() => {
        renderer.setSize(window.innerWidth,window.innerHeight);
        camera.aspect = window.innerWidth/window.innerHeight;
        camera.updateProjectionMatrix();
    })
    
    controls = new THREE.OrbitControls(camera,renderer.domElement);
    controls.target = new THREE.Vector3( -scale*42164/6371, 0, 0 );
    controls.update();
}

function drawOrbit(orbitParams) {
    let r,v,rf, itAng, ctAng, rAng;
    let n = 2*Math.PI/86164;
    r = [[-orbitParams.a/2*Math.cos(orbitParams.b)+orbitParams.xd],
         [orbitParams.a*Math.sin(orbitParams.b)+orbitParams.yd],
         [orbitParams.zmax*Math.sin(orbitParams.M)]];
    v =  [[orbitParams.a*n/2*Math.sin(orbitParams.b)],
         [orbitParams.a*n*Math.cos(orbitParams.b)-1.5*n*orbitParams.xd],
         [orbitParams.zmax*n*Math.cos(orbitParams.M)]];
    
    var points = [];
    // let tailLength = Number($('#optionsList input')[0].value)/100;
    tailLength = 0.5;
    for (var ii = 0; ii <= 200; ii++) {
        t = -ii*86164*tailLength/200;
        // console.log(r,v);
        
        rf = math.add(math.multiply(PhiRR3d(t),r),math.multiply(PhiRV3d(t),v));
        rAng = 42164+rf[0][0];
        itAng = rf[1][0]/rAng;
        ctAng = rf[2][0]/rAng;
        // console.log(Math.sin(itAng)*rAng);
        rAng = -scale*rAng/6371;
        // console.log(Math.sin(itAng)*rAng);
        
        // points.push( new THREE.Vector3( -scale*42164/6371-scale*rf[0][0]/6371, scale*rf[2][0]/6371, scale*rf[1][0]/6371)); 
        points.push( new THREE.Vector3( rAng*Math.cos(itAng)*Math.cos(ctAng), -rAng*Math.sin(ctAng), -rAng*Math.sin(itAng))); 

       }
    if (orbit === undefined){ 
        var material = new THREE.LineBasicMaterial({
            color: 0xFFC300,
            linewidth: 30
        });
        var geometry = new THREE.BufferGeometry().setFromPoints( points );
        orbit = new THREE.Line( geometry, material );
        var geometry = new THREE.SphereGeometry( 0.00035, 6, 6 );
        var material = new THREE.MeshBasicMaterial({
            color: 0xFFC300});
        satPoint = new THREE.Mesh( geometry, material );
        satPoint.position.x = -scale*42164/6371-scale*r[0][0]/6371;
        satPoint.position.y = scale*r[2][0]/6371;
        satPoint.position.z = scale*r[1][0]/6371;

        scene.add(satPoint);
        scene.add(orbit);
    }
    else {
        // Edit orbitVar
        orbit.geometry.setFromPoints(points);
        satPoint.position.x = -scale*42164/6371-scale*r[0][0]/6371;
        satPoint.position.y = scale*r[2][0]/6371;
        satPoint.position.z = scale*r[1][0]/6371;
    }
}

function drawEarth(){
    var texture = new THREE.TextureLoader().load( './SupportLibraries/Media/2_no_clouds_4k.jpg' );
    var cloudsTexture = new THREE.TextureLoader().load('./SupportLibraries/Media/fair_clouds_4k.png');
    var geometry = new THREE.SphereGeometry( scale*1, 64, 64 );
    var material = new THREE.MeshLambertMaterial( {
        map: texture
    } );
    Earth = new THREE.Mesh( geometry, material );
    scene.add(Earth);
    clouds = new THREE.Mesh(
        new THREE.SphereGeometry(scale*1.003, 64, 64),			
        new THREE.MeshPhongMaterial({
            map:  cloudsTexture,
            transparent: true
        })
    );	
    scene.add(clouds);
    Earth.position.z = 0;
    sidTime = thetaGMST(jdUTI0);
    Earth.rotation.y += Math.PI+sidTime*Math.PI/180;
    clouds.rotation.y += Math.PI+sidTime*Math.PI/180;
    points = [];
    for (var kk = 0; kk <= 2000; kk++) {
        points.push( new THREE.Vector3( -scale*42164/6371*Math.sin(kk*2*Math.PI/200), 0, scale*42164/6371*Math.cos(kk*2*Math.PI/200))); 
    }
    var material = new THREE.LineDashedMaterial({
        color: 0xFFFFFF,
        linewidth: 1,
        dashSize: 3,
        gapSize: 2
    });
    var geometry = new THREE.BufferGeometry().setFromPoints( points );
    Line = new THREE.Line( geometry, material );
    Line.computeLineDistances();
    scene.add(Line);
}

function drawRIC() {
    var geometry = new THREE.PlaneGeometry( scale*0.00312, scale*0.00624);
    var material = new THREE.MeshBasicMaterial( {color: 0xffffff, opacity: 0.0625, transparent: true, side: THREE.DoubleSide});
    var plane = new THREE.Mesh( geometry, material );
    plane.position.x = -scale*42164/6371;
    plane.rotation.x = Math.PI/2;
    scene.add( plane );
    var curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3( -scale*42164/6371, 0, 0 ),
        new THREE.Vector3( -scale*42164/6371-scale*0.00156, 0, 0 ),
    ]);
    var geometry = new THREE.TubeGeometry(curve, 4, 0.00025, 8, true);
    var curveMesh = new THREE.Mesh(geometry,new THREE.MeshLambertMaterial());
    scene.add(curveMesh);
    var geometry = new THREE.ConeGeometry( .000625, 0.0025, 32 )
    var material = new THREE.MeshLambertMaterial( {color: 0xffffff} );
    var cone = new THREE.Mesh( geometry, material );
    cone.position.x = -scale*42164/6371;
    cone.position.y = scale*0.00156*0.758;
    scene.add( cone );
    var curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3( -scale*42164/6371, 0, 0 ),
        new THREE.Vector3( -scale*42164/6371, scale*0.00156, 0 ),
    ]);
    var geometry = new THREE.TubeGeometry(curve, 4, 0.00025, 8, true);
    curveMesh = new THREE.Mesh(geometry,new THREE.MeshLambertMaterial());
    scene.add(curveMesh);
    var geometry = new THREE.ConeGeometry( .000625, 0.0025, 32 ).rotateX(Math.PI/2);
    var material = new THREE.MeshLambertMaterial( {color: 0xffffff} );
    var cone = new THREE.Mesh( geometry, material );
    cone.position.x = -scale*42164/6371;
    cone.position.z = scale*0.00156*0.758;
    scene.add( cone );
    var curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3( -scale*42164/6371, 0, 0 ),
        new THREE.Vector3( -scale*42164/6371,0,scale*0.00156 ),
    ]);
    var geometry = new THREE.TubeGeometry(curve, 4, 0.00025, 8, true);
    curveMesh = new THREE.Mesh(geometry,new THREE.MeshLambertMaterial());
    
    scene.add(curveMesh);
    var geometry = new THREE.ConeGeometry( .000625, 0.0025, 32 ).rotateZ(Math.PI/2);
    var material = new THREE.MeshLambertMaterial( {color: 0xffffff} );
    var cone = new THREE.Mesh( geometry, material );
    cone.position.x = -scale*42164/6371-scale*0.00156*0.758;
    // cone.position.z = scale*0.0156*0.758;
    scene.add( cone );
}

function drawStars(){
    var starTexture = new THREE.TextureLoader().load( './SupportLibraries/Media/galaxy_starfield.png' );

    stars = new THREE.Mesh(
        new THREE.SphereGeometry(scale*90, 64, 64), 
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
    
    Sunlight.position.set(-100*sunVec[0][0],100*sunVec[2][0],100*sunVec[1][0]);
    scene.add(Sunlight);
    var light1 = new THREE.AmbientLight( 0xFFFFFF,0.2 ); // soft white light
    scene.add( light1 );
}

$('#optionsList input').on('input',()=>{
    $('#optionsList span')[0].textContent = $('#optionsList input')[0].value;
    ECI.forEach((item)=>{
        item.visible = $('#optionsList input')[1].checked
    })
    ECEF.forEach((item)=>{
        item.visible = $('#optionsList input')[2].checked
    })
})

$('.slidercontainer input').on('input',()=>{
    orbitParams = {
        a:      Number($('.slidercontainer input')[0].value),
        xd:     Number($('.slidercontainer input')[1].value),
        yd:     orbitParams.yd,
        b:      orbitParams.b,
        zmax:   Number($('.slidercontainer input')[2].value),
        M:      Number($('.slidercontainer input')[3].value)*Math.PI/180+orbitParams.b,
    }
    $('.controls span')[0].textContent = $('.slidercontainer input')[0].value;
    $('.controls span')[1].textContent = $('.slidercontainer input')[1].value;
    $('.controls span')[4].textContent = $('.slidercontainer input')[2].value;
    $('.controls span')[5].textContent = $('.slidercontainer input')[3].value;
    drawOrbit(orbitParams);
})

document.addEventListener('keypress', function(key){
    let k = key.key;
    if (k.toLowerCase() === 'e') {
        ecef = !ecef;
        if (ecef) {
            $('.referenceDiv span')[0].textContent = 'Earth-Fixed';
            Earth.rotation.y  = Math.PI;
            clouds.rotation.y = Math.PI;
        }
        else {
            $('.referenceDiv span')[0].textContent = 'Inertial';
            Earth.rotation.y  = sidTime*Math.PI/180+Math.PI;
            clouds.rotation.y = sidTime*Math.PI/180+Math.PI
            Sunlight.position.x = -100*sunVec[0][0];
            Sunlight.position.y = 100*sunVec[2][0];
            Sunlight.position.z = 100*sunVec[1][0];
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

$('#orbitList p').on('click',(a)=>{
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