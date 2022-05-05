let mainDiv = document.querySelector('#main')
let initTime = new Date()
let curTime = new Date()
let timeMultiplier = 1
let mm = 2 * Math.PI / 86164
let trueState = [-10, -50, 0, 0, 0.0010938185275485561, 0]
let r = math.diag([0.000003046174197867086, 0.000003046174197867086, 0.01])
let q = math.diag([1e-10, 1e-10, 1e-10, 1e-16, 1e-16, 1e-16])
let ricWidth = 100
let timeElapsed = 0
let initP = math.diag([100, 100, 100, 0.000001, 0.000001, 0.000001])

function popupTitleClick(title) {
    let parentDiv = title.parentElement
    parentDiv.style.top = parentDiv.style.top === '95vh' ? '50vh' : '95vh'
}

function changeFilterStatus(button) {
    button.innerText = button.innerText === 'Start Filter' ? 'Stop Filter' : 'Start Filter'
    document.querySelector('#filter-status-span').innerText = button.innerText === 'Start Filter' ? 'Off' : 'Active'
    button.style.backgroundColor = button.style.backgroundColor === 'rgb(70, 140, 70)' || button.style.backgroundColor === '' ? 'rgb(140,70,70)' : 'rgb(70,140,70)'
    document.querySelector('#filter-status-span').style.color = button.style.backgroundColor === 'rgb(70, 140, 70)'  ? 'rgb(140,70,70)' : 'rgb(70,140,70)'

}

class canvasObject {
    constructor(cnvs, height=window.innerHeight, width=window.innerWidth) {
        this.cnvs = cnvs
        console.log(height, width);
        this.cnvs.width = width
        this.cnvs.height = height
    }
    getContext() {
        return this.cnvs.getContext('2d')
    }
    drawLine(points) {

    }
    drawRectangle(options = {}) {
        let {height = 10, width = 10, center={x: this.cnvs.width/2, y: this.cnvs.height/2}, color='rgb(200,100,100)', angle=0} = options
        let ctx = this.getContext()
        ctx.fillStyle = color
        ctx.fillRect(center.x - width/2, center.y - height/2, width, height)
    } 
    drawChar(options = {}) {
        let {message = 'test', point, fontSize, left = true} = options
    }
    clearCnvs() {
        this.getContext().clearRect(0,0,this.cnvs.width, this.cnvs.height)
    }
}

class unscentedFilter {
    constructor(input = {}) {
        let {estState, p, q, r, range = false} = input
        this.estState = estState
        this.p = p
        this.q = q
        this.r = r
        this.sigma = null
        this.weight = null
        this.range = range
    }
    step(obs = [1.5, 0, 10], dt = 100, a = [0,0,0]) {
        this.genSigmaPoints()
        this.propStates(dt, a)
        let out = this.calcGain()
        this.p = math.multiply(math.subtract(math.ones([this.estState.length,this.estState.length]), math.multiply(out.k, math.reshape(out.cross_corr, [-1, this.p.length]))), this.p)
        
        let error = math.subtract(obs, out.z_hat)
        this.estState = math.add(math.reshape(this.estState, [-1, 1]), math.multiply(out.k, math.reshape(error, [-1,1])))
        this.estState = math.squeeze(this.estState)
 
    }
    genSigmaPoints() {
        let L = this.estState.length
        let w = [0.5]
        let A = choleskyDecomposition(this.p)
        let s = [this.estState.slice()]
        let c = (L / (1 - w[0])) ** 0.5
        for (let jj = 0; jj < L; jj++) {
            s.push(math.add(s[0], math.dotMultiply(c, math.squeeze(math.column(A, jj)))))     
            s.push(math.subtract(s[0], math.dotMultiply(c, math.squeeze(math.column(A, jj)))))    
        } 
        w.push((1 - w[0]) / 2 / L)
        this.sigma = s
        this.weight = w
    }
    propStates(dt, a=[0,0,0]) {
        this.sigma = this.sigma.map(sig => runge_kutta(twoBodyRpo, sig, dt, a))
        let estState = math.zeros(math.size(this.estState))
        let estP = math.zeros(math.size(this.p))
        this.sigma.forEach((sig, ii) => {
            let w = ii === 0 ? this.weight[0] : this.weight[1]
            estState = math.add(estState, math.dotMultiply(w, sig))
        })
        this.sigma.forEach((sig, ii) => {
            let w = ii === 0 ? this.weight[0] : this.weight[1]
            estP = math.add(estP, math.dotMultiply(w, math.multiply(math.reshape(math.subtract(sig, estState), [6,1]), math.reshape(math.subtract(sig, estState), [1,6]))))
        })
        this.estState = estState
        this.p = estP
    }
    measure(state, noise = false) {
        let x = state[0], y = state[1], z = state[2], n = noise ? 1 : 0
        if (this.range) {
            return [math.atan2(y, x), math.atan2(z, math.norm([x, y])), math.norm([x, y, z])]
        }
        return [math.atan2(y, x), math.atan2(z, math.norm([x, y]))]
    }
    calcGain() {
        let z_sigma = this.sigma.map(sig => this.measure(sig))
        let z_hat = math.zeros(math.size(z_sigma[0]))
        let s = math.zeros(math.size(this.r))
        console.log(z_sigma);
        z_sigma.forEach((sig, ii) => {
            let w = ii === 0 ? this.weight[0] : this.weight[1]
            z_hat = math.add(z_hat, math.dotMultiply(w, sig))
        })
        z_sigma.forEach((sig, ii) => {
            let w = ii === 0 ? this.weight[0] : this.weight[1]
            s = math.add(s, math.dotMultiply(w, math.multiply(math.reshape(math.subtract(sig, z_hat), [-1,1]), math.reshape(math.subtract(sig, z_hat), [1,-1]))))
        })
        s = math.add(s, this.r)

        let cross_corr = math.dotMultiply(this.weight[0], math.multiply(math.reshape(math.subtract(this.sigma[0], this.estState), [-1,1]), math.reshape(math.subtract(z_sigma[0], z_hat), [1,-1])))
        for(let ii = 1; ii < this.sigma.length; ii++) {
            cross_corr = math.add(cross_corr, math.dotMultiply(this.weight[1], math.multiply(math.reshape(math.subtract(this.sigma[ii], this.estState), [-1,1]), math.reshape(math.subtract(z_sigma[ii], z_hat), [1,-1]))))
        }

        let k = math.multiply(cross_corr, math.inv(s))
        return {k, z_hat, cross_corr, s}
    }

}

