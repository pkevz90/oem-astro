// Various housekeepin to not change html
document.getElementById('add-satellite-panel').getElementsByTagName('span')[0].classList.add('ctrl-switch');
document.getElementById('add-satellite-panel').getElementsByTagName('span')[0].innerText = 'Edit';
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
    frameMove = undefined;
    initSun = [1, 0, 0];
    desired = {
        scenarioTime: 0,
        plotCenter: 0,
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
    trajSize = 2;
    encoder;
    mm = 2 * Math.PI / 86164;
    timeDelta = 0.006*86164;
    scenarioLength = 48;
    burnSensitivity = 0.3;
    scenarioTime = 0;
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
        data: undefined
    }
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
        ctx.fillStyle = 'white';
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
        ctx.strokeStyle = 'black';
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
        return math.squeeze(math.multiply(rotationMatrices(-t * this.mm * 180 / Math.PI, 3), math.transpose([this.initSun])));
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
            this.plotWidth = width;
        }
        else if (type === 'increase') {
            this.plotWidth *= 1.05;
        }
        else if (type === 'decrease') {
            this.plotWidth /= 1.05;
        }
        this.plotHeight = this.plotWidth * this.getRatio();
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
        ctx.strokeStyle = 'black';
        ctx.fillStyle = 'black';
        let axesLength = 0.5;
        let sunLength = 0.4 * this.plotHeight / 2 * Math.max(this.frameCenter.ri.h, this.frameCenter.ci.h, this.frameCenter.rc.h);
        let sunCoor = this.convertToPixels(math.dotMultiply(sunLength, this.getCurrentSun()));
        let origin = this.convertToPixels([0, 0, 0]);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        this.drawBorder();
        // console.log(axesLength * this.plotHeight);
        if (this.state.search('ri') !== -1) {
            ctx.lineWidth = this.cnvs.width * this.frameCenter.ri.w / 200;
            ctx.font = 'bold ' + this.cnvs.width * this.frameCenter.ri.w / 40 + 'px serif';
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
            ctx.strokeStyle = 'black';
            ctx.fillText('R', origin.ri.x, origin.ri.y - this.cnvs.height * axesLength * this.frameCenter.ri.h / 2 - this.cnvs.width * this.frameCenter.ri.w / 60)
            ctx.fillText('I', origin.ri.x - this.cnvs.height * axesLength * this.frameCenter.ri.h / 2 - this.cnvs.width * this.frameCenter.ri.w / 80, origin.ri.y)
        }
        if (this.state.search('ci') !== -1) {
            ctx.lineWidth = this.cnvs.width * this.frameCenter.ci.w / 200;
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
            ctx.strokeStyle = 'black';
            
            if (drawX) ctx.fillText('C', origin.ci.x, origin.ci.y - this.cnvs.height * axesLength * this.frameCenter.ci.h / 2 - this.cnvs.width * this.frameCenter.ci.w / 60)
            if (drawY > this.plotHeight / 2 * this.frameCenter.ci.h * axesLength) ctx.fillText('I', origin.ci.x - this.cnvs.height * axesLength * this.frameCenter.ci.h / 2 - this.cnvs.width * this.frameCenter.ci.w / 80, origin.ci.y)
        }
        if (this.state.search('rc') !== -1) {
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
            ctx.strokeStyle = 'black';
            ctx.fillText('C', origin.rc.x, origin.rc.y - this.cnvs.height * axesLength * this.frameCenter.rc.h / 2 - this.cnvs.width * this.frameCenter.rc.w / 60)
            ctx.fillText('R', origin.rc.x + this.cnvs.height * axesLength * this.frameCenter.rc.h / 2 + this.cnvs.width * this.frameCenter.rc.w / 80, origin.rc.y)
        }
    }
    drawPlot() {
        if (this.state.search('plot') === -1) return;
        setTimeout(generateDataImpulsive(), 1);
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
        let sunLine = [], dVline = [];
        for (let ii = 0; ii < data[0].length; ii++) {
            let x = (data[0][ii] - limits.x[0]) * this.cnvs.width * pos.w / (limits.x[1] - limits.x[0]) + this.cnvs.width * (pos.x - pos.w / 2);
            let y = -(data[1][ii] - limits.y[0]) * this.cnvs.height * pos.h / (limits.y[1] - limits.y[0]) + this.cnvs.height * (pos.y + pos.h / 2);
            let ySun = -(data[2][ii]) * this.cnvs.height * pos.h / 180 + this.cnvs.height * (pos.y + pos.h / 2);
            sunLine.push({x, y: ySun}); dVline.push({x, y}); 
        }
        // Fix click on plot
        this.getContext().strokeStyle = 'rgb(204,164,61)';
        drawCurve(this.getContext(), sunLine);
        this.getContext().strokeStyle = 'black';
        drawCurve(this.getContext(), dVline);
        ctx.rect(this.frameCenter.plot.w * this.cnvs.width * 0.1, this.frameCenter.plot.h * this.cnvs.height * 0.1, pos.w * this.cnvs.width, pos.h * this.cnvs.height);
        ctx.stroke();
        ctx.textAlign = 'left';
        ctx.textBaseline = 'hanging';
        ctx.fillText('15 min', this.frameCenter.plot.w * this.cnvs.width * 0.1, this.frameCenter.plot.h* this.cnvs.height * 0.9 + 10)
        ctx.fillText('180 deg', this.frameCenter.plot.w * this.cnvs.width * 0.9 + 5, this.frameCenter.plot.h* this.cnvs.height * 0.1)
        ctx.textAlign = 'right';
        ctx.fillText('240 min', this.frameCenter.plot.w * this.cnvs.width * 0.9, this.frameCenter.plot.h* this.cnvs.height * 0.9 + 10)
        ctx.fillText((limits.y[1] * 1000).toFixed(1) + ' m/s', this.frameCenter.plot.w * this.cnvs.width * 0.1 - 5, this.frameCenter.plot.h* this.cnvs.height * 0.1)
        ctx.textBaseline = 'bottom';
        ctx.fillText('0 m/s', this.frameCenter.plot.w * this.cnvs.width * 0.1 - 5, this.frameCenter.plot.h* this.cnvs.height * 0.9)
        ctx.textAlign = 'left';
        ctx.fillText('0 deg', this.frameCenter.plot.w * this.cnvs.width * 0.9 + 5, this.frameCenter.plot.h* this.cnvs.height * 0.9)
    }
    drawCurve(line, options = {}) {
        // console.log(line);
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
        ctx.strokeStyle = 'black';
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
        this.relativeData.dataReqs.forEach(req => {
            // Draw line between objects
            let point1 = this.convertToPixels(this.satellites[req.origin].currentPosition());
            let point2 = this.convertToPixels(this.satellites[req.target].currentPosition());
            let start = this.relativeData.time * 0.05;
            ctx.beginPath();
            while (start < 1) {
                // ctx.arc((point2.ri.x - point1.ri.x) * start + point1.ri.x, (point2.ri.y - point1.ri.y) * start + point1.ri.y, 1, 0, 2 * Math.PI);
                ctx.moveTo((point2.ri.x - point1.ri.x) * start + point1.ri.x, (point2.ri.y - point1.ri.y) * start + point1.ri.y);
                ctx.lineTo((point2.ri.x - point1.ri.x) * (start-0.03) + point1.ri.x, (point2.ri.y - point1.ri.y) * (start-0.03) + point1.ri.y);
                
                start += 0.05;
            }
            ctx.stroke();
            ctx.textAlign = 'left';
            ctx.font = "bold " + req.textSize + "pt Courier";
            let relDataIn = getRelativeData(req.origin, req.target);
            let y_location = req.positionY * this.cnvs.height / 100;
            ctx.fillText(this.satellites[req.origin].name + String.fromCharCode(8594) + this.satellites[req.target].name, req.positionX*this.cnvs.width / 100, y_location);
            ctx.font = req.textSize + 'px Courier';
            y_location += req.textSize*1.1;
            req.data.forEach(d => {
                ctx.fillText(this.relativeData.data[d].name + ': ' + relDataIn[d].toFixed(
                    1) + ' ' + this.relativeData.data[d].units, req.positionX*this.cnvs.width / 100,
                    y_location);
                y_location += req.textSize*1.1;
            })
            })
            ctx.lineWidth = oldWidth;
            this.relativeData.time = this.relativeData.time > 1 ? 0 : this.relativeData.time + 0.03;
        
    }
    showTime() {
        let ctx = this.getContext();
        ctx.textAlign = 'left';
        ctx.font = 'bold ' + this.cnvs.height * 0.05 + 'px serif'
        ctx.fillText(new Date(this.startDate.getTime() + this.scenarioTime * 1000).toString()
            .split(' GMT')[0].substring(4), this.cnvs.width * 0.02, this.cnvs.height*0.96);
    }
    showLocation() {
        try {
            let ctx = this.getContext();
            ctx.textAlign = 'center';
            ctx.font = 'bold ' + this.cnvs.height * 0.02 + 'px serif';
            if (!this.mousePosition) return;
            let ricCoor = this.convertToRic(this.mousePosition);
            let frame = Object.keys(ricCoor)[0];
            ctx.font = 'bold ' + this.cnvs.height * 0.02 + 'px serif';
            ctx.fillStyle = 'rgb(150,150,150)';
            let angle = (this.mousePosition[0] - this.cnvs.width * 0.5) / this.cnvs.width / 0.45;
            angle = Math.PI / 2 * angle ** 6;
            angle = angle > Math.PI / 2 ? Math.PI / 2 : angle;
            if (this.burnStatus.type === 'manual') return;
            ctx.fillText(`${frame === 'ri' ? 'R' : 'C'} ${ricCoor[frame][frame === 'ri' ? 'r' : 'c'].toFixed(1)} km`, this.mousePosition[0] - this.cnvs.height * 0.1*Math.cos(angle) , this.mousePosition[1] - this.cnvs.height * 0.1*Math.sin(angle))
            ctx.fillText(`${frame === 'ri' ? 'I' : frame === 'ci' ? 'I' : 'R'} ${ricCoor[frame][frame === 'ri' ? 'i' : frame === 'ci' ? 'i' : 'r'].toFixed(1)} km`, this.mousePosition[0] + this.cnvs.height * 0.1*Math.cos(angle) , this.mousePosition[1] + this.cnvs.height * 0.1*Math.sin(angle))
            
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
            startDate: this.startDate
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
            startDate = this.startDate
        } = data
        this.plotWidth = plotWidth;
        this.relativeData = relativeData;
        this.satellites = [];
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
        })
        this.mm = mm;
        this.timeDelta = timeDelta;
        this.scenarioLength = scenarioLength;
        this.initSun = initSun;
        this.startDate = new Date(startDate);
        console.log(this.startDate);

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
    calcTraj = calcSatShownTrajectories;
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
                ctx.font = 'bold 19.7px serif';
                let textWidth = ctx.measureText((1000*mag).toFixed(1) + ' m/s').width;
                let textHeight = 20;
                // console.log(Math.abs(burn.location.r) , (mainWindow.getPlotHeight() * fC.ri.h / 2), (Math.abs(location.i) < (mainWindow.getPlotWidth() * fC.ri.w / 2)));
                if (state.search('ri') !== -1 && (Math.abs(burn.location.r) < (mainWindow.getPlotHeight() * fC.ri.h / 2)) && (Math.abs(burn.location.i - mainWindow.getPlotCenter()) < (mainWindow.getPlotWidth() * fC.ri.w / 2))) {
                    ctx.beginPath();
                    ctx.moveTo(point1.ri.x, point1.ri.y);
                    ctx.lineTo(point2.ri.x, point2.ri.y);
                    mag2 = math.norm([point2.ri.x - point1.ri.x, point2.ri.y - point1.ri.y]);
                    if (mag2 > 1e-6) {
                        ctx.fillText((1000*mag).toFixed(1) + ' m/s', -textWidth * (point2.ri.x - point1.ri.x) / mag2 + point1.ri.x, -textHeight*(point2.ri.y - point1.ri.y) / mag2 + point1.ri.y)
                        ctx.stroke();
                    }
                }
                if (state.search('ci') !== -1 && (Math.abs(burn.location.c) < (mainWindow.getPlotHeight() * fC.ci.h / 2)) && (Math.abs(burn.location.i - mainWindow.getPlotCenter()) < (mainWindow.getPlotWidth() * fC.ci.w / 2))) {
               
                    ctx.beginPath();
                    ctx.moveTo(point1.ci.x, point1.ci.y);
                    ctx.lineTo(point2.ci.x, point2.ci.y);
                    ctx.stroke();
                    mag2 = math.norm([point2.ci.x - point1.ci.x, point2.ci.y - point1.ci.y]);
                    ctx.fillText((1000*mag).toFixed(1) + ' m/s', -textWidth *(point2.ci.x - point1.ci.x) / mag2 + point1.ci.x, -textHeight*(point2.ci.y - point1.ci.y) / mag2 + point1.ci.y)
                    ctx.stroke();
                }
                if (state.search('rc') !== -1 && (Math.abs(burn.location.c) < (mainWindow.getPlotHeight() * fC.rc.h / 2)) && (Math.abs(burn.location.r) < (mainWindow.getPlotWidth() * fC.rc.w / 2))) {
                    ctx.beginPath();
                    ctx.moveTo(point1.rc.x, point1.rc.y);
                    ctx.lineTo(point2.rc.x, point2.rc.y);
                    ctx.stroke();
                    
                    mag2 = math.norm([point2.rc.x - point1.rc.x, point2.rc.y - point1.rc.y]);
                    ctx.fillText((1000*mag).toFixed(1) + ' m/s', -textWidth *(point2.rc.x - point1.rc.x) / mag2 + point1.rc.x, -textHeight*(point2.rc.y - point1.rc.y) / mag2 + point1.rc.y)
                    ctx.stroke();
                }
            }
        })
    
    }
    currentPosition = getSatCurrentPosition;
    drawCurrentPosition() {
        let cur = this.currentPosition();
        cur = {r: cur.r[0], i: cur.i[0], c: cur.c[0], rd: cur.rd[0], id: cur.id[0], cd: cur.cd[0]};
        this.curPos = cur;
        mainWindow.drawSatLocation(cur, {size: this.size, color: this.color, shape: this.shape, name: this.name});
    }
    checkClickProximity(position) {
        // Check if clicked on current position of object
        let out = {};
        if (position.ri) {
            out.ri = math.norm([this.curPos.r - position.ri.r, this.curPos.i - position.ri.i]) < (mainWindow.getPlotWidth() / 40);
        }
        if (position.ci) {
            out.ci = math.norm([this.curPos.c - position.ci.c, this.curPos.i - position.ci.i]) < (mainWindow.getPlotWidth() / 40);
        }
        if (position.rc) {
            out.rc = math.norm([this.curPos.c - position.rc.c, this.curPos.r - position.rc.r]) < (mainWindow.getPlotWidth() / 40);
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
}

let mainWindow = new windowCanvas(document.getElementById('main-plot'));
mainWindow.fillWindow();

(function animationLoop() {
    mainWindow.clear();
    mainWindow.updateSettings();
    mainWindow.drawAxes();
    mainWindow.drawPlot();
    // mainWindow.drawOrbitCurve();
    mainWindow.showData();
    mainWindow.showTime();
    mainWindow.showLocation();
    if (mainWindow.burnStatus.type) {
        mainWindow.calculateBurn();
    }
    // console.time('sats')
    mainWindow.satellites.forEach(sat => {
        sat.checkInBurn()
        sat.drawTrajectory();
        sat.drawBurns();
        sat.drawCurrentPosition();
    })
    if (mainWindow.vz_reach.shown && mainWindow.satellites.length > 1) {
        drawVulnerabilityZone();
    }
    // console.timeEnd('sats')
    mainWindow.recordFunction();
    // mainWindow.drawMouse(mainWindow.mousePosition);
    window.requestAnimationFrame(animationLoop)
})()
//------------------------------------------------------------------
// Adding event listeners for window objects
//------------------------------------------------------------------
window.addEventListener('keydown', key => {
    // key = key.key;
    // console.log(key.key);
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
    if (mainWindow.panelOpen) return;
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
        }
    }
    else if (key.key === 'n') {
        let newSat = new Satellite();
        newSat.calcTraj();
        mainWindow.satellites.push(newSat)
    }
})
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
document.oncontextmenu = function(event) {
    if (mainWindow.panelOpen) {
        return false;
    }
    let ricCoor = mainWindow.convertToRic([event.clientX, event.clientY]);
    let activeSat = false;
    for (sat = 0; sat < mainWindow.satellites.length; sat++) {
        let check = mainWindow.satellites[sat].checkClickProximity(ricCoor);
        if (check.ri || check.rc || check.ci) {
            activeSat = sat;
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
            <div class="context-item" id="maneuver-options" onclick="handleContextClick(this)">Manuever Options</div>
            <div class="context-item">Position (${mainWindow.satellites[activeSat].curPos.r.toFixed(2)}, ${mainWindow.satellites[activeSat].curPos.i.toFixed(2)}, ${mainWindow.satellites[activeSat].curPos.c.toFixed(2)}) km</div>
            <div class="context-item">Velocity (${(1000*mainWindow.satellites[activeSat].curPos.rd).toFixed(2)}, ${(1000*mainWindow.satellites[activeSat].curPos.id).toFixed(2)}, ${(1000*mainWindow.satellites[activeSat].curPos.cd).toFixed(2)}) m/s</div>
            <div class="context-item">Export Burns</div>`
        
    }
    else {
        ctxMenu.innerHTML = `
            <div class="context-item" id="add-satellite" onclick="openPanel(this)">Satellite Menu</div>
            <div class="context-item" onclick="openPanel(this)" id="burns">Maneuver List</div>
            <div class="context-item" onclick="openPanel(this)" id="options">Options Menu</div>
            <div class="context-item" onclick="openPanel(this)" id="data">Display Data</div>
            <div class="context-item"><label style="cursor: pointer" for="plan-type">Waypoint Planning</label> <input id="plan-type" name="plan-type" onchange="changePlanType(this)" ${mainWindow.burnType === 'waypoint' ? 'checked' : ""} type="checkbox" style="height: 1.5em; width: 1.5em"/></div>
            <div class="context-item"><label style="cursor: pointer" for="upload-options-button">Import Scenario</label><input style="display: none;" id="upload-options-button" type="file" accept=".sas" onchange="uploadScenario()"></div>
            <div class="context-item" onclick="exportScenario()">Export Scenario</div>
            `

    }
    console.log(ctxMenu.offsetWidth);
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
            <div class="context-item" onclick="handleContextClick(this)" id="intercept-maneuver">Intercept</div>
            <div class="context-item" onclick="handleContextClick(this)" id="sun-maneuver">Gain Sun</div>
        `
    }
    else if (button.id === 'waypoint-maneuver') {
        button.parentElement.innerHTML = `
            <div class="context-item" >Target: (<input type="Number" style="width: 3em; font-size: 1em">, <input type="Number" style="width: 3em; font-size: 1em">, <input type="Number" style="width: 3em; font-size: 1em">) km</div>
            <div class="context-item" >TOF: <input type="Number" style="width: 3em; font-size: 1em"> hrs</div>
            <div class="context-item" onclick="handleContextClick(this)" id="execute-waypoint">Execute</div>
        `
    }
    else if (button.id === 'execute-waypoint') {
        let inputs = button.parentElement.getElementsByTagName('input');
        let bad = false;
        for (let ii = 0; ii < inputs.length; ii++) {
            if (inputs[ii].value === '' || (ii === 3 && inputs[ii].value < 0)) {
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
        mainWindow.satellites[sat].burns.push({
            time: mainWindow.desired.scenarioTime,
            direction: {
                r: 0,
                i: 0,
                c: 0
            },
            waypoint: {
                tranTime: Number(inputs[3].value) * 3600,
                target: {
                    r: Number(inputs[0].value),
                    i: Number(inputs[1].value),
                    c: Number(inputs[2].value),
                }
            }
        })
        mainWindow.satellites[sat].genBurns();
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
        document.getElementById('context-menu')?.remove();
    }
    else if (button.id === 'sun-maneuver') {
        let innerString = '';
        for (let ii = 0; ii < mainWindow.satellites.length; ii++) {
            if (ii === button.parentElement.sat) continue;
            innerString += `<div onclick="handleContextClick(this)" class="context-item" id="execute-sun" sat="${ii}">${mainWindow.satellites[ii].name}</div>`
        }
        innerString += `<div class="context-item" >Distance: <input type="Number" style="width: 3em; font-size: 1em"> km</div>`;
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
        let tof = Number(inputs[1].value) * 3600;
        let range = Number(inputs[0].value);
        let sun = math.dotMultiply(range, mainWindow.getCurrentSun(mainWindow.desired.scenarioTime + tof));
        console.log(sun);
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
                    r: target.r[0] + sun[0],
                    i: target.i[0] + sun[1],
                    c: target.c[0] + sun[2],
                }
            }
        })
        mainWindow.satellites[chaserSat].genBurns();
        document.getElementById('context-menu')?.remove();
    }
}

