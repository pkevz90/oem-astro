let header
let data
let fileName
let epochDate

function normalRandom()
{
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
    let files = window.localStorage.files === undefined ? {} : JSON.parse(window.localStorage.files)
    let err_inputs = document.getElementsByTagName('input');
    let desDate = new Date(Number(err_inputs[2].value), Number(err_inputs[0].value) - 1, Number(err_inputs[1].value), Number(err_inputs[3].value), Number(err_inputs[4].value));
    if (desDate == 'Invalid Date') return;
    let timeDiff = desDate - epochDate;
    timeDiff /= 1000;
    if (timeDiff < 0) return alert('Time must be during the imported .e file')
    let timeLine = data[1].findIndex(line => {
        return Number(line.split(/ +/)[1]) >= timeDiff;
    });
    let saveName = 'sat' + math.floor(data[1][0].split(/ +/).filter(line => line !== '')[1]);
    // Pull initial state from ephemeris file
    let stateEphemeris = data[1].slice(timeLine + 1, timeLine + 2)
    state = stateEphemeris[0].split(/ +/).slice(1, stateEphemeris[0].length).map(s => Number(s))
    let t = state.shift()
    //Prop initial state state back to desired time (to avoid any potential burn at desired epoch)
    for (let ii = 0; ii < 10; ii++) {
        state = runge_kutta(-(t - timeDiff) / 10, [state])
    }
    t = timeDiff
    // Add gaussian error to the initial state
    state = state.map((s, ii) => s + Number(err_inputs[ii+5].value) * 1000 * normalRandom())
    // Define initial covariance matrix
    let P = math.diag([(Number(err_inputs[5].value) * 1000) ** 2, 
                       (Number(err_inputs[6].value) * 1000) ** 2, 
                       (Number(err_inputs[7].value) * 1000) ** 2, 
                       (Number(err_inputs[8].value) * 1000) ** 2, 
                       (Number(err_inputs[9].value) * 1000) ** 2, 
                       (Number(err_inputs[10].value) * 1000) ** 2]) 
    // If any elements of covariance are zero, set to arbitarily low number for numerical stability
    P = math.diag(math.diag(P).map(item => {
            return item < 1e-8 ? 1e-8 : item
    }))
    let pEphemeris = []
    pEphemeris.push(`${t} ${P[0][0]} 0 0 ${P[1][1]} 0 ${P[2][2]}`)
    stateEphemeris = [`${t} ${state[0]} ${state[1]} ${state[2]} ${state[3]} ${state[4]} ${state[5]}`]

    let timeDelta = 60
    for (let ii = 60; ii <= 12 * 3600; ii+=timeDelta) {
        let out = propCovariance(P, timeDelta, [state])
        state = out.state
        P = out.P
        stateEphemeris.push(`${t + ii} ${state[0]} ${state[1]} ${state[2]} ${state[3]} ${state[4]} ${state[5]}`); 
        pEphemeris.push(`${t + ii} ${P[0][0]} ${P[0][1]} ${P[0][2]} ${P[1][1]} ${P[1][2]} ${P[2][2]}`)
        if (isNaN(state[0])) {

            console.error('Error in state propagation');
            // console.log(P, state);
            return
        }
    }
    // Remove number of ephemeris points to default to read all points
    let header = data[0].split(/\n/).filter(line => line.search('NumberOfEp') === -1).join('\n')
    if (files[saveName] === undefined) {
        files[saveName] = {
            header,
            data: [{posVelData: stateEphemeris, covData: pEphemeris, startTime: timeDiff}]
        }
    }
    else {
        files[saveName].data.push({posVelData: stateEphemeris, covData: pEphemeris, startTime: timeDiff})
    }
    window.localStorage.files = JSON.stringify(files)
    console.log(JSON.parse(window.localStorage.files))
    exportConsolidated(files[saveName], 'bsa_' + fileName + '_' + padNumbers(desDate.getHours()) +  padNumbers(desDate.getMinutes()) + '.e')
}

