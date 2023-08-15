let mainWindow = {
    startTime: new Date(2023, 7, 7),
    scenarioLength: 2.4622806759970263E+1/2,
    scenarioTime: 0,
    moonGravity: true,
    moonFrame: true,
    mousePosition: undefined,
    mouseDown: false,
    epsilon: 1e-10,
    timeUnit: 382981,
    dt: 1000,
    eigEpsilon: 100,
    eigPropTime: 50,
    zBoundaryLevel: 0,
    initSunPosition: [1,0,0],
    lagrangePoints: [
        [0.83691513, 0,0],
        [1.15568217, 0,0],
        [-1.00506265, 0,0],
        [0.48784941, 0.86602540,0],
        [0.48784941, -0.86602540,0]
    ],
    lengthUnit: 389703,
    mu: 0.012150585609624039,
    zAxis: false,
    view: {
        el: 90,
        az: 0,
        center: [0,0,0],
        zoom: 1.5
    },
    physicalConstants: {
        deg2rad: 2*Math.PI / 180,
        rEarth: 6371,
        rMoon: 1738,
        muEarth: 398600.4418,
        muMoon: 4904.8695,
        massEarth: 5.972168e24,
        massMoon: 7.342e22
    },
    state: [0.8,0,0,0,0,0],
    stateHistory: [undefined, undefined, undefined],
    satellites: [
        {
            state: [0.8,0,0,0,0,0],
            stateHistory: undefined,
            color: '#ffffff',
            manifolds: []
        }
    ],
    displayedPoints: [],
    displayedLines: [],
    moonHistory: undefined,
    cnvs: document.querySelector('canvas')
}
let dt = 3600
let timeFunction = false
function animationLoop() {

    try {
        if (timeFunction) console.time()
        if (mainWindow.moonFrame) drawScene()
        else drawInertialScene()
        // mainWindow.scenarioTime += dt
        // console.log((mainWindow.scenarioTime/86400).toFixed(1));
        // mainWindow.view.el -= 1
        // mainWindow.view.az += 1
        // console.log(mainWindown.scenarioTime/86400 , mainWindow.scenarioLength);
        if (mainWindow.scenarioTime/86400 > mainWindow.scenarioLength) {
            mainWindow.scenarioTime = mainWindow.scenarioLength*84600
        }
        if (timeFunction) console.timeEnd()
        window.requestAnimationFrame(animationLoop)
    } catch (error) {
        console.log(error);
        mainWindow.scenarioTime = 0
        // animationLoop()
    }
}
openOrbitDiv()
openDraggableDiv()
animationLoop()

function crtbpAcceleration(state) {
    let mu = mainWindow.mu
    let x = state[0], y = state[1], z = state[2], dx = state[3], dy = state[4], dz = state[5]
    let y2 = y**2, z2 = z**2
    let r1 = ((x+mu)**2+y2+z2)**0.5
    let r2 = ((x+mu-1)**2+y2+z2)**0.5
    let r1cube = r1**3, r2cube = r2**3
    let moonGravity = mainWindow.moonGravity ? 1 : 0
    // console.log(state);
    // console.log([
    //     ...state.slice(3),
    //     -(1-mu)*(x+mu)/r1cube - mu*(x-1+mu)/r2cube+2*dy+x,
    //     -(1-mu)*y/r1cube - mu*y/r2cube-2*dx+y,
    //     -(1-mu)*z/r1cube - mu*z/r2cube
    // ]);
    return [
        ...state.slice(3),
        -(1-mu)*(x+mu)/r1cube - moonGravity*mu*(x-1+mu)/r2cube+2*dy+x,
        -(1-mu)*y/r1cube - moonGravity*mu*y/r2cube-2*dx+y,
        -(1-mu)*z/r1cube - moonGravity*mu*z/r2cube
    ]
}

function rkf45(state = [mainWindow.lagrangePoints[0][0],0,0,0,0,0], h = 0.01, epsilon = 1e-3) {
    let k1 = math.dotMultiply(h, crtbpAcceleration(state))
    let k2 = math.dotMultiply(h, crtbpAcceleration(math.add(state,math.dotMultiply(2/9,k1))))
    let k3 = math.dotMultiply(h, crtbpAcceleration(math.add(state,math.dotMultiply(1/12,k1),math.dotMultiply(1/4,k2))))
    let k4 = math.dotMultiply(h, crtbpAcceleration(math.add(state,math.dotMultiply(69/128,k1),math.dotMultiply(-243/128,k2),math.dotMultiply(135/64,k3))))
    let k5 = math.dotMultiply(h, crtbpAcceleration(math.add(state,math.dotMultiply(-17/12,k1),math.dotMultiply(27/4,k2),math.dotMultiply(-27/5,k3),math.dotMultiply(16/15,k4))))
    let k6 = math.dotMultiply(h, crtbpAcceleration(math.add(state,math.dotMultiply(65/432,k1),math.dotMultiply(-5/16,k2),math.dotMultiply(13/16,k3),math.dotMultiply(4/27,k4),math.dotMultiply(5/144,k5))))
    let y = math.add(state, math.dotMultiply(47/450, k1), math.dotMultiply(12/25, k3), math.dotMultiply(32/225, k4), math.dotMultiply(1/30, k5), math.dotMultiply(6/25, k6))
    
    let te = math.norm(math.add(math.dotMultiply(-1/150, k1), math.dotMultiply(3/100, k3), math.dotMultiply(-16/75, k4), math.dotMultiply(-1/20, k5), math.dotMultiply(6/25, k6)))
    let hnew = 0.9*h*(epsilon/te)**0.2
    if (te > epsilon) {
        y = state
        h = 0
    }
    return {y, hnew, dt: h, te}
}

function calculateStateHistory(state = mainWindow.satellites[0].state, length = mainWindow.scenarioLength, error = mainWindow.epsilon) {
    let t = 0, dt = math.sign(length)*mainWindow.dt, history = []
    dt /= mainWindow.timeUnit
    length *= 86400/mainWindow.timeUnit
    // length = 2000/tu
    while (math.abs(t) <= math.abs(length)) {
        history.push({
            t, state: state.slice()
        })
        let proppedState = rkf45(state, dt, error)
        // console.log(proppedState.te, dt);
        dt = proppedState.hnew
        state = proppedState.y
        t += proppedState.dt
    }
    let proppedState = rkf45(state, length-t, error)
        
    history.push({
        t: length, state: proppedState.y
    })
    // console.log(history.length);
    return history
}

function calculateStateHistoryToValue(state = mainWindow.state, length = mainWindow.scenarioLength, error = mainWindow.epsilon, value = {}) {
    let {xLimit = false, tolerance = 1e-6, returnHistory = true, objFunction = false, objFunctionValue} = value
    let t = 0, dt = math.sign(length)*mainWindow.dt, history = []
    dt /= mainWindow.timeUnit
    length *= 86400/mainWindow.timeUnit
    let stateOld = state.slice()
    // length = 2000/tu
    while (math.abs(t) <= math.abs(length)) {
        history.push({
            t, state: state.slice()
        })
        let proppedState = rkf45(state, dt, error)
        // console.log(proppedState.te, dt);
        dt = proppedState.hnew
        state = proppedState.y
        t += proppedState.dt
        // console.log(t);
        // console.log(objFunction);
        if (objFunction !== false) {
            let oldValue = objFunction(stateOld)-objFunctionValue
            let newValue = objFunction(state)-objFunctionValue
            if (oldValue*newValue < 0) {
                let tol = 1000, limit = 100, lim = 0
                while (tol > tolerance && lim < limit) {
                    dt /=-2
                    oldValue = newValue
                    while (oldValue*newValue > 0) {
                        state = rkf45(state, dt, error).y
                        t += dt
                        newValue = objFunction(state)-objFunctionValue
                    }
                    tol = math.abs(objFunction(state)-objFunctionValue)
                    // console.log(tol, lim, limit, objFunctionValue, newValue);
                    lim++
                }
                history.push({
                    t, state
                })
                // console.log(newValue, math.norm(math.subtract(state.slice(0,3),[-mainWindow.mu, 0, 0]))*mainWindow.lengthUnit);
                return history
            }
        }
    } 
    console.log('no solution');
    let proppedState = rkf45(state, length-t, error)
    history.push({
        t: length, state: proppedState.y
    })
    // console.log(history.length);
    return history
}

