let apogeeRatio = 1
let ricFrame = 'ri'
let ctrlKeyDown = false
let launchOptions = []
let title = 'Direct Ascent System'
let acronym = 'DAS'
document.title = acronym
function changeFlyoutPercent(el) {
    let curApogeeRatio = apogeeRatio * 100
    curApogeeRatio += el.innerText === '+' ? 1 : -1
    apogeeRatio = curApogeeRatio / 100
    document.getElementById('flyout-percent').innerText = curApogeeRatio.toFixed(0)
}

function findApogeeRendezvous(siteEci, targetStart, estimateTof) {
    try {
        // let crossVector = math.cross(siteEci.slice(0,3),targetStart.slice(0,3))
        // let long = crossVector[2] > 0
        let tof1 = estimateTof - estimateTof*0.1
        let tof2 = estimateTof
        let tof3 = estimateTof + estimateTof*0.1
        let target1 = propToTime(targetStart, tof1)
        let target2 = propToTime(targetStart, tof2)
        let target3 = propToTime(targetStart, tof3)
        let solution1 = solveLambertsProblem(siteEci, target1.slice(0,3), tof1, 0, true)
        let el = 90-math.acos(math.dot(siteEci, solution1.v1) / math.norm(siteEci) / math.norm(solution1.v1))*180/Math.PI
        if (el < 0) {
            return false
        }
        let solution2 = solveLambertsProblem(siteEci, target2.slice(0,3), tof2, 0, true)
        let solution3 = solveLambertsProblem(siteEci, target3.slice(0,3), tof3, 0, true)
    
        let dot1 = math.dot(solution1.v2, target1.slice(0,3))
        let dot2 = math.dot(solution2.v2, target2.slice(0,3))
        let dot3 = math.dot(solution3.v2, target3.slice(0,3))
        let dotPoly = lagrangePolyCalc([tof1, tof2, tof3], [dot1, dot2, dot3]);
        let dDotPoly = derivateOfPolynomial(dotPoly)
        let ddDotPoly = derivateOfPolynomial(dDotPoly)
        // tof2 -= answerPolynomial(dotPoly, tof2) / answerPolynomial(dDotPoly, tof2)
        tof2 -= 2*answerPolynomial(dotPoly, tof2)*answerPolynomial(dDotPoly, tof2) / (2*answerPolynomial(dDotPoly, tof2)**2-answerPolynomial(dotPoly, tof2)*answerPolynomial(ddDotPoly, tof2))
        // console.log(estimateTof, tof2, dot2, answerPolynomial(dotPoly, tof2));
        if (dot2 < answerPolynomial(dotPoly, tof2)) throw Error('Apogee not found exact')
        return tof2
    } catch (error) {
        console.error(error);
        return estimateTof
    }
}

function lagrangePolyCalc(x = [0,1,3], y = [1,-2,4]) {
    let answerLength = x.length
    let answer = math.zeros([answerLength])
    for (let ii = 0; ii < x.length; ii++) {
        let subAnswer = [], subAnswerDen = 1
        for (let jj = 0; jj < x.length; jj++) {
            if (ii === jj) continue
            subAnswer.push([1, -x[jj]])
            subAnswerDen *= x[ii] - x[jj]
        }
        subAnswer = subAnswer.slice(1).reduce((a,b) => {
            return multiplyPolynomial(a,b)
        }, subAnswer[0])
        answer = math.add(answer, math.dotMultiply(y[ii] / subAnswerDen, subAnswer))
    }
    return answer
}
function multiplyPolynomial(a = [1,3,1], b = [0,2,1]) {
    let aL = a.length, bL = b.length
    let minLength = aL < bL ? bL : aL
    while (a.length < minLength) a.unshift(0)
    while (b.length < minLength) b.unshift(0)
    let answerLength = (minLength - 1) * 2 + 1
    let answer = math.zeros([answerLength])
    for (let index = 0; index < minLength; index++) {
        let subAnswer = math.zeros([answerLength])
        let indexAnswer = math.dotMultiply(a[index], b)
        subAnswer.splice(index, minLength, ...indexAnswer)
        answer = math.add(answer, subAnswer)
    }
    while (answer[0] === 0) answer.shift()
    return answer
}

function answerPolynomial(poly = [1,-1,2], x = 4) {
    let p = poly.slice()
    return p.reverse().reduce((a,b,ii) => {
        return a + b * x ** ii
    },0)
}

