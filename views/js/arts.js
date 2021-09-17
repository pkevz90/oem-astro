class windowCanvas {
    #cnvs;
    #plotWidth = 200;
    #plotHeight;
    #plotCenter = 0;
    #frameCenter= {
        ri: {x: 0.5, y: 0.5, w: 1, h: 1},
        ci: {x: 0.5, y: 1, w: 0, h: 0},
        rc: {x: 0, y: 0.5, w: 0, h: 0}
    }
    #state = 'ri';
    constructor(cnvs) {
        this.#cnvs = cnvs;
    }
    getWidth() {
        return this.#cnvs.width;
    }
    getHeight() {
        return this.#cnvs.height;
    }
    getContext() {
        return this.#cnvs.getContext('2d');
    }
    clear() {
        let ctx = this.getContext();
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, this.#cnvs.width, this.#cnvs.height);
    }
    getRatio() {
        return this.#cnvs.height / this.#cnvs.width;
    }
    setPlotWidth(width) {
        this.#plotWidth = width;
        this.#plotHeight = width * this.getRatio();
    }
    setPlotCenter(center) {
        this.#plotCenter = center;
    }
    setFrameCenter(options) {
        let {ri = this.#frameCenter.ri, ci = this.#frameCenter.ci, rc = this.#frameCenter.rc} = options;
        this.#frameCenter = {
            ri, ci, rc
        }
    }
    setSize(width, height) {
        this.#cnvs.width = width;
        this.#cnvs.height = height;
    }
    setState(state) {
        this.#state = state;
    }
    fillWindow() {
        this.setSize(window.innerWidth, window.innerHeight);
        this.setPlotWidth(this.#plotWidth);
    }
    convertToPixels(input = [0, 0, 0, 0, 0, 0], cross = false) {
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
                x: (input.i - this.#plotCenter) * this.#cnvs.width * this.#frameCenter.ri.w / this.#plotWidth + this.#cnvs.width * this.#frameCenter.ri.x,
                y: this.#cnvs.height * this.#frameCenter.ri.y - input.r * this.#cnvs.height * this.#frameCenter.ri.h / this.#plotHeight
            },
            ci: {
                x: (input.i - this.#plotCenter) * this.#cnvs.width * this.#frameCenter.ci.w / this.#plotWidth + this.#cnvs.width * this.#frameCenter.ci.x,
                y: this.#cnvs.height * this.#frameCenter.ci.y - input.c * this.#cnvs.height * this.#frameCenter.ci.h / this.#plotHeight
            },
            rc: {
                x: (input.c - this.#plotCenter) * this.#cnvs.width * this.#frameCenter.rc.w / this.#plotWidth + this.#cnvs.width * this.#frameCenter.rc.x,
                y: this.#cnvs.height * this.#frameCenter.rc.y - input.r * this.#cnvs.height * this.#frameCenter.rc.h / this.#plotHeight
            }
        }
    }
    drawAxes() {
        let ctx = this.getContext();
        ctx.strokeStyle = 'black';
        ctx.lineWidth = this.#cnvs.width / 200;
        let axesLength = 0.5;
        let origin = this.convertToPixels([0, 0, 0]);
        if (this.#state.search('ri') !== -1) {
                ctx.beginPath()
                ctx.moveTo(origin.ri.x, origin.ri.y);
                ctx.lineTo(origin.ri.x, origin.ri.y - this.#cnvs.height * axesLength * this.#frameCenter.ri.h / 2);
                ctx.moveTo(origin.ri.x - this.#cnvs.width / 400, origin.ri.y)
                ctx.lineTo(origin.ri.x + this.#cnvs.height * axesLength * this.#frameCenter.ri.h / 2, origin.ri.y);
                ctx.stroke();
        }
        if (this.#state.search('ci') !== -1) {
            ctx.beginPath()
            ctx.moveTo(origin.ci.x, origin.ci.y);
            ctx.lineTo(origin.ci.x, origin.ci.y - this.#cnvs.height * axesLength * this.#frameCenter.ci.h / 2);
            ctx.moveTo(origin.ci.x - this.#cnvs.width / 400, origin.ci.y)
            ctx.lineTo(origin.ci.x + this.#cnvs.height * axesLength * this.#frameCenter.ci.h / 2, origin.ci.y);
            ctx.stroke();
        }
        if (this.#state.search('rc') !== -1) {
            ctx.beginPath()
            ctx.moveTo(origin.rc.x, origin.rc.y);
            ctx.lineTo(origin.rc.x, origin.rc.y - this.#cnvs.height * axesLength * this.#frameCenter.rc.h / 2);
            ctx.moveTo(origin.rc.x - this.#cnvs.width / 400, origin.rc.y)
            ctx.lineTo(origin.rc.x + this.#cnvs.height * axesLength * this.#frameCenter.rc.h / 2, origin.rc.y);
            ctx.stroke();
        }
    }
}

let mainWindow = new windowCanvas(document.getElementById('main-plot'));
mainWindow.fillWindow();