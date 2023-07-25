let mainWindow = {
    startTime: new Date(2023, 7, 7),
    scenarioLength: 40,
    scenarioTime: 0,
    moon: true,
    moonFrame: true,
    physicalConstants: {
        deg2rad: 2*Math.PI / 180,
        rEarth: 6371,
        rMoon: 1738,
        muEarth: 398600.4418,
        muMoon: 4904.8695,
        massEarth: 5.972168e24,
        massMoon: 7.342e22
    },
    state: Object.values(astro.coe2J2000({
        a: 220000,
        e: 0.8,
        i: 0,
        raan: 170*Math.PI/180,
        arg: 0,
        tA: 0*Math.PI/180
    })),
    stateHistory: undefined,
    moonHistory: undefined,
    cnvs: document.querySelector('canvas')
}

function animationLoop() {

    try {
        drawScene()
        mainWindow.scenarioTime += 3600
        // console.log((mainWindow.scenarioTime/86400).toFixed(1));
        window.requestAnimationFrame(animationLoop)
    } catch (error) {
        mainWindow.scenarioTime = 0
        animationLoop()
    }
}
animationLoop()

function earthMoonAcceleration(inState = [42164,0,0,0,3.014,0], date = new Date()) {
    let moonEci = astro.moonEciFromTime(date)
    let satMoonR = math.subtract(inState.slice(0,3), moonEci)
    let satMoonRNorm = math.norm(satMoonR)
    let satEarthRNorm = math.norm(inState.slice(0,3))
    let earthAcc = math.dotMultiply(-mainWindow.physicalConstants.muEarth/(satEarthRNorm**3), inState.slice(0,3))
    let moonAcc = math.dotMultiply(-mainWindow.physicalConstants.muMoon/(satMoonRNorm**3), satMoonR)
    return [...inState.slice(3), ...math.add(earthAcc, mainWindow.moon ? moonAcc : [0,0,0])]
}

function rkf45(state = [42164,0,0,0,3.014,0], time = new Date(), h = 2000, epsilon = 1e-1, options = {}) {
    let k1 = math.dotMultiply(h, earthMoonAcceleration(state, time))
    let k2 = math.dotMultiply(h, earthMoonAcceleration(math.add(state,math.dotMultiply(2/9,k1)), new Date(time - (-1000*h*2/9))))
    let k3 = math.dotMultiply(h, earthMoonAcceleration(math.add(state,math.dotMultiply(1/12,k1),math.dotMultiply(1/4,k2)), new Date(time - (-1000*h/3))))
    let k4 = math.dotMultiply(h, earthMoonAcceleration(math.add(state,math.dotMultiply(69/128,k1),math.dotMultiply(-243/128,k2),math.dotMultiply(135/64,k3)), new Date(time - (-1000*h*3/4))))
    let k5 = math.dotMultiply(h, earthMoonAcceleration(math.add(state,math.dotMultiply(-17/12,k1),math.dotMultiply(27/4,k2),math.dotMultiply(-27/5,k3),math.dotMultiply(16/15,k4)), new Date(time - (-1000*h))))
    let k6 = math.dotMultiply(h, earthMoonAcceleration(math.add(state,math.dotMultiply(65/432,k1),math.dotMultiply(-5/16,k2),math.dotMultiply(13/16,k3),math.dotMultiply(4/27,k4),math.dotMultiply(5/144,k5)), new Date(time - (-1000*h*5/6))))
    let y = math.add(state, math.dotMultiply(47/450, k1), math.dotMultiply(12/25, k3), math.dotMultiply(32/225, k4), math.dotMultiply(1/30, k5), math.dotMultiply(6/25, k6))
    
    let te = math.norm(math.add(math.dotMultiply(-1/150, k1), math.dotMultiply(3/100, k3), math.dotMultiply(-16/75, k4), math.dotMultiply(-1/20, k5), math.dotMultiply(6/25, k6)))

    return {y, te}
}


