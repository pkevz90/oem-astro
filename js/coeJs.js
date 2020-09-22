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

var orbitPoints = [];

var burnOrbitParams = {
    a: 10000,
    e: 0,
    i: 45,
    raan: 0,
    arg: 0,
    mA: 0
};

var burnParams = {
    in_track: 0,
    radial: 0,
    cross_track: 0
};

var constParams = [];
for(i = 0; i < 24; i++){
    constParams.push({
        a: 26561.7,
        e: 0,
        i: 55,
        raan: math.floor(i/4)*60,
        arg: 0,
        mA: (i % 4)*90 + math.floor(i/4)*15
    })
}

var Earth, clouds, sidTime, stopRotate, Sunlight, stars, sunVec, satPoint = [],
    orbit = [],
    burnOrbit = null,
    burnSatPoint = null,
    constTaTailPts = [];
    constOrbit = [],
    constTailPts = [];
    constSatPoint = [],
    nTailPts = 400,
    dt = 600,
    tTail = 3600,
    r = 2;
var gndPts = [],
    constGndPts = [],
    localHoriz = [],
    constLocalHoriz = [];
var   scene, camera, renderer, controls, ecef = false,
    timeStep = 1000/60;
    timeMult = 1000;
var ECI = [],
    ECEF = [],
    RIC = [],
    pari = [];
var jdUTI0 = julianDateCalcStruct(time);
var stopwatch;
var lastTenSpeeds = [];
var constActive = false,
    lhActive = true;

setupScene();
drawEarth();
drawStars();
drawLightSources();
drawAxes();
drawOrbit(orbitParams);

var render = function () {
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
    renderer.render(scene, camera);
    controls.update();
    requestAnimationFrame(render);
    orbitParams.forEach(orbit => {
        orbit.mA += timeStep * 180 / Math.PI * Math.sqrt(398600.4418 / Math.pow(orbit.a, 3));
    })
    if (constActive){
        constParams.forEach(orbit => {
            orbit.mA += timeStep * 180 / Math.PI * Math.sqrt(398600.4418 / Math.pow(orbit.a, 3));
        })
    }
    
    
    sidTime += timeStep / 86164 * 360;
    if (ecef){
        ECI.forEach((item) => {
            item.rotation.y -= timeStep / 86164 * 2 * Math.PI;
        })
    }
    Earth.rotation.y = ECI[0].rotation.y + sidTime * Math.PI/180;
    clouds.rotation.y = ECI[0].rotation.y + sidTime * Math.PI/180;
    ECEF.forEach((item) => {
        item.rotation.y = ECI[0].rotation.y + sidTime * Math.PI/180 + Math.PI;
    })
    let curSun = Eci2Ecef(-(ECI[0].rotation.y * 180/Math.PI), sunVec);
    Sunlight.position.x = -100 * curSun[0][0];
    Sunlight.position.y = 100 * curSun[2][0];
    Sunlight.position.z = 100 * curSun[1][0];
    stars.rotation.y  = ECI[0].rotation.y;
    if (!$('#optionsList input')[4].checked){
        drawOrbit(orbitParams)
    }
    if (constActive){
        drawConst(constParams)
    }
}

render();

