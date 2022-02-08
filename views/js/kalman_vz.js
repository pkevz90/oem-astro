class filter {
    constructor(options = {}) {
        let {
            hFunction = this.measurementFunction,
            hGradFunction = this.measurementGradFunction,
            stateProp = this.propState,
            estState = [[0, 10, 4, 0.005, 0, 0]],
            R = [[(0.5 * Math.PI / 180)**2, 0], [0, (0.5 * Math.PI / 180)**2]],
            Q = math.diag([0.0005 ** 2, 0.0005 ** 2, 0.0005 ** 2, 0.000001 ** 2, 0.000001 ** 2, 0.000001 ** 2]),
            P = math.diag([1,1,1,0.01 ** 2,0.01 ** 2,0.01 ** 2]),
            fFunction = this.genFMatrix
        } = options
        this.estState = estState
        this.hFunction = hFunction
        this.hGradFunction = hGradFunction
        this.stateProp = stateProp
        this.fFunction = fFunction
        this.R = R
        this.Q = Q
        this.P = P
    }
    genFMatrix(dt = 1) {
        let n = 2 * Math.PI / 86164
        let nt = n * dt
        let ct = Math.cos(nt)
        let st = Math.sin(nt)
        return [[4 - 3 * ct, 0, 0, st / n, 2 * (1 - ct) / n, 0],
                [6 * (st - nt), 1, 0, 2 * (ct - 1) / n, (4 * st - 3 * nt) / n, 0],
                [0, 0, ct, 0, 0, st / n],
                [3 * n * st, 0, 0, ct, 2 * st, 0],
                [6 * n * (ct - 1), 0, 0, -2 * st, 4 * ct - 3, 0],
                [0, 0, -n * st, 0, 0, ct]]
    }
    measurementFunction(state) {
        let x = state[0][0], y = state[0][1], z = state[0][2]
        return [[Math.atan2(y, x)], [Math.atan2(z, (x ** 2 + y ** 2) ** (1/2))]]
    }
    measurementGradFunction(state) {
        let x = state[0][0], y = state[0][1], z = state[0][2]
        let d = (x ** 2 + y ** 2) ** (1/2)
        return [[-y / d, x / d, 0, 0, 0, 0],
                [-z * x / d / (x ** 2 + y ** 2 + z ** 2),  -z * y / d / (x ** 2 + y ** 2 + z ** 2), d / (x ** 2 + y ** 2 + z ** 2), 0, 0, 0]]
    }
    calcKalmanGain(H, P, R) {
        let S = math.add(math.multiply(H, P, math.transpose(H)), R)
        return math.multiply(P, math.transpose(H), math.inv(S))
    }
    propState(state, dt) {
        let phi = this.fFunction(dt)
        return math.transpose(math.multiply(phi, math.transpose(state)))
    }
    propPMatrix(P, dt) {
        let F = this.fFunction(dt)
        return math.add(math.multiply(F, P, math.transpose(F)), this.Q)
    }
    updateState(state, K, estObs, obs) {
        let y = math.subtract(obs, estObs)
        return math.transpose(math.add(math.transpose(state), math.multiply(K, y)))
    }
    updatePMatrix(P, H, K) {
        return math.multiply(math.subtract(math.identity(P.length)._data, math.multiply(K, H)), P)
    }

    step(inputs) {
        let {obs, dt, a} = inputs
        this.estState = this.propState(this.estState, dt, a)
        
        let q = math.diag(math.sqrt(this.Q))
        for (let ii = 0; ii < this.estState[0].length; ii++) {
            this.estState[0][ii] += q[ii] * this.randn_bm()
        }
        this.P = this.propPMatrix(this.P, dt)
        let sq = math.squeeze
        let estObs = this.measurementFunction(this.estState)
        console.log(sq(obs), sq(estObs));
        let H = this.measurementGradFunction(this.estState)
        let K = this.calcKalmanGain(H, this.P, this.R)
        this.estState = this.updateState(this.estState, K, estObs, obs)
        this.P = this.updatePMatrix(this.P, H, K)
    }
    
    randn_bm() {
        var u = 0, v = 0;
        while(u === 0) u = Math.random(); //Converting [0,1) to (0,1)
        while(v === 0) v = Math.random();
        return Math.sqrt( -2.0 * Math.log( u ) ) * Math.cos( 2.0 * Math.PI * v );
    }
}