function rk4(state = [42164, 0, 0, 0, 3.070, 0], dt = 10, date = new Date()) {
    let k1 = earthMoonAcceleration(state, date);
    let k2 = earthMoonAcceleration(math.add(state, math.dotMultiply(dt/2, k1)), new Date(date - (-dt / 2 * 1000)));
    let k3 = earthMoonAcceleration(math.add(state, math.dotMultiply(dt/2, k2)), new Date(date - (-dt / 2 * 1000)));
    let k4 = earthMoonAcceleration(math.add(state, math.dotMultiply(dt/1, k3)), new Date(date - (-dt * 1000)));
    return math.squeeze(math.add(state, math.dotMultiply(dt / 6, (math.add(k1, math.dotMultiply(2, k2), math.dotMultiply(2, k3), k4)))));
}

function calculateStateHistory(state = mainWindow.state, date = mainWindow.startTime, length = mainWindow.scenarioLength) {
    let t = 0, dt = 1000, totalError = 0, filterNum = 3, filterTrack = -1, history = []
    length *=  86400
    while (t <= length) {
        filterTrack++
        if (filterTrack % filterNum !== 0) {
            let propDate = new Date(date - (-1000*t))
            let propState = rkf45(state, propDate, dt)
            totalError += propState.te
            state = propState.y
            t += dt
            continue
        }
        if (t === 0) {
            history.push({
                t, state: state.slice()
            })
            t += dt
            continue
        }
        let propDate = new Date(date - (-1000*t))
        let propState = rkf45(state, propDate, dt)
        totalError += propState.te
        state = propState.y
        history.push({
            t, state: state.slice()
        })
        t += dt
    } 
    console.log(history.length);
    return history
}

function calculateMoonHistory(date = mainWindow.startTime, length = mainWindow.scenarioLength) {
    let dt = 1000, history = [], t = 0, filterNum = 3, filterTrack = -1
    length *= 86400
    while (t <= length) {
        filterTrack++
        if (filterTrack % filterNum !== 0) {
            t += dt
            continue
        }
        let moonInfo = getMoonPositionAndFrame(new Date(date - (-1000*t)))
        history.push({
            t,
            r: moonInfo.r,
            eci: moonInfo.eci
        })
        t += dt
    }
    console.log(history.length);
    return history
}

function updateCnvsSize() {
    mainWindow.cnvs.width = window.innerWidth
    mainWindow.cnvs.height = window.innerHeight
}

function getMoonPositionAndFrame(date = new Date()) {
    let moonDate1 = new Date(date - 500)
    let moonDate2 = new Date(date - (-500))
    let moonEci1 = astro.moonEciFromTime(moonDate1)
    let moonEci = astro.moonEciFromTime(date)
    let moonEci2 = astro.moonEciFromTime(moonDate2)
    let moonVel = math.subtract(moonEci2, moonEci1)
    let xVector = math.dotDivide(moonEci, math.norm(moonEci))
    let zVector = math.cross(moonEci, moonVel).map(s => s/math.norm(moonEci)/math.norm(moonVel))
    let yVector = math.cross(zVector, xVector)
    return {
        r: math.transpose([xVector, yVector, zVector]),
        eci: moonEci
    }
}

