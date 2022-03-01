let cnvsInert = document.getElementById('inertial-canvas')
let ctxInert = cnvsInert.getContext('2d')
cnvsInert.width = cnvsInert.clientWidth
cnvsInert.height = cnvsInert.clientHeight

const earth = new Image()
earth.src = './Media/earth_north.jpg'
let latitude = 0
function changeLongitude(button) {
    latitude = button.target.value
    updateInertial()
}

let sensors = [
    {
        lat: 30,
        long: 10,
        r: 0.005 * Math.PI / 180,
        type: 'optical',
        name: 'Optical'
    },
    {
        lat: 10,
        long: -20,
        r: 0.005 * Math.PI / 180,
        type: 'optical',
        name: 'Optical'
    }
]
sensors = window.localStorage.sensors !== undefined ? JSON.parse(window.localStorage.sensors) : sensors
refreshSensorList(sensors)

let cnvsRic = document.getElementById('ric-canvas')
let ctxRic = cnvsRic.getContext('2d')
cnvsRic.width = cnvsRic.clientWidth
cnvsRic.height = cnvsRic.clientHeight

function updateInertial(sites = []) {
    ctxInert.clearRect(0,0,cnvsInert.width, cnvsInert.height)
    ctxInert.save()
    ctxInert.strokeStyle = 'gray'
    
    ctxInert.fillStyle = 'black'
    sensors.filter(s => s.lat < 0).forEach(s => {
        
        let realLong = s.long - latitude
        if (s.type === 'radar') {
            ctxInert.setLineDash([5, 5, 15, 5, 5, 30]);
        }
        else {
            ctxInert.setLineDash([15, 5, 15, 5, 15, 30]);
        }
        if (s.type === 'space') return
        let delX = 6371 * Math.sin(realLong * Math.PI / 180) * Math.cos(s.lat * Math.PI / 180)
        delX = 0.75 * cnvsInert.height * delX / 42164
        let delY = 6371 * Math.cos(realLong * Math.PI / 180) * Math.cos(s.lat * Math.PI / 180)
        delY = 0.75 * cnvsInert.height * delY / 42164
        ctxInert.beginPath()
        ctxInert.moveTo(cnvsInert.width / 2 - delX, cnvsInert.height - delY)
        ctxInert.lineTo(cnvsInert.width / 2, cnvsInert.height * 0.25)
        ctxInert.stroke()
        ctxInert.beginPath()
        ctxInert.arc(cnvsInert.width / 2 - delX, cnvsInert.height - delY, 3, 0, 2 * Math.PI)
        ctxInert.fill()
    })
    ctxInert.translate(cnvsInert.width / 2, cnvsInert.height)
    ctxInert.rotate(latitude*Math.PI/180);
    let radius = 0.75 * cnvsInert.height * 6371 / 42164
    ctxInert.drawImage(earth, -radius, -radius, radius*2, radius*2);

    ctxInert.restore()
    ctxInert.strokeStyle = 'gray'
    
    ctxInert.fillStyle = 'black'
    sensors.filter(s => s.lat >= 0).forEach(s => {
        let delX, delY
        let realLong = s.long - latitude
        if (s.type === 'radar') {
            ctxInert.setLineDash([5, 5, 15, 5, 5, 30]);
        }
        else {
            ctxInert.setLineDash([15, 5, 15, 5, 15, 30]);
        }
        if (s.type === 'space') {
            delX = 42164 * Math.sin(realLong * Math.PI / 180) * Math.cos(0 * Math.PI / 180)
            delX = 0.75 * cnvsInert.height * delX / 42164
            delY = 42164 * Math.cos(realLong * Math.PI / 180) * Math.cos(0 * Math.PI / 180)
            delY = 0.75 * cnvsInert.height * delY / 42164
        }
        else {
            delX = 6371 * Math.sin(realLong * Math.PI / 180) * Math.cos(s.lat * Math.PI / 180)
            delX = 0.75 * cnvsInert.height * delX / 42164
            delY = 6371 * Math.cos(realLong * Math.PI / 180) * Math.cos(s.lat * Math.PI / 180)
            delY = 0.75 * cnvsInert.height * delY / 42164
        }
        ctxInert.beginPath()
        ctxInert.moveTo(cnvsInert.width / 2 - delX, cnvsInert.height - delY)
        ctxInert.lineTo(cnvsInert.width / 2, cnvsInert.height * 0.25)
        ctxInert.stroke()
        ctxInert.beginPath()
        ctxInert.arc(cnvsInert.width / 2 - delX, cnvsInert.height - delY, 3, 0, 2 * Math.PI)
        ctxInert.fill()
    })
    ctxInert.beginPath()
    ctxInert.arc(cnvsInert.width / 2,cnvsInert.height *0.25, 4,0,2 * Math.PI)
    ctxInert.fill()
}

