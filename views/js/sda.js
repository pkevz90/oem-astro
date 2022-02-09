let cnvsInert = document.getElementById('inertial-canvas')
let ctxInert = cnvsInert.getContext('2d')
cnvsInert.width = cnvsInert.clientWidth
cnvsInert.height = cnvsInert.clientHeight

const earth = new Image()
earth.src = './Media/earth_north.jpg'
let latitude = 0
function changeLatitude(button) {
    latitude = button.value
    updateInertial()
}

let sensors = [
    {
        lat: 2.67,
        long: 156.25,
        r: 0.005 * Math.PI / 180,
        type: 'optical'
    }
]

let cnvsRic = document.getElementById('ric-canvas')
let ctxRic = cnvsRic.getContext('2d')
cnvsRic.width = cnvsRic.clientWidth
cnvsRic.height = cnvsRic.clientHeight

function updateInertial(sites = []) {
    ctxInert.clearRect(0,0,cnvsInert.width, cnvsInert.height)
    ctxInert.save()
    ctxInert.strokeStyle = 'gray'
    
    ctxInert.fillStyle = 'black'
    ctxInert.setLineDash([20, 10]);
    sensors.filter(s => s.lat < 0).forEach(s => {
        if (s.type === 'space') return
        let delX = 6371 * Math.sin(s.long * Math.PI / 180) * Math.cos(s.lat * Math.PI / 180)
        delX = 0.75 * cnvsInert.height * delX / 42164
        let delY = 6371 * Math.cos(s.long * Math.PI / 180) * Math.cos(s.lat * Math.PI / 180)
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
    ctxInert.setLineDash([20, 10]);
    sensors.filter(s => s.lat > 0).forEach(s => {
        if (s.type === 'space') return
        let realLong = s.long - latitude
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
    ctxInert.beginPath()
    ctxInert.arc(cnvsInert.width / 2,cnvsInert.height *0.25, 4,0,2 * Math.PI)
    ctxInert.fill()
}

function updateRic(values = [0, 1, 2], vectors=[[0,0,1], [0,1,0], [1,0,0]]) {
    
    ctxRic.clearRect(0,0,ctxRic.width, ctxRic.height)
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
}

function generateObs(sensors, tFinal, rate = 1/30, satState = [0,0,0,0,0,0], noise = false) {
    let obs = []
    let positions = []
    sensors.forEach(s => {
        if (s.type === 'space') return
        positions.push([
            -42164 + 6371 * Math.cos(s.long * Math.PI / 180) * Math.cos(s.lat * Math.PI / 180),
            6371 * Math.sin(s.long * Math.PI / 180) * Math.cos(s.lat * Math.PI / 180),
            6371 * Math.sin(s.lat * Math.PI / 180)
        ])
    })
    console.log(positions);
    let t = 0
    while (t < tFinal) {
        for (let ii = 0; ii < positions.length; ii++) {
            obs.push({
                az: calcAz(positions[ii], satState, noise ? sensors[ii].r : 0),
                el: calcEl(positions[ii], satState, noise ? sensors[ii].r : 0)
            })
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

function calcRange(stateOb, stateTar) {
    let x = stateTar[0] - stateOb[0]
    let y = stateTar[1] - stateOb[1]
    let z = stateTar[2] - stateOb[2]
    return (x ** 2 + y ** 2 + z ** 2) ** (1/2)
}

function calcRangeRate(stateOb, stateTar) {

}

function generateJacobian(estIn = [0,0,0,0,0,0], tIn=360, rateIn = 1/60) {
    let estObs = generateObs(sensors, tIn, rateIn, estIn)
    let estObsList = flattenObs(estObs)
    let J = []
    let delta = [0.1, 0.1, 0.1, 0.0001, 0.0001, 0.0001]

    for (let ii = 0; ii < estIn.length; ii++) {
        let delState = estIn.slice()
        delState[ii] += delta[ii]
        let delObs = generateObs(sensors, tIn, rateIn, delState)
        let delObsList = flattenObs(delObs)
        J.push(math.dotDivide(math.subtract(delObsList, estObsList), delta[ii]))
    }
    J = math.transpose(J)
    return {J, estObsList}
}

function flattenObs(obsObject) {
    let azList = obsObject.map(ob => ob.az)
    let elList = obsObject.map(ob => ob.el)
    return math.concat(azList, elList)
}

function stepDiffCorrect(eState, time, rate, rObs) {
    let {J, estObsList} = generateJacobian(eState, time, rate)
    let midCalc = math.multiply(math.inv(math.multiply(math.transpose(J), J)), math.transpose(J))
    let errCalc = math.subtract(rObs, estObsList)
    midCalc = math.multiply(midCalc, errCalc)
    eState[0] += midCalc[0]
    eState[1] += midCalc[1]
    eState[2] += midCalc[2]
    eState[3] += midCalc[3]
    eState[4] += midCalc[4]
    eState[5] += midCalc[5]
    return {eState, errCalc, midCalc, p: math.inv(math.multiply(math.transpose(J), J))}
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

function runAlgorith(finalT = 22264, rate = 1/120, realState = [0,0,0,0.002,-0.005,0]) {
    let realObs = generateObs(sensors, finalT, rate, realState, true)
    // console.log(realObs);
    realObs = flattenObs(realObs)
    estState = [0,0,0,0,0,0]
    let std
    let ii = 0
    while (ii < 10) {
        let {eState, errCalc, midCalc, p} = stepDiffCorrect(estState, finalT, rate, realObs)
        let rms = (errCalc.map(a => a ** 2).reduce((a,b) => a + b) / errCalc.length) ** 1
        console.log(rms);
        estState = eState
        std = math.dotMultiply(rms, p)
        ii++
    }
    let {values, vectors} = math.eigs(std);
    vectors = math.transpose(vectors)

    console.log(math.dotPow(values, 0.5).slice(3,6));
    console.log(math.squeeze(math.column(vectors, 5)));
    console.log(math.squeeze(math.column(vectors, 4)));
    console.log(math.squeeze(math.column(vectors, 3)));
    updateRic(math.dotPow(values, 0.5).slice(3,6), vectors.slice(3,6))
    console.log(estState);
}

function randn_bm() {
    var u = 0, v = 0;
    while(u === 0) u = Math.random(); //Converting [0,1) to (0,1)
    while(v === 0) v = Math.random();
    return Math.sqrt( -2.0 * Math.log( u ) ) * Math.cos( 2.0 * Math.PI * v );
}

earth.onload = () => updateInertial()
updateRic()