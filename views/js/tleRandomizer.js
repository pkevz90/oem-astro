let header
let data
let fileName
let epochDate

document.getElementsByTagName('td')[0].getElementsByTagName('input')[0].addEventListener('input', event => {
    let initValue = Number(event.target.value)
    let inputs = event.target.parentNode.parentNode.parentNode.getElementsByTagName('input')
    if (initValue < 0) {
        event.target.value = 0
        initValue = 0
    }
    inputs[2].value = initValue
    inputs[5].value = initValue
    inputs[9].value = initValue / 1e4
    inputs[14].value = initValue / 1e4
    inputs[20].value = initValue / 1e4
})


function normalRandom() {
    var val, u, v, s, mul;
    spareRandom = null;
    if(spareRandom !== null)
    {
        val = spareRandom;
        spareRandom = null;
    }
    else
    {
        do
        {
            u = Math.random()*2-1;
            v = Math.random()*2-1;

            s = u*u+v*v;
        } while(s === 0 || s >= 1);

        mul = Math.sqrt(-2 * Math.log(s) / s);

        val = u * mul;
        spareRandom = v * mul;
    }
    
    return val;
}

function exportFile() {
    console.clear()
    try {
        let files = window.localStorage.files === undefined ? {} : JSON.parse(window.localStorage.files)
        let err_inputs = document.getElementsByTagName('input');
        let desDate = new Date(Number(err_inputs[2].value), Number(err_inputs[0].value) - 1, Number(err_inputs[1].value), Number(err_inputs[3].value), Number(err_inputs[4].value));
        if (desDate == 'Invalid Date') return alert('Date not in proper format');
        console.info('Desired date accepted from file\n' + desDate)
        let timeDiff = desDate - epochDate;
        timeDiff /= 1000;
        if (timeDiff < 0) return alert('Time must be during the imported .e file')
        let timeLine = data[1].findIndex(line => Number(line.split(/ +/).filter(s => s !== '')[0]) >= timeDiff)
        // Get prop end time from last line in file, found by finding last line in file with valid time
        let lastLine = data[1].length-1
        while (isNaN(Number(data[1][lastLine].split(/ +/).filter(s => s !== '')[0]))) lastLine--
        let endTime = Number(data[1][lastLine].split(/ +/).filter(s => s !== '')[0])
        let saveName = 'sat' + math.floor(data[1][0].split(/ +/).filter(line => line !== '')[1]);
        // Pull initial state from ephemeris file
        let stateEphemeris = data[1].slice(timeLine + 1, timeLine + 2)
        state = stateEphemeris[0].split(/ +/).filter(s => s !== '').map(s => Number(s))
        console.info('Pulled state in table below')
        console.table(state)
        let t = state.shift()
        //Prop initial state state back to desired time (to avoid any potential burn at desired epoch)
        for (let ii = 0; ii < 10; ii++) state = runge_kutta(-(t - timeDiff) / 10, [state])
        console.info('State after prop to desired time')
        console.table([timeDiff, ...state])
        t = timeDiff
        // Add gaussian error to the initial state
        let rEci2Eci = Ric2EciRedux(state.slice(0,3), state.slice(3,6))
        let stateCov = covFromInputs(rEci2Eci)
        let P = math.dotMultiply(1e6, math.multiply(stateCov, math.transpose(stateCov)))
        console.info('Initial covariance in table below')
        console.table(P)
        let initError = math.transpose(stateCov).reduce((a, b, ii) => {
            if (ii === 1) a = math.dotMultiply(a, normalRandom())
            return math.add(a, math.dotMultiply(normalRandom(),b))
        })
        initError = math.dotMultiply(1000, initError)
        state = math.add(state, initError)
        console.info('State after error added')
        console.table([timeDiff, ...state])
        // Define initial covariance matrix
        let pEphemeris = []
        pEphemeris.push(`${t.toExponential(16)} ${P[0][0].toExponential(16)} ${P[0][1].toExponential(16)} ${P[0][2].toExponential(16)} ${P[1][1].toExponential(16)} ${P[1][2].toExponential(16)} ${P[2][2].toExponential(16)}`)
        stateEphemeris = [toExponentialDigits(t, 16, 2) + ' ' + state.map(s => toExponentialDigits(s, 16, 2)).join(' ')]
        let timeDelta = 900
        let propTime = (endTime - timeDiff) > 86400 ? 86400 : endTime - timeDiff
        let points = generateSigmaPoints(P, [state])
        for (let ii = timeDelta; ii <= propTime; ii+=timeDelta) {
            let pointsNew = points.map(s => propToTime(s.map(a => a / 1000), ii).map(a => a * 1000))
            let {averagePoint, P} = calcSigmaProperties(pointsNew)
            stateEphemeris.push(toExponentialDigits(t + ii, 16, 2) + ' ' + averagePoint.map(s => toExponentialDigits(s, 16, 2)).join(' '))
            pEphemeris.push(`${(t + ii).toExponential(16)} ${P[0][0].toExponential(16)} ${P[0][1].toExponential(16)} ${P[0][2].toExponential(16)} ${P[1][1].toExponential(16)} ${P[1][2].toExponential(16)} ${P[2][2].toExponential(16)}`)
            if (isNaN(state[0])) {
                alert('Error in state propagation');
                return
            }
        }
        // Remove number of ephemeris points to default to read all points
        let header = data[0]
        if (files[saveName] === undefined) {
            // If file is not in records, fill in past with truth
            while (timeLine > 0) {
                timeLine--
                stateEphemeris.unshift(data[1][timeLine].split(/ +/).filter(s => s !== '').join(' '))
            }
            files[saveName] = {
                header,
                data: [{posVelData: stateEphemeris, covData: pEphemeris, startTime: timeDiff, time: new Date() - 0}]
            }
        }
        else {
            files[saveName].header = header
            files[saveName].data.push({posVelData: stateEphemeris, covData: pEphemeris, startTime: timeDiff, time: new Date() - 0})
        }
        files[saveName].data = files[saveName].data.map((d, ii) => {
            let filterTime
            if (ii < files[saveName].data.length - 1) {
                filterTime = Number(files[saveName].data[ii+1].startTime)
            }
            else {
                filterTime = 1e9
            }
            return {
                startTime: d.startTime,
                time: d.time,
                posVelData: d.posVelData.filter(data => Number(data.split(' ')[0]) < filterTime),
                covData: d.covData.filter(data => Number(data.split(' ')[0]) < filterTime)
            }


        })
        window.localStorage.files = JSON.stringify(files)
        exportConsolidated(files[saveName], 'bsa_' + fileName + '_' + padNumbers(desDate.getHours()) +  padNumbers(desDate.getMinutes()) + '.e')
    } catch (error) {
        alert(error + '\n\nContact Captain (or maybe Major depending on the time period) VanZandt')
    }
}

