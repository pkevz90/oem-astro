function loopStartTime() {
    let hpop = new Propagator()
    let hpopNoAtm = new Propagator({
        atmDrag: false
    })

    // Starting status for target at search start time
    let state = [...document.querySelectorAll('.vector')]
    let epoch = new Date(state.shift().value)
    state = state.map(s => Number(s.value))
    let search = [...document.querySelectorAll('.search')].map(s => s.value)
    let searchStart = new Date(search.shift())
    search = search.map(s => Number(s))
    let searchStep = search[1]*60, searchDuration = search[0]*3600
    state = hpop.propToTime(state, epoch, (searchStart - epoch)/1000, 1e-6)

    let origState = state.state.slice()

    // Site targeting from
    let site = [...document.querySelectorAll('.site')].map(s => Number(s.value))
    site = {
        lat: site[0]*Math.PI / 180,
        long: site[1]*Math.PI / 180,
        alt: site[2],
        elMask: site[3]
    }
    site.ecef = astro.sensorGeodeticPosition(site.lat*180/Math.PI, site.long*180/Math.PI, site.alt)
    

    let time = 0, options = []
    while (time < searchDuration) {
        let siteEci = astro.ecef2eci(site.ecef, state.date)
        let siteVel = math.cross([0,0,2*Math.PI / 86164], siteEci)
        let tof = estTof(siteEci, state.state)
        let targetEndState = hpop.propToTime(state.state, state.date, tof, 1e-6).state
        let vOptions = [solveLambertsProblem(siteEci, targetEndState.slice(0,3), tof, 0, false).v1,solveLambertsProblem(siteEci, targetEndState.slice(0,3), tof, 0, true).v1].filter(s => s !== undefined).filter(s => {
            return s.filter(a => isNaN(a)).length === 0
        })
        if (vOptions.length > 0) {
            let dV = vOptions.map(s => math.norm(math.subtract(s, siteVel)))
            let minIndex = dV.findIndex(s => s === math.min(dV))
            vOptions = vOptions[minIndex]
            let elevationAngle = 90-math.acos(math.dot(siteEci, vOptions) / math.norm(siteEci) / math.norm(vOptions))*180/Math.PI
            if (elevationAngle > site.elMask) {
               // If above el mask, add html code to options
                options.push(`
                    <div onclick="displayLaunch(this)" launchstate="${[...siteEci, ...vOptions].join('x')}" start="${dateToDateTimeInput(searchStart)}" site="${Object.values(site).join('x')}" tof="${tof}" launch="${dateToDateTimeInput(state.date)}" target="${origState.join('x')}">${dateToDateTimeInput(state.date)}--dV: ${dV[minIndex].toFixed(3)} km/s--TOF: ${(tof/60).toFixed(2)} mins</div>
                `)
            }

        }


        state = hpop.propToTime(state.state, state.date, searchStep)
        time += searchStep
    }
    document.querySelector('#results-div').innerHTML = options.join('\n')
}

