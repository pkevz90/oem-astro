class windowCanvas {
    #cnvs;
    #plotWidth = 200;
    #plotHeight;
    #plotCenter = 0;
    #frameCenter= {
        ri: {x: 0.5, y: 0.5, w: 1, h: 1},
        ci: {x: 0.5, y: 1, w: 0, h: 0},
        rc: {x: 0, y: 0.5, w: 0, h: 0},
        desired: {
            ri: {x: 0.5, y: 0.5, w: 1, h: 1},
            ci: {x: 1, y: 1, w: 0, h: 0},
            rc: {x: 0, y: 1, w: 0, h: 0},
        },
        speed: 0.1
    };
    #initSun = [1, 0, 0.2];
    #desired = {
        scenario_time: 0
    };
    mm = 2 * Math.PI / 86164;
    timeDelta = 400;
    scenario_length = 48;
    scenario_time = 0;
    #state = 'ri';
    burnStatus = true;
    showFinite = true;
    currentTarget = false;
    satellites = [];
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
    getState() {
        return this.#state;
    }
    getCurrentSun() {
        return math.squeeze(math.multiply(rotationMatrices(-this.scenario_time * this.mm * 180 / Math.PI, 3), math.transpose([this.#initSun])));
    }
    setPlotWidth(width) {
        this.#plotWidth = width;
        this.#plotHeight = width * this.getRatio();
    }
    setAxisWidth(type = 'set', width) {
        if (type === 'set') {
            this.#plotWidth = width;
        }
        else if (type === 'increase') {
            this.#plotWidth *= 1.05;
        }
        else if (type === 'decrease') {
            this.#plotWidth /= 1.05;
        }
        this.#plotHeight = this.#plotWidth * this.getRatio();
    }
    setPlotCenter(center) {
        this.#plotCenter = center;
    }
    setFrameCenter(options) {
        let {ri = this.#frameCenter.ri, ci = this.#frameCenter.ci, rc = this.#frameCenter.rc} = options;
        this.#frameCenter.desired = {
            ri, ci, rc
        }
    }
    updateSettings() {
        for (const frame in this.#frameCenter.desired) {
            this.#frameCenter[frame].x += (this.#frameCenter.desired[frame].x - this.#frameCenter[frame].x) * this.#frameCenter.speed;
            this.#frameCenter[frame].y += (this.#frameCenter.desired[frame].y - this.#frameCenter[frame].y) * this.#frameCenter.speed;
            this.#frameCenter[frame].h += (this.#frameCenter.desired[frame].h - this.#frameCenter[frame].h) * this.#frameCenter.speed;
            this.#frameCenter[frame].w += (this.#frameCenter.desired[frame].w - this.#frameCenter[frame].w) * this.#frameCenter.speed;
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
    convertToRic(input = [0, 0]) {
        if (Array.isArray(input)) {
            input = math.squeeze(input);
            input = {
                x:  input[0],
                y:  input[1]
            };
        }
        return{
            ri: {
                i: -(input.x - this.#cnvs.width * this.#frameCenter.ri.x) * this.#plotWidth / this.#cnvs.width + this.#plotCenter,
                r: -(input.y - this.#cnvs.height * this.#frameCenter.ri.y) * this.#plotHeight/ this.#cnvs.height
            },
            ci: {
                i: -(input.x - this.#cnvs.width * this.#frameCenter.ci.x) * this.#plotWidth / this.#cnvs.width + this.#plotCenter,
                c: -(input.y - this.#cnvs.height * this.#frameCenter.ci.y) * this.#plotHeight/ this.#cnvs.height
            },
            rc: {
                r: (input.x - this.#cnvs.width * this.#frameCenter.rc.x) * this.#plotWidth / this.#cnvs.width + this.#plotCenter,
                c: -(input.y - this.#cnvs.height * this.#frameCenter.rc.y) * this.#plotHeight/ this.#cnvs.height
            },
        }
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
                x: -(input.i - this.#plotCenter) * this.#cnvs.width  / this.#plotWidth + this.#cnvs.width * this.#frameCenter.ri.x,
                y: this.#cnvs.height * this.#frameCenter.ri.y - input.r * this.#cnvs.height / this.#plotHeight
            },
            ci: {
                x: -(input.i - this.#plotCenter) * this.#cnvs.width / this.#plotWidth + this.#cnvs.width * this.#frameCenter.ci.x,
                y: this.#cnvs.height * this.#frameCenter.ci.y - input.c * this.#cnvs.height/ this.#plotHeight
            },
            rc: {
                x: (input.r - this.#plotCenter) * this.#cnvs.width / this.#plotWidth + this.#cnvs.width * this.#frameCenter.rc.x,
                y: this.#cnvs.height * this.#frameCenter.rc.y - input.c * this.#cnvs.height / this.#plotHeight
            }
        }
    }
    drawAxes() {
        let ctx = this.getContext();
        ctx.strokeStyle = 'black';
        ctx.fillStyle = 'black';
        let axesLength = 0.5;
        let sunLength = 0.4 * this.#plotHeight / 2;
        let sunCoor = this.convertToPixels(math.dotMultiply(sunLength, this.getCurrentSun()));
        let origin = this.convertToPixels([0, 0, 0]);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        if (this.#state.search('ri') !== -1) {
            ctx.lineWidth = this.#cnvs.width * this.#frameCenter.ri.w / 200;
            ctx.font = 'bold ' + this.#cnvs.width * this.#frameCenter.ri.w / 40 + 'px serif';
            ctx.beginPath()
            ctx.moveTo(origin.ri.x, origin.ri.y);
            ctx.lineTo(origin.ri.x, origin.ri.y - this.#cnvs.height * axesLength * this.#frameCenter.ri.h / 2);
            ctx.moveTo(origin.ri.x + this.#cnvs.width * this.#frameCenter.ri.w / 400, origin.ri.y)
            ctx.lineTo(origin.ri.x - this.#cnvs.height * axesLength * this.#frameCenter.ri.h / 2, origin.ri.y);
            ctx.stroke();
            ctx.strokeStyle = 'orange';
            ctx.beginPath()
            ctx.moveTo(origin.ri.x, origin.ri.y);
            ctx.lineTo(sunCoor.ri.x, sunCoor.ri.y);
            ctx.stroke();
            ctx.strokeStyle = 'black';
            ctx.fillText('R', origin.ri.x, origin.ri.y - this.#cnvs.height * axesLength * this.#frameCenter.ri.h / 2 - this.#cnvs.width * this.#frameCenter.ri.w / 60)
            ctx.fillText('I', origin.ri.x - this.#cnvs.height * axesLength * this.#frameCenter.ri.h / 2 - this.#cnvs.width * this.#frameCenter.ri.w / 80, origin.ri.y)
        }
        if (this.#state.search('ci') !== -1) {
            ctx.lineWidth = this.#cnvs.width * this.#frameCenter.ci.w / 200;
            ctx.font = 'bold ' + this.#cnvs.width * this.#frameCenter.ci.w / 40 + 'px serif';
            ctx.beginPath()
            ctx.moveTo(origin.ci.x, origin.ci.y);
            ctx.lineTo(origin.ci.x, origin.ci.y - this.#cnvs.height * axesLength * this.#frameCenter.ci.h / 2);
            ctx.moveTo(origin.ci.x + this.#cnvs.width * this.#frameCenter.ci.w / 400, origin.ci.y)
            ctx.lineTo(origin.ci.x - this.#cnvs.height * axesLength * this.#frameCenter.ci.h / 2, origin.ci.y);
            ctx.stroke();
            ctx.strokeStyle = 'orange';
            ctx.beginPath()
            ctx.moveTo(origin.ci.x, origin.ci.y);
            ctx.lineTo(sunCoor.ci.x, sunCoor.ci.y);
            ctx.stroke();
            ctx.strokeStyle = 'black';
            ctx.fillText('C', origin.ci.x, origin.ci.y - this.#cnvs.height * axesLength * this.#frameCenter.ci.h / 2 - this.#cnvs.width * this.#frameCenter.ci.w / 60)
            ctx.fillText('I', origin.ci.x - this.#cnvs.height * axesLength * this.#frameCenter.ci.h / 2 - this.#cnvs.width * this.#frameCenter.ci.w / 80, origin.ci.y)
        }
        if (this.#state.search('rc') !== -1) {
            ctx.lineWidth = this.#cnvs.width * this.#frameCenter.rc.w / 200;
            ctx.font = 'bold ' + this.#cnvs.width * this.#frameCenter.rc.w / 40 + 'px serif';
            ctx.beginPath()
            ctx.moveTo(origin.rc.x, origin.rc.y);
            ctx.lineTo(origin.rc.x, origin.rc.y - this.#cnvs.height * axesLength * this.#frameCenter.rc.h / 2);
            ctx.moveTo(origin.rc.x - this.#cnvs.width * this.#frameCenter.rc.w / 400, origin.rc.y)
            ctx.lineTo(origin.rc.x + this.#cnvs.height * axesLength * this.#frameCenter.rc.h / 2, origin.rc.y);
            ctx.stroke();
            ctx.strokeStyle = 'orange';
            ctx.beginPath()
            ctx.moveTo(origin.rc.x, origin.rc.y);
            ctx.lineTo(sunCoor.rc.x, sunCoor.rc.y);
            ctx.stroke();
            ctx.strokeStyle = 'black';
            ctx.fillText('C', origin.rc.x, origin.rc.y - this.#cnvs.height * axesLength * this.#frameCenter.rc.h / 2 - this.#cnvs.width * this.#frameCenter.rc.w / 60)
            ctx.fillText('R', origin.rc.x + this.#cnvs.height * axesLength * this.#frameCenter.rc.h / 2 + this.#cnvs.width * this.#frameCenter.rc.w / 80, origin.rc.y)
        }
    }
    drawCurve(line, options = {}) {
        // console.log(line);
        let {color = 'red', size = 1} = options
        let ctx = this.getContext();
        ctx.fillStyle = color;
        line.forEach((point, ii) => {
            let pixelPos = this.convertToPixels(point);
            if (this.#state.search('ri') !== -1) {
                ctx.beginPath();
                ctx.arc(pixelPos.ri.x, pixelPos.ri.y, size, 0, 2 * Math.PI);
                ctx.fill()
            }
            if (this.#state.search('ci') !== -1){
                ctx.beginPath()
                ctx.arc(pixelPos.ci.x, pixelPos.ci.y, size, 0, 2 * Math.PI);
                ctx.fill();
            }
            if (this.#state.search('rc') !== -1) {
                ctx.beginPath()
                ctx.arc(pixelPos.rc.x, pixelPos.rc.y, size, 0, 2 * Math.PI);
                ctx.fill();
            }
        })
        ctx.fill();
    }
}

class Satellite {
    position;
    #currentPosition;
    #color;
    #size;
    #shape;
    burns = [];
    #a;
    name;
    stateHistory;
    constructor(options = {}) {
        let {
            position = {r: 2, i: 50, c: 10, rd: 0.001, id: 0, cd: -0.001},
            size = 0.005,
            color = 'blue',
            shape = 'square',
            a = 0.00001,
            name = 'Sat'
        } = options; 
        this.position = position;
        this.#size = size;
        this.#color = color;
        this.#shape = shape;
        this.a = a;
        this.stateHistory = this.calcTraj();
    }
    calcTraj = calcSatShownTrajectories;
    genBurns = generateBurns;
    drawTrajectory() {
        // console.log(this.#stateHistory);
        if (!this.stateHistory) return;
        mainWindow.drawCurve(this.stateHistory, {color: this.#color});
    }
    currentPosition = getSatCurrentPosition;
    drawCurrentPosition() {
        let cur = this.currentPosition();
        cur = {r: cur.r[0], i: cur.i[0], c: cur.c[0], rd: cur.rd[0], id: cur.id[0], cd: cur.cd[0]};
        this.#currentPosition = cur;
        mainWindow.drawCurve([cur], {size: 5, color: this.#color});
    }
    checkClickProximity(position) {
        // Check if clicked on current position of object
        return {
            ri: math.norm([this.#currentPosition.r - position.ri.r, this.#currentPosition.i - position.ri.i]) < (mainWindow.getWidth() / 400),
            ci: math.norm([this.#currentPosition.c - position.ci.c, this.#currentPosition.i - position.ci.i]) < (mainWindow.getWidth() / 400),
            rc: math.norm([this.#currentPosition.c - position.rc.c, this.#currentPosition.r - position.rc.r]) < (mainWindow.getWidth() / 400)
        }
    }
    checkBurnProximity(position) {

    }
}

let mainWindow = new windowCanvas(document.getElementById('main-plot'));
mainWindow.fillWindow();

(function animationLoop() {
    mainWindow.clear();
    mainWindow.updateSettings();
    mainWindow.drawAxes();
    mainWindow.satellites.forEach(sat => {
        sat.drawTrajectory();
        sat.drawCurrentPosition();
    })
    window.requestAnimationFrame(animationLoop)
})()
//------------------------------------------------------------------
// Adding event listeners for window objects
//------------------------------------------------------------------
window.addEventListener('keydown', key => {
    key = key.key;
    if (key === ' ') {
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
                mainWindow.setState('ri rc');
                mainWindow.setFrameCenter({
                    ri: {
                        x: 0.75, y: 0.5, w: 0.5, h: 1
                    },
                    rc: {
                        x: 0.25, y: 0.5, w:0.50, h: 1
                    }
                })
                break;
            case 'ri rc': 
                mainWindow.setState('rc');
                mainWindow.setFrameCenter({
                    ri: {
                        x: 0.5, y: 0.5, w: 1, h: 1
                    },
                    ci: {
                        x: 1, y: 1, w: 0, h: 0
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
                        x: 0.5, y: 0, w: 0, h: 0
                    },
                    ci: {
                        x: 0.5, y: 0.5, w: 1, h: 1
                    },
                    rc: {
                        x: 0, y: 1, w: 0, h: 0
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
                        x: 1, y: 1, w: 0, h: 0
                    },
                    rc: {
                        x: 0, y: 1, w: 0, h: 0
                    }
                })
                break;
        }
    }
    else if (key === 'n') {
        let newSat = new Satellite();
        newSat.calcTraj();
        mainWindow.satellites.push(newSat)
    }
})
window.addEventListener('wheel', event => mainWindow.setAxisWidth(event.deltaY > 0 ? 'increase' : 'decrease'))
document.getElementById('main-plot').addEventListener('mousedown', event => {
    let ricCoor = mainWindow.convertToRic([event.clientX, event.clientY]);
    let sat = 0, check;
    while (sat < mainWindow.satellites.length) {
        check = mainWindow.satellites[sat].checkClickProximity(ricCoor);
        mainWindow.currentTarget = false;
        for (frame in check) {
            mainWindow.currentTarget = check[frame] ? {sat, frame, type: 'current'} : mainWindow.currentTarget;
        }
        if (mainWindow.currentTarget) break;
        sat++;
    }
    console.log(mainWindow.currentTarget);
    if (mainWindow.currentTarget.type === 'current') {
        setTimeout(() => {
            if (!mainWindow.currentTarget) return;
            let targetState = mainWindow.satellites[mainWindow.currentTarget.sat].currentPosition({
                time: mainWindow.scenario_time + 7200
            });
            mainWindow.satellites[mainWindow.currentTarget.sat].burns.push({
                time: mainWindow.scenario_time,
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
        }, 250)
    }
})
document.getElementById('main-plot').addEventListener('mouseup', event => {
    mainWindow.currentTarget = false;
})
//------------------------------------------------------------------
// Adding functions to handle data planels, etc.
//------------------------------------------------------------------
function openPanel(button) {
    if (button.id === 'burns') {
        if (mainWindow.satellites.length === 0) {
            return;
        }
        mainWindow.scenario_time_des = mainWindow.scenario_length*3600;
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
        selectEl.style.color = satellites[chosenSat].color;
    }
    else if (button.id === 'add-satellite') {
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
        let dateDiff = new Date(mainWindow.start_date.toString().split('GMT')[0]).getTimezoneOffset()*60*1000;
        dateDiff = new Date(mainWindow.start_date-dateDiff).toISOString().substr(0,19);
        inputs[0].value = dateDiff;
        inputs[1].value = mainWindow.scenario_length;
        inputs[2].value = Math.pow(398600.4418 / Math.pow(windowOptions.mm, 2), 1/3).toFixed(2);
        let sunTime = Math.round((24 * math.atan2(mainWindow.initSun[1], -mainWindow.initSun[0]) / 2 / Math.PI));
        if (sunTime < 0) sunTime = math.round((sunTime + 24));
        sunTime += '00';
        if (sunTime.length < 4) sunTime = '0' + sunTime;
        inputs[3].value = sunTime;
        inputs[4].value = 180 * math.atan2(mainWindow.initSun[2], math.norm(mainWindow.initSun.slice(0,2))) / Math.PI;
    }
    document.getElementById(button.id + '-panel').classList.toggle("hidden");
    // mainWindow.panelOpen = true;
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
        time = mainWindow.scenario_time, burnStop, position = this.position, burns = this.burns, a = this.a, log = false
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

function calcSatShownTrajectories(whole = false, allBurns = false) {
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
    while (t_calc <= mainWindow.scenario_length * 3600) {
        this.stateHistory.push({
            r: currentState[0][0],
            i: currentState[1][0],
            c: currentState[2][0]
        });
        if (satBurn !== undefined) {
            if (((this.burns[satBurn].time - t_calc) <= mainWindow.timeDelta && (this.burns[satBurn].time <=
                    (mainWindow.scenario_time + 0.5))) || allBurns) {
                if (mainWindow.showFinite) {
                    let t_burn = math.norm([this.burns[satBurn].direction.r, this.burns[satBurn]
                        .direction.i, this.burns[satBurn].direction.c
                    ]) / this.a;
                    if (satBurn !== this.burns.length - 1) {
                        t_burn = t_burn > (this.burns[satBurn + 1].time - this.burns[satBurn].time) ? this.burns[satBurn + 1].time - this.burns[satBurn].time : t_burn;
                    }
                    if (this.completedBurn && !mainWindow.burnS) {
                        t_burn = t_burn < (mainWindow.scenario_time - this.burns[satBurn].time) ?
                            t_burn : mainWindow.scenario_time - this.burns[satBurn].time;
                    } else {
                        this.burnsDrawn++;
                    }
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
                } else {
                    this.burnsDrawn++;
                    let phiI = phiMatrixWhole(this.burns[satBurn].time - t_calc),
                        phiF = phiMatrixWhole(mainWindow.timeDelta - (this.burns[satBurn]
                            .time - t_calc));
                    currentState = math.multiply(phiI, currentState);
                    currentState[3][0] += this.burns[satBurn].direction.r;
                    currentState[4][0] += this.burns[satBurn].direction.i;
                    currentState[5][0] += this.burns[satBurn].direction.c;
                    currentState = math.multiply(phiF, currentState);
                    satBurn = this.burns.length === satBurn + 1 ? undefined : satBurn + 1;
                    t_calc += mainWindow.timeDelta;
                    continue;
                }
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
    if (Xret[2] < 1e-6) {
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

function generateBurns(options = {}) {
    let {
        drawnBurn
    } = options;
    let r1, r2, v10;
    for (let ii = 0; ii < this.burns.length; ii++) {
        r1 = this.currentPosition({
            time: this.burns[ii].time,
            burnStop: ii
        });
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

            // if (ii === drawnBurn) {
            //     drawBurnArrow(this.burns[ii], {
            //         location: {
            //             r: r1[0][0],
            //             i: r1[1][0],
            //             c: r1[2][0]
            //         },
            //         object: windowOptions.burn_status.object,
            //         length: undefined
            //     });
            // }
        }
    }

    this.calcTraj(true);
}