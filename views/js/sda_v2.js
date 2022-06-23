let mainWindow = {
    planet: {
        mu: 398600.4418,
        r: 6371,
        w: 2 * Math.PI / 86164,
        sidAngle: 0 //at t = 0
    },
    maxTime: 4 * 3600, //seconds
    satellites: [
        {
            origState: [42164, 0, 0, 0, 3.0629662506494473, 0.2679748236943305],
            stateHist: [],
            obFreq: 900,
            obs: []
        }
    ],
    sensors: [
        {
            type: 'optical',
            noise: {
                angle: 0.005 //deg
            },
            lat: 40, //deg
            long: 30, //deg
            azMask: [0, 360],
            elMask: [0,90]
        },
        {
            type: 'optical',
            noise: {
                angle: 0.0005 //deg
            },
            lat: 40, //deg
            long: -30, //deg
            azMask: [0, 360],
            elMask: [0,90]
        }
    ]
}

function runge_kutta(state, dt) {
    eom = orbitalDynamics
    let k1 = eom(state);
    let k2 = eom(math.add(state, math.dotMultiply(dt/2, k1)));
    return math.squeeze(math.add(state, math.dotMultiply(dt, k2)));
}

function orbitalDynamics(position = [42164, 0, 0, 0, 3.074, 0], j2Eff = false) {
    let mu = 398600.44189, j2 = 0.00108262668, re = 6378, x = position[0], y = position[1], z = position[2]
    let r = math.norm(position.slice(0,3))
    return j2Eff ? [
        position[3], position[4], position[5],
        -mu * x / r ** 3 * (1 - 1.5 * j2 * re ** 2 / r ** 2 * (5 * z ** 2 / r ** 2 - 1)),
        -mu * y / r ** 3 * (1 - 1.5 * j2 * re ** 2 / r ** 2 * (5 * z ** 2 / r ** 2 - 1)),
        -mu * z / r ** 3 * (1 - 1.5 * j2 * re ** 2 / r ** 2 * (5 * z ** 2 / r ** 2 - 3))
    ] : 
    [
        position[3], position[4], position[5],
        -mu * x / r ** 3 ,
        -mu * y / r ** 3 ,
        -mu * z / r ** 3 
    ]
}

function calcAzEl(sat = 0, time = 0, options ={}) {
    let {noise = false, mask = false} = options
    let steps = math.ceil(math.abs(time) / 250)
    let propSatState
    if (sat.length === undefined) {
        propSatState = mainWindow.satellites[sat].origState.slice()
    }
    else {
        propSatState = sat.slice()
    }
    for (let index = 0; index < steps; index++) {
        propSatState =  runge_kutta(propSatState, time / steps)
    }
    let curSidTime = mainWindow.planet.sidAngle + time * mainWindow.planet.w
    let sidRot = rotationMatrices(curSidTime * 180 / Math.PI, 3)
    let obs = []
    for (let index = 0; index < mainWindow.sensors.length; index++) {
        let sensorPos = math.dotMultiply(mainWindow.planet.r, [math.cos(mainWindow.sensors[index].long * Math.PI / 180) * math.cos(mainWindow.sensors[index].lat * Math.PI / 180),
                         math.sin(mainWindow.sensors[index].long * Math.PI / 180) * math.cos(mainWindow.sensors[index].lat * Math.PI / 180),
                         math.sin(mainWindow.sensors[index].lat * Math.PI / 180)])
        sensorPos = math.squeeze(math.multiply(sidRot, sensorPos))
        let topoZ = math.dotDivide(sensorPos, math.norm(sensorPos))
        let topoX = math.cross([0,0,1], topoZ)
        topoX = math.dotDivide(topoX, math.norm(topoX))
        topoY = math.cross(topoZ, topoX)
        let rEciToTopo = rotMatrixFrames([topoX, topoY, topoZ])
        let relativeSatState = math.subtract(propSatState.slice(0,3), sensorPos)
        relativeSatState = math.squeeze(math.multiply(rEciToTopo, math.transpose([relativeSatState])))
        let satAz = math.atan2(relativeSatState[0], relativeSatState[1])
        let satEl = math.atan2(relativeSatState[2], math.norm(relativeSatState.slice(0,2)))
        let satRange = math.norm(relativeSatState)
        if (mainWindow.sensors[index].type === 'optical') obs.push({sensor: index, time, data: [satAz, satEl], noise: [mainWindow.sensors[index].noise.angle, mainWindow.sensors[index].noise.angle].map(s => s * Math.PI / 180)})
        if (mainWindow.sensors[index].type === 'radar') obs.push({sensor: index, time, data: [satAz, satEl, satRange], noise: [mainWindow.sensors[index].noise.angle, mainWindow.sensors[index].noise.angle, , mainWindow.sensors[index].noise.range]})
    }
    return obs
}

function rotMatrixFrames(frameTo = frameFrom = math.identity(3)._data, frameFrom = math.identity(3)._data) {
    return [
        [math.dot(frameTo[0], frameFrom[0]), math.dot(frameTo[0], frameFrom[1]), math.dot(frameTo[0], frameFrom[2])],
        [math.dot(frameTo[1], frameFrom[0]), math.dot(frameTo[1], frameFrom[1]), math.dot(frameTo[1], frameFrom[2])],
        [math.dot(frameTo[2], frameFrom[0]), math.dot(frameTo[2], frameFrom[1]), math.dot(frameTo[2], frameFrom[2])]
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

function estimateCovariance(sat = 0) {
    getObHistory(sat)
    let blsMatrices = createJacobian(sat)
    let a = math.inv(math.multiply(math.transpose(blsMatrices.jac), blsMatrices.w, blsMatrices.jac))
    console.log(choleskyDecomposition(a));
}

function getObHistory(sat = 0) {
    let timeOb = 0
    mainWindow.satellites[sat].obs = []
    while (timeOb < mainWindow.maxTime) {
        let ob = calcAzEl(0, -timeOb)
        mainWindow.satellites[sat].obs.push(...ob)
        timeOb += mainWindow.satellites[sat].obFreq
    }
}

function copyObHistory(sat, state) {
    if (state === undefined) {
        state = mainWindow.satellites[sat].origState
        state[0] += 10
    }
    let times = mainWindow.satellites[sat].obs.map(o => o.time)
    let outObs = []
    for (let ii = 0; ii < times.length; ii++) {
        let ob = calcAzEl(state, times[ii])
        outObs.push(...ob)
    }
    return outObs
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

function convertObsToVector(obs) {
    obs = obs.map(ob => ob.data)
    return math.reshape(obs, [1,-1])[0]
}

function convertObsToWeightMatrix(obs) {
    obs = math.reshape(obs.map(ob => ob.noise), [1,-1])[0].map(n => 1/n/n)
    return math.diag(obs)
}

function createJacobian(sat, state) {
    if (state === undefined) {
        state = mainWindow.satellites[sat].origState
    }
    let baseObsVector = convertObsToVector(copyObHistory(sat, state))
    let jac = []
    for (let index = 0; index < 6; index++) {
        let delState = state.slice()
        delState[index] += index < 3 ? 0.1 : 0.0001
        let delObsVector = convertObsToVector(copyObHistory(sat, delState))
        jac.push(math.dotDivide(math.subtract(delObsVector, baseObsVector), index < 3 ? 0.1 : 0.0001))
    }
    jac = math.transpose(jac)
    return {jac, w: convertObsToWeightMatrix(copyObHistory(sat, state))}
}

function choleskyDecomposition(matrix = [[25, 15, -5],[15, 18,  0],[-5,  0, 11]]) {
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