function exportConsolidated(satelliteData, name) { 
    satelliteData = JSON.parse(JSON.stringify(satelliteData))
    let files = satelliteData.data
    files = files.sort((a, b) => a.startTime - b.startTime)
    for (let file = 0; file < files.length; file++) {
        let endTime = file === files.length - 1 ? 1e10 : files[file + 1].startTime
        files[file].posVelData = files[file].posVelData.filter(data => Number(data.split(/ +/)[0]) < endTime)
        files[file].covData = files[file].covData.filter(data => Number(data.split(/ +/)[0]) < endTime)
        files[file].posVelData = files[file].posVelData.join('\n')
        files[file].covData = files[file].covData.join('\n')
    }
    let out = ''
    let header = satelliteData.header.split('\n')
    let nPointsIndex = header.findIndex(line => {
        return line.search('NumberOfEp') !== -1
    })

    let nPoints = files.map(file => file.posVelData).join('').split('\n').length
    header.splice(nPointsIndex, 1,'   NumberOfEphemerisPoints \t\t' + nPoints)
    out += header.join('\n') + '\n'
    out += files.map(file => file.posVelData).join('\n')
    out += '\n\nCovarianceTimePos \n\n'
    out += files.map(file => file.covData).join('\n')
    out += 'END Ephemeris'
    downloadFile(name, out)
}

function byteCount(s) {
    return encodeURI(s).split(/%..|./).length - 1;
}

function testDrop(event) {
    event.preventDefault();
    fileToLoad = event.dataTransfer.files[0];
    fileName = fileToLoad.name.split('.')[0]
    let fileReader = new FileReader();
    fileReader.onload = function (fileLoadedEvent) {
        let text = fileLoadedEvent.target.result;
        text = text.split('EphemerisTimePosVel');
        text[1] = text[1].split(/\n+/);
        text[0] = text[0] + 'EphemerisTimePosVel' + text[1][0];
        text[1].shift();
        let date = text[0].split('\n').find(line => line.search('ScenarioEpoch') !== -1)
        console.log(date);
        date = date.substr(date.search('Epoch') + 6)
        console.log(date, date.search('Epoch'))
        data = text;
        epochDate = new Date(date);
        exportFile()
    };
    fileReader.readAsText(fileToLoad, "UTF-8");
}