class filter_unscented {
    constructor(options = {}) {
        let {
            hFunction = this.measurementFunction,
            stateProp = this.propState,
            estState = [[0, 10, 4, 0.005, 0, 0]],
            R = [[(0.05 * Math.PI / 180)**2, 0], [0, (0.05 * Math.PI / 180)**2]],
            Q = math.diag([0.0005 ** 2, 0.0005 ** 2, 0.0005 ** 2, 0.000001 ** 2, 0.000001 ** 2, 0.000001 ** 2]),
            P = math.diag([1,1,1,0.01 ** 2,0.01 ** 2,0.01 ** 2]),
        } = options
        this.estState = estState
        this.hFunction = hFunction
        this.stateProp = stateProp
        this.R = R
        this.Q = Q
        this.P = P
        this.sigma = undefined
        this.weights = undefined
    }
    generateSigmaPoints() {
        let L = this.estState[0].length
        let w = [0.5]
        let A = this.choleskyDecomposition(this.P)
        let s = [this.estState]
        for (let jj = 0; jj < L; jj++) {
            s.push(math.transpose(math.add(math.transpose(this.estState), math.dotMultiply((L / (1 - w[0])) ** (1/2), math.column(A, jj)))))
        }
        for (let jj = 0; jj < L; jj++) {
            s.push(math.transpose(math.subtract(math.transpose(this.estState), math.dotMultiply((L / (1 - w[0])) ** (1/2), math.column(A, jj)))))
        }
        for (let jj = 0; jj < 2 * L; jj++) {
            w.push((1 - w[0]) / 2 / L)    
        }
        this.sigma = s
        this.weights = w
    }

    measurementFunction(state) {
        let x = state[0][0], y = state[0][1], z = state[0][2]
        return [[Math.atan2(y, x)], [Math.atan2(z, (x ** 2 + y ** 2) ** (1/2))]]
    }
    calcKalmanGain(H, P, R) {
        let S = math.add(math.multiply(H, P, math.transpose(H)), R)
        return math.multiply(P, math.transpose(H), math.inv(S))
    }
    propState(dt) {
        let F = this.fFunction(dt)
        return math.add(math.multiply(F, P, math.transpose(F)), this.Q)
    }
    propState_Cov(dt, a) {
        this.sigma = this.sigma.map(point => {
            return this.propState(point, dt, a)
        })
        let estState = math.zeros([1,6])
        let estP = math.zeros([6,6])
        for (let ii = 0; ii < this.sigma.length; ii++) {
            estState = math.add(estState, math.dotMultiply(this.weights[ii], this.sigma[ii])) 
        }
        for (let ii = 0; ii < this.sigma.length; ii++) {
            estP = math.add(estP, math.dotMultiply(this.weights[ii], math.multiply(math.transpose(math.subtract(this.sigma[ii], estState)), math.subtract(this.sigma[ii], estState))))
        }
        this.estState = estState
        this.P = math.add(estP, this.Q)
    }
    calcGain() {
        let z_sigma = this.sigma.map(point => {
            return this.measurementFunction(point)
        })
        
        let z_hat = math.zeros(math.size(z_sigma[0]))
        let s = math.zeros(math.size(this.R))
        for (let ii = 0; ii < this.sigma.length; ii++) {
            z_hat = math.add(z_hat, math.dotMultiply(this.weights[ii], z_sigma[ii])) 
        }
        for (let ii = 0; ii < this.sigma.length; ii++) {
            s = math.add(s, math.dotMultiply(this.weights[ii], math.multiply(math.subtract(z_sigma[ii], z_hat), math.transpose(math.subtract(z_sigma[ii], z_hat)))))
        }
        s = math.add(s, this.R)
        // console.log(math.transpose(math.subtract(this.sigma[0], this.estState)), math.subtract(z_sigma[0], z_hat));
        let cross_corr = math.dotMultiply(this.weights[0], math.multiply(math.transpose(math.subtract(this.sigma[0], this.estState)), math.transpose(math.subtract(z_sigma[0], z_hat))))

        for (let ii = 1; ii < this.sigma.length; ii++) {
            cross_corr = math.add(cross_corr, math.dotMultiply(this.weights[ii], math.multiply(math.transpose(math.subtract(this.sigma[ii], this.estState)), math.transpose(math.subtract(z_sigma[ii], z_hat)))))
        }
        console.log(cross_corr);
        let k = math.multiply(cross_corr, math.inv(s))
        console.log(k);
        return {k, z_hat, cross_corr, s}

    }
    step(inputs) {
        let {obs, dt = 1, a = [0,0,0]} = inputs
        this.generateSigmaPoints()
        this.propState_Cov(dt, a)
        // console.log(this.estState, this.P);
        let out = this.calcGain()
        console.log(out.k);
        console.log(math.squeeze(obs), math.squeeze(out.z_hat))
        this.P = math.subtract(this.P, math.multiply(out.k, out.s, math.transpose(out.k)))
        this.estState = math.add(math.transpose(this.estState), math.multiply(out.k, math.subtract(obs, out.z_hat)))
        this.estState = math.transpose(this.estState)
    }
    