function drawScene() {
    updateCnvsSize()
    if (mainWindow.stateHistory === undefined) {
        mainWindow.stateHistory = calculateStateHistory()
    }
    if (mainWindow.moonHistory === undefined) {
        mainWindow.moonHistory = calculateMoonHistory()
    }
    let screenDistance = 420000
    let width = window.innerHeight < window.innerWidth ? screenDistance * window.innerWidth / window.innerHeight : screenDistance 
    let height = width * window.innerHeight / window.innerWidth
    // console.log(width, height);
    let cnvs = mainWindow.cnvs
    let ctx = cnvs.getContext('2d')
    let earthPixelRadius = mainWindow.physicalConstants.rEarth / width / 2 * window.innerWidth
    let moonPixelRadius = mainWindow.physicalConstants.rMoon / width / 2 * window.innerWidth

    let moonIndex = mainWindow.moonHistory.findIndex(s => s.t >= mainWindow.scenarioTime)
    moonIndex = [mainWindow.moonHistory[moonIndex], mainWindow.moonHistory[moonIndex+1]]
    // console.log(moonIndex.map(s => s.t));
    let moonInfo = getMoonPositionAndFrame(new Date(mainWindow.startTime - (-1000*mainWindow.scenarioTime)))
    let moonPosition = moonInfo.eci
    let moonPositionR = moonInfo.r

    let satIndex = mainWindow.stateHistory.findIndex(s => s.t > mainWindow.scenarioTime)
    satIndex = [mainWindow.stateHistory[satIndex], mainWindow.stateHistory[satIndex+1]]
    // console.log(satIndex.map(s => s.t));
    let satPosition = math.add(math.dotMultiply((mainWindow.scenarioTime-satIndex[0].t)/(satIndex[1].t-satIndex[0].t), math.subtract(satIndex[1].state, satIndex[0].state)), satIndex[0].state)
    
    satPosition = mainWindow.moonFrame ? math.multiply(math.transpose(moonPositionR), satPosition.slice(0,3)) : satPosition
    let pixelStateSat = {
        x: cnvs.width/2 + satPosition[0]*(cnvs.width/2)/width,
        y: cnvs.height/2 - satPosition[1]*(cnvs.height/2)/height
    }
    // console.log(moonPosition, moonIndex.map(s => s.eci));
    moonPosition = mainWindow.moonFrame ? math.multiply(math.transpose(moonPositionR), moonPosition) : moonPosition
    let pixelStateMoon = {
        x: cnvs.width/2 + moonPosition[0]*(cnvs.width/2)/width,
        y: cnvs.height/2 - moonPosition[1]*(cnvs.height/2)/height
    }
    // console.log(pixelStateMoon, moonPosition);
    ctx.fillStyle = '#111111'
    ctx.beginPath()
    ctx.arc(pixelStateMoon.x, pixelStateMoon.y, moonPixelRadius, 0, 2*Math.PI)
    ctx.fill()
    ctx.fillRect(pixelStateSat.x-5,pixelStateSat.y-5,10,10)
    ctx.beginPath()
    ctx.arc(cnvs.width/2, cnvs.height/2, earthPixelRadius, 0, 2*Math.PI)
    ctx.fill()
    mainWindow.stateHistory.forEach((state, ii) => {
        s = state.state.slice()
        let moonState = mainWindow.moonHistory[ii]
        s = mainWindow.moonFrame ? math.multiply(math.transpose(moonState.r), s.slice(0,3)) : s
        let pixelState = {
            x: cnvs.width/2 + s[0]*(cnvs.width/2)/width,
            y: cnvs.height/2 - s[1]*(cnvs.height/2)/height
        }
        ctx.fillRect(pixelState.x,pixelState.y,2,2)
    })
}

function resetState(state = [42164, 0, 0, 0, 4.165, 0]) {
    mainWindow.state = state
    mainWindow.stateHistory = undefined
    drawScene()
}

function switchMoonState() {
    mainWindow.moon = !mainWindow.moon
    mainWindow.stateHistory = undefined
}

function placeObject(c = 1) {
    mainWindow.scenarioTime = 0
    let lu = 389703, tu = 382981, nMoon = 2*Math.PI/27.321661/86400
    let orbit = [7.1627000185352163E-1,	-1.6411271778715834E-23,	-2.0134878195215723E-25,	3.5357778774909676E-13,	6.0271938241417988E-1	,-7.2807370105120559E-25,	2.9515580026474799E+0,	5.5548679908081553E+0,	2.4622806759970263E+1,	6.8286682523419998E+1]
    orbit = [...orbit.slice(0,3).map(s => s*lu), ...math.add(orbit.slice(3,6).map(s => s*lu*c/tu),math.cross([0,0,nMoon], orbit.slice(0,3).map(s => s*lu*mainWindow.physicalConstants.massEarth/(mainWindow.physicalConstants.massEarth+mainWindow.physicalConstants.massMoon))))]
    state = orbit
    let moonInfo = getMoonPositionAndFrame(mainWindow.startTime)
    let satPosition = orbit
    console.log(math.dot(math.multiply(moonInfo.r, satPosition.slice(3)), moonInfo.eci.slice(0,3)));
    satPosition = [...math.multiply(moonInfo.r, satPosition.slice(0,3)),...math.multiply(moonInfo.r, satPosition.slice(3))]
    console.log(satPosition);
    resetState(satPosition)
}
let c = 1.052
let ints = setInterval(() => {
    c += 0.0001
    console.log(c.toFixed(4));
    placeObject(c)

},2000)
placeObject(1.03)