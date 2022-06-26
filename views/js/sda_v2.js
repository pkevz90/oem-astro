let mainWindow = {
    planet: {
        mu: 398600.4418,
        r: 6371,
        w: 2 * Math.PI / 86164,
        sidAngle: 0 //at t = 0
    },
    initSun: [-94309.749762,    139482969.590637,    60466737.314102],
    maxTime: 24 * 3600, //seconds
    propTime: 60,
    startTime: new Date(),
    satellites: [
        {
            origState: [42164, 0, 0, 0, 3.0629662506494473, 0.2679748236943305],
            obFreq: 900,
            obs: []
        }
    ],
    sensors: undefined
}

function runge_kutta(state, dt) {
    eom = orbitalDynamics
    let k1 = eom(state);
    let k2 = eom(math.add(state, math.dotMultiply(dt/2, k1)));
    return math.squeeze(math.add(state, math.dotMultiply(dt, k2)));
}

function orbitalDynamics(position = [42164, 0, 0, 0, 3.074, 0], j2Eff = false) {
    let mu = 398600.44189, j2 = 0.00108262668, re = 6378, x = position[0], y = position[1], z = position[2]
    let r = math.norm(position.slice(0,3))
    return j2Eff ? [
        position[3], position[4], position[5],
        -mu * x / r ** 3 * (1 - 1.5 * j2 * re ** 2 / r ** 2 * (5 * z ** 2 / r ** 2 - 1)),
        -mu * y / r ** 3 * (1 - 1.5 * j2 * re ** 2 / r ** 2 * (5 * z ** 2 / r ** 2 - 1)),
        -mu * z / r ** 3 * (1 - 1.5 * j2 * re ** 2 / r ** 2 * (5 * z ** 2 / r ** 2 - 3))
    ] : 
    [
        position[3], position[4], position[5],
        -mu * x / r ** 3 ,
        -mu * y / r ** 3 ,
        -mu * z / r ** 3 
    ]
}

function rotMatrixFrames(frameTo = frameFrom = math.identity(3)._data, frameFrom = math.identity(3)._data) {
    return [
        [math.dot(frameTo[0], frameFrom[0]), math.dot(frameTo[0], frameFrom[1]), math.dot(frameTo[0], frameFrom[2])],
        [math.dot(frameTo[1], frameFrom[0]), math.dot(frameTo[1], frameFrom[1]), math.dot(frameTo[1], frameFrom[2])],
        [math.dot(frameTo[2], frameFrom[0]), math.dot(frameTo[2], frameFrom[1]), math.dot(frameTo[2], frameFrom[2])]
    ]
}

function rotationMatrices(angle = 0, axis = 1, type = 'deg') {
    if (type === 'deg') {
        angle *= Math.PI / 180;
    }
    let rotMat;
    if (axis === 1) {
        rotMat = [
            [1, 0, 0],
            [0, Math.cos(angle), -Math.sin(angle)],
            [0, Math.sin(angle), Math.cos(angle)]
        ];
    } else if (axis === 2) {
        rotMat = [
            [Math.cos(angle), 0, Math.sin(angle)],
            [0, 1, 0],
            [-Math.sin(angle), 0, Math.cos(angle)]
        ];
    } else {
        rotMat = [
            [Math.cos(angle), -Math.sin(angle), 0],
            [Math.sin(angle), Math.cos(angle), 0],
            [0, 0, 1]
        ]
    }
    return rotMat;
}

function estimateCovariance(sat = 0) {
    let blsMatrices = createJacobian(sat)
    let a = math.inv(math.multiply(math.transpose(blsMatrices.jac), blsMatrices.w, blsMatrices.jac))
    console.log(choleskyDecomposition(a));
    let eigs
    try {
        eigs = math.eigs(a).values.map(s => s ** 0.5);
    } catch (error) {
        eigs = error.values.map(s => s ** 0.5);
    }
    let div = document.getElementById('cov-display')
    div.innerHTML = `Largest Position Error: ${Math.max(...eigs).toFixed(3)} km, Largest Velocity Error: ${(Math.max(...eigs.slice(0,3)) * 1000).toFixed(2)} m/s`
    return a
}

