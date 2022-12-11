let state1 = '2000-01-01T11:59:28.000   6.899999999999998e+03   0.000000000000000e+00   0.000000000000000e+00   0.000000000000000e+00  -1.057790461084520e+00   7.526570219427628e+00'.split(/ +/)
let state1Epoch = new Date(state1.shift())
state1 = state1.map(s => Number(s))

let state2 = '2000-01-01T15:57:35.427  -6.887697422082107e+03   1.893504337639188e+01  -2.837309607148014e+02   3.130172226858626e-01   1.059259368246158e+00  -7.527086168008529e+00'.split(/ +/)
let state2Epoch = new Date(state2.shift())
state2 = state2.map(s => Number(s))
let state12 = '2000-01-01T11:59:28.000   4.215757821857408e+04   7.357511894821255e+02   1.284258478342382e+01  -5.366032562941529e-02   3.073729781158194e+00   5.365215290191231e-02'.split(/ +/)
let state12Epoch = new Date(state12.shift())
state1 = state1.map(s => Number(s))

let state22 = '2000-01-02T00:02:02.581  -4.213310779477455e+04  -1.576648710505523e+03  -2.675392085400830e+01   1.151366324507145e-01  -3.072136676092156e+00  -5.364103705281234e-02'.split(/ +/)
let state22Epoch = new Date(state22.shift())
state2 = state2.map(s => Number(s))



let timeDelta = (state2Epoch - state1Epoch) / 1000
console.log('Time: ' + (timeDelta / 3600).toFixed(2) + ' hrs');
console.log('Two Body');
let tbstate1 = propToTimeJ2(state1, timeDelta, false)
// let tbstate12 = propToTimeJ2(state12, timeDelta, false)
console.log(math.norm(math.subtract(state2, propToTimeJ2(state1, timeDelta, false))));
console.log('J2 Analytic');
console.log(math.norm(math.subtract(state2, propToTimeJ2(state1, timeDelta))));
console.log('J2 Numeric');
console.log(math.norm(math.subtract(state2, propToTimeJ2Numeric(state1, timeDelta))));
console.log('HP Numeric');
let j4state1 = propToTimeHPNumeric(state1, timeDelta, state1Epoch)
console.log(math.norm(math.subtract(state2, j4state1)));
// console.log('Actual relative position');
// let actRpo = math.subtract(state2, state22)
// console.log(actRpo);
// console.log('Calculated relative position');
// let j4Rpo = math.subtract(j4state1, j4state12)
// console.log(j4Rpo, math.norm(math.subtract(j4Rpo, actRpo)));
// let tbRpo = math.subtract(tbstate1, tbstate12)
// console.log('Calculated relative position TB');
// console.log(tbRpo, math.norm(math.subtract(tbRpo, actRpo)));