function updateCnvsSize() {
    mainWindow.cnvs.width = window.innerWidth
    mainWindow.cnvs.height = window.innerHeight
}

function getCurrentState(history, time) {

    let currentTime = time / mainWindow.timeUnit
    let states = history.filter(s => s.t <= currentTime)
    // console.log(states.length);
    states = states[states.length-1]
    // console.log(states.state, currentTime-states.t, 100);
    return rkf45(states.state, currentTime-states.t, 100).y
}

function drawScene() {
    updateCnvsSize()
    // console.log(rotEci);
    let center = mainWindow.view.center
    


    let rot3d = math.multiply( astro.rot(90-mainWindow.view.el, 1), astro.rot(-mainWindow.view.az, 3))
    // console.log(astro.rot(mainWindow.scenarioTime/mainWindow.timeUnit*360,3));
    

    // console.log(sunPos);
    let screenDistance = mainWindow.view.zoom
    let width = window.innerHeight < window.innerWidth ? screenDistance * window.innerWidth / window.innerHeight : screenDistance 
    let height = width * window.innerHeight / window.innerWidth
    // console.log(width, height);
    let cnvs = mainWindow.cnvs
    let ctx = cnvs.getContext('2d')
    ctx.fillStyle = '#111122'
    ctx.fillRect(0,0,cnvs.width,cnvs.height)

    let sunPos = astro.sunEciFromTime(new Date(mainWindow.startTime - (-1000*mainWindow.scenarioTime)))
    sunPos = eci2synodicUnitless([...sunPos,0,0,0], new Date(mainWindow.startTime - (-1000*mainWindow.scenarioTime))).slice(0,3)
    try {
        let selects = [...document.querySelectorAll('.pointing-select')].map(s => {
            return {
                sat: Number(s.getAttribute('sat')),
                value: Number(s.value),
                el: s,
                displays: s.parentElement.parentElement.querySelectorAll('.data-display')
            }
        })
        selects.forEach(s => {
            if (s.value === -1) {
                s.el.parentElement.parentElement.querySelector('.pointing-display').style.display = 'none'
                return
            }
            else {
                s.el.parentElement.parentElement.querySelector('.pointing-display').style.display = ''
            }
            let origin = getCurrentState(mainWindow.satellites[s.sat].stateHistory, mainWindow.scenarioTime)
            let target = getCurrentState(mainWindow.satellites[s.value].stateHistory, mainWindow.scenarioTime)
            let relativePosition = math.subtract(target, origin).slice(0,3)
            let relativeEarth = math.subtract([-mainWindow.mu,0,0], origin.slice(0,3))
            let relativeMoon = math.subtract([1-mainWindow.mu,0,0], origin.slice(0,3))
            let relativeSun = math.subtract(sunPos, origin.slice(0,3))
            let moonAngle = Math.acos(math.dot(relativeMoon, relativePosition)/math.norm(relativeMoon)/math.norm(relativePosition))*180/Math.PI
            let earthAngle = Math.acos(math.dot(relativeEarth, relativePosition)/math.norm(relativeEarth)/math.norm(relativePosition))*180/Math.PI
            let sunAngle = Math.acos(math.dot(relativeSun, relativePosition)/math.norm(relativeSun)/math.norm(relativePosition))*180/Math.PI
            s.displays[0].innerText = math.norm(relativePosition.map(s => s*mainWindow.lengthUnit)).toFixed(2) + ' km'
            s.displays[1].innerText = earthAngle.toFixed(2) + ' deg'
            s.displays[2].innerText = sunAngle.toFixed(2) + ' deg'
            s.displays[3].innerText = moonAngle.toFixed(2) + ' deg'
        })
    } catch (error) {
        
    }
    let sunNorm = math.norm(sunPos)
    sunPos = sunPos.map(s => s*(1-mainWindow.mu)/sunNorm)
    // console.log(sunPos);
    sunPos = math.multiply(rot3d,math.subtract(sunPos, center))
    let pixelStateSun = {
        x: cnvs.width/2 + (sunPos[0])*(cnvs.width/2)/width,
        y: cnvs.height/2 - (sunPos[1])*(cnvs.height/2)/height
    }
    ctx.strokeStyle = 'orange'
    ctx.beginPath()
    ctx.moveTo(cnvs.width/2, cnvs.height/2)
    ctx.lineTo(pixelStateSun.x, pixelStateSun.y)
    ctx.stroke()
    let moonPosition = [1-mainWindow.mu, 0, 0]
    moonPosition = math.multiply(rot3d,math.subtract(moonPosition,center))
    let moonRadius = mainWindow.physicalConstants.rMoon/mainWindow.lengthUnit/width/2*window.innerWidth
    
    let earthPosition = [-mainWindow.mu, 0, 0]
    earthPosition = math.multiply(rot3d,math.subtract(earthPosition, center))
    let earthRadius = mainWindow.physicalConstants.rEarth/mainWindow.lengthUnit/width/2*window.innerWidth
    let pixelStateMoon = {
        x: cnvs.width/2 + (moonPosition[0])*(cnvs.width/2)/width,
        y: cnvs.height/2 - (moonPosition[1])*(cnvs.height/2)/height
    }
    let pixelStateEarth = {
        x: cnvs.width/2 + (earthPosition[0])*(cnvs.width/2)/width,
        y: cnvs.height/2 - (earthPosition[1])*(cnvs.height/2)/height
    }
    let currentTime = astro.toStkDateFormat(new Date(mainWindow.startTime - (-1000*mainWindow.scenarioTime)))
    document.querySelector('#time-display').innerText = currentTime
    
    
    // console.log(currentSatPosition.slice(0,3));
    // // console.log(pixelStateMoon, moonPosition);
    ctx.fillStyle = '#bbbbbb'
    ctx.strokeStyle = '#ff8888'
    // ctx.beginPath()
    // ctx.arc(pixelStateMoon.x, pixelStateMoon.y, moonPixelRadius, 0, 2*Math.PI)
    // ctx.fill()
    // ctx.fillRect(pixelStateSat.x-5,pixelStateSat.y-5,10,10)
    let lagrangePoints = [
        [0.83691513, 0,0],
        [1.15568217, 0,0],
        [-1.00506265, 0,0],
        [0.48784941, 0.86602540,0],
        [0.48784941, -0.86602540,0]
    ].forEach(point => {
        let pointRot = math.multiply(rot3d,math.subtract(point, center))
        let pixelState = {
            x: cnvs.width/2 + (pointRot[0])*(cnvs.width/2)/width,
            y: cnvs.height/2 - (pointRot[1])*(cnvs.height/2)/height
        }
        ctx.strokeRect(pixelState.x-5, pixelState.y-5, 10,10)

    })
    ctx.beginPath()
    ctx.arc(pixelStateEarth.x, pixelStateEarth.y, earthRadius, 0, 2*Math.PI)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(pixelStateMoon.x, pixelStateMoon.y, moonRadius, 0, 2*Math.PI)
    ctx.fill()
    ctx.strokeStyle = '#aaaaaa'
    mainWindow.satellites.forEach(sat => {
        if (sat.stateHistory === undefined) {
            sat.stateHistory = calculateStateHistory(sat.state, mainWindow.scenarioLength)
        }
        ctx.beginPath()
        sat.stateHistory.forEach((state, ii) => {
            let pointRot = math.multiply(rot3d, math.subtract(state.state.slice(0,3),center))
            let pixelState = {
                x: cnvs.width/2 + (pointRot[0])*(cnvs.width/2)/width,
                y: cnvs.height/2 - (pointRot[1])*(cnvs.height/2)/height
            }
            if (ii === 0) ctx.moveTo(pixelState.x,pixelState.y)
            else ctx.lineTo(pixelState.x,pixelState.y)
        })
        sat.manifolds.forEach(man => {
            man.forEach((state, ii) => {
                let pointRot = math.multiply(rot3d, math.subtract(state.state.slice(0,3),center))
                let pixelState = {
                    x: cnvs.width/2 + (pointRot[0])*(cnvs.width/2)/width,
                    y: cnvs.height/2 - (pointRot[1])*(cnvs.height/2)/height
                }
                if (ii === 0) ctx.moveTo(pixelState.x,pixelState.y)
                else ctx.lineTo(pixelState.x,pixelState.y)
            })
        })
        
        ctx.stroke()

        // Draw sat current position
        let currentSatPosition = getCurrentState(sat.stateHistory, mainWindow.scenarioTime)
        // findStateEigenvectors(currentSatPosition, 1)

        currentSatPosition = math.multiply(rot3d,math.subtract(currentSatPosition.slice(0,3), center))
        let pixelStateSat = {
            x: cnvs.width/2 + (currentSatPosition[0])*(cnvs.width/2)/width,
            y: cnvs.height/2 - (currentSatPosition[1])*(cnvs.height/2)/height
        }
        ctx.fillRect(pixelStateSat.x-5, pixelStateSat.y-5, 10,10)
    })
    mainWindow.displayedPoints.forEach(point => {
        let pointRot = math.multiply(rot3d,math.subtract(point.slice(0,3),center))
        let pixelState = {
            x: cnvs.width/2 + (pointRot[0])*(cnvs.width/2)/width,
            y: cnvs.height/2 - (pointRot[1])*(cnvs.height/2)/height
        }
        ctx.fillRect(pixelState.x-5, pixelState.y-5, 10,10)

    })
    mainWindow.displayedLines.forEach(line => {
        ctx.strokeStyle = line.color
        ctx.beginPath()
        // console.log(line);
        line.line.forEach((state, ii) => {
            // console.log(line);
            let pointRot = math.multiply(rot3d,math.subtract(state.slice(0,3),center))
            let pixelState = {
                x: cnvs.width/2 + (pointRot[0])*(cnvs.width/2)/width,
                y: cnvs.height/2 - (pointRot[1])*(cnvs.height/2)/height
            }
            if (ii === 0) ctx.moveTo(pixelState.x,pixelState.y)
            else ctx.lineTo(pixelState.x,pixelState.y)
        })
        
        ctx.stroke()
    })
    // Draw GEO-Belt
    let r = 42164/mainWindow.lengthUnit, earthPoint = [-mainWindow.mu,0,0]
    ctx.beginPath()
    ctx.strokeStyle = '#333366'
    for (let index = 0; index < 360; index+=10) {
        let pointPosition = math.add(earthPoint, [r*Math.cos(index*Math.PI/180), r*Math.sin(index*Math.PI/180), 0])
        pointPosition = math.multiply(rot3d,math.subtract(pointPosition,center))
        pointPosition = {
            x: cnvs.width/2 + (pointPosition[0])*(cnvs.width/2)/width,
            y: cnvs.height/2 - (pointPosition[1])*(cnvs.height/2)/height
        }
        if (index === 0) ctx.moveTo(pointPosition.x, pointPosition.y)
        else ctx.lineTo(pointPosition.x, pointPosition.y)
    }
    ctx.closePath()
    ctx.stroke()
    // ctx.closePath()
}

