// fetch('./JGM-3.txt').then(res=>res.text()).then(res => console.log(res.replaceAll('D','E').split('\r').slice(2).map(s => s.split('\t').map(c => Number(c)))))

let c = [
    null,
    null,
    [-1.08262617385222E-03,-0.24140000522221E-09, 0.15745360427672E-05],
    [2.53241051856772E-06,0.21927988018965E-05, 0.30901604455583E-06, 0.10055885741455E-06],
    [0.16193312050719E-05,-0.50872530365024E-06, 0.78412230752366E-07, 0.59215743214072E-07, -0.39823957404129E-08],
    [0.22771610163688E-06, -0.53716510187662E-07, 0.10559053538674E-06, -0.14926153867389E-07, -0.22979123502681E-08, 0.43047675045029E-09],
    [-0.53964849049834E-06, -0.59877976856303E-07, 0.60120988437373E-08,0.11822664115915E-08,-0.32641389117891E-09,-0.21557711513900E-09,0.22136925556741E-11]
]
let s = [
    null,
    null,
    [0,0.15430999737844E-08, -0.90386807301869E-06],
    [0,0.26801189379726E-06, -0.21140239785975E-06, 0.19720132389889E-06],
    [0,-0.44945993508117E-06, 0.14815545694714E-06, -0.12011291831397E-07, 0.65256058113396E-08],
    [0,-0.80663463828530E-07, -0.52326723987632E-07, -0.71008771406986E-08, 0.38730050770804E-09, -0.16482039468636E-08],
    [0, 0.21164664354382E-07, -0.46503948132217E-07,0.18431336880625E-09,-0.17844913348882E-08,-0.43291816989540E-09,-0.55277122205966E-10]
]

let timeStepScale = 0.0025

let state1_init = '1996-12-07T23:58:57.816   4.216400000000000e+04   0.000000000000000e+00   0.000000000000000e+00   0.000000000000000e+00   3.074666282970636e+00   0.000000000000000e+00'.split(/ +/)
let state1_init_Epoch = new Date(state1_init.shift())
state1_init = state1_init.map(s => Number(s))
let state2_init = '1996-12-07T23:58:57.816   6.900000000000000e+03   0.000000000000000e+00   0.000000000000000e+00   0.000000000000000e+00  -1.057790461084519e+00   7.526570219427627e+00'.split(/ +/)
let state2_init_Epoch = new Date(state2_init.shift())
state2_init = state2_init.map(s => Number(s))
let state3_init = '2020-12-07T23:58:50.816  -3.343285761672277e-12  -3.541125897968468e+03  -6.949850888669273e+03   9.320646715690811e+00  -1.386967034608292e-15  -2.722076072911560e-15'.split(/ +/)
let state3_init_Epoch = new Date(state3_init.shift())
state3_init = state3_init.map(s => Number(s))

let state1_final = '1996-12-08T23:58:57.816   4.215817571029071e+04   7.391368678480095e+02  -2.239795385142918e+00  -5.391790349508940e-02   3.074133905209943e+00   1.014159397402828e-04'.split(/ +/)
let state1_final_Epoch = new Date(state1_final.shift())
state1_final = state1_final.map(s => Number(s))
let timeStep1 = 2*Math.PI*((PosVel2CoeNew(state1_init.slice(0,3), state1_init.slice(3,6)).a*(1-PosVel2CoeNew(state1_init.slice(0,3), state1_init.slice(3,6)).e))**3 / 398600.4418)**0.5 * timeStepScale
let state2_final = '1996-12-08T23:58:57.816   3.760446076611940e+03  -7.378282112147349e+02   5.733538571699236e+03  -6.370663086267017e+00  -6.909950399488288e-01   4.081147791506453e+00'.split(/ +/)
let state2_final_Epoch = new Date(state2_final.shift())
let timeStep2 = 2*Math.PI*((PosVel2CoeNew(state2_init.slice(0,3), state2_init.slice(3,6)).a*(1-PosVel2CoeNew(state2_init.slice(0,3), state2_init.slice(3,6)).e))**3 / 398600.4418)**0.5 * timeStepScale
state2_final = state2_final.map(s => Number(s))
let state3_final = '2020-12-08T23:58:50.816   1.513499775049770e+04   1.369395594445585e+03   2.767564221298383e+03   2.746265353077890e+00   2.429357014711821e+00   4.784447483432596e+00'.split(/ +/)
let state3_final_Epoch = new Date(state3_final.shift())
state3_final = state3_final.map(s => Number(s))
let timeStep3 = 2*Math.PI*((PosVel2CoeNew(state3_init.slice(0,3), state3_init.slice(3,6)).a*(1-PosVel2CoeNew(state3_init.slice(0,3), state3_init.slice(3,6)).e))**3 / 398600.4418)**0.5 * timeStepScale