function dragOverHandler(event) {
    if (event.type === 'dragenter') {
        event.target.classList.add('dragged-on');
    }
    else if (event.type === 'dragleave') {
        event.target.classList.remove('dragged-on');

    }
    event.preventDefault();

}

function downloadFile(filename, text) {
    var pom = document.createElement('a');
    pom.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    pom.setAttribute('download', filename);

    if (document.createEvent) {
        var event = document.createEvent('MouseEvents');
        event.initEvent('click', true, true);
        pom.dispatchEvent(event);
    } else {
        pom.click();
    }
}

function twoBodyRpo(state = [[-1.89733896, 399.98, 0, 0, 0, 0]]) {
    let mu = 398600.4418
    let x = state[0][0], y = state[0][1], z = state[0][2], dx = state[0][3], dy = state[0][4], dz = state[0][5]
    // console.log(x,y,z,dx,dy,dz);
    let r = math.norm([x,y,z])
    return [[
        dx,
        dy,
        dz,
        -mu * x / r ** 3,
        -mu * y / r ** 3,
        -mu * z / r ** 3
    ]];
}

function runge_kutta(dt = 10, state = [[42164000, 0, 0, 0, -3070, 0]] ) {
    state = math.dotDivide(state, 1000)
    eom = twoBodyRpo
    let k1 = eom(state);
    let k2 = eom(math.add(state, math.dotMultiply(dt/2, k1)));
    let k3 = eom(math.add(state, math.dotMultiply(dt/2, k2)));
    let k4 = eom(math.add(state, math.dotMultiply(dt/1, k3)));
    return math.dotDivide(math.squeeze(math.add(state, math.dotMultiply(dt / 6, (math.add(k1, math.dotMultiply(2, k2), math.dotMultiply(2, k3), k4))))), 0.001);
}

function propCovariance(P, dt = 60, state) {
    let {s, w} = generateSigmaPoints(P, state)
    s = s.map(point => {
        return [propToTime(point[0].map(s => s / 1000), dt).map(s => s * 1000)]
    })
    let estP = math.zeros([6,6])
    let estState = math.zeros([1,6])
    for (let ii = 0; ii < s.length; ii++) {
        estState = math.add(estState, math.dotMultiply(w[ii], s[ii])) 
    }
    for (let ii = 0; ii < s.length; ii++) {
        estP = math.add(estP, math.dotMultiply(w[ii], math.multiply(math.transpose(math.subtract(s[ii], estState)), math.subtract(s[ii], estState))))
    }
    return {P: estP, state: math.squeeze(estState)}
}

function generateSigmaPoints(P=[[25,0,0,0,0,0], [0,25,0,0,0,0],[0,0,25,0,0,0],[0,0,0,0.0001**2,0,0],[0,0,0,0,0.0001**2,0], [0,0,0,0,0,0.0001**2]], state = [[42164, 0, 0, 0, -((398600.4418 / 42164) ** (1/2)), 0]], n = 100) {
    let A = choleskyDecomposition(P)
    
    for (let ii = 0; ii < A.length; ii++) {
        for (let jj = 0; jj < A.length; jj++) {
            if (isNaN(A[ii][jj])) {
                if (ii !== jj) {
                    A[ii][jj] = 0
                }
                else {
                    A[ii][jj] = P[ii][jj] ** 0.5
                }
            }
        }
    }
    let s = []
    for (let index = 0; index < n; index++) {
        let stateCorr = state.slice()
        for (let jj = 0; jj < 6; jj++) {
            stateCorr = math.transpose(math.add(math.transpose(stateCorr), math.dotMultiply(normalRandom(), math.column(A, jj))))
        }
        s.push(stateCorr[0])
    }
    return s
}