function checkSensors(sat = [], time, options ={}) {
    let {noise = false, mask = true, pastObs = [], obLimit = 900, sensors = math.range(0, mainWindow.sensors.length)._data} = options
    let propSatState = sat.slice()
    let curSidTime = mainWindow.planet.sidAngle + time * mainWindow.planet.w
    let sidRot = rotationMatrices(curSidTime * 180 / Math.PI, 3)
    let sunPos = math.subtract(math.squeeze(math.multiply(rotationMatrices(360 * time / 31556952 , 3), math.transpose([mainWindow.initSun]))), sat.slice(0,3))
    let sunPosUnit = math.dotDivide(sunPos, math.norm(sunPos))
    let obs = []
    for (let ii = 0; ii < sensors.length; ii++) {
        let index = sensors[ii]
        if (!mainWindow.sensors[index].active) continue
        if (mainWindow.sensors[index].type === 'optical' || mainWindow.sensors[index].type === 'radar') {
            let pastSensorObs = pastObs.filter(s => s.sensor === index).filter(ob => math.abs(ob.time - time) < obLimit)
            if (pastSensorObs.length > 0 && mask) continue
            let sensorPos = math.dotMultiply(mainWindow.planet.r, [math.cos(mainWindow.sensors[index].long * Math.PI / 180) * math.cos(mainWindow.sensors[index].lat * Math.PI / 180),
                             math.sin(mainWindow.sensors[index].long * Math.PI / 180) * math.cos(mainWindow.sensors[index].lat * Math.PI / 180),
                             math.sin(mainWindow.sensors[index].lat * Math.PI / 180)])
            sensorPos = math.squeeze(math.multiply(sidRot, sensorPos))
            // Check if sensor in direct sunlight
            let siteCats = math.acos(math.dot(sensorPos, sunPosUnit) / math.norm(sensorPos)) * 180 / Math.PI
            // console.log(siteCats);
            if (siteCats < 90 && mainWindow.sensors[index].type === 'optical' && mask) continue
            let topoZ = math.dotDivide(sensorPos, math.norm(sensorPos))
            let topoX = math.cross([0,0,1], topoZ)
            topoX = math.dotDivide(topoX, math.norm(topoX))
            let topoY = math.cross(topoZ, topoX)
            let rEciToTopo = rotMatrixFrames([topoX, topoY, topoZ])
            let relativeSatState = math.subtract(propSatState.slice(0,3), sensorPos)
            // Check if within range
            if (math.norm(relativeSatState.slice(0,3)) > mainWindow.sensors[index].maxRange && mask) continue
            // Check if sun behind optical sensor
            let cats = math.acos(math.dot(relativeSatState, sunPosUnit) / math.norm(relativeSatState)) * 180 / Math.PI
            // console.log(cats);
            if (cats < 110 && mainWindow.sensors[index].type === 'optical' && mask) continue
            // Check if satellite in direct sunlight
            let check = lineSphereIntercetionBool(sunPosUnit, sat.slice(0,3), [0,0,0], sphereRadius=6500)
            if (check && mask && mainWindow.sensors[index].type === 'optical') continue
            relativeSatState = math.squeeze(math.multiply(rEciToTopo, math.transpose([relativeSatState])))
            let satAz = math.atan2(relativeSatState[0], relativeSatState[1])
            let satEl = math.atan2(relativeSatState[2], math.norm(relativeSatState.slice(0,2)))
            // console.log(satAz * 180 / Math.PI);
            // console.log(satEl * 180 / Math.PI);
            // console.log('break');
            // Check if above horizon
            if ((satEl * 180 / Math.PI) < mainWindow.sensors[index].elMask[0] && mask) continue
            if ((satEl * 180 / Math.PI) > mainWindow.sensors[index].elMask[1] && mask) continue
            // Check if within az limits
            if (mainWindow.sensors[index].azMask.length > 0) {
                let sensAz = satAz + 0
                sensAz = sensAz < 0 ? sensAz + 2 * Math.PI : sensAz
                let maskWidth = (mainWindow.sensors[index].azMask[1] - mainWindow.sensors[index].azMask[0]) / 2
                let maskCenter = maskWidth + mainWindow.sensors[index].azMask[0]
                if (math.abs(sensAz * 180 / Math.PI - maskCenter) > maskWidth & mask) continue
            }
            let satRange = math.norm(relativeSatState)
            if (mainWindow.sensors[index].type === 'optical' ) {
                obs.push({
                    sensor: index,
                    time,
                    obs: [satAz, satEl],
                    noise: [mainWindow.sensors[index].noise.angle, mainWindow.sensors[index].noise.angle].map(n => n * Math.PI / 180)
                })
            }
            else if (mainWindow.sensors[index].type === 'radar' ) {
                obs.push({
                    sensor: index,
                    time,
                    obs: [satAz, satEl, satRange],
                    noise: [mainWindow.sensors[index].noise.angle * Math.PI / 180, mainWindow.sensors[index].noise.angle * Math.PI / 180, mainWindow.sensors[index].noise.r]
                })
            }
        }
        else if (mainWindow.sensors[index].type === 'space') {
            let pastSensorObs = pastObs.filter(s => s.sensor === index).filter(ob => math.abs(ob.time - time) < obLimit)
            if (pastSensorObs.length > 0 && mask) continue
            let obEpoch = new Date(mainWindow.startTime.getTime() + time*1000)
            let delta = (obEpoch - mainWindow.sensors[index].epoch)/1000
            let propState = propToTime(mainWindow.sensors[index].state.slice(), delta)

            let vertVec = math.dotDivide(propState.slice(0,3), math.norm(propState.slice(0,3)))
            let relativeSatState = math.subtract(propSatState.slice(0,3), propState.slice(0,3))
            let cats = math.acos(math.dot(relativeSatState, sunPosUnit) / math.norm(relativeSatState)) * 180 / Math.PI
            if (cats < 110 && mask) {
                console.log('out of view');
                continue
            }
            let el = 90-math.acos(math.dot(vertVec, relativeSatState) / math.norm(relativeSatState)) * 180 / Math.PI
            if (el < mainWindow.sensors[index].elMask[0] & mask) continue
            let ra = math.atan2(relativeSatState[1], relativeSatState[0])
            let dec = math.atan2(relativeSatState[2], math.norm(relativeSatState.slice(0,2)))
            if (mainWindow.sensors[index].type === 'space' ) {
                obs.push({
                    sensor: index,
                    time,
                    obs: [ra, dec],
                    noise: [mainWindow.sensors[index].noise.angle, mainWindow.sensors[index].noise.angle].map(n => n * Math.PI / 180)
                })
            }
        }
    }
    return obs
}