function updateRic(values = [0, 1, 2], vectors=[[0,0,1], [0,1,0], [1,0,0]], ricCov = {}) {
    
    ctxRic.clearRect(0,0,cnvsRic.width, cnvsRic.height)
    let angle = math.atan2(vectors[2][0], vectors[2][1])
    let x = 80
    let y = x * values[1] / values[2]
    ctxRic.fillStyle = 'rgba(100,100,100,0.5)'
    ctxRic.beginPath()
    ctxRic.ellipse(cnvsRic.width * 0.5, cnvsRic.height / 2, x,y, angle, 0, 2 * Math.PI)
    ctxRic.fill()
    ctxRic.strokeStyle = 'black'
    ctxRic.lineWidth = 2
    ctxRic.beginPath()
    ctxRic.moveTo(cnvsRic.width * 0.25, cnvsRic.height / 2)
    ctxRic.lineTo(cnvsRic.width * 0.5, cnvsRic.height / 2)
    ctxRic.lineTo(cnvsRic.width * 0.5, cnvsRic.height * 0.25)
    ctxRic.stroke()
    ctxRic.lineWidth = 1
    ctxRic.fillStyle = 'blue'
    ctxRic.beginPath()
    ctxRic.rect(cnvsRic.width * 0.45, cnvsRic.height * 0.49, cnvsRic.width * 0.1, cnvsRic.height * 0.02)
    ctxRic.fill()
    ctxRic.stroke()
    ctxRic.fillStyle = 'gray'
    ctxRic.beginPath()
    ctxRic.rect(cnvsRic.width * 0.485, cnvsRic.height * 0.48, cnvsRic.width * 0.03, cnvsRic.height * 0.04)
    ctxRic.fill()
    ctxRic.stroke()
    let top = 0
    ctxRic.font = "20px Georgia";
    for (coor in ricCov) {

        let unit = coor === 'r' || coor === 'i' || coor === 'c' ? 'm' : 'm/s'
        ctxRic.fillText(coor + ": +/-" + (ricCov[coor]* 1000).toFixed(3) + ' ' + unit, 5, top + 20);
        top += 25
    }
}

function generateObs(sensorsIn, tFinal, rate = 1/30, satState = [0,0,0,0,0,0], noise = false) {
    let obs = []
    let positions = []
    let checks = document.getElementsByClassName('sensor-checkbox')
    let sensors = sensorsIn.filter((s, ii) => checks[ii].checked)
    sensors.forEach(s => {
        let realLong = s.long - latitude
        if (s.type === 'space') {
            positions.push([
                -42164 + 42164 * Math.cos(realLong * Math.PI / 180) * Math.cos(s.lat * Math.PI / 180),
                42164 * Math.sin(realLong* Math.PI / 180) * Math.cos(s.lat * Math.PI / 180),
                6371 * Math.sin(s.lat * Math.PI / 180)
            ])
            return
        }
        positions.push([
            -42164 + 6371 * Math.cos(realLong * Math.PI / 180) * Math.cos(s.lat * Math.PI / 180),
            6371 * Math.sin(realLong * Math.PI / 180) * Math.cos(s.lat * Math.PI / 180),
            6371 * Math.sin(s.lat * Math.PI / 180)
        ])
    })
    let t = 0
    while (t <= tFinal) {
        for (let ii = 0; ii < positions.length; ii++) {
            let outObs = {
                az: calcAz(positions[ii], satState, noise ? sensors[ii].r : 0),
                azr: sensors[ii].r,
                el: calcEl(positions[ii], satState, noise ? sensors[ii].r : 0),
                elr: sensors[ii].r
            }
            if (sensors[ii].type === 'radar') {
                outObs.r = calcRange(positions[ii], satState, noise ? sensors[ii].rr : 0),
                outObs.rr =  sensors[ii].rr
            }

            obs.push(outObs)
            continue
        }
        satState = runge_kutta([satState], 1 / rate)
        t += 1/rate
    }
    return obs
}