function derivateOfPolynomial(poly = [3,2,1]) {
    let ddp = poly.slice()
    ddp.pop()
    ddp = ddp.map((p, ii) => {
        return p * (ddp.length - ii)
    })
    return ddp
}
let hpop = new Propagator()
function loopStartTime() {
    console.clear()
    launchOptions = []
    // Starting status for target at search start time
    let state = [...document.querySelectorAll('.coe-inputs')]
    let epoch = new Date(state.shift().value)
    state = state.map(s => Number(s.value))
    state = {
        a: state[0],
        e: state[1],
        i: state[2]*Math.PI / 180,
        raan: state[3]*Math.PI / 180,
        arg: state[4]*Math.PI / 180,
        tA: state[5]*Math.PI / 180,
    }
    state = astro.coe2J2000(state)
    let search = [...document.querySelectorAll('.search')].map(s => s.value)
    let searchStart = new Date(search.shift())
    search = search.map(s => Number(s))
    let searchStep = search[1]*60, searchDuration = search[0]*3600
    state = hpop.propToTime(state, epoch, (searchStart - epoch)/1000, 1e-6)
    // return
    let catsLimit = document.querySelector('#cats-limit').checked ? Number(document.querySelector('#cats-limit-input').value) : 180
    let rangeLimit = document.querySelector('#range-limit').checked ? Number(document.querySelector('#range-limit-input').value) : 1000000
    let earthIntercept = document.querySelector('#earth-block').checked

    let origState = state.state.slice()

    // Site targeting from
    let sitesSelected = [...document.querySelector('select').options].filter(s => s.selected).map(opt => {
        return {
            name: opt.innerText,
            lat: Number(opt.getAttribute('lat')),
            long: Number(opt.getAttribute('long')),
            alt: 0,
            elMask: 0
        }
    })
    sitesSelected = sitesSelected.map(site => {
        return {...site, ecef: astro.sensorGeodeticPosition(site.lat, site.long, site.alt)}
    })
    
    runRendezvousOptions(0, searchDuration, sitesSelected, state, [], {
        searchStep, catsLimit, earthIntercept, origState, searchStart, rangeLimit
    })
    
}

function evaluateSite(site, launchTime, targetState, options = {}) {
    let {catsLimit, earthIntercept, searchStart, origState, rangeLimit} = options
    let siteEci = astro.ecef2eci(site.ecef, launchTime)
    let siteVel = math.cross([0,0,2*Math.PI / 86164], siteEci)
    let tof = estTof(siteEci, targetState)
    tof = findApogeeRendezvous(siteEci, targetState, tof)
    if (tof === false) return false
    tof *= apogeeRatio
    // console.log(tof);
    let targetEndState = hpop.propToTime(targetState, launchTime, tof, {
        maxError: 1e-4
    }).state
    console.log(math.norm(math.subtract(siteEci, targetEndState.slice(0,3))), rangeLimit);
    if (math.norm(math.subtract(siteEci, targetEndState.slice(0,3))) > rangeLimit) return
    let vOptions = [solveLambertsProblem(siteEci, targetEndState.slice(0,3), tof, 0, false).v1,solveLambertsProblem(siteEci, targetEndState.slice(0,3), tof, 0, true).v1].filter(s => s !== undefined).filter(s => {
        return s.filter(a => isNaN(a)).length === 0
    })
    if (vOptions.length > 0) {
        let dV = vOptions.map(s => math.norm(math.subtract(s, siteVel)))
        let minIndex = dV.findIndex(s => s === math.min(dV))
        vOptions = vOptions[minIndex]
        // console.log(vOptions);
        let elevationAngle = 90-math.acos(math.dot(siteEci, vOptions) / math.norm(siteEci) / math.norm(vOptions))*180/Math.PI
        if (elevationAngle > site.elMask) {
            // Calculate sun angle at rendezvous
            let startState = [...siteEci,...vOptions]
            let velAz = astro.v2az(vOptions, launchTime, site.lat, site.long)
            let endState = propToTime(startState, tof)
            let slantRange = math.norm(math.subtract(siteEci, targetEndState.slice(0,3)))
            let sunEci = astro.sunEciFromTime(new Date(launchTime - (-tof*1000)))
            let relativeVel = math.subtract(endState.slice(3), targetEndState.slice(3)).map(s => -s)
            let cats = math.acos(math.dot(relativeVel, sunEci) / math.norm(relativeVel) / math.norm(sunEci))*180/Math.PI
            let illuminated = earthIntercept ? isSatIlluminated(endState, sunEci) : true
            if (cats < catsLimit && illuminated) {
                // CATS within limit and lighting source not blocked (if boxes checked) add to results div
                launchOptions.push({
                    site: site.name,
                    coordinates: {
                      lat: site.lat,
                      long: site.long,
                      alt: 0
                    },
                    velAz,
                    launchState: startState,
                    targetState,
                    launchTime,
                    tof,
                    searchStart,
                    cats,
                    velDot: -math.abs(math.dot(endState.slice(3), targetEndState.slice(3)) / math.norm(endState.slice(3)) / math.norm(targetEndState.slice(3))),
                    relativeVel,
                    slantRange,
                    targetEndState,
                    endState,
                    origState
                })
                // output.push(`
                // <div style="font-size: 1.25em; border-bottom: solid; border-color: #777; cursor: pointer; display: flex; justify-content: space-around;" launchstate="${[...siteEci, ...vOptions].join('x')}" start="${dateToDateTimeInput(searchStart)}" site="${Object.values(site).join('x')}" tof="${tof}" launch="${dateToDateTimeInput(state.date)}" targetend="${targetEndState.join('x')}" target="${origState.join('x')}">
                //     <div>${dateToDateTimeInput(state.date).split('T').join(' ')}z</div>
                //     <div>Launch &#916V: ${dV[minIndex].toFixed(3)} km/s</div>
                //     <div>TOF: ${(tof/60).toFixed(2)} mins</div>
                //     <div>CATS: ${cats.toFixed(1)}<sup>o</sup></div>
                //     <div>
                //         <button onclick="displayLaunch(this)">Ground Track</button>
                //         <button onclick="displayRic(this)">RIC</button>
                //         <button onclick="copyStkSequence(this)">STK</button>
                //         <button data-launchendstate="${endState.join('x')}" data-targetendstate="${targetEndState.join('x')}" onclick="generateDebrisPiece(this)">Debris</button>
                //         </div>
                // </div>
                // `)  
            }
        }

    }

}