function drawInertialScene() {
    updateCnvsSize()
    let rotEci = math.identity([3])
    if (!mainWindow.moonFrame) {
        rotEci = astro.rot(-mainWindow.scenarioTime/mainWindow.timeUnit,3,false)
    }
    // console.log(rotEci);
    let center = [0,0,0]
    let rot3d = math.multiply( astro.rot(90-mainWindow.view.el, 1), astro.rot(-mainWindow.view.az, 3))
    let screenDistance = mainWindow.view.zoom
    let width = window.innerHeight < window.innerWidth ? screenDistance * window.innerWidth / window.innerHeight : screenDistance 
    let height = width * window.innerHeight / window.innerWidth
    // console.log(width, height);
    let cnvs = mainWindow.cnvs
    let ctx = cnvs.getContext('2d')
    ctx.fillStyle = '#111122'
    ctx.fillRect(0,0,cnvs.width,cnvs.height)
    let moonPosition = [1-mainWindow.mu, 0, 0]
    moonPosition = math.multiply(rot3d, rotEci,math.subtract(moonPosition,center))
    let moonRadius = mainWindow.physicalConstants.rMoon/mainWindow.lengthUnit/width/2*window.innerWidth
    
    let earthPosition = [-mainWindow.mu, 0, 0]
    earthPosition = math.multiply(rot3d, rotEci,math.subtract(earthPosition, center))
    let earthRadius = mainWindow.physicalConstants.rEarth/mainWindow.lengthUnit/width/2*window.innerWidth
    let pixelStateMoon = {
        x: cnvs.width/2 + (moonPosition[0])*(cnvs.width/2)/width,
        y: cnvs.height/2 - (moonPosition[1])*(cnvs.height/2)/height
    }
    let pixelStateEarth = {
        x: cnvs.width/2 + (earthPosition[0])*(cnvs.width/2)/width,
        y: cnvs.height/2 - (earthPosition[1])*(cnvs.height/2)/height
    }
    let currentTime = astro.toStkDateFormat(new Date(mainWindow.startTime - (-1000*mainWindow.scenarioTime)))
    document.querySelector('#time-display').innerText = currentTime
    
    // console.log(currentSatPosition.slice(0,3));
    // // console.log(pixelStateMoon, moonPosition);
    ctx.fillStyle = '#bbbbbb'
    ctx.strokeStyle = '#ff8888'
    // ctx.beginPath()
    // ctx.arc(pixelStateMoon.x, pixelStateMoon.y, moonPixelRadius, 0, 2*Math.PI)
    // ctx.fill()
    // ctx.fillRect(pixelStateSat.x-5,pixelStateSat.y-5,10,10)
    let lagrangePoints = [
        [0.83691513, 0,0],
        [1.15568217, 0,0],
        [-1.00506265, 0,0],
        [0.48784941, 0.86602540,0],
        [0.48784941, -0.86602540,0]
    ].forEach(point => {
        let pointRot = math.multiply(rot3d, rotEci,math.subtract(point, center))
        let pixelState = {
            x: cnvs.width/2 + (pointRot[0])*(cnvs.width/2)/width,
            y: cnvs.height/2 - (pointRot[1])*(cnvs.height/2)/height
        }
        ctx.strokeRect(pixelState.x-5, pixelState.y-5, 10,10)

    })
    ctx.beginPath()
    ctx.arc(pixelStateEarth.x, pixelStateEarth.y, earthRadius, 0, 2*Math.PI)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(pixelStateMoon.x, pixelStateMoon.y, moonRadius, 0, 2*Math.PI)
    ctx.fill()
    ctx.strokeStyle = '#aaaaaa'
    
    mainWindow.satellites.forEach(sat => {
        if (sat.stateHistory === undefined) {
            sat.stateHistory = calculateStateHistory(sat.state, mainWindow.scenarioLength)
        }
        ctx.beginPath()
        sat.stateHistory.forEach((state, ii) => {
            let rotState = math.identity([3])
            if (!mainWindow.moonFrame){
                rotState = astro.rot(-state.t,3,false)
            }
            let pointRot = math.multiply(rot3d, rotState, math.subtract(state.state.slice(0,3),center))
            let pixelState = {
                x: cnvs.width/2 + (pointRot[0])*(cnvs.width/2)/width,
                y: cnvs.height/2 - (pointRot[1])*(cnvs.height/2)/height
            }
            if (ii === 0) ctx.moveTo(pixelState.x,pixelState.y)
            else ctx.lineTo(pixelState.x,pixelState.y)
        })
        
        ctx.stroke()

        // Draw sat current position
        let currentSatPosition = getCurrentState(sat.stateHistory, mainWindow.scenarioTime)
        // findStateEigenvectors(currentSatPosition, 1)

        currentSatPosition = math.multiply(rot3d,rotEci,math.subtract(currentSatPosition.slice(0,3), center))
        let pixelStateSat = {
            x: cnvs.width/2 + (currentSatPosition[0])*(cnvs.width/2)/width,
            y: cnvs.height/2 - (currentSatPosition[1])*(cnvs.height/2)/height
        }
        ctx.fillRect(pixelStateSat.x-5, pixelStateSat.y-5, 10,10)
    })
    mainWindow.displayedPoints.forEach(point => {
        let pointRot = math.multiply(rot3d, rotEci,math.subtract(point.slice(0,3),center))
        let pixelState = {
            x: cnvs.width/2 + (pointRot[0])*(cnvs.width/2)/width,
            y: cnvs.height/2 - (pointRot[1])*(cnvs.height/2)/height
        }
        ctx.fillRect(pixelState.x-5, pixelState.y-5, 10,10)

    })
    mainWindow.displayedLines.forEach(line => {
        ctx.strokeStyle = line.color
        ctx.beginPath()
        // console.log(line);
        line.line.forEach((state, ii) => {
            // console.log(line);
            let pointRot = math.multiply(rot3d, rotEci,math.subtract(state.slice(0,3),center))
            let pixelState = {
                x: cnvs.width/2 + (pointRot[0])*(cnvs.width/2)/width,
                y: cnvs.height/2 - (pointRot[1])*(cnvs.height/2)/height
            }
            if (ii === 0) ctx.moveTo(pixelState.x,pixelState.y)
            else ctx.lineTo(pixelState.x,pixelState.y)
        })
        
        ctx.stroke()
    })
    // Draw GEO-Belt
    let r = 42164/mainWindow.lengthUnit, earthPoint = [-mainWindow.mu,0,0]
    ctx.beginPath()
    ctx.strokeStyle = '#333366'
    for (let index = 0; index < 360; index+=10) {
        let pointPosition = math.add(earthPoint, [r*Math.cos(index*Math.PI/180), r*Math.sin(index*Math.PI/180), 0])
        pointPosition = math.multiply(rot3d, rotEci,math.subtract(pointPosition,center))
        pointPosition = {
            x: cnvs.width/2 + (pointPosition[0])*(cnvs.width/2)/width,
            y: cnvs.height/2 - (pointPosition[1])*(cnvs.height/2)/height
        }
        if (index === 0) ctx.moveTo(pointPosition.x, pointPosition.y)
        else ctx.lineTo(pointPosition.x, pointPosition.y)
    }
    ctx.closePath()
    ctx.stroke()
    // ctx.closePath()
}