let mainCanvas = new canvasObject(document.querySelector('#main-canvas'))
// let mainFilter = new unscentedFilter({
//     estState: generateRandomPoint(trueState, initP),
//     p: initP,
//     q,
//     r
// })
let mainFilter = new unscentedFilter({
        estState: [0, 11, 0, 0, 0, 0],
        p: math.diag([1, 25, 1, 0.005 ** 2, 0.005 ** 2, 0.005 ** 2]),
        q: math.diag([0.0001 ** 2, 0.0001 ** 2, 0.0001 ** 2, 0.000001 ** 2, 0.000001 ** 2, 0.000001 ** 2]),
        r: r.slice(0,2).map(row => row.slice(0,2))
    })

function formatTime(time) {
    time = time.split('GMT')[0].substring(4, time.split('GMT')[0].length - 1);
    time = time.split(' ');
    return time[1] + ' ' + time[0] + ' ' + time[2].slice(2,4) + ' ' + time[3];
}

function advanceTime(dt = 1) {
    if (timeMultiplier === 0) return
    timeElapsed += timeMultiplier * dt
    curTime = new Date(initTime.getTime() + timeElapsed * 1000)
    document.querySelector('#time-display').innerText = formatTime(curTime.toString());
    for (let ii = 0; ii < timeMultiplier; ii++) {
        trueState = runge_kutta(twoBodyRpo, trueState, 0.1)
    }
    let obs = mainFilter.measure(trueState)
    // console.log(obs);
    // mainFilter.step(obs, timeMultiplier * dt)
    formatCanvas()
}
function formatCanvas() {
    mainCanvas.clearCnvs()
    mainCanvas.drawRectangle()
    mainCanvas.drawRectangle({
        color: 'rgb(100,100,200)',
        center: {x: 3*mainCanvas.cnvs.width/4 - timeElapsed, y: 3*mainCanvas.cnvs.height/4}
    })
}
function timeControls(button) {
    if (button.innerText === '<<') {
        timeMultiplier = timeMultiplier > 0 ? timeMultiplier - 1 : timeMultiplier
    }
    else if (button.innerText === '>>') {
        timeMultiplier = timeMultiplier < 100 ? timeMultiplier + 1 : timeMultiplier
    }
    else {
        timeMultiplier = 0
    }
    document.querySelector('#time-multiplier-span').innerText = timeMultiplier
}

function runge_kutta(eom, state, dt, a = [0,0,0]) {
    if (false) {
        let k1 = eom(state, a);
        let k2 = eom(math.add(state, math.dotMultiply(dt/2, k1)), a);
        let k3 = eom(math.add(state, math.dotMultiply(dt/2, k2)), a);
        let k4 = eom(math.add(state, math.dotMultiply(dt/1, k3)), a);
        return math.add(state, math.dotMultiply(dt / 6, (math.add(k1, math.dotMultiply(2, k2), math.dotMultiply(2, k3), k4))));
    }
    let k1 = eom(state, a);
    let k2 = eom(math.add(state, math.dotMultiply(dt/2, k1)), a);
    return math.add(state, math.dotMultiply(dt, k2));
}

function twoBodyRpo(state = [-1.89733896, 399.98, 0, 0, 0, 0], a = [0,0,0]) {
    let mu = 398600.4418
    let n = mm
    let ndot = 0
    let r0 = (398600.4418 / n **2) **(1/3)
    let x = state[0], y = state[1], z = state[2], dx = state[3], dy = state[4], dz = state[5];
    let rT = ((r0 + x) ** 2 + y ** 2 + z ** 2) ** (1.5);
    return [
        dx,
        dy,
        dz,
        -mu * (r0 + x) / rT+ mu / r0 ** 2 + 2 * n * dy + n ** 2 * x + ndot * y +  a[0],
        -mu * y / rT - 2 * n * dx - ndot * x + n ** 2 * y + a[1],
        -mu * z / rT + a[2]
    ];
}

function choleskyDecomposition(matrix) {
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

function generateRandomPoint(truth = [0,0,0,0,0,0], p = math.diag([100, 100, 100, 0.000001, 0.000001, 0.000001])) {
    let pCh = choleskyDecomposition(p)
    let estState = truth.slice()
    for (let index = 0; index < truth.length; index++) {
        estState = math.add(estState, math.dotMultiply(randn_gauss(), math.squeeze(math.column(pCh,index))))
    }
    return estState
}

function randn_gauss() {
    var u = 0, v = 0;
    while(u === 0) u = Math.random(); //Converting [0,1) to (0,1)
    while(v === 0) v = Math.random();
    return Math.sqrt( -2.0 * Math.log( u ) ) * Math.cos( 2.0 * Math.PI * v );
}

setInterval(advanceTime, 1000)