function runRendezvousOptions(time, searchDuration, sites, state, output = [], options = {}) {
    let {searchStep, catsLimit, earthIntercept, origState, searchStart} = options
    let site = sites[0]
    // console.log(site.ecef, site);
    sites.forEach(site => {
        evaluateSite(site, state.date, state.state, options)
    })      
    state = hpop.propToTime(state.state, state.date, searchStep, {
        maxError: 1e-4
    })
    time += searchStep
    document.querySelector('#calc-button').innerText = `Calculating...${(time/searchDuration*100).toFixed()}%`
    if (time < searchDuration) setTimeout(runRendezvousOptions,0.1,time, searchDuration, sites, state, output, options)
    else {
        // console.log(launchOptions);
        displayLaunchOptions()
        console.log('finished');
        document.querySelector('#calc-button').innerText = `Calculate`
    }
}

function displayLaunchOptions(sortTerm) {
    let outOptions = [...launchOptions]
    if (outOptions.length === 0)
    document.querySelector('#results-div').innerHTML = `<div>No Solutions Found</div>`
    if (launchOptions[0][sortTerm] !== undefined) {
        outOptions = launchOptions.sort((a,b) => {
            if (a[sortTerm] < b[sortTerm]) {
                return -1;
            }
            if (a[sortTerm] > b[sortTerm]) {
                return 1;
            }
            return 0;
        })
    }
    let outputs = []
    outOptions.forEach(option => {
        // console.log(option);
        let newDiv = `<tr style="font-size: 1.25em; border-bottom: solid; border-color: #777;" launchstate="${option.launchState.join('x')}" site="${Object.values(option.coordinates).join('x')}" launchtime="${dateToDateTimeInput(option.launchTime)}" start="${dateToDateTimeInput(option.searchStart)}" site="${option.site}" tof="${option.tof}" targetend="${option.targetEndState.join('x')}" target="${option.origState.join('x')}">
            <td style="width: 15%;">${option.site}</td>
            <td style="width: 24%;">${dateToDateTimeInput(option.launchTime).split('T').join(' ')}z</td>
            <td style="width: 9.75%;">${option.slantRange.toFixed()} km</td>
            <td style="width: 9.75%;">${(option.tof/60).toFixed(2)} mins</td>
            <td style="width: 9.75%;">${option.cats.toFixed(1)}<sup>o</sup></td>
            <td style="width: 9.75%;">${option.velAz.toFixed(1)}<sup>o</sup></td>
            <td style="width: 7%;">${(-option.velDot).toFixed(3)}</td>
            <td style="width: 15%;">
                <button onclick="displayLaunch(this)">Ground Track</button>
                <button onclick="copyStkSequence(this)">STK</button>
            </td>
        </tr>`
        outputs.push(newDiv)
    })
    document.querySelector('#results-div').innerHTML = `<table style="table-layout: fixed; width: 100%;">
        ${outputs.join('\n')}
    </table>`
}

