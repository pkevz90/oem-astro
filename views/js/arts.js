let appAcr = 'ROTS'
let appName = 'Relative Orbital Trajectory System'
// Various housekeepin to not change html
document.getElementById('add-satellite-panel').getElementsByTagName('span')[0].classList.add('ctrl-switch');
document.getElementById('add-satellite-panel').getElementsByTagName('span')[0].innerText = 'Edit';
document.getElementsByClassName('panel-button')[0].remove();
document.getElementsByTagName('input')[16].setAttribute('list','name-list');
// Div to lock and unlock
const lockDiv = document.createElement("div")
lockDiv.style.position = 'fixed'
lockDiv.style.top = '5%'
lockDiv.style.right = '-25%'
lockDiv.innerText = 'test'
lockDiv.style.transition = 'right 0.5s'
document.getElementsByTagName('body')[0].append(lockDiv)
let currentAction
let pastActions = []
let lastSaveName = ''
let errorList = []
let ellipses = []
let monteCarloData = null
document.getElementById('time-slider-range').max = 48*3600
/*
var listDiv = document.createElement('div');
listDiv.innerHTML = `
    <datalist id="name-list">
    <option value="Sat1">
    <option value="Sat2">
    <option value="Sat3">
    </datalist>
`
document.getElementsByTagName('body')[0].append(listDiv);
*/
class windowCanvas {
    cnvs;
    plotWidth = 200;
    plotHeight;
    plotCenter = 0;
    stringLimit = [0,8];
    error = { // at right after manuever while generating J2000 states, halves every hour
        neutral: {p: 25.6, v: 36.158, c: 1}, // Full Error
        friendly: {p: 25.6 / 3, v: 36.158 / 3, c: 1}, // reduced error
        closed: {p: 0, v: 0, c: 1} // no error
    }; 
    frameCenter= {
        ri: {x: 0.5, y: 0.5, w: 1, h: 1},
        ci: {x: 0.5, y: 1, w: 1, h: 0},
        rc: {x: 0, y: 0.5, w: 0, h: 0},
        plot: {x: 0, y: 0, w: 0, h: 0}
    };
    colors = {
        backgroundColor: 'white',
        foregroundColor: 'black',
        textColor: 'black'
    }
    extraAcc = [0,0,0]
    normalizeDirection = true;
    frameMove = undefined;
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
    originOrbit = {
        a: (398600.4418 / (2 * Math.PI / 86164) ** 2) ** (1/3),
        e: 0,
        i: 0,
        raan: 0,
        arg: 0,
        tA: 0
    }
    trajSize = 1.5;
    encoder;
    mm = 2 * Math.PI / 86164;
    timeDelta = 0.006*86164;
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
    plotSize = 1
    constructor(cnvs) {
        this.cnvs = cnvs;
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
    getCurrentSun(t = this.scenarioTime) {
        let monthDays = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
        let curDate = new Date(mainWindow.startDate)
        let daySinceWinterSolstice = monthDays.slice(0, curDate.getMonth()).reduce((a, b) => a + b) + curDate.getDate() - 80
        let freq = 2 * Math.PI /365.25
        let maxCt = mainWindow.initSun[2] / Math.sin(freq * daySinceWinterSolstice)
        let initSunWithCrossComponent = this.initSun.slice()
        initSunWithCrossComponent[2] = maxCt * Math.sin(freq * (daySinceWinterSolstice + t / 86164))
        return math.squeeze(math.multiply(rotationMatrices(-t * (this.mm * 180 / Math.PI - 360 / 365 / 86164), 3), math.transpose([initSunWithCrossComponent])));
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
    drawAxes() {
        let ctx = this.getContext();
        ctx.strokeStyle = this.colors.foregroundColor;
        ctx.fillStyle = this.colors.foregroundColor;
        let axesLength = this.plotSize * 0.5;
        let sunLength = this.plotSize * 0.4 * this.plotHeight / 2 * Math.max(this.frameCenter.ri.h, this.frameCenter.ci.h, this.frameCenter.rc.h);
        let sunCoor = this.convertToPixels(math.dotMultiply(sunLength, this.getCurrentSun()));
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
            ctx.strokeStyle = this.colors.foregroundColor;
            ctx.fillText('R', origin.ri.x, origin.ri.y - this.cnvs.height * axesLength * this.frameCenter.ri.h / 2 - this.plotSize * this.cnvs.width * this.frameCenter.ri.w / 60)
            ctx.fillText('I', origin.ri.x - this.cnvs.height * axesLength * this.frameCenter.ri.h / 2 - this.plotSize * this.cnvs.width * this.frameCenter.ri.w / 80, origin.ri.y)

            ctx.textAlign = 'left';
            ctx.textBaseline = 'bottom';
            ctx.fillStyle = '#555 ';
            let fontSize = this.cnvs.height * this.frameCenter.ri.w / 40
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
            ctx.font = 'bold ' + this.plotSize * this.cnvs.width * this.frameCenter.ci.w / 40 + 'px serif';
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
            }
            ctx.strokeStyle = this.colors.foregroundColor;
            
            if (drawX) ctx.fillText('C', origin.ci.x, origin.ci.y - this.cnvs.height * axesLength * this.frameCenter.ci.h / 2 - this.plotSize * this.cnvs.width * this.frameCenter.ci.w / 60)
            if (drawY > this.plotHeight / 2 * this.frameCenter.ci.h * axesLength) ctx.fillText('I', origin.ci.x - this.cnvs.height * axesLength * this.frameCenter.ci.h / 2 - this.plotSize * this.cnvs.width * this.frameCenter.ci.w / 80, origin.ci.y)
        }
        if (this.state.search('rc') !== -1) {
            ctx.fillStyle = this.colors.backgroundColor;
            ctx.fillRect(this.frameCenter.rc.x * this.cnvs.width - this.frameCenter.rc.w / 2 * this.cnvs.width, this.frameCenter.rc.y * this.cnvs.height - this.frameCenter.rc.h / 2 * this.cnvs.height, this.frameCenter.rc.x * this.cnvs.width + this.frameCenter.rc.w / 2 * this.cnvs.width, this.frameCenter.rc.y * this.cnvs.height + this.frameCenter.rc.h / 2 * this.cnvs.height);
            // console.log(ctx.lineWidth);
            ctx.strokeStyle = 'rgb(200,200,200)'
            ctx.strokeRect(this.frameCenter.rc.x * this.cnvs.width - this.frameCenter.rc.w / 2 * this.cnvs.width, this.frameCenter.rc.y * this.cnvs.height - this.frameCenter.rc.h / 2 * this.cnvs.height, this.frameCenter.rc.x * this.cnvs.width + this.frameCenter.rc.w / 2 * this.cnvs.width, this.frameCenter.rc.y * this.cnvs.height + this.frameCenter.rc.h / 2 * this.cnvs.height);
            ctx.fillStyle = this.colors.foregroundColor;
            
            ctx.lineWidth = this.plotSize * this.cnvs.width * this.frameCenter.rc.w / 200;
            ctx.font = 'bold ' + this.plotSize * this.cnvs.width * this.frameCenter.rc.w / 40 + 'px serif';
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
            ctx.strokeStyle = this.colors.foregroundColor;
            ctx.fillText('C', origin.rc.x, origin.rc.y - this.cnvs.height * axesLength * this.frameCenter.rc.h / 2 - this.plotSize * this.cnvs.width * this.frameCenter.rc.w / 60)
            ctx.fillText('R', origin.rc.x + this.cnvs.height * axesLength * this.frameCenter.rc.h / 2 + this.plotSize * this.cnvs.width * this.frameCenter.rc.w / 80, origin.rc.y)
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
        let a = (398600.4418 / mainWindow.mm ** 2) ** (1/3);
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
        circleTop = this.convertToPixels([-a+6371, 0, 0]).ri;
        ctx.fillStyle = 'rgb(0,60,0)';
        ctx.beginPath();
        ctx.arc(circleCenter.x, circleCenter.y, circleCenter.y - circleTop.y, 0, 2 * Math.PI)
        ctx.fill();
        ctx.fillStyle = this.colors.backgroundColor;
        ctx.globalAlpha = 1;
        ctx.lineWidth = oldLineWidth;
        ctx.strokeStyle = oldStyle;

    }
    drawCurve(line, options = {}) {
        let {color = 'red', size = this.trajSize} = options
        let ctx = this.getContext();
        ctx.fillStyle = color;
        line.forEach((point, ii) => {
            let pixelPos = this.convertToPixels(point);
            if (this.state.search('ri') !== -1 && Math.abs(point.r) < (this.plotHeight / 2 * this.frameCenter.ri.h) && Math.abs(point.i - this.plotCenter) < (this.plotWidth / 2* this.frameCenter.ri.w)) {
                ctx.fillRect(pixelPos.ri.x - size, pixelPos.ri.y - size, size*2, size*2)
            }
            if (this.state.search('ci') !== -1 && Math.abs(point.c) < (this.plotHeight / 2 * this.frameCenter.ci.h) && Math.abs(point.i - this.plotCenter) < (this.plotWidth / 2 * this.frameCenter.ci.w)){
                ctx.fillRect(pixelPos.ci.x - size, pixelPos.ci.y - size, size*2, size*2)
            }
            if (this.state.search('rc') !== -1 && Math.abs(point.c) < (this.plotHeight / 2 * this.frameCenter.rc.h) && Math.abs(point.r) < (this.plotWidth / 2 * this.frameCenter.rc.w)) {
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
        let ctx = this.getContext();
        let oldWidth = ctx.lineWidth;
        ctx.lineWidth = 1;
        ctx.fillStyle = this.colors.foregroundColor
        this.relativeData.fontSize = this.relativeData.fontSize || 20
        ctx.textAlign = 'left';
        if (this.relativeData.dataReqs.length > mainWindow.relDataDivs.length) resetDataDivs()
        this.relativeData.dataReqs.forEach((req,ii) => {
            let relDataIn = getRelativeData(req.origin, req.target, req.data.filter(d => d === 'interceptData').length > 0);
            mainWindow.relDataDivs[ii].forEach(span => {
                let type = span.getAttribute('type')
                span.innerText = type === 'interceptData' ? relDataIn[span.getAttribute('type')] : relDataIn[span.getAttribute('type')].toFixed(2)
            })
        })
        ctx.textAlign = 'left'
        ctx.lineWidth = oldWidth;
        this.relativeData.time = this.relativeData.time > 1 ? 0 : this.relativeData.time + 0.03;
        
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
        closeAll();
        let inputs = button.parentNode.parentNode.getElementsByTagName('input');
        this.makeGif.stopEpoch = Number(inputs[6].value) * 60;
        this.desired.scenarioTime = Number(inputs[5].value) * 60;
        this.scenarioTime = Number(inputs[5].value) * 60;
        this.makeGif.step = Number(inputs[7].value);
        let val = document.getElementById('res-select').value;
        val = val.split('x');
        if (val[0] !== 'full') {
            this.cnvs.width = Number(val[0]);
            this.cnvs.height = Number(val[1]);
        }
        this.encoder = new GIFEncoder();
        this.encoder.setQuality(20);
        this.encoder.setRepeat(inputs[9].checked ? 0 : 1);
        this.encoder.setDelay(1000 / Number(inputs[8].value));
        setTimeout(() => {
            this.makeGif.start = true;
            this.encoder.start();
        }, 2000)
    }
    recordFunction() {
        if (this.makeGif.start) {
            let ctx = this.getContext();
            this.encoder.addFrame(ctx);
            this.scenarioTime += this.makeGif.step * 60;
            this.desired.scenarioTime += this.makeGif.step * 60;
            if (this.makeGif.stop) {
                this.makeGif.start = false;
                this.makeGif.stop = false;
                this.encoder.finish();
                this.encoder.download("download.gif");
                this.fillWindow();
            }
            else if (this.scenarioTime >= this.makeGif.stopEpoch) {this.makeGif.stop = true;}
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
    getData() {
        let satellites = [];
        this.satellites.forEach(sat => {
            satellites.push(sat.getData())
        })
        return {
            plotWidth: this.plotWidth,
            relativeData: this.relativeData,
            satellites,
            mm: this.mm,
            timeDelta: this.timeDelta,
            scenarioLength: this.scenarioLength,
            initSun: this.initSun,
            startDate: this.startDate,
            originOrbit: this.originOrbit
        }
    }
    loadDate(data = {}) {
        // console.log('loaded');
        let {
            plotWidth = this.plotWidth, 
            relativeData = this.relativeData,
            satellites,
            mm = this.mm,
            timeDelta = this.timeDelta,
            scenarioLength = this.scenarioLength,
            initSun = this.initSun,
            startDate = this.startDate,
            originOrbit = this.originOrbit
        } = data
        this.plotWidth = plotWidth;
        this.relativeData = relativeData;
        this.satellites = [];
        this.mm = mm;
        this.timeDelta = timeDelta;
        this.scenarioLength = scenarioLength;
        this.initSun = initSun;
        this.startDate = new Date(startDate);
        this.originOrbit = originOrbit
        satellites.forEach(sat =>{
            this.satellites.push(
                new Satellite({
                    position: sat.position,
                    size: sat.size,
                    color: sat.color,
                    shape: sat.shape,
                    a: sat.a,
                    name: sat.name,
                    burns: sat.burns,
                    point: sat.point,
                    team: sat.team
                })
            )
            this.satellites[this.satellites.length - 1].drawCurrentPosition();
            this.satellites[this.satellites.length - 1].calcTraj();
            this.satellites[this.satellites.length - 1].genBurns(true);
            this.satellites[this.satellites.length - 1].curPos = this.satellites[this.satellites.length - 1].currentPosition();
            this.satellites[this.satellites.length - 1].curPos = {
                r: this.satellites[this.satellites.length - 1].curPos.r[0],
                i: this.satellites[this.satellites.length - 1].curPos.i[0],
                c: this.satellites[this.satellites.length - 1].curPos.c[0],
                rd: this.satellites[this.satellites.length - 1].curPos.rd[0],
                id: this.satellites[this.satellites.length - 1].curPos.id[0],
                cd: this.satellites[this.satellites.length - 1].curPos.cd[0]
            }
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
            position = {r: 40 * Math.random() - 20, i: 40 * Math.random() - 20, c: 40 * Math.random() - 20, rd: 0.002 * Math.random() - 0.001, id: 0.002 * Math.random() - 0.001, cd: 0.002 * Math.random() - 0.001},
            size = 4,
            color = '#ff0000',
            shape = 'pentagon',
            a = 0.00001,
            name = 'Sat',
            burns = [],
            locked = false,
            side = 'neutral',
            point = 'none',
            team = 1,
            cov = undefined
        } = options; 
        this.position = position;
        this.team = team
        this.point = point
        this.size = size;
        this.color = color;
        this.color = color;
        this.shape = shape;
        this.name = name;
        this.burns = burns;
        this.side = side
        this.a = Number(a);
        this.originDate = Date.now()
        this.locked = locked
        this.pixelPos = [0,0]
        this.cov = cov
        setTimeout(() => this.calcTraj(), 250);
    }
    calcTraj = calcSatTwoBody;
    genBurns = generateBurns;
    drawTrajectory() {
        // console.log(this.stateHistory);
        if (!this.stateHistory) return;
        mainWindow.drawCurve(this.stateHistory, {color: this.color});
    }
    drawBurns() {
        let timeDelta, ctx = mainWindow.getContext(), dist = mainWindow.getPlotWidth() * 0.025;
        ctx.lineWidth = mainWindow.trajSize * 2
        let state = mainWindow.getState();
        let fC = mainWindow.frameCenter;
        let burns = this.burns.filter(b => b.time < mainWindow.scenarioTime)
        mainWindow.drawCurve(burns.map(b => b.location), {color: this.color, size: mainWindow.trajSize * 3});
        ctx.font = 'bold 15px serif';
        ctx.strokeStyle = this.color;
        ctx.textBaseline = 'middle'
        ctx.textAlign = 'center'
        let textHeight = 20;
        burns.filter(b => b.time < mainWindow.scenarioTime).forEach(burn => {
            timeDelta = mainWindow.scenarioTime - burn.time;
            let mag = math.norm(Object.values(burn.direction));
            let dispDist = timeDelta > (mag / this.a) ? dist : dist * timeDelta * this.a / mag;
            if (mainWindow.burnStatus.type) return;
            let point1 = mainWindow.convertToPixels(burn.location), mag2;
            let point2 = math.add(Object.values(burn.location).map(s => s[0]).slice(0,3), math.dotMultiply(dispDist / mag, Object.values(burn.direction)))
            point2 = mainWindow.convertToPixels(point2);
            let textWidth = ctx.measureText((1000*mag).toFixed(1)).width;
            if (state.search('ri') !== -1 && (Math.abs(burn.location.r) < (mainWindow.getPlotHeight() * fC.ri.h / 2)) && (Math.abs(burn.location.i - mainWindow.plotCenter) < (mainWindow.getPlotWidth() * fC.ri.w / 2))) {
                ctx.beginPath();
                ctx.moveTo(point1.ri.x, point1.ri.y);
                ctx.lineTo(point2.ri.x, point2.ri.y);
                mag2 = math.norm([point2.ri.x - point1.ri.x, point2.ri.y - point1.ri.y]);
                if (mag2 > 1e-6) {
                    ctx.fillText((1000*mag).toFixed(1), -textWidth * (point2.ri.x - point1.ri.x) / mag2 / 1.2 + point1.ri.x, -textHeight*(point2.ri.y - point1.ri.y) / mag2 / 1.2 + point1.ri.y)
                    ctx.stroke();
                }
            }
            if (state.search('ci') !== -1 && (Math.abs(burn.location.c) < (mainWindow.getPlotHeight() * fC.ci.h / 2)) && (Math.abs(burn.location.i - mainWindow.plotCenter) < (mainWindow.getPlotWidth() * fC.ci.w / 2))) {
            
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
            if (state.search('rc') !== -1 && (Math.abs(burn.location.c) < (mainWindow.getPlotHeight() * fC.rc.h / 2)) && (Math.abs(burn.location.r) < (mainWindow.getPlotWidth() * fC.rc.w / 2))) {
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
    currentPosition = getCurrentPosition;
    drawCurrentPosition() {
        if (!this.stateHistory) return;
        let cur = this.currentPosition(mainWindow.scenarioTime);
        cur = {r: cur.r[0], i: cur.i[0], c: cur.c[0], rd: cur.rd[0], id: cur.id[0], cd: cur.cd[0]};
        this.curPos = cur;
        mainWindow.drawSatLocation(cur, {size: this.size, color: this.color, shape: this.shape, name: this.name});
    }
    checkClickProximity(position, burns = false) {
        // Check if clicked on current position of object, if burns flag is true, check click to current object burns
        let out = {};
        if (position.ri) {
            if (burns) {
                let burnsCheck = false
                this.burns.forEach((burn, ii) => {
                    burnsCheck = math.norm([burn.location.r[0] - position.ri.r, burn.location.i[0] - position.ri.i]) < (mainWindow.getPlotWidth() / 80) ? ii : burnsCheck
                })
                out = burnsCheck
            }
            else {
                out.ri = math.norm([this.curPos.r - position.ri.r, this.curPos.i - position.ri.i]) < (mainWindow.getPlotWidth() / 80);
            }
        }
        if (position.ci) {
            if (burns) {
                let burnsCheck = false
                this.burns.forEach((burn, ii) => {
                    burnsCheck = math.norm([burn.location.c[0] - position.ci.c, burn.location.i[0] - position.ci.i]) < (mainWindow.getPlotWidth() / 80) ? ii : burnsCheck
                })
                out = burnsCheck
            }
            else {
                out.ci = math.norm([this.curPos.c - position.ci.c, this.curPos.i - position.ci.i]) < (mainWindow.getPlotWidth() / 80);
            }
        }
        if (position.rc) {
            if (burns) {
                let burnsCheck = false
                this.burns.forEach((burn, ii) => {
                    burnsCheck = math.norm([burn.location.c[0] - position.rc.c, burn.location.r[0] - position.rc.r]) < (mainWindow.getPlotWidth() / 80) ? ii : burnsCheck
                })
                out = burnsCheck
            }
            else {
                out.rc = math.norm([this.curPos.c - position.rc.c, this.curPos.r - position.rc.r]) < (mainWindow.getPlotWidth() / 80);
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
        for (let ii = 0; ii < this.burns.length; ii++) {
            if (position.ri) out.ri = math.norm([this.burns[ii].location.r[0] - position.ri.r, this.burns[ii].location.i[0] - position.ri.i]) < (mainWindow.getPlotWidth() / 40) ? ii : out.ri !== false && out.ri !== undefined ? out.ri : false; 
            if (position.ci) out.ci = math.norm([this.burns[ii].location.c[0] - position.ci.c, this.burns[ii].location.i[0] - position.ci.i]) < (mainWindow.getPlotWidth() / 40) ? ii : out.ci !== false && out.ci !== undefined ? out.ci : false; 
            if (position.rc) out.rc = math.norm([this.burns[ii].location.c[0] - position.rc.c, this.burns[ii].location.r[0] - position.rc.r]) < (mainWindow.getPlotWidth() / 40) ? ii : out.rc !== false && out.rc !== undefined ? out.rc : false; 
        }
        return out;
    }
    checkInBurn() {
        if (mainWindow.burnStatus.type) return;
        let time = mainWindow.scenarioTime;
        this.burns.forEach(burn => {
            let burnDuration = math.norm([burn.direction.r, burn.direction.i, burn.direction.c]) / this.a;
            if (time > burn.time && time < (burn.time + burnDuration)) {
                this.calcTraj();
                burn.shown = 'during';
            }
            else if (burn.shown !== 'pre' && time < burn.time) {
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
            team: this.team
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
let startDate = new Date()
mainWindow.startDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate())
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
        return window.requestAnimationFrame(animationLoop)
    } catch (error) {
        console.log(error);
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
    if (document.getElementById('context-menu') !== null) return
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

    if (mainWindow.panelOpen) return;
    if (key.key === ' ') {
        if (threeD) {
            threeD = false
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
                threeD = true
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
    else if (key.key === 'n' || key.key === 'N') {
        let newSat = mainWindow.satellites.length === 0 ?  new Satellite({
                name: 'Chief',
                position: {r: 0, i: 0, c: 0, rd: 0, id: 0, cd: 0},
                shape: 'diamond',
                color: '#bb00bb',
                a: 0.001
            }) : 
            new Satellite({
                position: {r: 0, i: -1500 + 3000 * Math.random(), c: 0, rd: 0, id: 0, cd: 0},
                name: 'Sat-' + (mainWindow.satellites.length + 1),
                a: 0.001
            })

        newSat.calcTraj();
        mainWindow.satellites.push(newSat)
        document.title = mainWindow.satellites.map(sat => sat.name).join(' / ')
    }
    else if ((key.key === 'S' || key.key === 's') && key.shiftKey) {
        let saveName = prompt('Set name of save file:', lastSaveName)
        if (saveName.length > 0) setDefaultScenario(saveName)
    }
    else if ((key.key === 'L' || key.key === 'l') && key.shiftKey) recoverDefaultScenario()
    else if (key.key === ',' && key.ctrlKey) mainWindow.satellites.forEach(sat => sat.size = sat.size > 1 ? sat.size - 0.25 : sat.size)
    else if (key.key === '.' && key.ctrlKey) mainWindow.satellites.forEach(sat => sat.size += 0.25)
    else if (key.key === '<' && key.shiftKey && key.altKey) mainWindow.plotSize = mainWindow.plotSize > 0.1 ? mainWindow.plotSize - 0.05 : mainWindow.plotSize
    else if (key.key === '>' && key.shiftKey && key.altKey) mainWindow.plotSize += 0.05
    else if (key.key === '<' && key.shiftKey) mainWindow.trajSize = mainWindow.trajSize > 0.5 ? mainWindow.trajSize - 0.1 : mainWindow.trajSize
    else if (key.key === '>' && key.shiftKey) mainWindow.trajSize += 0.1
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
        let td = mainWindow.desired.scenarioTime - monteCarloData.time
        td = mainWindow.desired.scenarioTime < monteCarloData.minTime ? monteCarloData.minTime - monteCarloData.time : td
        console.log(td);
        monteCarloData.points = monteCarloData.points.map(p => {
            return oneBurnFiniteHcw(p, 0, 0, 0, td, monteCarloData.time, 0)
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
window.addEventListener('wheel', event => {
    if (mainWindow.panelOpen || event.target.id !== 'main-plot') return;
    if (mainWindow.burnStatus.type === 'waypoint') {
        let tranTimeDelta = event.deltaY > 0 ? -300 : 1800
        document.querySelector('#time-slider-range').value = Number(document.querySelector('#time-slider-range').value) + tranTimeDelta
        let curCrossState = mainWindow.satellites[mainWindow.burnStatus.sat].currentPosition({
            time: mainWindow.satellites[mainWindow.burnStatus.sat].burns[mainWindow.burnStatus.burn].time + mainWindow.satellites[mainWindow.burnStatus.sat].burns[mainWindow.burnStatus.burn].waypoint.tranTime + tranTimeDelta
        })
        mainWindow.satellites[mainWindow.burnStatus.sat].burns[mainWindow.burnStatus.burn].waypoint.target.c = curCrossState.c[0]
        mainWindow.satellites[mainWindow.burnStatus.sat].burns[mainWindow.burnStatus.burn].waypoint.tranTime += tranTimeDelta 
        mainWindow.desired.scenarioTime = mainWindow.satellites[mainWindow.burnStatus.sat].burns[mainWindow.burnStatus.burn].time + mainWindow.satellites[mainWindow.burnStatus.sat].burns[mainWindow.burnStatus.burn].waypoint.tranTime;
        
        updateWhiteCellTimeAndErrors()
        return;
    }
    mainWindow.setAxisWidth(event.deltaY > 0 ? 'increase' : 'decrease')
})
document.oncontextmenu = startContextClick
let openInstructions = function() {
    document.getElementById('instructions-panel').classList.toggle("hidden");
}

function alterEditableSatChar(action) {
    let parElement = action.parentElement
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
    updateLockScreen()
    updateWhiteCellWindow()
    document.title = mainWindow.satellites.map(sat => sat.name).join(' / ')
}

function startContextClick(event) {
    // console.log(event);
    if (mainWindow.panelOpen) {
        return false;
    }
    let ricCoor = mainWindow.convertToRic([event.clientX, event.clientY])
    // Check if clicked on satellite
    let checkProxSats
    if (threeD) {
        checkProxSats = mainWindow.satellites.map(sat => math.norm(math.subtract([event.clientX, event.clientY], Object.values(sat.pixelPos)))).findIndex(sat => sat < 10)
    }
    else {
        checkProxSats = mainWindow.satellites.map(sat => sat.checkClickProximity(ricCoor, false)).findIndex(sat => sat.ri || sat.rc || sat.ci)
    }
    let activeSat = checkProxSats === -1 ? false : checkProxSats
    activeSat = event.ctrlKey ? false : activeSat

    // Check if clicked on burn
    checkProxSats = mainWindow.satellites.map(sat => sat.checkClickProximity(ricCoor, true))
    // Find index of satellite burn clicked on
    let burnIndexSat = checkProxSats.findIndex(sat => sat !== false)
    let activeBurn = burnIndexSat === -1 ? false : {sat: burnIndexSat, burn: checkProxSats[burnIndexSat]}
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
    
    if (activeSat !== false) {
        // User clicked on satellite, generate satellite option menu
        ctxMenu.sat = activeSat;
        let dispPosition = event.altKey ? getCurrentInertial(activeSat) : mainWindow.satellites[activeSat].curPos
        ctxMenu.innerHTML = `
            <div sat="${activeSat}" style="margin-top: 10px; padding: 5px 15px; color: white; cursor: default;">
                <span contentEditable="true" element="name" oninput="alterEditableSatChar(this)">${mainWindow.satellites[activeSat].name}</span>
                <button sat="${activeSat}" id="lock-sat-button" onclick="handleContextClick(this)" style="letter-spacing: -2px; transform: rotate(-90deg) translateX(12%); cursor: pointer; margin-bottom: 5px;">lllllllD</button>
                <input list="sat-color-picker3" title="Edit Satellite Color" sat="${activeSat}" element="color" oninput="alterEditableSatChar(this)" style="" type="color" value="${mainWindow.satellites[activeSat].color}"/>
                <datalist id="sat-color-picker2">
                    <option>#ff0000</option>
                    <option>#0000ff</option>
                </datalist>
                <select title="Edit Satellite Shape" element="shape" oninput="alterEditableSatChar(this)" style="font-size: 0.75em; width: 4ch; border: 1px solid white; color: white; background-color: black">
                    <option value=""></option>
                    <option value="delta">Delta</option>
                    <option value="square">Square</option>
                    <option value="triangle">Triangle</option>
                    <option value="diamond">Diamond</option>
                    <option value="4-star">4-Point Star</option>
                    <option value="star">5-Point Star</option>
                </select>
                <span sat="${activeSat}" style="float: right"><span contentEditable="true" element="a" oninput="alterEditableSatChar(this)">${(mainWindow.satellites[activeSat].a * 1000).toFixed(4)}</span> m/s2</span>
            </div>
            <div style="background-color: white; cursor: default; width: 100%; height: 2px"></div>
            <div class="context-item" id="maneuver-options" onclick="handleContextClick(this)" onmouseover="handleContextClick(event)">Manuever Options</div>
            <div class="context-item" onclick="handleContextClick(this)" id="prop-options">Propagate To</div>
            ${mainWindow.satellites.length > 1 ? '<div class="context-item" onclick="handleContextClick(this)" id="display-data-1">Display Data</div>' : ''}
            <div style="font-size: 0.75em; margin-top: 5px; padding: 5px 15px; color: white; cursor: default;">
                ${Object.values(dispPosition).slice(0,3).map(p => p.toFixed(2)).join(', ')} km  ${Object.values(dispPosition).slice(3,6).map(p => (1000*p).toFixed(2)).join(', ')} m/s
            </div>
            <div style="font-size: 0.5em; padding: 0px 15px; margin-bottom: 5px; color: white; cursor: default;">
                ${mainWindow.satellites[activeSat].cov !== undefined ? mainWindow.satellites[activeSat].cov : ''}
            </div> 
            `
        //             <div class="context-item">Export Burns</div><div class="context-item" onclick="generateEphemFile(${activeSat})" id="state-options">Gen .e File</div>
            
    }
    else if (activeBurn !== false) {
        // User clicked on burn, generate burn option menu
        let burn = mainWindow.satellites[activeBurn.sat].burns[activeBurn.burn]
        let burnDir = [1000*burn.direction.r, 1000*burn.direction.i, 1000*burn.direction.c]
        let rot = translateFrames(activeBurn.sat, {time: burn.time})
        burnDir = math.squeeze(math.multiply(rot, math.transpose([burnDir])))
        let burnWay = [burn.waypoint.target.r, burn.waypoint.target.i, burn.waypoint.target.c, burn.waypoint.tranTime]
        let burnDate = new Date(mainWindow.startDate.getTime() + burn.time * 1000)
        let burnTime = toStkFormat(new Date(mainWindow.startDate.getTime() + burn.time * 1000).toString())
        let uploadDate = new Date(mainWindow.startDate.getTime() + burn.time * 1000 - 900000)
        ctxMenu.innerHTML = `
            <div style="margin-top: 10px; padding: 5px 15px; color: white; cursor: default;">${mainWindow.satellites[activeBurn.sat].name}</div>
            <div class="context-item" onclick="handleContextClick(this)" sat="${activeBurn.sat}" burn="${activeBurn.burn}" id="change-time">Change Time <input type="Number" style="width: 3em; font-size: 1em" placeholder="0"> min</div>
            <div style="background-color: white; cursor: default; width: 100%; height: 2px; margin: 2.5px 0px"></div>
            <div style="font-size: 0.9em; padding: 2.5px 15px; color: white; cursor: default;">${burnTime}</div>
            <div dir="${burnDir.join('_')}" id="change-burn"sat="${activeBurn.sat}" burn="${activeBurn.burn}" type="direction" onclick="handleContextClick(this)" class="context-item" title="Direction" style="font-size: 0.9em; padding: 2.5px 15px; color: white;">R: ${burnDir[0].toFixed(2)} I: ${burnDir[1].toFixed(2)} C: ${burnDir[2].toFixed(2)} m/s</div>
            <div dir="${burnDir.join('_')}" id="change-burn"sat="${activeBurn.sat}" burn="${activeBurn.burn}" onclick="handleContextClick(this)" type="waypoint" class="context-item" title="Waypoint" style="font-size: 0.9em; padding: 2.5px 15px; color: white;">R: ${burnWay[0].toFixed(2)} I: ${burnWay[1].toFixed(2)} C: ${burnWay[2].toFixed(2)} km TT: ${(burnWay[3]/3600).toFixed(2)} hrs</div>
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
        let lockScreenStatus = lockDiv.style.right === '-25%' ? false : true
        ctxMenu.innerHTML = `
            <div class="context-item" id="add-satellite" onclick="openPanel(this)">Satellite Menu</div>
            ${mainWindow.satellites.length > 1 ? `<div class="context-item" onclick="handleContextClick(this)"" id="lock-screen">${lockScreenStatus ? 'Close' : 'Open'} Satellite Panel</div>` : ''}
            <div class="context-item" onclick="openPanel(this)" id="options">Options Menu</div>
            <div class="context-item"><label style="cursor: pointer" for="plan-type">Waypoint Planning</label> <input id="plan-type" name="plan-type" onchange="changePlanType(this)" ${mainWindow.burnType === 'waypoint' ? 'checked' : ""} type="checkbox" style="height: 1.5em; width: 1.5em"/></div>
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

function changeLockStatus(el) {
    mainWindow.satellites[el.getAttribute('sat')].locked = !el.checked
}

function changeNumLanes(element) {
    if (element.id === 'refresh-lanes') return updateLockScreen()
    let newWidth = Number(element.value)
    newWidth = newWidth < 1 ? 1 : newWidth
    mainWindow.nLane = newWidth
}

function changeSide(sat, side="neutral") {
    mainWindow.satellites[sat].side = side
}

function updateLockScreen() {
    if (mainWindow.satellites.length === 0) return
    let out = ''
    let lanes = satClusterK()
    console.log(lanes);
    let height = 0.86 * window.innerHeight
    out += `<div class="no-scroll" style="overflow: scroll; max-height: ${height}px">`
    lanes.forEach((lane, ii) => {
        out += `<div style="text-align: right; margin-top: 10px;">Lane ${ii + 1}</div>`
        lane.forEach(sat => {
            let checked = mainWindow.satellites[sat].locked ? '' : 'checked'
            out += `<div style="text-align: right">
                        <label style="cursor: pointer; padding: 5px" for="lock-${sat}">${mainWindow.satellites[sat].name}</label> <input style="cursor: pointer; padding: 5px" ${checked} oninput="changeLockStatus(this)" sat="${sat}" id="lock-${sat}" type="checkbox"/>
                        <button onclick="changeOrigin(${sat})">Center</button>
                    </div>`
        })
    })
    out += `
        </div>
        <div>
            # Lanes<input step="1" oninput="changeNumLanes(this)" style="width: 5ch;" type="number" value="${mainWindow.nLane}"/>
        </div>
        <div style="float: right;"><button onclick="changeNumLanes(this)" id="refresh-lanes">Refresh Lanes</button></div>
    `
    lockDiv.innerHTML = out
}

function handleContextClick(button) {
    if (button.id === 'maneuver-options') {
         button.parentElement.innerHTML = `
            <div class="context-item" onclick="handleContextClick(this)" id="waypoint-maneuver">Waypoint</div>
            <div class="context-item" onclick="handleContextClick(this)" id="direction-maneuver">Direction</div>
            <div class="context-item" onclick="handleContextClick(this)" id="rmoes-maneuver">Target RMOE's</div>
            <div class="context-item" onclick="handleContextClick(this)" id="dsk-maneuver">DSK</div>
            <div class="context-item" onclick="handleContextClick(this)" id="drift-maneuver">Set Drift Rate</div>
            <div class="context-item" onclick="handleContextClick(this)" id="perch-maneuver">Perch</div>
            <div class="context-item" onclick="handleContextClick(this)" id="circ-maneuver">Circularize</div>
            ${mainWindow.satellites.length > 1 ? '<div class="context-item" onclick="handleContextClick(this)" id="sun-maneuver">Gain Sun</div>' : ''}
            ${mainWindow.satellites.length > 1 ? '<div class="context-item" onclick="handleContextClick(this)" id="poca-maneuver">Maximizer POCA</div>' : ''}
        `
        //<div class="context-item" onclick="handleContextClick(this)" id="multi-maneuver">Multi-Burn</div>
            
        let cm = document.getElementById('context-menu')
        let elHeight = cm.offsetHeight
        let elTop =  Number(cm.style.top.split('p')[0])
        cm.style.top = (window.innerHeight - elHeight) < elTop ? (window.innerHeight - elHeight) + 'px' : cm.style.top
    }
    else if (button.id === 'lock-screen') {
        if (lockDiv.style.right === '-25%') {
            updateLockScreen()
            lockDiv.style.right = '1%'
        }
        else lockDiv.style.right = '-25%'
        document.getElementById('context-menu')?.remove();
    }
    else if (button.id === 'lock-sat-button') {
        let sat = button.getAttribute('sat')
        mainWindow.satellites[sat].locked = true
        updateLockScreen()
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
           <div style="color: white; padding: 5px" id="display-data-2"><input type="checkbox" id="poca"/><label style="cursor: pointer" for="poca">POCA</label></div>
           <div style="color: white; padding: 5px" id="display-data-2"><input type="checkbox" id="sunAngle"/><label style="cursor: pointer" for="sunAngle">CATS</label></div>
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
                origin: button.parentElement.sat
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
    else if (button.id === 'burn-time-change') {
        let sat = button.getAttribute('sat')
        let burn = button.getAttribute('burn')
        button.parentElement.innerHTML = `
            <div class="context-item" >Time Diff: <input type="Number" style="width: 3em; font-size: 1em"> mins</div>
            <div class="context-item" onclick="handleContextClick(this)" id="burn-time-execute" sat="${sat}" burn="${burn}">Execute</div>
        `
    }
    else if (button.id === 'burn-time-execute') {
        let sat = button.getAttribute('sat')
        let burn = button.getAttribute('burn')
        console.log();
        let timeDiff = button.parentElement.getElementsByTagName('input')[0].value
        if (timeDiff === '') {
            button.parentElement.getElementsByTagName('input')[0].style.backgroundColor = 'rgb(255,150,150)';
            return
        }
        let newTime = mainWindow.satellites[sat].burns[burn].time + Number(timeDiff) * 60
        if (newTime < 0 || (newTime > mainWindow.scenarioLength * 3600)) {
            button.parentElement.getElementsByTagName('input')[0].style.backgroundColor = 'rgb(255,150,150)';
            return
        }
        // mainWindow.satellites[sat].burns[burn].time = newTime
        let pos = mainWindow.satellites[sat].currentPosition({time: newTime})
        position = {x: position.r[0], y: position.i[0], z: position.c[0], xd: position.rd[0], yd: position.id[0], zd: position.cd[0]};
        let direction = mainWindow.satellites[sat].burns[burn].direction
        direction = [direction.r, direction.i, direction.c]
        let tof = mainWindow.satellites[sat].burns[burn].waypoint.tranTime
        let wayPos = oneBurnFiniteHcw(position, Math.atan2(direction[1], direction[0]), Math.atan2(direction[2], math.norm([direction[0], direction[1]])), (math.norm(direction) / mainWindow.satellites[sat].a) / tof, tof, newTime, mainWindow.satellites[sat].a)
        
        // mainWindow.satellites[sat].genBurns()
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
                        a: 0.001
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
            let dr = [pos1.r[0] - pos2.r[0], pos1.i[0] - pos2.i[0], pos1.c[0] - pos2.c[0]]
            let dv = [pos1.rd[0] - pos2.rd[0], pos1.id[0] - pos2.id[0], pos1.cd[0] - pos2.cd[0]]
            let rr1 = math.dot(dr,dv) / math.norm(dr)
            pos1 = mainWindow.satellites[sat1].currentPosition({time: tGuess + 0.001})
            pos2 = mainWindow.satellites[sat2].currentPosition({time: tGuess + 0.001})
            dr = [pos1.r[0] - pos2.r[0], pos1.i[0] - pos2.i[0], pos1.c[0] - pos2.c[0]]
            dv = [pos1.rd[0] - pos2.rd[0], pos1.id[0] - pos2.id[0], pos1.cd[0] - pos2.cd[0]]
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
        document.getElementById('context-menu')?.remove();
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
        
        let inputs = button.parentElement.getElementsByTagName('input');
        inputs[0].value = inputs[0].value === '' ? inputs[0].placeholder : inputs[0].value
        let currentPos = mainWindow.satellites[sat].curPos
        let eciPos = Ric2Eci([currentPos.r, currentPos.i, currentPos.c], [currentPos.rd, currentPos.id, currentPos.cd])
        let driftRate = Number(inputs[0].value) * Math.PI / 180
        let period = 2 * Math.PI / mainWindow.mm
        // Convert drift rate to desired SMA
        driftRate += 2 * Math.PI
        driftRate /= period
        driftRate = (398600.4418 / driftRate ** 2) ** (1/3)
        let r = math.norm(eciPos.rEcci)
        let energy = -398600.4418 / driftRate / 2
        let vel = ((energy + 398600.4418 / r) * 2) ** (1/2)
        let newVel = math.dotMultiply(vel, math.dotDivide(eciPos.drEci, math.norm(eciPos.drEci)))
        let newRic = Eci2Ric([(398600.4418 / mainWindow.mm ** 2)**(1/3), 0, 0], [0, (398600.4418 / ((398600.4418 / mainWindow.mm ** 2)**(1/3))) ** (1/2), 0], eciPos.rEcci, newVel)
        let direction = math.subtract(math.squeeze(newRic.drHcw), [currentPos.rd, currentPos.id, currentPos.cd])
        let tof = 0.125 * 2 * Math.PI / mainWindow.mm
        position = {x: currentPos.r, y: currentPos.i, z: currentPos.c, xd: currentPos.rd, yd: currentPos.id, zd: currentPos.cd};
        let wayPos = oneBurnFiniteHcw(position, Math.atan2(direction[1], direction[0]), Math.atan2(direction[2], math.norm([direction[0], direction[1]])), (math.norm(direction) / mainWindow.satellites[sat].a) / tof, tof, mainWindow.scenarioTime, mainWindow.satellites[sat].a)
        mainWindow.satellites[sat].burns = mainWindow.satellites[sat].burns.filter(burn => {
            return burn.time < mainWindow.scenarioTime;
        })
        logAction({
            type: 'addBurn', sat, index: mainWindow.satellites[sat].burns.length
        })
        mainWindow.satellites[sat].burns.push({
            time: mainWindow.desired.scenarioTime,
            direction: {
                r: direction[0],
                i: direction[1],
                c: direction[2]
            },
            waypoint: {
                tranTime: 0,
                target: {
                    r: 0,
                    i: 0,
                    c: 0,
                }
            }
        })
        mainWindow.satellites[sat].burns[mainWindow.satellites[sat].burns.length-1].waypoint  = {
            tranTime: tof,
            target: {
                r: wayPos.x,
                i: wayPos.y,
                c: wayPos.z
            }
        }
        mainWindow.satellites[sat].genBurns();
        mainWindow.desired.scenarioTime = mainWindow.desired.scenarioTime + 3600;
        document.getElementById('time-slider-range').value = mainWindow.desired.scenarioTime + 3600;
        document.getElementById('context-menu')?.remove();
    }
    else if (button.id === 'change-burn') {
        let sat = button.getAttribute('sat')
        let burn = button.getAttribute('burn')
        let burnDirection = button.getAttribute('dir').split('_').map(s => Number(s))
        let burnWaypoint = Object.values(mainWindow.satellites[sat].burns[burn].waypoint.target)
        let burnTT = mainWindow.satellites[sat].burns[burn].waypoint.tranTime / 3600
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
            button.parentElement.innerHTML = `
                <div class="context-item" >R: <input placeholder="${burnWaypoint[0].toFixed(4)}" type="Number" style="width: 5em; font-size: 1em"> km</div>
                <div class="context-item" >I: <input placeholder="${burnWaypoint[1].toFixed(4)}" type="Number" style="width: 5em; font-size: 1em"> km</div>
                <div class="context-item" >C: <input placeholder="${burnWaypoint[2].toFixed(4)}" type="Number" style="width: 5em; font-size: 1em"> km</div>
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
    else if (button.id === 'direction-maneuver') {
        button.parentElement.innerHTML = `
            <div class="context-item" >R: <input placeholder="0" type="Number" style="width: 3em; font-size: 1em"> m/s</div>
            <div class="context-item" >I: <input placeholder="0" type="Number" style="width: 3em; font-size: 1em"> m/s</div>
            <div class="context-item" >C: <input placeholder="0" type="Number" style="width: 3em; font-size: 1em"> m/s</div>
            <div class="context-item" onkeydown="handleContextClick(this)" onclick="handleContextClick(this)" id="execute-direction" tabindex="0">Execute</div>
        `
        document.getElementsByClassName('context-item')[0].getElementsByTagName('input')[0].focus();
    }
    else if (button.id === 'execute-change-burn') {
        let sat = button.getAttribute('sat')
        let burn = button.getAttribute('burn')
        let type = button.getAttribute('type')
        logAction({
            type: 'alterBurn',
            index: burn,
            sat,
            burn:  JSON.parse(JSON.stringify(mainWindow.satellites[sat].burns[burn]))
        })
        let inputs = button.parentElement.getElementsByTagName('input');
        for (let ii = 0; ii < inputs.length; ii++) {
            inputs[ii].value = inputs[ii].value === '' ? Number(inputs[ii].placeholder) : inputs[ii].value
        }
        let dir, rot
        switch (type) {
            case 'direction':
                dir = [Number(inputs[0].value) / 1000, Number(inputs[1].value) / 1000, Number(inputs[2].value) / 1000];
                rot = translateFrames(sat, {time: mainWindow.satellites[sat].burns[burn].time})
                dir = math.transpose(math.multiply(math.transpose(rot), math.transpose([dir])))[0];
                insertDirectionBurn(sat, mainWindow.satellites[sat].burns[burn].time, dir, burn)
                break
            case 'waypoint':
                let way = [Number(inputs[0].value), Number(inputs[1].value), Number(inputs[2].value)];
                let tranTime = Number(inputs[3].value) * 3600
                mainWindow.satellites[sat].burns[burn].waypoint = {
                    target: {
                        r: way[0], i: way[1], c: way[2]
                    },
                    tranTime
                }
                mainWindow.satellites[sat].genBurns()
                mainWindow.satellites[sat].calcTraj()
                break
            case 'angle':
                dir = [Number(inputs[0].value) * Math.PI / 180, Number(inputs[1].value) * Math.PI / 180, Number(inputs[2].value) / 1000];
                dir = [dir[2] * math.cos(dir[0]) * Math.cos(dir[1]), dir[2] * math.sin(dir[0]) * Math.cos(dir[1]), dir[2] * math.sin(dir[1])]
                rot = translateFrames(sat, {time: mainWindow.satellites[sat].burns[burn].time})
                dir = math.transpose(math.multiply(math.transpose(rot), math.transpose([dir])))[0];
                insertDirectionBurn(sat, mainWindow.satellites[sat].burns[burn].time, dir, burn)
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
            let rot = translateFrames(target, {
                time: mainWindow.desired.scenarioTime + Number(inputs[0].value) * 3600
            })
            waypoint = math.reshape([Number(inputs[1].value), Number(inputs[2].value), Number(inputs[3].value)], [3,1])
            waypoint = math.multiply(math.transpose(rot), waypoint)
            waypoint = {r: waypoint[0][0], i: waypoint[1][0], c: waypoint[2][0]}

        }
        logAction({
            type: 'addBurn',
            index: mainWindow.satellites[sat].burns.length,
            sat
        })
        let origin = target === 'origin' ? {r: [0], i: [0], c: [0]} : mainWindow.satellites[target].currentPosition({
            time: mainWindow.desired.scenarioTime + Number(inputs[0].value) * 3600
        })
        insertWaypointBurn(sat, mainWindow.desired.scenarioTime, Object.values(waypoint), 3600*Number(inputs[0].value),math.squeeze(Object.values(origin)) )
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
    else if (button.id === 'execute-direction') {
        let inputs = button.parentElement.getElementsByTagName('input');
        for (let ii = 0; ii < inputs.length; ii++) {
            if (inputs[ii].value === '') {
                inputs[ii].value = inputs[ii].placeholder;
            }
        }
        let sat = button.parentElement.sat;
        let dir = [Number(inputs[0].value) / 1000, Number(inputs[1].value) / 1000, Number(inputs[2].value) / 1000];
        let rot = translateFrames(sat)
        dir = math.transpose(math.multiply(math.transpose(rot), math.transpose([dir])))[0];
        insertDirectionBurn(sat, mainWindow.scenarioTime, dir)
        document.getElementById('time-slider-range').value = mainWindow.desired.scenarioTime + 3600;
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
        mainWindow.satellites[sat].burns.push({
            time: mainWindow.desired.scenarioTime,
            direction: {
                r: 0,
                i: 0,
                c: 0
            },
            waypoint: {
                tranTime: Number(inputs[0].value) * 3600,
                target: {
                    r: curPos.r,
                    i: curPos.i,
                    c: curPos.c,
                }
            }
        })
        mainWindow.satellites[sat].genBurns();
        mainWindow.desired.scenarioTime = mainWindow.desired.scenarioTime + Number(inputs[0].value) * 3600;
        document.getElementById('time-slider-range').value = mainWindow.desired.scenarioTime + Number(inputs[0].value) * 3600;
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
                r: [Number(target.r) + waypoint[0]],
                i: [Number(target.i) + waypoint[1]],
                c: [Number(target.c) + waypoint[2]]
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
        
        for (ii = 0; ii < 50; ii++) {
            sunPso.step()
            console.log(sunPso.bestGlobabValue);
        }
        console.log(sunPso.particles.map(part => part.position[1] * 180 / Math.PI));
        target = opt_function(sunPso.bestGlobalPosition, true)
        mainWindow.satellites[chaserSat].burns.push({
            time: mainWindow.desired.scenarioTime,
            direction: {
                r: 0,
                i: 0,
                c: 0
            },
            waypoint: {
                tranTime: tof,
                target: {
                    r: target.r[0],
                    i: target.i[0],
                    c: target.c[0],
                }
            }
        })
        mainWindow.satellites[chaserSat].genBurns();
        mainWindow.desired.scenarioTime = mainWindow.desired.scenarioTime + tof;
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

function showScreenAlert(message = 'test alert') {
    
    let currentAlerts = document.querySelectorAll('.screen-alert')
    for (let index = 0; index < currentAlerts.length; index++) {
        currentAlerts[index].remove()
    }
    let alertMessage = document.createElement('div');
    alertMessage.classList.add('screen-alert');
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
        document.getElementsByClassName('screen-alert')[0].style.bottom = message === 'start-screen' ? '60%' : '85%';
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
    },message === 'start-screen' ? 60000 : 3000)

}

changePlanType = (box) => mainWindow.burnType = box.checked ? 'waypoint' : 'manual';
let lastHiddenSatClicked = false
document.getElementById('main-plot').addEventListener('mousedown', event => {
    event.preventDefault()
    let subList = document.getElementsByClassName('sub-menu');
    for (let ii = 0; ii < subList.length; ii++) subList[ii].remove();
    if (event.button === 0) {
        // Close context and lock menu if open
        document.getElementById('context-menu')?.remove()
        lockDiv.style.right = '-25%'
    }
    else if (event.button === 1) return startContextClick(event)
    else return;
    // Check if clicked on time
    if (event.clientX < 450 && (mainWindow.getHeight() - event.clientY) < (mainWindow.getHeight() * 0.06)) return openTimePrompt()
    let ricCoor = mainWindow.convertToRic([event.clientX, event.clientY]);
    let sat = 0, check;
    if (ricCoor === undefined) return;
    while (sat < mainWindow.satellites.length) {
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
    if (mainWindow.currentTarget.type === 'current') {
        setTimeout(() => {
            if (!mainWindow.currentTarget) return;
            let targetState = mainWindow.satellites[mainWindow.currentTarget.sat].currentPosition({
                time: mainWindow.desired.scenarioTime + 7200
            });
            mainWindow.satellites[mainWindow.currentTarget.sat].burns.push({
                time: mainWindow.desired.scenarioTime,
                shown: 'during',
                location: null,
                direction: {
                    r: 0,
                    i: 0,
                    c: 0
                },
                waypoint: {
                    tranTime: math.round(2 * Math.PI * 0.08356158 / mainWindow.mm / 10) * 10,
                    target: {
                        r: targetState.r[0],
                        i: targetState.i[0],
                        c: targetState.c[0]
                    }
                }
            })
            mainWindow.satellites[mainWindow.currentTarget.sat].burns.sort((a, b) => {
                return a.time - b.time;
            })
            mainWindow.satellites[mainWindow.currentTarget.sat].genBurns();
            mainWindow.burnStatus = {
                type: mainWindow.burnType,
                sat: mainWindow.currentTarget.sat,
                burn: mainWindow.satellites[mainWindow.currentTarget.sat].burns.findIndex(burn => burn.time === mainWindow.desired.scenarioTime),
                frame: Object.keys(check)[0]
            }
            logAction({
                index: mainWindow.burnStatus.burn,
                sat: mainWindow.currentTarget.sat,
                type: 'addBurn'
            })
            if (mainWindow.burnType === 'waypoint' && mainWindow.currentTarget.frame === 'ri' && mainWindow.satellites[mainWindow.currentTarget.sat].a > 0.000001) {
                mainWindow.desired.scenarioTime += math.round(2 * Math.PI * 0.08356158 / mainWindow.mm / 10) * 10;
                document.getElementById('time-slider-range').value = mainWindow.desired.scenarioTime;
            };
        }, 250)
    }
    else if (mainWindow.currentTarget.type === 'burn') {
        if (event.ctrlKey) {
            logAction({
                type: 'deleteBurn',
                index: check[mainWindow.currentTarget.frame],
                sat: mainWindow.currentTarget.sat,
                burn:  mainWindow.satellites[mainWindow.currentTarget.sat].burns[check[mainWindow.currentTarget.frame]]
            })
            mainWindow.satellites[mainWindow.currentTarget.sat].burns.splice(check[mainWindow.currentTarget.frame], 1);
            mainWindow.satellites[mainWindow.currentTarget.sat].genBurns();
            return;
        }
        logAction({
            type: 'alterBurn',
            index: check[mainWindow.currentTarget.frame],
            sat: mainWindow.currentTarget.sat,
            burn:  JSON.parse(JSON.stringify(mainWindow.satellites[mainWindow.currentTarget.sat].burns[check[mainWindow.currentTarget.frame]]))
        })
        mainWindow.burnStatus = {
            type: mainWindow.burnType,
            sat: mainWindow.currentTarget.sat,
            burn: check[mainWindow.currentTarget.frame],
            frame: mainWindow.currentTarget.frame
        }
        if (mainWindow.burnType === 'waypoint' && mainWindow.burnStatus.frame === 'ri') {
            mainWindow.desired.scenarioTime = mainWindow.satellites[mainWindow.burnStatus.sat].burns[mainWindow.burnStatus.burn].time + mainWindow.satellites[mainWindow.burnStatus.sat].burns[mainWindow.burnStatus.burn].waypoint.tranTime;
            document.getElementById('time-slider-range').value = mainWindow.desired.scenarioTime;
        }
    }
    else if (ricCoor.ri || ricCoor.ci) {
        try {
            mainWindow.frameMove = {
                x: mainWindow.mousePosition[0],
                y: mainWindow.mousePosition[1],
                origin: mainWindow.plotCenter,
                el: elD + 0,
                az: azD + 0
            };
        } catch (error) {errorList.push(error.stack)}
        return;
    }
})

document.getElementById('main-plot').addEventListener('mouseup', () => {
    mainWindow.currentTarget = false;
    mainWindow.satellites.forEach(sat => sat.calcTraj());
    mainWindow.burnStatus.type = false;
    mainWindow.frameMove = undefined;
})

document.getElementById('main-plot').addEventListener('mouseleave', () => mainWindow.mousePosition = undefined)

document.getElementById('main-plot').addEventListener('mousemove', event => {
    mainWindow.mousePosition = [event.clientX, event.clientY];
    if (event.clientX < 450 && (mainWindow.getHeight() - event.clientY) < (mainWindow.getHeight() * 0.06)) {
        mainWindow.cnvs.style.cursor = 'pointer'
        return
    }
    else mainWindow.cnvs.style.cursor = ''
    if (mainWindow.frameMove) {
        let delX = event.clientX - mainWindow.frameMove.x;
        let delY = event.clientY - mainWindow.frameMove.y;
        if (threeD) {
            elD = mainWindow.frameMove.el + delY * 0.4
            azD = mainWindow.frameMove.az + delX * 0.4
            return

        }
        mainWindow.desired.plotCenter = mainWindow.frameMove.origin + delX * mainWindow.getPlotWidth() / mainWindow.getWidth(); 
    }
})

function moveTrueAnomaly(delta = 0.1, recalcBurns = true) {
    // Angle in degrees
    delta *= Math.PI / 180
    if (mainWindow.desired.plotWidth < math.abs(delta*2*mainWindow.originOrbit.a)) {
        mainWindow.desired.plotWidth = math.abs(delta*2*mainWindow.originOrbit.a) * 4
    }
    let originEci = Object.values(Coe2PosVelObject(mainWindow.originOrbit))
    let sats = mainWindow.satellites.map(sat => {
        let pos = Object.values(sat.position)
        let eciPos = Ric2Eci(pos.slice(0,3), pos.slice(3,6), originEci.slice(0,3), originEci.slice(3,6))
        return [...eciPos.rEcci, ...eciPos.drEci]
    })
    let satWaypoints = mainWindow.satellites.map(sat => {
        return sat.burns.map(b => {
            let way = [...Object.values(b.waypoint.target),0,0,0]
            way = Ric2Eci(way.slice(0,3), [0,0,0], originEci.slice(0,3), originEci.slice(3,6))
            return [...way.rEcci, ...way.drEci]  
        })
    })
    mainWindow.originOrbit.tA += delta
    originEci = Object.values(Coe2PosVelObject(mainWindow.originOrbit))
    for (let index = 0; index < mainWindow.satellites.length; index++) {
        let ricPos = Eci2Ric(originEci.slice(0,3), originEci.slice(3,6), sats[index].slice(0,3), sats[index].slice(3,6))
       mainWindow.satellites[index].position = {
            r: ricPos.rHcw[0][0],
            i: ricPos.rHcw[1][0],
            c: ricPos.rHcw[2][0],
            rd: ricPos.drHcw[0][0],
            id: ricPos.drHcw[1][0],
            cd: ricPos.drHcw[2][0]
       }
       for (let jj = 0; jj < mainWindow.satellites[index].burns.length; jj++) {
        let way = satWaypoints[index][jj]
        let ricWay = Eci2Ric(originEci.slice(0,3), originEci.slice(3,6), way.slice(0,3), way.slice(3,6))
        mainWindow.satellites[index].burns[jj].waypoint.target = {
            r: ricWay.rHcw[0][0],
            i: ricWay.rHcw[1][0],
            c: ricWay.rHcw[2][0]
        }
       }
       if (recalcBurns) mainWindow.satellites[index].calcTraj(true)
       mainWindow.satellites[index].calcTraj()
    }
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
    switch (el.id) {
        case 'eci-sat-input':
            let date = new Date(mainWindow.startDate)
            date = `${date.getFullYear()}-${padNumber(date.getMonth()+1)}-${padNumber(date.getDate())}T${padNumber(date.getHours())}:${padNumber(date.getMinutes())}:${padNumber(date.getSeconds())}`
            satInputs[0].innerHTML = `Epoch <input class="sat-input" style="width: 20ch;" type="datetime-local" id="start-time" name="meeting-time" value="${date}">`
            satInputs[1].innerHTML = `X <input class="sat-input" style="font-size: 1em; width: 15ch;" type="Number" placeholder="0"> km</div>`
            satInputs[2].innerHTML = `Y <input class="sat-input" style="font-size: 1em; width: 15ch;" type="Number" placeholder="0"> km</div>`
            satInputs[3].innerHTML = `Z <input class="sat-input" style="font-size: 1em; width: 15ch;" type="Number" placeholder="0"> km</div>`
            satInputs[4].innerHTML = `dX <input class="sat-input" style="font-size: 1em; width: 15ch;" type="Number" placeholder="0"> km/s</div>`
            satInputs[5].innerHTML = `dY <input class="sat-input" style="font-size: 1em; width: 15ch;" type="Number" placeholder="0"> km/s</div>`
            satInputs[6].innerHTML = `dZ <input class="sat-input" style="font-size: 1em; width: 15ch;" type="Number" placeholder="0"> km/s</div>`
            break
        case 'ric-sat-input':
            satInputs[0].innerHTML = ``
            satInputs[1].innerHTML = `R <input class="sat-input" style="font-size: 1em; width: 15ch;" type="Number" placeholder="0"> km</div>`
            satInputs[2].innerHTML = `I <input class="sat-input" style="font-size: 1em; width: 15ch;" type="Number" placeholder="0"> km</div>`
            satInputs[3].innerHTML = `C <input class="sat-input" style="font-size: 1em; width: 15ch;" type="Number" placeholder="0"> km</div>`
            satInputs[4].innerHTML = `dR <input class="sat-input" style="font-size: 1em; width: 15ch;" type="Number" placeholder="0"> m/s</div>`
            satInputs[5].innerHTML = `dI <input class="sat-input" style="font-size: 1em; width: 15ch;" type="Number" placeholder="0"> m/s</div>`
            satInputs[6].innerHTML = `dC <input class="sat-input" style="font-size: 1em; width: 15ch;" type="Number" placeholder="0"> m/s</div>`
            break
        case 'rmoe-sat-input':
            satInputs[0].innerHTML = ``
            satInputs[1].innerHTML = `A <input class="sat-input" style="font-size: 1.25em; width: 10ch;" type="Number" placeholder="0"> km</div>`
            satInputs[2].innerHTML = `Drift <input class="sat-input" style="font-size: 1.25em; width: 10ch;" type="Number" placeholder="0"> deg/rev</div>`
            satInputs[3].innerHTML = `Rel Long <input class="sat-input" style="font-size: 1.25em; width: 10ch;" type="Number" placeholder="0"> deg</div>`
            satInputs[4].innerHTML = `In-Plane <input class="sat-input" style="font-size: 1.25em; width: 10ch;" type="Number" placeholder="0"> deg</div>`
            satInputs[5].innerHTML = `Z-Max <input class="sat-input" style="font-size: 1.25em; width: 10ch;" type="Number" placeholder="0"> deg</div>`
            satInputs[6].innerHTML = `Out-of-Plane <input class="sat-input" style="font-size: 1.25em; width: 10ch;" type="Number" placeholder="0"> deg</div>`
            break
    }

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
    console.log(state, [...stateInputs].map(s => s.value));
    let startDate = new Date(document.getElementById('start-time').value)
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
    if (state.e > 0.01) return showScreenAlert('State has an eccentricity of over 0.01, rejected')
    let eciState = Object.values(Coe2PosVelObject(state))
    console.log(state);
    let sun = sunFromTime(startDate) 
    sun = math.squeeze(Eci2Ric(eciState.slice(0,3), eciState.slice(3,6), sun, [0,0,0]).rHcw)
    sun = math.dotDivide(sun, math.norm(sun))
    mainWindow.initSun = sun
    mainWindow.originOrbit = state
    mainWindow.startDate = startDate
    mainWindow.mm = (398600.4418 / mainWindow.originOrbit.a ** 3) ** 0.5
    mainWindow.scenarioLength = Number(document.querySelector('#scen-length-input').value === '' ? document.querySelector('#scen-length-input').placeholder : document.querySelector('#scen-length-input').value)
    let strStart = Number(document.querySelector('#str-start-input').value === ''? document.querySelector('#str-start-input').placeholder : document.querySelector('#str-start-input').value)
    let strEnd = Number(document.querySelector('#str-end-input').value === ''? document.querySelector('#str-end-input').placeholder : document.querySelector('#str-end-input').value)
    mainWindow.stringLimit = [strStart - 1, strEnd]
    document.querySelector('#time-slider-range').max = mainWindow.scenarioLength * 3600
    closeAll();
})

function uploadScenario(event) {
    if (event.target.id === 'upload-scenario-button') return document.querySelector('#upload-sas-input').click()
    if (event.path[0].files[0] === undefined) return
    loadFileAsText(event.path[0].files[0])
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
    let values = document.getElementById('parse-text').value
    values = checkJ200StringValid(values)
    if (!values) return showScreenAlert('J200 string from STK not valid')
    document.getElementById('parse-text').value = ''
    switch (button.id) {
        case 'parse-to-ric':
            let eciOrigin = Object.values(Coe2PosVelObject(mainWindow.originOrbit))
            let dt = (mainWindow.startDate - values.date) / 1000
            values.state = propToTime(values.state, dt, false)
            if (math.abs(dt) > 2 * 86164) return showScreenAlert(`Epoch difference too big: ${(math.abs(dt) / 86164).toFixed(1)} days`)
            let ric = Eci2Ric(eciOrigin.slice(0,3), eciOrigin.slice(3,6), values.state.slice(0,3), values.state.slice(3,6))
            ric = math.squeeze([...ric.rHcw, ...ric.drHcw])
            document.querySelector('#ric-sat-input').checked = true
            changeSatelliteInputType({id: 'ric-sat-input'})
            let ricInputs = document.querySelectorAll('.sat-input')
            ricInputs[0].value = ric[0].toFixed(4)
            ricInputs[1].value = ric[1].toFixed(4)
            ricInputs[2].value = ric[2].toFixed(4)
            ricInputs[3].value = (ric[3]*1000).toFixed(4)
            ricInputs[4].value = (ric[4]*1000).toFixed(4)
            ricInputs[5].value = (ric[5]*1000).toFixed(4)

            break
        case 'parse-set-origin':
            if (mainWindow.satellites.length > 0) {
                let a = confirm("Reseting origin will delete existing satellites");
                if (!a) return
                mainWindow.satellites = []
            }
            mainWindow.startDate = values.date
            let originOrbit = PosVel2CoeNew(values.state.slice(0,3), values.state.slice(3,6))
            mainWindow.mm = (398600.4418 / originOrbit.a ** 3) ** 0.5
            let sun = sunFromTime(values.date) 
            sun = math.squeeze(Eci2Ric(values.state.slice(0,3), values.state.slice(3,6), sun, [0,0,0]).rHcw)
            sun = math.dotDivide(sun, math.norm(sun))
            mainWindow.initSun = sun
            mainWindow.originOrbit = originOrbit
            mainWindow.satellites.push(new Satellite({
                name: 'Origin',
                position: {
                    r: 0,
                    i: 0,
                    c: 0,
                    rd: 0,
                    id: 0,
                    cd: 0,
                }
            }))
            updateWhiteCellWindow()
            break
        
    }
    document.getElementById('parse-text').placeholder = 'State Accepted!'
    setTimeout(() => {
        document.getElementById('parse-text').placeholder = 'ECI State'
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
        document.getElementById('coe-radio').checked = true
        changeOriginInput({id: 'coe-radio'})
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

function nonLinearBurnEstimator(posInit = [0,0,0], posFinal=[-30,1000,0], dt = 18*3600, start = mainWindow.desired.scenarioTime) {
    posInit = math.squeeze(posInit)
    posFinal = math.squeeze(posFinal)
    console.log(proxOpsTargeter(posInit, posFinal, dt)[0]);

    let chiefInit = {...mainWindow.originOrbit}
    chiefInit.tA = propTrueAnomaly(chiefInit.tA, chiefInit.a, chiefInit.e, start)
    chiefInit = Object.values(Coe2PosVelObject(chiefInit))
    
    let chiefFinal = {...mainWindow.originOrbit}
    chiefFinal.tA = propTrueAnomaly(chiefFinal.tA, chiefFinal.a, chiefFinal.e, dt + start)
    chiefFinal = Object.values(Coe2PosVelObject(chiefFinal))
    console.log(posInit, [0,0,0], chiefInit.slice(0,3), chiefInit.slice(3,6));
    posInit = Ric2Eci(posInit, [0,0,0], chiefInit.slice(0,3), chiefInit.slice(3,6))
    posFinal = Ric2Eci(posFinal, [0,0,0], chiefFinal.slice(0,3), chiefFinal.slice(3,6))
    let nRevs = math.floor(dt / (2 * Math.PI / mainWindow.mm))
    let long = (dt - nRevs * (2 * Math.PI / mainWindow.mm)) < (Math.PI / mainWindow.mm)
    let lamResults1 = solveLambertsProblem(posInit.rEcci, posFinal.rEcci, dt, nRevs, long)
    let hcw1 = Eci2Ric(chiefInit.slice(0,3), chiefInit.slice(3,6), posInit.rEcci, posInit.drEci)
    let hcw2 = Eci2Ric(chiefInit.slice(0,3), chiefInit.slice(3,6), posInit.rEcci, math.squeeze(lamResults1.v1))
    let dV = math.subtract(hcw2.drHcw, hcw1.drHcw)
    return dV
}

function hcwFiniteBurnOneBurn(stateInit, stateFinal, tf, a0, time = 0, n = mainWindow.mm) {
    let state = math.transpose([Object.values(stateInit)]);
    stateFinal = math.transpose([Object.values(stateFinal)]);
    let v = proxOpsTargeter(state.slice(0, 3), stateFinal.slice(0, 3), tf);
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
    let errCount = 0
    while (math.norm(math.squeeze(yErr)) > 1e-3) {
        F = oneBurnFiniteHcw(stateInit, X[0][0], X[1][0], X[2][0], tf, time, a0);
        yErr = [
            [stateFinal[0][0] - F.x],
            [stateFinal[1][0] - F.y],
            [stateFinal[2][0] - F.z]
        ];
        S = proxOpsJacobianOneBurn(stateInit, a0, X[0][0], X[1][0], X[2][0], tf, n);
        try {
            dX = math.multiply(math.inv(S), yErr);
        } catch (error) {
            dX = math.zeros([3,1])
        }
        X = math.add(X, dX)
        X[2][0] = X[2][0] < 0 ? 1e-9 : X[2][0]
        X[2][0] = X[2][0] > 1 ? 0.95 : X[2][0]
        if (errCount > 30) return false;
        errCount++;
    }
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

function oneBurnFiniteHcw(state, alpha, phi, tB, finalTime, time = 0, a0 = 0.00001) {
    state = Object.values(state)
    let cosEl = Math.cos(phi)
    let direction = [a0 * Math.cos(alpha) * cosEl, a0 * Math.sin(alpha) * cosEl, a0 * Math.sin(phi)];
    
    let propTime = 0
    while ((propTime + mainWindow.timeDelta) < finalTime * tB) {
        state = runge_kutta(twoBodyRpo, state, mainWindow.timeDelta, direction, time + propTime)
        propTime += mainWindow.timeDelta
    }
    state = runge_kutta(twoBodyRpo, state, finalTime*tB - propTime, direction, time + propTime)
    let propState = state.slice()
    propTime = finalTime * tB
    let propTwoBodyTime = finalTime - propTime
    while((propTime + mainWindow.timeDelta) < finalTime) {
        state = runge_kutta(twoBodyRpo, state, mainWindow.timeDelta, [0,0,0], time + propTime); propTime += mainWindow.timeDelta
    }
    state = runge_kutta(twoBodyRpo, state, finalTime - propTime, [0,0,0], time + propTime);
    propState = state.slice()
    // propState = propRelMotionTwoBodyAnalytic(propState, propTwoBodyTime, time + propTime)
    return {
        x: propState[0],
        y: propState[1],
        z: propState[2],
        xd: propState[3],
        yd: propState[4],
        zd: propState[5]
    };

}

function proxOpsJacobianOneBurn(state, a, alpha, phi, tB, tF, time, n) {
    let m1, m2, m, mC
    // alpha; If phi is at 90 degrees, jacobian won't have full rank, set to 89 deg for az jacobian calculation
    let phi2 = math.abs(Math.cos(phi)) < 1e-6 ? 89 * Math.PI / 180 : phi;
    m1 = oneBurnFiniteHcw(state, alpha, phi2, tB, tF, time, a);
    m1 = [
        [m1.x],
        [m1.y],
        [m1.z]
    ];
    m2 = oneBurnFiniteHcw(state, alpha + 0.01, phi2, tB, tF, time, a);
    m2 = [
        [m2.x],
        [m2.y],
        [m2.z]
    ];
    mC = math.dotDivide(math.subtract(m2, m1), 0.01);
    //phi
    m2 = oneBurnFiniteHcw(state, alpha, phi + 0.01, tB, tF, time, a);
    m2 = [
        [m2.x],
        [m2.y],
        [m2.z]
    ];
    m = math.dotDivide(math.subtract(m2, m1), 0.01);
    mC = math.concat(mC, m);
    //tB
    m2 = oneBurnFiniteHcw(state, alpha, phi, tB + tB * 0.1, tF, time, a);
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
    if (mainWindow.burnStatus.type === 'waypoint' && !cross && sat.a > 0.000001) {
        sat.burns[this.burnStatus.burn].waypoint.target = {
            r: mousePosition[this.burnStatus.frame].r,
            i: mousePosition[this.burnStatus.frame].i,
            c: sat.burns[this.burnStatus.burn].waypoint.target.c
        }
    } else {
        sat.burns[this.burnStatus.burn].direction = {
            r: cross ? sat.burns[this.burnStatus.burn].direction.r : (mousePosition[this.burnStatus.frame].r - sat.burns[this.burnStatus.burn].location.r[0]) * mainWindow.burnSensitivity / 1000,
            i: cross ? sat.burns[this.burnStatus.burn].direction.i : (mousePosition[this.burnStatus.frame].i - sat.burns[this.burnStatus.burn].location.i[0]) * mainWindow.burnSensitivity / 1000,
            c: cross ? (mousePosition[this.burnStatus.frame].c - sat.burns[this.burnStatus.burn].location.c[0]) *
                mainWindow.burnSensitivity / 1000 : sat.burns[this.burnStatus.burn].direction.c
        }
        let tranTime = 1.5*math.norm([sat.burns[this.burnStatus.burn].direction.r, sat.burns[this.burnStatus.burn].direction.i, sat.burns[this.burnStatus.burn].direction.c]) / sat.a;
        tranTime = tranTime < (2 * Math.PI / mainWindow.mm) * 0.12534 ? (2 * Math.PI / mainWindow.mm) * 0.12534 : tranTime;
        tranTime = cross ? sat.burns[this.burnStatus.burn].waypoint.tranTime : tranTime; 
        // If burn time is longer than about an eighth of the orbit (times 1.5), limit burn
        if (tranTime > (2 * Math.PI / mainWindow.mm) * 0.3 && sat.a > 0.000001 && !cross) {
            tranTime = (2 * Math.PI / mainWindow.mm) * 0.3;
            let dir = [sat.burns[this.burnStatus.burn].direction.r, sat.burns[this.burnStatus.burn].direction.i, sat.burns[this.burnStatus.burn].direction.c];
            dir = math.dotDivide(dir, math.norm(dir));
            dir = math.dotMultiply(dir, (tranTime/1.5) * sat.a);
            sat.burns[this.burnStatus.burn].direction = {
                r: dir[0],
                i: dir[1],
                c: dir[2],
            }
        }
        sat.burns[this.burnStatus.burn].waypoint.tranTime = tranTime;
        let dir = [sat.burns[this.burnStatus.burn].direction.r, sat.burns[this.burnStatus.burn].direction.i, sat.burns[this.burnStatus.burn].direction.c];
        let targetState = sat.currentPosition({
            time: sat.burns[this.burnStatus.burn].time
        });
        targetState = oneBurnFiniteHcw({x: targetState.r[0], y: targetState.i[0], z: targetState.c[0], xd: targetState.rd[0], yd: targetState.id[0], zd: targetState.cd[0]}, Math.atan2(dir[1], dir[0]), Math.atan2(dir[2], math.norm([dir[1], dir[0]])), math.norm(dir) / sat.a / tranTime, tranTime, sat.burns[this.burnStatus.burn].time, sat.a);
        sat.burns[this.burnStatus.burn].waypoint.target = {
            r: cross ? sat.burns[this.burnStatus.burn].waypoint.target.r : targetState.x,
            i: cross ? sat.burns[this.burnStatus.burn].waypoint.target.i : targetState.y,
            c: targetState.z
        }
        // Reset cross-track waypoint values in future to natural motion
        for (let hh = this.burnStatus.burn + 1; hh < sat.burns.length; hh++) {
            targetState = sat.currentPosition({
                time: sat.burns[hh].time
            });
            dir = [sat.burns[hh].direction.r, sat.burns[hh].direction.i, 0];
            sat.burns[hh].direction.c = 0;
            targetState = oneBurnFiniteHcw({x: targetState.r[0], y: targetState.i[0], z: targetState.c[0], xd: targetState.rd[0], yd: targetState.id[0], zd: targetState.cd[0]}, Math.atan2(dir[1], dir[0]), Math.atan2(dir[2], math.norm([dir[1], dir[0]])), math.norm(dir) / sat.a / sat.burns[hh].waypoint.tranTime, sat.burns[hh].waypoint.tranTime, sat.burns[hh].time, sat.a);
            sat.burns[hh].waypoint.target.c = targetState.z;
            // sat.burns[hh].waypoint.target.c = targetState.c[0];
        }
    }
    let mag = math.norm([sat.burns[this.burnStatus.burn].direction.r, sat.burns[this.burnStatus.burn].direction.i, sat.burns[this.burnStatus.burn].direction.c])
    let initPos = this.convertToPixels(sat.burns[this.burnStatus.burn].location)[this.burnStatus.frame];
    let ctx = this.getContext();
    ctx.strokeStyle = sat.color;
    ctx.fillStyle = sat.color
    ctx.beginPath();
    ctx.moveTo(initPos.x, initPos.y);
    let dist = mag * 1000 / this.burnSensitivity;
    let point2 = {r: sat.burns[this.burnStatus.burn].location.r[0] + dist * sat.burns[this.burnStatus.burn].direction.r / mag, i: sat.burns[this.burnStatus.burn].location.i[0] + dist * sat.burns[this.burnStatus.burn].direction.i / mag, c: sat.burns[this.burnStatus.burn].location.c[0] + dist * sat.burns[this.burnStatus.burn].direction.c / mag}
    let finalPos = this.convertToPixels(point2)[this.burnStatus.frame];
    ctx.lineTo(finalPos.x, finalPos.y);
    ctx.stroke();
    let mag2 = math.norm([finalPos.x - initPos.x, finalPos.y - initPos.y]);
    ctx.textBaseline = "middle"
    ctx.textAlign = 'center'
    ctx.fillText((1000*mag).toFixed(1) + ' m/s', -60 *(finalPos.x - initPos.x) / mag2 / 1.5 + initPos.x, -60*(finalPos.y - initPos.y) / mag2 / 1.5 + initPos.y)
    sat.genBurns(true, mainWindow.burnStatus.burn);
}

function addToolTip(element) {
    if (element.getElementsByTagName('input').length > 0) return;
    element.classList.toggle('tooltip')
}

function rmoeToRic(rmoes, time = mainWindow.scenarioTime, top = true) {
    let origSemi = (398600.4418 / mainWindow.mm ** 2) ** (1/3);
    let origPeriod = 2 * Math.PI / mainWindow.mm;
    let initMm = mainWindow.mm + (rmoes.x * Math.PI  / 180) / origPeriod;
    let originOrbit = {...mainWindow.originOrbit}
    // originOrbit.raan = 0
    // originOrbit.arg = 0
    // originOrbit.i = 0
    originOrbit.tA = propTrueAnomaly(origPeriod.tA, originOrbit.a, originOrbit.e, time)
    // originOrbit.tA = 0
    let oldE = originOrbit.e + 0
    originOrbit.e = 0
    let findZeroPhaseOutOfPlane = function(rmoesIn) {
        let delta = 0.1
        let rmoes1 = {...rmoesIn}
        let rmoes2 = {...rmoesIn}
        let m = 0
        for (let index = 0; index < 10; index++) {
            rmoes1.m = m
            rmoes2.m = m + delta
            let state1 = rmoeToRic(rmoes1, time, false)
            let state2 = rmoeToRic(rmoes2, time, false)
            let del = (state2.rHcw[2] - state1.rHcw[2]) / delta
            console.log(state1, state2, m, del);
            m += (0 - state1.rHcw[2]) / del
        }
        let state1 = rmoeToRic(rmoes1, time, false)
        m = state1.drHcw[2] < 0 ? m + 180 : m
        return m
    }
    if (top && rmoes.z > 1e-6) rmoes.m += findZeroPhaseOutOfPlane(rmoes, time)
    let coeInit = Object.values(Coe2PosVelObject({
        a: (398600.4418 / initMm ** 2)**(1/3),
        e: rmoes.ae / 2 / origSemi + originOrbit.e,
        i: rmoes.z *Math.PI / 180 + originOrbit.i,
        raan: rmoes.y *Math.PI / 180 - rmoes.m * Math.PI / 180 + rmoes.ae * Math.sin(rmoes.b * Math.PI / 180) / origSemi+ originOrbit.raan,
        arg: rmoes.m * Math.PI / 180 - rmoes.b * Math.PI / 180 + originOrbit.arg + originOrbit.tA,
        tA: rmoes.b * Math.PI / 180
    }))
    originOrbit.e = oldE
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
        let inputs = document.querySelectorAll('.sat-input')
        let radioId = [...document.getElementsByName('sat-input-radio')].filter(s => s.checked)[0].id
        let ricState
        switch (radioId) {
            case 'ric-sat-input':
                ricState = [
                    inputs[0].value,
                    inputs[1].value,
                    inputs[2].value,
                    inputs[3].value,
                    inputs[4].value,
                    inputs[5].value,
                ].map((s, ii) => Number(s) / (ii > 2 ? 1000 : 1))
                break
            case 'eci-sat-input':
                let date = new Date(inputs[0].value)
                let eciState = [
                    inputs[1].value,
                    inputs[2].value,
                    inputs[3].value,
                    inputs[4].value,
                    inputs[5].value,
                    inputs[6].value,
                ].map(s => Number(s))
                let dt = (mainWindow.startDate - date) / 1000
                eciState = propToTime(eciState, dt, false)
                let originEci = Object.values(Coe2PosVelObject(mainWindow.originOrbit))
                ricState = Eci2Ric(originEci.slice(0,3), originEci.slice(3,6), eciState.slice(0,3), eciState.slice(3,6))
                ricState = math.squeeze([...ricState.rHcw, ...ricState.drHcw])
                break
            case 'rmoe-sat-input':
                let rmoes = [
                    inputs[0].value,
                    inputs[1].value,
                    inputs[2].value,
                    inputs[3].value,
                    inputs[4].value,
                    inputs[5].value,
                ].map((s,ii) => Number(s))
                console.log({
                    ae: rmoes[0],
                    x: rmoes[1],
                    y: rmoes[2],
                    b: rmoes[3],
                    z: rmoes[4],
                    m: rmoes[5]
                });
                ricState = rmoeToRic({
                    ae: rmoes[0],
                    x: rmoes[1],
                    y: rmoes[2],
                    b: rmoes[3],
                    z: rmoes[4],
                    m: rmoes[5]
                })
                ricState = math.squeeze([...ricState.rHcw, ...ricState.drHcw])
                break
        }
        position = {
            r: ricState[0],
            i: ricState[1],
            c: ricState[2],
            rd: ricState[3],
            id: ricState[4],
            cd: ricState[5]
        }
        let styleInputs = document.querySelectorAll('.sat-style-input')
        mainWindow.satellites.push(new Satellite({
            position,
            shape: styleInputs[0].value,
            a: Number(styleInputs[1].value === '' ? styleInputs[1].placeholder : styleInputs[1].value) / 1000000,
            color: styleInputs[2].value,
            name: styleInputs[3].value === '' ? 'Sat' + (mainWindow.satellites.length + 1) : styleInputs[3].value
        }))
        let newWidth = (Math.abs(position.i) * 2.2) > (Math.abs(position.r) * 2.4 / mainWindow.getRatio()) ? Math.abs(position.i) * 2.2 : Math.abs(position.r) * 2.4 / mainWindow.getRatio()
        if (newWidth > mainWindow.desired.plotWidth) {
            mainWindow.desired.plotWidth = newWidth
        }
        document.title = mainWindow.satellites.map(sat => sat.name).join(' / ');
        updateWhiteCellWindow()
        updateLockScreen()
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
        updateLockScreen()
        updateWhiteCellWindow()
        document.title = mainWindow.satellites.map(s => s.name).join(' / ')
        closeAll();
        return;
    }
    if (button.nextSibling.selectedIndex < 0) return;
    let inputs = document.querySelectorAll('.sat-input')
    let radioId = [...document.getElementsByName('sat-input-radio')].filter(s => s.checked)[0].id
    let ricState
    switch (radioId) {
        case 'ric-sat-input':
            ricState = [
                inputs[0].value,
                inputs[1].value,
                inputs[2].value,
                inputs[3].value,
                inputs[4].value,
                inputs[5].value,
            ].map((s, ii) => Number(s) / (ii > 2 ? 1000 : 1))
            break
        case 'eci-sat-input':
            let date = new Date(inputs[0].value)
            let eciState = [
                inputs[1].value,
                inputs[2].value,
                inputs[3].value,
                inputs[4].value,
                inputs[5].value,
                inputs[6].value,
            ].map(s => Number(s))
            let dt = (mainWindow.startDate - date) / 1000
            eciState = propToTime(eciState, dt, false)
            let originEci = Object.values(Coe2PosVelObject(mainWindow.originOrbit))
            ricState = Eci2Ric(originEci.slice(0,3), originEci.slice(3,6), eciState.slice(0,3), eciState.slice(3,6))
            ricState = math.squeeze([...ricState.rHcw, ...ricState.drHcw])
            break
        case 'rmoe-sat-input':
            let rmoes = [
                inputs[0].value,
                inputs[1].value,
                inputs[2].value,
                inputs[3].value,
                inputs[4].value,
                inputs[5].value,
            ].map((s,ii) => Number(s))
            console.log({
                ae: rmoes[0],
                x: rmoes[1],
                y: rmoes[2],
                b: rmoes[3],
                z: rmoes[4],
                m: rmoes[5]
            });
            ricState = rmoeToRic({
                ae: rmoes[0],
                x: rmoes[1],
                y: rmoes[2],
                b: rmoes[3],
                z: rmoes[4],
                m: rmoes[5]
            })
            ricState = math.squeeze([...ricState.rHcw, ...ricState.drHcw])
            break
    }   
    let color = mainWindow.satellites[button.nextSibling.selectedIndex].color;
    let name = mainWindow.satellites[button.nextSibling.selectedIndex].name;
    let shape = mainWindow.satellites[button.nextSibling.selectedIndex].shape;
    let a = mainWindow.satellites[button.nextSibling.selectedIndex].a;
    state = {
        r:  ricState[0],
        i:  ricState[1],
        c:  ricState[2],
        rd: ricState[3],
        id: ricState[4],
        cd: ricState[5],
    }
    let sat = new Satellite({
        position: state,
        color,
        shape,
        a,
        name
    });
    mainWindow.satellites[button.nextSibling.selectedIndex] = sat;
    mainWindow.satellites[button.nextSibling.selectedIndex].calcTraj();
    let curPos = mainWindow.satellites[button.nextSibling.selectedIndex].currentPosition();
    mainWindow.satellites[button.nextSibling.selectedIndex].curPos = {r: curPos.r[0], i: curPos.i[0], c: curPos.c[0], rd: curPos.rd[0], id: curPos.id[0], cd: curPos.cd[0]}
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
    ctx.stroke();

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
    ctx.fillText(name ? shortenString(name) : '', pixelPosition[0], letterY);
}

function getRelativeData(n_target, n_origin, intercept = true) {
    let sunAngle, rangeRate, range, poca, toca, tanRate, rangeStd;
    let relPos = math.squeeze(math.subtract(mainWindow.satellites[n_origin].getPositionArray(), mainWindow.satellites[n_target]
        .getPositionArray()));
    let relVel = math.squeeze(math.subtract(mainWindow.satellites[n_origin].getVelocityArray(), mainWindow.satellites[n_target]
        .getVelocityArray()));
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
    sunAngle = 180 - sunAngle; // Appropriate for USSF
    rangeRate = math.dot(relVel, relPos) * 1000 / range;
    // tanRate = Math.sqrt(Math.pow(math.norm(relVel), 2) - Math.pow(rangeRate, 2)) * 1000;
    let relPosHis, interceptData
    try {
        relPosHis = findMinDistance(mainWindow.satellites[n_origin].stateHistory, mainWindow.satellites[n_target].stateHistory);

        poca = math.min(relPosHis);
        toca = relPosHis.findIndex(element => element === poca) * mainWindow.timeDelta;
        if (intercept !== false) {
            let point1 = mainWindow.satellites[n_target].currentPosition()
            let point2 = mainWindow.satellites[n_origin].currentPosition({time: mainWindow.scenarioTime + 3600})
            // console.log(point1, point2);
            let burn = hcwFiniteBurnOneBurn({
                x: point1.r[0],
                y: point1.i[0],
                z: point1.c[0],
                xd: point1.rd[0],
                yd: point1.id[0],
                zd: point1.cd[0]
            }, {
                x: point2.r[0],
                y: point2.i[0],
                z: point2.c[0],
                xd: point2.rd[0],
                yd: point2.id[0],
                zd: point2.cd[0]
            }, 3600, mainWindow.satellites[n_target].a, mainWindow.scenarioTime)
            if (burn) {
                let lastTimeStepOrigin = [burn.F.x - burn.F.xd, burn.F.y - burn.F.yd, burn.F.z - burn.F.zd]
                let lastTimeStepTarget = [point2.r[0] -  point2.rd[0], point2.i[0] -  point2.id[0], point2.c[0] -  point2.cd[0]]
                let relPosInter = math.subtract(lastTimeStepOrigin, lastTimeStepTarget)
                let sunInter = mainWindow.getCurrentSun(mainWindow.scenarioTime + 3600 - 1)
                let sunAng = math.acos(math.dot(sunInter, relPosInter) / math.norm(sunInter) / math.norm(relPosInter)) * 180 / Math.PI
                interceptData = {
                    dV: math.norm([burn.r, burn.i, burn.c]),
                    relVel: math.norm(math.subtract([burn.F.xd, burn.F.yd, burn.F.zd], [point2.rd[0], point2.id[0], point2.cd[0]])),
                    sunAng
                }
                interceptData = `[${(1000*interceptData.dV).toFixed(1)}, ${(interceptData.sunAng).toFixed(1)}, ${(1000*interceptData.relVel).toFixed(1)}]`
            }
            // console.log(interceptData);
        }
    }
    catch (err) {console.log(err)}
    
    return {
        sunAngle,
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
        outVec.push(math.norm([vector1[jj].r - vector2[jj].r, vector1[jj].i - vector2[jj].i, vector1[jj].c -
            vector2[jj].c
        ]));
    }
    return outVec
}

function drawCurve(ctx, points) {
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
    let dir = hcwFiniteBurnOneBurn({x: r1.r[0], y: r1.i[0], z: r1.c[0], xd: r1.rd[0], yd: r1.id[0], zd: r1.cd[0]}, {x: r2.r[0], y: r2.i[0], z: r2.c[0], xd: 0, yd: 0, zd: 0}, tf, a);
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

function j2Rpo(state = [-1.89733896, 399.98, 0, 0, 0, 0], options = {}) {
    let {mu = 398600.4418, a = [0,0,0], time= 0} = options;
    let inertChief = {...mainWindow.originOrbit}
    inertChief.tA = propTrueAnomaly(inertChief.tA, inertChief.a, inertChief.e, time)
    inertChief = Coe2PosVelObject(inertChief, true)
    let r = Object.values(inertChief)
    let v = r.slice(3,6)
    r = r.slice(0,3)
    let rn = math.norm(r)
    let radRate = math.dot(r, v) / rn
    let tanRate = (math.norm(v) ** 2 - radRate ** 2) ** (1/2)
    
    let chiefAcc = twoBodyJ2(r, true).slice(3,6)
    
    let h = math.cross(r, v);
    let ricX = math.dotDivide(r, rn);
    let ricZ = math.dotDivide(h, math.norm(h));
    let ricY = math.cross(ricZ, ricX);
    let C = [ricX, ricY, ricZ];
    let depPosition = math.add(r, math.squeeze(math.multiply(math.transpose(C), math.transpose([state.slice(0,3)]))))
    let depAcc = twoBodyJ2(depPosition, true).slice(3,6)
    let relAcc = math.squeeze(math.multiply(C, math.transpose([math.subtract(depAcc, chiefAcc)])))

    let n = tanRate / rn
    let ndot = -2 * radRate * n / rn

    let x = state[0], y = state[1], z = state[2], dx = state[3], dy = state[4], dz = state[5];
    // console.log(relAcc);
    return [
        dx,
        dy,
        dz,
        relAcc[0] + 2 * n * dy + n ** 2 * x + ndot * y +  a[0] + mainWindow.extraAcc[0],
        relAcc[1] - 2 * n * dx - ndot * x + n ** 2 * y + a[1] + mainWindow.extraAcc[1],
        relAcc[2] + a[2] + mainWindow.extraAcc[2]
    ]
}

function twoBodyJ2(position = [42164, 0, 0, 0, 3.074, 0], j2Eff = true) {
    let mu = 398600.44189, j2 = 0.00108262668, re = 6378, x = position[0], y = position[1], z = position[2]
    let r = math.norm(position.slice(0,3))
    return j2Eff ? [
        position[3], position[4], position[5],
        -mu * x / r ** 3 * (1 - 1.5 * j2 * re ** 2 / r ** 2 * (5 * z ** 2 / r ** 2 - 1)),
        -mu * y / r ** 3 * (1 - 1.5 * j2 * re ** 2 / r ** 2 * (5 * z ** 2 / r ** 2 - 1)),
        -mu * z / r ** 3 * (1 - 1.5 * j2 * re ** 2 / r ** 2 * (5 * z ** 2 / r ** 2 - 3))
    ] : 
    [
        position[3], position[4], position[5],
        -mu * x / r ** 3 ,
        -mu * y / r ** 3 ,
        -mu * z / r ** 3 
    ]
}

function runge_kutta(eom, state, dt, a = [0,0,0], time = 0) {
    if (mainWindow.prop === 4) {
        let k1 = eom(state, {a, time});
        let k2 = eom(math.add(state, math.dotMultiply(dt/2, k1)), {a, time: time + dt/2});
        let k3 = eom(math.add(state, math.dotMultiply(dt/2, k2)), {a, time: time + dt/2});
        let k4 = eom(math.add(state, math.dotMultiply(dt/1, k3)), {a, time: time + dt});
        return math.add(state, math.dotMultiply(dt / 6, (math.add(k1, math.dotMultiply(2, k2), math.dotMultiply(2, k3), k4))));
    }
    // eom = j2 ? j2Rpo : eom
    let k1 = eom(state, {a, time});
    let k2 = eom(math.add(state, math.dotMultiply(dt/2, k1)), {a, time: time + dt/2});
    return math.add(state, math.dotMultiply(dt, k2));
}

function calcSatTwoBody(recalcBurns = false, burns = 0) {
    // If recalcBurns is true, burn directions will be recalculated as appropriate times during propagation
    let t_calc = 0, currentState = Object.values(this.position), satBurn = this.burns.length > 0 ? 0 : undefined;
    this.stateHistory = [];
    while (t_calc <= mainWindow.scenarioLength * 3600) {
        this.stateHistory.push({
            t: t_calc, 
            r: currentState[0],
            i: currentState[1],
            c: currentState[2],
            rd: currentState[3],
            id: currentState[4],
            cd: currentState[5]
        });
        if (satBurn !== undefined) {
            if ((this.burns[satBurn].time - t_calc) <= mainWindow.timeDelta && (this.burns[satBurn].time <=
                (mainWindow.scenarioTime + 0.5) || recalcBurns)) {
                currentState = runge_kutta(twoBodyRpo, currentState, this.burns[satBurn].time - t_calc, [0,0,0], t_calc);
                let remainder = mainWindow.timeDelta - (this.burns[satBurn].time - t_calc)
                t_calc = this.burns[satBurn].time
                // Recalculate Burns if needed
                if (recalcBurns && satBurn >= burns) {
                    this.burns[satBurn].location  = {
                        r: [currentState[0]],
                        i: [currentState[1]],
                        c: [currentState[2]],
                        rd: [currentState[3]],
                        id: [currentState[4]],
                        cd: [currentState[5]],
                    }  
                    if (this.a > 0.000001){
                        let dir = hcwFiniteBurnOneBurn({
                            x: currentState[0],
                            y: currentState[1],
                            z: currentState[2],
                            xd: currentState[3],
                            yd: currentState[4],
                            zd: currentState[5]
                        }, {
                            x: this.burns[satBurn].waypoint.target.r,
                            y: this.burns[satBurn].waypoint.target.i,
                            z: this.burns[satBurn].waypoint.target.c,
                            xd: 0,
                            yd: 0,
                            zd: 0
                        }, this.burns[satBurn].waypoint.tranTime, this.a, t_calc)
                        if (dir && dir.t > 0 && dir.t < 1) {
                            this.burns[satBurn].direction.r = dir.r;
                            this.burns[satBurn].direction.i = dir.i;
                            this.burns[satBurn].direction.c = dir.c;
                        }
                    }
                } 
                // Burn duration
                let t_burn = math.norm([this.burns[satBurn].direction.r, this.burns[satBurn]
                    .direction.i, this.burns[satBurn].direction.c
                ]) / this.a;
                
                if (satBurn !== this.burns.length - 1) {
                    t_burn = t_burn > (this.burns[satBurn + 1].time - this.burns[satBurn].time) ? this.burns[satBurn + 1].time - this.burns[satBurn].time : t_burn;
                } 
                t_burn = ((mainWindow.scenarioTime - this.burns[satBurn].time) < t_burn) && !recalcBurns ? (mainWindow.scenarioTime - this.burns[satBurn].time) : t_burn;
                
                let direction = Object.values(this.burns[satBurn].direction)
                direction = math.dotMultiply(this.a / math.norm(direction), direction)

                if (t_burn > remainder) {
                    currentState = runge_kutta(twoBodyRpo, currentState, remainder, direction, t_calc);
                    t_calc += remainder
                    this.stateHistory.push({t: t_calc, r: currentState[0], i: currentState[1], c: currentState[2], rd: currentState[3], id: currentState[4], cd: currentState[5]});
                    remainder = 0
                }
                while ((this.burns[satBurn].time + t_burn - t_calc) > mainWindow.timeDelta) {
                    currentState = runge_kutta(twoBodyRpo, currentState, mainWindow.timeDelta, direction, t_calc);
                    t_calc += mainWindow.timeDelta
                    this.stateHistory.push({t: t_calc, r: currentState[0], i: currentState[1], c: currentState[2], rd: currentState[3], id: currentState[4], cd: currentState[5]});
                }
                // console.log(this.burns[satBurn].time + t_burn - t_calc);
                if (t_burn > 1e-3) {
                    currentState = runge_kutta(twoBodyRpo, currentState, this.burns[satBurn].time + t_burn - t_calc, direction, t_calc);
                    remainder = remainder > 0 ? remainder - (this.burns[satBurn].time + t_burn - t_calc) : mainWindow.timeDelta - (this.burns[satBurn].time + t_burn - t_calc)
                    t_calc = t_burn + this.burns[satBurn].time
                }
                t_calc += remainder
                currentState = runge_kutta(twoBodyRpo, currentState, remainder, [0,0,0], t_calc)
                // this.stateHistory.push({t: t_calc, r: currentState[0], i: currentState[1], c: currentState[2], rd: currentState[3], id: currentState[4], cd: currentState[5]});
                satBurn = this.burns.length === satBurn + 1 ? undefined : satBurn + 1;
                continue;
            }
        }
        // console.log(currentState.slice());
        currentState = runge_kutta(twoBodyRpo, currentState, mainWindow.timeDelta, [0,0,0], t_calc);
        t_calc += mainWindow.timeDelta;
    }
}

function getCurrentPosition(options = {}) {
    let {time = mainWindow.scenarioTime, burn} = options;
    let stateIndex;
    stateIndex = this.stateHistory.findIndex(el => {
        return el.t > (burn !== undefined ? this.burns[burn].time : time)
    }) - 1;
    stateIndex = stateIndex < 0 ? this.stateHistory.length - 1: stateIndex;
    let refState = [
        this.stateHistory[stateIndex].r,
        this.stateHistory[stateIndex].i,
        this.stateHistory[stateIndex].c,
        this.stateHistory[stateIndex].rd,
        this.stateHistory[stateIndex].id,
        this.stateHistory[stateIndex].cd,
    ]
    if (burn !== undefined) {
        refState = runge_kutta(twoBodyRpo, refState, this.burns[burn].time - this.stateHistory[stateIndex].t, this.stateHistory[stateIndex].t);
        let direction = [this.burns[burn].direction.r, this.burns[burn].direction.i, this.burns[burn].direction.c];
        let burnTime = math.norm(direction) / this.a;
        direction = math.dotMultiply(this.a, math.dotDivide(direction, math.norm(direction)));
        refState = runge_kutta(twoBodyRpo, refState, burnTime, direction, this.burns[burn].time);
        refState = runge_kutta(twoBodyRpo, refState, time - this.burns[burn].time - burnTime, this.burns[burn].time + burnTime);
        return {r: [refState[0]], i: [refState[1]], c: [refState[2]], rd: [refState[3]], id:[refState[4]], cd: [refState[5]]};
    }
    let isTimeDuringBurn = this.burns.filter(burn => {
        let burnEnd = math.norm([burn.direction.r, burn.direction.i, burn.direction.c]) / this.a + burn.time;
        return time >= burn.time && time < burnEnd;
    });
    // Check if reference time during burn
    let isIndexDuringBurn = this.burns.filter(burn => {
        let burnEnd = math.norm([burn.direction.r, burn.direction.i, burn.direction.c]) / this.a + burn.time;
        return this.stateHistory[stateIndex].t >= burn.time && this.stateHistory[stateIndex].t < burnEnd;
    });
    let isSurroundsBurn = this.burns.filter(burn => {
        let burnEnd = math.norm([burn.direction.r, burn.direction.i, burn.direction.c]) / this.a + burn.time;
        return this.stateHistory[stateIndex].t < burn.time && time > burnEnd;
    });
    if (isTimeDuringBurn.length > 0 && isIndexDuringBurn.length > 0) {
        let direction = isTimeDuringBurn[0].direction;
        direction = [direction.r, direction.i, direction.c];
        direction = math.dotDivide(direction, math.norm(direction) / this.a);
        refState = runge_kutta(twoBodyRpo, refState, time - this.stateHistory[stateIndex].t, direction, this.stateHistory[stateIndex].t);
    }
    else if (isTimeDuringBurn.length > 0) {
        let direction = isTimeDuringBurn[0].direction;
        direction = [direction.r, direction.i, direction.c];
        direction = math.dotDivide(direction, math.norm(direction) / this.a);
        refState = runge_kutta(twoBodyRpo, refState, isTimeDuringBurn[0].time - this.stateHistory[stateIndex].t, [0,0,0], this.stateHistory[stateIndex].t);
        refState = runge_kutta(twoBodyRpo, refState, time - isTimeDuringBurn[0].time, direction, isTimeDuringBurn[0].time);
    }
    else if (isIndexDuringBurn.length > 0) {
        let direction = isIndexDuringBurn[0].direction;
        direction = [direction.r, direction.i, direction.c];
        let burnEnd = math.norm(direction) / this.a + isIndexDuringBurn[0].time;
        direction = math.dotDivide(direction, math.norm(direction) / this.a);
        refState = runge_kutta(twoBodyRpo, refState, burnEnd - this.stateHistory[stateIndex].t, direction, this.stateHistory[stateIndex].t);
        refState = runge_kutta(twoBodyRpo, refState, time - burnEnd, [0,0,0], burnEnd);

    }
    else if (isSurroundsBurn.length > 0) {
        let direction = isSurroundsBurn[0].direction;
        direction = [direction.r, direction.i, direction.c];
        let burnEnd = math.norm(direction) / this.a + isSurroundsBurn[0].time;
        direction = math.dotDivide(direction, math.norm(direction) / this.a);
        refState = runge_kutta(twoBodyRpo, refState, isSurroundsBurn[0].time - this.stateHistory[stateIndex].t, [0,0,0], this.stateHistory[stateIndex].t);
        refState = runge_kutta(twoBodyRpo, refState, burnEnd - isSurroundsBurn[0].time, direction, isSurroundsBurn[0].time);
        refState = runge_kutta(twoBodyRpo, refState, time - burnEnd, [0,0,0], burnEnd);

    }
    else {
        refState = runge_kutta(twoBodyRpo, refState, time - this.stateHistory[stateIndex].t, [0,0,0], this.stateHistory[stateIndex].t);
    }
    // console.log(isTimeDuringBurn.length, isIndexDuringBurn.length, isSurroundsBurn.length);
    return {r: [refState[0]], i: [refState[1]], c: [refState[2]], rd: [refState[3]], id:[refState[4]], cd: [refState[5]]};
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

function solveLambertsProblem(r1_vec, r2_vec, tMan, Nrev, long) {
    let r1 = math.norm(r1_vec);
    console.log(r1_vec);
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

function Ric2Eci(rHcw = [0,0,0], drHcw = [0,0,0], rC = [(398600.4418 / mainWindow.mm ** 2)**(1/3), 0, 0], drC = [0, (398600.4418 / ((398600.4418 / mainWindow.mm ** 2)**(1/3))) ** (1/2), 0]) {
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
        return math.norm([s1.r[0] - s2.r[0], s1.i[0] - s2.i[0], s1.c[0] - s2.c[0]])
    }
    let positionSeed = getRange(sat, satTarget, time) < r ? 1 : -1;
    let seedIndex = stateHist.map((state, ii) => {
        return math.norm([state.r - stateHistTarget[ii].r, state.i - stateHistTarget[ii].i, state.c - stateHistTarget[ii].c])
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
        let relPos = math.squeeze(math.subtract(Object.values(s1), Object.values(s2))).slice(0,3)
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
        // let time1 = mainWindow.satellites[sat].currentPosition({time: seedTime})
        let time1 = getCats(sat, satTarget, seedTime)
        // let time2 = mainWindow.satellites[sat].currentPosition({time: seedTime - dt})
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
    let seedIndex = stateHist.findIndex(state => state.i * positionSeed > it * positionSeed);
    if (seedIndex === -1) return showScreenAlert('No Solution in Time Frame')
    let seedTime = stateHist[seedIndex].t
    // console.log(seedTime);
    for (let index = 0; index < 10; index++) {
        let dt = 0.1
        let time1 = mainWindow.satellites[sat].currentPosition({time: seedTime})
        let time2 = mainWindow.satellites[sat].currentPosition({time: seedTime - dt})
        let di_dt = (time1.i[0] - time2.i[0]) / dt
        seedTime += (it - time1.i[0]) / di_dt
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
    let seedIndex = stateHist.map(state => math.norm([state.r + baseSma, state.i]) - baseSma).findIndex(state => state * positionSeed > r * positionSeed)
    if (seedIndex === -1) return showScreenAlert('No Solution in Time Frame')
    let seedTime = stateHist[seedIndex].t
    // console.log(seedTime);
    for (let index = 0; index < 10; index++) {
        let dt = 0.1
        let time1 = mainWindow.satellites[sat].currentPosition({time: seedTime})
        let time2 = mainWindow.satellites[sat].currentPosition({time: seedTime - dt})
        time1 = math.norm([time1.r[0] + baseSma, time1.i[0]]) - baseSma
        time2 = math.norm([time2.r[0] + baseSma, time2.i[0]]) - baseSma
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
    let seedIndex = stateHist.findIndex(state => state.c * positionSeed > c * positionSeed);
    if (seedIndex === -1) return showScreenAlert('No Solution in Time Frame')
    let seedTime = stateHist[seedIndex].t
    // console.log(seedTime);
    for (let index = 0; index < 10; index++) {
        let dt = 0.1
        let time1 = mainWindow.satellites[sat].currentPosition({time: seedTime})
        let time2 = mainWindow.satellites[sat].currentPosition({time: seedTime - dt})
        let di_dt = (time1.c[0] - time2.c[0]) / dt
        seedTime += (c - time1.c[0]) / di_dt
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

function insertDirectionBurn(sat = 0, time = 3600, dir = [0.001, 0, 0], burn, translate = false) {
    if (translate) {
        let rot = translateFrames(sat, {time})
        dir = math.transpose(math.multiply(math.transpose(rot), math.transpose([dir])))[0];
        
    }
    if (burn !== undefined) {
        mainWindow.satellites[sat].burns = mainWindow.satellites[sat].burns.slice(0, Number(burn))
    }
    else {
        mainWindow.satellites[sat].burns = mainWindow.satellites[sat].burns.filter(burn => {
            return burn.time < time
        })
    }
    let position = mainWindow.satellites[sat].currentPosition({time});
    
    logAction({
        type: 'addBurn',
        index: mainWindow.satellites[sat].burns.length,
        sat
    })
    mainWindow.satellites[sat].burns.push({
        time: time,
        direction: {
            r: dir[0],
            i: dir[1],
            c: dir[2]
        },
        waypoint: {
            tranTime: 0,
            target: {
                r: 0,
                i: 0,
                c: 0,
            }
        }
    })
    let tof = 1.5 * math.norm(dir) / mainWindow.satellites[sat].a;
    tof = tof > 10800 ? tof : 10800;
    position = {x: position.r[0], y: position.i[0], z: position.c[0], xd: position.rd[0], yd: position.id[0], zd: position.cd[0]};
    let direction = dir;
    let wayPos = oneBurnFiniteHcw(position, Math.atan2(direction[1], direction[0]), Math.atan2(direction[2], math.norm([direction[0], direction[1]])), (math.norm(direction) / mainWindow.satellites[sat].a) / tof, tof, time, mainWindow.satellites[sat].a)
    
    mainWindow.satellites[sat].burns[mainWindow.satellites[sat].burns.length-1].waypoint  = {
        tranTime: tof,
        target: {
            r: wayPos.x,
            i: wayPos.y,
            c: wayPos.z
        }
    }
    mainWindow.satellites[sat].genBurns();
    if (burn !== undefined) return
    mainWindow.desired.scenarioTime = time + 3600;
    document.querySelector('#time-slider-range').value = mainWindow.desired.scenarioTime
    updateWhiteCellWindow()
}

function insertWaypointBurn(sat = 0, time = 3600, way = [0,0,0], tof = 7200, origin = [0,0,0]) {
    mainWindow.satellites[sat].burns.push({
        time,
        direction: {
            r: 0,
            i: 0,
            c: 0
        },
        waypoint: {
            tranTime: tof,
            target: {
                r: way[0] + origin[0],
                i: way[1] + origin[1],
                c: way[2] + origin[2],
            }
        }
    })
    mainWindow.satellites[sat].genBurns();
    let checkBurn = mainWindow.satellites[sat].burns[mainWindow.satellites[sat].burns.length-1];
    mainWindow.desired.scenarioTime = time + 3600;
    document.getElementById('time-slider-range').value = mainWindow.desired.scenarioTime;
    if (math.norm(Object.values(checkBurn.direction)) < 1e-8) {
        mainWindow.satellites[sat].burns.pop();
        mainWindow.satellites[sat].genBurns();
        showScreenAlert('Waypoint outside kinematic reach or error in calculating burn');
        return false;
    }
    updateWhiteCellWindow()
    return true
}

function perchSatellite(sat = 0, time = mainWindow.scenarioTime) {
    let curPos = mainWindow.satellites[sat].currentPosition({time})
    let burnEst = math.norm([curPos.rd[0], curPos.id[0], curPos.cd[0]])
    curPos = mainWindow.satellites[sat].currentPosition({time: time - burnEst / mainWindow.satellites[sat].a / 2})

    let burnOut = perchSatelliteSolver([curPos.r[0], curPos.i[0], curPos.c[0], curPos.rd[0], curPos.id[0], curPos.cd[0]], mainWindow.satellites[sat].a)
    insertDirectionBurn(sat, time - burnEst / mainWindow.satellites[sat].a / 2, burnOut.dir)
}

function circSatellite(sat = 0, time = mainWindow.scenarioTime) {
    let dt = 7200
    let curPos = mainWindow.satellites[sat].currentPosition({time})
    let curPos2 = mainWindow.satellites[sat].currentPosition({time: time + dt})
    let curR = math.norm([curPos.r[0] + (398600.4418 / mainWindow.mm ** 2) ** (1/3), curPos.i[0], curPos.c[0]])
    let curTh = math.atan2( curPos.i[0], curPos.r[0] + (398600.4418 / mainWindow.mm ** 2) ** (1/3))
    let dTh = (398600.4418 / curR ** 3) ** (1/2) - (398600.4418 / (398600.4418 / mainWindow.mm ** 2)) ** (1/2)
    let newTh = curTh + dt * dTh
    let newPos = [curR * Math.cos(newTh) - (398600.4418 / mainWindow.mm ** 2) ** (1/3), curR * Math.sin(newTh), curPos2.c[0]]
    
    mainWindow.satellites[sat].burns = mainWindow.satellites[sat].burns.filter(burn => {
        return burn.time < mainWindow.scenarioTime;
    })
    mainWindow.satellites[sat].burns.push({
        time: mainWindow.desired.scenarioTime,
        direction: {
            r: 0,
            i: 0,
            c: 0
        },
        waypoint: {
            tranTime: dt,
            target: {
                r: newPos[0],
                i: newPos[1],
                c: newPos[2],
            }
        }
    })
    mainWindow.satellites[sat].genBurns();
    let dV = mainWindow.satellites[sat].burns[mainWindow.satellites[sat].burns.length - 1].direction
    dV = math.norm([dV.r, dV.i, dV.c]) / mainWindow.satellites[sat].a
    mainWindow.satellites[sat].burns[mainWindow.satellites[sat].burns.length - 1].time -= dV / 2
    mainWindow.satellites[sat].burns[mainWindow.satellites[sat].burns.length - 1].waypoint.tranTime += dV / 2
    mainWindow.satellites[sat].genBurns();
    let checkBurn = mainWindow.satellites[sat].burns[mainWindow.satellites[sat].burns.length-1];
    if (math.norm([checkBurn.direction.r, checkBurn.direction.i, checkBurn.direction.c]) < 1e-8) {
        mainWindow.satellites[sat].burns.pop();
        mainWindow.satellites[sat].genBurns();
        showScreenAlert('Waypoint outside kinematic reach of satellite with given time of flight');
        return;
    }
    mainWindow.desired.scenarioTime = mainWindow.desired.scenarioTime + dt;
    document.getElementById('time-slider-range').value = mainWindow.desired.scenarioTime + dt;
    
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
    let inertChief = {...mainWindow.originOrbit}
    inertChief.tA = propTrueAnomaly(inertChief.tA, inertChief.a, inertChief.e, time)
    inertChief = Coe2PosVelObject(inertChief)
    inertChief = [inertChief.x, inertChief.y, inertChief.z, inertChief.vx, inertChief.vy, inertChief.vz]
    let satPos = math.squeeze(Object.values(mainWindow.satellites[sat].currentPosition({time})))
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

function generateJ2000File(satellites, team=undefined, time = mainWindow.scenarioTime) {
    let startEphem = `Time (UTCG)              x (km)           y (km)         z (km)     vx (km/sec)    vy (km/sec)    vz (km/sec)
-----------------------    -------------    -------------    ---------    -----------    -----------    -----------
`
    let fileText = `\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t ${Date.now()}
    Satellite-${satellites.map(s => s.name + `errarts${s.error[0].toFixed(2)}/${(1000*s.error[3]).toFixed(2)}`).join(', ')}:  J2000 Position & Velocity
    `
    satellites.forEach(sat => {
        fileText += `\n\n${startEphem}`
        let currentPos = sat.errorEciPosition
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

function reverseLastAction() {
    if (pastActions.length === 0) return
    let action = pastActions.pop()
    switch (action.type) {
        case 'addBurn':
            mainWindow.satellites[action.sat].burns.splice(action.index, 1)
            mainWindow.satellites[action.sat].burns = mainWindow.satellites[action.sat].burns.filter(burn => burn !== undefined)
            mainWindow.satellites[action.sat].genBurns()
            mainWindow.satellites[action.sat].calcTraj()
            mainWindow.desired.scenarioTime = action.time
            break
        case 'deleteBurn':
            mainWindow.satellites[action.sat].burns.splice(action.index, 0, action.burn)
            mainWindow.satellites[action.sat].genBurns()
            mainWindow.satellites[action.sat].calcTraj()
            mainWindow.desired.scenarioTime = action.time
            break
        case 'alterBurn':
            mainWindow.satellites[action.sat].burns.splice(action.index, 1, action.burn)
            mainWindow.satellites[action.sat].genBurns()
            mainWindow.satellites[action.sat].calcTraj()
            break
    }

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
    mainWindow.satellites[sat].calcTraj()
    insertDirectionBurn(sat, burnOld.time + dt, Object.values(burnOld.direction))
    mainWindow.satellites[sat].burns.push(...futureBurns)
    mainWindow.satellites[sat].genBurns()
    mainWindow.satellites[sat].calcTraj()
}

function startMonteCarlo(sat = 0, burn = 0, options= {}) {
    let {n = 200, stdR =  0.1, stdAng =  1.5*Math.PI / 180} = options
    let burnSat = mainWindow.satellites[sat].burns[burn]
    let state = mainWindow.satellites[sat].currentPosition({time: burnSat.time})
    state = {
        x: state.r[0],
        y: state.i[0],
        z: state.c[0],
        xd: state.rd[0],
        yd: state.id[0],
        zd: state.cd[0]
    }
    let direction = {
        mag: math.norm(Object.values(burnSat.direction)),
        az: math.atan2(burnSat.direction.i, burnSat.direction.r),
        el: math.atan2(burnSat.direction.c, math.norm(Object.values(burnSat.direction).slice(0,2)))
    }
    let a = mainWindow.satellites[sat].a
    let dur = direction.mag * (1 + 10 * stdR) / a
    let propTime = dur < (mainWindow.scenarioTime - burnSat.time) ? mainWindow.scenarioTime - burnSat.time : dur
    let corruptBurn = (burn) => {
        // return {
        //     mag: burn.mag + stdR * burn.mag * 2*(Math.random()-0.5),
        //     az: burn.az + stdAng * 2*(Math.random()-0.5),
        //     el: burn.el + stdAng * 2*(Math.random()-0.5)
        // }
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

function changeOrigin(satIn = 1, time = 0) {
    try {
        let inertStart = Object.values(Coe2PosVelObject(mainWindow.originOrbit))
        let sats = mainWindow.satellites.map((sat, ii) => {
            let inertPos = Ric2Eci(Object.values(sat.position).slice(0,3), Object.values(sat.position).slice(3,6), inertStart.slice(0,3), inertStart.slice(3,6))
            inertPos = [...inertPos.rEcci, ...inertPos.drEci]
            let satOut = JSON.parse(JSON.stringify(sat))
            satOut.inertPos = inertPos
            return {
                inertPos,
                position: sat.position,
                a: sat.a,
                burns: sat.burns.map(burn => {
                    let r = translateFrames(ii, {time: burn.time})
                    let dir = math.squeeze(math.multiply(r, math.reshape(Object.values(burn.direction), [3,1])))
                    let burnOut = JSON.parse(JSON.stringify(burn))
                    burnOut.direction = {r: dir[0], i: dir[1], c: dir[2]}
                    return burnOut
                }),
    
    
            }
        })
        let newInert = PosVel2CoeNew(sats[satIn].inertPos.slice(0,3), sats[satIn].inertPos.slice(3,6))
        let sun = Ric2Eci( math.dotMultiply(151609685.93989992 / math.norm(mainWindow.initSun), mainWindow.initSun), [0,0,0], inertStart.slice(0,3), inertStart.slice(3,6)).rEcci
        sun = math.squeeze(Eci2Ric(sats[satIn].inertPos.slice(0,3), sats[satIn].inertPos.slice(3,6), sun.slice(0,3), [0,0,0]).rHcw)
        sun = math.dotDivide(sun, math.norm(sun))
        mainWindow.initSun = sun
        mainWindow.mm = (398600.4418 / newInert.a ** 3) ** (1/2)

        let lanes = satClusterK(mainWindow.nClusters, mainWindow.satellites, mainWindow.originOrbit)
        mainWindow.originOrbit = newInert
        sats = sats.map((sat, ii) => {
            let relPos = Eci2Ric(sats[satIn].inertPos.slice(0,3), sats[satIn].inertPos.slice(3,6), sat.inertPos.slice(0,3), sat.inertPos.slice(3,6))
            relPos = math.squeeze([...relPos.rHcw, ...relPos.drHcw])
            let laneSatIn = lanes.find(s => s.find(n => n === satIn) !== undefined)
            return {
                position: {r: relPos[0], i: relPos[1], c: relPos[2], rd: relPos[3], id: relPos[4], cd: relPos[5]},
                a: sat.a,
                burns: sat.burns,
                locked: laneSatIn.find(s => s === ii) === undefined
            }
        })
        satellitesOut = []
        let dataReqs = JSON.parse(JSON.stringify(mainWindow.relativeData.dataReqs))
        mainWindow.relativeData.dataReqs = []
        sats.forEach((sat, ii) => {
            satellitesOut.push(new Satellite({
                position: sat.position,
                color: mainWindow.satellites[ii].color,
                shape: mainWindow.satellites[ii].shape,
                a: mainWindow.satellites[ii].a,
                name: mainWindow.satellites[ii].name,
                locked: sat.locked
            }))
        })
        mainWindow.satellites = satellitesOut
        setTimeout(() => {
            mainWindow.satellites.forEach((sat, ii) => {
                sats[ii].burns.forEach(burn => {
                    insertDirectionBurn(ii, burn.time, Object.values(burn.direction), undefined, true)
                })
            })
            mainWindow.relativeData.dataReqs = dataReqs
            resetDataDivs()
            updateLockScreen()
        }, 500)
    } catch (error) {
        console.error(error);
        showScreenAlert('Error in changing ref satellite')
    }
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
        
        showScreenAlert('Right-click to see planning options')
        setTimeout(() => el.target.remove(), 500)
    }
    let ctx = cnvs.getContext('2d')
    cnvs.width = window.innerWidth
    cnvs.height = window.innerHeight
    ctx.fillStyle = 'white'
    ctx.fillRect(0,0,cnvs.width, cnvs.height)
    ctx.globalAlpha = 0.25
    ctx.strokeStyle = 'red'
    ctx.beginPath()
    ctx.ellipse(cnvs.width / 2, cnvs.height / 2-50, 200, 100, -20*Math.PI / 180, -2 * Math.PI*0.15, 2 * Math.PI*0.8)
    ctx.stroke()
    ctx.globalAlpha = 1
    ctx.fillStyle = 'black'
    ctx.textBaseline = 'alphabetic'
    ctx.textAlign = 'center'
    ctx.font = '190px sans-serif'
    ctx.fillText(appAcr, cnvs.width / 2, cnvs.height / 2)
    ctx.textBaseline = 'top'
    ctx.font = '24px Courier New'
    ctx.fillText(appName, cnvs.width / 2, cnvs.height / 2+2)
    ctx.textBaseline = 'alphabetic'
    ctx.fillText('Click anywhere to begin...', cnvs.width / 2, cnvs.height -30)
}
showLogo()

function uploadTles(event) {
    if (event.path[0].files[0] === undefined) return
    loadFileTle(event.path[0].files[0])
}

function tellInputStateFileType(file) {
    // Tells if file is J2000 or TLE file
    let testString = 'J2000 Position & Velocity'
    return file.search(testString) !== -1
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
    
    file = file.split(/\n{2,}/).slice(1).map(sec => sec.split('\n').slice(2).filter(row => row !== '').map(row => row.split(/ {2,}/)).map(row => {
        return [
            new Date(row[0]),
            Number(row[1]),
            Number(row[2]),
            Number(row[3]),
            Number(row[4]),
            Number(row[5]),
            Number(row[6]),
        ]
    }))
    openJ2000Window(file.map((s,ii) => {
        return {name: satNames[ii], state: s}
    }))
    let oldReqs = mainWindow.relativeData.dataReqs.map(req => {
        return {
            data: req.data,
            target: mainWindow.satellites[req.target].name,
            origin: mainWindow.satellites[req.origin].name
        }
    })
    mainWindow.relativeData.dataReqs = []
    satNames.slice(0,file.length)
    let defaultTime = file[0][0][0]
    let desiredTime = prompt('What time to pull states from?', toStkFormat(defaultTime.toString()))
    if (desiredTime === null) return
    desiredTime = new Date(desiredTime)
    let timeDeltaFromCurrent = (desiredTime - mainWindow.startDate) / 1000
    console.log(timeDeltaFromCurrent);
    if (desiredTime == 'Invalid Date') return alert('Invalid Time')
    satNames = satNames.filter((name, ii) => file[ii].length > 0)
    file = file.filter(t => t.length > 0)
    closeAll()
    let baseUTCDiff = desiredTime.getUTCHours() - desiredTime.getHours()
    let timeFile = file.map(sec => {
        let times = sec.map(row => Math.abs(row[0] - desiredTime))
        let minTime = math.min(times)
        let index = times.findIndex(el => el=== minTime)
        return sec[index]
    }).map(sec => {
        let time = sec.shift()
        console.log(sec);
        let utcDiff = time.getUTCHours() - time.getHours()
        console.log((desiredTime - time) / 1000);
        sec = propToTime(sec.map(s => km ? s : s / 1000), (desiredTime - time) / 1000, false)
        console.log(sec);
        return sec
    })
    // See what satellite is focused on right now, if satellite is within new data, focus on it
    let oldOrigin = mainWindow.satellites.find(sat => {
        return (sat.position.r ** 2 + sat.position.i ** 2 + sat.position.c ** 2) < 1e-6
    })
    oldOrigin = oldOrigin !== undefined ? oldOrigin.name : oldOrigin
    oldOrigin = satNames.findIndex(sat => sat === oldOrigin)
    oldOrigin = oldOrigin === -1 ? 0 : oldOrigin
    let originState = timeFile[0]
    let newSatellites = []
    // mainWindow.satellites = []
    let sun = sunFromTime(desiredTime)  
    sun = math.squeeze(Eci2Ric(originState.slice(0,3), originState.slice(3,6), sun, [0,0,0]).rHcw)
    sun = math.dotDivide(sun, math.norm(sun))
    mainWindow.initSun = sun
    mainWindow.startDate = desiredTime
    mainWindow.originOrbit = PosVel2CoeNew(originState.slice(0,3), originState.slice(3,6))
    mainWindow.mm = (398600.4418 / mainWindow.originOrbit.a ** 3) ** 0.5
    let oldBurns = []
    timeFile.forEach((state, ii) => {
        let ricState = Eci2Ric(originState.slice(0,3), originState.slice(3,6), state.slice(0,3), state.slice(3,6))
        // If satellite with name already exists, copy settings from it
        let matchSat = mainWindow.satellites.find(sat => {
            return sat.name === satNames[ii]
        })
        let matchSatIndex = mainWindow.satellites.findIndex(sat => {
            return sat.name === satNames[ii]
        })
        let options = matchSat !== undefined ? {
            shape: matchSat.shape,
            color: matchSat.color,
            a: matchSat.a
        } : {
            shape: 'delta',
            color: '#5555ff',
        }
        // Record old burns
        if (matchSat !== undefined) {
            oldBurns.push(matchSat.burns.map(b => {
                let rot = translateFrames(matchSatIndex, {time: b.time})
                let burnDir = [1000*b.direction.r, 1000*b.direction.i, 1000*b.direction.c]
                burnDir = math.squeeze(math.multiply(rot, math.transpose([burnDir])))
                return {
                    time: b.time - timeDeltaFromCurrent, burnDir
                }
            }).filter(a => a.time >= 0))
        }
        options.name = satNames[ii].split('errarts')[0]
        options.cov = satNames[ii].split('errarts').length > 1 ? satNames[ii].split('errarts')[1] : undefined
        options.position = {r: ricState.rHcw[0][0], 
            i: ricState.rHcw[1][0], 
            c: ricState.rHcw[2][0], 
            rd: ricState.drHcw[0][0], 
            id: ricState.drHcw[1][0], 
            cd: ricState.drHcw[2][0]}
        options.a = 0.001
        options.locked = math.norm(math.squeeze(ricState.rHcw)) > 2500 || math.norm(math.squeeze(ricState.drHcw)) > 0.075
        console.log(options);
        newSatellites.push(new Satellite(options))

    })
    mainWindow.satellites = newSatellites
    changeOrigin(oldOrigin)
    setTimeout(() => {
        oldBurns.forEach((satBurns, ii) => {
            satBurns.forEach(burn => {
                let rot = translateFrames(ii, {time: burn.time})
                burn.burnDir = math.squeeze(math.multiply(math.transpose(rot), math.transpose([burn.burnDir])))
                insertDirectionBurn(ii, burn.time, burn.burnDir.map(s => s / 1000))
            })
        })
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
    }, 1000)
}

function handleTleFile(file) {
    file = file.split(/\n/)
    let tleState = []
    let tleRawStates = []
    for (let index = 0; index < file.length; index++) {
        // if (file[index].search(/\b\d{5}[A-Z]\b/) !== -1) {
        if (file[index].search(/1\s\d{5}[\sU]/) !== -1) {
            // Get tle data
            let line2 = file[index+1].split(/\s+/)
            let epoch = file[index].match(/\d{5}.\d{8}/)[0]
            let sat = {
                epoch: new Date(`20` + epoch.slice(0,2),0,epoch.slice(2,5),0,0,Number(epoch.slice(5))*86400),
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
    openTleWindow(tleRawStates)
    return
    
}

function importStates(states, time) {
    let satCopies = JSON.parse(JSON.stringify(mainWindow.satellites))
    let findOrigin = mainWindow.satellites.find(sat => math.norm(Object.values(sat.position)) < 1e-3)
    let originII = 0
    if (findOrigin !== undefined) {
        let originIndex = states.findIndex(sat => findOrigin.name.match(sat.name))
        originII = originIndex !== -1 ? originIndex : originII
    }
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
            let originOrbit = propToTime(Object.values(Coe2PosVelObject(s.orbit)), (baseEpoch - s.epoch) / 1000, false)
            mainWindow.originOrbit = PosVel2CoeNew(originOrbit.slice(0,3), originOrbit.slice(3,6))
            mainWindow.mm = (398600.4418 / mainWindow.originOrbit.a ** 3) ** 0.5
        }
        return {
            name: s.name,
            orbit: propToTime(Object.values(Coe2PosVelObject(s.orbit)), (baseEpoch - s.epoch) / 1000, false)
        }

    })
    let sun = sunFromTime(baseEpoch)  
    sun = math.squeeze(Eci2Ric(states[0].orbit.slice(0,3), states[0].orbit.slice(3,6), sun, [0,0,0]).rHcw)
    sun = math.dotDivide(sun, math.norm(sun))
    mainWindow.initSun = sun
    mainWindow.satellites = []
    states.forEach(st => {
        let ricState = Eci2Ric(states[originII].orbit.slice(0,3), states[originII].orbit.slice(3,6), st.orbit.slice(0,3), st.orbit.slice(3,6))
        let existingSat = satCopies.filter(sat => sat.name.match(st.name) !== null)
        let color, shape, side, a, name
        if (existingSat.length > 0) {
            color = existingSat[0].color
            shape = existingSat[0].shape
            side = existingSat[0].side
            a = existingSat[0].a,
            name = existingSat[0].name
        }
        ricState = {
            r: ricState.rHcw[0][0],
            i: ricState.rHcw[1][0],
            c: ricState.rHcw[2][0],
            rd: ricState.drHcw[0][0],
            id: ricState.drHcw[1][0],
            cd: ricState.drHcw[2][0]
        }
        mainWindow.satellites.push(new Satellite({
            position: ricState,
            name: name === undefined ? st.name : name,
            color,
            a,
            shape,
            side
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
    fileReader.onload = function (fileLoadedEvent) {
        if (tellInputStateFileType(fileLoadedEvent.target.result)) return handleStkJ200File(fileLoadedEvent.target.result)
        else return handleTleFile(fileLoadedEvent.target.result)
    };
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

function propToTime(state = [42164.14, 0, 0, 0, 3.0746611796284924, 0], dt = 86164, j2 = true) {
    function twoBodyAcc(state) {
        let mu = 398600.4418
        let rn = math.norm(state.slice(0,3))
        return [
            state[3], state[4], state[5],
            -mu * state[0] / rn ** 3,
            -mu * state[1] / rn ** 3,
            -mu * state[2] / rn ** 3
        ]
    }
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
    nClusters = nClusters > sats.length ? sats.length : nClusters
    nClusters = math.floor(nClusters)
    let originECI = Object.values(Coe2PosVelObject(origin))
    sats = sats.map(s => {
        let satRic = Object.values(s.position)
        let satEci = Ric2Eci(satRic.slice(0,3), satRic.slice(3,6), originECI.slice(0,3), originECI.slice(3,6))
        let y = satEci.rEcci[1]
        let x = satEci.rEcci[0]
        return {long: Math.atan2(y,x) * 180 / Math.PI, cluster: undefined}
    })
    let maxLong = math.max(sats.map(s => s.long))
    let minLong = math.min(sats.map(s => s.long))
    let clusters = math.range(maxLong, minLong, -(maxLong - minLong) / (nClusters - 1), true)._data
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
    let output = []
    for (let index = 0; index < clusters.length; index++) {
        output.push(sats.filter(s => s.cluster === index).map(s => s.sat))
    }
    output = output.filter(s => s.length > 0)
    return output
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
        cur = {r: cur.r[0], i: cur.i[0], c: cur.c[0], rd: cur.rd[0], id: cur.id[0], cd: cur.cd[0]};
        sat.curPos = cur;
        if (!sat.locked) sat.stateHistory.forEach(point => {
            points.push({
                color: sat.color,
                position: math.multiply(r, [point.r, point.i, point.c]),
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

function hcwFiniteBurnTwoBurn(stateInit = {x: 00, y: 0, z: 0, xd: 0, yd: 0, zd: 0}, stateFinal = {x: 10, y: 0, z: 0, xd: 0, yd: 0, zd: 0}, tf = 7200, a0 = 0.00001, n = mainWindow.mm) {
    state = [
        [stateInit.x],
        [stateInit.y],
        [stateInit.z],
        [stateInit.xd],
        [stateInit.yd],
        [stateInit.zd]
    ];
    stateFinal = [
        [stateFinal.x],
        [stateFinal.y],
        [stateFinal.z],
        [stateFinal.xd],
        [stateFinal.yd],
        [stateFinal.zd]
    ];
    let v = proxOpsTargeter(state.slice(0, 3), stateFinal.slice(0, 3), tf);
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
    index = minIndex <1 ? -minIndex : minIndex > (dist.length - 2) ? dist.length - 3 : index
    console.log(minIndex, index);
    let x = [], y = []
    for (let ii = 0; ii < 3; ii++) {
        x.push(hist1[minIndex + index].t)
        y.push(dist[minIndex + index])
        index++   
    }
    let c = fitPolynomial(x,math.transpose([y]), 2)
    let dC = c[1]
    let minTime = -dC[0] / dC[1]
    return c[0].reduce((a,b,ii) => {
        return a + b * minTime ** ii
    },0);
}

function fitPolynomial(x = [0, 1, 2], y = [[1],[-2],[4]], d=2) {
    if (x.length !== y.length) return console.error('X & Y values need to be the same length')
    d = (x.length-1) < d ? x.length - 1 : d
    let jac = []
    console.log(x,y);
    for (let ii = 0; ii < x.length; ii++) {
        let line = []
        for (let jj = 0; jj <= d; jj++) {
            line.push(x[ii] ** jj)
        }
        jac.push(line)
    }
    console.log(jac);
    let consts = math.squeeze(math.multiply(math.inv(jac), y))
    // console.log(x,math.squeeze(y));
    // console.log(x.map(val => {
    //     return consts.reduce((a,b,ii) => {
    //         return a + b * val ** ii
    //     },0);
    // }));
    return [consts,consts.map((val,ii) => val * ii).slice(1)]
}

function errorFromTime(t = mainWindow.scenarioTime, error = mainWindow.error.neutral) {
    let p = error.p / (1.6 ** (t / 3600))
    let v = error.v / (4.51977 ** (t / 3600)) / 1000
    return [p,p,p,v,v,v]
}

function convertTimeToDateTimeInput(timeIn = mainWindow.startDate, seconds = true) {
    let padNumber = function(n) {
        return n < 10 ? '0' + n : n
    }
    timeIn = new Date(timeIn)
    if (timeIn == 'Invalid Date') return
    if (seconds) {
        return `${timeIn.getFullYear()}-${padNumber(timeIn.getMonth()+1)}-${padNumber(timeIn.getDate())}T${padNumber(timeIn.getHours())}:${padNumber(timeIn.getMinutes())}`
    }
    return `${timeIn.getFullYear()}-${padNumber(timeIn.getMonth()+1)}-${padNumber(timeIn.getDate())}T${padNumber(timeIn.getHours())}:${padNumber(timeIn.getMinutes())}:${padNumber(timeIn.getSeconds())}`
}

function setTimeFromPrompt(el) {
    console.log(el.parentElement.parentElement.getElementsByTagName('input'));
    let newTime = new Date(el.parentElement.parentElement.getElementsByTagName('input')[0].value) - mainWindow.startDate
    mainWindow.desired.scenarioTime = newTime / 1000
    mainWindow.scenarioTime = newTime / 1000
    document.getElementById('time-slider-range').value = newTime / 1000
    document.getElementById('larger-time-div').remove()
    updateWhiteCellTimeAndErrors()
}

function openTimePrompt() {
    let curTime = new Date(mainWindow.startDate - (-mainWindow.scenarioTime * 1000))
    let dateOptions = []
    for (let index = 0; index < 12; index++) {
        let optionTime = new Date(mainWindow.startDate - (-index*(mainWindow.scenarioLength / 12) * 3600 * 1000))
        dateOptions.push(optionTime)
    }
    
    let inner = `
        <div>
            <input type="datetime-local" style="width: 100%; font-size: 2em" list="date-options" value="${convertTimeToDateTimeInput(curTime)}">
            <datalist id="date-options">
                ${dateOptions.map(opt => `<option value="${convertTimeToDateTimeInput(opt)}"></option>`)}
            </datalist>
        </div>
        <div>
            <button onclick="setTimeFromPrompt(this)"style="width: 100%; margin-top: 10px">Set Time</button>
        </div>
    `
    openQuickWindow(inner)
}

function openQuickWindow(innerCode = 'Hey') {
    let largerDiv = document.createElement('div')
    largerDiv.style.display = 'flex'
    largerDiv.style.justifyContent = 'space-around'
    largerDiv.style.alignItems = 'center'
    largerDiv.style.position = 'fixed'
    largerDiv.style.left = '0%'
    largerDiv.style.top = '0%'
    largerDiv.style.width = '100%'
    largerDiv.style.height = '100%'
    largerDiv.style.zIndex = '90'
    largerDiv.id = 'larger-time-div'
    largerDiv.onclick = (el) => {
        if (el.target.id !== 'larger-time-div') return
        document.getElementById('larger-time-div').remove()
    }
    let newDiv = document.createElement('div')
    newDiv.innerHTML = innerCode
    // newDiv.style.position = 'fixed'
    // newDiv.style.top = '20px'
    // newDiv.style.left = '20px'
    // newDiv.style.zIndex = 100
    newDiv.style.width = 'auto'
    newDiv.style.height = 'auto'
    newDiv.style.background = '#ffffff'
    newDiv.style.border = '1px solid black'
    newDiv.style.borderRadius = '20px'
    newDiv.style.padding = '30px'
    largerDiv.append(newDiv)
    document.body.append(largerDiv)
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
                <li>Importing satellites
                    <ul>
                        <li>Import J2000 report from STK
                            <ul>
                                <li>Position and Vecocity Report from STK Report and Graph Manager</li>
                                <li>Can contain any number of satellites</li>
                                <li>Import with <em>Import State</em> button on right-click menu</li>
                            </ul>
                        </li>
                        <li>Import .tce TLE file with <em>Import State</em> button on right-click menu
                            <ul>
                                <li>If satellite name contains 5 digit TLE number sat characteristics will be maintained</li>
                            </ul>
                        </li>
                        <li>Enter origin J2000 origin state manually under <em>Options</em>, then add satellites with <em>Satellite Menu</em></li>
                        <li>Import .SAS file inside <em>Opttions</em> with <em>Import .SAS File</em></li>
                    </ul>
                </li>
                <li>By default, all burns are computed with finite accelerations, goto for impulsive burns in 1000 mm/s<sup>2</sup></li>
                <li>To insert a burn, click and hold current satellite position, use slider to change shown time</li>
                <li>To delete a burn, hold the control key and right-click on the burn dot</li>
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
                        <li>By default right-clicking shows you burn magnitudes in RIC and allows alteration of burn direction</li>
                        <li>Shift right-clicking brings up burn waypoint information and allows alteration of waypoint</li>
                    </ul>
                </li>
                <li>Burns can be deleted by ctrl-clicking on the burn point</li>
                <li>Limitations
                    <ul>
                        <li>Burns durations are limited to 6 hours for mathematical stability</li>
                        <li>Burns are limited to once every 30 minutes</li>
                        <li>Two-body dynamics are utilized, therefore an error of ~100m per hour can be expected compared to full relative dynamics</li>
                    </ul>
                </li>
            </ul>
        </li>
        <li>
            White Cell
            <ul>
                <li>White Cell Details</li>
            </ul>
        </li>
        <li>Spacebar changes current view</li>
        <li>
            Hot Keys
            <ul>
                <li>W - Move Origin to the West</li>
                <li>E - Move Origin to the East</li>
                <li>Shift + W - Open White Cell Window</li>
                <li>D - Switch between dark and light mode</li>
                <li>N - Add random satellite</li>
                <li>Cntr + <> - Change satellite display size</li>
                <li><> - Change trajectory dot size</li>
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
    whiteCellWindow.updateWhiteCellTimeAndErrorsWhite = () => [
        updateWhiteCellTimeAndErrors()
    ]
    closeAll()
    updateWhiteCellWindow()
}

function updateWhiteCellTimeAndErrors() {
    if (whiteCellWindow === undefined) return
    let time = mainWindow.desired.scenarioTime
    let teamPerspective = Number(whiteCellWindow.document.querySelector('#white-cell-team').value)
    let satErrors = calculateSatErrorStates(teamPerspective)
    let posErrors = whiteCellWindow.document.querySelectorAll('.pos-error')
    let velErrors = whiteCellWindow.document.querySelectorAll('.vel-error')
    let pointingData = whiteCellWindow.document.querySelectorAll('.white-pointing-data')
    for (let index = 0; index < posErrors.length; index++) {
        posErrors[index].innerText = satErrors[index].error[0].toFixed(2)
        velErrors[index].innerText = (satErrors[index].error[0]).toFixed(2)
        if (mainWindow.satellites[index].point !== 'none'  && mainWindow.satellites.findIndex(satRel => satRel.name === mainWindow.satellites[index].point) !== -1) {
            let relData = getRelativeData(index, mainWindow.satellites.findIndex(satRel => satRel.name === mainWindow.satellites[index].point))
            let relDataString = `Range: ${relData.range.toFixed(1)} km CATS: ${relData.sunAngle.toFixed(1)}<sup>o</sup>`
            pointingData[index].innerHTML = relDataString
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
            <span style="margin-left: 20px">
                Error StD <span class="pos-error"></span> km <span class="vel-error"></span> m/s
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
        <div style="width: 100%; margin-top: 30px">
            <button onclick="genTles(this)" style="width: 100%">Export TLE History</button>
        </div>
    </div>
    `
    whiteCellWindow.document.write(innerStyles)
    updateWhiteCellTimeAndErrors()
}

window.onbeforeunload = () => {
    whiteCellWindow.close()
    instructionWindow.close()
    tleWindow.close()
}

function shortenString(str = 'teststring12345', n=mainWindow.stringLimit[1], start = mainWindow.stringLimit[0]) {
    return str.length > n ? str.slice(start,n+start-1) + String.fromCharCode(8230) : str
}

async function testFetch() {
    fetch('./fetchTest.txt').then(response => response.text()).then(txt => console.log(txt))
}

let tleWindow
function openTleWindow(tleSatellites) {
    document.getElementById('context-menu')?.remove();
    tleWindow = window.open('', 'tle', "width=600px,height=600px")
    tleWindow.importTleChoices = (el) => {
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
        let states = []
        let els = el.parentElement.parentElement.querySelectorAll('.tle-sat-div')
        for (let index = 0; index < els.length; index++) {
            let name = els[index].querySelector('.import-name').innerText
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
        let importTime = new Date(el.parentElement.parentElement.querySelector('#tle-import-time').value)
        importStates(states, importTime)
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
    
    setTimeout(() => tleWindow.document.title = 'TLE Import Tool', 1000)
    let uniqueSats = tleSatellites.filter((element, index, array) => array.findIndex(el => el.name === element.name) === index).map(sat => sat.name)
    tleWindow.tleSatellites = tleSatellites
    tleWindow.document.body.innerHTML = `
        <div>ARTS TLE Import Tool</div>
        <div style="width: 100%; text-align: center;">Import Time <input onchange="changeImportTime(this)" id="tle-import-time" type="datetime-local" value=${convertTimeToDateTimeInput(new Date(mainWindow.startDate - (-mainWindow.scenarioTime * 1000)))}></div>
        
        <div class="no-scroll" style="max-height: 90%; overflow: scroll">
        ${uniqueSats.map(satName => {
            let outHt = `<div class="tle-sat-div"><div class="import-name">${satName}</div>`
            tleSatellites.filter(sat => sat.name === satName).sort((a,b)=>a.epoch-b.epoch).forEach((matchSat, ii, arr) => {
                outHt += `<div class="tle-option-div" orbit="${Object.values(matchSat.orbit).join('x')}"style="margin-left: 20px"><input ${ii === 0 ? 'checked' : ''} name="${matchSat.name}-tle-radio" type="radio"/><span class="tle-epoch">${toStkFormat(matchSat.epoch.toString())}</span></div>`
            })
            outHt += '</div>'
            return outHt
        }).join('')}
        </div>
        <div><button onclick="importTleChoices(this)">Import TLE States</button></div>
    `
}
let j2000Window
function openJ2000Window(j2000Satellites = []) {
    return
    document.getElementById('context-menu')?.remove();
    j2000Window = window.open('', 'j2000', "width=600px,height=600px")
    let time = j2000Satellites[0].state[0][0]
    console.log(time);
    setTimeout(() => tleWindow.document.title = 'J2000 Import Tool', 1000)
    j2000Window.j2000Satellites = j2000Satellites
    j2000Window.document.body.innerHTML = `
        <div>ARTS J2000 Import Tool</div>
        <div style="width: 100%; text-align: center;">Import Time <input onchange="changeImportTime(this)" id="tle-import-time" type="datetime-local" value=${convertTimeToDateTimeInput(new Date(time))}></div>
        
        <div class="no-scroll" style="max-height: 90%; overflow: scroll">
            ${j2000Satellites.map(sat => {
                return `<div>
                    ${sat.name}
                </div>`
            }).join('')}
        </div>
        <div><button onclick="importTleChoices(this)">Import TLE States</button></div>
    `
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
    let epoch = new Date(mainWindow.startDate - (-time*1000))
    let year = epoch.getFullYear()
    let month = epoch.getMonth()
    let leapYear = !((year % 4 !== 0) || ((year % 100 === 0) && (year % 400 !== 0)))
    let dayCount = [31, (leapYear ? 29 : 28), 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    let jd = dayCount.slice(0,month).reduce((a,b) => a + b) + epoch.getDate()
    let fractionalDay = (epoch.getHours() * 3600 + epoch.getMinutes() * 60 +  epoch.getSeconds()) / 86400
    jd += fractionalDay
    jd = year.toFixed(0).slice(2) + jd.toFixed(8)
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
            ricState = math.squeeze(Object.values(ricState))
            out += tleFromState(ricState, time, index+1) + '\n'
            
        }
    }

    mainWindow.desired.scenarioTime = oldTime
    mainWindow.scenarioTime = oldTime
    for (let index = 0; index < mainWindow.satellites.length; index++) mainWindow.satellites[index].calcTraj()
    downloadFile('tle.tce', out)
}

function calculateSatErrorStates(team = 1, time = mainWindow.desired.scenarioTime) {
    team = Number(team)
    let errors = [], currentOrigin = propToTime(Object.values(Coe2PosVelObject(mainWindow.originOrbit)), time, false)
    mainWindow.satellites.forEach((sat) => {
        let currentState = math.squeeze(Object.values(sat.currentPosition({time})))
        let currentEciState = Ric2Eci(currentState.slice(0,3), currentState.slice(3,6), currentOrigin.slice(0,3), currentOrigin.slice(3,6))
        currentEciState = [...currentEciState.rEcci, ...currentEciState.drEci]
        let trackType = sat.team === team ? 'friendly' : 'neutral'
        let lastBurn = [-86400, ...sat.burns.filter(b => b.time < time).map(b => b.time)]
        lastBurn = time - lastBurn[lastBurn.length - 1]
        let error = errorFromTime(lastBurn, mainWindow.error[trackType])
        let errorEciPosition = currentEciState.map((s,ii) => s + randn_bm() * error[ii])
        errors.push({
            name: sat.name,
            lastBurn,
            position: currentState,
            eciPosition: currentEciState,
            errorEciPosition,
            error
        })
    })
    // Account for satellites tracking other satellites onboard
    mainWindow.satellites.forEach(sat => {
        let currentSun = mainWindow.getCurrentSun(time)
        let currentState = math.squeeze(Object.values(sat.currentPosition({time})))
        let errorSat = errors.findIndex(s => s.name === sat.name)
        let satellitesTracking = mainWindow.satellites.filter(filt => filt.team === team && filt.point === sat.name)
        if (satellitesTracking.length > 0) {
            // Get error information from sats tracking and filter out those without Sun
            satellitesTracking = satellitesTracking.map(mSat => errors.find(findSat => findSat.name === mSat.name)).filter(filtSat => {
                let originPos = filtSat.position
                let targetPos = currentState
                let relPos = math.subtract(originPos, targetPos).slice(0,3)
                let sunAngle = math.acos(math.dot(currentSun, relPos) / math.norm(currentSun) / math.norm(relPos)) * 180 / Math.PI
                return sunAngle < 90
            })
            let parallelRange = satellitesTracking.map(mSat => math.norm(math.subtract(mSat.position, currentState)))
            console.log(parallelRange);
            parallelRange = 1/parallelRange.reduce((a,b) => a + 1/b,0)
            // StD from onboard is 2% of 1/(1/a + 1/b) from from satellites tracking
            let std = parallelRange / 50
            std = [std, std, std, std/1000, std/1000, std/1000]
            let minErrorTracker = satellitesTracking.find(findSat => findSat.error[0] === Math.min(...satellitesTracking.map(s => s.error[0])))
            let satOrigError = errors[errorSat].error.slice()
            if (satellitesTracking.length > 0) {
                if ((minErrorTracker.error[0] + std[0]) < errors[errorSat].error[0]) {
                    errors[errorSat].error = math.add(minErrorTracker.error.slice(), std)
                    let relState = math.subtract(errors[errorSat].eciPosition, minErrorTracker.eciPosition).map((s,ii) => s + randn_bm() * std[ii])
                    errors[errorSat].errorEciPosition = math.add(minErrorTracker.errorEciPosition, relState)
                }
            }
            // If error on tracked satellite is lower than current error on tracking satellite, can be used
            // to buy down error on tracking satellite
            satellitesTracking.forEach(trackSat => {
                if ((satOrigError[0] + std[0]) < trackSat.error[0]) {
                    // Buy down error from tracked satellite
                    trackSat.error = math.add(satOrigError, std)
                    let relState = math.subtract(trackSat.eciPosition, errors[errorSat].eciPosition).map((s,ii) => s + randn_bm() * std[ii])
                    trackSat.errorEciPosition = math.add(errors[errorSat].errorEciPosition, relState)
                }
            })
        }
    })

    return errors
}

function dragElement(elmnt) {
    var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    if (document.getElementById(elmnt.id + "header")) {
      // if present, the header is where you move the DIV from:
      document.getElementById(elmnt.id + "header").onmousedown = dragMouseDown;
    } else {
      // otherwise, move the DIV from anywhere inside the DIV:
      elmnt.onmousedown = dragMouseDown;
    }
  
    function dragMouseDown(e) {
      e = e || window.event;
      e.preventDefault();
      // get the mouse cursor position at startup:
      pos3 = e.clientX;
      pos4 = e.clientY;
      document.onmouseup = closeDragElement;
      // call a function whenever the cursor moves:
      document.onmousemove = elementDrag;
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
      document.onmouseup = null;
      document.onmousemove = null;
    }
  }

function resetDataDivs() {
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
        if (existingDiv !== -1) {
            let div = currentDivs[existingDiv]
            openDataDiv({
                origin: div.origin,
                target: div.target,
                data: req.data,
                top: div.top + 'px',
                left: div.left + 'px',
                title: div.title
            })
        }
        else {
            openDataDiv({
                origin: req.origin,
                target: req.target,
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

function openDataDiv(options = {}) {
    let {
        title = 'Data Title',
        data = [
            'range', 'relativeVelocity', 'sunAngle'
        ],
        origin = 'sat1',
        target = 'sat2',
        left = '10px',
        top = '50px'
    } = options
    let properTerms = {
        range: {name: 'Range', units: 'km'},
        relativeVelocity: {name: 'Rel Vel', units: 'm/s'},
        sunAngle: {name: 'CATS', units: 'deg'},
        poca: {name: 'POCA', units: 'km'},
        rangeRate: {name: 'Range Rate', units: 'm/s'},
        interceptData: {name: '1-hr Intercept', units:''}
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