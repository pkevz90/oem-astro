class filter {
    constructor(options = {}) {
        let {
            hFunction = this.measurementFunction,
            hGradFunction = this.measurementGradFunction,
            stateProp = this.propState,
            estState = [[0, 10, 4, 0.005, 0, 0]],
            R = [[(0.5 * Math.PI / 180)**2, 0], [0, (0.5 * Math.PI / 180)**2]],
            Q = math.diag([0.00001 ** 2, 0.00001 ** 2, 0.00001 ** 2, 0.0000001 ** 2, 0.0000001 ** 2, 0.0000001 ** 2]),
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
        this.P = this.propPMatrix(this.P, dt)
        let sq = math.squeeze
        let estObs = this.measurementFunction(this.estState)
        console.log(sq(obs), sq(estObs));
        let H = this.measurementGradFunction(this.estState)
        let K = this.calcKalmanGain(H, this.P, this.R)
        this.estState = this.updateState(this.estState, K, estObs, obs)
        this.P = this.updatePMatrix(this.P, H, K)
    }
}