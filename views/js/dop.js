let cnvs1 = setupLowerCanvas()
let ctx1 = cnvs1.getContext('2d')
let cnvs2 = setupUpperCanvas()
cnvs2.onclick = (event) => {
    let x = event.offsetX
    let y = event.offsetY
    if (event.ctrlKey) {
        let lat = 90 - y / cnvs2.height * 180
        let long = -180 + x / cnvs2.width * 360
        console.log(lat, long);
        mainWindow.focusLocation[0] = {
            lat, long, hist: []
        }
    }
    let zone = cnvs2.width / 100
    let closePoints = []
    mainWindow.satPixels.forEach((sat, ii) => {
        if (math.norm([sat.x - x, sat.y - y]) < zone) closePoints.push(ii)
    })
    if (closePoints.length === 0) return
    mainWindow.satellites[closePoints[0]].active = !mainWindow.satellites[closePoints[0]].active
}
cnvs2.onmousemove = (event) => {
    let x = event.offsetX
    let y = event.offsetY
    let zone = cnvs2.width / 100
    let closePoints = []
    mainWindow.satPixels.forEach((sat, ii) => {
        if (math.norm([sat.x - x, sat.y - y]) < zone) closePoints.push(ii)
    })
    if (closePoints.length === 0) {
        mainWindow.focusObject = undefined
        cnvs2.style.cursor = 'default'
        return
    }
    cnvs2.style.cursor = 'pointer'
    mainWindow.focusObject = closePoints[0]
}
let ctx2 = cnvs2.getContext('2d')
ctx2.textAlign = 'center'
ctx2.textBaseline = 'middle'
ctx2.font = `${window.innerHeight / 50}px serif`;
let startTime = new Date(new Date() - (-21600000))
mainWindow = {
    startTime,
    time: 0,
    satellites: generateGenericPnt(startTime),
    satPixels: [],
    focusObject: undefined,
    focusLocation: [{
        lat: 0,
        long: 0,
        hist: []
    }],
    sigmaR: 6.7 // from wikipedia
}
function setupLowerCanvas() {
    let cnvs1 = document.createElement('canvas')
    cnvs1.style.position = 'fixed'
    cnvs1.style.top = '0px'
    cnvs1.style.left = '0px'
    cnvs1.style.width = '100vw'
    cnvs1.style.height = '100vh'
    cnvs1.width = window.innerWidth
    cnvs1.height = window.innerHeight
    document.getElementsByTagName('body')[0].append(cnvs1)
    let ctx1 = cnvs1.getContext('2d')
    let img = new Image()
    img.src = './Media/2_no_clouds_4k.jpg'
    img.onload = function(){     
        ctx1.drawImage(img,0,0,cnvs1.width, cnvs1.height); 
    }       
    return cnvs1
}

function setupUpperCanvas() {
    let cnvs1 = document.createElement('canvas')
    cnvs1.style.position = 'fixed'
    cnvs1.style.top = '0px'
    cnvs1.style.left = '0px'
    cnvs1.style.width = '100vw'
    cnvs1.style.height = '100vh'
    cnvs1.style.zIndex = 10
    cnvs1.width = window.innerWidth
    cnvs1.height = window.innerHeight
    document.getElementsByTagName('body')[0].append(cnvs1)     
    return cnvs1
}