function calcAz(stateOb, stateTar, noise = 0) {
    let x = stateTar[0] - stateOb[0]
    let y = stateTar[1] - stateOb[1]
    return Math.atan2(y, x) + randn_bm() * noise
}

function calcEl(stateOb, stateTar, noise = 0) {
    let x = stateTar[0] - stateOb[0]
    let y = stateTar[1] - stateOb[1]
    let z = stateTar[2] - stateOb[2]
    return Math.atan2(z, (x ** 2 + y ** 2) ** (1/2)) + randn_bm() * noise

}

function calcRange(stateOb, stateTar, noise = 0) {
    let x = stateTar[0] - stateOb[0]
    let y = stateTar[1] - stateOb[1]
    let z = stateTar[2] - stateOb[2]
    return (x ** 2 + y ** 2 + z ** 2) ** (1/2) + randn_bm() * noise
}

function calcRangeRate(stateOb, stateTar) {

}

function generateJacobian(estIn = [0,0,0,0,0,0], tIn=360, rateIn = 1/120) {
    let estObs = generateObs(sensors, tIn, rateIn, estIn)
    let estObsList = flattenObs(estObs).obs
    let J = []
    let delta = [0.01, 0.01, 0.01, 0.00001, 0.00001, 0.00001]
    for (let ii = 0; ii < estIn.length; ii++) {
        let delState = estIn.slice()
        // let delState2 = estIn.slice()
        delState[ii] += delta[ii]
        // delState2[ii] -= delta[ii]
        let delObs = generateObs(sensors, tIn, rateIn, delState)
        // let delObs2 = generateObs(sensors, tIn, rateIn, delState2)
        let delObsList = flattenObs(delObs).obs
        // let delObsList2 = flattenObs(delObs2).obs
        J.push(math.dotDivide(math.subtract(delObsList, estObsList), delta[ii]))
        // J.push(math.dotDivide(math.subtract(delObsList, delObsList2), 2 * delta[ii]))
    }
    J = math.transpose(J)
    return {J, estObsList}
}

function flattenObs(obsObject) {
    let azList = obsObject.map(ob => ob.az)
    let azRlist = obsObject.map(ob => ob.azr).map(ob => 1/ob ** 2)
    let elList = obsObject.map(ob => ob.el)
    let elRlist = obsObject.map(ob => ob.elr).map(ob => 1/ob ** 2)
    let rList = obsObject.map(ob => ob.r).filter(ob => ob !== undefined)
    let rRlist = obsObject.map(ob => ob.rr).filter(ob => ob !== undefined).map(ob => 1/ob ** 2)
    let w =  math.diag(math.concat(azRlist, elRlist, rRlist))
    w = math.dotDivide(w, math.max(math.max(w)))
    return {obs: math.concat(azList, elList, rList), w}
}

function stepDiffCorrect(eState, time, rate, rObs, w) {
    let {J, estObsList} = generateJacobian(eState, time, rate)
    let midCalc = math.multiply(math.inv(math.multiply(math.transpose(J), w, J)), math.transpose(J), w)
    let errCalc = math.subtract(rObs, estObsList)
    midCalc = math.multiply(midCalc, errCalc)
    eState[0] += midCalc[0] * 0.5
    eState[1] += midCalc[1] * 0.5
    eState[2] += midCalc[2] * 0.5
    eState[3] += midCalc[3] * 0.5
    eState[4] += midCalc[4] * 0.5
    eState[5] += midCalc[5] * 0.5
    return {eState, errCalc, midCalc, p: math.inv(math.multiply(math.transpose(J), w, J))}
}

