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
    let r = Eci2Ric()
    a = math.multiply(math.transpose(r), a, r)
    console.log(choleskyDecomposition(a));
    try {
        console.log(math.eigs(a));
    } catch (error) {
        console.log(error.values);
    }
    navigator.clipboard.writeText(JSON.stringify({std: a}))
    let sigData = createSigmaPoints(mainWindow.satellites[0].origState, a)
    let div = document.getElementById('cov-display')
    div.innerHTML = `StD Position Error: ${sigData.aveRange.toFixed(2)} km, StD Velocity Error: ${(sigData.aveRelVel * 1000).toFixed(2)} m/s`
    return a
}

function normalRandom() {
    var val, u, v, s, mul;
    spareRandom = null;
    if(spareRandom !== null)
    {
        val = spareRandom;
        spareRandom = null;
    }
    else
    {
        do
        {
            u = Math.random()*2-1;
            v = Math.random()*2-1;

            s = u*u+v*v;
        } while(s === 0 || s >= 1);

        mul = Math.sqrt(-2 * Math.log(s) / s);

        val = u * mul;
        spareRandom = v * mul;
    }
    
    return val;
}

function createSigmaPoints(state, cov, n = 1000) {
    cov = math.transpose(choleskyDecomposition(cov))
    let sigmas = []
    for (let i = 0; i < n; i++) {
        let sigmaState = state.slice()
        for (let j = 0; j < cov.length; j++) {
            sigmaState = math.add(sigmaState, math.dotMultiply(normalRandom(), cov[j]))
        }
        sigmas.push(sigmaState)
    }

    console.log(state);
    let aveState = sigmas.reduce((a,b) => math.add(a, b), [0,0,0,0,0,0]).map(s => s/sigmas.length)
    let aveRange = (sigmas.reduce((a,b) => a + math.norm(math.subtract(b.slice(0,3), aveState.slice(0,3))) ** 2, 0) / sigmas.length) ** 0.5
    let aveRelVel = (sigmas.reduce((a,b) => a + math.norm(math.subtract(b.slice(3,6), aveState.slice(3,6))) ** 2, 0) / sigmas.length) ** 0.5
    return {aveRange, aveRelVel}
}