function getObHistory(e) {
    let inputs = e.target.parentElement.getElementsByTagName('input')
    let maxTime = inputs[0].value === '' ? inputs[0].placeholder : inputs[0].value
    mainWindow.maxTime = Number(maxTime) * 3600
    let sat = 0
    let timeOb = 0
    mainWindow.satellites[sat].obs = []
    let propState
    let satObs = []
    while (timeOb < mainWindow.maxTime) {
        propState = propToTime(mainWindow.satellites[sat].origState.slice(), -timeOb)
        let r = math.norm(propState.slice(0,3))
        let obLimit = 2 * Math.PI * (r ** 3 / 398600.4418) ** 0.5 * 0.010445
        let obs = checkSensors(propState, -timeOb, {pastObs: satObs, obLimit})
        // propState =  runge_kutta(propState, -mainWindow.propTime)
        satObs.push(...obs)
        timeOb += mainWindow.propTime
    }
    listObs(satObs)
    mainWindow.satellites[sat].obs = satObs
}

function copyObHistory(state) {
    let sat = 0
    if (state === undefined) {
        state = mainWindow.satellites[sat].origState
    }
    let propState = state.slice()
    let times = mainWindow.satellites[sat].obs.map(o => o.time)
    let propTime = 0
    let outObs = []
    times.unshift(0)
    for (let ii = 0; ii < times.length-1; ii++) {
        for (let index = 0; index < 10; index++) {
            propState =  runge_kutta(propState, (times[ii+1] - times[ii]) / 10)
            propTime += (times[ii+1] - times[ii]) / 10
        }
        let obs = checkSensors(propState, propTime, {sensors: [mainWindow.satellites[sat].obs[ii].sensor], mask: false})
        outObs.push(...obs)
    }
    return outObs
}