function toStkFormat(time) {
    time = time.split('GMT')[0].substring(4, time.split('GMT')[0].length - 1) + '.000';
    time = time.split(' ');
    return time[1] + ' ' + time[0] + ' ' + time[2] + ' ' + time[3];
}
function resortTable(el) {
    displayLaunchOptions(el.getAttribute('resortvalue'))
}
function randn_bm() {
    var u = 0, v = 0;
    while(u === 0) u = Math.random(); //Converting [0,1) to (0,1)
    while(v === 0) v = Math.random();
    return Math.sqrt( -2.0 * Math.log( u ) ) * Math.cos( 2.0 * Math.PI * v );
}

function generateDebrisPiece(el) {
    // Function to copy to clipboard a string for the STK sequence which builds trajectory out in STK
    let startTime = el.parentElement.parentElement.getAttribute('launch')
    let rendStateTarget = el.dataset.targetendstate.split('x').map(s => Number(s))
    let tof = el.parentElement.parentElement.getAttribute('tof')
    // Mass Multiplier
    console.log(rendStateTarget);
    let velSigma = 1 //m/s
    let debrisState = math.add(rendStateTarget, [0,0,0,velSigma, velSigma, velSigma].map(s => s*randn_bm()/1000))
    let rendTime = new Date((new Date(startTime))-(-1000*tof))
    console.log(rendTime, debrisState);
    navigator.clipboard.writeText(toStkFormat(rendTime.toString())+'x'+debrisState.join('x'))
}

function copyStkSequence(el) {
    // Function to copy to clipboard a string for the STK sequence which builds trajectory out in STK
    let startTime = new Date(el.parentElement.parentElement.getAttribute('launchtime'))
    let launchState = el.parentElement.parentElement.getAttribute('launchstate')
    let tof = el.parentElement.parentElement.getAttribute('tof')
    let targetend = el.parentElement.parentElement.getAttribute('targetend')
    console.log(launchState);
    if (ctrlKeyDown) {
        let newVel = accountForFullPhysics(launchState.split('x').map(s => Number(s)), startTime, targetend.split('x').slice(0,3).map(s=>Number(s)),Number(tof))
        launchState = launchState.split('x').map(s => Number(s))
        if (newVel !== false && newVel.filter(s => isNaN(s)).length === 0) {
            launchState = [...launchState.slice(0,3), ...newVel]
        }
        launchState = launchState.join('x')
        console.log(launchState);
    }
    navigator.clipboard.writeText(toStkFormat(startTime.toString())+'x'+launchState+'x'+tof)
}

function isSatIlluminated(satPos = [6900, 0, 0], sunPos = [6900000, 0,0]) {
    let satSunAngle = math.acos(math.dot(satPos.slice(0,3), sunPos)/math.norm(satPos.slice(0,3))/math.norm(sunPos))
    if (satSunAngle < Math.PI / 2) return true
    return !lineSphereIntercetionBool(math.subtract(satPos.slice(0,3),sunPos), sunPos, [0,0,0], 6371)
}

function lineSphereIntercetionBool(line = [-0.45, 0, 0.45], lineOrigin = [282.75,0,0], sphereOrigin = [0,0,0], sphereRadius=200) {
    line = math.dotDivide(line, math.norm(line))
    let check = math.dot(line, math.subtract(lineOrigin, sphereOrigin)) ** 2 - (math.norm(math.subtract(lineOrigin, sphereOrigin)) ** 2 - sphereRadius ** 2)
    return check > 0
} 

