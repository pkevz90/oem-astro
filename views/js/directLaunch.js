let mainWindow = {
    site: {
        lat: 30.4333,
        long: -91.16667,
        h: 10
    },
    sat: {
        epoch: new Date('24 Jun 2022 21:00:00.000'),
        coes: {
            a: 6900,
            e: 0,
            i: 80*Math.PI / 180,
            raan: 0,
            arg: 0,
            tA: 0 * Math.PI / 180
        }
    },
    startTime: new Date('24 Jun 2022 20:00:00.000')
}

function loopStartTime(startTime = mainWindow.startTime, loopTime = 72*3600, loopDelta = 60) {
    let state = [...document.getElementsByClassName('vector')].map(s => Number(s.value))
    let site = [...document.getElementsByClassName('site')].map(s => Number(s.value))
    mainWindow.site = {lat: site[0], long: site[1], h: site[2]}
    mainWindow.sat.coes = PosVel2CoeNew(state.slice(0,3), state.slice(3,6))
    mainWindow.sat.epoch = new Date(document.getElementById('sat-epoch').value)
    let options = []
    let time = 0
    while (time <= loopTime) {
        let loopStart = new Date(startTime - (-time*1000))
        let calc = calcInterceptTraj(mainWindow.site, mainWindow.sat, loopStart, 600)
        let velOptions = [calc.v1Opt1.v1, calc.v1Opt2.v1].filter(s => s !== undefined)
        velOptions.forEach(vel => {
            let el = 90-180 / Math.PI * math.acos(math.dot(vel, calc.siteECI) / math.norm(vel) / math.norm(calc.siteECI));
            if (el > 60) {
                let groundVel = math.cross([0,0,2 * Math.PI / 86164], calc.siteECI)
                let delV = math.norm(math.subtract(vel, groundVel))
                options.push({
                    time: loopStart.toString().split(' GMT')[0],
                    startState: [...calc.siteECI, ...vel],
                    tof: calc.tof,
                    delV
                })
            }
        })
        time += loopDelta;
    }
    let resultsDiv = document.getElementById('results-div')
    resultsDiv.innerHTML = ''
    let newHtml = ''
    let minIndex = options.findIndex(a => a.delV === Math.min(...options.map(s => s.delV))) 
    
    options.forEach((opt, ii) => {
        newHtml += `<div onclick="displayLaunch(this)" time="${opt.time}" state="${opt.startState.map(s => s.toFixed(3)).join(' ')}" tof="${opt.tof}" ${ii === minIndex ? 'style="font-weight: bolder;"' : ''}>${opt.time} [${opt.startState.map(s => s.toFixed(3)).join(' ')}] ${(opt.tof / 60).toFixed(1)} min ${opt.delV.toFixed(3)} km/s</div>`
    })
    resultsDiv.innerHTML = newHtml
    console.log(options);
}

