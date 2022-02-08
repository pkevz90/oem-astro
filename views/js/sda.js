let cnvsInert = document.getElementById('inertial-canvas')
let ctxInert = cnvsInert.getContext('2d')
cnvsInert.width = cnvsInert.clientWidth
cnvsInert.height = cnvsInert.clientHeight

let sensors = [
    {
        lat: 0,
        long: 45,
        type: 'optical'
    },
    {
        lat: 20,
        long: -25,
        type: 'optical'
    },
    {
        lat: 70,
        long: -25,
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
    let radius = 0.75 * cnvsInert.height * 6371 / 42164
    ctxInert.fillStyle = 'green'
    ctxInert.beginPath()
    ctxInert.arc(cnvsInert.width / 2,cnvsInert.height,radius,0,2 * Math.PI)
    ctxInert.fill()
    ctxInert.strokeStyle = 'gray'
    
    ctxInert.fillStyle = 'black'
    ctxInert.setLineDash([20, 10]);
    sensors.forEach(s => {
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
    ctxInert.beginPath()
    ctxInert.arc(cnvsInert.width / 2,cnvsInert.height *0.25, 4,0,2 * Math.PI)
    ctxInert.fill()
}

function updateRic(covariance) {
    ctxRic.fillStyle = 'rgba(100,100,100,0.5)'
    ctxRic.beginPath()
    ctxRic.ellipse(cnvsRic.width * 0.5, cnvsRic.height / 2, 40,20, 0, 0, 2 * Math.PI)
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

function generateObs(sensors, tFinal, rate = 1/30, position = [0,0,0,0,0,0], noise = false) {
    let obs = []
    let positions = []
    sensors.forEach(s => {
        positions.push({
            r: -42164 + 6371 * Math.cos(s.long * Math.PI / 180) * Math.cos(s.lat * Math.PI / 180),
            i: 6371 * Math.sin(s.long * Math.PI / 180) * Math.cos(s.lat * Math.PI / 180),
            c: 6371 * Math.sin(s.lat * Math.PI / 180)
        })
    })
    let t = 0
    while (t < tFinal) {
        for (let ii = 0; ii < positions.length; ii++) {
            obs.push({
                az: 0,
                el: 0
            })
            continue
        }
        t += 1/rate
    }
}

function calcAz(stateOb, stateTar) {

}

function calcEl(stateOb, stateTar) {

}

function calcRange(stateOb, stateTar) {

}

function calcRangeRate(stateOb, stateTar) {
    
}

function generateJacobian(obs) {

}

function stepDiffCorrect() {

}

updateInertial()
updateRic()