function Coe2PosVelObject(coe = {a: 42164.1401, e: 0, i: 0, raan: 0, arg: 0, tA: 0}, peri = false) {
    let p = coe.a * (1 - coe.e * coe.e);
    let cTa = Math.cos(coe.tA);
    let sTa = Math.sin(coe.tA);
    let r = [
        [p * cTa / (1 + coe.e * cTa)],
        [p * sTa / (1 + coe.e * cTa)],
        [0]
    ];
    let constA = Math.sqrt(398600.4418 / p);
    let v = [
        [-constA * sTa],
        [(coe.e + cTa) * constA],
        [0]
    ];
    if (peri) return {
        
        x: r[0][0],
        y: r[1][0],
        z: r[2][0],
        vx: v[0][0],
        vy: v[1][0],
        vz: v[2][0]
    }
    let cRa = Math.cos(coe.raan);
    let sRa = Math.sin(coe.raan);
    let cAr = Math.cos(coe.arg);
    let sAr = Math.sin(coe.arg);
    let cIn = Math.cos(coe.i);
    let sin = Math.sin(coe.i);
    R = [
        [cRa * cAr - sRa * sAr * cIn, -cRa * sAr - sRa * cAr * cIn, sRa * sin],
        [sRa * cAr + cRa * sAr * cIn, -sRa * sAr + cRa * cAr * cIn, -cRa * sin],
        [sAr * sin, cAr * sin, cIn]
    ];
    r = math.multiply(R, r);
    v = math.multiply(R, v);
    let state = [r, v];
    return {
        x: state[0][0][0],
        y: state[0][1][0],
        z: state[0][2][0],
        vx: state[1][0][0],
        vy: state[1][1][0],
        vz: state[1][2][0]
    };
}

function convertObsToVector(obs) {
    obs = obs.map(ob => ob.obs)
    return math.reshape(obs, [1,-1])[0]
}

function convertObsToWeightMatrix(obs) {
    obs = math.reshape(obs.map(ob => ob.noise), [1,-1])[0].map(n => 1/n/n)
    return math.diag(obs)
}

function createJacobian(sat, state) {
    if (state === undefined) {
        state = mainWindow.satellites[sat].origState
    }
    let baseObsVector = convertObsToVector(copyObHistory(state))
    let jac = []
    for (let index = 0; index < 6; index++) {
        let delState = state.slice()
        delState[index] += index < 3 ? 0.1 : 0.0001
        let delObsVector = convertObsToVector(copyObHistory(delState))

        jac.push(math.dotDivide(math.subtract(delObsVector, baseObsVector), index < 3 ? 0.1 : 0.0001))
    }
    jac = math.transpose(jac)
    return {jac, w: convertObsToWeightMatrix(copyObHistory(state))}
}

function choleskyDecomposition(matrix = [[25, 15, -5],[15, 18,  0],[-5,  0, 11]]) {
    let a = math.zeros([matrix.length, matrix.length])    
    for (let ii = 0; ii < a.length; ii++) {
        for (let jj = 0; jj <= ii; jj++) {
            if (ii === jj) {
                a[ii][jj] = matrix[ii][jj]
                let subNumber = 0
                for (let kk = 0; kk < jj; kk++) {
                    subNumber += a[jj][kk] ** 2
                }
                a[ii][jj] -= subNumber
                a[ii][jj] = a[ii][jj] ** (1/2)
            }
            else {
                a[ii][jj] = matrix[ii][jj]
                let subNumber = 0
                for (let kk = 0; kk < jj; kk++) {
                    subNumber += a[ii][kk] * a[jj][kk]
                }
                a[ii][jj] -= subNumber
                a[ii][jj] *= 1 / a[jj][jj]
            }
        }
    }
    return a
}