function calcSigmaProperties(sigma) {
    let averagePoint = sigma.reduce((a, b) => math.add(a,b), [0,0,0,0,0,0]).map(s => s / sigma.length)
    // let std = sigma.reduce((a, b) => math.add(a,math.subtract(b, averagePoint).map(b => b ** 2)), [0,0,0,0,0,0]).map(s => s / sigma.length)
    let std = sigma.map(s => math.subtract(s, averagePoint))
    std = std.reduce((a, b) => math.add(a, math.multiply(math.transpose([b]), [b])), math.zeros([6,6])).map(s => s.map(t => t / sigma.length))
    return {averagePoint, P: std}
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

function padNumbers(n) {
    n = String(n)
    while (n.length < 2) {
        n = '0' + n
    }

    return n
}

function induceBurnError(event) {
    let inputs = event.target.parentElement.parentElement.getElementsByTagName('input');
    let r = Number(inputs[0].value)
    let i = Number(inputs[1].value)
    let c = Number(inputs[2].value)
    let angStd = Number(inputs[3].value)
    let rangeStd = Number(inputs[4].value) / 100

    let dV = math.norm([r, i, c])
    dV = dV * rangeStd * normalRandom() + dV

    let az = math.atan2(i, r) * 180 / Math.PI
    az = az + angStd * normalRandom()
    az *= Math.PI / 180
    console.log(r, i, c);
    let el = math.atan2(c, math.norm([r, i])) * 180 / Math.PI
    el = el + angStd * normalRandom()
    el *= Math.PI / 180

    r = dV * Math.cos(az) * Math.cos(el)
    i = dV * Math.sin(az) * Math.cos(el)
    c = dV * Math.sin(el)
    inputs[0].value = r.toFixed(3)
    inputs[1].value = i.toFixed(3)
    inputs[2].value = c.toFixed(3)
}

function importCov(event) {
    let input = event.target.value
    try {
        input = JSON.parse(input)
        input = choleskyDecomposition(input.std)
        let err_inputs = document.getElementsByTagName('input');
        err_inputs[5].value =  input[0][0].toFixed(5)
        err_inputs[6].value =  input[1][0].toFixed(5)
        err_inputs[7].value =  input[1][1].toFixed(5)
        err_inputs[8].value =  input[2][0].toFixed(5)
        err_inputs[9].value =  input[2][1].toFixed(5)
        err_inputs[10].value = input[2][2].toFixed(5)
        err_inputs[11].value = input[3][0].toFixed(5)
        err_inputs[12].value = input[3][1].toFixed(5)
        err_inputs[13].value = input[3][2].toFixed(5)
        err_inputs[14].value = input[3][3].toFixed(5)
        err_inputs[15].value = input[4][0].toFixed(5)
        err_inputs[16].value = input[4][1].toFixed(5)
        err_inputs[17].value = input[4][2].toFixed(5)
        err_inputs[18].value = input[4][3].toFixed(5)
        err_inputs[19].value = input[4][4].toFixed(5)
        err_inputs[20].value = input[5][0].toFixed(5)
        err_inputs[21].value = input[5][1].toFixed(5)
        err_inputs[22].value = input[5][2].toFixed(5)
        err_inputs[23].value = input[5][3].toFixed(5)
        err_inputs[24].value = input[5][4].toFixed(5)
        err_inputs[25].value = input[5][5].toFixed(5)

    }
    catch (error) {
        console.error('Not a valid covariance')
    }
    setTimeout(() => {
        event.target.value = ''
    }, 3000)
}

function covFromInputs(r) {
    let err_inputs = document.getElementsByTagName('input')
    let cov = math.zeros([6,6])
    cov[0][0] = Number(err_inputs[5].value) < 1e-8 ? 1e-8 : Number(err_inputs[5].value)
    cov[1][0] = Number(err_inputs[6].value)
    cov[1][1] = Number(err_inputs[7].value) < 1e-8 ? 1e-8 : Number(err_inputs[7].value)
    cov[2][0] = Number(err_inputs[8].value)
    cov[2][1] = Number(err_inputs[9].value)
    cov[2][2] = Number(err_inputs[10].value) < 1e-8 ? 1e-8 : Number(err_inputs[10].value)
    cov[3][0] = Number(err_inputs[11].value)
    cov[3][1] = Number(err_inputs[12].value)
    cov[3][2] = Number(err_inputs[13].value)
    cov[3][3] = Number(err_inputs[14].value) < 1e-12 ? 1e-12 : Number(err_inputs[14].value)
    cov[4][0] = Number(err_inputs[15].value)
    cov[4][1] = Number(err_inputs[16].value)
    cov[4][2] = Number(err_inputs[17].value)
    cov[4][3] = Number(err_inputs[18].value)
    cov[4][4] = Number(err_inputs[19].value) < 1e-12 ? 1e-12 : Number(err_inputs[19].value)
    cov[5][0] = Number(err_inputs[20].value)
    cov[5][1] = Number(err_inputs[21].value)
    cov[5][2] = Number(err_inputs[22].value)
    cov[5][3] = Number(err_inputs[23].value)
    cov[5][4] = Number(err_inputs[24].value)
    cov[5][5] = Number(err_inputs[25].value) < 1e-12 ? 1e-12 : Number(err_inputs[25].value)
    let p = math.multiply(cov, math.transpose(cov))
    // r = math.concat(math.concat(r, math.zeros([3,3])), math.concat(math.zeros([3,3]), r), 0)
    return choleskyDecomposition(math.multiply(r, p, math.transpose(r)))
}
n = 2 * Math.PI / 86164

function Ric2EciRedux(rC = [(398600.4418 / n ** 2)**(1/3), 0, 0], drC = [0, (398600.4418 / ((398600.4418 / n ** 2)**(1/3))) ** (1/2), 0]) {
    let h = math.cross(rC, drC);
    let ricX = math.dotDivide(rC, math.norm(rC));
    let ricZ = math.dotDivide(h, math.norm(h));
    let ricY = math.cross(ricZ, ricX);

    let ricXd = math.dotMultiply(1 / math.norm(rC), math.subtract(drC, math.dotMultiply(math.dot(ricX, drC), ricX)));
    let ricYd = math.cross(ricZ, ricXd);
    let ricZd = [0,0,0];

    let C = math.transpose([ricX, ricY, ricZ]);
    let Cd = math.transpose([ricXd, ricYd, ricZd]);
    let R1 = math.concat(C, math.zeros([3,3]), 1)
    let R2 = math.concat(Cd, C, 1)
    let R = math.concat(R1, R2, 0)
    return R
}

function toExponentialDigits(inNumber = 1234, nDig = 3, nExp = 2) {
    inNumber = inNumber.toExponential(nDig)
    inNumber = inNumber.split('e')
    inNumber = [inNumber[0], inNumber[1].slice(0,1), inNumber[1].slice(1)]
    while (inNumber[2].length < nExp) {
        inNumber[2] = 0 + inNumber[2]
    }
    return inNumber[0] + 'e' + inNumber[1] + inNumber[2]
}

function propToTime(state, dt) {
    state = PosVel2CoeNew(state.slice(0,3), state.slice(3,6))
    state.tA = propTrueAnomaly(state.tA, state.a, state.e, dt)
    state = Object.values(Coe2PosVelObject(state))
    return state
}

function PosVel2CoeNew(r = [42157.71810012396, 735.866, 0], v = [-0.053652257639536446, 3.07372487580565, 0.05366]) {
    let mu = 398600.4418;
    let rn = math.norm(r);
    let vn = math.norm(v);
    let h = math.cross(r, v);
    let hn = math.norm(h);
    let n = math.cross([0, 0, 1], h);
    let nn = math.norm(n);
    if (nn < 1e-6) {
        n = [1, 0, 0];
        nn = 1;
    }
    var epsilon = vn * vn / 2 - mu / rn;
    let a = -mu / 2 / epsilon;
    let e = math.subtract(math.dotDivide(math.cross(v, h), mu), math.dotDivide(r, rn));
    let en = math.norm(e);
    if (en < 1e-6) {
        e = n.slice();
        en = 0;
    }
    let inc = Math.acos(math.dot(h, [0, 0, 1]) / hn);
    let ra = Math.acos(math.dot(n, [1, 0, 0]) / nn);
    if (n[1] < 0) {
        ra = 2 * Math.PI - ra;
    }

    let ar, arDot;
    if (en < 1e-6) {
        arDot = math.dot(n, e) / nn;
    } else {
        arDot = math.dot(n, e) / en / nn;
    }
    if (arDot > 1) {
        ar = 0;
    } else if (arDot < -1) {
        ar = Math.PI;
    } else {
        ar = Math.acos(arDot);
    }
    if (e[2] < 0) {
        ar = 2 * Math.PI - ar;
    } else if (inc < 1e-6 && e[1] < 0) {
        ar = 2 * Math.PI - ar;
    }
    let ta, taDot;
    if (en < 1e-6) {
        taDot = math.dot(r, e) / rn / nn;
    } else {
        taDot = math.dot(r, e) / rn / en;
    }
    if (taDot > 1) {
        ta = 0;
    } else if (taDot < -1) {
        ta = Math.PI;
    } else {
        ta = Math.acos(taDot);
    }
    if (math.dot(v, e) > 1e-6) {
        ta = 2 * Math.PI - ta;
    }
    // console.log([a,en,inc,ra,ar,ta])
    return {
        a: a,
        e: en,
        i: inc,
        raan: ra,
        arg: ar,
        tA: ta
    };
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