function displayLaunch(el) {
    el = el.parentElement.parentElement
    let hpop = new Propagator()
    let hpopNoAtm = new Propagator({
        atmDrag: false
    })
    let launchState = el.getAttribute('launchstate').split('x').map(s => Number(s))
    let targetState = el.getAttribute('target').split('x').map(s => Number(s))
    console.log(targetState);
    let site = el.getAttribute('site').split('x').map(s => Number(s))
    site = {
        lat: site[0],
        long: site[1]
    }
    let launchTime = new Date(el.getAttribute('launchtime'))
    let startTime = new Date(el.getAttribute('start'))
    navigator.clipboard.writeText(dateToDateTimeInput(launchTime) + '    ' + launchState.join('   '))
    let tof = Number(el.getAttribute('tof'))

    let targetPropTime = (launchTime - startTime) / 1000 + tof
    let targetHistory = hpop.propToTimeHistory(targetState, startTime, targetPropTime, 1e-5) 
    targetHistory = targetHistory.map(s => {
        let coor = astro.eci2latlong(s.state.slice(0,3), s.date)
        return {
            time: s.date,
            lat: 90-coor.lat * 180 / Math.PI,
            long: coor.long * 180 / Math.PI
        }
    })
    let launchHistory = hpopNoAtm.propToTimeHistory(launchState, launchTime, tof, 1e-4)
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
    cnvs.style.width = '80%'
    cnvs.style.height = '80%'
    cnvs.style.left = '10%'
    cnvs.style.top = '10%'
    cnvs.width = 800
    cnvs.height = 450
    cnvs.style.border = '3px solid black'
    cnvs.style.boxShadow = 'gray 7px 6px 9px'
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

function displayRic(el) {
    // Search parent elements for launch information
    while (el.getAttribute('launchtime') === null) {
        el = el.parentElement
        console.log(el);
        if (el === null) return
    }
    console.log(el);
    let hpop = new Propagator()
    let hpopNoAtm = new Propagator({
        atmDrag: false,
        order: 0,
        solarRad: false,
        thirdBody: false
    })
    let launchState = el.getAttribute('launchstate').split('x').map(s => Number(s))
    let targetState = el.getAttribute('target').split('x').map(s => Number(s))
    let launchTime = new Date(el.getAttribute('launchtime'))
    let startTime = new Date(el.getAttribute('start'))
    console.log(startTime);
    let tof = Number(el.getAttribute('tof'))

    targetState = hpop.propToTime(targetState, startTime, (launchTime - startTime) / 1000, {
        maxError: 1e-5
    }).state

    let trajHistory = [[targetState.slice(), launchState.slice(), astro.sunEciFromTime(launchTime)]]
    let timeStep = tof / 80, time = 0
    while ((time + timeStep) < tof) {
        targetState = hpop.propToTime(targetState, new Date(launchTime - (-time*1000)), timeStep, {
            maxError: 1e-5
        }).state
        launchState = hpopNoAtm.propToTime(launchState, new Date(launchTime - (-time*1000)), timeStep, {
            maxError: 1e-5
        }).state
        trajHistory.push([targetState, launchState, astro.sunEciFromTime(new Date(launchTime - (-time*1000) - (-timeStep*1000)))])
        time += timeStep
    }
    let remainingTime = tof - time
    targetState = hpop.propToTime(targetState, new Date(launchTime - (-time*1000)), remainingTime, {
        maxError: 1e-5
    }).state
    launchState = hpopNoAtm.propToTime(launchState, new Date(launchTime - (-time*1000)), remainingTime, {
        maxError: 1e-5
    }).state
    trajHistory.push([targetState,launchState, astro.sunEciFromTime(new Date(launchTime - (-time*1000) - (-remainingTime*1000)))])
    trajHistory = trajHistory.map(s => [astro.Eci2Ric(s[0], s[1]), astro.Eci2Ric(s[0], [...s[2],0,0,0]).slice(0,3)])
    // Remove any canvas that already exists
    let existingCanvas = [...document.querySelectorAll('canvas')]
    existingCanvas.forEach(c => c.remove())

    let cnvs = document.createElement('canvas')
    cnvs.style.position = 'fixed'
    cnvs.style.width = '60%'
    cnvs.style.height = '70%'
    cnvs.style.left = '20%'
    cnvs.style.top = '15%'
    cnvs.style.border = '3px solid black'
    cnvs.style.boxShadow = 'gray 7px 6px 9px'
    cnvs.width = 0.6*window.innerWidth
    cnvs.height = 0.7*window.innerHeight
    cnvs.onclick = el => {
        console.log(el);
        el.target.remove()
        document.querySelector('.ric-button').remove()
    }
    cnvs.classList.add('ric-canvas')    
    // Remove any ric-buttons that already exists
    let existingRicButtons = [...document.querySelectorAll('.ric-button')]
    existingRicButtons.forEach(c => c.remove())
    let button = document.createElement('button')
    button.style.position = 'fixed'
    button.style.bottom = '5%'
    button.style.width = '30%'
    button.style.left = '35%'
    button.style.fontSize = '5vh'
    button.addEventListener('click', switchRicFrame)
    button.setAttribute('launchstate', el.getAttribute('launchstate'))
    button.setAttribute('target', el.getAttribute('target'))
    button.setAttribute('launchtime',el.getAttribute('launchtime'))
    button.setAttribute('start',el.getAttribute('start'))
    button.setAttribute('tof',el.getAttribute('tof'))
    button.innerText = ricFrame.toUpperCase(this)
    button.title = 'Click to switch from RI to CI frame'
    button.classList.add('ric-button')
    document.body.append(button)
    document.getElementsByTagName('body')[0].append(cnvs)
    drawRicCnvs(trajHistory.slice(trajHistory.length-40), ricFrame)
}

function switchRicFrame(el) {
    ricFrame = ricFrame === 'ri' ? 'ci' : 'ri'
    displayRic(el.target)
}

function drawRicCnvs(traj, plot='ri') {
    let convertToPixels = function(input = [0, 0, 0, 0, 0, 0], plotWidth = 8000, ratio=0.5, inCnvs) {
        let plotHeight = plotWidth*ratio
        if (Array.isArray(input)) {
            input = math.squeeze(input);
            input = {
                r:  input[0],
                i:  input[1],
                c:  input[2]
            };
        }
        return{
            ri: {
                x: -(input.i) * inCnvs.width  / plotWidth+cnvs.width/2,
                y: cnvs.height/2- input.r * inCnvs.height / plotHeight
            },
            ci: {
                x: -(input.i) * inCnvs.width / plotWidth+cnvs.width/2,
                y: cnvs.height/2- input.c * inCnvs.height/ plotHeight
            }
        }
    }
    let finalRelVel = math.norm(traj[traj.length-1][0].slice(3,6))
    let sunVectors = traj.map(s => math.dotDivide(s[1], math.norm(s[1])))
    traj = traj.map(s => s[0])
    let maxIt = math.max(traj.map(s => Math.abs(s[1])))
    sunVectors = sunVectors.map(s => math.dotMultiply(s, maxIt*0.2))
    let cnvs = document.querySelector('.ric-canvas')
    if (cnvs === null) return
    let ratio = cnvs.height / cnvs.width
    let ctx = cnvs.getContext('2d')
    ctx.fillStyle = 'rgb(200,150,150)'
    ctx.strokeStyle = 'black'
    ctx.fillRect(0,0,cnvs.width, cnvs.height)
    ctx.lineWidth = 5
    ctx.textBaseline = 'bottom'
    ctx.fillStyle = 'black'
    ctx.font = '20px sans-serif'
    ctx.beginPath()
    ctx.moveTo(cnvs.width/2,cnvs.height/2)
    ctx.lineTo(cnvs.width/2,cnvs.height/4)
    ctx.moveTo(cnvs.width/2,cnvs.height/2)
    ctx.lineTo(cnvs.width/2 - cnvs.height / 4,cnvs.height/2)
    ctx.stroke()
    ctx.textAlign = 'right'
    ctx.textBaseline = 'middle'
    ctx.fillText('I', cnvs.width/2-cnvs.height/4-5, cnvs.height/2)
    ctx.textBaseline = 'bottom'
    ctx.textAlign = 'center'
    ctx.fillText(plot === 'ri' ? 'R' : 'C', cnvs.width/2, cnvs.height/4-5)
    // Display rel vel
    ctx.fillText(`Final Rel Vel: ${finalRelVel.toFixed(2)} km/s`, cnvs.width/2, cnvs.height-5)
    // drawSun
    sunVectors = sunVectors.map(s => convertToPixels(s, maxIt*2, ratio, cnvs)[plot])
    ctx.fillStyle = 'orange'
    ctx.strokeStyle = 'orange'
    ctx.beginPath()
    ctx.moveTo(cnvs.width/2, cnvs.height/2)
    sunVectors.forEach(s => {
        ctx.lineTo(s.x, s.y)
    })
    ctx.lineTo(cnvs.width/2, cnvs.height/2)
    ctx.fill()
    ctx.stroke()

    traj = traj.map(s => convertToPixels(s, maxIt*2, ratio, cnvs)[plot])
    ctx.fillStyle = 'blue'
    ctx.beginPath()
    ctx.arc(cnvs.width/2,cnvs.height/2,8,0,2*Math.PI)
    ctx.fill()
    ctx.fillStyle = 'red'
    traj.forEach(t => {
        ctx.beginPath()
        ctx.arc(t.x,t.y,4,0,2*Math.PI)
        ctx.fill()
    })
}

function estTof(siteECI, satECI) {
    function True2Eccentric(e, ta) {
        return Math.atan(Math.sqrt((1 - e) / (1 + e)) * Math.tan(ta / 2)) * 2;
    }
    let range = math.norm(math.subtract(siteECI, satECI.slice(0,3)))
    let siteECIn = math.norm(siteECI.slice(0,3))
    let satECIn = math.norm(satECI.slice(0,3))
    // let ang = math.dot(siteECI, satECI.slice(0,3)) / siteECIn / satECIn
    let per = (siteECIn+range) * 0.01
    let estA = (satECIn + per) / 2 
    let estE = (range+satECIn - per) / (range+satECIn + per)
    let n = (398600.4418 / estA ** 3) ** 0.5
    let p = estA * (1 - estE ** 2)
    let nu = math.acos((p / siteECIn - 1) / estE)
    let eccA = True2Eccentric(estE, nu)
    let meanA = eccA - estE * Math.sin(eccA)
    let tof = (Math.PI - meanA) / n
    // console.log({estE, estA, n,p,nu,eccA, meanA, tof});
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
        let inputs = [...document.getElementsByClassName('vector')].slice(1).map(s => Number(s.value))
        let coes = PosVel2CoeNew(inputs.slice(0,3), inputs.slice(3,6))
        inputs = document.getElementsByClassName('coe')
        inputs[1].value = coes.a.toFixed(3)
        inputs[2].value = coes.e.toFixed(3)
        inputs[3].value = (180 / Math.PI * coes.i).toFixed(3)
        inputs[4].value = (180 / Math.PI * coes.raan).toFixed(3)
        inputs[5].value = (180 / Math.PI * coes.arg).toFixed(3)
        inputs[6].value = (180 / Math.PI * coes.tA).toFixed(3)
    }
    
}