function lineSphereIntercetionBool(line = [-0.45, 0, 0.45], lineOrigin = [282.75,0,0], sphereOrigin = [0,0,0], sphereRadius=200) {
    line = math.dotDivide(line, math.norm(line))
    let check = math.dot(line, math.subtract(lineOrigin, sphereOrigin)) ** 2 - (math.norm(math.subtract(lineOrigin, sphereOrigin)) ** 2 - sphereRadius ** 2)
    return check > 0
}   

function importState(t) {
    let tV = t.value.split(/ {2,}/)
    let time = tV[0]
    let newDate = new Date(time)
    if (newDate == 'Invalid Date') {
        t.value = ''
        alert('String Not Accepted')
        return
    }
    let position = tV.slice(1,7).map(n => Number(n))
    if (position.filter(p => Number.isNaN(p)).length > 0) {
        t.value = ''
        alert('String Not Accepted')
        return
    }
    t.value = ''
    alert('String Accepted')
    setTimeout(() => {
        t.placeholder = 'SDA Report Input'
    }, 2000)
    mainWindow.startTime = new Date(time)
    mainWindow.satellites= [{
        origState: position,
        obFreq: 900,
        obs: []
    }]
    updateTime(mainWindow.startTime)
    updateCoeDisplay()
}

function listObs(obs) {
    let obDiv = document.getElementById('ob-list')
    obDiv.innerHTML = ''
    obs.forEach((ob, ii) => {
        let a = (new Date(mainWindow.startTime.getTime() + ob.time* 1000)).toString()

        let div = document.createElement("div")
        div.innerHTML = `${a.split(' GMT')[0]}--${mainWindow.sensors[ob.sensor].name} <button ob="${ii}" onclick="deleteOb(event)">Delete</button>`
        div.title = `Az: ${(ob.obs[0] * 180 / Math.PI).toFixed(1)} El: ${(ob.obs[1] * 180 / Math.PI).toFixed(1)}`
        obDiv.append(div)
    })
}

function deleteOb(t) {
    if (t.shiftKey) {
        mainWindow.satellites[0].obs = mainWindow.satellites[0].obs.filter(ob => ob.sensor !== mainWindow.satellites[0].obs[t.target.getAttribute('ob')].sensor)
    }
    else mainWindow.satellites[0].obs.splice(Number(t.target.getAttribute('ob')),1)
    listObs(mainWindow.satellites[0].obs)
}

function propToTime(state, dt) {
    state = PosVel2CoeNew(state.slice(0,3), state.slice(3,6))
    state.tA = propTrueAnomaly(state.tA, state.a, state.e, dt)
    state = Object.values(Coe2PosVelObject(state))
    return state
}

function PosVel2CoeNew(r = [42157.71810012396, 735.866, 0], v = [-0.053652257639536446, 3.07372487580565, 0.05366]) {
    let mu = 398600.4418;
    let rn = math.norm(r);
    let vn = math.norm(v);
    let h = math.cross(r, v);
    let hn = math.norm(h);
    let n = math.cross([0, 0, 1], h);
    let nn = math.norm(n);
    if (nn < 1e-6) {
        n = [1, 0, 0];
        nn = 1;
    }
    var epsilon = vn * vn / 2 - mu / rn;
    let a = -mu / 2 / epsilon;
    let e = math.subtract(math.dotDivide(math.cross(v, h), mu), math.dotDivide(r, rn));
    let en = math.norm(e);
    if (en < 1e-6) {
        e = n.slice();
        en = 0;
    }
    let inc = Math.acos(math.dot(h, [0, 0, 1]) / hn);
    let ra = Math.acos(math.dot(n, [1, 0, 0]) / nn);
    if (n[1] < 0) {
        ra = 2 * Math.PI - ra;
    }

    let ar, arDot;
    if (en < 1e-6) {
        arDot = math.dot(n, e) / nn;
    } else {
        arDot = math.dot(n, e) / en / nn;
    }
    if (arDot > 1) {
        ar = 0;
    } else if (arDot < -1) {
        ar = Math.PI;
    } else {
        ar = Math.acos(arDot);
    }
    if (e[2] < 0) {
        ar = 2 * Math.PI - ar;
    } else if (inc < 1e-6 && e[1] < 0) {
        ar = 2 * Math.PI - ar;
    }
    let ta, taDot;
    if (en < 1e-6) {
        taDot = math.dot(r, e) / rn / nn;
    } else {
        taDot = math.dot(r, e) / rn / en;
    }
    if (taDot > 1) {
        ta = 0;
    } else if (taDot < -1) {
        ta = Math.PI;
    } else {
        ta = Math.acos(taDot);
    }
    if (math.dot(v, e) > 1e-6) {
        ta = 2 * Math.PI - ta;
    }
    // console.log([a,en,inc,ra,ar,ta])
    return {
        a: a,
        e: en,
        i: inc,
        raan: ra,
        arg: ar,
        tA: ta
    };
}

