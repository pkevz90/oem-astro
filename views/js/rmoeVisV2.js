try{
var time = {
    year: 2020,
    month: 6,
    day: 1,
    hour: 0,
    minute: 0,
    second: 0
}

var orbitParams = [{
    a: 10,
    xd: 0,
    yd: 0,
    b: 0,
    zmax: 10,
    M: 0,
    shown: true
}];

var Earth, clouds, sidTime = 0, stopRotate, Sunlight, stars, sunVec, satPoint = [], orbit = [], r = 2, scene, scale = 10, camera, renderer, controls, ecef = false;
var ECI = [], ECEF = [], RIC = [], pari = [];
var jdUTI0 = julianDateCalcStruct(time);
var timeStep = 1000/60,
    timeMult = 1000,
    stopwatch = new Date().getTime(),
    lastTenSpeeds = [];

var $orbitsControls = $('.controls span');
setupScene();
drawEarth();
drawStars();
drawLightSources();
// drawRIC();

var render = function() {
    renderer.render(scene,camera);
    requestAnimationFrame(render);
}

render();

function setupScene() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(45,window.innerWidth/window.innerHeight,0.01);
    camera.position.set( -scale*42164/6371-scale*0.0125, scale*0.0025, -scale*0.0025 );
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

function drawEarth(){
    var texture = new THREE.TextureLoader().load( './Media/2_no_clouds_4k.jpg' );
    var cloudsTexture = new THREE.TextureLoader().load('./Media/fair_clouds_4k.png');
    var geometry = new THREE.SphereGeometry( scale*1, 32, 32 );
    var material = new THREE.MeshLambertMaterial( {
        map: texture
    } );
    Earth = new THREE.Mesh( geometry, material );
    scene.add(Earth);
    clouds = new THREE.Mesh(
        new THREE.SphereGeometry(scale*1.003, 32, 32),			
        new THREE.MeshPhongMaterial({
            map:  cloudsTexture,
            transparent: true
        })
    );	
    scene.add(clouds);
    Earth.position.z = 0;
    Earth.rotation.y += Math.PI;
    clouds.rotation.y += Math.PI;
}

function drawRIC() {
    var material = new THREE.LineBasicMaterial({
        color: 0xFFFFFF,
        transparent: true,
        opacity: 0.5,
        linewidth: 1
    });
    let alt, Line, points;
    for (var ii = 0; ii < 5; ii++){
        points = [];
        alt = 42124+ii*20;
        for (var kk = 0; kk <= 2000; kk++) {
            points.push( new THREE.Vector3( -scale*alt/6371*Math.sin(kk*2*Math.PI/2000), 0, scale*alt/6371*Math.cos(kk*2*Math.PI/2000))); 
        }
        
        var geometry = new THREE.BufferGeometry().setFromPoints( points );
        if (ii === 2) {
            Line = new THREE.Line( geometry, new THREE.LineBasicMaterial({
                color: 0xFFFFFF,
                linewidth: 1
            }) );
        }
        else {
            Line = new THREE.Line( geometry, material );
        }
        Line.computeLineDistances();
        scene.add(Line);
    }
    let alt1 = 42124, alt2 = 42204;
    for (var ii = 0; ii < 3600; ii+=2.5){
        points = [];
        points.push( new THREE.Vector3( -scale*alt1/6371*Math.sin(ii/10*Math.PI/180), 0, scale*alt1/6371*Math.cos(ii/10*Math.PI/180))); 
        points.push( new THREE.Vector3( -scale*alt2/6371*Math.sin(ii/10*Math.PI/180), 0, scale*alt2/6371*Math.cos(ii/10*Math.PI/180))); 
       
        
        var geometry = new THREE.BufferGeometry().setFromPoints( points );
        Line = new THREE.Line( geometry, material );
        Line.computeLineDistances();
        scene.add(Line);
    }
    
    var curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3( -scale*42164/6371, 0, 0 ),
        new THREE.Vector3( -scale*42164/6371-scale*0.00156, 0, 0 ),
    ]);
    var geometry = new THREE.TubeGeometry(curve, 4, 0.00025, 8, true);
    var curveMesh = new THREE.Mesh(geometry,new THREE.MeshLambertMaterial({color: 0x73f5f0} ));
    scene.add(curveMesh);
    var geometry = new THREE.ConeGeometry( .000625, 0.0025, 32 )
    var material = new THREE.MeshLambertMaterial( {color: 0x73f5f0} );
    var cone = new THREE.Mesh( geometry, material );
    cone.position.x = -scale*42164/6371;
    cone.position.y = scale*0.00156*0.758;
    scene.add( cone );
    var curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3( -scale*42164/6371, 0, 0 ),
        new THREE.Vector3( -scale*42164/6371, scale*0.00156, 0 ),
    ]);
    var geometry = new THREE.TubeGeometry(curve, 4, 0.00025, 8, true);
    curveMesh = new THREE.Mesh(geometry,new THREE.MeshLambertMaterial({color: 0x73f5f0} ));
    // console.log(curveMesh,curve);
    
    scene.add(curveMesh);
    var geometry = new THREE.ConeGeometry( .000625, 0.0025, 32 ).rotateX(Math.PI/2);
    var material = new THREE.MeshLambertMaterial( {color: 0x73f5f0} );
    var cone = new THREE.Mesh( geometry, material );
    cone.position.x = -scale*42164/6371;
    cone.position.z = scale*0.00156*0.758;
    scene.add( cone );
    var curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3( -scale*42164/6371, 0, 0 ),
        new THREE.Vector3( -scale*42164/6371,0,scale*0.00156 ),
    ]);
    var geometry = new THREE.TubeGeometry(curve, 4, 0.00025, 8, true);
    curveMesh = new THREE.Mesh(geometry,new THREE.MeshLambertMaterial({color: 0x73f5f0} ));
    
    scene.add(curveMesh);
    var geometry = new THREE.ConeGeometry( .000625, 0.0025, 32 ).rotateZ(Math.PI/2);
    var material = new THREE.MeshLambertMaterial( {color: 0x73f5f0} );
    var cone = new THREE.Mesh( geometry, material );
    cone.position.x = -scale*42164/6371-scale*0.00156*0.758;
    // cone.position.z = scale*0.0156*0.758;
    scene.add( cone );
}