function testIfTle(inText) {
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
    let test = inText.search(/^1 {1,4}\d{1,5}/) !== -1 && inText.search(/ 2 {1,4}\d{1,5}/) !== -1
    if (!test) return false
    let slStart = inText.search(/ 2 {1,4}\d{1,5}/)
    let fl = inText.slice(0, slStart).split(/ {1,}/)
    let sl = inText.slice(slStart).split(/ {1,}/).filter(s => s.length > 0)
    console.log(fl, sl);
    let epoch = fl[3].split('.')
    epoch = new Date('20'+epoch[0].slice(0,2), 0,epoch[0].slice(2),0,0,Number('.'+epoch[1])*86400)
    let coe = {
        i: Number(sl[2])*Math.PI / 180,
        raan: Number(sl[3])*Math.PI / 180,
        e: Number('0.'+sl[4]),
        arg: Number(sl[5])*Math.PI / 180,
        tA: Number(sl[6])*Math.PI / 180,
        a: Number(sl[7])
    }
    let mu = 398600.4418
    coe.a = ((((86400 / coe.a) / 2 / Math.PI)**2)*mu)**(1/3)
    coe.tA = solveKeplersEquation(coe.tA, coe.e)
    coe.tA = Eccentric2True(coe.e, coe.tA)
    return {
        epoch,
        coe
    }
}
 