function switchMoonState() {
    mainWindow.moonGravity = !mainWindow.moonGravity
    mainWindow.stateHistory[0] = undefined
}

function placeCirlcularOrbitEarth(r = 42164, ang = 0, mod = 1.2) {
    let earthMu = 398600.4418
    let v = (earthMu/r)**0.5*mod
    let position = [r*Math.cos(ang*Math.PI/180), r*Math.sin(ang*Math.PI/180), 0].map(s => s/mainWindow.lengthUnit)
    position = math.add(position, [-mainWindow.mu,0,0])
    velocity = [-v*Math.sin(ang*Math.PI/180), v*Math.cos(ang*Math.PI/180), 0].map(s => s*mainWindow.timeUnit/mainWindow.lengthUnit)
    velocity = math.subtract(velocity, math.cross([0,0,1], position))
    let state = [...position, ...velocity]
    mainWindow.state = state
    mainWindow.stateHistory[0] = undefined
}

function placeCirlcularOrbitMoon(r = 8000, ang = 0) {
    let v = (mainWindow.mu/r)**0.5
    let position = [r*Math.cos(ang*Math.PI/180), r*Math.sin(ang*Math.PI/180), 0].map(s => s/mainWindow.lengthUnit)
    position = math.add(position, [1-mainWindow.mu,0,0])
    velocity = [-v*Math.sin(ang*Math.PI/180), v*Math.cos(ang*Math.PI/180), 0]
    velocity = math.subtract(velocity, math.cross([0,0,1], position))
    let state = [...position, ...velocity]
    mainWindow.state = state
    mainWindow.stateHistory[0] = undefined
}

function synodicUnitless2eci(time = 0, sat = 0) {
    let date = new Date(mainWindow.startTime - (-1000*time))
    // console.log(date);
    let moonEci = astro.moonEciFromTime(date)
    let moonEciDel = astro.moonEciFromTime(new Date(date-(-1)))
    let moonVel = math.subtract(moonEciDel, moonEci).map(s => s/0.001)

    let moonX = moonEci.map(s => s/math.norm(moonEci))
    let moonZ = math.cross(moonEci, moonVel)
    moonZ = moonZ.map(s => s/math.norm(moonZ))
    let moonY = math.cross(moonZ, moonX)
    let r = math.transpose([moonX, moonY, moonZ])
    let position = mainWindow.satellites[sat].state.slice(0,3)
    let velocity = mainWindow.satellites[sat].state.slice(3)
    velocity = math.add(velocity, math.cross([0,0,1],position))
    position = math.subtract(position, [-mainWindow.mu,0,0])
    let stateInertial = [...position.map(s => s*mainWindow.lengthUnit), ...velocity.map(s => s*mainWindow.lengthUnit/mainWindow.timeUnit)]
    
    stateInertial = [...math.multiply(r, stateInertial.slice(0,3)), ...math.multiply(r, stateInertial.slice(3))]
    return stateInertial
}

function open2Dgraph(x = math.range(0,25,0.1)._data, y = math.range(0,25,0.1)._data.map(s => s**2), options = {}) {
    let {yLimits, xLimits, colors=[], xlabel= 'X Axis', ylabel='Y Axis', title='2D Plot'} = options
    let graphDiv = document.createElement('div')
    graphDiv.style.position = 'fixed'
    graphDiv.style.zIndex = 50
    graphDiv.style.left = '20vw'
    graphDiv.style.top = '20vh'
    graphDiv.style.width = '60vw'
    graphDiv.style.height = '60vh'
    graphDiv.style.border = '2px solid white'
    graphDiv.style.backgroundColor = '#1111aa'
    graphDiv.innerHTML = `
        <canvas style="width: 100%; height: 100%;" id="graph-canvas"></canvas>
    `
    document.body.append(graphDiv)
    let cnvs = document.querySelector('#graph-canvas')
    cnvs.onclick = function(el) {el.target.parentElement.remove()}
    let ctx = cnvs.getContext('2d')
    cnvs.width = cnvs.clientWidth
    cnvs.height = cnvs.clientHeight
    let xRange = math.max(x)-math.min(x)
    let yRange = math.max(y)-math.min(y)
    let graphLimits = {
        xPixel: [cnvs.width*0.1, cnvs.width*0.9],
        yPixel: [cnvs.height*0.1, cnvs.height-cnvs.width*0.1],
        x: xLimits === undefined ? [math.min(x)-xRange*0.1, math.max(x)+xRange*0.1] : xLimits,
        y: yLimits === undefined ? [math.min(y)-yRange*0.1, math.max(y)+yRange*0.1] : yLimits
    }
    console.log(graphLimits.y, graphLimits.x);
    // Draw X and Y Axis
    ctx.fillStyle = 'white'
    ctx.strokeStyle = 'white'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(cnvs.width*0.1, cnvs.height*0.1)
    ctx.lineTo(cnvs.width*0.1, cnvs.height-cnvs.width*0.1)
    ctx.lineTo(cnvs.width*0.9, cnvs.height-cnvs.width*0.1)
    ctx.stroke()
    ctx.textBaseline = 'bottom'
    ctx.textAlign = 'center'
    ctx.font = 'bold +'+cnvs.height/20+'px serif'
    ctx.fillText(xlabel, cnvs.width/2, cnvs.height)
    
    ctx.save();
    ctx.translate(0, cnvs.height/2)
    ctx.rotate(Math.PI/2)
    ctx.fillText(ylabel, 0, 0)
    ctx.restore();
    ctx.font = 'bold +'+cnvs.height/15+'px serif'
    ctx.textBaseline = 'top'
    ctx.fillText(title, cnvs.width/2, 4)
    for (let point = 0; point < x.length; point++) {
        ctx.strokeStyle = colors[point] === undefined ? 'white' : colors[point]
        let graphedPoint = [x[point], y[point]]
        let pixel = {
            x: (graphedPoint[0]-graphLimits.x[0])*(graphLimits.xPixel[1]-graphLimits.xPixel[0])/(graphLimits.x[1]-graphLimits.x[0])+graphLimits.xPixel[0],
            y: graphLimits.yPixel[1]-(graphedPoint[1]-graphLimits.y[0])*(graphLimits.yPixel[1]-graphLimits.yPixel[0])/(graphLimits.y[1]-graphLimits.y[0])
        }
        ctx.beginPath()
        ctx.arc(pixel.x, pixel.y, 0.5, 0, 2*Math.PI)
        ctx.stroke()
    }
    
}