function propToTimeJ2(state = [42164.14, 0, 0, 0, 3.0746611796284924, 0], dt = 86164, j2 = true) {
    state = PosVel2CoeNew(state.slice(0,3), state.slice(3,6))
    if (j2) {
        state.tA = propTrueAnomalyj2(state.tA, state.a, state.e, state.i, dt)
        let j2 = 1.082626668e-3
        let n = (398600.4418 / state.a / state.a / state.a) ** 0.5
        let rEarth = 6378.1363
        let p = state.a * (1 - state.e ** 2)
        let raanJ2Rate = -3*n*rEarth*rEarth*j2*Math.cos(state.i) / 2 / p / p
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
function propToTimeJ2Numeric(state = [42164.14, 0, 0, 0, 3.0746611796284924, 0], dt = 86164, startEpoch = new Date()) {
    let t = 0, step = 10

    while (t < (dt-step)) {
        state = runge_kuttaj2(state, step, new Date(startEpoch - (-t * 1000)))
        t += step
    }
    state = runge_kuttaj2(state, dt - t)
    return state
}
function propToTimeHPNumeric(state = [42164.14, 0, 0, 0, 3.0746611796284924, 0], dt = 86164, startEpoch) {
    let t = 0, step = 20

    while (t < (dt-step)) {
        state = runge_kuttaHP(state, step, new Date(startEpoch - (-t * 1000)))
        t += step
    }
    state = runge_kuttaHP(state, dt - t, new Date(startEpoch - (-t * 1000)))
    return state
}
function propTrueAnomalyj2(tA = 0, a = 10000, e = 0.1, i, time = 3600) {
    function True2Eccentric(e, ta) {
        return Math.atan(Math.sqrt((1 - e) / (1 + e)) * Math.tan(ta / 2)) * 2;
    }
    function Eccentric2True(e,E) {
        return Math.atan(Math.sqrt((1+e)/(1-e))*Math.tan(E/2))*2;
    }
    
    let j2 = 1.082626668e-3
    let n = (398600.4418 / a / a / a) ** 0.5
    let rEarth = 6378.1363
    let p = a * (1 - e ** 2)
    let mAj2rate = -3 * n * rEarth * rEarth * j2 * (1 - e * e) * (3 * Math.sin(i) ** 2 - 2) / 4 / p / p
    function solveKeplersEquation(M,e) {
        let E = M;
        let del = 1;
        while (Math.abs(del) > 1e-6) {
            del = (E-e*Math.sin(E)-M)/(1-e*Math.cos(E));
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
function propToTime(state, dt) {
    state = PosVel2CoeNew(state.slice(0,3), state.slice(3,6))
    state.tA = propTrueAnomaly(state.tA, state.a, state.e, dt)
    state = Object.values(Coe2PosVelObject(state))
    return state
}
function PosVel2CoeNew(r = [42164.14, 0, 0], v = [0, 3.0746611796284924, 0]) {
    let mu = 398600.4418
    let rn = math.norm(r)
    let vn = math.norm(v)
    let h = math.cross(r,v)
    let hn = math.norm(h)
    let n = math.cross([0,0,1], h)
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
function propTrueAnomaly(tA = 0, a = 10000, e = 0.1, time = 3600) {
    function True2Eccentric(e, ta) {
        return Math.atan(Math.sqrt((1 - e) / (1 + e)) * Math.tan(ta / 2)) * 2;
    }
    function Eccentric2True(e,E) {
        return Math.atan(Math.sqrt((1+e)/(1-e))*Math.tan(E/2))*2;
    }
    
    function solveKeplersEquation(M,e) {
        let E = M;
        let del = 1;
        while (Math.abs(del) > 1e-6) {
            del = (E-e*Math.sin(E)-M)/(1-e*Math.cos(E));
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
function Coe2PosVelObject(coe = {a: 42164.1401, e: 0, i: 0, raan: 0, arg: 0, tA: 0}, peri = false) {
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

function twoBodyJ2(position = [42164, 0, 0, 0, 3.074, 0]) {
    let mu = 398600.44189, j2 = 0.00108262668, re = 6378, x = position[0], y = position[1], z = position[2]
    let r = math.norm(position.slice(0,3))
    return [
        position[3], position[4], position[5],
        -mu * x / r ** 3 * (1 - 1.5 * j2 * re ** 2 / r ** 2 * (5 * z ** 2 / r ** 2 - 1)),
        -mu * y / r ** 3 * (1 - 1.5 * j2 * re ** 2 / r ** 2 * (5 * z ** 2 / r ** 2 - 1)),
        -mu * z / r ** 3 * (1 - 1.5 * j2 * re ** 2 / r ** 2 * (5 * z ** 2 / r ** 2 - 3))
    ]
}
function runge_kuttaj2(state = [42164, 0, 0, 0, -3.070, 0],dt) {
    eom = twoBodyJ2
    let k1 = eom(state);
    let k2 = eom(math.add(state, math.dotMultiply(dt/2, k1)));
    let k3 = eom(math.add(state, math.dotMultiply(dt/2, k2)));
    let k4 = eom(math.add(state, math.dotMultiply(dt/1, k3)));
    return math.squeeze(math.add(state, math.dotMultiply(dt / 6, (math.add(k1, math.dotMultiply(2, k2), math.dotMultiply(2, k3), k4)))));
}

function twoBodyJ3(position = [42164, 0, 0, 0, 3.074, 0]) {
    let mu = 398600.44189, j2 = 0.00108262668, j3 = -0.0000025323, j4=-0.0000016204, re = 6378.1363, x = position[0], y = position[1], z = position[2]
    let r = math.norm(position.slice(0,3))
    // j2 *= re ** 2
    let tbvec = [
        x,
        y,
        z
    // ]
    // let j2vec = [
    //     - 1.5 * j2 * x*re ** 2 / r ** 2 * (5 * z ** 2 / r ** 2 - 1),
    //     - 1.5 * j2 * y*re ** 2 / r ** 2 * (5 * z ** 2 / r ** 2 - 1),
    //     - 1.5 * j2 * z*re ** 2 / r ** 2 * (5 * z ** 2 / r ** 2 - 3)
    ]
    // let j2vec = [
    //     -j2 * x / r ** 4 * (6 * z * z - 1.5*(x*x + y*y)),
    //     -j2 * y / r ** 4 * (6 * z * z - 1.5*(x*x + y*y)),
    //     -j2 * z / r ** 4 * (3 * z * z - 4.5*(x*x + y*y))
    // ]
    let j2vec = [
        -7.5*x*j2*re*re*z*z / r ** 4 + 1.5*x*j2*re*re/r ** 2,
        -7.5*y*j2*re*re*z*z / r ** 4 + 1.5*y*j2*re*re/r ** 2,
        -3*j2*re*re*z*(2*z*z-3*y*y-3*x*x) / 2 / r ** 4
    ]
    let j3vec = [
        - 2.5 * j3 * x*re ** 3 / r ** 4 * (3 * z - 7 * z ** 3 / r / r),
        - 2.5 * j3 * y*re ** 3 / r ** 4 * (3 * z - 7 * z ** 3 / r / r),
        - 2.5 * j3 * re ** 3 / r ** 4 * (6 * z * z- 7 * z ** 4 / r / r - 0.6 * r * r)
    ]
    let j4vec = [
        1.875 * j4 * x*re ** 4 / r ** 4 * (1 - 14 * z * z / r / r + 21 * z * z * z * z / r / r / r / r),
        1.875 * j4 * y*re ** 4 / r ** 4 * (1 - 14 * z * z / r / r + 21 * z * z * z * z / r / r / r / r),
        1.875 * j4 * z*re ** 4 / r ** 4 * (5 - 70 * z * z / 3 / r / r + 21 * z * z * z * z / r / r / r / r)
    ]
    let dVec = math.add(tbvec, j2vec, j3vec, j4vec)
    dVec = dVec.map((s, ii) => [
        -mu / r ** 3,
        -mu / r ** 3,
        -mu / r ** 3
    ][ii]*s)
    // console.log(dVec);
    // return [
    //     position[3], position[4], position[5],
    //     -mu * x / r ** 3 * (1 - 1.5 * j2 * re ** 2 / r ** 2 * (5 * z ** 2 / r ** 2 - 1) - 2.5 * j3 * re ** 3 / r ** 4 * (3 * z - 7 * z ** 3 / r / r)),
    //     -mu * y / r ** 3 * (1 - 1.5 * j2 * re ** 2 / r ** 2 * (5 * z ** 2 / r ** 2 - 1) - 2.5 * j3 * re ** 3 / r ** 4 * (3 * z - 7 * z ** 3 / r / r)),
    //     -mu * z / r ** 3 * (1 - 1.5 * j2 * re ** 2 / r ** 2 * (5 * z ** 2 / r ** 2 - 3) - 2.5 * j3 * re ** 3 / r ** 4 * (6 * z - 7 * z ** 3 / r / r - 0.6 * r * r / z))
    // ]
    return [
        position[3], position[4], position[5],...dVec]
}
function runge_kuttaHP(state = [42164, 0, 0, 0, -3.070, 0], dt, date = new Date()) {
    eom = highPrecisionProp
    let k1 = eom(state, date);
    let k2 = eom(math.add(state, math.dotMultiply(dt/2, k1)), new Date(date - (-dt / 2 * 1000)));
    let k3 = eom(math.add(state, math.dotMultiply(dt/2, k2)), new Date(date - (-dt / 2 * 1000)));
    let k4 = eom(math.add(state, math.dotMultiply(dt/1, k3)), new Date(date - (-dt * 1000)));
    return math.squeeze(math.add(state, math.dotMultiply(dt / 6, (math.add(k1, math.dotMultiply(2, k2), math.dotMultiply(2, k3), k4)))));
}



function fk5ReductionTranspose(r=[-1033.479383, 7901.2952754, 6380.3565958], date=new Date(2004, 3, 6, 7, 51, 28, 386)) {
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
    r = math.squeeze(math.multiply(math.transpose(w), math.transpose(p), math.transpose([r])))
    let long = math.atan2(r[1], r[0])
    let lat = math.atan2(r[2], math.norm(r.slice(0,2)))
    return {lat, long}
}

function siderealTime(jdUti=2448855.009722) {
    let tUti = (jdUti - 2451545) / 36525
    return ((67310.548 + (876600*3600 + 8640184.812866)*tUti + 0.093104*tUti*tUti - 6.2e-6*tUti*tUti*tUti) % 86400)/240
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

function julianDate(yr=1996, mo=10, d=26, h=14, min=20, s=0) {
    return 367 * yr - Math.floor(7*(yr+Math.floor((mo+9)/12)) / 4) + Math.floor(275*mo/9) + d + 1721013.5 + ((s/60+min)/60+h)/24
}

function highPrecisionProp(position = [42164, 0, 0, 0, 3.074, 0], date = new Date()) {
    let mu = 398600.44189, j2 = 0.00108262668, j3 = -0.0000025323, j4=-0.0000016204, re = 6378.1363, x = position[0], y = position[1], z = position[2]
    let r = math.norm(position.slice(0,3))
    let {lat, long} = fk5ReductionTranspose(position.slice(0,3), date)
    // console.log(date, long*180/Math.PI);
    let tbvec = [
        x,
        y,
        z
    ]
    let j2vec = [
        x*(-3*j2*re*re*(3*Math.sin(lat)**2 - 1) / 2 / r / r - z / r / r /((x*x+y*y) ** 0.5) * 3*j2*re*re*Math.cos(lat)*Math.sin(lat)),
        y*(-3*j2*re*re*(3*Math.sin(lat)**2 - 1) / 2 / r / r - z / r / r /((x*x+y*y) ** 0.5) * 3*j2*re*re*Math.cos(lat)*Math.sin(lat)),
        (3*j2*re**2*(2*Math.sin(2*lat)*(x*x+y*y)**0.5+(3*Math.cos(2*lat)-1)*z))/(4*r**2)
    ]
    let j3vec = [
        - 2.5 * j3 * x*re ** 3 / r ** 4 * (3 * z - 7 * z ** 3 / r / r),
        - 2.5 * j3 * y*re ** 3 / r ** 4 * (3 * z - 7 * z ** 3 / r / r),
        - 2.5 * j3 * re ** 3 / r ** 4 * (6 * z * z- 7 * z ** 4 / r / r - 0.6 * r * r)
    ]
    let c21vec = c21vector(lat, long, r, re, x,y,z)
    let c22vec = c22vector(lat, long, r, re, x,y,z)
    let c31vec = c31vector(lat, long, r, re, x,y,z)
    let dVec = math.add(tbvec,j2vec, c21vec, c22vec, c31vec)
    dVec = dVec.map((s, ii) => [
        -mu / r ** 3,
        -mu / r ** 3,
        -mu / r ** 3
    ][ii]*s)
    return [
        position[3], position[4], position[5],...dVec]
}

function c21vector(lat, long, r, re,x,y,z) {
    let c = -0.241400052222093e-9, s = 0.1543099973784379e-8
    du_dr = -9*Math.sin(lat)*Math.cos(lat)*(c*Math.cos(long) + s*Math.sin(long)) * re**2 / r
    du_dlat = 3*(Math.sin(lat)**2 - Math.cos(lat)**2)*(c*Math.cos(long) + s*Math.sin(long))*re**2
    du_dlong = 3*Math.sin(lat)*Math.cos(lat)*(-c*Math.sin(long) + s*Math.cos(long))*re**2

    return [
        (1/r * du_dr - z/r/r/(x*x+y*y)**0.5 * du_dlat)*x - (1/(x*x+y*y) * du_dlong) * y,
        (1/r * du_dr - z/r/r/(x*x+y*y)**0.5 * du_dlat)*y + (1/(x*x+y*y) * du_dlong) * x,
        1/r * du_dr * z + (x*x+y*y)**0.5 / r / r * du_dlong
    ].map(s => -s)
}

function c22vector(lat, long, r, re,x,y,z) {
    let c = 0.1574421758350994e-5, s = -0.90376666696168745e-6
    du_dr = -9*(Math.cos(lat)**2)*(c*Math.cos(2*long) + s*Math.sin(2*long)) * re**2 / r
    du_dlat = -6*Math.sin(lat)*Math.cos(lat)*(c*Math.cos(2*long) + s*Math.sin(2*long))*re**2
    du_dlong = -6*Math.cos(lat)*Math.sin(lat)*(c*Math.sin(2*long) - s*Math.cos(2*long)) * re**2

    return [
        (1/r * du_dr - z/r/r/((x*x+y*y)**0.5) * du_dlat)*x - (1/(x*x+y*y) * du_dlong) * y,
        (1/r * du_dr - z/r/r/((x*x+y*y)**0.5) * du_dlat)*y + (1/(x*x+y*y) * du_dlong) * x,
        1/r * du_dr * z + (x*x+y*y)**0.5 / r / r * du_dlat
    ].map(s => -s)
}

function c31vector(lat, long, r, re,x,y,z) {
    let c = 0.2190922081404716e-5, s = 0.2687418863136855e-6
    du_dr = -2*Math.cos(lat)*(15*Math.sin(lat)**2 - 3)*(c*Math.cos(long) + s*Math.sin(long)) * re ** 3 / r / r
    du_dlat = -3*Math.sin(lat)*(5*Math.sin(lat)**2 - 10*Math.cos(lat)**2 - 1) * (c*Math.cos(long) + s*Math.sin(long)) * re ** 3 / 2 / r
    du_dlong = Math.cos(lat)*(15*Math.sin(lat)**2 - 3)*(-c*Math.sin(long) + s*Math.cos(long)) * re ** 3 / 2 / r

    return [
        (1/r * du_dr - z/r/r/(x*x+y*y)**0.5 * du_dlat)*x - (1/(x*x+y*y) * du_dlong) * y,
        (1/r * du_dr - z/r/r/(x*x+y*y)**0.5 * du_dlat)*y + (1/(x*x+y*y) * du_dlong) * x,
        1/r * du_dr * z + (x*x+y*y)**0.5 / r / r * du_dlong
    ].map(s => -s)
}
function c32vector(lat, long, r, re,x,y,z) {
    let c = -0.1574421758350994e-5, s = -0.9037666669616874e-6
    du_dr = -9*(Math.cos(lat)**2)*(c*Math.cos(2*long) + s*Math.sin(2*long)) * re**2 / r
    du_dlat = -6*Math.sin(lat)*Math.cos(lat)*(c*Math.cos(2*long) + s*Math.sin(2*long))*re**2
    du_dlong = -6*Math.cos(lat)*Math.sin(lat)*(c*Math.sin(2*long) - s*Math.cos(2*long)) * re**2

    return [
        (1/r * du_dr - z/r/r/(x*x+y*y)**0.5 * du_dlat)*x - (1/(x*x+y*y) * du_dlong) * y,
        (1/r * du_dr - z/r/r/(x*x+y*y)**0.5 * du_dlat)*y + (1/(x*x+y*y) * du_dlong) * x,
        1/r * du_dr * z + (x*x+y*y)**0.5 / r / r * du_dlong
    ]
}
function c33vector(lat, long, r, re,x,y,z) {
    let c = -0.1574421758350994e-5, s = -0.9037666669616874e-6
    du_dr = -9*(Math.cos(lat)**2)*(c*Math.cos(2*long) + s*Math.sin(2*long)) * re**2 / r
    du_dlat = -6*Math.sin(lat)*Math.cos(lat)*(c*Math.cos(2*long) + s*Math.sin(2*long))*re**2
    du_dlong = -6*Math.cos(lat)*Math.sin(lat)*(c*Math.sin(2*long) - s*Math.cos(2*long)) * re**2

    return [
        (1/r * du_dr - z/r/r/(x*x+y*y)**0.5 * du_dlat)*x - (1/(x*x+y*y) * du_dlong) * y,
        (1/r * du_dr - z/r/r/(x*x+y*y)**0.5 * du_dlat)*y + (1/(x*x+y*y) * du_dlong) * x,
        1/r * du_dr * z + (x*x+y*y)**0.5 / r / r * du_dlong
    ]
}