function exportConsolidated(satelliteData, name) { 
    satelliteData = JSON.parse(JSON.stringify(satelliteData))
    let files = satelliteData.data
    files = files.sort((a, b) => a.startTime - b.startTime)
    for (let file = 0; file < files.length; file++) {
        let endTime = file === files.length - 1 ? 1e10 : files[file + 1].startTime
        // console.log(endTime);
        files[file].posVelData = files[file].posVelData.filter(data => Number(data.split(/ +/)[0]) < endTime)
        files[file].covData = files[file].covData.filter(data => Number(data.split(/ +/)[0]) < endTime)
        files[file].posVelData = files[file].posVelData.join('\n')
        files[file].covData = files[file].covData.join('\n')
    }
    let out = ''
    out += satelliteData.header + '\n'
    out += files.map(file => file.posVelData).join('\n')
    out += 'CovarianceTimePos \n\n'
    out += files.map(file => file.covData).join('\n')
    out += 'END Ephemeris'
    downloadFile(name, out)
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
        data = text;
        let date = text[0].substr(text[0].search('point: ') + 6);
        epochDate = new Date(date.substr(0,date.search('UTCG') - 1));
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
    // console.log(s,w);
    // console.log(s);
    s = s.map(point => {
        return [runge_kutta(dt, point)]
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

function generateSigmaPoints(P=[[25,0,0,0,0,0], [0,25,0,0,0,0],[0,0,25,0,0,0],[0,0,0,0.0001**2,0,0],[0,0,0,0,0.0001**2,0], [0,0,0,0,0,0.0001**2]], state = [[42164, 0, 0, 0, -((398600.4418 / 42164) ** (1/2)), 0]]) {
    let L = 6
    let w = [0.5]
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
    let s = [state]
    for (let jj = 0; jj < L; jj++) {
        s.push(math.transpose(math.add(math.transpose(state), math.dotMultiply((L / (1 - w[0])) ** (1/2), math.column(A, jj)))))
    }
    for (let jj = 0; jj < L; jj++) {
        s.push(math.transpose(math.subtract(math.transpose(state), math.dotMultiply((L / (1 - w[0])) ** (1/2), math.column(A, jj)))))
    }
    for (let jj = 0; jj < 2 * L; jj++) {
        w.push((1 - w[0]) / 2 / L)    
    }
    return {s, w}
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

function modelCov(n_ground = 2, n_space = 1, time = 5400) {
    let p = []
    // p[n_ground][n_space]
    p = null
    p = null
    p = [
        [13975.909, 982.571, 744.346, 12.361, 1.935, 0.71],
        [8366.232, 790.046, 541.382, 3.128, 0.906, 0.258],
        [6390.515, 691.149, 458.905, 1.308, 0.552, 0.145],
        [5425.6994, 620.201, 405.610, 0.711, 0.38, 0.096],
        [5061.81, 590.399, 380.624, 0.501, 0.297, 0.071],
        [4221.767, 498.078, 314.579, 0.371, 0.219, 0.048],
        [3955.416, 477.512, 292.136, 0.341, 0.196, 0.038],
        [3812.183, 483.021, 285.744, 0.336, 0.192, 0.032],
        [3355.082, 460.022, 255.481, 0.303, 0.18, 0.025]
    ]
    p = [
        [836.999, 687.854, 512.440, 0.819, 0.638, 0.489],
        [655.257, 527.588, 396.966, 0.33, 0.242, 0.189],
        [567.927, 447.685, 339.985, 0.197, 0.137, 0.108],
        [506.116, 390.520, 298.985, 0.135, 0.092, 0.071],
        [441.051, 333.24, 256.846, 0.097, 0.066, 0.048],
        [420.870, 311.652, 241.401, 0.08, 0.054, 0.037],
        [385.975, 280.486, 217.887, 0.064, 0.046, 0.028],
        [351.072, 250.825, 194.932, 0.053, 0.039, 0.022],
        [342.24, 240.936, 186.811, 0.047, 0.037, 0.018]
    ]
    p = [
        [260.726, 738.205, 237.811, 0.274, 0.696, 0.227],
        [182.585, 493.521, 161.177, 0.111, 0.228, 0.077],
        [157.512, 401.427, 133.793, 0.073, 0.119, 0.042],
        [143.519, 342.614, 117.096, 0.055, 0.073, 0.028],
        [130.011, 290.085, 101.995, 0.043, 0.046, 0.019],
        [127.782, 266.778, 96.635, 0.038, 0.033, 0.015],
        [121.136, 237.417, 88.592, 0.032, 0.024, 0.012],
        [116.479, 215.317, 82.636, 0.028, 0.018, 0.009],
        [112.967, 198.032, 77.966, 0.025, 0.014, 0.008]
    ]
    console.log(p);
}