function generateGenericPnt(time, options = {}) {
    let {planes = 6, satInPlane = 4, inc = 63} = options
    let plane = 0, delta = 0
    let sma = ((43082 / 2 / Math.PI) ** 2 * 398600.4418)**(1/3)
    satellites = [], ii = 1
    while (plane < 360) {
        position = 0
        while (position < 360) {
            satellites.push({active: true, epoch: time, name: ii, a: sma, e: 0, i: inc * Math.PI / 180, raan: plane * Math.PI / 180, arg: 0, tA: (delta+position) * Math.PI / 180})
            ii++
            position += 360 / satInPlane
        }
        plane += 360 / planes
        delta += 90 / satInPlane
    }
    return satellites
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

function drawSatellitePositions( time = 0, satellites = mainWindow.satellites, cnvs = cnvs2, color = 'black') {
    let ctx = cnvs.getContext('2d')
    ctx.fillStyle = color
    ctx.textBaseline = 'top'
    mainWindow.satPixels = []
    let satellitesLatLong = satellites.map(sat => Object.values(Coe2PosVelObject(sat)))
        .map(sat => propToTime(sat, time))
        .map(sat => fk5ReductionTranspose(sat.slice(0,3), new Date(mainWindow.startTime - (-time))))
        .map(sat => {
            return {long: math.atan2(sat[1], sat[0]) * 180 / Math.PI, lat: math.atan2(sat[2], math.norm(sat.slice(0,2))) * 180 / Math.PI}
        })
        .map(sat => latLong2Pixels(sat.lat, sat.long, cnvs))
        .forEach((sat, ii) => {
            mainWindow.satPixels.push({x: sat.x, y: sat.y})
            ctx.fillStyle = ii === mainWindow.focusObject ? 'yellow' : satellites[ii].active ? 'black' : 'rgb(200,100,100)'
            ctx.beginPath()
            ctx.arc(sat.x, sat.y, cnvs.width / 100, 0, 2 * Math.PI)
            ctx.fill()
            ctx.fillText(satellites[ii].name, sat.x, sat.y + cnvs.width / 100)
        })
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

function propCoeJ2(state, dt) {
    state.tA = propTrueAnomalyj2(state.tA, state.a, state.e, state.i, dt)
    let j2 = 1.082626668e-3
    let n = (398600.4418 / state.a / state.a / state.a) ** 0.5
    let rEarth = 6378.1363
    let p = state.a * (1 - state.e ** 2)
    let raanJ2Rate = -3*n*rEarth*rEarth*j2*Math.cos(state.i) / 2 / p / p
    let argJ2Rate = 3 * n * rEarth * rEarth * j2 * (4 - 5 * Math.sin(state.i) ** 2) / 4 / p / p 
    state.raan += raanJ2Rate * dt
    state.arg += argJ2Rate * dt
    return state
}

function propToTime(state, dt, j2 = true) {
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

function PosVel2CoeNew(r = [42157.71810012396, 735.866, 0], v = [-0.053652257639536446, 3.07372487580565, 0.05366]) {
    let mu = 398600//.4418;
    let rn = math.norm(r);
    let vn = math.norm(v);
    let h = math.cross(r, v);
    let hn = math.norm(h);
    let n = math.cross([0, 0, 1], h);
    let nn = math.norm(n);
    if (nn < 1e-9) {
        n = [1, 0, 0];
        nn = 1;
    }
    var epsilon = vn * vn / 2 - mu / rn;
    let a = -mu / 2 / epsilon;
    // console.log(math.subtract(math.dotDivide(math.cross(v, h), mu), math.dotDivide(r, rn)))
    let e = math.dotDivide(math.subtract(math.dotMultiply(vn ** 2 - mu / rn, r),  math.dotMultiply(math.dot(r, v), v)), mu)
    let en = math.norm(e);
    if (en < 1e-9) {
        e = n.slice();
        en = 0;
    }
    let inc = Math.acos(h[2] / hn);
    let ra = Math.acos(n[0] / nn);
    if (n[1] < 0) {
        ra = 2 * Math.PI - ra;
    }
    // console.log({
    //     n,e
    // });
    let ar
    let arDot = math.dot(n, e) / en / nn;
    if (arDot > 1) {
        ar = 0;
    } else if (arDot < -1) {
        ar = Math.PI;
    } else {
        ar = Math.acos(arDot);
    }
    if (e[2] < 0 || (inc < 1e-8 && e[1] < 0)) {
        ar = 2 * Math.PI - ar;
    }
    let ta;
    let taDot = math.dot(r, e) / rn / en
    if (taDot > 1) {
        ta = 0;
    } else if (taDot < -1) {
        ta = Math.PI;
    } else {
        ta = Math.acos(taDot);
    }
    if (math.dot(v, e) > 0 || math.dot(v, r) < 0) {
        ta = 2 * Math.PI - ta;
    }
    // // console.log([a,en,inc,ra,ar,ta])
    return {
        a: a,
        e: en,
        i: inc,
        raan: ra,
        arg: ar,
        tA: ta
    };
}

function fk5ReductionTranspose(r=[-1033.479383, 7901.2952754, 6380.3565958], date=new Date(2004, 3, 6, 7, 51, 28, 386)) {
    // Based on Vallado "Fundamentals of Astrodyanmics and Applications" algorithm 24, p. 228 4th edition
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
    r = math.multiply(math.transpose(w), math.transpose(p), math.transpose([r]))
    return math.squeeze(r)
}

function siderealTime(jdUti=2448855.009722) {
    let tUti = (jdUti - 2451545) / 36525
    return ((67310.548 + (876600*3600 + 8640184.812866)*tUti + 0.093104*tUti*tUti - 6.2e-6*tUti*tUti*tUti) % 86400)/240
}

function julianDate(yr=1996, mo=10, d=26, h=14, min=20, s=0) {
    return 367 * yr - Math.floor(7*(yr+Math.floor((mo+9)/12)) / 4) + Math.floor(275*mo/9) + d + 1721013.5 + ((s/60+min)/60+h)/24
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

function latLong2Pixels(lat, long, cnvs) {
    long += 180
    long = long > 360 ? long - 360 : long
    lat = 90 - lat
    return {
        x: cnvs.width * long / 360,
        y: cnvs.height * lat/ 180
    }
}

function sensorGeodeticPosition(lat = 39.586667, long = -105.64, h = 4.347667) {
    lat *= Math.PI / 180

    // let eEarth = 0.081819221
    let eEarth = 0.006694385 ** 0.5
    let rEarth = 6378.1363

    let cEarth = rEarth / (1 - eEarth ** 2 * Math.sin(lat) ** 2) ** 0.5
    let sEarth = rEarth * (1 - eEarth ** 2) / (1 - eEarth ** 2 * Math.sin(lat) ** 2) ** 0.5
    
    let rSigma = (cEarth + h) * Math.cos(lat)
    let rk = (sEarth + h) * Math.sin(lat)
    // console.log(rSigma, rk / math.tan(lat));
    r = math.squeeze(math.multiply(rotationMatrices(long, 3),math.transpose([[rSigma, 0, rk]])));
    rij = math.dotDivide(r.slice(0,2) , math.norm(r.slice(0,2)) /(rk / math.tan(lat)))
    // console.log(rij, r);
    return {r, vert: [...rij, r[2]]};
    
}

function razel(r_eci=[-5505.504883, 56.449170, 3821.871726], date=new Date(1995, 4, 20, 3, 17, 02, 000), lat=39.007, long=-104.883, h = 0) {
    let r_ecef = fk5ReductionTranspose(r_eci, date)
    let r_site_ecef = sensorGeodeticPosition(lat, long, h).r
    let rho = math.transpose([math.subtract(r_ecef, r_site_ecef)])
    lat *= Math.PI / 180
    long*= Math.PI / 180
    let r = [[Math.sin(lat) * Math.cos(long), -Math.sin(long), Math.cos(lat) * Math.cos(long)],
             [Math.sin(lat) * Math.sin(long), Math.cos(long), Math.cos(lat) * Math.sin(long)],
             [-Math.cos(lat), 0, Math.sin(lat)]]
    rho = math.squeeze(math.multiply(math.transpose(r), rho))
    let el = Math.asin(rho[2] / math.norm(rho)) * 180 / Math.PI
    let az = Math.atan2(rho[1], -rho[0]) * 180 / Math.PI
    r = math.norm(rho)
    return {el, az, r}
}

function generateVisibleSatellites(lat = 0, long = 0, satellites = mainWindow.satellites) {
    let satAzEl = satellites.filter(sat => sat.active).map(sat => Object.values(Coe2PosVelObject(sat)))
        .map(sat => propToTime(sat, mainWindow.time))
        .map(sat => razel(sat.slice(0,3), new Date(mainWindow.startTime - (-mainWindow.time)), lat, long))
    let minEl = 5
    let visibleSats = satellites.filter(sat => sat.active).filter((sat, ii) => satAzEl[ii].el > minEl)
    return visibleSats
}

function animationLoop() {
    cnvs2.getContext('2d').clearRect(0,0,cnvs2.width, cnvs2.height)
    drawSatellitePositions(mainWindow.time)
    mainWindow.time += 15
    for (let index = 0; index < mainWindow.focusLocation.length; index++) {
        let visSats = generateVisibleSatellites(mainWindow.focusLocation[index].lat, mainWindow.focusLocation[index].long)
        // drawSatellitePositions(mainWindow.time, visSats, cnvs2, 'red')
        let dop = generateDop(mainWindow.focusLocation[index].lat, mainWindow.focusLocation[index].long, visSats)
        textAtLocation(mainWindow.focusLocation[index].lat, mainWindow.focusLocation[index].long, `${(dop.pdop * mainWindow.sigmaR).toFixed(2)} m`)
    }
    window.requestAnimationFrame(animationLoop)
}

function generateDop(lat, long, satellites) {
    if (satellites === undefined) {
        satellites = generateVisibleSatellites(lat, long, mainWindow.satellites)
    }
    let r_site_ecef = sensorGeodeticPosition(lat, long, 0).r
    let satellitesPos = satellites.map(sat => Object.values(Coe2PosVelObject(sat)))
    .map(sat => propToTime(sat, mainWindow.time))
    .map(sat => fk5ReductionTranspose(sat.slice(0,3), new Date(mainWindow.startTime - (-mainWindow.time))))
    
    let a = []
    satellitesPos.forEach(sat => {
        let r = math.norm(math.subtract(sat, r_site_ecef))
        a.push([(sat[0] - r_site_ecef[0]) / r, (sat[1] - r_site_ecef[1]) / r, (sat[2] - r_site_ecef[2]) / r, -1])
    })
    let q = math.inv(math.multiply(math.transpose(a), a))
    let pdop = (q[1][1] + q[0][0] + q[2][2]) ** 0.5
    let tdop = q[3][3] ** 0.5
    let gdop = (pdop ** 2 + tdop ** 2) ** 0.5
    return {gdop, pdop, tdop}
}

function textAtLocation(lat = 0, long = 0, text = 'hey', cnvs = cnvs2, color = 'white') {
    let ctx = cnvs.getContext('2d')
    ctx.fillStyle = color
    let position = latLong2Pixels(lat,long,cnvs)
    ctx.beginPath()
    ctx.arc(position.x, position.y, cnvs.width / 200, 0, 2 * Math.PI)
    ctx.fill()
    ctx.fillText(text, position.x, position.y + cnvs.width / 200)

}

function addLocation(lat, long) {
    mainWindow.focusLocation.push({
        lat, long, hist: []
    })
}

function uploadSatellites() {
    if (event.target.id === 'upload-button') return document.getElementById('file-input').click()
    let screenAlert = document.getElementsByClassName('screen-alert');
    if (screenAlert.length > 0) screenAlert[0].remove();
    loadFileAsText(event.path[0].files[0])
}

function loadFileAsText(fileToLoad) {
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
    var fileReader = new FileReader();
    fileReader.onload = function (fileLoadedEvent) {
        var text = fileLoadedEvent.target.result.split('\n');
        let coes = []
        let line = 0
        while (line < text.length) {
            if (text[line].search('U') !== -1) {
                let line1 = text[line].split(/ +/);
                let line2 = text[line+1].split(/ +/);
                let e = Number('.' + line2[4])
                let mA = Number(line2[6]) * Math.PI / 180
                let eA = solveKeplersEquation(mA, e)
                let tA = Eccentric2True(e, eA)
                let newCoe = {
                    name: line2[1],
                    epoch: new Date(Number(20 + line1[3].slice(0,2)), 0,Number(line1[3].slice(2,6)),0,0,Number(line1[3].slice(5)) * 86400),
                    e: Number('.' + line2[4]),
                    i: Number(line2[2]) * Math.PI / 180,
                    raan: Number(line2[3]) * Math.PI / 180,
                    arg: Number(line2[5]) * Math.PI / 180,
                    tA,
                    a: (((86400 / Number(line2[7])) / 2 / Math.PI) ** 2 * 398600.4418) ** (1/3),
                    active: true
                }
                let delta = mainWindow.startTime - newCoe.epoch
                newCoe = propCoeJ2(newCoe, delta / 1000)
                newCoe.epoch = mainWindow.startTime
                coes.push(newCoe)
                line++
            }
            line++
        }
        mainWindow.satellites = coes
    };
    fileReader.readAsText(fileToLoad, "UTF-8");
}

function addGui() {
    let body = document.getElementsByTagName('body')[0]
    let div = document.createElement('div')
    div.style.backgroundColor = 'rgb(200,200,200)',
    div.style.position = 'fixed',
    div.style.top = '0',
    div.style.left = '0',
    div.style.width ='10vw',
    div.style.height = '10vw',
    div.style.zIndex = 10
    div.innerHTML = `
            <button id="upload-button" onclick="uploadSatellites()">Load Satellites</button>
            <input style="display: none" id="file-input" onchange="uploadSatellites()" type="file"/>
        `
    body.append(div)
}
addGui()