function importState(el) {
    let inputValue = el.value
    let tleTest = testIfTle(inputValue)
    el.value = ''
    if (tleTest !== false) return newStateToInputs(tleTest.coe, tleTest.epoch)
    inputValue = inputValue.split(/ {2,}/);
    let date = new Date(inputValue.shift())
    setTimeout(() => {
        el.placeholder = 'J2000 or TLE State'
    }, 2000)
    if (date == 'Invalid Date' || inputValue.length < 6) {
        el.placeholder = 'State Rejected!'
        return
    }
    el.placeholder = 'State Accepted!'
    inputValue = inputValue.map(s => Number(s))
    let newCoe = PosVel2CoeNew(inputValue.slice(0,3), inputValue.slice(3,6))
    newStateToInputs(newCoe, date)
}

function newStateToInputs(newCoe, epoch) {
    let coeInputs = document.getElementsByClassName('coe-inputs')
    coeInputs[0].value = dateToDateTimeInput(epoch)
    document.querySelector('#search-start-time').value = dateToDateTimeInput(epoch)
    coeInputs[1].value = newCoe.a.toFixed(2)
    coeInputs[2].value = newCoe.e.toFixed(5)
    coeInputs[3].value = (newCoe.i*180 / Math.PI).toFixed(2)
    coeInputs[4].value = (newCoe.raan*180 / Math.PI).toFixed(2)
    coeInputs[5].value = (newCoe.arg*180 / Math.PI).toFixed(2)
    coeInputs[6].value = (newCoe.tA*180 / Math.PI).toFixed(2)
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
    let countries = new Set(sites.map(s => s.country))
    countries
    countries.forEach(coun => {
        let optGroup = document.createElement('optgroup')
        optGroup.label = coun
        sites.filter(s => s.country === coun).forEach(site => {
            let opt = document.createElement('option')
            opt.innerText = site.name
            opt.title = `Latitude: ${site.lat}, Longitude: ${site.long}`
            opt.setAttribute('lat', site.lat)
            opt.setAttribute('long', site.long)
            optGroup.append(opt)
        })
        sel.append(optGroup)
    })

    // selectSite(sel)
}

