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
drawRIC();
drawOrbit(orbitParams);

var render = function() {
    let updatedTime = new Date().getTime();
    let persec = 1000/(updatedTime-stopwatch);
    if (lastTenSpeeds.length < 10){
        lastTenSpeeds.push(persec);
    }else{
        lastTenSpeeds = lastTenSpeeds.slice(1,10);
        lastTenSpeeds.push(persec);
        timeStep = timeMult/math.mean(lastTenSpeeds);
    }
    stopwatch = new Date().getTime();

    let n = 2*Math.PI/86164;
    for (let ii = 0; ii < orbitParams.length; ii++){
        orbitParams[ii].b += timeStep/86164*2*Math.PI;
        if (orbitParams[ii].b > 2*Math.PI) {orbitParams[ii].b -= 2*Math.PI}
        orbitParams[ii].M += timeStep/86164*2*Math.PI;
        orbitParams[ii].yd -= 1.5*n*orbitParams[ii].xd*timeStep;

        if (orbitParams[ii].shown){
            $orbitsControls[2+ii*6].textContent = (orbitParams[ii].yd/42164*180/Math.PI).toFixed(2);
            $orbitsControls[3+ii*6].textContent = (orbitParams[ii].b*180/Math.PI).toFixed(1);
        }
    }
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

function drawOrbit(orbitParams) {
    let r,v,rf, itAng, ctAng, rAng, cosB, sinB;
    let n = 2*Math.PI/86164;
    tailLength = 0.5; let numObjects = $('.controls').length;
    //console.log(orbitParams)
    for (var orbitNum = 0; orbitNum < numObjects; orbitNum++) {
        cosB = Math.cos(orbitParams[orbitNum].b);
        sinB = Math.sin(orbitParams[orbitNum].b);
        r = [[-orbitParams[orbitNum].a/2*cosB+orbitParams[orbitNum].xd],
            [orbitParams[orbitNum].a*sinB+orbitParams[orbitNum].yd],
            [orbitParams[orbitNum].zmax*Math.sin(orbitParams[orbitNum].M)]];
        v =  [[orbitParams[orbitNum].a*n/2*sinB],
            [orbitParams[orbitNum].a*n*cosB-1.5*n*orbitParams[orbitNum].xd],
            [orbitParams[orbitNum].zmax*n*Math.cos(orbitParams[orbitNum].M)]];
        
        var points = [];
        
        for (var ii = 0; ii <= 50; ii++) {
            t = -ii*86164*tailLength/50;
            if (ii === 0) {rf = r}
            else {
                rf = [[-orbitParams[orbitNum].a/2*Math.cos(orbitParams[orbitNum].b+t*n)+orbitParams[orbitNum].xd],
                [orbitParams[orbitNum].a*Math.sin(orbitParams[orbitNum].b+t*n)+orbitParams[orbitNum].yd-1.5*orbitParams[orbitNum].xd*n*t],
                [orbitParams[orbitNum].zmax*Math.sin(orbitParams[orbitNum].M+t*n)]];   
            }
            rAng = 42164+rf[0][0];
            itAng = rf[1][0]/rAng;
            ctAng = rf[2][0]/rAng;
            rAng = -scale*rAng/6371;
            
            points.push( new THREE.Vector3( rAng*Math.cos(itAng)*Math.cos(ctAng), -rAng*Math.sin(ctAng), -rAng*Math.sin(itAng))); 

        }
        
        if (orbit[orbitNum] === undefined){
            var geometry = new THREE.SphereGeometry( 0.00035, 6, 6 );
            var material = new THREE.MeshBasicMaterial({
                color: $('.controlTitle').find('input')[$('.controlTitle').find('input').length -1].value});
            satPoint[orbitNum] = new THREE.Mesh( geometry, material );
            satPoint[orbitNum].position.x = -scale*42164/6371-scale*r[0][0]/6371;
            satPoint[orbitNum].position.y = scale*r[2][0]/6371;
            satPoint[orbitNum].position.z = scale*r[1][0]/6371;

            var curve = new THREE.CatmullRomCurve3(points);
            var geometry = new THREE.TubeGeometry(curve, 25, 0.0001, 4, true);
            orbit[orbitNum] = new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({color: $('.controlTitle').find('input')[$('.controlTitle').find('input').length -1].value}));

            scene.add(satPoint[orbitNum]);
            scene.add(orbit[orbitNum]);
        }
        else {
            var curve = new THREE.CatmullRomCurve3(points);
            orbit[orbitNum].geometry = new THREE.TubeGeometry(curve, 100, 0.0001, 8, false);
           
            satPoint[orbitNum].position.x = -scale*42164/6371-scale*r[0][0]/6371;
            satPoint[orbitNum].position.y = scale*r[2][0]/6371;
            satPoint[orbitNum].position.z = scale*r[1][0]/6371;
        }
    }
    
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