console.log('Test Orbits');
console.log(`Orbit 1 ${state1_init.map(s => s.toFixed(4)).join('  ')}, Time Step: ${timeStep1.toFixed(1)} seeconds`);
console.log(`Orbit 2 ${state2_init.map(s => s.toFixed(4)).join('  ')}, Time Step: ${timeStep2.toFixed(1)} seeconds`);
console.log(`Orbit 3 ${state3_init.map(s => s.toFixed(4)).join('  ')}, Time Step: ${timeStep3.toFixed(1)} seeconds`);

console.log('Two Body');
let tbstate1 = propToTimeJ2(state1_init, (state1_final_Epoch - state1_init_Epoch) / 1000, false)
let tbstate2 = propToTimeJ2(state2_init, (state2_final_Epoch - state2_init_Epoch) / 1000, false)
let tbstate3 = propToTimeJ2(state3_init, (state3_final_Epoch - state3_init_Epoch) / 1000, false)
console.log(`Prop Time ${((state1_final_Epoch - state1_init_Epoch) / 1000 / 3600).toFixed(2)} hrs, Error: ${math.norm(math.subtract(state1_final, tbstate1)).toFixed(6)} km`)
console.log(`Prop Time ${((state2_final_Epoch - state2_init_Epoch) / 1000 / 3600).toFixed(2)} hrs, Error: ${math.norm(math.subtract(state2_final, tbstate2)).toFixed(6)} km`)
console.log(`Prop Time ${((state3_final_Epoch - state3_init_Epoch) / 1000 / 3600).toFixed(2)} hrs, Error: ${math.norm(math.subtract(state3_final, tbstate3)).toFixed(6)} km`)


console.log('J2 Numeric');
let J2AnState1 = propToTimeJ2Numeric(state1_init, (state1_final_Epoch - state1_init_Epoch) / 1000, timeStep1)
let J2AnState2 = propToTimeJ2Numeric(state2_init, (state2_final_Epoch - state2_init_Epoch) / 1000, timeStep2)
let J2AnState3 = propToTimeJ2Numeric(state3_init, (state3_final_Epoch - state3_init_Epoch) / 1000, timeStep3)
console.log(`Prop Time ${((state1_final_Epoch - state1_init_Epoch) / 1000 / 3600).toFixed(2)} hrs, Error: ${math.norm(math.subtract(state1_final, J2AnState1)).toFixed(6)} km`)
console.log(`Prop Time ${((state2_final_Epoch - state2_init_Epoch) / 1000 / 3600).toFixed(2)} hrs, Error: ${math.norm(math.subtract(state2_final, J2AnState2)).toFixed(6)} km`)
console.log(`Prop Time ${((state3_final_Epoch - state3_init_Epoch) / 1000 / 3600).toFixed(2)} hrs, Error: ${math.norm(math.subtract(state3_final, J2AnState3)).toFixed(6)} km`)

console.log('HP Numeric');
let HpAnState1 = propToTimeHPNumeric(state1_init, (state1_final_Epoch - state1_init_Epoch) / 1000, state1_init_Epoch, timeStep1)
let HpAnState2 = propToTimeHPNumeric(state2_init, (state2_final_Epoch - state2_init_Epoch) / 1000, state2_init_Epoch, timeStep2)
let HpAnState3 = propToTimeHPNumeric(state3_init, (state3_final_Epoch - state3_init_Epoch) / 1000, state3_init_Epoch, timeStep3)
console.log(`Prop Time ${((state1_final_Epoch - state1_init_Epoch) / 1000 / 3600).toFixed(2)} hrs, Error: ${math.norm(math.subtract(state1_final, HpAnState1)).toFixed(6)} km`)
console.log(`Prop Time ${((state2_final_Epoch - state2_init_Epoch) / 1000 / 3600).toFixed(2)} hrs, Error: ${math.norm(math.subtract(state2_final, HpAnState2)).toFixed(6)} km`)
console.log(`Prop Time ${((state3_final_Epoch - state3_init_Epoch) / 1000 / 3600).toFixed(2)} hrs, Error: ${math.norm(math.subtract(state3_final, HpAnState3)).toFixed(6)} km`)


