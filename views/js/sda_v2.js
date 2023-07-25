let title = 'Relative Covariance System'
let acronym = 'RCS'
document.title = acronym
let cao = '25 Apr 23'

// Add scaling function
let scalingSpan = document.createElement('span')
scalingSpan.innerHTML = `
    Scaling Factor
    <input style="width: 5ch;" id="cov-scale-input" type="number" value="100"/>%
`
document.querySelector('#tasking-buttons').append(scalingSpan)
// Add issp button
let isspButton = document.createElement('button')
isspButton.innerHTML = `ISSP`
isspButton.onclick = generateIssp
document.querySelector('#tasking-buttons').append(isspButton)

let obversationLimit = 86164 / 900

let savedTaskings = {}

function savedTaskingsFromLocalStorage() {
    let savedTaskingsNames = Object.keys(window.localStorage).filter(s => s.slice(0,4) === 'acs_')
    let savedTaskings = savedTaskingsNames.map(s => window.localStorage.getItem(s)).map(s => JSON.parse(s))
    let saveTaskingDiv = document.querySelector('#save-task-div')
    savedTaskingsNames.forEach((task,ii) => {
        let name = task.slice(4)
        let newTasking = document.createElement('button')
        newTasking.innerHTML = name
        newTasking.onclick = uploadSavedTasking
        newTasking.classList.add('saved-tasking-button')
        newTasking.setAttribute('target', savedTaskings[ii].target)
        newTasking.setAttribute('epoch', savedTaskings[ii].epoch)
        newTasking.setAttribute('sensors', savedTaskings[ii].sensors)
        saveTaskingDiv.append(newTasking)
    })
    
}
savedTaskingsFromLocalStorage()

function uploadSavedTasking(el) {
    if (el.ctrlKey) {
        el.target.remove()
        window.localStorage.removeItem(el.target.innerText)
        return
    }
    el = el.target
    document.title = el.innerText
    let newState = el.getAttribute('target').split('x').map(s => Number(s))
    let newStateEpoch = new Date(el.getAttribute('epoch'))
    let activeSensors = el.getAttribute('sensors').split('x')
    activeSensors = el.getAttribute('sensors') === '' ? [] : activeSensors
    console.log(el.getAttribute('sensors'), newState, newStateEpoch, activeSensors);
    for (let index = 0; index < mainWindow.sensors.length; index++) {
        mainWindow.sensors[index].active = activeSensors.findIndex(s => s === mainWindow.sensors[index].name) !== -1 ? true : false
    }
    
    mainWindow.startTime = newStateEpoch
    updateTime(mainWindow.startTime)
    mainWindow.satellites[0].origState = newState
    updateCoeDisplay()
    updateSensors(mainWindow.sensors)
}

function saveCurrentTasking(el) {
    let name = el.nextSibling.value
    el.nextSibling.value = ''
    name = name === '' ? `Tasking #${document.querySelectorAll('.saved-tasking-button').length + 1}` : name
    let saveTaskingDiv = document.querySelector('#save-task-div')
    let newTasking = document.createElement('button')
    newTasking.innerHTML = name
    newTasking.onclick = uploadSavedTasking
    newTasking.classList.add('saved-tasking-button')
    newTasking.setAttribute('target', mainWindow.satellites[0].origState.join('x'))
    newTasking.setAttribute('epoch', mainWindow.startTime)
    newTasking.setAttribute('sensors', mainWindow.sensors.map((s, ii) => [s.active, s.name]).filter(s => s[0]).map(s => s[1]).join('x'))
    saveTaskingDiv.append(newTasking)
    window.localStorage.setItem('acs_'+name, JSON.stringify({
        target: mainWindow.satellites[0].origState.join('x'),
        epoch: mainWindow.startTime,
        sensors: mainWindow.sensors.map((s, ii) => [s.active, s.name]).filter(s => s[0]).map(s => s[1]).join('x')
    }))
}

let mainWindow = {
    planet: {
        mu: 398600.4418,
        r: 6371,
        w: 2 * Math.PI / 86164,
        sidAngle: 0 //at t = 0
    },
    initSun: [-94309.749762, 139482969.590637, 60466737.314102],
    maxTime: 24 * 3600, //seconds
    propTime: 30,
    startTime: new Date(new Date() - (-21600000)),
    satellites: [
        {
            origState: [42164, 0, 0, 0, 3.0629662506494473, 0.2679748236943305],
            obFreq: 900,
            obs: []
        }
    ],
    sensors: undefined
}
let lastCov
function runge_kutta(state, dt) {
    eom = orbitalDynamics
    let k1 = eom(state);
    let k2 = eom(math.add(state, math.dotMultiply(dt / 2, k1)));
    return math.squeeze(math.add(state, math.dotMultiply(dt, k2)));
}