function eci2synodicUnitless(state = synodicUnitless2eci(), date = mainWindow.startTime) {
    // console.log(date);
    let moonEci = astro.moonEciFromTime(date)
    let moonEciDel = astro.moonEciFromTime(new Date(date-(-1)))
    let moonVel = math.subtract(moonEciDel, moonEci).map(s => s/0.001)
    let moonX = moonEci.map(s => s/math.norm(moonEci))
    let moonZ = math.cross(moonEci, moonVel)
    moonZ = moonZ.map(s => s/math.norm(moonZ))
    let moonY = math.cross(moonZ, moonX)
    let r = [moonX, moonY, moonZ]
    // console.log(r.map(s => math.norm(s)));
    state = [...math.multiply(r, state.slice(0,3)), ...math.multiply(r, state.slice(3))]
    let position = state.slice(0,3).map(s => s/mainWindow.lengthUnit)
    let velocity = state.slice(3).map(s => s*mainWindow.timeUnit/mainWindow.lengthUnit)
    position = math.add(position, [-mainWindow.mu,0,0])
    velocity = math.subtract(velocity, math.cross([0,0,1],position))
    // let position = mainWindow.satellites[sat].state.slice(0,3)
    // let velocity = mainWindow.satellites[sat].state.slice(3)
    return [...position, ...velocity]
}

function placeObject(orbit = l2_halo_southern[1250].join('   '), sat = 0) {
    // console.log(orbit);
    mainWindow.scenarioTime = 0
    // let orbit = `1147	8.2339081983651485E-1	-1.9017764504099543E-28	9.8941366235910004E-4	-2.3545391932685812E-15	1.2634272983881797E-1	2.2367029429442455E-16	3.1743435193301202E+0	2.7430007981241529E+0	1.2158772936893689E+1	1.1804065333857600E+3`.split('\t').map(s => Number(s))
    orbit = orbit.split(/ +/).filter(s => s.length > 0).map(s => Number(s))
    mainWindow.satellites[sat].state = orbit.slice(0,6)
    mainWindow.satellites[sat].stateHistory = undefined
    mainWindow.scenarioLength = orbit[7]*2*mainWindow.timeUnit/86400
    solveJacobiBoundaries(orbit.slice(0,6))
    // drawScene()
}
// let c = 1.052
// let ints = setInterval(() => {
//     c += 0.0001
//     console.log(c.toFixed(4));
//     placeObject(c)

// },2000)

document.querySelector('canvas').addEventListener('pointerdown', event => {
    mainWindow.mouseDown = true
    
    document.getElementById('context-menu')?.remove();
    mainWindow.mousePosition = [event.clientX, event.clientY]
})
document.querySelector('canvas').addEventListener('pointermove', event => {
    mainWindow.mousePosition = mainWindow.mousePosition === undefined ? [0,0] : mainWindow.mousePosition
    let delta = math.subtract([event.clientX, event.clientY], mainWindow.mousePosition)
    if (mainWindow.mouseDown) {
        // Do stuff
        // console.log(mainWindow.view.el, mainWindow.view.az);
        mainWindow.view.el += delta[1]/5
        mainWindow.view.az += delta[0]/5

    }
    mainWindow.mousePosition = [event.clientX, event.clientY]
})
document.querySelector('canvas').addEventListener('pointerup', event => {
    mainWindow.mouseDown = false
})

window.addEventListener('wheel', event => {
    mainWindow.view.zoom += event.deltaY/200
    mainWindow.view.zoom = mainWindow.view.zoom < 0.1 ? 0.1 : mainWindow.view.zoom
    mainWindow.view.zoom = mainWindow.view.zoom > 2 ? 2 : mainWindow.view.zoom
})

function changeOrbit(el) {
    while (!el.classList.contains('orbit-drag-panel')) {
        el = el.parentElement
    }
    let sat = el.getAttribute('sat');
   let input = Number(el.querySelector('input').value)
   let select = el.querySelector('select').value
   
   let dataLength = math.floor(orbits[select].length*input);
   let data = orbits[select][dataLength]
//    console.log(data);
   placeObject(data.join('   '), sat)
}

function openOrbitDiv(sat=0) {
    let newDiv = document.createElement('div')
    newDiv.style.position = 'fixed'
    newDiv.style.padding = '1vh 0.5vh'
    newDiv.style.zIndex = 100
    newDiv.style.top = '20px'
    newDiv.style.left = '20px'
    newDiv.style.width = 'auto'
    newDiv.style.height = 'auto'
    newDiv.style.fontFamily = 'Courier'
    newDiv.style.fontSize = '1.5vh'
    newDiv.style.backgroundColor = 'white'
    newDiv.style.border = '1px solid black'
    newDiv.style.borderRadius = '10px'
    newDiv.style.boxShadow = '5px 5px 7px #575757'
    newDiv.style.touchAction = 'none'
    newDiv.innerHTML = `
    <div id="orbit-drag-div-${sat}header" style="text-align: center; cursor: move;">Satellite</div>
    <div style="text-align: center">
        <div><h3 style="margin: 0px 5px;">Orbit Type</h3></div>
        <select oninput="changeOrbit(this)" style="font-size: 1.5vh">
        ${Object.keys(orbits).map((key,ii) => {
            return `
                <option value="${key}">${key.toUpperCase()}</label>
            `
        }).join('')}
        </select>
    </div>
    <div>
        <div>Jacobi's Constant: <span>0</span></div>
        <div><input oninput="changeOrbit(this)" type="range" style="width: 95%; height: 10px;" min="0" max="1" value="0.71" step="0.01"/></div>
    </div>
    <div style="text-align: center">
        <div><h3 style="margin: 0px 5px;">Show Manifolds</h3></div>
        <div style="display: flex; justify-content: space-around;">   
            <div>
                <div>Instant</div>
                <div><button onclick="showManifold(this)" sat="${sat}" mantype="stable-instant" style="font-size: 1em;">Stable</button></div>
                <div style="margin-bottom: 5px;"><button onclick="enterStableManifold(${sat}, -1)" style="font-size: 0.75em;">Enter -X</button><button onclick="enterStableManifold(${sat}, 1)" style="font-size: 0.75em;">Enter +X</button></div>
                <div><button onclick="showManifold(this)" sat="${sat}" mantype="unstable-instant" style="font-size: 1em;">Unstable</button></div>
            </div>
            <div>
                <div>Total</div>
                <div><button onclick="showManifold(this)" sat="${sat}" mantype="stable-all" style="font-size: 1em;">Stable</button></div>
                <div><button onclick="showManifold(this)" sat="${sat}" mantype="unstable-all" style="font-size: 1em;">Unstable</button></div>
            </div>
        </div>
    </div>
    <div>
        <div>Pointing: <select class="pointing-select" sat="${sat}">
            <option value="-1">None</option>
            ${math.range(0,mainWindow.satellites.length-1)._data.map(s => {
                return `
                    <option value="${s}">${s}</option>
                `
            }).join('')}
            </select>
        </div>
        <div class="pointing-display">
            <div style="display: flex; justify-content: space-between;">
                <div>r</div>
                <div class="data-display">10000 km</div>
            </div>
            <div style="display: flex; justify-content: space-between;">
                <div>Earth</div>
                <div class="data-display">10 deg</div>
            </div>
            <div style="display: flex; justify-content: space-between;">
                <div>Sun</div>
                <div class="data-display">10 deg</div>
            </div>
            <div style="display: flex; justify-content: space-between;">
                <div>Moon</div>
                <div class="data-display">10 deg</div>
            </div>
        </div>
    </div>
    `
    newDiv.id = 'orbit-drag-div-'+sat
    newDiv.setAttribute('sat', sat)
    newDiv.classList.add('orbit-drag-panel')
    let exitButton = document.createElement('div')
    exitButton.innerText = 'X'
    exitButton.style.position = 'absolute'
    exitButton.style.top = '1px'
    exitButton.style.right = '3px'
    exitButton.style.cursor = 'pointer'
    exitButton.onclick = el => {
        el.target.parentElement.remove()
    }
    let fontSizeButton = document.createElement('div')
    fontSizeButton.innerHTML = '<span type="small" style="font-size: 0.5em; margin-right: 15px; cursor: pointer">A</span><span type="big" style="font-size: 1em; cursor: pointer">A</span>'
    fontSizeButton.style.position = 'absolute'
    fontSizeButton.style.top = '1px'
    fontSizeButton.style.left = '3px'
    fontSizeButton.classList.add('font-size-button')
    // If exit button clicked remove data requirement
    document.body.append(newDiv)
    // newDiv.append(exitButton)
    newDiv.append(fontSizeButton)
    let fontButtons = [...newDiv.querySelector('.font-size-button').querySelectorAll('span')].forEach(sp => {
        sp.onclick = el => {
            let relDiv = el.target.parentElement.parentElement
            let fontSize = Number(relDiv.style.fontSize.slice(0, relDiv.style.fontSize.length - 2))
            fontSize += el.target.getAttribute('type') === 'big' ? 1 : -1
            fontSize = fontSize < 12 ? 12 : fontSize
            relDiv.style.fontSize = fontSize + 'px'
        }
    })
    dragElement(newDiv)
}