function changePlanType(box) {
    mainWindow.burnType = box.checked ? 'waypoint' : 'manual';
}
document.getElementById('main-plot').addEventListener('mousedown', event => {
    // Close context menu if open
    if (event.button !== 2) document.getElementById('context-menu')?.remove();
    else return;
    // Check if clicked on time
    if (event.clientX < 450 && (mainWindow.getHeight() - event.clientY) < (mainWindow.getHeight() * 0.06)) {
        let newTime = Number(prompt('Enter scenario time in hours past start:'))
        if (newTime && newTime < mainWindow.scenarioLength && newTime > 0) {
            mainWindow.desired.scenarioTime = newTime * 3600;
            mainWindow.scenarioTime = newTime * 3600;
            document.getElementById('time-slider-range').value = newTime * 3600;
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
            if (mainWindow.burnType === 'waypoint' && mainWindow.currentTarget.frame === 'ri') {
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
document.getElementById('data-button').addEventListener('click', () => {
    if (mainWindow.satellites.length < 2) {
        return;
    }
    document.getElementById('options-panel').classList.toggle("hidden")
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
})
document.getElementById('confirm-option-button').addEventListener('click', (click) => {
    let el = click.target;
    el = el.parentNode.parentNode;
    let inputs = el.getElementsByTagName('input');
    let date = inputs[0].value;
    let sun = inputs[3].value;
    mainWindow.mm = Math.sqrt(398600.4418 / Math.pow(Number(inputs[2].value), 3));
    mainWindow.scenarioLength = Number(inputs[1].value);
    document.getElementById('time-slider-range').max = mainWindow.scenarioLength * 3600;
    // let repeat = inputs[9].checked;
    mainWindow.timeDelta = mainWindow.scenarioLength * 3600 / Number( inputs[10].value);
    mainWindow.satellites.forEach(sat => {
        sat.genBurns();
        sat.calcTraj();
    });
    // encoder.setRepeat(repeat ? 0 : 1);
    sunIR = -Number(sun.substring(0, 2)) * 3600 + Number(sun.substring(2, 4)) / 86400 * 2 * Math.PI;
    sunC = Number(inputs[4].value) * Math.PI / 180;
    mainWindow.setInitSun([-Math.cos(sunIR) * Math.cos(sunC), Math.sin(sunIR) * Math.cos(sunC), Math.sin(sunC)]);
    mainWindow.startDate = new Date(date);
    // mainWindow.nameFont = Number(inputs[11].value) / 100;
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
        // mainWindow = JSON.parse(JSON.stringify(textFromFileLoaded));
        mainWindow.loadDate(textFromFileLoaded);
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
        mainWindow.startDate = new Date(text.shift())
    }
    if (text[0] === "") text.shift();
    if (text[text.length - 1] === "") text.pop();
    if (text.length > 9) {
        mainWindow.mm = Math.sqrt(398600.4418 / (Number(text.pop() ** 3)));
        mainWindow.scenarioLength = 2 * Math.PI / mainWindow.mm / 3600 * 2;
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
        selectEl.parentNode.parentNode.getElementsByTagName('input')[2].value = `Sat-${mainWindow.satellites.length+1}`;
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

function getSatCurrentPosition(options = {}) {
    let {
        time = mainWindow.scenarioTime, burnStop, position = this.position, burns = this.burns, a = this.a, log = false
    } = options
    if (burnStop === undefined) burnStop = burns.length;
    if (mainWindow.showFinite) {
        let t_prop = 0,
            phi, t_burn, alpha, phi_angle, n = mainWindow.mm;
        let pos = [
            [position.r],
            [position.i],
            [position.c],
            [position.rd],
            [position.id],
            [position.cd]
        ];
        for (let n_burn = 0; n_burn < burns.length; n_burn++) {
            if (time <= burns[n_burn].time) break;
            pos = math.multiply(phiMatrixWhole(burns[n_burn].time - t_prop), pos);
            t_prop = burns[n_burn].time;
            t_burn = burnStop <= n_burn ? 0 : math.norm([burns[n_burn].direction.r, burns[n_burn].direction.i,
                burns[n_burn].direction
                .c
            ]) / a;

            if (n_burn !== burns.length - 1) {
                t_burn = t_burn > (burns[n_burn + 1].time - burns[n_burn].time) ? burns[n_burn + 1].time - burns[n_burn].time : t_burn;
            }
            alpha = math.atan2(burns[n_burn].direction.i, burns[n_burn].direction.r);
            phi_angle = math.atan2(burns[n_burn].direction.c, math.norm([burns[n_burn].direction.r, burns[
                n_burn].direction.i]));
            if ((t_prop + t_burn) > time) {
                t_burn = time - t_prop;
                return {
                    r: [radialPosClosed(pos[0][0], pos[3][0], pos[4][0], a, alpha, phi_angle,
                        t_burn, n)],
                    i: [intrackPosClosed(pos[0][0], pos[3][0], pos[1][0], pos[4][0], a,
                        alpha, phi_angle, t_burn, n)],
                    c: [crosstrackPosClosed(pos[2][0], pos[5][0], a, phi_angle, t_burn, n)],
                    rd: [radialVelClosed(pos[0][0], pos[3][0], pos[4][0], a, alpha, phi_angle,
                        t_burn, n)],
                    id: [intrackVelClosed(pos[0][0], pos[3][0], pos[4][0], a, alpha, phi_angle,
                        t_burn, n)],
                    cd: [crosstrackVelClosed(pos[2][0], pos[5][0], a, phi_angle, t_burn, n)]
                }
            }
            pos = [
                [radialPosClosed(pos[0][0], pos[3][0], pos[4][0], a, alpha, phi_angle,
                    t_burn, n)],
                [intrackPosClosed(pos[0][0], pos[3][0], pos[1][0], pos[4][0], a, alpha,
                    phi_angle, t_burn, n)],
                [crosstrackPosClosed(pos[2][0], pos[5][0], a, phi_angle, t_burn, n)],
                [radialVelClosed(pos[0][0], pos[3][0], pos[4][0], a, alpha, phi_angle,
                    t_burn, n)],
                [intrackVelClosed(pos[0][0], pos[3][0], pos[4][0], a, alpha, phi_angle,
                    t_burn, n)],
                [crosstrackVelClosed(pos[2][0], pos[5][0], a, phi_angle, t_burn, n)]
            ];
            t_prop += t_burn;
        }
        phi = phiMatrixWhole(time - t_prop);
        pos = math.multiply(phi, pos);
        return {
            r: pos[0],
            i: pos[1],
            c: pos[2],
            rd: pos[3],
            id: pos[4],
            cd: pos[5]
        };
    }
    let r = [
            [position.r],
            [position.i],
            [position.c]
        ],
        r1, phi;
    let v = [
        [position.rd],
        [position.id],
        [position.cd]
    ];
    let timeProp = 0;
    for (let ii = 0; ii < burns.length; ii++) {
        if (burns[ii].time <= time) {
            phi = phiMatrix(burns[ii].time - timeProp);
            r1 = math.add(math.multiply(phi.rr, r), math.multiply(phi.rv, v));
            v = math.add(math.multiply(phi.vr, r), math.multiply(phi.vv, v));
            r = r1;
            v[0][0] += burnStop <= ii ? 0 : burnStop <= ii ? 0 : burns[ii].direction.r;
            v[1][0] += burnStop <= ii ? 0 : burns[ii].direction.i;
            v[2][0] += burnStop <= ii ? 0 : burns[ii].direction.c;
            timeProp = burns[ii].time;
        } else {
            break;
        }
    }
    phi = phiMatrix(time - timeProp);
    r1 = math.add(math.multiply(phi.rr, r), math.multiply(phi.rv, v));
    v = math.add(math.multiply(phi.vr, r), math.multiply(phi.vv, v));
    r = r1;
    return {
        r: r[0],
        i: r[1],
        c: r[2],
        rd: v[0],
        id: v[1],
        cd: v[2]
    };
}

function calcSatShownTrajectories(allBurns = false) {
    let t_calc, currentState, satBurn;
    phiMain = phiMatrixWhole(mainWindow.timeDelta);
    this.stateHistory = [];
    t_calc = 0;
    currentState = [
        [this.position.r],
        [this.position.i],
        [this.position.c],
        [this.position.rd],
        [this.position.id],
        [this.position.cd]
    ];
    satBurn = this.burns.length > 0 ? 0 : undefined;
    this.burnsDrawn = 0;
    while (t_calc <= mainWindow.scenarioLength * 3600) {
        this.stateHistory.push({
            r: currentState[0][0],
            i: currentState[1][0],
            c: currentState[2][0]
        });
        if (satBurn !== undefined) {
            if ((this.burns[satBurn].time - t_calc) <= mainWindow.timeDelta && (this.burns[satBurn].time <=
                (mainWindow.scenarioTime + 0.5) || allBurns)) {
                let t_burn = math.norm([this.burns[satBurn].direction.r, this.burns[satBurn]
                    .direction.i, this.burns[satBurn].direction.c
                ]) / this.a;
                if (satBurn !== this.burns.length - 1) {
                    t_burn = t_burn > (this.burns[satBurn + 1].time - this.burns[satBurn].time) ? this.burns[satBurn + 1].time - this.burns[satBurn].time : t_burn;
                } 
                t_burn = ((mainWindow.scenarioTime - this.burns[satBurn].time) < t_burn) && !allBurns ? (mainWindow.scenarioTime - this.burns[satBurn].time) : t_burn;
                let position_start = math.multiply(phiMatrixWhole(this.burns[satBurn].time -
                    t_calc), currentState);
                let position_finite;
                let n = mainWindow.mm;
                let alpha = math.atan2(this.burns[satBurn].direction.i, this.burns[satBurn]
                    .direction.r);
                let phi_angle = math.atan2(this.burns[satBurn].direction.c, math.norm([this
                    .burns[satBurn].direction.r, this.burns[satBurn].direction.i
                ]));
                while ((this.burns[satBurn].time + t_burn - t_calc) > mainWindow.timeDelta) {
                    t_calc += mainWindow.timeDelta;
                    position_finite = {
                        r: radialPosClosed(position_start[0][0], position_start[3][0],
                            position_start[4][0], this.a, alpha, phi_angle, t_calc -
                            this.burns[satBurn].time, n),
                        i: intrackPosClosed(position_start[0][0], position_start[3][0],
                            position_start[1][0], position_start[4][0], this.a,
                            alpha, phi_angle, t_calc - this.burns[satBurn].time, n),
                        c: crosstrackPosClosed(position_start[2][0], position_start[5][
                                0
                            ], this.a, phi_angle, t_calc - this.burns[satBurn]
                            .time, n)
                    }
                    this.stateHistory.push(position_finite);
                }
                t_calc += mainWindow.timeDelta;
                currentState = [
                    [radialPosClosed(position_start[0][0], position_start[3][0],
                        position_start[4][0], this.a, alpha, phi_angle, t_burn, n)],
                    [intrackPosClosed(position_start[0][0], position_start[3][0],
                        position_start[1][0], position_start[4][0], this.a, alpha,
                        phi_angle, t_burn, n)],
                    [crosstrackPosClosed(position_start[2][0], position_start[5][0], this
                        .a, phi_angle, t_burn, n)],
                    [radialVelClosed(position_start[0][0], position_start[3][0],
                        position_start[4][0], this.a, alpha, phi_angle, t_burn, n)],
                    [intrackVelClosed(position_start[0][0], position_start[3][0],
                        position_start[4][0], this.a, alpha, phi_angle, t_burn, n)],
                    [crosstrackVelClosed(position_start[2][0], position_start[5][0], this
                        .a, phi_angle, t_burn, n)]
                ];
                currentState = math.multiply(phiMatrixWhole(t_calc - this.burns[satBurn]
                    .time - t_burn), currentState);
                satBurn = this.burns.length === satBurn + 1 ? undefined : satBurn + 1;
                continue;
            }
        }
        currentState = math.multiply(phiMain, currentState);
        t_calc += mainWindow.timeDelta;
    }
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

function hcwFiniteBurnOneBurn(stateInit, stateFinal, tf, a0, n = mainWindow.mm) {
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
        yErr, S, dX = 1,
        F;
    let dv1 = math.subtract(v1, state.slice(3, 6));
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
            F: oneBurnFiniteHcw(stateInit, Xret[0][0], Xret[1][0], Xret[2][0], tf, a0, n)
        }
    }
    let X = Xret.slice();
    if (X[2] > 1) {
        return false;
    }
    let errCount = 0, sInv;
    while (math.norm(math.squeeze(dX)) > 1e-6) {
        F = oneBurnFiniteHcw(stateInit, X[0][0], X[1][0], X[2][0], tf, a0, n);
        yErr = [
            [stateFinal[0][0] - F.x],
            [stateFinal[1][0] - F.y],
            [stateFinal[2][0] - F.z]
        ];
        S = proxOpsJacobianOneBurn(stateInit, a0, X[0][0], X[1][0], X[2][0], tf, n);
        // sInv = math.multiply(math.transpose(S), math.inv(math.multiply(S, math.transpose(S))));
        // dX = math.multiply(sInv, yErr);
        dX = math.multiply(math.inv(S), yErr);
        // console.log(X,F)
        X = math.add(X, dX)
        if (errCount > 30) {
            // console.log(X)
            return false;
        }
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

function oneBurnFiniteHcw(state, alpha, phi, tB, t, a0 = 0.00001, n = mainWindow.mm) {
    x0 = state.x;
    xd0 = state.xd;
    y0 = state.y;
    yd0 = state.yd;
    z0 = state.z;
    zd0 = state.zd;
    // console.log(x0,y0,z0)
    let xM = radialPosClosed(x0, xd0, yd0, a0, alpha, phi, tB * t, n);
    let xdM = radialVelClosed(x0, xd0, yd0, a0, alpha, phi, tB * t, n);
    let yM = intrackPosClosed(x0, xd0, y0, yd0, a0, alpha, phi, tB * t, n);
    let ydM = intrackVelClosed(x0, xd0, yd0, a0, alpha, phi, tB * t, n);
    let zM = crosstrackPosClosed(z0, zd0, a0, phi, tB * t, n);
    let zdM = crosstrackVelClosed(z0, zd0, a0, phi, tB * t, n);
    let xF = radialPosClosed(xM, xdM, ydM, 0, 0, 0, t - tB * t, n);
    let xdF = radialVelClosed(xM, xdM, ydM, 0, 0, 0, t - tB * t, n);
    let yF = intrackPosClosed(xM, xdM, yM, ydM, 0, 0, 0, t - tB * t, n);
    let ydF = intrackVelClosed(xM, xdM, ydM, 0, 0, 0, t - tB * t, n);
    let zF = crosstrackPosClosed(zM, zdM, 0, 0, t - tB * t, n);
    let zdF = crosstrackVelClosed(zM, zdM, 0, 0, t - tB * t, n);
    return {
        x: xF,
        y: yF,
        z: zF,
        xd: xdF,
        yd: ydF,
        zd: zdF
    };

}

function proxOpsJacobianOneBurn(state, a, alpha, phi, tB, tF, n) {
    let m1, m2, mC, mFinal = [];
    //alpha
    let phi2 = math.abs(Math.cos(phi)) < 1e-6 ? 89 * Math.PI / 180 : phi;
    m1 = oneBurnFiniteHcw(state, alpha, phi2, tB, tF, a, n);
    m1 = [
        [m1.x],
        [m1.y],
        [m1.z]
    ];
    m2 = oneBurnFiniteHcw(state, alpha + 0.01, phi2, tB, tF, a, n);
    m2 = [
        [m2.x],
        [m2.y],
        [m2.z]
    ];
    mC = math.dotDivide(math.subtract(m2, m1), 0.01);
    mFinal = mC;
    //phi
    m1 = oneBurnFiniteHcw(state, alpha, phi, tB, tF, a, n);
    m1 = [
        [m1.x],
        [m1.y],
        [m1.z]
    ];
    m2 = oneBurnFiniteHcw(state, alpha, phi + 0.01, tB, tF, a, n);
    m2 = [
        [m2.x],
        [m2.y],
        [m2.z]
    ];
    m = math.dotDivide(math.subtract(m2, m1), 0.01);
    mC = math.concat(mC, m);
    //tB
    m1 = oneBurnFiniteHcw(state, alpha, phi, tB, tF, a, n);
    m1 = [
        [m1.x],
        [m1.y],
        [m1.z]
    ];
    m2 = oneBurnFiniteHcw(state, alpha, phi, tB + 0.01, tF, a, n);
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
    angle *= Math.PI / 180;
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
    let r1, r2, v10;
    for (let ii = 0; ii < this.burns.length; ii++) {
        r1 = this.currentPosition({
            time: this.burns[ii].time,
            burnStop: ii
        });
        this.burns[ii].location = {...r1};
        v10 = [r1.rd, r1.id, r1.cd];
        r1 = [r1.r, r1.i, r1.c]
        r2 = [
            [this.burns[ii].waypoint.target.r],
            [this.burns[ii].waypoint.target.i],
            [this.burns[ii].waypoint.target.c]
        ];
        let dir = hcwFiniteBurnOneBurn({
            x: r1[0][0],
            y: r1[1][0],
            z: r1[2][0],
            xd: v10[0][0],
            yd: v10[1][0],
            zd: v10[2][0]
        }, {
            x: r2[0][0],
            y: r2[1][0],
            z: r2[2][0],
            xd: 0,
            yd: 0,
            zd: 0
        }, this.burns[ii].waypoint.tranTime, this.a);
        if (dir && dir.t > 0 && dir.t < 1) {
            this.burns[ii].direction.r = dir.r;
            this.burns[ii].direction.i = dir.i;
            this.burns[ii].direction.c = dir.c;
        }
    }

    this.calcTraj(true);
}

function calcBurns() {
    let cross = this.burnStatus.frame === 'ri' ? false : true;
    let sat = this.satellites[this.burnStatus.sat];
    if (!this.mousePosition) return;
    let mousePosition = this.convertToRic(this.mousePosition);
    if (!this.mousePosition || !mousePosition || !mousePosition[this.burnStatus.frame]) return;
    let crossState = sat.currentPosition({
        time: sat.burns[this.burnStatus.burn].time + sat.burns[this.burnStatus.burn].waypoint.tranTime
    })
    if (mainWindow.burnStatus.type === 'waypoint' && !cross) {
        sat.burns[this.burnStatus.burn].waypoint.target = {
            r: mousePosition[this.burnStatus.frame].r,
            i: mousePosition[this.burnStatus.frame].i,
            c: crossState.c[0]
        }
    } else {
        sat.burns[this.burnStatus.burn].direction = {
            r: cross ? sat.burns[this.burnStatus.burn].direction.r : (mousePosition[this.burnStatus.frame].r - sat.burns[this.burnStatus.burn].location.r[0]) * mainWindow.burnSensitivity / 1000,
            i: cross ? sat.burns[this.burnStatus.burn].direction.i : (mousePosition[this.burnStatus.frame].i - sat.burns[this.burnStatus.burn].location.i[0]) * mainWindow.burnSensitivity / 1000,
            c: cross ? (mousePosition[this.burnStatus.frame].c - sat.burns[this.burnStatus.burn].location.c[0]) *
                mainWindow.burnSensitivity / 1000 : sat.burns[this.burnStatus.burn].direction.c
        }
        let tranTime = 1.5*math.norm([sat.burns[this.burnStatus.burn].direction.r, sat.burns[this.burnStatus.burn].direction.i, sat.burns[this.burnStatus.burn].direction.c]) / sat.a;
        tranTime = tranTime < 10800 ? 10800 : tranTime;
        tranTime = cross ? sat.burns[this.burnStatus.burn].waypoint.tranTime : tranTime; 
        // If burn time is longer than 6 hrs (times 1.5), limit burn
        if (tranTime > 32400) {
            tranTime = 32400;
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
        let targetState = sat.currentPosition({
            time: sat.burns[this.burnStatus.burn].time + tranTime,
            burnStop: this.burnStatus.burn + 1
        });
        sat.burns[this.burnStatus.burn].waypoint.target = {
            r: cross ? sat.burns[this.burnStatus.burn].waypoint.target.r : targetState.r[0],
            i: cross ? sat.burns[this.burnStatus.burn].waypoint.target.i : targetState.i[0],
            c: targetState.c[0]
        }
        if (true) {
            // Reset cross-track waypoint values in future to natural motion
            for (let hh = this.burnStatus.burn + 1; hh < sat.burns.length; hh++) {
                targetState = sat.currentPosition({
                    time: sat.burns[hh].time + sat.burns[hh].waypoint.tranTime,
                    burnStop: this.burnStatus.burn + 1
                });
                sat.burns[hh].waypoint.target.c = targetState.c[0];
            }
        }
    }
    // Draw burn 
    let mag = math.norm([sat.burns[this.burnStatus.burn].direction.r, sat.burns[this.burnStatus.burn].direction.i, sat.burns[this.burnStatus.burn].direction.c])
    let initPos = this.convertToPixels(sat.burns[this.burnStatus.burn].location)[this.burnStatus.frame];
    let ctx = this.getContext();
    ctx.strokeStyle = sat.color;
    ctx.beginPath();
    ctx.moveTo(initPos.x, initPos.y);
    let dist = mag * 1000 / this.burnSensitivity;
    let point2 = {r: sat.burns[this.burnStatus.burn].location.r[0] + dist * sat.burns[this.burnStatus.burn].direction.r / mag, i: sat.burns[this.burnStatus.burn].location.i[0] + dist * sat.burns[this.burnStatus.burn].direction.i / mag, c: sat.burns[this.burnStatus.burn].location.c[0] + dist * sat.burns[this.burnStatus.burn].direction.c / mag}
    let finalPos = this.convertToPixels(point2)[this.burnStatus.frame];
    ctx.lineTo(finalPos.x, finalPos.y);
    ctx.stroke();
    let mag2 = math.norm([finalPos.x - initPos.x, finalPos.y - initPos.y]);
    
    ctx.fillText((1000*mag).toFixed(1) + ' m/s', -60 *(finalPos.x - initPos.x) / mag2 + initPos.x, -60*(finalPos.y - initPos.y) / mag2 + initPos.y)
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
    let r1, r2, v, addedElement;
    for (let burn = 0; burn < mainWindow.satellites[object].burns.length; burn++) {
        addedElement = document.createElement('tr');
        addedElement.innerHTML = `
            <td>${new Date(mainWindow.startDate.getTime() + mainWindow.satellites[object].burns[burn].time * 1000).toString()
        .split(' GMT')[0].substring(4)}</td>
            <td><span>(${(mainWindow.satellites[object].burns[burn].waypoint.target.r).toFixed(3)}, ${(mainWindow.satellites[object].burns[burn].waypoint.target.i).toFixed(3)}, ${(mainWindow.satellites[object].burns[burn].waypoint.target.c).toFixed(3)})</span></td>
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
        nodes.children[1].children[0].getElementsByTagName('input')[0].value = (-rmoes.ae / 2 * Math.cos(rmoes.b * Math.PI / 180) + rmoes.x).toFixed(3);
        nodes.children[1].children[1].getElementsByTagName('input')[0].value = (rmoes.ae * Math.sin(rmoes.b * Math.PI / 180) + rmoes.y).toFixed(3);
        nodes.children[1].children[2].getElementsByTagName('input')[0].value = (rmoes.z * Math.sin(rmoes.m * Math.PI / 180)).toFixed(3);
        nodes.children[1].children[3].getElementsByTagName('input')[0].value = (1000 * rmoes.ae * mainWindow.mm / 2 * Math.sin(rmoes.b * Math.PI / 180)).toFixed(3);
        nodes.children[1].children[4].getElementsByTagName('input')[0].value = (1000 * rmoes.ae * mainWindow.mm * Math.cos(rmoes.b * Math.PI / 180) - 1500 * rmoes.x * mainWindow.mm).toFixed(3);
        nodes.children[1].children[5].getElementsByTagName('input')[0].value = (1000 * rmoes.z * mainWindow.mm * Math.cos(rmoes.m * Math.PI / 180)).toFixed(3);
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
        let name = inputs[16].value;
        mainWindow.satellites.push(new Satellite({
            position,
            shape,
            a,
            color,
            name
        }));
        newTitle += mainWindow.satellites[0].name;
        for (let ii = 1; ii < mainWindow.satellites.length; ii++){
            newTitle += ' / ' + mainWindow.satellites[ii].name;
        }
        document.title = newTitle;
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
    let n = mainWindow.mm;
    el = button.parentNode.parentNode.parentNode;
    let state = {
        a: Number(el.children[1].children[1].children[0].children[0].getElementsByTagName('input')[0].value),
        x: Number(el.children[1].children[1].children[0].children[1].getElementsByTagName('input')[0].value),
        y: Number(el.children[1].children[1].children[0].children[2].getElementsByTagName('input')[0].value),
        b: Number(el.children[1].children[1].children[0].children[3].getElementsByTagName('input')[0].value) * Math
            .PI / 180,
        m: Number(el.children[1].children[1].children[0].children[5].getElementsByTagName('input')[0].value) * Math
            .PI / 180,
        z: Number(el.children[1].children[1].children[0].children[4].getElementsByTagName('input')[0].value)
    };
    let color = mainWindow.satellites[button.nextSibling.selectedIndex].color;
    let name = mainWindow.satellites[button.nextSibling.selectedIndex].name;
    let shape = mainWindow.satellites[button.nextSibling.selectedIndex].shape;
    let a = mainWindow.satellites[button.nextSibling.selectedIndex].a;
    state = {
        r: -state.a / 2 * Math.cos(state.b) + state.x,
        i: state.a * Math.sin(state.b) + state.y,
        c: state.z * Math.sin(state.m),
        rd: state.a * n / 2 * Math.sin(state.b),
        id: state.a * n * Math.cos(state.b) - 1.5 * state.x * n,
        cd: state.z * n * Math.cos(state.m),
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
    closeAll();
}

function drawPoints(options = {}) {
    let {
        color,
        points,
        borderWidth = 2,
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
    let shapeHeight = size / 100 * cnvs.height;
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
    let letterY = pixelPosition[1] + shapeHeight / 2 + (cnvs.height*0.025)*1.3 / 2;
    ctx.font = `${cnvs.height*0.025}px Courier`;
    ctx.fillText(name ? name : '', pixelPosition[0], letterY);
}

function getRelativeData(n_target, n_origin) {
    let sunAngle, rangeRate, range, poca, toca, tanRate;
    let relPos = math.squeeze(math.subtract(mainWindow.satellites[n_origin].getPositionArray(), mainWindow.satellites[n_target]
        .getPositionArray()));
    let relVel = math.squeeze(math.subtract(mainWindow.satellites[n_origin].getVelocityArray(), mainWindow.satellites[n_target]
        .getVelocityArray()));
    range = math.norm(relPos);
    sunAngle = math.squeeze(math.multiply(rotationMatrices(-mainWindow.scenarioTime * mainWindow.mm * 180 / Math.PI, 3), math.transpose([mainWindow.getInitSun()])));
    sunAngle = math.acos(math.dot(relPos, sunAngle) / range / math.norm(sunAngle)) * 180 / Math.PI;
    sunAngle = 180 - sunAngle; // Appropriate for USSF
    rangeRate = math.dot(relVel, relPos) * 1000 / range;
    tanRate = Math.sqrt(Math.pow(math.norm(relVel), 2) - Math.pow(rangeRate, 2)) * 1000;
    // console.log(mainWindow.satellites[n_origin], mainWindow.satellites[n_target]);
    let relPosHis = findMinDistance(mainWindow.satellites[n_origin].stateHistory, mainWindow.satellites[n_target].stateHistory);
    poca = math.min(findMinDistance(mainWindow.satellites[n_origin].stateHistory, mainWindow.satellites[n_target].stateHistory));
    toca = relPosHis.findIndex(element => element === poca);
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
    for (let jj = 0; jj < vector1.length; jj++) {
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