function generateIssp() {
    let pn = function (x, y = 2) {
        x = '' + x
        while (x.length < y) {
            x = '0' + x
        }
        return x
    }
    let timeDelta = prompt('Enter time increments in minutes', 15) * 60
    if (timeDelta === null) return
    let totalTime = document.querySelector('#track-time-input').value * 3600
    let startTime = new Date(mainWindow.startTime - (totalTime * 1000))
    startTime = new Date(startTime.getFullYear(), startTime.getMonth(), startTime.getDate(), startTime.getHours())
    let hoursLine = 'Type,Name,'
    let rowObs = []
    out = ''
    for (let curTime = 0; curTime <= (totalTime + 3600); curTime += timeDelta) {
        let rowTime = new Date(startTime - (-curTime * 1000))
        let propTime1 = (rowTime - mainWindow.startTime) / 1000
        let propTime2 = propTime1 + timeDelta / 3
        let propTime3 = propTime2 + timeDelta / 3
        let propState1 = propToTime(mainWindow.satellites[0].origState, propTime1)
        let propState2 = propToTime(mainWindow.satellites[0].origState, propTime2)
        let propState3 = propToTime(mainWindow.satellites[0].origState, propTime3)
        let checkedObs = [...checkSensors(propState1, propTime1).map(s => mainWindow.sensors[s.sensor].name), ...checkSensors(propState2, propTime2).map(s => mainWindow.sensors[s.sensor].name), ...checkSensors(propState3, propTime3).map(s => mainWindow.sensors[s.sensor].name)]
        rowObs.push(mainWindow.sensors.map(s => {
            return [s.name, checkedObs.filter(ob => ob === s.name).length]
        }))
        hoursLine += `${pn(rowTime.getHours())}${pn(rowTime.getMinutes())}z,`
    }
    out += hoursLine + '\n'
    out += mainWindow.sensors.filter(s => s.active).map((sens, ii) => {
        let sensOut = `${sens.type}, ${sens.name},`
        console.log(rowObs.map(row => row[row.findIndex(ob => ob[0] === sens.name)]));
        sensOut += rowObs.map(row => row[row.findIndex(ob => ob[0] === sens.name)][1] > 0 ? 'X' : '').join(',')
        return sensOut
    }).join('\n')

    downloadFile('issp.csv', out)
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

function orbitalDynamics(position = [42164, 0, 0, 0, 3.074, 0], j2Eff = false) {
    let mu = 398600.44189, j2 = 0.00108262668, re = 6378, x = position[0], y = position[1], z = position[2]
    let r = math.norm(position.slice(0, 3))
    return j2Eff ? [
        position[3], position[4], position[5],
        -mu * x / r ** 3 * (1 - 1.5 * j2 * re ** 2 / r ** 2 * (5 * z ** 2 / r ** 2 - 1)),
        -mu * y / r ** 3 * (1 - 1.5 * j2 * re ** 2 / r ** 2 * (5 * z ** 2 / r ** 2 - 1)),
        -mu * z / r ** 3 * (1 - 1.5 * j2 * re ** 2 / r ** 2 * (5 * z ** 2 / r ** 2 - 3))
    ] :
        [
            position[3], position[4], position[5],
            -mu * x / r ** 3,
            -mu * y / r ** 3,
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

function estimateCovariance(sat = 0, returnDecomp = false, returnEciCov = false) {
    let scale = Number(document.querySelector('#cov-scale-input').value) / 100
    if (scale < 0) { scale = 1 }
    scale = scale ** 2
    // Create jacobian based on expected observations
    let blsMatrices = createJacobian(sat)
    // Convert jacobian into matrix that contains covariance information along with sensor noise data
    let a = math.inv(math.multiply(math.transpose(blsMatrices.jac), blsMatrices.w, blsMatrices.jac))
    if (returnEciCov) return a
    let sigData = propEciCovariance(mainWindow.satellites[0].origState, a, 0)
    
    console.log(a, choleskyDecomposition(a), sigData);
    // Convert to RIC frame
    let r = Eci2Ric()
    a = math.multiply(math.transpose(r), a, r)
    // Scale with value (defaults to 100% but user can make as high or low as possible)
    a = a.map(row => row.map(val => val * scale))
    lastCov = a
    if (returnDecomp) return choleskyDecomposition(a)
    try {
        console.log(math.eigs(a));
    } catch (error) {
        console.log(error.values);
    }
    navigator.clipboard.writeText(JSON.stringify({ time: mainWindow.startTime, std: a }))
    let div = document.getElementById('cov-display')
    div.innerHTML = `StD Position Error: ${(sigData.pRange**0.5).toFixed(3)} km, StD Velocity Error: ${((sigData.pVel**0.5) * 1000).toFixed(3)} m/s`
    return a
}

function normalRandom() {
    var val, u, v, s, mul;
    spareRandom = null;
    if (spareRandom !== null) {
        val = spareRandom;
        spareRandom = null;
    }
    else {
        do {
            u = Math.random() * 2 - 1;
            v = Math.random() * 2 - 1;

            s = u * u + v * v;
        } while (s === 0 || s >= 1);

        mul = Math.sqrt(-2 * Math.log(s) / s);

        val = u * mul;
        spareRandom = v * mul;
    }

    return val;
}

function createSigmaPoints(state, cov, dt = 0, n = 2000) {
    cov = math.transpose(choleskyDecomposition(cov))
    let sigmas = []
    for (let i = 0; i < n; i++) {
        let sigmaState = state.slice()
        for (let j = 0; j < cov.length; j++) {
            sigmaState = math.add(sigmaState, math.dotMultiply(normalRandom(), cov[j]))
        }
        sigmas.push(sigmaState)
    }
    let origSig = sigmas.slice();
    let origAve = origSig.reduce((a, b) => math.add(a, b), [0, 0, 0, 0, 0, 0]).map(s => s / sigmas.length)
    // console.log(origAve);
    sigmas = sigmas.map(s => propToTime(s, dt))
    let del = math.subtract(sigmas, origSig).map(d => math.norm(d))
    // console.log(origSig.filter((s,ii) => del[ii] > 1e-6), del.filter(d => d > 1e-6));
    let aveState = sigmas.reduce((a, b) => math.add(a, b), [0, 0, 0, 0, 0, 0]).map(s => s / sigmas.length)
    // console.log(aveState);
    let aveRange = (sigmas.reduce((a, b) => a + math.norm(math.subtract(b.slice(0, 3), aveState.slice(0, 3))) ** 2, 0) / sigmas.length) ** 0.5
    let aveRelVel = (sigmas.reduce((a, b) => a + math.norm(math.subtract(b.slice(3, 6), aveState.slice(3, 6))) ** 2, 0) / sigmas.length) ** 0.5
    return { aveRange, aveRelVel }
}

function checkSensors(sat = [], time, options = {}) {
    let { noise = false, mask = true, pastObs = [], obLimit = 900, sensors = math.range(0, mainWindow.sensors.length)._data } = options
    let propSatState = sat.slice()
    let obDate = new Date((new Date(mainWindow.startTime)) - (-time * 1000))
    let sunPos = sunFromTime(julianDate(obDate.getFullYear(), obDate.getMonth() + 1, obDate.getDate(), obDate.getHours(), obDate.getMinutes(), obDate.getSeconds()))
    sunPos = math.subtract(sunPos, sat.slice(0, 3))
    let sunPosUnit = math.dotDivide(sunPos, math.norm(sunPos))
    let obs = []
    for (let ii = 0; ii < sensors.length; ii++) {
        let index = sensors[ii]
        if (!mainWindow.sensors[index].active) continue
        let avail = mainWindow.sensors[index].avail.filter(a => a[0] < obDate && a[1] > obDate).length === 0
        if (!avail) continue

        if (mainWindow.sensors[index].type === 'optical' || mainWindow.sensors[index].type === 'radar') {
            let pastSensorObs = pastObs.filter(s => s.sensor === index).filter(ob => math.abs(ob.time - time) < obLimit)
            if (pastSensorObs.length > 0 && mask) continue
            let sensorPos = sensorGeodeticPosition(mainWindow.sensors[index].lat, mainWindow.sensors[index].long, 0)
            sensorPos = sensorPos.r
            sensorPos = fk5Reduction(sensorPos, obDate)
            // Check if sensor in direct sunlight
            let siteCats = math.acos(math.dot(sensorPos, sunPosUnit) / math.norm(sensorPos)) * 180 / Math.PI
            if (siteCats < 90 && mainWindow.sensors[index].type === 'optical' && mask) continue
            let relativeSatState = math.subtract(propSatState.slice(0, 3), sensorPos)
            // Check if within range
            if (math.norm(relativeSatState.slice(0, 3)) > mainWindow.sensors[index].maxRange && mask) continue
            // Check if sun behind optical sensor
            let cats = math.acos(math.dot(relativeSatState, sunPosUnit) / math.norm(relativeSatState)) * 180 / Math.PI
            if (cats < 90 && mainWindow.sensors[index].type === 'optical' && mask) continue
            // Check if satellite in direct sunlight
            // let check = lineSphereIntercetionBool(sunPosUnit, sat.slice(0,3), [0,0,0], sphereRadius=6500)
            let check = isSatIlluminated(sat.slice(0, 3), sunPos)
            if (!check && mask && mainWindow.sensors[index].type === 'optical') continue
            let { az, el, r } = razel(propSatState.slice(0, 3), obDate, mainWindow.sensors[index].lat, mainWindow.sensors[index].long, 0)
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
            if (mainWindow.sensors[index].type === 'optical') {
                obs.push({
                    sensor: index,
                    time,
                    obs: [az * Math.PI / 180, el * Math.PI / 180],
                    noise: [mainWindow.sensors[index].noise.angle, mainWindow.sensors[index].noise.angle].map(n => n * Math.PI / 180)
                })
            }
            else if (mainWindow.sensors[index].type === 'radar') {
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
            let obEpoch = new Date(mainWindow.startTime.getTime() + time * 1000)
            let delta = (obEpoch - mainWindow.sensors[index].epoch) / 1000
            let propState = propToTime(mainWindow.sensors[index].state.slice(), delta)

            let vertVec = math.dotDivide(propState.slice(0, 3), math.norm(propState.slice(0, 3)))
            vertVec = math.squeeze(math.multiply(rotationMatrices(mainWindow.sensors[index].elAngle, 3), math.transpose([vertVec])))
            let relativeSatState = math.subtract(propSatState.slice(0, 3), propState.slice(0, 3))
            let cats = math.acos(math.dot(relativeSatState, sunPosUnit) / math.norm(relativeSatState)) * 180 / Math.PI
            if (cats < 90 && mask) {
                console.log('out of view');
                continue
            }
            let el = 90 - math.acos(math.dot(vertVec, relativeSatState) / math.norm(relativeSatState)) * 180 / Math.PI
            if (el < mainWindow.sensors[index].elMask[0] & mask) {
                console.log('el mask')
                continue
            }
            let ra = math.atan2(relativeSatState[1], relativeSatState[0])
            let dec = math.atan2(relativeSatState[2], math.norm(relativeSatState.slice(0, 2)))
            if (mainWindow.sensors[index].type === 'space') {
                obs.push({
                    sensor: index,
                    time,
                    obs: [ra, dec],
                    noise: [mainWindow.sensors[index].noise.angle, mainWindow.sensors[index].noise.angle].map(n => n * Math.PI / 180)
                })
            }
        }
        else {
            let pastSensorObs = pastObs.filter(s => s.sensor === index).filter(ob => math.abs(ob.time - time) < obLimit)
            // if (pastSensorObs.length > 0 && mask) continue
            // Get Sensor ECI position
            let sensorPos = sensorGeodeticPosition(mainWindow.sensors[index].lat, mainWindow.sensors[index].long, 0)
            sensorPos = sensorPos.r
            sensorPos = fk5Reduction(sensorPos, obDate)
            let sensorVel = math.cross([0,0,2*Math.PI / 86164], sensorPos)
            let { az, el, r } = razel(propSatState.slice(0, 3), obDate, mainWindow.sensors[index].lat, mainWindow.sensors[index].long, 0)
            if (el < 0) continue

            // Get range Rate
            let relPosSensorSat = math.subtract(propSatState.slice(0, 3), sensorPos)
            let relVelSensorSat = math.subtract(propSatState.slice(3), sensorVel)
            
            let rangeRate = math.dot(relPosSensorSat, relVelSensorSat) / math.norm(relPosSensorSat)
            // continue
            obs.push({
                sensor: index,
                time,
                obs: [rangeRate],
                noise: [mainWindow.sensors[index].noise.rate]
            })
        }
    }
    return obs
}

function checkSensorsRedux(sat = [42164, 0, 0, 0, 3.0147, 0], obDate = new Date(), options = {}) {
    let { noise = false, mask = true, pastObs = [], obLimit = 900, sensors = math.range(0, mainWindow.sensors.length)._data } = options
    let propSatState = sat.slice()
    let sunPos = sunFromTime(julianDate(obDate.getFullYear(), obDate.getMonth() + 1, obDate.getDate(), obDate.getHours(), obDate.getMinutes(), obDate.getSeconds()))
    sunPos = math.subtract(sunPos, sat.slice(0, 3))
    let obs = []
    for (let ii = 0; ii < sensors.length; ii++) {
        let index = sensors[ii]
        if (!mainWindow.sensors[index].active) continue

        // Check if sensor is available
        let avail = mainWindow.sensors[index].avail.filter(a => a[0] < obDate && a[1] > obDate).length === 0
        if (!avail) continue

        let pastSensorObs = pastObs.filter(s => s.sensor === index).filter(ob => math.abs(ob.time - time) < obLimit)
        if (pastSensorObs.length > 0 && mask) continue

        let sensorPos
        if (mainWindow.sensors[index].type === 'space') {
            let delta = (obDate - mainWindow.sensors[index].epoch) / 1000
            sensorPos = propToTime(mainWindow.sensors[index].state.slice(), delta).slice(0,3)
        }
        else {
            sensorPos = sensorGeodeticPosition(mainWindow.sensors[index].lat, mainWindow.sensors[index].long, 0).r
            sensorPos = fk5Reduction(sensorPos, obDate)
        }
        // Check if sensor in direct sunlight, turn off optical sensors if so
        let siteCats = math.acos(math.dot(sensorPos, math.subtract(sunPos, sensorPos)) / math.norm(sensorPos) / math.norm(sunPos)) * 180 / Math.PI
        if (siteCats < 90 && mainWindow.sensors[index].type === 'optical' && mask) continue
        // Get CATS from the site to the target
        let relativeSatState = math.subtract(propSatState.slice(0, 3), sensorPos)
        let relativeSunState = math.subtract(sunPos, propSatState.slice(0,3))
        // Check if within range
        if (math.norm(relativeSatState.slice(0, 3)) > mainWindow.sensors[index].maxRange && mask) continue
        // Check if sun behind optical sensor
        let cats = math.acos(math.dot(relativeSatState, relativeSunState) / math.norm(relativeSatState) / math.norm(relativeSunState)) * 180 / Math.PI
        if (cats > 90 && (mainWindow.sensors[index].type === 'optical' || mainWindow.sensors[index].type === 'space') && mask) continue

        let illuminationCheck = isSatIlluminated(sat.slice(0, 3), sunPos)
        if (!illuminationCheck && mask && (mainWindow.sensors[index].type === 'space' || mainWindow.sensors[index].type === 'optical')) continue
        let obTime = (obDate - mainWindow.startTime) / 1000
        if (mainWindow.sensors[index].type === 'space') {
            let vertVec = math.dotDivide(sensorPos, math.norm(sensorPos.slice(0, 3)))
            vertVec = math.squeeze(math.multiply(rotationMatrices(mainWindow.sensors[index].elAngle, 3), math.transpose([vertVec])))
            let ra = math.atan2(relativeSatState[1], relativeSatState[0])
            let dec = math.atan2(relativeSatState[2], math.norm(relativeSatState.slice(0, 2)))
            
            obs.push({
                sensor: index,
                obTime,
                obs: [ra, dec],
                noise: [mainWindow.sensors[index].noise.angle, mainWindow.sensors[index].noise.angle].map(n => n * Math.PI / 180)
            })
        }
        else {
            let { az, el, r } = razel(propSatState.slice(0, 3), obDate, mainWindow.sensors[index].lat, mainWindow.sensors[index].long, 0)
            
            let sensorVel = math.cross([0,0,2*Math.PI / 86164], sensorPos)
            let relPosSensorSat = math.subtract(propSatState.slice(0, 3), sensorPos)
            let relVelSensorSat = math.subtract(propSatState.slice(3), sensorVel)
            let rangeRate = math.dot(relPosSensorSat, relVelSensorSat) / math.norm(relPosSensorSat)
            switch (mainWindow.sensors.type) {
                case 'optical':
                    obs.push({
                        sensor: index,
                        obTime,
                        obs: [az * Math.PI / 180, el * Math.PI / 180],
                        noise: [mainWindow.sensors[index].noise.angle, mainWindow.sensors[index].noise.angle].map(n => n * Math.PI / 180)
                    })
                    break
                case 'radar':
                    obs.push({
                        sensor: index,
                        obTime,
                        obs: [az * Math.PI / 180, el * Math.PI / 180, r],
                        noise: [mainWindow.sensors[index].noise.angle * Math.PI / 180, mainWindow.sensors[index].noise.angle * Math.PI / 180, mainWindow.sensors[index].noise.r]
                    })
                    break
                case 'range':
                    obs.push({
                        sensor: index,
                        obTime,
                        obs: [r],
                        noise: [mainWindow.sensors[index].noise.r]
                    })
                    break
                case 'rangeRate':
                    obs.push({
                        sensor: index,
                        obTime,
                        obs: [rangeRate],
                        noise: [mainWindow.sensors[index].noise.rr]
                    })
                    break
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
        let r = math.norm(propState.slice(0, 3))
        let obLimit = 2 * Math.PI * (r ** 3 / 398600.4418) ** 0.5 / obversationLimit
        let obs = checkSensors(propState, -timeOb, { pastObs: satObs, obLimit })
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
    for (let ii = 0; ii < times.length - 1; ii++) {
        for (let index = 0; index < 10; index++) {
            propState = runge_kutta(propState, (times[ii + 1] - times[ii]) / 10)
            propTime += (times[ii + 1] - times[ii]) / 10
        }
        let obs = checkSensors(propState, propTime, { sensors: [mainWindow.satellites[sat].obs[ii].sensor], mask: false })
        outObs.push(...obs)
    }
    return outObs
}

function convertObsToVector(obs) {
    obs = obs.map(ob => ob.obs)
    let outObs = []
    obs.forEach(ob => {
        outObs = math.concat(outObs, ob)
    })
    return outObs
    // return math.reshape(obs, [1,-1])[0]
}

function convertObsToWeightMatrix(obs) {
    // let newObs = math.reshape(obs.map(ob => ob.noise), [1,-1])[0].map(n => 1/n/n)
    let outObs = []
    obs.forEach(ob => {
        outObs = math.concat(outObs, ob.noise.map(n => 1 / n / n))
    })
    return math.diag(outObs)
    // return math.diag(newObs)
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
    return { jac, w: convertObsToWeightMatrix(copyObHistory(state)) }
}

function choleskyDecomposition(matrix = [[25, 15, -5], [15, 18, 0], [-5, 0, 11]], fixIfNaN = true) {
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
                a[ii][jj] = a[ii][jj] ** (1 / 2)
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
    a = a.map(row => row.map(col => Number.isNaN(col) ? 1e-8 : col))
    return a
}

function lineSphereIntercetionBool(line = [-0.45, 0, 0.45], lineOrigin = [282.75, 0, 0], sphereOrigin = [0, 0, 0], sphereRadius = 200) {
    line = math.dotDivide(line, math.norm(line))
    let check = math.dot(line, math.subtract(lineOrigin, sphereOrigin)) ** 2 - (math.norm(math.subtract(lineOrigin, sphereOrigin)) ** 2 - sphereRadius ** 2)
    return check > 0
}

function isSatIlluminated(satPos = [6900, 0, 0], sunPos = [6900000, 0, 0]) {
    let satSunAngle = math.acos(math.dot(satPos.slice(0, 3), sunPos) / math.norm(satPos.slice(0, 3)) / math.norm(sunPos))
    if (satSunAngle < Math.PI / 2) return true
    return !lineSphereIntercetionBool(math.subtract(satPos.slice(0, 3), sunPos), sunPos, [0, 0, 0], 6400)
}

function importState(t) {
    let tV = t.value.split(/ {2,}/)
    if (tV.length < 2) {
        tV = t.value.split('x')
    }
    let time = tV[0]
    let newDate = new Date(time)
    if (newDate == 'Invalid Date') {
        t.value = ''
        alert('String Not Accepted')
        return
    }
    let position = tV.slice(1, 7).map(n => Number(n))
    if (position.filter(p => Number.isNaN(p)).length > 0 || position.length < 6) {
        t.value = ''
        t.placeholder = 'String Not Accepted'
        return
    }
    t.value = ''
    t.placeholder = 'String Accepted'
    setTimeout(() => {
        t.placeholder = 'SDA Report Input'
    }, 2000)
    mainWindow.startTime = new Date(time)
    mainWindow.satellites = [{
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
        let a = new Date(new Date(mainWindow.startTime.getTime() + ob.time * 1000))
        a = `${padNumber(a.getHours())}:${padNumber(a.getMinutes())}z ${a.getMonth() + 1}/${a.getDate()}/${a.getFullYear()}`
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
    else mainWindow.satellites[0].obs.splice(Number(t.target.getAttribute('ob')), 1)
    listObs(mainWindow.satellites[0].obs)
}

function propToTime(state, dt, j2 = true) {
    state = PosVel2CoeNew(state.slice(0, 3), state.slice(3, 6))
    if (j2) {
        state.tA = propTrueAnomalyj2(state.tA, state.a, state.e, state.i, dt)
        let j2 = 1.082626668e-3
        let n = (398600.4418 / state.a / state.a / state.a) ** 0.5
        let rEarth = 6378.1363
        let p = state.a * (1 - state.e ** 2)
        let raanJ2Rate = -3 * n * rEarth * rEarth * j2 * Math.cos(state.i) / 2 / p / p
        let argJ2Rate = 3 * n * rEarth * rEarth * j2 * (4 - 5 * Math.sin(state.i) ** 2) / 4 / p / p
        state.raan += raanJ2Rate * dt
        state.arg += argJ2Rate * dt
    }
    else {
        state.tA = propTrueAnomaly(state.tA, state.a, state.e, dt)
    }
    state = Object.values(Coe2PosVelObject(state))
    return state
}

function PosVel2CoeNew(r = [42164.14, 0, 0], v = [0, 3.0746611796284924, 0]) {
    let mu = 398600.4418
    let rn = math.norm(r)
    let vn = math.norm(v)
    let h = math.cross(r, v)
    let hn = math.norm(h)
    let n = math.cross([0, 0, 1], h)
    let e = math.dotDivide(math.subtract(math.dotMultiply(vn ** 2 - mu / rn, r), math.dotMultiply(math.dot(r, v), v)), mu)
    let en = math.norm(e)
    let specMechEn = vn ** 2 / 2 - mu / rn
    let a = -mu / 2 / specMechEn
    let i = math.acos(h[2] / hn)
    let raan = math.acos(n[0] / math.norm(n))
    if (n[1] < 0) {
        raan = 2 * Math.PI - raan
    }
    let arg = math.acos(math.dot(n, e) / math.norm(n) / en)
    if (arg.re !== undefined) {
        arg = arg.re
    }
    if (e[2] < 0) {
        arg = 2 * Math.PI - arg
    }
    let tA = math.acos(math.dot(e, r) / en / rn)
    if (tA.re !== undefined) {
        tA = tA.re
    }
    if (math.dot(r, v) < 0) {
        tA = 2 * Math.PI - tA
    }
    let longOfPeri, argLat, trueLong
    if (en < 1e-6 && i < 1e-6) {
        trueLong = math.acos(r[0] / rn)
        if (r[1] < 0) {
            trueLong = 2 * Math.PI - trueLong
        }
        arg = 0
        raan = 0
        tA = trueLong
    }
    else if (en < 1e-6) {
        argLat = math.acos(math.dot(n, r) / math.norm(n) / rn)
        if (r[2] < 0) {
            argLat = 2 * Math.PI - argLat
        }
        arg = 0
        tA = argLat
    }
    else if (i < 1e-6) {
        longOfPeri = math.acos(e[0] / en)
        if (e[1] < 0) {
            longOfPeri = 2 * Math.PI - longOfPeri
        }
        raan = 0
        arg = longOfPeri
    }
    return {
        a,
        e: en,
        i,
        raan,
        arg,
        tA
    };
}

function Coe2PosVelObject(coe = { a: 42164.1401, e: 0, i: 0, raan: 0, arg: 0, tA: 0 }, peri = false) {
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
    function Eccentric2True(e, E) {
        return Math.atan(Math.sqrt((1 + e) / (1 - e)) * Math.tan(E / 2)) * 2;
    }

    function solveKeplersEquation(M, e) {
        let E = M;
        let del = 1;
        while (Math.abs(del) > 1e-6) {
            del = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
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

function propTrueAnomalyj2(tA = 0, a = 10000, e = 0.1, i, time = 3600) {
    function True2Eccentric(e, ta) {
        return Math.atan(Math.sqrt((1 - e) / (1 + e)) * Math.tan(ta / 2)) * 2;
    }
    function Eccentric2True(e, E) {
        return Math.atan(Math.sqrt((1 + e) / (1 - e)) * Math.tan(E / 2)) * 2;
    }

    let j2 = 1.082626668e-3
    let n = (398600.4418 / a / a / a) ** 0.5
    let rEarth = 6378.1363
    let p = a * (1 - e ** 2)
    let mAj2rate = -3 * n * rEarth * rEarth * j2 * (1 - e * e) * (3 * Math.sin(i) ** 2 - 2) / 4 / p / p
    function solveKeplersEquation(M, e) {
        let E = M;
        let del = 1;
        while (Math.abs(del) > 1e-6) {
            del = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
            E -= del;
        }
        return E;
    }

    let eccA = True2Eccentric(e, tA)
    let meanA = eccA - e * Math.sin(eccA)
    meanA += Math.sqrt(398600.4418 / (a ** 3)) * time
    meanA += mAj2rate * time
    eccA = solveKeplersEquation(meanA, e)
    return Eccentric2True(e, eccA)
}

function changeSensorProperty(s) {
    let ob = s.getAttribute('ob')
    let sens = s.getAttribute('sensor')
    if (ob === 'active') {
        mainWindow.sensors[sens].active = s.checked
        // s.parentElement.style.color = s.checked ? 'rgb(100,200,100)' : 'rgb(200,80,80)'
        updateSensors(mainWindow.sensors)
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
        startDate.setHours(avail[0].slice(0, 2))
        startDate.setMinutes(avail[0].slice(2, 4))
        startDate.setSeconds(0)
        let endDate = new Date(mainWindow.startTime)
        endDate.setDate((avail[0].slice(0, 2) * 60 + avail[0].slice(2, 4) * 1) > (avail[1].slice(0, 2) * 60 + avail[1].slice(2, 4) * 1) ? date + 1 : date)
        endDate.setHours(avail[1].slice(0, 2))
        endDate.setMinutes(avail[1].slice(2, 4))
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
    let activeIndexes = getAllIndexes(sensors)
    sensDiv.innerHTML = ''
    for (let index = 0; index < activeIndexes.length; index++) {
        let s = sensors[activeIndexes[index]]
        let ii = activeIndexes[index]
        let div = document.createElement("div")
        let realIndex = mainWindow.sensors.findIndex(a => a.name === s.name)
        div.innerHTML = `
            <label class="sensor-label" style="color: ${s.active ? 'rgb(100,200,100)' : 'rgb(200,80,80)'}" for="sensor-${ii}">
                <span>${s.name}</span><span style="font-size: 0.25em">${s.type}</span>
            </label> 
            <input ob="active" id="sensor-${ii}" sensor="${ii}" type="checkbox" ${s.active ? 'checked' : ''} oninput="changeSensorProperty(this)"/> 
            <span class="pointer" style="font-size: 0.5em; padding: 3px; border: 1px solid black; border-radius: 5px" onclick="showAvailability(${realIndex})">Availablity</span>
            ${mainWindow.sensors[realIndex].type === 'space' ? `<span class="pointer" style="font-size: 0.5em; padding: 3px; border: 1px solid black; border-radius: 5px" onclick="showStateUpdate(${ii})">Update State</span>` : ''}
        `
        let divTitle = s.type === 'space' ? Object.values(PosVel2CoeNew(s.state.slice(0, 3), s.state.slice(3, 6))).map((s, ii) => ii > 1 ? s * 180 / Math.PI : s).map(s => s.toFixed(3)).join(', ') : `Lat: ${s.lat} deg\nLong: ${s.long} deg`
        divTitle +=  s.azMask !== undefined ? `\nAzimuth Vis: ${s.azMask.join(' to ')} deg` : ''
        divTitle += `\nElevation Vis: ${s.elMask.join(' to ')} deg`
        divTitle += `\nMax Range: ${s.maxRange} km`
        div.title = divTitle
        sensDiv.append(div)
    }
    sensors.forEach((s, ii) => {
        if (activeIndexes.filter(s => s === ii).length > 0) return
        let div = document.createElement("div")
        div.innerHTML = `
            <label class="sensor-label" style="color: ${s.active ? 'rgb(100,200,100)' : 'rgb(200,80,80)'}" for="sensor-${ii}">
                <span>${s.name}</span><span style="font-size: 0.25em">${s.type}</span>
            </label> 
            <input ob="active" id="sensor-${ii}" sensor="${ii}" type="checkbox" ${s.active ? 'checked' : ''} oninput="changeSensorProperty(this)"/> 
            <span class="pointer" style="font-size: 0.5em; padding: 3px; border: 1px solid black; border-radius: 5px" onclick="showAvailability(${ii})">Availablity</span>
            ${s.type === 'space' ? `<span class="pointer" style="font-size: 0.5em; padding: 3px; border: 1px solid black; border-radius: 5px" onclick="showStateUpdate(${ii})">Update State</span>` : ''}
        `
        let divTitle = s.type === 'space' ? Object.values(PosVel2CoeNew(s.state.slice(0, 3), s.state.slice(3, 6))).map((s, ii) => ii > 1 ? s * 180 / Math.PI : s).map(s => s.toFixed(3)).join(', ') : `Lat: ${s.lat} deg\nLong: ${s.long} deg`
        divTitle += s.azMask !== undefined ? `\nAzimuth Vis: ${s.azMask.join(' to ')} deg` : ''
        divTitle += `\nElevation Vis: ${s.elMask.join(' to ')} deg`
        divTitle += `\nMax Range: ${s.maxRange} km`
        div.title = divTitle
        sensDiv.append(div)
    })
}

function changeSensorDialog(el) {
    let type
    if (el === undefined) {
        type = 'optical'
    }
    else {
        type = el.id.split('-')[0]
    }
    console.log(type);
    let inputFieldDiv = document.querySelector('dialog').querySelector('#input-field-div')
    inputFieldDiv.innerHTML = `
        <div> Name  <input placeholder="Sensor #${mainWindow.sensors.length+1}" style="width: 10em; text-align: center"/></div>
        ${type !== 'space' ? `
            <div> Latitude  <input placeholder="0" style="width: 5em; text-align: center" type="number"/> deg</div>
            <div> Longitude <input placeholder="0" style="width: 5em; text-align: center" type="number"/> deg</div>
        ` : `
            Edit space sensor state using <em>Update State</em>
        `}
        <div style="margin: 5px 0px; width: 100%; background-color: black; height: 3px;"></div>
        <div> &sigma; Angles <input placeholder="${type === 'optical' ? 0.0035 : 0.01}" style="width: 5em; text-align: center" type="number"/> deg</div>
        ${type === 'radar' ? `<div> &sigma; Range <input placeholder="0.15" style="width: 5em; text-align: center" type="number"/> km</div>` : ''}   
    `
} 

function handleSensorDialogBox(el) {
    if (el.innerText === 'Add Sensor') {
        let inputs = [...document.querySelector('dialog').querySelector('#input-field-div').querySelectorAll('input')].map(s => s.value === '' ? s.placeholder : s.value)
        let radio = document.querySelector('dialog').querySelector('input:checked')
        let type = radio.id.split('-')[0]
        let noise = {
            angle: Number(inputs[3]),
        }
        if (type === 'radar') {
            noise.r = Number(inputs[4])
        }
        let sensor = {
            type,
            avail: [],
            azMask: [],
            elMask: [type === 'optical' ? 10 : type === 'space' ? -80 : 3,90],
            maxRange: 60000,
            name: inputs[0],
            noise
        }
        if (type !== 'space') {
            sensor.lat = Number(inputs[1])
            sensor.long = Number(inputs[2])
        }
        else {
            sensor.epoch = new Date()
            sensor.state = [42164, 0, 0, 0, 3.014, 0]
        }
        mainWindow.sensors.push(sensor)
    }
    document.querySelector('dialog').close()
    updateSensors(mainWindow.sensors)
}

function openSensorDialog() {
    let dialogBox = document.querySelector('dialog')
    dialogBox.innerHTML = `
        <div style="margin-bottom: 10px;">
            <label for="optical-sensor">Optical</label>
            <input checked onchange="changeSensorDialog(this)" type="radio" name="sensor-type" id="optical-sensor"/>
            <label style="margin-left: 10px;" for="radar-sensor">Radar</label>
            <input onchange="changeSensorDialog(this)" type="radio" name="sensor-type" id="radar-sensor"/>
            <label style="margin-left: 10px;" for="space-sensor">Space</label>
            <input onchange="changeSensorDialog(this)" type="radio" name="sensor-type" id="space-sensor"/>
        </div>
        <div style="margin: 10px 0px;" id="input-field-div">
        </div>
        <div>
            <button onclick="handleSensorDialogBox(this)">Add Sensor</button>
            <button onclick="handleSensorDialogBox(this)">Cancel</button>
        </div>
    `
    dialogBox.showModal()
    changeSensorDialog()
}

function sunFromTime(jdUti = 2449444.5) {
    let tUti = (jdUti - 2451545) / 36525
    let lamba = 280.4606184 + 36000.770005361 * tUti
    let m = 357.5277233 + 35999.05034 * tUti
    let lambaEll = lamba + 1.914666471 * Math.sin(m * Math.PI / 180) + 0.019994643 * Math.sin(2 * m * Math.PI / 180)
    let phi = 0
    let epsilon = 23.439291 - 0.0130042 * tUti
    let rSun = 1.000140612 - 0.016708617 * Math.cos(m * Math.PI / 180) - 0.000139589 * Math.cos(2 * m * Math.PI / 180)
    let au = 149597870.7 //km
    rSun *= au
    return [
        rSun * Math.cos(lambaEll * Math.PI / 180),
        rSun * Math.cos(epsilon * Math.PI / 180) * Math.sin(lambaEll * Math.PI / 180),
        rSun * Math.sin(epsilon * Math.PI / 180) * Math.sin(lambaEll * Math.PI / 180)
    ]
}

function saveCurrentSensors() {
    let name = prompt('Name File: ', 'sensor')
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
        for (let index = 0; index < newSensors.length; index++) newSensors[index].avail = newSensors[index].avail.map(s => s.map(t => new Date(t.replace('Z', 'Z'))))
        mainWindow.sensors = newSensors
        updateSensors(mainWindow.sensors)
    };
    fileReader.readAsText(fileToLoad, "UTF-8");
}

function julianDate(yr = 1996, mo = 10, d = 26, h = 14, min = 20, s = 0) {
    return 367 * yr - Math.floor(7 * (yr + Math.floor((mo + 9) / 12)) / 4) + Math.floor(275 * mo / 9) + d + 1721013.5 + ((s / 60 + min) / 60 + h) / 24
}

function updateTime(time = Date.now(), updateEarth = true) {
    time = new Date(time + 21600000)
    let y = time.getFullYear();
    let m = (time.getMonth() + 1).toString();
    let d = time.getDate().toString();
    while (m.length < 2) {
        m = '0' + m
    }
    while (d.length < 2) {
        d = '0' + d
    }
    if ([y, m, d].filter(s => Number.isNaN(Number(s))).length > 0) return
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
        raan: 0,
        arg: 0,
        tA: mainWindow.planet.sidAngle + long * Math.PI / 180
    })
    mainWindow.satellites[0].origState = Object.values(state)
    updateCoeDisplay()
}

function timeChange(t) {
    let inputs = t.parentElement.getElementsByTagName('input')
    a = new Date(inputs[0].value + ' ' + inputs[1].value)
    if (a == 'Invalid Date') return
    let delta = (a - mainWindow.startTime) / 1000
    mainWindow.satellites[0].origState = propToTime(mainWindow.satellites[0].origState, delta)
    mainWindow.startTime = a
    updateTime(a)
    updateCoeDisplay()
}

function updateCoeDisplay() {
    let div = document.getElementById('coe-display')
    div.innerHTML = ''
    div.style.fontSize = '1.5em'
    let coes = PosVel2CoeNew(mainWindow.satellites[0].origState.slice(0, 3), mainWindow.satellites[0].origState.slice(3, 6))
    div.innerHTML = `a:<span class="coe-box" coe="a" contentEditable="true" oninput="coeChange(this)">${coes.a.toFixed(1)}</span> 
        e:<span class="coe-box"  coe="e" contentEditable="true" oninput="coeChange(this)">${coes.e.toFixed(4)}</span> 
        i:<span class="coe-box"  coe="i" contentEditable="true" oninput="coeChange(this)">${(coes.i * 180 / Math.PI).toFixed(1)}</span> 
        &Omega;:<span class="coe-box"  coe="raan" contentEditable="true" oninput="coeChange(this)">${(coes.raan * 180 / Math.PI).toFixed(1)}</span> 
        &omega;:<span class="coe-box"  coe="arg" contentEditable="true" oninput="coeChange(this)">${(coes.arg * 180 / Math.PI).toFixed(1)}</span> 
        &nu;:<span class="coe-box"  coe="tA" contentEditable="true" oninput="coeChange(this)">${(coes.tA * 180 / Math.PI).toFixed(1)}</span>`
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
    let c = PosVel2CoeNew(mainWindow.satellites[0].origState.slice(0, 3), mainWindow.satellites[0].origState.slice(3, 6))
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
    let rC = mainWindow.satellites[0].origState.slice(0, 3)
    let drC = mainWindow.satellites[0].origState.slice(3, 6)
    let h = math.cross(rC, drC);
    let ricX = math.dotDivide(rC, math.norm(rC));
    let ricZ = math.dotDivide(h, math.norm(h));
    let ricY = math.cross(ricZ, ricX);

    let ricXd = math.dotMultiply(1 / math.norm(rC), math.subtract(drC, math.dotMultiply(math.dot(ricX, drC), ricX)));
    let ricYd = math.cross(ricZ, ricXd);
    let ricZd = [0, 0, 0];

    let C = math.transpose([ricX, ricY, ricZ]);
    let Cd = math.transpose([ricXd, ricYd, ricZd]);
    let R1 = math.concat(C, math.zeros([3, 3]), 1)
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

function siderealTime(jdUti = 2448855.009722) {
    let tUti = (jdUti - 2451545) / 36525
    return ((67310.548 + (876600 * 3600 + 8640184.812866) * tUti + 0.093104 * tUti * tUti - 6.2e-6 * tUti * tUti * tUti) % 86400) / 240
}

function julianDate(yr = 1996, mo = 10, d = 26, h = 14, min = 20, s = 0) {
    return 367 * yr - Math.floor(7 * (yr + Math.floor((mo + 9) / 12)) / 4) + Math.floor(275 * mo / 9) + d + 1721013.5 + ((s / 60 + min) / 60 + h) / 24
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
    r = math.squeeze(math.multiply(rotationMatrices(long, 3), math.transpose([[rSigma, 0, rk]])));
    rij = math.dotDivide(r.slice(0, 2), math.norm(r.slice(0, 2)) / (rk / math.tan(lat)))
    // console.log(rij, r);
    return { r, vert: [...rij, r[2]] };

}

function fk5Reduction(r = [-1033.479383, 7901.2952754, 6380.3565958], date = new Date(2004, 3, 6, 7, 51, 28, 386)) {
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

function fk5ReductionTranspose(r = [-1033.479383, 7901.2952754, 6380.3565958], date = new Date(2004, 3, 6, 7, 51, 28, 386)) {
    // Based on Vallado "Fundamentals of Astrodyanmics and Applications" algorithm 24, p. 228 4th edition
    // ECI to ECEF
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

function razel(r_eci = [-5505.504883, 56.449170, 3821.871726], date = new Date(1995, 4, 20, 3, 17, 2, 0), lat = 39.007, long = -104.883, h = 2.187) {
    let r_ecef = fk5ReductionTranspose(r_eci, date)
    let r_site_ecef = sensorGeodeticPosition(lat, long, h).r
    let rho = math.transpose([math.subtract(r_ecef, r_site_ecef)])
    lat *= Math.PI / 180
    long *= Math.PI / 180
    let r = [[Math.sin(lat) * Math.cos(long), -Math.sin(long), Math.cos(lat) * Math.cos(long)],
    [Math.sin(lat) * Math.sin(long), Math.cos(long), Math.cos(lat) * Math.sin(long)],
    [-Math.cos(lat), 0, Math.sin(lat)]]
    rho = math.squeeze(math.multiply(math.transpose(r), rho))
    let el = Math.asin(rho[2] / math.norm(rho)) * 180 / Math.PI
    let az = Math.atan2(rho[1], -rho[0]) * 180 / Math.PI
    r = math.norm(rho)
    return { el, az, r }
}

function getAllIndexes(arr, label = 'active') {
    var indexes = [], i;
    for (i = 0; i < arr.length; i++)
        if (arr[i][label])
            indexes.push(i);
    return indexes;
}

function showCovariance() {
    let newDiv = document.createElement('div')
    let cov = estimateCovariance(0, true).map(s => s.map(v => v.toFixed(6)))
    let covNum = estimateCovariance(0, false, true)
    let timeEst = []
    for (let index = 0; index <= 12 * 3600; index += 7200) {
        timeEst.push([index, propEciCovariance(mainWindow.satellites[0].origState, covNum, index)])
    }
    // console.log(timeEst.map(t => [t[1].aveRange, t[1].aveRelVel]));
    newDiv.innerHTML = `
        <div style="background-color: #111122; font-size: 2em;" id="cov-div">
            <div onclick="closeCovariance(this)" class="exit-button">X</div>
            <div>
                <div style="text-align: center; padding-bottom: 10px; font-weight: 900;">Cholesky Decomposition of Covariance</div>
                <table>
                    <tr>
                        <td>${cov[0][0]}</td><td>X</td><td>X</td><td>X</td><td>X</td><td>X</td>
                    </tr>
                    <tr>
                        <td>${cov[1][0]}</td><td>${cov[1][1]}</td><td>X</td><td>X</td><td>X</td><td>X</td>
                    </tr>
                    <tr>
                        <td>${cov[2][0]}</td><td>${cov[2][1]}</td><td>${cov[2][2]}</td><td>X</td><td>X</td><td>X</td>
                    </tr>
                    <tr>
                        <td>${cov[3][0]}</td><td>${cov[3][1]}</td><td>${cov[3][2]}</td><td>${cov[3][3]}</td><td>X</td><td>X</td>
                    </tr>
                    <tr>
                        <td>${cov[4][0]}</td><td>${cov[4][1]}</td><td>${cov[4][2]}</td><td>${cov[4][3]}</td><td>${cov[4][4]}</td><td>X</td>
                    </tr>
                    <tr>
                        <td>${cov[5][0]}</td><td>${cov[5][1]}</td><td>${cov[5][2]}</td><td>${cov[5][3]}</td><td>${cov[5][4]}</td><td>${cov[5][5]}</td>
                    </tr>
                </table>
            </div>
            <div>
                <div style="text-align: center; padding-bottom: 10px; font-weight: 900;">Future Uncertainty</div>
                ${timeEst.map(est => `<div>${est[0] / 3600} hr ${(est[1].pRange**0.5).toFixed(2)} km</div>`).join('\n')}
            </div>
        </div>
    `
    
    
    document.getElementsByTagName('body')[0].append(newDiv)

    
}

function closeCovariance(el) {
    el.parentElement.remove()
    let cnvss = document.getElementsByTagName('canvas')
    for (let index = 0; index < cnvss.length; index++) {
        cnvss[index].remove()
    }
}

function latLong2Pixels(lat, long, cnvs) {
    long += 180
    long = long > 360 ? long - 360 : long
    lat = 90 - lat
    return {
        x: cnvs.width * long / 360,
        y: cnvs.height * lat / 180
    }
}

function showMap() {
    let endTime = Number(document.getElementById('track-time-input').value) * 3600
    let cnvs = document.createElement('canvas')
    cnvs.classList.add('div-shadow')
    let slideInput = document.createElement('input')
    slideInput.type = 'range'
    slideInput.style.position = 'fixed'
    slideInput.style.height = '5%'
    slideInput.style.left = '15%'
    slideInput.style.width = '70%'
    slideInput.style.top = '10.5%'
    slideInput.style.zIndex = 20
    slideInput.oninput = changeMap
    slideInput.min = -endTime
    slideInput.max = 0
    slideInput.value = 0
    slideInput.id = 'map-slider'
    cnvs.style.position = 'fixed'
    cnvs.style.height = '80%'
    cnvs.style.left = '10%'
    cnvs.style.width = '80%'
    cnvs.style.top = '10%'
    cnvs.width = window.innerWidth * 0.8
    cnvs.height = window.innerHeight * 0.8
    cnvs.id = 'map-canvas'
    cnvs.onclick = (el) => el.target.remove()
    document.getElementsByTagName('body')[0].append(cnvs)
    document.getElementsByTagName('body')[0].append(slideInput)
    let img = new Image()
    img.src = './Media/2_no_clouds_4k.jpg'
    let ctx = cnvs.getContext('2d')
    img.onload = function () {
        ctx.drawImage(img, 0, 0, cnvs.width, cnvs.height);
        mainWindow.sensors.forEach(sens => {
            ctx.strokeStyle = 'red'
            ctx.lineWidth = 2
            if (!sens.active) return
            if (sens.type === 'space') {
                let sensState = propToTime(sens.state, (mainWindow.startTime - sens.epoch) / 1000)
                let time = 0
                let timeDelta = 10
                ctx.fillStyle = 'rgba(255,0,0,0.125)'
                while (time < endTime) {
                    let ecefPos = fk5ReductionTranspose(sensState.slice(0, 3), new Date(mainWindow.startTime - time * 1000))
                    let longSat = math.atan2(ecefPos[1], ecefPos[0])
                    longSat *= 180 / Math.PI
                    let latSat = math.atan2(ecefPos[2], math.norm(ecefPos.slice(0, 2)))
                    latSat *= 180 / Math.PI
                    longSat += 180
                    longSat = longSat > 360 ? longSat - 360 : longSat
                    latSat = 90 - latSat
                    ctx.beginPath();
                    ctx.arc(cnvs.width * longSat / 360, cnvs.height * latSat / 180, cnvs.width / 1200, 0, 2 * Math.PI);
                    ctx.fill();
                    sensState = propToTime(sensState, -timeDelta)
                    time += timeDelta
                }
            }
            let { lat, long } = sens
            let location = latLong2Pixels(lat, long, cnvs)
            ctx.strokeRect(location.x-5, location.y-5, 10,10)
            ctx.font = '15px sans-serif'
            ctx.fillStyle = '#eee'
            ctx.textAlign = 'center'
            ctx.fillText(sens.name, location.x, location.y + 20)
        })
        let orbit = mainWindow.satellites[0].origState.slice()

        let time = 0
        let timeDelta = 10
        ctx.fillStyle = 'magenta'
        while (time < endTime) {
            let orbitEpoch = propToTime(orbit, -time)
            let ecefPos = fk5ReductionTranspose(orbitEpoch.slice(0, 3), new Date(mainWindow.startTime - time * 1000))
            let longSat = math.atan2(ecefPos[1], ecefPos[0])
            longSat *= 180 / Math.PI
            let latSat = math.atan2(ecefPos[2], math.norm(ecefPos.slice(0, 2)))
            latSat *= 180 / Math.PI
            longSat += 180
            longSat = longSat > 360 ? longSat - 360 : longSat
            latSat = 90 - latSat
            ctx.beginPath();
            ctx.arc(cnvs.width * longSat / 360, cnvs.height * latSat / 180, cnvs.width / 600, 0, 2 * Math.PI);
            ctx.fill();
            time += timeDelta
        }

        drawOnMap()
    }
}

function changeMap(inp) {
    inp = inp.target
    let inpTime = Number(inp.value)
    drawOnMap(inpTime)
}

function drawOnMap(time = 0, inCnvs = document.getElementById('map-canvas')) {
    if (inCnvs == null) return
    let idCanvas = 'over-canvas'
    let cnvs = document.getElementById('over-canvas')
    if (cnvs == null) {
        cnvs = document.createElement('canvas')
        cnvs.id = idCanvas
        document.body.append(cnvs)
    }
    cnvs.style.position = 'fixed'
    cnvs.style.top = inCnvs.offsetTop + 'px'
    cnvs.style.left = inCnvs.offsetLeft + 'px'
    cnvs.style.zIndex = '10'
    cnvs.width = inCnvs.width
    cnvs.height = inCnvs.height
    cnvs.onclick = el => {
        document.getElementById('map-slider').remove()
        let a = [...document.querySelectorAll('input[type=range]')]
        let b = [...document.querySelectorAll('canvas')]
        a.forEach(el => el.remove())
        b.forEach(el => el.remove())
    }
    let ctx = cnvs.getContext('2d')
    ctx.clearRect(0, 0, cnvs.width, cnvs.height)

    let jsTime = new Date(mainWindow.startTime - (-time * 1000))
    // Get and draw satellite current position
    let satState = propToTime(mainWindow.satellites[0].origState, time)
    let satEcef = fk5ReductionTranspose(satState.slice(0, 3), jsTime)
    let longSat = math.atan2(satEcef[1], satEcef[0])
    longSat *= 180 / Math.PI
    let latSat = math.atan2(satEcef[2], math.norm(satEcef.slice(0, 2)))
    latSat *= 180 / Math.PI
    longSat += 180
    longSat = longSat > 360 ? longSat - 360 : longSat
    latSat = 90 - latSat
    ctx.fillStyle = '#e9e'
    ctx.strokeStyle = 'black'
    let satPoints = drawSatellite({ size: 40 })
    satPoints.forEach((p, ii) => {
        if (ii === 0) {
            ctx.beginPath()
            ctx.moveTo(p[0] + cnvs.width * longSat / 360, p[1] + cnvs.height * latSat / 180)
        }
        else ctx.lineTo(p[0] + cnvs.width * longSat / 360, p[1] + cnvs.height * latSat / 180)
    })
    ctx.fill()
    ctx.stroke()
    ctx.font = '15px sans-serif'
    ctx.fillStyle = '#eee'
    ctx.textAlign = 'center'
    ctx.fillText('Target', cnvs.width * longSat / 360, cnvs.height * latSat / 180 + 20)
    let obs = checkSensors(satState, time)
    ctx.fillStyle = 'red'
    mainWindow.sensors.filter(s => s.active && s.type === 'space').forEach(sens => {
        ctx.fillStyle = 'red'
        let state = propToTime(sens.state, (jsTime - sens.epoch) / 1000)
        let satEcef = fk5ReductionTranspose(state.slice(0, 3), jsTime)
        let longSat = math.atan2(satEcef[1], satEcef[0])
        longSat *= 180 / Math.PI
        let latSat = math.atan2(satEcef[2], math.norm(satEcef.slice(0, 2)))
        latSat *= 180 / Math.PI
        let locationSens = latLong2Pixels(latSat, longSat, cnvs)
        // ctx.beginPath();
        // ctx.arc(locationSens.x, locationSens.y, cnvs.width /200, 0, 2 * Math.PI);
        // ctx.fill();
        let satPoints = drawSatellite({ size: 35 })
        satPoints.forEach((p, ii) => {
            if (ii === 0) {
                ctx.beginPath()
                ctx.moveTo(p[0] + locationSens.x, p[1] + locationSens.y)
            }
            else ctx.lineTo(p[0] + locationSens.x, p[1] + locationSens.y)
        })
        ctx.fill()
        ctx.stroke()
        ctx.font = '15px sans-serif'
        ctx.fillStyle = '#eee'
        ctx.textAlign = 'center'
        ctx.fillText(sens.name, locationSens.x, locationSens.y + 20)
    })
    ctx.strokeStyle = 'white'
    ctx.lineWidth = 4
    obs.forEach(ob => {
        s = JSON.parse(JSON.stringify(mainWindow.sensors[ob.sensor]))
        if (s.type === 'space') {
            let state = propToTime(s.state, ((jsTime - new Date(s.epoch))) / 1000)
            let satEcef = fk5ReductionTranspose(state.slice(0, 3), jsTime)
            let longSens = math.atan2(satEcef[1], satEcef[0]) * 180 / Math.PI
            longSens += 180
            longSens = longSens > 360 ? longSens-360 : longSens
            let latSens = math.atan2(satEcef[2], math.norm(satEcef.slice(0, 2))) * 180 / Math.PI
            latSens = 90 - latSens
            ctx.beginPath()
            ctx.moveTo(cnvs.width * longSens / 360, cnvs.height * latSens / 180)
            ctx.lineTo(cnvs.width * longSat / 360, cnvs.height * latSat / 180)
            ctx.stroke()
        }
        s.long += 180
        s.long = s.long > 360 ? s.long - 360 : s.long
        s.lat = 90 - s.lat
        ctx.beginPath()
        ctx.moveTo(cnvs.width * s.long / 360, cnvs.height * s.lat / 180)
        ctx.lineTo(cnvs.width * longSat / 360, cnvs.height * latSat / 180)
        ctx.stroke()
    })
    ctx.strokeStyle = 'black'
    // Draw sun position at time
    let sunPos = math.squeeze(math.multiply(rotationMatrices(360 * time / 31556952, 3), math.transpose([mainWindow.initSun])))
    ctx.fillStyle = 'yellow'
    let sunEcef = fk5ReductionTranspose(sunPos, jsTime)
    let longSun = math.atan2(sunEcef[1], sunEcef[0])
    longSun *= 180 / Math.PI
    let latSun = math.atan2(sunEcef[2], math.norm(sunEcef.slice(0, 2)))
    latSun *= 180 / Math.PI
    longSun += 180
    longSun = longSun > 360 ? longSun - 360 : longSun
    latSun = 90 - latSun

    ctx.beginPath();
    ctx.arc(cnvs.width * longSun / 360, cnvs.height * latSun / 180, cnvs.height / 100, 0, 2 * Math.PI);
    ctx.fill()
    ctx.fillStyle = 'black'
    ctx.textAlign = 'center'
    ctx.font = `${window.innerHeight / 969 * 25}px serif`
    ctx.fillText(toStkFormat(jsTime.toString()), cnvs.width / 2, window.innerHeight / 969 * 25)
}

function toStkFormat(time) {
    time = time.split('GMT')[0].substring(4, time.split('GMT')[0].length - 1);
    time = time.split(' ');
    return time[1] + ' ' + time[0] + ' ' + time[2] + ' ' + time[3];
}

function showAvailability(sensor = 0) {
    console.log(sensor);
    let div = document.createElement('div')
    div.innerHTML = `
        <div style="font-size: 2em; margin-bottom: 20px">${mainWindow.sensors[sensor].name} Sensor Down Time(s)</div>
    `
    mainWindow.sensors[sensor].avail.forEach((a, ii) => {
        let start = a[0]
        let startArr = [start.getDate(), padNumber(start.getHours()) + ':' + padNumber(start.getMinutes())]

        let end = a[1]
        let endArr = [end.getDate(), padNumber(end.getHours()) + ':' + padNumber(end.getMinutes())]
        console.log(start, end);
        div.innerHTML += `
        <div class="down-time-div"> <span style="font-size: 1.5em">${ii + 1})</span>
            Start <input type="date" value="${`${start.getFullYear()}-${padNumber(start.getMonth() + 1)}-${padNumber(start.getDate())}`}"> <input type="time" value="${startArr[1]}">
            Start <input type="date" value="${`${end.getFullYear()}-${padNumber(end.getMonth() + 1)}-${padNumber(end.getDate())}`}"> <input type="time" value="${endArr[1]}"> 
            <span class="pointer" onclick="availHandlerFunction(this)" style="border: 1px solid black; padding: 2px; border-radius: 25%;" id="delete-avail">X</span>
        </div>
        `
    })
    div.innerHTML += `
        <div style="margin-top:30px"><button id="add-avail-button" onclick="availHandlerFunction(this)">Add Down Time</button></div>
        <div style="margin:30px"><button sensor="${sensor}" id="confirm-avail-button" onclick="availHandlerFunction(this)">Confirm</button><button id="cancel-avail-button" onclick="availHandlerFunction(this)">Cancel</button></div>
    `

    div.id = 'avail-div'
    div.style.position = 'fixed'
    div.style.width = '50%'
    div.style.top = '10%'
    div.style.left = '25%'
    div.style.zIndex = 20
    div.style.backgroundColor = 'white'
    div.style.textAlign = 'center'
    // div.style.border = '1px solid black'
    div.style.borderRadius = '20px'
    div.style.minHeight = '50%'
    div.classList.add('div-shadow')
    document.getElementsByTagName('body')[0].append(div)
}

function convertTimeToDateTimeInput(timeIn = mainWindow.startDate, seconds = true) {
    let padNumber = function (n) {
        return n < 10 ? '0' + n : n
    }
    timeIn = new Date(timeIn)
    if (timeIn == 'Invalid Date') return
    if (seconds) {
        return `${timeIn.getFullYear()}-${padNumber(timeIn.getMonth() + 1)}-${padNumber(timeIn.getDate())}T${padNumber(timeIn.getHours())}:${padNumber(timeIn.getMinutes())}:${padNumber(timeIn.getSeconds())}`
    }
    return `${timeIn.getFullYear()}-${padNumber(timeIn.getMonth() + 1)}-${padNumber(timeIn.getDate())}T${padNumber(timeIn.getHours())}:${padNumber(timeIn.getMinutes())}:${padNumber(timeIn.getSeconds())}`
}

function showStateUpdate(sensor = 0) {
    console.log(sensor);
    let div = document.createElement('div')
    let epoch = convertTimeToDateTimeInput(new Date(mainWindow.sensors[sensor].epoch))
    div.innerHTML = `
        <div style="display: flex; flex-direction: column;" id="sensor-state-update">
            <div style="font-size: 2em; margin-bottom: 20px">${mainWindow.sensors[sensor].name} J2000 State</div>
            <div><input type="datetime-local" value="${epoch}"/></div>
            <div>
                ${mainWindow.sensors[sensor].state.map(s => {
        return `<input type="number" style="width: 10ch; text-align: center" value="${s.toFixed(2)}"/>`
    }).join('')}
            </div>
            <div style="margin-top: 15px;"><input id="state-update-input" oninput="handleStateUpdate(this)" style="width: 70%; text-align: center;" placeholder="J2000 State from STK"/></div>
            <div style="margin-top: 15px;">
                <button id="state-update-confirm" sensor="${sensor}" onclick="handleStateUpdate(this)">Confirm</button>
                <button id="state-update-confirm" title="Set epoch time above to the .e time you want to pull" sensor="${sensor}" onclick="importEFile(this)">Import .e</button>
                <input type="file" style="display: none;" id="import-e-file" onchange="importEFile(this)"/>
                <button id="state-update-cancel" onclick="handleStateUpdate(this)">Cancel</button>
            <div>
        <div>
    `

    div.id = 'avail-div'
    div.style.position = 'fixed'
    div.style.width = '75%'
    div.style.top = '10%'
    div.style.left = '12.5%'
    div.style.zIndex = 20
    div.style.backgroundColor = 'white'
    div.style.textAlign = 'center'
    // div.style.border = '1px solid black'
    div.style.borderRadius = '20px'
    div.style.minHeight = '50%'
    div.classList.add('div-shadow')
    document.getElementsByTagName('body')[0].append(div)
}

function importEFile(el) {
     if (el.innerText === 'Import .e') {
        document.querySelector('#import-e-file').click()
        return
     }
     console.log(el);
     if (event.target.files[0] === undefined) return
     
    loadEFile(event.target.files[0])
}

function importTargetEFile(el) {
    if (el.innerText === 'Import .e') {
       document.querySelector('#import-target-e-file').click()
       return
    }
    console.log(el);
    if (event.target.files[0] === undefined) return
    
   loadTargetEFile(event.target.files[0])
   event.target.value = ''
}

function loadEFile(fileToLoad) {
    var fileReader = new FileReader();
    fileReader.onload = (fileLoadedEvent) => handleEphemFile(fileLoadedEvent.target.result)
    fileReader.readAsText(fileToLoad, "UTF-8");
}

function loadTargetEFile(fileToLoad) {
    var fileReader = new FileReader();
    fileReader.onload = (fileLoadedEvent) => handleTargetEphemFile(fileLoadedEvent.target.result)
    fileReader.readAsText(fileToLoad, "UTF-8");
}

function handleEphemFile(text) {
    text = text.split(/\n{1,}/)
    let baseDate = new Date(text.find(s => s.search('ScenarioEpoch') !== -1).split(/ {2,}/)[1])
    let ephemStart = text.findIndex(s => s.search('EphemerisTimePosVel') !== -1) + 1
    let ephemEnd = text.findIndex(s => s.search('END Ephemeris') !== -1)

    ephemEnd = ephemEnd === -1 ? text.length : ephemEnd
    let states = text.slice(ephemStart, ephemEnd).filter(s => s !== '\r').map(s => s.split(/ {2,}/).map(r => Number(r)))
    states = states.map(s => {
        let newDate = new Date(baseDate - (-1000*s[0]))
        return [newDate, ...s.slice(1)] 
    })
    // Find closest time
    minStateIndex = 0
    
    let inputs = document.querySelector('#sensor-state-update').querySelectorAll('input')
    let cmpDate = new Date(inputs[0].value)
    if (mainWindow.satellites.length > 0) {
        let timeArray = states.map(s => math.abs(s[0]-cmpDate))
        minStateIndex = timeArray.findIndex(s => s === math.min(timeArray))
        minStateIndex = minStateIndex === -1 ? 0 : minStateIndex
    }
    let chosenState = states[minStateIndex]
    console.log(chosenState);
    let epoch = convertTimeToDateTimeInput(new Date(chosenState.shift()))
    inputs[0].value = epoch
    chosenState.forEach((s, ii) => inputs[ii + 1].value = s.toFixed(5))

}

function handleTargetEphemFile(text) {
    text = text.split(/\n{1,}/)
    let baseDate = new Date(text.find(s => s.search('ScenarioEpoch') !== -1).split(/ {2,}/)[1])
    let ephemStart = text.findIndex(s => s.search('EphemerisTimePosVel') !== -1) + 1
    let ephemEnd = text.findIndex(s => s.search('END Ephemeris') !== -1)

    ephemEnd = ephemEnd === -1 ? text.length : ephemEnd
    let states = text.slice(ephemStart, ephemEnd).filter(s => s !== '\r').map(s => s.split(/ {2,}/).map(r => Number(r)))
    states = states.map(s => {
        let newDate = new Date(baseDate - (-1000*s[0]))
        return [newDate, ...s.slice(1)] 
    })
    // Find closest time
    minStateIndex = 0
    
    let cmpDate = mainWindow.startTime
    if (mainWindow.satellites.length > 0) {
        let timeArray = states.map(s => math.abs(s[0]-cmpDate))
        minStateIndex = timeArray.findIndex(s => s === math.min(timeArray))
        minStateIndex = minStateIndex === -1 ? 0 : minStateIndex
    }
    let chosenState = states[minStateIndex]
    console.log(chosenState);
    let epoch = new Date(chosenState.shift())
    mainWindow.startTime = epoch
    updateTime(epoch)
    console.log(epoch, chosenState);
    mainWindow.satellites[0].origState = chosenState
    updateCoeDisplay()
}

function handleStateUpdate(el) {
    if (el.id === 'state-update-cancel' || el.id === 'state-update-confirm') {
        el.parentElement.parentElement.parentElement.remove()
        if (el.id === 'state-update-cancel') return
        let inputs = [...el.parentElement.parentElement.parentElement.querySelectorAll('input')].slice(0,7)
        let sensor = el.getAttribute('sensor')
        let date = new Date(inputs.shift().value)
        inputs = inputs.map(s => Number(s.value))
        console.log(date, inputs);
        mainWindow.sensors[sensor].epoch = date
        mainWindow.sensors[sensor].state = inputs
        return
    }
    let inputs = [...el.parentElement.parentElement.parentElement.querySelectorAll('input')]
    let states = el.value.split(/ {2,}/)
    if (states.length < 2) {
        states = el.value.split('x')
    }
    console.log(states);
    el.value = ''
    if (states.length < 7) return alert('ivalid input: not enough data')
    let epoch = convertTimeToDateTimeInput(new Date(states.shift()))
    states = states.map(s => Number(s))
    console.log(epoch, states)
    if (epoch == 'Invalid Date' || states.filter(s => isNaN(s)).length > 0) return alert('ivalid input: data not in correct format')
    inputs[0].value = epoch
    states.forEach((s, ii) => inputs[ii + 1].value = s.toFixed(5))
}

function availHandlerFunction(el) {
    switch (el.id) {
        case 'add-avail-button':
            let numDivs = document.getElementsByClassName('down-time-div').length + 1
            let newDiv = `
                <div class="down-time-div"> <span style="font-size: 1.5em">${numDivs})</span>
                    Start <input type="date" value="${document.getElementById('date-input').value}"> <input type="time" value="00:00"> 
                    End <input type="date" value="${document.getElementById('date-input').value}"> <input type="time" value="00:00"> 
                    <span class="pointer" onclick="availHandlerFunction(this)" style="border: 1px solid black; padding: 2px; border-radius: 25%;" id="delete-avail">X</span>
                </div>
            `
            el.parentElement.insertAdjacentHTML('beforebegin', newDiv)
            break
        case 'cancel-avail-button':
            el.parentElement.parentElement.remove()
            break
        case 'confirm-avail-button':
            let availDivs = document.getElementsByClassName('down-time-div')
            let avails = []
            for (let index = 0; index < availDivs.length; index++) {
                let inputs = [...availDivs[index].getElementsByTagName('input')]
                let start = new Date(inputs[0].value + ' ' + inputs[1].value)
                let end = new Date(inputs[2].value + ' ' + inputs[3].value)
                if (end > start) avails.push([start, end])
            }
            mainWindow.sensors[el.getAttribute('sensor')].avail = avails
            el.parentElement.parentElement.remove()
            break
        case 'delete-avail':
            el.parentElement.remove()
            break
        default:
            break
    }
}





function drawSatellite(options = {}) {
    let { size = 60, ratio = 0.25, angle = -45, body = 0.33, gap = 1.3 } = options
    size /= 2
    points = [
        [0, -size * ratio],
        [-body * size, -size * ratio],
        [-body * size, -size * ratio / 3],
        [-body * gap * size, -size * ratio / 3],
        [-body * gap * size, -size * ratio / 2],
        [-size, -size * ratio / 2],
        [-size, size * ratio / 2],
        [-body * gap * size, size * ratio / 2],
        [-body * gap * size, size * ratio / 3],
        [-body * size, size * ratio / 3],
        [-body * size, size * ratio / 2],
        [-body * size, size * ratio],
        [body * size, size * ratio],
        [body * size, size * ratio / 3],
        [body * gap * size, size * ratio / 3],
        [body * gap * size, size * ratio / 2],
        [body * size, size * ratio / 2],
        [size, size * ratio / 2],
        [size, -size * ratio / 2],
        [body * gap * size, -size * ratio / 2],
        [body * gap * size, -size * ratio / 3],
        [body * size, -size * ratio / 3],
        [body * size, -size * ratio / 2],
        [body * size, -size * ratio],
        [0, -size * ratio]
    ]
    points = points.map(p => {
        return [
            p[0] * Math.cos(angle * Math.PI / 180) - p[1] * Math.sin(angle * Math.PI / 180),
            p[0] * Math.sin(angle * Math.PI / 180) + p[1] * Math.cos(angle * Math.PI / 180)
        ]
    })
    return points
}

function showLogo() {
    let cnvs = document.createElement('canvas')
    document.getElementsByTagName('body')[0].append(cnvs)
    cnvs.style.position = 'fixed'
    cnvs.style.zIndex = 20
    cnvs.style.top = 0
    cnvs.style.left = 0
    cnvs.style.width = '100vw'
    cnvs.style.height = '100vh'
    cnvs.style.transition = 'opacity 0.5s'
    cnvs.onclick = el => {
        el.target.style.opacity = 0
        setTimeout(() => el.target.remove(), 500)
    }
    let ctx = cnvs.getContext('2d')
    cnvs.width = window.innerWidth
    cnvs.height = window.innerHeight
    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, cnvs.width, cnvs.height)
    ctx.globalAlpha = 0.25
    ctx.strokeStyle = 'red'
    ctx.beginPath()
    ctx.ellipse(cnvs.width / 2 + 150, cnvs.height / 2 - 175, 100, 50, -20 * Math.PI / 180, 0, 2 * Math.PI)
    ctx.stroke()
    ctx.beginPath()
    ctx.ellipse(cnvs.width / 2 + 150, cnvs.height / 2 - 175, 100, 15, -20 * Math.PI / 180, 0, 2 * Math.PI)
    ctx.stroke()
    ctx.beginPath()
    ctx.ellipse(cnvs.width / 2 + 150, cnvs.height / 2 - 175, 50, 15, 70 * Math.PI / 180, 0, 2 * Math.PI)
    ctx.stroke()
    ctx.fillStyle = 'red'
    ctx.beginPath()
    ctx.arc(cnvs.width / 2 + 150, cnvs.height / 2 - 175, 7, 0, 2 * Math.PI)
    ctx.fill()
    ctx.globalAlpha = 1
    ctx.fillStyle = 'black'
    ctx.textBaseline = 'alphabetic'
    ctx.textAlign = 'center'
    ctx.font = '190px sans-serif'
    ctx.fillText(acronym, cnvs.width / 2, cnvs.height / 2)
    ctx.textBaseline = 'top'
    ctx.font = '24px Courier New'
    ctx.fillText(title, cnvs.width / 2, cnvs.height / 2 + 2)
    ctx.fillText('CAO ' + cao, cnvs.width / 2, cnvs.height / 2 + 26)
    ctx.textBaseline = 'alphabetic'
    ctx.fillText('Click anywhere to begin...', cnvs.width / 2, cnvs.height - 30)
}
showLogo()

function getAccessTimes(sensor = mainWindow.sensors[0], satellite = mainWindow.satellites[0], startEpoch = mainWindow.startTime, tf = 86400) {
    let propObject = new Propagator()
    let stateHistory = propObject.propToTime(satellite.origState, startEpoch, tf, 1e-5)
    stateHistory = stateHistory.map(s => {
        let azElResults = razel(s.state.slice(0, 3), s.date, sensor.lat, sensor.long, h = 0)
        return { ...azElResults, date: s.date }
    })
    return stateHistory
}

let mapWindow
function openMapWindow() {
    if (mapWindow === undefined) {
        mapWindow = window.open('', 'map', "width=600px,height=600px")
        setTimeout(() => {
            mapWindow.document.title = 'SDA Map'
            animateMap()
        }, 500)
    }
    
    mapWindow.document.body.innerHTML = `
        <div style="width: 100%; height: 100%;">
            <canvas style="width: 100%; height: 100%;"></canvas>
        </div>
    `
    mapWindow.document.body.style.margin = 0
    mapWindow.document.body.style.padding = 0
}

function animateMap() {
    if (mapWindow === undefined) return
    drawOnMapWindow()
    window.requestAnimationFrame(animateMap)
}

function drawOnMapWindow(time = 0) {
    let latLong2Pixel= function(coordinates ={lat: 0, long: 0}, cnvs) {
        let center = 0, zoom = 1, latCenter = 0
        let {lat, long} = coordinates
        while (center < -180) {
            center += 360
        }
        long = long - center
        lat -= latCenter
        if (long < -180) {
            long += 360
        }
        else if (long > 180) {
            long -= 360
        }
        let pixels = [
            (long+180)/360*cnvs.width,
            (90-lat)/180*cnvs.height
        ]
        pixels[0] = (pixels[0]-cnvs.width/2)*zoom+cnvs.width/2
        pixels[1] = (pixels[1]-cnvs.height/2)*zoom+cnvs.height/2
        return pixels

    }
    let foregroundColor = '#cccccc'
    let backgroundColor = '#111144'
    let cnvs = mapWindow.document.querySelector('canvas')
    cnvs.width = mapWindow.innerWidth
    cnvs.height = mapWindow.innerHeight
    let ctx = cnvs.getContext('2d')

    ctx.fillStyle = backgroundColor
    ctx.clearRect(0, 0, cnvs.width, cnvs.height)
    ctx.fillRect(0, 0, cnvs.width, cnvs.height)
    ctx.lineWidth = 1
    ctx.strokeStyle = foregroundColor
    coastlines.forEach(array => {
        let lastPoint = 0
        ctx.beginPath()
        array.forEach((point,ii) => {
            let pixelPoint = latLong2Pixel({
                long: point[0], lat: point[1]
            }, cnvs)
            if (ii === 0) ctx.moveTo(pixelPoint[0], pixelPoint[1])
            else if (math.abs(pixelPoint[0]-lastPoint) > cnvs.width/2) {
                ctx.moveTo(pixelPoint[0], pixelPoint[1])
            }
            else ctx.lineTo(pixelPoint[0], pixelPoint[1])
            lastPoint = pixelPoint[0]
            // ctx.fillRect(pixelPoint[0]-3, pixelPoint[1]-3, 6,6)
        })
        ctx.stroke()
    })
    let sensorColors = '#ff9999'
    ctx.fillStyle = sensorColors
    mainWindow.sensors.filter(s => s.active).forEach(sens => {
        let pixelPoint = latLong2Pixel({
            long: sens.long, lat: sens.lat
        }, cnvs)
        // console.log(pixelPoint);
        let sensWidth=  8
        ctx.fillRect(pixelPoint[0]-sensWidth/2, pixelPoint[1]-sensWidth/2, sensWidth, sensWidth)
    })
    let state = mainWindow.satellites[0].origState.slice()
    let coe = PosVel2CoeNew(state.slice(0,3), state.slice(3))
    let period = 2*Math.PI*(coe.a**3/398600.4418) ** 0.5
    let startDate = mainWindow.startTime
    let timeStep = -period/160
    let timeRange = math.range(0, -6*3600, timeStep,true)._data 
    for (let index = 0; index < timeRange.length; index++) {
        let propState = propToTime(state, timeRange[index])
        let propTime = new Date(startDate - (-1000*timeRange[index]))
        let coor = astro.eci2latlong(propState.slice(0,3), propTime)
        let pixelPoint = latLong2Pixel({
            lat: coor.lat*180/Math.PI,
            long: coor.long*180/Math.PI,
        }, cnvs)
        let sensWidth=  2
        ctx.fillRect(pixelPoint[0]-sensWidth/2, pixelPoint[1]-sensWidth/2, sensWidth, sensWidth)
    }
    
    ctx.fillStyle = '#e9e'
    ctx.strokeStyle = 'black'
    let curSatPoints = drawSatellite({ size: 40 })
    let curPropState = propToTime(mainWindow.satellites[0].origState.slice(), 0)
    let curCoor = astro.eci2latlong(curPropState.slice(0,3), mainWindow.startTime)
    // console.log(curCoor);
    curSatPoints.forEach((p, ii) => {
        if (ii === 0) {
            ctx.beginPath()
            ctx.moveTo(p[0] + cnvs.width * (curCoor.long*180/Math.PI+180) / 360, p[1] + cnvs.height * (-curCoor.lat*180/Math.PI+90) / 180)
        }
        else ctx.lineTo(p[0] + cnvs.width * (curCoor.long*180/Math.PI+180) / 360, p[1] + cnvs.height * (-curCoor.lat*180/Math.PI+90) / 180)
    })
    ctx.fill()
    ctx.stroke()
}

function propEciCovariance(state=[42164, 0, 0, 0, 3.071, 0], cov, tf=3600) {
    cov = cov === undefined ? math.diag([1,1,1,0.001,0.001,0.001].map(s => s ** 2)) : cov
    cov = astro.choleskyDecomposition(cov)
   
    let L = 6
    
    let sigmaPoints = [state], w = [0.2]
    let waj = (1-w[0])/2/L, c = (L/(1-w[0]))**0.5
    cov = math.transpose(cov)
    for (let index = 0; index < L; index++) {
       sigmaPoints.push(math.add(state, cov[index].map(s => s*c)))
       sigmaPoints.push(math.subtract(state, cov[index].map(s => s*c)))
       w.push(waj)
       w.push(waj)
    }
    console.log(sigmaPoints.map(s => s.slice()));
    sigmaPoints = sigmaPoints.map(s => propToTime(s, tf))
    console.log(sigmaPoints.map(s => s.slice()));
    let P = math.zeros([6,6])
    let pRange = 0
    let pVel = 0
    //let aveRange = 0
    for (let index = 0; index < 2*L; index++) {
       // console.log(math.transpose([math.subtract(sigmaPoints[index], sigmaPoints[0])]), [math.subtract(sigmaPoints[index], sigmaPoints[0])]);
       P = math.add(P, math.dotMultiply(w[index],math.multiply(math.transpose([math.subtract(sigmaPoints[index], sigmaPoints[0])]), [math.subtract(sigmaPoints[index], sigmaPoints[0])])))
       pRange += w[index]*(math.norm(math.subtract(sigmaPoints[index].slice(0,3), sigmaPoints[0].slice(0,3)))**2)
       pVel += w[index]*(math.norm(math.subtract(sigmaPoints[index].slice(3), sigmaPoints[0].slice(3)))**2)
    }
   //  console.log(astro.choleskyDecomposition(P));
    return {P, sigmaPoints, pRange, pVel}
}