function showManifold(el) {
    let type = el.getAttribute('mantype').split('-')
    let sat = Number(el.getAttribute('sat'))
    console.log(sat);
    mainWindow.satellites[sat].manifolds = []
    if (type[1] === 'instant') {
        let curState = getCurrentState(mainWindow.satellites[sat].stateHistory, mainWindow.scenarioTime)
        mainWindow.satellites[sat].manifolds.push(findStateEigenvectors(curState, 1, type[0] === 'stable'))
        mainWindow.satellites[sat].manifolds.push(findStateEigenvectors(curState, -1, type[0] === 'stable' ))
        return
    }
    showTubeManifold(type[0] === 'stable', 1, sat)
    showTubeManifold(type[0] === 'stable', -1, sat)

}

function setTime(fractionTime = 0) {
    mainWindow.scenarioTime = mainWindow.scenarioLength*86400*fractionTime
}

function openDraggableDiv(innerHTML, id = 'time-drag-div') {
    let newDiv = document.createElement('div')
    newDiv.style.position = 'fixed'
    newDiv.style.padding = '0px 10px 10px 10px'
    newDiv.style.zIndex = 100
    newDiv.style.top = '80vh'
    newDiv.style.left = '20px'
    newDiv.style.width = 'auto'
    newDiv.style.height = 'auto'
    newDiv.style.fontFamily = 'Courier'
    newDiv.style.fontSize = '20px'
    newDiv.style.backgroundColor = 'white'
    newDiv.style.border = '1px solid black'
    newDiv.style.borderRadius = '10px'
    newDiv.style.boxShadow = '5px 5px 7px #575757'
    newDiv.style.touchAction = 'none'
    newDiv.innerHTML = innerHTML || `
        <div style="cursor: move; padding-left: 40px;" id="time-drag-divheader">Time Display</div>
        <div id="time-display">${astro.toStkDateFormat(new Date())}</div>
        <div style="width: 100%"><input oninput="setTime(this.value)" style="width: 100%" type="range" value="0" min="0" max="1" step="0.001"/></div>
    `
    newDiv.id = id
    let fontSizeButton = document.createElement('div')
    fontSizeButton.innerHTML = '<span type="small" style="font-size: 0.5em; margin-right: 15px; cursor: pointer">A</span><span type="big" style="font-size: 1em; cursor: pointer">A</span>'
    fontSizeButton.style.position = 'absolute'
    fontSizeButton.style.top = '1px'
    fontSizeButton.style.left = '3px'
    fontSizeButton.classList.add('font-size-button')
    // If exit button clicked remove data requirement
    document.body.append(newDiv)
    // newDiv.append(exitButton)
    newDiv.append(fontSizeButton)
    let fontButtons = [...newDiv.querySelector('.font-size-button').querySelectorAll('span')].forEach(sp => {
        sp.onclick = el => {
            let relDiv = el.target.parentElement.parentElement
            let fontSize = Number(relDiv.style.fontSize.slice(0, relDiv.style.fontSize.length - 2))
            fontSize += el.target.getAttribute('type') === 'big' ? 1 : -1
            fontSize = fontSize < 12 ? 12 : fontSize
            relDiv.style.fontSize = fontSize + 'px'
        }
    })
    dragElement(newDiv)
}

function dragElement(elmnt) {
    var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    // console.log(elmnt.id + "header");
    if (document.getElementById(elmnt.id + "header")) {
        // console.log('hey');
      // if present, the header is where you move the DIV from:
      document.getElementById(elmnt.id + "header").onpointerdown = dragMouseDown;
    } else {
      // otherwise, move the DIV from anywhere inside the DIV:
      elmnt.onpointerdown = dragMouseDown;
    }
  
    function dragMouseDown(e) {
      e = e || window.event;
      e.preventDefault();
      // get the mouse cursor position at startup:
      pos3 = e.clientX;
      pos4 = e.clientY;
      document.onpointerup = closeDragElement;
      // call a function whenever the cursor moves:
      document.onpointermove = elementDrag;
    }
  
    function elementDrag(e) {
      e = e || window.event;
      e.preventDefault();
      // calculate the new cursor position:
      pos1 = pos3 - e.clientX;
      pos2 = pos4 - e.clientY;
      pos3 = e.clientX;
      pos4 = e.clientY;
      // set the element's new position:
      elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
      elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
      if (Number(elmnt.style.left.slice(0, elmnt.style.left.length - 2)) < 0) {
        elmnt.style.left = '0px'
      }
    }
  
    function closeDragElement() {
      // stop moving when mouse button is released:
      console.log('released');
      document.onpointerup = null;
      document.onpointermove = null;
    }
  }

function createJacobian(state=[0.5,0,0,0,0,0]) {
    let x = state[0], y = state[1], z = state[2]
    let mu = mainWindow.mu
    let r1 = ((x+mu)**2+y**2+z**2)
    let r2 = ((x+mu-1)**2+y**2+z**2)
    let dxdd_dx = (mu-1)/r1**1.5 - 3*(mu-1)*(x+mu)**2/r1**2.5-mu/r2**1.5+3*mu*(x+mu-1)**2/r2**2.5+1
    let dxdd_dy = 3*mu*(x+mu-1)*y/r2**2.5-3*(mu-1)*(x+mu)*y/r1**2.5
    let dxdd_dz = 3*mu*(x+mu-1)*z/r2**2.5-3*(mu-1)*(x+mu)*z/r1**2.5
    
    let dydd_dx = 3*mu*y*(x+mu-1)/r2**2.5-3*(mu-1)*y*(x+mu)/r1**2.5
    let dydd_dy = (mu-1)/r1**1.5 - 3*(mu-1)*y**2/r1**2.5-mu/r2**1.5+3*mu*y**2/r2**2.5+1
    let dydd_dz = 3*mu*y*z/r2**2.5-3*(mu-1)*y*z/r1**2.5
    
    let dzdd_dx = 3*(1-mu)*z*(mu+x)/r1**2.5+3*mu*z*(x+mu-1)/r2**2.5
    let dzdd_dy = 3*mu*z*y*(1-mu)/r1**2.5+3*mu*z*y/r2**2.5
    let dzdd_dz = (mu-1)/r1**1.5 - 3*(mu-1)*z**2/r1**2.5-mu/r2**1.5+3*mu*z**2/r2**2.5
    
    return [
        [0,0,0,1,0,0],
        [0,0,0,0,1,0],
        [0,0,0,0,0,1],
        [dxdd_dx, dxdd_dy, dxdd_dz,0,2,0],
        [dydd_dx, dydd_dy, dydd_dz,-2,0,0],
        [dzdd_dx, dzdd_dy, dzdd_dz,0,0,0]
    ]
}

function powerMethod(matrix = [[3,-1,0],[-2,4,-3],[0,-1,1]], guess = [1,1,1], shifted = 3) {
    // console.log(math.eigs(matrix));
    let a = matrix.map(s => s.slice())
    if (shifted !== false) {
        a = math.subtract(a, math.dotMultiply(shifted, math.identity([matrix.length])))
        a = math.inv(a)
    }
    let maxValue, v, lastMaxValue = 100000
    for (let index = 0; index < 1000; index++) {
        v = math.multiply(a, guess)
        maxValue = v.findIndex(s => Math.abs(s) === math.max(v.map(s => Math.abs(s))))
        maxValue = v[maxValue]
        v = v.map(s => s/maxValue)
        guess = v
        if (math.abs(maxValue-lastMaxValue) < 1e-4) break
    }
    if (shifted !== false) {
        maxValue = 1/maxValue +shifted
    }
    return {value: maxValue, vector: v}
}

function propagateCrtbp(state=[0.5,0,0,0,0,0], propTime=-30, error = 1e-8) {
    propTime *= 86400/mainWindow.timeUnit
    let dt = Math.sign(propTime)*3600/mainWindow.timeUnit, t = 0
    while (math.abs(t) < math.abs(propTime)) {
        let proppedState = rkf45(state, dt, error)
        // console.log(proppedState.te, dt);
        dt = proppedState.hnew
        state = proppedState.y
        t += proppedState.dt
    } 
    state = rkf45(state, propTime - t, error)
    return state.y
}

window.addEventListener('keydown', event => {

})

