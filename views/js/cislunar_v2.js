let mainWindow = {
    startTime: new Date(2023, 7, 7),
    scenarioLength: 2.4622806759970263E+1/2,
    scenarioTime: 0,
    moon: true,
    moonFrame: true,
    mousePosition: undefined,
    mouseDown: false,
    timeUnit: 382981,
    dt: 1000,
    lengthUnit: 389703,
    mu: 0.012150585609624039,//0.012144393564364623,
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
    stateHistory: undefined,
    moonHistory: undefined,
    cnvs: document.querySelector('canvas')
}

function animationLoop() {

    try {
        drawScene()
        // mainWindow.scenarioTime += 3600
        // console.log((mainWindow.scenarioTime/86400).toFixed(1));
        // mainWindow.view.el -= 1
        // mainWindow.view.az += 1
        window.requestAnimationFrame(animationLoop)
    } catch (error) {
        mainWindow.scenarioTime = 0
        animationLoop()
    }
}
animationLoop()

function crtbpAcceleration(state) {
    let mu = mainWindow.mu
    let x = state[0], y = state[1], z = state[2], dx = state[3], dy = state[4], dz = state[5]
    let y2 = y**2, z2 = z**2
    let r1 = ((x+mu)**2+y2+z2)**0.5
    let r2 = ((x+mu-1)**2+y2+z2)**0.5
    let r1cube = r1**3, r2cube = r2**3
    // console.log(state);
    // console.log([
    //     ...state.slice(3),
    //     -(1-mu)*(x+mu)/r1cube - mu*(x-1+mu)/r2cube+2*dy+x,
    //     -(1-mu)*y/r1cube - mu*y/r2cube-2*dx+y,
    //     -(1-mu)*z/r1cube - mu*z/r2cube
    // ]);
    return [
        ...state.slice(3),
        -(1-mu)*(x+mu)/r1cube - mu*(x-1+mu)/r2cube+2*dy+x,
        -(1-mu)*y/r1cube - mu*y/r2cube-2*dx+y,
        -(1-mu)*z/r1cube - mu*z/r2cube
    ]
}