function displayLaunch(el) {
    let time = new Date(el.getAttribute('time'))
    let tof = Number(el.getAttribute('tof'))
    console.log(time);
    let state = el.getAttribute('state').split(' ').map(s => Number(s))
    let stateSat = Object.values(Coe2PosVelObject(mainWindow.sat.coes))
    let period = 2 * Math.PI * (mainWindow.sat.coes.a ** 3 / 398600.4418) ** 0.5
    let startSatTime = new Date(time - (period * 2 - tof) * 1000)
    stateSat = propToTime(stateSat, (startSatTime - mainWindow.sat.epoch) / 1000, false)
    
    let timeSatProp = 0, stateSatHist = []
    while (timeSatProp <= period * 2) {
        stateSatHist.push({time: timeSatProp, state: propToTime(stateSat, timeSatProp, false)})
        timeSatProp += tof / 100
    }
    stateSatHist = stateSatHist.map(s => {
        return fk5ReductionTranspose(s.state.slice(0,3), new Date(startSatTime - (-s.time * 1000)))
    })
    stateSatHist = stateSatHist.map(s => {
        return {
            long: math.atan2(s[1], s[0]) * 180 / Math.PI,
            lat: 90-math.atan2(s[2], math.norm(s.slice(0,2))) * 180 / Math.PI
        }
    })
    let timeProp = 0, stateHist = []
    while (timeProp <= tof) {
        stateHist.push({time: timeProp, state: propToTime(state, timeProp, false)})
        timeProp += tof / 100
    }
    stateHist = stateHist.map(s => {
        return fk5ReductionTranspose(s.state.slice(0,3), new Date(time - (-s.time * 1000)))
    })
    stateHist = stateHist.map(s => {
        return {
            long: math.atan2(s[1], s[0]) * 180 / Math.PI,
            lat: 90-math.atan2(s[2], math.norm(s.slice(0,2))) * 180 / Math.PI
        }
    })
    let cnvs = document.createElement('canvas')
    cnvs.style.position = 'fixed'
    cnvs.style.width = '60%'
    cnvs.style.height = '70%'
    cnvs.style.left = '20%'
    cnvs.style.top = '15%'
    cnvs.width = 800
    cnvs.height = 450
    document.getElementsByTagName('body')[0].append(cnvs)
    let ctx = cnvs.getContext('2d')
    let img = new Image()
    img.src = './Media/2_no_clouds_4k.jpg'
    img.onload = function(){      
        ctx.drawImage(img,0,0,cnvs.width, cnvs.height);
        ctx.fillStyle = 'cyan'
        stateHist.forEach(point => {
            let long = point.long
            long += 180
            long = long > 360 ? long - 360 : long
            ctx.beginPath();
            ctx.arc(cnvs.width * long / 360, cnvs.height * point.lat/ 180, cnvs.width /600, 0, 2 * Math.PI);
            ctx.fill();
        })
        ctx.fillStyle = 'yellow'
        stateSatHist.forEach(point => {
            let long = point.long
            long += 180
            long = long > 360 ? long - 360 : long
            ctx.beginPath();
            ctx.arc(cnvs.width * long / 360, cnvs.height * point.lat/ 180, cnvs.width /600, 0, 2 * Math.PI);
            ctx.fill();
        })
    }
}

function estTof(siteECI, satECI) {
    function True2Eccentric(e, ta) {
        return Math.atan(Math.sqrt((1 - e) / (1 + e)) * Math.tan(ta / 2)) * 2;
    }
    let range = math.norm(math.subtract(siteECI, satECI.slice(0,3)))
    siteECI = math.norm(siteECI.slice(0,3))
    satECI = math.norm(satECI.slice(0,3))
    let per = (siteECI+range) * 0.0147
    let estA = (satECI + per) / 2
    let estE = (satECI - per) / (satECI + per)
    let n = (398600.4418 / estA ** 3) ** 0.5
    let p = estA * (1 - estE ** 2)
    let nu = math.acos((p / siteECI - 1) / estE)
    let eccA = True2Eccentric(estE, nu)
    let meanA = eccA - estE * Math.sin(eccA)
    let tof = (Math.PI - meanA) / n
    return tof
}