function findStateEigenvectors(state = [mainWindow.lagrangePoints[1][0],mainWindow.lagrangePoints[1][1],0,0,0,0], dir = 1, stable = true, objFunction = false, objFunctionValue) {
    let jac = createJacobian(state), eig
    // console.log(jac);
    try {
        // let m = new mlMatrix.Matrix(jac)
        // eig = new mlMatrix.EigenvalueDecomposition(m)
        eig = powerMethod(jac, [1,1,1,0,0,0], stable ? -3 : 3)
    } catch (error) {
        console.log(error);
        console.log(error.values, error.vectors);
    }
    // console.log(eig);
    dir = dir * eig.vector[0] > 0 ? 1 : -1
    let pertEpsilon = mainWindow.eigEpsilon / (mainWindow.lengthUnit*eig.vector.reduce((a,b) => a + b**2, 0))
    // console.log(pertEpsilon);
    let perturbedState = math.add(state, math.dotMultiply(dir*pertEpsilon, eig.vector))
    // perturbedState = propagateCrtbp(perturbedState, -mainWindow.eigPropTime, 1e-10)
    return calculateStateHistoryToValue(perturbedState, (stable ? -1 : 1) * mainWindow.eigPropTime,1e-9, {
        objFunction, objFunctionValue
    }).filter((time,ii) => ii % (objFunction ? 1 : 3) === 0)
    // return calculateStateHistoryToValue(perturbedState, (stable ? -1 : 1) * mainWindow.eigPropTime,1e-9, {xLimit: 1-mainWindow.mu}).filter((time,ii) => ii % 3 === 0)
    // mainWindow.scenarioLength = 90
    // return perturbedState
}

function showTubeManifold(stable = true, dir = 1, sat = 0) {
    // mainWindow.displayedPoints = []
    let initState = mainWindow.satellites[sat].state.slice()
    let times = math.range(0, mainWindow.scenarioLength, mainWindow.scenarioLength/25)
    times.forEach(time => {
        let state = propagateCrtbp(initState, time, 1e-8)
        // mainWindow.displayedPoints.push(state)
        mainWindow.satellites[sat].manifolds.push(findStateEigenvectors(state, dir, stable))
    })

}

function plotManifold(stable = true, dir = 1, sat1 = 0, sat2 = 1) {
    // mainWindow.displayedPoints = []
    let initState1 = mainWindow.satellites[sat1].state.slice()
    let initState2 = mainWindow.satellites[sat2].state.slice()
    let times = math.range(0, mainWindow.scenarioLength, mainWindow.scenarioLength/150)
    let objFunction = state => {
        return state[0]
    }
    let points = []
    times.forEach(time => {
        // console.log(time);
        let state = propagateCrtbp(initState1, time, 1e-8)
        // mainWindow.displayedPoints.push(state)
        let manifoldState = findStateEigenvectors(state, dir, !stable, objFunction, 1-mainWindow.mu)
        points.push([manifoldState[manifoldState.length-1].state, '#aa1111']);
        // mainWindow.satellites[sat].manifolds.push(findStateEigenvectors(state, dir, stable))
    })
    times.forEach(time => {
        // console.log(time);
        let state = propagateCrtbp(initState2, time, 1e-8)
        // mainWindow.displayedPoints.push(state)
        let manifoldState = findStateEigenvectors(state, -dir, stable, objFunction, 1-mainWindow.mu)
        points.push([manifoldState[manifoldState.length-1].state, '#11aa11']);
        // mainWindow.satellites[sat].manifolds.push(findStateEigenvectors(state, dir, stable))
    })
    open2Dgraph(points.map(s => s[0][1]), points.map(s => math.norm(s[0].slice(3))), {
        yLimits: [-1.5, 2.5], 
        colors: points.map(s => s[1]),
        xlabel: 'Position',
        ylabel: 'Velocity',
        title: 'Poincaré Map'
    })
}

function useRealDynamics() {
    let h = new Propagator({
        atmDrag: false
    })
    mainWindow.satellites.forEach((sat, satIi) => {
        let state = synodicUnitless2eci(0,satIi)
        console.log(state);
        let stateHistory = h.propToTimeHistory(state, mainWindow.startTime, 16*86400, 0.001)
        console.log(stateHistory);
        stateHistory = stateHistory.map(state => {
            return {
                t: (state.date-mainWindow.startTime) / 1000 / mainWindow.timeUnit,
                state: eci2synodicUnitless(state.state, state.date)
            }
        })
        sat.stateHistory = stateHistory
    })

}

function enterStableManifold(sat = 0, dir = -1) {
    let state =getCurrentState(mainWindow.satellites[sat].stateHistory, mainWindow.scenarioTime)
    let stableHist = findStateEigenvectors(state, dir, true)
    state = stableHist[0].state
    state = propagateCrtbp(state, -mainWindow.scenarioLength*2)
    mainWindow.satellites[sat].state = state
    mainWindow.satellites[sat].manifolds = []
    mainWindow.satellites[sat].stateHistory = undefined
    mainWindow.scenarioLength *=3//undefined
}

function showInjectionOptions(sat = 0) {
    let state =getCurrentState(mainWindow.satellites[sat].stateHistory, mainWindow.scenarioTime)
    let v = state.slice(3,6)
    let vMag = math.norm(v)
    v = v.map(s => s/math.norm(v))
    let burns = math.range(-vMag*2,0,0.1,true).map(s => s*mainWindow.timeUnit/mainWindow.lengthUnit)
    console.log(burns);
    mainWindow.satellites[sat].manifolds = []
    let objFunction = state => {
        state = math.subtract(state, [-mainWindow.mu, 0, 0, 0, 0, 0])
        return math.dot(state.slice(0,3), state.slice(3))
    }
    burns.forEach(b => {
        let vBurn = v.map(s => s*b)
        let vState = math.add(state, [0,0,0,...vBurn])
        let hist = calculateStateHistoryToValue(vState, -8,1e-9,{
            objFunction,
            objFunctionValue: 0,
            tol: 1e-6
        }).filter((time,ii) => ii % 3 === 0)
        mainWindow.satellites[sat].manifolds.push(hist)
    })
}

document.oncontextmenu = startContextClick

function startContextClick(event) {
    if (event.clientX === undefined) {
        event.clientX = event.touches[0].clientX
        event.clientY = event.touches[0].clientY
    }
    
    let ctxMenu;
    if (document.getElementById('context-menu') === null) {
        ctxMenu = document.createElement('div');
        ctxMenu.style.position = 'fixed';
        ctxMenu.id = 'context-menu';
        ctxMenu.style.zIndex = 101;
        ctxMenu.style.backgroundColor = 'black';
        ctxMenu.style.borderRadius = '15px';
        ctxMenu.style.transform = 'scale(0)';
        ctxMenu.style.fontSize = '1.5em';
        ctxMenu.style.minWidth = '263px';
        document.body.appendChild(ctxMenu);
    }
    ctxMenu = document.getElementById('context-menu');
    ctxMenu.style.top = event.clientY +'px';
    ctxMenu.style.left = event.clientX + 'px';
    // Check if right clicked on data display
    let eventPath, pathIndex = -1
    try {
        eventPath = event.composedPath()
    } catch (error) {
        eventPath = undefined
    }
    try {
        if (eventPath === undefined) {
            eventPath = []
            let el = event.target
            while (el !== null) {
                eventPath.push(el)
                el = el.parentElement
            }
        }
        if (eventPath.length > 0) {
            pathIndex = eventPath.map(s => s.classList).filter(s => s !== undefined).map(s => s.contains('data-drag-div')).findIndex(s => s)
        }
        else throw Error
    } catch (error) {
        console.error('Error on right click path')
        pathIndex = -1
    }
    
    ctxMenu.innerHTML = `
        <div style="cursor: default; color: white;">Set View Center</div>
        <div onclick="setViewCenter(-0.012150585609624039, 0, 0)" style="cursor: pointer; color: white; padding-left: 20px;">Earth</div>
        <div onclick="setViewCenter(0.987849414390376, 0, 0)" style="cursor: pointer; color: white; padding-left: 20px;">Moon</div>
        <div onclick="setViewCenter(0, 0, 0)" style="cursor: pointer; color: white; padding-left: 20px;">Barycenter</div>
        <div onclick="setViewCenter(0.83691513, 0, 0)" style="cursor: pointer; color: white; padding-left: 20px;">L1</div>
        <div onclick="setViewCenter(1.15568217, 0, 0)" style="cursor: pointer; color: white; padding-left: 20px;">L2</div>
        <div onclick="setViewCenter(-1.00506265, 0, 0)" style="cursor: pointer; color: white; padding-left: 20px;">L3</div>
        <div onclick="setViewCenter(0.48784941, 0.8660254, 0)" style="cursor: pointer; color: white; padding-left: 20px;">L4</div>
        <div onclick="setViewCenter(0.48784941, -0.8660254, 0)" style="cursor: pointer; color: white; padding-left: 20px;">L5</div>
        <div onclick="addSatellite()" style="cursor: pointer; color: white;">Insert Satellite</div>
        <div onclick="switchFrame()" style="cursor: pointer; color: white;">Show ${mainWindow.moonFrame ? 'Inertial' : 'Synodic'} Frame</div>

    `
    if ((ctxMenu.offsetHeight + event.clientY) > window.innerHeight) {
        ctxMenu.style.top = (window.innerHeight - ctxMenu.offsetHeight) + 'px';
    }
    if ((ctxMenu.offsetWidth + event.clientX) > window.innerWidth) {
        ctxMenu.style.left = (window.innerWidth - ctxMenu.offsetWidth) + 'px';
    }
    setTimeout(() => ctxMenu.style.transform = 'scale(1)', 10);
    return false;
}

