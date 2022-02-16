let windowOptions = {
    p_error_ground: 5000,
    v_error_ground: 2,
    p_error: null,
    v_error: null,
    inputData: null,
    epochDate: null,
    cats_data: [
        [0.66, 1],
        [36, 0.57],
        [117, 2.38],
    ],
    activePoint: null
}
function stringToCoes(oldTle) {
    oldTle = oldTle.split(/\n/);
    oldTle[0] = oldTle[0].split(/ +/);
    oldTle[1] = oldTle[1].split(/ +/);
    // console.log(oldTle[0]);
    return {
        Number: oldTle[1][1],
        epoch: Number(oldTle[0][2]) ? oldTle[0][2] : oldTle[0][3],
        inc: Number(oldTle[1][2]),
        raan: Number(oldTle[1][3]),
        arg: Number(oldTle[1][5]),
        mA: Number(oldTle[1][6]),
        ecc: Number('0.' + oldTle[1][4]),
        mm: oldTle[1][7],
    }
}

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
function loadFileAsText(event) {
    fileToLoad = event.path[0].files[0];
    let ext = fileToLoad.name.split('.')[1];
    let fileReader = new FileReader();
    fileReader.onload = function (fileLoadedEvent) {

        console.log('hey');
        let text = fileLoadedEvent.target.result;
        text = text.split('EphemerisTimePosVel');
        text[1] = text[1].split(/\n+/);
        text[0] = text[0] + 'EphemerisTimePosVel' + text[1][0];
        text[1].shift();
        windowOptions.inputData = text;
        let date = text[0].substr(385);
        windowOptions.epochDate = new Date(date.substr(0,date.search('UTCG') - 1));
    };
    if (ext === 'e') {
        document.getElementById('e-date').style.visibility = 'visible';
    }
    fileReader.readAsText(fileToLoad, "UTF-8");
}

function exportFile() {
    let err_inputs = document.getElementsByTagName('input');
    let desDate = new Date(err_inputs[0].value);
    if (desDate == 'Invalid Date') return;
    let timeDiff = desDate - windowOptions.epochDate;
    timeDiff /= 1000;
    if (timeDiff < 0) return alert('Time must be during the imported .e file')
    let timeLine = windowOptions.inputData[1].findIndex(line => {
        return Number(line.split(/ +/)[1]) >= timeDiff;
    });
    // Pull initial state from ephemeris file
    let stateEphemeris = windowOptions.inputData[1].slice(timeLine + 1, timeLine + 2)
    state = stateEphemeris[0].split(/ +/).slice(1, stateEphemeris[0].length).map(s => Number(s))
    let t = state.shift()
    
    //Prop initial state state back to desired time (to avoid any potential burn at desired epoch)
    for (let ii = 0; ii < 10; ii++) state = runge_kutta(-(t - timeDiff) / 10, [state])
    t = timeDiff
    // Add gaussian error to the initial state
    state = state.map((s, ii) => s + Number(err_inputs[ii+1].value) * 1000 * normalRandom())
    
    // Define initial covariance matrix
    let P = math.diag([(Number(err_inputs[1].value) * 1000) ** 2, 
                       (Number(err_inputs[2].value) * 1000) ** 2, 
                       (Number(err_inputs[3].value) * 1000) ** 2, 
                       (Number(err_inputs[4].value) * 1000) ** 2, 
                       (Number(err_inputs[5].value) * 1000) ** 2, 
                       (Number(err_inputs[6].value) * 1000) ** 2]) 
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
    let header = windowOptions.inputData[0].split(/\n/).filter(line => line.search('NumberOfEp') === -1).join('\n')
    let outText = header + '\n\n';
    outText += stateEphemeris.join('\n')
    outText += '\n\n\n' + 'CovarianceTimePos\n\n'
    outText += pEphemeris.join('\n')
    outText += '\n\n\n' + 'END Ephemeris'
    downloadFile(windowOptions.name + '_error.e', outText);
}