function accountForFullPhysics(launchState, launchEpoch, targetState, tof) {
    let h = new Propagator({order: 70})
    let velGuess = launchState.slice(3)
    for (let index = 0; index < 10; index++) {
        let velDelX = [...velGuess]
        velDelX[0] += 0.1
        let velDelY = [...velGuess]
        velDelY[1] += 0.1
        let velDelZ = [...velGuess]
        velDelZ[2] += 0.1
        let maxError = 1/10**(index+3)
        maxError = maxError < 1e-8 ? 1e-8 : maxError
        let state = h.propToTime([...launchState.slice(0,3), ...velGuess], launchEpoch, tof, {
            maxError
        }).state.slice(0,3)
        let stateDelX = h.propToTime([...launchState.slice(0,3), ...velDelX], launchEpoch, tof, {
            maxError
        }).state.slice(0,3)
        stateDelX = math.subtract(stateDelX, state).map(s => s/0.1)
        let stateDelY = h.propToTime([...launchState.slice(0,3), ...velDelY], launchEpoch, tof, {
            maxError
        }, ).state.slice(0,3)
        stateDelY = math.subtract(stateDelY, state).map(s => s/0.1)
        let stateDelZ = h.propToTime([...launchState.slice(0,3), ...velDelZ], launchEpoch, tof, {
            maxError
        }).state.slice(0,3)
        stateDelZ = math.subtract(stateDelZ, state).map(s => s/0.1)
        let jac = math.transpose([stateDelX, stateDelY, stateDelZ])
        let del = math.transpose([math.subtract(state, targetState)])
        
        console.log(math.norm(velGuess), math.norm(math.squeeze(del)), maxError);
        velGuess = math.subtract(velGuess, math.squeeze(math.multiply(math.inv(jac), del)))
    }
    return velGuess
}

document.body.addEventListener('keydown', key => {
    if (key.key === 'Control') {
        ctrlKeyDown = true
    }
})
document.body.addEventListener('keyup', key => {
    if (key.key === 'Control') {
        ctrlKeyDown = false
    }
})
importSites()
function showLogo() {
    let cnvs = document.createElement('canvas')
    document.getElementsByTagName('body')[0].append(cnvs)
    cnvs.style.position = 'fixed'
    cnvs.style.zIndex = 20
    cnvs.style.top = 0
    cnvs.style.left = 0
    cnvs.style.width = '100vw'
    cnvs.style.height = '100vh'
    cnvs.style.transition = 'opacity 0.5s'
    cnvs.onclick = el => {
        el.target.style.opacity = 0
        setTimeout(() => el.target.remove(), 500)
    }
    let ctx = cnvs.getContext('2d')
    cnvs.width = window.innerWidth
    cnvs.height = window.innerHeight
    ctx.fillStyle = 'rgb(225,150,150)'
    ctx.fillRect(0, 0, cnvs.width, cnvs.height)
    ctx.globalAlpha = 0.5
    ctx.strokeStyle = 'blue'
    ctx.fillStyle = 'blue'
    ctx.beginPath()
    ctx.ellipse(cnvs.width / 2+90, cnvs.height / 2, 200, 700, 90 * Math.PI / 180, -Math.PI/2*1.75, Math.PI, true)
    ctx.stroke()
    
    ctx.beginPath()
    let base = [cnvs.width / 2+90, cnvs.height / 2-200]
    ctx.moveTo(base[0], base[1])
    ctx.lineTo(base[0] + 5, base[1]-5)
    ctx.lineTo(base[0] - 10, base[1])
    ctx.lineTo(base[0] + 5, base[1]+5)
    ctx.lineTo(base[0], base[1])
    ctx.fill()
    ctx.strokeStyle = 'red'
    ctx.fillStyle = 'red'
    ctx.beginPath()
    ctx.ellipse(cnvs.width / 2+120, cnvs.height / 2, 200, 100, 90 * Math.PI / 180, -Math.PI/2, Math.PI, true)
    ctx.stroke()
    ctx.beginPath()
    base = [cnvs.width / 2+120, cnvs.height / 2-200]
    ctx.moveTo(base[0], base[1])
    ctx.lineTo(base[0] + 5, base[1]-5)
    ctx.lineTo(base[0] - 10, base[1])
    ctx.lineTo(base[0] + 5, base[1]+5)
    ctx.lineTo(base[0], base[1])
    ctx.fill()
    ctx.globalAlpha = 1
    ctx.fillStyle = 'black'
    ctx.textBaseline = 'alphabetic'
    ctx.textAlign = 'center'
    ctx.font = '190px sans-serif'
    ctx.fillText(acronym, cnvs.width / 2, cnvs.height / 2)
    ctx.textBaseline = 'top'
    ctx.font = '24px Courier New'
    ctx.fillText(title, cnvs.width / 2, cnvs.height / 2 + 2)
    ctx.fillText('CAO ' + cao, cnvs.width / 2, cnvs.height / 2 + 26)
    ctx.textBaseline = 'alphabetic'
    ctx.fillText('Click anywhere to begin...', cnvs.width / 2, cnvs.height - 30)
}
showLogo()