function drawStars(){
    var starTexture = new THREE.TextureLoader().load( './Media/galaxy_starfield.png' );

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

function rotateToLatLong(lat = 0,long = 0, units = 'rad') {
    lat  = units === 'deg' ? lat  * Math.PI / 180 : lat;
    long = units === 'deg' ? long * Math.PI / 180 : long;
    let vector1 = [-Math.cos(long)*Math.cos(lat), Math.sin(lat), Math.sin(long)*Math.cos(lat)];
    let vector2 = [-1,0,0];
    
    let ang = -Math.acos(math.dot(vector1, vector2));
    let e = math.cross(vector1, vector2);
    e = math.dotDivide(e,math.norm(e));
    let c = Math.cos(ang), s = Math.sin(ang);
    let rot_mat = [[c + (1 - c) * e[0] * e[0], (1 - c) * e[0] * e[1] + s * e[2], (1 - c) * e[0] * e[2] - s * e[1]],
                   [(1 - c) * e[1] * e[0] - s * e[2], c + (1 - c) * e[1] * e[1], (1 - c) * e[1] * e[2] + s * e[0]],
                   [(1 - c) * e[2] * e[0] + s * e[1], (1 - c) * e[2] * e[1] - s * e[0], c + (1 - c) * e[2] * e[2]]];
    let eY = -Math.asin(rot_mat[2][0]);
    let eZ = Math.atan2(rot_mat[2][1], rot_mat[2][2]);
    let eX = Math.atan2(rot_mat[1][0] / Math.cos(eY), rot_mat[0][0] / Math.cos(eY));
    console.log(eX, eY, eZ);
    Earth.rotation.y = eY;
    Earth.rotation.z = eZ;
    Earth.rotation.x = -eX;
    // let q13 = math.dotMultiply(e, Math.sin(ang/2));
    // Earth.applyQuaternion(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(e[0], e[1], e[2]), ang));
    // // clouds.quaternion.setFromAxisAngle(new THREE.Vector3(e[0], q13[1], q13[2]), ang);
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

$('.slidercontainer input').on('input',sliderInput)
function sliderInput(a) {
    let p = $(a.target).parent().parent();
    let ii = $('.controls').index(p);
    
    
    orbitParams[ii] = {
        a:      Number($('.slidercontainer input')[0+ii*4].value),
        xd:     Number($('.slidercontainer input')[1+ii*4].value),
        yd:     orbitParams[ii].yd,
        b:      orbitParams[ii].b,
        zmax:   Number($('.slidercontainer input')[2+ii*4].value),
        M:      Number($('.slidercontainer input')[3+ii*4].value)*Math.PI/180+orbitParams[ii].b,
        shown:  true
    }
    $('.controls span')[0+ii*6].textContent = $('.slidercontainer input')[0+ii*4].value;
    $('.controls span')[1+ii*6].textContent = $('.slidercontainer input')[1+ii*4].value;
    $('.controls span')[4+ii*6].textContent = $('.slidercontainer input')[2+ii*4].value;
    $('.controls span')[5+ii*6].textContent = $('.slidercontainer input')[3+ii*4].value;
    drawOrbit(orbitParams);
}
document.addEventListener('keypress', function(key){
    let k = key.key;
    if (k === '.' || k === '>') {
        //constTaTailPts = [];
        //constTailPts = [];
        if (timeMult == 1) {
            timeMult = 0;
        }
        timeMult += 100;
        if (timeMult == 0) {
            timeMult = 1;
        }
        $('.timeStepDiv span')[0].textContent = timeMult.toFixed(0);
    }
    if (k === ',' || k === '<') {
        //constTaTailPts = [];
        //constTailPts = [];
        if (timeMult == 1) {
            timeMult = 0;
        }
        timeMult -= 100;
        if (timeMult == 0) {
            timeMult = 1;
        }
        $('.timeStepDiv span')[0].textContent = timeMult.toFixed(0);
    }
    else if (k.toLowerCase() === 's') {
        stars.visible = !stars.visible;
        console.log(stars.visible);
        
    }

});

window.addEventListener('load', (event) => {
    $('.loadingScreen').fadeOut(500);
});
}catch(error){
    alert(error)
}