function handleMouseEnter(el) {
    if (event.type === 'mouseleave') {
        if (!document.getElementById('tle-area')) return;
        if (document.getElementById('tle-area').value !== '') return;
        el.target.innerHTML = 'Drag ephemeris file into area...';
        return;
    }
    if (windowOptions.inputData) return;
    if (document.getElementById('tle-area')) return;
    el.target.innerHTML = 'Enter TLE Below <br> <textarea oninput="hanldeTle(this)" id="tle-area" rows="2" cols="75">';
}

function coesToTle(coes) {
    return `1 ${coes.Number}U          ${coes.epoch}  .00000000  00000-0  00000-0 0 00006\n2 ${coes.Number} ${addZeros(coes.inc.toFixed(4), 3)} ${addZeros(coes.raan.toFixed(4), 3)} ${coes.ecc.toFixed(7).split('.')[1]} ${addZeros(coes.arg.toFixed(4), 3)} ${addZeros(coes.mA.toFixed(4), 3)} ${coes.mm}`
}

function introduceTleError(coes) {
    let total_error = Number(document.getElementById('error-std').innerText) / 1000;
    let p_error = Math.sqrt(Math.pow(total_error, 2) / 4);
    // console.log(p_error);
    let a_sat = Math.pow(398600.4418 * Math.pow(86164*Number(coes.mm) / 2 / Math.PI, 2), 1/3);
    p_error /= a_sat;
    p_error *= 180 / Math.PI;
    // console.log(p_error);
    coes.arg += p_error * normalRandom();
    coes.inc += p_error * normalRandom();
    coes.mA += p_error * normalRandom();
    coes.raan += p_error * normalRandom();
}

function hanldeTle(el) {
    try {
        let coes = stringToCoes(el.value);
        introduceTleError(coes)
        document.getElementById('altered-tle').getElementsByTagName('textarea')[0].value =  coesToTle(coes);
        navigator.clipboard.writeText(document.getElementById('altered-tle').getElementsByTagName('textarea')[0].value)
    }
    catch (e) {
        console.error('TLE not recognized')
    }
}

function testDrop(event) {
    event.preventDefault();
    fileToLoad = event.dataTransfer.files[0];

    windowOptions.name = fileToLoad.name.split('.')[0]
    // event.target.innerText = fileToLoad.name;
    let ext = fileToLoad.name.split('.')[1];
    let fileReader = new FileReader();
    fileReader.onload = function (fileLoadedEvent) {
        // console.log(fileLoadedEvent);
        let text = fileLoadedEvent.target.result;
        text = text.split('EphemerisTimePosVel');
        text[1] = text[1].split(/\n+/);
        text[0] = text[0] + 'EphemerisTimePosVel' + text[1][0];
        text[1].shift();
        windowOptions.inputData = text;
        let date = text[0].substr(text[0].search('point: ') + 6);
        windowOptions.epochDate = new Date(date.substr(0,date.search('UTCG') - 1));
        // console.log(windowOptions);
        if (document.getElementById('des-date').value !== '') {
            exportFile();
        }
        else {
            document.getElementById('des-date').style.backgroundColor = 'rgb(255,200,200)'
        }
    };
    fileReader.readAsText(fileToLoad, "UTF-8");
}

function getPos(el) {
    for (var lx=0, ly=0;
        el != null;
        lx += el.offsetLeft, ly += el.offsetTop, el = el.offsetParent);
    return {x: lx,y: ly};
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

function addZeros(num, dec) {
    let alteredNum = num.split('.');
    while (alteredNum[0].length < dec) {
        alteredNum[0] = '0' + alteredNum[0]
    }
    // console.log(alteredNum);
    return alteredNum[0] + '.' + alteredNum[1];
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

function sphericalEvenPoints(dV, n = 20) {
    let gr = (1 + 5 ** 0.5) / 2, w = 3 ** 0.5
    let ii = math.add(math.range(0, n), 0.5)._data
    let data = []
    for (let jj = 0; jj < ii.length; jj++) {
        let phi = math.acos(1 - 2 * ii[jj] / n)
        let theta = 2 * Math.PI * ii[jj] / gr
        data.push(math.dotMultiply(w * dV, [
            math.cos(theta) * math.sin(phi),
            math.sin(theta) * math.sin(phi),
            math.cos(phi)
        ]))

    }
    return data
}