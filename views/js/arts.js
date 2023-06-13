let appAcr = 'ROTS 2.7'
let appName = 'Relative Orbital Trajectory System'
let cao = '12 Jun 2023'
document.title = appAcr
// Various housekeepin to not change html
document.getElementById('add-satellite-panel').getElementsByTagName('span')[0].classList.add('ctrl-switch');
document.getElementById('add-satellite-panel').getElementsByTagName('span')[0].innerText = 'Edit';
document.getElementsByClassName('panel-button')[0].remove();
document.getElementsByTagName('input')[16].setAttribute('list','name-list');
// Add div to put message if trying to add satellites when none exist
let satInputInfoDiv = document.createElement('div')
satInputInfoDiv.id = "sat-input-info"
document.querySelector('.satellite-input').before(satInputInfoDiv)
let coastlineEcefPoints = coastlines.map(section => section.map(point => astro.groundGeodeticPosition(point[1], point[0]).r))
let currentAction
let pastActions = []
let futureActions = []
let lastSaveName = ''
let errorList = []
let ellipses = []
let monteCarloData = null
document.getElementById('time-slider-range').max = 48*3600
document.body.append(document.createElement("dialog"))
// If on touch screen, set and add required assets
if (checkTouchScreen()) {
    let screenViewChange = document.createElement('div')
    screenViewChange.style.position = 'fixed'
    screenViewChange.style.left = '1%'
    screenViewChange.style.top = '12%'
    screenViewChange.style.padding = '1.25vh'
    screenViewChange.innerText = 'View'
    screenViewChange.style.backgroundColor = '#cccccc'
    screenViewChange.style.border = '1px solid black'
    screenViewChange.style.borderRadius = '10px'
    screenViewChange.style.cursor = 'pointer'
    screenViewChange.onclick = () => {
        keydownFunction({key: ' '})
    }
    document.body.append(screenViewChange)
}

function recordGif() {
    mainWindow.startRecord()
}

class windowCanvas {
    cnvs;
    plotWidth = 200;
    playTimeStep = 0;
    plotHeight;
    plotCenter = 0;
    zeroCatsGood = true;
    j2 = false;
    stringLimit = [0,8];
    ephemViewerMode = false;
    hpop = false;
    originSaves = {}
    error = { // at right after manuever while generating J2000 states, halves every hour
        neutral: {p: 25.6, v: 36.158, cp: 1.5, cv: 3.5}, // Full Error
        friendly: {p: 25.6 / 3, v: 36.158 / 3, cp: 1.5, cv: 3.5}, // reduced error
        closed: {p: 0, v: 0, c: 1} // no error
    }; 
    frameCenter= {
        ri: {x: 0.5, y: 0.5, w: 1, h: 1},
        ci: {x: 0.5, y: 1, w: 1, h: 0},
        rc: {x: 0, y: 0.5, w: 0, h: 0},
        plot: {x: 0, y: 0, w: 0, h: 0}
    };
    colors = {
        backgroundColor: '#111122',
        foregroundColor: 'white',
        textColor: 'black'
    }
    siteAccessData = [{
        sites: [],
        satellites: []
    }]
    extraAcc = [0,0,0]
    normalizeDirection = true;
    frameMove = undefined;
    latLongMode = true;
    groundTrackLimits = {
        center: 0,
        latCenter: 0,
        left: -180,
        top: 90,
        width: 360,
        zoom: 1,
        focus: 0
    }
    groundSites = [
        // {
        //     name: 'Baton Rouge',
        //     coordinates: {
        //         lat: 30.43333,
        //         long: -91.16667
        //     },
        //     color: 'rgb(0,0,255)'
        // }
    ]
    initSun = [1, 0, 0];
    nLane = 1
    desired = { 
        scenarioTime: 0,
        plotCenter: 0,
        plotWidth: 200,
        speed: 0.2,
        ri: {x: 0.5, y: 0.5, w: 1, h: 1},
        ci: {x: 0.5, y: 1, w: 1, h: 0},
        rc: {x: 0, y: 1, w: 0, h: 0},
        plot: {x: 0, y: 0, w: 0, h: 0}
    };
    burnStatus = {
        type: false,
        sat: null,
        burn: null,
        frame: null
    };
    showRicCoastlines = false
    trajSize = 1.5;
    encoder;
    mm = 2 * Math.PI / 86164;
    scenarioLength = 48;
    burnSensitivity = 0.3;
    scenarioTime = 0.1; // Dont know why but this prevents bugs with burning immediately
    startDate = new Date(document.getElementById('start-time').value);
    state = 'ri';
    burnType = 'waypoint';
    showFinite = true;
    currentTarget = false;
    satellites = [];
    mousePosition = undefined;
    relativeData = {
        data: {
            range: {
                exist: false,
                units: 'km',
                name: 'R'
            },
            rangeRate: {
                exist: false,
                units: 'm/s',
                name: 'RR'
            },
            sunAngle: {
                exist: false,
                units: 'deg',
                name: 'CATS'
            },
            relativeVelocity: {
                exist: false,
                units: 'm/s',
                name: 'RelVel'
            },
            poca: {
                exist: false,
                units: 'km',
                name: 'POCA'
            },
            tanRate: {
                exist: false,
                units: 'm/s',
                name: 'R'
            }
        },
        dataReqs: [],
        fontSize: 12.5
    };
    relDataDivs = []
    makeGif = {
        start: false,
        stop: false,
        step: 5,
        stopEpoch: 1440,
        keyFrames: [
            // {
            //     time: 4 * 3600,
            //     complete: false,
            //     width: 200,
            //     center: 0
            // }
        ]
    };
    vz_reach = {
        shown: false,
        target: 0,
        object: 1,
        time: 3600,
        distance: 10
    };
    plotSettings = {
        data: undefined,
        type: undefined,
        origin: 0,
        target: 1
    }
    prop = 2
    precise = false;
    curvilinear = true;
    panelOpen = false;
    plotSize = 1;
    aciveTouches = []
    constructor(cnvs) {
        this.cnvs = cnvs;
        this.originOrbit = {
            a: 42164.14+100*randn_bm(),
            e: 0.001*Math.random(),
            i: 5*Math.PI / 180 * Math.random(),
            raan: 360*Math.PI / 180 * Math.random(),
            arg: 360*Math.PI / 180 * Math.random(),
            tA: 360*Math.PI / 180 * Math.random()
        }
        let startDate = new Date()
        this.startDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate())
        this.scenarioLength = 48
        this.updateOrigin(this.originOrbit)
    }
    updateOrigin(newOrigin = this.originOrbit, updateSats = true, updateScenarioLength = false) {
        this.originOrbit = newOrigin
        let originEci = Object.values(Coe2PosVelObject(this.originOrbit))
        this.mm = (398600.4418 / this.originOrbit.a ** 3) ** 0.5
        if (updateScenarioLength) {
            let period = 2*Math.PI/this.mm
            let newLength = (86164/period)**(1.2/3)*2*period/3600
            newLength = Math.ceil(newLength)
            console.log(newLength);
            mainWindow.scenarioLength = newLength
            document.querySelector('#time-slider-range').max = newLength*3600
        }
        this.timeDelta = 2 * Math.PI / this.mm / 48
        let sun = sunFromTime(this.startDate)  
        sun = math.squeeze(Eci2Ric(originEci.slice(0,3), originEci.slice(3,6), sun, [0,0,0]).rHcw)
        sun = math.dotDivide(sun, math.norm(sun))
        this.initSun = sun
        let results = this.generateOriginHistory()
        this.originHistory = results.stateHistory
        this.originRot = results.rotHistory
        this.originSun = results.sunHistory
        this.originMoon = results.moonHistory
        this.burnType = newOrigin.a < 15000 ? 'manual' : this.burnType
        if (!updateSats) return
        this.satellites.forEach(sat => sat.calcTraj(true))
    }
    changeTime(newTime = 3600, immediate = false) {
        if (newTime < 0 || newTime > (this.scenarioLength*3600)) return
        this.desired.scenarioTime = newTime
        document.querySelector('#time-slider-range').value = newTime
        if (immediate) {
            this.scenarioTime = newTime
        }
    }
    generateOriginHistory() {
        let position = this.originOrbit
        let calcPosition
        let tProp = 0, tFinal = this.scenarioLength*3600, stateHistory = [], rotHistory = [], sunHistory = [], moonHistory = []
        while ((tProp+this.timeDelta) < tFinal) {
            calcPosition = propToTimeAnalytic(position, tProp, this.j2)
            stateHistory.push({
                t: tProp,
                position: calcPosition.slice()
            })
            rotHistory.push(ConvEciToRic(calcPosition, [0,0,0,0,0,0], true))
            // console.log(this.startDate);
            let tProp2 = tProp+this.timeDelta / 2
            let calcPosition2 = propToTimeAnalytic(position, tProp2, this.j2)
            sunHistory.push([tProp, this.ricSunFromEciState([new Date(this.startDate - (-1000*tProp)), ...calcPosition.slice()])])
            sunHistory.push([tProp2, this.ricSunFromEciState([new Date(this.startDate - (-1000*tProp2)), ...calcPosition2.slice()])])
            moonHistory.push([tProp, this.ricMoonFromEciState([new Date(this.startDate - (-1000*tProp)), ...calcPosition.slice()])])
            moonHistory.push([tProp2, this.ricMoonFromEciState([new Date(this.startDate - (-1000*tProp2)), ...calcPosition2.slice()])])
            // position = runge_kutta4(inertialEom, position, this.timeDelta)
            tProp += this.timeDelta
        }
        return {stateHistory, rotHistory, sunHistory, moonHistory}
    }
    ricSunFromEciState(state = [new Date(), 42164, 0, 0, 0, 3.014, 0]) {
        // console.log(state);
        let sun = sunFromTime(state.shift())  
        sun = math.squeeze(Eci2Ric(state.slice(0,3), state.slice(3,6), sun, [0,0,0]).rHcw)
        sun = math.dotDivide(sun, math.norm(sun))
        return sun
    }
    ricMoonFromEciState(state = [new Date(), 42164, 0, 0, 0, 3.014, 0]) {
        // console.log(state);
        let moon = astro.moonEciFromTime(state.shift())  
        moon = math.squeeze(Eci2Ric(state.slice(0,3), state.slice(3,6), moon, [0,0,0]).rHcw)
        moon = math.dotDivide(moon, math.norm(moon))
        return moon
    }
    getWidth() {
        return this.cnvs.width;
    }
    getPlotWidth() {
        return this.plotWidth;
    }
    getPlotHeight() {
        return this.plotHeight;
    }
    getHeight() {
        return this.cnvs.height;
    }
    getContext() {
        return this.cnvs.getContext('2d');
    }
    clear() {
        let ctx = this.getContext();
        ctx.fillStyle = this.colors.backgroundColor;
        ctx.fillRect(0, 0, this.cnvs.width, this.cnvs.height);
    }
    getRatio() {
        return this.cnvs.height / this.cnvs.width;
    }
    getState() {
        return this.state;
    }
    drawBorder() {
        let ctx = this.getContext();
        for (const frame in this.frameCenter) {
            ctx.beginPath();
            ctx.moveTo((this.frameCenter[frame].x - this.frameCenter[frame].w / 2) * this.cnvs.width, (this.frameCenter[frame].y - this.frameCenter[frame].h / 2) * this.cnvs.height);
            ctx.lineTo((this.frameCenter[frame].x + this.frameCenter[frame].w / 2) * this.cnvs.width, (this.frameCenter[frame].y - this.frameCenter[frame].h / 2) * this.cnvs.height);
            ctx.lineTo((this.frameCenter[frame].x + this.frameCenter[frame].w / 2) * this.cnvs.width, (this.frameCenter[frame].y + this.frameCenter[frame].h / 2) * this.cnvs.height);
            ctx.lineTo((this.frameCenter[frame].x - this.frameCenter[frame].w / 2) * this.cnvs.width, (this.frameCenter[frame].y + this.frameCenter[frame].h / 2) * this.cnvs.height);
            ctx.lineTo((this.frameCenter[frame].x - this.frameCenter[frame].w / 2) * this.cnvs.width, (this.frameCenter[frame].y - this.frameCenter[frame].h / 2) * this.cnvs.height);
            ctx.stroke();
        }
    }
    fixGroundTrackCenter(newLatCenter, newLongCenter, zoom) {
        if (newLongCenter < -180) {
            newLongCenter += 360
        }
        if (newLongCenter > 180) {
            newLongCenter -= 360
        }
        let latLimit = 90/mainWindow.groundTrackLimits.zoom
        if ((newLatCenter+latLimit) > 90){
            newLatCenter = 90 - latLimit
        }
        if ((newLatCenter-latLimit) < -90){
            newLatCenter = -90 + latLimit
        }
        return {
            newLatCenter, newLongCenter
        }
    }
    drawEarthFeatures() {
        let ctx = this.getContext()
        ctx.lineWidth = 1
        ctx.strokeStyle = 'rgb(150,150,150)'
        math.range(0,360,15)._data.forEach(long => {
            let pixelLong = this.latLong2Pixel({
                long,
                lat: 0
            })
            ctx.lineWidth = long === 0 ? 2 : 0.5
            ctx.beginPath()
            ctx.moveTo(pixelLong[0], 0)
            ctx.lineTo(pixelLong[0], this.cnvs.height)
            ctx.stroke()
        })
        math.range(-90,90,15, true)._data.forEach(lat => {
            let pixelLat = this.latLong2Pixel({
                long: 0,
                lat
            })
            ctx.lineWidth = lat === 0 ? 2 : 0.5
            ctx.beginPath()
            ctx.moveTo(0, pixelLat[1])
            ctx.lineTo(this.cnvs.width, pixelLat[1])
            ctx.stroke()
        })
        ctx.lineWidth = 1
        ctx.strokeStyle = this.colors.foregroundColor
        coastlines.forEach(array => {
            let lastPoint = 0
            ctx.beginPath()
            array.forEach((point,ii) => {
                // let pixelPoint = [
                //     (point[0]+180)/360*this.cnvs.width,
                //     (90-point[1])/180*this.cnvs.height
                // ]
                let pixelPoint = this.latLong2Pixel({
                    long: point[0], lat: point[1]
                })
                if (ii === 0) ctx.moveTo(pixelPoint[0], pixelPoint[1])
                else if (math.abs(pixelPoint[0]-lastPoint) > this.cnvs.width/2) {
                    ctx.moveTo(pixelPoint[0], pixelPoint[1])
                }
                else ctx.lineTo(pixelPoint[0], pixelPoint[1])
                lastPoint = pixelPoint[0]
                // ctx.fillRect(pixelPoint[0]-3, pixelPoint[1]-3, 6,6)
            })
            ctx.stroke()
        })
        
        let satellitesToDraw = [] // draw satellites in reverse order of altitude
        for (let index = 0; index < this.satellites.length; index++) {
            if (mainWindow.satellites[index].stateHistory === undefined) {
                if (mainWindow.ephemViewerMode) return
                mainWindow.satellites[index].calcTraj(true)
            }
            if (mainWindow.satellites[index].curPos === undefined) {
                // If satellite hasn't been initialize, initialize before continuing
                let curPos = mainWindow.satellites[index].currentPosition()
                mainWindow.satellites[index].curPos = {
                    r: curPos[0],
                    i: curPos[1],
                    c: curPos[2],
                    rd: curPos[3],
                    id: curPos[4],
                    cd: curPos[5]
                }

            }
        
            if (mainWindow.satellites[index].latLong === undefined) {
                // mainWindow.satellites[index].latLong = mainWindow.satellites[index].stateHistory.map(state => {
                //     let time = new Date(mainWindow.startDate - (-state.t*1000))
                //     let eciState = Object.values(getCurrentInertial(index, state.t))
                //     let latLong = astro.eci2latlong(eciState.slice(0,3), time)
                //     return {lat: latLong.lat*180/Math.PI, long: latLong.long*180/Math.PI}
                // })
                mainWindow.satellites[index].latLong = []
                let numPoints = mainWindow.satellites[index].stateHistory.length*3, timeIndex = 0
                // Equation attempts to put more timesteps in extreme latitudes to smooth out trajectory on mercator projection
                while (timeIndex <= numPoints) {
                    let time = new Date(mainWindow.startDate - (-mainWindow.scenarioLength*3600000*timeIndex/numPoints))
                    // console.log(time);
                    let eciState = Object.values(getCurrentInertial(index, mainWindow.scenarioLength*3600*timeIndex/numPoints))
                    let latLong = astro.eci2latlong(eciState.slice(0,3), time)
                    mainWindow.satellites[index].latLong.push({lat: latLong.lat*180/Math.PI, long: latLong.long*180/Math.PI})
                    timeIndex += 2.1 - (Math.abs(latLong.lat*180/Math.PI))/45
                }
                console.log(mainWindow.satellites[index].latLong.length);
            }
            ctx.strokeStyle = mainWindow.satellites[index].color
            // ctx.fillStyle = mainWindow.satellites[index].color
            // mainWindow.satellites[index].latLong.forEach(point => {
            //     let pixelPoint = this.latLong2Pixel(point)
            //     ctx.fillRect(pixelPoint[0]-this.trajSize, pixelPoint[1]-this.trajSize,this.trajSize*2,this.trajSize*2)
            // })
            let lastSatPoint
            ctx.beginPath()
            ctx.lineWidth = this.trajSize
            mainWindow.satellites[index].latLong.forEach((point,ii) => {
                let pixelPoint = this.latLong2Pixel(point)
                // ctx.strokeRect(pixelPoint[0], pixelPoint[1],5,5)
                if (ii === 0) ctx.moveTo(pixelPoint[0], pixelPoint[1])
                else if (math.abs(pixelPoint[0]-lastSatPoint[0]) > this.cnvs.width/2) {
                    ctx.moveTo(pixelPoint[0], pixelPoint[1])
                }
                else ctx.lineTo(pixelPoint[0], pixelPoint[1])
                lastSatPoint = pixelPoint
            })
            ctx.stroke()
            let curEci = Object.values(getCurrentInertial(index, mainWindow.scenarioTime))
            let time = new Date(mainWindow.startDate - (-mainWindow.scenarioTime*1000))
            let latLong = astro.eci2latlong(curEci.slice(0,3), time)
            latLong = {lat: latLong.lat*180/Math.PI, long: latLong.long*180/Math.PI, r: math.norm(latLong.r_ecef)}
            satellitesToDraw.push(latLong)
            if (!this.satellites[index].showGroundTrack) continue
            let satPoints = getGroundSwatchCircleCoordinates(curEci, latLong.lat, latLong.long)
            satPoints = satPoints.map(s => this.latLong2Pixel({
                lat: s[0],
                long: s[1]
            }))
            ctx.strokeStyle = this.satellites[index].color
            let lastPoint = 0
            ctx.beginPath()
            satPoints.forEach((pixelPoint,ii) => {
                
                if (ii === 0) ctx.moveTo(pixelPoint[0], pixelPoint[1])
                else if (math.abs(pixelPoint[0]-lastPoint) > this.cnvs.width/2) {
                    ctx.moveTo(pixelPoint[0], pixelPoint[1])
                }
                else ctx.lineTo(pixelPoint[0], pixelPoint[1])
                lastPoint = pixelPoint[0]
            })
            ctx.stroke()
        }
        
        ctx.strokeStyle = this.colors.foregroundColor
        ctx.lineWidth = 3
        let curTime = new Date(this.startDate - (-1000*this.scenarioTime))
        this.siteAccessData.forEach(siteAcc => {
            siteAcc.sites.forEach(site => {
                if (site >= mainWindow.groundSites.length) return
                siteAcc.satellites.map(sat => {
                    if (sat >= mainWindow.satellites.length) return false
                    return [sat, site]
                }).filter(s => {
                    if (s === false) return false
                    // console.log(s, mainWindow.groundSites[s[1]].checkLimits(Object.values(getCurrentInertial(s[0])).slice(0,3)));
                    return mainWindow.groundSites[s[1]].checkLimits(Object.values(getCurrentInertial(s[0])).slice(0,3)).result
                }).forEach(vis => {
                    let satSeen = this.latLong2Pixel(satellitesToDraw[vis[0]])
                    vis = this.latLong2Pixel(mainWindow.groundSites[vis[1]].coordinates)
                    ctx.beginPath()
                    ctx.moveTo(satSeen[0], satSeen[1])
                    ctx.lineTo(vis[0], vis[1])
                    ctx.stroke()
                })

            })
        })
        ctx.fillStyle = 'rgb(200,100,100)'
        this.groundSites.forEach(site => {
            let pixelPos = this.latLong2Pixel(site.coordinates)
            ctx.strokeStyle = site.color
            ctx.fillStyle = site.color
            let size = 10
            ctx.strokeRect(pixelPos[0]-size/2, pixelPos[1]-size/2, size,size)
            ctx.textBaseline = 'top'
            ctx.textAlign = 'center'
            let fontSize = 15*(this.groundTrackLimits.zoom)**0.5
            ctx.font = `${fontSize}px sans-serif`
            ctx.fillText(site.name, pixelPos[0], pixelPos[1]+fontSize/2+2)
        })
        satellitesToDraw.map((s,ii) => {return {...s, index: ii}}).sort((a,b) => a.r-b.r).forEach(sat => {
            let pixelPosition = this.latLong2Pixel(sat)
            drawSatellite({
                pixelPosition,
                shape: mainWindow.satellites[sat.index].shape,
                color: mainWindow.satellites[sat.index].color,
                name: mainWindow.satellites[sat.index].name,
                size: mainWindow.satellites[sat.index].size,
                cnvs: this.cnvs,
                ctx: ctx
            })
        })
        // Draw Moon
        ctx.fillStyle = 'rgb(140,140,140)'
        let moonEci = astro.moonEciFromTime(new Date(mainWindow.startDate - (-1000*mainWindow.scenarioTime)))
        let moonCoordinates = astro.eci2latlong(moonEci, new Date(mainWindow.startDate - (-1000*mainWindow.scenarioTime)))
        moonCoordinates = {
            lat: moonCoordinates.lat * 180 / Math.PI,
            long: moonCoordinates.long * 180 / Math.PI,
        }
        ctx.textAlign = 'center'
        ctx.textBaseline = 'top'
        ctx.font = '20px serif'
        moonCoordinates = this.latLong2Pixel(moonCoordinates)
        ctx.beginPath()
        ctx.arc(moonCoordinates[0], moonCoordinates[1], 6, 0, 2*Math.PI)
        ctx.fill()
        ctx.fillText('Moon',moonCoordinates[0], moonCoordinates[1]+4)
        // Draw Sun
        let sunEci = astro.sunEciFromTime(new Date(mainWindow.startDate - (-1000*mainWindow.scenarioTime)))
        let sunCoordinates = astro.eci2latlong(sunEci, new Date(mainWindow.startDate - (-1000*mainWindow.scenarioTime)))
        sunCoordinates = {
            lat: sunCoordinates.lat * 180 / Math.PI,
            long: sunCoordinates.long * 180 / Math.PI,
        }
        let sunLat = sunCoordinates.lat
        let sunPoints = getGroundSwatchCircleCoordinates(sunEci, sunCoordinates.lat, sunCoordinates.long)
        sunCoordinates = this.latLong2Pixel(sunCoordinates)
        ctx.fillStyle = 'rgb(225,112,0)'
        ctx.beginPath()
        ctx.arc(sunCoordinates[0], sunCoordinates[1], 6, 0, 2*Math.PI)
        ctx.fill()
        ctx.textAlign = 'center'
        ctx.textBaseline = 'top'
        ctx.font = '20px serif'
        ctx.fillText('Sun',sunCoordinates[0], sunCoordinates[1]+4)
        ctx.fillStyle =  this.colors.foregroundColor
        ctx.globalAlpha =  0.125
        let lastPoint = 0
        ctx.beginPath()
        sunPoints.map(s => this.latLong2Pixel({
            lat: s[0], long: s[1]
        })).forEach((pixelPoint,ii) => {
            if (ii === 0) ctx.moveTo(pixelPoint[0], pixelPoint[1])
            else if (math.abs(pixelPoint[0]-lastPoint[0]) > (this.groundTrackLimits.zoom*this.cnvs.width/2)) {
                let yShadow = (this.colors.backgroundColor === '#111122' ? 1 : -1)*sunLat >  0 ? -1000 : this.cnvs.height + 1000
                let crossDirection = pixelPoint[0] > this.cnvs.width/2 ? -this.cnvs.width : this.cnvs.width
                let drawnPoint = pixelPoint[0]
                if (drawnPoint > this.cnvs.width) {
                    drawnPoint = this.cnvs.width-(drawnPoint-this.cnvs.width)
                }
                else if (drawnPoint < 0) {
                    drawnPoint = -drawnPoint
                }
                let drawnPointLast = lastPoint[0]
                if (drawnPointLast < 0) {
                    drawnPointLast = -drawnPointLast
                }
                else if (drawnPointLast > this.cnvs.width) {
                    drawnPointLast = this.cnvs.width-(drawnPointLast-this.cnvs.width)
                }
                // console.log(yShadow);
                ctx.lineTo(drawnPoint+crossDirection, pixelPoint[1])
                ctx.lineTo(drawnPoint+crossDirection, yShadow)
                ctx.lineTo(drawnPointLast-crossDirection, yShadow)
                ctx.lineTo(drawnPointLast-crossDirection, lastPoint[1])
                ctx.lineTo(pixelPoint[0], pixelPoint[1])
            }
            else ctx.lineTo(pixelPoint[0], pixelPoint[1])
            lastPoint = pixelPoint
        })
        ctx.fill()
        ctx.globalAlpha =  1
        // console.timeEnd()

    }
    getCurrentSun(t = this.scenarioTime) {
        let curSunIndex = this.originSun.findIndex(s => s[0] > t)
        if (curSunIndex === -1) {
            return this.originSun[this.originSun.length-1][1]
        }
        let leadSun = this.originSun[curSunIndex]
        let trailSun = this.originSun[curSunIndex-1]
        let sun = math.add(math.subtract(leadSun[1], trailSun[1]).map(s => s*(t-trailSun[0])/(leadSun[0]-trailSun[0])), trailSun[1])
        return sun
        // let monthDays = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
        // let curDate = new Date(mainWindow.startDate)
        // let daySinceWinterSolstice = monthDays.slice(0, curDate.getMonth()).reduce((a, b) => a + b,0) + curDate.getDate() - 80
        // let freq = 2 * Math.PI /365.25
        // let maxCt = mainWindow.initSun[2] / Math.sin(freq * daySinceWinterSolstice)
        // let initSunWithCrossComponent = this.initSun.slice()
        // initSunWithCrossComponent[2] = maxCt * Math.sin(freq * (daySinceWinterSolstice + t / 86164))
        // return math.squeeze(math.multiply(rotationMatrices(-t * (this.mm * 180 / Math.PI - 360 / 365 / 86164), 3), math.transpose([initSunWithCrossComponent])));
    }
    getCurrentMoon(t = this.scenarioTime) {
        let curMoonIndex = this.originMoon.findIndex(s => s[0] > t)
        if (curMoonIndex === -1) {
            return this.originMoon[this.originMoon.length-1][1]
        }
        let leadMoon = this.originMoon[curMoonIndex]
        let trailMoon = this.originMoon[curMoonIndex-1]
        let moon = math.add(math.subtract(leadMoon[1], trailMoon[1]).map(s => s*(t-trailMoon[0])/(leadMoon[0]-trailMoon[0])), trailMoon[1])
        return moon
    }
    setInitSun(sun) {
        this.initSun = sun;
    }
    setPlotWidth(width) {
        this.plotWidth = width;
        this.plotHeight = width * this.getRatio();
    }
    setAxisWidth(type = 'set', width) {
        if (type === 'set') {
            this.desired.plotWidth = width;
        }
        else if (type === 'increase') {
            this.desired.plotWidth *= 1.05;
        }
        else if (type === 'decrease') {
            this.desired.plotWidth /= 1.05;
        }
        this.plotHeight = this.desired.plotWidth * this.getRatio();
    }
    setFrameCenter(options) {
        let {ri = this.frameCenter.ri, ci = this.frameCenter.ci, rc = this.frameCenter.rc, plot = this.frameCenter.plot} = options;
        this.desired.ri = ri;
        this.desired.ci = ci;
        this.desired.rc = rc;
        this.desired.plot = plot;
    }
    updateSettings() {
        for (const frame in this.frameCenter) {
            this.frameCenter[frame].x += (this.desired[frame].x - this.frameCenter[frame].x) * this.desired.speed;
            this.frameCenter[frame].y += (this.desired[frame].y - this.frameCenter[frame].y) * this.desired.speed;
            this.frameCenter[frame].h += (this.desired[frame].h - this.frameCenter[frame].h) * this.desired.speed;
            this.frameCenter[frame].w += (this.desired[frame].w - this.frameCenter[frame].w) * this.desired.speed;
        }
        this.scenarioTime += (this.desired.scenarioTime - this.scenarioTime) * this.desired.speed 
        this.plotCenter += (this.desired.plotCenter - this.plotCenter) * this.desired.speed 
        this.plotWidth += (this.desired.plotWidth - this.plotWidth) * this.desired.speed 
        this.plotHeight = this.plotWidth * this.getRatio();
    }
    setSize(width, height) {
        this.cnvs.width = width;
        this.cnvs.height = height;
    }
    setState(state) {
        this.state = state;
    }
    getState() {
        return this.state;
    }
    fillWindow() {
        this.setSize(window.innerWidth, window.innerHeight);
        this.setPlotWidth(this.plotWidth);
    }
    convertToRic(input = [0, 0], filter = true) {
        if (Array.isArray(input)) {
            input = math.squeeze(input);
            input = {
                x:  input[0],
                y:  input[1]
            };
        }
        let initData = {
            ri: {
                i: -(input.x - this.cnvs.width * this.frameCenter.ri.x) * this.plotWidth / this.cnvs.width + this.plotCenter,
                r: -(input.y - this.cnvs.height * this.frameCenter.ri.y) * this.plotHeight / this.cnvs.height
            },
            ci: {
                i: -(input.x - this.cnvs.width * this.frameCenter.ci.x) * this.plotWidth / this.cnvs.width + this.plotCenter,
                c: -(input.y - this.cnvs.height * this.frameCenter.ci.y) * this.plotHeight / this.cnvs.height
            },
            rc: {
                r: (input.x - this.cnvs.width * this.frameCenter.rc.x) * this.plotWidth / this.cnvs.width,
                c: -(input.y - this.cnvs.height * this.frameCenter.rc.y) * this.plotHeight / this.cnvs.height
            },
        };
        if (filter) {
            // Check RI
            if (Math.abs(initData.ri.i - this.plotCenter) < this.plotWidth * this.frameCenter.ri.w / 2 && Math.abs(initData.ri.r) < this.plotHeight * this.frameCenter.ri.h / 2) {
                return {ri: initData.ri};
            }
            if (Math.abs(initData.ci.i - this.plotCenter) < this.plotWidth * this.frameCenter.ci.w / 2 && Math.abs(initData.ci.c) < this.plotHeight * this.frameCenter.ci.h / 2) {
                return {ci: initData.ci};
            }
            if (Math.abs(initData.rc.r) < this.plotWidth * this.frameCenter.rc.w / 2 && Math.abs(initData.rc.c) < this.plotHeight * this.frameCenter.rc.h / 2) {
                return {rc: initData.rc};
            }
        }
    }
    convertToPixels(input = [0, 0, 0, 0, 0, 0]) {
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
                x: -(input.i - this.plotCenter) * this.cnvs.width  / this.plotWidth + this.cnvs.width * this.frameCenter.ri.x,
                y: this.cnvs.height * this.frameCenter.ri.y - input.r * this.cnvs.height / this.plotHeight
            },
            ci: {
                x: -(input.i - this.plotCenter) * this.cnvs.width / this.plotWidth + this.cnvs.width * this.frameCenter.ci.x,
                y: this.cnvs.height * this.frameCenter.ci.y - input.c * this.cnvs.height/ this.plotHeight
            },
            rc: {
                x: (input.r) * this.cnvs.width / this.plotWidth + this.cnvs.width * this.frameCenter.rc.x,
                y: this.cnvs.height * this.frameCenter.rc.y - input.c * this.cnvs.height / this.plotHeight
            }
        }
    }
    pixel2LatLong(pixel = [100,100]) {
        pixel[0] = (pixel[0]-this.cnvs.width/2) / this.groundTrackLimits.zoom+this.cnvs.width/2
        pixel[1] = (pixel[1]-this.cnvs.height/2) / this.groundTrackLimits.zoom+this.cnvs.height/2
        let center = this.groundTrackLimits.center
        let long = pixel[0] * 360 / this.cnvs.width
        let lat = 90-pixel[1]*180/this.cnvs.height
        long += center-180
        lat += this.groundTrackLimits.latCenter
        return {
            long, lat
        }
    }
    latLong2Pixel(coordinates ={lat: 0, long: 0}) {
        let center = this.groundTrackLimits.center
        let {lat, long} = coordinates
        while (center < -180) {
            center += 360
        }
        long = long - center
        lat -= this.groundTrackLimits.latCenter
        if (long < -180) {
            long += 360
        }
        else if (long > 180) {
            long -= 360
        }
        let pixels = [
            (long+180)/360*this.cnvs.width,
            (90-lat)/180*this.cnvs.height
        ]
        pixels[0] = (pixels[0]-this.cnvs.width/2)*this.groundTrackLimits.zoom+this.cnvs.width/2
        pixels[1] = (pixels[1]-this.cnvs.height/2)*this.groundTrackLimits.zoom+this.cnvs.height/2
        return pixels

    }
    drawAxes() {
        let ctx = this.getContext();
        ctx.strokeStyle = this.colors.foregroundColor;
        ctx.fillStyle = this.colors.foregroundColor;
        let axesLength = this.plotSize * 0.5;
        let sunLength = this.plotSize * 0.4 * this.plotHeight / 2 * Math.max(this.frameCenter.ri.h, this.frameCenter.ci.h, this.frameCenter.rc.h);
        let sunCoor = this.convertToPixels(math.dotMultiply(sunLength, this.getCurrentSun()));
        let moonCoor = this.convertToPixels(math.dotMultiply(sunLength, this.getCurrentMoon()));
        let origin = this.convertToPixels([0, 0, 0]);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        // this.drawBorder();
        if (this.state.search('ri') !== -1) {
            ctx.lineWidth = this.plotSize * this.cnvs.width * this.frameCenter.ri.w / 200;
            ctx.font = 'bold ' + (this.cnvs.width > this.cnvs.height ? this.cnvs.width : this.cnvs.height) * this.plotSize * this.frameCenter.ri.w / 40 + 'px serif';
            ctx.beginPath()
            ctx.moveTo(origin.ri.x, origin.ri.y);
            ctx.lineTo(origin.ri.x, origin.ri.y - this.cnvs.height * axesLength * this.frameCenter.ri.h / 2);
            ctx.moveTo(origin.ri.x + this.cnvs.width * this.frameCenter.ri.w / 400, origin.ri.y)
            ctx.lineTo(origin.ri.x - this.cnvs.height * axesLength * this.frameCenter.ri.h / 2, origin.ri.y);
            ctx.stroke();
            ctx.strokeStyle = 'orange';
            ctx.beginPath()
            ctx.moveTo(origin.ri.x, origin.ri.y);
            ctx.lineTo(sunCoor.ri.x , sunCoor.ri.y);
            ctx.stroke();
            ctx.strokeStyle = 'gray';
            ctx.beginPath()
            ctx.moveTo(origin.ri.x, origin.ri.y);
            ctx.lineTo(moonCoor.ri.x , moonCoor.ri.y);
            ctx.stroke();
            ctx.strokeStyle = this.colors.foregroundColor;
            ctx.fillText('R', origin.ri.x, origin.ri.y - this.cnvs.height * axesLength * this.frameCenter.ri.h / 2 - this.plotSize * this.cnvs.height * this.frameCenter.ri.h / 20)
            ctx.fillText('I', origin.ri.x - this.cnvs.height * axesLength * this.frameCenter.ri.h / 2 - this.plotSize * this.cnvs.width * this.frameCenter.ri.w / 80, origin.ri.y)

            ctx.textAlign = 'left';
            ctx.textBaseline = 'bottom';
            ctx.fillStyle = '#555 ';
            let fontSize = this.cnvs.height * this.frameCenter.ri.h / 40
            ctx.font = 'bold ' + fontSize + 'px serif';
            let dist = (mainWindow.desired.plotWidth / 2).toFixed(0) + 'km'
            for (let letter = 0; letter < dist.length; letter++) {
                ctx.fillText(dist[letter], 7.5, origin.ri.y - dist.length / 5 * fontSize + letter * fontSize)
            }
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = this.colors.backgroundColor;
        }
        if (this.state.search('ci') !== -1) {
            
            ctx.lineWidth = this.plotSize * this.cnvs.width * this.frameCenter.ci.w / 200;
            ctx.fillStyle = this.colors.backgroundColor;
            ctx.fillRect(this.frameCenter.ci.x * this.cnvs.width - this.frameCenter.ci.w / 2 * this.cnvs.width, this.frameCenter.ci.y * this.cnvs.height - this.frameCenter.ci.h / 2 * this.cnvs.height, this.frameCenter.ci.x * this.cnvs.width + this.frameCenter.ci.w / 2 * this.cnvs.width, this.frameCenter.ci.y * this.cnvs.height + this.frameCenter.ci.h / 2 * this.cnvs.height);
            ctx.strokeStyle = 'rgb(200,200,200)'
            ctx.strokeRect(this.frameCenter.ci.x * this.cnvs.width - this.frameCenter.ci.w / 2 * this.cnvs.width, this.frameCenter.ci.y * this.cnvs.height - this.frameCenter.ci.h / 2 * this.cnvs.height, this.frameCenter.ci.x * this.cnvs.width + this.frameCenter.ci.w / 2 * this.cnvs.width, this.frameCenter.ci.y * this.cnvs.height + this.frameCenter.ci.h / 2 * this.cnvs.height);
            ctx.fillStyle = this.colors.foregroundColor;
            ctx.strokeStyle = this.colors.foregroundColor
            ctx.font = 'bold ' + this.plotSize * this.cnvs.height * this.frameCenter.ci.h / 10 + 'px serif';
            let drawX = math.abs(this.plotCenter) < this.plotWidth / 2* this.frameCenter.ci.w;
            let drawY = this.plotCenter + this.plotWidth / 2 * this.frameCenter.ci.w;
            ctx.beginPath()
            if (drawX) {
                ctx.moveTo(origin.ci.x, origin.ci.y);
                ctx.lineTo(origin.ci.x, origin.ci.y - this.cnvs.height * axesLength * this.frameCenter.ci.h / 2);
            }
            if (drawY > 0) {
                ctx.moveTo(origin.ci.x + this.cnvs.width * this.frameCenter.ci.w / 400, origin.ci.y)
                ctx.lineTo(origin.ci.x - (drawY > this.plotHeight / 2 * this.frameCenter.ci.h * axesLength ? this.plotHeight / 2 * this.frameCenter.ci.h * axesLength : drawY) * this.cnvs.width / this.plotWidth, origin.ci.y);
            }
            ctx.stroke();
            if (drawX) {
                ctx.strokeStyle = 'orange';
                ctx.beginPath()
                ctx.moveTo(origin.ci.x, origin.ci.y);
                ctx.lineTo(sunCoor.ci.x, sunCoor.ci.y);
                ctx.stroke();
                ctx.strokeStyle = 'gray';
                ctx.beginPath()
                ctx.moveTo(origin.ci.x, origin.ci.y);
                ctx.lineTo(moonCoor.ci.x, moonCoor.ci.y);
                ctx.stroke();
            }
            ctx.strokeStyle = this.colors.foregroundColor;
            
            if (drawX) ctx.fillText('C', origin.ci.x, origin.ci.y - this.cnvs.height * axesLength * this.frameCenter.ci.h / 2 - this.plotSize * this.cnvs.height * this.frameCenter.ci.h / 20)
            if (drawY > this.plotHeight / 2 * this.frameCenter.ci.h * axesLength) ctx.fillText('I', origin.ci.x - this.cnvs.height * axesLength * this.frameCenter.ci.h / 2 - this.plotSize * this.cnvs.height * this.frameCenter.ci.h / 30, origin.ci.y)
        }
        if (this.state.search('rc') !== -1) {
            ctx.fillStyle = this.colors.backgroundColor;
            ctx.fillRect(this.frameCenter.rc.x * this.cnvs.width - this.frameCenter.rc.w / 2 * this.cnvs.width, this.frameCenter.rc.y * this.cnvs.height - this.frameCenter.rc.h / 2 * this.cnvs.height, this.frameCenter.rc.x * this.cnvs.width + this.frameCenter.rc.w / 2 * this.cnvs.width, this.frameCenter.rc.y * this.cnvs.height + this.frameCenter.rc.h / 2 * this.cnvs.height);
            // console.log(ctx.lineWidth);
            ctx.strokeStyle = 'rgb(200,200,200)'
            ctx.strokeRect(this.frameCenter.rc.x * this.cnvs.width - this.frameCenter.rc.w / 2 * this.cnvs.width, this.frameCenter.rc.y * this.cnvs.height - this.frameCenter.rc.h / 2 * this.cnvs.height, this.frameCenter.rc.x * this.cnvs.width + this.frameCenter.rc.w / 2 * this.cnvs.width, this.frameCenter.rc.y * this.cnvs.height + this.frameCenter.rc.h / 2 * this.cnvs.height);
            ctx.fillStyle = this.colors.foregroundColor;
            
            ctx.lineWidth = this.plotSize * this.cnvs.width * this.frameCenter.rc.w / 200;
            ctx.font = 'bold ' + this.plotSize * this.cnvs.height * this.frameCenter.rc.h / 10 + 'px serif';
            ctx.strokeStyle = this.colors.foregroundColor
            ctx.beginPath()
            ctx.moveTo(origin.rc.x, origin.rc.y);
            ctx.lineTo(origin.rc.x, origin.rc.y - this.cnvs.height * axesLength * this.frameCenter.rc.h / 2);
            ctx.moveTo(origin.rc.x - this.cnvs.width * this.frameCenter.rc.w / 400, origin.rc.y)
            ctx.lineTo(origin.rc.x + this.cnvs.height * axesLength * this.frameCenter.rc.h / 2, origin.rc.y);
            ctx.stroke();
            ctx.strokeStyle = 'orange';
            ctx.beginPath()
            ctx.moveTo(origin.rc.x, origin.rc.y);
            ctx.lineTo(sunCoor.rc.x, sunCoor.rc.y);
            ctx.stroke();
            ctx.strokeStyle = 'gray';
            ctx.beginPath()
            ctx.moveTo(origin.rc.x, origin.rc.y);
            ctx.lineTo(moonCoor.rc.x, moonCoor.rc.y);
            ctx.stroke();
            ctx.strokeStyle = this.colors.foregroundColor;
            ctx.fillText('C', origin.rc.x, origin.rc.y - this.cnvs.height * axesLength * this.frameCenter.rc.h / 2 - this.plotSize * this.cnvs.height * this.frameCenter.rc.h / 20)
            ctx.fillText('R', origin.rc.x + this.cnvs.height * axesLength * this.frameCenter.rc.h / 2 + this.plotSize * this.cnvs.height * this.frameCenter.rc.h / 30, origin.rc.y)
        }
    }
    drawPlot() {
        // if (this.state.search('plot') === -1) return;
        if (!this.plotSettings.type) return;
        plotRelativeData()
        let ctx = this.getContext();
        let pos = {...this.frameCenter.plot};
        pos.w = pos.w * 0.8;
        pos.h = pos.h * 0.8;
        let data = math.transpose(this.plotSettings.data);
        let limits = {
            x: [math.min(data[0]), math.max(data[0])],
            y: [0, math.max(data[1])]
        }
        let dataLine = [];
        for (let ii = 0; ii < data[0].length; ii++) {
            let x = (data[0][ii] - limits.x[0]) * this.cnvs.width * pos.w / (limits.x[1] - limits.x[0]) + this.cnvs.width * (pos.x - pos.w / 2);
            let y = -(data[1][ii] - limits.y[0]) * this.cnvs.height * pos.h / (limits.y[1] - limits.y[0]) + this.cnvs.height * (pos.y + pos.h / 2);
            dataLine.push({x, y}); 
        }
        // Fix click on plot
        this.getContext().strokeStyle = this.colors.foregroundColor;
        ctx.rect(this.cnvs.width * this.frameCenter.plot.x - this.cnvs.width * pos.w / 2, this.cnvs.height * this.frameCenter.plot.y - this.cnvs.height * pos.h / 2, this.cnvs.width * pos.w , this.cnvs.height * pos.h)
        ctx.fillStyle = 'black'
        ctx.stroke();
        ctx.lineWidth = 1;
        drawCurve(this.getContext(), dataLine);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'hanging';
        ctx.fillText('0', (this.frameCenter.plot.x - this.frameCenter.plot.w / 2) * this.cnvs.width + this.frameCenter.plot.w * 0.1  * this.cnvs.width, (this.frameCenter.plot.y - this.frameCenter.plot.h / 2) * this.cnvs.height + this.frameCenter.plot.h * 0.9  * this.cnvs.height + 10)
        ctx.textAlign = 'right';
        ctx.fillText(limits.x[1] + ' u', (this.frameCenter.plot.x - this.frameCenter.plot.w / 2) * this.cnvs.width + this.frameCenter.plot.w * 0.9  * this.cnvs.width, (this.frameCenter.plot.y - this.frameCenter.plot.h / 2) * this.cnvs.height + this.frameCenter.plot.h * 0.9  * this.cnvs.height + 10)
        ctx.fillText(limits.y[1].toFixed(1) + 'u', (this.frameCenter.plot.x - this.frameCenter.plot.w / 2) * this.cnvs.width + this.frameCenter.plot.w * 0.1  * this.cnvs.width, (this.frameCenter.plot.y - this.frameCenter.plot.h / 2) * this.cnvs.height + this.frameCenter.plot.h * 0.1  * this.cnvs.height)
        ctx.textBaseline = 'bottom';
        ctx.fillText('0 u', (this.frameCenter.plot.x - this.frameCenter.plot.w / 2) * this.cnvs.width + this.frameCenter.plot.w * 0.1  * this.cnvs.width - 5, (this.frameCenter.plot.y - this.frameCenter.plot.h / 2) * this.cnvs.height + this.frameCenter.plot.h * 0.9  * this.cnvs.height)
        // ctx.fillText('0 u', this.frameCenter.plot.w * this.cnvs.width * 0.1 - 5, this.frameCenter.plot.h* this.cnvs.height * 0.9)
        ctx.lineWidth = 3.67;
    }
    drawInertialOrbit() {
        let currentOriginState = [mainWindow.originHistory[0], ...mainWindow.originHistory.filter(line => line.t > mainWindow.scenarioTime)]
        currentOriginState = currentOriginState[currentOriginState.length-1]
        currentOriginState = propToTime(currentOriginState.position, mainWindow.scenarioTime - currentOriginState.t)
        let a = math.norm(currentOriginState.slice(0,3));
        let circleTop = this.convertToPixels([0, 0, 0]).ri;
        let circleCenter = this.convertToPixels([-a, 0, 0]).ri;
        let ctx = this.getContext();
        let oldLineWidth = ctx.lineWidth;
        let oldStyle = ctx.strokeStyle;
        ctx.strokeStyle = this.colors.foregroundColor;
        ctx.lineWidth = 1;
        ctx.globalAlpha = this.desired.plotWidth / 400 > 0.5 ? 0.5 : this.desired.plotWidth / 400;
        ctx.beginPath();
        ctx.arc(circleCenter.x, circleCenter.y, circleCenter.y - circleTop.y, 0, 2 * Math.PI)
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.lineWidth = 4;
        circleTop = this.convertToPixels([-a+6371, 0, 0]).ri;
        let earthRadPixels = circleCenter.y - circleTop.y
        ctx.beginPath();
        ctx.arc(circleCenter.x, circleCenter.y, earthRadPixels, 0, 2 * Math.PI)
        ctx.stroke();
        if (!mainWindow.showRicCoastlines) return
        let angMomVec = math.cross(currentOriginState.slice(0,3), currentOriginState.slice(3))
        let coastlinesToShow = coastlinesToPoints(angMomVec, currentOriginState.slice(0,3))
        ctx.lineWidth = 1
        let earthRad2 = earthRadPixels**2/16
        ctx.beginPath()
        coastlinesToShow.map(section => {
            let lastAngle
            section.forEach((point,ii) => {
                let x = -point[0] * math.cos(point[1]) / 6371 * earthRadPixels+circleCenter.x
                let y = -point[0] * math.sin(point[1]) / 6371 * earthRadPixels+circleCenter.y
                // ctx.strokeRect(x,y,1,1)
                if (ii === 0) ctx.moveTo(x,y)
                else if (ii > 0 && math.subtract(lastAngle, [x,y]).reduce((a,b) => a + b **2) > earthRad2) ctx.moveTo(x,y)
                else ctx.lineTo(x,y)
                lastAngle = [x,y]
            })
            // ctx.stroke()
        })
        ctx.stroke()
        ctx.lineWidth = oldLineWidth;
        ctx.strokeStyle = oldStyle;
        ctx.fillStyle = this.colors.backgroundColor;
    }
    drawCurve(line, options = {}) {
        let {color = 'red', size = this.trajSize} = options
        let ctx = this.getContext();
        ctx.fillStyle = color;
        line.forEach((point, ii) => {
            let pixelPos = this.convertToPixels(point);
            if (this.state.search('ri') !== -1 && Math.abs(point[0]) < (this.plotHeight / 2 * this.frameCenter.ri.h) && Math.abs(point[1] - this.plotCenter) < (this.plotWidth / 2* this.frameCenter.ri.w)) {
                ctx.fillRect(pixelPos.ri.x - size, pixelPos.ri.y - size, size*2, size*2)
            }
            if (this.state.search('ci') !== -1 && Math.abs(point[2]) < (this.plotHeight / 2 * this.frameCenter.ci.h) && Math.abs(point[1] - this.plotCenter) < (this.plotWidth / 2 * this.frameCenter.ci.w)){
                ctx.fillRect(pixelPos.ci.x - size, pixelPos.ci.y - size, size*2, size*2)
            }
            if (this.state.search('rc') !== -1 && Math.abs(point[2]) < (this.plotHeight / 2 * this.frameCenter.rc.h) && Math.abs(point[0]) < (this.plotWidth / 2 * this.frameCenter.rc.w)) {
                ctx.fillRect(pixelPos.rc.x - size, pixelPos.rc.y - size, size*2, size*2)
            }
        })
    }
    drawEllipses() {
        let ctx = this.getContext()
        let oldLineW = ctx.lineWidth + 0
        ctx.lineWidth = 2
        ellipses.forEach(ell => {
            let pixPos = this.convertToPixels([ell.position.r, ell.position.i, ell.position.c, 0, 0, 0])
            ctx.beginPath()
            ctx.ellipse(pixPos.ri.x, pixPos.ri.y, ell.a * this.cnvs.width / this.desired.plotWidth, ell.b * this.cnvs.width / this.desired.plotWidth, ell.ang, 0, 2 * Math.PI)
            ctx.stroke()
        })
        ctx.lineWidth = oldLineW
    }
    drawSatLocation(position, sat = {}) {
        let {shape, size, color, name} = sat;
        let pixelPosition = this.convertToPixels(position);
        if (this.state.search('ri') !== -1 && Math.abs(position.r) < (this.plotHeight / 2 * this.frameCenter.ri.h) && Math.abs(position.i - this.plotCenter) < (this.plotWidth / 2* this.frameCenter.ri.w)) {
            drawSatellite({
                cnvs: this.cnvs, 
                ctx: this.getContext(),
                shape,
                size,
                color,
                pixelPosition: [pixelPosition.ri.x, pixelPosition.ri.y],
                name
            })
        }
        if (this.state.search('ci') !== -1 && Math.abs(position.c) < (this.plotHeight / 2 * this.frameCenter.ci.h) && Math.abs(position.i - this.plotCenter) < (this.plotWidth / 2* this.frameCenter.ci.w)) {
            drawSatellite({
                cnvs: this.cnvs, 
                ctx: this.getContext(),
                shape,
                size,
                color,
                pixelPosition: [pixelPosition.ci.x, pixelPosition.ci.y],
                name
            })
        }
        if (this.state.search('rc') !== -1 && Math.abs(position.c) < (this.plotHeight / 2 * this.frameCenter.rc.h) && Math.abs(position.r) < (this.plotWidth / 2* this.frameCenter.rc.w)) {
            drawSatellite({
                cnvs: this.cnvs, 
                ctx: this.getContext(),
                shape,
                size,
                color,
                pixelPosition: [pixelPosition.rc.x, pixelPosition.rc.y],
                name
            })
        }
    }
    showData() {
        try {
            let ctx = this.getContext();
            let oldWidth = ctx.lineWidth;
            ctx.lineWidth = 1;
            ctx.fillStyle = this.colors.foregroundColor
            this.relativeData.fontSize = this.relativeData.fontSize || 20
            ctx.textAlign = 'left';
            if (this.relativeData.dataReqs.length > mainWindow.relDataDivs.length) resetDataDivs()
            this.relativeData.dataReqs.forEach((req,ii) => {
                let relDataIn = getRelativeData(req.origin, req.target, req.data.filter(d => d === 'interceptData').length > 0, req.interceptTime);
                mainWindow.relDataDivs[ii].forEach(span => {
                    let type = span.getAttribute('type')
                    span.innerText = type === 'interceptData' ? relDataIn[span.getAttribute('type')] : relDataIn[span.getAttribute('type')].toFixed(2)
                })
            })
            ctx.textAlign = 'left'
            ctx.lineWidth = oldWidth;
            this.relativeData.time = this.relativeData.time > 1 ? 0 : this.relativeData.time + 0.03;
        } catch (error) {
            console.error(error)
        }
        
    }
    showTime() {
        let ctx = this.getContext();
        ctx.textAlign = 'left';
        ctx.fillStyle = this.colors.foregroundColor
        // console.log(ctx.textBaseline);
        ctx.textBaseline = 'bottom'
        let fontSize = (this.cnvs.height < this.cnvs.width ? this.cnvs.height : this.cnvs.width) * 0.05
        ctx.font = 'bold ' + fontSize + 'px serif'
        ctx.fillText(new Date(this.startDate.getTime() + this.scenarioTime * 1000).toString()
            .split(' GMT')[0].substring(4), 10, this.cnvs.height - 5);
        if (mainWindow.hpop) {
            ctx.font = 'bold ' + fontSize/2+ 'px serif'
            ctx.fillText('HPOP', 10, this.cnvs.height - 5 - fontSize);
        }
        else if (mainWindow.ephemViewerMode) {
            ctx.font = 'bold ' + fontSize/2+ 'px serif'
            ctx.fillText('Viewer Mode', 10, this.cnvs.height - 5 - fontSize);

        }
    }
    showLocation() {
        try {
            let ctx = this.getContext();
            ctx.textAlign = 'end';
            ctx.textBaseline = 'bottom';
            ctx.font = 'bold ' + this.cnvs.height * 0.02 + 'px serif';
            ctx.fillStyle = this.colors.foregroundColor;
            // console.time()
            // let originLoc = {...mainWindow.originOrbit}
            // originLoc.tA = propTrueAnomaly(originLoc.tA, originLoc.a, originLoc.e, mainWindow.scenarioTime)
            // originLoc = Object.values(Coe2PosVelObject(originLoc))
            // originLoc = fk5ReductionTranspose(originLoc.slice(0,3), new Date(mainWindow.startDate - (-mainWindow.scenarioTime*1000)))
            // originLoc = ecef2latlong(originLoc)
            // ctx.fillText(`Lat ${originLoc.latSat.toFixed(1)}/Long ${originLoc.longSat.toFixed(1)}`, this.cnvs.width - 10, this.cnvs.height -  25)
            // console.timeEnd()
            if (!this.mousePosition) return;
            let ricCoor = this.convertToRic(this.mousePosition);
            let frame = Object.keys(ricCoor)[0];
            ctx.fillStyle = this.colors.foregroundColor;
            ctx.fillText(`${frame === 'ri' ? 'R' : 'C'} ${ricCoor[frame][frame === 'ri' ? 'r' : 'c'].toFixed(1)} km ${frame === 'ri' ? 'I' : frame === 'ci' ? 'I' : 'R'} ${ricCoor[frame][frame === 'ri' ? 'i' : frame === 'ci' ? 'i' : 'r'].toFixed(1)} km `, this.cnvs.width - 10, this.cnvs.height -  10)
            }
        catch (e) {

        }
        
    }
    calculateBurn = calcBurns;
    startRecord(button) {
        let startTime = Number(prompt('Start Time (hrs)', 0))
        let endTime = Number(prompt('End Time (hrs)', mainWindow.scenarioLength))
        let timeLength = Number(prompt('Video Length (seconds)', 10))
        let resolution = prompt('Video Resolution (L x W)', '400x400').split('x').map(s => Number(s)).slice(0,2)
        resolution = resolution.length < 2 ? [400,400] : resolution
        resolution = resolution.filter(s => isNaN(s)).length > 0 ? [400,400] : resolution
        closeAll();
        this.makeGif.stopEpoch = endTime*3600;
        this.desired.scenarioTime = startTime*3600;
        this.scenarioTime = startTime*3600;
        this.makeGif.step = (endTime - startTime) * 3600 / timeLength / 30;
        this.cnvs.width = resolution[0];
        this.cnvs.height = resolution[1];
        this.encoder = new GIFEncoder();
        this.encoder.setQuality(20);
        this.encoder.setRepeat(0);
        this.encoder.setDelay(1000 / 33);
        setTimeout(() => {
            this.makeGif.start = true;
            this.encoder.start();
        }, 2000)
    }
    recordFunction() {
        if (this.makeGif.start) {
            let ctx = this.getContext();
            this.encoder.addFrame(ctx);
            this.scenarioTime += this.makeGif.step;
            this.desired.scenarioTime += this.makeGif.step;
            if (this.makeGif.stop) {
                this.makeGif.start = false;
                this.makeGif.stop = false;
                this.encoder.finish();
                this.encoder.download("download.gif");
                this.fillWindow();
            }
            else if (this.scenarioTime >= this.makeGif.stopEpoch) {this.makeGif.stop = true}
            // this.makeGif.keyFrames.forEach(key => {
            //     if (windowOptions.scenario_time_des > key.time && !key.complete) {
            //         // windowOptions.screen.mode = key.view;
            //         windowOptions.width_des = key.width;
            //         windowOptions.origin_it_des = key.center;
            //         key.complete = true;
            //         // formatCanvas();
            //     }
            // })
        }
    }
    getData(options= {}) {
        let satellites = [];
        this.satellites.forEach(sat => {
            satellites.push(sat.getData())
        })
        return {
            plotWidth: this.plotWidth,
            relativeData: this.relativeData,
            satellites,
            groundSites: this.groundSites,
            mm: this.mm,
            timeDelta: this.timeDelta,
            scenarioLength: this.scenarioLength,
            initSun: this.initSun,
            startDate: this.startDate,
            originOrbit: this.originOrbit,
            time: new Date(),
            description: options.description
        }
    }
    loadDate(data = {}) {
        // console.log('loaded');
        let {
            plotWidth = this.plotWidth, 
            relativeData = this.relativeData,
            satellites,
            groundSites = [],
            scenarioLength = this.scenarioLength,
            startDate = this.startDate,
            originOrbit = this.originOrbit
        } = data
        this.startDate = new Date(startDate)
        this.scenarioLength = scenarioLength
        this.updateOrigin(originOrbit)
        this.plotWidth = plotWidth;
        this.relativeData = relativeData;
        console.log(groundSites);
        this.groundSites = groundSites.map(s => {
            return new GroundSite({
                name: s.name,
                color: s.color,
                lat: s.coordinates.lat,
                long: s.coordinates.long,
                limits: s.limits
            })
        })
        this.satellites = [];
        satellites.forEach(sat =>{
            // Check if lists thrust and mass
            let thrust = sat.thrust || 10000
            let mass = sat.mass || 1000
            this.satellites.push(
                new Satellite({
                    position: sat.position,
                    size: sat.size,
                    color: sat.color,
                    shape: sat.shape,
                    a: thrust/mass/1000,
                    thrust,
                    mass,
                    cr: sat.cr,
                    cd: sat.cd,
                    area: sat.area,
                    name: sat.name,
                    burns: sat.burns.map(b => {
                        b.shown = false
                        return b
                    }),
                    point: sat.point,
                    team: sat.team
                })
            )
        })
        resetDataDivs()
        document.title = this.satellites.map(sat => sat.name).join(' / ')
        document.getElementById('time-slider-range').max = scenarioLength * 3600

    }
    drawOrbitCurve() {
        this.getContext().lineWidth = 1;
        let drawnLine = [], ang, a = (398600.4418 / this.mm ** 2) ** (1/3), dr, loc;
        for (let it = this.plotWidth / 2; it > -this.plotWidth / 2; it -= this.plotWidth / 100) {
            ang = Math.asin(it / a);
            dr = (Math.cos(ang) - 1) * a;
            loc = this.convertToPixels({r: dr, i: it, c: 0}).ri;
            drawnLine.push(loc);
        }
        // console.log(loc)
        drawCurve(this.getContext(),drawnLine);
        this.getContext().lineWidth = 6.049;
    }
}
class Satellite {
    position;
    curPos;
    color;
    size;
    shape;
    burns = [];
    name;
    stateHistory;
    constructor(options = {}) {
        let {
            position,
            a, // km/s/s
            size = 4,
            color = '#aa4444',
            shape = 'delta',
            name = 'Sat',
            burns = [],
            locked = false,
            side = 'neutral',
            point = 'none',
            team = 1,
            mass = 850, //kilograms
            thrust = 10000, // Newtons
            isp = 200,
            cov = undefined,
            cd = 2.2,
            cr = 1.8,
            area = 15
        } = options; 
        if (position === undefined) {
            position = {...mainWindow.originOrbit}
            position.tA += Math.PI / 180*(-1 + 2*Math.random())
        }
        this.position = position;
        this.team = team
        this.point = point
        this.size = size;
        this.color = color;
        this.mass = mass;
        this.cd = cd
        this.cr = cr
        this.thrust = a === undefined ? thrust : mass * a * 1000;
        this.isp = isp
        this.color = color;
        this.shape = shape;
        this.name = name;
        this.side = side;
        this.area = area
        this.a = a === undefined ? this.thrust / this.mass / 1000 : Number(a); // km/s/s
        this.originDate = Date.now()
        this.locked = locked
        this.pixelPos = [0,0]
        this.cov = cov
        this.showGroundTrack = false
        setTimeout(() => {
            this.burns = burns;
            this.calcTraj(true)
            this.calcTraj()
        }, 250);
    }
    calcTraj (recalcBurns = false, burnStart = 0) {
        if (mainWindow.ephemViewerMode) return // Don't recalculate trajectory if working off of an ephemeris history
        // Double check that burns are labeled correctly for if they are currently displayed
        this.burns.forEach(burn => burn.shown = recalcBurns || mainWindow.scenarioTime > burn.time ? 'post' : 'pre')
        this.stateHistory = calcSatTrajectory(this.position, this.burns, {recalcBurns, a: this.a, startBurn: burnStart})
    }
    genBurns = generateBurns;
    drawTrajectory() {
        // console.log(this.stateHistory);
        if (!this.stateHistory) return;
        mainWindow.drawCurve(this.stateHistory.map(s => s.position), {color: this.color});
    }
    drawBurns() {
        let timeDelta, ctx = mainWindow.getContext(), dist = mainWindow.getPlotWidth() * 0.015;
        ctx.lineWidth = mainWindow.trajSize * 2
        let state = mainWindow.getState();
        let fC = mainWindow.frameCenter;
        let filterTime = mainWindow.burnStatus.type !== false ? mainWindow.scenarioLength*3600 : mainWindow.scenarioTime;
        let burns = this.burns.filter(b => b.time < filterTime)
        mainWindow.drawCurve(burns.map(b => b.location), {color: this.color, size: mainWindow.trajSize * 3});
        ctx.strokeStyle = this.color;
        ctx.textBaseline = 'middle'
        ctx.textAlign = 'center'
        let burnFilterTime = mainWindow.hpop ? mainWindow.scenarioLength*3600 : mainWindow.scenarioTime
        // console.log(burnFilterTime);
        burns.filter(b => b.time < burnFilterTime).forEach(burn => {
            timeDelta = mainWindow.scenarioTime - burn.time;
            let textHeight = mainWindow.cnvs.height/30;
            ctx.font = 'bold '+textHeight+'px serif';
            let mag = math.norm(burn.direction);
            let dispDist = timeDelta > (mag / this.a) ? dist : dist * timeDelta * this.a / mag;
            if (mainWindow.burnStatus.type) return;
            let point1 = mainWindow.convertToPixels(burn.location), mag2;
            let point2 = math.add(burn.location, math.dotMultiply(dispDist / mag, burn.direction))
            point2 = mainWindow.convertToPixels(point2);
            let textWidth = ctx.measureText((1000*mag).toFixed(1)).width;
            if (state.search('ri') !== -1 && (Math.abs(burn.location[0]) < (mainWindow.getPlotHeight() * fC.ri.h / 2)) && (Math.abs(burn.location[1] - mainWindow.plotCenter) < (mainWindow.getPlotWidth() * fC.ri.w / 2))) {
                ctx.beginPath();
                ctx.moveTo(point1.ri.x, point1.ri.y);
                ctx.lineTo(point2.ri.x, point2.ri.y);
                mag2 = math.norm([point2.ri.x - point1.ri.x, point2.ri.y - point1.ri.y]);
                if (mag2 > 1e-6) {
                    ctx.fillText((1000*mag).toFixed(1), -textWidth*1.2 * (point2.ri.x - point1.ri.x) / mag2 / 1.2 + point1.ri.x, -textHeight*(point2.ri.y - point1.ri.y) / mag2 / 1.2 + point1.ri.y)
                    ctx.stroke();
                }
            }
            if (state.search('ci') !== -1 && (Math.abs(burn.location[2]) < (mainWindow.getPlotHeight() * fC.ci.h / 2)) && (Math.abs(burn.location[2] - mainWindow.plotCenter) < (mainWindow.getPlotWidth() * fC.ci.w / 2))) {
            
                ctx.beginPath();
                ctx.moveTo(point1.ci.x, point1.ci.y);
                ctx.lineTo(point2.ci.x, point2.ci.y);
                ctx.stroke();
                mag2 = math.norm([point2.ci.x - point1.ci.x, point2.ci.y - point1.ci.y]);
                if (mag2 > 1e-6) {
                    ctx.fillText((1000*mag).toFixed(1), -textWidth * (point2.ci.x - point1.ci.x) / mag2 / 1.2 + point1.ci.x, -textHeight*(point2.ci.y - point1.ci.y) / mag2 / 1.2 + point1.ci.y)
                    ctx.stroke();
                }
            }
            if (state.search('rc') !== -1 && (Math.abs(burn.location[2]) < (mainWindow.getPlotHeight() * fC.rc.h / 2)) && (Math.abs(burn.location[1]) < (mainWindow.getPlotWidth() * fC.rc.w / 2))) {
                ctx.beginPath();
                ctx.moveTo(point1.rc.x, point1.rc.y);
                ctx.lineTo(point2.rc.x, point2.rc.y);
                ctx.stroke();
                
                mag2 = math.norm([point2.rc.x - point1.rc.x, point2.rc.y - point1.rc.y]);
                if (mag2 > 1e-6) {
                    ctx.fillText((1000*mag).toFixed(1), -textWidth * (point2.rc.x - point1.rc.x) / mag2 / 1.2 + point1.rc.x, -textHeight*(point2.rc.y - point1.rc.y) / mag2 / 1.2 + point1.rc.y)
                    ctx.stroke();
                }
            }
        })
    }
    currentPosition = getCurrentPosition
    drawCurrentPosition() {
        if (!this.stateHistory) return;
        let cur = this.currentPosition(mainWindow.scenarioTime);
        this.curPos = cur
        cur = {
            r: cur[0], 
            i: cur[1], 
            c: cur[2], 
            rd: cur[3], 
            id: cur[4], 
            cd: cur[5]
        };
        this.curPos = cur;
        mainWindow.drawSatLocation(cur, {size: this.size, color: this.color, shape: this.shape, name: this.name});
    }
    checkClickProximity(position, burns = false) {
        // Check if clicked on current position of object, if burns flag is true, check click to current object burns
        let out = {};
        let pixelLimit = 20
        let distLimit = mainWindow.getPlotWidth() * pixelLimit / mainWindow.cnvs.width
        if (position.ri) {
            if (burns) {
                let burnsCheck = false
                this.burns.forEach((burn, ii) => {
                    burnsCheck = math.norm([burn.location[0] - position.ri.r, burn.location[1] - position.ri.i]) < (mainWindow.getPlotWidth() / 80) ? ii : burnsCheck
                })
                out = burnsCheck
            }
            else {
                out.ri = math.norm([this.curPos.r - position.ri.r, this.curPos.i - position.ri.i]) < distLimit
            }
        }
        if (position.ci) {
            if (burns) {
                let burnsCheck = false
                this.burns.forEach((burn, ii) => {
                    burnsCheck = math.norm([burn.location[2] - position.ci.c, burn.location[1] - position.ci.i]) < (mainWindow.getPlotWidth() / 80) ? ii : burnsCheck
                })
                out = burnsCheck
            }
            else {
                out.ci = math.norm([this.curPos.c - position.ci.c, this.curPos.i - position.ci.i]) < distLimit
            }
        }
        if (position.rc) {
            if (burns) {
                let burnsCheck = false
                this.burns.forEach((burn, ii) => {
                    burnsCheck = math.norm([burn.location[2] - position.rc.c, burn.location[0] - position.rc.r]) < (mainWindow.getPlotWidth() / 80) ? ii : burnsCheck
                })
                out = burnsCheck
            }
            else {
                out.rc = math.norm([this.curPos.c - position.rc.c, this.curPos.r - position.rc.r]) < distLimit
            }
        }
        if (out.ri || out.ci || out.rc) {
            lastHiddenSatClicked = lastHiddenSatClicked === false ? {name: this.name, ii: 0} : lastHiddenSatClicked
            lastHiddenSatClicked.ii++
            lastHiddenSatClicked = lastHiddenSatClicked.name === this.name ? lastHiddenSatClicked : {name: this.name, ii: 1}
            if (lastHiddenSatClicked.ii > 2) {
                this.locked = !this.locked
                lastHiddenSatClicked = false
            }
        } 
        else {
            lastHiddenSatClicked = lastHiddenSatClicked.name === this.name ? false : lastHiddenSatClicked
        }
        return this.locked ? burns ? false : {ri: false, ci: false, rc: false} : out
    }
    checkBurnProximity(position) {
        let out = {};
        let pixelLimit = 20
        let distLimit = mainWindow.getPlotWidth() * pixelLimit / mainWindow.cnvs.width
        for (let ii = 0; ii < this.burns.length; ii++) {
            if (position.ri) out.ri = math.norm([this.burns[ii].location[0] - position.ri.r, this.burns[ii].location[1] - position.ri.i]) < distLimit ? ii : out.ri !== false && out.ri !== undefined ? out.ri : false; 
            if (position.ci) out.ci = math.norm([this.burns[ii].location[2] - position.ci.c, this.burns[ii].location[1] - position.ci.i]) < distLimit ? ii : out.ci !== false && out.ci !== undefined ? out.ci : false; 
            if (position.rc) out.rc = math.norm([this.burns[ii].location[2] - position.rc.c, this.burns[ii].location[0] - position.rc.r]) < distLimit ? ii : out.rc !== false && out.rc !== undefined ? out.rc : false; 
        }
        return out;
    }
    checkInBurn() {
        if (mainWindow.burnStatus.type) return;
        let time = mainWindow.scenarioTime
        this.burns.forEach(burn => {
            // let burnDuration = math.norm(burn.direction) / this.a;
            if (burn.shown !== 'pre' && time < burn.time) {
                this.calcTraj();
                burn.shown = 'pre';
            }
            else if (burn.shown !== 'post' && time > burn.time) {
                this.calcTraj();
                burn.shown = 'post';
            }
        });
        
    }
    getPositionArray() {
        return math.transpose([[this.curPos.r, this.curPos.i, this.curPos.c]]);
    }
    getVelocityArray() {
        return math.transpose([[this.curPos.rd, this.curPos.id, this.curPos.cd]]);
    }
    getData() {
        return {
            position: this.position,
            color: this.color,
            size: this.size,
            shape: this.shape,
            color: this.color,
            burns: this.burns,
            name: this.name,
            a: this.a,
            point: this.point,
            team: this.team,
            mass: this.mass,
            thrust: this.thrust,
            isp: this.isp,
            cd: this.cd,
            cr: this.cr,
            area: this.area
        }
    }
    propInitialState(dt) {
        if (Math.abs(dt) > 200000) return
        let state
        if (dt > 0) {
            state = this.currentPosition({time: dt})
            this.position = {
                r: state.r[0],
                i: state.i[0],
                c: state.c[0],
                rd: state.rd[0],
                id: state.id[0],
                cd: state.cd[0]
            }
        }
        else {
            state = [this.position.r, this.position.i, this.position.c, this.position.rd, this.position.id, this.position.cd];
            for (let ii = 0; ii < 5000; ii++) {
                state = runge_kutta(twoBodyRpo, state, dt / 5000)
            }
            this.position = {
                r: state[0],
                i: state[1],
                c: state[2],
                rd: state[3],
                id: state[4],
                cd: state[5]
            }
        }
        this.burns = this.burns.filter(burn => burn.time >= dt).map(burn => {
            burn.time -= dt
            return burn
        })
        this.genBurns()
        this.calcTraj();
    }
}
class GroundSite {
    constructor(options = {}) {
        let {
            lat = -60+120*Math.random(),
            long = 360*Math.random(),
            name = 'Ground Site ' + math.floor(math.random()*1000),
            color = "#E17D64",
            limits = {
                sunExclusion: false,
                maxSunElevation: false,
                illumination: false,
                elevation: 10,
                azimuth: false,
                moonExclusion: false,
                range: false
            },
            type = 'radar'
        } = options
        let expectedLimits = ['sunExclusion', 'maxSunElevation', 'illumination', 'elevation','azimuth','moonExclusion','range']
        expectedLimits.forEach(lim => {
            if (limits[lim] === undefined) {
                limits[lim] = false
            }
        })
        this.coordinates = {
            lat,
            long
        }
        this.color = color
        this.name = name
        this.limits = limits
        this.type = type
    }
    checkLimits = (satEci = Object.values(getCurrentInertial(0)).slice(0,3), date = new Date(mainWindow.startDate - (-1000*mainWindow.scenarioTime)), sunPosEci, moonPosEci) => {
        let canSeeSat = true
        let siteEcef = astro.groundGeodeticPosition(this.coordinates.lat, this.coordinates.long).r
        let siteEci = astro.ecef2eci(siteEcef, date)
        sunPosEci = sunPosEci || astro.sunEciFromTime(date)
        moonPosEci = moonPosEci || astro.moonEciFromTime(date)
        let relSatSensor = math.subtract(satEci, siteEci)
        let {az, el, r} = astro.rAzEl(satEci, date, this.coordinates.lat, this.coordinates.long)
        if (this.limits.sunExclusion !== false) {
            let relSunSensor = math.subtract(sunPosEci, siteEci)
            let cats = math.acos(math.dot(relSatSensor, relSunSensor) / math.norm(relSatSensor) / math.norm(relSunSensor))*180/Math.PI
            canSeeSat = cats > this.limits.sunExclusion
            // console.log(cats, this.limits.sunExclusion);
        }
        if (!canSeeSat) return {result: false, reason: 0}
        if (this.limits.illumination !== false) {
            canSeeSat = isSatIlluminated(satEci, sunPosEci)
        }
        if (!canSeeSat) return {result: false, reason: 1}
        if (this.limits.elevation !== false) {
            canSeeSat = el > this.limits.elevation
            // console.log(el, this.limits.elevation);
        }
        if (!canSeeSat) return {result: false, reason: 2, numbers: {el, elLimit: this.limits.elevation}}
        if (this.limits.azimuth !== false) {

        }
        if (!canSeeSat) return {result: false, reason: 3}
        if (this.limits.moonExclusion !== false) {
            let relMoonSensor = math.subtract(moonPosEci, siteEci)
            let catm = math.acos(math.dot(relSatSensor, relMoonSensor) / math.norm(relSatSensor) / math.norm(relMoonSensor))*180/Math.PI
            canSeeSat = catm > this.limits.moonExclusion
            // console.log(catm, this.limits.moonExclusion);
        }
        if (!canSeeSat) return {result: false, reason: 4}
        if (this.limits.maxSunElevation !== false) {
            let sunAzEl = astro.rAzEl(sunPosEci, date, this.coordinates.lat, this.coordinates.long)
            canSeeSat = sunAzEl.el < this.limits.maxSunElevation
            // console.log(sunAzEl.el, this.limits.maxSunElevation);
        }
        if (!canSeeSat) return {result: false, reason: 5}
        if (this.limits.range !== false) {
            canSeeSat = r < this.limits.range
        }
        if (!canSeeSat) return {result: false, reason: 6}
        return {result: canSeeSat, reason: 5}
    }
}

function testTimeDelta(dt = 500, time = 7200) {
    let dtState = [0, 0, 0, 0.015, 0, 0.055]
    let smallStepState = [...dtState]
    // Find state with dt
    let t = 0
    while (t < time) {
        dtState = runge_kutta(twoBodyRpo, dtState, dt)
        t += dt
    }
    dtState = runge_kutta(twoBodyRpo, dtState, time - t)
    t = 0
    while (t < time) {
        smallStepState = runge_kutta(twoBodyRpo, smallStepState, 1)
        t += 1
    }
    return math.norm(math.subtract(smallStepState, dtState))
}

let mainWindow = new windowCanvas(document.getElementById('main-plot'));
mainWindow.fillWindow();
let lastSaveTime = Date.now() - 30000
function sleep(milliseconds) {
    var start = new Date().getTime();
    for (var i = 0; i < 1e7; i++) {
      if ((new Date().getTime() - start) > milliseconds){
        break;
      }
    }
}
let threeD = false
let timeFunction = false;
(function animationLoop() {
    try {
        mainWindow.cnvs.getContext('2d').globalAlpha = 1 
        if (timeFunction) console.time()
        mainWindow.clear();
        mainWindow.updateSettings();
        if (mainWindow.latLongMode) {
            mainWindow.drawEarthFeatures()

            mainWindow.showTime();
            mainWindow.changeTime(mainWindow.desired.scenarioTime + mainWindow.playTimeStep, true)
        
            if (timeFunction) console.timeEnd()
            return window.requestAnimationFrame(animationLoop)
        }
        if (threeD) {
            mainWindow.satellites.forEach(sat => sat.checkInBurn())
            draw3dScene()
            
            mainWindow.showTime();
            mainWindow.showData();
            if (timeFunction) console.timeEnd()
            return requestAnimationFrame(animationLoop)
        }
        mainWindow.drawInertialOrbit(); 
        mainWindow.drawAxes();
        mainWindow.drawPlot();
        mainWindow.showTime();
        mainWindow.showData();
        mainWindow.drawEllipses()
        mainWindow.showLocation();
        if (mainWindow.burnStatus.type) {
            mainWindow.calculateBurn();
        }
        mainWindow.satellites.forEach(sat => {
            mainWindow.cnvs.getContext('2d').globalAlpha = sat.locked ? 0.15 : 1
            if (!sat.locked) {
                sat.checkInBurn()
                sat.drawTrajectory();
                sat.drawBurns();
            }
            
            sat.drawCurrentPosition();
        })
        if (timeFunction) console.timeEnd()
        mainWindow.recordFunction();
        if ((Date.now() - lastSaveTime) > 15000) {
            setDefaultScenario('autosave', false)
            console.log(`Autosaved on ${(new Date()).toString()}`)
            lastSaveTime = Date.now()
        }
        mainWindow.changeTime(mainWindow.desired.scenarioTime + mainWindow.playTimeStep, true)
        return window.requestAnimationFrame(animationLoop)
    } catch (error) {
        console.log(mainWindow.satellites[0]?.burns[0]);
        console.log(error.stack);
        errorList.push(error)
        let autosavedScen = JSON.parse(window.localStorage.getItem('autosave'))
        mainWindow = new windowCanvas(document.getElementById('main-plot'));
        mainWindow.loadDate(autosavedScen);
        mainWindow.setAxisWidth('set', mainWindow.plotWidth);
        animationLoop()
        mainWindow.desired.scenarioTime = Number(document.getElementById('time-slider-range').value)
        mainWindow.scenarioTime = Number(document.getElementById('time-slider-range').value)
        showScreenAlert('System crash recovering to last autosave');
    }
})()
//------------------------------------------------------------------
// Adding event listeners for window objects
//------------------------------------------------------------------
function keydownFunction(key) {
    // Ignore unless given a object key which says to continue (only applies to ground track context menu)
    if (key.ignoreContext !== true && document.getElementById('context-menu') !== null) return
    key.key = key.key.toLowerCase();
    if (key.key === 'Control') {
        let buttons = document.getElementsByClassName('ctrl-switch');
        for (let ii = 0; ii < buttons.length; ii++) {
            if (buttons[ii].innerText === 'Confirm') return;
        }
        for (let ii = 0; ii < buttons.length; ii++) {
            buttons[ii].innerText = 'Delete';
        }
    }
    else if (key.key === 'Tab') {
        // let a = document.getElementById('add-waypoint-button').hasFocus();
        if (document.activeElement === document.getElementById('add-waypoint-button')) {
            key.preventDefault();
            document.getElementById('add-start-time').focus();
        }
    }
    else if ((key.key === 'z' || key.key === 'Z') && key.ctrlKey) reverseLastAction()
    else if ((key.key === 'y' || key.key === 'Y') && key.ctrlKey) redoLastAction()
    if (mainWindow.panelOpen) return;
    if (key.key === ' ') {
        if (threeD) {
            threeD = false
            return
        }
        if (mainWindow.latLongMode) {
            mainWindow.latLongMode = false
            for (let index = 0; index < mainWindow.satellites.length; index++) {
                mainWindow.satellites[index].latLong = undefined
                mainWindow.satellites[index].calcTraj(true)
                mainWindow.satellites[index].calcTraj()
            }
            mainWindow.setState('ri');
            mainWindow.desired.plotCenter = 0
            mainWindow.desired.plotWidth = mainWindow.originOrbit.a*2*Math.PI / 180
            mainWindow.setFrameCenter({
                ri: {
                    x: 0.5, y: 0.5, w: 1, h: 1
                },
                ci: {
                    x: 0.5, y: 1, w: 1, h: 0
                },
                rc: {
                    x: 0, y: 1, w: 0, h: 0
                }
            })
            return
        }
        switch (mainWindow.getState()) {
            case 'ri': 
                mainWindow.setState('ri ci');
                mainWindow.setFrameCenter({
                    ri: {
                        x: 0.5, y: 0.25, w: 1, h: 0.5
                    },
                    ci: {
                        x: 0.5, y: 0.75, w: 1, h: 0.5
                    },
                    rc: {
                        x: 0, y:1, w: 0, h: 0
                    }
                })
                break;
            case 'ri ci': 
                mainWindow.setState('ri ci03');
                mainWindow.setFrameCenter({
                    ri: {
                        x: 0.5, y: 0.375, w: 1, h: 0.75
                    },
                    ci: {
                        x: 0.5, y: 0.875, w: 1, h: 0.25
                    },
                    rc: {
                        x: 0, y:1, w: 0, h: 0
                    }
                })
                break;
            case 'ri ci03': 
                mainWindow.setState('ri ci rc');
                mainWindow.setFrameCenter({
                    ri: {
                        x: 0.5, y: 0.25, w: 1, h: 0.5
                    },
                    ci: {
                        x: 0.75, y: 0.75, w: 0.5, h: 0.5
                    },
                    rc: {
                        x: 0.25, y: 0.75, w: 0.5, h: 0.5
                    }
                })
                break;
            case 'ri ci rc': 
                // mainWindow.setState('ri ci rc plot');
                mainWindow.setState('ci rc');
                // mainWindow.setFrameCenter({
                //     ri: {
                //         x: 0.75, y: 0.25, w: 0.5, h: 0.5
                //     },
                //     rc: {
                //         x: 0.25, y: 0.75, w:0.50, h: 0.5
                //     },
                //     ci: {
                //         x: 0.75, y: 0.75, w: 0.5, h: 0.5
                //     },
                //     plot: {
                //         x: 0.25, y: 0.25, w: 0.5, h: 0.5
                //     }
                // })
                mainWindow.setFrameCenter({
                    ri: {
                        x: 0.5, y: 0, w: 1, h: 0
                    },
                    rc: {
                        x: 0.25, y: 0.5, w:0.50, h: 1
                    },
                    ci: {
                        x: 0.75, y: 0.5, w: 0.5, h: 1
                    },
                    plot: {
                        x: 0, y: 0, w: 0, h: 0
                    }
                })
                break;
            case 'ri ci rc plot': 
                mainWindow.setState('ci rc');
                mainWindow.setFrameCenter({
                    ri: {
                        x: 0.5, y: 0, w: 1, h: 0
                    },
                    rc: {
                        x: 0.25, y: 0.5, w:0.50, h: 1
                    },
                    ci: {
                        x: 0.75, y: 0.5, w: 0.5, h: 1
                    },
                    plot: {
                        x: 0, y: 0, w: 0, h: 0
                    }
                })
                break;
            case 'ci rc': 
                mainWindow.setState('rc');
                mainWindow.setFrameCenter({
                    ri: {
                        x: 1, y: 0, w: 0, h: 0
                    },
                    ci: {
                        x: 1, y: 0.5, w: 0, h: 1
                    },
                    rc: {
                        x: 0.5, y: 0.5, w: 1, h: 1
                    }
                })
                break;
            case 'rc': 
                mainWindow.setState('ci');
                mainWindow.setFrameCenter({
                    ri: {
                        x: 0.5, y: 0, w: 1, h: 0
                    },
                    ci: {
                        x: 0.5, y: 0.5, w: 1, h: 1
                    },
                    rc: {
                        x: 0, y: 0.5, w: 0, h: 1
                    }
                })
                break;
            case 'ci': 
                // threeD = true
                mainWindow.latLongMode = true
                mainWindow.setState('ri');
                mainWindow.setFrameCenter({
                    ri: {
                        x: 0.5, y: 0.5, w: 1, h: 1
                    },
                    ci: {
                        x: 0.5, y: 1, w: 1, h: 0
                    },
                    rc: {
                        x: 0, y: 1, w: 0, h: 0
                    }
                })
                mainWindow.satellites.forEach(sat => sat.calcTraj(true))
                break;
            default:  
                mainWindow.setState('ri');
                mainWindow.plotSettings.type = null
                mainWindow.setFrameCenter({
                    ri: {
                        x: 0.5, y: 0.5, w: 1, h: 1
                    },
                    ci: {
                        x: 0.5, y: 1, w: 1, h: 0
                    },
                    rc: {
                        x: 0, y: 1, w: 0, h: 0
                    }
                })
                break;       
        }
    }
    else if (!isNaN(Number(key.key))) {
        if (key.altKey) {
            let originIndex = mainWindow.satellites.findIndex(s => math.norm(s.stateHistory[0].position) < 1e-6)
            if (originIndex === -1) return
            mainWindow.originSaves[key.key] = originIndex
            showScreenAlert('Current origin saved as hotkey ' + key.key)
            return
        }
        if (mainWindow.originSaves[key.key] === undefined) return
        changeOrigin(mainWindow.originSaves[key.key])
        return
    }
    else if ('zx'.search(key.key) !== -1 && mainWindow.burnStatus.type !== false) {
        wheelFunction({
            deltaY: 'x'.search(key.key) !== -1 ? -1 : 1,
            target: {
                id: 'main-plot'
            }
        })
    } 
    else if (key.key === 'd' || key.key === 'D') {
        if (mainWindow.colors.backgroundColor === '#111122') {
            mainWindow.colors.backgroundColor = 'white'
            mainWindow.colors.foregroundColor = 'black'
        }
        else {
            mainWindow.colors.backgroundColor = '#111122'
            mainWindow.colors.foregroundColor = 'white'
        }
    }
    else if (key.key === 'g' || key.key === 'G') {
        if (mainWindow.latLongMode) {
            keydownFunction({key: ' '})
            return
        }
        mainWindow.latLongMode = true
    }
    else if (key.key === 's' || key.key === 'S') {
        if (mainWindow.satellites.length < 1) return
        openSatellitePanel()
    } 
    else if (key.key === 'a' || key.key === 'A') {
        if (mainWindow.satellites.length < 1 || mainWindow.groundSites.length < 1) return
        openSensorAccessPanel()
    }
    else if (key.key === 't' || key.key === 'T') {
        openTimePrompt()
    }
    else if (key.key === 'p' || key.key === 'P') {
        if (document.querySelectorAll('.play-drag-div').length === 0) {
            openPlayButtonDiv()
        }
        else {
            mainWindow.playTimeStep = 0
            document.querySelector('.play-drag-div').remove()
        }

    }
    else if (key.key === 'n' || key.key === 'N') {
        let newSat = mainWindow.satellites.length === 0 ?  new Satellite({
                name: 'Chief',
                position: {...mainWindow.originOrbit},
                shape: 'diamond',
                color: '#bb00bb'
            }) : 
            new Satellite({
                name: 'Sat-' + (mainWindow.satellites.length + 1)
            })

        newSat.calcTraj();
        mainWindow.satellites.push(newSat)
        document.title = mainWindow.satellites.map(sat => sat.name).join(' / ')
    }
    else if (key.key === 'M' || key.key === 'm') {
        let newSite = new GroundSite()
        mainWindow.groundSites.push(newSite)
    }
    else if (key.key ==='h' && key.ctrlKey) {
        key.preventDefault()
        displayHpopTraj()
    } 
    else if (key.key ==='c' && key.ctrlKey) {
        mainWindow.showRicCoastlines = !mainWindow.showRicCoastlines
    } 
    else if ((key.key === 'S' || key.key === 's') && key.shiftKey) openSaveWindow()
    else if ((key.key === 'L' || key.key === 'l') && key.shiftKey) openSaveWindow()
    else if (key.key === ',' && key.ctrlKey) mainWindow.satellites.forEach(sat => sat.size = sat.size > 1 ? sat.size - 0.25 : sat.size)
    else if (key.key === '.' && key.ctrlKey) mainWindow.satellites.forEach(sat => sat.size += 0.25)
    else if (key.key === '<' && key.shiftKey && key.altKey) mainWindow.plotSize = mainWindow.plotSize > 0.1 ? mainWindow.plotSize - 0.05 : mainWindow.plotSize
    else if (key.key === '>' && key.shiftKey && key.altKey) mainWindow.plotSize += 0.05
    else if (key.key === '<' && key.shiftKey) mainWindow.trajSize = mainWindow.trajSize > 0.5 ? mainWindow.trajSize - 0.1 : mainWindow.trajSize
    else if (key.key === '>' && key.shiftKey) mainWindow.trajSize += 0.1
    else if (key.key === '.') {
        mainWindow.changeTime(mainWindow.scenarioTime + 120, true)
    }
    else if (key.key === ',') {
        mainWindow.changeTime(mainWindow.scenarioTime - 120, true)
    }
    else if (key.key === 'E' && key.shiftKey && key.altKey) downloadFile('error_file.txt', errorList.map(e => e.stack).join('\n'))
    else if (key.key === 'w' && key.altKey) openWhiteCellWindow()
    else if (key.key === 'w') moveTrueAnomaly(-0.1, false)
    else if (key.key === 'e') moveTrueAnomaly(0.1, false)
}
function sliderFunction(slider) {
    let timeDelta = Number(slider.value) - mainWindow.desired.scenarioTime
    mainWindow.desired.scenarioTime += timeDelta
    
    updateWhiteCellTimeAndErrors()
    if (monteCarloData !== null) {
        // console.log('hey');
        let td = mainWindow.desired.scenarioTime - monteCarloData.time
        td = mainWindow.desired.scenarioTime < monteCarloData.minTime ? monteCarloData.minTime - monteCarloData.time : td
        // console.log(td);
        monteCarloData.points = monteCarloData.points.map(p => {
            let newState = runge_kutta(twoBodyRpo, Object.values(p), td)
            return {
                x: newState[0],
                y: newState[1],
                z: newState[2],
                xd: newState[3],
                yd: newState[4],
                zd: newState[5]
            }
        })
        monteCarloData.time += td //mainWindow.desired.scenarioTime
        let covData = findCovariance(monteCarloData.points)
        monteCarloData.ave = covData.average
        monteCarloData.cov = covData.cov
        ellipses = mainWindow.scenarioTime < monteCarloData.minTime ? [] : [
            cov2ellipse(covData.cov, covData.average)
        ]
        // monteCarloData.points.forEach(p => {
        //     ellipses.push({
        //         screen: 'ri',
        //         a: 0.03,
        //         b: 0.03,
        //         ang: 0,
        //         position: {
        //             r: p.x,
        //             i: p.y,
        //             c: p.z
        //         }
        //     })
        // })
    }
}
window.addEventListener('keydown', keydownFunction)
window.addEventListener('keyup', key => {
    key = key.key;
    if (key === 'Control') {
        let buttons = document.getElementsByClassName('ctrl-switch');
        for (let ii = 0; ii < buttons.length; ii++) {
            if (buttons[ii].innerText === 'Confirm') return;
        }
        for (let ii = 0; ii < buttons.length; ii++) {
            buttons[ii].innerText = 'Edit';
        }
    }
    
    if (document.getElementById('context-menu') !== null) return
    if (key === 'w') moveTrueAnomaly(0)
    else if (key === 'e') moveTrueAnomaly(0)
})
window.addEventListener('resize', () => mainWindow.fillWindow())
function wheelFunction(event) {
    if (mainWindow.panelOpen || event.target.id !== 'main-plot') return;
    if (mainWindow.burnStatus.type === 'waypoint') {
        let tranTimeDelta = event.deltaY > 0 ? -300 / 86164 * (2*Math.PI / mainWindow.mm) : 1800  / 86164 * (2*Math.PI / mainWindow.mm)
        let currentTranTime = mainWindow.satellites[mainWindow.burnStatus.sat].burns[mainWindow.burnStatus.burn].waypoint.tranTime + tranTimeDelta
        let curCrossState = mainWindow.satellites[mainWindow.burnStatus.sat].currentPosition({
            time: mainWindow.satellites[mainWindow.burnStatus.sat].burns[mainWindow.burnStatus.burn].time + currentTranTime
        })
        let currentOrigin = propToTimeAnalytic(mainWindow.originOrbit, mainWindow.satellites[mainWindow.burnStatus.sat].burns[mainWindow.burnStatus.burn].time + currentTranTime)
        let curCrossStateEci = Ric2Eci(curCrossState.slice(0,3), curCrossState.slice(3,6), currentOrigin.slice(0,3), currentOrigin.slice(3,6))
        mainWindow.satellites[mainWindow.burnStatus.sat].burns[mainWindow.burnStatus.burn].waypoint.target = [...curCrossStateEci.rEcci, ...curCrossStateEci.drEci]
        mainWindow.satellites[mainWindow.burnStatus.sat].burns[mainWindow.burnStatus.burn].waypoint.tranTime = currentTranTime > 900 / 86164 * (2*Math.PI / mainWindow.mm) ? currentTranTime : 900 / 86164 * (2*Math.PI / mainWindow.mm)
        mainWindow.changeTime(mainWindow.satellites[mainWindow.burnStatus.sat].burns[mainWindow.burnStatus.burn].time + mainWindow.satellites[mainWindow.burnStatus.sat].burns[mainWindow.burnStatus.burn].waypoint.tranTime,true);
        
        updateWhiteCellTimeAndErrors()
        return;
    }
    if (mainWindow.burnStatus.type === 'manual') {
        let tranTimeDelta = event.deltaY > 0 ? -450  : 900
        let newTime = mainWindow.scenarioTime + tranTimeDelta
        let burnTime = mainWindow.satellites[mainWindow.burnStatus.sat].burns[mainWindow.burnStatus.burn].time
        newTime = newTime < burnTime ? burnTime : newTime
        mainWindow.changeTime(newTime,true);
        
        updateWhiteCellTimeAndErrors()
        return;
    }

    if(mainWindow.latLongMode) {
        
        if (math.abs(event.deltaY) < 1) return
        let newZoom = mainWindow.groundTrackLimits.zoom *( event.deltaY > 0 ? 1/1.1 : 1.1)
        newZoom = newZoom < 1 ? 1 : newZoom 
        mainWindow.groundTrackLimits.zoom = newZoom
        let newLimits = mainWindow.fixGroundTrackCenter(mainWindow.groundTrackLimits.latCenter, mainWindow.groundTrackLimits.center, mainWindow.groundTrackLimits.zoom)
        mainWindow.groundTrackLimits.latCenter = newLimits.newLatCenter
        mainWindow.groundTrackLimits.center = newLimits.newLongCenter
    }
    mainWindow.setAxisWidth(event.deltaY > 0 ? 'increase' : 'decrease')
}
window.addEventListener('wheel', event => {
    wheelFunction(event)
})
document.oncontextmenu = startContextClick
let openInstructions = function() {
    document.getElementById('instructions-panel').classList.toggle("hidden");
}

function alterEditableSatChar(action) {
    let parElement = action.parentElement.parentElement
    let element = action.getAttribute('element')
    let sat = parElement.getAttribute('sat')
    let newEl = action.innerText
    if (element === 'color') {
        mainWindow.satellites[sat][element] = action.value
        return
    }
    if (element === 'shape') {
        console.log(action);
        mainWindow.satellites[sat][element] = action.value
        action.selectedIndex = 0
        return
    }
    if (element === 'a') {
        if (Number.isNaN(Number(newEl))) {
            action.innerText = mainWindow.satellites[sat].a * 1000
            showScreenAlert('Satellite accerlation must be a real number')
            return
        }
        else if (Number(newEl) < 0) {
            action.innerText = mainWindow.satellites[sat].a * 1000
            showScreenAlert('Satellite accerlation must be a postive number')
            return
        }
        newEl = Number(newEl) > 1 ? 1 : newEl
        newEl = Number(newEl) < 0.0001 ? 0.0001 : newEl
    }
    mainWindow.satellites[sat][element] = element === 'a' ? Number(newEl) / 1000 : newEl
    if (element === 'a') {
        mainWindow.satellites[sat].genBurns()
        mainWindow.satellites[sat].calcTraj()
    }
    updateWhiteCellWindow()
    document.title = mainWindow.satellites.map(sat => sat.name).join(' / ')
}

function alterEditableSiteChar(action) {
    let parElement = action.parentElement
    let element = action.getAttribute('element')
    let site = parElement.getAttribute('site')
    let newEl = element === 'name' ? action.innerText : action.value
    mainWindow.groundSites[site][element] = newEl
}

function startContextClick(event) {
    if (event.pointerType === 'touch' && mainWindow.aciveTouches.length > 1) return event.preventDefault()
    if (event.clientX === undefined) {
        event.clientX = event.touches[0].clientX
        event.clientY = event.touches[0].clientY
    }
    if (mainWindow.panelOpen || document.querySelector('dialog').open) {
        return false;
    }
    let ricCoor = mainWindow.convertToRic([event.clientX, event.clientY])
    // Check equivalent lat long of click if on ground track

    let latLongClick = mainWindow.pixel2LatLong([event.clientX , event.clientY])
    // Check if clicked on satellite
    let checkProxSats
    if (threeD) {
        checkProxSats = mainWindow.satellites.map(sat => math.norm(math.subtract([event.clientX, event.clientY], Object.values(sat.pixelPos)))).findIndex(sat => sat < 10)
    }
    else {
        checkProxSats = mainWindow.satellites.map(sat => sat.checkClickProximity(ricCoor, false)).findIndex(sat => sat.ri || sat.rc || sat.ci)
    }
    let activeSat = checkProxSats === -1 ? false : checkProxSats
    // If ctrl key held, ignore satellites over burns to click
    activeSat = event.ctrlKey ? false : activeSat
    // If in ground track mode, ignore click prox based on ric coordinates
    activeSat = mainWindow.latLongMode ? false : activeSat
    let activeSite = false
    // If in ground track mode, check current lat long vs clicked lat long
    if (mainWindow.latLongMode) {
        let currentTime = new Date(mainWindow.startDate - (-mainWindow.scenarioTime*1000))
        let latLongs = mainWindow.satellites.map((s,ii) => Object.values(getCurrentInertial(ii, mainWindow.scenarioTime)))
        latLongs = latLongs.map(s => astro.eci2latlong(s.slice(0,3), currentTime))
        latLongs = latLongs.map(s => {
            s.long += s.long < 0 ? 2 * Math.PI : 0
            s.long -= s.long > 2*Math.PI ? -2 * Math.PI : 0
            return {
                lat: s.lat * 180/Math.PI,
                long: s.long * 180/Math.PI,
            }
        })
        latLongClick.long += latLongClick.long < 0 ? 360 : 0
        latLongClick.long -= latLongClick.long > 360 ? -360 : 0
        activeSat = latLongs.findIndex(s => math.norm([s.long-latLongClick.long, s.lat-latLongClick.lat]) < 4/mainWindow.groundTrackLimits.zoom)
        activeSat = activeSat === -1 ? false : activeSat
        activeSite = mainWindow.groundSites.map(s => s.coordinates).map(s => {
            return {
                lat: s.lat,
                long: s.long < 0 ? s.long + 360 : s.long
            }
        }).findIndex(s => math.norm([s.long-latLongClick.long, s.lat-latLongClick.lat]) < 4/mainWindow.groundTrackLimits.zoom)
        activeSite = activeSite === -1 ? false : activeSite
        
    }
    // Check if clicked on burn
    checkProxSats = mainWindow.satellites.map(sat => sat.checkClickProximity(ricCoor, true))
    // Find index of satellite burn clicked on
    let burnIndexSat = checkProxSats.findIndex(sat => sat !== false)
    let activeBurn = burnIndexSat === -1 ? false : {sat: burnIndexSat, burn: checkProxSats[burnIndexSat]}
    // If in ground track mode, can't select burns
    activeBurn = mainWindow.latLongMode ? false : activeBurn


    let ctxMenu;
    if (document.getElementById('context-menu') === null) {
        ctxMenu = document.createElement('div');
        ctxMenu.style.position = 'fixed';
        ctxMenu.id = 'context-menu';
        ctxMenu.style.zIndex = 101;
        ctxMenu.style.backgroundColor = 'black';
        ctxMenu.style.cursor = 'pointer';
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
    if (pathIndex !== -1) {
        // Clicked on data div, give options to change data shown
        let dataDiv = eventPath[pathIndex]
        let origin = dataDiv.getAttribute('origin')
        let target = dataDiv.getAttribute('target')
        let dataCurrent = mainWindow.relativeData.dataReqs.find(req => {
            return req.origin == origin && req.target == target
        })
        let intTime = dataCurrent.interceptTime || 1
        dataCurrent = dataCurrent.data
        ctxMenu.innerHTML = `
        <div style="color: black; background-color: white; padding: 5px; font-family: Courier; cursor: default;">
            <div><input style="cursor: pointer;" ${undefined !== dataCurrent.find(s => s === 'range') ? 'checked' : ''} id="range" type="checkbox"/> <label style="cursor: pointer" for="range">Range</label></div>
            <div><input style="cursor: pointer;" ${undefined !== dataCurrent.find(s => s === 'rangeRate') ? 'checked' : ''} id="rangeRate" type="checkbox"/> <label style="cursor: pointer" for="rangeRate">Range Rate</label></div>
            <div><input style="cursor: pointer;" ${undefined !== dataCurrent.find(s => s === 'relativeVelocity') ? 'checked' : ''} id="relativeVelocity" type="checkbox"/> <label style="cursor: pointer" for="relativeVelocity">Relative Velocity</label></div>
            <div><input style="cursor: pointer;" ${undefined !== dataCurrent.find(s => s === 'poca') ? 'checked' : ''} id="poca" type="checkbox"/> <label style="cursor: pointer" for="poca">POCA</label></div>
            <div><input style="cursor: pointer;" ${undefined !== dataCurrent.find(s => s === 'sunAngle') ? 'checked' : ''} id="sunAngle" type="checkbox"/> <label style="cursor: pointer" for="sunAngle">CATS</label></div>
            <div><input style="cursor: pointer;" ${undefined !== dataCurrent.find(s => s === 'moonAngle') ? 'checked' : ''} id="moonAngle" type="checkbox"/> <label style="cursor: pointer" for="moonAngle">CATM</label></div>
            <div><input style="cursor: pointer;" ${undefined !== dataCurrent.find(s => s === 'interceptData') ? 'checked' : ''} id="interceptData" type="checkbox"/> <label style="cursor: pointer" for="interceptData"><input placeholder="${intTime}" type="number" class="intercept-time-input" style="width: 4em; font-size: 22px;"/>-hr Intercept</label></div>
            <div onclick="changeData(this)" style="border: 1px solid black; border-radius: 10px; margin-top: 5px; cursor: pointer; width: 100%; text-align: center;" origin="${origin}" target="${target}">Confirm</div>
        <div>
        `
    }
    else if (activeSite !== false) {
        let {lat, long} = mainWindow.groundSites[activeSite].coordinates
        long  = long > 180 ? long - 360 : long
        let satellitesToShowData = mainWindow.siteAccessData[0].sites.find(s => s === activeSite) !== undefined ? mainWindow.siteAccessData[0].satellites : []
        ctxMenu.innerHTML = `
            <div site="${activeSite}" style="margin-top: 10px; padding: 5px 15px; color: white; cursor: default;">
                <span contentEditable="true" element="name" site="${activeSite}" oninput="alterEditableSiteChar(this)">${mainWindow.groundSites[activeSite].name}</span>
                <input list="sat-color-picker3" title="Edit Satellite Color" site="${activeSite}" element="color" oninput="alterEditableSiteChar(this)" style="" type="color" value="${mainWindow.groundSites[activeSite].color}"/>
                <datalist id="sat-color-picker2">
                    <option>#ff0000</option>
                    <option>#0000ff</option>
                </datalist>
            </div>
            <div style="background-color: white; cursor: default; width: 100%; height: 2px"></div>
            
            <div site="${activeSite}" class="context-item" onclick="handleContextClick(this)" id="change-site-limits">Visibility Constraints</div>
            <div site="${activeSite}" class="context-item" onclick="handleContextClick(this)" id="delete-site">Delete Site</div>
            <div style="font-size: 0.75em; margin-top: 5px; padding: 5px 15px; color: white; cursor: default;">
                Lat: ${lat.toFixed(2)} Long: ${long.toFixed(2)}
            </div>
            <div>
                ${satellitesToShowData.length > 0 ? `<div style="color: white; padding: 5px 15px; font-size: 0.75em; text-decoration: underline">Access Data</div>` : ''}
                ${satellitesToShowData.map(sat => {
                    let curTime = new Date(mainWindow.startDate - (-1000*mainWindow.scenarioTime))
                    let curEci = Object.values(getCurrentInertial(sat))
                    let azElRad = astro.rAzEl(curEci.slice(0,3), curTime, lat, long,0)
                    let checkSeeSat = mainWindow.groundSites[activeSite].checkLimits(curEci.slice(0,3))
                    if (!checkSeeSat.result) {
                        let falseReason
                        switch (checkSeeSat.reason) {
                            case 0:
                                falseReason = 'In Sun Exclusion'
                                break
                            case 1: 
                                falseReason = 'Not Illuminated'
                                break
                            case 2: 
                                falseReason = 'Below Elevation Limit'
                                break
                            case 3: 
                                falseReason = 'Outside Azimuth Limit'
                                break
                            case 4: 
                                falseReason = 'In Moon Exclusion'
                                break
                            case 5: 
                                falseReason = 'Sun Elevation Limit'
                                break
                            case 6: 
                                falseReason = 'Range Limit Exceeded'
                                break
                        }
                        return `<div style="color: white; padding: 2.5px 20px; font-size: 0.75em;">${mainWindow.satellites[sat].name} ${falseReason}</div>`
                    }
                    return `<div style="color: white; padding: 2.5px 20px; font-size: 0.75em;">${mainWindow.satellites[sat].name} Az: ${azElRad.az.toFixed(2)}, El: ${azElRad.el.toFixed(2)},  R: ${azElRad.r.toFixed(1)}</div>`
                }).join('')}
            </div>
        `
    }
    else if (activeSat !== false) {
        // User clicked on satellite, generate satellite option menu
        ctxMenu.sat = activeSat;
        let ricPosition = mainWindow.satellites[activeSat].curPos
        let groundPosition = astro.eci2latlong(Object.values(getCurrentInertial(activeSat)).slice(0,3), new Date(mainWindow.startDate - (-1000*mainWindow.scenarioTime)))
        groundPosition = `Lat: ${(groundPosition.lat*180/Math.PI).toFixed(1)}<sup>o</sup>, Long: ${(groundPosition.long*180/Math.PI).toFixed(1)}<sup>o</sup>, <abbr title="Distance to Earth's Center">R</abbr>: ${math.norm(groundPosition.r_ecef).toFixed(1)} km`
        let newInnerHTML = `
            <div sat="${activeSat}" style="display: flex; justify-content: space-between; margin-top: 10px; padding: 5px 15px; color: white; cursor: default;">
                <div>
                    <div contentEditable="true" element="name" oninput="alterEditableSatChar(this)">
                        ${mainWindow.satellites[activeSat].name}
                    </div>
                </div>
                <div>
                    <button title="Lock Satellite" sat="${activeSat}" id="lock-sat-button" onclick="handleContextClick(this)" style="letter-spacing: -2px; transform: rotate(-90deg) translateX(12%); cursor: pointer; margin-bottom: 5px;">lllllllD</button>
                </div>
                <div>
                    <input list="sat-color-picker3" title="Edit Satellite Color" sat="${activeSat}" element="color" oninput="alterEditableSatChar(this)" style="" type="color" value="${mainWindow.satellites[activeSat].color}"/>
                    <datalist id="sat-color-picker2">
                        <option>#ff0000</option>
                        <option>#0000ff</option>
                    </datalist></div>
                <div>
                    <select title="Edit Satellite Shape" element="shape" oninput="alterEditableSatChar(this)" style="font-size: 0.75em; width: 4ch; border: 1px solid white; color: white; background-color: black">
                        <option value=""></option>
                        <option value="delta">Delta</option>
                        <option value="square">Square</option>
                        <option value="triangle">Triangle</option>
                        <option value="diamond">Diamond</option>
                        <option value="4-star">4-Point Star</option>
                        <option value="star">5-Point Star</option>
                    </select>
                </div>
            </div>
            <div style="background-color: white; cursor: default; width: 100%; height: 2px"></div>
        `
        if (mainWindow.ephemViewerMode) {
            newInnerHTML += `
                <div class="context-item" onclick="handleContextClick(this)" id="prop-options">Propagate To</div>
                ${mainWindow.satellites.length > 1 ? '<div class="context-item" onclick="handleContextClick(this)" id="display-data-1">Display Data</div>' : ''}
            `
            if (mainWindow.latLongMode) {
                newInnerHTML += `
                    <div class="context-item" sat="${activeSat}" onclick="handleContextClick(this)" id="zoom-to-sat">Zoom To</div>
                    <div class="context-item" onclick="changeOrigin(${activeSat})" id="prop-options">Focus</div>
                `
            }
        }
        else if (!mainWindow.latLongMode) {
            newInnerHTML += `
                <div class="context-item" id="maneuver-options" onclick="handleContextClick(this)" onmouseover="handleContextClick(event)">Manuever Options</div>
                <div class="context-item" sat="${activeSat}" id="prop-options-set" onclick="handleContextClick(this)" onmouseover="handleContextClick(event)">Set Prop Options</div>
                <div class="context-item" onclick="handleContextClick(this)" id="prop-options">Propagate To</div>
                ${mainWindow.satellites.length > 1 ? '<div class="context-item" onclick="handleContextClick(this)" id="display-data-1">Display Data</div>' : ''}
                ${mainWindow.satellites[activeSat].burns.length > 0 ? `<div sat="${activeSat}" class="context-item" onclick="openBurnsWindow(this)" id="open-burn-window">Open Burns Window</div>` : ''}
            `
        }
        else {
            newInnerHTML += `
                <div class="context-item" sat="${activeSat}" onclick="handleContextClick(this)" id="zoom-to-sat">Zoom To</div>
                <div class="context-item" sat="${activeSat}" onclick="handleContextClick(this)" id="ground-trace-button">${mainWindow.satellites[activeSat].showGroundTrack ? 'Hide' : 'Show'} Field of View</div>
            `
        }
        newInnerHTML += `
            <div style="font-size: 0.4em; padding: 2.5px 15px 0px; margin-top: 5px; color: white; cursor: default;">
                RIC Position To Origin
            </div>
            <div style="font-size: 0.75em; padding: 0px 15px 1px; color: white; cursor: default;">
                ${Object.values(ricPosition).slice(0,3).map(p => p.toFixed(2)).join(', ')} km  ${Object.values(ricPosition).slice(3,6).map(p => (1000*p).toFixed(2)).join(', ')} m/s
            </div>
            <div style="font-size: 0.4em; padding: 1px 15px 0px; margin-top: 5px; color: white; cursor: default;">
                Ground Position
            </div>
            <div style="margin-top: -4px; font-size: 0.75em; padding: 0px 15px 5px; color: white; cursor: default;">
                ${groundPosition}
            </div>
        `

        navigator.clipboard.writeText(toStkFormat((new Date(mainWindow.startDate - (-1000*mainWindow.scenarioTime))).toString())+'x'+Object.values(getCurrentInertial(activeSat)).join('x'))
        ctxMenu.innerHTML = newInnerHTML
    }
    else if (activeBurn !== false) {
        // User clicked on burn, generate burn option menu
        let burn = mainWindow.satellites[activeBurn.sat].burns[activeBurn.burn]
        let burnDir = burn.direction.map(s => s*1000)
        let targetRic
        if (burn.waypoint !== false) {
            let targetOriginEci = propToTimeAnalytic(mainWindow.originOrbit, burn.time + burn.waypoint.tranTime)
            targetRic = ConvEciToRic(targetOriginEci, [...burn.waypoint.target,0,0,0]).slice(0,3)
        }
        let burnDate = new Date(mainWindow.startDate.getTime() + burn.time * 1000)
        let burnTime = toStkFormat(new Date(mainWindow.startDate.getTime() + burn.time * 1000).toString())
        let uploadDate = new Date(mainWindow.startDate.getTime() + burn.time * 1000 - 900000)
        ctxMenu.innerHTML = `
            <div style="margin-top: 10px; padding: 5px 15px; color: white; cursor: default;">${mainWindow.satellites[activeBurn.sat].name}</div>
            <div class="context-item" onclick="handleContextClick(this)" sat="${activeBurn.sat}" burn="${activeBurn.burn}" id="change-time">Change Time <input type="Number" style="width: 3em; font-size: 1em" placeholder="0"> min</div>
            <div style="background-color: white; cursor: default; width: 100%; height: 2px; margin: 2.5px 0px"></div>
            <div style="font-size: 0.9em; padding: 2.5px 15px; color: white; cursor: default;">${burnTime}</div>
            <div dir="${burnDir.join('_')}" id="change-burn"sat="${activeBurn.sat}" burn="${activeBurn.burn}" type="direction" onclick="handleContextClick(this)" class="context-item" title="Direction" style="font-size: 0.9em; padding: 2.5px 15px; color: white;">R: ${burnDir[0].toFixed(2)} I: ${burnDir[1].toFixed(2)} C: ${burnDir[2].toFixed(2)} m/s</div>
            ${burn.waypoint !== false ? `<div dir="${burnDir.join('_')}" way="${targetRic.join('_')}"id="change-burn"sat="${activeBurn.sat}" burn="${activeBurn.burn}" onclick="handleContextClick(this)" type="waypoint" class="context-item" title="Waypoint" style="font-size: 0.9em; padding: 2.5px 15px; color: white;">R: ${targetRic[0].toFixed(2)} I: ${targetRic[1].toFixed(2)} C: ${targetRic[2].toFixed(2)} km TT: ${(burn.waypoint.tranTime/3600).toFixed(2)} hrs</div>`: ''}
            <div dir="${burnDir.join('_')}" id="change-burn"sat="${activeBurn.sat}" burn="${activeBurn.burn}" onclick="handleContextClick(this)" type="angle" class="context-item" title="Az,El,Mag" style="font-size: 0.9em; margin-bottom: 10px; padding: 2.5px 15px; color: white;">Az: ${(math.atan2(burnDir[1], burnDir[0])*180 / Math.PI).toFixed(2)}<sup>o</sup>, El: ${(math.atan2(burnDir[2], math.norm(burnDir.slice(0,2)))*180/Math.PI).toFixed(2)}<sup>o</sup>, M: ${math.norm(burnDir).toFixed(2)} m/s</div>
            `
        let outText = burnTime + 'x' + burnDir.map(x => x.toFixed(4)).join('x')
        let padNumber = function(n) {
            return n < 10 ? '0' + n : n
        }
         if (event.altKey && event.shiftKey) {
            outText = `-. E${padNumber(burnDate.getHours())}${padNumber(burnDate.getMinutes())}z; A${(180 / Math.PI * math.atan2(burnDir[1], burnDir[0])).toFixed(2)}, E${(180 / Math.PI * math.atan2(burnDir[2], math.norm(burnDir.slice(0,2)))).toFixed(2)}, M${math.norm(burnDir).toFixed(2)}, U----z`
            // outText = `UXXXXz; ${mainWindow.satellites[activeBurn.sat].name} MNVR @ ${padNumber(burnDate.getHours())}${padNumber(burnDate.getMinutes())}z; R: ${burnDir[0].toFixed(2)}, I: ${burnDir[1].toFixed(2)}, C: ${burnDir[2].toFixed(2)} Mag: ${math.norm(burnDir).toFixed(2)} m/s`
        }
        else if (event.shiftKey) {
            outText = burnTime + 'x' + Object.values(burn.waypoint.target).map(x => x.toFixed(4)).join('x') + 'x' + burn.waypoint.tranTime + 'x' + burnDir.map(x => x.toFixed(4)).join('x')
        }
        else if (event.altKey) {
            // outText = `X. E${padNumber(burnDate.getHours())}${padNumber(burnDate.getMinutes())}z; A${(180 / Math.PI * math.atan2(burnDir[1], burnDir[0])).toFixed(2)}, E${(180 / Math.PI * math.atan2(burnDir[2], math.norm(burnDir.slice(0,2)))).toFixed(2)}, M${math.norm(burnDir).toFixed(2)}, U----z`
            outText = `U${padNumber(uploadDate.getHours())}--z; ${mainWindow.satellites[activeBurn.sat].name} MNVR @ ${padNumber(burnDate.getHours())}${padNumber(burnDate.getMinutes())}z; R: ${burnDir[0].toFixed(2)}, I: ${burnDir[1].toFixed(2)}, C: ${burnDir[2].toFixed(2)} Mag: ${math.norm(burnDir).toFixed(2)} m/s`
        }
        navigator.clipboard.writeText(outText)
    }
    else {
        ctxMenu.innerHTML = mainWindow.ephemViewerMode ? 
        `
            ${mainWindow.hpop ? '' : `<div class="context-item" onclick="handleContextClick(this)" id="exit-ephem-viewer">Seed Planning Scenario</div>`}
            ${mainWindow.satellites.length > 1 ? `<div class="context-item" onclick="openSatellitePanel()">Open Satellite Panel</div>` : ''}
            ${mainWindow.latLongMode ? `<div lat="${latLongClick.lat}" long="${latLongClick.long}" class="context-item" id="add-ground-site" onclick="handleContextClick(this)">Add Ground Site</div>` : ''}
            <div class="context-item" onclick="openPanel(this)" id="options">Options Menu</div>
            <div class="context-item" onclick="handleContextClick(this)" id="exit-ephem-viewer">Exit ${mainWindow.hpop ? 'HPOP ' : ''}Ephemeris View</div>
        `
        : `
            <div class="context-item" id="add-satellite" onclick="openPanel(this)">Add Satellites</div>
            ${mainWindow.satellites.length > 1 ? `<div class="context-item" onclick="openSatellitePanel()">Open Satellite Panel</div>` : ''}
            <div class="context-item" onclick="openPanel(this)" id="options">Options Menu</div>
            ${mainWindow.latLongMode ? `<div class="context-item" onclick="openSensorAccessPanel()">Open Access Panel</div>` : ``}
            ${mainWindow.latLongMode ? `<div lat="${latLongClick.lat}" long="${latLongClick.long}" class="context-item" id="add-ground-site" onclick="handleContextClick(this)">Add Ground Site</div>` : `<div class="context-item"><label style="cursor: pointer" for="plan-type">Waypoint Planning</label> <input id="plan-type" name="plan-type" onchange="changePlanType(this)" ${mainWindow.burnType === 'waypoint' ? 'checked' : ""} type="checkbox" style="height: 1.5em; width: 1.5em"/></div>`}
            <div class="context-item"><label style="cursor: pointer" for="upload-options-button">Import States</label><input style="display: none;" id="upload-options-button" type="file" accept="*.sas, *.sasm" onchange="uploadTles(event)"></div>
            <div class="context-item" onclick="openInstructionWindow()" id="instructions">Instructions</div>
        `
    }
    //<div class="context-item" onclick="handleContextClick(this)" id="state-options">Update State</div>
            
    if ((ctxMenu.offsetHeight + event.clientY) > window.innerHeight) {
        ctxMenu.style.top = (window.innerHeight - ctxMenu.offsetHeight) + 'px';
    }
    if ((ctxMenu.offsetWidth + event.clientX) > window.innerWidth) {
        ctxMenu.style.left = (window.innerWidth - ctxMenu.offsetWidth) + 'px';
    }
    setTimeout(() => ctxMenu.style.transform = 'scale(1)', 10);
    return false;
}

function changeData(el) {
    let origin = el.getAttribute('origin')
    let target = el.getAttribute('target')
    let interceptTime = el.parentElement.querySelector('.intercept-time-input')
    interceptTime = interceptTime.value === '' ? interceptTime.placeholder : interceptTime.value

    interceptTime = Number(interceptTime)
    let checkBoxes = [...el.parentElement.querySelectorAll('input')].filter(s => s.checked).map(s => s.id)
    let reqIndex = mainWindow.relativeData.dataReqs.findIndex(s => s.origin == origin && s.target == target)
    mainWindow.relativeData.dataReqs[reqIndex].data = checkBoxes
    mainWindow.relativeData.dataReqs[reqIndex].interceptTime = interceptTime
    resetDataDivs()
    document.getElementById('context-menu')?.remove();
}

function changeSide(sat, side="neutral") {
    mainWindow.satellites[sat].side = side
}

function lineSphereIntercetionBool(line = [-0.45, 0, 0.45], lineOrigin = [282.75, 0, 0], sphereOrigin = [0, 0, 0], sphereRadius = 200) {
    line = math.dotDivide(line, math.norm(line))
    let check = math.dot(line, math.subtract(lineOrigin, sphereOrigin)) ** 2 - (math.norm(math.subtract(lineOrigin, sphereOrigin)) ** 2 - sphereRadius ** 2)
    return check > 0
}

function isSatIlluminated(satPos = [6900, 0, 0], sunPos = [6900000, 0, 0]) {
    let satSunAngle = math.acos(math.dot(satPos.slice(0, 3), sunPos) / math.norm(satPos.slice(0, 3)) / math.norm(sunPos))
    if (satSunAngle < Math.PI / 2) return true
    return !lineSphereIntercetionBool(math.subtract(satPos.slice(0, 3), sunPos), sunPos, [0, 0, 0], 6400)
}

function handleContextClick(button) {
    if (button.id === 'maneuver-options') {
         button.parentElement.innerHTML = `
            <div class="context-item" onclick="handleContextClick(this)" id="waypoint-maneuver">Waypoint</div>
            <div class="context-item" onclick="handleContextClick(this)" id="direction-maneuver">Direction</div>
            <div class="context-item" onclick="handleContextClick(this)" id="az-el-maneuver">Az El Mag</div>
            <div class="context-item" onclick="handleContextClick(this)" id="dsk-maneuver">DSK</div>
            <div class="context-item" onclick="handleContextClick(this)" id="drift-maneuver">Set Drift Rate</div>
            <div class="context-item" onclick="handleContextClick(this)" id="perch-maneuver">Perch</div>
            <div class="context-item" onclick="handleContextClick(this)" id="circ-maneuver">Circularize</div>
            ${mainWindow.satellites.length > 1 ? '<div class="context-item" onclick="handleContextClick(this)" id="sun-maneuver">Gain Sun</div>' : ''}
        `
        //<div class="context-item" onclick="handleContextClick(this)" id="multi-maneuver">Multi-Burn</div>
        // <div class="context-item" onclick="handleContextClick(this)" id="rmoes-maneuver">Target RMOE's</div>
            // ${mainWindow.satellites.length > 1 ? '<div class="context-item" onclick="handleContextClick(this)" id="poca-maneuver">Maximize POCA</div>' : ''}
        let cm = document.getElementById('context-menu')
        let elHeight = cm.offsetHeight
        let elTop =  Number(cm.style.top.split('p')[0])
        cm.style.top = (window.innerHeight - elHeight) < elTop ? (window.innerHeight - elHeight) + 'px' : cm.style.top
    }
    if (button.id === 'prop-options-set') {
        let sat = button.getAttribute('sat')
        button.parentElement.innerHTML = `
            <div class="context-item" >Initial Mass: <input type="Number" style="width: 5em; font-size: 1em" placeholder="${mainWindow.satellites[sat].mass}"> kg</div>
            <div class="context-item" >Thrust: <input type="Number" style="width: 5em; font-size: 1em" placeholder="${mainWindow.satellites[sat].thrust}"> N</div>
            <div class="context-item" >Specific Impulse: <input type="Number" style="width: 5em; font-size: 1em" placeholder="${mainWindow.satellites[sat].isp}"> sec</div>
            <div class="context-item" >Area: <input type="Number" style="width: 5em; font-size: 1em" placeholder="${mainWindow.satellites[sat].area}"> m<sup>2</sup></div>
            <div class="context-item" >C<sub>d</sub>: <input type="Number" style="width: 5em; font-size: 1em" placeholder="${mainWindow.satellites[sat].cd}"></div>
            <div class="context-item" >C<sub>r</sub>: <input type="Number" style="width: 5em; font-size: 1em" placeholder="${mainWindow.satellites[sat].cr}"></div>
            <div class="context-item" sat=${sat} onclick="handleContextClick(this)" id="prop-options-save">Save</div>
        `
        let cm = document.getElementById('context-menu')
        let elHeight = cm.offsetHeight
        let elTop =  Number(cm.style.top.split('p')[0])
        cm.style.top = (window.innerHeight - elHeight) < elTop ? (window.innerHeight - elHeight) + 'px' : cm.style.top
    }
    if (button.id === 'prop-options-save') {
        let sat = button.getAttribute('sat')
        let inputs = button.parentElement.getElementsByTagName('input');
        let mass = Number(inputs[0].value === '' ? inputs[0].placeholder : inputs[0].value)
        let thrust = Number(inputs[1].value === '' ? inputs[1].placeholder : inputs[1].value)
        let isp = Number(inputs[2].value === '' ? inputs[2].placeholder : inputs[2].value)
        let area = Number(inputs[3].value === '' ? inputs[3].placeholder : inputs[3].value)
        let cd = Number(inputs[4].value === '' ? inputs[4].placeholder : inputs[4].value)
        let cr = Number(inputs[5].value === '' ? inputs[5].placeholder : inputs[5].value)
        mainWindow.satellites[sat].mass = mass
        mainWindow.satellites[sat].thrust = thrust
        mainWindow.satellites[sat].isp = isp
        mainWindow.satellites[sat].a = thrust / mass / 1000
        mainWindow.satellites[sat].area = area
        mainWindow.satellites[sat].cd = cd
        mainWindow.satellites[sat].cr = cr
        mainWindow.satellites[sat].calcTraj(true)
        mainWindow.satellites[sat].calcTraj()
        document.getElementById('context-menu')?.remove();
        
    }
    if (button.id === 'launch-options') {
        let site = button.getAttribute('site')
        let siteEci = astro.latlong2eci(mainWindow.groundSites[site].coordinates.lat, mainWindow.groundSites[site].coordinates.long, new Date(mainWindow.startDate - (-1000*mainWindow.scenarioTime)))
        let targets = mainWindow.satellites.map((s,satii) => Object.values(getCurrentInertial(satii, mainWindow.scenarioTime)))
        let launchDate = new Date(mainWindow.startDate - (-1000*mainWindow.scenarioTime))
        targets.forEach(satEci => {
            let launchData = Launch.calculateLaunch(siteEci, satEci, launchDate)
            if (launchData !== false) {
                let startOfScenarioState = propToTime(launchData.launchState, (mainWindow.startDate - launchDate) / 1000)
                startOfScenarioState = PosVel2CoeNew(startOfScenarioState.slice(0,3), startOfScenarioState.slice(3))
                mainWindow.satellites.push(new Satellite({
                    position: startOfScenarioState
                }))
            }
        })
        console.log(siteEci, targets);

        button.parentElement.innerHTML = `
            <div class="context-item" onclick="handleContextClick(this)" id="waypoint-maneuver">Waypoint</div>
        `
        //<div class="context-item" onclick="handleContextClick(this)" id="multi-maneuver">Multi-Burn</div>
        // <div class="context-item" onclick="handleContextClick(this)" id="rmoes-maneuver">Target RMOE's</div>
            // ${mainWindow.satellites.length > 1 ? '<div class="context-item" onclick="handleContextClick(this)" id="poca-maneuver">Maximize POCA</div>' : ''}
        let cm = document.getElementById('context-menu')
        let elHeight = cm.offsetHeight
        let elTop =  Number(cm.style.top.split('p')[0])
        cm.style.top = (window.innerHeight - elHeight) < elTop ? (window.innerHeight - elHeight) + 'px' : cm.style.top
    }
    if (button.id === 'delete-site') {
        let site = button.getAttribute('site')
        mainWindow.groundSites.splice(site,1)
        document.getElementById('context-menu').remove()
    }
    if (button.id === 'exit-ephem-viewer') {
        document.getElementById('context-menu')?.remove();
        if (mainWindow.hpop) return displayHpopTraj()
        if (button.innerText === 'Seed Planning Scenario') {
            let originOrbit = propToTimeAnalytic(mainWindow.originOrbit, mainWindow.scenarioTime)
            console.log(originOrbit);
            let satellites = mainWindow.satellites
                .map(s => {
                    let ricPos = Object.values(s.curPos)
                    let eciPos = Ric2Eci(ricPos.slice(0,3), ricPos.slice(3,6), originOrbit.slice(0,3), originOrbit.slice(3,6))
                    eciPos = PosVel2CoeNew(eciPos.rEcci, eciPos.drEci)
                    return {
                        pos: eciPos,
                        color: s.color,
                        name: s.name,
                        shape: s.shape
                    }
                })
            mainWindow.satellites = satellites.map((s,ii) => {
                return new Satellite({
                    position: s.pos,
                    color: s.color,
                    name: s.name,
                    shape: s.shape
                })
            })
            mainWindow.ephemViewerMode = false
            mainWindow.startDate = new Date(mainWindow.startDate - (-mainWindow.scenarioTime*1000))
            mainWindow.changeTime(0, true)
            mainWindow.updateOrigin(PosVel2CoeNew(originOrbit.slice(0,3), originOrbit.slice(3,6)))
            return
        }
        mainWindow.ephemViewerMode = false
        mainWindow.satellites = []
        document.getElementById('context-menu')?.remove();
    }
    else if (button.id === 'zoom-to-sat') {
        changeOrigin(button.getAttribute('sat'))
        keydownFunction({key: ' ', ignoreContext: true})
        document.getElementById('context-menu')?.remove();
    }
    else if (button.id === 'ground-trace-button') {
        let sat = button.getAttribute('sat')
        mainWindow.satellites[sat].showGroundTrack = !mainWindow.satellites[sat].showGroundTrack
        document.getElementById('context-menu')?.remove();
    }
    else if (button.id === 'add-ground-site') {
        let numCurrentGroundSides = mainWindow.groundSites.length
        button.parentElement.innerHTML = `
            <div style="color: white; padding: 5px">Name <input style="width: 20ch;" placeholder="Ground Site #${numCurrentGroundSides+1}"/> deg</div>
            <div style="color: white; padding: 5px">Latitude <input style="width: 8ch;" type="number" placeholder="${button.getAttribute("lat")}"/> deg</div>
            <div style="color: white; padding: 5px">Longitude <input style="width: 8ch;" type="number" placeholder="${button.getAttribute("long")}"/> deg</div>
            <div class="context-item" tabindex="0" onclick="handleContextClick(this)" id="add-ground-site-execute">Add Site</div>
        `
    }
    else if (button.id === 'add-ground-site-execute') {
        let inputs = [...button.parentElement.querySelectorAll('input')].map(s => {
            return s.value === '' ? s.placeholder : s.value
        })
        mainWindow.groundSites.push(new GroundSite({
            name: inputs[0],
            long: Number(inputs[2]),
            lat: Number(inputs[1]),
            color: '#E17D64'
        }))
        document.getElementById('context-menu')?.remove();
    }
    else if (button.id === 'change-site-limits') {
        let site = button.getAttribute('site')
        let inputPlacehoders = [
            mainWindow.groundSites[site].limits.maxSunElevation !== false ? mainWindow.groundSites[site].limits.maxSunElevation : 0,
            mainWindow.groundSites[site].limits.sunExclusion !== false ? mainWindow.groundSites[site].limits.sunExclusion : 90,
            mainWindow.groundSites[site].limits.moonExclusion !== false ? mainWindow.groundSites[site].limits.moonExclusion : 0,
            mainWindow.groundSites[site].limits.elevation !== false ? mainWindow.groundSites[site].limits.elevation : 0,
            mainWindow.groundSites[site].limits.range !== false ? mainWindow.groundSites[site].limits.range : 60000,
        ].map(s => Number(s.toFixed(1)))
        button.parentElement.innerHTML = `
            <div style="color: white; padding: 5px"><input element="illumination" ${mainWindow.groundSites[site].limits.illumination !== false ? 'checked' : ''} id="target-illum-box" type="checkbox"/> <label for="target-illum-box">Target Illuminated</label></div>
            <div style="color: white; padding: 5px"><input element="maxSunElevation" ${mainWindow.groundSites[site].limits.maxSunElevation !== false ? 'checked' : ''} id="max-sun-el-box" type="checkbox"/> <label for="max-sun-el-box">Max Sun Elevation</label> <input placeholder="${inputPlacehoders[0]}" type="number" style="width: 5ch; font-size: 1.1em;"/> deg</div>
            <div style="color: white; padding: 5px"><input element="sunExclusion" ${mainWindow.groundSites[site].limits.sunExclusion !== false ? 'checked' : ''} id="sun-ex-box" type="checkbox"/> <label for="sun-ex-box">Solar Exclusion</label> <input placeholder="${inputPlacehoders[1]}" type="number" style="width: 5ch; font-size: 1.1em;"/> deg</div>
            <div style="color: white; padding: 5px"><input element="moonExclusion" ${mainWindow.groundSites[site].limits.moonExclusion !== false ? 'checked' : ''} id="moon-ex-box" type="checkbox"/> <label for="moon-ex-box">Lunar Exclusion</label> <input placeholder="${inputPlacehoders[2]}" type="number" style="width: 5ch; font-size: 1.1em;"/> deg</div>
            <div style="color: white; padding: 5px"><input element="elevation" ${mainWindow.groundSites[site].limits.elevation !== false ? 'checked' : ''} id="sat-el-box" type="checkbox"/> <label for="sat-el-box">Min Target Elevation</label> <input placeholder="${inputPlacehoders[3]}" type="number" style="width: 5ch; font-size: 1.1em;"/> deg</div>
            <div style="color: white; padding: 5px"><input element="range" ${mainWindow.groundSites[site].limits.range !== false ? 'checked' : ''} id="sat-range-box" type="checkbox"/> <label for="sat-range-box">Max Target Range</label> <input placeholder="${inputPlacehoders[4]}" type="number" style="width: 7ch; font-size: 1.1em;"/> km</div>
            <div site="${site}" class="context-item" tabindex="0" onclick="handleContextClick(this)" id="change-site-limits-execute">Confirm Limits</div>
        `
        let cm = document.getElementById('context-menu')
        let elHeight = cm.offsetHeight
        let elTop =  Number(cm.style.top.split('p')[0])
        cm.style.top = (window.innerHeight - elHeight) < elTop ? (window.innerHeight - elHeight) + 'px' : cm.style.top
    
    }
    else if (button.id === 'change-site-limits-execute') {
        let site = button.getAttribute('site')
        let inputPlacehoders = [...button.parentElement.querySelectorAll('input[type=checkbox]')]
        let numInputPlaceholders = [true, ...[...button.parentElement.querySelectorAll('input[type=number]')].map(s => s.value === '' ? Number(s.placeholder) : Number(s.value))]
        console.log(inputPlacehoders, numInputPlaceholders);
        inputPlacehoders = inputPlacehoders.map((s,ii) => [s.getAttribute('element'), s.checked, numInputPlaceholders[ii]])
        inputPlacehoders.forEach(input => {
            mainWindow.groundSites[site].limits[input[0]] = input[1] ? input[2] : false
        })
        document.getElementById('context-menu')?.remove();
    }
    else if (button.id === 'lock-sat-button') {
        let sat = button.getAttribute('sat')
        mainWindow.satellites[sat].locked = true
        document.getElementById('context-menu')?.remove();
    }
    else if (button.id === 'display-data-1') {

        let sat = button.parentElement.sat
        let out  = `
           <div class="context-item" onclick="handleContextClick(this)" id="display-data-2">Confirm</div>
           <div class="no-scroll" style="max-height: 300px; overflow: scroll">
        `

        // Order satellites by distance from selected satellite
        let satList = mainWindow.satellites.map((s, ii) => {
            return {index: ii, name: s.name, position: math.norm(math.subtract(Object.values(s.curPos), Object.values(mainWindow.satellites[sat].curPos)).slice(0,3))}
        }).filter((s,ii) => ii !== sat).sort((a,b) => a.position - b.position)
       for (let index = 0; index < satList.length; index++) {
        //   if (index === sat || mainWindow.satellites[index].locked) continue
          let checked = ''
          if (mainWindow.relativeData.dataReqs.filter(req => Number(req.origin) === sat && Number(req.target) === satList[index].index).length > 0) checked = 'checked'
          out += `<div style="color: white; padding: 5px" id="display-data-2"><input type="checkbox" ${checked} id="${satList[index].index}-box"/><label style="cursor: pointer" for="${satList[index].index}-box">${satList[index].name}</label>
            <span style="font-size: 0.5em; color: #bbbbbb">${satList[index].position.toFixed(1)} km</span>
          </div>`
       }
       out += '/div>'

       button.parentElement.innerHTML = out
       let cm = document.getElementById('context-menu')
       let elHeight = cm.offsetHeight
       let elTop =  Number(cm.style.top.split('p')[0])
       cm.style.top = (window.innerHeight - elHeight) < elTop ? (window.innerHeight - elHeight) + 'px' : cm.style.top
    }
    else if (button.id === 'display-data-2') {
        let oldCheckboxes = button.parentElement.getElementsByTagName('input')
        let targets = []
        for (let index = 0; index < oldCheckboxes.length; index++) {
            if (oldCheckboxes[index].checked) targets.push(Number(oldCheckboxes[index].id.split('-')[0]))
        }
        if (targets.length === 0) {
            mainWindow.relativeData.dataReqs = mainWindow.relativeData.dataReqs.filter(req => Number(req.origin) !== Number(button.parentElement.sat))
            document.getElementById('context-menu')?.remove();
            return
        }
        button.parentElement.targets = targets
        let out  = `
           <div class="context-item" onclick="handleContextClick(this)" id="display-data-3">Confirm</div>
           <div style="color: white; padding: 5px" id="display-data-2"><input type="checkbox" id="range"/><label style="cursor: pointer" for="range">Range</label></div>
           <div style="color: white; padding: 5px" id="display-data-2"><input type="checkbox" id="rangeRate"/><label style="cursor: pointer" for="rangeRate">Range Rate</label></div>
           <div style="color: white; padding: 5px" id="display-data-2"><input type="checkbox" id="relativeVelocity"/><label style="cursor: pointer" for="relativeVelocity">Relative Velocity</label></div>
           <div style="color: white; padding: 5px" id="display-data-2"><input type="checkbox" id="poca"/><label title="Point of Closest Approach" style="cursor: pointer" for="poca">POCA</label></div>
           <div style="color: white; padding: 5px" id="display-data-2"><input type="checkbox" id="sunAngle"/><label title="Camera-Angle-Target-Sun" style="cursor: pointer" for="sunAngle">CATS</label></div>
           <div style="color: white; padding: 5px" id="display-data-2"><input type="checkbox" id="moonAngle"/><label title="Camera-Angle-Target-Moon" style="cursor: pointer" for="moonAngle">CATM</label></div>
           <div style="color: white; padding: 5px" id="display-data-2"><input type="checkbox" id="interceptData"/><label style="cursor: pointer" for="interceptData">1-hr Intercept</label></div>
        `

       button.parentElement.innerHTML = out
       let cm = document.getElementById('context-menu')
       let elHeight = cm.offsetHeight
       let elTop =  Number(cm.style.top.split('p')[0])
       cm.style.top = (window.innerHeight - elHeight) < elTop ? (window.innerHeight - elHeight) + 'px' : cm.style.top
    }
    else if (button.id === 'display-data-3') {
        let oldCheckboxes = button.parentElement.getElementsByTagName('input')
        let data = []
        for (let index = 0; index < oldCheckboxes.length; index++) {
            if (oldCheckboxes[index].checked) data.push(oldCheckboxes[index].id)
        }
        console.log(data);
        if (data.length === 0) return
        mainWindow.relativeData.dataReqs = mainWindow.relativeData.dataReqs.filter(req => Number(req.origin) !== Number(button.parentElement.sat))
        
        button.parentElement.targets.forEach((target, ii) => {
            mainWindow.relativeData.dataReqs.push({
                data,
                target,
                origin: button.parentElement.sat,
                interceptTime: 1
            })
        })
        resetDataDivs()
        document.getElementById('context-menu')?.remove();
    }
    else if (button.id === 'poca-maneuver') {
        let html = `
            <div class="context-item" >dV: <input type="Number" style="width: 3em; font-size: 1em" placeholder="5"> m/s</div>
        `
        
        let sat = button.parentElement.sat
        for (let ii = 0; ii < mainWindow.satellites.length; ii++) {
            if (sat === ii) continue
            html += `<div class="context-item" onclick="handleContextClick(this)" onkeydown="handleContextClick(this)" target="${ii}" id="poca-max-execute" tabindex="0">${mainWindow.satellites[ii].name}</div>`
        }
        button.parentElement.innerHTML = html
        document.getElementsByClassName('context-item')[0].getElementsByTagName('input')[0].focus();
    }
    else if (button.id === 'poca-max-execute') {
        let targetSat = button.parentElement.sat
        let depSat = Number(button.getAttribute('target'))
        let dv = button.parentElement.getElementsByTagName('input')[0].value

        dv = dv === '' ? Number(button.parentElement.getElementsByTagName('input')[0].placeholder) : Number(dv)
        let data_0dv = findMaxPoca(0, targetSat, depSat, mainWindow.satellites[targetSat].a)
        let data_dv = findMaxPoca(dv, targetSat, depSat, mainWindow.satellites[targetSat].a)
        console.log(data_0dv, data_dv);
        let confirm_answer = confirm(`Accept maneuver?\nCurrent POCA: ${data_0dv.maxRange.toFixed(2)} km\nManeuver POCA: ${data_dv.maxRange.toFixed(2)} km`)
        if (confirm_answer) {
            let burn = math.squeeze(data_dv.maxDir)
            mainWindow.satellites[targetSat].burns = mainWindow.satellites[targetSat].burns.filter(burn => burn.time < mainWindow.scenarioTime)
            insertDirectionBurn(targetSat, mainWindow.scenarioTime, burn)
            document.getElementById('context-menu')?.remove();
        }
    
    }
    else if (button.id === 'drift-maneuver') { 
        let inertPos = getCurrentInertial(button.parentElement.sat)
        inertPos = Object.values(inertPos)
        let satSMA = PosVel2CoeNew(inertPos.slice(0,3), inertPos.slice(3,6)).a
        let scenSMA = mainWindow.originOrbit.a
        let driftRate = (398600.4418 / satSMA ** 3) ** (1/2) - (398600.4418 / scenSMA ** 3) ** (1/2)
        driftRate *= 180 / Math.PI * 86164
        driftRate = Math.round(driftRate * 100) / 100
        let html = `
            <div class="context-item" >Drift Rate: <input type="Number" style="width: 3em; font-size: 1em" placeholder="${driftRate}"> deg/rev</div>
            <div class="context-item" onclick="handleContextClick(this)" onkeydown="handleContextClick(this)" id="execute-drift" tabindex="0">Execute</div>
        `
        button.parentElement.innerHTML = html
        document.getElementsByClassName('context-item')[0].getElementsByTagName('input')[0].focus();
    }
    else if (button.id === 'change-time') { 
        let inputs = button.getElementsByTagName('input')
        if (inputs[0].value === '') return
        let sat = button.getAttribute('sat') 
        let burn = button.getAttribute('burn')
        let curTime = mainWindow.scenarioTime + Number(inputs[0].value) * 60
        logAction({
            type: 'alterBurn',
            index: burn,
            sat,
            burn:  JSON.parse(JSON.stringify(mainWindow.satellites[sat].burns[burn]))
        })
        moveBurnTime(sat, burn, Number(inputs[0].value) * 60)
        mainWindow.desired.scenarioTime = curTime
        document.getElementById('context-menu')?.remove()
        }
    else if (button.id === 'perch-maneuver') { 
        let sat = button.parentElement.sat;
        perchSatellite(sat)
        document.getElementById('context-menu')?.remove();
    }
    else if (button.id === 'circ-maneuver') { 
        let sat = button.parentElement.sat;
        circSatellite(sat)
        document.getElementById('context-menu')?.remove();
    }
    else if (button.id === 'prop-options') {
        button.parentElement.innerHTML = `
            <div class="context-item" onclick="handleContextClick(this)" id="prop-crossing">Next Plane-Crossing</div>
            <div class="context-item" onclick="handleContextClick(this)" id="prop-perigee">Next Perigee</div>
            <div class="context-item" onclick="handleContextClick(this)" id="prop-apogee">Next Apogee</div>
            <div class="context-item" onclick="handleContextClick(this)" id="prop-radial">Radial Position</div>
            <div class="context-item" onclick="handleContextClick(this)" id="prop-in-track">In-Track Position</div>
            ${mainWindow.satellites.length > 1 ? '<div class="context-item" onclick="handleContextClick(this)" id="prop-poca">To POCA</div>' : ''}
            ${mainWindow.satellites.length > 1 ? '<div class="context-item" onclick="handleContextClick(this)" id="prop-range">To Range</div>' : ''}
            ${mainWindow.satellites.length > 1 ? '<div class="context-item" onclick="handleContextClick(this)" id="prop-cats">To CATS</div>' : ''}
            `
    }
    else if (button.id === 'state-options') {
        button.parentElement.innerHTML = `
            <div class="context-item" id="state-update"><input placeholder="ARTS Report String"/></div>
            <div class="context-item" onclick="handleContextClick(this)" id="state-update">Update</div>
        `
        document.getElementsByClassName('context-item')[0].getElementsByTagName('input')[0].focus();
    }
    else if (button.id === 'state-update') {
        let input = button.parentElement.getElementsByTagName('input')[0]
        let sat = button.parentElement.sat
        if (input.value === '') return
        let parsedValues = parseArtsText(input.value)
        if (parsedValues == undefined) return
        
        // Check if RIC origin sat is consistant with original data pull
        if (parsedValues.chief !== undefined) {
            let chiefSat = mainWindow.satellites.filter(sat => math.norm(Object.values(sat.position)) < 1e-6)
            if (chiefSat.length > 0) {
                if (chiefSat[0].name !== parsedValues.chief) {
                    let a = confirm(`Expected origin does not match given origin name\nExpected: ${chiefSat[0].name}\nGiven: ${parsedValues.chief}`)
                    if (!a) return
                }
            }
            else {
                let a = confirm(`Add satellite at origin named ${parsedValues.chief}?`)
                if (a) {
                    mainWindow.satellites.push(new Satellite({
                        name: parsedValues.chief,
                        position: {r: 0, i: 0, c: 0, rd: 0, id: 0, cd: 0},
                        color: '#f0f',
                        shape: 'diamond',
                        a: 0.01
                    }))
                }
            }
        }
        // Check if satellite name from STK report matches name on ARTS
        if (parsedValues.dep !== undefined) {
            if (mainWindow.satellites[sat].name !== parsedValues.dep) {
                let a = confirm(`Expected name does not match given name from report\nName of Satellite in ARTS: ${mainWindow.satellites[sat].name}\nName Given from Report: ${parsedValues.dep}`)
                if (!a) return
            }
        }

        let oldDate = mainWindow.startDate + 0
        mainWindow.startDate = parsedValues.newDate
        let delta = (new Date(mainWindow.startDate) - new Date(oldDate)) / 1000
        mainWindow.satellites.forEach(sat => sat.propInitialState(delta))
        mainWindow.setInitSun(parsedValues.newSun)
        mainWindow.originOrbit = parsedValues.originOrbit
        mainWindow.mm = (398600.4418 / mainWindow.originOrbit.a ** 3) ** 0.5
        mainWindow.satellites[sat].position = {
            r:  parsedValues.newState[0],
            i:  parsedValues.newState[1],
            c:  parsedValues.newState[2],
            rd: parsedValues.newState[3],
            id: parsedValues.newState[4],
            cd: parsedValues.newState[5]
        }
        mainWindow.satellites[sat].originDate = Date.now()
        mainWindow.satellites[sat].calcTraj()
    }
    else if (button.id === 'data-options') {
        button.parentElement.innerHTML = `
            <div class="context-item" onclick="handleContextClick(this)" id="plot-range">Range</div>
            <div class="context-item" onclick="handleContextClick(this)" id="plot-cats">CATS</div>
            <div class="context-item" onclick="handleContextClick(this)" id="plot-relvel">Relative Velocity</div>
            `
    }
    else if (button.id?.split('-')[0] === 'plot') {
        let newInnerHTML = ``;
        for (let ii = 0; ii < mainWindow.satellites.length; ii++) {
            if (ii === Number(document.getElementById('context-menu').sat)) continue;
            newInnerHTML += `<div class="context-item"  onclick="handleContextClick(this)" sat="${ii}" id="data-plot-execute">${button.id.split('-')[1] === 'range' ? 'Range' : button.id.split('-')[1] === 'cats' ? 'CATS' : 'Relative Velocity'} To ${mainWindow.satellites[ii].name}</div>`
        }
        button.parentElement.innerHTML = newInnerHTML;
    }
    else if (button.id === 'data-plot-execute') {
        let target = button.getAttribute('sat');
        let origin = button.parentElement.sat;
        plotRelativeData(button.innerHTML.split(' To ')[0], origin, target);
        document.getElementById('context-menu')?.remove();
    }
    else if (button.id === 'prop-crossing' || button.id === 'prop-maxcross') {
        let type = button.id.split('-')[1];
        let sat = document.getElementById('context-menu').sat;
        if (type === 'crossing') {
            findCrossTrackTime(sat, 0)
        }
        document.getElementById('context-menu')?.remove();
    }
    else if (button.id === 'prop-apogee' || button.id === 'prop-perigee') {
        let sat = document.getElementById('context-menu').sat;
        rHcw = [mainWindow.satellites[sat].curPos.r, mainWindow.satellites[sat].curPos.i, mainWindow.satellites[sat].curPos.c]
        drHcw = [mainWindow.satellites[sat].curPos.rd, mainWindow.satellites[sat].curPos.id, mainWindow.satellites[sat].curPos.cd]
        let eciCoor = Ric2Eci(rHcw, drHcw)
        let coes = PosVel2CoeNew(eciCoor.rEcci, eciCoor.drEci);
        if (coes.e < 1e-4) {
            showScreenAlert('Error: Orbit Near Circular');
            return;
        }
        let mm = (398600.4418 / coes.a ** 3) ** (1/2)
        if (button.id === 'prop-apogee') {
            if (coes.tA > Math.PI) coes.tA -= 2*Math.PI;
            mainWindow.desired.scenarioTime += (Math.PI - coes.tA) / mm;
        }
        else {
            mainWindow.desired.scenarioTime += (2 * Math.PI - coes.tA) / mm;
        }
        document.getElementById('time-slider-range').value = mainWindow.desired.scenarioTime;
        document.getElementById('context-menu')?.remove();
    }
    else if (button.id === 'prop-poca' || button.id === 'prop-maxsun') {
        let newInnerHTML = `
            <div class="context-item">Prop to ${button.id === 'prop-poca' ? 'POCA' : 'Best Sun'}</div>
        `;
        let sat = document.getElementById('context-menu').sat;
        for (let ii = 0; ii < mainWindow.satellites.length; ii++) {
            if (sat === ii) continue;
            newInnerHTML += `<div class="context-item"  onclick="handleContextClick(this)" sat="${ii}" id="${button.id}-execute">${mainWindow.satellites[ii].name}</div>`
        }
        button.parentElement.innerHTML = newInnerHTML;
    }
    else if (button.id === 'prop-radial' || button.id === 'prop-in-track') {
        let newInnerHTML = `
            <div class="context-item" ><input type="Number" placeholder="0" style="width: 3em; font-size: 1em"> km</div>
            <div class="context-item" onclick="handleContextClick(this)" onkeydown="handleContextClick(this)" target="origin" id="execute-${button.id === 'prop-radial' ? 'r' : 'i'}" tabindex="0">Prop to ${button.id === 'prop-radial' ? 'R' : 'I'}</div>
        `;
        button.parentElement.innerHTML = newInnerHTML;
        document.getElementsByClassName('context-item')[0].getElementsByTagName('input')[0].focus();
    }
    else if (button.id === 'prop-range') {
        let newInnerHTML = `
            <div class="context-item" ><input type="Number" placeholder="0" style="width: 3em; font-size: 1em"> km</div>
        `;
        let sat = document.getElementById('context-menu').sat
        for (let ii = 0; ii < mainWindow.satellites.length; ii++) {
            if (sat === ii) continue;
            newInnerHTML += `<div class="context-item"  onclick="handleContextClick(this)" sat="${ii}" id="${button.id}-execute">${mainWindow.satellites[ii].name}</div>`
        }
        button.parentElement.innerHTML = newInnerHTML;
        document.getElementsByClassName('context-item')[0].getElementsByTagName('input')[0].focus();
    }
    else if (button.id === 'prop-cats') {
        let newInnerHTML = `
            <div class="context-item" ><input type="Number" placeholder="90" style="width: 3em; font-size: 1em"> deg</div>
        `;
        let sat = document.getElementById('context-menu').sat
        for (let ii = 0; ii < mainWindow.satellites.length; ii++) {
            if (sat === ii) continue;
            newInnerHTML += `<div class="context-item"  onclick="handleContextClick(this)" sat="${ii}" id="${button.id}-execute">${mainWindow.satellites[ii].name}</div>`
        }
        button.parentElement.innerHTML = newInnerHTML;
        document.getElementsByClassName('context-item')[0].getElementsByTagName('input')[0].focus();
    }
    else if (button.id === 'execute-r' || button.id === 'execute-i') {
        let target = Number(button.parentElement.getElementsByTagName('input')[0].value)
        let sat = document.getElementById('context-menu').sat
        if (button.id === 'execute-r') {
            findRadialTime(sat, target)
        }
        else {
            findInTrackTime(sat, target)
        }
        document.getElementById('context-menu')?.remove();
    }
    else if (button.id === 'prop-range-execute') {
        let target = Number(button.parentElement.getElementsByTagName('input')[0].value)
        let sat = document.getElementById('context-menu').sat
        let satTarget = button.getAttribute('sat')
        console.log(satTarget);
        findRangeTime(sat, satTarget, target)
        document.getElementById('context-menu')?.remove();
    }
    else if (button.id === 'prop-cats-execute') {
        button.parentElement.getElementsByTagName('input')[0].value = button.parentElement.getElementsByTagName('input')[0].value === '' ? button.parentElement.getElementsByTagName('input')[0].placeholder : button.parentElement.getElementsByTagName('input')[0].value
        let target = Number(button.parentElement.getElementsByTagName('input')[0].value)
        let sat = document.getElementById('context-menu').sat
        let satTarget = button.getAttribute('sat')
        console.log(sat, satTarget, target);
        findCatsTime(sat, satTarget, target)
        document.getElementById('context-menu')?.remove();
    }
    else if (button.id === 'prop-poca-execute') {
        let sat1 = button.getAttribute('sat'), sat2 = document.getElementById('context-menu').sat;
        let data = getRelativeData(button.getAttribute('sat'),document.getElementById('context-menu').sat);
        let tGuess = data.toca + 600;
        data = data.toca;
        for (let ii = 0; ii < 200; ii++) {
            let pos1 = mainWindow.satellites[sat1].currentPosition({time: tGuess})
            let pos2 = mainWindow.satellites[sat2].currentPosition({time: tGuess})
            let dr = math.subtract(pos1.slice(0,3), pos2.slice(0,3))
            let dv = math.subtract(pos1.slice(3,6), pos2.slice(3,6))
            let rr1 = math.dot(dr,dv) / math.norm(dr)
            pos1 = mainWindow.satellites[sat1].currentPosition({time: tGuess + 0.001})
            pos2 = mainWindow.satellites[sat2].currentPosition({time: tGuess + 0.001})
            dr = math.subtract(pos1.slice(0,3), pos2.slice(0,3))
            dv = math.subtract(pos1.slice(3,6), pos2.slice(3,6))
            let rr2 = math.dot(dr,dv) / math.norm(dr)
            dr = (rr2 - rr1) / 0.001
            tGuess -= 0.05 * rr1 / dr
            tGuess = tGuess < 0 ? 0 : tGuess
            if (math.abs(rr1) < 1e-8) break

        }
        mainWindow.desired.scenarioTime = tGuess
        document.getElementById('time-slider-range').value = mainWindow.desired.scenarioTime;
        document.getElementById('context-menu')?.remove();
    }
    else if (button.id === 'waypoint-maneuver') {
        let sat = button.parentElement.sat;
        let html = `
            <div class="context-item" >TOF: <input placeholder="2" type="Number" style="width: 3em; font-size: 1em"> hrs</div>
            <div class="context-item" >Target: (<input placeholder="0" type="Number" style="width: 3em; font-size: 1em">, <input placeholder="0" type="Number" style="width: 3em; font-size: 1em">, <input placeholder="0" type="Number" style="width: 3em; font-size: 1em">) km</div>
            <div class="context-item" onclick="handleContextClick(this)" onkeydown="handleContextClick(this)" target="origin" id="execute-waypoint" tabindex="0">RIC Origin</div>
        `
        for (let ii = 0; ii < mainWindow.satellites.length; ii++) {
            if (sat === ii) continue
            html += `<div class="context-item" onclick="handleContextClick(this)" onkeydown="handleContextClick(this)" target="${ii}" id="execute-waypoint" tabindex="0">${mainWindow.satellites[ii].name}</div>`
        
        }
        button.parentElement.innerHTML = html
        document.getElementsByClassName('context-item')[0].getElementsByTagName('input')[0].focus();
    }
    else if (button.id === 'rmoes-maneuver') {
        let html = `
            <div class="context-item" >TOF: <input placeholder="5" type="Number" style="width: 3em; font-size: 1em"> hrs</div>
            <div class="context-item" >A<sub>e</sub>: <input placeholder="20" type="Number" style="width: 3em; font-size: 1em"> km</div>
            <div class="context-item" >Drift: <input placeholder="0" type="Number" style="width: 3em; font-size: 1em"> deg/rev</div>
            <div class="context-item" >Rel Long: <input placeholder="0" type="Number" style="width: 3em; font-size: 1em"> deg</div>
            <div class="context-item" >In-Plane Phase: <input placeholder="0" type="Number" style="width: 3em; font-size: 1em"> deg</div>
            <div class="context-item" >Out-of-Plane: <input placeholder="0" type="Number" style="width: 3em; font-size: 1em"> deg</div>
            <div class="context-item" >Out-of-Plane Phase: <input placeholder="0" type="Number" style="width: 3em; font-size: 1em"> deg</div>
            <div class="context-item" onclick="handleContextClick(this)" onkeydown="handleContextClick(this)" target="origin" id="execute-rmoes" tabindex="0">RIC Origin</div>
        `
        button.parentElement.innerHTML = html
        document.getElementsByClassName('context-item')[0].getElementsByTagName('input')[0].focus();
    }
    else if (button.id === 'change-origin') {
        let html = ``
        for (let ii = 0; ii < mainWindow.satellites.length; ii++) {
            html += `<div class="context-item" onclick="handleContextClick(this)" onkeydown="handleContextClick(this)" target="${ii}" id="execute-change-origin" tabindex="0">${mainWindow.satellites[ii].name}</div>`
        
        }
        button.parentElement.innerHTML = html
    }
    else if (button.id === 'execute-change-origin') {
        let sat = button.getAttribute('target')
        changeOrigin(sat)
    }
    else if (button.id === 'multi-maneuver') {
        let sat = button.parentElement.sat;
        let html = `
            <div class="context-item" >TOF: <input placeholder="6" type="Number" style="width: 3em; font-size: 1em"> hrs</div>
            <div class="context-item" >Target P: (<input placeholder="0" type="Number" style="width: 3em; font-size: 1em">, <input placeholder="0" type="Number" style="width: 3em; font-size: 1em">, <input placeholder="0" type="Number" style="width: 3em; font-size: 1em">) km</div>
            <div class="context-item" >Target V: (<input placeholder="0" type="Number" style="width: 3em; font-size: 1em">, <input placeholder="0" type="Number" style="width: 3em; font-size: 1em">, <input placeholder="0" type="Number" style="width: 3em; font-size: 1em">) m/s</div>
            <div title="Higher the number, more optimizer will try and make all burns the same magnitude" class="context-item" >Burn Uniformity: <input placeholder="2" type="Number" style="width: 3em; font-size: 1em"></div>
            <div title="Higher the number, more optimizer will stack larger burns at beginning" class="context-item" >Burn Relative Size: <input placeholder="0" type="Number" style="width: 3em; font-size: 1em"></div>
            <div class="context-item" >N Burns: <input placeholder="4" type="Number" style="width: 3em; font-size: 1em"></div>
            <div class="context-item" onclick="handleContextClick(this)" onkeydown="handleContextClick(this)" target="origin" id="execute-multi" tabindex="0">RIC Origin</div>
        `
        for (let ii = 0; ii < mainWindow.satellites.length; ii++) {
            if (sat === ii) continue
            html += `<div class="context-item" onclick="handleContextClick(this)" onkeydown="handleContextClick(this)" target="${ii}" id="execute-multi" tabindex="0">${mainWindow.satellites[ii].name}</div>`
        }
        button.parentElement.innerHTML = html
        document.getElementsByClassName('context-item')[0].getElementsByTagName('input')[0].focus();
    }
    else if (button.id === 'execute-multi') {
        let target = button.getAttribute('target')
        let inputs = button.parentElement.getElementsByTagName('input');
        for (let ii = 0; ii < inputs.length; ii++) inputs[ii].value = inputs[ii].value === '' ? inputs[ii].placeholder : inputs[ii].value
        let sat = button.parentElement.sat;
        let startPoint = math.squeeze(Object.values(mainWindow.satellites[sat].curPos))
        let origin = target === 'origin' ? {r: [0], i: [0], c: [0], rd: [0], id: [0], cd: [0]} : mainWindow.satellites[target].currentPosition({
            time: mainWindow.desired.scenarioTime + Number(inputs[0].value) * 3600
        })
        origin = math.squeeze(Object.values(origin));
        let targetPoint = []
        for (let index = 1; index < 7; index++) targetPoint.push((index > 3 ? 0.001 : 1) * Number(inputs[index].value))
        origin = math.add(origin, targetPoint)
        console.log(startPoint);
        setTimeout(optimizeMultiBurn(Number(inputs[9].value), startPoint, origin, Number(inputs[0].value) * 3600, {
            sat, uniformity: Number(inputs[7].value), bias: Number(inputs[8].value), logId: document.getElementById('it-count')
        }), 100)
        document.getElementById('time-slider-range').value = mainWindow.desired.scenarioTime
        document.getElementById('context-menu')?.remove();
    }
    else if (button.id === 'execute-drift') {
        let sat = button.parentElement.sat;
        
        pastActions.push({
            sat,
            oldBurns: JSON.parse(JSON.stringify(mainWindow.satellites[sat].burns)),
            time: mainWindow.desired.scenarioTime
        })
        let inputs = button.parentElement.getElementsByTagName('input');
        let desiredDriftRate = Number(inputs[0].value === '' ? inputs[0].placeholder : inputs[0].value)
        let curEciPosition = Object.values(getCurrentInertial(sat))
        let rVec = curEciPosition.slice(0,3).map(s => s / math.norm(curEciPosition.slice(0,3)))
        let cVec = math.cross(curEciPosition.slice(0,3), curEciPosition.slice(3))
        cVec = cVec.map(s => s/math.norm(cVec))
        let iVec = math.cross(cVec, rVec)
        let ricVelocity = [math.dot(rVec, curEciPosition.slice(3)), math.dot(iVec, curEciPosition.slice(3)), math.dot(cVec, curEciPosition.slice(3))]
        let desiredMeanMotion = (398600.4418 / mainWindow.originOrbit.a**3)**(0.5) * (360+desiredDriftRate)/360
        let desiredSemiMajorAxis = (398600.4418/(desiredMeanMotion** 2))**(1/3)
        let desiredEpsilon = -398600.4418/desiredSemiMajorAxis/2
        let r = math.norm(curEciPosition.slice(0,3))
        let desiredVelocitySquared = (desiredEpsilon + 398600.4418/r)*2
        let desiredInTrack = (desiredVelocitySquared-ricVelocity[0]**2-ricVelocity[2]**2)**(0.5)
        let inTrackBurn = desiredInTrack - ricVelocity[1]
        mainWindow.satellites[sat].burns = mainWindow.satellites[sat].burns.filter(burn => {
            return burn.time < mainWindow.scenarioTime;
        })
        insertDirectionBurn(sat, mainWindow.desired.scenarioTime, [0,inTrackBurn,0])
        mainWindow.satellites[sat].calcTraj(true);
        document.getElementById('context-menu')?.remove();
    }
    else if (button.id === 'change-burn') {
        let sat = button.getAttribute('sat')
        let burn = button.getAttribute('burn')
        let burnDirection = button.getAttribute('dir').split('_').map(s => Number(s))
        let burnAngles = [math.atan2(burnDirection[1], burnDirection[0]) * 180 / Math.PI, math.atan2(burnDirection[2], math.norm(burnDirection.slice(0,2))) * 180 / Math.PI, math.norm(burnDirection)]
        let type = button.getAttribute('type')
        if (button.getAttribute('type') === 'direction') {
            button.parentElement.innerHTML = `
                <div class="context-item" >R: <input placeholder="${burnDirection[0].toFixed(4)}" type="Number" style="width: 5em; font-size: 1em"> m/s</div>
                <div class="context-item" >I: <input placeholder="${burnDirection[1].toFixed(4)}" type="Number" style="width: 5em; font-size: 1em"> m/s</div>
                <div class="context-item" >C: <input placeholder="${burnDirection[2].toFixed(4)}" type="Number" style="width: 5em; font-size: 1em"> m/s</div>
                <div class="context-item" type="${type}" sat="${sat}" burn="${burn}" onkeydown="handleContextClick(this)" onclick="handleContextClick(this)" id="execute-change-burn" tabindex="0">Change</div>
            `
        }
        else if (button.getAttribute('type') === 'waypoint') {
            let wayTarget = button.getAttribute('way').split('_').map(s => Number(s))
            let burnTT = mainWindow.satellites[sat].burns[burn].waypoint.tranTime / 3600
            button.parentElement.innerHTML = `
                <div class="context-item" >R: <input placeholder="${wayTarget[0].toFixed(4)}" type="Number" style="width: 5em; font-size: 1em"> km</div>
                <div class="context-item" >I: <input placeholder="${wayTarget[1].toFixed(4)}" type="Number" style="width: 5em; font-size: 1em"> km</div>
                <div class="context-item" >C: <input placeholder="${wayTarget[2].toFixed(4)}" type="Number" style="width: 5em; font-size: 1em"> km</div>
                <div class="context-item" >TT: <input placeholder="${burnTT.toFixed(4)}" type="Number" style="width: 5em; font-size: 1em"> hrs</div>
                <div class="context-item" type="${type}" sat="${sat}" burn="${burn}" onkeydown="handleContextClick(this)" onclick="handleContextClick(this)" id="execute-change-burn" tabindex="0">Change</div>
            `
        }
        else if (button.getAttribute('type') === 'angle') {
            button.parentElement.innerHTML = `
                <div class="context-item" >Az: <input placeholder="${burnAngles[0].toFixed(4)}" type="Number" style="width: 5em; font-size: 1em"><sup>o</sup></div>
                <div class="context-item" >El: <input placeholder="${burnAngles[1].toFixed(4)}" type="Number" style="width: 5em; font-size: 1em"><sup>o</sup></div>
                <div class="context-item" >Mag: <input placeholder="${burnAngles[2].toFixed(4)}" type="Number" style="width: 5em; font-size: 1em"> m/s</div>
                <div class="context-item" type="${type}" sat="${sat}" burn="${burn}" onkeydown="handleContextClick(this)" onclick="handleContextClick(this)" id="execute-change-burn" tabindex="0">Change</div>
            `
        }
        document.getElementsByClassName('context-item')[0].getElementsByTagName('input')[0].focus();
    }
    else if (button.id === 'direction-maneuver' || button.id === 'az-el-maneuver') {
        button.parentElement.innerHTML = `
            <div class="context-item" >${button.id === 'direction-maneuver' ? 'R' : 'Az'}: <input placeholder="0" type="Number" style="width: 3em; font-size: 1em"> ${button.id === 'direction-maneuver' ? 'm/s' : 'deg'}</div>
            <div class="context-item" >${button.id === 'direction-maneuver' ? 'I' : 'El'}: <input placeholder="0" type="Number" style="width: 3em; font-size: 1em"> ${button.id === 'direction-maneuver' ? 'm/s' : 'deg'}</div>
            <div class="context-item" >${button.id === 'direction-maneuver' ? 'C' : 'Mag'}: <input placeholder="0" type="Number" style="width: 3em; font-size: 1em"> m/s</div>
            <div class="context-item" onkeydown="handleContextClick(this)" onclick="handleContextClick(this)" id="execute-${button.id === 'direction-maneuver' ? 'direction' : 'az-el'}" tabindex="0">Execute</div>
        `
        document.getElementsByClassName('context-item')[0].getElementsByTagName('input')[0].focus();
    }
    else if (button.id === 'execute-change-burn') {
        let sat = button.getAttribute('sat')
        let burn = button.getAttribute('burn')
        let type = button.getAttribute('type')
        
        pastActions.push({
            sat,
            oldBurns: JSON.parse(JSON.stringify(mainWindow.satellites[sat].burns))
        })
        let inputs = button.parentElement.getElementsByTagName('input');
        for (let ii = 0; ii < inputs.length; ii++) {
            inputs[ii].value = inputs[ii].value === '' ? Number(inputs[ii].placeholder) : inputs[ii].value
        }
        let dir, rot
        switch (type) {
            case 'direction':
                dir = [Number(inputs[0].value) / 1000, Number(inputs[1].value) / 1000, Number(inputs[2].value) / 1000];
                mainWindow.satellites[sat].burns[burn].direction = dir
                mainWindow.satellites[sat].burns[burn].waypoint = false
                if (mainWindow.hpop) {
                    displayHpopTraj(true)
                    break
                }
                mainWindow.satellites[sat].calcTraj(true)
                break
            case 'waypoint':
                let way = [Number(inputs[0].value), Number(inputs[1].value), Number(inputs[2].value)];
                let tranTime = Number(inputs[3].value) * 3600
                let targetOriginEci = propToTimeAnalytic(mainWindow.originOrbit, mainWindow.satellites[sat].burns[burn].time + tranTime)
                way = Ric2Eci(way, [0,0,0], targetOriginEci.slice(0,3), targetOriginEci.slice(3,6)).rEcci
                mainWindow.satellites[sat].burns[burn].waypoint = {
                    target: way,
                    tranTime
                }
                mainWindow.satellites[sat].calcTraj(true)
                mainWindow.desired.scenarioTime = tranTime + mainWindow.satellites[sat].burns[burn].time
                mainWindow.scenarioTime = tranTime + mainWindow.satellites[sat].burns[burn].time
                document.getElementById('time-slider-range').value = mainWindow.desired.scenarioTime;   
                break
            case 'angle':
                dir = [Number(inputs[0].value) * Math.PI / 180, Number(inputs[1].value) * Math.PI / 180, Number(inputs[2].value) / 1000];
                dir = [dir[2] * math.cos(dir[0]) * Math.cos(dir[1]), dir[2] * math.sin(dir[0]) * Math.cos(dir[1]), dir[2] * math.sin(dir[1])]
                mainWindow.satellites[sat].burns[burn].direction = dir
                mainWindow.satellites[sat].burns[burn].waypoint = false
                if (mainWindow.hpop) {
                    displayHpopTraj(true)
                    break
                }
                mainWindow.satellites[sat].calcTraj(true)
                break
        }
        document.getElementById('context-menu')?.remove();
    }
    else if (button.id === 'dsk-maneuver') {
        button.parentElement.innerHTML = `
            <div class="context-item" >Time: <input value="3" type="Number" style="width: 3em; font-size: 1em"> hrs</div>
            <div class="context-item" onkeydown="handleContextClick(this)" onclick="handleContextClick(this)" id="execute-dsk" tabindex="0">Execute</div>
        `
        document.getElementsByClassName('context-item')[0].getElementsByTagName('input')[0].focus();
    }
    else if (button.id === 'execute-waypoint') {
        let target = button.getAttribute('target')
        let inputs = button.parentElement.getElementsByTagName('input');
        for (let ii = 0; ii < inputs.length; ii++) {
            if ((ii === 0 && inputs[ii].value !== '' && inputs[ii].value < 0.25)) {
                inputs[ii].style.backgroundColor = 'rgb(255,150,150)'
                return
            }
            else inputs[ii].style.backgroundColor = 'white'
            if (ii === 0 && inputs[ii].value === '') inputs[ii].value = 2
            if (ii > 0 && inputs[ii].value === '') inputs[ii].value = 0
        }
        let sat = button.parentElement.sat;
        mainWindow.satellites[sat].burns = mainWindow.satellites[sat].burns.filter(burn => {
            return burn.time < mainWindow.scenarioTime;
        })
        let waypoint
        if (target === 'origin') {
            waypoint = {r: Number(inputs[1].value), i: Number(inputs[2].value), c: Number(inputs[3].value)}
        }
        else {
            let targetEci = Object.values(getCurrentInertial(target, mainWindow.scenarioTime + 3600*Number(inputs[0].value)))
            let eciWaypoint = Ric2Eci(Object.values({r: Number(inputs[1].value), i: Number(inputs[2].value), c: Number(inputs[3].value)}), [0,0,0],targetEci.slice(0,3), targetEci.slice(3,6)).rEcci
            let originEci = propToTimeAnalytic(mainWindow.originOrbit, mainWindow.scenarioTime + 3600*Number(inputs[0].value))
            waypoint = ConvEciToRic(originEci, [...eciWaypoint,0,0,0]).slice(0,3)
        }
        insertWaypointBurn(sat, mainWindow.desired.scenarioTime, Object.values(waypoint), 3600*Number(inputs[0].value))
        document.getElementById('context-menu')?.remove();
    }
    else if (button.id === 'execute-rmoes') {
        let inputs = button.parentElement.getElementsByTagName('input');
        for (let ii = 0; ii < inputs.length; ii++) {
            if ((ii === 0 && inputs[ii].value !== '' && inputs[ii].value < 0.25)) {
                inputs[ii].style.backgroundColor = 'rgb(255,150,150)'
                return
            }
            else inputs[ii].style.backgroundColor = 'white'
            if (inputs[ii].value === '') inputs[ii].value = inputs[ii].placeholder
        }
        let sat = button.parentElement.sat;
        mainWindow.satellites[sat].burns = mainWindow.satellites[sat].burns.filter(burn => {
            return burn.time < mainWindow.scenarioTime;
        })
        let rmoes = {
            tof: Number(inputs[0].value) * 3600,
            ae: Number(inputs[1].value), 
            x: Number(inputs[2].value), 
            y: Number(inputs[3].value), 
            b: Number(inputs[4].value), 
            z: Number(inputs[5].value), 
            m: Number(inputs[6].value)
        }
        satTargetRmoes(sat, rmoes)
        document.getElementById('context-menu')?.remove();
    }
    else if (button.id === 'execute-direction' || button.id === 'execute-az-el') {
        let inputs = button.parentElement.getElementsByTagName('input');
        for (let ii = 0; ii < inputs.length; ii++) {
            if (inputs[ii].value === '') {
                inputs[ii].value = inputs[ii].placeholder;
            }
        }
        let sat = button.parentElement.sat;
        let dir = [Number(inputs[0].value) / 1000, Number(inputs[1].value) / 1000, Number(inputs[2].value) / 1000];
        if (button.id === 'execute-az-el') {
            dir = [
                Math.cos(Number(inputs[0].value) * Math.PI / 180) * Math.cos(Number(inputs[1].value) * Math.PI / 180) * Number(inputs[2].value),
                Math.sin(Number(inputs[0].value) * Math.PI / 180) * Math.cos(Number(inputs[1].value) * Math.PI / 180) * Number(inputs[2].value),
                Math.sin(Number(inputs[1].value) * Math.PI / 180) * Number(inputs[2].value)
            ].map(s => s/1000)
        }
        insertDirectionBurn(sat, mainWindow.scenarioTime, dir)
        document.getElementById('context-menu')?.remove();
    }
    else if (button.id === 'execute-dsk') {
        let inputs = button.parentElement.getElementsByTagName('input');
        if (inputs[0].value === '') {
            inputs[0].style.backgroundColor = 'rgb(255,150,150)';
            return;
        }
        let sat = button.parentElement.sat;
        mainWindow.satellites[sat].burns = mainWindow.satellites[sat].burns.filter(burn => {
            return burn.time < mainWindow.scenarioTime;
        })
        let curPos = mainWindow.satellites[sat].curPos;
        insertWaypointBurn(sat, mainWindow.desired.scenarioTime, [curPos.r, curPos.i, curPos.c], Number(inputs[0].value) * 3600)
        
        document.getElementById('context-menu')?.remove();
    }
    else if (button.id === 'sun-maneuver') {
        let innerString = '';
        for (let ii = 0; ii < mainWindow.satellites.length; ii++) {
            if (ii === button.parentElement.sat) continue;
            innerString += `<div onclick="handleContextClick(this)" class="context-item" id="execute-sun" sat="${ii}">${mainWindow.satellites[ii].name}</div>`
        }
        innerString += `<div class="context-item" >Distance: <input type="Number" style="width: 3em; font-size: 1em"> km</div>`;
        innerString += `<div class="context-item" >CATS: <input type="Number" style="width: 3em; font-size: 1em"> deg</div>`;
        innerString += `<div class="context-item" >TOF: <input type="Number" style="width: 3em; font-size: 1em"> hrs</div>`;

        button.parentElement.innerHTML = innerString;
        let cm = document.getElementById('context-menu')
        let elHeight = cm.offsetHeight
        let elTop =  Number(cm.style.top.split('p')[0])
        cm.style.top = (window.innerHeight - elHeight) < elTop ? (window.innerHeight - elHeight) + 'px' : cm.style.top
    
    }
    else if (button.id === 'execute-sun') {
        let inputs = button.parentElement.getElementsByTagName('input');
        if (inputs[0].value < 0 || inputs[0].value === '') {
            inputs[0].style.backgroundColor = 'rgb(255,150,150)';
            return;
        }
        if (inputs[1].value < 0 || inputs[1].value === '') {
            inputs[1].style.backgroundColor = 'rgb(255,150,150)';
            return;
        }
        let tof = Number(inputs[2].value) * 3600;
        let range = Number(inputs[0].value);
        let cats = Number(inputs[1].value);
        let targetSat = button.getAttribute('sat');
        let chaserSat = button.parentElement.sat;
        mainWindow.satellites[chaserSat].burns = mainWindow.satellites[chaserSat].burns.filter(burn => {
            return burn.time < mainWindow.scenarioTime;
        })
        let origin = mainWindow.satellites[chaserSat].currentPosition();
        let target = mainWindow.satellites[targetSat].currentPosition({time: mainWindow.desired.scenarioTime + tof});
        let opt_function = function(x, returnWaypoint = false) {
            let r = x[0]
            let cats = x[1]
            let angle = x[2]
            let tof = x[3]

            let circleR = r * Math.sin(cats);
            let reducedR = r * Math.cos(cats);
            let R = findRotationMatrix([1,0,0], mainWindow.getCurrentSun(mainWindow.scenarioTime + tof));
            // R = [[1,0,0],[0,1,0],[0,0,1]];
            let tempAngle = [reducedR, Math.cos(angle) * circleR, Math.sin(angle) * circleR]
            let waypoint = math.transpose(math.multiply(R, math.transpose(tempAngle)))
            let newTarget = {
                r: Number(target[0]) + waypoint[0],
                i: Number(target[1]) + waypoint[1],
                c: Number(target[2]) + waypoint[2]
            }
            if (returnWaypoint) return newTarget
            let dV = findDvFiniteBurn(origin, newTarget, mainWindow.satellites[chaserSat].a, tof);
            return dV
        }
        let sunPso = new pso({
            upper_bounds: [range, cats * Math.PI / 180, 2 * Math.PI, tof],
            lower_bounds: [range, 0, -2 * Math.PI, tof],
            n_part: 20,
            opt_fuction: opt_function
        })
        
        for (ii = 0; ii < 10; ii++) {
            sunPso.step()
            console.log(sunPso.bestGlobabValue);
        }
        console.log(sunPso.particles.map(part => part.position[1] * 180 / Math.PI));
        target = opt_function(sunPso.bestGlobalPosition, true)
        insertWaypointBurn(chaserSat, mainWindow.desired.scenarioTime, Object.values(target), tof)
        document.getElementById('time-slider-range').value = tof;
        document.getElementById('context-menu')?.remove();
    }
}

function translateFrames(sat = 0, options={}) {
    let {time = mainWindow.desired.scenarioTime} = options
    let ricPos = mainWindow.satellites[sat].currentPosition({time})
    ricPos = math.squeeze([ricPos.r, ricPos.i, ricPos.c, ricPos.rd, ricPos.id, ricPos.cd])
    let inert = Object.values(Coe2PosVelObject(mainWindow.originOrbit))
    let eciPos = Ric2Eci(ricPos.slice(0,3), ricPos.slice(3,6), inert.slice(0,3), inert.slice(3,6))
    let h = math.cross(eciPos.rEcci, eciPos.drEci);
    let ricX = math.dotDivide(eciPos.rEcci, math.norm(eciPos.rEcci));
    let ricZ = math.dotDivide(h, math.norm(h));
    let ricY = math.cross(ricZ, ricX);
    let satFrame = [
        ricX, ricY, ricZ
    ]
    h = math.cross(inert.slice(0,3), inert.slice(3,6));
    ricX = math.dotDivide(inert.slice(0,3), math.norm(inert.slice(0,3)));
    ricZ = math.dotDivide(h, math.norm(h));
    ricY = math.cross(ricZ, ricX);
    let inertFrame = [
        ricX, ricY, ricZ
    ]
    return [
        [math.dot(satFrame[0], inertFrame[0]), math.dot(satFrame[0], inertFrame[1]), math.dot(satFrame[0], inertFrame[2])],
        [math.dot(satFrame[1], inertFrame[0]), math.dot(satFrame[1], inertFrame[1]), math.dot(satFrame[1], inertFrame[2])],
        [math.dot(satFrame[2], inertFrame[0]), math.dot(satFrame[2], inertFrame[1]), math.dot(satFrame[2], inertFrame[2])]
    ]

    
}

function plotRelativeData() {
    // console.log(mainWindow.satellites[mainWindow.plotSettings.origin]);
    if (math.squeeze(Object.values(mainWindow.satellites[mainWindow.plotSettings.target].stateHistory[0])) === undefined || math.squeeze(Object.values(mainWindow.satellites[mainWindow.plotSettings.origin].stateHistory[0])) === undefined) return
    let newData = []
    try {
        for (let ii = 0; ii < 200; ii++ ) {
            let time = ii / 200 * mainWindow.scenarioLength * 3600
            let targetState = math.squeeze(Object.values(mainWindow.satellites[mainWindow.plotSettings.target].currentPosition({time})))
            let originState = math.squeeze(Object.values(mainWindow.satellites[mainWindow.plotSettings.origin].currentPosition({time})))
            switch (mainWindow.plotSettings.type) {
                case 'Range':
                    newData.push([time / 3600, math.norm(math.subtract(targetState, originState))])
                    break
                case 'CATS':
                    let relVec = math.subtract(targetState, originState)
                    let sunVec = mainWindow.getCurrentSun(s.t)
                    newData.push([time, math.acos(math.dot(relVec, sunVec) / math.norm(relVec) / math.norm(sunVec))])
                    break
            }
        }
    } catch (error) {
        return console.log(error);
    }
    mainWindow.plotSettings.data = newData
    mainWindow.setState('ri plot');
    mainWindow.setFrameCenter({
        ri: {
            x: 0.5, y: 0.75, w: 1, h: 0.5
        },
        rc: {
            x: 0.25, y: 0.5, w:0, h: 0
        },
        ci: {
            x: 0.75, y: 0.5, w: 0, h: 0
        },
        plot: {
            x: 0.5, y: 0.25, w: 1, h: 0.5
        }
    })
}

function showScreenAlert(message = 'test alert', textSize = 1, bottom = '80%', delay = 3000) {
    
    let currentAlerts = document.querySelectorAll('.screen-alert')
    for (let index = 0; index < currentAlerts.length; index++) {
        currentAlerts[index].remove()
    }
    let alertMessage = document.createElement('div');
    alertMessage.classList.add('screen-alert');
    alertMessage.style.fontSize = textSize+'em'
    if (message === 'start-screen') {
        alertMessage.innerHTML = `
            Options to get started
            <div style="display: inline; color: black; width: 60%;"><label class="panel-button hoverable noselect" for="upload-options-button">Import .SAS File</div><input onchange="uploadScenario(event)" style="display: none;" id="upload-options-button" type="file" accept=".sas"></div>
            <div onclick="openPanel(this)" id="add-satellite" style="color: black; width: 60%; display: inline" class="panel-button hoverable noselect" >Add New Satellite</div>
        `
    }
    else {
        alertMessage.innerText = message;
    }
    document.getElementsByTagName('body')[0].appendChild(alertMessage);
    setTimeout(() => {
        document.getElementsByClassName('screen-alert')[0].style.bottom = message === 'start-screen' ? '60%' : bottom;
    },50)
    setTimeout(() => {
        try {
            document.getElementsByClassName('screen-alert')[0].style.bottom = '100%';
            document.getElementsByClassName('screen-alert')[0].style.opacity = '0';
            setTimeout(() => {
                document.getElementsByClassName('screen-alert')[0].remove();
            }, 500)
        } catch (error) {
            
        }
    },message === 'start-screen' ? 60000 : delay)

}

changePlanType = (box) => mainWindow.burnType = box.checked ? 'waypoint' : 'manual';
let lastHiddenSatClicked = false
document.getElementById('main-plot').addEventListener('pointerdown', event => {
    event.preventDefault()
    // If in ground track mode, don't track with clicked mouse
    if (event.button !== 0) return startContextClick(event)
    // Check if clicked on time
    if (event.clientX < 450 && (mainWindow.getHeight() - event.clientY) < (mainWindow.getHeight() * 0.06)) return openTimePrompt()
    if (event.pointerType === 'touch') {
        mainWindow.aciveTouches.push({
            location: [event.clientX, event.clientY],
            id: event.pointerId
        })
        if (document.querySelectorAll('#context-menu').length > 0) return document.getElementById('context-menu')?.remove()
        if (mainWindow.aciveTouches.length === 1) {
            setTimeout(() => {
                if (mainWindow.aciveTouches.length === 1) startContextClick(event)
            }, 50)
            return
        }
        else if (mainWindow.aciveTouches.length > 2) return
    }
    let ricCoor = mainWindow.convertToRic([event.clientX, event.clientY]);
    // event.preventDefault()
    let subList = document.getElementsByClassName('sub-menu');
    for (let ii = 0; ii < subList.length; ii++) subList[ii].remove();
    if (document.querySelectorAll('#context-menu').length > 0) return document.getElementById('context-menu')?.remove()
    
    // if (mainWindow.latLongMode) return
    let sat = 0, check;
    if (ricCoor === undefined) return;
    while (sat < mainWindow.satellites.length && !mainWindow.latLongMode) {
        check = mainWindow.satellites[sat].checkClickProximity(ricCoor);
        if (mainWindow.satellites[sat].locked) {
            sat++
            continue
        }
        mainWindow.currentTarget = false;
        for (frame in check) mainWindow.currentTarget = check[frame] ? {sat, frame, type: 'current'} : mainWindow.currentTarget
        if (mainWindow.currentTarget) {
            let checkExistingBurns = mainWindow.satellites[mainWindow.currentTarget.sat].burns.filter(burn => {
                return Math.abs(burn.time - mainWindow.desired.scenarioTime) < 900;
            })
            if (checkExistingBurns.length === 0) break
        };
        check = mainWindow.satellites[sat].checkBurnProximity(ricCoor);
        for (frame in check) mainWindow.currentTarget = check[frame] !== false ? {sat, frame, type: 'burn'} : mainWindow.currentTarget
        if (mainWindow.currentTarget) break
        sat++
    }
    if (mainWindow.currentTarget.type === 'current' && !mainWindow.latLongMode) {
        if (mainWindow.ephemViewerMode) return
        setTimeout(() => {
            if (!mainWindow.currentTarget) return;
            lastHiddenSatClicked = false
            let defaultTranTime = 2*Math.PI / mainWindow.mm / 12
            let targetStateEci = Object.values(getCurrentInertial(mainWindow.currentTarget.sat, mainWindow.scenarioTime+defaultTranTime))
            let satLocation = mainWindow.satellites[mainWindow.currentTarget.sat].currentPosition({
                time: mainWindow.desired.scenarioTime
            });
            let burnType = mainWindow.originOrbit.a < 5000 ? 'manual' : mainWindow.burnType
            pastActions.push({
                sat: mainWindow.currentTarget.sat,
                oldBurns: JSON.parse(JSON.stringify(mainWindow.satellites[mainWindow.currentTarget.sat].burns)),
                time: mainWindow.desired.scenarioTime
            })
            // Ensure previous burn has finished, otherwise cut previous burn short
            let lastBurn = mainWindow.satellites[mainWindow.currentTarget.sat].burns.filter(b => b.time < mainWindow.desired.scenarioTime)
            let lastBurnIndex = lastBurn.length - 1 
            lastBurn = lastBurn.length > 0 ? lastBurn[lastBurnIndex] : undefined
            if (lastBurn !== undefined) {
                let burnDuration = math.norm(lastBurn.direction) / mainWindow.satellites[mainWindow.currentTarget.sat].a
                let lastBurnEndTime = lastBurn.time + burnDuration
                if (lastBurnEndTime > mainWindow.desired.scenarioTime) {
                    burnDuration = mainWindow.desired.scenarioTime - lastBurn.time - 900
                    let newBurnMag = burnDuration * mainWindow.satellites[mainWindow.currentTarget.sat].a
                    let newBurnDirection = lastBurn.direction.map(s => s *newBurnMag / math.norm(lastBurn.direction))
                    mainWindow.satellites[mainWindow.currentTarget.sat].burns[lastBurnIndex].direction = newBurnDirection
                    mainWindow.satellites[mainWindow.currentTarget.sat].burns[lastBurnIndex].waypoint = false
                    
                    mainWindow.satellites[mainWindow.currentTarget.sat].calcTraj()
                    showScreenAlert('Previous finite burn duration curtailed to ' + (1000*newBurnMag).toFixed(2) + ' m/s')
                }
            }
            mainWindow.satellites[mainWindow.currentTarget.sat].burns.push({
                time: mainWindow.desired.scenarioTime,
                shown: 'during',
                location: Object.values(satLocation).slice(0,3),
                direction: [0,0,0],
                waypoint: burnType === 'direction' ? false : {
                    target: targetStateEci,
                    tranTime: defaultTranTime
                }
            })
            mainWindow.satellites[mainWindow.currentTarget.sat].burns.sort((a, b) => {
                return a.time - b.time;
            })
            mainWindow.burnStatus = {
                type: burnType,
                sat: mainWindow.currentTarget.sat,
                burn: mainWindow.satellites[mainWindow.currentTarget.sat].burns.findIndex(burn => burn.time === mainWindow.desired.scenarioTime),
                frame: Object.keys(check)[0]
            }
            if (burnType === 'waypoint' && mainWindow.satellites[mainWindow.currentTarget.sat].a > 0.000001) mainWindow.changeTime(mainWindow.desired.scenarioTime + defaultTranTime)
        }, 250)
    }
    else if (mainWindow.currentTarget.type === 'burn' && !mainWindow.latLongMode) {
        pastActions.push({
            sat: mainWindow.currentTarget.sat,
            oldBurns: JSON.parse(JSON.stringify(mainWindow.satellites[mainWindow.currentTarget.sat].burns))
        })
        if (event.ctrlKey) {
            mainWindow.satellites[mainWindow.currentTarget.sat].burns.splice(check[mainWindow.currentTarget.frame], 1);
            mainWindow.satellites[mainWindow.currentTarget.sat].genBurns();
            return;
        }
        let burnType = mainWindow.originOrbit.a < 5000 ? 'manual' : mainWindow.burnType
        mainWindow.burnStatus = {
            type: burnType,
            sat: mainWindow.currentTarget.sat,
            burn: check[mainWindow.currentTarget.frame],
            frame: mainWindow.currentTarget.frame
        }
        if (burnType === 'waypoint') {
            if (mainWindow.satellites[mainWindow.burnStatus.sat].burns[mainWindow.burnStatus.burn].waypoint === false) {
                let newTranTime = mainWindow.desired.scenarioTime - mainWindow.satellites[mainWindow.burnStatus.sat].burns[mainWindow.burnStatus.burn].time
                newTranTime = newTranTime < (2*Math.PI / mainWindow.mm) / 12 ? (2*Math.PI / mainWindow.mm) / 12 : newTranTime
                let eciPos = getCurrentInertial(mainWindow.burnStatus.sat)
                mainWindow.satellites[mainWindow.burnStatus.sat].burns[mainWindow.burnStatus.burn].waypoint = {
                    tranTime: newTranTime,
                    target: Object.values(eciPos).slice(0,3)
                }
            }
            mainWindow.changeTime(mainWindow.satellites[mainWindow.burnStatus.sat].burns[mainWindow.burnStatus.burn].time + mainWindow.satellites[mainWindow.burnStatus.sat].burns[mainWindow.burnStatus.burn].waypoint.tranTime)
        }
    }
    else if (mainWindow.latLongMode) {
        let {lat, long} = mainWindow.pixel2LatLong([event.clientX, event.clientY])
        // mainWindow.groundTrackLimits.focus = undefined
        mainWindow.frameMove = {
            x: event.clientX,
            y: event.clientY,
            originLong: mainWindow.groundTrackLimits.center,
            originLat: mainWindow.groundTrackLimits.latCenter,
            pointId: event.pointerId
        };
    }
    else if (ricCoor.ri || ricCoor.ci) {
        try {
            mainWindow.frameMove = {
                x: event.clientX,
                y: event.clientY,
                origin: mainWindow.plotCenter,
                el: elD + 0,
                az: azD + 0,
                pointId: event.pointerId
            };
        } catch (error) {errorList.push(error.stack)}
        return;
    }
})

document.getElementById('main-plot').addEventListener('pointerup', event => {
    setTimeout(() => {
        mainWindow.aciveTouches = mainWindow.aciveTouches.filter(s => s.id !== event.pointerId)
    },250)
    mainWindow.currentTarget = false;
    mainWindow.satellites.forEach(sat => sat.calcTraj());
    mainWindow.burnStatus.type = false;
    mainWindow.frameMove = undefined;
})

document.getElementById('main-plot').addEventListener('pointerleave', () => {
    mainWindow.frameMove = false
    mainWindow.mousePosition = undefined
})

document.getElementById('main-plot').addEventListener('pointermove', event => {
    mainWindow.mousePosition = [event.clientX, event.clientY];
    if (event.clientX < 450 && (mainWindow.getHeight() - event.clientY) < (mainWindow.getHeight() * 0.06)) {
        mainWindow.cnvs.style.cursor = 'pointer'
        return
    }
    else mainWindow.cnvs.style.cursor = ''
    if (mainWindow.frameMove) {
        if (event.pointerId === mainWindow.frameMove.pointId) {
            if (mainWindow.latLongMode) {
                let newLongCenter = mainWindow.frameMove.originLong -( event.clientX - mainWindow.frameMove.x) * 360 / mainWindow.cnvs.width / mainWindow.groundTrackLimits.zoom
                let newLatCenter = mainWindow.frameMove.originLat +( event.clientY - mainWindow.frameMove.y) * 180 / mainWindow.cnvs.height / mainWindow.groundTrackLimits.zoom
                let fixedCenters = mainWindow.fixGroundTrackCenter(newLatCenter, newLongCenter, mainWindow.groundTrackLimits.zoom)
                mainWindow.groundTrackLimits.center = fixedCenters.newLongCenter
                mainWindow.groundTrackLimits.latCenter = fixedCenters.newLatCenter

                // mainWindow.frameMove.long = long
                // If in lat long mode only move center longitude and latitude
                return
            }
            let delX = event.clientX - mainWindow.frameMove.x;
            let delY = event.clientY - mainWindow.frameMove.y;
            if (threeD) {
                elD = mainWindow.frameMove.el + delY * 0.4
                azD = mainWindow.frameMove.az + delX * 0.4
                return
            }
            mainWindow.desired.plotCenter = mainWindow.frameMove.origin + delX * mainWindow.getPlotWidth() / mainWindow.getWidth(); 
            mainWindow.plotCenter = mainWindow.frameMove.origin + delX * mainWindow.getPlotWidth() / mainWindow.getWidth(); 
        }
        if (mainWindow.aciveTouches.length > 1) {
            let oldDist = math.norm(mainWindow.aciveTouches.slice(0,2).map(s => s.location).reduce((c,d) => math.subtract(c,d),math.dotMultiply(2, mainWindow.aciveTouches[0].location)))
            let pointerIdIndex = mainWindow.aciveTouches.findIndex(s => s.id === event.pointerId)
            mainWindow.aciveTouches[pointerIdIndex].location = [event.clientX, event.clientY]
            let newDist = math.norm(mainWindow.aciveTouches.slice(0,2).map(s => s.location).reduce((c,d) => math.subtract(c,d),math.dotMultiply(2, mainWindow.aciveTouches[0].location)))  
            mainWindow.desired.plotWidth *= oldDist / newDist
            mainWindow.plotWidth = mainWindow.desired.plotWidth
        }
    }
})

function moveTrueAnomaly(delta = 0.05) {
    delta *= Math.PI / 180
    let origin = {...mainWindow.originOrbit}
    origin.tA += delta
    mainWindow.updateOrigin(origin)
}

function exportScenario(name = mainWindow.satellites.map(sat => sat.name).join('_') + '.sas') {
    downloadFile(name, JSON.stringify(mainWindow.getData()));
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

function changeSatelliteInputType(el) {
    let satInputs = document.querySelectorAll('.satellite-input')
    let padNumber = function(n) {
        return n < 10 ? '0' + n : n
    }
    let date
    // Disable option to input states as RIC or RMOE's until there is a satellite to reference off of
    document.querySelector('#ric-sat-input').disabled = mainWindow.satellites.length === 0
    document.querySelector('#rmoe-sat-input').disabled = mainWindow.satellites.length === 0
    document.querySelector('#sat-input-info').innerHTML = mainWindow.satellites.length === 0 ? '<em>At least one satellite must exist to import with RIC or RMOE</em>' : ''
    switch (el.id) {
        case 'eci-sat-input':
            date = new Date(mainWindow.startDate)
            let originJ2000 = Coe2PosVelObject(mainWindow.originOrbit)
            date = `${date.getFullYear()}-${padNumber(date.getMonth()+1)}-${padNumber(date.getDate())}T${padNumber(date.getHours())}:${padNumber(date.getMinutes())}:${padNumber(date.getSeconds())}`
            satInputs[0].innerHTML = `Epoch <input class="sat-input" style="width: 20ch;" type="datetime-local" id="start-time" name="meeting-time" value="${date}">`
            satInputs[1].innerHTML = `X <input class="sat-input" style="font-size: 1em; width: 15ch;" type="Number" placeholder="${originJ2000.x.toFixed(2)}"> km</div>`
            satInputs[2].innerHTML = `Y <input class="sat-input" style="font-size: 1em; width: 15ch;" type="Number" placeholder="${originJ2000.y.toFixed(2)}"> km</div>`
            satInputs[3].innerHTML = `Z <input class="sat-input" style="font-size: 1em; width: 15ch;" type="Number" placeholder="${originJ2000.z.toFixed(2)}"> km</div>`
            satInputs[4].innerHTML = `dX <input class="sat-input" style="font-size: 1em; width: 15ch;" type="Number" placeholder="${originJ2000.vx.toFixed(2)}"> km/s</div>`
            satInputs[5].innerHTML = `dY <input class="sat-input" style="font-size: 1em; width: 15ch;" type="Number" placeholder="${originJ2000.vy.toFixed(2)}"> km/s</div>`
            satInputs[6].innerHTML = `dZ <input class="sat-input" style="font-size: 1em; width: 15ch;" type="Number" placeholder="${originJ2000.vz.toFixed(2)}"> km/s</div>`
            break
        case 'coe-sat-input':
            date = new Date(mainWindow.startDate)
            let originCOE = mainWindow.originOrbit
            date = `${date.getFullYear()}-${padNumber(date.getMonth()+1)}-${padNumber(date.getDate())}T${padNumber(date.getHours())}:${padNumber(date.getMinutes())}:${padNumber(date.getSeconds())}`
            satInputs[0].innerHTML = `Epoch <input class="sat-input" style="width: 20ch;" type="datetime-local" id="start-time" name="meeting-time" value="${date}">`
            satInputs[1].innerHTML = `a <input class="sat-input" style="font-size: 1em; width: 15ch;" type="Number" placeholder="${originCOE.a.toFixed(4)}"> km</div>`
            satInputs[2].innerHTML = `e <input class="sat-input" style="font-size: 1em; width: 15ch;" type="Number" placeholder="${originCOE.e.toFixed(4)}"></div>`
            satInputs[3].innerHTML = `i <input class="sat-input" style="font-size: 1em; width: 15ch;" type="Number" placeholder="${(originCOE.i*180/Math.PI).toFixed(4)}"> deg</div>`
            satInputs[4].innerHTML = `&Omega; <input class="sat-input" style="font-size: 1em; width: 15ch;" type="Number" placeholder="${(originCOE.raan*180/Math.PI).toFixed(4)}"> deg</div>`
            satInputs[5].innerHTML = `&omega; <input class="sat-input" style="font-size: 1em; width: 15ch;" type="Number" placeholder="${(originCOE.arg*180/Math.PI).toFixed(4)}"> deg</div>`
            satInputs[6].innerHTML = `&nu; <input class="sat-input" style="font-size: 1em; width: 15ch;" type="Number" placeholder="${(originCOE.tA*180/Math.PI).toFixed(4)}"> deg</div>`
            break
        case 'ric-sat-input':    
            satInputs[0].innerHTML = `
                <label>Rel Origin</label><select id="sat-input-origin">
                    <option value="-1">Current Origin</option>
                    ${mainWindow.satellites.map((s,ii) => {
                        return `
                            <option value="${ii}">${s.name}</option>
                        `
                    }).join('')}
                </select>
            
                                        `
            satInputs[1].innerHTML = `R <input class="sat-input" style="font-size: 1em; width: 15ch;" type="Number" placeholder="0"> km</div>`
            satInputs[2].innerHTML = `I <input class="sat-input" style="font-size: 1em; width: 15ch;" type="Number" placeholder="0"> km</div>`
            satInputs[3].innerHTML = `C <input class="sat-input" style="font-size: 1em; width: 15ch;" type="Number" placeholder="0"> km</div>`
            satInputs[4].innerHTML = `dR <input class="sat-input" style="font-size: 1em; width: 15ch;" type="Number" placeholder="0"> m/s</div>`
            satInputs[5].innerHTML = `dI <input class="sat-input" style="font-size: 1em; width: 15ch;" type="Number" placeholder="0"> m/s</div>`
            satInputs[6].innerHTML = `dC <input class="sat-input" style="font-size: 1em; width: 15ch;" type="Number" placeholder="0"> m/s</div>`
            break
        case 'rmoe-sat-input':
            satInputs[0].innerHTML = `
            <label>Rel Origin</label><select id="sat-input-origin">
                <option value="-1">Current Origin</option>
                ${mainWindow.satellites.map((s,ii) => {
                    return `
                        <option value="${ii}">${s.name}</option>
                    `
                }).join('')}
            </select>
        
                                    `
            satInputs[1].innerHTML = `A <input class="sat-input" style="font-size: 1.25em; width: 10ch;" type="Number" placeholder="0"> km</div>`
            satInputs[2].innerHTML = `Drift <input class="sat-input" style="font-size: 1.25em; width: 10ch;" type="Number" placeholder="0"> deg/rev</div>`
            satInputs[3].innerHTML = `Rel Long <input class="sat-input" style="font-size: 1.25em; width: 10ch;" type="Number" placeholder="0"> deg</div>`
            satInputs[4].innerHTML = `In-Plane <input class="sat-input" style="font-size: 1.25em; width: 10ch;" type="Number" placeholder="0"> deg</div>`
            satInputs[5].innerHTML = `Z-Max <input class="sat-input" style="font-size: 1.25em; width: 10ch;" type="Number" placeholder="0"> deg</div>`
            satInputs[6].innerHTML = `Out-of-Plane <input class="sat-input" style="font-size: 1.25em; width: 10ch;" type="Number" placeholder="0"> deg</div>`
            break
        case 'geo-sat-input':
            date = new Date(mainWindow.startDate)
            date = `${date.getFullYear()}-${padNumber(date.getMonth()+1)}-${padNumber(date.getDate())}T${padNumber(date.getHours())}:${padNumber(date.getMinutes())}:${padNumber(date.getSeconds())}`
            satInputs[0].innerHTML = mainWindow.satellites.length === 0 ? `Epoch <input class="sat-input" style="width: 20ch; font-size: 1.25em;" type="datetime-local" id="start-time" name="meeting-time" value="${date}">` : ''
            satInputs[1].innerHTML = `Longitude <input class="sat-input" style="font-size: 1.25em; width: 10ch;" type="Number" placeholder="0"> deg</div>`
            satInputs[2].innerHTML = `Drift Rate<input class="sat-input" style="font-size: 1.25em; width: 10ch;" type="Number" placeholder="0"> deg/day</div>`
            satInputs[3].innerHTML = ``
            satInputs[4].innerHTML = ``
            satInputs[5].innerHTML = ``
            satInputs[6].innerHTML = ``
            
            break
    }
    document.getElementById(el.id).checked = true
    document.querySelectorAll('.sat-input[type="number"]')[0].focus()
}

function checkJ200StringValid(string) {
    string = string.split(/ {2,}/).filter(s => s !== '')
    if (string.length < 7) return false
    date = string.shift()
    date = new Date(date)
    if (date == 'Invalid Date') return false
    string = string.map(s => Number(s))
    if (string.filter(s => Number.isNaN(s)).length > 0) return false
    if (math.norm(string.slice(0,3)) > 1e6) {
        // If inputted strings position greater than 100000, assume units are in meters
        string = string.map(s => s / 1000)
    }
    return {date, state: string}
}

document.getElementById('confirm-option-button').addEventListener('click', (click) => {
    let stateInputs = document.querySelectorAll('.origin-input')
    let coe = document.getElementById('coe-radio').checked
    let state = [...stateInputs].map(s => Number(s.value === '' ? s.placeholder : s.value))
    let startDate = new Date(document.getElementById('start-time').value)
    let catsRadio = [...document.querySelectorAll('.cats-radio')].filter(s => s.checked).map(s => s.value)[0]
    catsRadio = catsRadio === undefined ? '0' : catsRadio
    mainWindow.zeroCatsGood = catsRadio === '0'
    console.log(catsRadio);

    if (!coe) {
        state = PosVel2CoeNew(state.slice(0,3), state.slice(3,6))
    }
    else {
        state = {
            a: state[0],
            e: state[1],
            i: state[2] * Math.PI / 180,
            raan: state[3] * Math.PI / 180,
            arg: state[4] * Math.PI / 180,
            tA: state[5] * Math.PI / 180
        }
    }
    mainWindow.startDate = startDate
    mainWindow.timeDelta = 2 * Math.PI * 0.006 / mainWindow.mm
    mainWindow.scenarioLength = Number(document.querySelector('#scen-length-input').value === '' ? document.querySelector('#scen-length-input').placeholder : document.querySelector('#scen-length-input').value)
    
    mainWindow.updateOrigin(state)
    let strStart = Number(document.querySelector('#str-start-input').value === ''? document.querySelector('#str-start-input').placeholder : document.querySelector('#str-start-input').value)
    let strEnd = Number(document.querySelector('#str-end-input').value === ''? document.querySelector('#str-end-input').placeholder : document.querySelector('#str-end-input').value)
    mainWindow.stringLimit = [strStart - 1, strEnd]
    document.querySelector('#time-slider-range').max = mainWindow.scenarioLength * 3600
    closeAll();
})

function uploadScenario(event) {
    if (event.target.id === 'upload-scenario-button') return document.querySelector('#upload-sas-input').click()
    // if (event.path[0].files[0] === undefined) return
    if (event.target.files[0] === undefined) return
    loadFileAsText(event.target.files[0])
    event.target.value = ''
    closeAll()
}

function toStkFormat(time) {
    time = time.split('GMT')[0].substring(4, time.split('GMT')[0].length - 1) + '.000';
    time = time.split(' ');
    return time[1] + ' ' + time[0] + ' ' + time[2] + ' ' + time[3];
}

function loadFileAsText(fileToLoad) {
    var fileReader = new FileReader();
    fileReader.onload = function (fileLoadedEvent) {
        var textFromFileLoaded = fileLoadedEvent.target.result;
        textFromFileLoaded = JSON.parse(textFromFileLoaded);
        mainWindow.loadDate(textFromFileLoaded);
        mainWindow.setAxisWidth('set', mainWindow.plotWidth);
    };
    
    console.log(fileToLoad.type);
    fileReader.readAsText(fileToLoad, "UTF-8");
}

function changeBurnType() {
    if (mainWindow.burnType === 'waypoint') {
        document.getElementById('way-arrows').style['fill-opacity'] = 0;
        document.getElementById('manual-arrows').style['fill-opacity'] = 1;
        document.getElementById('burn-type-control').style.right = '1.75%';
        mainWindow.burnType = 'manual'
    }
    else {
        document.getElementById('manual-arrows').style['fill-opacity'] = 0;
        document.getElementById('way-arrows').style['fill-opacity'] = 1;
        document.getElementById('burn-type-control').style.right = '2.25%';
        mainWindow.burnType = 'waypoint'
    }
}

function parseArtsText(text) {
    text = text.split(/ {2,}/)
    if (text.length < 10) return alert('Invalid State Input')
    let newDate = new Date(text[0])
    newDate = isNaN(newDate) ? mainWindow.startDate : newDate
    let newState = text.slice(1,7).map(s => Number(s))
    if (newState.length < 6 || newState.filter(s => isNaN(s)).length > 0) return alert('Invalid State Input')
    let newSun = text.slice(7,10).map(s => Number(s))
    if (newSun.length < 3 || newSun.filter(s => isNaN(s)).length > 0) return alert('Invalid State Input')
    newSun = math.dotDivide(newSun, math.norm(newSun))
    newSun = [-newSun[2], newSun[0], -newSun[1]]
    let originOrbit = [42164, 0, 0, 0, 0, 0]
    let newOrbit = text.slice(10, 16).map(s => Number(s))
    let chief, dep
    if (text.length > 17) {
        chief = text[16]
        dep = text[17]
    }
    for (let index = 0; index < newOrbit.length; index++) {
        originOrbit[index] = newOrbit[index]
        if (index > 1) originOrbit[index] *= Math.PI / 180
    }
    originOrbit = {
        a: originOrbit[0],
        e: originOrbit[1],
        i: originOrbit[2],
        raan: originOrbit[3],
        arg: originOrbit[4],
        tA: originOrbit[5],
    }
    return {newDate, newState, newSun, originOrbit, chief, dep}
}

function parseState(button) {
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
    let inputValue = document.getElementById('parse-text').value
    document.getElementById('parse-text').value = ''
    let tleCheck = inputValue.search(/^1 {1,}\d{1,5}/) !== -1
    let eciValues
    if (tleCheck) {
        // parse tle
        try {
            let date = inputValue.slice(inputValue.search(/\d{5}.\d{4,}/)).split(/ {1,}/)[0]
            inputValue = inputValue.slice(inputValue.search(/(\n| |\r|\t)2 {1,}\d{5}/)).split(/ {1,}/).filter(s => s.length > 0)
            
            let name = inputValue[1]
            document.querySelectorAll('.sat-style-input')[3].value = name
            inputValue = {
                a: Number(inputValue[7]),
                e: Number('0.'+inputValue[4]),
                i: Number(inputValue[2])*Math.PI/180,
                raan: Number(inputValue[3])*Math.PI/180,
                arg: Number(inputValue[5])*Math.PI/180,
                tA: Number(inputValue[6])*Math.PI/180,
            }
            inputValue.a = 86400 / inputValue.a
            inputValue.a = (398600.4418*(inputValue.a / 2 / Math.PI)**2)**(1/3)
            inputValue.tA = solveKeplersEquation(inputValue.tA, inputValue.e)
            inputValue.tA = Eccentric2True(inputValue.e, inputValue.tA)
            inputValue = Object.values(Coe2PosVelObject(inputValue))
            date = new Date('20'+date.slice(0,2), 0, date.slice(2,5), 0,0,72+86400*Number(date.slice(5)))
            eciValues = {
                date, state: inputValue
            }
        } catch (error) {
            return showScreenAlert('Input not valid as a J2000 or TLE')
        }
    }
    else {
        eciValues = checkJ200StringValid(inputValue)
        if (!eciValues) return showScreenAlert('Input not valid as a J2000 or TLE')
    }
    changeSatelliteInputType({id: 'eci-sat-input'})
    let satInputs = document.querySelectorAll('.sat-input')
    satInputs[0].value = convertTimeToDateTimeInput(eciValues.date)
    console.log(eciValues);
    satInputs[1].value = eciValues.state[0].toFixed(8)
    satInputs[2].value = eciValues.state[1].toFixed(8)
    satInputs[3].value = eciValues.state[2].toFixed(8)
    satInputs[4].value = eciValues.state[3].toFixed(8)
    satInputs[5].value = eciValues.state[4].toFixed(8)
    satInputs[6].value = eciValues.state[5].toFixed(8)
    document.getElementById('parse-text').placeholder = 'State Accepted!'
    setTimeout(() => {
        document.getElementById('parse-text').placeholder = 'ECI State or TLE'
    }, 3000)
}
//------------------------------------------------------------------
// Adding functions to handle data planels, etc.
//------------------------------------------------------------------
function openPanel(button) {
    document.getElementById('context-menu')?.remove();
    let screenAlert = document.getElementsByClassName('screen-alert');
    
    if (screenAlert.length > 0) screenAlert[0].remove();
    if (button.id === 'edit-select') return;
    mainWindow.panelOpen = true;
    if (button.id === 'add-satellite' || button.id === 'add-satellite-2') {
        document.getElementsByName('sat-input-radio')[0].checked = true
        changeSatelliteInputType({
            id: mainWindow.satellites.length === 0 ? 'coe-sat-input' : 'ric-sat-input'
        })
        let selectEl = document.getElementById('edit-select');
        selectEl.parentNode.parentNode.getElementsByTagName('input')[2].value = '';
        document.getElementById('parse-text').value = "";
        while (selectEl.firstChild) {
            selectEl.removeChild(selectEl.firstChild);
        }
        mainWindow.satellites.forEach((sat, ii) => {
            addedElement = document.createElement('option');
            addedElement.value = ii;
            addedElement.textContent = sat.name  ? sat.name : sat.shape;
            addedElement.style.color = sat.color;
            selectEl.appendChild(addedElement);
        })
    }
    else if (button.id === 'options') {
        // If ephem viewer is on, don't display origin orbit as it's based on the ephemeris
        let optionDivs = [...document.querySelector('#options-panel').querySelectorAll('div')].slice(2,13).forEach(optDiv => optDiv.style.display = mainWindow.ephemViewerMode ? 'none' : '')
        console.log(optionDivs);
        document.getElementById('coe-radio').checked = true
        changeOriginInput({id: 'coe-radio'})
        // Set cats radio button to current setting
        document.querySelector('#cats-good-'+(mainWindow.zeroCatsGood ? '0' : '180')).checked = true
        // Reset scenario length input to planceholder of current
        document.querySelector('#scen-length-input').value = ''
        document.querySelector('#scen-length-input').placeholder = mainWindow.scenarioLength
        document.querySelector('#str-start-input').placeholder = mainWindow.stringLimit[0] + 1
        document.querySelector('#str-end-input').placeholder = mainWindow.stringLimit[1]
    }
    document.getElementById(button.id + '-panel').classList.toggle("hidden");
    // mainWindow.panelOpen = true;
}

function changeOriginInput(el) {
    let padNumber = function(n) {
        return n < 10 ? '0' + n : n
    }
    let date = new Date(mainWindow.startDate)
    document.getElementById('start-time').value = `${date.getFullYear()}-${padNumber(date.getMonth()+1)}-${padNumber(date.getDate())}T${padNumber(date.getHours())}:${padNumber(date.getMinutes())}:${padNumber(date.getSeconds())}`
    let newType = el.id.split('-')[0]
    let inputs = document.querySelectorAll('.origin-input')
    switch (newType) {
        case 'coe':
            inputs[0].parentElement.innerHTML = `<em>a</em> <input placeholder="${mainWindow.originOrbit.a.toFixed(6)}"class="origin-input" style="width: 15ch;" placeholder="0" type="Number" step="1"> km`
            inputs[1].parentElement.innerHTML = `<em>e</em> <input placeholder="${mainWindow.originOrbit.e.toFixed(6)}"class="origin-input" style="width: 15ch;" placeholder="0" type="Number" step="1">`
            inputs[2].parentElement.innerHTML = `<em>i</em> <input placeholder="${(mainWindow.originOrbit.i*180 / Math.PI).toFixed(6)}"class="origin-input" style="width: 15ch;" placeholder="0" type="Number" step="1"> deg`
            inputs[3].parentElement.innerHTML = `&#937      <input placeholder="${(mainWindow.originOrbit.raan*180 / Math.PI).toFixed(6)}"class="origin-input" style="width: 15ch;" placeholder="0" type="Number" step="1"> deg`
            inputs[4].parentElement.innerHTML = `&#969      <input placeholder="${(mainWindow.originOrbit.arg*180 / Math.PI).toFixed(6)}"class="origin-input" style="width: 15ch;" placeholder="0" type="Number" step="1"> deg`
            inputs[5].parentElement.innerHTML = `&#957      <input placeholder="${(mainWindow.originOrbit.tA*180 / Math.PI).toFixed(6)}"class="origin-input" style="width: 15ch;" placeholder="0" type="Number" step="1"> deg`
            break
        case 'eci':
            let eciState = Object.values(Coe2PosVelObject(mainWindow.originOrbit))
            inputs[0].parentElement.innerHTML = `X  <input placeholder="${eciState[0].toFixed(6)}" class="origin-input" style="width: 15ch;" placeholder="0" type="Number" step="1"> km`
            inputs[1].parentElement.innerHTML = `Y  <input placeholder="${eciState[1].toFixed(6)}" class="origin-input" style="width: 15ch;" placeholder="0" type="Number" step="1"> km`
            inputs[2].parentElement.innerHTML = `z  <input placeholder="${eciState[2].toFixed(6)}" class="origin-input" style="width: 15ch;" placeholder="0" type="Number" step="1"> km`
            inputs[3].parentElement.innerHTML = `dX <input placeholder="${eciState[3].toFixed(6)}" class="origin-input" style="width: 15ch;" placeholder="0" type="Number" step="1"> km/s`
            inputs[4].parentElement.innerHTML = `dY <input placeholder="${eciState[4].toFixed(6)}" class="origin-input" style="width: 15ch;" placeholder="0" type="Number" step="1"> km/s`
            inputs[5].parentElement.innerHTML = `dZ <input placeholder="${eciState[5].toFixed(6)}" class="origin-input" style="width: 15ch;" placeholder="0" type="Number" step="1"> km/s`
            break
        case 'geo':
            inputs[0].parentElement.innerHTML = `Longitude  <input placeholder="0" class="origin-input" style="width: 15ch;" placeholder="0" type="Number" step="1"><sup>o</sup>`
            inputs[1].parentElement.innerHTML = `<input hidden class="origin-input" style="width: 15ch;" type="Number" step="1" disabled>`
            inputs[2].parentElement.innerHTML = `<input hidden class="origin-input" style="width: 15ch;" type="Number" step="1" disabled>`
            inputs[3].parentElement.innerHTML = `<input hidden class="origin-input" style="width: 15ch;" type="Number" step="1" disabled>`
            inputs[4].parentElement.innerHTML = `<input hidden class="origin-input" style="width: 15ch;" type="Number" step="1" disabled>`
            inputs[5].parentElement.innerHTML = `<input hidden class="origin-input" style="width: 15ch;" type="Number" step="1" disabled>`
            break
        case 'string':
            let values = checkJ200StringValid(el.value)
            el.value = ''
            if (!values) return showScreenAlert('Not a valid J2000 STK string')
            let date = new Date(values.date)
            document.getElementById('start-time').value = `${date.getFullYear()}-${padNumber(date.getMonth()+1)}-${padNumber(date.getDate())}T${padNumber(date.getHours())}:${padNumber(date.getMinutes())}:${padNumber(date.getSeconds())}`
            document.getElementById('eci-radio').checked = true
            inputs[0].parentElement.innerHTML = `X  <input value="${values.state[0].toFixed(6)}" class="origin-input" style="width: 15ch;" placeholder="0" type="Number" step="1"> km`
            inputs[1].parentElement.innerHTML = `Y  <input value="${values.state[1].toFixed(6)}" class="origin-input" style="width: 15ch;" placeholder="0" type="Number" step="1"> km`
            inputs[2].parentElement.innerHTML = `z  <input value="${values.state[2].toFixed(6)}" class="origin-input" style="width: 15ch;" placeholder="0" type="Number" step="1"> km`
            inputs[3].parentElement.innerHTML = `dX <input value="${values.state[3].toFixed(6)}" class="origin-input" style="width: 15ch;" placeholder="0" type="Number" step="1"> km/s`
            inputs[4].parentElement.innerHTML = `dY <input value="${values.state[4].toFixed(6)}" class="origin-input" style="width: 15ch;" placeholder="0" type="Number" step="1"> km/s`
            inputs[5].parentElement.innerHTML = `dZ <input value="${values.state[5].toFixed(6)}" class="origin-input" style="width: 15ch;" placeholder="0" type="Number" step="1"> km/s`
            break
    }
}

function closeAll() {
    mainWindow.panelOpen = false;
    let buttons = document.getElementsByClassName('panel');
    mainWindow.desired.scenarioTime = Number(document.getElementById('time-slider-range').value);
    for (let jj = 0; jj < buttons.length; jj++) {
        buttons[jj].classList.add('hidden');
    }
    // mainWindow.panelOpen = false;
}

function phiMatrix(t = 0, n = mainWindow.mm) {
    let nt = n * t;
    let cnt = Math.cos(nt);
    let snt = Math.sin(nt);
    return {
        rr: [
            [4 - 3 * cnt, 0, 0],
            [6 * (snt - nt), 1, 0],
            [0, 0, cnt]
        ],
        rv: [
            [snt / n, 2 * (1 - cnt) / n, 0],
            [2 * (cnt - 1) / n, (4 * snt - 3 * nt) / n, 0],
            [0, 0, snt / n]
        ],
        vr: [
            [3 * n * snt, 0, 0],
            [6 * n * (cnt - 1), 0, 0],
            [0, 0, -n * snt]
        ],
        vv: [
            [cnt, 2 * snt, 0],
            [-2 * snt, 4 * cnt - 3, 0],
            [0, 0, cnt]
        ]
    };
}

function phiMatrixWhole(t = 0, n = mainWindow.mm) {
    let nt = n * t;
    let cnt = Math.cos(nt);
    let snt = Math.sin(nt);
    return [
        [4 - 3 * cnt, 0, 0, snt / n, 2 * (1 - cnt) / n, 0],
        [6 * (snt - nt), 1, 0, 2 * (cnt - 1) / n, (4 * snt - 3 * nt) / n, 0],
        [0, 0, cnt, 0, 0, snt / n],
        [3 * n * snt, 0, 0, cnt, 2 * snt, 0],
        [6 * n * (cnt - 1), 0, 0, -2 * snt, 4 * cnt - 3, 0],
        [0, 0, -n * snt, 0, 0, cnt]
    ];
}
let lastLambertError
function estimateWaypointBurn(r1, r2, dt, a) {
    let lamResults1, long, option
    try {
        long = Math.floor(dt / (Math.PI / mainWindow.mm))
        let n = Math.floor(long / 2) 
        let crossVector = math.cross(r1.slice(0,3),r2.slice(0,3))
        let h1 = math.cross(r1.slice(0,3), r1.slice(3,6))
        long = crossVector[2] * h1[2] > 0
        option = n < 1 ? 1 : long ? -1 : 1
        lamResults1 = solveLambertsProblem(r1.slice(0,3), r2, dt, n, long, option)
        if (lamResults1 === 'collinear') return {
            data: false,
            reason: 'collinear'
        }
        let burnEst = math.subtract(lamResults1.v1, r1.slice(3,6))
        let r = ConvEciToRic(r1, [...burnEst,0,0,0], true)
        // convert ECI burn direction into satellites RIC direction
        burnEst = math.multiply(r[0], burnEst)
        // console.log(lamResults.v1);
        return result = eciFiniteBurnOneBurn(r1,r2,dt,a,burnEst)
    } catch (error) {
        lastLambertError = {
            data: false,
            reason: 'unknown lambert error',
            results: lamResults1,
            long,
            option,
            r1,r2,dt
        }
        return {
            data: false,
            reason: 'unknown lambert error',
            results: lamResults1,
            long,
            option,
            r1,r2,dt
        }
    }
}

function eciFiniteBurnOneBurn(stateInit, stateFinal, tf, a0, guess) {
    let yErr= [100], S, dX = 1,
        F;
    let dv1 = guess
    let X = [
        Math.atan2(dv1[1], dv1[0]),
        Math.atan2(dv1[2], math.norm([dv1[0], dv1[1]])),
        math.norm(math.squeeze(dv1)) / a0 / tf
    ];
    if (X[2] < 1e-11) {
        return {
            data: false,
            reason: 'no burn mag'
        }
    }
    if (X[2] > 1) return {
        data: false,
        reason: 'no kinematic reach'
    }
    let errCount = 0, fHistory = []
    while (math.norm(math.squeeze(yErr)) > 1e-3) {
        F = eciOneBurnFiniteCalc(stateInit, X[0], X[1], X[2], tf, a0).slice(0,3)
        fHistory.push(F.slice(0,3))
        yErr = math.subtract(stateFinal, F)
        S = eciJacobianOneBurn(stateInit, a0, X[0], X[1], X[2], tf, math.transpose([F]));
        try {
            dX = math.multiply(math.inv(S), math.transpose([yErr]));
        } catch (error) {
            dX = math.zeros([3,1])
        }
        X = math.squeeze(math.add(math.transpose([X]), dX))
        X[2] = X[2] < 0 ? 1e-9 : X[2]
        X[2] = X[2] > 1 ? 0.95 : X[2]
        if (errCount > 30) return {
            data: false,
            reason: 'upper errcount',
            goal: stateFinal,
            acheived: F,
            history: fHistory,
            guess
        };
        errCount++;
    }
    // console.log(math.squeeze(X));
    if (X[2] > 1 || X[2] < 0) return {
        data: false,
        reason: 'no kinematic reach'
    }
    let cosEl = Math.cos(X[1])
    return {
        data: {
            r: a0 * X[2] * tf * Math.cos(X[0]) * cosEl,
            i: a0 * X[2] * tf * Math.sin(X[0]) * cosEl,
            c: a0 * X[2] * tf * Math.sin(X[1]),
            t: X[2] *tf,
            position: F,
            final: X
        }
    }
}

function eciOneBurnFiniteCalc(state=[42164.14, 0, 0, 0, 3.0746611, 0], alpha=0, phi=0, tB=0.1, finalTime=60, a = 0.00001) {
    let cosEl = a*Math.cos(phi)
    let direction = [Math.cos(alpha) * cosEl, Math.sin(alpha) * cosEl, a * Math.sin(phi)];
    let burnDuration = tB * finalTime
    propPosition = runge_kutta4(inertialEom, state, burnDuration, direction)
    propPosition = propToTime(propPosition, finalTime - tB*finalTime)
    return propPosition
}

function eciJacobianOneBurn(state, a, alpha, phi, tB, tF, m1) {
    let m2, m, mC
    
    m2 = math.transpose([eciOneBurnFiniteCalc(state, alpha + 0.001, phi, tB, tF, a).slice(0,3)])
    mC = math.dotDivide(math.subtract(m2, m1), 0.001);

    //phi
    m2 =  math.transpose([eciOneBurnFiniteCalc(state, alpha, phi + 0.001, tB, tF, a).slice(0,3)])
    m = math.dotDivide(math.subtract(m2, m1), 0.001);
    mC = math.concat(mC, m);

    //tB
    m2 = math.transpose([eciOneBurnFiniteCalc(state, alpha, phi, tB + tB * 0.01, tF, a).slice(0,3)])
    m = math.dotDivide(math.subtract(m2, m1), tB * 0.01);
    mC = math.concat(mC, m);

    return mC;
}

function curve2linear(state = [0, 1000, 0,0,0,0], origin = mainWindow.originOrbit) {
    state[0] += origin.a
    let r = math.norm(state)
    let originState = [origin.a, 0, 0]
    let long = math.dot(state.slice(0,3), originState) / r / origin.a
    long = math.acos(long) * 180 / Math.PI
    let rot = rotationMatrices(state[1] < 0 ? long : -long, 3)
    let newPos = math.multiply(rot, state.slice(0,3))
    newPos[0] -= origin.a
    newPos[1] = origin.a * (state[1] < 0 ? -long : long) * Math.PI / 180
    let newVel = math.multiply(rot, state.slice(3,6))
    return [...newPos, ...newVel]
}

function linear2curve(state, origin = mainWindow.originOrbit) {
    state[0] += origin.a
    let long = -state[1] / origin.a
    state[1] = 0
    let rot = rotationMatrices(-long * 180 / Math.PI, 3)
    let newPos = math.multiply(rot, state.slice(0,3))
    newPos[0] -= origin.a
    let newVel = math.multiply(rot, state.slice(3,6))

    return [...newPos, ...newVel]
}

function hcwFiniteBurnOneBurn(stateInit, stateFinal, tf, a0, time = 0) {
    let state = math.transpose([Object.values(stateInit)]);
    let linState = math.transpose([curve2linear(math.squeeze(state))])
    stateFinal = math.transpose([Object.values(stateFinal)]);
    let linStateFinal = math.transpose([curve2linear(math.squeeze(stateFinal))])
    let v = proxOpsTargeter(linState.slice(0, 3), linStateFinal.slice(0, 3), tf);
    v = [math.transpose([linear2curve([...math.squeeze(linState).slice(0,3), ...math.squeeze(v[0])]).slice(3,6)])];
    let v1 = v[0],
        yErr= [100], S, dX = 1,
        F;
    let dv1 = math.subtract(v1, state.slice(3, 6))
    let X = [
        [Math.atan2(dv1[1][0], dv1[0][0])],
        [Math.atan2(dv1[2][0], math.norm([dv1[0][0], dv1[1][0]]))],
        [math.norm(math.squeeze(dv1)) / a0 / tf]
    ];
    if (X[2] < 1e-11) {
        return {
            r: 0,
            i: 0,
            c: 0,
            t: [0],
            F: oneBurnFiniteHcw(stateInit, X[0][0], X[1][0], X[2][0], tf, time, a0)
        }
    }
    if (X[2] > 1) return false;
    let errCount = 0, numeric = false
    // F = oneBurnFiniteHcw(stateInit, X[0][0], X[1][0], X[2][0], tf, time, a0, numeric);
    // console.log(Object.values(F));
    // console.log(math.squeeze(stateFinal));
    // console.log(math.squeeze(X));
    while (math.norm(math.squeeze(yErr)) > 1e-3) {
        F = oneBurnFiniteHcw(stateInit, X[0][0], X[1][0], X[2][0], tf, time, a0, numeric);
        yErr = [
            [stateFinal[0][0] - F.x],
            [stateFinal[1][0] - F.y],
            [stateFinal[2][0] - F.z]
        ];
        S = proxOpsJacobianOneBurn(stateInit, a0, X[0][0], X[1][0], X[2][0], tf, numeric);
        try {
            dX = math.multiply(math.inv(S), yErr);
        } catch (error) {
            dX = math.zeros([3,1])
        }
        X = math.add(X, dX)
        X[2][0] = X[2][0] < 0 ? 1e-9 : X[2][0]
        X[2][0] = X[2][0] > 1 ? 0.95 : X[2][0]
        if (errCount > 10) {
            // Analytic estimate failed switch to numeric estimate
            numeric = true
        }
        if (errCount > 30) return false;
        errCount++;
    }
    // console.log(math.squeeze(X));
    if (X[2] > 1 || X[2] < 0) return false
    let cosEl = Math.cos(X[1][0])
    return {
        r: a0 * X[2] * tf * Math.cos(X[0][0]) * cosEl,
        i: a0 * X[2] * tf * Math.sin(X[0][0]) * cosEl,
        c: a0 * X[2] * tf * Math.sin(X[1][0]),
        t: X[2],
        F,
        X
    }
}

function oneBurnFiniteHcw(state, alpha, phi, tB, finalTime, time = 0, a0 = 0.00001, num = true) {
    state = Object.values(state)
    let cosEl = Math.cos(phi)
    let direction = [a0 * Math.cos(alpha) * cosEl, a0 * Math.sin(alpha) * cosEl, a0 * Math.sin(phi)];
    
    let propTime = 0
    while ((propTime + mainWindow.timeDelta) < finalTime * tB) {
        state = runge_kutta(twoBodyRpo, state, mainWindow.timeDelta, direction, time + propTime)
        propTime += mainWindow.timeDelta
    }
    state = runge_kutta(twoBodyRpo, state, finalTime*tB - propTime, direction, time + propTime)
    propTime = finalTime * tB
    if (num) {
        while((propTime + mainWindow.timeDelta) < finalTime) {
            state = runge_kutta(twoBodyRpo, state, mainWindow.timeDelta, [0,0,0], time + propTime); propTime += mainWindow.timeDelta
        }
        state = runge_kutta(twoBodyRpo, state, finalTime - propTime, [0,0,0], time + propTime);
        return {
            x: state[0],
            y: state[1],
            z: state[2],
            xd: state[3],
            yd: state[4],
            zd: state[5]
        };
    }
    let propTwoBodyTime = finalTime - propTime
    state = propRelMotionTwoBodyAnalytic(state, propTwoBodyTime, time + propTime)
    return {
        x: state[0],
        y: state[1],
        z: state[2],
        xd: state[3],
        yd: state[4],
        zd: state[5]
    };

}

function proxOpsJacobianOneBurn(state, a, alpha, phi, tB, tF, time, numeric = true) {
    let m1, m2, m, mC
    // alpha; If phi is at 90 degrees, jacobian won't have full rank, set to 89 deg for az jacobian calculation
    let phi2 = math.abs(Math.cos(phi)) < 1e-6 ? 89 * Math.PI / 180 : phi;
    m1 = oneBurnFiniteHcw(state, alpha, phi2, tB, tF, time, a, numeric);
    m1 = [
        [m1.x],
        [m1.y],
        [m1.z]
    ];
    m2 = oneBurnFiniteHcw(state, alpha + 0.01, phi2, tB, tF, time, a, numeric);
    m2 = [
        [m2.x],
        [m2.y],
        [m2.z]
    ];
    mC = math.dotDivide(math.subtract(m2, m1), 0.01);
    //phi
    m2 = oneBurnFiniteHcw(state, alpha, phi + 0.01, tB, tF, time, a, numeric);
    m2 = [
        [m2.x],
        [m2.y],
        [m2.z]
    ];
    m = math.dotDivide(math.subtract(m2, m1), 0.01);
    mC = math.concat(mC, m);
    //tB
    m2 = oneBurnFiniteHcw(state, alpha, phi, tB + tB * 0.1, tF, time, a, numeric);
    m2 = [
        [m2.x],
        [m2.y],
        [m2.z]
    ];
    m = math.dotDivide(math.subtract(m2, m1), tB * 0.1);
    mC = math.concat(mC, m);
    return mC;
}

function proxOpsTargeter(r1, r2, t) {
    let phi = phiMatrix(t);
    v1 = math.multiply(math.inv(phi.rv), math.subtract(r2, math.multiply(phi.rr, r1)));
    v2 = math.add(math.multiply(phi.vr, r1), math.multiply(phi.vv, v1));
    return [v1, v2];
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

function generateBurns(all = false, burn = 0) {
    this.calcTraj(true, burn);
}

function calcBurns() {
    let cross = this.burnStatus.frame === 'ri' ? false : true;
    let sat = this.satellites[this.burnStatus.sat];
    if (!this.mousePosition) return;
    let mousePosition = this.convertToRic(this.mousePosition);
    if (!this.mousePosition || !mousePosition || !mousePosition[this.burnStatus.frame]) return;
    if (mainWindow.burnStatus.type === 'waypoint' && sat.a > 0.000001 && sat.burns[this.burnStatus.burn].waypoint !== false) {
        let originAtTime = propToTimeAnalytic(mainWindow.originOrbit, sat.burns[this.burnStatus.burn].time+sat.burns[this.burnStatus.burn].waypoint.tranTime)
        let target= Eci2Ric(originAtTime.slice(0,3), originAtTime.slice(3,6), sat.burns[this.burnStatus.burn].waypoint.target.slice(0,3), [0,0,0])
        target = [
            cross ? target.rHcw[0][0] : mousePosition[this.burnStatus.frame].r,
            cross ? target.rHcw[1][0] : mousePosition[this.burnStatus.frame].i,
            cross ? mousePosition[this.burnStatus.frame].c : target.rHcw[2][0]
        ]
        target = Ric2Eci(target, [0,0,0], originAtTime.slice(0,3), originAtTime.slice(3,6)).rEcci
        sat.burns[this.burnStatus.burn].waypoint.target = target
    } else {
        sat.burns[this.burnStatus.burn].direction = [
            cross ? sat.burns[this.burnStatus.burn].direction[0] : (mousePosition[this.burnStatus.frame].r - sat.burns[this.burnStatus.burn].location[0]) * mainWindow.burnSensitivity / 1000,
            cross ? sat.burns[this.burnStatus.burn].direction[1] : (mousePosition[this.burnStatus.frame].i - sat.burns[this.burnStatus.burn].location[1]) * mainWindow.burnSensitivity / 1000,
            cross ? (mousePosition[this.burnStatus.frame].c - sat.burns[this.burnStatus.burn].location[2]) *
                mainWindow.burnSensitivity / 1000 : sat.burns[this.burnStatus.burn].direction[2]
        ]
        sat.burns[this.burnStatus.burn].waypoint = false
        // Reset cross-track directiom burns in future to 0
        for (let hh = this.burnStatus.burn + 1; hh < sat.burns.length; hh++) {
            sat.burns[hh].direction[2] = 0
        }
    }
    let mag = math.norm([sat.burns[this.burnStatus.burn].direction[0], sat.burns[this.burnStatus.burn].direction[1], sat.burns[this.burnStatus.burn].direction[2]])
    let initPos = this.convertToPixels(sat.burns[this.burnStatus.burn].location)[this.burnStatus.frame];
    let ctx = this.getContext();
    ctx.strokeStyle = sat.color;
    ctx.fillStyle = sat.color
    ctx.beginPath();
    ctx.moveTo(initPos.x, initPos.y);
    let dist = mag * 1000 / this.burnSensitivity;
    let point2 = {r: sat.burns[this.burnStatus.burn].location[0] + dist * sat.burns[this.burnStatus.burn].direction[0] / mag, i: sat.burns[this.burnStatus.burn].location[1] + dist * sat.burns[this.burnStatus.burn].direction[1]/ mag, c: sat.burns[this.burnStatus.burn].location[2] + dist * sat.burns[this.burnStatus.burn].direction[2] / mag}
    let finalPos = this.convertToPixels(point2)[this.burnStatus.frame];
    ctx.lineTo(finalPos.x, finalPos.y);
    ctx.stroke();
    let mag2 = math.norm([finalPos.x - initPos.x, finalPos.y - initPos.y]);
    ctx.textBaseline = "middle"
    ctx.textAlign = 'center'
    ctx.fillText((1000*mag).toFixed(1) + ' m/s', -120 *(finalPos.x - initPos.x) / mag2 / 1.5 + initPos.x, -60*(finalPos.y - initPos.y) / mag2 / 1.5 + initPos.y)
    sat.calcTraj(true, this.burnStatus.burn)
}

function addToolTip(element) {
    if (element.getElementsByTagName('input').length > 0) return;
    element.classList.toggle('tooltip')
}

function rmoeToRic(rmoes = {ae: 0, x: 0, y: 0, b: 0, z: 0, m: 0}, time = mainWindow.scenarioTime, top = true) {
    let origSemi = (398600.4418 / mainWindow.mm ** 2) ** (1/3);
    let origPeriod = 2 * Math.PI / mainWindow.mm;
    let initMm = mainWindow.mm + (rmoes.x * Math.PI  / 180) / origPeriod;
    let originOrbit = {...mainWindow.originOrbit}
    originOrbit.e = 0
    originOrbit.raan = 0
    originOrbit.arg = 0
    originOrbit.i = 0
    originOrbit.tA = 0
    let rmoeCoes = {
        a: (398600.4418 / initMm ** 2)**(1/3),
        e: rmoes.ae / 2 / origSemi,
        i: rmoes.z *Math.PI / 180,
        raan: rmoes.y *Math.PI / 180 - rmoes.m * Math.PI / 180 + rmoes.ae * Math.sin(rmoes.b * Math.PI / 180) / origSemi,
        arg: rmoes.m * Math.PI / 180 - rmoes.b * Math.PI / 180,
        tA: rmoes.b * Math.PI / 180
    }
    let coeInit = Object.values(Coe2PosVelObject(rmoeCoes))
    let chief = Coe2PosVelObject(originOrbit)
    return Eci2Ric(Object.values(chief).slice(0,3), Object.values(chief).slice(3,6), coeInit.slice(0,3), coeInit.slice(3,6))
}

function initStateFunction(el) {
    let nodes; // Set nodes to top div under initial state to grab inputs
    nodes = el.parentNode.parentNode.parentNode;
    if (el.classList.contains('rmoe')) {
        let rmoes = {
            ae: Number(nodes.children[0].children[0].getElementsByTagName('input')[0].value),
            x:  Number(nodes.children[0].children[1].getElementsByTagName('input')[0].value),
            y:  Number(nodes.children[0].children[2].getElementsByTagName('input')[0].value),
            b:  Number(nodes.children[0].children[3].getElementsByTagName('input')[0].value),
            z:  Number(nodes.children[0].children[4].getElementsByTagName('input')[0].value),
            m:  Number(nodes.children[0].children[5].getElementsByTagName('input')[0].value)
        }
        ricInit = rmoeToRic(rmoes)
        nodes.children[1].children[0].getElementsByTagName('input')[0].value = ricInit.rHcw[0][0].toFixed(3)
        nodes.children[1].children[1].getElementsByTagName('input')[0].value = ricInit.rHcw[1][0].toFixed(3);
        nodes.children[1].children[2].getElementsByTagName('input')[0].value = ricInit.rHcw[2][0].toFixed(3);
        nodes.children[1].children[3].getElementsByTagName('input')[0].value = (1000*ricInit.drHcw[0][0]).toFixed(3);
        nodes.children[1].children[4].getElementsByTagName('input')[0].value = (1000*ricInit.drHcw[1][0]).toFixed(3);
        nodes.children[1].children[5].getElementsByTagName('input')[0].value = (1000*ricInit.drHcw[2][0]).toFixed(3);
    }
    else if (el.id === 'add-satellite-button') {
        let inputs = [...document.querySelectorAll('.sat-input')]
        let radioId = [...document.getElementsByName('sat-input-radio')].filter(s => s.checked)[0].id
        let eciState, ricState, eciOrigin, startDate, relOrigin, date, dt, coeState, long, driftRate
        switch (radioId) {
            case 'ric-sat-input':
                relOrigin = Number(document.querySelector('#sat-input-origin').value)
                ricState = [
                    Number(inputs[0].value),
                    Number(inputs[1].value),
                    Number(inputs[2].value),
                    Number(inputs[3].value) / 1000,
                    Number(inputs[4].value) / 1000,
                    Number(inputs[5].value) / 1000,
                ]
                relOrigin = relOrigin > -1 ? mainWindow.satellites[relOrigin].position : mainWindow.originOrbit
                eciOrigin = Object.values(Coe2PosVelObject(relOrigin))
                eciState = Ric2Eci(ricState.slice(0,3), ricState.slice(3,6), eciOrigin.slice(0,3), eciOrigin.slice(3,6))
                eciState = [...eciState.rEcci, ...eciState.drEci]
                break
            case 'eci-sat-input':
                date = new Date(inputs[0].value)
                if (mainWindow.satellites.length === 0) {
                    mainWindow.startDate = date
                }
                startDate = date
                eciState = inputs.slice(1,7).map(s => s.value === '' ? Number(s.placeholder) : Number(s.value))
                dt = (mainWindow.startDate - date) / 1000
                // If not first satellte, prop to scenario start time
                eciState = mainWindow.satellites.length === 0 ? eciState : propToTime(eciState, dt)
                break
            case 'coe-sat-input':
                date = new Date(inputs[0].value)
                if (mainWindow.satellites.length === 0) {
                    mainWindow.startDate = date
                }
                startDate = date
                coeState = inputs.slice(1,7).map(s => s.value === '' ? Number(s.placeholder) : Number(s.value))
                coeState = {
                    a: coeState[0],
                    e: coeState[1],
                    i: coeState[2] * Math.PI / 180,
                    raan: coeState[3] * Math.PI / 180,
                    arg: coeState[4] * Math.PI / 180,
                    tA: coeState[5] * Math.PI / 180,
                }
                eciState = Object.values(Coe2PosVelObject(coeState))
                dt = (mainWindow.startDate - date) / 1000
                // If not first satellite, prop to scenario start time
                eciState = mainWindow.satellites.length === 0 ? eciState : propToTime(eciState, dt)
                break
            case 'rmoe-sat-input':
                relOrigin = Number(document.querySelector('#sat-input-origin').value)
                relOrigin = relOrigin > -1 ? mainWindow.satellites[relOrigin].position : mainWindow.originOrbit
                let rmoes = [
                    inputs[0].value,
                    inputs[1].value,
                    inputs[2].value,
                    inputs[3].value,
                    inputs[4].value,
                    inputs[5].value,
                ].map((s,ii) => Number(s))
                ricState = rmoeToRic({
                    ae: rmoes[0],
                    x: rmoes[1],
                    y: rmoes[2],
                    b: rmoes[3],
                    z: rmoes[4],
                    m: rmoes[5]
                })
                ricState = math.squeeze([...ricState.rHcw, ...ricState.drHcw])
                eciOrigin = Object.values(Coe2PosVelObject(relOrigin))
                eciState = Ric2Eci(ricState.slice(0,3), ricState.slice(3,6), eciOrigin.slice(0,3), eciOrigin.slice(3,6))
                eciState = [...eciState.rEcci, ...eciState.drEci]
                break
            case 'geo-sat-input':
                date = mainWindow.startDate
                if (mainWindow.satellites.length === 0) {
                    date = new Date(inputs[0].value)
                    mainWindow.startDate = date
                    long = Number(inputs[1].value)
                    driftRate = Number(inputs[2].value)
                }
                else {
                    long = Number(inputs[0].value)
                    driftRate = Number(inputs[1].value)
                }
                console.log(date, long, driftRate);
                eciState = Object.values(Coe2PosVelObject(geoSatelliteAtLongitude(long, date, driftRate)))
                break
        }
        console.log(eciState);
        let position = PosVel2CoeNew(eciState.slice(0,3), eciState.slice(3,6))
        if (mainWindow.satellites.length === 0) {
            if (radioId === 'eci-sat-input' || radioId === 'coe-sat-input') {
                mainWindow.startDate = new Date(document.querySelector('.sat-input').value)
            }
            mainWindow.updateOrigin(position, true, true)
            showScreenAlert('RIC frame centered on initial satellite')
        }
        let styleInputs = document.querySelectorAll('.sat-style-input')
        mainWindow.satellites.push(new Satellite({
            position,
            shape: styleInputs[0].value,
            a: Number(styleInputs[1].value === '' ? styleInputs[1].placeholder : styleInputs[1].value) / 1000000,
            color: styleInputs[2].value,
            name: styleInputs[3].value === '' ? 'Sat' + (mainWindow.satellites.length + 1) : styleInputs[3].value
        }))
        document.title = mainWindow.satellites.map(sat => sat.name).join(' / ');
        updateWhiteCellWindow()
        closeAll();
    }
    // else if (el.id === 'add-launch-button') addLaunch();
    else {
        if (el.classList.contains('panel-button')) {
            nodes = el.parentNode.parentNode.children[1];
        }
        let cartInputs = nodes.getElementsByTagName('input');
        let state = {
            r: Number(cartInputs[6].value),
            i: Number(cartInputs[7].value),
            c: Number(cartInputs[8].value),
            rd: Number(cartInputs[9].value) / 1000,
            id: Number(cartInputs[10].value) / 1000,
            cd: Number(cartInputs[11].value) / 1000
        };
        if (el.classList.contains('panel-button')) {
            let a = Math.pow(398600.4418 / Math.pow(mainWindow.mm, 2), 1/3);
            let ang = state.i / a * 180 / Math.PI;
            state.r += (a - a * Math.cos(ang * Math.PI / 180 ) * Math.cos(state.c / a));
            let rotState = math.squeeze(math.multiply(rotationMatrices(-ang, 3), [[state.rd], [state.id], [state.cd]]));
            state.rd = rotState[0];
            state.id = rotState[1];
            rotState = math.squeeze(math.multiply(rotationMatrices(-ang, 3), [[state.r], [0], [0]]));
            cartInputs[6].value = (rotState[0]).toFixed(3);
            cartInputs[7].value = (state.i + rotState[1]).toFixed(3);
            cartInputs[9].value = (state.rd * 1000).toFixed(3);
            cartInputs[10].value = (state.id * 1000).toFixed(3);
        }
        let eciOrigin = Object.values(Coe2PosVelObject(mainWindow.originOrbit))
        let eciDep = Ric2Eci(Object.values(state).slice(0,3), Object.values(state).slice(3,6), eciOrigin.slice(0,3), eciOrigin.slice(3,6))
        let coeDep = PosVel2CoeNew(eciDep.rEcci, eciDep.drEci)
        let driftRate = (398600.4418 / coeDep.a ** 3) ** 0.5 - (398600.4418 / mainWindow.originOrbit.a ** 3) ** 0.5
        driftRate *= 86164 * 180 / Math.PI
        let planeDiff = math.cos(mainWindow.originOrbit.i) * math.cos(coeDep.i) + math.sin(mainWindow.originOrbit.i) * math.sin(coeDep.i) * math.cos(coeDep.raan - mainWindow.originOrbit.raan)

        planeDiff = math.acos(planeDiff) * 180 / Math.PI
        
        cartInputs[1].value = driftRate.toFixed(3);
        cartInputs[2].value = (180 / Math.PI * math.atan2(state.i, state.r + mainWindow.originOrbit.a)).toFixed(3);
        cartInputs[0].value = (2 * Math.sqrt(Math.pow(3 * state.r + 2 * state.id / mainWindow.mm, 2) + Math.pow(state.rd / mainWindow.mm, 2))).toFixed(3);
        cartInputs[3].value = (Math.atan2(state.rd, 3 * mainWindow.mm * state.r + 2 * state.id) * 180 / Math.PI).toFixed(3);
        cartInputs[5].value = (Math.atan2(state.c, state.cd / mainWindow.mm) * 180 / Math.PI).toFixed(3);
        cartInputs[4].value = planeDiff.toFixed(3)

    }
    
}

function editSatellite(button) {
    if (button.innerText === 'Delete') {
        let delSat = button.nextSibling.selectedIndex
        mainWindow.satellites.splice(delSat, 1);
        mainWindow.relativeData.dataReqs = mainWindow.relativeData.dataReqs.filter(req => Number(req.target) !== delSat && Number(req.origin) !== delSat )
        for (let index = 0; index < mainWindow.relativeData.dataReqs.length; index++) {
            mainWindow.relativeData.dataReqs[index].origin = Number(mainWindow.relativeData.dataReqs[index].origin) > delSat ? Number(mainWindow.relativeData.dataReqs[index].origin) - 1 : mainWindow.relativeData.dataReqs[index].origin
            mainWindow.relativeData.dataReqs[index].target = Number(mainWindow.relativeData.dataReqs[index].target) > delSat ? Number(mainWindow.relativeData.dataReqs[index].target) - 1 : mainWindow.relativeData.dataReqs[index].target
        }
        resetDataDivs()
        updateWhiteCellWindow()
        document.title = mainWindow.satellites.map(s => s.name).join(' / ')
        closeAll();
        return;
    }
    if (button.nextSibling.selectedIndex < 0) return;
    let inputs = [...document.querySelectorAll('.sat-input')]
    let radioId = [...document.getElementsByName('sat-input-radio')].filter(s => s.checked)[0].id
    let originState = Object.values(Coe2PosVelObject(mainWindow.originOrbit))
    let eciState, ricState, eciOrigin, startDate, relOrigin, date, dt, coeState
    switch (radioId) {
        case 'ric-sat-input':
            relOrigin = Number(document.querySelector('#sat-input-origin').value)
            ricState = [
                Number(inputs[0].value),
                Number(inputs[1].value),
                Number(inputs[2].value),
                Number(inputs[3].value) / 1000,
                Number(inputs[4].value) / 1000,
                Number(inputs[5].value) / 1000,
            ]
            relOrigin = relOrigin > -1 ? mainWindow.satellites[relOrigin].position : mainWindow.originOrbit
            eciOrigin = Object.values(Coe2PosVelObject(relOrigin))
            eciState = Ric2Eci(ricState.slice(0,3), ricState.slice(3,6), eciOrigin.slice(0,3), eciOrigin.slice(3,6))
            eciState = [...eciState.rEcci, ...eciState.drEci]
            break
        case 'eci-sat-input':
            date = new Date(inputs[0].value)
            if (mainWindow.satellites.length === 0) {
                mainWindow.startDate = date
            }
            startDate = date
            eciState = inputs.slice(1,7).map(s => s.value === '' ? Number(s.placeholder) : Number(s.value))
            dt = (mainWindow.startDate - date) / 1000
            // If not first satellte, prop to scenario start time
            eciState = mainWindow.satellites.length === 0 ? eciState : propToTime(eciState, dt)
            break
        case 'coe-sat-input':
            date = new Date(inputs[0].value)
            if (mainWindow.satellites.length === 0) {
                mainWindow.startDate = date
            }
            startDate = date
            coeState = inputs.slice(1,7).map(s => s.value === '' ? Number(s.placeholder) : Number(s.value))
            coeState = {
                a: coeState[0],
                e: coeState[1],
                i: coeState[2] * Math.PI / 180,
                raan: coeState[3] * Math.PI / 180,
                arg: coeState[4] * Math.PI / 180,
                tA: coeState[5] * Math.PI / 180,
            }
            eciState = Object.values(Coe2PosVelObject(coeState))
            dt = (mainWindow.startDate - date) / 1000
            // If not first satellite, prop to scenario start time
            eciState = mainWindow.satellites.length === 0 ? eciState : propToTime(eciState, dt)
            break
        case 'rmoe-sat-input':
            relOrigin = Number(document.querySelector('#sat-input-origin').value)
            relOrigin = relOrigin > -1 ? mainWindow.satellites[relOrigin].position : mainWindow.originOrbit
            let rmoes = [
                inputs[0].value,
                inputs[1].value,
                inputs[2].value,
                inputs[3].value,
                inputs[4].value,
                inputs[5].value,
            ].map((s,ii) => Number(s))
            ricState = rmoeToRic({
                ae: rmoes[0],
                x: rmoes[1],
                y: rmoes[2],
                b: rmoes[3],
                z: rmoes[4],
                m: rmoes[5]
            })
            ricState = math.squeeze([...ricState.rHcw, ...ricState.drHcw])
            eciOrigin = Object.values(Coe2PosVelObject(relOrigin))
            eciState = Ric2Eci(ricState.slice(0,3), ricState.slice(3,6), eciOrigin.slice(0,3), eciOrigin.slice(3,6))
            eciState = [...eciState.rEcci, ...eciState.drEci]
            break
        case 'geo-sat-input':
            eciState = Object.values(Coe2PosVelObject(geoSatelliteAtLongitude(Number(inputs[0].value))))
            break
    }   
    eciState = PosVel2CoeNew(eciState.slice(0,3), eciState.slice(3,6))
    let color = mainWindow.satellites[button.nextSibling.selectedIndex].color;
    let name = mainWindow.satellites[button.nextSibling.selectedIndex].name;
    let shape = mainWindow.satellites[button.nextSibling.selectedIndex].shape;
    let a = mainWindow.satellites[button.nextSibling.selectedIndex].a;
    let sat = new Satellite({
        position: eciState,
        color,
        shape,
        a,
        name
    });
    mainWindow.satellites[button.nextSibling.selectedIndex] = sat;
    mainWindow.satellites[button.nextSibling.selectedIndex].calcTraj();
    let curPos = mainWindow.satellites[button.nextSibling.selectedIndex].currentPosition();
    mainWindow.satellites[button.nextSibling.selectedIndex].curPos = {r: curPos[0], i: curPos[1], c: curPos[2], rd: curPos[3], id: curPos[4], cd: curPos[5]}
    mainWindow.satellites[button.nextSibling.selectedIndex].originDate = Date.now()
    closeAll();
}

function drawPoints(options = {}) {
    let {
        color,
        points,
        borderWidth = 1,
        borderColor = 'white',
        ctx = ctx,
        origin
    } = options;
    ctx.fillStyle = color;
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = borderWidth;
    ctx.beginPath();
    points.forEach((point, ii) => {
        if (ii === 0) {
            ctx.moveTo(origin[0] + point[0], origin[1] + point[1]);
        } else {
            ctx.lineTo(origin[0] + point[0], origin[1] + point[1]);
        }
    });
    ctx.fill();

}

function drawSatellite(satellite = {}) {
    let {cnvs, ctx, pixelPosition, shape, color, size, name} = satellite;
    let shapeHeight = size / 100 * (cnvs.height < cnvs.width ? cnvs.height: cnvs.width);
    let points;
    let a = shapeHeight / 2;
    let b = shapeHeight / 5;
    switch (shape) {
        case 'triangle':
            points = [
                [0, -shapeHeight / 2],
                [-shapeHeight / 2, shapeHeight / 2],
                [shapeHeight / 2, shapeHeight / 2],
                [0, -shapeHeight / 2]
            ];
            drawPoints({
                points: points,
                color: color,
                origin: pixelPosition,
                ctx
            });
            break;
        case 'square':
            points = [
                [-shapeHeight / 2, -shapeHeight / 2],
                [shapeHeight / 2, -shapeHeight / 2],
                [shapeHeight / 2, shapeHeight / 2],
                [-shapeHeight / 2, shapeHeight / 2],
                [-shapeHeight / 2, -shapeHeight / 2]
            ];
            drawPoints({
                points: points,
                color: color,
                origin: pixelPosition,
                ctx
            });
            break;
        case 'up-triangle':
            points = [
                [0, shapeHeight / 2],
                [-shapeHeight / 2, -shapeHeight / 2],
                [shapeHeight / 2, -shapeHeight / 2],
                [0, shapeHeight / 2]
            ];
            drawPoints({
                points: points,
                color: color,
                origin: pixelPosition,
                ctx
            });
            break;
        case 'circle':
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(pixelPosition[0], pixelPosition[1], shapeHeight / 2, 0, 2 * Math.PI)
            ctx.fill()
            break;
        case 'delta':
            
            a *= 1.1;
            b *= 1.1;
            points = [
                [0, -a],
                [-3.3*shapeHeight / 8, a],
                [0, shapeHeight / 4],
                [3.3*shapeHeight / 8, a],
                [0, -a]
            ];
            drawPoints({
                points: points,
                color: color,
                origin: pixelPosition,
                ctx
            });
            break;
        case 'diamond':
            points = [];
            points.push([a*Math.sin(-70*Math.PI / 180), -a*Math.cos(-70*Math.PI / 180)])
            points.push([a*Math.sin(-38*Math.PI / 180), -a*Math.cos(-38*Math.PI / 180)])
            points.push([a*Math.sin(38*Math.PI / 180), -a*Math.cos(38*Math.PI / 180)])
            points.push([a*Math.sin(70*Math.PI / 180), -a*Math.cos(70*Math.PI / 180)])
            points.push([0, 0.9*a])
            points.push([a*Math.sin(-70*Math.PI / 180), -a*Math.cos(-70*Math.PI / 180)])
            drawPoints({
                points: points,
                color: color,
                origin: pixelPosition,
                ctx
            });
            break;
        case 'star':
            points = [];
            a *= 1.1;
            b *= 1.1;
            for (let ang = 0; ang <= 360; ang += 72) {
                points.push([a*Math.sin(ang*Math.PI / 180), -a*Math.cos(ang*Math.PI / 180)])
                points.push([b*Math.sin((36+ang)*Math.PI / 180), -b*Math.cos((36+ang)*Math.PI / 180)])
            }
            drawPoints({
                points: points,
                color: color,
                origin: pixelPosition,
                ctx
            });
            break;
        case '4-star':
            points = [];
            a *= 1.1;
            b *= 1.1;
            for (let ang = 0; ang <= 360; ang += 90) {
                points.push([a*Math.sin(ang*Math.PI / 180), -a*Math.cos(ang*Math.PI / 180)])
                points.push([b*Math.sin((45+ang)*Math.PI / 180), -b*Math.cos((45+ang)*Math.PI / 180)])
            }
            drawPoints({
                points: points,
                color: color,
                origin: pixelPosition,
                ctx
            });
            break;
        case '3-star':
            points = [];
            a *= 1.2;
            b *= 1.2;
            for (let ang = 0; ang <= 360; ang += 120) {
                points.push([a*Math.sin(ang*Math.PI / 180), -a*Math.cos(ang*Math.PI / 180)])
                points.push([0.7*b*Math.sin((60+ang)*Math.PI / 180), -0.7*b*Math.cos((60+ang)*Math.PI / 180)])
            }
            drawPoints({
                points: points,
                color: color,
                origin: pixelPosition,
                ctx
            });
            break;
        case 'pentagon':
            points = [];
            for (let ang = 0; ang <= 360; ang += 72) {
                points.push([a*Math.sin(ang*Math.PI / 180), -a*Math.cos(ang*Math.PI / 180)])
            }
            drawPoints({
                points: points,
                color: color,
                origin: pixelPosition,
                ctx
            });
            break;
        case 'hexagon':
            points = [];
            for (let ang = 0; ang <= 360; ang += 60) {
                points.push([a*Math.sin(ang*Math.PI / 180), -a*Math.cos(ang*Math.PI / 180)])
            }
            drawPoints({
                points: points,
                color: color,
                origin: pixelPosition,
                ctx
            });
            break;
        case 'septagon':
            points = [];
            for (let ang = 0; ang <= 361; ang += 360/7) {
                points.push([a*Math.sin(ang*Math.PI / 180), -a*Math.cos(ang*Math.PI / 180)])
            }
            drawPoints({
                points: points,
                color: color,
                origin: pixelPosition,
                ctx
            });
            break;
        case 'octagon':
            points = [];
            for (let ang = 0; ang <= 361; ang += 360/8) {
                points.push([a*Math.sin(ang*Math.PI / 180), -a*Math.cos(ang*Math.PI / 180)])
            }
            drawPoints({
                points: points,
                color: color,
                origin: pixelPosition,
                ctx
            });
            break;
    }
    
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    let letterY = pixelPosition[1] + shapeHeight / 2 + size * 2.5
    ctx.font = `${size * 5}px Courier`;
    ctx.strokeStyle = mainWindow.colors.foregroundColor
    ctx.strokeText(name ? shortenString(name) : '', pixelPosition[0], letterY);
    // ctx.fillText(name ? shortenString(name) : '', pixelPosition[0], letterY);
    // ctx.strokeText(name ? shortenString(name) : '', pixelPosition[0], letterY);
}

function getRelativeData(n_target, n_origin, intercept = true, intTime = 1) {
    let sunAngle, moonAngle, rangeRate, range, poca, toca, tanRate, rangeStd, relPos, relVel, relPosHis, interceptData;
    try {
        let relState = math.subtract(Object.values(mainWindow.satellites[n_origin].curPos), Object.values(mainWindow.satellites[n_target].curPos))
        relPos = relState.slice(0,3)
        relVel = relState.slice(3,6)
        range = math.norm(relPos);
        if (monteCarloData !== null) {
            if (n_target == monteCarloData.sat) {
                let rData = monteCarloData.points.map(p => math.norm(math.subtract(Object.values(p).slice(0,3), math.squeeze(mainWindow.satellites[n_origin].getPositionArray()))))
                let rDataAve = rData.reduce((a,b) => a + b, 0) / rData.length
                rangeStd = (rData.reduce((a, b) => a + (b - rDataAve) ** 2, 0) / (rData.length-1)) ** 0.5
            }
        }
        sunAngle = mainWindow.getCurrentSun()
        sunAngle = math.acos(math.dot(relPos, sunAngle) / range / math.norm(sunAngle)) * 180 / Math.PI;
        sunAngle = mainWindow.zeroCatsGood ? 180 - sunAngle : sunAngle;
        moonAngle = mainWindow.getCurrentMoon()
        moonAngle = math.acos(math.dot(relPos, moonAngle) / range / math.norm(moonAngle)) * 180 / Math.PI;
        moonAngle = mainWindow.zeroCatsGood ? 180 - moonAngle : moonAngle; // Appropriate for USSF
        rangeRate = math.dot(relVel, relPos) * 1000 / range;
        // tanRate = Math.sqrt(Math.pow(math.norm(relVel), 2) - Math.pow(rangeRate, 2)) * 1000;
        relPosHis = findMinDistance(mainWindow.satellites[n_origin].stateHistory, mainWindow.satellites[n_target].stateHistory);

        poca = math.min(relPosHis);
        toca = relPosHis.findIndex(element => element === poca) * mainWindow.timeDelta;
        if (intercept !== false) {
            let point1 = mainWindow.satellites[n_target].currentPosition()
            let point2 = mainWindow.satellites[n_origin].currentPosition({time: mainWindow.scenarioTime + intTime*3600})
            let burn = hcwFiniteBurnOneBurn({
                x: point1[0],
                y: point1[1],
                z: point1[2],
                xd: point1[3],
                yd: point1[4],
                zd: point1[5]
            }, {
                x: point2[0],
                y: point2[1],
                z: point2[2],
                xd: point2[3],
                yd: point2[4],
                zd: point2[5]
            }, intTime*3600, mainWindow.satellites[n_target].a, mainWindow.scenarioTime)
            if (burn) {
                // If intercept is within reach, draw intercept trajectory and 
                // Display data
                let burnDuration = burn.t[0] * intTime*3600
                let state = Object.values(burn.F)
                let stateHist = [], t = intTime*3600-burnDuration, dt = t / 20
                for (let ii = 0; ii < 20; ii++) {
                    state = propRelMotionTwoBodyAnalytic(state, -dt, mainWindow.scenarioTime + t)
                    stateHist.push(state)
                    t -= dt
                }
                mainWindow.drawCurve(stateHist, {color: 'rgba(100,100,100,0.5)'})
                let lastTimeStepOrigin = [burn.F.x - burn.F.xd, burn.F.y - burn.F.yd, burn.F.z - burn.F.zd]
                let lastTimeStepTarget = math.subtract(point2.slice(0,3), point2.slice(3,6))// [point2[0] -  point2.rd[0], point2.i[0] -  point2.id[0], point2.c[0] -  point2.cd[0]]
                let relPosInter = math.subtract(lastTimeStepOrigin, lastTimeStepTarget)
                let sunInter = mainWindow.getCurrentSun(mainWindow.scenarioTime + intTime*3600-1)
                let sunAng = math.acos(math.dot(sunInter, relPosInter) / math.norm(sunInter) / math.norm(relPosInter)) * 180 / Math.PI
                interceptData = {
                    dV: math.norm([burn.r, burn.i, burn.c]),
                    relVel: math.norm(math.subtract([burn.F.xd, burn.F.yd, burn.F.zd], point2.slice(3,6))),
                    sunAng
                }
                interceptData = `\ndV ${(1000*interceptData.dV).toFixed(1)} m/s\nCATS ${(interceptData.sunAng).toFixed(1)} deg\nRelVel ${(1000*interceptData.relVel).toFixed(1)} m/s`
            } else {
                interceptData = '\nOutside of\nKinematic\nReach'
            }
        }
    }
    catch (err) {
        console.log(err)
        return {
            sunAngle: 0,
            rangeRate: 0,
            range: 0,
            rangeStd: 0,
            poca: 0,
            toca: 0,
            tanRate: 0,
            relativeVelocity: 0,
            interceptData: '\nOutside of\nKinematic\nReach'
        }
    }
    
    return {
        sunAngle,
        moonAngle,
        rangeRate,
        range,
        rangeStd,
        poca,
        toca,
        tanRate,
        relativeVelocity: math.norm(relVel)*1000,
        interceptData
    }
}

function findMinDistance(vector1, vector2) {
    let outVec = [];
    for (let jj = 0; jj < Math.min(vector1.length, vector2.length); jj++) {
        outVec.push(math.norm([vector1[jj].position[0] - vector2[jj].position[0], vector1[jj].position[1] - vector2[jj].position[1], vector1[jj].position[2] -
            vector2[jj].position[2]
        ]));
    }
    return outVec
}

function drawContinuousCurve(ctx, points) {
    ctx.beginPath();
    let point1 = points[0];
    var t = 1;
    for (var i = 0; i < points.length - 1; i++) {
        var p0 = (i > 0) ? points[i - 1] : point1;
        var p1 = points[i];
        var p2 = points[i + 1];
        var p3 = (i != points.length - 2) ? points[i + 2] : p2;

        var cp1x = p1.x + (p2.x - p0.x) / 6 * t;
        var cp1y = p1.y + (p2.y - p0.y) / 6 * t;

        var cp2x = p2.x - (p3.x - p1.x) / 6 * t;
        var cp2y = p2.y - (p3.y - p1.y) / 6 * t;
        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
    }
    ctx.stroke();
}

function generateData(sat1 = 1, sat2 = 0) {
    if (mainWindow.satellites.length < 2) return;
    mainWindow.plotSettings.data = [];
    let state1 = mainWindow.satellites[sat1].currentPosition();
    for (let tMan = 900; tMan < 86164; tMan += 3600) {

        let curTime = mainWindow.desired.scenarioTime;
        let state2 = mainWindow.satellites[sat2].currentPosition({time: curTime + tMan});
        let dir = hcwFiniteBurnOneBurn({
            x: state1.r[0],
            y: state1.i[0],
            z: state1.c[0],
            xd: state1.rd[0],
            yd: state1.id[0],
            zd: state1.cd[0]
        }, {
            x: state2.r[0],
            y: state2.i[0],
            z: state2.c[0],
            xd: 0,
            yd: 0,
            zd: 0
        }, tMan, mainWindow.satellites[1].a);
        if (dir && dir.t > 0 && dir.t < 1) {
            sunAngle = math.acos(math.dot([-dir.F.xd, -dir.F.yd, -dir.F.zd], mainWindow.getCurrentSun(curTime + tMan)) / math.norm([dir.F.xd, dir.F.yd, dir.F.zd])) * 180 / Math.PI;
            mainWindow.plotSettings.data.push([tMan, dir.t[0] * tMan * mainWindow.satellites[sat1].a, sunAngle]);
        }
    }
}

function generateDataImpulsive(sat1 = 1, sat2 = 0) {
    if (mainWindow.satellites.length < 2) return;
    mainWindow.plotSettings.data = [];
    let state1 = mainWindow.satellites[sat1].currentPosition();
    for (let tMan = 900; tMan < 14400; tMan += 3600) {

        let curTime = mainWindow.desired.scenarioTime;
        let state2 = mainWindow.satellites[sat2].currentPosition({time: curTime + tMan});
        let outputV = proxOpsTargeter([state1.r, state1.i, state1.c], [state2.r, state2.i, state2.c], tMan)
        let v1 = outputV[0];
        let v2 = outputV[1];
        // console.log(v1,v2);
        sunAngle = math.acos(math.dot([-v2[0][0], -v2[1][0], -v2[2][0]], mainWindow.getCurrentSun(curTime + tMan)) / math.norm([-v2[0][0], -v2[1][0], -v2[2][0]]) / math.norm(mainWindow.getCurrentSun(curTime + tMan))) * 180 / Math.PI;
        if (isNaN(sunAngle)) {

        }
        mainWindow.plotSettings.data.push([tMan, math.norm(math.squeeze(math.subtract(v1, [state1.rd, state1.id, state1.cd]))), sunAngle]);
    }
}

function findRotationMatrix(v1 = [1, 0, 0], v2 = mainWindow.getCurrentSun(mainWindow.scenarioTime + 7200)) {
    v1 = math.dotDivide(v1, math.norm(v1));
    v2 = math.dotDivide(v2, math.norm(v2));
    let eulerAxis = math.cross(v1, v2);
    eulerAxis = math.dotDivide(eulerAxis, math.norm(eulerAxis));
    let x = eulerAxis[0], y = eulerAxis[1], z = eulerAxis[2];
    let eulerAngle = math.acos(math.dot(v1,v2));
    if (eulerAngle < 1e-7) return false;
    let c = math.cos(eulerAngle), s = math.sin(eulerAngle);
    return [[c + x*x*(1-c), x*y*(1-c)-z*s, x*z*(1-c)+y*s],
             [y*x*(1-c)+z*s, c + y*y*(1-c), y*z*(1-c)-x*s],
             [x*z*(1-c)-y*s, z*y*(1-c)+x*s, c + z*z*(1-c)]]
}

function drawAngleCircle(r = 10, angle = 60, tof = 7200) {
    angle = angle * Math.PI / 180;
    let circleR = r * Math.sin(angle);
    let reducedR = r * Math.cos(angle);
    let circleCoor = [];
    let R = findRotationMatrix([1,0,0], mainWindow.getCurrentSun(mainWindow.scenarioTime + tof));
    // R = [[1,0,0],[0,1,0],[0,0,1]];
    let ranges = math.range(r / 2, r, r / 6, true)._data;
    ranges = [r]
    let angles = math.range(0, angle, angle / 8, true)._data;
    for (let jj = 0; jj <= angles.length; jj ++) {
        for (let kk = 0; kk <= ranges.length; kk ++) {
            circleR = ranges[kk] * Math.sin(angles[jj]);
            reducedR = ranges[kk] * Math.cos(angles[jj]);
            for (let ii = 0; ii <= 360; ii+=15) {
                let tempAngle = [reducedR, Math.cos(ii * Math.PI / 180) * circleR, Math.sin(ii * Math.PI / 180) * circleR]
                circleCoor.push(math.transpose(math.multiply(R, math.transpose(tempAngle))));
            }
        }
    }
    return circleCoor;
}

function findDvFiniteBurn(r1, r2, a, tf) {
    let dir = hcwFiniteBurnOneBurn({x: r1[0], y: r1[1], z: r1[2], xd: r1[3], yd: r1[4], zd: r1[5]}, {x: r2.r, y: r2.i, z: r2.c, xd: 0, yd: 0, zd: 0}, tf, a);
    return dir ? dir.t[0]*tf*a : 10000;
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
        while (Math.abs(del) > 1e-4) {
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

function twoBodyRpo(state = [-1.89733896, 399.98, 0, 0, 0, 0], options = {}) {
    let {mu = 398600.4418, r0 = 42164, a = [0,0,0], time= 0} = options;
    let n, ndot;
    if (mainWindow.originOrbit.e > 1e-6) {
        let inertChief = {...mainWindow.originOrbit}
        inertChief.tA = propTrueAnomaly(inertChief.tA, inertChief.a, inertChief.e, time)
        inertChief = Coe2PosVelObject(inertChief, true)
        let r = math.norm([inertChief.x, inertChief.y, inertChief.z])
        let radRate = math.dot([inertChief.x, inertChief.y, inertChief.z], [inertChief.vx, inertChief.vy, inertChief.vz]) / r
        let tanRate = (math.norm([inertChief.vx, inertChief.vy, inertChief.vz]) ** 2 - radRate ** 2) ** (1/2)
        
        n = tanRate / r
        ndot = -2 * radRate * n / r
        r0 = r;
    }
    else {
        n = mainWindow.mm
        ndot = 0
        r0 = (398600.4418 / n **2) **(1/3)
    }
    let x = state[0], y = state[1], z = state[2], dx = state[3], dy = state[4], dz = state[5];
    let rT = ((r0 + x) ** 2 + y ** 2 + z ** 2) ** (1.5);
    return [
        dx,
        dy,
        dz,
        -mu * (r0 + x) / rT+ mu / r0 ** 2 + 2 * n * dy + n ** 2 * x + ndot * y +  a[0] + mainWindow.extraAcc[0],
        -mu * y / rT - 2 * n * dx - ndot * x + n ** 2 * y + a[1] + mainWindow.extraAcc[1],
        -mu * z / rT + a[2] + mainWindow.extraAcc[2]
    ];
}

function runge_kutta(eom, state, dt, a = [0,0,0], time = 0) {
    if (mainWindow.prop === 4) {
        let k1 = eom(state, {a, time});
        let k2 = eom(math.add(state, math.dotMultiply(dt/2, k1)), {a, time: time + dt/2});
        let k3 = eom(math.add(state, math.dotMultiply(dt/2, k2)), {a, time: time + dt/2});
        let k4 = eom(math.add(state, math.dotMultiply(dt/1, k3)), {a, time: time + dt});
        return math.add(state, math.dotMultiply(dt / 6, (math.add(k1, math.dotMultiply(2, k2), math.dotMultiply(2, k3), k4))));
    }
    let k1 = eom(state, {a, time});
    let k2 = eom(math.add(state, math.dotMultiply(dt/2, k1)), {a, time: time + dt/2});
    return math.add(state, math.dotMultiply(dt, k2));
}

function getCurrentPosition(options = {}) {
    let {time = mainWindow.scenarioTime} = options;
    if (this.stateHistory === undefined) {
        this.calcTraj()
        return [0,0,0,0,0,0]
    }
    let index = this.stateHistory.findIndex(s => s.t > time) - 1
    index = index < 0 ? this.stateHistory.length - 1 : index
    let indexTime = this.stateHistory[index].t
    let position = this.stateHistory[index].position
    // Find all burns that have any duration inside the timeDelta period
    let burnsWithin = this.burns.map(b => {
        let mag_a = math.norm(b.direction) / this.a
        let endTime = time
        let burnEnd = b.time + mag_a
        let burnStart = b.time < indexTime ? indexTime : b.time
        burnEnd = burnEnd > endTime ? endTime : burnEnd
        if (burnEnd < indexTime) return false
        if (burnStart > endTime) return false
        return {
            burnStart,
            burnEnd,
            direction: b.direction.map(s => s * 1/mag_a)
        }
    }).filter(b => b !== false)
    let tProp = indexTime
    for (let b = 0; b < burnsWithin.length; b++) {
        position = propRelMotionTwoBodyAnalytic(position, burnsWithin[b].burnStart - tProp, tProp)
        position = runge_kutta(twoBodyRpo, position, burnsWithin[b].burnEnd-burnsWithin[b].burnStart, burnsWithin[b].direction, burnsWithin[b].burnStart)
        tProp = burnsWithin[b].burnEnd
    }
    // position = propRelMotionTwoBodyAnalytic(position, time-tProp, tProp)
    // position = runge_kutta(twoBodyRpo, position, time-tProp, [0,0,0], tProp)
    position = propRelMotionTwoBodyAnalytic(position, time-tProp, tProp)
    return position
}

function getCurrentPositionOld(options = {}) {
    let {time = mainWindow.scenarioTime, burn} = options;
    let index = this.stateHistory.findIndex(s => s.t >= time)
    index = index < 2 ? 2 : index
    if (index === -1) {
        index = this.stateHistory.length - 1
    }
    let indexVector = [index-1,index,index+1].map(s => [this.stateHistory[s].t, this.stateHistory[s].position])
    indexVector = [[indexVector[0][0],indexVector[1][0],indexVector[2][0]],[indexVector[0][1],indexVector[1][1],indexVector[2][1]]]
    let elements = []
    for (let index = 0; index < 6; index++) {
        elements.push(fitPolynomialRedux(indexVector[0], indexVector[1].map(s => s[index]))) 
    }
    let position = elements.map(s => answerPolynomial(s, time))
    return position
}

function addLaunch() {
    var long = prompt("Longitude relative to satellite", "0");
    if (long == null) return
    var lat = prompt("Latitude", "0");
    if (lat == null) return
    let checkValue = 1000;
    let semiAxis = (398600.4418 / mainWindow.mm**2)**(1/3);
    let periodOrbit = 2 * Math.PI * (semiAxis ** 3 / 398600.4418) ** (1/2)
    let tof =  periodOrbit * 0.25 * 0.75;
    let r2 = [0, semiAxis, 0, -((398600.4418 / semiAxis) ** (1/2)), 0, 0];
    let r1 = [-Math.sin(long * Math.PI / 180) * Math.cos(lat * Math.PI / 180) * 6371, Math.cos(long * Math.PI / 180) * Math.cos(lat * Math.PI / 180) * 6371, Math.sin(lat * Math.PI / 180) * 6371];
    let kk = 0;
    let tofHis = [];
    while (math.abs(checkValue) > 1e-6 && kk < 100) {
        let tof2 = tof + 0.1;
        let tof1 = tof;
        let rEnd2 = math.squeeze(math.multiply(rotationMatrices(360 * tof2 / periodOrbit, 3),math.transpose([r2.slice(0,3)])));
        let rEnd1 = math.squeeze(math.multiply(rotationMatrices(360 * tof1 / periodOrbit, 3),math.transpose([r2.slice(0,3)])));
        let res2 = solveLambertsProblem(r1,rEnd2, tof2, 0, 1);
        let res1 = solveLambertsProblem(r1,rEnd1, tof1, 0, 1);
        if (res2 === 'collinear' || res1 === 'collinear') {
            showScreenAlert('Points are collinear, bug being worked, using last successful iteration')
            tof = tofHis[tofHis.length-1]
            break;
        }
        else if (res2 === 'no solution' || res1 === 'no solution') {
            showScreenAlert('Unknown error, using last successful ieteration')
            tof = tofHis[tofHis.length-1]
            return
        }
        let dRes = (math.dot(rEnd2, res2.v2) - math.dot(rEnd1, res1.v2)) / 0.1;
        tofHis.push(tof)
        tof += 0.1*(0 - math.dot(rEnd1, res1.v2)) / dRes;
        kk++;
    }
    let rEnd = math.squeeze(math.multiply(rotationMatrices(360 * tof / periodOrbit, 3),math.transpose([r2.slice(0,3)])));
    let res = solveLambertsProblem(r1,rEnd, tof, 0, 1);
    let resHcw = Eci2Ric(r2.slice(0,3), r2.slice(3,6), r1, res.v1);
    mainWindow.scenarioLength = tof / 3600;
    mainWindow.timeDelta = mainWindow.scenarioLength * 3600 / 334;
    document.getElementById('time-slider-range').max = mainWindow.scenarioLength * 3600;
    mainWindow.setAxisWidth('set',(semiAxis-6371) * 1.1 * 2)
    mainWindow.satellites.push(new Satellite({
        position: {r: resHcw.rHcw[0][0], i: resHcw.rHcw[1][0], c: resHcw.rHcw[2][0], rd: resHcw.drHcw[0][0], id: resHcw.drHcw[1][0], cd: resHcw.drHcw[2][0]},
        a: 0.025
    }));
    closeAll();
}

function solveLambertsProblem(r1_vec, r2_vec, tMan, Nrev, long, option = 1) {
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
    let p_i  = k / (el + option*Math.sqrt(2 * m));
    let p_ii  = k / (el - option*Math.sqrt(2 * m));
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

function Eci2Ric(rC, drC, rD, drD, c = false) {
    let h = math.cross(rC, drC);
    let ricX = math.dotDivide(rC, math.norm(rC));
    let ricZ = math.dotDivide(h, math.norm(h));
    let ricY = math.cross(ricZ, ricX);

    let ricXd = math.dotMultiply(1 / math.norm(rC), math.subtract(drC, math.dotMultiply(math.dot(ricX, drC), ricX)));
    let ricYd = math.cross(ricZ, ricXd);
    let ricZd = [0,0,0];

    let C = [ricX, ricY, ricZ];
    if (c) return C
    let Cd = [ricXd, ricYd, ricZd];
    return {
        rHcw: math.multiply(C, math.transpose([math.subtract(rD, rC)])),
        drHcw: math.add(math.multiply(Cd, math.transpose([math.subtract(rD, rC)])), math.multiply(C, math.transpose([math.subtract(drD, drC)])))
    }
}

function ConvEciToRic(chief_eci, deputy_eci, returnRot = false) {
    let rC = chief_eci.slice(0,3), drC = chief_eci.slice(3,6), rD = deputy_eci.slice(0,3), drD = deputy_eci.slice(3,6)
    let h = math.cross(rC, drC);
    let ricX = math.dotDivide(rC, math.norm(rC));
    let ricZ = math.dotDivide(h, math.norm(h));
    let ricY = math.cross(ricZ, ricX);

    let ricXd = math.dotMultiply(1 / math.norm(rC), math.subtract(drC, math.dotMultiply(math.dot(ricX, drC), ricX)));
    let ricYd = math.cross(ricZ, ricXd);
    let ricZd = [0,0,0];

    let C = [ricX, ricY, ricZ];
    let Cd = [ricXd, ricYd, ricZd];
    if (returnRot) return [C, Cd]
    return [
        ...math.squeeze(math.multiply(C, math.transpose([math.subtract(rD, rC)]))),
        ...math.squeeze(math.add(math.multiply(Cd, math.transpose([math.subtract(rD, rC)])), math.multiply(C, math.transpose([math.subtract(drD, drC)]))))
    ]
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
    let R = [
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

function Coe2PosVel(coe = {a: 42164.1401, e: 0, i: 0, raan: 0, arg: 0, tA: 0}, peri = false) {
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
    let R = [
        [cRa * cAr - sRa * sAr * cIn, -cRa * sAr - sRa * cAr * cIn, sRa * sin],
        [sRa * cAr + cRa * sAr * cIn, -sRa * sAr + cRa * cAr * cIn, -cRa * sin],
        [sAr * sin, cAr * sin, cIn]
    ];
    r = math.multiply(R, r);
    v = math.multiply(R, v);
    let state = [r, v];
    return [
        state[0][0][0],
        state[0][1][0],
        state[0][2][0],
        state[1][0][0],
        state[1][1][0],
        state[1][2][0]
    ];
}

function Ric2Eci(rHcw = [10,0,0], drHcw = [0,0,0], rC = [(398600.4418 / mainWindow.mm ** 2)**(1/3), 0, 0], drC = [0, (398600.4418 / ((398600.4418 / mainWindow.mm ** 2)**(1/3))) ** (1/2), 0]) {
    let h = math.cross(rC, drC);
    let rcN = math.norm(rC)
    let ricX = math.dotDivide(rC, rcN);
    let ricZ = math.dotDivide(h, math.norm(h));
    let ricY = math.cross(ricZ, ricX);

    let ricXd = math.dotMultiply(1 / rcN, math.subtract(drC, math.dotMultiply(math.dot(ricX, drC), ricX)));
    let ricYd = math.cross(ricZ, ricXd);
    let ricZd = [0,0,0];

    let C = math.transpose([ricX, ricY, ricZ]);
    let Cd = math.transpose([ricXd, ricYd, ricZd]);
    let rEci = math.squeeze(math.multiply(C, math.transpose([rHcw])))
    let drEci = math.squeeze(math.add(math.multiply(Cd, math.transpose([rHcw])), math.multiply(C, math.transpose([drHcw]))))
    return {
        rEcci: math.add(rEci, rC),
        drEci: math.add(drEci, drC)
    }
}

// function PosVel2CoeNew(r = [42157.71810012396, 735.866, 0], v = [-0.053652257639536446, 3.07372487580565, 0.05366]) {
// function PosVel2CoeNew(r = [6524.834, 6862.875, 6448.296], v = [4.901327, 5.533756, -1.976341]) {
function PosVel2CoeNew(r = [42164.14, 0, 0], v = [0, 3.0746611796284924, 0]) {
    let mu = 398600.4418
    let rn = math.norm(r)
    let vn = math.norm(v)
    let h = math.cross(r,v)
    let hn = math.norm(h)
    let n = math.cross([0,0,1], h)
    let e = math.dotDivide(math.subtract(math.dotMultiply(vn ** 2 - mu / rn, r), math.dotMultiply(math.dot(r, v), v)), mu)
    let en = math.norm(e)
    let specMechEn = vn ** 2 / 2 - mu / rn
    let a = -mu / 2 / specMechEn
    let i = math.acos(h[2] / hn)
    let raan = math.acos(n[0] / math.norm(n))
    if (n[1] < 0) {
        raan = 2 * Math.PI - raan
    }
    let arg = math.acos(math.dot(n, e) / math.norm(n) / en)
    if (arg.re !== undefined) {
        arg = arg.re
    }
    if (e[2] < 0) {
        arg = 2 * Math.PI - arg
    }
    let tA = math.acos(math.dot(e, r) / en / rn)
    if (tA.re !== undefined) {
        tA = tA.re
    }
    if (math.dot(r, v) < 0) {
        tA = 2 * Math.PI - tA
    }
    let longOfPeri, argLat, trueLong
    if (en < 1e-6 && i < 1e-6) {
        trueLong = math.acos(r[0] / rn)
        if (r[1] < 0) {
            trueLong = 2 * Math.PI - trueLong
        }
        arg = 0
        raan = 0
        tA = trueLong 
    }
    else if (en < 1e-6) {
        argLat = math.acos(math.dot(n, r) / math.norm(n) / rn)
        if (argLat.re !== undefined) {
            argLat = argLat.re
        }
        if (r[2] < 0) {
            argLat = 2 * Math.PI - argLat
        }
        arg = 0
        tA = argLat
    }
    else if (i < 1e-6) {
        longOfPeri = math.acos(e[0] / en)
        if (e[1] < 0) {
            longOfPeri = 2 * Math.PI - longOfPeri
        }
        raan = 0
        arg = longOfPeri
    }
    return {
        a,
        e: en,
        i,
        raan,
        arg,
        tA
    };
}

function addTestSatellites() {
    mainWindow.satellites.push(new Satellite({
        position: {
            r: 0,
            i: 0,
            c: 0,
            rd: 0,
            id: 0,
            cd: 0 
        },
        a: 0.0000001,
        name: 'Chaser'
    }))
    // mainWindow.satellites.push(new Satellite({
    //     position: {
    //         r: 0,
    //         i: 0,
    //         c: 0,
    //         rd: 0,
    //         id: 0,
    //         cd: 0 
    //     },
    //     a: 0.001,
    //     name: 'Target'
    // }))
}

function coastlinesToPoints(vantagePoint = Object.values(getCurrentInertial(0)).slice(0,3), satPoint = Object.values(getCurrentInertial(0)).slice(0,3), date = new Date(mainWindow.startDate - (-1000*mainWindow.scenarioTime))) {
    vantagePoint = astro.eci2ecef(vantagePoint, date)
    satPoint = astro.eci2ecef(satPoint, date)
    let satPointNorm = math.norm(satPoint)
    satPoint = satPoint.map(s => s/satPointNorm)
    let vPnorm = math.norm(vantagePoint)
    let vantagePointVec = vantagePoint.map(s => s/vPnorm)
    let rot = [math.cross(vantagePointVec, satPoint),  satPoint,vantagePointVec]
    // console.time('asdf')
    let coastlinePoints = coastlineEcefPoints.map(section => section.filter((point,ii) => math.dot(point, vantagePoint) > 0 && ii % 2 === 0).map(point => {
        point = math.multiply(rot, point)
        return [math.norm(point.slice(0,2)),math.atan2(point[1], point[0]), point[2]]
    }))
    // console.timeEnd('asdf')
    return coastlinePoints
} 

function testLambertSolutionMan() {
    addTestSatellites()

    let sat1 = 0, sat2 = 1, tf = 2*3600
    mainWindow.satellites[sat1].calcTraj()
    mainWindow.satellites[sat2].calcTraj()
    let r1 = mainWindow.satellites[sat1].currentPosition()
    let r2 = mainWindow.satellites[sat2].currentPosition()
    r1 = math.squeeze([r1.r, r1.i, r1.c, r1.rd, r1.id, r1.cd])
    r2 = math.squeeze([r2.r, r2.i, r2.c, r2.rd, r2.id, r2.cd])
    let inertOrbit1 = [(398600.4418 / mainWindow.mm ** 2) ** (1/3), 0, 0, 0, (398600.4418 / (398600.4418 / mainWindow.mm ** 2) ** (1/3)) ** (1/2), 0]
    let ang = tf * mainWindow.mm
    let rot = rotationMatrices(ang, 3, 'rad')
    let inertOrbit2 = math.squeeze(math.multiply(rot, math.transpose([inertOrbit1.slice(0,3)])).concat(math.multiply(rot, math.transpose([inertOrbit1.slice(3,6)]))))
    // Convert both to inertial, r2 in future
    // Ric2Eci(rHcw = [0,0,0], drHcw = [0,0,0], rC = [(398600.4418 / mainWindow.mm ** 2)**(1/3), 0, 0], drC = [0, (398600.4418 / ((398600.4418 / mainWindow.mm ** 2)**(1/3))) ** (1/2), 0]) 
    r1 = Ric2Eci(r1.slice(0,3), r1.slice(3,6), inertOrbit1.slice(0,3),inertOrbit1.slice(3,6)) 
    r1 = r1.rEcci.concat(r1.drEci)
    r2 = Ric2Eci(r2.slice(0,3), r2.slice(3,6), inertOrbit2.slice(0,3),inertOrbit2.slice(3,6)) 
    r2 = r2.rEcci.concat(r2.drEci)
    let lamSol = solveLambertsProblem(r1.slice(0,3), r2.slice(0,3), tf, 0, true)
    let dV = math.subtract(lamSol.v1, r1.slice(3,6));
    console.log(dV);
    let h = math.cross(inertOrbit1.slice(0,3), inertOrbit1.slice(3,6));
    let ricX = math.dotDivide(inertOrbit1.slice(0,3), math.norm(inertOrbit1.slice(0,3)));
    let ricZ = math.dotDivide(h, math.norm(h));
    let ricY = math.cross(ricZ, ricX);
    let C = [ricX, ricY, ricZ];
    dV = math.multiply(C, dV)
    console.log(dV);

}

function setDefaultScenario(index, arts = true) {
    
    index = index.replace(/ +/g, '_')
    lastSaveName = arts ? index : lastSaveName
    if (arts) index = index.slice(0,5) === 'arts_' ? index : 'arts_' + index
    window.localStorage.setItem(index, JSON.stringify(mainWindow.getData()))
}

function recoverDefaultScenario(index) {
    let scenarioNames = Object.keys(window.localStorage).filter(a => a.slice(0,5) === 'arts_')
    let selection = prompt('Select file below by Number:\n' + scenarioNames.map((key, ii) => ii + ': ' + key.slice(5)).join('\n'))
    if (selection == null || selection.replace(/ +/g, '') === '') return
    if (!isNaN(Number(selection))) {
        selection = Number(selection)
        if (selection < scenarioNames.length) {
            pastActions = []
            textFromFileLoaded = JSON.parse(window.localStorage[scenarioNames[selection]]);
            lastSaveName = scenarioNames[selection].slice(5)
            mainWindow.loadDate(textFromFileLoaded);
            mainWindow.setAxisWidth('set', mainWindow.plotWidth);
        }
    }
    else if (selection.search('del') !== -1) {
        let delIndex = selection.slice(selection.search(/[0-9]/))
        if (Number(delIndex) < scenarioNames.length) window.localStorage.removeItem(scenarioNames[delIndex])
    }
    
}

function convertRAEtoCartesian(rae = [[10, 0, 0, 0, 0, 0.004]]) {
    let r = rae[0][0],
        az = rae[0][1],
        el = rae[0][2],
        rd = rae[0][3],
        azd = rae[0][4],
        eld = rae[0][5]
    position = [[r * Math.cos(az) * Math.cos(el), r * Math.sin(az) * Math.cos(el), r * Math.sin(el)]]
    velocity = [[rd * Math.cos(az) * Math.cos(el) - r * Math.sin(az) * Math.cos(el) * azd - r * Math.cos(az) * Math.sin(el) * eld,
                 rd * Math.sin(az) * Math.cos(el) + r * Math.cos(az) * Math.cos(el) * azd - r * Math.sin(az) * Math.sin(el) * eld,
                 rd * Math.sin(el) + r * Math.cos(el) * eld]]
    return math.concat(position, velocity, 1);
}

function convertCartesiantoRAE(cart = [[10, 0, 0, 0, 0, 0.04]]) {
    let r = cart[0][0],
        i = cart[0][1],
        c = cart[0][2],
        rd = cart[0][3],
        id = cart[0][4],
        cd = cart[0][5]
    let x1 = math.dotDivide([r, i, c], math.norm([r, i, c]))
    let x2 = math.cross([0,0,1], [r, i, 0])
    x2 = math.dotDivide(x2, math.norm(x2))
    let x3 = math.cross(x1, x2)

    let range = math.norm([r, i, c])
    let vel = [rd, id, cd]
    let rangeRate = math.dot(vel, x1)
    let azRate = math.dot(vel, x2) / range
    let elRate = math.dot(vel, x3) / range
    // console.log(rangeRate, azRate, elRate);
    return [[
        range,
        math.atan2(i, r),
        math.atan2(c, math.norm([r, i])),
        rangeRate,
        azRate,
        elRate
    ]]
}

function copySat(sat = 0) {
    let s = mainWindow.satellites[sat].curPos
    let position = [[s.r, s.i, s.c, s.rd, s.id, s.cd]]
    let rae = convertCartesiantoRAE(position)
    rae[0][0] *= 1.5
    rae[0][3] *= 1.5
    position = convertRAEtoCartesian(rae)
    mainWindow.satellites[sat].position = {
        r: position[0][0],
        i: position[0][1],
        c: position[0][2],
        rd: position[0][3],
        id: position[0][4],
        cd: position[0][5]
    }
    mainWindow.satellites[sat].calcTraj()
}

function findRangeTime(sat= 0, satTarget = 1, r= 10, time = mainWindow.scenarioTime) {
    if (mainWindow.satellites.length === 0) return
    let stateHist = mainWindow.satellites[sat].stateHistory.filter(state => state.t > time)
    let stateHistTarget = mainWindow.satellites[satTarget].stateHistory.filter(state => state.t > time)
    let getRange = function(sat1, sat2, timeIn) {
        let s1 = mainWindow.satellites[sat1].currentPosition({time: timeIn})
        let s2 = mainWindow.satellites[sat2].currentPosition({time: timeIn})
        return math.norm(math.subtract(s1,s2))
    }
    let positionSeed = getRange(sat, satTarget, time) < r ? 1 : -1;
    let seedIndex = stateHist.map((state, ii) => {
        return math.norm([state.position[0] - stateHistTarget[ii].position[0], state.position[1] - stateHistTarget[ii].position[1], state.position[2] - stateHistTarget[ii].position[2]])
    }).findIndex(range => {
        return range * positionSeed > r * positionSeed
    });
    if (seedIndex === -1) return showScreenAlert('No Solution in Time Frame')
    let seedTime = stateHist[seedIndex].t
    for (let index = 0; index < 10; index++) {
        let dt = 0.1
        // let time1 = mainWindow.satellites[sat].currentPosition({time: seedTime})
        let time1 = getRange(sat, satTarget, seedTime)
        // let time2 = mainWindow.satellites[sat].currentPosition({time: seedTime - dt})
        let time2 = getRange(sat, satTarget, seedTime - dt)
        let di_dt = (time1 - time2) / dt
        seedTime += (r - time1) / di_dt
    }
    mainWindow.desired.scenarioTime = seedTime
    document.getElementById('time-slider-range').value = seedTime
}

function findCatsTime(sat= 0, satTarget = 1, c= 90, time = mainWindow.scenarioTime) {
    if (mainWindow.satellites.length === 0) return
    let stateHist = mainWindow.satellites[sat].stateHistory.filter(state => state.t > time)
    let stateHistTarget = mainWindow.satellites[satTarget].stateHistory.filter(state => state.t > time)
    let getCats = function(sat1, sat2, timeIn) {
        let s1 = mainWindow.satellites[sat1].currentPosition({time: timeIn})
        let s2 = mainWindow.satellites[sat2].currentPosition({time: timeIn})
        let relPos = math.squeeze(math.subtract(s1, s2)).slice(0,3)
        let sunVec = mainWindow.getCurrentSun(timeIn)
        return math.acos(math.dot(relPos, sunVec) / math.norm(relPos) / math.norm(sunVec)) * 180 / Math.PI
    }
    let positionSeed = getCats(sat, satTarget, time) < c ? 1 : -1;
    let seedIndex = stateHist.map((state, ii) => {
        return getCats(sat, satTarget, state.t)
    }).findIndex(cats => {
        return cats * positionSeed > c * positionSeed
    });
    if (seedIndex === -1) return showScreenAlert('No Solution in Time Frame')
    let seedTime = stateHist[seedIndex].t
    for (let index = 0; index < 10; index++) {
        let dt = 0.1
        let time1 = getCats(sat, satTarget, seedTime)
        let time2 = getCats(sat, satTarget, seedTime - dt)
        let di_dt = (time1 - time2) / dt
        seedTime += (c - time1) / di_dt
    }
    mainWindow.desired.scenarioTime = seedTime
    document.getElementById('time-slider-range').value = seedTime
}

function findInTrackTime(sat= 0, it= -20, time = mainWindow.scenarioTime) {
    if (mainWindow.satellites.length === 0) return
    let stateHist = mainWindow.satellites[sat].stateHistory
    stateHist = stateHist.filter(state => state.t > time)
    let curState = mainWindow.satellites[sat].curPos
    let positionSeed = curState.i < it ? 1 : -1;
    let seedIndex = stateHist.findIndex(state => state.position[1] * positionSeed > it * positionSeed);
    if (seedIndex === -1) return showScreenAlert('No Solution in Time Frame')
    let seedTime = stateHist[seedIndex].t
    // console.log(seedTime);
    for (let index = 0; index < 10; index++) {
        let dt = 0.1
        let time1 = mainWindow.satellites[sat].currentPosition({time: seedTime})
        let time2 = mainWindow.satellites[sat].currentPosition({time: seedTime - dt})
        let di_dt = (time1[1] - time2[1]) / dt
        seedTime += (it - time1[1]) / di_dt
    }
    mainWindow.desired.scenarioTime = seedTime
    document.getElementById('time-slider-range').value = seedTime
}

function findRadialTime(sat= 0, r= -20, time = mainWindow.scenarioTime) {
    if (mainWindow.satellites.length === 0) return
    let stateHist = mainWindow.satellites[sat].stateHistory
    stateHist = stateHist.filter(state => state.t > time)
    let curState = mainWindow.satellites[sat].curPos
    let positionSeed = curState.r < r ? 1 : -1;
    let baseSma = (398600.4418 / (mainWindow.mm)**2) ** (1/3)
    let seedIndex = stateHist.map(state => math.norm([state.position[0] + baseSma, state.position[1]]) - baseSma).findIndex(state => state * positionSeed > r * positionSeed)
    if (seedIndex === -1) return showScreenAlert('No Solution in Time Frame')
    let seedTime = stateHist[seedIndex].t
    // console.log(seedTime);
    for (let index = 0; index < 10; index++) {
        let dt = 0.1
        let time1 = mainWindow.satellites[sat].currentPosition({time: seedTime})
        let time2 = mainWindow.satellites[sat].currentPosition({time: seedTime - dt})
        time1 = math.norm([time1[0] + baseSma, time1[1]]) - baseSma
        time2 = math.norm([time2[0] + baseSma, time2[1]]) - baseSma
        let di_dt = (time1 - time2) / dt
        seedTime += (r - time1) / di_dt
    }
    mainWindow.desired.scenarioTime = seedTime
    document.getElementById('time-slider-range').value = seedTime
}

function findCrossTrackTime(sat= 0, c= -5, time = mainWindow.scenarioTime) {
    if (mainWindow.satellites.length === 0) return
    let stateHist = mainWindow.satellites[sat].stateHistory
    stateHist = stateHist.filter(state => state.t > time)
    let curState = mainWindow.satellites[sat].curPos
    let positionSeed = curState.c < c ? 1 : -1;
    let seedIndex = stateHist.findIndex(state => state.position[2] * positionSeed > c * positionSeed);
    if (seedIndex === -1) return showScreenAlert('No Solution in Time Frame')
    let seedTime = stateHist[seedIndex].t
    // console.log(seedTime);
    for (let index = 0; index < 10; index++) {
        let dt = 0.1
        let time1 = mainWindow.satellites[sat].currentPosition({time: seedTime})
        let time2 = mainWindow.satellites[sat].currentPosition({time: seedTime - dt})
        let di_dt = (time1[2] - time2[2]) / dt
        seedTime += (c - time1[2]) / di_dt
    }
    mainWindow.desired.scenarioTime = seedTime
    document.getElementById('time-slider-range').value = seedTime
}

function perchSatelliteSolver(state = [1, 10, 0, -0.005, 0, 0], a = 0.00001, startTime = mainWindow.scenarioTime) {
    // Generate initial guess
    let direction = math.dotMultiply(-1, state.slice(3,6))
    let params = {az: math.atan2(direction[1], direction[0]), el: math.atan2(direction[2], math.norm([direction[0], direction[1]])), tb: math.norm([direction[0], direction[1], direction[2]]) / a}
    direction = math.dotDivide(direction, math.norm(direction))
    let numBurnPoints = math.ceil(params.tb / mainWindow.timeDelta)
    numBurnPoints = numBurnPoints < 1 ? 1 : numBurnPoints;
    
    let genJacobPerch = function(params, startState, a, startT) {
        let dir = [a * Math.cos(params.az) * Math.cos(params.el),
                   a * Math.sin(params.az) * Math.cos(params.el),
                   a * Math.sin(params.el)]
        let baseState = runge_kutta(twoBodyRpo, startState, params.tb, dir, startT).slice(3,6)
        let derivative = []
        let paramsDelta = {...params}
        paramsDelta.az += 0.01
        dir = [a * Math.cos(paramsDelta.az) * Math.cos(paramsDelta.el),
            a * Math.sin(paramsDelta.az) * Math.cos(paramsDelta.el),
            a * Math.sin(paramsDelta.el)]
        let deltaState = runge_kutta(twoBodyRpo, startState, paramsDelta.tb, dir, startT).slice(3,6)
        derivative.push(math.dotDivide(math.subtract(deltaState, baseState), 0.01))

        paramsDelta = {...params}
        paramsDelta.el += 0.01
        dir = [a * Math.cos(paramsDelta.az) * Math.cos(paramsDelta.el),
            a * Math.sin(paramsDelta.az) * Math.cos(paramsDelta.el),
            a * Math.sin(paramsDelta.el)]
        deltaState = runge_kutta(twoBodyRpo, startState, paramsDelta.tb, dir, startT).slice(3,6)
        derivative.push(math.dotDivide(math.subtract(deltaState, baseState), 0.01))

        paramsDelta = {...params}
        paramsDelta.tb += 0.01
        dir = [a * Math.cos(paramsDelta.az) * Math.cos(paramsDelta.el),
            a * Math.sin(paramsDelta.az) * Math.cos(paramsDelta.el),
            a * Math.sin(paramsDelta.el)]
        deltaState = runge_kutta(twoBodyRpo, startState, paramsDelta.tb, dir, startT).slice(3,6)
        derivative.push(math.dotDivide(math.subtract(deltaState, baseState), 0.01))
        
        return math.transpose(derivative)
    }
    for (let index = 0; index < 100; index++) {
        // Generate Jacobian
        let jac = genJacobPerch(params, state, a, startTime)

        let dir = [a * Math.cos(params.az) * Math.cos(params.el),
            a * Math.sin(params.az) * Math.cos(params.el),
            a * Math.sin(params.el)]
        // Get final state
        let stateF = [...state]
        for (let index = 0; index < numBurnPoints; index++) {
            stateF = runge_kutta(twoBodyRpo, stateF, params.tb / numBurnPoints, dir, startTime + index / numBurnPoints * params.tb)
        }
        stateF = stateF.slice(3,6)

        let des = [0,0,0]
        let residuals = math.transpose([math.subtract(des, stateF)])
        let dParams = math.squeeze(math.multiply(math.inv(jac), residuals))
        params.az += dParams[0]
        params.el += dParams[1]
        params.tb += dParams[2]
    }
    let dir = [a * Math.cos(params.az) * Math.cos(params.el),
        a * Math.sin(params.az) * Math.cos(params.el),
        a * Math.sin(params.el)]
    
    let stateF = runge_kutta(twoBodyRpo, state, params.tb, dir, startTime).slice(3,6)
    console.log(params.tb);
    return {dir: math.dotMultiply(params.tb, dir), stateF, params}
}

function insertDirectionBurn(sat = 0, time = 3600, dir = [0.001, 0, 0]) {
    let position = mainWindow.satellites[sat].currentPosition({time});
    pastActions.push({
        sat,
        oldBurns: JSON.parse(JSON.stringify(mainWindow.satellites[sat].burns)),
        time: mainWindow.desired.scenarioTime
    })
    mainWindow.satellites[sat].burns.push({
        time,
        direction: dir,
        location: position.slice(0,3),
        waypoint: false
    })
    mainWindow.satellites[sat].calcTraj(true)
    mainWindow.desired.scenarioTime = time + 3600;
    document.querySelector('#time-slider-range').value = mainWindow.desired.scenarioTime
    updateWhiteCellWindow()
}

function insertWaypointBurn(sat = 0, time = 3600, way = [0,0,0], tof = 7200, origin = [0,0,0]) {
    pastActions.push({
        sat,
        oldBurns: JSON.parse(JSON.stringify(mainWindow.satellites[sat].burns)),
        time: mainWindow.desired.scenarioTime
    })
    let ricWaypoint = [
        way[0] + origin[0],
        way[1] + origin[1],
        way[2] + origin[2],
    ]
    let targetEci = propToTimeAnalytic(mainWindow.originOrbit, time + tof)
    let target = Ric2Eci(ricWaypoint, [0,0,0],targetEci.slice(0,3), targetEci.slice(3,6)).rEcci

    mainWindow.satellites[sat].burns.push({
        time,
        direction: [0,0,0],
        waypoint: {
            tranTime: tof,
            target
        }
    })
    mainWindow.satellites[sat].calcTraj(true);
    let checkBurn = mainWindow.satellites[sat].burns[mainWindow.satellites[sat].burns.length-1];
    mainWindow.desired.scenarioTime = time + tof;
    document.getElementById('time-slider-range').value = mainWindow.desired.scenarioTime;
    if (math.norm(Object.values(checkBurn.direction)) < 1e-8) {
        mainWindow.satellites[sat].burns.pop();
        mainWindow.satellites[sat].calcTraj(true);
        showScreenAlert('Waypoint outside kinematic reach or error in calculating burn');
        return false;
    }
    updateWhiteCellWindow()
    return true
}

function perchSatellite(sat = 0, time = mainWindow.scenarioTime) {
    let curPos = mainWindow.satellites[sat].currentPosition({time})
    let burnEst = math.norm([curPos[3], curPos[4], curPos[5]])
    curPos = mainWindow.satellites[sat].currentPosition({time: time - burnEst / mainWindow.satellites[sat].a / 2})

    let burnOut = perchSatelliteSolver(curPos, mainWindow.satellites[sat].a)
    insertDirectionBurn(sat, time - burnEst / mainWindow.satellites[sat].a / 2, burnOut.dir)
}

function circSatellite(sat = 0, time = mainWindow.scenarioTime) {
    let dt = 7200
    let curPos = mainWindow.satellites[sat].currentPosition({time})
    let curPos2 = mainWindow.satellites[sat].currentPosition({time: time + dt})
    let curR = math.norm([curPos[0] + (398600.4418 / mainWindow.mm ** 2) ** (1/3), curPos[1], curPos[2]])
    let curTh = math.atan2( curPos[1], curPos[0] + (398600.4418 / mainWindow.mm ** 2) ** (1/3))
    let dTh = (398600.4418 / curR ** 3) ** (1/2) - (398600.4418 / (398600.4418 / mainWindow.mm ** 2)) ** (1/2)
    let newTh = curTh + dt * dTh
    let newPos = [curR * Math.cos(newTh) - (398600.4418 / mainWindow.mm ** 2) ** (1/3), curR * Math.sin(newTh), curPos2[2]]
    
    mainWindow.satellites[sat].burns = mainWindow.satellites[sat].burns.filter(burn => {
        return burn.time < mainWindow.scenarioTime;
    })
    insertWaypointBurn(sat, mainWindow.desired.scenarioTime, newPos,dt)
    // let dV = mainWindow.satellites[sat].burns[mainWindow.satellites[sat].burns.length - 1].direction
    // dV = math.norm(dV) / mainWindow.satellites[sat].a
    // mainWindow.satellites[sat].burns[mainWindow.satellites[sat].burns.length - 1].time -= dV / 2
    // mainWindow.satellites[sat].burns[mainWindow.satellites[sat].burns.length - 1].waypoint.tranTime += dV / 2
    // mainWindow.satellites[sat].calcTraj(true);
    // let checkBurn = mainWindow.satellites[sat].burns[mainWindow.satellites[sat].burns.length-1];
    // if (math.norm(checkBurn.direction) < 1e-8) {
    //     mainWindow.satellites[sat].burns.pop();
    //     mainWindow.satellites[sat].genBurns();
    //     showScreenAlert('Waypoint outside kinematic reach of satellite with given time of flight');
    //     return;
    // }
    
}

function circularizeOrbitSolver(state = [10, 700, 0, 0, 0, 0], a = 0.00001, startTime = mainWindow.scenarioTime) {
    // Generate initial guess
    let nominalVel = [0, -state[0] * 1.5 * mainWindow.mm, 0]
    let nominalDir = math.subtract(nominalVel, state.slice(3,6))
    let params = {az: math.atan2(nominalDir[1], nominalDir[0]), el: 0, tb: math.norm(nominalDir.slice(0,1) / a)}
    let numBurnPoints = math.ceil(params.tb / mainWindow.timeDelta)
    numBurnPoints = numBurnPoints < 1 ? 1 : numBurnPoints;
    
    let genJacobCirc = function(params, startState, a, startT) {
        let derivative = []
        
        let paramsDelta1 = {...params}
        paramsDelta1.az += 0.01
        let paramsDelta2 = {...params}
        paramsDelta2.az -= 0.01
        dir1 = [a * Math.cos(paramsDelta1.az) * Math.cos(paramsDelta1.el),
            a * Math.sin(paramsDelta1.az) * Math.cos(paramsDelta1.el),
            Math.sin(paramsDelta1.el)]
        dir2 = [a * Math.cos(paramsDelta2.az) * Math.cos(paramsDelta2.el),
            a * Math.sin(paramsDelta2.az) * Math.cos(paramsDelta2.el),
            Math.sin(paramsDelta2.el)]
        let deltaState1 = runge_kutta(twoBodyRpo, startState, paramsDelta1.tb, dir1, startT)
        let deltaState2 = runge_kutta(twoBodyRpo, startState, paramsDelta2.tb, dir2, startT)
        let deltaE1 = calcSatelliteEccentricity(deltaState1)
        let deltaE2 = calcSatelliteEccentricity(deltaState2)
        derivative.push((deltaE1 - deltaE2) / 0.02)

        paramsDelta1 = {...params}
        paramsDelta1.el += 0.01
        paramsDelta2 = {...params}
        paramsDelta2.el -= 0.01
        dir1 = [a * Math.cos(paramsDelta1.az) * Math.cos(paramsDelta1.el),
            a * Math.sin(paramsDelta1.az) * Math.cos(paramsDelta1.el),
            Math.sin(paramsDelta1.el)]
        dir2 = [a * Math.cos(paramsDelta2.az) * Math.cos(paramsDelta2.el),
            a * Math.sin(paramsDelta2.az) * Math.cos(paramsDelta2.el),
            Math.sin(paramsDelta2.el)]
        deltaState1 = runge_kutta(twoBodyRpo, startState, paramsDelta1.tb, dir1, startT)
        deltaState2 = runge_kutta(twoBodyRpo, startState, paramsDelta2.tb, dir2, startT)
        deltaE1 = calcSatelliteEccentricity(deltaState1)
        deltaE2 = calcSatelliteEccentricity(deltaState2)
        derivative.push((deltaE1 - deltaE2) / 0.02)

        paramsDelta1 = {...params}
        paramsDelta1.tb += 0.01
        paramsDelta2 = {...params}
        paramsDelta2.tb -= 0.01
        dir1 = [a * Math.cos(paramsDelta1.az) * Math.cos(paramsDelta1.el),
            a * Math.sin(paramsDelta1.az) * Math.cos(paramsDelta1.el),
            Math.sin(paramsDelta1.el)]
        dir2 = [a * Math.cos(paramsDelta2.az) * Math.cos(paramsDelta2.el),
            a * Math.sin(paramsDelta2.az) * Math.cos(paramsDelta2.el),
            Math.sin(paramsDelta2.el)]
        deltaState1 = runge_kutta(twoBodyRpo, startState, paramsDelta1.tb, dir1, startT)
        deltaState2 = runge_kutta(twoBodyRpo, startState, paramsDelta2.tb, dir2, startT)
        deltaE1 = calcSatelliteEccentricity(deltaState1)
        deltaE2 = calcSatelliteEccentricity(deltaState2)
        derivative.push((deltaE1 - deltaE2) / 0.02)
        
        return math.transpose(derivative)
    }
    for (let index = 0; index < 100; index++) {
        // Generate Jacobian
        let jac = genJacobCirc(params, state, a, startTime)

        let dir = [a * Math.cos(params.az) *Math.cos(params.el),
            a * Math.sin(params.az)*Math.cos(params.el),
            Math.sin(params.el)]
        // Get final state
        let stateF = [...state]
        for (let index = 0; index < numBurnPoints; index++) {
            stateF = runge_kutta(twoBodyRpo, stateF, params.tb / numBurnPoints, dir, startTime + index / numBurnPoints * params.tb)
        }
        let eAch = calcSatelliteEccentricity(stateF)
        let eDes = 0
        let residuals = math.transpose([eDes - eAch])
        let p = math.multiply(math.inv(math.multiply(math.transpose(jac), jac)), math.transpose(jac))
        let dParams = math.squeeze(math.multiply(math.transpose([p]), residuals))
        params.az += dParams[0]
        params.el += dParams[1]
        params.tb += dParams[2]
        console.log(eAch);
    }
    let dir = [a * Math.cos(params.az),
        a * Math.sin(params.az),
        0]
    
    let stateF = runge_kutta(twoBodyRpo, state, params.tb, dir, startTime).slice(3,6)
    return {dir: math.dotMultiply(params.tb, dir), stateF, params}
}

function calcSatelliteEccentricity(position = [10,0,0,0,0,0]) {
    let outEci = Ric2Eci(rHcw = position.slice(0,3), drHcw = position.slice(3,6))
    let h = math.cross(outEci.rEcci, outEci.drEci)
    let e = math.dotDivide(math.cross(outEci.drEci, h), 398600.4415)
    e = math.subtract(e, math.dotDivide(outEci.rEcci, math.norm(outEci.rEcci)))
    return math.norm(e);
}

function getCurrentInertial(sat = 0, time = mainWindow.scenarioTime) {
    let inertChief = mainWindow.originHistory.filter(s => s.t <= time)
    inertChief = inertChief[inertChief.length-1]
    inertChief = propToTime(inertChief.position, time-inertChief.t, false)
    let satPos = mainWindow.satellites[sat].currentPosition({time})
    satPos = Ric2Eci(satPos.slice(0,3), satPos.slice(3,6), inertChief.slice(0,3), inertChief.slice(3,6))
    return {
        r: satPos.rEcci[0],
        i: satPos.rEcci[1],
        c: satPos.rEcci[2],
        rd: satPos.drEci[0],
        id: satPos.drEci[1],
        cd: satPos.drEci[2]
    }
}

function generateJ2000File(team=1, time = mainWindow.scenarioTime, dontExport = []) {
    let satellites = calculateSatErrorStates(team, time).map((s,ii) => [mainWindow.satellites[ii].name, s.trackedState])
    let startEphem = `Time (UTCG)              x (km)           y (km)         z (km)     vx (km/sec)    vy (km/sec)    vz (km/sec)
-----------------------    -------------    -------------    ---------    -----------    -----------    -----------
`
    let fileText = `\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t ${Date.now()}
    Satellite-${satellites.map(s => s[0]).join(', ')}:  J2000 Position & Velocity
    `
    satellites.forEach(sat => {
        fileText += `\n\n${startEphem}`
        let currentPos = sat[1]
        currentPos = propToTime(currentPos, -time, false)
        let propTime = 0
        while (propTime < mainWindow.scenarioLength*3600) {
            let eciState = propToTime(currentPos, propTime)
            let pointTime = new Date(mainWindow.startDate - (-propTime*1000))
            pointTime = toStkFormat(pointTime.toString())
            fileText += `${pointTime}     ${eciState.map(n => n.toFixed(5)).join('     ')}\n`
            propTime += 3600
        }
    })
    let fileTime = toStkFormat((new Date(mainWindow.startDate - (-mainWindow.scenarioTime * 1000))).toString()).replaceAll(' ','_')
    downloadFile(`${fileTime}${team !== undefined ? `_Team${team}` : ''}_artsEphem.txt`, fileText)
}

function generateJ2000FileTruth() {
    let startEphem = `Time (UTCG)              x (km)           y (km)         z (km)     vx (km/sec)    vy (km/sec)    vz (km/sec)
-----------------------    -------------    -------------    ---------    -----------    -----------    -----------
`
    let fileText = `\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t ${Date.now()}
    Satellite-${mainWindow.satellites.map(s => s.name).join(', ')}:  J2000 Position & Velocity
    `
    mainWindow.satellites.forEach((sat, satii) => {
        fileText += `\n\n${startEphem}`
        let propTime = 0
        let timeDelta = 2*Math.PI/24 * (mainWindow.originOrbit.a ** 3 / 398600.4418) ** 0.5
        while (propTime < mainWindow.scenarioLength*3600) {
            let eciState = Object.values(getCurrentInertial(satii, propTime))
            let pointTime = new Date(mainWindow.startDate - (-propTime*1000))
            pointTime = toStkFormat(pointTime.toString())
            fileText += `${pointTime}     ${eciState.map(n => n.toFixed(5)).join('     ')}\n`
            propTime += timeDelta
        }
    })
    downloadFile(`artsEphem.txt`, fileText)
}

function logAction(options = {}) {
    let {type, sat, time = mainWindow.scenarioTime, burn, index, satellitesState} = options
    pastActions.push({
        time,
        sat,
        burn,
        index,
        satellitesState,
        type
    })
}
function redoLastAction() {
    if (futureActions.length === 0) return
    let action = futureActions.pop()
    console.log(action);
    pastActions.push({
        sat: action.sat,
        oldBurns: JSON.parse(JSON.stringify(mainWindow.satellites[action.sat].burns)),
        time: action.time
    })
    if (action.time !== undefined) {
        mainWindow.changeTime(action.time, true)
    }
    mainWindow.satellites[action.sat].burns = action.oldBurns
    mainWindow.satellites[action.sat].calcTraj(true)
    mainWindow.satellites[action.sat].calcTraj()
}

function reverseLastAction() {
    if (pastActions.length === 0) return
    let action = pastActions.pop()
    futureActions.push({
        sat: action.sat,
        oldBurns: JSON.parse(JSON.stringify(mainWindow.satellites[action.sat].burns)),
        time: mainWindow.desired.scenarioTime
    })
    if (action.time !== undefined) {
        mainWindow.changeTime(action.time, true)
    }
    mainWindow.satellites[action.sat].burns = action.oldBurns
    mainWindow.satellites[action.sat].calcTraj(true)
    mainWindow.satellites[action.sat].calcTraj()
}

function impulsiveHcwProp(p1 = [[1],[0],[0]], v1 =[[0],[0],[0]], dt = 3600) {
    let state = math.concat(p1, v1, 0)
    let phi = phiMatrixWhole(dt)
    return math.multiply(phi, state)
}

function optimizeMultiBurn(burns = 4, start = [0, 400, 0, 0, 0, 0], end = [0,-30,0,0,0,0], dt = 6*3600, options = {}) {
    let {a = 0.001, maxBurn = 30, sat = null, uniformity = 4, bias = 0, logId = null} = options
    let dist = math.norm(math.subtract(start.slice(0,3), end.slice(0,3))) * 0.333
    // console.log(start, end, sat, dt);
    let vNom =  proxOpsTargeter(math.transpose([start.slice(0,3)]), math.transpose([end.slice(0,3)]), dt)[0]
    let rList = []
    for (let index = 1; index < burns - 1; index++) {
        rList.push(math.squeeze(impulsiveHcwProp(math.transpose([start.slice(0,3)]), vNom, index * dt / (burns - 1)).slice(0,3)))
    }
    let uBounds = []
    let lBounds = []
    for (let index = 1; index < burns - 1; index++) {
        let delta = 0.3 / (burns - 1)
        uBounds.push(index / (burns - 1) + delta)
        lBounds.push(index / (burns - 1) - delta)   
    }
    for (let index = 1; index < burns - 1; index++) {
        uBounds.push(dist, dist, dist)
        lBounds.push(-dist, -dist, -dist)   
    }
    let opt = new pso({
        n_part: 250,
        upper_bounds: uBounds,
        lower_bounds: lBounds
    })
    opt.opt_fuction = function(x, show = false) {
        let waypoints = [start.slice(0,3)]
        for (let index = 0; index < burns - 2; index++) {
            waypoints.push(math.add(rList[index], x.slice(burns - 2 + index * 3,burns + 1 + index * 3)))
        }
        waypoints.push(end.slice(0,3))
        waypoints = waypoints.map(way => math.transpose([way]))
        // console.log(waypoints);
        let dV = []
        let curV = start.slice(3)
        let curT = 0
        let outWaypoints = []
        for (let index = 0; index < waypoints.length - 1; index++) {
            let wayT = index !== waypoints.length - 2 ? x[index] : 1
            outWaypoints.push({
                time: curT * dt,
                dt: dt * (wayT - curT),
                point: math.squeeze(waypoints[index+1])
            })
            let vels = proxOpsTargeter(waypoints[index], waypoints[index+1], dt * (wayT - curT)).map(v => math.squeeze(v))
            dV.push(math.norm(math.subtract(vels[0], curV)))
            curV = vels[1]
            curT = x[index]
        }
        dV.push(math.norm(math.subtract(end.slice(3), curV)))
        return show ? outWaypoints : dV.map((v, ii) => ((ii + 1) ** bias) * v ** uniformity).reduce((a,b) => a + b)
    }   
    let iterations = 200
    let iterationCount = 0
    let stepFunction = function(next = true) {
        iterationCount++
        opt.step()
        console.log(iterationCount, opt.bestGlobabValue)
        // console.log(logId);
        if (next) setTimeout(stepFunction(iterationCount < iterations), 10)
        else {
            let points = opt.opt_fuction(opt.bestGlobalPosition, true)
            console.log(opt.bestGlobalPosition)
            console.log({r: start[0], i: start[1], c: start[2], rd: start[3], id: start[4], cd: start[5]})
            if (sat == null) {
                let newSat = new Satellite({
                    a,
                    position: {r: start[0], i: start[1], c: start[2], rd: start[3], id: start[4], cd: start[5]}
                })
                // return
                points.forEach(p => {
                    newSat.burns.push({
                        time: p.time,
                        direction: {
                            r: 0,
                            i: 0,
                            c: 0
                        },
                        waypoint: {
                            tranTime: p.dt,
                            target: {
                                r: p.point[0],
                                i: p.point[1],
                                c: p.point[2]
                            }
                        }
                    })
                    newSat.genBurns()
                })
                mainWindow.satellites.push(newSat)
                mainWindow.desired.plotWidth = 900
            }
            else {
                mainWindow.satellites[sat].burns.filter(burn => burn.time < mainWindow.scenarioTime)
                points.forEach(p => {
                    mainWindow.satellites[sat].burns.push({
                        time: p.time + mainWindow.scenarioTime,
                        direction: {
                            r: 0,
                            i: 0,
                            c: 0
                        },
                        waypoint: {
                            tranTime: p.dt,
                            target: {
                                r: p.point[0],
                                i: p.point[1],
                                c: p.point[2]
                            }
                        }
                    })
                    mainWindow.satellites[sat].genBurns()
                })
        
            }
            mainWindow.desired.scenarioTime += dt 
        }
    }
    setTimeout(stepFunction(), 10)
    
}

function moveBurnTime(sat = 0, burn = 0, dt = 3600) {
    let burnOld = JSON.parse(JSON.stringify(mainWindow.satellites[sat].burns[burn]))
    let futureBurns = mainWindow.satellites[sat].burns.filter(b => b.time > burnOld.time)
    let timeLimits = [Number(burn) === 0 ? 0 : mainWindow.satellites[sat].burns[burn - 1].time, futureBurns.length > 0 ? futureBurns[0].time : mainWindow.scenarioLength * 3600]
    if ((burnOld.time + dt) < timeLimits[0]) return showScreenAlert('Burn too early')
    if ((burnOld.time + dt) > timeLimits[1]) return showScreenAlert('Burn too late')
    mainWindow.satellites[sat].burns = mainWindow.satellites[sat].burns.filter(b => b.time < burnOld.time)
    insertDirectionBurn(sat, burnOld.time + dt, Object.values(burnOld.direction))
    mainWindow.satellites[sat].burns.push(...futureBurns)
    mainWindow.satellites[sat].calcTraj(true)
}

function startBurnMonteCarlo(sat = 0, options= {}) {
    let {n = 200, stdR =  0.1, stdAng =  1.5*Math.PI / 180} = options
    let burn = mainWindow.satellites[sat].burns.filter(b => b.time < mainWindow.scenarioTime)
    if (burn.length === 0) return null
    burn = burn.length - 1
    console.log(`Running Monte Carlo Sim for ${mainWindow.satellites[sat].name}'s burn occuring at ${toStkFormat((new Date(mainWindow.startDate - (-1000*mainWindow.satellites[sat].burns[burn].time))).toString())}`);
    let burnSat = mainWindow.satellites[sat].burns[burn]
    let state = mainWindow.satellites[sat].currentPosition({time: burnSat.time})
    state = {
        x: state[0],
        y: state[1],
        z: state[2],
        xd: state[3],
        yd: state[4],
        zd: state[5]
    }
    let direction = {
        mag: math.norm(burnSat.direction),
        az: math.atan2(burnSat.direction[1], burnSat.direction[0]),
        el: math.atan2(burnSat.direction[2], math.norm(burnSat.direction.slice(0,2)))
    }
    let a = mainWindow.satellites[sat].a
    let dur = direction.mag * (1 + 10 * stdR) / a
    let propTime = dur < (mainWindow.scenarioTime - burnSat.time) ? mainWindow.scenarioTime - burnSat.time : dur
    let corruptBurn = (burn) => {
        return {
            mag: burn.mag + stdR * burn.mag * randn_bm(),
            az: burn.az + stdAng * randn_bm(),
            el: burn.el + stdAng * randn_bm()
        }
    }
    let points = []
    for (let index = 0; index < n; index++) {
        let cBurn = corruptBurn(direction)
        let cDur = cBurn.mag / a
        let wayPos = oneBurnFiniteHcw(state, cBurn.az, cBurn.el, cDur / propTime, propTime, burnSat.time, a)
        points.push(wayPos)
    }
    let covData = findCovariance(points)
    ellipses = [
        cov2ellipse(covData.cov, covData.average)
    ]
    return {
        points,
        minTime: burnSat.time + dur,
        time: burnSat.time + propTime,
        ave: covData.average,
        cov: covData.cov,
        sat,
        burn
    }
}

function findCovariance(points) {
    let p = points.map(p => math.reshape(Object.values(p), [6,1]))
    let average = math.dotDivide(p.reduce((a,b) => math.add(a, b), math.zeros([6,1])), p.length)
    let cov = math.dotDivide(p.reduce((a,b) => {
        let added = math.multiply(math.subtract(b, average), math.reshape(math.subtract(b, average), [1,6]))
        return math.add(a, added)
    }, math.zeros([6,6])), p.length)
    
    return {
        average,
        cov
    }
}

function cov2ellipse(cov, average) {
    let riStd = cov.slice(0,2).map(s => s.slice(0,2))
    let eigRiStd = math.eigs(riStd);
    return {
        screen: 'ri',
        a: 3 * eigRiStd.values[1] ** 0.5,
        b: 3 * eigRiStd.values[0] ** 0.5,
        ang: math.atan2(eigRiStd.vectors[0][1], eigRiStd.vectors[1][1]),
        position: {
            r: average[0][0],
            i: average[1][0],
            c: average[2][0]
        },
    

    }
}

function randn_bm() {
    var u = 0, v = 0;
    while(u === 0) u = Math.random(); //Converting [0,1) to (0,1)
    while(v === 0) v = Math.random();
    return Math.sqrt( -2.0 * Math.log( u ) ) * Math.cos( 2.0 * Math.PI * v );
}

function changeOrigin(sat = 1, currentState = true) {
    document.getElementById('context-menu')?.remove();
    if (document.querySelector('dialog').open) {
        document.querySelector('dialog').close()
    }
    if (mainWindow.satellites.length <= sat) return
    mainWindow.groundTrackLimits.focus = sat
    if (mainWindow.ephemViewerMode) {
        let satHists = mainWindow.satellites.map(s => {
            let hist = s.stateHistory
            return hist.map((row, rowIi) => {
                let originEci = mainWindow.originHistory[rowIi].position
                let rowRic = row.position
                let rowEci = Ric2Eci(rowRic.slice(0,3), rowRic.slice(3), originEci.slice(0,3), originEci.slice(3))
                return {
                    t: row.t,
                    position: [...rowEci.rEcci, ...rowEci.drEci]
                }
            })
        })
        mainWindow.originHistory = []
        mainWindow.originHistory = satHists[sat]
        mainWindow.originSun = mainWindow.originHistory.map(s => {
            let sunRic = sunFromTime(new Date(mainWindow.startDate - (-1000*s.t)))
            sunRic = Eci2Ric(s.position.slice(0,3), s.position.slice(3), sunRic, [0,0,0])
            sunRic = math.squeeze(sunRic.rHcw)
            sunRic = sunRic.map(s => s/math.norm(sunRic))
            return [
                s.t, sunRic
            ]
        })
        mainWindow.originMoon = mainWindow.originHistory.map(s => {
            let moonRic = astro.moonEciFromTime(new Date(mainWindow.startDate - (-1000*s.t)))
            moonRic = Eci2Ric(s.position.slice(0,3), s.position.slice(3), moonRic, [0,0,0])
            moonRic = math.squeeze(moonRic.rHcw)
            moonRic = moonRic.map(s => s/math.norm(moonRic))
            return [
                s.t, moonRic
            ]
        })
        let startOrbit = mainWindow.originHistory[0].position
        startOrbit = PosVel2CoeNew(startOrbit.slice(0,3), startOrbit.slice(3))
    
        mainWindow.mm = (398600.4418 / startOrbit.a**3)**0.5
        satHists.forEach((hist, histIi) => {
            hist = hist.map((row, rowIi) => {
                let rowEci = row.position
                let originEci = mainWindow.originHistory[rowIi].position
                let rowRic = Eci2Ric(originEci.slice(0,3), originEci.slice(3), rowEci.slice(0,3), rowEci.slice(3))
                // console.log(rowRic.rHcw)
                return {
                    t: row.t,
                    position: math.squeeze([...rowRic.rHcw, ...rowRic.drHcw])
                }
            })
            mainWindow.satellites[histIi].stateHistory = hist
        })
        return
    }
    if (currentState === true) {
        let curPos = Object.values(getCurrentInertial(sat))
        curPos = propToTime(curPos, -mainWindow.desired.scenarioTime, false)
        curPos = PosVel2CoeNew(curPos.slice(0,3), curPos.slice(3,6))
        mainWindow.updateOrigin(curPos)
        return
    }
    console.log(sat);
    mainWindow.updateOrigin(mainWindow.satellites[sat].position)
}

function forcePlaneCrossing(sat = 0, dt = 4) {
    let curPos = mainWindow.satellites[sat].curPos
    let curPhase = math.atan2(curPos.c, curPos.cd / mainWindow.mm)
    // =CEILING.MATH((C4+180*FLOOR.MATH(F2/12))/180)*180
    let halfPeriod = Math.PI / mainWindow.mm / 3600
    let phaseGoal = Math.ceil((curPhase + 180 * Math.floor(dt / halfPeriod)) / 180)
    let desiredPhase = phaseGoal - mainWindow.mm * dt * 3600
    let desTan = Math.tan(desiredPhase)
    let desVelocity = curPos.c / desTan * mainWindow.mm
    
    return desVelocity
}

function findMaxPoca(dv = 1, stateTarget = 0, stateDep = 1, a = 1e-5) {
    stateTarget = Object.values(mainWindow.satellites[stateTarget].curPos)
    
    stateDep = Object.values(mainWindow.satellites[stateDep].curPos)
    dv /= 1000
    let findPoca = (dir = [1,0,0]) => {
        let dt = 10
        let maxTime = 10800
        let time = 0
        let targetStart = stateTarget.slice()
        let depStart = stateDep.slice()
        let minDist = 1e6
        let burnTime = math.norm(dir) / a
        let dirNorm = math.dotDivide(dir, math.norm(dir))
        while (time < maxTime) {
            let r = math.norm(math.subtract(targetStart.slice(0,3), depStart.slice(0,3)))
            if (r < minDist) minDist = r
            else break
            depStart = runge_kutta(twoBodyRpo, depStart, dt, [0,0,0], mainWindow.scenarioTime + time)
            if ((burnTime - time) > dt ) {
                targetStart = runge_kutta(twoBodyRpo, targetStart, dt, math.dotMultiply(a, dirNorm), mainWindow.scenarioTime + time)
            }   
            else if ((burnTime - time) < dt && burnTime > time) {
                targetStart = runge_kutta(twoBodyRpo, targetStart, burnTime - time, math.dotMultiply(a, dirNorm), mainWindow.scenarioTime + time)
                targetStart = runge_kutta(twoBodyRpo, targetStart, dt - (burnTime - time), [0,0,0], mainWindow.scenarioTime + time)
            }
            else targetStart = runge_kutta(twoBodyRpo, targetStart, dt, [0,0,0], mainWindow.scenarioTime + time)
            time += dt
        }
        return minDist
    }
    let maxRange = 0, maxDir
    for (let ii = 0; ii < 100; ii++) {
        let dir = [Math.random() * 2 * Math.PI, Math.random() * 2 * Math.PI, Math.random() * 2 * Math.PI - Math.PI]
        dir = math.dotDivide(dir, math.norm(dir) / dv)
        let poca = findPoca(dir)
        if (poca > maxRange) {
            // console.log(poca, dir)
            maxRange = poca
            maxDir = dir
        }
    }
    
    return {
        maxRange,
        maxDir
    }
}

function maxPocaTest(dv = 1) {
    let max = []
    for (let index = 0; index < 200; index++) {
        console.log(index);
        max.push(findMaxPoca(dv))
    }
    let rangeAve = max.reduce((a, b) => a + b.maxRange, 0) / max.length
    let rangeStd = max.reduce((a, b) => a + (b.maxRange - rangeAve) ** 2, 0) / (max.length - 1)
    console.log(rangeAve, rangeStd ** 0.5);
}

function accelerationSolver(state = [0,0,0,0.01,0.005,0], vf = [0.02, 0.001, 0.001], tf = 600, startTime = mainWindow.scenarioTime) {
    // Generate initial guess
    let direction = math.dotMultiply(-1, state.slice(3,6))
    let params = {az: 0, el: 0, a: 0.00001}
    direction = math.dotDivide(direction, math.norm(direction))
    let numBurnPoints = 60
    
    let genJacobPerch = function(params, startState, startT) {
        let dir = [params.a * Math.cos(params.az) * Math.cos(params.el),
                   params.a * Math.sin(params.az) * Math.cos(params.el),
                   params.a * Math.sin(params.el)]
        let baseState = startState.slice()
        for (let index = 0; index < numBurnPoints; index++) {
            baseState = runge_kutta(twoBodyRpo, baseState, tf / numBurnPoints, dir, startT)
        }
        baseState = baseState.slice(3,6)
        let derivative = []
        let paramsDelta = {...params}
        paramsDelta.az += 0.01
        dir = [paramsDelta.a * Math.cos(paramsDelta.az) * Math.cos(paramsDelta.el),
            paramsDelta.a * Math.sin(paramsDelta.az) * Math.cos(paramsDelta.el),
            paramsDelta.a * Math.sin(paramsDelta.el)]
        let deltaState = startState.slice()
        for (let index = 0; index < numBurnPoints; index++) {
            deltaState = runge_kutta(twoBodyRpo, deltaState, tf / numBurnPoints, dir, startT)
        }
        deltaState = deltaState.slice(3,6)
        derivative.push(math.dotDivide(math.subtract(deltaState, baseState), 0.01))

        paramsDelta = {...params}
        paramsDelta.el += 0.01
        dir = [paramsDelta.a * Math.cos(paramsDelta.az) * Math.cos(paramsDelta.el),
            paramsDelta.a * Math.sin(paramsDelta.az) * Math.cos(paramsDelta.el),
            paramsDelta.a * Math.sin(paramsDelta.el)]
        deltaState = startState.slice()
        for (let index = 0; index < numBurnPoints; index++) {
            deltaState = runge_kutta(twoBodyRpo, deltaState, tf / numBurnPoints, dir, startT)
        }
        deltaState = deltaState.slice(3,6)
        derivative.push(math.dotDivide(math.subtract(deltaState, baseState), 0.01))

        paramsDelta = {...params}
        paramsDelta.a += 0.0001
        dir = [paramsDelta.a * Math.cos(paramsDelta.az) * Math.cos(paramsDelta.el),
            paramsDelta.a * Math.sin(paramsDelta.az) * Math.cos(paramsDelta.el),
            paramsDelta.a * Math.sin(paramsDelta.el)]
        deltaState = startState.slice()
        for (let index = 0; index < numBurnPoints; index++) {
            deltaState = runge_kutta(twoBodyRpo, deltaState, tf / numBurnPoints, dir, startT)
        }
        deltaState = deltaState.slice(3,6)
        derivative.push(math.dotDivide(math.subtract(deltaState, baseState), 0.0001))
        
        return math.transpose(derivative)
    }
    for (let index = 0; index < 100; index++) {
        // Generate Jacobian
        let jac = genJacobPerch(params, state, startTime)

        let dir = [params.a * Math.cos(params.az) * Math.cos(params.el),
            params.a * Math.sin(params.az) * Math.cos(params.el),
            params.a * Math.sin(params.el)]
        // Get final state
        let stateF = [...state]
        for (let index = 0; index < numBurnPoints; index++) {
            stateF = runge_kutta(twoBodyRpo, stateF, tf / numBurnPoints, dir, startTime)
        }
        stateF = stateF.slice(3,6)

        let des = vf
        let residuals = math.transpose([math.subtract(des, stateF)])
        console.log(jac, residuals);
        let dParams = math.squeeze(math.multiply(math.inv(jac), residuals))
        params.az += dParams[0]
        params.el += dParams[1]
        params.a += dParams[2]
        console.log(residuals);
    }
    let dir = [params.a * Math.cos(params.az) * Math.cos(params.el),
        params.a * Math.sin(params.az) * Math.cos(params.el),
        params.a * Math.sin(params.el)]
    
    let stateF = runge_kutta(twoBodyRpo, state, tf, dir, startTime).slice(3,6)
    return {params, dir}
}

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
        
        showScreenAlert('Right-click anywhere on screen to begin', 4, '60%', 4000)
        setTimeout(() => {
            el.target.remove()
            // showScreenAlert('Right Click to see Options')
        }, 500)
    }
    let ctx = cnvs.getContext('2d')
    cnvs.width = window.innerWidth
    cnvs.height = window.innerHeight
    ctx.fillStyle = '#111122'
    ctx.fillRect(0,0,cnvs.width, cnvs.height)
    ctx.globalAlpha = 1
    ctx.strokeStyle = '#FF1111'
    ctx.beginPath()
    ctx.ellipse(cnvs.width / 2, cnvs.height / 2-50, 200, 100, -20*Math.PI / 180, -2 * Math.PI*0.15, 2 * Math.PI*0.8)
    ctx.stroke()
    ctx.globalAlpha = 1
    ctx.fillStyle = 'white'
    ctx.textBaseline = 'alphabetic'
    ctx.textAlign = 'center'
    ctx.font = (190/1490)*window.innerWidth + 'px sans-serif'
    ctx.fillText(appAcr, cnvs.width / 2, cnvs.height / 2)
    ctx.textBaseline = 'top'
    ctx.font = (24/1490)*window.innerWidth + 'px Courier New'
    ctx.fillText(appName, cnvs.width / 2, cnvs.height / 2+2)
    ctx.fillText('CAO ' + cao, cnvs.width / 2, cnvs.height / 2+(24/1490)*window.innerWidth * 25/24)
    ctx.textBaseline = 'alphabetic'
    ctx.fillText('Click anywhere to begin...', cnvs.width / 2, cnvs.height -(24/1490)*window.innerWidth * 30/24)
}
showLogo()

function uploadTles(event) {
    console.log(event.target.files[0]);
    // if (event.path[0].files[0] === undefined) return
    if (event.target.files[0] === undefined) return
    loadFileTle(event.target.files[0])
}

function tellInputStateFileType(file) {
    // Tells if file is J2000 or TLE file
    if (file.search(/ -?\d*\.\d* {1,}-?\d*\.\d* {1,}-?\d*\.\d* {1,}-?\d*\.\d* {1,}-?\d*\.\d* {1,}-?\d*\.\d*/m) !== -1) return 'j2000'
    else if (file.search(/^1 {1,}\d*.* {1,}\d{5}\./m) !== -1 && file.search(/^2 {1,}\d*/m) !== -1) {
        console.log('tle');
        // Assume file is TLE
        return 'tle'
    }
    else if (file.search('EphemerisTimePosVel') !== -1) return 'ephem'
    else if (file.search(/[l|L]at/) !== -1 && file.search(/[l|L]on/) !== -1) return 'site'
    return 'j2000'
}

function setSun(time=mainWindow.startDate, origin = mainWindow.originOrbit) {
    let sun = sunFromTime(time)  
    let originState = Object.values(Coe2PosVelObject(origin))
    sun = math.squeeze(Eci2Ric(originState.slice(0,3), originState.slice(3,6), sun, [0,0,0]).rHcw)
    sun = math.dotDivide(sun, math.norm(sun))
    mainWindow.initSun = sun
}

function handleStkJ200File(file) {
    document.getElementById('context-menu')?.remove();
    // Check if distance units are in km or meters
    let km = file.search('(km)') !== -1
    let satNames = file.split('\n').find(line => line.search('Satellite-') !== -1).split('Satellite-')[1].split(':  J')[0].split(',').map(name => name.trim())
    
    file = file.split(/\n{2,}/).slice(1).map(sec => sec.split('\n').slice(2)).filter(row => row !== '')
    console.log(file);
    file = file.map(satSection => {
        let newSection = satSection.map(row => {
            let items = row.split(/ {2,}/)
            let date = new Date(items.shift())
            let state = items.map(s => Number(s))
            return [date, ...state]
        }).filter(s => s.length === 7)
        return newSection
    })
    openJ2000Window(file.map((s,ii) => {
        return {name: satNames[ii], state: s}
    }), km)
}

function handleSiteFile(file) {
    // Check if distance units are in km or meters
    let siteNames = file.split('\n').find(line => line.search(/[Place|Facility]-/) !== -1).split(/[Place|Facility]-/)[1].split(':  L')[0].split(',').map(name => name.trim())
    file = file.split(/\n{2,}/).slice(1).map(sec => sec.split('\n').slice(2)).filter(row => row !== '')
    file = file.map(siteSection => {
        let newSection = siteSection.map(row => {
            let items = row.split(/ {2,}/).filter(s => s !== '').map(s => Number(s))
            return items
        })
        return newSection
    })
    file.forEach((site, siteIi) => {
        mainWindow.groundSites.push(new GroundSite({
            name: siteNames[siteIi],
            long: site[0][1] > 180 ? site[0][1] - 360 : site[0][1],
            lat: site[0][0],
            color: '#E17D64'
        }))
    })
}

function generateSiteFile(sites = mainWindow.groundSites) {
    let outFile = `Facility-${sites.map(s => s.name).join(', ')}`
    outFile += sites.map(site => {
        let out = '\n\n\nLat     Long    '
        out += '\n----------------------'
        out += `\n${site.coordinates.lat}     ${site.coordinates.long}`
        return out
    }).join('')
    downloadFile('site.txt', outFile)
}

function handleTleFile(file) {
    file = file.split(/\n/)
    let tleState = []
    let tleRawStates = []
    let outNames = {}
    for (let index = 0; index < file.length; index++) {
        // if (file[index].search(/\b\d{5}[A-Z]\b/) !== -1) {
        if (file[index].search(/1\s\d{5}[\sU]/) !== -1) {
            // Get tle data
            let line2 = file[index+1].split(/\s+/)
            let epoch = file[index].match(/\d{5}.\d{8}/)[0]
            let threeLEname
            if (index !== 0) {
                if (file[index-1][0] === '0') {
                    threeLEname = file[index-1].slice(2)
                }
            }
            let sat = {
                epoch: new Date(`20` + epoch.slice(0,2),0,epoch.slice(2,5),0,0,Number(epoch.slice(5))*86400+72),
                name: line2[1],
                orbit: {
                    a: (((86400 / Number(line2[7])) / 2 / Math.PI) ** 2 * 398600.4418) ** (1/3),
                    e: Number('0.' + line2[4]),
                    i: Number(line2[2]) * Math.PI / 180,
                    raan: Number(line2[3]) * Math.PI / 180,
                    arg: Number(line2[5]) * Math.PI / 180,
                    tA: Number(line2[6]) * Math.PI / 180
                }
            }
            outNames[sat.name] = outNames[sat.name] === undefined ? threeLEname : outNames[sat.name]
            // console.log(sat);
            tleRawStates.push(sat)
            // Check if tle already uploaded, if so see if tle from past
            let otherSat = tleState.findIndex(el => el.name === sat.name)
            if (otherSat !== -1) {
                if (tleState[otherSat].epoch < sat.epoch) tleState.splice(otherSat,1,sat)
                continue
            }
            tleState.push(sat)
            index++
        }
        
    }
    openTleWindow(tleRawStates, outNames)
    return
    
}

function importStates(states, time,  options = {}) {
    let {colors, shapes, names, origin = 0} = options
    let satCopies = JSON.parse(JSON.stringify(mainWindow.satellites))
    let originII = origin
    mainWindow.groundTrackLimits.focus = origin
    // Copy old burns to re-implement if satellite still exists
    let timeDelta = (time - mainWindow.startDate) / 1000
    let oldBurns = mainWindow.satellites.map(s => s.burns.map(b => {
        return {
            time: b.time - timeDelta,
            direction: b.direction,
            waypoint: b.waypoint
        }
    }).filter(b => b.time >= 0))
    let oldReqs = mainWindow.relativeData.dataReqs.map(req => {
        return {
            data: req.data,
            target: mainWindow.satellites[req.target].name,
            origin: mainWindow.satellites[req.origin].name
        }
    })
    mainWindow.relativeData.dataReqs = []
    // Use epoch from last tle
    let baseEpoch = time
    let baseUTCDiff = baseEpoch.getUTCHours() - baseEpoch.getHours()
    mainWindow.startDate = baseEpoch
    states = states.map((s,ii) => {
        let utcDiff = s.epoch.getUTCHours() - s.epoch.getHours()
        if (ii === originII) {
            let originOrbit = propToTimeAnalytic(s.orbit, (baseEpoch - s.epoch) / 1000)
            mainWindow.updateOrigin(PosVel2CoeNew(originOrbit.slice(0,3), originOrbit.slice(3,6)), false)
            if (mainWindow.originOrbit.a < 15000) {
                mainWindow.scenarioLength = ((2 * Math.PI) / mainWindow.mm * 4)/3600
            }
            else {
                mainWindow.scenarioLength = ((2 * Math.PI) / mainWindow.mm * 2)/3600
            }
            mainWindow.updateOrigin(PosVel2CoeNew(originOrbit.slice(0,3), originOrbit.slice(3,6)), false)
            document.querySelector('#time-slider-range').max = mainWindow.scenarioLength * 3600
        }
        return {
            name: s.name,
            orbit: propToTimeAnalytic(s.orbit, (baseEpoch - s.epoch) / 1000)
        }

    })
    oldBurns = oldBurns.map(sat => sat.map(b => {
        return {
            time: b.time,
            direction: b.direction,
            shown: 'during',
            location: b.location,
            waypoint: false
        }
    }))
    mainWindow.satellites = []
    states.forEach((st, iiSt) => {
        let position = PosVel2CoeNew(st.orbit.slice(0,3), st.orbit.slice(3,6))
        let existingSat = satCopies.filter(sat => sat.name.match(st.name) !== null)
        let color, shape, side, a, name, burns
        if (existingSat.length > 0) {
            let existingSatIndex = satCopies.findIndex(sat => sat.name.match(st.name) !== null)
            color = existingSat[0].color
            shape = existingSat[0].shape
            side = existingSat[0].side
            a = existingSat[0].a,
            name = existingSat[0].name
            burns = oldBurns[existingSatIndex]
        }
        mainWindow.satellites.push(new Satellite({
            position,
            name: names !== undefined ? names[iiSt] : name === undefined ? st.name : name,
            color: colors !== undefined ? colors[iiSt] : color,
            a,
            shape: shapes !== undefined ? shapes[iiSt] : shape,
            side,
            burns
        }))
    })
    // Restore data reqs that still exist
    setTimeout(() => {
        oldReqs.forEach(req => {
            let target = mainWindow.satellites.findIndex(sat => sat.name === req.target)
            let origin = mainWindow.satellites.findIndex(sat => sat.name === req.origin)
            if (target !== -1 && origin !== -1) {
                mainWindow.relativeData.dataReqs.push({
                    target,
                    origin,
                    data: req.data
                })
            }
        })
        
        resetDataDivs()
    }, 500);
}

function loadFileTle(fileToLoad) {
    var fileReader = new FileReader();
    fileReader.onload = (fileLoadedEvent) => handleImportTextFile(fileLoadedEvent.target.result)
    fileReader.readAsText(fileToLoad, "UTF-8");
}

function julianDate(yr=1996, mo=10, d=26, h=14, min=20, s=0) {
    return 367 * yr - Math.floor(7*(yr+Math.floor((mo+9)/12)) / 4) + Math.floor(275*mo/9) + d + 1721013.5 + ((s/60+min)/60+h)/24
}

function sunFromTime(date = new Date()) {
    let jdUti = julianDate(date.getFullYear(), date.getMonth() + 1, date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds())
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

// function elorb(state = [42164.14, 0, 0, 0, 3.0746611796284924, 0]) {
function elorb(state = [6524.834, 6862.875, 6448.296, 4.901327, 5.533756, -1.976341]) {
    // From Vallado "Fudamentals of Astrodynamics and Applications" 2 ed. pg 120
    let mu = 398600.4418
    let r = state.slice(0,3) 
    let rn = math.norm(r)
    let v = state.slice(3,6)
    let vn = math.norm(v)
    let h = math.cross(r,v)
    let hn = math.norm(h)
    let n = math.cross([0,0,1], h)
    let e = math.dotDivide(math.subtract(math.dotMultiply(vn ** 2 - mu / rn, r), math.dotMultiply(math.dot(r, v), v)), mu)
    let en = math.norm(e)
    let specMechEn = vn ** 2 / 2 - mu / rn
    let a = -mu / 2 / specMechEn
    let i = math.acos(h[2] / hn)
    let raan = math.acos(n[0] / math.norm(n))
    if (n[1] < 0) {
        raan = 2 * Math.PI - raan
    }
    let arg = math.acos(math.dot(n, e) / math.norm(n) / en)
    if (e[2] < 0) {
        arg = 2 * Math.PI - arg
    }
    let tA = math.acos(math.dot(e, r) / en / rn)
    if (math.dot(r, v) < 0) {
        tA = 2 * Math.PI - tA
    }
    let longOfPeri, argLat, trueLong
    if (en < 1e-6 && i < 1e-6) {
        trueLong = math.acos(r[0] / rn)
        if (r[1] < 0) {
            trueLong = 2 * Math.PI - trueLong
        }
    }
    else if (en < 1e-6) {
        argLat = math.acos(math.dot(n, r) / math.norm(n) / rn)
        if (r[2] < 0) {
            argLat = 2 * Math.PI - argLat
        }
    }
    else if (i < 1e-6) {
        longOfPeri = math.acos(e[0] / en)
        if (e[1] < 0) {
            longOfPeri = 2 * Math.PI - longOfPeri
        }
    }
    return {
        a,
        e: en,
        i,
        raan,
        arg,
        tA,
        longOfPeri,
        argLat,
        trueLong
    }
}

function randv(coe) {
    // From Vallado "Fudamentals of Astrodynamics and Applications" 2 ed. pg 125
    if (coe.trueLong !== undefined) {
        coe.arg = 0
        coe.raan = 0
        coe.tA = coe.trueLong
    }
    if (coe.argLat !== undefined) {
        coe.arg = 0
        coe.tA = coe.argLat
    }
    if (coe.longOfPeri !== undefined) {
        coe.raan = 0
        coe.arg = coe.longOfPeri
    }
    
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
    ]
    let cRa = Math.cos(coe.raan);
    let sRa = Math.sin(coe.raan);
    let cAr = Math.cos(coe.arg);
    let sAr = Math.sin(coe.arg);
    let cIn = Math.cos(coe.i);
    let sin = Math.sin(coe.i);
    let R = [
        [cRa * cAr - sRa * sAr * cIn, -cRa * sAr - sRa * cAr * cIn, sRa * sin],
        [sRa * cAr + cRa * sAr * cIn, -sRa * sAr + cRa * cAr * cIn, -cRa * sin],
        [sAr * sin, cAr * sin, cIn]
    ];
    console.log(R, r, v);
    r = math.multiply(R, r);
    v = math.multiply(R, v);
    let state = [...r, ...v];
    return math.squeeze(state)
}

function propToTime(state = [42164.14, 0, 0, 0, 3.0746611796284924, 0], dt = 86164, j2 = mainWindow.j2) {
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

function demarcateLanes(sats = mainWindow.satellites) {
    // Lane width in degrees, splits satellites in system into lanes 
    lanes = []
    let satIndexes = math.range(0, sats.length)._data
    while (satIndexes.length > 0) {
        let lane = []
        let laneAnchor = satIndexes.shift()
        let anchorPosition = Object.values(sats[laneAnchor].position).slice(0,3)
        anchorPosition[0] += mainWindow.originOrbit.a
        anchorPosition[2] = 0
        lane.push(laneAnchor)
        for (let index = 0; index < satIndexes.length; index++) {
            let position = Object.values(sats[satIndexes[index]].position).slice(0,3)
            position[0] += mainWindow.originOrbit.a
            position[2] = 0
            let angle = math.acos(math.dot(anchorPosition, position) / math.norm(anchorPosition) / math.norm(position)) * 180 / Math.PI
            if (angle < mainWindow.laneWidth) {
                lane.push(satIndexes.splice(index, 1)[0])
                index--
            }
        }
        
        lanes.push(lane)
    }
    lanes.sort((a,b) => {
        return -mainWindow.satellites[a[0]].position.i + mainWindow.satellites[b[0]].position.i
    })
    return lanes
}

function propRelMotionTwoBodyAnalytic(r1Ric = [10,0,0,0,0,0], dt = 60, scenTime) {
    let initialInertState = {...mainWindow.originOrbit}
    initialInertState.tA = propTrueAnomaly(initialInertState.tA, initialInertState.a, initialInertState.e, scenTime)
    let initState = Object.values(Coe2PosVelObject(initialInertState))
    initialInertState.tA = propTrueAnomaly(initialInertState.tA, initialInertState.a, initialInertState.e, dt)
    let depInitState = Ric2Eci(r1Ric.slice(0,3), r1Ric.slice(3,6), initState.slice(0,3), initState.slice(3,6))
    depInitState = [...depInitState.rEcci, ...depInitState.drEci]
    // console.log(PosVel2CoeNew(depInitState.slice(0,3), depInitState.slice(3,6)));
    let depFinalState = propToTime(depInitState, dt, false)
    // console.log(depFinalState);
    let finalState = Object.values(Coe2PosVelObject(initialInertState))
    let depRicFinal = Eci2Ric(finalState.slice(0,3), finalState.slice(3,6), depFinalState.slice(0,3), depFinalState.slice(3,6))
    depRicFinal = math.squeeze([...depRicFinal.rHcw, ...depRicFinal.drHcw])
    return depRicFinal
}

function satClusterK(nClusters = mainWindow.nLane, sats = mainWindow.satellites, origin = mainWindow.originOrbit) {
    try {
        nClusters = nClusters > sats.length ? sats.length : nClusters
        nClusters = math.floor(nClusters)
        sats = sats.map((s,iiSat) => {
            let satEci = Object.values(getCurrentInertial(iiSat, mainWindow.scenarioTime))
            let y = satEci[1]
            let x = satEci[0]
            return {long: Math.atan2(y,x) * 180 / Math.PI, cluster: undefined}
        })
        console.log('Sats before clustering: ',sats);
        let maxLong = math.max(sats.map(s => s.long))
        let minLong = math.min(sats.map(s => s.long))
        let clusters = math.range(maxLong, minLong, -(maxLong - minLong) / (nClusters - 1), true)._data
        if (clusters.length === 0) {
            console.log('no clusters, using max cluster')
            clusters = [maxLong]
        }
        console.log('Initial Clusters: ',clusters);
        for (let index = 0; index < 10; index++) {
            // Assign points to clusters
            sats = sats.map(s => {
                let c = clusters.map(c => math.abs(c - s.long))
                c = c.findIndex(n => n === math.min(c))
    
                return {
                    long: s.long, cluster: c
                }
            })
            // Adjust clusters
            for (let ii = 0; ii < clusters.length; ii++) {
                if (sats.filter(s => s.cluster === ii).length === 0) continue
                clusters[ii] = math.mean(sats.filter(s => s.cluster === ii).map(s => s.long))
            }
        }
        sats = sats.map((s, ii) => {return {cluster: s.cluster, sat: ii}})
        console.log('Sats after clustering: ',sats);
        let output = []
        for (let index = 0; index < clusters.length; index++) {
            output.push(sats.filter(s => s.cluster === index).map(s => s.sat))
        }
        output = output.filter(s => s.length > 0)
        return output
    } catch (error) {
        console.log(error);
        let output = [math.range(0,mainWindow.satellites.length)._data]
        return output
    }
}
setSun()
let focLen = 1, azD = 45, elD = 45
function draw3dScene(az = azD, el = elD) {
    el = 90 - el
    let linePoints = 200
    let lineLength = 0.25 * mainWindow.plotHeight
    let sunLength = lineLength * 0.8
    let points = []
    let ctx = mainWindow.getContext()
    let d = lineLength * 2 
    let r = math.multiply( rotationMatrices(el, 2), rotationMatrices(az, 3))
    let curSun = mainWindow.getCurrentSun().map(s => s * sunLength)
    // Calc points for axis lines
    for (let index = 0; index <= linePoints; index++) {

        points.push({
            color: mainWindow.colors.foregroundColor,
            position: math.multiply(r, [lineLength * index / linePoints, 0, 0]),
            size: 2
        },{
            color: mainWindow.colors.foregroundColor,
            position: math.multiply(r, [0, lineLength * index / linePoints, 0]),
            size: 2
        },{
            color: mainWindow.colors.foregroundColor,
            position: math.multiply(r, [0, 0, lineLength * index / linePoints]),
            size: 2
        },{
            color: '#ffa500',
            position: math.multiply(r, math.dotMultiply(index / linePoints, curSun)),
            size: 2
        })
    }
    points.push({
        color: mainWindow.colors.foregroundColor,
        position: math.multiply(r, [lineLength, 0, 0]),
        size: 2,
        text: 'R'
    },{
        color: mainWindow.colors.foregroundColor,
        position: math.multiply(r, [0,lineLength, 0]),
        size: 2,
        text: 'I'
    },{
        color: mainWindow.colors.foregroundColor,
        position: math.multiply(r, [0,0,lineLength]),
        size: 2,
        text: 'C'
    })
    mainWindow.satellites.forEach(sat => {
        if (sat.stateHistory === undefined) sat.calcTraj()
        let cur = sat.currentPosition(mainWindow.scenarioTime);
        cur = {r: cur[0], i: cur[1], c: cur[2], rd: cur[3], id: cur[4], cd: cur[5]};
        sat.curPos = cur;
        if (!sat.locked) sat.stateHistory.forEach(point => {
            points.push({
                color: sat.color,
                position: math.multiply(r, [point.position[0], point.position[1], point.position[2]]),
                size: 2
            })
        })
        let pos = math.multiply(r, [sat.curPos.r, sat.curPos.i, sat.curPos.c])
        sat.pixelPos = mainWindow.convertToPixels(pos).ri
        points.push({
            color: sat.color,
            position: pos,
            size: 10,
            text: shortenString(sat.name),
            shape: sat.shape
        })
    })
    points = points.sort((a,b) => a.position[2] - b.position[2])
    ctx.textAlign = 'center'
    ctx.font = 'bold 15px serif'
    points.map(p => {
        pos = mainWindow.convertToPixels(p.position).ri
        ctx.fillStyle = p.color
        ctx.fillRect(pos.x - p.size / 2, pos.y - p.size / 2,p.size,p.size)
        if (p.text !== undefined) {
            ctx.fillText(p.text, pos.x, pos.y - 5)
        }
        // if (p.shape !== undefined) {
        //     drawSatellite({
        //         pixelPosition: [p.x, p.y],
        //         shape: p.shape,
        //         cnvs: mainWindow.cnvs,
        //         ctx
        //     })
        // }
    })
}

function hcwFiniteBurnTwoBurn(stateInit = {x: 0, y: 0, z: 0, xd: 0, yd: 0, zd: 0}, stateFinal = {x: 10, y: 0, z: 0, xd: 0, yd: 0, zd: 0}, tf = 7200, a0 = 0.00001, n = mainWindow.mm) {
    
    let state = math.transpose([Object.values(stateInit)]);
    let linState = math.transpose([curve2linear(math.squeeze(state))])
    stateFinal = math.transpose([Object.values(stateFinal)]);
    let linStateFinal = math.transpose([curve2linear(math.squeeze(stateFinal))])
    let v = proxOpsTargeter(linState.slice(0, 3), linStateFinal.slice(0, 3), tf);
    v = [math.transpose([linear2curve([...math.squeeze(linState).slice(0,3), ...math.squeeze(v[0])]).slice(3,6)]), v[1]];
    // let v = proxOpsTargeter(state.slice(0, 3), stateFinal.slice(0, 3), tf);
    let v1 = v[0],
        v2 = v[1],
        yErr, S, dX = 1,
        F, invS, invSSt, ii = 0;
    let dv1 = math.subtract(v1, state.slice(3, 6));
    let dv2 = math.subtract(state.slice(3, 6), v2);
    // [alpha - in plane angle, phi - out of plane angle, tB - total burn time %]
    let X = [
        [Math.atan2(dv1[1][0], dv1[0][0])],
        [Math.atan2(dv1[2], math.norm([dv1[0][0], dv1[1][0]]))],
        [math.norm(math.squeeze(dv1)) / a0 / tf],
        [Math.atan2(dv2[1][0], dv2[0][0])],
        [Math.atan2(dv2[2], math.norm([dv2[0][0], dv2[1][0]]))],
        [math.norm(math.squeeze(dv2)) / a0 / tf]
    ];
    // console.log(X);
    while (math.norm(math.squeeze(dX)) > 1e-6) {
        
        F = twoBurnFiniteHcw(stateInit, X[0][0], X[1][0], X[3][0], X[4][0], X[2][0], X[5][0], tf, a0, n);
        
        yErr = [
            [stateFinal[0][0] - F.x],
            [stateFinal[1][0] - F.y],
            [stateFinal[2][0] - F.z],
            [stateFinal[3][0] - F.xd],
            [stateFinal[4][0] - F.yd],
            [stateFinal[5][0] - F.zd]
        ];
        S = proxOpsJacobianTwoBurn(stateInit, a0, X[0][0], X[1][0], X[2][0], X[3][0], X[4][0], X[5][0], tf, n);
        invSSt = math.inv(math.multiply(S, math.transpose(S)));
        invS = math.multiply(math.transpose(S), invSSt);
        console.log(S);
        // console.log(multiplyMatrix(math.transpose(S),invSSt))
        dX = math.multiply(invS, yErr);
        X = math.add(X, dX)
        X[2][0] = X[2][0] < 0 ? 0.1 : X[2][0]
        X[2][0] = X[2][0] > 0.5 ? 0.4 : X[2][0]
        X[5][0] = X[5][0] < 0 ? 0.1 : X[5][0]
        X[5][0] = X[5][0] > 0.5 ? 0.4 : X[5][0]
        console.log(math.squeeze(X));
        ii++
        if (ii > 50) {
            return false
        }
    }
    return {
        burn1: {
            r: a0 * X[2] * tf * Math.cos(X[0][0]) * Math.cos(X[1][0]),
            i: a0 * X[2] * tf * Math.sin(X[0][0]) * Math.cos(X[1][0]),
            c: a0 * X[2] * tf * Math.sin(X[1][0]),
            t: X[2][0] * tf
        },
        burn2: {
            r: a0 * X[5] * tf * Math.cos(X[3][0]) * Math.cos(X[4][0]),
            i: a0 * X[5] * tf * Math.sin(X[3][0]) * Math.cos(X[4][0]),
            c: a0 * X[5] * tf * Math.sin(X[4][0]),
            t: X[5][0] * tf
        }
    }
    // return X;
}

function proxOpsJacobianTwoBurn(state, a, alpha1, phi1, tB1, alpha2, phi2, tB2, tF, n) {
    let m1, m2, mC, mFinal = [];
    
    //alpha1
    m1 = twoBurnFiniteHcw(state, alpha1 - 0.0001, phi1, alpha2, phi2, tB1, tB2, tF, a, n);
    m1 = [
        [m1.x],
        [m1.y],
        [m1.z],
        [m1.xd],
        [m1.yd],
        [m1.zd]
    ];
    m2 = twoBurnFiniteHcw(state, alpha1 + 0.0001, phi1, alpha2, phi2, tB1, tB2, tF, a, n);
    m2 = [
        [m2.x],
        [m2.y],
        [m2.z],
        [m2.xd],
        [m2.yd],
        [m2.zd]
    ];
    mC = math.dotDivide(math.subtract(m2, m1), 0.0002);
    mFinal = mC;
    //phi1
    m1 = twoBurnFiniteHcw(state, alpha1, phi1 - 0.01, alpha2, phi2, tB1, tB2, tF, a, n);
    m1 = [
        [m1.x],
        [m1.y],
        [m1.z],
        [m1.xd],
        [m1.yd],
        [m1.zd]
    ];
    m2 = twoBurnFiniteHcw(state, alpha1, phi1 + 0.01, alpha2, phi2, tB1, tB2, tF, a, n);
    m2 = [
        [m2.x],
        [m2.y],
        [m2.z],
        [m2.xd],
        [m2.yd],
        [m2.zd]
    ];
    console.log(m1,m2);
    mC = math.dotDivide(math.subtract(m2, m1), 0.02);
    mFinal = math.concat(mFinal, mC);
    //tB1
    m1 = twoBurnFiniteHcw(state, alpha1, phi1, alpha2, phi2, tB1 - tB1 * 0.01, tB2, tF, a, n);
    m1 = [
        [m1.x],
        [m1.y],
        [m1.z],
        [m1.xd],
        [m1.yd],
        [m1.zd]
    ];
    m2 = twoBurnFiniteHcw(state, alpha1, phi1, alpha2, phi2, tB1 + tB1 * 0.01, tB2, tF, a, n);
    m2 = [
        [m2.x],
        [m2.y],
        [m2.z],
        [m2.xd],
        [m2.yd],
        [m2.zd]
    ];
    mC = math.dotDivide(math.subtract(m2, m1), 2 * tB1 * 0.01);
    mFinal = math.concat(mFinal, mC);
    //alpha2
    m1 = twoBurnFiniteHcw(state, alpha1, phi1, alpha2 - 0.0001, phi2, tB1, tB2, tF, a, n);
    m1 = [
        [m1.x],
        [m1.y],
        [m1.z],
        [m1.xd],
        [m1.yd],
        [m1.zd]
    ];
    m2 = twoBurnFiniteHcw(state, alpha1, phi1, alpha2 + 0.0001, phi2, tB1, tB2, tF, a, n);
    m2 = [
        [m2.x],
        [m2.y],
        [m2.z],
        [m2.xd],
        [m2.yd],
        [m2.zd]
    ];
    mC = math.dotDivide(math.subtract(m2, m1), 0.0002);
    mFinal = math.concat(mFinal, mC);
    //phi2
    m1 = twoBurnFiniteHcw(state, alpha1, phi1, alpha2, phi2 - 0.0001, tB1, tB2, tF, a, n);
    m1 = [
        [m1.x],
        [m1.y],
        [m1.z],
        [m1.xd],
        [m1.yd],
        [m1.zd]
    ];
    m2 = twoBurnFiniteHcw(state, alpha1, phi1, alpha2, phi2 + 0.0001, tB1, tB2, tF, a, n);
    m2 = [
        [m2.x],
        [m2.y],
        [m2.z],
        [m2.xd],
        [m2.yd],
        [m2.zd]
    ];
    mC = math.dotDivide(math.subtract(m2, m1), 0.0002);
    mFinal = math.concat(mFinal, mC);
    //tB2
    m1 = twoBurnFiniteHcw(state, alpha1, phi1, alpha2, phi2, tB1, tB2 - tB2 * 0.01, tF, a, n);
    m1 = [
        [m1.x],
        [m1.y],
        [m1.z],
        [m1.xd],
        [m1.yd],
        [m1.zd]
    ];
    m2 = twoBurnFiniteHcw(state, alpha1, phi1, alpha2, phi2, tB1, tB2 + tB2 * 0.01, tF, a, n);
    m2 = [
        [m2.x],
        [m2.y],
        [m2.z],
        [m2.xd],
        [m2.yd],
        [m2.zd]
    ];
    mC = math.dotDivide(math.subtract(m2, m1), 2 * tB2 * 0.01);
    mFinal = math.concat(mFinal, mC);
    return mFinal;
}

function twoBurnFiniteHcw(state = {x: 0, y: 0, z: 0, xd: 0, yd: 0, zd: 0}, alpha1=0, phi1=0, alpha2=0, phi2=0, tB1=0.05, tB2=0.05, tf=7200, a0=0.00001, n = mainWindow.mm) {
    state = Object.values(state)
    let t1 = tB1 * tf,
        t2 = tf - tB1 * tf - tB2 * tf,
        t3 = tB2 * tf;
    let direction1 = [Math.cos(alpha1) * Math.cos(phi1), Math.sin(alpha1) * Math.cos(phi1), Math.sin(phi1)].map(s => s * a0)
    let direction2 = [Math.cos(alpha2) * Math.cos(phi2), Math.sin(alpha2) * Math.cos(phi2), Math.sin(phi2)].map(s => s * a0)
    let propTime = 0
    while ((propTime + mainWindow.timeDelta) < t1) {
        state = runge_kutta(twoBodyRpo, state, mainWindow.timeDelta, direction1)
        propTime += mainWindow.timeDelta
    }
    state = runge_kutta(twoBodyRpo, state, t1 - propTime, direction1)
    
    state = propRelMotionTwoBodyAnalytic(state, t2)
    propTime = 0
    while ((propTime + mainWindow.timeDelta) < t3) {
        state = runge_kutta(twoBodyRpo, state, mainWindow.timeDelta, direction2)
        propTime += mainWindow.timeDelta
    }
    state = runge_kutta(twoBodyRpo, state, t3 - propTime, direction2)
    
    

    return {
        x: state[0],
        y: state[1],
        z: state[2],
        xd: state[3],
        yd: state[4],
        zd: state[5]
    };

}

function satTargetRmoes(sat = 0, options = {}) {
    let {tof = 7200, ae = 20, x = 0, y = 0, m = 0, b = 0, z = 0} = options
    let ric = rmoeToRic({
        ae, x, y, z, m, b
    }, mainWindow.scenarioTime + tof)
    console.log(ric,{
        ae, x, y, z, m, b
    }, mainWindow.scenarioTime + tof);
    let startPos = mainWindow.satellites[sat].curPos
    startPos = {
        x: startPos.r,
        y: startPos.i,
        z: startPos.c,
        xd: startPos.rd,
        yd: startPos.id,
        zd: startPos.cd
    }
    let endPos = {
        x: ric.rHcw[0][0],
        y: ric.rHcw[1][0],
        z: ric.rHcw[2][0],
        xd: ric.drHcw[0][0],
        yd: ric.drHcw[1][0],
        zd: ric.drHcw[2][0]
    }
    console.log(startPos, endPos);
    let burns = hcwFiniteBurnTwoBurn(startPos, endPos, tof, mainWindow.satellites[sat].a)
    console.log(burns);
    if (burns === false) return showScreenAlert('Outside of kinematic reach')
    if (burns.burn1.t < 0 || burns.burn2.t < 0 || (burns.burn1.t + burns.burn2.t) > tof) return showScreenAlert('Outside of kinematic reach')
    if (Object.values(burns.burn1).filter(s => Number.isNaN(s)).length > 0 || Object.values(burns.burn2).filter(s => Number.isNaN(s)).length > 0) return showScreenAlert('No Valid Solution Found')

    insertDirectionBurn(sat, mainWindow.scenarioTime,[burns.burn1.r, burns.burn1.i, burns.burn1.c])
    insertDirectionBurn(sat, mainWindow.scenarioTime + tof - burns.burn2.t,[burns.burn2.r, burns.burn2.i, burns.burn2.c])
}

function findMinDistanceRedux(sat1 = 0, sat2 = 1) {
    let hist1 = mainWindow.satellites[sat1].stateHistory
    let hist2 = mainWindow.satellites[sat2].stateHistory
    let dist = hist1.map((val, ii) => math.norm(math.subtract(Object.values(val).slice(1), Object.values(hist2[ii]).slice(1))))
    let minVal = math.min(dist)
    let minIndex = dist.findIndex(s => s === minVal)
    let index = -1
    index = minIndex < 1 ? -minIndex : minIndex > (dist.length - 2) ? dist.length - 3 : index
    let x = [], y = []
    for (let ii = 0; ii < 3; ii++) {
        x.push(hist1[minIndex + index].t)
        y.push(dist[minIndex + index])
        index++   
    }
    let c = lagrangePolyCalc(x,y)
    let dc = derivateOfPolynomial(c)
    let ddc = derivateOfPolynomial(dc)
    let tGuess = hist1[minIndex].t
    tGuess = tGuess - answerPolynomial(dc, tGuess) / answerPolynomial(ddc, tGuess)
    let minDist = math.norm(math.squeeze(math.subtract(Object.values(mainWindow.satellites[sat1].currentPosition({time: tGuess})), Object.values(mainWindow.satellites[sat2].currentPosition({time: tGuess})))))
    return {tMin: tGuess, dMin: minDist}
}

function fitPolynomial(x = [0, 1, 3], y = [[1],[-2],[4]], d=2) {
    if (x.length !== y.length) return console.error('X & Y values need to be the same length')
    d = (x.length-1) < d ? x.length - 1 : d
    let jac = []
    for (let ii = 0; ii < x.length; ii++) {
        let line = []
        for (let jj = 0; jj <= d; jj++) {
            line.push(x[ii] ** jj)
        }
        jac.push(line)
    }
    let consts = math.squeeze(math.multiply(math.inv(jac), y))
    return consts.reverse()
}

function fitPolynomialRedux(x = [0, 1, 3], y = [1,-2,4]) {
    y = math.transpose([y])
    if (x.length !== y.length) return console.error('X & Y values need to be the same length')
    let d = x.length - 1
    let jac = []
    for (let ii = 0; ii < x.length; ii++) {
        let line = []
        for (let jj = 0; jj <= d; jj++) {
            line.push(x[ii] ** jj)
        }
        jac.push(line)
    }
    let consts = math.squeeze(math.multiply(math.inv(jac), y))
    return consts.reverse()
}

function errorFromTime(t = mainWindow.scenarioTime, error = mainWindow.error.neutral) {
    let p = error.p / (error.cp ** (t / 3600))
    let v = error.v / (error.cv ** (t / 3600)) / 1000
    return [p,p,p,v,v,v]
}

function convertTimeToDateTimeInput(timeIn = mainWindow.startDate, seconds = true) {
    let padNumber = function(n) {
        return n < 10 ? '0' + n : n
    }
    timeIn = new Date(timeIn)
    if (timeIn == 'Invalid Date') return
    if (seconds) {
        return `${timeIn.getFullYear()}-${padNumber(timeIn.getMonth()+1)}-${padNumber(timeIn.getDate())}T${padNumber(timeIn.getHours())}:${padNumber(timeIn.getMinutes())}:${padNumber(timeIn.getSeconds())}`
    }
    return `${timeIn.getFullYear()}-${padNumber(timeIn.getMonth()+1)}-${padNumber(timeIn.getDate())}T${padNumber(timeIn.getHours())}:${padNumber(timeIn.getMinutes())}:${padNumber(timeIn.getSeconds())}`
}

function setTimeFromPrompt(el) {
    let inputs = [...el.parentElement.parentElement.querySelectorAll('input')].map(s => s.value === '' ? s.placeholder : s.value)
    if (inputs.length > 2) {
        let startTime = new Date(inputs[1] + ' ' + inputs[0])
        let oldStart = mainWindow.startDate
        mainWindow.startDate = startTime
        inputs[2] = Number(inputs[2]) > 1 ? Number(inputs[2]) : 1
        mainWindow.scenarioLength = inputs[2]
        document.getElementById('time-slider-range').max = inputs[2]*3600
        mainWindow.satellites.forEach(sat => {
            sat.latLong = undefined
        })
        mainWindow.updateOrigin()
        if (math.abs(oldStart - mainWindow.startDate) > 600000) mainWindow.changeTime(0, true)
    }
    else {
        let newDate = new Date(inputs[1] + ' ' + inputs[0])
        let newTime = newDate - mainWindow.startDate
        if (newTime < 0) {
            newTime = 0
        }
        else if (newTime > mainWindow.scenarioLength*3600000)  {
            newTime = mainWindow.scenarioLength * 3600000
        }
        mainWindow.changeTime(newTime / 1000, true)
    }
    document.querySelector('dialog').close()
    updateWhiteCellTimeAndErrors()
}

function showStartTimePrompt(el) {
    let padNumber = function(a, b = 2) {
        a = a + ''
        while (a.length < b) {
            a = '0' + a
        }
        return a
    }
    let curStart = mainWindow.startDate
    let div = el.parentElement.parentElement.querySelector('div')
    let currentInputs = div.querySelectorAll('input')
    currentInputs[0].value = `${padNumber(curStart.getHours())}:${padNumber(curStart.getMinutes())}`;
    currentInputs[1].value = `${curStart.getFullYear()}-${padNumber(curStart.getMonth()+1)}-${padNumber(curStart.getDate())}`;

    let newDiv = document.createElement('div')
    newDiv.innerHTML = `
        <div style="display: flex; justify-content: space-around;">
            <div><label>Scenario Length</label> <input style="width: 5ch; font-size: 1.5em;" type="number" placeholder="${mainWindow.scenarioLength}"/> hrs</div
        </div>
    `
    div.after(newDiv)
    el.remove()
    document.querySelector('dialog').querySelector('input').focus()
}

function openTimePrompt() {
    let padNumber = function(a, b = 2) {
        a = a + ''
        while (a.length < b) {
            a = '0' + a
        }
        return a
    }
    let curTime = new Date(mainWindow.startDate - (-mainWindow.scenarioTime * 1000))
    // remove seconds from the current time
    curTime = new Date(curTime.getFullYear(), curTime.getMonth(), curTime.getDate(), curTime.getHours(), curTime.getMinutes())
    let dateOptions = []
    for (let index = 0; index < 12; index++) {
        let optionTime = new Date(mainWindow.startDate - (-index*(mainWindow.scenarioLength / 12) * 3600 * 1000))
        dateOptions.push(optionTime)
    }
    let inner = `
        <div style="display: flex; justify-content: space-around;">
            <div><input value="${padNumber(curTime.getHours())}:${padNumber(curTime.getMinutes())}" style="font-size: 2em;" type="time"/></div>
            <div><input value="${curTime.getFullYear()}-${padNumber(curTime.getMonth()+1)}-${padNumber(curTime.getDate())}" style="font-size: 2em;" type="date"/></div>
        </div>
        <div>
            <button onclick="setTimeFromPrompt(this)"style="width: 100%; margin-top: 10px">Set Time</button>
            ${mainWindow.ephemViewerMode ? '' :`<button onclick="showStartTimePrompt(this)"style="width: 100%; margin-top: 10px">Set Start Time and Scenario Length</button>`}
            <button onclick="closeQuickWindow()"style="width: 100%; margin-top: 10px">Cancel</button>
        </div>
    `
    openQuickWindow(inner, {width: '50%'})
}

function setZoomFromWindow(el) {
    let input = el.parentElement.parentElement.querySelector('input')
    input = Number(input.value === '' ? input.placeholder : input.value)
    input = input < 0 ? mainWindow.desired.plotWidth : input
    mainWindow.desired.plotWidth = input
    document.querySelector('dialog').close()
}

function openZoomWindow() {
    let curZoom = mainWindow.desired.plotWidth
    let inner = `
        <div><h1>Desired Display Width</h1></div>
        <div>
            <input type="number" style="width: 10em; font-size: 2em" placeholder="${curZoom.toFixed(0)}"> km
        </div>
        <div>
            <button onclick="setZoomFromWindow(this)"style="width: 100%; margin-top: 10px">Set Width</button>
            <button onclick="closeQuickWindow()"style="width: 100%; margin-top: 10px">Cancel</button>
        </div>
    `
    openQuickWindow(inner)
}

function changeLockStatus(el) {
    let sat = el.getAttribute('sat')
    mainWindow.satellites[sat].locked = !el.checked
}

function changeNumLanes(el) {
    let nLanes = Number(el.value)
    mainWindow.nLane = nLanes < 1 ? 1 : nLanes
    openSatellitePanel()
}

function deleteSatellite(sat = 1) {
    let confirmDelete = confirm('Delete ' + mainWindow.satellites[sat].name + ' from the scenario?')
    if (!confirmDelete) return

    mainWindow.relativeData.dataReqs = mainWindow.relativeData.dataReqs.filter(s => s.target !== sat && s.origin !== sat)
    for (let index = 0; index < mainWindow.relativeData.dataReqs.length; index++) {
        let origin = mainWindow.relativeData.dataReqs[index].origin
        origin = origin > sat ? origin-1 : origin
        let target = mainWindow.relativeData.dataReqs[index].target
        target = target > sat ? target-1 : target
        mainWindow.relativeData.dataReqs[index].origin = origin
        mainWindow.relativeData.dataReqs[index].target = target
        
    }
    mainWindow.satellites.splice(sat,1)
    resetDataDivs()
    openSatellitePanel()
}

function openSatellitePanel(nLanes = mainWindow.nLane) {
    document.getElementById('context-menu')?.remove();
    
    let lanes = satClusterK(nLanes)
    let inner = `
        <div><h1>Satellite Panel</h1></div>
        <div>
            ${lanes.map((lane, laneIi) => {
                let laneDiv = `
                    <div><h3>Lane ${laneIi + 1}</h3></div>
                    <div style="display: flex; flex-wrap: wrap;">
                `
                return laneDiv + lane.map(sat => {
                    
                    let chosenSat = mainWindow.satellites[sat]
                    return `
                        <div style="margin: 10px; font-size: 1.5em;">
                            <label style="font-size: 1.5em;" for="${chosenSat.name}-checkbox"/>${chosenSat.name}</label>
                            <button style="font-size: 1em;" onclick="changeOrigin(${sat})">Center</button>
                            <button style="font-size: 1em;" tabindex="-1" onclick="deleteSatellite(${sat})">X</button>
                        </div>
                    ` 
                }).join('') + '</div>'
            }).join('')}
        </div>
        <div># Lanes <input oninput="changeNumLanes(this)" style="width: 4ch;" type="number" value="${nLanes}"/></div>
        <div style="font-weight: 800; font-size: 0.75em;">
            *Centering on an object will center on the objects <em>CURRENT</em> orbit, including any maneuver the object has undertaken
        </div>
        <div>
            <button onclick="closeQuickWindow()"style="width: 100%; margin-top: 10px">Close</button>
        </div>
    `
    openQuickWindow(inner)
}

function satAccessCheckChange(el) {
    let associatedLabel = el.parentElement.querySelector('label');
    associatedLabel.style.color = el.checked ? 'rgb(100,200,100)' : 'rgb(200,100,100)'
}

function closeSensorAccessPanel(el) {
    document.querySelector('dialog').close()
    if (el.innerText === 'Cancel') return
    let siteCheckboxes = document.querySelector('dialog').querySelector('#site-access-outer-div').querySelectorAll('input[type="checkbox"]')
    let satCheckboxes = document.querySelector('dialog').querySelector('#sat-access-outer-div').querySelectorAll('input[type="checkbox"]')
    siteCheckboxes = [...siteCheckboxes].filter(box => box.checked).map(box => {
        box = box.parentElement
        return Number(box.getAttribute('siteindex'))
    })
    satCheckboxes = [...satCheckboxes].filter(box => box.checked).map(box => {
        box = box.parentElement
        return Number(box.getAttribute('satindex'))
    })
    mainWindow.siteAccessData[0] = {
        sites: siteCheckboxes,
        satellites: satCheckboxes
    }
}

function openSensorAccessPanel() {
    let sites = mainWindow.groundSites.map((s,ii) => [ii, s.name])
    let sats = mainWindow.satellites.map((s,ii) => [ii, s.name])
    let access = mainWindow.siteAccessData[0]
    let windowHtml = `
        <div style="display: flex; justify-content: space-around">
            <div id="site-access-outer-div">
                <h2>Ground Sites</h2>
                ${sites.map(si => {
                    return `
                        <div class="site-access-div" sitename="${si[1]}" siteindex="${si[0]}">
                            <input onchange="satAccessCheckChange(this)" ${access.sites.find(s => s===si[0]) === undefined ? '' : 'checked'} id="${si[1]}-checkbox" type="checkbox" style="display: none;"/>
                            <label style="cursor: pointer; font-size: 1.5em; color: ${access.sites.find(s => s===si[0]) === undefined ? 'rgb(200,100,100)' : 'rgb(100,200,100)'};" for="${si[1]}-checkbox">${si[1]}</label>
                        </div>
                    `
                }).join('')}
            </div>
            <div id="sat-access-outer-div">
                <h2>Satellites</h2>
                ${sats.map(si => {
                    return `
                        <div class="sat-access-div" satname="${si[1]}" satindex="${si[0]}">
                            <input onchange="satAccessCheckChange(this)" ${access.satellites.find(s => s===si[0]) === undefined ? '' : 'checked'} id="${si[1]}-checkbox" type="checkbox" style="display: none;"/>
                            <label style="cursor: pointer; font-size: 1.5em; color: ${access.satellites.find(s => s===si[0]) === undefined ? 'rgb(200,100,100)' : 'rgb(100,200,100)'};" for="${si[1]}-checkbox">${si[1]}</span>
                        </div>
                    `
                }).join('')}
            </div>
        </div>
        <div style="display: flex; justify-content: space-around; margin-top: 20px;">
                <div><button style="font-size: 3em; padding: 10px 150px;" onclick="closeSensorAccessPanel(this)">Confirm</button></div>
                <div><button style="font-size: 3em; padding: 10px 150px;" onclick="closeSensorAccessPanel(this)">Cancel</button></div<
        </div>
    `
    openQuickWindow(windowHtml)
    document.getElementById('context-menu')?.remove();
}

function closeQuickWindow() {
    document.querySelector('dialog').close()
}


function openQuickWindow(innerCode = 'Hey', styleOptions = {width: '75%'}) {
    let dialog = document.querySelector('dialog')
    for (style in styleOptions) {
        dialog.style[style] = styleOptions[style]
    }
    dialog.innerHTML = innerCode  
    if (dialog.open) return
    dialog.showModal()
    for (style in styleOptions) {
        dialog.style[style] = styleOptions[style]
    }
}



let instructionWindow
function openInstructionWindow() {
    instructionWindow = window.open('', 'instructions', "width=400,height=400")
    setTimeout(() => instructionWindow.document.title = 'ARTS Instructions', 1000)
    let instructions = `
    <div>
    <ul>
        <li>
            Building a plan
            <ul>
                <li>Instructions are not all-inclusive on features, please contact author for more specific use-cases</li>
                <li>Importing satellites
                    <ul>
                        <li>Import J2000 report from STK
                            <ul>
                                <li>Position and Vecocity Report from STK Report and Graph Manager</li>
                                <li>Can contain any number of satellites</li>
                                <li>Drag file into ARTS screen or import with <em>Import State</em> button on right-click menu</li>
                                <li>Once state is imported there are two import completion options:
                                    <ul>
                                        <li><em>Import J2000 States</em>: Import state at a specific time epoch</li>
                                        <li><em>Load as Viewer</em>: Imports entire trajectory within the J2000 file to view, good for viewing the results of multiple burns. Can then seed planning scenario off of specific time on screen.</li>
                                    </ul>
                                </li>
                            </ul>
                        </li>
                        <li>Import .tce TLE file by dragging into ARTS window or with <em>Import State</em> button on right-click menu
                            <ul>
                                <li>If satellite name contains 5 digit TLE number sat characteristics will be maintained</li>
                                <liThree-line element sets will import satellite name</li>
                                <li>Once TLE's are imported there are two import completion options:
                                    <ul>
                                        <li><em>Import TLE States</em>: Import state at a specific time epoch</li>
                                        <li><em>Import TLE States as Viewer</em>: Imports entire trajectory based on data from multiple TLE's. Can then seed planning scenario off of specific time on screen.</li>
                                    </ul>
                                </li>
                            </ul>
                        </li>
                        <li>Enter origin J2000 origin state manually under <em>Options</em>, then add satellites with <em>Add Satellites </em> menu
                            <ul>
                                <li>RIC coordinates off of any on-screen asset's RIC frame</li>
                                <li>ECI coordinates with an associated epoch</li>
                                <li>Relative Motion Orbital Elements based off any on-screen asset's RIC frame</li>
                                <li>Geo-Stationary satellite over a specified longitude</li>
                            </ul>
                        </li>
                        <li>Import .SAS file generated previously with ARTS
                    </ul>
                </li>
                <li>By default, all burns are computed with finite accelerations
                    <ul>
                        <li>Can alter acceleration by right-clicking satellite and setting mass and thrust of satellite.</li>
                        <li>Goto for impulsive burns in 10 m/s<sup>2</sup></li>
                    </ul>
                </li>
                <li>Burn planning options
                    <ul>
                        <li>Click and drag to desired waypoint, changing time of flight with mouse wheel</li>
                        <li>Switch to manual burn direction on right-click menu to click and drag burn direction</li>
                        <li>Open <em>Maneuver Options</em> panel by right-clicking satellite itself and manually insert RIC coordinate and TOF</li>
                        <li>More burn options available within right-click menu</li>
                        <li>Particle Swarm Optimization utilized to find best position to gain sun, based on delta-V</li>
                    </ul>
                </li>
                <li>Burn Right Click
                    <ul>
                        <li>Right clicking on a burn opens up context menu with options</li>
                        <li>Right clicking also copies to clipboard text string for ingestion into STK</li>
                        <li>Burn information is diplayed in RIC direction, waypoint (if planned using a waypoint), and Az-EL-Magnitude. Click to alter in either format.</li>
                    </ul>
                </li>
                <li>Burns can be deleted by ctrl-clicking on the burn point</li>
                <li>Limitations
                    <ul>
                        <li>Burns durations are limited to 6 hours for mathematical stability</li>
                        <li>Burns are limited to once every 30 minutes</li>
                        <li>Two-body dynamics are utilized, therefore an error of ~500m per day can be expected compared to full relative dynamics at GEO</li>
                    </ul>
                </li>
            </ul>
        </li>
        <li>
            White Cell
            <ul>
                <li>An exercise over a local network can be facilitated using Alt+W to open the white cell window</li>
                <li>Error is automatically generated based on time since last maneuver and any friendly satellites gathering measurements</li>
                <li>Select the team state will go to and generate file for state info management during scenario</li>
            </ul>
        </li>
        <li>Spacebar changes current view</li>
        <li>
            Hot Keys
            <ul>
                <li><kbd>P</kbd> - Open Playback Window</li>
                <li><kbd>S</kbd> - Open satellite submenu</li>
                <li><kbd>A</kbd> - Open site access submenu</li>
                <li><kbd>T</kbd> - Open Time Panel</li>
                <li><kbd>G</kbd> - Switch to ground-track view</li>
                <li><kbd>Ctrl</kbd> + <kbd>h</kbd> - Run sim with HPOP</li>
                <li><kbd>Shift</kbd> + <kbd>L</kbd> - Open save window</li>
                <li><kbd>W</kbd> - Move Origin to the West</li>
                <li><kbd>E</kbd> - Move Origin to the East</li>
                <li><kbd>Alt</kbd> + <kbd>W</kbd> - Open White Cell Window</li>
                <li><kbd>D</kbd> - Switch between dark and light mode</li>
                <li><kbd>N</kbd> - Add random perched satellite</li>
                <li><kbd>N</kbd> - Add random ground station</li>
                <li><kbd>Ctrl</kbd> + <kbd><></kbd> - Change satellite display size</li>
                <li><kbd>Ctrl</kbd> + <kbd>c</kbd> - Display ground features on RIC plot</li>
                <li><kbd>Shift</kbd> + <kbd><></kbd> - Change trajectory dot size</li>
                <li><kbd><></kbd> - Move time +/- 2 minutes</li>
                <li><kbd>Alt</kbd> + <kbd>Number</kbd> - Set Origin Hotkey</li>
            </ul>
        </li>
    </ul>
    </div>`
    instructionWindow.document.write(instructions)
}
let whiteCellWindow
function openWhiteCellWindow() {
    whiteCellWindow = window.open('', 'white', "width=600px,height=600px")
    setTimeout(() => whiteCellWindow.document.title = 'White Cell Tool', 1000)
    whiteCellWindow.changeSide = (el) => {
        mainWindow.satellites[el.getAttribute('sat')].side = el.id.split('-')[1]
        updateWhiteCellTimeAndErrors()
    }
    whiteCellWindow.exportStates = (el) => {
        let team = whiteCellWindow.document.querySelector('#white-cell-team').value
        let states = calculateSatErrorStates(team)
        console.log(states);
        generateJ2000File(states)
        return
    }
    whiteCellWindow.addBurn = (el) => {
        let inputs = el.parentElement.parentElement.querySelectorAll('input')
        let time = new Date(inputs[0].value)
        time = (time - mainWindow.startDate) / 1000
        let dir = [...inputs].slice(1,4).map(s => Number(s.value) / 1000)
        let error = [...inputs].slice(4).map(s => Number(s.value === '' ? s.placeholder : s.value))
        dir = [math.atan2(dir[1], dir[0]), math.atan2(dir[2], math.norm(dir.slice(0,2))), math.norm(dir)]
        dir = [dir[0] + randn_bm() * Math.PI / 180 * error[0], dir[1] + randn_bm() * Math.PI / 180 * error[0], dir[2] + randn_bm() * dir[2] * error[1] / 100]
        dir = [dir[2] * Math.cos(dir[0]) * Math.cos(dir[1]), dir[2] * Math.sin(dir[0]) * Math.cos(dir[1]), dir[2] * Math.sin(dir[1])]
        let select = el.parentElement.parentElement.querySelector('select')
        insertDirectionBurn(select.value, time, dir)
        for (let index = 1; index < 4; index++) {
            inputs[index].value = ''
        }
    }
    whiteCellWindow.setTime = (el) => {
        let newDate = new Date(el.parentElement.querySelector('input').value)
        newDate = (newDate - mainWindow.startDate) / 1000
        if (newDate < 0 || (newDate / 3600) > mainWindow.scenarioLength) return
        mainWindow.desired.scenarioTime = newDate
        mainWindow.scenarioTime = newDate
        // Delay updating by 100ms to let app update information correctly
        setTimeout(updateWhiteCellTimeAndErrors, 100)
    }
    whiteCellWindow.deleteBurn = (el) => {
        let sat = el.getAttribute('sat')
        let burn = el.getAttribute('burn')
        mainWindow.satellites[sat].burns.splice(burn, 1);
        mainWindow.satellites[sat].genBurns();
        updateWhiteCellWindow()
    }
    whiteCellWindow.genTles = () => {
        generateTleHistory()
    }
    whiteCellWindow.changeSatSelect = (el) => {
        let index = mainWindow.satellites.findIndex(sat => sat.name === el.innerText)
        whiteCellWindow.document.querySelector('select').value = index
    }
    whiteCellWindow.changePointing = (el) => {
        mainWindow.satellites[el.getAttribute('sat')].point = el.value
        updateWhiteCellTimeAndErrors()
    }
    whiteCellWindow.changeTeam = (el) => {
        mainWindow.satellites[el.getAttribute('sat')].team = Number(el.value)
        updateWhiteCellTimeAndErrors()
    }
    whiteCellWindow.genTruthEphem = () => generateJ2000FileTruth()
    whiteCellWindow.updateWhiteCellTimeAndErrorsWhite = () => updateWhiteCellTimeAndErrors()
    closeAll()
    updateWhiteCellWindow()
}

function updateWhiteCellTimeAndErrors() {
    if (whiteCellWindow === undefined) return
    let time = mainWindow.desired.scenarioTime
    let teamPerspective = Number(whiteCellWindow.document.querySelector('#white-cell-team').value)
    let satErrors = calculateSatErrorStates(teamPerspective)
    let errorSpans = whiteCellWindow.document.querySelectorAll('.sat-error-span')
    let pointingData = whiteCellWindow.document.querySelectorAll('.white-pointing-data')
    for (let index = 0; index < errorSpans.length; index++) {
        if (satErrors[index].ref !== undefined) {
            errorSpans[index].innerHTML = 'CL StD ' + mainWindow.satellites[satErrors[index].ref].name + '&#8594 ' + satErrors[index].error.toFixed(2) + ' km'
        }
        else {
            errorSpans[index].innerText = 'OL StD ' + satErrors[index].p.toFixed(2) + ' km/' + (1000*satErrors[index].v).toFixed(2) + ' m/s'
        }
        if (mainWindow.satellites[index].point !== 'none' && mainWindow.satellites.findIndex(satRel => satRel.name === mainWindow.satellites[index].point) !== -1) {
            let relData = getRelativeData(index, mainWindow.satellites.findIndex(satRel => satRel.name === mainWindow.satellites[index].point))
            let relDataString = `Range: ${relData.range.toFixed(1)} km CATS: ${relData.sunAngle.toFixed(1)}<sup>o</sup>`
            pointingData[index].innerHTML = relDataString
        }
        else {
            pointingData[index].innerHTML = ''

        }
    }
    whiteCellWindow.document.getElementById('main-time').value = convertTimeToDateTimeInput(new Date(mainWindow.startDate - (-time * 1000)))
}

function updateWhiteCellWindow() {
    if (whiteCellWindow === undefined) return
    whiteCellWindow.document.body.innerHTML = ``
    let curTime = new Date(mainWindow.startDate - (-mainWindow.scenarioTime * 1000))
    mainWindow.satellites = mainWindow.satellites.sort((a,b) => {
        if (a.name.toLowerCase() < b.name.toLowerCase()) return -1
        if (a.name.toLowerCase() > b.name.toLowerCase()) return 1
        return 0
    })
    let satelliteList = mainWindow.satellites.map((sat, satii) => {
        let relDataString = ''
        if (sat.point !== 'none' && mainWindow.satellites.findIndex(satRel => satRel.name === sat.point) !== -1) {
            let relData = getRelativeData(satii, mainWindow.satellites.findIndex(satRel => satRel.name === sat.point))
            relDataString = `Range: ${relData.range.toFixed(1)} km CATS: ${relData.sunAngle.toFixed(1)}<sup>o</sup>`
        }
        return `<div><span style="cursor: pointer" onclick="changeSatSelect(this)">${sat.name}</span>
            <select onchange="changeTeam(this)" sat="${satii}" title="Team Number">
                <option ${sat.team === 1 ? 'selected' : ''} value="1">1</option>
                <option ${sat.team === 2 ? 'selected' : ''} value="2">2</option>
                <option ${sat.team === 3 ? 'selected' : ''} value="3">3</option>
                <option ${sat.team === 4 ? 'selected' : ''} value="4">4</option>
            </select> 
            <span style="margin-left: 20px" class="sat-error-span">
            </span>
        </div>
        <div style="margin-left: 30px">Pointing 
            <select value="${sat.point}" sat="${satii}" onchange="changePointing(this)">
                <option ${sat.point === 'none' ? 'selected' : ''} value="none">None</option>
                ${mainWindow.satellites.map((optSat, optii) => {
                    return optii !== satii ? `<option ${sat.point === optSat.name ? 'selected' : ''} value="${optSat.name}">${optSat.name}</option>` : ''
                })}
            </select> <span class="white-pointing-data">${relDataString}</span>
        </div>
        <div style="padding-left: 30px">
            ${sat.burns.map((b,burnii) => {
                return `
                    <div style="font-size: 0.75em">
                        <button style="font-size: 0.75em" sat="${satii}" burn="${burnii}" onclick="deleteBurn(this)">X</button> ${toStkFormat((new Date(mainWindow.startDate - (-b.time * 1000))).toString())} ${(1000*math.norm(Object.values(b.direction))).toFixed(2)} m/s
                    </div>
                `
            }).join('')}
        </div>`
    })
    let innerStyles = `
    <div>
        <div style="width: 100%; font-size: 2em; text-align: center;">ARTS White Cell Toolbox</div>
        <div style="width: 100%; display: flex; justify-content: space-around; margin: 20px 0px">
            <div>
                <div>
                    Add Burn 
                    <select style="font-size: 2em">
                        ${mainWindow.satellites.map((sat,ii) => `<option value="${ii}">${sat.name}</option>`).join('')}
                    </select>
                </div>
                <div>
                    Time <input value="${convertTimeToDateTimeInput(curTime)}" type="datetime-local" style="width: 30ch"/>
                </div>
                <div>
                    R <input placeholder="0" style="width: 10ch" type="Number">
                    I <input placeholder="0" style="width: 10ch" type="Number">
                    C <input placeholder="0" style="width: 10ch" type="Number"> m/s
                </div>
                <div style="width: 100%; text-align: center">Error</div>
                <div>
                    Angle <input placeholder="1" style="width: 5ch" type="Number"><sup>0</sup>
                    Magnitude <input placeholder="10" style="width: 5ch" type="Number">%
                </div>
                <div>
                    <button onclick="addBurn(this)" style="width: 100%">Execute Burn</button>
                </div>
            </div>
        </div>
        <div style="width: 100%; display: flex; justify-content: space-around; flex-direction: column; align-items: center">
            <div style="margin-bottom: 20px">Perspective: Team <select onchange="updateWhiteCellTimeAndErrorsWhite()" id="white-cell-team">
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
                </select>
            </div>
            <div>
                ${satelliteList.join('')}
            </div>
        </div>
        <div style="margin-top: 30px">
            <input style="width: 100%; font-size: 2em; text-align: center"
                type="datetime-local" id="main-time" value="${convertTimeToDateTimeInput(new Date(mainWindow.startDate - (-mainWindow.scenarioTime * 1000)))}"/> <button style="width: 100%; margin-top: 10px"onclick="setTime(this)">Set Time</button>
        </div>
        <div style="width: 100%; margin-top: 30px">
            <button onclick="exportStates(this)" style="width: 100%">Export Current State</button>
        </div>
        <div style="display: flex; justify-content: space-around;">
        <div style="width: 100%; margin-top: 30px">
            <button onclick="genTles(this)" style="width: 100%">Export TLE History</button>
        </div>
        <div style="width: 100%; margin-top: 30px">
            <button onclick="genTruthEphem(this)" style="width: 100%">Export Truth Ephem History</button>
        </div>
        </div>
    </div>
    `
    whiteCellWindow.document.write(innerStyles)
    updateWhiteCellTimeAndErrors()
}

window.addEventListener('beforeunload', function() {
    if (whiteCellWindow !== undefined) whiteCellWindow.close()
    if (instructionWindow !== undefined) instructionWindow.close()
    if (tleWindow !== undefined) tleWindow.close()
    if (saveWindow !== undefined) saveWindow.close()
    if (j2000Window !== undefined) j2000Window.close()
    burnWindows.forEach(w => w.close())
})

function shortenString(str = 'teststring12345', n=mainWindow.stringLimit[1], start = mainWindow.stringLimit[0]) {
    return str.length > n ? str.slice(start,n+start-1) + String.fromCharCode(8230) : str
}

let burnWindows = []
function openBurnsWindow(sat) {
    sat = sat.getAttribute('sat')
    document.getElementById('context-menu')?.remove();
    burnWindows.push(window.open('', 'burns' + burnWindows.length, "width=600px,height=600px"))
    burnWindows[burnWindows.length - 1].updateBurnList = el => {
        let sat = el.getAttribute('sat')
        el.parentElement.querySelector('#burn-list-div').innerHTML = mainWindow.satellites[sat].burns.map((b,bii) => {
            return `<div style="margin-bottom: 20px;">
                <div>${toStkFormat((new Date(mainWindow.startDate - (-1000*b.time))).toString())}</div>
                <div style="margin-left: 30px;">Direction: 
                    ${b.direction.map(dir => (dir*1000).toFixed(2)).join(', ')} m/s
                </div>
                <div style="margin-left: 30px;"> Waypoint Origin <select sat=${sat} burn=${bii} onchange="updateBurnOrigin(this)">
                    <option value="-1">RIC Origin</option>
                    ${mainWindow.satellites.map((waySat, ii) => {
                        if (ii == sat) return ''
                        return `<option ${waySat.burns.length > 0 ? 'disabled title="Can only choose satellits with no burns"' : ''} value="${ii}">${waySat.name}</option>`
                    }).join('')}
                </select></div>
                <div class="burn-waypoint-disp-div" style="margin-left: 30px;">
                    Waypoint: ${b.waypoint.target.map(dir => dir.toFixed(2)).join(', ')} km, TOF: ${(b.waypoint.tranTime / 3600).toFixed(1)} hrs
                </div>
            </div>
            `
        }).join('')
    }
    burnWindows[burnWindows.length - 1].updateBurnOrigin = el => {
        let originChoice = el.value
        let sat = el.getAttribute('sat');
        let burn = el.getAttribute('burn');
        let burnTime = mainWindow.satellites[sat].burns[burn].time + mainWindow.satellites[sat].burns[burn].waypoint.tranTime
        let burnWaypoint = [...mainWindow.satellites[sat].burns[burn].waypoint.target,0,0,0]
        console.log(originChoice);
        let originRefOrbit = originChoice == -1 ? propToTimeAnalytic(mainWindow.originOrbit, burnTime) : Object.values(getCurrentInertial(originChoice, burnTime))
        let newOriginWaypoint = math.squeeze(Eci2Ric(originRefOrbit.slice(0,3), originRefOrbit.slice(3,6), burnWaypoint.slice(0,3), burnWaypoint.slice(3,6)).rHcw)
        console.log(newOriginWaypoint);
        el.parentElement.parentElement.querySelector('.burn-waypoint-disp-div').innerHTML = `Waypoint: ${newOriginWaypoint.map(dir => dir.toFixed(2)).join(', ')} km, TOF: ${(mainWindow.satellites[sat].burns[burn].waypoint.tranTime / 3600).toFixed(1)} hrs`
    }
    setTimeout(() => burnWindows[burnWindows.length - 1].document.title = mainWindow.satellites[sat].name + ' Burns', 250)
    burnWindows[burnWindows.length - 1].document.body.innerHTML = `
        <div style="text-align: center; font-size: 1.25em; font-weight: bolder;">${mainWindow.satellites[sat].name} Burn List</div>
        <div class="no-scroll" style="max-height: 90%; overflow: scroll; margin-top: 10px" id="burn-list-div">
            ${mainWindow.satellites[sat].burns.map((b,bii) => {
                return `<div style="margin-bottom: 20px;">
                    <div>${toStkFormat((new Date(mainWindow.startDate - (-1000*b.time))).toString())}</div>
                    <div style="margin-left: 30px;">Direction: 
                        ${b.direction.map(dir => (dir*1000).toFixed(2)).join(', ')} m/s
                    </div>
                    ${b.waypoint !== false ? `
                    <div style="margin-left: 30px;"> Waypoint Ref Frame <select sat=${sat} burn=${bii} onchange="updateBurnOrigin(this)">
                        <option value="-1">ECI</option>
                        ${mainWindow.satellites.map((waySat, ii) => {
                            console.log(ii, sat)
                            if (ii == sat) return ''
                            return `<option ${waySat.burns.length > 0 ? 'disabled title="Can only choose satellits with no burns"' : ''} value="${ii}">${waySat.name} RIC</option>`
                        }).join('')}
                    </select></div>
                    <div class="burn-waypoint-disp-div" style="margin-left: 30px;">
                        Waypoint: ${b.waypoint.target.map(dir => dir.toFixed(2)).join(', ')} km, TOF: ${(b.waypoint.tranTime / 3600).toFixed(1)} hrs
                    </div>` : ''}
                </div>
                `
            }).join('')}
        </div>
        <button onclick="updateBurnList(this)" sat="${sat}" style="width: 100%; font-size: 1.5em; margin-top: 20px;">Update List</button>
    `

}
let tleWindow
function openTleWindow(tleSatellites, tleNames = {}) {
    document.getElementById('context-menu')?.remove();
    if (tleWindow !== undefined) {
        tleWindow.close()
    }
    tleWindow = window.open('', 'tle', "width=600px,height=600px")
    setTimeout(() => tleWindow.document.title = 'TLE Import Tool', 1000)
    tleWindow.importTleChoices = (el) => {
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
        let states = []
        let els = el.parentElement.parentElement.querySelectorAll('.tle-sat-div')
        for (let index = 0; index < els.length; index++) {
            let name = els[index].querySelector('.sat-name-span').innerText
            let tleOptions = els[index].querySelectorAll('.tle-option-div')
            tleOptions = [...tleOptions]
            let option = tleOptions.find(opt => {
                return opt.querySelector('input').checked
            })
            let state = option.getAttribute('orbit').split('x').map(s => Number(s))
            let epoch = new Date(option.querySelector('.tle-epoch').innerText)
            states.push({
                name, 
                orbit: {
                    a: state[0],
                    e: state[1],
                    i: state[2],
                    raan: state[3],
                    arg: state[4],
                    tA: Eccentric2True(state[1], solveKeplersEquation(state[5], state[1]))
                }, 
                epoch
            })
        }
        let importCheckboxes = [...tleWindow.document.querySelectorAll('.import-checkbox')].map(s => s.checked)
        let importColors = [...tleWindow.document.querySelectorAll('.import-color')].map(s => s.value)
        let importShapes = [...tleWindow.document.querySelectorAll('.import-shape')].map(s => s.value)
        let importNames = [...tleWindow.document.querySelectorAll('.import-name-input')].map((s, nameIi) => {
            let val = s.value
            if (val.length > 0) {
                val = val + '-' + states[nameIi].name
            }
            else {
                val = states[nameIi].name
            }
            return val
        })
        let importTime = new Date(el.parentElement.parentElement.querySelector('#tle-import-time').value)
        console.log(importCheckboxes);
        states = states.filter((s, filterIi) => importCheckboxes[filterIi])
        importNames = importNames.filter((s, filterIi) => importCheckboxes[filterIi])
        importShapes = importShapes.filter((s, filterIi) => importCheckboxes[filterIi])
        importColors = importColors.filter((s, filterIi) => importCheckboxes[filterIi])
        let originRadio = [...tleWindow.document.querySelectorAll('.import-radio')].map(s => s.checked)
        originRadio = originRadio.filter((s, filterIi) => importCheckboxes[filterIi])
        if (originRadio.filter(s => s).length === 0) {
            originRadio[0] = true
        }
        let origin = originRadio.findIndex(s => s)
        importStates(states, importTime, {
            names: importNames,
            shapes: importShapes,
            colors: importColors,
            origin
        })
    }
    tleWindow.importTlesAsViewer = (el) => {
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
        let satellites = []
        let els = el.parentElement.parentElement.querySelectorAll('.tle-sat-div')
        for (let index = 0; index < els.length; index++) {
            let name = els[index].querySelector('.sat-name-span').innerText
            let tleOptions = els[index].querySelectorAll('.tle-option-div')
            tleOptions = [...tleOptions]
            let state = tleOptions.map(opt => opt.getAttribute('orbit').split('x').map(s => Number(s)))
            state = state.map(st => {
                let coe = {
                    a: st[0],
                    e: st[1],
                    i: st[2],
                    raan: st[3],
                    arg: st[4],
                    tA: Eccentric2True(st[1], solveKeplersEquation(st[5], st[1]))
                }
                return Object.values(Coe2PosVelObject(coe))
            })
            let epochs = tleOptions.map(opt => new Date(opt.querySelector('.tle-epoch').innerText))
            satellites.push({
                name,
                states: state.map((st, ii) => [epochs[ii], st]).sort((a,b) => a[0]-b[0]),
                stateHistory: [],
                origin: false
            })
        }
        let startTimeCoe = math.min(satellites.map(s => s.states[0][0].getTime()))
        for (let t = 0; t < 172800; t+=1800) {
            let epochTime = new Date(startTimeCoe - (-1000*t))
            for (let sat = 0; sat < satellites.length; sat++) {
                let closestState = [satellites[sat].states[0], ...satellites[sat].states.filter(st => st[0] < epochTime)]
                closestState = closestState[closestState.length-1];
                satellites[sat].stateHistory.push([
                    epochTime,
                    ...propToTime(closestState[1], (epochTime-closestState[0])/1000)
                ])
            }
        }
        let importCheckboxes = [...tleWindow.document.querySelectorAll('.import-checkbox')].map(s => s.checked)
        let importColors = [...tleWindow.document.querySelectorAll('.import-color')].map((s, nameIi) => {
            let val = s.value
            satellites[nameIi].color = val
        })
        let importShapes = [...tleWindow.document.querySelectorAll('.import-shape')].map((s, nameIi) => {
            let val = s.value
            satellites[nameIi].shape = val
        })
        let importNames = [...tleWindow.document.querySelectorAll('.import-name-input')].map((s, nameIi) => {
            let val = s.value
            console.log(nameIi);
            if (val.length > 0) {
                satellites[nameIi].name = val + '-' + satellites[nameIi].name
            }
        })
        let originRadio = [...tleWindow.document.querySelectorAll('.import-radio')].map(s => s.checked)
        originRadio = originRadio.filter((s, filterIi) => importCheckboxes[filterIi])
        if (originRadio.filter(s => s).length === 0) {
            originRadio[0] = true
        }
        let origin = originRadio.findIndex(s => s)
        satellites[origin].origin = true
        satellites = satellites.filter((s, filterIi) => importCheckboxes[filterIi])
        for (let index = 0; index < satellites.length; index++) {
            satellites[index].state = satellites[index].stateHistory
        }
        console.log(satellites);
        mainWindow.ephemViewerMode = true
        loadEphemFileInViewer(satellites)
        // importStates(states, importTime, {
        //     names: importNames,
        //     shapes: importShapes,
        //     colors: importColors,
        //     origin
        // })
    }
    tleWindow.changeImportTime = (el) => {
        let importDate = new Date(el.value)
        let els = [...el.parentElement.parentElement.querySelectorAll('.tle-sat-div')]
        els = els.map(el => [...el.querySelectorAll('.tle-option-div')])
        els.forEach(tleOpt => {
            for (let index = 0; index < tleOpt.length; index++) {
                tleOpt[index].querySelector('input').checked = false
            }
            let times = tleOpt.map(s => {
                return new Date(s.querySelector('span').innerText)
            })
            if (times.length === 1) {
                tleOpt[0].querySelector('input').checked = true
            }
            else {
                let index = times.findIndex(s => s > importDate)
                tleOpt[index !== -1 ? index - 1 : tleOpt.length - 1].querySelector('input').checked = true
            }
        })
    }
    
    let uniqueSats = tleSatellites.filter((element, index, array) => array.findIndex(el => el.name === element.name) === index).map(sat => sat.name)
    tleWindow.tleSatellites = tleSatellites
    let defaultEpoch = convertTimeToDateTimeInput(tleSatellites[0].epoch)
    console.log(defaultEpoch);
    tleWindow.document.body.innerHTML = `
        <div style="text-align: center; font-size: 2em; margin-bottom: 10px; width: 100%;">ARTS TLE Import Tool</div>
        <div style="width: 100%; text-align: center;">Import Time <input onchange="changeImportTime(this)" id="tle-import-time" type="datetime-local" value=${defaultEpoch}></div>
        
        <div class="no-scroll" style="max-height: 85%; overflow-y: scroll">
        ${uniqueSats.map((satName, satIi) => {
            let existingShape = 'delta', existingColor = '#ff5555', existingName = tleNames[satName] === undefined ? '' : tleNames[satName]
            let existingSat = mainWindow.satellites.findIndex(s => s.name.search(satName) !== -1)
            if (existingSat !== -1) {
                existingShape = mainWindow.satellites[existingSat].shape
                existingColor = mainWindow.satellites[existingSat].color
                existingName = mainWindow.satellites[existingSat].name === satName ? '' : mainWindow.satellites[existingSat].name.split('-'+satName).join('').split(satName).join('')
            }
            let outHt = `<div class="tle-sat-div" style="margin-bottom: 10px;"><div class="import-name">
                <input title="Select origin of the initial RIC frame displayed" name="coe-origin" class="import-radio" type="radio" ${satIi === 0 ? 'checked' : ''}/>
                <input class="import-checkbox" type="checkbox" checked/>
                <span class="sat-name-span">${satName}</span>
                <input value="${existingColor}" class="import-color" style="height: 20px;" type="color" value="${existingColor}"/>
                <input value="${existingName}" class="import-name-input" style="width: 15ch;" type="text" placeholder="Name"/>
                <select class="import-shape" class="import-shape">   
                    <option ${existingShape === 'delta' ? 'selected' : ''} value="delta">Delta</option>
                    <option ${existingShape === 'triangle' ? 'selected' : ''} value="triangle">Triangle</option>
                    <option ${existingShape === 'square' ? 'selected' : ''} value="square">Square</option>
                    <option ${existingShape === 'diamond' ? 'selected' : ''} value="diamond">Diamond</option>
                    <option ${existingShape === '4-star' ? 'selected' : ''} value="4-star">4-Point Star</option>
                    <option ${existingShape === 'star' ? 'selected' : ''} value="star">5-Point Star</option>
                </select>
            </div>`
            tleSatellites.filter(sat => sat.name === satName).sort((a,b)=>a.epoch-b.epoch).forEach((matchSat, ii, arr) => {
                outHt += `<div class="tle-option-div" orbit="${Object.values(matchSat.orbit).join('x')}"style="margin-left: 20px"><input ${ii === 0 ? 'checked' : ''} name="${matchSat.name}-tle-radio" type="radio"/><span class="tle-epoch">${toStkFormat(matchSat.epoch.toString())}</span></div>`
                let eciOrbit = Object.values(Coe2PosVelObject(matchSat.orbit))
                let latLongOrbit = astro.eci2latlong(eciOrbit.slice(0,3), matchSat.epoch)
                outHt += `<div style="font-size: 0.75em; margin-left: 30px">Lat: ${(latLongOrbit.lat*180/Math.PI).toFixed(1)} deg, Long: ${(latLongOrbit.long*180/Math.PI).toFixed(1)} deg, SMA: ${matchSat.orbit.a.toFixed(1)} km</div>`
            })
            outHt += '</div>'
            return outHt
        }).join('')}
        </div>
        <div><button onclick="importTleChoices(this)">Import TLE States</button></div>
        <div><button onclick="importTlesAsViewer(this)">Import TLE States As Viewer</button></div>
    `
}
let j2000Window
function openJ2000Window(j2000Satellites = [], km) {
    document.getElementById('context-menu')?.remove();
    if (tleWindow === undefined) {
        j2000Window = window.open('', 'j2000', "width=600px,height=600px")
        setTimeout(() => j2000Window.document.title = 'J2000 Import Tool', 1000)
    }
    // Get min and max times from file, to compare to current time in sim
    // If current time within min and max times, set as initial time for import
    let minTime = new Date(math.min(j2000Satellites.map(sat => sat.state[0][0].getTime())))
    let maxTime = new Date(math.max(j2000Satellites.map(sat => sat.state[sat.state.length-1][0].getTime())))
    let currentSimTime = new Date(mainWindow.startDate - (-1000*mainWindow.scenarioTime))
    let time = currentSimTime < maxTime && currentSimTime > minTime ? currentSimTime : minTime
    // Cut off seconds and milliseconds from default time
    time = new Date(time.getFullYear(), time.getMonth(), time.getDate(), time.getHours(), time.getMinutes())


    j2000Window.j2000Satellites = j2000Satellites
    j2000Window.km = km
    j2000Window.updateWindow = updateJ200Window
    j2000Window.importJ2000Choices = (el) => {
        mainWindow.ephemViewerMode = false
        let sats = j2000Window.j2000Satellites.map(s => s.name)
        let time = new Date(j2000Window.document.querySelector('#tle-import-time').value)
        let coes = [...j2000Window.document.querySelectorAll('.coe-state-div')].map((div, ii) => {
            if (div.innerText === '') {
                return undefined
            }
            let innerText = div.innerText.split(', ').map(s => Number(s))
            return {
                epoch: time,
                name: sats[ii],
                orbit: {
                    a: innerText[0],
                    e: innerText[1],
                    i: innerText[2] * Math.PI / 180,
                    raan: innerText[3] * Math.PI / 180,
                    arg: innerText[4] * Math.PI / 180,
                    tA: innerText[5] * Math.PI / 180
                }
            }
        })
        coes = coes.filter(s => s !== undefined)
        let importCheckboxes = [...j2000Window.document.querySelectorAll('.import-checkbox')].map(s => s.checked)
        let importColors = [...j2000Window.document.querySelectorAll('.import-color')].map(s => s.value)
        let importShapes = [...j2000Window.document.querySelectorAll('.import-shape')].map(s => s.value)
        let originRadio = [...j2000Window.document.querySelectorAll('.import-radio')].map(s => s.checked)

        coes = coes.filter((coe,ii) => importCheckboxes[ii])
        importShapes = importShapes.filter((s, filterIi) => importCheckboxes[filterIi])
        importColors = importColors.filter((s, filterIi) => importCheckboxes[filterIi])
        originRadio = originRadio.filter((s, filterIi) => importCheckboxes[filterIi])
        if (originRadio.filter(s => s).length === 0) {
            originRadio[0] = true
        }
        let origin = originRadio.findIndex(s => s)
        mainWindow.changeTime(0, true)
        importStates(coes, time, {
            colors: importColors,
            shapes: importShapes,
            origin
        })
    }
    j2000Window.importAsViewer = (el) => {
        mainWindow.ephemViewerMode = true
        let origin = [...j2000Window.document.querySelectorAll('.import-radio')].findIndex(s => s.checked)
        let exist = [...j2000Window.document.querySelectorAll('.import-checkbox')].map(s => s.checked)
        let colors = [...j2000Window.document.querySelectorAll('.import-color')].map(s => s.value)
        let shapes = [...j2000Window.document.querySelectorAll('.import-shape')].map(s => s.value)
        let satellites = j2000Window.j2000Satellites.map((s,ii) => {
            if (s.state.length === 0) return undefined
            return {
                name: s.name,
                state: s.state,
                color: colors[ii],
                shape: shapes[ii],
                origin: ii === origin ? true : false
            }
        }).filter(s => s !== undefined).filter((s,ii) => exist[ii])
        console.log(satellites);
        loadEphemFileInViewer(satellites);
    }
    j2000Window.document.body.innerHTML = `
        <div style="font-size: 1.75em; font-weight: bolder; text-align: center;">ARTS J2000 Import Tool</div>
        <div style="width: 100%; text-align: center; margin: 10px 0px;">Import Time <input onchange="updateWindow(this)" id="tle-import-time" type="datetime-local" value=${convertTimeToDateTimeInput(new Date(time))}></div>
        
        <div class="no-scroll" style="max-height: 90%; overflow: scroll">
            ${j2000Satellites.map((sat, satIi) => {
                // Add ability to see if satellite already exists and pull colors
                let existingSat = mainWindow.satellites.findIndex(s => sat.name.search(s.name) !== -1)
                let existingShape = 'delta', existingColor = '#ff5555'
                if (existingSat !== -1) {
                    existingShape = mainWindow.satellites[existingSat].shape
                    existingColor = mainWindow.satellites[existingSat].color
                }
                return `<div>
                    <div>
                        <input title="Select origin of the initial RIC frame displayed" name="j2000-origin" class="import-radio" type="radio" ${satIi === 0 ? 'checked' : ''}/>
                        <input class="import-checkbox" type="checkbox" checked/>
                        ${sat.name} 
                        <input class="import-color" style="height: 20px;" type="color" list="sat-input-color-picker-${satIi}" value="${existingColor}">
                        <datalist id="sat-input-color-picker-${satIi}">
                            <option value="#c86464"></option>
                            <option value="#64c864"></option>
                            <option value="#6464c8"></option>
                            <option value="#c864c8"></option>
                            <option value="#969696"></option>
                            <option value="#000000"></option>
                        </datalist>
                        <select class="import-shape">   
                            <option ${existingShape === 'delta' ? 'selected' : ''} value="delta">Delta</option>
                            <option ${existingShape === 'triangle' ? 'selected' : ''} value="triangle">Triangle</option>
                            <option ${existingShape === 'square' ? 'selected' : ''} value="square">Square</option>
                            <option ${existingShape === 'diamond' ? 'selected' : ''} value="diamond">Diamond</option>
                            <option ${existingShape === '4-star' ? 'selected' : ''} value="4-star">4-Point Star</option>
                            <option ${existingShape === 'star' ? 'selected' : ''} value="star">5-Point Star</option>
                        </select>
                    </div>
                    <div style="margin-left: 30px" class="eci-state-div"></div>
                    <div style="margin-left: 30px" class="coe-state-div"></div>
                </div>`
            }).join('')}
        </div>
        <div><button onclick="importJ2000Choices(this)">Import J2000 States</button></div>
        <div><button onclick="importAsViewer(this)">Load as Viewer</button></div>
    `
    updateJ200Window()
}

function updateJ200Window() {
    // Find correct time step from J200 file
    let time = new Date(j2000Window.document.querySelector('#tle-import-time').value)
    let eciDivs = j2000Window.document.querySelectorAll('.eci-state-div')
    let coeDivs = j2000Window.document.querySelectorAll('.coe-state-div')
    j2000Window.j2000Satellites.forEach((sat, ii) => {
        let closestTimeState = sat.state.findIndex(stateIndex => {
            return stateIndex[0] >= time
        })
        if (sat.state.length === 0) {
            eciDivs[ii].innerText = 'No Data Present'
            coeDivs[ii].innerText = ''
            return
        }
        if (closestTimeState === -1) {
            closestTimeState = sat.state[sat.state.length - 1].slice()
        }
        else {
            closestTimeState = sat.state[closestTimeState].slice()
        }
        let stateTime = closestTimeState.shift()
        closestTimeState = propToTime(closestTimeState.map(s => s / (j2000Window.km ? 1 : 1000)), (time - stateTime) / 1000, false)
        let coes = PosVel2CoeNew(closestTimeState.slice(0,3), closestTimeState.slice(3,6))
        coes.raan *= 180 / Math.PI
        coes.i *= 180 / Math.PI
        coes.arg *= 180 / Math.PI
        coes.tA *= 180 / Math.PI
        eciDivs[ii].innerText = closestTimeState.map(s => s.toFixed(6)).join(', ')
        coeDivs[ii].innerText = Object.values(coes).map(s => s.toFixed(6)).join(', ')
    });
}

function tleFromState(ricState = [0,0,0,0,0,0], time = mainWindow.scenarioTime, ssnNum = '00001') {
    function pad(n = 10.135, p = 3, a = 4) {
        n = Number(n.toFixed(5))
        n = n.toString().split('.')
        if (n.length === 1) {
            n.push('0')
        }
        n[1] = n[1].slice(0,a)
        while (n[0].length < p) {
            n[0] = '0' + n[0]
        }
        while (n[1].length < a) {
            n[1] += '0'
        }
        return a > 0 ? n.join('.') : n[0]
    }
    ssnNum = pad(ssnNum,5,0);
    function True2Eccentric(e, ta) {
        return Math.atan(Math.sqrt((1 - e) / (1 + e)) * Math.tan(ta / 2)) * 2;
    }
    let epoch = new Date(mainWindow.startDate - (-(time-72)*1000))
    let year = epoch.getFullYear()
    let month = epoch.getMonth()
    let leapYear = !((year % 4 !== 0) || ((year % 100 === 0) && (year % 400 !== 0)))
    let dayCount = [31, (leapYear ? 29 : 28), 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    let jd = dayCount.slice(0,month).reduce((a,b) => a + b, 0) + epoch.getDate()
    jd = pad(jd, 3, 0)
    let fractionalDay = (epoch.getHours() * 3600 + epoch.getMinutes() * 60 +  epoch.getSeconds()) / 86400
    jd += fractionalDay.toFixed(8).slice(1)
    jd = year.toFixed(0).slice(2) + jd
    let originOrbit = JSON.parse(JSON.stringify(mainWindow.originOrbit))
    originOrbit.tA = propTrueAnomaly(originOrbit.tA, originOrbit.a, originOrbit.e, time)
    originOrbit = Object.values(Coe2PosVelObject(originOrbit))
    let eciState = Ric2Eci(ricState.slice(0,3), ricState.slice(3,6), originOrbit.slice(0,3), originOrbit.slice(3,6))
    eciState = [...eciState.rEcci, ...eciState.drEci]
    console.log(eciState);
    eciState = PosVel2CoeNew(eciState.slice(0,3), eciState.slice(3,6))
    console.log(eciState);
    eciState.mA = True2Eccentric(eciState.e, eciState.tA)
    eciState.mA = eciState.mA - eciState.e * Math.sin(eciState.mA)
    eciState.mm = 86400 / (2 * Math.PI * (eciState.a ** 3 / 398600.4418) ** 0.5)
    eciState.i *= 180 / Math.PI
    eciState.raan *= 180 / Math.PI
    eciState.raan = eciState.raan < 0 ? eciState.raan + 360 : eciState.raan
    eciState.mA *= 180 / Math.PI
    eciState.mA = eciState.mA < 0 ? eciState.mA + 360 : eciState.mA
    eciState.arg *= 180 / Math.PI
    eciState.arg = eciState.mA < 0 ? eciState.arg + 360 : eciState.arg
    let coe = `1 ${ssnNum}           ${jd} -.00000000  00000-0  00000-0 0  9992\n2 ${ssnNum} ${pad(eciState.i)} ${pad(eciState.raan)} ${eciState.e.toFixed(7).slice(2)} ${pad(eciState.arg)} ${pad(eciState.mA)} ${pad(eciState.mm,2,13)}1`
    // downloadFile('tle.tce', coe)
    return coe
}

function tleFromTime(time = mainWindow.scenarioTime) {
    let out = ``
    mainWindow.satellites.forEach((sat, ii) => {
        let ricState = sat.currentPosition({time})
        ricState = math.squeeze(Object.values(ricState))
        console.log(ricState);
        out += tleFromState(ricState, time, ii+1) + '\n'
    })
    return out
}

function generateTleHistory() {
    let out = ``
    let satTleTimes = mainWindow.satellites.map(sat => [0, ...sat.burns.map(b => b.time+1800)])
    console.log(satTleTimes);
    let oldTime = mainWindow.scenarioTime + 0
    mainWindow.desired.scenarioTime = mainWindow.scenarioLength*3600
    mainWindow.scenarioTime = mainWindow.scenarioLength*3600
    for (let index = 0; index < mainWindow.satellites.length; index++) mainWindow.satellites[index].calcTraj()
    for (let index = 0; index < satTleTimes.length; index++) {
        for (let ii = 0; ii < satTleTimes[index].length; ii++) {
            let time = satTleTimes[index][ii]
            let ricState = mainWindow.satellites[index].currentPosition({time})
            out += `0 ${mainWindow.satellites[index].name}\n`
            out += tleFromState(ricState, time, index+1) + '\n'
        }
    }

    mainWindow.desired.scenarioTime = oldTime
    mainWindow.scenarioTime = oldTime
    for (let index = 0; index < mainWindow.satellites.length; index++) mainWindow.satellites[index].calcTraj()
    console.log('he');
    downloadFile('tle.tce', out)
}

function calculateSatErrorStates(team = 1, time = mainWindow.desired.scenarioTime) {
    team = Number(team)
    // Calculate expected open loop errors
    let errors = mainWindow.satellites.map((sat,iiSat) => {
        let lastBurn = [{t: -86400, mag: 0}, ...sat.burns.filter(b => b.time < time).map(b => {
            return {t: b.time, mag: math.norm(b.direction)}
        })]
        lastBurn = lastBurn[lastBurn.length - 1]
        let trackType = sat.team === team ? 'friendly' : 'neutral'
        let err = errorFromTime(time - lastBurn.t, mainWindow.error[trackType])
        return {p: err[0], v: err[3], truth: Object.values(getCurrentInertial(iiSat, time)), selfIndex: iiSat}
    })
    
    // Find all team satellites that are looking at another satellite and have Sun
    let teamSats = mainWindow.satellites.filter((sat,iiSat) => {
        if (sat.team !== team) return false
        if (sat.point === 'none') return false
        // Get index of satellite pointing to
        let pointIndex = mainWindow.satellites.findIndex(satPoint => satPoint.name === sat.point)
        let relData = getRelativeData(iiSat, pointIndex, false)
        if (relData.sunAngle > 90) return false
        return true
    }).map((sat, iiSat) => {
        let selfIndex = mainWindow.satellites.findIndex(satSelf => satSelf.name === sat.name)
        let pointIndex = mainWindow.satellites.findIndex(satPoint => satPoint.name === sat.point)
        let relData = getRelativeData(selfIndex, pointIndex, false)
        return {
            position: sat.currentPosition({time}),
            selfIndex,
            target: pointIndex,
            range: relData.range
        }
    })
    console.log(teamSats);

    // Calculate combined covariance of all "groupings" (satellites looking at the same target)
    // Get unique targets
    let targets = [...new Set(teamSats.map(t => t.target))]
    // Sort by the targets with most pointed at it (so that it's covariance is figured first)
    targets = targets.sort((a,b) => {
        return teamSats.filter(t => t.target === a).length - teamSats.filter(t => t.target === b).length
    }).reverse()
    for (let index = 0; index < targets.length; index++) {
        let pointedToTarget = teamSats.filter(s => s.target === targets[index])
        // get sat with lowest covariance, that will be base for everything
        let combinedIndexes = [targets[index], ...pointedToTarget.map(s => s.selfIndex)]
        let covCombined = combinedIndexes.map(s => errors[s].p)
        let minCov = math.min(covCombined)
        let minIndex = combinedIndexes[covCombined.findIndex(s => minCov === s)]
        let targetIndex = targets[index]
        combinedIndexes.forEach((ii,jj) => {
            if (errors[ii].ref !== undefined) return
            let curError = errors[ii]
            let lastBurn = [{t: -86400, mag: 0}, ...mainWindow.satellites[ii].burns.filter(b => b.time < time).map(b => {
                return {t: b.time, mag: math.norm(b.direction)}
            })]
            lastBurn = lastBurn[lastBurn.length - 1]
            let timeSinceLastBurn = time - lastBurn.t
            if (ii === minIndex) return
            else if (ii === targetIndex) {
                // More trackers will result in better std
                let dataAll = teamSats.filter(s => s.target === targetIndex).map(s => s.range)
                let combinedRange = 1/dataAll.reduce((a,b) => a + 1/b, 0)
                
                let trackError = {
                    p: 0.06 * combinedRange,
                    v: 0.06 * combinedRange,
                    cp: 200,
                    cv: 200
                }
                errors[ii].ref = minIndex
                errors[ii].error = errorFromTime(timeSinceLastBurn, trackError)[0] + 0.001*combinedRange
            }
            else {
                let data = teamSats.find(s => s.selfIndex === ii)
                let trackError = {
                    p: 0.06 * data.range,
                    v: 0.06 * data.range,
                    cp: 6,
                    cv: 6
                }
                errors[ii].ref = targetIndex
                errors[ii].error = errorFromTime(timeSinceLastBurn, trackError)[0] + 0.005*data.range
            }
        })
    }

    //  Calc states of open-loop satellits
    for (let index = 0; index < errors.length; index++) {
        if (errors[index].ref === undefined) {
            let std = [errors[index].p,errors[index].p,errors[index].p,errors[index].v,errors[index].v,errors[index].v].map(s => s * randn_bm())
            errors[index].trackedState = math.add(errors[index].truth, std)
        }
    }
    // Iterate until all satellites have a tracked state, start by getting list of satellites that are referenced by others
    let referencedSatellites = errors.filter(e => errors.filter(s => e.selfIndex === s.ref).length > 0 && e.trackedState === undefined).map(s => s.selfIndex)
    while (referencedSatellites.length > 0) {
        for (let index = 0; index < referencedSatellites.length; index++) {
            let ref = errors[referencedSatellites[index]].ref;
            let error = errors[referencedSatellites[index]].error
            error = [error, error, error, error/1000, error/1000, error/1000].map(s => s * randn_bm())
            let relState = math.subtract(errors[referencedSatellites[index]].truth, errors[ref].truth)
            relState = math.add(relState, error)
            errors[referencedSatellites[index]].trackedState = math.add(relState, errors[ref].trackedState)
        }
        referencedSatellites = errors.filter(e => errors.filter(s => e.selfIndex === s.ref).length > 0 && e.trackedState === undefined).map(s => s.selfIndex)
    }
    // Calc tracked state for the rest of the satellites
    for (let index = 0; index < errors.length; index++) {
        if (errors[index].trackedState !== undefined) continue
        let ref = errors[index].ref
        let error = errors[index].error
        error = [error, error, error, error/1000, error/1000, error/1000].map(s => s * randn_bm())
        let relState = math.subtract(errors[index].truth, errors[ref].truth)
        relState = math.add(relState, error)
        errors[index].trackedState = math.add(relState, errors[ref].trackedState)
    }

    return errors
}

function dragElement(elmnt) {
    var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    if (document.getElementById(elmnt.id + "header")) {
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

function resetDataDivs(hardReset = false) {
    let currentDivs = [...document.querySelectorAll('.data-drag-div')].map(div => {
        return {
            origin: div.getAttribute('origin'),
            target: div.getAttribute('target'),
            top: div.style.top.split('px')[0],
            left: div.style.left.split('px')[0],
            title: div.querySelector('.data-div-title').innerText
        }
    })
    let divs = [...document.querySelectorAll('.data-drag-div')]
    for (let index = 0; index < divs.length; index++) {
        divs[index].remove()
        
    }
    mainWindow.relativeData.dataReqs.forEach((req, ii) => {
        let existingDiv = currentDivs.findIndex(div => {
            return div.origin == req.origin && div.target == req.target
        })
        existingDiv = hardReset ? -1 : existingDiv
        if (existingDiv !== -1) {
            let div = currentDivs[existingDiv]
            openDataDiv({
                origin: div.origin,
                target: div.target,
                interceptTime: req.interceptTime,
                data: req.data,
                top: div.top + 'px',
                left: div.left + 'px',
                title: shortenString(mainWindow.satellites[req.origin].name, 12) + String.fromCharCode(8594) + shortenString(mainWindow.satellites[req.target].name,12)
            })
        }
        else {
            openDataDiv({
                origin: req.origin,
                target: req.target,
                interceptTime: req.interceptTime,
                data: req.data,
                top: (20 + ii * 20) + 'px',
                title: shortenString(mainWindow.satellites[req.origin].name, 12) + String.fromCharCode(8594) + shortenString(mainWindow.satellites[req.target].name,12)
            })
        }
    })
    mainWindow.relDataDivs = [...document.querySelectorAll('.data-drag-div')].map(div => {
        return div.querySelectorAll('.data')
    })
}

function changeInterceptTime(el) {
    // Element for user to change intercept time of intercept data by hitting button on div
    let parentDiv = el.parentElement.parentElement.parentElement
    let origin = Number(parentDiv.getAttribute('origin'))
    let target = Number(parentDiv.getAttribute('target'))

    let dataIndex = mainWindow.relativeData.dataReqs.findIndex(s => s.target == target && s.origin == origin)
    if (dataIndex !== -1) {
        // If index is found, alter the intercept time by 15 minutes at a time, with a minimum intercept of 15 min
        let currentTime = mainWindow.relativeData.dataReqs[dataIndex].interceptTime
        currentTime += el.innerText === '-' ? -0.25 : 0.25
        currentTime = currentTime < 0.25 ? 0.25 : currentTime
        mainWindow.relativeData.dataReqs[dataIndex].interceptTime = currentTime
        resetDataDivs()
    }
}

function executeDataIntercept(el) {
    // Execute the displayed intercept on the data div
    let parentDiv = el.parentElement.parentElement.parentElement
    let origin = Number(parentDiv.getAttribute('origin'))
    let target = Number(parentDiv.getAttribute('target'))
    let dataIndex = mainWindow.relativeData.dataReqs.findIndex(s => s.target == target && s.origin == origin)
    if (dataIndex !== -1) {
        let intercecptTime = mainWindow.relativeData.dataReqs[dataIndex].interceptTime
        let waypoint = mainWindow.satellites[target].currentPosition({time: mainWindow.scenarioTime + intercecptTime*3600})
        insertWaypointBurn(origin, mainWindow.scenarioTime, waypoint.slice(0,3), intercecptTime*3600)
    }
}

function openDataDiv(options = {}) {
    let {
        title = 'Data Title',
        data = [
            'range', 'relativeVelocity', 'sunAngle'
        ],
        origin = 'sat1',
        target = 'sat2',
        left = '10px',
        top = '50px',
        interceptTime = 1
    } = options
    let properTerms = {
        range: {name: 'Range', units: 'km'},
        relativeVelocity: {name: 'Rel Vel', units: 'm/s'},
        sunAngle: {name: 'CATS', units: 'deg'},
        moonAngle: {name: 'CATM', units: 'deg'},
        poca: {name: 'POCA', units: 'km'},
        rangeRate: {name: 'Range Rate', units: 'm/s'},
        interceptData: {name: `<span onclick="changeInterceptTime(this)" style="margin: 2px 1px; padding: 2px; border: 1px solid black; border-radius: 10px; cursor: pointer;">+</span>${(interceptTime*60).toFixed(0)}<span onclick="changeInterceptTime(this)" style="margin: 2px; padding: 2px 1px; border: 1px solid black; border-radius: 10px; cursor: pointer;">-</span>min Intercept <button onclick="executeDataIntercept(this)">Execute</button>`, units:''}
    }
    let newDiv = document.createElement('div')
    newDiv.style.position = 'fixed'
    newDiv.style.padding = '20px 4px 4px 4px'
    newDiv.style.cursor = 'move'
    newDiv.style.display = 'flex'
    newDiv.style.justifyContent = 'space-around'
    newDiv.style.zIndex = 100
    newDiv.style.top = top
    newDiv.style.left = left
    newDiv.style.width = 'auto'
    newDiv.style.height = 'auto'
    newDiv.style.fontFamily = 'Courier'
    newDiv.style.fontSize = '20px'
    newDiv.style.backgroundColor = 'white'
    newDiv.style.border = '1px solid black'
    newDiv.style.borderRadius = '10px'
    newDiv.style.boxShadow = '5px 5px 7px #575757'
    newDiv.style.touchAction = 'none'
    newDiv.setAttribute('origin', origin)
    newDiv.setAttribute('target', target)
    newDiv.innerHTML = `
    <div style="text-align: center">
        <div style="font-weight: 900" class="data-div-title">${title}</div>
        ${data.map(d => {
            return `
                <div title="${d === 'interceptData' ? 'Delta-V, Sun Angle, Rel Vel' : ''}">${properTerms[d].name}: <span style="font-size: ${d === 'interceptData' ? '0.75em': '1em'}" class="data" type="${d}">0</span> ${properTerms[d].units}</div>
            `
        }).join('')}
    </div>
    `
    newDiv.classList.add('data-drag-div')
    let exitButton = document.createElement('div')
    exitButton.innerText = 'X'
    exitButton.style.position = 'absolute'
    exitButton.style.top = '1px'
    exitButton.style.right = '3px'
    exitButton.style.cursor = 'pointer'
    exitButton.onclick = el => {
        let origin = el.target.parentElement.getAttribute('origin')
        let target = el.target.parentElement.getAttribute('target')
        mainWindow.relativeData.dataReqs = mainWindow.relativeData.dataReqs.filter(req => {
            return !(origin == req.origin && target == req.target)
        })
        el.target.parentElement.remove()
        document.getElementById('context-menu')?.remove();
    }
    let fontSizeButton = document.createElement('div')
    fontSizeButton.innerHTML = '<span type="small" style="font-size: 0.5em; margin-right: 15px; cursor: pointer">A</span><span type="big" style="font-size: 1em; cursor: pointer">A</span>'
    fontSizeButton.style.position = 'absolute'
    fontSizeButton.style.top = '1px'
    fontSizeButton.style.left = '3px'
    fontSizeButton.classList.add('font-size-button')
    // If exit button clicked remove data requirement
    document.body.append(newDiv)
    newDiv.append(exitButton)
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

function clickPlayButton(el, step) {
    if (step !== undefined) {
        if (mainWindow.playTimeStep !== 0) {
            mainWindow.playTimeStep = Number(step)
        }
        let allLabels = [...el.parentElement.parentElement.querySelectorAll('label')].forEach(lab => {
            lab.style.fontWeight = ''
            lab.style.textDecoration = 'none'
        })
        let label = el.parentElement.querySelector('label')
        label.style.textDecoration = 'underline'
        label.style.fontWeight = '900'
        return
    }
    switch (el.getAttribute('mode')) {
        case 'play':
            el.setAttribute('mode', 'pause')
            let speed = el.parentElement.parentElement.querySelector('input:checked').getAttribute('speed');
            el.classList.remove('play')
            el.classList.add('pause')
            mainWindow.playTimeStep = Number(speed)
            break
        default:
            el.setAttribute('mode', 'play')
            el.classList.remove('pause')
            el.classList.add('play')
            mainWindow.playTimeStep = 0
            break
    }
}

function openPlayButtonDiv(options = {}) {
    let newDiv = document.createElement('div')
    newDiv.style.position = 'fixed'
    newDiv.style.padding = '20px 4px 4px 4px'
    newDiv.style.cursor = 'move'
    newDiv.style.display = 'flex'
    newDiv.style.justifyContent = 'space-around'
    newDiv.style.zIndex = 100
    newDiv.style.top = '80%'
    newDiv.style.left = '35%'
    newDiv.style.width = '30%'
    newDiv.style.height = 'auto'
    newDiv.style.fontFamily = 'Courier'
    newDiv.style.fontSize = '20px'
    newDiv.style.backgroundColor = 'white'
    newDiv.style.border = '1px solid black'
    newDiv.style.borderRadius = '10px'
    newDiv.style.boxShadow = '5px 5px 7px #575757'
    newDiv.style.touchAction = 'none'
    newDiv.innerHTML = `
    <div style="text-align: center">
        <div>
            <button mode="play" onclick="clickPlayButton(this)" class="playback play"></button>
        </div>
        <div style="display: flex; justify-content: space-around; margin: 15px 10px; flex-wrap: wrap;">
            <div style="margin-right: 30px; minWidth: 50px;">
                <input style="display: none;" oninput="clickPlayButton(this, 0.0166667)" checked id="play-one" name="play-speed" type="radio" speed="0.01667"/>
                <label style="cursor: pointer; text-decoration: underline; font-weight: 900;" for="play-one">1x</label>
            </div>
            <div style="margin-right: 30px;">
                <input style="display: none;" oninput="clickPlayButton(this, 1.66667)" id="play-hundred" name="play-speed" type="radio" speed="1.667"/>
                <label style="cursor: pointer;" for="play-hundred">100x</label>
            </div>
            <div style="margin-right: 30px;">
                <input style="display: none;" oninput="clickPlayButton(this, 16.6667)" id="play-thousand" name="play-speed" type="radio" speed="16.6667"/>
                <label style="cursor: pointer;" for="play-thousand">1000x</label>
            </div>
            <div style="margin-right: 30px;">
                <input style="display: none;" oninput="clickPlayButton(this, 33.3333)" id="play-2thousand" name="play-speed" type="radio" speed="33.3333"/>
                <label style="cursor: pointer;" for="play-2thousand">2000x</label>
            </div>
            <div style="margin-right: 30px;">
                <input style="display: none;" oninput="clickPlayButton(this, 50)" id="play-3thousand" name="play-speed" type="radio" speed="33.3333"/>
                <label style="cursor: pointer;" for="play-3thousand">3000x</label>
            </div>
            <div style="margin-right: 0px;">
                <input style="display: none;" oninput="clickPlayButton(this, 66.6666)" id="play-4thousand" name="play-speed" type="radio" speed="66.6666"/>
                <label style="cursor: pointer;" for="play-4thousand">4000x</label>
            </div>
        </div>
    </div>
    `
    newDiv.classList.add('play-drag-div')
    let exitButton = document.createElement('div')
    exitButton.innerText = 'X'
    exitButton.style.position = 'absolute'
    exitButton.style.top = '1px'
    exitButton.style.right = '3px'
    exitButton.style.cursor = 'pointer'
    exitButton.onclick = el => {
        mainWindow.playTimeStep = 0
        el.target.parentElement.remove()
    }
    document.body.append(newDiv)
    newDiv.append(exitButton)
    dragElement(newDiv)
}

let saveWindow

function updateSaveWindow() {
    let local = Object.keys(window.localStorage).filter(a => a.slice(0,5) === 'arts_').map(a => a.slice(5))
    local = local.map(s => {
        return {
            name: s,
            data: JSON.parse(window.localStorage.getItem('arts_'+s))
        }
    })
    local.sort((a,b) => {
        let aDate = a.data.time === undefined ? new Date() : a.data.time
        let bDate = b.data.time === undefined ? new Date() : b.data.time
        return (new Date(bDate)) - (new Date(aDate))
    }
    )
    let inner = `
        <div>
            <div style="font-weight: bolder; height: 20px;">Save Name</div>
            ${local.map( s => `<div contentEditable="true" oninput="editName(this)" savefile="${s.name}" style="height: 30px;" title="Satellites: ${s.data.satellites.map(sat => sat.name).join(', ')}\nStart: ${toStkFormat((new Date(s.data.startDate)).toString())}z\n\n${s.data.description}">${s.name}</div>`).join('')}
        </div>  
        <div style="text-align: center;">
            <div style="font-weight: bolder; height: 20px;">Save Time</div>
            ${local.map( s => `<div style="height: 30px; color: rgb(150,150,150)">${s.data.time === undefined ? 'N/A' : toStkFormat((new Date(s.data.time)).toString())}</div>`).join('')}
        </div>
        <div>
            <div style="height: 20px;"></div>
            ${local.map( s => `<div savefile="${s.name}" style="height: 30px;"><button onclick="loadScenario(this)">Load</button><button onclick="saveScenario(this)">Overwrite</button><button onclick="deleteScenario(this)">Delete</button></div>`).join('')}
        </div>
    `
    saveWindow.document.querySelector('#saved-scenarios').innerHTML = inner
}

function openSaveWindow() {
    saveWindow = window.open('', 'save', "width=600px,height=600px")
    
    saveWindow.loadScenario = el => {
        let saveName = el.parentElement.getAttribute('savefile')
        let item = window.localStorage.getItem('arts_'+saveName)
        mainWindow.loadDate(JSON.parse(item))
    }

    saveWindow.editName = el => {
        newName = el.innerText
        if (newName.length === 0) return
        let currentSaveName = el.getAttribute('savefile')
        let item = window.localStorage.getItem('arts_'+currentSaveName)
        window.localStorage.removeItem('arts_'+currentSaveName)
        window.localStorage.setItem('arts_'+newName, item)
        updateSaveWindow()
    }

    saveWindow.saveScenario = el => {
        if (el.innerText === 'Overwrite') {
            el.innerText = 'Confirm?'
            setTimeout(() => {
                if (el.innerText === 'Confirm?') {
                    el.innerText = 'Overwrite'
                }
            }, 2000)
            return
        }
        if (el.innerText === 'Confirm?') {
            el.innerText = 'Overwrite'
            let saveName = el.parentElement.getAttribute('savefile')
            let oldData = JSON.parse(window.localStorage.getItem('arts_'+saveName))
            let outData = mainWindow.getData({description: oldData.description})
            window.localStorage.setItem('arts_'+saveName,JSON.stringify(outData))
            updateSaveWindow()
            return
        }
        if (el.innerText === 'Generate .SAS File') exportScenario()
        el = el.parentElement
        let input = el.querySelector('input').value
        let description = el.parentElement.querySelector('#description-area').value
        if (input.length === 0) return
        el.querySelector('input').value = ''
        el.parentElement.querySelector('#description-area').value = ''
        input = 'arts_' + input
        description = description.length === 0 ? 'No Description' : description
        let outData = mainWindow.getData({description})
        window.localStorage.setItem(input, JSON.stringify(outData))
        updateSaveWindow()
    }
    saveWindow.deleteScenario = el => {
        if (el.innerText === 'Delete') {
            el.innerText = 'Confirm?'
            setTimeout(() => {
                if (el.innerText === 'Confirm?') {
                    el.innerText = 'Delete'
                }
            }, 2000)
            return
        }
        let saveName = el.parentElement.getAttribute('savefile')
        window.localStorage.removeItem('arts_'+saveName)
        updateSaveWindow()
    }

    setTimeout(() => saveWindow.document.title = 'Load/Save Window', 1000)
    

    saveWindow.document.body.innerHTML = `
        <div style="display: flex; justify-content: space-around">
            <div>
                <div>Save Current <input style="width: 30ch; text-align: center; " placeholder="Save Name"/><button onclick="saveScenario(this)">Save</button></div>
                
                <div style="margin: 10px;"><textarea id="description-area" placeholder="Save Description (Optional)" id="story" name="story" rows="2" cols="45"/></textarea></div>
            </div>
        </div>
        <div style="margin: 4px 0px 5px 0px; width: 100%; height: 2px; background-color: black;"></div>
        <div id="saved-scenarios" style="margin-top: 10px; display: flex; justify-content: space-between;">   
        
        </div>
        <div style="margin-top: 20px; display: flex; justify-content: space-around;"><div><button onclick="saveScenario(this)">Generate .SAS File</button></div></div>
    `
    setTimeout(updateSaveWindow, 250)
}

function fk5ReductionTranspose(r=[-1033.479383, 7901.2952754, 6380.3565958], date=new Date(2004, 3, 6, 7, 51, 28, 386)) {
    // Based on Vallado "Fundamentals of Astrodyanmics and Applications" algorithm 24, p. 228 4th edition
    // ECI to ECEF
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

function ecef2latlong(satEcef = [-15147.609175480451, -39349.25471082444, 28.29050091982121]) {
    let longSat = math.atan2(satEcef[1], satEcef[0]) * 180 / Math.PI
    let latSat = math.atan2(satEcef[2], math.norm(satEcef.slice(0,2))) * 180 / Math.PI
    return {
        longSat, latSat
    }
}

function checkTouchScreen() {
    return ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (navigator.msMaxTouchPoints > 0)
}

function lagrangePolyCalc(x = [0,1,3], y = [1,-2,4]) {
    let answerLength = x.length
    let answer = math.zeros([answerLength])
    for (let ii = 0; ii < x.length; ii++) {
        let subAnswer = [], subAnswerDen = 1
        for (let jj = 0; jj < x.length; jj++) {
            console.log(jj);
            if (ii === jj) continue
            subAnswer.push([1, -x[jj]])
            subAnswerDen *= x[ii] - x[jj]
        }
        subAnswer = subAnswer.slice(1).reduce((a,b) => {
            return multiplyPolynomial(a,b)
        }, subAnswer[0])
        answer = math.add(answer, math.dotMultiply(y[ii] / subAnswerDen, subAnswer))
        console.log(ii);
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

function runge_kutta4(eom, state = mainWindow.originOrbit, dt = 1, a = [0,0,0]) {
    if (true) {
        let k1 = eom(state, {a});
        let k2 = eom(math.add(state, math.dotMultiply(dt/2, k1)), {a});
        let k3 = eom(math.add(state, math.dotMultiply(dt/2, k2)), {a});
        let k4 = eom(math.add(state, math.dotMultiply(dt/1, k3)), {a});
        return math.add(state, math.dotMultiply(dt / 6, (math.add(k1, math.dotMultiply(2, k2), math.dotMultiply(2, k3), k4))));
    }
    let k1 = eom(state, {a});
    let k2 = eom(math.add(state, math.dotMultiply(dt/2, k1)), {a});
    return math.add(state, math.dotMultiply(dt, k2));
}

function inertialEom(state = [42164, 0, 0, 0, 3.074, 0], options = {}) {
    let {a = [0.001,0,0]} = options
    let mu_r3 = 398600.4418 / (math.norm(state.slice(0,3)) ** 3)
    let c = ConvEciToRic(state, [0,0,0,0,0,0], true)[0]
    a = math.multiply(math.transpose(c), a)
    return [
        state[3],
        state[4],
        state[5],
        -mu_r3 * state[0] + a[0],
        -mu_r3 * state[1] + a[1],
        -mu_r3 * state[2] + a[2]
    ]
}

function Eci2RicWithC(chief, deputy, c) {
    let rC = chief.slice(0,3), vC = chief.slice(3,6)
    let rD = deputy.slice(0,3), vD = deputy.slice(3,6)
    return [
        ...math.multiply(c[0],math.subtract(rD, rC)),
        ...math.add(math.multiply(c[1], math.subtract(rD, rC)), math.multiply(c[0], math.subtract(vD, vC)))
    ]
}

function propToTimeAnalytic(state = mainWindow.originOrbit, dt = 86164, j2 = mainWindow.j2) {
    state = {...state}
    if (j2) {
        state.tA = propTrueAnomalyj2(state.tA, state.a, state.e, state.i, dt)
        let j2 = 1.082626668e-3
        let n = (398600.4418 / state.a / state.a / state.a) ** 0.5
        let n_rEarth2 = n*40680622.66137769
        let p = state.a * (1 - state.e ** 2)
        let raanJ2Rate = -3 * n_rEarth2*j2*Math.cos(state.i) / 2 / p / p
        let argJ2Rate = 3 * n_rEarth2 * j2 * (4 - 5 * Math.sin(state.i) ** 2) / 4 / p / p 
        state.raan += raanJ2Rate * dt
        state.arg += argJ2Rate * dt
    }
    else {
        state.tA = propTrueAnomaly(state.tA, state.a, state.e, dt)
    }
    return Coe2PosVel(state)
}

function calcSatTrajectory(position = mainWindow.originOrbit, burns = [], options = {}) {
    // If recalcBurns is true, burn directions will be recalculated as appropriate times during propagation
    let {timeDelta = mainWindow.timeDelta, recalcBurns = false, tFinal = mainWindow.scenarioLength*3600, a = 0.001, mass = 1000, isp = 200, time = mainWindow.scenarioTime, startBurn = 0} = options
    let cutTime = recalcBurns ? mainWindow.scenarioLength*3600 : time
    let g0 = 9.80665 // standard gravity for rocket equation
    let epochPosition = {...position}, epochTime = 0
    let propPosition, tProp = 0, stateHist = [], histIndex = 0, burnIndex = 0
    burns = burns.slice().filter(b => b.time < cutTime)
    burns.push({time: tFinal*2})
    while ((tProp+timeDelta) < tFinal) {
        propPosition = propToTimeAnalytic(epochPosition, tProp - epochTime)
        stateHist.push({
            t: tProp, position: Eci2RicWithC(mainWindow.originHistory[histIndex].position, propPosition, mainWindow.originRot[histIndex])
        })
        if ((tProp + timeDelta) > burns[burnIndex].time) {
            propPosition = propToTimeAnalytic(epochPosition, burns[burnIndex].time - epochTime)
            // Time propagated before burn start to keep synced with time step
            let propToBurnTime = burns[burnIndex].time - tProp
            if (recalcBurns && burnIndex >= startBurn) {
                let eciOriginStart = propToTimeAnalytic(mainWindow.originOrbit, burns[burnIndex].time)
                let ricOrigin = ConvEciToRic(eciOriginStart, propPosition)
                burns[burnIndex].location = ricOrigin.slice(0,3)
                if (burns[burnIndex].waypoint !== false) {
                    let newBurn = estimateWaypointBurn(propPosition, burns[burnIndex].waypoint.target,  burns[burnIndex].waypoint.tranTime, a)
                    if (newBurn.data !== false) {
                        if (isNaN(newBurn.data.r) || isNaN(newBurn.data.i) || isNaN(newBurn.data.c)) {
                            newBurn.data = false
                        }
                    }
                    if (newBurn.data !== false) {
                        burns[burnIndex].direction = [newBurn.data.r, newBurn.data.i, newBurn.data.c]
                    }
                    else {
                        // If lambert solution fails, go to less precise non-linear rel equation estimate
                        console.log(newBurn, newBurn.reason, propPosition);
                        let eciOriginEnd = propToTimeAnalytic(mainWindow.originOrbit, burns[burnIndex].time + burns[burnIndex].waypoint.tranTime)
                        let eciOriginBegin = propToTimeAnalytic(mainWindow.originOrbit, burns[burnIndex].time)
                        let ricTarget = ConvEciToRic(eciOriginEnd, [...burns[burnIndex].waypoint.target,0,0,0])
                        newBurn = hcwFiniteBurnOneBurn(ricOrigin, ricTarget, burns[burnIndex].waypoint.tranTime, a, tProp)
                        console.log(newBurn);
                        if (newBurn !== false) {
                            console.log('saved');
                            let burnDir = [newBurn.r, newBurn.i, newBurn.c]
                            let cOrigin = ConvEciToRic(eciOriginBegin, [0,0,0,0,0,0], true)[0]
                            let cSat = ConvEciToRic(propPosition, [0,0,0,0,0,0], true)[0]
                            burnDir = math.multiply(cSat, math.transpose(cOrigin), burnDir)
                            burns[burnIndex].direction = burnDir.filter(b => isNaN(b)).length > 0 ? [0,0,0] : [newBurn.r, newBurn.i, newBurn.c]
                        } else console.log('not saved');
                    }
                }
                // console.timeEnd()
            }
            let mag = math.norm(burns[burnIndex].direction)
            burnIndex++
            if (mag > 0) {
                let burnDuration = mag / a
                let burnedTime = 0
                // Catch up to time delta step if smaller than burn duration
                if (burnDuration > (timeDelta - propToBurnTime)) {
                    propPosition = runge_kutta4(inertialEom, propPosition, timeDelta - propToBurnTime, burns[burnIndex-1].direction.map(s => s * a / mag))
                    tProp += timeDelta
                    histIndex++
                    stateHist.push({
                        t: tProp, position: Eci2RicWithC(mainWindow.originHistory[histIndex].position, propPosition, mainWindow.originRot[histIndex])
                    })
                    burnedTime += timeDelta - propToBurnTime
                }
                // Finish rest of time step if longer than time delta
                while ((burnedTime + timeDelta) < burnDuration) {
                    propPosition = runge_kutta4(inertialEom, propPosition, timeDelta, burns[burnIndex-1].direction.map(s => s * a / mag))
                    histIndex++
                    tProp += timeDelta
                    stateHist.push({
                        t: tProp, position: Eci2RicWithC(mainWindow.originHistory[histIndex].position, propPosition, mainWindow.originRot[histIndex])
                    })
                    burnedTime += timeDelta
                }
                propPosition = runge_kutta4(inertialEom, propPosition, burnDuration-burnedTime, burns[burnIndex-1].direction.map(s => s * a / mag))
                epochPosition = PosVel2CoeNew(propPosition.slice(0,3), propPosition.slice(3,6))
                epochTime = burns[burnIndex-1].time + burnDuration
                let mo_mf = math.exp(mag*1000 / isp / g0)
                a *= mo_mf // Accounting for lowering mass after every burn in acceleration
                mass /= mo_mf
                // console.log(a, mass, mo_mf, isp);
            }
        }
        tProp += timeDelta
        histIndex++
    }
    return stateHist
}

function artsDropHandler(event) {
    event.preventDefault()
    if (event.type === 'dragover') return
    reader = new FileReader()
    reader.onload = (event) => {
        handleImportTextFile(event.target.result)
    }

    reader.readAsText(event.dataTransfer.items[0].getAsFile())
}

function handleImportTextFile(inText) {
    let objectFromText
    try {
        objectFromText = JSON.parse(inText)
        // Confirm it is JSON from a valid scenario
        if (objectFromText.satellites === undefined || objectFromText.originOrbit === undefined) {
            objectFromText = undefined
        }
    } catch (error) {
        console.log(error);
    }
    if (objectFromText === undefined) {
        let fileType = tellInputStateFileType(inText)
        
        if (fileType === 'j2000') return handleStkJ200File(inText)
        if (fileType === 'ephem') return handleEphemFile(inText)
        if (fileType === 'site') return handleSiteFile(inText)
        else return handleTleFile(inText)
    }
    else {
        mainWindow.loadDate(objectFromText)
    }
}

function handleEphemFile(text) {
    text = text.split(/\n{1,}/)
    let baseDate = new Date(text.find(s => s.search('ScenarioEpoch') !== -1).split(/ {2,}/)[1])
    let ephemStart = text.findIndex(s => s.search('EphemerisTimePosVel') !== -1) + 1
    let ephemEnd = text.findIndex(s => s.search('END Ephemeris') !== -1)

    ephemEnd = ephemEnd === -1 ? text.length : ephemEnd
    let states = text.slice(ephemStart, ephemEnd).filter(s => s !== '\r').map(s => s.split(/ {1,}/).filter(s => s.length > 0).map(r => Number(r)))
    states = states.map(s => {
        let newDate = new Date(baseDate - (-1000*s[0]))
        return [newDate, ...(math.norm(s.slice(1,4)) > 6000000 ? s.slice(1).map(s => s/1000) : s.slice(1))] 
    })
    // Find closest time
    minStateIndex = 0
    if (mainWindow.satellites.length > 0) {
        let timeArray = states.map(s => math.abs(s[0]-mainWindow.startDate))
        minStateIndex = timeArray.findIndex(s => s === math.min(timeArray))
        minStateIndex = minStateIndex === -1 ? 0 : minStateIndex
    }
    let chosenState = states[minStateIndex]
    
    openPanel({
        id: 'add-satellite'
    })
    changeSatelliteInputType({
        id: 'eci-sat-input'
    })

    let inputs = document.querySelectorAll('.sat-input')
    inputs[0].value = convertTimeToDateTimeInput(chosenState.shift())
    chosenState.forEach((s, stateii) => {
        inputs[stateii+1].value = s.toFixed(6)
    })

}

function testCodeTime(sat = 0) {
    console.time('calc')
    for (let index = 0; index < 1000; index++) {
        mainWindow.satellites[sat].calcTraj()
        
    }
    console.timeEnd('calc')
    console.time('calcwburns')
    for (let index = 0; index < 1000; index++) {
        mainWindow.satellites[sat].calcTraj(true, 1)
        
    }
    console.timeEnd('calcwburns')
}

function loadEphemFileInViewer(satellites, options = {}) {
    console.log(satellites);
    let stateFromArray = function(inArray, time) {
        let minTime = inArray.filter(s => s[0] <= time)
        minTime = minTime.length === 0 ? inArray[0] : inArray[minTime.length-1]
        return propToTime(minTime.slice(1), (time-minTime[0])/1000)
    }
    let {km = true} = options
    // console.log(stateFromArray(satellites[0].state, new Date(satellites[0].state[0][0] - (-20000*1000))))
    mainWindow.satellites = []
    let originSat = satellites.findIndex(s => s.origin)
    originSat = originSat === -1 ? 0 : originSat
    let startOrbit = satellites[originSat].state[0].slice(1)
    startOrbit = PosVel2CoeNew(startOrbit.slice(0,3), startOrbit.slice(3))
    let startPeriod = 2*Math.PI*(startOrbit.a**3/398600.4418)**0.5

    let startEpoch = satellites[originSat].state[0][0]
    let endEpoch = satellites[originSat].state[satellites[originSat].state.length-1][0]
    let viewLength = (endEpoch-startEpoch)/1000
    let satStates = satellites.map(sat => {
        let stateHistory = []
        let t = 0
        while (t < viewLength) {
            let viewDate = new Date(startEpoch - (-1000*t))
            let state = stateFromArray(sat.state, viewDate)
            stateHistory.push({
                t, position: state
            })
            t += startPeriod / 80
        }
        return stateHistory

    })
    mainWindow.originHistory = satStates[originSat]
    mainWindow.originOrbit = startOrbit
    mainWindow.startDate = startEpoch
    mainWindow.scenarioLength = viewLength / 3600
    document.querySelector('#time-slider-range').max = viewLength
    mainWindow.mm = 2*Math.PI / startPeriod

    mainWindow.originSun = mainWindow.originHistory.map(s => {
        let sunRic = sunFromTime(new Date(mainWindow.startDate - (-1000*s.t)))
        sunRic = Eci2Ric(s.position.slice(0,3), s.position.slice(3), sunRic, [0,0,0])
        sunRic = math.squeeze(sunRic.rHcw)
        sunRic = sunRic.map(s => s/math.norm(sunRic))
        return [
            s.t, sunRic
        ]
    })
    mainWindow.originMoon = mainWindow.originHistory.map(s => {
        let moonRic = astro.moonEciFromTime(new Date(mainWindow.startDate - (-1000*s.t)))
        moonRic = Eci2Ric(s.position.slice(0,3), s.position.slice(3), moonRic, [0,0,0])
        moonRic = math.squeeze(moonRic.rHcw)
        moonRic = moonRic.map(s => s/math.norm(moonRic))
        return [
            s.t, moonRic
        ]
    })
    satStates = satStates.map((state, satIi) => {
        mainWindow.satellites.push(new Satellite({
            name: satellites[satIi].name,
            shape: satellites[satIi].shape,
            color: satellites[satIi].color
        }))
        return state.map((timeState, stateIi) => {
            let ricState = Eci2Ric(mainWindow.originHistory[stateIi].position.slice(0,3), mainWindow.originHistory[stateIi].position.slice(3), timeState.position.slice(0,3), timeState.position.slice(3))
            return {t: timeState.t, position: math.squeeze([...ricState.rHcw, ...ricState.drHcw])}
        })
    })
    setTimeout(() => {
        satStates.forEach((state, satii) => {
             mainWindow.satellites[satii].stateHistory = state
        })
    }, 1000)
}

function createHpopStateHistory(startPosition = mainWindow.satellites[0].position, burns = mainWindow.satellites[0].burns, a = 0.001, options = {}) {
    console.log(options);
    let {
        cr = 1.8,
        cd = 2.2,
        area = 15,
        mass = 850,
        srbarea = 1
    } = options
    console.log(cr, cd, area, mass, srbarea);
    let prop, defaultError = 1e-4
    try {
        prop = new Propagator({
            order: 8,
            cr, cd, area, mass, srbarea
        })
    } catch (error) {
        return
    }
    let tf = mainWindow.scenarioLength*3600
    let tD = mainWindow.timeDelta
    let position = Object.values(Coe2PosVel(startPosition))
    let stateHistory = [], startDate = mainWindow.startDate
    // while ((time+tD) < tf) {
    //     stateHistory.push({
    //         t: time,
    //         position
    //     })
    //     position = prop.propToTime(position, new Date(startDate - (-1000*time)), tD, {
    //         maxError: 1e-6
    //     }).state
    //     time += tD
    // }

    let tProp = 0, stateHist = [], histIndex = 0, burnIndex = 0, tFinal = mainWindow.scenarioLength*3600
    burns = burns.slice()
    burns.push({time: tFinal*2})
    while ((tProp+tD) < tf) {
        stateHistory.push({
            t: tProp,
            position
        })
        if ((tProp + tD) > burns[burnIndex].time) {
            let burnMagnitude = math.norm(burns[burnIndex].direction)
            let burnDuration = burnMagnitude / a
            let timeToBurn = burns[burnIndex].time - tProp
            let acc = burns[burnIndex].direction.map(s => s * a / burnMagnitude)
            console.log(burnDuration, acc, a);
            position = prop.propToTime(position, new Date(startDate - (-1000*tProp)), timeToBurn, {
                maxError: defaultError
            }).state
            tProp = burns[burnIndex].time
            burns[burnIndex].location = position.slice(0,3)
            burnIndex++
            // Prop to next time step
            let timeToNextTimeStep = tD - timeToBurn
            if (burnDuration > timeToNextTimeStep) {
                position = prop.propToTime(position, new Date(startDate - (-1000*tProp)), timeToNextTimeStep, {
                    maxError: 1e-6,
                    a: acc
                }).state
                
                // position = runge_kutta4(inertialEom, position, timeToNextTimeStep, acc)
                tProp += timeToNextTimeStep
                stateHistory.push({
                    t: tProp,
                    position
                })
                burnDuration -= timeToNextTimeStep
                while (burnDuration > tD) {
                    // position = prop.propToTime(position, new Date(startDate - (-1000*tProp)), tD, {
                    //     maxError: 1e-6,
                    //     a: acc
                    // }).state
                    position = runge_kutta4(inertialEom, position, tD, acc)
                    tProp += tD
                    stateHistory.push({
                        t: tProp,
                        position
                    })
                    burnDuration -= tD
                }
                position = prop.propToTime(position, new Date(startDate - (-1000*tProp)), burnDuration, {
                    maxError: 1e-6,
                    a: acc
                }).state
                tProp += burnDuration
                position = prop.propToTime(position, new Date(startDate - (-1000*tProp)), tD - burnDuration, {
                    maxError: 1e-6
                }).state
                tProp += tD - burnDuration
                stateHistory.push({
                    t: tProp,
                    position
                })
            }
            else {
                // position = prop.propToTime(position, new Date(startDate - (-1000*tProp)), burnDuration, {
                //     maxError: 1e-6,
                //     a: acc
                // }).state
                
                position = runge_kutta4(inertialEom, position, burnDuration, acc)
                tProp += burnDuration
                timeToNextTimeStep = tD - timeToBurn - burnDuration
                position = prop.propToTime(position, new Date(startDate - (-1000*tProp)), timeToNextTimeStep, {
                    maxError: defaultError
                }).state
                tProp += timeToNextTimeStep
                stateHistory.push({
                    t: tProp,
                    position
                })

            }
            
        }
        position = prop.propToTime(position, new Date(startDate - (-1000*tProp)), tD, {
            maxError: defaultError
        }).state
        tProp += tD
    }
    return stateHistory
}

function displayHpopTraj(update = false, sat = false) {
    
    for (let index = 0; index < mainWindow.satellites.length; index++) {
        mainWindow.satellites[index].latLong = undefined
        
    }
    if (mainWindow.hpop && !update) {
        mainWindow.ephemViewerMode = false
        mainWindow.hpop = false
        mainWindow.updateOrigin(mainWindow.originOrbit)
        mainWindow.satellites.forEach(sat => {
            sat.calcTraj(true)
            sat.calcTraj()
        })
        return
    }
    console.log('Calculating HPOP Origin...');
    let origin = createHpopStateHistory({...mainWindow.originOrbit}, [])
    mainWindow.originHistory = origin
    console.log('Calucting origin rotation matrices...');
    mainWindow.rotHistory = origin.map(ori => {
        return ConvEciToRic(ori.position, [0,0,0,0,0,0], true)
    })      
    let satHists = mainWindow.satellites.map((sat, satIi) => {
        console.log('Calculating HPOP Trajetories...'+(1+satIi)+'/'+mainWindow.satellites.length);
        return createHpopStateHistory(sat.position, sat.burns, sat.a, mainWindow.satellites[satIi].getData())
    })
    satHists = satHists.map((sat, satIi) => {
    
        return sat.map((point, ii) => {
            let ric = Eci2Ric(origin[ii].position.slice(0,3), origin[ii].position.slice(3,6), point.position.slice(0,3), point.position.slice(3,6))
            return {
                t: point.t,
                position: math.squeeze([...ric.rHcw, ...ric.drHcw])
            }
        })
    })
    let hpop = new Propagator()
    mainWindow.ephemViewerMode = true
    mainWindow.hpop = true
    console.log('Recalculating Burn Locations...');
    satHists.forEach((hist,ii) => {
        mainWindow.satellites[ii].stateHistory = hist
        // Calc new burn location
        mainWindow.satellites[ii].burns.forEach(b => {
            let eciLoc = b.location
            let time = b.time
            let prevTimeStepOrigin = origin.findIndex(s => s.t > time)
            prevTimeStepOrigin = prevTimeStepOrigin === -1 ? origin.length-1 : prevTimeStepOrigin - 1
            let originAtBurnTime = hpop.propToTime(origin[prevTimeStepOrigin].position, new Date(mainWindow.startDate - (-1000*origin[prevTimeStepOrigin].t)),time - origin[prevTimeStepOrigin].t, {
                maxError: 1e-5
            }).state
            b.location = math.squeeze(Eci2Ric(originAtBurnTime.slice(0,3), originAtBurnTime.slice(3,6), eciLoc.slice(0,3), [0,0,0]).rHcw)
        })
    })
}

function geoSatelliteAtLongitude(long = 0, date = mainWindow.startDate, drift = 0) {
    let sidAngle = astro.siderealTime(astro.julianDate(date.getFullYear(), date.getMonth()+1, date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds(), date.getMilliseconds()))
    let a = (360+drift)*Math.PI/180 / 86164
    a = (398600.4418/a**2)**(1/3)
    let tA = sidAngle * Math.PI / 180 + long * Math.PI / 180

    for (let index = 0; index < 10; index++) {
        let tA2 = tA + 0.01
        let state1 = astro.eci2latlong(Object.values(Coe2PosVelObject({
            a, e: 0, i: 0, raan: 0, arg: 0, tA
        })).slice(0,3), mainWindow.startDate).long
        let state2 = astro.eci2latlong(Object.values(Coe2PosVelObject({
            a, e: 0, i: 0, raan: 0, arg: 0, tA: tA2
        })).slice(0,3), mainWindow.startDate).long
        let del = (state2 - state1) / 0.01
        tA += (long*Math.PI / 180 - state1) / del
    }

    return {
        a, e: 0, i: 0, raan: 0, arg: 0, tA
    }
}
function getGroundSwatchCircleCoordinates(rEci = [42164, 0, 0], lat = 0, long = 0, nPoints = 100) {
    let rN = math.norm(rEci.slice(0,3))
    let angGround = astro.groundSwath(rN)
    
    let points = []
    for (let index = 0; index < nPoints+1; index++) {
        let bearing = 360*index/nPoints
        points.push(astro.pointRadialDistance(lat, long, bearing, angGround))
    }
    return points
}

function launchEom(state = [42164, 0, 0, 0, 3.074, 0], options = {}) {
    let {a = [0.001,0,0]} = options
    let mu_r3 = 398600.4418 / (math.norm(state.slice(0,3)) ** 3)
    return [
        state[3],
        state[4],
        state[5],
        -mu_r3 * state[0] + a[0],
        -mu_r3 * state[1] + a[1],
        -mu_r3 * state[2] + a[2]
    ]
}

function estimateEciVelocityToTarget(r1, r2, dt) {
    let long = Math.floor(dt / (Math.PI / mainWindow.mm))
    let n = Math.floor(long / 2) 
    // console.log(r1,r2);
    let crossVector = math.cross(r1.slice(0,3),r2)
    let h1 = math.cross(r1.slice(0,3), r1.slice(3,6))
    long = crossVector[2] * h1[2] > 0
    option = n < 1 ? 1 : long ? -1 : 1
    let lamResults = solveLambertsProblem(r1.slice(0,3), r2, dt, n, long, 0)
    // console.log(lamResults.v1);
    return lamResults.v1
        
}


function launchRocket(lat = 0, long = 0, a = .025, date = new Date(), targetLong = 0, tof = 4*3600, isp = 300, g0 = 9.81) {
    // propPosition = runge_kutta4(launchEom, propPosition, burnDuration-burnedTime, burns[burnIndex-1].direction.map(s => s * a / mag))
    let hpop = new Propagator({

    })
    let targetState = astro.sensorGeodeticPosition(0, targetLong, 42164-6378)
    targetState = astro.ecef2eci(targetState, new Date(date - (-1000*tof)))
    let ecefPosition = astro.sensorGeodeticPosition(lat, long)
    let eciPosition = astro.ecef2eci(ecefPosition, date)
    let eciVel = math.cross([0,0,2*Math.PI / 86164], eciPosition)
    let position = [...eciPosition, ...eciVel]
    let r = 0, t = 0, tStep = 0.5
    console.log(position);
    while (r < 30) {
        console.log(a, t,r);
        let timeAcc = position.slice(0,3).map(s => a * s / math.norm(position.slice(0,3)))
        let atmDrag = hpop.atmosphericDragEffect(position)
        position = runge_kutta4(launchEom, position, tStep, timeAcc)
        position = math.add(position, [0,0,0,...atmDrag].map(s => s*tStep))
        t += tStep
        r = math.norm(position.slice(0,3)) - 6371
        a = a*math.exp(a*tStep*1000 / g0 / isp)
        // console.log(r, math.norm(position.slice(3)));
    }
    return t
    // Continue with first state roll
    let tRoll = 0
    while (tRoll < 300) {
        console.log(position);
        let v1 = estimateEciVelocityToTarget(position, targetState, tof-t)
        let delV1 = math.subtract(v1, position.slice(3))
        let aStep = math.norm(delV1) < a*tStep ? math.norm(delV1)/tStep : a
        delV1 = delV1.map(s => s*aStep/math.norm(delV1))
        // console.log(position, tStep, delV1);
        if (aStep < 1e-9) break
        let atmDrag = hpop.atmosphericDragEffect(position)
        position = runge_kutta4(launchEom, position, tStep, delV1)
        position = math.add(position, [0,0,0,...atmDrag].map(s => s*tStep))
        console.log(aStep);
        a = a*math.exp(aStep*tStep*1000 / g0 / isp)
        tRoll += tStep
        t += tStep
    }
    console.log(position, propToTimeAnalytic(PosVel2CoeNew(position.slice(0,3), position.slice(3)),tof - t));

    console.log(targetState);
    console.log(t / 60);
    console.log(hpop.getAtmosphereDensity(math.norm(position.slice(0,3))-6378));
}