function switchFrame() {
    mainWindow.moonFrame = !mainWindow.moonFrame
    document.getElementById('context-menu')?.remove();
}

function addSatellite() {
    let n = mainWindow.satellites.length
    mainWindow.satellites.push({
        state: [0,0,0,0,0,0],
        stateHistory: undefined,
        manifolds: [],
        color: '#1111aa'
    })
    let selects = [...document.querySelectorAll('.pointing-select')]

    selects.forEach(s => {
        let opt = document.createElement('option')
        opt.value = n
        opt.innerText = n
        s.append(opt)
    })
    openOrbitDiv(n)
    changeOrbit(document.querySelector('#orbit-drag-div-'+n+'header'))
}

function setViewCenter(x,y,z) {
    mainWindow.view.center = [x,y,z]
    document.getElementById('context-menu')?.remove();
}

function solveJacobiBoundaries(state = mainWindow.state, c) {
    let dfdy = (x,y,z,mu) => {
        return -2*(1-mu)*y/((z*z+y*y+(x+mu)**2)**1.5)-2*mu*y/((z*z+y*y+(x+mu-1)**2)**1.5)+2*y
    }
    let dfdx = (x,y,z,mu) => {
        return -2*(1-mu)*(x+mu)/((z*z+y*y+(x+mu)**2)**1.5)-2*mu*(x+mu-1)/((z*z+y*y+(x+mu-1)**2)**1.5)+2*x
    }
    let f = (x,y,z,mu,c) => {
        return -c+x*x+y*y+2*(1-mu)/(z*z+y*y+(x+mu)**2)**0.5+2*mu/(z*z+y*y+(x+mu-1)**2)**0.5
    }
    let outLines = {
        big: [],
        small: [[]],
        smallIndex: 0
    }
    mainWindow.displayedPoints = []
    let mu = mainWindow.mu
    let r1 = ((state[0]+mu)**2+state[1]**2+state[2]**2)**0.5
    let r2 = ((state[0]+mu-1)**2+state[1]**2+state[2]**2)**0.5
    c = c || -state.slice(3).reduce((a,b) => a + b**2,0)+state[0]**2+state[1]**2+2*(1-mu)/r1+2*mu/r2
    // console.log(c);
    // console.log(c);
    let boundaryConnections = {
        l1: f(mainWindow.lagrangePoints[0][0],0,mainWindow.zBoundaryLevel,mu,c) < 0,
        l2: f(mainWindow.lagrangePoints[1][0],0,mainWindow.zBoundaryLevel,mu,c) < 0,
        l3: f(mainWindow.lagrangePoints[2][0],0,mainWindow.zBoundaryLevel,mu,c) < 0,
        moon: f(1-mu,0,mainWindow.zBoundaryLevel,mu,c) < 0
    }
    // console.log(boundaryConnections);
    // console.log(boundaryConnections);
    let xPoints = [
        ...math.range(-2, -1.2, 0.05, true)._data,
        ...math.range(-1.2, -0.8, 0.0025, true)._data,
        ...math.range(-0.8, 0.6, 0.05, true)._data,
        ...math.range(0.6, 1.3, 0.0025, true)._data,
        ...math.range(1.3, 2, 0.05, true)._data
    ]
    let startPoints = math.range(0.1,1.2,0.125,true)._data
    xPoints.forEach(x => {
        let yPoints = startPoints.slice()
        for (let index = 0; index < 20; index++) {
            yPoints = yPoints.map((y,iy) => {
                return y - f(x,y,mainWindow.zBoundaryLevel,mu,c)/dfdy(x,y,mainWindow.zBoundaryLevel,mu)
            })
        }
        yPoints = yPoints.map(s => Math.abs(s))
        let maxY = math.max(yPoints)
        let minY = math.min(yPoints)
        // console.log(f(x,maxY,mu,c) , f(x,minY,mu,c) );
        if (math.abs(f(x,maxY,mainWindow.zBoundaryLevel,mu,c)) < 1e-10 && math.abs(f(x,minY,mainWindow.zBoundaryLevel,mu,c)) < 1e-10) {
            // Both are viable
                outLines.big.push([x,maxY,mainWindow.zBoundaryLevel])
            if (math.abs(maxY-minY) > 1e-6) {
                outLines.small[outLines.smallIndex].push([x,minY,mainWindow.zBoundaryLevel])
            }
            else {
                if (outLines.small[outLines.smallIndex].length > 0) {
                    outLines.smallIndex++
                    outLines.small.push([])
                }
            }
            
        }
        // yPoints.forEach(y => {
        //     if (math.abs(f(x,y,mu,c)) < 1e-10) {
        //         // console.log(minY, maxY);
        //         // console.log(yPoints);
        //         mainWindow.displayedPoints.push([x,y,0], [x,-y,0])
        //     }
        // })
    })
    // Decide how to join lines
    let big = [], small = []
    if (outLines.big.length === 0) {
        mainWindow.displayedLines = []
        return
    }
    outLines.small = outLines.small.filter(s => s.length > 0)
    // console.log(outLines.small.length);
    if (boundaryConnections.l3) {
        big.push([...outLines.big.map(s => [s[0], -s[1], s[2]]).reverse(), ...outLines.big])
        small.push([...outLines.small[0].map(s => [s[0], -s[1], s[2]]).reverse(), ...outLines.small[0]])
        if (boundaryConnections.l2 && !boundaryConnections.l1) {
            if (outLines.small.length > 1) {
                big[0].push(...outLines.small[1].reverse(), ...outLines.small[1].reverse().map(s => [s[0], -s[1], s[2]]), big[0][0])
            }
            else {
               big[0].push(big[0][0])
            }
        }
        if (!boundaryConnections.l2) {
            big[0].push(...outLines.small[0].reverse())
        }
        if (boundaryConnections.l1 && boundaryConnections.l2) {
            small[0].push(small[0][0])
            if (outLines.small.length > 2) {
                for (let index = 1; index < outLines.small.length-1; index++) {
                    small.push([...outLines.small[index].map(s => [s[0], -s[1], s[2]]).reverse(), ...outLines.small[index]])
                    small[small.length-1].push(small[small.length-1][0])
                }
                big[0].push(...outLines.small[outLines.small.length-1].reverse(), ...outLines.small[outLines.small.length-1].reverse().map(s => [s[0], -s[1], s[2]]), big[0][0])
            }
            else if (outLines.small.length > 1) {
                small.push([...outLines.small[1].map(s => [s[0], -s[1], s[2]]).reverse(), ...outLines.small[1]])
                small[small.length-1].push(small[small.length-1][0])
                big[0].push(big[0][0])
            }
            else {
                big[0].push(big[0][0])
            }
        }
    }
    else {
        big = [[...outLines.big, ...outLines.small[0].reverse()]]
        big.push(big[0].map(s => [s[0], -s[1], s[2]]))
    }
    mainWindow.displayedLines = [...big.map(s => {return {color: '#aa4444', line: s}}), ...small.map(s => {return {color: '#aa4444', line: s}})]
}

changeOrbit(document.querySelector('#orbit-drag-div-0header'))