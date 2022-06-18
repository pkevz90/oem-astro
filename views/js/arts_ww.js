let mm = 2 * Math.PI / 86164

self.addEventListener('message', e => {
    let data = e.data
})

function sunOpimizaton(x, returnWaypoint = false) {
    let r = x[0]
    let cats = x[1]
    let angle = x[2]
    let tof = x[3]

    let circleR = r * Math.sin(cats);
    let reducedR = r * Math.cos(cats);
    let R = findRotationMatrix([1,0,0], mainWindow.getCurrentSun(mainWindow.scenarioTime + tof));
    let tempAngle = [reducedR, Math.cos(angle) * circleR, Math.sin(angle) * circleR]
    let waypoint = math.transpose(math.multiply(R, math.transpose(tempAngle)))
    let newTarget = {
        r: [Number(target.r) + waypoint[0]],
        i: [Number(target.i) + waypoint[1]],
        c: [Number(target.c) + waypoint[2]]
    }
    if (returnWaypoint) return newTarget
    let dV = findDvFiniteBurn(origin, newTarget, mainWindow.satellites[chaserSat].a, tof);
    return dV
}

function findRotationMatrix(v1 = [1, 0, 0], v2) {
    v1 = math.dotDivide(v1, math.norm(v1));
    v2 = math.dotDivide(v2, math.norm(v2));
    let eulerAxis = math.cross(v1, v2);
    eulerAxis = math.dotDivide(eulerAxis, math.norm(eulerAxis));
    let x = eulerAxis[0], y = eulerAxis[1], z = eulerAxis[2];
    let eulerAngle = math.acos(math.dot(v1,v2));
    if (eulerAngle < 1e-7) return false;
    let c = math.cos(eulerAngle), s = math.sin(eulerAngle);
    return [[c + x*x*(1-c), x*y*(1-c)-z*s, x*z*(1-c)+y*s],
             [y*x*(1-c)+z*s, c + y*y*(1-c), y*z*(1-c)-x*s],
             [x*z*(1-c)-y*s, z*y*(1-c)+x*s, c + z*z*(1-c)]]
}

function findDvFiniteBurn(r1, r2, a, tf) {
    let dir = hcwFiniteBurnOneBurn({x: r1.r[0], y: r1.i[0], z: r1.c[0], xd: r1.rd[0], yd: r1.id[0], zd: r1.cd[0]}, {x: r2.r[0], y: r2.i[0], z: r2.c[0], xd: 0, yd: 0, zd: 0}, tf, a);
    return dir ? dir.t[0]*tf*a : 10000;
}

function hcwFiniteBurnOneBurn(stateInit, stateFinal, tf, a0, time = 0, mm) {
    let state = math.transpose([Object.values(stateInit)]);
    stateFinal = math.transpose([Object.values(stateFinal)]);
    let v = proxOpsTargeter(state.slice(0, 3), stateFinal.slice(0, 3), tf);
    let v1 = v[0],
        yErr= [100], S, dX = 1,
        F;
    let dv1 = math.subtract(v1, state.slice(3, 6))
    let X = [
        [Math.atan2(dv1[1][0], dv1[0][0])],
        [Math.atan2(dv1[2][0], math.norm([dv1[0][0], dv1[1][0]]))],
        [math.norm(math.squeeze(dv1)) / a0 / tf]
    ];
    if (X[2] < 1e-11) {
        return {
            r: 0,
            i: 0,
            c: 0,
            t: [0],
            F: oneBurnFiniteHcw(stateInit, X[0][0], X[1][0], X[2][0], tf, time, a0)
        }
    }
    if (X[2] > 1) return false;
    let errCount = 0
    while (math.norm(math.squeeze(yErr)) > 1e-6) {
        F = oneBurnFiniteHcw(stateInit, X[0][0], X[1][0], X[2][0], tf, time, a0);
        yErr = [
            [stateFinal[0][0] - F.x],
            [stateFinal[1][0] - F.y],
            [stateFinal[2][0] - F.z]
        ];
        S = proxOpsJacobianOneBurn(stateInit, a0, X[0][0], X[1][0], X[2][0], tf, n);
        try {
            dX = math.multiply(math.inv(S), yErr);
        } catch (error) {
            dX = math.zeros([3,1])
        }
        X = math.add(X, dX)
        X[2][0] = X[2][0] < 0 ? 1e-9 : X[2][0]
        X[2][0] = X[2][0] > 1 ? 0.95 : X[2][0]
        if (errCount > 20) return false;
        errCount++;
    }
    if (X[2] > 1 || X[2] < 0) return false
    let cosEl = Math.cos(X[1][0])
    return {
        r: a0 * X[2] * tf * Math.cos(X[0][0]) * cosEl,
        i: a0 * X[2] * tf * Math.sin(X[0][0]) * cosEl,
        c: a0 * X[2] * tf * Math.sin(X[1][0]),
        t: X[2],
        F,
        X
    }
}

function proxOpsTargeter(r1, r2, t) {
    let phi = phiMatrix(t);
    v1 = math.multiply(math.inv(phi.rv), math.subtract(r2, math.multiply(phi.rr, r1)));
    v2 = math.add(math.multiply(phi.vr, r1), math.multiply(phi.vv, v1));
    return [v1, v2];
}

function phiMatrix(t = 0, n = mm) {
    let nt = n * t;
    let cnt = Math.cos(nt);
    let snt = Math.sin(nt);
    return {
        rr: [
            [4 - 3 * cnt, 0, 0],
            [6 * (snt - nt), 1, 0],
            [0, 0, cnt]
        ],
        rv: [
            [snt / n, 2 * (1 - cnt) / n, 0],
            [2 * (cnt - 1) / n, (4 * snt - 3 * nt) / n, 0],
            [0, 0, snt / n]
        ],
        vr: [
            [3 * n * snt, 0, 0],
            [6 * n * (cnt - 1), 0, 0],
            [0, 0, -n * snt]
        ],
        vv: [
            [cnt, 2 * snt, 0],
            [-2 * snt, 4 * cnt - 3, 0],
            [0, 0, cnt]
        ]
    };
}