    randn_bm() {
        var u = 0, v = 0;
        while(u === 0) u = Math.random(); //Converting [0,1) to (0,1)
        while(v === 0) v = Math.random();
        return Math.sqrt( -2.0 * Math.log( u ) ) * Math.cos( 2.0 * Math.PI * v );
    }
    resetP() {
        this.P = math.diag([1,1,1,0.01 ** 2,0.01 ** 2,0.01 ** 2])
    }
    choleskyDecomposition(matrix = [[25, 15, -5],[15, 18,  0],[-5,  0, 11]]) {
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
} 

class filter_unscented_rae {
    
    constructor(options = {}) {
        let {
            estState = [[0, 10, 4, 0.005, 0, 0]],
            R = [[(0.05 * Math.PI / 180)**2, 0, 0], [0, (0.05 * Math.PI / 180)**2, 0], [0, 0, 0.5 ** 2]],
            Q = math.diag([0.0005 ** 2, 0.0005 ** 2, 0.0005 ** 2, 0.000001 ** 2, 0.000001 ** 2, 0.000001 ** 2]),
            P = math.diag([100,(10 * Math.PI / 180) ** 2,(10 * Math.PI / 180) ** 2,0.01 ** 2,(0.1 * Math.PI / 180) ** 2,(0.1 * Math.PI / 180) ** 2]),
        } = options
        this.estState = estState
        this.R = R
        this.Q = Q
        this.P = P
        this.sigma = undefined
        this.weights = undefined
    }
    generateSigmaPoints() {
        let L = this.estState[0].length
        let w = [0.5]
        let A = this.choleskyDecomposition(this.P)
        let s = [this.estState]
        for (let jj = 0; jj < L; jj++) {
            s.push(math.transpose(math.add(math.transpose(this.estState), math.dotMultiply((L / (1 - w[0])) ** (1/2), math.column(A, jj)))))
        }
        for (let jj = 0; jj < L; jj++) {
            s.push(math.transpose(math.subtract(math.transpose(this.estState), math.dotMultiply((L / (1 - w[0])) ** (1/2), math.column(A, jj)))))
        }
        for (let jj = 0; jj < 2 * L; jj++) {
            w.push((1 - w[0]) / 2 / L)    
        }
        this.sigma = s
        this.weights = w
    }