function displayLaunch(el) {
    
    let hpop = new Propagator()
    let hpopNoAtm = new Propagator({
        atmDrag: false
    })
    let launchState = el.getAttribute('launchstate').split('x').map(s => Number(s))
    let targetState = el.getAttribute('target').split('x').map(s => Number(s))
    let site = el.getAttribute('site').split('x').map(s => Number(s))
    site = {
        lat: site[0]*180/Math.PI,
        long: site[1]*180/Math.PI
    }
    let launchTime = new Date(el.getAttribute('launch'))
    let startTime = new Date(el.getAttribute('start'))
    let tof = Number(el.getAttribute('tof'))

    let targetPropTime = (launchTime - startTime) / 1000 + tof

    let targetHistory = hpop.propToTimeHistory(targetState, startTime, targetPropTime) 
    targetHistory = targetHistory.map(s => {
        let coor = astro.eci2latlong(s.state.slice(0,3), s.date)
        return {
            time: s.date,
            lat: 90-coor.lat * 180 / Math.PI,
            long: coor.long * 180 / Math.PI
        }
    })
    let launchHistory = hpopNoAtm.propToTimeHistory(launchState, launchTime, tof, 1e-8)
    launchHistory = launchHistory.map(s => {
        let coor = astro.eci2latlong(s.state.slice(0,3), s.date)
        return {
            time: s.date,
            lat: 90-coor.lat * 180 / Math.PI,
            long: coor.long * 180 / Math.PI
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
    cnvs.onclick = el => el.target.remove()
    document.getElementsByTagName('body')[0].append(cnvs)
    let ctx = cnvs.getContext('2d')
    let img = new Image()
    img.src = './Media/2_no_clouds_4k.jpg'
    img.onload = function(){      
        ctx.drawImage(img,0,0,cnvs.width, cnvs.height);
        ctx.fillStyle = 'cyan'
        launchHistory.forEach(point => {
            let long = point.long
            long += 180
            long = long > 360 ? long - 360 : long
            ctx.beginPath();
            ctx.arc(cnvs.width * long / 360, cnvs.height * point.lat/ 180, cnvs.width /600, 0, 2 * Math.PI);
            ctx.fill();
        })
        ctx.fillStyle = 'yellow'
        targetHistory.forEach(point => {
            let long = point.long
            long += 180
            long = long > 360 ? long - 360 : long
            ctx.beginPath();
            ctx.arc(cnvs.width * long / 360, cnvs.height * point.lat/ 180, cnvs.width /600, 0, 2 * Math.PI);
            ctx.fill();
        })
        ctx.fillStyle = 'red'
        let long = site.long +180
        long = long > 360 ? long - 360 : long
        ctx.beginPath();
        ctx.arc(cnvs.width * long / 360, cnvs.height * (90-site.lat)/ 180, cnvs.width /300, 0, 2 * Math.PI);
        ctx.fill();
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

function propToTime(state, dt, j2 = false) {
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

function handleInputs(target) {
    let coesToVector = true
    if (target !== undefined) {
        coesToVector = [...target.classList].filter(s => s === 'coe').length > 0
    }
    if (coesToVector) {
        let inputs = [...document.getElementsByClassName('coe')].slice(1).map(s => Number(s.value))
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
        let vector = astro.coe2J2000(inputs)
        inputs = [...document.getElementsByClassName('vector')].slice(1)
        inputs[0].value = vector[0].toFixed(5)
        inputs[1].value = vector[1].toFixed(5)
        inputs[2].value = vector[2].toFixed(5)
        inputs[3].value = vector[3].toFixed(5)
        inputs[4].value = vector[4].toFixed(5)
        inputs[5].value = vector[5].toFixed(5)
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

function importState(el) {
    let inputValue = el.value
    el.value = ''
    inputValue = inputValue.split(/ {2,}/);
    let date = new Date(inputValue.shift())
    setTimeout(() => {
        el.placeholder = 'J2000 State'
    }, 2000)
    if (date == 'Invalid Date' || inputValue.length < 6) {
        el.placeholder = 'State Rejected!'
        return
    }
    el.placeholder = 'State Accepted!'
    inputValue = inputValue.map(s => Number(s))
    document.getElementById('sat-epoch').value = dateToDateTimeInput(date)
    a = document.getElementsByTagName('input')
    a[a.length - 3].value = dateToDateTimeInput(date)
    let newCoe = PosVel2CoeNew(inputValue.slice(0,3), inputValue.slice(3,6))
    console.log(inputValue.slice(0,3), inputValue.slice(3,6));
    console.log(newCoe);
    let coeInputs = document.getElementsByClassName('coe')
    let vectorInputs = document.getElementsByClassName('vector')
    coeInputs[0].value = newCoe.a.toFixed(2)
    coeInputs[1].value = newCoe.e.toFixed(5)
    coeInputs[2].value = (newCoe.i*180 / Math.PI).toFixed(2)
    coeInputs[3].value = (newCoe.raan*180 / Math.PI).toFixed(2)
    coeInputs[4].value = (newCoe.arg*180 / Math.PI).toFixed(2)
    coeInputs[5].value = (newCoe.tA*180 / Math.PI).toFixed(2)
    vectorInputs[0].value = inputValue[0].toFixed(3)
    vectorInputs[1].value = inputValue[1].toFixed(3)
    vectorInputs[2].value = inputValue[2].toFixed(3)
    vectorInputs[3].value = inputValue[3].toFixed(5)
    vectorInputs[4].value = inputValue[4].toFixed(5)
    vectorInputs[5].value = inputValue[5].toFixed(5)
}

function dateToDateTimeInput(date) {
    padNumString = function(num, n = 2) {
        while (num.length < n) {
            num = '0' + num
        }
        return num
    }
    return `${date.getFullYear()}-${padNumString((date.getMonth() + 1).toFixed(), 2)}-${padNumString(date.getDate().toFixed(), 2)}T${padNumString(date.getHours().toFixed(), 2)}:${padNumString(date.getMinutes().toFixed(), 2)}:${padNumString(date.getSeconds().toFixed(), 2)}`
}

function selectSite(el) {
    let ii = el.selectedIndex
    let inputs = document.getElementsByTagName('input')

    inputs[0].value = sites[ii].lat
    inputs[1].value = sites[ii].long
}

function importSites() {
    let sel = document.getElementsByTagName('select')[0]
    sel.style.fontSize = '1.5em'
    sites.forEach(s => {
        let opt = document.createElement('option')
        opt.innerText = s.name
        sel.append(opt)
    })
    selectSite(sel)
}

importSites()
handleInputs()