function setupScene() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight);
    camera.position.set(-10, 15, 10);
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
    let r;
    orbitParams.forEach((orbitP,index) => {
        let tA = Eccentric2True(orbitP.e, solveKeplersEquation(orbitP.mA * Math.PI / 180, orbitP.e))
        let shownOrbit; // Remove some array elements to not having
        if (index === 0) {
            let coeOriginal = {...orbitP};
            coeOriginal.tA = tA;
            let posvelState = Coe2PosVelNew(coeOriginal);
            //console.log(coeOriginal,posvelState,PosVel2CoeNew(posvelState));
            let radial = math.dotDivide([posvelState.x, posvelState.y, posvelState.z],math.norm([posvelState.x, posvelState.y, posvelState.z]));
            let cross_track = math.cross([posvelState.x, posvelState.y, posvelState.z], [posvelState.vx, posvelState.vy, posvelState.vz]);
            cross_track = math.dotDivide(cross_track,math.norm(cross_track));
            let in_track = math.cross(cross_track, radial);
            in_track = math.dotMultiply(in_track, burnParams.in_track );
            //console.log(in_track)
            cross_track = math.dotMultiply(cross_track, burnParams.cross_track);
            radial = math.dotMultiply(radial, burnParams.radial);
            posvelState.vx += in_track[0] + cross_track[0] + radial[0];
            posvelState.vy += in_track[1] + cross_track[1] + radial[1];
            posvelState.vz += in_track[2] + cross_track[2] + radial[2];
            //console.log(posvelState);
            let newCoe = PosVel2CoeNew(posvelState);
            //console.log(newCoe.tA)
            newCoe.mA = True2Eccentric(newCoe.e,newCoe.tA);
            newCoe.mA = newCoe.mA - newCoe.e * Math.sin(newCoe.mA);
            burnOrbitParams = {
                a: newCoe.a,
                e: newCoe.e,
                i: newCoe.i * 180 / Math.PI,
                raan: newCoe.raan * 180 / Math.PI,
                arg: newCoe.arg * 180 / Math.PI,
                mA: newCoe.mA * 180 / Math.PI  
            };
            //console.log(posvelState, burnOrbitParams);
            if (Math.abs(burnOrbitParams.raan - 360) < 1e-4) {
                burnOrbitParams.raan = 0;
            }
            if (Number.isNaN(burnOrbitParams.arg)) {
                burnOrbitParams.arg = 0;
            }
            $('#burn_inputs span').eq(0).text(burnOrbitParams.a.toFixed(0));
            $('#burn_inputs span').eq(1).text(burnOrbitParams.e.toFixed(2));
            $('#burn_inputs span').eq(2).text(burnOrbitParams.i.toFixed(0));
            $('#burn_inputs span').eq(3).text(burnOrbitParams.raan.toFixed(0));
        }
        if (!$('#optionsList input')[4].checked){
            $('.controls span')[5+index*6].textContent = ((((2*math.PI) + tA) % (2*math.PI))*180/math.PI).toFixed(0)
        }
        let coe = [orbitP.a, orbitP.e, orbitP.i * Math.PI / 180, ECI[0].rotation.y + (orbitP.raan * Math.PI / 180), orbitP.arg * Math.PI / 180, tA]
        if (orbitPoints[index] === undefined) {
            orbitPoints[index] = [];
        }
        r = Coe2PosVel(coe);
        r = r[0];
        orbitPoints[index].push(new THREE.Vector3(-r[0][0] / 6371, r[2][0] / 6371, r[1][0] / 6371));
        while (orbitPoints[index].length > (tTail / timeStep)) {
            orbitPoints[index].shift();
        }
        let length = orbitPoints[index].length;
        if (length > 200) {
            let d = Math.floor(length / 100);
            shownOrbit = orbitPoints[index].filter((element, index) => {
                return index % d === 0;
            })
        }
        else {
            shownOrbit = orbitPoints[index];
        }
        if (orbit[index] === undefined) {
            var material = new THREE.LineBasicMaterial({
                color: $('.controlTitle').find('input')[$('.controlTitle').find('input').length -1].value,
                linewidth: 2
            });
            var geometry = new THREE.BufferGeometry().setFromPoints(shownOrbit);
            orbit[index] = new THREE.Line(geometry, material);
            var geometry = new THREE.SphereGeometry(0.05, 6, 6);
            var material = new THREE.MeshBasicMaterial({
                color: $('.controlTitle').find('input')[$('.controlTitle').find('input').length -1].value
            });
            satPoint[index] = new THREE.Mesh(geometry, material);
            satPoint[index].position.x = -r[0][0] / 6371;
            satPoint[index].position.y = r[2][0] / 6371;
            satPoint[index].position.z = r[1][0] / 6371;

            scene.add(satPoint[index]);
            scene.add(orbit[index]);
            gndPts[index] = new THREE.Mesh(geometry,material);//satPoint[index];
            gndpt = getGroundPoint(satPoint[index].position.x,satPoint[index].position.y,satPoint[index].position.z);
            Object.assign(gndPts[index].position,{x: gndpt.x ,y:gndpt.y ,z: gndpt.z})
            //scene.add(gndPts[index])
            if (lhActive){
                let swc = 2.05*math.sin(math.acos(1/math.norm(xyzToVec(satPoint[index].position))));
                if (satPoint[index].position.z != 0){
                    perpvec1 = math.cross(xyzToVec(satPoint[index].position),[1,0,0]);
                    perpvec1 = perpvec1.map(val => {return (swc/2)*val/math.norm(perpvec1)});
                }
                else{
                    perpvec1 = [0,0,(swc/2)];
                }
                perpvec2 = math.cross(xyzToVec(satPoint[index].position),perpvec1);
                perpvec2 = perpvec2.map(val => {return (swc/2)*val/math.norm(perpvec2)});
                let angles = Array(31).fill(0).map((val,ind)=>{return (ind/30)*2*math.PI})
                centerpt = xyzToVec(gndPts[index].position).map(val => {return val*math.sqrt(1-math.pow(swc/2,2))})
                //console.log(centerpt)
                lhpts = angles.map(val => {return {x: 1.01*(centerpt[0] + (perpvec1[0]*math.sin(val))+(perpvec2[0]*math.cos(val))),
                    y: 1.01*(centerpt[1] + (perpvec1[1]*math.cos(val))+(perpvec2[1]*math.sin(val))),
                    z: 1.01*(centerpt[2] + (perpvec1[2]*math.cos(val))+(perpvec2[2]*math.sin(val)))}});
                var material = new THREE.LineBasicMaterial({
                        color: $('.controlTitle').find('input')[$('.controlTitle').find('input').length -1].value,
                        linewidth: 2
                        });
                var geometry = new THREE.BufferGeometry().setFromPoints(lhpts);
                localHoriz[index] = new THREE.Line(geometry, material);
                scene.add(localHoriz[index])
            }
        } else {
            // Edit orbitVar
            orbit[index].geometry.setFromPoints(orbitPoints[index]);
            satPoint[index].position.x = -r[0][0] / 6371;
            satPoint[index].position.y = r[2][0] / 6371;
            satPoint[index].position.z = r[1][0] / 6371;
            //gndPts[index] = satPoint[index];
            if (lhActive){
                gndpt = getGroundPoint(satPoint[index].position.x,satPoint[index].position.y,satPoint[index].position.z);
                Object.assign(gndPts[index].position,{x: gndpt.x ,y:gndpt.y ,z: gndpt.z})
                let swc = 2*math.sin(math.acos(1/math.norm(xyzToVec(satPoint[index].position))));
                //console.log(math.acos(1/math.norm(xyzToVec(satPoint[index].position))))
                if (satPoint[index].position.z != 0){
                    perpvec1 = math.cross(xyzToVec(satPoint[index].position),[1,0,0]);
                    perpvec1 = perpvec1.map(val => {return (swc/2)*val/math.norm(perpvec1)});
                }
                else{
                    perpvec1 = [0,0,(swc/2)];
                }
                perpvec2 = math.cross(xyzToVec(satPoint[index].position),perpvec1);
                perpvec2 = perpvec2.map(val => {return (swc/2)*val/math.norm(perpvec2)});
                let angles = Array(31).fill(0).map((val,ind)=>{return (ind/30)*2*math.PI})
                centerpt = xyzToVec(gndPts[index].position).map(val => {return val*math.sqrt(1-math.pow(swc/2,2))})
                lhpts = angles.map(val => {return {x: 1.01*(centerpt[0] + (perpvec1[0]*math.cos(val))+(perpvec2[0]*math.sin(val))),
                    y: 1.01*(centerpt[1] + (perpvec1[1]*math.cos(val))+(perpvec2[1]*math.sin(val))),
                    z: 1.01*(centerpt[2] + (perpvec1[2]*math.cos(val))+(perpvec2[2]*math.sin(val)))}});
                localHoriz[index].geometry.setFromPoints(lhpts)
                if (!localHoriz[0].visible){
                    localHoriz.forEach(lineobj => {lineobj.visible = true;});
                }
            }
        }
    })
    
    // Burn Orbit
    var points = [];
    if (math.norm([burnParams.radial, burnParams.in_track, burnParams.cross_track]) < 1e-6) {
        points.push(new THREE.Vector3(0, 0, 0));
    }
    else {
        let tA = Eccentric2True(burnOrbitParams.e, solveKeplersEquation(burnOrbitParams.mA * Math.PI / 180, burnOrbitParams.e));
        let coe = [burnOrbitParams.a, burnOrbitParams.e, burnOrbitParams.i * Math.PI / 180, ECI[0].rotation.y + (burnOrbitParams.raan * Math.PI / 180), burnOrbitParams.arg * Math.PI / 180, tA]
        let tStep = tTail / 150;
        for (var ii = 0; ii <= 150; ii++) {
            r = Coe2PosVel(coe);
            r = r[0];
            if (ecef) {
                r = Eci2Ecef(ii * tStep / 86164 * 360, r)
            }
            points.push(new THREE.Vector3(-r[0][0] / 6371, r[2][0] / 6371, r[1][0] / 6371));

            coe = twoBodyProp(coe, tStep);
        }
    }
    
    if (burnOrbit === null) {
        var material = new THREE.LineDashedMaterial({
            color: 'rgb(200,200,200)',
            linewidth: 2,
        });
        var geometry = new THREE.BufferGeometry().setFromPoints(points);
        burnOrbit = new THREE.Line(geometry, material);

        scene.add(burnOrbit);
    } else {
        // Edit orbitVar
        burnOrbit.geometry.setFromPoints(points);
        //gndPts[index] = satPoint[index];
    }
}
function xyzToVec(vec){
    return [vec.x,vec.y,vec.z];
}
function angularDistance(ang1,ang2){
    ang1 = ((2*math.PI) + ang1) % (2*math.PI);
    ang2 = ((2*math.PI) + ang2) % (2*math.PI);
    return math.min([math.abs(ang1-ang2),math.abs(ang1-ang2)]);
}
function leadBy(angLead,angFollow){
    angLead = ((2*math.PI) + angLead) % (2*math.PI);
    angFollow = ((2*math.PI) + angFollow) % (2*math.PI);
    return ((2*math.PI) + (angLead-angFollow)) % (2*math.PI);
}
function drawConst(constParams) {
    let r, r0;
    constParams.forEach((orbitP,index) => {
        let tA = Eccentric2True(orbitP.e, solveKeplersEquation(orbitP.mA * Math.PI / 180, orbitP.e))
        let period = 2 * Math.PI * Math.sqrt(Math.pow(orbitP.a, 3) / 398600.4418);
        let coe = [orbitP.a, orbitP.e, orbitP.i * Math.PI / 180, ECI[0].rotation.y + (orbitP.raan * Math.PI / 180), orbitP.arg * Math.PI / 180, tA]
        let tailLength = Number($('#optionsList input')[0].value) / 100;
        r0=Coe2PosVel(coe);
        r0=[r0[0][0], r0[0][1], r0[0][2]];
        if (constTailPts[index]==undefined){
            constTailPts[index]=[];
            constTaTailPts[index] = [];
        }
        if (constTailPts[index].length == 0 || angularDistance(tA, constTaTailPts[index][constTaTailPts[index].length-1]) >= (tailLength * 2 * math.PI / nTailPts)){
            constTailPts[index].push(new THREE.Vector3(-r0[0][0] / 6371, r0[2][0] / 6371, r0[1][0] / 6371));
            constTaTailPts[index].push(tA);
        }
        if (constTailPts[index].length > nTailPts){
            constTailPts[index].shift();
            constTaTailPts[index].shift();
        }
        if (leadBy(constTaTailPts[index][constTaTailPts[index].length-1], constTaTailPts[index][0]) > (tailLength * 2 * math.PI)){
            temp=constTaTailPts[index].map(val => ((2*math.PI) +constTaTailPts[index][constTaTailPts[index].length-1] - val) % (2*math.PI) > (tailLength * 2 * math.PI));
            ind = temp.findIndex(val => {return !val});
            constTaTailPts[index] = constTaTailPts[index].slice(ind);
            constTailPts[index] = constTailPts[index].slice(ind);
        }
        if (constOrbit == undefined || constOrbit[index] === undefined) {
            var material = new THREE.LineBasicMaterial({
                color: $('.constInfo input')[0].value,
                linewidth: 2
            });
            var geometry = new THREE.BufferGeometry().setFromPoints(constTailPts[index]);
            constOrbit[index] = new THREE.Line(geometry, material);
            var geometry = new THREE.SphereGeometry(0.05, 6, 6);
            var material = new THREE.MeshBasicMaterial({
                color: $('.constInfo input')[0].value
            });
            constSatPoint[index] = new THREE.Mesh(geometry, material);
            // coe = [orbitParams.a, orbitParams.e, orbitParams.i*Math.PI/180, orbitParams.raan*Math.PI/180, orbitParams.arg*Math.PI/180, tA]
            // r = Coe2PosVel(coe);
            constSatPoint[index].position.x = -r0[0][0] / 6371;
            constSatPoint[index].position.y = r0[2][0] / 6371;
            constSatPoint[index].position.z = r0[1][0] / 6371;

            scene.add(constSatPoint[index]);
            scene.add(constOrbit[index]);
            constGndPts[index] = new THREE.Mesh(geometry,material);
            gndpt = getGroundPoint(constSatPoint[index].position.x,constSatPoint[index].position.y,constSatPoint[index].position.z);
            Object.assign(constGndPts[index].position,{x: gndpt.x ,y:gndpt.y ,z: gndpt.z})
            //scene.add(constGndPts[index])
            if (lhActive){
                let swc = 2*math.sin(math.acos(1/math.norm(xyzToVec(constSatPoint[index].position))));
                if (constSatPoint[index].position.z != 0){
                    perpvec1 = math.cross(xyzToVec(constSatPoint[index].position),[1,0,0]);
                    perpvec1 = perpvec1.map(val => {return (swc/2)*val/math.norm(perpvec1)});
                }
                else{
                    perpvec1 = [0,0,(swc/2)];
                }
                perpvec2 = math.cross(xyzToVec(constSatPoint[index].position),perpvec1);
                perpvec2 = perpvec2.map(val => {return (swc/2)*val/math.norm(perpvec2)});
                let angles = Array(31).fill(0).map((val,ind)=>{return (ind/30)*2*math.PI})
                centerpt = xyzToVec(constGndPts[index].position).map(val => {return val*math.sqrt(1-math.pow(swc/2,2))})
                //console.log(centerpt)
                lhpts = angles.map(val => {return {x: 1.01*(centerpt[0] + (perpvec1[0]*math.sin(val))+(perpvec2[0]*math.cos(val))),
                    y: 1.01*(centerpt[1] + (perpvec1[1]*math.cos(val))+(perpvec2[1]*math.sin(val))),
                    z: 1.01*(centerpt[2] + (perpvec1[2]*math.cos(val))+(perpvec2[2]*math.sin(val)))}});
                var material = new THREE.LineBasicMaterial({
                        color: $('.constInfo input')[0].value,
                        linewidth: 2
                        });
                var geometry = new THREE.BufferGeometry().setFromPoints(lhpts);
                constLocalHoriz[index] = new THREE.Line(geometry, material);
                scene.add(constLocalHoriz[index])
            }
        } else {
            // Edit orbitVar
            constOrbit[index].geometry.setFromPoints(constTailPts[index]);
            constSatPoint[index].position.x = -r0[0][0] / 6371;
            constSatPoint[index].position.y = r0[2][0] / 6371;
            constSatPoint[index].position.z = r0[1][0] / 6371;
            if (lhActive){
                gndpt = getGroundPoint(constSatPoint[index].position.x,constSatPoint[index].position.y,constSatPoint[index].position.z);
                Object.assign(constGndPts[index].position,{x: gndpt.x ,y:gndpt.y ,z: gndpt.z})
                
                let swc = 2*math.sin(math.acos(1/math.norm(xyzToVec(constSatPoint[index].position))));
                //console.log(swc)
                if (constSatPoint[index].position.z != 0){
                    perpvec1 = math.cross(xyzToVec(constSatPoint[index].position),[1,0,0]);
                    perpvec1 = perpvec1.map(val => {return (swc/2)*val/math.norm(perpvec1)});
                }
                else{
                    perpvec1 = [0,0,(swc/2)];
                }
                perpvec2 = math.cross(xyzToVec(constSatPoint[index].position),perpvec1);
                perpvec2 = perpvec2.map(val => {return (swc/2)*val/math.norm(perpvec2)});
                //console.log(perpvec1,perpvec2)
                let angles = Array(31).fill(0).map((val,ind)=>{return (ind/30)*2*math.PI})
                centerpt = xyzToVec(constGndPts[index].position).map(val => {return val*math.sqrt(1-math.pow(swc/2,2))})
                lhpts = angles.map(val => {return {x: 1.01*(centerpt[0] + (perpvec1[0]*math.cos(val))+(perpvec2[0]*math.sin(val))),
                    y: 1.01*(centerpt[1] + (perpvec1[1]*math.cos(val))+(perpvec2[1]*math.sin(val))),
                    z: 1.01*(centerpt[2] + (perpvec1[2]*math.cos(val))+(perpvec2[2]*math.sin(val)))}});
                //console.log(lhpts)
                constLocalHoriz[index].geometry.setFromPoints(lhpts)
                if (!constLocalHoriz[0].visible){
                    constLocalHoriz.forEach(lineobj => {lineobj.visible = true;});
                }
            }
        }
    })
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
    ECI.push(new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({ color: 0x44ff44 })));
    ECEF.push(new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({ color: 0x4444ff })));
    // ECI Y
    var curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, 3),
    ]);
    var geometry = new THREE.TubeGeometry(curve, 4, 0.05, 8, true);
    ECI.push(new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({ color: 0x44ff44 })));
    ECEF.push(new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({ color: 0x4444ff })));
    // ECI Z
    var curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 3, 0),
    ]);
    var geometry = new THREE.TubeGeometry(curve, 4, 0.05, 8, true);
    ECI.push(new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({ color: 0x44ff44 })));
    ECEF.push(new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({ color: 0x4444ff })));
    ECI.forEach((item) => {
        scene.add(item);
    })
    ECEF.forEach((item) => {
        item.rotation.y = 0.2;
        scene.add(item);
    })
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
    sunVec = sunVectorCalc(jdUTI0);

    Sunlight.position.set(-100 * sunVec[0][0], 100 * sunVec[2][0], 100 * sunVec[1][0]);
    scene.add(Sunlight);
    var light1 = new THREE.AmbientLight(0xFFFFFF, 0.2); // soft white light
    scene.add(light1);
}