function twoBodyRpo(state = [[-1.89733896, 399.98, 0, 0, 0, 0]], options = {}) {
    let {mu = 398600.4418, r0 = 42164, a = [0,0,0]} = options;
    let n = (mu / r0 ** 3) ** (1/2)
    let ndot = 0
    let x = state[0][0], y = state[0][1], z = state[0][2], dx = state[0][3], dy = state[0][4], dz = state[0][5];
    let rT = ((r0 + x) ** 2 + y ** 2 + z ** 2) ** (1.5);
    return [[
        dx,
        dy,
        dz,
        -mu * (r0 + x) / rT+ mu / r0 ** 2 + 2 * n * dy + n ** 2 * x + ndot * y +  a[0],
        -mu * y / rT - 2 * n * dx - ndot * x + n ** 2 * y + a[1],
        -mu * z / rT + a[2]
    ]];
}

function runge_kutta(state, dt, a = [0,0,0]) {
    eom = twoBodyRpo
    let k1 = eom(state, {a});
    let k2 = eom(math.add(state, math.dotMultiply(dt/2, k1)), {a});
    return math.squeeze(math.add(state, math.dotMultiply(dt, k2)));
}

function runAlgorith() {
    let realState = [0,0,0,0,0,0]
    let finalT = Number(document.getElementById('tt').value) * 3600
    let rate = 1/Number(document.getElementById('freq').value) / 60
    let realObs = generateObs(sensors, finalT, rate, realState, true)
    // console.log(realObs);
    realObs = flattenObs(realObs)
    let w = realObs.w
    realObs = realObs.obs
    estState = [0,0,0,0,0,0]
    let std
    let ii = 0
    while (ii < 10) {
        let {eState, errCalc, midCalc, p} = stepDiffCorrect(estState, finalT, rate, realObs, w)
        let rms = (math.multiply(w, errCalc).map(a => a ** 2).reduce((a,b) => a + b) / errCalc.length) ** 1
        console.log(rms);
        estState = eState
        std = math.dotMultiply(rms, p)
        ii++
    }

    let values, vectors
    try {
        let out = math.eigs(std);
        values = out.values
        vectors = out.vectors
        vectors = math.transpose(vectors)
        vectors = vectors.slice(3,6)
    }
    catch (err) {
        values = [0,0,0,std[2][2], std[1][1], std[0][0]]
        vectors = [
            [0,0,1,0,0,0],
            [0,1,0,0,0,0],
            math.squeeze(powerIteration(std))
        ]

    }
    cov = {
        r: std[0][0] ** 0.5,
        i: std[1][1] ** 0.5,
        c: std[2][2] ** 0.5,
        rd: std[3][3] ** 0.5,
        id: std[4][4] ** 0.5,
        cd: std[5][5] ** 0.5,
    }
    navigator.clipboard.writeText(JSON.stringify({std}))
    updateRic(math.dotPow(values, 0.5).slice(3,6), vectors, cov)
}

function randn_bm() {
    var u = 0, v = 0;
    while(u === 0) u = Math.random(); //Converting [0,1) to (0,1)
    while(v === 0) v = Math.random();
    return Math.sqrt( -2.0 * Math.log( u ) ) * Math.cos( 2.0 * Math.PI * v );
}

function powerIteration(A) {
    let guess = math.zeros([A.length, 1])
    guess[0][0] = 1
    let ii = 0
    while (ii < 15) {
        guess = math.multiply(A, guess)
        guess = math.dotDivide(guess, math.norm(math.squeeze(guess)))
        ii++
        // console.log(guess);
    }
    return guess
}

