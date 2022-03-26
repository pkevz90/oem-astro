var stopWaypoint = 0;

// Various housekeepin to not change html
document.getElementById('add-satellite-panel').getElementsByTagName('span')[0].classList.add('ctrl-switch');
document.getElementById('add-satellite-panel').getElementsByTagName('span')[0].innerText = 'Edit';
document.getElementById('export-option-button').remove();
document.getElementsByTagName('label')[0].remove();
document.getElementById('data-button').remove();
document.getElementById('upload-options-button').remove();
document.getElementsByClassName('panel-button')[0].remove();
document.getElementsByTagName('input')[16].setAttribute('list','name-list');
let addButton = document.getElementById('add-satellite-button');
let newNode = addButton.cloneNode();
newNode.id = 'add-launch-button';
newNode.innerText = 'Add Launch';
addButton.parentNode.insertBefore(newNode, addButton);
// document.getElementsByClassName('rmoe')[1].parentNodeinnerHTML = 'a'
document.getElementsByClassName('rmoe')[1].parentNode.innerHTML = `
    Drift <input class="rmoe" oninput="initStateFunction(this)" style="width: 4em" type="Number" value="0"> degs/rev
`
document.getElementsByClassName('rmoe')[2].parentNode.innerHTML = `
    Rel Long <input class="rmoe" oninput="initStateFunction(this)" style="width: 4em" type="Number" value="0"> deg
`
document.getElementsByClassName('rmoe')[4].parentNode.innerHTML = `
    Plane Diff <input class="rmoe" oninput="initStateFunction(this)" style="width: 4em" type="Number" value="0"> deg
`
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
    normalizeDirection = true;
    frameMove = undefined;
    initSun = [1, 0, 0];
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
        origin: undefined,
        target: undefined,
        textSize: 20,
        positionX: 20,
        positionY: 100,
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
        time: 0
    };
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
        type: undefined
    }
    prop = 2
    precise = false;
    curvilinear = true;
    panelOpen = false;
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
    getPlotCenter() {
        return this.plotCenter;
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
        ctx.strokeStyle = this.colors.foregroundColor;
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
        return math.squeeze(math.multiply(rotationMatrices(-t * (this.mm * 180 / Math.PI - 360 / 365 / 86164), 3), math.transpose([this.initSun])));
    }
    getInitSun() {
        return this.initSun;
    }
    getFrameCenter() {
        return this.frameCenter;
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
    setPlotCenter(center) {
        this.plotCenter = center;
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
        let axesLength = 0.5;
        let sunLength = 0.4 * this.plotHeight / 2 * Math.max(this.frameCenter.ri.h, this.frameCenter.ci.h, this.frameCenter.rc.h);
        let sunCoor = this.convertToPixels(math.dotMultiply(sunLength, this.getCurrentSun()));
        let origin = this.convertToPixels([0, 0, 0]);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        this.drawBorder();
        if (this.state.search('ri') !== -1) {
            ctx.lineWidth = this.cnvs.width * this.frameCenter.ri.w / 200;
            ctx.font = 'bold ' + (this.cnvs.width > this.cnvs.height ? this.cnvs.width : this.cnvs.height) * this.frameCenter.ri.w / 40 + 'px serif';
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
            ctx.fillText('R', origin.ri.x, origin.ri.y - this.cnvs.height * axesLength * this.frameCenter.ri.h / 2 - this.cnvs.width * this.frameCenter.ri.w / 60)
            ctx.fillText('I', origin.ri.x - this.cnvs.height * axesLength * this.frameCenter.ri.h / 2 - this.cnvs.width * this.frameCenter.ri.w / 80, origin.ri.y)

            ctx.textAlign = 'left';
            ctx.textBaseline = 'bottom';
            ctx.fillStyle = '#555 ';
            let fontSize = this.cnvs.height * this.frameCenter.ri.w / 20
            ctx.font = 'bold ' + fontSize + 'px serif';
            let dist = (mainWindow.desired.plotWidth / 2).toFixed(0) + 'km'
            for (let letter = 0; letter < dist.length; letter++) {
                ctx.fillText(dist[letter], 5, origin.ri.y - dist.length / 5 * fontSize + letter * fontSize)
            }
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = this.colors.backgroundColor;
        }
        if (this.state.search('ci') !== -1) {
            
            ctx.lineWidth = this.cnvs.width * this.frameCenter.ci.w / 200;
            ctx.fillStyle = this.colors.backgroundColor;
            ctx.fillRect(this.frameCenter.ci.x * this.cnvs.width - this.frameCenter.ci.w / 2 * this.cnvs.width, this.frameCenter.ci.y * this.cnvs.height - this.frameCenter.ci.h / 2 * this.cnvs.height, this.frameCenter.ci.x * this.cnvs.width + this.frameCenter.ci.w / 2 * this.cnvs.width, this.frameCenter.ci.y * this.cnvs.height + this.frameCenter.ci.h / 2 * this.cnvs.height);
            // console.log(ctx.lineWidth);
            ctx.strokeRect(this.frameCenter.ci.x * this.cnvs.width - this.frameCenter.ci.w / 2 * this.cnvs.width, this.frameCenter.ci.y * this.cnvs.height - this.frameCenter.ci.h / 2 * this.cnvs.height, this.frameCenter.ci.x * this.cnvs.width + this.frameCenter.ci.w / 2 * this.cnvs.width, this.frameCenter.ci.y * this.cnvs.height + this.frameCenter.ci.h / 2 * this.cnvs.height);
            ctx.fillStyle = this.colors.foregroundColor;
            ctx.font = 'bold ' + this.cnvs.width * this.frameCenter.ci.w / 40 + 'px serif';
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
            
            if (drawX) ctx.fillText('C', origin.ci.x, origin.ci.y - this.cnvs.height * axesLength * this.frameCenter.ci.h / 2 - this.cnvs.width * this.frameCenter.ci.w / 60)
            if (drawY > this.plotHeight / 2 * this.frameCenter.ci.h * axesLength) ctx.fillText('I', origin.ci.x - this.cnvs.height * axesLength * this.frameCenter.ci.h / 2 - this.cnvs.width * this.frameCenter.ci.w / 80, origin.ci.y)
        }
        if (this.state.search('rc') !== -1) {
            ctx.fillStyle = this.colors.backgroundColor;
            ctx.fillRect(this.frameCenter.rc.x * this.cnvs.width - this.frameCenter.rc.w / 2 * this.cnvs.width, this.frameCenter.rc.y * this.cnvs.height - this.frameCenter.rc.h / 2 * this.cnvs.height, this.frameCenter.rc.x * this.cnvs.width + this.frameCenter.rc.w / 2 * this.cnvs.width, this.frameCenter.rc.y * this.cnvs.height + this.frameCenter.rc.h / 2 * this.cnvs.height);
            // console.log(ctx.lineWidth);
            ctx.strokeRect(this.frameCenter.rc.x * this.cnvs.width - this.frameCenter.rc.w / 2 * this.cnvs.width, this.frameCenter.rc.y * this.cnvs.height - this.frameCenter.rc.h / 2 * this.cnvs.height, this.frameCenter.rc.x * this.cnvs.width + this.frameCenter.rc.w / 2 * this.cnvs.width, this.frameCenter.rc.y * this.cnvs.height + this.frameCenter.rc.h / 2 * this.cnvs.height);
            ctx.fillStyle = this.colors.foregroundColor;
            
            ctx.lineWidth = this.cnvs.width * this.frameCenter.rc.w / 200;
            ctx.font = 'bold ' + this.cnvs.width * this.frameCenter.rc.w / 40 + 'px serif';
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
            ctx.fillText('C', origin.rc.x, origin.rc.y - this.cnvs.height * axesLength * this.frameCenter.rc.h / 2 - this.cnvs.width * this.frameCenter.rc.w / 60)
            ctx.fillText('R', origin.rc.x + this.cnvs.height * axesLength * this.frameCenter.rc.h / 2 + this.cnvs.width * this.frameCenter.rc.w / 80, origin.rc.y)
        }
    }
    drawPlot() {
        if (this.state.search('plot') === -1) return;
        if (!this.plotSettings.data) return;
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
        // if (this.plotWidth < 2000) return;
        let a = (398600.4418 / mainWindow.mm ** 2) ** (1/3);
        // let delAngle = this.plotWidth / a;
        let circleTop = this.convertToPixels([0, 0, 0]).ri;
        let circleCenter = this.convertToPixels([-a, 0, 0]).ri;
        let ctx = this.getContext();
        let oldLineWidth = ctx.lineWidth;
        let oldStyle = ctx.strokeStyle;
        ctx.strokeStyle = this.colors.foregroundColor;
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.5;
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
                ctx.beginPath();
                ctx.arc(pixelPos.ri.x, pixelPos.ri.y, size, 0, 2 * Math.PI);
                ctx.fill()
            }
            if (this.state.search('ci') !== -1 && Math.abs(point.c) < (this.plotHeight / 2 * this.frameCenter.ci.h) && Math.abs(point.i - this.plotCenter) < (this.plotWidth / 2 * this.frameCenter.ci.w)){
                ctx.beginPath();
                ctx.arc(pixelPos.ci.x, pixelPos.ci.y, size, 0, 2 * Math.PI);
                ctx.fill()
            }
            if (this.state.search('rc') !== -1 && Math.abs(point.c) < (this.plotHeight / 2 * this.frameCenter.rc.h) && Math.abs(point.r) < (this.plotWidth / 2 * this.frameCenter.rc.w)) {
                ctx.beginPath();
                ctx.arc(pixelPos.rc.x, pixelPos.rc.y, size, 0, 2 * Math.PI);
                ctx.fill()
            }
        })
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
    drawMouse(position = [0, 0]) {
        let ctx = this.getContext();
        ctx.strokeStyle = this.colors.foregroundColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(position[0] - this.cnvs.width / 60, position[1]);
        ctx.lineTo(position[0] + this.cnvs.width / 60, position[1]);
        ctx.moveTo(position[0], position[1] - this.cnvs.width / 60);
        ctx.lineTo(position[0], position[1] + this.cnvs.width / 60);
        ctx.stroke();
    }
    showData() {
        let ctx = this.getContext();
        let oldWidth = ctx.lineWidth;
        ctx.lineWidth = 1;
        ctx.fillStyle = this.colors.foregroundColor
        this.relativeData.dataReqs.forEach(req => {
            ctx.textAlign = 'left';
            ctx.font = "bold " + req.textSize + "pt Courier";
            let relDataIn = getRelativeData(req.origin, req.target);
            let y_location = req.positionY * this.cnvs.height / 100;
            ctx.fillText(this.satellites[req.origin].name + String.fromCharCode(8594) + this.satellites[req.target].name, req.positionX*this.cnvs.width / 100, y_location);
            ctx.font = req.textSize + 'px Courier';
            y_location += req.textSize*1.1;
            req.data.forEach(d => {
                if (relDataIn[d] !== undefined) {
                    ctx.fillText(this.relativeData.data[d].name + ': ' + relDataIn[d].toFixed(
                        1) + ' ' + this.relativeData.data[d].units, req.positionX*this.cnvs.width / 100,
                        y_location);
                    y_location += req.textSize*1.1;
                }
            })
            })
            ctx.lineWidth = oldWidth;
            this.relativeData.time = this.relativeData.time > 1 ? 0 : this.relativeData.time + 0.03;
        
    }
    showTime() {
        let ctx = this.getContext();
        ctx.textAlign = 'left';
        let fontSize = (this.cnvs.height < this.cnvs.width ? this.cnvs.height : this.cnvs.width) * 0.05
        ctx.font = 'bold ' + fontSize + 'px serif'
        ctx.fillText(new Date(this.startDate.getTime() + this.scenarioTime * 1000).toString()
            .split(' GMT')[0].substring(4), this.cnvs.width * 0.02, this.cnvs.height - fontSize);
    }
    showLocation() {
        try {
            let ctx = this.getContext();
            ctx.textAlign = 'end';
            ctx.textBaseline = 'bottom';
            ctx.font = 'bold ' + this.cnvs.height * 0.02 + 'px serif';
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
        // mainWindow.makeGif.keyFrames.forEach(frame => {
        //     if (frame.time < 300) {
        //         windowOptions.width_des = frame.width;
        //         windowOptions.width = frame.width;
        //         windowOptions.origin_it_des = frame.center;
        //         windowOptions.origin_it = frame.center;
        //     }
        // })
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
                    burns: sat.burns
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
            color = 'blue',
            shape = 'pentagon',
            a = 0.00001,
            name = 'Sat',
            burns = []
        } = options; 
        this.position = position;
        this.size = size;
        this.color = color;
        this.color = color;
        this.shape = shape;
        this.name = name;
        this.burns = burns;
        this.a = a;
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
        let timeDelta, ctx = mainWindow.getContext(), mag, dist = mainWindow.getPlotWidth() * 0.025;
        ctx.lineWidth = 2;
        // console.log(ctx.lineWidth)
        let state = mainWindow.getState();
        let fC = mainWindow.getFrameCenter();
        this.burns.forEach(burn => {
            timeDelta = mainWindow.scenarioTime - burn.time;
            let mag = math.norm([burn.direction.r, burn.direction.i, burn.direction.c]);
            let dispDist = timeDelta > (mag / this.a) ? dist : dist * timeDelta * this.a / mag;
            if (timeDelta > 0) {
                mainWindow.drawCurve([burn.location], {color: this.color, size: 4});
                if (mainWindow.burnStatus.type) return;
                
                let point1 = mainWindow.convertToPixels(burn.location), mag2;
                let point2 = [burn.location.r[0] + dispDist * burn.direction.r / mag, burn.location.i[0] + dispDist * burn.direction.i / mag, burn.location.c[0] + dist * burn.direction.c / mag]
                point2 = mainWindow.convertToPixels(point2);
                ctx.strokeStyle = this.color;
                ctx.font = 'bold 15px serif';
                ctx.textBaseline = 'middle'
                ctx.textAlign = 'center'
                let textWidth = ctx.measureText((1000*mag).toFixed(1)).width;
                let textHeight = 20;
                // console.log(Math.abs(burn.location.r) , (mainWindow.getPlotHeight() * fC.ri.h / 2), (Math.abs(location.i) < (mainWindow.getPlotWidth() * fC.ri.w / 2)));
                if (state.search('ri') !== -1 && (Math.abs(burn.location.r) < (mainWindow.getPlotHeight() * fC.ri.h / 2)) && (Math.abs(burn.location.i - mainWindow.getPlotCenter()) < (mainWindow.getPlotWidth() * fC.ri.w / 2))) {
                    ctx.beginPath();
                    ctx.moveTo(point1.ri.x, point1.ri.y);
                    ctx.lineTo(point2.ri.x, point2.ri.y);
                    mag2 = math.norm([point2.ri.x - point1.ri.x, point2.ri.y - point1.ri.y]);
                    if (mag2 > 1e-6) {
                        ctx.fillText((1000*mag).toFixed(1), -textWidth * (point2.ri.x - point1.ri.x) / mag2 / 1.2 + point1.ri.x, -textHeight*(point2.ri.y - point1.ri.y) / mag2 / 1.2 + point1.ri.y)
                        ctx.stroke();
                    }
                }
                if (state.search('ci') !== -1 && (Math.abs(burn.location.c) < (mainWindow.getPlotHeight() * fC.ci.h / 2)) && (Math.abs(burn.location.i - mainWindow.getPlotCenter()) < (mainWindow.getPlotWidth() * fC.ci.w / 2))) {
               
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
        return out
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
            a: this.a
        }
    }
    propInitialState(dt) {
        if (Math.abs(dt) > 200000) return
        let state = this.currentPosition({time: dt})
        this.position = {
            r: state.r[0],
            i: state.i[0],
            c: state.c[0],
            rd: state.rd[0],
            id: state.id[0],
            cd: state.cd[0]
        }
        this.burns.filter(burn => burn.time >= dt).map(burn => {
            burn.time -= dt
            return burn
        })
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
mainWindow.fillWindow();

function sleep(milliseconds) {
    var start = new Date().getTime();
    for (var i = 0; i < 1e7; i++) {
      if ((new Date().getTime() - start) > milliseconds){
        break;
      }
    }
  }
let timeFunction = false;
(function animationLoop() {
    if (timeFunction) console.time()
    mainWindow.clear();
    mainWindow.updateSettings();
    mainWindow.drawInertialOrbit(); 
    mainWindow.drawAxes();
    mainWindow.drawPlot();
    mainWindow.showData();
    mainWindow.showTime();
    mainWindow.showLocation();
    if (mainWindow.burnStatus.type) {
        mainWindow.calculateBurn();
    }
    mainWindow.satellites.forEach(sat => {
        sat.checkInBurn()
        sat.drawTrajectory();
        sat.drawBurns();
        sat.drawCurrentPosition();
    })
    if (mainWindow.vz_reach.shown && mainWindow.satellites.length > 1) {
        drawVulnerabilityZone();
    }
    if (timeFunction) console.timeEnd()
    mainWindow.recordFunction();
    window.requestAnimationFrame(animationLoop)
})()
setTimeout(() => {
    showScreenAlert('Right-click to see planning options')
}, 2000)
//------------------------------------------------------------------
// Adding event listeners for window objects
//------------------------------------------------------------------
function keydownFunction(key) {
    key.key = key.key.toLowerCase()

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
    else if (key.key === 'd') {
        console.log(key.key);
        if (mainWindow.colors.backgroundColor === 'black') {
            mainWindow.colors.backgroundColor = 'white'
            mainWindow.colors.foregroundColor = 'black'
        }
        else {
            mainWindow.colors.backgroundColor = 'black'
            mainWindow.colors.foregroundColor = 'white'
        }
    }
    if (mainWindow.panelOpen) return;
    let shiftedNumbers = '!@#$%'
    if (key.key === ' ') {
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
    else if (key.key === 'n') {
        let newSat = mainWindow.satellites.length === 0 ?  new Satellite({
                name: 'Chief',
                position: {r: 0, i: 0, c: 0, rd: 0, id: 0, cd: 0},
                shape: 'diamond',
                color: '#b0b'
            }) : 
            new Satellite({
                name: 'Sat-' + (mainWindow.satellites.length + 1)
            })

        newSat.calcTraj();
        mainWindow.satellites.push(newSat)
        document.title = mainWindow.satellites.map(sat => sat.name).join(' / ')
    }
    else if (shiftedNumbers.search(key.key) !== '-1' && key.ctrlKey && key.shiftKey) {
        let index = shiftedNumbers.search(key.key) + 1
        if (key.key === 'Control' || key.key === 'Shift') return
        setDefaultScenario(index)
        showScreenAlert('Saved as default scenario ' + index)
    }
    else if (shiftedNumbers.search(key.key) !== '-1' &&  key.shiftKey) {
        let index = shiftedNumbers.search(key.key) + 1
        if (key.key === 'Control' || key.key === 'Shift') return
        recoverDefaultScenario(index)
        showScreenAlert('Loaded default scenario ' + index)
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
})
window.addEventListener('resize', () => mainWindow.fillWindow())
window.addEventListener('wheel', event => {
    if (mainWindow.panelOpen) return;
    if (mainWindow.burnStatus.type) {
        if (mainWindow.burnStatus.type === 'waypoint') {
            mainWindow.satellites[mainWindow.burnStatus.sat].burns[mainWindow.burnStatus.burn].waypoint.tranTime += event.deltaY > 0 ? -300 : 300;   
            mainWindow.desired.scenarioTime = mainWindow.satellites[mainWindow.burnStatus.sat].burns[mainWindow.burnStatus.burn].time + mainWindow.satellites[mainWindow.burnStatus.sat].burns[mainWindow.burnStatus.burn].waypoint.tranTime;
        }
        return;
    }
    mainWindow.setAxisWidth(event.deltaY > 0 ? 'increase' : 'decrease')
})
document.oncontextmenu = startContextClick
let openInstructions = function() {
    document.getElementById('instructions-panel').classList.toggle("hidden");
}
function startContextClick(event) {
    if (mainWindow.panelOpen) {
        return false;
    }
    let ricCoor = mainWindow.convertToRic([event.clientX, event.clientY]);
    let activeSat = false, activeBurn = false;
    for (sat = 0; sat < mainWindow.satellites.length; sat++) {
        let check = mainWindow.satellites[sat].checkClickProximity(ricCoor);
        if (check.ri || check.rc || check.ci) {
            activeSat = sat;
            break;
        }
        check = mainWindow.satellites[sat].checkClickProximity(ricCoor, true);
        if (check !== false) {
            activeBurn = {sat, burn: check};
            break;
        }
    }
    let ctxMenu;
    if (document.getElementById('context-menu') === null) {
        ctxMenu = document.createElement('div');
        ctxMenu.style.position = 'fixed';
        ctxMenu.id = 'context-menu';
        ctxMenu.style.zIndex = 10;
        ctxMenu.style.backgroundColor = 'black';
        ctxMenu.style.cursor = 'pointer';
        ctxMenu.style.borderRadius = '15px';
        ctxMenu.style.transform = 'scale(0)';
        ctxMenu.style.fontSize = '1.5em';
        ctxMenu.style.minWidth = '263px';
        document.getElementsByTagName('body')[0].appendChild(ctxMenu);
    }
    ctxMenu = document.getElementById('context-menu');
    ctxMenu.style.top = event.clientY +'px';
    ctxMenu.style.left = event.clientX + 'px';
    

    if (activeSat !== false) {
        ctxMenu.sat = activeSat;
        ctxMenu.innerHTML = `
            <div class="context-item" id="maneuver-options" onclick="handleContextClick(this)" onmouseover="handleContextClick(event)">Manuever Options</div>
            <div class="context-item" onclick="handleContextClick(this)" id="prop-options">Propagate To</div>
            ${mainWindow.satellites.length > 1 ? '<div class="context-item" onclick="handleContextClick(this)" id="data-options">Graph Data</div>' : ''}
            <div class="context-item">Export Burns</div>
            <div style="padding: 15px; color: white; cursor: default;">Position (${mainWindow.satellites[activeSat].curPos.r.toFixed(2)}, ${mainWindow.satellites[activeSat].curPos.i.toFixed(2)}, ${mainWindow.satellites[activeSat].curPos.c.toFixed(2)}) km</div>
            <div style="padding: 15px; color: white; cursor: default;">Velocity (${(1000*mainWindow.satellites[activeSat].curPos.rd).toFixed(2)}, ${(1000*mainWindow.satellites[activeSat].curPos.id).toFixed(2)}, ${(1000*mainWindow.satellites[activeSat].curPos.cd).toFixed(2)}) m/s</div> 
            `
        
    }
    else {
        ctxMenu.innerHTML = `
            <div class="context-item" id="add-satellite" onclick="openPanel(this)">Satellite Menu</div>
            ${mainWindow.satellites.length > 0 ? '<div class="context-item" onclick="openPanel(this)" id="burns">Maneuver List</div>' : ''}
            <div class="context-item" onclick="openPanel(this)" id="options">Options Menu</div>
            ${mainWindow.satellites.length > 1 ? '<div class="context-item" onclick="openDataTab()" id="data">Display Data</div>' : ''}
            <div class="context-item"><label style="cursor: pointer" for="plan-type">Waypoint Planning</label> <input id="plan-type" name="plan-type" onchange="changePlanType(this)" ${mainWindow.burnType === 'waypoint' ? 'checked' : ""} type="checkbox" style="height: 1.5em; width: 1.5em"/></div>
            <div class="context-item"><label style="cursor: pointer" for="upload-options-button">Import Scenario</label><input style="display: none;" id="upload-options-button" type="file" accept=".sas" onchange="uploadScenario(event)"></div>
            <div class="context-item" onclick="exportScenario()">Export Scenario</div>
            <div class="context-item" onclick="openPanel(this)" id="instructions">Instructions</div>
            `

    }
    if ((ctxMenu.offsetHeight + event.clientY) > window.innerHeight) {
        ctxMenu.style.top = (window.innerHeight - ctxMenu.offsetHeight) + 'px';
    }
    if ((ctxMenu.offsetWidth + event.clientX) > window.innerWidth) {
        ctxMenu.style.left = (window.innerWidth - ctxMenu.offsetWidth) + 'px';
    }
    setTimeout(() => ctxMenu.style.transform = 'scale(1)', 10);
    return false;
}

function handleContextClick(button) {
    if (button.id === 'maneuver-options') {
        button.parentElement.innerHTML = `
            <div class="context-item" onclick="handleContextClick(this)" id="waypoint-maneuver">Waypoint</div>
            <div class="context-item" onclick="handleContextClick(this)" id="direction-maneuver">Direction</div>
            <div class="context-item" onclick="handleContextClick(this)" id="dsk-maneuver">DSK</div>
            <div class="context-item" onclick="handleContextClick(this)" id="drift-maneuver">Set Drift Rate</div>
            <div class="context-item" onclick="handleContextClick(this)" id="perch-maneuver">Perch</div>
            <div class="context-item" onclick="handleContextClick(this)" id="circ-maneuver">Circularize</div>
            ${mainWindow.satellites.length > 1 ? '<div class="context-item" onclick="handleContextClick(this)" id="intercept-maneuver">Intercept</div>' : ''}
            ${mainWindow.satellites.length > 1 ? '<div class="context-item" onclick="handleContextClick(this)" id="sun-maneuver">Gain Sun</div>' : ''}
        `
    }
    else if (button.id === 'drift-maneuver') { 
        let html = `
            <div class="context-item" >Drift Rate: <input type="Number" style="width: 3em; font-size: 1em"> deg/rev</div>
            <div class="context-item" onclick="handleContextClick(this)" onkeydown="handleContextClick(this)" id="execute-drift" tabindex="0">Execute</div>
        `
        button.parentElement.innerHTML = html
        document.getElementsByClassName('context-item')[0].getElementsByTagName('input')[0].focus();
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
        `
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
        let state = mainWindow.satellites[sat].currentPosition();
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
            <div class="context-item" ><input type="Number" style="width: 3em; font-size: 1em"> km</div>
            <div class="context-item" onclick="handleContextClick(this)" onkeydown="handleContextClick(this)" target="origin" id="execute-${button.id === 'prop-radial' ? 'r' : 'i'}" tabindex="0">Prop to ${button.id === 'prop-radial' ? 'R' : 'I'}</div>
        `;
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
    else if (button.id === 'prop-poca-execute') {
        let sat1 = button.getAttribute('sat'), sat2 = document.getElementById('context-menu').sat;
        let data = getRelativeData(button.getAttribute('sat'),document.getElementById('context-menu').sat);
        let tGuess = data.toca*mainWindow.timeDelta + 600;
        data = data.toca*mainWindow.timeDelta;
        for (let ii = 0; ii < 100; ii++) {
            let pos1 = mainWindow.satellites[sat1].currentPosition({time: tGuess})
            let pos2 = mainWindow.satellites[sat2].currentPosition({time: tGuess})
            let dr = [pos1.r[0] - pos2.r[0], pos1.i[0] - pos2.i[0], pos1.c[0] - pos2.c[0]]
            let dv = [pos1.rd[0] - pos2.rd[0], pos1.id[0] - pos2.id[0], pos1.cd[0] - pos2.cd[0]]
            let rr1 = math.dot(dr,dv) / math.norm(dr)
            pos1 = mainWindow.satellites[sat1].currentPosition({time: tGuess + 0.1})
            pos2 = mainWindow.satellites[sat2].currentPosition({time: tGuess + 0.1})
            dr = [pos1.r[0] - pos2.r[0], pos1.i[0] - pos2.i[0], pos1.c[0] - pos2.c[0]]
            dv = [pos1.rd[0] - pos2.rd[0], pos1.id[0] - pos2.id[0], pos1.cd[0] - pos2.cd[0]]
            let rr2 = math.dot(dr,dv) / math.norm(dr)
            dr = (rr2 - rr1) / 0.1
            tGuess -= rr1 / dr
            tGuess = tGuess < 0 ? 0 : tGuess
            // console.log(tGuess, dr, rr1);

        }
        mainWindow.desired.scenarioTime = tGuess
        document.getElementById('time-slider-range').value = mainWindow.desired.scenarioTime;
        document.getElementById('context-menu')?.remove();
    }
    else if (button.id === 'waypoint-maneuver') {
        let sat = button.parentElement.sat;
        let html = `
            <div class="context-item" >TOF: <input type="Number" style="width: 3em; font-size: 1em"> hrs</div>
            <div class="context-item" >Target: (<input type="Number" style="width: 3em; font-size: 1em">, <input type="Number" style="width: 3em; font-size: 1em">, <input type="Number" style="width: 3em; font-size: 1em">) km</div>
            <div class="context-item" onclick="handleContextClick(this)" onkeydown="handleContextClick(this)" target="origin" id="execute-waypoint" tabindex="0">RIC Origin</div>
        `
        for (let ii = 0; ii < mainWindow.satellites.length; ii++) {
            if (sat === ii) continue
            html += `<div class="context-item" onclick="handleContextClick(this)" onkeydown="handleContextClick(this)" target="${ii}" id="execute-waypoint" tabindex="0">${mainWindow.satellites[ii].name}</div>`
        
        }
        button.parentElement.innerHTML = html
        document.getElementsByClassName('context-item')[0].getElementsByTagName('input')[0].focus();
    }
    else if (button.id === 'execute-drift') {
        let sat = button.parentElement.sat;
        let inputs = button.parentElement.getElementsByTagName('input');
        let currentPos = mainWindow.satellites[sat].curPos
        let eciPos = Ric2Eci([currentPos.r, currentPos.i, currentPos.c], [currentPos.rd, currentPos.id, currentPos.cd])
        if (inputs[0].value === '') {
            inputs[ii].style.backgroundColor = 'rgb(255,150,150)';
            return
        }
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
        console.log(r, vel, driftRate, period);
        let newRic = Eci2Ric([(398600.4418 / mainWindow.mm ** 2)**(1/3), 0, 0], [0, (398600.4418 / ((398600.4418 / mainWindow.mm ** 2)**(1/3))) ** (1/2), 0], eciPos.rEcci, newVel)
        let direction = math.subtract(math.squeeze(newRic.drHcw), [currentPos.rd, currentPos.id, currentPos.cd])
        let tof = 0.125 * 2 * Math.PI / mainWindow.mm
        position = {x: currentPos.r, y: currentPos.i, z: currentPos.c, xd: currentPos.rd, yd: currentPos.id, zd: currentPos.cd};
        let wayPos = oneBurnFiniteHcw(position, Math.atan2(direction[1], direction[0]), Math.atan2(direction[2], math.norm([direction[0], direction[1]])), (math.norm(direction) / mainWindow.satellites[sat].a) / tof, tof, mainWindow.scenarioTime, mainWindow.satellites[sat].a)
        mainWindow.satellites[sat].burns = mainWindow.satellites[sat].burns.filter(burn => {
            return burn.time < mainWindow.scenarioTime;
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
    else if (button.id === 'direction-maneuver') {
        button.parentElement.innerHTML = `
            <div class="context-item" >R: <input type="Number" style="width: 3em; font-size: 1em"> m/s</div>
            <div class="context-item" >I: <input type="Number" style="width: 3em; font-size: 1em"> m/s</div>
            <div class="context-item" >C: <input type="Number" style="width: 3em; font-size: 1em"> m/s</div>
            <div class="context-item" onkeydown="handleContextClick(this)" onclick="handleContextClick(this)" id="execute-direction" tabindex="0">Execute</div>
        `
        document.getElementsByClassName('context-item')[0].getElementsByTagName('input')[0].focus();
    }
    else if (button.id === 'dsk-maneuver') {
        button.parentElement.innerHTML = `
            <div class="context-item" >Time: <input type="Number" style="width: 3em; font-size: 1em"> hrs</div>
            <div class="context-item" onkeydown="handleContextClick(this)" onclick="handleContextClick(this)" id="execute-dsk" tabindex="0">Execute</div>
        `
        document.getElementsByClassName('context-item')[0].getElementsByTagName('input')[0].focus();
    }
    else if (button.id === 'execute-waypoint') {
        let target = button.getAttribute('target')
        let inputs = button.parentElement.getElementsByTagName('input');
        let bad = false;
        for (let ii = 0; ii < inputs.length; ii++) {
            if (inputs[ii].value === '' || (ii === 0 && inputs[ii].value < 0)) {
                inputs[ii].style.backgroundColor = 'rgb(255,150,150)';
                bad = true;
            }
            else {
                inputs[ii].style.backgroundColor = 'white';
            }
        }
        if (bad) return;
        let sat = button.parentElement.sat;
        mainWindow.satellites[sat].burns = mainWindow.satellites[sat].burns.filter(burn => {
            return burn.time < mainWindow.scenarioTime;
        })
        let origin = target === 'origin' ? {r: [0], i: [0], c: [0]} : mainWindow.satellites[target].currentPosition({
            time: mainWindow.desired.scenarioTime + Number(inputs[0].value) * 3600
        })
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
                    r: Number(inputs[1].value) + origin.r[0],
                    i: Number(inputs[2].value) + origin.i[0],
                    c: Number(inputs[3].value) + origin.c[0],
                }
            }
        })
        mainWindow.satellites[sat].genBurns();
        let checkBurn = mainWindow.satellites[sat].burns[mainWindow.satellites[sat].burns.length-1];
        if (math.norm([checkBurn.direction.r, checkBurn.direction.i, checkBurn.direction.c]) < 1e-8) {
            mainWindow.satellites[sat].burns.pop();
            mainWindow.satellites[sat].genBurns();
            showScreenAlert('Waypoint outside kinematic reach of satellite with given time of flight');
            return;
        }
        mainWindow.desired.scenarioTime = mainWindow.desired.scenarioTime + Number(inputs[0].value) * 3600;
        document.getElementById('time-slider-range').value = mainWindow.desired.scenarioTime + Number(inputs[3].value) * 3600;
        document.getElementById('context-menu')?.remove();
    }
    else if (button.id === 'execute-direction') {
        let inputs = button.parentElement.getElementsByTagName('input');
        for (let ii = 0; ii < inputs.length; ii++) {
            if (inputs[ii].value === '') {
                inputs[ii].value = 0;
            }
        }
        let sat = button.parentElement.sat;
        let dir = [Number(inputs[0].value) / 1000, Number(inputs[1].value) / 1000, Number(inputs[2].value) / 1000];
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
    else if (button.id === 'intercept-maneuver') {
        let innerString = '';
        for (let ii = 0; ii < mainWindow.satellites.length; ii++) {
            if (ii === button.parentElement.sat) continue;
            innerString += `<div onclick="handleContextClick(this)" class="context-item" id="execute-intercept" sat="${ii}">${mainWindow.satellites[ii].name}</div>`
        }
        innerString += `<div class="context-item" >TOF: <input type="Number" style="width: 3em; font-size: 1em"> hrs</div>`;

        button.parentElement.innerHTML = innerString;

    }
    else if (button.id === 'execute-intercept') {
        let inputs = button.parentElement.getElementsByTagName('input')[0];
        if (inputs.value < 0 || inputs.value === '') {
            inputs.style.backgroundColor = 'rgb(255,150,150)';
            return;
        }
        let tof = Number(inputs.value) * 3600;
        let targetSat = button.getAttribute('sat');
        let chaserSat = button.parentElement.sat;
        mainWindow.satellites[chaserSat].burns = mainWindow.satellites[chaserSat].burns.filter(burn => {
            return burn.time < mainWindow.scenarioTime;
        })
        let target = mainWindow.satellites[targetSat].currentPosition({time: mainWindow.desired.scenarioTime + tof});
        mainWindow.satellites[sat].burns.push({
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
        let dir = mainWindow.satellites[sat].burns[mainWindow.satellites[sat].burns.length-1].direction;
        if (math.norm([dir.r, dir.i, dir.c]) < 1e-6) {
            mainWindow.satellites[sat].burns.pop();
            mainWindow.satellites[sat].genBurns();
            showScreenAlert('Intercept solution not found');
        }
        mainWindow.desired.scenarioTime = mainWindow.desired.scenarioTime + tof;
        document.getElementById('time-slider-range').value = tof;
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
        mainWindow.satellites[sat].burns.push({
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
    let inert = [
        (398600.4418 / mainWindow.mm ** 2) ** (1/3),
        0,
        0,
        0,
        (398600.4418 / ((398600.4418 / mainWindow.mm ** 2) ** (1/3))) ** (1/2),
        0
    ]
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

function plotRelativeData(data, origin, target) {
    mainWindow.plotSettings.data = [];
    for (let ii = 0; ii < mainWindow.scenarioLength * 3600; ii += mainWindow.scenarioLength * 3600 / 200) {
        let r1 = mainWindow.satellites[origin].currentPosition({time: ii});
        let r2 = mainWindow.satellites[target].currentPosition({time: ii});
        if (data === 'Range') {
            mainWindow.plotSettings.data.push([ii / 3600, math.norm([r1.r[0] - r2.r[0], r1.i[0] - r2.i[0], r1.c[0] - r2.c[0]])]);
        }
        else if (data === 'CATS') {
            let cats = mainWindow.getCurrentSun(ii);
            let relVector = [r1.r[0] - r2.r[0], r1.i[0] - r2.i[0], r1.c[0] - r2.c[0]];
            mainWindow.plotSettings.data.push([ii / 3600, Math.acos((math.dot(cats, relVector) / math.norm(relVector))) * 180 / Math.PI]);
        }
        else {
            mainWindow.plotSettings.data.push([ii / 3600, math.norm([r1.rd[0] - r2.rd[0], r1.id[0] - r2.id[0], r1.cd[0] - r2.cd[0]])]);
        }
    }
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
        document.getElementsByClassName('screen-alert')[0].style.bottom = '100%';
        document.getElementsByClassName('screen-alert')[0].style.opacity = '0';
        setTimeout(() => {
            document.getElementsByClassName('screen-alert')[0].remove();
        }, 500)
    },message === 'start-screen' ? 60000 : 3000)

}

function changePlanType(box) {
    mainWindow.burnType = box.checked ? 'waypoint' : 'manual';
}
document.getElementById('main-plot').addEventListener('mousedown', event => {
    // Close context menu if 
    let subList = document.getElementsByClassName('sub-menu');
    for (let ii = 0; ii < subList.length; ii++) subList[ii].remove();
    if (event.button !== 2) document.getElementById('context-menu')?.remove();
    else return;
    // Check if clicked on time
    if (event.clientX < 450 && (mainWindow.getHeight() - event.clientY) < (mainWindow.getHeight() * 0.06)) {
        let curTime = new Date(mainWindow.startDate.getTime() + mainWindow.scenarioTime * 1000).toString().split(' GMT')[0].substring(4)
        let newTime = prompt('Enter scenario time:',curTime)
        let desTime = new Date(newTime)
        let delTime = desTime - mainWindow.startDate
        console.log(desTime, delTime);
        if (delTime/3600000 < mainWindow.scenarioLength && delTime > 0) {
            mainWindow.desired.scenarioTime = delTime / 1000;
            mainWindow.scenarioTime = delTime / 1000;
            document.getElementById('time-slider-range').value = delTime / 1000;
        }
        else {
            showScreenAlert('Invalid Time String')
        }
        return
    }
    let ricCoor = mainWindow.convertToRic([event.clientX, event.clientY]);
    let sat = 0, check;
    if (ricCoor === undefined) return;
    while (sat < mainWindow.satellites.length) {
        check = mainWindow.satellites[sat].checkClickProximity(ricCoor);
        mainWindow.currentTarget = false;
        for (frame in check) {
            mainWindow.currentTarget = check[frame] ? {sat, frame, type: 'current'} : mainWindow.currentTarget;
        }
        if (mainWindow.currentTarget) {
            let checkExistingBurns = mainWindow.satellites[mainWindow.currentTarget.sat].burns.filter(burn => {
                return Math.abs(burn.time - mainWindow.desired.scenarioTime) < 900;
            })
            if (checkExistingBurns.length === 0) break;
        };
        check = mainWindow.satellites[sat].checkBurnProximity(ricCoor);
        for (frame in check) {
            mainWindow.currentTarget = check[frame] !== false ? {sat, frame, type: 'burn'} : mainWindow.currentTarget;
        }
        if (mainWindow.currentTarget) break;
        sat++;
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
                    tranTime: 7200,
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
            if (mainWindow.burnType === 'waypoint' && mainWindow.currentTarget.frame === 'ri' && mainWindow.satellites[mainWindow.currentTarget.sat].a > 0.000001) {
                mainWindow.desired.scenarioTime += 7200;
                document.getElementById('time-slider-range').value = mainWindow.desired.scenarioTime;
            };
        }, 250)
    }
    else if (mainWindow.currentTarget.type === 'burn') {
        if (event.ctrlKey) {
            mainWindow.satellites[mainWindow.currentTarget.sat].burns.splice(check[mainWindow.currentTarget.frame], 1);
            mainWindow.satellites[mainWindow.currentTarget.sat].genBurns();
            return;
        }
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
        mainWindow.frameMove = {
            x: mainWindow.mousePosition[0],
            origin: mainWindow.getPlotCenter()
        };
        return;
    }
})
document.getElementById('main-plot').addEventListener('mouseup', event => {
    mainWindow.currentTarget = false;
    mainWindow.satellites.forEach(sat => sat.calcTraj());
    mainWindow.burnStatus.type = false;
    mainWindow.frameMove = undefined;
})
document.getElementById('main-plot').addEventListener('mouseleave', event => {
    mainWindow.mousePosition = undefined;
})
document.getElementById('main-plot').addEventListener('mousemove', event => {
    mainWindow.mousePosition = [event.clientX, event.clientY];
    if (mainWindow.frameMove) {
        // console.log('d');
        let delX = event.clientX - mainWindow.frameMove.x;
        mainWindow.desired.plotCenter = mainWindow.frameMove.origin + delX * mainWindow.getPlotWidth() / mainWindow.getWidth(); 
    }
})
function exportScenario(name = 'scenario.sas') {
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
document.getElementById('add-waypoint-button').addEventListener('click', event => {
    let chosenSat = Number(document.getElementById('satellite-way-select').value);
    let divTarget = event.target.parentNode.parentNode.parentNode.children;
    let tableTrs = document.getElementById('waypoint-table').children[1].children,
        waypoints = [], target;
    for (let tr = 0; tr < tableTrs.length; tr++) {
        target = tableTrs[tr].children[1].children[0].innerText.substr(1, tableTrs[tr].children[1].children[0].innerText.length - 2).split(',');
        waypoints.push({
            time: Date.parse(tableTrs[tr].children[0].innerText),
            r: Number(target[0]),
            i: Number(target[1]),
            c: Number(target[2]),
            tranTime: Number(tableTrs[tr].children[2].innerText)
        })
    }
    if (divTarget[3].children[1].children[1].checked) {
        // Switch to 2-burn calculation, delete all burns after
        divTarget = divTarget[2].children;
        let startTime = Date.parse(divTarget[0].getElementsByTagName('input')[0].value);
        waypoints = waypoints.filter(point => point.time < startTime);
        let curPos = mainWindow.satellites[chosenSat].currentPosition({
            time: startTime / 1000 - Date.parse(mainWindow.startDate) / 1000
        })
        let newPoints = calcTwoBurn({
            stateI: {
                x: curPos.r[0],
                y: curPos.i[0],
                z: curPos.c[0],
                xd: curPos.rd[0],
                yd: curPos.id[0],
                zd: curPos.cd[0]
            },
            stateF: {
                x: Number(divTarget[2].getElementsByTagName('input')[0].value),
                y: Number(divTarget[3].getElementsByTagName('input')[0].value),
                z: Number(divTarget[4].getElementsByTagName('input')[0].value),
                xd: 0,
                yd: 0,
                zd: 0
            },
            a: mainWindow.satellites[chosenSat].a,
            startTime: startTime / 1000 - Date.parse(mainWindow.startDate) / 1000,
            tf: Number(divTarget[1].getElementsByTagName('input')[0].value) === 0 ? 7200 : 60 * Number(divTarget[1].getElementsByTagName('input')[0].value)
        })
        if (!newPoints) {
            alert("No solution found, increase transfer time or move target point closer to origin");
            return;
        }
        waypoints.push({
            time: newPoints[0].time * 1000 + Date.parse(mainWindow.startDate),
            r: newPoints[0].waypoint.target.r,
            i: newPoints[0].waypoint.target.i,
            c: newPoints[0].waypoint.target.c,
            tranTime: newPoints[0].waypoint.tranTime / 60,
        }, {
            time: newPoints[1].time * 1000 + Date.parse(mainWindow.startDate),
            r: newPoints[1].waypoint.target.r,
            i: newPoints[1].waypoint.target.i,
            c: newPoints[1].waypoint.target.c,
            tranTime: newPoints[1].waypoint.tranTime / 60,
        })
    } else {
        divTarget = divTarget[2].children;
        let newWaypoint = {
            time: Date.parse(divTarget[0].getElementsByTagName('input')[0].value),
            r: Number(divTarget[2].getElementsByTagName('input')[0].value),
            i: Number(divTarget[3].getElementsByTagName('input')[0].value),
            c: Number(divTarget[4].getElementsByTagName('input')[0].value),
            tranTime: Number(divTarget[1].getElementsByTagName('input')[0].value) === 0 ? 120 : Number(divTarget[1].getElementsByTagName('input')[0].value)
        }
        let filterLimit = 15 * 60 * 1000; // Reject burns closer than 15 minutes to other burns 
        if (waypoints.filter(point => Math.abs(point.time - newWaypoint.time) < filterLimit).length > 0) {
            return;
        }
        waypoints.push(newWaypoint);
        waypoints.sort((a, b) => a.time - b.time);
    }
    waypoints2table(waypoints);
    table2burns(chosenSat);
})
document.getElementById('add-start-time').addEventListener('input', event => {
    let startTime = new Date(event.target.value).getTime();
    let dt = startTime - mainWindow.startDate.getTime() + Number(document.getElementById('add-tran-time').value) * 60000;
    let crossState = mainWindow.satellites[document.getElementById('satellite-way-select').value].currentPosition({
        time: dt / 1000
    });
    document.getElementById('add-cross').value = crossState.c[0].toFixed(2);
})
document.getElementById('add-tran-time').addEventListener('input', () => {
    let startTime = new Date(document.getElementById('add-start-time').value).getTime();
    let dt = startTime - mainWindow.startDate.getTime() + Number(document.getElementById('add-tran-time').value) * 60000;
    let crossState = mainWindow.satellites[document.getElementById('satellite-way-select').value].currentPosition({
        time: dt / 1000
    });
    document.getElementById('add-cross').value = crossState.c[0].toFixed(2);
})
document.getElementById('satellite-way-select').addEventListener('input', event => {
    generateBurnTable(event.target.value)
    event.target.style.color = mainWindow.satellites[event.target.value].color;
})
function openDataTab() {
    if (mainWindow.satellites.length < 2) {
        return;
    }
    document.getElementById('context-menu')?.remove();
    let dataSel = document.getElementById('data-select');
    while (dataSel.firstChild) {
        dataSel.removeChild(dataSel.firstChild);
    }
    mainWindow.satellites.forEach((satOrg, ii) => {
        mainWindow.satellites.forEach((satTar, jj) => {
            if (ii !== jj) {
                addedElement = document.createElement('option');
                addedElement.value = `${ii}&${jj}`;
                addedElement.textContent = satOrg.name + ' to ' + satTar.name;
                dataSel.appendChild(addedElement);
            } 
        })
    })
    document.getElementById('data-panel').classList.toggle("hidden");
}
document.getElementById('confirm-option-button').addEventListener('click', (click) => {
    let el = click.target;
    el = el.parentNode.parentNode;
    let inputs = el.getElementsByTagName('input');
    console.log(inputs);
    let date = inputs[0].value;
    let sun = inputs[3].value;
    mainWindow.mm = Math.sqrt(398600.4418 / Math.pow(Number(inputs[2].value), 3));
    mainWindow.originOrbit.a = Number(inputs[2].value)
    mainWindow.scenarioLength = Number(inputs[1].value);
    document.getElementById('time-slider-range').max = mainWindow.scenarioLength * 3600;
    mainWindow.timeDelta = (2 * Math.PI / mainWindow.mm) / Number(inputs[10].value)
    mainWindow.satellites.forEach(sat => {
        sat.genBurns();
        sat.calcTraj();
    });
    sunIR = -Number(sun.substring(0, 2)) * 3600 + Number(sun.substring(2, 4)) / 86400 * 2 * Math.PI;
    sunC = Number(inputs[4].value) * Math.PI / 180;
    mainWindow.setInitSun([-Math.cos(sunIR) * Math.cos(sunC), Math.sin(sunIR) * Math.cos(sunC), Math.sin(sunC)]);
    mainWindow.startDate = new Date(date);
    closeAll();
})
document.getElementById('confirm-data-button').addEventListener('click', (click) => {
    let el = click.target;
    let inputs = el.parentNode.getElementsByTagName('input'), exist = false, data = [];
    let selectVal = el.parentNode.parentNode.getElementsByTagName('select')[0].value.split('&');
    let indexCheck = mainWindow.relativeData.dataReqs.findIndex(req => {
        return req.origin === selectVal[0] && req.target === selectVal[1];
    });
    for (let ii = 0; ii < 5; ii++) {
        exist = exist || inputs[ii].checked;
        if (inputs[ii].checked) data.push(inputs[ii].id);
    }
    if (exist) {
        if (indexCheck === -1) {
            mainWindow.relativeData.dataReqs.push({
                origin: selectVal[0],
                target: selectVal[1],
                textSize: !isNaN(Number(inputs[7].value)) ? Number(inputs[7].value) : 20,
                positionX: !isNaN(Number(inputs[5].value)) ? Number(inputs[5].value): 20,
                positionY: !isNaN(Number(inputs[6].value)) ? Number(inputs[6].value) : 20,
                data
            })
        }
        else {
            mainWindow.relativeData.dataReqs[indexCheck] = {
                origin: selectVal[0],
                target: selectVal[1],
                textSize: !isNaN(Number(inputs[7].value)) ? Number(inputs[7].value) : 20,
                positionX: !isNaN(Number(inputs[5].value)) ? Number(inputs[5].value) : 20,
                positionY: !isNaN(Number(inputs[6].value)) ? Number(inputs[6].value) : 20,
                data
            }
        }
    }
    else {
        if (indexCheck !== -1) {
            mainWindow.relativeData.dataReqs.splice(indexCheck,1);
        }
    }
    if (inputs[8].checked) {
        mainWindow.vz_reach.shown = true;
        mainWindow.vz_reach.target = Number(selectVal[0]);
        mainWindow.vz_reach.object = Number(selectVal[1]);
        mainWindow.vz_reach.distance = Number(inputs[9].value);
        mainWindow.vz_reach.time = Number(inputs[10].value)*3600;
    }
    closeAll();
})
function uploadScenario() {
    let screenAlert = document.getElementsByClassName('screen-alert');
    if (screenAlert.length > 0) screenAlert[0].remove();
    loadFileAsText(event.path[0].files[0])
}

document.getElementById('export-burns').addEventListener('click', () => {
    let selectEl = document.getElementById('satellite-way-select').value, time;
    time = new Date(mainWindow.startDate.getTime()).toString();
    time = toStkFormat(time);
    let outString = '';
    outString += 'Start Time,Position (km), Velocity (m/s), Acceleration (m/s2)\n'
    outString += `${time},`;
    outString += `"${mainWindow.satellites[selectEl].position.r.toFixed(2)}  ${mainWindow.satellites[selectEl].position.i.toFixed(2)}  ${mainWindow.satellites[selectEl].position.c.toFixed(2)}",`;
    outString += `"${(mainWindow.satellites[selectEl].position.rd * 1000).toFixed(2)}  ${(mainWindow.satellites[selectEl].position.id * 1000).toFixed(2)}  ${(mainWindow.satellites[selectEl].position.cd * 1000).toFixed(2)}",`;
    outString += `${mainWindow.satellites[selectEl].a * 1000},\n\n\n`;
    outString += 'Time, Magnitude (m/s), Waypoint (km), Transfer Time (min), Direction, Duration (s)\n'
    // satellites[selectEl].burns.forEach(burn => {
    //     time = new Date(windowOptions.start_date.getTime() + burn.time * 1000).toString();
    //     timeEnd = new Date(windowOptions.start_date.getTime() + burn.time * 1000 + burn.waypoint.tranTime * 1000).toString();
    //     time = toStkFormat(time);
    //     timeEnd = toStkFormat(timeEnd);
    //     outString += `Burn Time ${time} \n`
    //     outString += `Waypoint  r: ${burn.waypoint.target.r.toFixed(1)} km  i: ${burn.waypoint.target.i.toFixed(1)} km  c: ${burn.waypoint.target.c.toFixed(1)} km\n`;
    //     outString += `Transfer Time: ${(burn.waypoint.tranTime.toFixed(1) / 60).toFixed(1)} minutes    ${timeEnd}\n`;
    //     outString += `Direction  r: ${burn.direction.r.toFixed(6)}  i: ${burn.direction.i.toFixed(6)}  c: ${burn.direction.c.toFixed(6)}\n`;
    //     outString += `Burn Duration ${(math.norm([burn.direction.r, burn.direction.i, burn.direction.c]) / satellites[selectEl].a).toFixed(1)} seconds\n`;
    //     outString += `Estimated Delta-V: ${(math.norm([burn.direction.r, burn.direction.i, burn.direction.c]) * 1000).toFixed(2)} m/s\n`
    //     outString += `break${time}break${timeEnd}break${burn.waypoint.target.r.toFixed(2)}break${burn.waypoint.target.i.toFixed(2)}break${burn.waypoint.target.c.toFixed(2)}break${burn.direction.r.toFixed(6)}break${burn.direction.i.toFixed(6)}break${burn.direction.c.toFixed(6)}break${(math.norm([burn.direction.r, burn.direction.i, burn.direction.c]) / satellites[selectEl].a).toFixed(1)}\n\n`
    // })
    mainWindow.satellites[selectEl].burns.forEach(burn => {
        time = new Date(mainWindow.startDate.getTime() + burn.time * 1000).toString();
        time = toStkFormat(time);
        // timeEnd = toStkFormat(timeEnd);
        outString += `${time},`
        outString += `${(math.norm([burn.direction.r, burn.direction.i, burn.direction.c]) * 1000).toFixed(2)},`
        outString += `"${burn.waypoint.target.r.toFixed(1)}  ${burn.waypoint.target.i.toFixed(1)}  ${burn.waypoint.target.c.toFixed(1)}",`;
        outString += `${(burn.waypoint.tranTime.toFixed(1) / 60).toFixed(1)},`;
        let mag = math.norm([burn.direction.r, burn.direction.i, burn.direction.c]);
        outString += `"${(burn.direction.r / mag).toFixed(3)}  ${(burn.direction.i / mag).toFixed(3)}  ${(burn.direction.c / mag).toFixed(3)}",`;
        outString += `${(mag / mainWindow.satellites[selectEl].a).toFixed(1)},\n`;
        // outString += `break${time}break${timeEnd}break${burn.waypoint.target.r.toFixed(2)}break${burn.waypoint.target.i.toFixed(2)}break${burn.waypoint.target.c.toFixed(2)}break${burn.direction.r.toFixed(6)}break${burn.direction.i.toFixed(6)}break${burn.direction.c.toFixed(6)}break${(math.norm([burn.direction.r, burn.direction.i, burn.direction.c]) / mainWindow.satellites[selectEl].a).toFixed(1)}`
    })
    downloadFile('burns.csv', outString);
})
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

    fileReader.readAsText(fileToLoad, "UTF-8");
}
function dataChange(el) {
    let selectVal = el.value.split('&');
    let indexCheck = mainWindow.relativeData.dataReqs.findIndex(req => {
        return req.origin === selectVal[0] && req.target === selectVal[1];
    });
    let inputs = el.parentNode.parentNode.getElementsByTagName('input');
    for (let ii = 0; ii < 5; ii++) {
        inputs[ii].checked = indexCheck === -1 ? false : mainWindow.relativeData.dataReqs[indexCheck].data.includes(inputs[ii].id)
    }
    inputs[5].value = indexCheck === -1 ? 1 : mainWindow.relativeData.dataReqs[indexCheck].positionX;
    inputs[6].value = indexCheck === -1 ? 5 : mainWindow.relativeData.dataReqs[indexCheck].positionY;
    inputs[7].value = indexCheck === -1 ? 30 : mainWindow.relativeData.dataReqs[indexCheck].textSize;
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
function parseState(button) {
    let stateInputs = button.parentNode.parentNode.children[1].children[1].getElementsByTagName('input');
    let text = document.getElementById('parse-text').value;
    text = text.split(/ {2,}/)
    if (isNaN(Number(text[0]))) {
        let oldDate = mainWindow.startDate + 0;
        mainWindow.startDate = new Date(text.shift())
        let delta = (new Date(mainWindow.startDate) - new Date(oldDate)) / 1000
        mainWindow.satellites.forEach(sat => sat.propInitialState(delta))
    }
    if (text[0] === "") text.shift();
    if (text[text.length - 1] === "") text.pop();
    if (text.length > 9) {
        let oldMM = mainWindow.mm + 0
        if (text.length > 12) {
            let tA = Number(text.pop() * Math.PI / 180)
            let arg = Number(text.pop() * Math.PI / 180)
            let raan = Number(text.pop() * Math.PI / 180)
            let i = Number(text.pop() * Math.PI / 180)
            let e = Number(text.pop())
            let a = Number(text.pop())
            mainWindow.originOrbit = {
                a,
                arg,
                e,
                i,
                raan,
                tA
            }
            mainWindow.mm = Math.sqrt(398600.4418 / (Number(a ** 3)));
        }
        else {
            mainWindow.mm = Math.sqrt(398600.4418 / (Number(text.pop() ** 3)));
            mainWindow.originOrbit.a = (398600.4418 / mainWindow.mm ** 2) ** (1/3)
        }
        mainWindow.scenarioLength = math.abs(mainWindow.mm - oldMM) < 1000 ? mainWindow.scenarioLength : 2 * Math.PI / mainWindow.mm / 3600 * 2;
        document.getElementById('time-slider-range').max = mainWindow.scenarioLength * 3600;
        mainWindow.timeDelta = 0.006 * 2 * Math.PI / mainWindow.mm;
    }
    text = text.filter(t => {
        return Number(t) !== NaN;
    });
    text = text.map(t => Number(t));
    if (text.length < 6) {
        alert('Please include all six states (R I C Rd Id Cd)');
        return;
    } 
    for (let ii = 0; ii < 6; ii++) {
        stateInputs[ii+6].value = ((ii > 2) ? 1000 : 1) * Number(text[ii]);
    }
    if (text.length === 9) {
        let initSun = [Number(text[6]), Number(text[7]), Number(text[8])]
        initSun = math.dotDivide(initSun, math.norm(initSun));
        // console.log([-initSun[2], initSun[0], -initSun[1]]);
        mainWindow.setInitSun([-initSun[2], initSun[0], -initSun[1]]);
    }
    initStateFunction(stateInputs[6]);
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
    if (button.id === 'burns') {
        if (mainWindow.satellites.length === 0) {
            mainWindow.panelOpen = false;
            return;
        }
        mainWindow.desired.scenarioTime = mainWindow.scenarioLength*3600;
        let selectEl = document.getElementById('satellite-way-select');
        let chosenSat = Number(selectEl.value);
        generateBurnTable(chosenSat);
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
        selectEl.selectedIndex = chosenSat;
        selectEl.style.color = mainWindow.satellites[chosenSat].color;
    }
    else if (button.id === 'add-satellite' || button.id === 'add-satellite-2') {
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
        let inputs = document.getElementById('options-panel').getElementsByTagName('input');
        let dateDiff = new Date(mainWindow.startDate.toString().split('GMT')[0]).getTimezoneOffset()*60*1000;
        dateDiff = new Date(mainWindow.startDate-dateDiff).toISOString().substr(0,19);
        inputs[0].value = dateDiff;
        inputs[1].value = mainWindow.scenarioLength;
        inputs[2].value = Math.pow(398600.4418 / Math.pow(mainWindow.mm, 2), 1/3).toFixed(2);
        let sunTime = Math.round((24 * math.atan2(mainWindow.getInitSun()[1], -mainWindow.getInitSun()[0]) / 2 / Math.PI));
        if (sunTime < 0) sunTime = math.round((sunTime + 24));
        sunTime += '00';
        if (sunTime.length < 4) sunTime = '0' + sunTime;
        inputs[3].value = sunTime;
        inputs[4].value = 180 * math.atan2(mainWindow.getInitSun()[2], math.norm(mainWindow.getInitSun().slice(0,2))) / Math.PI;
    }
    document.getElementById(button.id + '-panel').classList.toggle("hidden");
    // mainWindow.panelOpen = true;
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

function radialPosClosed(x0, xd0, yd0, a0, alpha, phi, t, n) {
    // alpha measured clockwise from +R
    // phi measured clockwise from -I
    return (4 * Math.pow(n, 2) * x0 + 2 * n * yd0 - 3 * Math.pow(n, 2) * x0 * Math.cos(n * t) - 2 * n * yd0 *
        Math.cos(n * t) - a0 * Math.cos(alpha) * Math.cos(phi) * Math.cos(n * t) + a0 * Math.cos(alpha) *
        Math.cos(phi) * Math.pow(Math.cos(n * t), 2) + 2 * a0 * n * t * Math.cos(phi) * Math.sin(alpha) +
        n * xd0 * Math.sin(n * t) - 2 * a0 * Math.cos(phi) * Math.sin(alpha) * Math.sin(n * t) + a0 * Math
        .cos(alpha) * Math.cos(phi) * Math.pow(Math.sin(n * t), 2)) / Math.pow(n, 2);
}

function intrackPosClosed(x0, xd0, y0, yd0, a0, alpha, phi, t, n) {
    return (-12 * Math.pow(n, 3) * t * x0 - 4 * n * xd0 + 2 * Math.pow(n, 2) * y0 - 6 * Math.pow(n, 2) * t *
        yd0 - 4 * a0 * n * t * Math.cos(alpha) * Math.cos(phi) + 4 * n * xd0 * Math.cos(n * t) - 3 * a0 *
        Math.pow(n, 2) * Math.pow(t, 2) * Math.cos(phi) * Math.sin(alpha) - 8 * a0 * Math.cos(phi) * Math
        .cos(n * t) * Math.sin(alpha) + 8 * a0 * Math.cos(phi) * Math.pow(Math.cos(n * t), 2) * Math.sin(
            alpha) + 12 * Math.pow(n, 2) * x0 * Math.sin(n * t) + 8 * n * yd0 * Math.sin(n * t) + 4 * a0 *
        Math.cos(alpha) * Math.cos(phi) * Math.sin(n * t) + 8 * a0 * Math.cos(phi) * Math.sin(alpha) * Math
        .pow(Math.sin(n * t), 2)) / (2 * Math.pow(n, 2));
}

function crosstrackPosClosed(z0, zd0, a0, phi, t, n) {
    return (Math.pow(n, 2) * z0 * Math.cos(n * t) + a0 * Math.sin(phi) - a0 * Math.cos(n * t) * Math.sin(phi) +
        n * zd0 * Math.sin(n * t)) / Math.pow(n, 2);
}

function radialVelClosed(x0, xd0, yd0, a0, alpha, phi, t, n) {
    return (Math.pow(n, 2) * xd0 * Math.cos(n * t) + 2 * a0 * n * Math.cos(phi) * Math.sin(alpha) - 2 * a0 * n *
        Math.cos(phi) * Math.cos(n * t) * Math.sin(alpha) + 3 * Math.pow(n, 3) * x0 * Math.sin(n * t) + 2 *
        Math.pow(n, 2) * yd0 * Math.sin(n * t) + a0 * n * Math.cos(alpha) * Math.cos(phi) * Math.sin(n * t)
    ) / Math.pow(n, 2);
}

function intrackVelClosed(x0, xd0, yd0, a0, alpha, phi, t, n) {
    return (-12 * Math.pow(n, 3) * x0 - 6 * Math.pow(n, 2) * yd0 - 4 * a0 * n * Math.cos(alpha) * Math.cos(
            phi) + 12 * Math.pow(n, 3) * x0 * Math.cos(n * t) + 8 * Math.pow(n, 2) * yd0 * Math.cos(n * t) +
        4 *
        a0 * n * Math.cos(alpha) * Math.cos(phi) * Math.cos(n * t) - 6 * a0 * Math.pow(n, 2) * t * Math.cos(
            phi) * Math.sin(alpha) - 4 * Math.pow(n, 2) * xd0 * Math.sin(n * t) + 8 * a0 * n * Math.cos(
            phi) * Math.sin(alpha) * Math.sin(n * t)) / (2 * Math.pow(n, 2));
}

function crosstrackVelClosed(z0, zd0, a0, phi, t, n) {
    return (Math.pow(n, 2) * zd0 * Math.cos(n * t) - Math.pow(n, 3) * z0 * Math.sin(n * t) + a0 * n * Math.sin(
        phi) * Math.sin(n * t)) / Math.pow(n, 2);
}

function hcwFiniteBurnOneBurn(stateInit, stateFinal, tf, a0, time = 0, n = mainWindow.mm) {
    let state = math.transpose([Object.values(stateInit)]);
    stateFinal = math.transpose([Object.values(stateFinal)]);
    
    let v = proxOpsTargeter(state.slice(0, 3), stateFinal.slice(0, 3), tf);
    let v1 = v[0],
        yErr= [100], S, dX = 1,
        F;
    let dv1;
    if (!false) {
        dv1 = math.subtract(v1, state.slice(3, 6));
    }
    else {
        dv1 = guess;
    }
    
    let Xret = [
        [Math.atan2(dv1[1][0], dv1[0][0])],
        [Math.atan2(dv1[2], math.norm([dv1[0][0], dv1[1][0]]))],
        [math.norm(math.squeeze(dv1)) / a0 / tf]
    ];
    if (Xret[2] < 1e-9) {
        return {
            r: 0,
            i: 0,
            c: 0,
            t: [0],
            F: oneBurnFiniteHcw(stateInit, Xret[0][0], Xret[1][0], Xret[2][0], tf, time, a0)
        }
    }
    let X = Xret.slice();
    if (X[2] > 1) {
        return false;
    }
    let errCount = 0;
    while (math.norm(math.squeeze(dX)) > 1e-6) {
        F = oneBurnFiniteHcw(stateInit, X[0][0], X[1][0], X[2][0], tf, time, a0);
        yErr = [
            [stateFinal[0][0] - F.x],
            [stateFinal[1][0] - F.y],
            [stateFinal[2][0] - F.z]
        ];
        S = proxOpsJacobianOneBurn(stateInit, a0, X[0][0], X[1][0], X[2][0], tf, n);
        dX = math.multiply(math.inv(S), yErr);
        X = math.add(X, dX)
        if (errCount > 20 || X[2][0] < 0) return false;
        errCount++;
    }
    if (X[2] > 1 || X[2] < 0) return false;
    return {
        r: a0 * X[2] * tf * Math.cos(X[0][0]) * Math.cos(X[1][0]),
        i: a0 * X[2] * tf * Math.sin(X[0][0]) * Math.cos(X[1][0]),
        c: a0 * X[2] * tf * Math.sin(X[1][0]),
        t: X[2],
        F,
        X
    }
    // return [Xret,X];
}

function hcwFiniteBurnTwoBurn(stateInit, stateFinal, tf, a0, n = mainWindow.mm) {
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
        // console.log(multiplyMatrix(math.transpose(S),invSSt))
        dX = math.multiply(invS, yErr);
        // console.log(yErr);
        // console.log(F)
        X = math.add(X, dX)
        ii++
        if (ii > 50) {
            break;
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

function calcTwoBurn(options = {}) {
    let {
        stateF,
        stateI,
        a = 0.00001,
        tf = 7200 * 1.5,
        startTime = 0,
        rawData = false
    } = options;
    outBurns = [];
    let X = hcwFiniteBurnTwoBurn(stateI, stateF, tf, a);
    // console.log(X, tf, X.burn1.t < 0, X.burn2.t < 0, (X.burn1.t + X.burn2.t) > tf);
    if (X.burn1.t < 0 || X.burn2.t < 0 || (X.burn1.t + X.burn2.t) > tf) {
        // Find transfer time that works if original returns no solution
        let ii = tf;
        let tryList = [];
        while (ii >= 1800) {
            tryList.push(ii);
            ii -= 900;
        }
        ii = tf;
        while (ii < 8 * 3600) {
            tryList.push(ii);
            ii += 900;
        }
        let returnBool = true;
        for (let kk = 0; kk < tryList.length; kk++) {
            let Xtry = hcwFiniteBurnTwoBurn(stateI, stateF, tryList[kk], a);
            if (Xtry.burn1.t > 0 && Xtry.burn2.t > 0 && (Xtry.burn1.t + Xtry.burn2.t) < tryList[kk]) {
                returnBool = false;
                X = Xtry;
                tf = tryList[kk];
                alert(`Solution found with tranfer time of ${tryList[kk] / 60} mins`);
                break;
            }
        }
        if (returnBool) return false;
    };
    let alpha = math.atan2(X.burn1.i, X.burn1.r);
    let phi = math.atan2(X.burn1.c, math.norm([X.burn1.r, X.burn1.i]));
    let res = oneBurnFiniteHcw(stateI, alpha, phi, X.burn1.t / tf, tf, a, mainWindow.mm);
    outBurns.push(rawData ? {alpha, phi, t: X.burn1.t} : {
        time: startTime,
        direction: {
            r: X.burn1.t * a,
            i: 0,
            z: 0
        },
        waypoint: {
            tranTime: tf,
            target: {
                r: res.x,
                i: res.y,
                c: res.z
            }
        }
    })
    res = oneBurnFiniteHcw(stateI, alpha, phi, X.burn1.t / (tf - X.burn2.t), tf - X.burn2.t, a, mainWindow.mm);
    alpha = math.atan2(X.burn2.i, X.burn2.r);
    phi = math.atan2(X.burn2.c, math.norm([X.burn2.r, X.burn2.i]));
    res = oneBurnFiniteHcw(res, alpha, phi, 0.5, X.burn2.t * 2, a, mainWindow.mm);
    outBurns.push(rawData ? {alpha, phi, t: X.burn2.t} : {
        time: startTime + tf - X.burn2.t,
        direction: {
            r: X.burn2.t * a,
            i: 0,
            z: 0
        },
        waypoint: {
            tranTime: X.burn2.t * 2,
            target: {
                r: res.x,
                i: res.y,
                c: res.z
            }
        }
    })
    return outBurns;
}

function oneBurnFiniteHcw(state, alpha, phi, tB, t, time = 0, a0 = 0.00001) {
    state = [state.x, state.y, state.z, state.xd, state.yd, state.zd];
    let direction = [a0 * Math.cos(alpha) * Math.cos(phi), a0 * Math.sin(alpha) * Math.cos(phi), a0 * Math.sin(phi)];
    let numBurnPoints = math.ceil(t * tB / mainWindow.timeDelta)
    let numDriftPoints = math.ceil((t - t * tB) / mainWindow.timeDelta)
    numBurnPoints = numBurnPoints < 1 ? 1 : numBurnPoints;
    numDriftPoints = numDriftPoints < 1 ? 1 : numDriftPoints;
    for (let ii = 0; ii < numBurnPoints; ii++) {
        state = runge_kutta(twoBodyRpo, state, t * tB / numBurnPoints, direction, time  + t * tB * ii / numBurnPoints)
    }
    for (let ii = 0; ii < numDriftPoints; ii++) {
        state = runge_kutta(twoBodyRpo, state, (t - t * tB)/numDriftPoints, [0,0,0], time + t * tB + (t - t * tB) * ii/numDriftPoints); 
    }
    return {
        x: state[0],
        y: state[1],
        z: state[2],
        xd: state[3],
        yd: state[4],
        zd: state[5]
    };

}

function proxOpsJacobianOneBurn(state, a, alpha, phi, tB, tF, time, n) {
    let m1, m2, mC, mFinal = [];
    //alpha
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
    mFinal = mC;
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
    m2 = oneBurnFiniteHcw(state, alpha, phi, tB + 0.01, tF, time, a);
    m2 = [
        [m2.x],
        [m2.y],
        [m2.z]
    ];
    m = math.dotDivide(math.subtract(m2, m1), 0.01);
    mC = math.concat(mC, m);
    return mC;
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
    m1 = twoBurnFiniteHcw(state, alpha1, phi1 - 0.0001, alpha2, phi2, tB1, tB2, tF, a, n);
    m1 = [
        [m1.x],
        [m1.y],
        [m1.z],
        [m1.xd],
        [m1.yd],
        [m1.zd]
    ];
    m2 = twoBurnFiniteHcw(state, alpha1, phi1 + 0.0001, alpha2, phi2, tB1, tB2, tF, a, n);
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
    //tB1
    m1 = twoBurnFiniteHcw(state, alpha1, phi1, alpha2, phi2, tB1 - 0.0001, tB2, tF, a, n);
    m1 = [
        [m1.x],
        [m1.y],
        [m1.z],
        [m1.xd],
        [m1.yd],
        [m1.zd]
    ];
    m2 = twoBurnFiniteHcw(state, alpha1, phi1, alpha2, phi2, tB1 + 0.0001, tB2, tF, a, n);
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
    m1 = twoBurnFiniteHcw(state, alpha1, phi1, alpha2, phi2, tB1, tB2 - 0.0001, tF, a, n);
    m1 = [
        [m1.x],
        [m1.y],
        [m1.z],
        [m1.xd],
        [m1.yd],
        [m1.zd]
    ];
    m2 = twoBurnFiniteHcw(state, alpha1, phi1, alpha2, phi2, tB1, tB2 + 0.0001, tF, a, n);
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
    return mFinal;
}

function twoBurnFiniteHcw(state, alpha1, phi1, alpha2, phi2, tB1, tB2, tf, a0, n = mainWindow.mm) {
    x0 = state.x;
    xd0 = state.xd;
    y0 = state.y;
    yd0 = state.yd;
    z0 = state.z;
    zd0 = state.zd;
    let t1 = tB1 * tf,
        t2 = tf - tB1 * tf - tB2 * tf,
        t3 = tB2 * tf;
    let xM1 = radialPosClosed(x0, xd0, yd0, a0, alpha1, phi1, t1, n);
    let xdM1 = radialVelClosed(x0, xd0, yd0, a0, alpha1, phi1, t1, n);
    let yM1 = intrackPosClosed(x0, xd0, y0, yd0, a0, alpha1, phi1, t1, n);
    let ydM1 = intrackVelClosed(x0, xd0, yd0, a0, alpha1, phi1, t1, n);
    let zM1 = crosstrackPosClosed(z0, zd0, a0, phi1, t1, n);
    let zdM1 = crosstrackVelClosed(z0, zd0, a0, phi1, t1, n);
    let xM2 = radialPosClosed(xM1, xdM1, ydM1, 0, 0, 0, t2, n);
    let xdM2 = radialVelClosed(xM1, xdM1, ydM1, 0, 0, 0, t2, n);
    let yM2 = intrackPosClosed(xM1, xdM1, yM1, ydM1, 0, 0, 0, t2, n);
    let ydM2 = intrackVelClosed(xM1, xdM1, ydM1, 0, 0, 0, t2, n);
    let zM2 = crosstrackPosClosed(zM1, zdM1, 0, 0, t2, n);
    let zdM2 = crosstrackVelClosed(zM1, zdM1, 0, 0, t2, n);
    let xF = radialPosClosed(xM2, xdM2, ydM2, a0, alpha2, phi2, t3, n);
    let xdF = radialVelClosed(xM2, xdM2, ydM2, a0, alpha2, phi2, t3, n);
    let yF = intrackPosClosed(xM2, xdM2, yM2, ydM2, a0, alpha2, phi2, t3, n);
    let ydF = intrackVelClosed(xM2, xdM2, ydM2, a0, alpha2, phi2, t3, n);
    let zF = crosstrackPosClosed(zM2, zdM2, a0, phi2, t3, n);
    let zdF = crosstrackVelClosed(zM2, zdM2, a0, phi2, t3, n);
    return {
        x: xF,
        y: yF,
        z: zF,
        xd: xdF,
        yd: ydF,
        zd: zdF
    };

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

function generateBurns(all = false) {
    this.calcTraj(true);
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
    sat.genBurns(true);
}

function generateBurnTable(object = 0) {
    let table = document.getElementById('waypoint-table').children[1];
    while (table.firstChild) {
        table.removeChild(table.firstChild);
    }
    let addStartTime = document.getElementById('add-start-time');
    let tranTime = Number(document.getElementById('add-tran-time').value);
    let endTime = mainWindow.satellites[object].burns.length === 0 ? mainWindow.startDate : new Date(mainWindow.startDate.getTime() + mainWindow.satellites[object].burns[mainWindow.satellites[object].burns.length - 1].time * 1000 + mainWindow.satellites[object].burns[mainWindow.satellites[object].burns.length - 1].waypoint.tranTime * 1000);
    let dt = (endTime.getTime() - mainWindow.startDate.getTime() + tranTime * 60000) / 1000;
    let crossState = mainWindow.satellites[object].currentPosition({
        time: dt
    });
    document.getElementById('add-cross').value = crossState.c[0].toFixed(2);
    addStartTime.value = new Date(new Date(endTime).toString().split(' GMT')[0].substring(4) + 'Z').toISOString().substr(0, 19);

    if (mainWindow.satellites[object].burns.length === 0) return;
    let addedElement;
    for (let burn = 0; burn < mainWindow.satellites[object].burns.length; burn++) {
        addedElement = document.createElement('tr');
        addedElement.classList.add('tool-container')
        let burnDir = [1000*mainWindow.satellites[object].burns[burn].direction.r, 1000*mainWindow.satellites[object].burns[burn].direction.i, 1000*mainWindow.satellites[object].burns[burn].direction.c]
        let rot = translateFrames(object, {time: mainWindow.satellites[object].burns[burn].time})
        burnDir = math.squeeze(math.multiply(rot, math.transpose([burnDir])))
        addedElement.innerHTML = `
            <td>${new Date(mainWindow.startDate.getTime() + mainWindow.satellites[object].burns[burn].time * 1000).toString()
        .split(' GMT')[0].substring(4)}</td>
            <td onclick="addToolTip(this)" class="" title="${'r: ' + burnDir[0].toFixed(3) + '  i: ' + burnDir[1].toFixed(3) + '  c: ' + burnDir[2].toFixed(3) + ' dur: ' + (math.norm(burnDir) / mainWindow.satellites[object].a / 1000).toFixed(2)}"><span>(${(mainWindow.satellites[object].burns[burn].waypoint.target.r).toFixed(3)}, ${(mainWindow.satellites[object].burns[burn].waypoint.target.i).toFixed(3)}, ${(mainWindow.satellites[object].burns[burn].waypoint.target.c).toFixed(3)})</span></td>
            <td><span>${(mainWindow.satellites[object].burns[burn].waypoint.tranTime / 60).toFixed(1)}</span></td>
            <td class="edit-button ctrl-switch">Edit</td>
        `;
        table.appendChild(addedElement);
    }
    let editButtons = document.getElementsByClassName('edit-button');
    for (let button = 0; button < editButtons.length; button++) {
        editButtons[button].addEventListener('click', editButtonFunction);
    }
}

function addToolTip(element) {
    if (element.getElementsByTagName('input').length > 0) return;
    element.classList.toggle('tooltip')
}

function editButtonFunction(event) {
    let tdList = event.target.parentElement.children,
        oldValue;
    if (event.target.innerText === 'Confirm') {
        event.target.innerText = 'Edit';
        oldValue = new Date(tdList[0].children[0].value).toString()
            .split(' GMT')[0].substring(4);
        tdList[0].innerText = oldValue;
        let tarList = tdList[1].children[0].getElementsByTagName('input');
        tdList[1].children[0].innerText = `(${tarList[0].value}, ${tarList[1].value}, ${tarList[2].value})`
        tdList[2].children[0].innerText = tdList[2].children[0].getElementsByTagName('input')[0].value;
        table2burns(Number(document.getElementById('satellite-way-select').value));
        return;
    }
    else if (event.target.innerText === 'Delete') {
        let buttons = document.getElementsByClassName('ctrl-switch'), el;
        for (let ii = 0; ii < buttons.length; ii++) {
            if (buttons[ii] === event.target) el = ii;
        }
        event.target.parentElement.parentElement.removeChild(event.target.parentElement);
        table2burns(Number(document.getElementById('satellite-way-select').value));

        return;
    }
    event.target.innerText = 'Confirm';
    // nextValue = new Date(new Date(event.target.parentElement.nextSibling.children[0].innerText + 'Z') - 15 * 60 * 1000);
    let tarList = tdList[1].children[0].innerText.substr(1, tdList[1].children[0].innerText.length - 2).split(',');
    oldValue = tdList[0].innerText + 'Z';
    tdList[0].innerHTML = `<input type="datetime-local" oninput="editChanged(this)" id="edit-date" style="width: 12vw" value="${new Date(oldValue).toISOString().substr(0,19)}"/>`;
    // tdList[0].children[0].value = '2014-02-09';
    tdList[1].children[0].innerHTML = `(<input style="width: 9vw; font-size: 2.25vw;" type="number" value="${Number(tarList[0])}"/>, <input style="width: 8vw; font-size: 2.25vw;" type="number" value="${Number(tarList[1])}"/>, <input style="width: 8vw; font-size: 2.25vw;" type="number" value="${Number(tarList[2])}"/>)`;
    tdList[2].children[0].innerHTML = `<input style="width: 9vw; font-size: 2.25vw;" type="number" value="${tdList[2].children[0].innerText}"/>`;
    
}

function editChanged(el) {
    let sat = document.getElementById('satellite-way-select').value;
    let parent = el.type === 'number' ? el.parentNode.parentNode.parentNode : el.parentNode.parentNode;
    let tranTime = Number(parent.children[2].children[0].children[0].value) * 60;
    let time = new Date(parent.children[0].children[0].value).getTime() - new Date(mainWindow.startDate).getTime();
    time /= 1000;
    let targetState = mainWindow.satellites[sat].currentPosition({
        time: time + tranTime
    });
    let tarList = parent.children[1].getElementsByTagName('input');
    tarList[2].value = targetState.c[0].toFixed(1);
}

function waypoints2table(waypoints) {
    let table = document.getElementById('waypoint-table').children[1];
    while (table.firstChild) {
        table.removeChild(table.firstChild);
    }
    let addedElement;
    waypoints.forEach(point => {
        addedElement = document.createElement('tr');
        addedElement.innerHTML = `
            <td>${new Date(point.time).toString()
        .split(' GMT')[0].substring(4)}</td>
            <td><span>(${(point.r).toFixed(3)}, ${(point.i).toFixed(3)}, ${(point.c).toFixed(3)})</span></td>
            <td><span>${(point.tranTime).toFixed(3)}</span></td>
            <td class="edit-button ctrl-switch" onclick="editButtonFunction(event)">Edit</td>
        `;
        table.appendChild(addedElement);
    });
}

function table2burns(object) {
    let tableTrs = document.getElementById('waypoint-table').children[1].children,
        time, tranTime, startTime = mainWindow.startDate.getTime(),
        burns = [], target;
    for (let tr = 0; tr < tableTrs.length; tr++) {
        time = (Date.parse(tableTrs[tr].children[0].innerText) - startTime) / 1000;
        tranTime = Number(tableTrs[tr].children[2].innerText) * 60;
        target = tableTrs[tr].children[1].children[0].innerText.substr(1, tableTrs[tr].children[1].children[0].innerText.length - 2).split(',');
        burns.push({
            time,
            shown: false,
            direction: {
                r: 0,
                i: 0,
                c: 0
            },
            waypoint: {
                tranTime,
                target: {
                    r: Number(target[0]),
                    i: Number(target[1]),
                    c: Number(target[2])
                }
            }
        });
    }
    mainWindow.satellites[object].burns = [...burns];
    
    mainWindow.satellites[object].genBurns();
    mainWindow.satellites[object].genBurns();
}

function rmoeToRic(rmoes) {
    let origSemi = (398600.4418 / mainWindow.mm ** 2) ** (1/3);
    let origPeriod = 2 * Math.PI / mainWindow.mm;
    let initMm = mainWindow.mm + (rmoes.x * Math.PI  / 180) / origPeriod;
    let coeInit = Coe2PosVelObject({
        a: (398600.4418 / initMm ** 2)**(1/3),
        e: rmoes.ae / 2 / origSemi,
        i: rmoes.z *Math.PI / 180,
        raan: rmoes.y *Math.PI / 180 - rmoes.m * Math.PI / 180 - rmoes.b * 0*Math.PI / 180 + rmoes.ae * Math.sin(rmoes.b * Math.PI / 180) / origSemi,
        arg: rmoes.m * Math.PI / 180 - rmoes.b * Math.PI / 180,
        tA: rmoes.b * Math.PI / 180
    })
    return Eci2Ric([origSemi, 0, 0], [0, (398600.4418 / origSemi ) ** (1/2), 0], [coeInit.x, coeInit.y, coeInit.z], [coeInit.vx, coeInit.vy, coeInit.vz])
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
        let newTitle = '';
        let inputs = el.parentNode.parentNode.parentNode.getElementsByTagName('input');
        let position = {
            r: Number(inputs[7].value), 
            i: Number(inputs[8].value), 
            c: Number(inputs[9].value), 
            rd: Number(inputs[10].value)  / 1000, 
            id: Number(inputs[11].value) / 1000, 
            cd: Number(inputs[12].value) / 1000
        }
        let shape = el.parentNode.parentNode.parentNode.getElementsByTagName('select')[0].value;
        let a = Number(inputs[14].value) / 1e6;
        let color = inputs[15].value;
        let name = inputs[16].value === '' ? `Sat-${mainWindow.satellites.length+1}` : inputs[16].value;
        mainWindow.satellites.push(new Satellite({
            position,
            shape,
            a,
            color,
            name
        }));
        let newWidth = (Math.abs(position.i) * 2.2) > (Math.abs(position.r) * 2.4 / mainWindow.getRatio()) ? Math.abs(position.i) * 2.2 : Math.abs(position.r) * 2.4 / mainWindow.getRatio()
        if (newWidth > mainWindow.desired.plotWidth) {
            mainWindow.desired.plotWidth = newWidth
        }
        document.title = mainWindow.satellites.map(sat => sat.name).join(' / ');
        closeAll();
    }
    else if (el.id === 'add-launch-button') {
        testLambertProblem();
        closeAll();
    }
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
        cartInputs[1].value = (4 * state.r + 2 * state.id / mainWindow.mm).toFixed(3);
        cartInputs[2].value = (state.i - 2 * state.rd / mainWindow.mm).toFixed(3);
        cartInputs[0].value = (2 * Math.sqrt(Math.pow(3 * state.r + 2 * state.id / mainWindow.mm, 2) + Math.pow(state.rd / mainWindow.mm, 2))).toFixed(3);
        cartInputs[3].value = (Math.atan2(state.rd, 3 * mainWindow.mm * state.r + 2 * state.id) * 180 / Math.PI).toFixed(3);
        cartInputs[5].value = (Math.atan2(state.c, state.cd / mainWindow.mm) * 180 / Math.PI).toFixed(3);
        cartInputs[4].value = (Math.sqrt(Math.pow(state.c, 2) + Math.pow(state.cd / mainWindow.mm, 2))).toFixed(3);
    }
    
}

function editSatellite(button) {
    if (button.innerText === 'Delete') {
        mainWindow.satellites.splice(button.nextSibling.selectedIndex,1);
        closeAll();
        return;
    }
    if (button.nextSibling.selectedIndex < 0) return;
    let el = button.parentNode.parentNode.parentNode;
    
    let inputs = el.parentNode.parentNode.parentNode.getElementsByTagName('input');
        
    let color = mainWindow.satellites[button.nextSibling.selectedIndex].color;
    let name = mainWindow.satellites[button.nextSibling.selectedIndex].name;
    let shape = mainWindow.satellites[button.nextSibling.selectedIndex].shape;
    let a = mainWindow.satellites[button.nextSibling.selectedIndex].a;
    state = {
        r:  Number(inputs[7].value ),
        i:  Number(inputs[8].value ),
        c:  Number(inputs[9].value ),
        rd: Number(inputs[10].value) / 1000,
        id: Number(inputs[11].value) / 1000,
        cd: Number(inputs[12].value) / 1000,
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
    let letterY = pixelPosition[1] + shapeHeight / 2 + (cnvs.height*0.025)*1.3 / 2;
    ctx.font = `${(cnvs.height < cnvs.width ? cnvs.height : cnvs.width) *0.025}px Courier`;
    ctx.fillText(name ? name : '', pixelPosition[0], letterY);
}

function getRelativeData(n_target, n_origin) {
    let sunAngle, rangeRate, range, poca, toca, tanRate;
    let relPos = math.squeeze(math.subtract(mainWindow.satellites[n_origin].getPositionArray(), mainWindow.satellites[n_target]
        .getPositionArray()));
    let relVel = math.squeeze(math.subtract(mainWindow.satellites[n_origin].getVelocityArray(), mainWindow.satellites[n_target]
        .getVelocityArray()));
    range = math.norm(relPos);
    sunAngle = mainWindow.getCurrentSun()
    sunAngle = math.acos(math.dot(relPos, sunAngle) / range / math.norm(sunAngle)) * 180 / Math.PI;
    sunAngle = 180 - sunAngle; // Appropriate for USSF
    rangeRate = math.dot(relVel, relPos) * 1000 / range;
    tanRate = Math.sqrt(Math.pow(math.norm(relVel), 2) - Math.pow(rangeRate, 2)) * 1000;
    let relPosHis;
    try {
        relPosHis = findMinDistance(mainWindow.satellites[n_origin].stateHistory, mainWindow.satellites[n_target].stateHistory);
        poca = math.min(relPosHis);
        toca = relPosHis.findIndex(element => element === poca);
    }
    catch (err) {console.log(err)}
    
    // console.log(poca, toca);
    return {
        sunAngle,
        rangeRate,
        range,
        poca,
        toca,
        tanRate,
        relativeVelocity: math.norm(relVel)*1000
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

function drawVulnerabilityZone() {
    let ctx = mainWindow.getContext();
    let point, pointText;
    let tarPos = mainWindow.satellites[mainWindow.vz_reach.target].currentPosition({time: mainWindow.scenarioTime + mainWindow.vz_reach.time})
    let objPos = mainWindow.satellites[mainWindow.vz_reach.object].currentPosition({time: mainWindow.scenarioTime})
    objPos = {
        x: objPos.r[0],
        y: objPos.i[0],
        z: objPos.c[0],
        xd: objPos.rd[0],
        yd: objPos.id[0],
        zd: objPos.cd[0]
    }
    let burn, results = [], textLoc;
    ctx.fillStyle = 'black';
    ctx.strokeStyle = 'black';
    ctx.font = '15px serif';
    for (let ang = 0; ang < 2 * Math.PI; ang += Math.PI / 4) {
        point = {
            x: tarPos.r[0] + mainWindow.vz_reach.distance * Math.sin(ang),
            y: tarPos.i[0] + mainWindow.vz_reach.distance * Math.cos(ang),
            z: tarPos.c[0],
            xd: 0,
            yd: 0,
            zd: 0 
        };
        pointText = {
            x: tarPos.r[0] + mainWindow.vz_reach.distance * Math.sin(ang)*1.1,
            y: tarPos.i[0] + mainWindow.vz_reach.distance * Math.cos(ang)*1.1,
            z: tarPos.c[0]
        };
        textLoc = mainWindow.convertToPixels({r: pointText.x, i: pointText.y, c: pointText.z}).ri;
        burn = hcwFiniteBurnOneBurn(objPos, point, mainWindow.vz_reach.time, 0.00001);
        results.push(burn ? {
            dV: math.norm([burn.r, burn.i, burn.c]),
            vel: math.norm([burn.F.xd-tarPos.rd[0], burn.F.yd-tarPos.id[0], burn.F.zd-tarPos.cd[0]])
        } : false)
        // console.log(textLoc);
        ctx.fillText(burn ? (1000*math.norm([burn.r, burn.i, burn.c])).toFixed(0) : '--', textLoc.x, textLoc.y)
        ctx.fillText(burn ? (1000*math.norm([burn.F.xd-tarPos.rd[0], burn.F.yd-tarPos.id[0], burn.F.zd-tarPos.cd[0]])).toFixed(0) : '--', textLoc.x, textLoc.y+15)
    }
    let zoneCenter = mainWindow.convertToPixels({r: tarPos.r[0], i: tarPos.i[0], c: tarPos.c[0]}).ri;
    ctx.beginPath();
    ctx.arc(zoneCenter.x, zoneCenter.y, mainWindow.vz_reach.distance / 2 / mainWindow.getPlotWidth() * mainWindow.getWidth(),0, 2 * Math.PI);
    ctx.stroke();
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
        -mu * (r0 + x) / rT+ mu / r0 ** 2 + 2 * n * dy + n ** 2 * x + ndot * y +  a[0],
        -mu * y / rT - 2 * n * dx - ndot * x + n ** 2 * y + a[1],
        -mu * z / rT + a[2]
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

function calcSatTwoBody(allBurns = false) {
    let t_calc, currentState, satBurn;
    this.stateHistory = [];
    t_calc = 0;
    // console.log(`Calc traj on ${this.name}`);
    currentState = [
        this.position.r,
        this.position.i,
        this.position.c,
        this.position.rd,
        this.position.id,
        this.position.cd
    ];
    satBurn = this.burns.length > 0 ? 0 : undefined;
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
                (mainWindow.scenarioTime + 0.5) || allBurns)) {
                currentState = runge_kutta(twoBodyRpo, currentState, this.burns[satBurn].time - t_calc, [0,0,0], t_calc);
                t_calc += this.burns[satBurn].time - t_calc;

                // RecalcBurns
                if (allBurns) {
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
                        }, this.burns[satBurn].waypoint.tranTime, this.a, t_calc);
                        // console.log(dir);
                        if (dir && dir.t > 0 && dir.t < 1) {
                            this.burns[satBurn].direction.r = dir.r;
                            this.burns[satBurn].direction.i = dir.i;
                            this.burns[satBurn].direction.c = dir.c;
                        }
                    }
                } 

                let t_burn = math.norm([this.burns[satBurn].direction.r, this.burns[satBurn]
                    .direction.i, this.burns[satBurn].direction.c
                ]) / this.a;
                
                if (satBurn !== this.burns.length - 1) {
                    t_burn = t_burn > (this.burns[satBurn + 1].time - this.burns[satBurn].time) ? this.burns[satBurn + 1].time - this.burns[satBurn].time : t_burn;
                } 
                t_burn = ((mainWindow.scenarioTime - this.burns[satBurn].time) < t_burn) && !allBurns ? (mainWindow.scenarioTime - this.burns[satBurn].time) : t_burn;
                
                // console.log(math.squeeze(currentState));
                let direction = [this.burns[satBurn].direction.r, this.burns[satBurn].direction.i, this.burns[satBurn].direction.c];

                direction = math.dotMultiply(this.a, math.dotDivide(direction, math.norm(direction)));
                while ((this.burns[satBurn].time + t_burn - t_calc) > mainWindow.timeDelta) {
                    t_calc += mainWindow.timeDelta;
                    currentState = runge_kutta(twoBodyRpo, currentState, mainWindow.timeDelta, direction, t_calc);
                    this.stateHistory.push({t: t_calc, r: currentState[0], i: currentState[1], c: currentState[2], rd: currentState[3], id: currentState[4], cd: currentState[5]});
                }
                // console.log(this.burns[satBurn].time + t_burn - t_calc);
                if (t_burn > 1e-3) {
                // if (true) {
                    currentState = runge_kutta(twoBodyRpo, currentState, this.burns[satBurn].time + t_burn - t_calc, direction, t_calc);
                    // showScreenAlert('Burn has magnitude of 0 m/s')
                }
                t_calc += mainWindow.timeDelta;
                currentState = runge_kutta(twoBodyRpo, currentState, t_calc - this.burns[satBurn].time - t_burn, [0,0,0], t_calc);
                // console.log(math.squeeze(currentState));
                satBurn = this.burns.length === satBurn + 1 ? undefined : satBurn + 1;
                continue;
            }
        }
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

function testLambertProblem() {
    var long = prompt("Longitude relative to satellite", "0");
    var lat = prompt("Latitude", "0");
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

function Eci2Ric(rC, drC, rD, drD) {
    let h = math.cross(rC, drC);
    let ricX = math.dotDivide(rC, math.norm(rC));
    let ricZ = math.dotDivide(h, math.norm(h));
    let ricY = math.cross(ricZ, ricX);

    let ricXd = math.dotMultiply(1 / math.norm(rC), math.subtract(drC, math.dotMultiply(math.dot(ricX, drC), ricX)));
    let ricYd = math.cross(ricZ, ricXd);
    let ricZd = [0,0,0];

    let C = [ricX, ricY, ricZ];
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
    let ricX = math.dotDivide(rC, math.norm(rC));
    let ricZ = math.dotDivide(h, math.norm(h));
    let ricY = math.cross(ricZ, ricX);

    let ricXd = math.dotMultiply(1 / math.norm(rC), math.subtract(drC, math.dotMultiply(math.dot(ricX, drC), ricX)));
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

function PosVel2CoeNew(r, v) {
    let mu = 398600.4418;
    let rn = math.norm(r);
    let vn = math.norm(v);
    let h = math.cross(r, v);
    let hn = math.norm(h);
    let n = math.cross([0, 0, 1], h);
    let nn = math.norm(n);
    if (nn < 1e-6) {
        n = [1, 0, 0];
        nn = 1;
    }
    var epsilon = vn * vn / 2 - mu / rn;
    let a = -mu / 2 / epsilon;
    let e = math.subtract(math.dotDivide(math.cross(v, h), mu), math.dotDivide(r, rn));
    let en = math.norm(e);
    if (en < 1e-6) {
        e = [1, 0, 0];
        en = 0;
    }
    let inc = Math.acos(math.dot(h, [0, 0, 1]) / hn);
    let ra = Math.acos(math.dot(n, [1, 0, 0]) / nn);
    if (n[1] < 0) {
        ra = 2 * Math.PI - ra;
    }

    let ar, arDot;
    if (en === 0) {
        arDot = math.dot(n, e) / nn;
    } else {
        arDot = math.dot(n, e) / en / nn;
    }
    if (arDot > 1) {
        ar = 0;
    } else if (arDot < -1) {
        ar = Math.PI;
    } else {
        ar = Math.acos(arDot);
    }
    if (e[2] < 0) {
        ar = 2 * Math.PI - ar;
    } else if (inc < 1e-6 && e[1] < 0) {
        ar = 2 * Math.PI - ar;
    }
    let ta, taDot;
    if (en === 0) {
        taDot = math.dot(r, e) / rn;
    } else {
        taDot = math.dot(r, e) / rn / en;
    }
    if (taDot > 1) {
        ta = 0;
    } else if (taDot < -1) {
        ta = Math.PI;
    } else {
        ta = Math.acos(taDot);
    }
    if (math.dot(v, e) > 1e-6) {
        ta = 2 * Math.PI - ta;
    }
    // console.log([a,en,inc,ra,ar,ta])
    return {
        a: a,
        e: en,
        i: inc,
        raan: ra,
        arg: ar,
        tA: ta
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

function setDefaultScenario(index) {
    window.localStorage.setItem(index, JSON.stringify(mainWindow.getData()))
}

function recoverDefaultScenario(index) {
    if (window.localStorage[index] === undefined) return
    let textFromFileLoaded = JSON.parse(window.localStorage.getItem(index));
    mainWindow.loadDate(textFromFileLoaded);
    mainWindow.setAxisWidth('set', mainWindow.plotWidth);
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

function insertDirectionBurn(sat = 0, time = 3600, dir = [0.001, 0, 0]) {
    mainWindow.satellites[sat].burns = mainWindow.satellites[sat].burns.filter(burn => {
        return burn.time < time
    })
    let position = mainWindow.satellites[sat].currentPosition({time});
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
    mainWindow.desired.scenarioTime = time + 3600;
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