function getGroundPoint(x,y,z){
    return {x: (1.0/(math.norm([x,y,z]))*x),
            y: (1.0/(math.norm([x,y,z]))*y),
            z: (1.0/(math.norm([x,y,z]))*z)};
}

$('#optionsList input').on('input', () => {
    $('#optionsList span').eq(0).text($('#optionsList input').eq(0).val());
    tTail = Number($('#optionsList input').eq(0).val()) * 3600;
    ECI.forEach((item) => {
        item.visible = $('#optionsList input')[1].checked
    })
    ECEF.forEach((item) => {
        item.visible = $('#optionsList input')[2].checked
    })
    if (!$('#optionsList input')[4].checked){
        $('.controlTitle').show();
        $('.controls').show();
        $('.addButton').show();
        orbit.forEach(lineobj => {lineobj.visible = true;});
        satPoint.forEach(pointobj => {pointobj.visible = true;});
        $('.orbitsPane').show()
    }else{
        $('.controlTitle').hide();
        $('.controls').hide();
        $('.addButton').hide();
        orbit.forEach(lineobj => {lineobj.visible = false;});
        satPoint.forEach(pointobj => {pointobj.visible = false;});
        $('.orbitList').hide()
        $('.orbitsPane').hide()
    }
    if ($('#optionsList input')[3].checked){
        lhActive = true;
        //constLocalHoriz.forEach(lineobj => {lineobj.visible = true;});
        //localHoriz.forEach(lineobj => {lineobj.visible = true;})
    }else{
        lhActive = false;
        constLocalHoriz.forEach(lineobj => {lineobj.visible = false;});
        localHoriz.forEach(lineobj => {lineobj.visible = false;})
    }
    if ($('#optionsList input')[3].checked && $('#optionsList input')[4].checked) {
        localHoriz.forEach(lineobj => {lineobj.visible = false;})
    }

})
$('#constClose').on('click',(a)=>{
    $('.constInfo').hide();
    constOrbit.forEach(lineobj => {lineobj.visible = false;});
    constSatPoint.forEach(pointobj => {pointobj.visible = false;});
    constLocalHoriz.forEach(lineobj => {lineobj.visible = false;});
    constActive = false;
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
    orbitPoints[ii] = [];
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
    if (k.toLowerCase() === 'c') {
        constTaTailPts = [];
        constTailPts = [];
        ecef = !ecef;
        if (ecef) {
            $('.referenceDiv span').text('Earth-Fixed');
        } else {
            $('.referenceDiv span').text('Inertial');
        }
        orbitPoints.forEach((element,index) => {
            orbitPoints[index] = [];
        })
        console.log(orbitPoints);
    } else if (k === '.' || k === '>') {
        // if (timeMult == 1) {
        //     timeMult = 0;
        // }
        timeMult += 100;
        // if (timeMult == 0) {
        //     timeMult = 1;
        // }
        $('.timeStepDiv span')[0].textContent = timeMult.toFixed(0);
    } else if (k === ',' || k === '<') {
        if (timeMult == 0) {
            // timeMult = 0;
            return;
        }
        timeMult -= 100;
        // if (timeMult == 0) {
        //     timeMult = 1;
        // }
        $('.timeStepDiv span')[0].textContent = timeMult.toFixed(0);
    } else if (k.toLowerCase() === 's') {
        stars.visible = !stars.visible;
    } else if (k.toLowerCase() === 'p') {
        if (Earth.visible){
            satPoint.forEach((pt) => {pt.visible = false;});
            constSatPoint.forEach((pt) => {pt.visible = false;});
            Earth.visible = false;
            clouds.visible = false;
            ECI.forEach((item) => {item.visible = false;});
            ECEF.forEach((item) => {item.visible = false;});
            constLocalHoriz.forEach(lineobj => {lineobj.visible = false;});
            localHoriz.forEach(lineobj => {lineobj.visible = false;})
            lhActive = false;
        } else {
            satPoint.forEach((pt) => {pt.visible = !$('#optionsList input')[4].checked;});
            constSatPoint.forEach((pt) => {pt.visible = constActive;});
            Earth.visible = true;
            clouds.visible = true;
            ECI.forEach((item) => {item.visible = $('#optionsList input')[1].checked;});
            ECEF.forEach((item) => {item.visible = $('#optionsList input')[2].checked;});
            constLocalHoriz.forEach(lineobj => {lineobj.visible = lhActive;});
            localHoriz.forEach(lineobj => {lineobj.visible = lhActive;})
            $('#optionsList span')[0].textContent = $('#optionsList input')[0].value;
            ECI.forEach((item) => {
                item.visible = $('#optionsList input')[1].checked
            })
            ECEF.forEach((item) => {
                item.visible = $('#optionsList input')[2].checked
            })
            if (!$('#optionsList input')[4].checked){
                $('.controlTitle').show();
                $('.controls').show();
                $('.addButton').show();
                orbit.forEach(lineobj => {lineobj.visible = true;});
                satPoint.forEach(pointobj => {pointobj.visible = true;});
                $('.orbitsPane').show()
            }else{
                $('.controlTitle').hide();
                $('.controls').hide();
                $('.addButton').hide();
                orbit.forEach(lineobj => {lineobj.visible = false;});
                satPoint.forEach(pointobj => {pointobj.visible = false;});
                $('.orbitList').hide()
                $('.orbitsPane').hide()
            }
            if ($('#optionsList input')[3].checked){
                lhActive = true;
                //constLocalHoriz.forEach(lineobj => {lineobj.visible = true;});
                //localHoriz.forEach(lineobj => {lineobj.visible = true;})
            }else{
                lhActive = false;
                constLocalHoriz.forEach(lineobj => {lineobj.visible = false;});
                localHoriz.forEach(lineobj => {lineobj.visible = false;})
            }
            if ($('#optionsList input')[3].checked && $('#optionsList input')[4].checked) {
                localHoriz.forEach(lineobj => {lineobj.visible = false;})
            }
        }
    } else if (k === ' ') {
        orbitParams[0] = {...burnOrbitParams};
        // orbitPoints[0] = [];
        burnParams = {
            radial: 0,
            in_track: 0,
            cross_track: 0
        }
        $('#burn_inputs input').val(0);
        
        $('.slidercontainer input').eq(0).val(orbitParams[0].a);
        $('.slidercontainer input').eq(1).val(orbitParams[0].e);
        $('.slidercontainer input').eq(2).val(orbitParams[0].i);
        $('.slidercontainer input').eq(3).val(orbitParams[0].raan);
        $('.slidercontainer input').eq(4).val(orbitParams[0].arg);
        $('.controls span').eq(0).text($('.slidercontainer input').eq(0).val());
        $('.controls span').eq(1).text($('.slidercontainer input').eq(1).val());
        $('.controls span').eq(2).text($('.slidercontainer input').eq(2).val());
        $('.controls span').eq(3).text($('.slidercontainer input').eq(3).val());
        $('.controls span').eq(4).text($('.slidercontainer input').eq(4).val());
    }


});