function propToTimeJ2(state = [42164.14, 0, 0, 0, 3.0746611796284924, 0], dt = 86164, j2 = true) {
    state = PosVel2CoeNew(state.slice(0,3), state.slice(3,6))
    if (j2) {
        state.tA = propTrueAnomalyj2(state.tA, state.a, state.e, state.i, dt)
        let j2 = -1.082626668e-3
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
function propToTimeJ2Numeric(state = [42164.14, 0, 0, 0, 3.0746611796284924, 0], dt = 86164, step = 10) {
    let t = 0
    while (t < (dt-step)) {
        state = runge_kuttaj2(state, step)
        t += step
    }
    state = runge_kuttaj2(state, dt - t)
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
function twoBodyJ2(position = state1) {
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
    let overallR = math.multiply(math.transpose(w), math.transpose(p))
    r = math.squeeze(math.multiply(overallR, math.transpose([r])))
    let long = math.atan2(r[1], r[0])
    let lat = math.atan2(r[2], math.norm(r.slice(0,2)))
    return {lat, long, rot: overallR, r_ecef: r}
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

function higherAnalytic(state = [42164.14, 0, 0, 0, 3.0746611796284924, 0], dt = 86164) {
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
    
    let r = math.norm(state.slice(0,3))
    let coes = PosVel2CoeNew(state.slice(0,3), state.slice(3,6)), j2 = -0.1082626925638815e-2, j4=0.162042999e-5, j6=0.5408436161399631e-6, re = 6378.1363
    let {a, e, i, raan, arg, tA} = coes
    let n = (398600.4418 / a**3)**0.5, p = a * (1 - e*e)
    let dRaan = -3*j2*(re**2)*n*Math.cos(i)/2/(p**2)
    dRaan += 3*(j2**2)*(re**4)*n*Math.cos(i)/32/(p**4) * (12 - 4*(e**2) - (80+5*(e**2))*Math.sin(i))
    dRaan += 15*j4*(re**4)*n*Math.cos(i)/32/(p**4) * (8 + 12*(e**2) - (14+21*(e**2))*(Math.sin(i)**2))
    dRaan += -105*j6*(re**6)*n*Math.cos(i)/1024/(p**6) * (64 + 160*e*e + 120*(e**4) - (288+720*e*e+540*(e**4))*Math.sin(i)**2 + (264+660*e*e+495*(e**4))*Math.sin(i)**4)
    
    let dArg = 3*n*j2*(re**2)/4/(p**2) * (4 - 5 * Math.sin(i)**2)
    dArg += 9*n*(j2**2)*(re**4)/384/(p**4) * (56*e*e + (760-36*e*e)*(Math.sin(i)**2) - (890+45*e*e)*(Math.sin(i)**4)) 
    dArg += -15*n*j4*(re**4)/128/(p**4) * (64 + 72*e*e - (248+252*e*e)*(Math.sin(i)**2) + (196+189*e*e)*(Math.sin(i)**4)) 
    dArg += 105*n*j6*(re**6)/2048/(p**6) * (256 + 960*e*e + 320*(e**4) - (2048+6880*e*e+2160*(e**4))*(Math.sin(i)**2) - (4128+13080*e*e+3960*(e**4))*(Math.sin(i)**4)- (2376+14520*e*e+2145*(e**4))*(Math.sin(i)**6))
    
    let dM = 3*n*(re**2)*j2*((1-e*e)**0.5)/4/(p**2) * (2 - 3*Math.sin(i)**2)

    let eccAnom = True2Eccentric(e, tA)
    let meanAnom = eccAnom - e*Math.sin(eccAnom)
    meanAnom += n*dt
    meanAnom += dM*dt
    eccAnom = solveKeplersEquation(meanAnom, e)
    tA = Eccentric2True(e, eccAnom)

    raan += dRaan*dt
    arg += dArg*dt
    
    let del_a = j2*re*re*((a/r)**3 - 1/((1-e*e)**1.5) + (-1*(a/r)**3 + 1/((1-e*e)**1.5) + (a/r)**3*Math.cos(2*arg+2*tA))*3*(Math.sin(i)**2)/2)
    let del_i = j2*re*re*Math.sin(2*i)/8/p/p * (3*Math.cos(2*arg+2*tA)+3*e*Math.cos(2*arg+tA)+e*Math.cos(2*arg+3*tA))
    state = Object.values(Coe2PosVelObject({
        a: a, e, i: i, raan, arg, tA
    }))
    return state
}

function timeRecursive() {
    console.time()
    recursiveGeoPotential()
    console.timeEnd()
}
function highPrecisionProp(position = [42164, 0, 0, 0, 3.074, 0], date = new Date()) {
    let mu = 398600.44189, x = position[0], y = position[1], z = position[2]
    let r = math.norm(position.slice(0,3))
    let a = [
        -mu* x / r ** 3,
        -mu* y / r ** 3,
        -mu* z / r ** 3
    ]
    let a_pert = recursiveGeoPotential(position, 6, date)
    a = math.add(a_pert.a,a)
    a_pert = thirdBodyEffects(position, date)
    a = math.add(a_pert,a)
    return [
        position[3], position[4], position[5],...a]
}
function propToTimeHPNumeric(state = [42164.14, 0, 0, 0, 3.0746611796284924, 0], dt = 86164, startEpoch, step = 10) {
    let t = 0

    while (t < (dt-step)) {
        state = runge_kuttaHP(state, step, new Date(startEpoch - (-t * 1000)))
        t += step
    }
    state = runge_kuttaHP(state, dt - t, new Date(startEpoch - (-t * 1000)))
    return state
}
function runge_kuttaHP(state = [42164, 0, 0, 0, -3.070, 0], dt, date = new Date()) {
    eom = highPrecisionProp
    let k1 = eom(state, date);
    let k2 = eom(math.add(state, math.dotMultiply(dt/2, k1)), new Date(date - (-dt / 2 * 1000)));
    let k3 = eom(math.add(state, math.dotMultiply(dt/2, k2)), new Date(date - (-dt / 2 * 1000)));
    let k4 = eom(math.add(state, math.dotMultiply(dt/1, k3)), new Date(date - (-dt * 1000)));
    return math.squeeze(math.add(state, math.dotMultiply(dt / 6, (math.add(k1, math.dotMultiply(2, k2), math.dotMultiply(2, k3), k4)))));
}
function recursiveGeoPotential(state = state1_init, k = 3, date = state1_init_Epoch) {
    let {lat, long, rot, r_ecef} = fk5ReductionTranspose(state.slice(0,3), date)
    rot = math.transpose(rot)
    let re = 6378.1363, r = math.norm(state.slice()), x = r_ecef[0], y=r_ecef[1], z=r_ecef[2]
    let p = [[1],[Math.sin(lat), Math.cos(lat)]]
    for (let order = 2; order <= k; order++) {
        let row = []
        for (let rowNum = 0; rowNum <= order; rowNum++) {
            if (rowNum === 0) row.push(((2*order-1)*Math.sin(lat)*p[order-1][0] - (order-1)*p[order-2][0])/order)
            else if (rowNum === order) row.push((2*order-1)*Math.cos(lat)*p[order-1][order-1])
            else {
                let po_2m = rowNum > (order-2) ? 0 : p[order-2][rowNum]
                row.push(po_2m + (2*order-1)*Math.cos(lat)*p[order-1][rowNum-1])
            }
        }
        p.push(row)
    }
    let du_dr = 0, du_dlat = 0, du_dlong = 0
    for (let order = 2; order <= k; order++) {
        for (let m = 0; m <= order; m++) {
            du_dr += (re/r)**order*(order+1)*p[order][m]*(c[order][m]*Math.cos(m*long)+s[order][m]*Math.sin(m*long))

            let pt_m_1 = (m+1) > order ? 0 : p[order][m+1] 
            du_dlat += (re/r)**order * (pt_m_1 - m * Math.tan(lat) * p[order][m]) * (c[order][m]*Math.cos(m*long) + s[order][m]*Math.sin(m*long))
            du_dlong += (re/r)**order * m * p[order][m] * (s[order][m]*Math.cos(m*long) - c[order][m]*Math.sin(m*long))
        }
    }
    du_dr *= -398600.4418/r/r

    du_dlat *= 398600.4418/r

    du_dlong *= 398600.4418/r

    let a_i = (1/r * du_dr - z/r/r/Math.sqrt(x*x+y*y)*du_dlat)*x - (1/(x*x+y*y)*du_dlong)*y
    let a_j = (1/r * du_dr - z/r/r/Math.sqrt(x*x+y*y)*du_dlat)*y + (1/(x*x+y*y)*du_dlong)*x
    let a_k = 1/r * du_dr * z + Math.sqrt(x*x+y*y)/r/r * du_dlat

    return {p, a: math.squeeze(math.multiply(rot, math.transpose([[a_i, a_j, a_k]])))}  
}

function thirdBodyEffects(eciState = state1_init, date = state1_init_Epoch) {
    //Moon
    let moonVector = moonEciFromTime(date)
    let muMoon = 4902.799
    let moonSatVec = math.subtract(moonVector, eciState.slice(0,3))
    let rEarthMoon = math.norm(moonVector)
    let rSatMoon = math.norm(moonSatVec)
    let aMoon = [
        muMoon*(moonSatVec[0] / rSatMoon**3 - moonVector[0]/rEarthMoon**3),
        muMoon*(moonSatVec[1] / rSatMoon**3 - moonVector[1]/rEarthMoon**3),
        muMoon*(moonSatVec[2] / rSatMoon**3 - moonVector[2]/rEarthMoon**3),
    ]
    //Sun
    let sunVector = sunEciFromTime(date)
    let muSun = 1.32712428e11
    let sunSatVec = math.subtract(sunVector, eciState.slice(0,3))
    let rEarthSun = math.norm(sunVector)
    let rSatSun = math.norm(sunSatVec)
    let aSun = [
        muSun*(sunSatVec[0] / rSatSun**3 - sunVector[0]/rEarthSun**3),
        muSun*(sunSatVec[1] / rSatSun**3 - sunVector[1]/rEarthSun**3),
        muSun*(sunSatVec[2] / rSatSun**3 - sunVector[2]/rEarthSun**3),
    ]
    return math.add(aMoon, aSun)
}

function julianDate(yr=1996, mo=10, d=26, h=14, min=20, s=0) {
    return 367 * yr - Math.floor(7*(yr+Math.floor((mo+9)/12)) / 4) + Math.floor(275*mo/9) + d + 1721013.5 + ((s/60+min)/60+h)/24
}

function moonEciFromTime(startDate = new Date()) {
    let sind = ang => Math.sin(ang*Math.PI / 180)
    let cosd = ang => Math.cos(ang*Math.PI / 180)
    let jd = julianDate(startDate.getFullYear(), startDate.getMonth() + 1, startDate.getDate(), startDate.getHours(), startDate.getMinutes(), startDate.getSeconds())
    let tdb = (jd - 2451545) / 36525
    let lambda_ell = 218.32 + 481267.8813 * tdb + 6.29 * sind(134.9 + 477198.85 * tdb)-
        1.27*sind(259.2-413335.38*tdb) +
        0.66*sind(235.7+890534.23*tdb) +
        0.21*sind(269.9+954397.7*tdb) -
        0.19*sind(357.5+35999.05*tdb) -
        0.11*sind(186.6+966404.05*tdb)
    lambda_ell = lambda_ell % 360
    lambda_ell = lambda_ell < 0 ? lambda_ell + 360 : lambda_ell
    
    let phi_ell = 5.13*sind(93.3+483202.03*tdb) + 
        0.28*sind(228.2+960400.87*tdb) - 
        0.28*sind(318.3+6003.18*tdb) - 
        0.17*sind(217.6-407332.2*tdb)
    phi_ell = phi_ell % 360
    phi_ell = phi_ell < 0 ? phi_ell + 360 : phi_ell
   
    let para = 0.9508 + 
        0.0518*cosd(134.9+477_198.85*tdb) + 
        0.0095*cosd(259.2-413_335.38*tdb) +  
        0.0078*cosd(235.7+890_534.23*tdb) +  
        0.0028*cosd(269.9+954_397.7*tdb)
    para = para % 360
    para = para < 0 ? para + 360 : para

    let epsilon = 23.439291 - 0.0130042 * tdb-(1.64e-7)*tdb*tdb+(5.04e-7)*tdb*tdb*tdb

    let rC = 1 / sind(para) * 6378.1363
    
    return math.dotMultiply(rC, [cosd(phi_ell) * cosd(lambda_ell), 
            cosd(epsilon) * cosd(phi_ell) * sind(lambda_ell) - sind(epsilon) * sind(phi_ell), 
            sind(epsilon) * cosd(phi_ell) * sind(lambda_ell) + cosd(epsilon) * sind(phi_ell)])
}

function sunEciFromTime(date = new Date()) {
    let jdUti = julianDate(date.getFullYear(), date.getMonth() + 1, date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds())
    let tUti = (jdUti - 2451545) / 36525
    let lamba = 280.4606184 + 36000.770005361 * tUti
    let m = 357.5277233 + 35999.05034 * tUti
    let lambaEll = lamba + 1.914666471 * Math.sin(m* Math.PI / 180) + 0.019994643 * Math.sin(2 * m* Math.PI / 180)
    let phi = 0
    let epsilon = 23.439291-0.0130042 * tUti
    let rSun = 1.000140612-0.016708617 * Math.cos(m * Math.PI / 180)-0.000139589*Math.cos(2*m* Math.PI / 180)
    let au = 149597870.7 //km
    rSun *= au
    return [
       rSun * Math.cos(lambaEll* Math.PI / 180),
       rSun * Math.cos(epsilon* Math.PI / 180) * Math.sin(lambaEll* Math.PI / 180),
       rSun * Math.sin(epsilon* Math.PI / 180) * Math.sin(lambaEll* Math.PI / 180)
    ]
}