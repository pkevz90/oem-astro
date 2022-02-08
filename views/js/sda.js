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
        lat: 45,
        long: 0,
        type: 'optical'
    },
    {
        lat: 30,
        long: -25,
        type: 'optical'
    },
    {
        lat: 30,
        long: -70,
        type: 'optical'
    },
    {
        type: 'space',
        position: [0, -10000, 0],
        velocity: [0,0,0]
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

function updateRic(covariance = [80, 60, 0]) {
    ctxRic.fillStyle = 'rgba(100,100,100,0.5)'
    ctxRic.beginPath()
    ctxRic.ellipse(cnvsRic.width * 0.5, cnvsRic.height / 2, 80,60, 0, 0, 2 * Math.PI)
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

function generateObs(sensors, tFinal, rate = 1/30, satState = [0,0,0,0,0,0], type = 'optical', noise = false) {
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
    let t = 0
    while (t < tFinal) {
        for (let ii = 0; ii < positions.length; ii++) {
            obs.push({
                az: calcAz(positions[ii], satState),
                el: calcEl(positions[ii], satState)
            })
            continue
        }
        satState = propState(satState, 1 / rate)
        t += 1/rate
    }
    return obs
}

function propState(state, dt) {
    return state
}

function calcAz(stateOb, stateTar) {
    let x = stateTar[0] - stateOb[0]
    let y = stateTar[1] - stateOb[1]
    return Math.atan2(y, x)
}

function calcEl(stateOb, stateTar) {
    let x = stateTar[0] - stateOb[0]
    let y = stateTar[1] - stateOb[1]
    let z = stateTar[2] - stateOb[2]
    return Math.atan2(z, (x ** 2 + y ** 2) ** (1/2))

}

function calcRange(stateOb, stateTar) {
    let x = stateTar[0] - stateOb[0]
    let y = stateTar[1] - stateOb[1]
    let z = stateTar[2] - stateOb[2]
    return (x ** 2 + y ** 2 + z ** 2) ** (1/2)
}

function calcRangeRate(stateOb, stateTar) {

}

function generateJacobian(estIn, tIn, rateIn) {
    let estObs = generateObs(sensors, tIn, rateIn, esetIn)
    let azList = estObs.map(ob => ob.az)
    let elList = estObs.map(ob => ob.el)
    let estObsList = math.concat(azList, elList)
    let J = []
    let delta = [0.1, 0.1, 0.1, 0.0001, 0.0001, 0.0001]

    for (let ii = 0; ii < estIn.length; ii++) {
        let delState = estIn.slice()
        delState[ii] += delta[ii]
        let delObs = generateObs(sensors, tIn, rateIn, delState)
        let azList = delObs.map(ob => ob.az)
        let elList = delObs.map(ob => ob.el)
        let delObsList = math.concat(azList, elList)
        J.push(math.dotDivide(math.subtract(delObsList, estObsList), delta[ii]))
    }
    return {J, estObsList}
}

function stepDiffCorrect(eState, time, rate, rObs) {
    let {J, estObsList} = generateJacobian(eState, time, rate)
    let midCalc = math.multiply(math.inv(math.multiply(math.transpose(J), J)), math.transpose(J))
    let errCalc = math.subtract(rObs, estObsList)
    midCalc = math.multiply(midCalc, errCalc)
    eState[0] += midCalc[0][0]
    eState[1] += midCalc[0][1]
    eState[2] += midCalc[0][2]
    eState[3] += midCalc[0][3]
    eState[4] += midCalc[0][4]
    eState[5] += midCalc[0][5]
}

earth.onload = () => updateInertial()
updateRic()