window.addEventListener('load', () => {
    $('.loadingScreen').fadeOut(500);
});

$('#constList p').on('click', (a) => {
    let constel = a.target.innerHTML;
    constSatPoint.forEach(tempPoint => {
        tempObj = scene.getObjectByProperty('uuid',tempPoint.uuid);
        tempObj.geometry.dispose();
        tempObj.material.dispose();
        scene.remove(tempObj)
    })
    constOrbit.forEach(tempOrbit => {
        tempObj = scene.getObjectByProperty('uuid',tempOrbit.uuid);
        tempObj.geometry.dispose();
        tempObj.material.dispose();
        scene.remove(tempObj)
    })
    constLocalHoriz.forEach(tempLH => {
        tempObj = scene.getObjectByProperty('uuid',tempLH.uuid);
        tempObj.geometry.dispose();
        tempObj.material.dispose();
        scene.remove(tempObj)
    })

    $('.constInfo').show();
    constOrbit.forEach(lineobj => {lineobj.visible = true;});
    constSatPoint.forEach(pointobj => {pointobj.visible = true;});
    constLocalHoriz.forEach(lineobj => {lineobj.visible = true;});
    constActive = true;

    constParams = [];
    constOrbit = [];
    constSatPoint = [];
    constTaTailPts = [];
    constTailPts = [];
    constLocalHoriz = [];
    switch(constel) {
        case 'GPS (24 Satellites)':
            for(i = 0; i < 24; i++){
                constParams.push({
                    a: 26561.7,
                    e: 0,
                    i: 55,
                    raan: math.floor(i/4)*60,
                    arg: 0,
                    mA: (i % 4)*90 + (math.floor(i/4)%2)*(360/4/2)
                })
            }
            $('#constName')[0].innerText = "GPS (24 Satellites)"
            $('.constInfo .value')[0].innerText = "26561.7 km";
            $('.constInfo .value')[1].innerText = "0";
            $('.constInfo .value')[2].innerText = "55°";
            $('.constInfo .value')[3].innerText = "0°/60°/120°/...";
            $('.constInfo .value')[4].innerText = "N/A (circular)";
            $('.constInfo .value')[5].innerText = "Varies by Satellite";
            break;
        case 'Iridium (66 Satellites)':
            for(i = 0; i < 66; i++){
                constParams.push({
                    a: 6378+781,
                    e: 0,
                    i: 86.4,
                    raan: math.floor(i/11)*30,
                    arg: 0,
                    mA: (i % 11)*(360/11) + (math.floor(i/11)%2)*(360/11/2)
                })
            }
            $('#constName')[0].innerText = "Iridium (66 Satellites)"
            $('.constInfo .value')[0].innerText = "7159 km";
            $('.constInfo .value')[1].innerText = "0";
            $('.constInfo .value')[2].innerText = "86.4°";
            $('.constInfo .value')[3].innerText = "0°/30°/60°/...";
            $('.constInfo .value')[4].innerText = "N/A (circular)";
            $('.constInfo .value')[5].innerText = "Varies by Satellite";
            break;
        case 'Molniya (3 Satellites)':
            console.log("hi")
            for(i = 0; i < 3; i++){
                constParams.push({
                    a: 26561.7,
                    e: .74,
                    i: 63.4,
                    raan: i*120,
                    arg: 270,
                    mA: i*120
                })
            }
            $('#constName')[0].innerText = "Molniya (3 Satellites)"
            $('.constInfo .value')[0].innerText = "26561.7 km";
            $('.constInfo .value')[1].innerText = "0.74";
            $('.constInfo .value')[2].innerText = "63.4°";
            $('.constInfo .value')[3].innerText = "0°/120°/240°";
            $('.constInfo .value')[4].innerText = "270°";
            $('.constInfo .value')[5].innerText = "Varies by Satellite";
            break;
    }
})