function calcInterceptTraj(site = mainWindow.site, sat = mainWindow.sat, startTime = mainWindow.startTime, tof=4*3600) {
    let jdTime = julianDate(startTime.getFullYear(), startTime.getMonth() + 1, startTime.getDate(), startTime.getHours(), startTime.getMinutes(), startTime.getSeconds() + tof)
    let sunEci = sunFromTime(jdTime)
    // sunEci = math.dotDivide(sunEci, math.norm(sunEci))
    let siteECEF = sensorGeodeticPosition(site.lat, site.long, site.h).r
    let siteECI = fk5Reduction(siteECEF, startTime)
    let satState = Object.values(Coe2PosVelObject(sat.coes))
    tof = estTof(siteECI, satState)
    satState = propToTime(satState, (startTime - sat.epoch) / 1000 + tof, false)
    let v1Opt1 = solveLambertsProblem(siteECI, satState.slice(0,3), tof, 0, true)
    let v1Opt2 = solveLambertsProblem(siteECI, satState.slice(0,3), tof, 0, false)
    // let v1 = math.dot(v1Opt1.v1, siteECI) > 0 ? v1Opt1.v1 : v1Opt2.v1
    // let launchState = [...siteECI, ...v1];
    // let launchStateFuture = propToTime(launchState, tof - 300, false)
    // let satStateFuture = propToTime(Object.values(Coe2PosVelObject(sat.coes)), (startTime - sat.epoch) / 1000 + tof - 300, false)
    // let relState = math.subtract(launchStateFuture, satStateFuture)
    // sunEci = math.add(sunEci, satStateFuture.slice(0,3))
    // let cats = math.acos(math.dot(relState.slice(0,3), sunEci) / math.norm(relState.slice(0,3)) / math.norm(sunEci)) * 180 / Math.PI
    return {v1Opt1, v1Opt2, siteECI, tof}
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
    let mu = 398600.4418;
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

function sunFromTime(jdUti=2449444.5) {
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

function julianDate(yr=1996, mo=10, d=26, h=14, min=20, s=0) {
    return 367 * yr - Math.floor(7*(yr+Math.floor((mo+9)/12)) / 4) + Math.floor(275*mo/9) + d + 1721013.5 + ((s/60+min)/60+h)/24
}

function siderealTime(jdUti=2448855.009722) {
    let tUti = (jdUti - 2451545) / 36525
    return ((67310.548 + (876600*3600 + 8640184.812866)*tUti + 0.093104*tUti*tUti - 6.2e-6*tUti*tUti*tUti) % 86400)/240
}

function julianDate(yr=1996, mo=10, d=26, h=14, min=20, s=0) {
    return 367 * yr - Math.floor(7*(yr+Math.floor((mo+9)/12)) / 4) + Math.floor(275*mo/9) + d + 1721013.5 + ((s/60+min)/60+h)/24
}

function sensorGeodeticPosition(lat = 39.586667, long = -105.64, h = 4.347667) {
    lat *= Math.PI / 180

    // let eEarth = 0.081819221
    let eEarth = 0.006694385 ** 0.5
    let rEarth = 6378.1363
    let rFocus = eEarth * rEarth

    let cEarth = rEarth / (1 - eEarth ** 2 * Math.sin(lat) ** 2) ** 0.5
    let sEarth = rEarth * (1 - eEarth ** 2) / (1 - eEarth ** 2 * Math.sin(lat) ** 2) ** 0.5
    
    let rSigma = (cEarth + h) * Math.cos(lat)
    let rk = (sEarth + h) * Math.sin(lat)
    // console.log(rSigma, rk / math.tan(lat));
    r = math.squeeze(math.multiply(rotationMatrices(long, 3),math.transpose([[rSigma, 0, rk]])));
    rij = math.dotDivide(r.slice(0,2) , math.norm(r.slice(0,2)) /(rk / math.tan(lat)))
    // console.log(rij, r);
    return {r};
    
}

function fk5Reduction(r=[-1033.479383, 7901.2952754, 6380.3565958], date=new Date(2004, 3, 6, 7, 51, 28, 386)) {
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
    r = math.multiply(p, w, math.transpose([r]))
    return math.squeeze(r)
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

function solveLambertsProblem(r1_vec, r2_vec, tMan, Nrev, long) {
    let r1 = math.norm(r1_vec);
    let r2 = math.norm(r2_vec);
    let cosNu = math.dot(r1_vec, r2_vec) / r1 / r2;
    if (Math.abs(cosNu + 1) < 1e-3) return 'collinear'
    let sinNu = Math.sqrt(1 - cosNu**2);
    let mu = 3.986004418e5;
    if (!long) sinNu *= -1;
    k = r1 * r2 * (1 - cosNu);
    el = r1 + r2;
    m = r1 * r2 * (1 + cosNu);
    let p_i  = k / (el + Math.sqrt(2 * m));
    let p_ii  = k / (el - Math.sqrt(2 * m));
    let p;
    let del = 0.0001;
    if (long) p = p_i + del;
    else p = p_ii - del;
    
    // console.log({cosNu, sinNu, k, el, m, p, p_i, p_ii});
    let t = 0;

    function tof(p) {
        let a = m * k * p / ((2 * m - el**2) * p**2 + 2 * k * el * p - k**2);
        let f = 1 - r2 / p * (1 - cosNu);
        let g = r1 * r2 * sinNu / Math.sqrt(mu * p);
        let fdot = Math.sqrt(mu / p) * ((1 - cosNu) / sinNu) * ((1 - cosNu) / p - 1 / r1 - 1 / r2);
        let gdot = 1 - r1 / p * (1 - cosNu);
        let cosE, sinE, E, df;
        if (a > 0) {
            cosE = 1 - r1 / a * (1-f);
            sinE = -r1 * r2 * fdot / Math.sqrt(mu * a);
            E = Math.acos(cosE);
            if (sinE < 0) E = 2 * Math.PI - E;
            if  (E < 0) E += 2 * Math.PI;
            else if (E > (2 * Math.PI)) E -= 2 * Math.PI;
        }
        else {
            df = Math.acosh(1 - r1 / a * (1 - f));
            sinE = Math.sinh(df);
        }

        if (a > 0) t = g + Math.sqrt(a**3 / mu) * (2 * Math.PI*Nrev + E - sinE);
        else t = g + Math.sqrt((-a)**3 / mu) * (Math.sinh(df) - df);
        return {t,f,gdot,g,sinE,a}
    }
    function iterateP(t, p, sinE, g, a) {
        let dtdp;
        if (a > 0) dtdp = -g / (2 * p) - 1.5 * a * (t - g) * ((k**2 + (2 * m - el**2) * p**2)/m/k/p/p) + Math.sqrt(a**3 / mu) * 2 * k * sinE / p / (k - el * p);
        else  dtdp = -g / (2 * p) - 1.5 * a * (t - g) * ((k**2 + (2 * m - el**2) * p**2)/m/k/p/p) + Math.sqrt((-a)**3 / mu) * 2 * k * sinE / p / (k - el * p);
        return p - (t - tMan) / dtdp;
    }
    let returnedValues;
    // console.log(p);
    // console.log(tof(p));
    let count = 0
    while (Math.abs(t-tMan) > 1e-6) {
        returnedValues = tof(p);

        p = iterateP(returnedValues.t, p, returnedValues.sinE, returnedValues.g, returnedValues.a);
        count++
        if (count > 1000) return 'no solution'
    }
    // console.log(returnedValues);
    let v1 = math.dotDivide(math.subtract(r2_vec, math.dotMultiply(returnedValues.f, r1_vec)), returnedValues.g);
    let v2 = math.dotDivide(math.subtract(math.dotMultiply(returnedValues.gdot, r2_vec),r1_vec), returnedValues.g);
    return {v1, v2}
}

function Eci2Ric(state) {
    let rC = state.slice(0,3)
    let drC = state.slice(3,6)
    let h = math.cross(rC, drC);
    let ricX = math.dotDivide(rC, math.norm(rC));
    let ricZ = math.dotDivide(h, math.norm(h));
    let ricY = math.cross(ricZ, ricX);

    let C = math.transpose([ricX, ricY, ricZ])
    return C
}

function handleInputs(target) {
    let coesToVector = true
    if (target !== undefined) {
        coesToVector = [...target.classList].filter(s => s === 'coe').length > 0
    }
    if (coesToVector) {
        let inputs = [...document.getElementsByClassName('coe')].map(s => Number(s.value))
        inputs = {
            a: inputs[0],
            e: inputs[1],
            i: inputs[2] * Math.PI / 180,
            raan: inputs[3] * Math.PI / 180,
            arg: inputs[4] * Math.PI / 180,
            tA: inputs[5] * Math.PI / 180
        }
        if (inputs.e < 0) {
            target.value = 0
            return
        }
        let vector = Coe2PosVelObject(inputs)
        inputs = document.getElementsByClassName('vector')
        inputs[0].value = vector.x.toFixed(5)
        inputs[1].value = vector.y.toFixed(5)
        inputs[2].value = vector.z.toFixed(5)
        inputs[3].value = vector.vx.toFixed(5)
        inputs[4].value = vector.vy.toFixed(5)
        inputs[5].value = vector.vz.toFixed(5)
    }
    else {
        let inputs = [...document.getElementsByClassName('vector')].map(s => Number(s.value))
        let coes = PosVel2CoeNew(inputs.slice(0,3), inputs.slice(3,6))
        inputs = document.getElementsByClassName('coe')
        inputs[0].value = coes.a.toFixed(3)
        inputs[1].value = coes.e.toFixed(3)
        inputs[2].value = (180 / Math.PI * coes.i).toFixed(3)
        inputs[3].value = (180 / Math.PI * coes.raan).toFixed(3)
        inputs[4].value = (180 / Math.PI * coes.arg).toFixed(3)
        inputs[5].value = (180 / Math.PI * coes.tA).toFixed(3)
    }
    
}
handleInputs()