function checkSensors(sat = [], time, options ={}) {
    let {noise = false, mask = true, pastObs = [], obLimit = 900, sensors = math.range(0, mainWindow.sensors.length)._data} = options
    let propSatState = sat.slice()
    let curSidTime = mainWindow.planet.sidAngle + time * mainWindow.planet.w
    let sidRot = rotationMatrices(curSidTime * 180 / Math.PI, 3)
    let sunPos = math.subtract(math.squeeze(math.multiply(rotationMatrices(360 * time / 31556952 , 3), math.transpose([mainWindow.initSun]))), sat.slice(0,3))
    let sunPosUnit = math.dotDivide(sunPos, math.norm(sunPos))
    let obs = []
    let obDate = new Date((new Date(mainWindow.startTime)) - (-time*1000))
    for (let ii = 0; ii < sensors.length; ii++) {
        let index = sensors[ii]
        if (!mainWindow.sensors[index].active) continue
        if (mainWindow.sensors[index].avail.length > 0) {
            if (obDate < mainWindow.sensors[index].avail[0] || obDate > mainWindow.sensors[index].avail[1]) continue
        }

        if (mainWindow.sensors[index].type === 'optical' || mainWindow.sensors[index].type === 'radar') {
            let pastSensorObs = pastObs.filter(s => s.sensor === index).filter(ob => math.abs(ob.time - time) < obLimit)
            if (pastSensorObs.length > 0 && mask) continue
            let sensorPos = sensorGeodeticPosition(mainWindow.sensors[index].lat, mainWindow.sensors[index].long, 0)
            sensorPos = sensorPos.r
            sensorPos = fk5Reduction(sensorPos, obDate)
            // Check if sensor in direct sunlight
            let siteCats = math.acos(math.dot(sensorPos, sunPosUnit) / math.norm(sensorPos)) * 180 / Math.PI
            if (siteCats < 90 && mainWindow.sensors[index].type === 'optical' && mask) continue
            let relativeSatState = math.subtract(propSatState.slice(0,3), sensorPos)
            // Check if within range
            if (math.norm(relativeSatState.slice(0,3)) > mainWindow.sensors[index].maxRange && mask) continue
            // Check if sun behind optical sensor
            let cats = math.acos(math.dot(relativeSatState, sunPosUnit) / math.norm(relativeSatState)) * 180 / Math.PI
            if (cats < 90 && mainWindow.sensors[index].type === 'optical' && mask) continue
            // Check if satellite in direct sunlight
            let check = lineSphereIntercetionBool(sunPosUnit, sat.slice(0,3), [0,0,0], sphereRadius=6500)
            if (check && mask && mainWindow.sensors[index].type === 'optical') continue
            let {az, el, r} = razel(propSatState.slice(0,3), obDate, mainWindow.sensors[index].lat, mainWindow.sensors[index].long, 0)
            // Check if above horizon
            if (el < mainWindow.sensors[index].elMask[0] && mask) continue
            if (el > mainWindow.sensors[index].elMask[1] && mask) continue
            // Check if within az limits
            if (mainWindow.sensors[index].azMask.length > 0) {
                let sensAz = az * Math.PI / 180 + 0
                sensAz = sensAz < 0 ? sensAz + 2 * Math.PI : sensAz
                let maskWidth = (mainWindow.sensors[index].azMask[1] - mainWindow.sensors[index].azMask[0]) / 2
                let maskCenter = maskWidth + mainWindow.sensors[index].azMask[0]
                if (math.abs(sensAz * 180 / Math.PI - maskCenter) > maskWidth & mask) continue
            }
            if (mainWindow.sensors[index].type === 'optical' ) {
                obs.push({
                    sensor: index,
                    time,
                    obs: [az * Math.PI / 180, el * Math.PI / 180],
                    noise: [mainWindow.sensors[index].noise.angle, mainWindow.sensors[index].noise.angle].map(n => n * Math.PI / 180)
                })
            }
            else if (mainWindow.sensors[index].type === 'radar' ) {
                obs.push({
                    sensor: index,
                    time,
                    obs: [az * Math.PI / 180, el * Math.PI / 180, r],
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
            if (cats < 90 && mask) {
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
        let a = new Date(new Date(mainWindow.startTime.getTime() + ob.time* 1000))
        a = `${padNumber(a.getHours())}:${padNumber(a.getMinutes())}z ${a.getMonth()+1}/${a.getDate()}/${a.getFullYear()}`
        let div = document.createElement("div")
        div.innerHTML = `${a}--${mainWindow.sensors[ob.sensor].name} <button ob="${ii}" onclick="deleteOb(event)">X</button>`
        div.title = `Az: ${(ob.obs[0] * 180 / Math.PI).toFixed(1)} El: ${(ob.obs[1] * 180 / Math.PI).toFixed(1)}` + (mainWindow.sensors[ob.sensor].type === 'radar' ? ` R: ${ob.obs[2].toFixed(2)} km` : '')
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

function changeSensorProperty(s) {
    let ob = s.getAttribute('ob')
    let sens = s.getAttribute('sensor')
    if (ob === 'active') {
        mainWindow.sensors[sens].active = s.checked
    }
    else if (ob === 'avail') {
        let avail = s.innerText
        avail = avail.split('/')
        if (avail[0].toLowerCase() === 'all') {
            s.style.color = 'black'
            mainWindow.sensors[sens].avail = []
            return
        }
        avail[0] = Number(avail[0])
        if (avail.length < 2 || Number.isNaN(avail[0]) || avail[0] < 0 || avail > 31) {
            s.style.color = 'red'
            return
        }
        else s.style.color = 'black'
        let date = avail[0]
        avail = avail[1].split('-')
        if (avail.length < 2 || avail.filter(a => a.length === 4).length < 2) {
            s.style.color = 'red'
            return
        }
        else s.style.color = 'black'
        let startDate = new Date(mainWindow.startTime)
        startDate.setDate(date)
        startDate.setHours(avail[0].slice(0,2))
        startDate.setMinutes(avail[0].slice(2,4))
        startDate.setSeconds(0)
        let endDate = new Date(mainWindow.startTime)
        endDate.setDate((avail[0].slice(0,2)*60 + avail[0].slice(2,4)*1) > (avail[1].slice(0,2)*60 + avail[1].slice(2,4)*1) ? date + 1 : date)
        endDate.setHours(avail[1].slice(0,2))
        endDate.setMinutes(avail[1].slice(2,4))
        endDate.setSeconds(0)
        if (startDate == 'Invalid Date' || endDate == 'Invalid Date') {
            s.style.color = 'red'
            return
        }
        else s.style.color = 'black'
        mainWindow.sensors[sens].avail = [startDate, endDate]
    }
}

function padNumber(num = 0, n = 2) {
    num = `${num}`
    num = num.split('.')
    while (num[0].length < n) num[0] = '0' + num[0]
    return num.join('.')
}

function updateSensors(sensors) {
    let sensDiv = document.getElementById('sensor-list')
    sensDiv.innerHTML = ''
    sensors.forEach((s, ii) => {
        let div = document.createElement("div")
        div.style.textAlign = 'center'
        let avail = s.avail.length === 0 ? 'All' : `${s.avail[0].getDate()}/${padNumber(s.avail[0].getHours())}${padNumber(s.avail[0].getMinutes())}-${padNumber(s.avail[1].getHours())}${padNumber(s.avail[1].getMinutes())}`
        div.innerHTML = `
            <label for="sensor-${ii}">${s.name}</label> <input ob="active" id="sensor-${ii}" sensor="${ii}" type="checkbox" ${s.active ? 'checked' : ''} oninput="changeSensorProperty(this)"/> <span style="font-size: 0.5em">Avail: <span contentEditable="true" ob="avail" sensor="${ii}" oninput="changeSensorProperty(this)">${avail}</span></span>
        `
        div.title = s.type === 'space' ? Object.values(PosVel2CoeNew(s.state.slice(0,3), s.state.slice(3,6))).map((s, ii) => ii > 1 ? s * 180 / Math.PI : s).map(s => s.toFixed(3)).join(', ') : `Lat: ${s.lat}, Long: ${s.long}`
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

function saveCurrentSensors() {
    let name = prompt('Name File: ','sensor')
    if (name == null) return
    name = name === '' ? 'sensors' : name
    downloadFile(name + '.sassda', JSON.stringify(mainWindow.sensors))
}

function uploadSensors() {
    if (event.target.id === 'upload-button') return document.getElementById('file-input').click()
    let screenAlert = document.getElementsByClassName('screen-alert');
    if (screenAlert.length > 0) screenAlert[0].remove();
    loadFileAsText(event.path[0].files[0])
}

function loadFileAsText(fileToLoad) {
    var fileReader = new FileReader();
    fileReader.onload = function (fileLoadedEvent) {
        var textFromFileLoaded = fileLoadedEvent.target.result;
        let newSensors = JSON.parse(textFromFileLoaded);
        for (let index = 0; index < newSensors.length; index++) newSensors[index].avail = newSensors[index].avail.map(s => new Date(s.replace('Z', '')))
        mainWindow.sensors = newSensors
        updateSensors(mainWindow.sensors)
    };
    fileReader.readAsText(fileToLoad, "UTF-8");
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
    updateCoeDisplay()
}

function updateCoeDisplay() {
    let div = document.getElementById('coe-display')
    div.innerHTML = ''
    let coes = PosVel2CoeNew(mainWindow.satellites[0].origState.slice(0,3), mainWindow.satellites[0].origState.slice(3,6))
    div.innerHTML = `a: <span coe="a" contentEditable="true" oninput="coeChange(this)">${coes.a.toFixed(1)}</span> / 
        e: <span coe="e" contentEditable="true" oninput="coeChange(this)">${coes.e.toFixed(4)}</span> / 
        Inc: <span coe="i" contentEditable="true" oninput="coeChange(this)">${(coes.i * 180 / Math.PI).toFixed(1)}</span> / 
        RAAN: <span coe="raan" contentEditable="true" oninput="coeChange(this)">${(coes.raan * 180 / Math.PI).toFixed(1)}</span> / 
        Arg Per: <span coe="arg" contentEditable="true" oninput="coeChange(this)">${(coes.arg * 180 / Math.PI).toFixed(1)}</span> / 
        True A: <span coe="tA" contentEditable="true" oninput="coeChange(this)">${(coes.tA * 180 / Math.PI).toFixed(1)}</span>`
}

function coeChange(t) {
    let value = Number(t.innerHTML)
    if (Number.isNaN(value)) {
        t.style.color = 'red'
        return
    }
    else {
        t.style.color = 'black'
    }
    let c = PosVel2CoeNew(mainWindow.satellites[0].origState.slice(0,3), mainWindow.satellites[0].origState.slice(3,6))
    let att = t.getAttribute('coe')
    c[att] = att === 'a' || att === 'e' ? value : value * Math.PI / 180
    // Check SMA
    if (c.a < 6600 || c.a > 60000) {
        t.style.color = 'red'
        return
    } 
    else {
        t.style.color = 'black'
    }
    // Check Ecc
    if (c.e < 0 || c.e > 0.95) {
        t.style.color = 'red'
        return
    } 
    else {
        t.style.color = 'black'
    }
    // Check Inc
    if (c.i < 0 || c.i > 2 * Math.PI) {
        t.style.color = 'red'
        return
    } 
    else {
        t.style.color = 'black'
    }
    // Check RAAN
    if (c.raan < 0 || c.raan > 2 * Math.PI) {
        t.style.color = 'red'
        return
    } 
    else {
        t.style.color = 'black'
    }
    // Check Arg
    if (c.arg < 0 || c.arg > 2 * Math.PI) {
        t.style.color = 'red'
        return
    } 
    else {
        t.style.color = 'black'
    }
    // Check True A
    if (c.tA < 0 || c.tA > 2 * Math.PI) {
        t.style.color = 'red'
        return
    } 
    else {
        t.style.color = 'black'
    }

    mainWindow.satellites[0].origState = Object.values(Coe2PosVelObject(c));
}

function Eci2Ric() {
    let rC = mainWindow.satellites[0].origState.slice(0,3)
    let drC = mainWindow.satellites[0].origState.slice(3,6)
    let h = math.cross(rC, drC);
    let ricX = math.dotDivide(rC, math.norm(rC));
    let ricZ = math.dotDivide(h, math.norm(h));
    let ricY = math.cross(ricZ, ricX);

    let ricXd = math.dotMultiply(1 / math.norm(rC), math.subtract(drC, math.dotMultiply(math.dot(ricX, drC), ricX)));
    let ricYd = math.cross(ricZ, ricXd);
    let ricZd = [0,0,0];

    let C = math.transpose([ricX, ricY, ricZ]);
    let Cd = math.transpose([ricXd, ricYd, ricZd]);
    let R1 = math.concat(C, math.zeros([3,3]), 1)
    let R2 = math.concat(Cd, C, 1)
    let R = math.concat(R1, R2, 0)
    return R
}

mainWindow.sensors = sensors
mainWindow.sensors.forEach(s => {
    if (s.avail === undefined) {
        s.avail = []
    }
})
updateTime()
updateSensors(mainWindow.sensors)
addSatellite()

function approxEigenvector(A = [[0.5, 0.4], [0.2, 0.8]]) {
    guess = math.zeros([A.length, 1]).map(s => [math.random()])
    for (let index = 0; index < 100; index++) {
        guess = math.multiply(A, guess)
        guess = math.dotDivide(guess, math.norm(math.squeeze(guess)))
    }
    let eigenVal = (math.multiply(math.transpose(guess), A, guess)[0] / math.multiply(math.transpose(guess), guess)[0])
    console.log(math.squeeze(guess));
    console.log(eigenVal);
    console.log(math.multiply(A, guess));
    
    console.log(math.dotMultiply(eigenVal, guess));
}

function downloadFile(filename, text) {
    var pom = document.createElement('a');
    pom.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    pom.setAttribute('download', filename);

    if (document.createEvent) {
        var event = document.createEvent('MouseEvents');
        event.initEvent('click', true, true);
        pom.dispatchEvent(event);
    } else {
        pom.click();
    }
}

function siderealTime(jdUti=2448855.009722) {
    let tUti = (jdUti - 2451545) / 36525
    return ((67310.548 + (876600*3600 + 8640184.812866)*tUti + 0.093104*tUti*tUti - 6.2e-6*tUti*tUti*tUti) % 86400)/240
}

function julianDate(yr=1996, mo=10, d=26, h=14, min=20, s=0) {
    return 367 * yr - Math.floor(7*(yr+Math.floor((mo+9)/12)) / 4) + Math.floor(275*mo/9) + d + 1721013.5 + ((s/60+min)/60+h)/24
}

function sensorGeodeticPosition(lat = 39.586667, long = -105.64, h = 4.347667) {
    lat *= Math.PI / 180

    // let eEarth = 0.081819221
    let eEarth = 0.006694385 ** 0.5
    let rEarth = 6378.1363
    let rFocus = eEarth * rEarth

    let cEarth = rEarth / (1 - eEarth ** 2 * Math.sin(lat) ** 2) ** 0.5
    let sEarth = rEarth * (1 - eEarth ** 2) / (1 - eEarth ** 2 * Math.sin(lat) ** 2) ** 0.5
    
    let rSigma = (cEarth + h) * Math.cos(lat)
    let rk = (sEarth + h) * Math.sin(lat)
    // console.log(rSigma, rk / math.tan(lat));
    r = math.squeeze(math.multiply(rotationMatrices(long, 3),math.transpose([[rSigma, 0, rk]])));
    rij = math.dotDivide(r.slice(0,2) , math.norm(r.slice(0,2)) /(rk / math.tan(lat)))
    // console.log(rij, r);
    return {r, vert: [...rij, r[2]]};
    
}

function fk5Reduction(r=[-1033.479383, 7901.2952754, 6380.3565958], date=new Date(2004, 3, 6, 7, 51, 28, 386)) {
    // Based on Vallado "Fundamentals of Astrodyanmics and Applications" algorithm 24, p. 228 4th edition
    let jd_TT = julianDate(date.getFullYear(), date.getMonth(), date.getDate()) 
    let t_TT = (jd_TT - 2451545) / 36525
    let zeta = 2306.2181 * t_TT + 0.30188 * t_TT ** 2 + 0.017998 * t_TT ** 3
    zeta /= 3600
    let theta = 2004.3109 * t_TT - 0.42665 * t_TT ** 2 - 0.041833 * t_TT ** 3
    theta /= 3600
    let z = 2306.2181 * t_TT + 1.09468 * t_TT ** 2 + 0.018203 * t_TT ** 3
    z /= 3600
    let p = math.multiply(rotationMatrices(-zeta, 3), rotationMatrices(theta, 2), rotationMatrices(-z, 3))
    let thetaGmst = siderealTime(julianDate(date.getFullYear(), date.getMonth() + 1, date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds() + date.getMilliseconds() / 1000))
    let w = rotationMatrices(thetaGmst, 3)
    r = math.multiply(p, w, math.transpose([r]))
    return math.squeeze(r)
}

function fk5ReductionTranspose(r=[-1033.479383, 7901.2952754, 6380.3565958], date=new Date(2004, 3, 6, 7, 51, 28, 386)) {
    // Based on Vallado "Fundamentals of Astrodyanmics and Applications" algorithm 24, p. 228 4th edition
    let jd_TT = julianDate(date.getFullYear(), date.getMonth(), date.getDate()) 
    let t_TT = (jd_TT - 2451545) / 36525
    let zeta = 2306.2181 * t_TT + 0.30188 * t_TT ** 2 + 0.017998 * t_TT ** 3
    zeta /= 3600
    let theta = 2004.3109 * t_TT - 0.42665 * t_TT ** 2 - 0.041833 * t_TT ** 3
    theta /= 3600
    let z = 2306.2181 * t_TT + 1.09468 * t_TT ** 2 + 0.018203 * t_TT ** 3
    z /= 3600
    let p = math.multiply(rotationMatrices(-zeta, 3), rotationMatrices(theta, 2), rotationMatrices(-z, 3))
    let thetaGmst = siderealTime(julianDate(date.getFullYear(), date.getMonth() + 1, date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds() + date.getMilliseconds() / 1000))
    let w = rotationMatrices(thetaGmst, 3)
    r = math.multiply(math.transpose(w), math.transpose(p), math.transpose([r]))
    return math.squeeze(r)
}


function razel(r_eci=[-5505.504883, 56.449170, 3821.871726], date=new Date(1995, 4, 20, 3, 17, 02, 000), lat=39.007, long=-104.883, h = 2.187) {
    let r_ecef = fk5ReductionTranspose(r_eci, date)
    let r_site_ecef = sensorGeodeticPosition(lat, long, h).r
    let rho = math.transpose([math.subtract(r_ecef, r_site_ecef)])
    lat *= Math.PI / 180
    long*= Math.PI / 180
    let r = [[Math.sin(lat) * Math.cos(long), -Math.sin(long), Math.cos(lat) * Math.cos(long)],
             [Math.sin(lat) * Math.sin(long), Math.cos(long), Math.cos(lat) * Math.sin(long)],
             [-Math.cos(lat), 0, Math.sin(lat)]]
    rho = math.squeeze(math.multiply(math.transpose(r), rho))
    let el = Math.asin(rho[2] / math.norm(rho)) * 180 / Math.PI
    let az = Math.atan2(rho[1], -rho[0]) * 180 / Math.PI
    r = math.norm(rho)
    return {el, az, r}
}