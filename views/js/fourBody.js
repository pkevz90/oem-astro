let cnvs = document.querySelector('canvas')
let ctx = cnvs.getContext('2d')
cnvs.width = window.innerWidth
cnvs.height = window.innerHeight
let w_h_ratio = cnvs.width / cnvs.height
let smallDim = 750000
let height = w_h_ratio > 1 ? smallDim : smallDim / w_h_ratio
let width = height * w_h_ratio

let orbit = [6900, 0, 0, 0, 10.675, 0]
let startDate = new Date('25 nov 2021 20:00:00')
let tf = 30*24 // hrs

let hpop = new Propagator(
    {
        thirdBody: true,
        order: 8
    }
)

let orbitHist = hpop.propToTimeHistory(orbit, startDate, tf*3600, 1e-6)
let view = 'xy'
function eciToPixel(eci, axis = view) {
    // if (axis === 'xz') {
    //     return [
    //         cnvs.width/2 + eci[0] / width * cnvs.width,
    //         cnvs.height/2 - eci[2] / width * cnvs.width
    //     ]
    // }
    // else if (axis === 'yz') {
    //     return [
    //         cnvs.width/2 + eci[1] / width * cnvs.width,
    //         cnvs.height/2 - eci[2] / width * cnvs.width
    //     ]
    // }
    return [
        cnvs.width/2 - eci[0] / width * cnvs.width,
        cnvs.height/2 - eci[1] / width * cnvs.width,
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
let azD = 180, elD = 270
function draw3dScene(satPoints, az = azD, el = elD) {
    console.log(azD, elD);
    el = 90 - el
    let points = []
    let r = math.multiply( rotationMatrices(el, 1), rotationMatrices(az, 3))
    satPoints.forEach((p,ii) => {
        let pos = math.multiply(r, p.state.slice(0,3))
        pos = eciToPixel(pos)
        points.push({
            color: 'blue',
            position: pos,
            size: 0.5
        })
        // Draw Moon
        let moonEci = astro.moonEciFromTime(p.date)
        // console.log(moonEci);
        moonEci = math.multiply(r, moonEci.slice(0,3))
        moonEci = eciToPixel(moonEci)
        if (ii > (satPoints.length-200))
        points.push({
            color: 'gray',
            position: moonEci,
            size: 4
        })
    })
    //Earth
    points.push({
        color: 'green',
        position: [cnvs.width / 2, cnvs.height / 2],
        size: 8
    })
    points = points.sort((a,b) => a.position[2] - b.position[2])
    ctx.textAlign = 'center'
    ctx.font = 'bold 15px serif'
    points.forEach(p => {
        // console.log(p.size);
        // return
        ctx.fillStyle = p.color
        ctx.fillRect(p.position[0] - p.size / 2, p.position[1] - p.size / 2,p.size,p.size)
        if (p.text !== undefined) {
            ctx.fillText(p.text, pos.x, pos.y - 5)
        }
        // if (p.shape !== undefined) {
        //     drawSatellite({
        //         pixelPosition: [p.x, p.y],
        //         shape: p.shape,
        //         cnvs: mainWindow.cnvs,
        //         ctx
        //     })
        // }
    })
}

function drawScene(points) {
    // Draw Earth at 0,0
    let rad = (6371 / 2) / height * cnvs.height
    ctx.strokeStyle = 'green'
    ctx.beginPath();
    ctx.arc(cnvs.width / 2, cnvs.height / 2, rad, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.strokeStyle = 'gray'
    // Draw Moon at each time step
    let moonRad = (3500 / 2) / height * cnvs.height
    points.map(p => p.date).forEach(date => {
        let moonEci = astro.moonEciFromTime(date)
        let moonPix = eciToPixel(moonEci)
        ctx.beginPath();
        ctx.arc(moonPix[0], moonPix[1], moonRad, 0, 2 * Math.PI);
        ctx.stroke();
    });
    ctx.strokeStyle = 'blue'
    // Draw Orbit
    points.map(s => s.state).forEach(state => {
        let statePix = eciToPixel(state)
        ctx.beginPath();
        ctx.arc(statePix[0], statePix[1], 0.1, 0, 2 * Math.PI);
        ctx.stroke();

    })
}
let animateSpeed = 86400*2, baseTime = 0
ctx.fillStyle = 'white'
function animate(time) {
    ctx.fillStyle = 'white'
    ctx.fillRect(0,0,cnvs.width, cnvs.height)
    let  dispOrbit = orbitHist.filter(s => ((s.date - startDate)) < ((time-baseTime)*animateSpeed))
    draw3dScene(dispOrbit)
    if (dispOrbit.length === orbitHist.length) {
        baseTime = time
    }
    window.requestAnimationFrame(animate)
}
window.requestAnimationFrame(animate)

let mouseLocation = undefined
document.querySelector('canvas').addEventListener('pointerdown', event => {
    event.preventDefault()
    mouseLocation = [event.clientX, event.clientY]
})

document.querySelector('canvas').addEventListener('pointerup', event => {
    mouseLocation = undefined
})

document.querySelector('canvas').addEventListener('pointerleave', () => mouseLocation = undefined)

document.querySelector('canvas').addEventListener('pointermove', event => {
    if (mouseLocation === undefined) return
    let newPosition = [event.clientX, event.clientY];
    let delX = newPosition[0] - mouseLocation[0]
    let delY = newPosition[1] - mouseLocation[1]
    elD = elD + delY * 0.4
    azD = azD + delX * 0.4
    mouseLocation = newPosition
})