function Coe2PosVelObject(coe = {a: 42164.1401, e: 0, i: 0, raan: 0, arg: 0, tA: 0}, peri = false) {
    let p = coe.a * (1 - coe.e * coe.e);
    let cTa = Math.cos(coe.tA);
    let sTa = Math.sin(coe.tA);
    let r = [
        [p * cTa / (1 + coe.e * cTa)],
        [p * sTa / (1 + coe.e * cTa)],
        [0]
    ];
    let constA = Math.sqrt(398600.4418 / p);
    let v = [
        [-constA * sTa],
        [(coe.e + cTa) * constA],
        [0]
    ];
    if (peri) return {
        
        x: r[0][0],
        y: r[1][0],
        z: r[2][0],
        vx: v[0][0],
        vy: v[1][0],
        vz: v[2][0]
    }
    let cRa = Math.cos(coe.raan);
    let sRa = Math.sin(coe.raan);
    let cAr = Math.cos(coe.arg);
    let sAr = Math.sin(coe.arg);
    let cIn = Math.cos(coe.i);
    let sin = Math.sin(coe.i);
    R = [
        [cRa * cAr - sRa * sAr * cIn, -cRa * sAr - sRa * cAr * cIn, sRa * sin],
        [sRa * cAr + cRa * sAr * cIn, -sRa * sAr + cRa * cAr * cIn, -cRa * sin],
        [sAr * sin, cAr * sin, cIn]
    ];
    r = math.multiply(R, r);
    v = math.multiply(R, v);
    let state = [r, v];
    return {
        x: state[0][0][0],
        y: state[0][1][0],
        z: state[0][2][0],
        vx: state[1][0][0],
        vy: state[1][1][0],
        vz: state[1][2][0]
    };
}

function propTrueAnomaly(tA = 0, a = 10000, e = 0.1, time = 3600) {
    function True2Eccentric(e, ta) {
        return Math.atan(Math.sqrt((1 - e) / (1 + e)) * Math.tan(ta / 2)) * 2;
    }
    function Eccentric2True(e,E) {
        return Math.atan(Math.sqrt((1+e)/(1-e))*Math.tan(E/2))*2;
    }
    
    function solveKeplersEquation(M,e) {
        let E = M;
        let del = 1;
        while (Math.abs(del) > 1e-6) {
            del = (E-e*Math.sin(E)-M)/(1-e*Math.cos(E));
            E -= del;
        }
        return E;
    }

    let eccA = True2Eccentric(e, tA)
    let meanA = eccA - e * Math.sin(eccA)
    meanA += Math.sqrt(398600.4418 / (a ** 3)) * time
    eccA = solveKeplersEquation(meanA, e)
    return Eccentric2True(e, eccA)
}

function changeSensorActivation(s) {
    mainWindow.sensors[s.getAttribute('sensor')].active = s.checked
}

function updateSensors(sensors) {
    let sensDiv = document.getElementById('sensor-list')
    sensDiv.innerHTML = ''
    sensors.forEach((s, ii) => {
        let div = document.createElement("div")
        div.style.textAlign = 'right'
        div.innerHTML = `
            <label for="sensor-${ii}">${s.name}</label> <input id="sensor-${ii}" sensor="${ii}" type="checkbox" ${s.active ? 'checked' : ''} oninput="changeSensorActivation(this)"/>
        `
        sensDiv.append(div)
    })
}