    measurementFunction(state) {
        // return [[state[0][1]], [state[0][2]]]
        return [[state[0][1]], [state[0][2]], [state[0][0]]]
    }
    propState_Cov(dt, a) {
        this.sigma = this.sigma.map(point => {
            return this.propState(point, dt, a)
        })
        let estState = math.zeros([1,6])
        let estP = math.zeros([6,6])
        for (let ii = 0; ii < this.sigma.length; ii++) {
            estState = math.add(estState, math.dotMultiply(this.weights[ii], this.sigma[ii])) 
        }
        for (let ii = 0; ii < this.sigma.length; ii++) {
            estP = math.add(estP, math.dotMultiply(this.weights[ii], math.multiply(math.transpose(math.subtract(this.sigma[ii], estState)), math.subtract(this.sigma[ii], estState))))
        }
        this.estState = estState
        this.P = math.add(estP, this.Q)
    }
    calcGain() {
        let z_sigma = this.sigma.map(point => {
            return this.measurementFunction(point)
        })
        
        let z_hat = math.zeros(math.size(z_sigma[0]))
        let s = math.zeros(math.size(this.R))
        for (let ii = 0; ii < this.sigma.length; ii++) {
            z_hat = math.add(z_hat, math.dotMultiply(this.weights[ii], z_sigma[ii])) 
        }
        for (let ii = 0; ii < this.sigma.length; ii++) {
            s = math.add(s, math.dotMultiply(this.weights[ii], math.multiply(math.subtract(z_sigma[ii], z_hat), math.transpose(math.subtract(z_sigma[ii], z_hat)))))
        }
        s = math.add(s, this.R)
        let cross_corr = math.dotMultiply(this.weights[0], math.multiply(math.transpose(math.subtract(this.sigma[0], this.estState)), math.transpose(math.subtract(z_sigma[0], z_hat))))

        for (let ii = 1; ii < this.sigma.length; ii++) {
            cross_corr = math.add(cross_corr, math.dotMultiply(this.weights[ii], math.multiply(math.transpose(math.subtract(this.sigma[ii], this.estState)), math.transpose(math.subtract(z_sigma[ii], z_hat)))))
        }
        let k = math.multiply(cross_corr, math.inv(s))

        return {k, z_hat, cross_corr, s}

    }
    step(inputs) {
        let {obs, dt = 1, a = [0,0,0]} = inputs
        this.generateSigmaPoints()
        this.propState_Cov(dt, a)
        let out = this.calcGain()
        this.P = math.subtract(this.P, math.multiply(out.k, out.s, math.transpose(out.k)))
        this.estState = math.add(math.transpose(this.estState), math.multiply(out.k, math.subtract(obs, out.z_hat)))
        this.estState = math.transpose(this.estState)
    }
    
    randn_bm() {
        var u = 0, v = 0;
        while(u === 0) u = Math.random(); //Converting [0,1) to (0,1)
        while(v === 0) v = Math.random();
        return Math.sqrt( -2.0 * Math.log( u ) ) * Math.cos( 2.0 * Math.PI * v );
    }
    resetP() {
        this.P = math.diag([1,1,1,0.01 ** 2,0.01 ** 2,0.01 ** 2])
    }
    choleskyDecomposition(matrix = [[25, 15, -5],[15, 18,  0],[-5,  0, 11]]) {
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
}  


function propRAE(rae, dt, a = [0,0,0]) {
    let state = convertRAEtoCartesian(rae)
    state = runge_kutta(state, dt, a)
    return convertCartesiantoRAE(state)
}

function convertRAEtoCartesian(rae = [[10, 0, 0, 0, 0, 0.004]]) {
    let r = rae[0][0],
        az = rae[0][1],
        el = rae[0][2],
        rd = rae[0][3],
        azd = rae[0][4],
        eld = rae[0][5]
    position = [[r * Math.cos(az) * Math.cos(el), r * Math.sin(az) * Math.cos(el), r * Math.sin(el)]]
    velocity = [[rd * Math.cos(az) * Math.cos(el) - r * Math.sin(az) * Math.cos(el) * azd - r * Math.cos(az) * Math.sin(el) * eld,
                 rd * Math.sin(az) * Math.cos(el) + r * Math.cos(az) * Math.cos(el) * azd - r * Math.sin(az) * Math.sin(el) * eld,
                 rd * Math.sin(el) + r * Math.cos(el) * eld]]
    return math.concat(position, velocity, 1);
}

function convertCartesiantoRAE(cart = [[10, 0, 0, 0, 0, 0.04]]) {
    let r = cart[0][0],
        i = cart[0][1],
        c = cart[0][2],
        rd = cart[0][3],
        id = cart[0][4],
        cd = cart[0][5]
    let x1 = math.dotDivide([r, i, c], math.norm([r, i, c]))
    let x2 = math.cross([0,0,1], [r, i, 0])
    x2 = math.dotDivide(x2, math.norm(x2))
    let x3 = math.cross(x1, x2)

    let range = math.norm([r, i, c])
    let vel = [rd, id, cd]
    let rangeRate = math.dot(vel, x1)
    let azRate = math.dot(vel, x2) / range
    let elRate = math.dot(vel, x3) / range
    // console.log(rangeRate, azRate, elRate);
    return [[
        range,
        math.atan2(i, r),
        math.atan2(c, math.norm([r, i])),
        rangeRate,
        azRate,
        elRate
    ]]
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
    return math.add(state, math.dotMultiply(dt, k2));
}