$('#orbitList p').on('click', (a) => {
    let orbit = a.target.innerHTML;
    let kk = -1;
    $('.controls').each(index => {
        if ($('.controls').eq(index).is(':visible')) {
            kk = index;
        }
    });
    orbitPoints[kk] = [];
    //console.log(kk)
    switch (orbit) {
        case 'ISS':
            orbitParams[kk] = {
                a: 6784.2389,
                e: 0.0002297,
                i: 51.6444,
                raan: 0,
                arg: 0,
                mA: orbitParams[kk].mA
            }
            break;
        case 'GPS':
            orbitParams[kk] = {
                a: 26561.7437,
                e: 0,
                i: 55,
                raan: 0,
                arg: 0,
                mA: orbitParams[kk].mA
            }
            break;
        case 'Molniya':

            orbitParams[kk] = {
                a: 26561.7437,
                e: 0.74,
                i: 63.4,
                raan: 0,
                arg: 270,
                mA: orbitParams[kk].mA
            }
            break;
        case 'Iridium':

                orbitParams[kk] = {
                    a: 7159,
                    e: 0,
                    i: 85.9,
                    raan: 0,
                    arg: 0,
                    mA: orbitParams[kk].mA
                }
                break;
        case 'Sun-Synchronous':
            orbitParams[kk] = {
                a: 6784.2389,
                e: 0.0002297,
                i: 98,
                raan: 0,
                arg: 0,
                mA: orbitParams[kk].mA
            }
            break;
        case 'Geo-Stationary':
            orbitParams[kk] = {
                a: 42164,
                e: 0,
                i: 0,
                raan: 0,
                arg: 0,
                mA: orbitParams[kk].mA
            }
            break;
        default:
            break;
    }
    $('.slidercontainer input')[0+kk*6].value = orbitParams[kk].a;
    $('.slidercontainer input')[1+kk*6].value = orbitParams[kk].e;
    $('.slidercontainer input')[2+kk*6].value = orbitParams[kk].i;
    $('.slidercontainer input')[3+kk*6].value = orbitParams[kk].raan;
    $('.slidercontainer input')[4+kk*6].value = orbitParams[kk].arg;
    $('.controls span')[0+kk*6].textContent = $('.slidercontainer input')[0+kk*6].value;
    $('.controls span')[1+kk*6].textContent = $('.slidercontainer input')[1+kk*6].value;
    $('.controls span')[2+kk*6].textContent = $('.slidercontainer input')[2+kk*6].value;
    $('.controls span')[3+kk*6].textContent = $('.slidercontainer input')[3+kk*6].value;
    $('.controls span')[4+kk*6].textContent = $('.slidercontainer input')[4+kk*6].value;
})

function Coe2PosVelNew(coe) {
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
    let cRa = Math.cos(coe.raan * Math.PI / 180); let sRa = Math.sin(coe.raan * Math.PI / 180); 
    let cAr = Math.cos(coe.arg * Math.PI / 180); let sAr = Math.sin(coe.arg * Math.PI / 180);
    let cIn = Math.cos(coe.i * Math.PI / 180); let sin = Math.sin(coe.i * Math.PI / 180);
    R = [[cRa*cAr-sRa*sAr*cIn, -cRa*sAr-sRa*cAr*cIn, sRa*sin],
         [sRa*cAr+cRa*sAr*cIn, -sRa*sAr+cRa*cAr*cIn, -cRa*sin],
         [sAr*sin, cAr*sin, cIn]];
    let state = [math.multiply(R,r),math.multiply(R,v)];
    return {x: state[0][0][0], y: state[0][1][0], z: state[0][2][0], vx: state[1][0][0], vy: state[1][1][0], vz: state[1][2][0]};
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

function burnChange() {
    burnParams = {
        radial: Number($('#burn_inputs input').eq(0).val()),
        in_track: Number($('#burn_inputs input').eq(1).val()),
        cross_track: Number($('#burn_inputs input').eq(2).val())
    }
}