function sunFromTime(jdUti=2449444.5) {
     let tUti = (jdUti - 2451545) / 36525
     let lamba = 280.4606184 + 36000.770005361 * tUti
     let m = 357.5277233 + 35999.05034 * tUti
     let lambaEll = lamba + 1.914666471 * Math.sin(m* Math.PI / 180) + 0.019994643 * Math.sin(2 * m* Math.PI / 180)
     let phi = 0
     let epsilon = 23.439291-0.0130042 * tUti
     let rSun = 1.000140612-0.016708617 * Math.cos(m * Math.PI / 180)-0.000139589*Math.cos(2*m* Math.PI / 180)
     let au = 149597870.7 //km
     rSun *= au
     return [
        rSun * Math.cos(lambaEll* Math.PI / 180),
        rSun * Math.cos(epsilon* Math.PI / 180) * Math.sin(lambaEll* Math.PI / 180),
        rSun * Math.sin(epsilon* Math.PI / 180) * Math.sin(lambaEll* Math.PI / 180)
     ]
}

function siderealTime(jdUti=2448855.009722) {
    let tUti = (jdUti - 2451545) / 36525
    return ((67310.548 + (876600*3600 + 8640184.812866)*tUti + 0.093104*tUti*tUti - 6.2e-6*tUti*tUti*tUti) % 86400)/240
}

function julianDate(yr=1996, mo=10, d=26, h=14, min=20, s=0) {
    return 367 * yr - Math.floor(7*(yr+Math.floor((mo+9)/12)) / 4) + Math.floor(275*mo/9) + d + 1721013.5 + ((s/60+min)/60+h)/24
}

function updateTime(time = Date.now(), updateEarth = true) {
    time = new Date(time)
    let y = time.getFullYear();
    let m = (time.getMonth() + 1).toString();
    let d = time.getDate().toString();
    while (m.length < 2) {
        m = '0' + m
    }
    while (d.length < 2) {
        d = '0' + d
    }
    document.getElementById('date-input').value = `${y}-${m}-${d}`
    let h = time.getHours().toString();
    let min = time.getMinutes().toString();
    while (h.length < 2) {
        h = '0' + h
    }
    while (min.length < 2) {
        min = '0' + min
    }
    document.getElementById('time-input').value = `${h}:${min}`
    if (!updateEarth) return
    h = Number(h)
    min = Number(min)
    m = Number(m)
    d = Number(d)
    s = Number(time.getSeconds())
    let a = julianDate(y, m, d, h, min, s)
    let sidTime = siderealTime(a)
    let sunVec = sunFromTime(a)
    mainWindow.planet.sidAngle = sidTime * Math.PI / 180
    mainWindow.initSun = sunVec
}

function addSatellite() {
    let long = Number(document.getElementById('long-input').value)
    let state = Coe2PosVelObject({
        a: 42164.140100123965,
        e: 0,
        i: 0,
        raan: mainWindow.planet.sidAngle + long * Math.PI / 180,
        arg: 0,
        tA: 0
    })
    mainWindow.satellites[0].origState = Object.values(state)
    updateCoeDisplay()
}

function timeChange(t) {
    let inputs = t.parentElement.getElementsByTagName('input')
    a = new Date(inputs[0].value + ' ' + inputs[1].value)
    let delta = (a - mainWindow.startTime) / 1000
    mainWindow.satellites[0].origState = propToTime(mainWindow.satellites[0].origState, delta)
    mainWindow.startTime = a
    updateTime(a)
}

function updateCoeDisplay() {
    let div = document.getElementById('coe-display')
    div.innerHTML = ''
    let coes = PosVel2CoeNew(mainWindow.satellites[0].origState.slice(0,3), mainWindow.satellites[0].origState.slice(3,6))
    div.innerHTML = `a: ${coes.a.toFixed(1)} / e: ${coes.e.toFixed(4)} / Inc: ${(coes.i * 180 / Math.PI).toFixed(1)} / RAAN: ${(coes.raan * 180 / Math.PI).toFixed(1)} / Arg Per: ${(coes.arg * 180 / Math.PI).toFixed(1)} / True A: ${(coes.tA * 180 / Math.PI).toFixed(1)}`
}

mainWindow.sensors = sensors
updateTime()
updateSensors(mainWindow.sensors)
addSatellite()