function rkf45(state = [0.5,0,0,0,0,0], h = 0.01, epsilon = 1e-3) {
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





function calculateStateHistoryOld(state = mainWindow.state, length = mainWindow.scenarioLength) {
    let t = 0, dt = mainWindow.dt, totalError = 0, filterNum = 3, filterTrack = -1, history = []
    let tu = 382981
    dt /= tu
    length *= 86400/tu
    // length = 2000/tu
    while (t <= length) {
        filterTrack++
        if (filterTrack % filterNum !== 0) {
            let propState = rkf45(state, dt)
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
        let propState = rkf45(state, dt)
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

function calculateStateHistory(state = mainWindow.state, length = mainWindow.scenarioLength) {
    let t = 0, dt = mainWindow.dt, totalError = 0, filterNum = 3, filterTrack = -1, history = []
    dt /= mainWindow.timeUnit
    length *= 86400/mainWindow.timeUnit
    // length = 2000/tu
    while (t <= length) {
        history.push({
            t, state: state.slice()
        })
        let timeStep = 0, proppedState
        if (timeStep === 0) {
            proppedState = rkf45(state, dt, 2.5660567149855146e-7)
            // console.log(proppedState.te, dt);
            dt = proppedState.hnew
            timeStep = proppedState.dt
        }
        state = proppedState.y
        t += proppedState.dt
    } 
    console.log(history.length);
    return history
}

function updateCnvsSize() {
    mainWindow.cnvs.width = window.innerWidth
    mainWindow.cnvs.height = window.innerHeight
}

function drawScene() {
    updateCnvsSize()
    let center = mainWindow.view.center
    let rot3d = math.multiply( astro.rot(90-mainWindow.view.el, 1), astro.rot(-mainWindow.view.az, 3))
    if (mainWindow.stateHistory === undefined) {
        mainWindow.stateHistory = calculateStateHistory()
    }
    let screenDistance = mainWindow.view.zoom
    let width = window.innerHeight < window.innerWidth ? screenDistance * window.innerWidth / window.innerHeight : screenDistance 
    let height = width * window.innerHeight / window.innerWidth
    // console.log(width, height);
    let cnvs = mainWindow.cnvs
    let ctx = cnvs.getContext('2d')
    let moonPosition = [1-mainWindow.mu, 0, 0]
    moonPosition = math.multiply(rot3d, math.subtract(moonPosition,center))
    let moonRadius = mainWindow.physicalConstants.rMoon/mainWindow.lengthUnit/width/2*window.innerWidth
    
    let earthPosition = [-mainWindow.mu, 0, 0]
    earthPosition = math.multiply(rot3d, math.subtract(earthPosition, center))
    let earthRadius = mainWindow.physicalConstants.rEarth/mainWindow.lengthUnit/width/2*window.innerWidth
    let pixelStateMoon = {
        x: cnvs.width/2 + (moonPosition[0])*(cnvs.width/2)/width,
        y: cnvs.height/2 - (moonPosition[1])*(cnvs.height/2)/height
    }
    let pixelStateEarth = {
        x: cnvs.width/2 + (earthPosition[0])*(cnvs.width/2)/width,
        y: cnvs.height/2 - (earthPosition[1])*(cnvs.height/2)/height
    }
    // // console.log(pixelStateMoon, moonPosition);
    ctx.fillStyle = '#111111'
    ctx.strokeStyle = '#aa1111'
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
        let pointRot = math.multiply(rot3d, math.subtract(point, center))
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
    ctx.strokeStyle = '#111111'
    ctx.beginPath()
    mainWindow.stateHistory.forEach((state, ii) => {
        let pointRot = math.multiply(rot3d, math.subtract(state.state.slice(0,3),center))
        let pixelState = {
            x: cnvs.width/2 + (pointRot[0])*(cnvs.width/2)/width,
            y: cnvs.height/2 - (pointRot[1])*(cnvs.height/2)/height
        }
        if (ii === 0) ctx.moveTo(pixelState.x,pixelState.y)
        else ctx.lineTo(pixelState.x,pixelState.y)
        
    })
    ctx.closePath()
    ctx.stroke()
}

function resetState(state = [7, 0, 0, 0, 0, 0]) {
    mainWindow.state = state
    mainWindow.stateHistory = undefined
    drawScene()
}

function switchMoonState() {
    mainWindow.moon = !mainWindow.moon
    mainWindow.stateHistory = undefined
}

function placeObject(orbit = '8.7592140310093525E-1	-1.5903151798662925E-26	1.9175810982939320E-1	-2.9302531087896767E-14	2.3080031482213192E-1	7.3649704261223776E-14	2.9980065578489898E+0	2.1783120807931518E+0	9.6557033429115222E+0	1.0000000000218601E+0') {
    mainWindow.scenarioTime = 0
    console.log(orbit.split(/ +/))
    let lu = 389703, tu = 382981, nMoon = 2*Math.PI/27.321661/86400
    // let orbit = `1147	8.2339081983651485E-1	-1.9017764504099543E-28	9.8941366235910004E-4	-2.3545391932685812E-15	1.2634272983881797E-1	2.2367029429442455E-16	3.1743435193301202E+0	2.7430007981241529E+0	1.2158772936893689E+1	1.1804065333857600E+3`.split('\t').map(s => Number(s))
    orbit = orbit.split(/ +/).filter(s => s.length > 0).map(s => Number(s))
    console.log(orbit, orbit.slice(0,6));
    mainWindow.state = orbit.slice(0,6)
    mainWindow.stateHistory = undefined
    mainWindow.scenarioLength = orbit[7]*mainWindow.timeUnit/86400
    drawScene()
}
// let c = 1.052
// let ints = setInterval(() => {
//     c += 0.0001
//     console.log(c.toFixed(4));
//     placeObject(c)

// },2000)
placeObject(l2_halo_southern[250].join('   '))

document.querySelector('canvas').addEventListener('pointerdown', event => {
    mainWindow.mouseDown = true
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
    while (el.id !== 'orbit-drag-div') {
        el = el.parentElement
    }
   let inputs = [...el.querySelectorAll('input')]
   let radioInputs = inputs.slice(0, inputs.length-1).map(s => [s.getAttribute('orbit'), s.checked]).filter(s => s[1])[0][0]
   let rangeInput = Number(inputs[inputs.length-1].value)
   console.log(radioInputs);
   let dataLength = math.floor(orbits[radioInputs].length*rangeInput);
   let data = orbits[radioInputs][dataLength]
   console.log(data);
   placeObject(data.join('   '))
}

function openOrbitDiv(options = {}) {
    let newDiv = document.createElement('div')
    newDiv.style.position = 'fixed'
    newDiv.style.padding = '40px 10px 10px 10px'
    newDiv.style.cursor = 'move'
    newDiv.style.zIndex = 100
    newDiv.style.top = '20px'
    newDiv.style.left = '20px'
    newDiv.style.width = 'auto'
    newDiv.style.height = 'auto'
    newDiv.style.fontFamily = 'Courier'
    newDiv.style.fontSize = '40px'
    newDiv.style.backgroundColor = 'white'
    newDiv.style.border = '1px solid black'
    newDiv.style.borderRadius = '10px'
    newDiv.style.boxShadow = '5px 5px 7px #575757'
    newDiv.style.touchAction = 'none'
    newDiv.innerHTML = `
    <div id="orbit-drag-divheader" style="text-align: center">
        ${Object.keys(orbits).map((key,ii) => {
            return `
                <div>
                    <label for="${key}-input">${key.toUpperCase()}</label> <input ${ii === 0 ? 'checked' : ''} oninput="changeOrbit(this)" orbit="${key}" id="${key}-input" type="radio" name="object-type-input"/>
                </div>    
            `
        }).join('')}
    </div>
    <div><h4>Energy Level</h2></div>
    <div><input oninput="changeOrbit(this)" type="range" style="width: 95%; height: 30px;" min="0" max="1" step="0.01"/></div>
    `
    newDiv.id = 'orbit-drag-div'
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

function dragElement(elmnt) {
    var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    console.log(elmnt.id + "header");
    if (document.getElementById(elmnt.id + "header")) {
        console.log('hey');
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

  openOrbitDiv()