function updateSensors(event) {
    let inputs = event.target.parentElement.getElementsByTagName('input')
    let space = Number(inputs[2].value)
    let radar = Number(inputs[1].value)
    let ground = Number(inputs[0].value)
    let opticalSensors = sensors.filter(s => s.type === 'optical')
    let spaceSensors = sensors.filter(s => s.type === 'space')
    let radarSensors = sensors.filter(s => s.type === 'radar')
    opticalSensors = opticalSensors.slice(0, ground)
    spaceSensors = spaceSensors.slice(0, space)
    radarSensors = radarSensors.slice(0, radar)
    while (opticalSensors.length < ground) {
        opticalSensors.push({
            type: 'optical',
            lat: Math.round(-90 + 180 * Math.random()),
            long: Math.round(-90 + 180 * Math.random()),
            r: 0.005 * Math.PI / 180,
            name: 'Optical'
        })
    }
    while (radarSensors.length < radar) {
        radarSensors.push({
            type: 'radar',
            lat: Math.round(-90 + 180 * Math.random()),
            long: Math.round(-90 + 180 * Math.random()),
            rr: 2,
            r: 0.005 * Math.PI / 180,
            name: 'Radar'
        })
    }
    while (spaceSensors.length < space) {
        spaceSensors.push({
            type: 'space',
            lat: 0,
            long: Math.round(-90 + 180 * Math.random()),
            r: 0.005 * Math.PI / 180,
            name: 'Space'
        })
    }
    let sensOut = opticalSensors.concat(radarSensors).concat(spaceSensors)
    sensors = sensOut

    window.localStorage.setItem('sensors', JSON.stringify(sensors))
    refreshSensorList(sensOut)
    updateInertial(sensors)
}

function refreshSensorList(sensIn) {
    let inputs = document.getElementsByClassName('display-control')[0].getElementsByTagName('input')
    inputs[0].value = sensors.filter(s => s.type === 'optical').length
    inputs[1].value = sensors.filter(s => s.type === 'radar').length
    inputs[2].value = sensors.filter(s => s.type === 'space').length
    let disp = document.getElementById('sensor-display')
    disp.innerHTML = ''
    console.log(sensIn);
    sensIn.forEach((s, ii) => {
        let newDiv = document.createElement('div')
        console.log(s.type === 'radar');
        newDiv.innerHTML =  `
        <div index="${ii}"><span oninput="editSensor(event)" type="name" contentEditable="true">${s.name}</span> <input checked type="checkbox" class="sensor-checkbox">
            ${s.type !== 'space' ? `Lat:  <span class="value-span"><span contenteditable="true" oninput="editSensor(event)" type="lat">${s.lat}</span> deg </span>` : ''}
            Long: <span class="value-span"><span contenteditable="true" oninput="editSensor(event)" type="long">${s.long}</span> deg </span>
            StD A:  <span class="value-span"><span contenteditable="true" oninput="editSensor(event)" type="r">${s.r * 180 / Math.PI}</span> deg </span>
            ${s.type === 'radar' ? `StD R:  <span class="value-span"><span contenteditable="true" oninput="editSensor(event)" type="rr">${s.rr}</span> km </span>` : ''}
        </div>
        `
        
        disp.appendChild(newDiv)
    })
}

function editSensor(event) {
    let type = event.target.getAttribute('type')
    let index = type === 'name' ? event.target.parentElement.getAttribute('index') : event.target.parentElement.parentElement.getAttribute('index')
    if (type === 'name') {
        sensors[index][type] = event.target.innerText
        return window.localStorage.setItem('sensors', JSON.stringify(sensors))
    } 
    let value = Number(event.target.innerText)
    if (isNaN(value)) event.target.style.backgroundColor = '#FCB'
    else event.target.style.backgroundColor = 'white'
    sensors[index][type] = type === 'r' ? value * Math.PI / 180 : value
    window.localStorage.setItem('sensors', JSON.stringify(sensors))
    updateInertial(sensors)
}
earth.onload = () => updateInertial()
updateRic()