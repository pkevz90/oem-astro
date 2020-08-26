var main_app = new Vue({
    el: "#main-app",
    data: {
        players: {
            blue: {
                exist: true,
                name: 'blue',
                color: 'rgba(100,150,255,1)',
                initial_state: [0, 30, 0.0005, 0],
                display_state: [0, 30, 0, 0],
                current_state: [0, 30, 0, 0],
                burns: [],
                burn_points: [],
                scenario_fuel: 6,
                turn_fuel: 1,
                required_cats: [0, 90],
                max_range: 30,
                target: null,
                engine: null
            },
            red: {
                exist: true,
                name: 'red',
                color: 'rgba(255,150,100,1)',
                initial_state: [0, -30, 0, 0],
                display_state: [0, -30, 0, 0],
                current_state: [0, -30, 0, 0],
                burns: [],
                burn_points: [],
                scenario_fuel: 6,
                turn_fuel: 1,
                required_cats: [0, 90],
                max_range: 30,
                target: null,
                engine: null
            },
            green: {
                exist: true,
                name: 'green',
                color: 'rgba(120,255,120,1)',
                initial_state: [30, -30, 0, 0],
                display_state: [30, -30, 0, 0],
                current_state: [30, -30, 0, 0],
                burns: [],
                burn_points: [],
                scenario_fuel: 6,
                turn_fuel: 1,
                required_cats: [0, 90],
                max_range: 30,
                target: null,
                engine: null
            },
            gray: {
                exist: true,
                name: 'gray',
                color: 'rgba(150,150,150,1)',
                initial_state: [-30, -30, 0, 0],
                display_state: [-30, -30, 0, 0],
                current_state: [-30, -30, 0, 0],
                burns: [],
                burn_points: [],
                scenario_fuel: 6,
                turn_fuel: 1,
                required_cats: [0, 90],
                max_range: 30,
                target: null,
                engine: null
            }
        },
        scenario_data: {
            scenario_length: 30,
            burns_per_player: 10,
            init_sun_angl: 0,
            turn: 0,
            server: false,
            selected_burn_point: null,
            game_time: 0,
            display_time: 0,
            mousedown_location: null,
            mousemove_location: null,
            tactic_data: null
        },
        display_data: {
            center: [0, 0],
            axis_limit: 100,
            width: null,
            height: null,
            drag_data: null
        }
    },
    computed: {
        turn_length: function () {
            return this.scenario_data.scenario_length / this.scenario_data.burns_per_player;
        }
    },
    methods: {
        updateScreen: function () {
            let cnvs = document.getElementById("main-canvas");
            let ctx = cnvs.getContext('2d');
            this.display_data.height = cnvs.height;
            this.display_data.width = cnvs.width;
            ctx.clearRect(0, 0, cnvs.width, cnvs.height);
            drawAxes(cnvs, ctx, this.display_data.center, this.display_data.axis_limit);

            drawArrow(ctx, getScreenPixel(cnvs, 0, 0, this.display_data.axis_limit, this.display_data.center), 90, this.scenario_data.init_sun_angl + 2*Math.PI / 86164 * this.scenario_data.game_time * 3600);

            for (sat in this.players) {
                if (this.players[sat].exist) {
                    drawSatInfo(ctx, cnvs, this.display_data.axis_limit, this.display_data.center, this.players[sat]);
                }
            }
            for (sat in this.players) {
                if (this.players[sat].exist) {
                    this.players[sat].current_state = calcCurrentPoint(this.scenario_data.game_time,sat); 
                    drawSatShape(ctx, getScreenPixel(cnvs, this.players[sat].display_state[0], this.players[sat].display_state[1], this.display_data.axis_limit, this.display_data.center), 45, 0.2, this.players[sat].color,0,0.5);
                    drawSatShape(ctx, getScreenPixel(cnvs, this.players[sat].current_state[0], this.players[sat].current_state[1], this.display_data.axis_limit, this.display_data.center), 45, 0.2, this.players[sat].color);
                }
            }
            // Draw burn if point is focused upon
            if (this.scenario_data.selected_burn_point !== null) {
                let location = main_app.players[this.scenario_data.selected_burn_point.satellite].burn_points[this.scenario_data.selected_burn_point.point];
                let burn = main_app.players[this.scenario_data.selected_burn_point.satellite].burns[this.scenario_data.selected_burn_point.point];
                let burnN = math.norm(burn);
                if (burnN > 1e-6) {
                    drawArrow(ctx, getScreenPixel(cnvs, location[0][0], location[1][0], this.display_data.axis_limit, this.display_data.center), 30 * burnN, Math.atan2(-burn[1], burn[0]), main_app.players[this.scenario_data.selected_burn_point.satellite].color, 4 * burnN);
                } 
            }
        }
    },
    watch: {
        'players.blue.burns': function () {
            this.players.blue.burn_points = calculateBurnPoints('blue', this.players.blue.burns, this.players.blue.initial_state);
        },
        'players.red.burns': function () {
            this.players.red.burn_points = calculateBurnPoints('red', this.players.red.burns, this.players.red.initial_state);
        },
        'players.green.burns': function () {
            this.players.green.burn_points = calculateBurnPoints('green', this.players.green.burns, this.players.green.initial_state);
        },
        'players.gray.burns': function () {
            this.players.gray.burn_points = calculateBurnPoints('gray', this.players.gray.burns, this.players.gray.initial_state);
        },
        'scenario_data.display_time': function () {
            for (player in this.players) {
                this.players[player].display_state = calcCurrentPoint(this.scenario_data.display_time,player);
            }
        }
    }
})


window.addEventListener('resize', () => {
    resizeCanvas();
});

function resizeCanvas() {
    $('#main-canvas')[0].width = window.innerWidth;
    $('#main-canvas')[0].height = window.innerHeight;
}

function getScreenPixel(cnvs, rad, it, limit, center, object = false) {
    let height = cnvs.height,
        width = cnvs.width,
        yxRatio = height / width;
    if (object) {
        return {
            x: width / 2 + ((center[0] - it) / limit) * width / 2,
            y: height / 2 + ((center[1] - rad) / limit / yxRatio) * height / 2
        }
    }
    return [width / 2 + ((center[0] - it) / limit) * width / 2, height / 2 + ((center[1] - rad) / limit / yxRatio) * height / 2]
}

function getScreenPoint(x, y, limit, center, object = false) {
    cnvs = $('#main-canvas')[0];
    let height = cnvs.height,
        width = cnvs.width,
        yxRatio = height / width;
    if (object) {
        return {
            it: center[0] - (x - width / 2) / (width / 2) * limit,
            rad: center[1] - (y - height / 2) / (height / 2) * limit * yxRatio,
        }
    }
    return [center[0] - (x - width / 2) / (width / 2) * limit, center[1] - (y - height / 2) / (height / 2) * limit * yxRatio];
}

function drawAxes(cnvs, ctx, center, limit) {
    let height = cnvs.height,
        width = cnvs.width,
        yxRatio = height / width,
        axis_center = [width / 2 + (center[0] / limit) * width / 2, height / 2 + (center[1] / limit / yxRatio) * height / 2];
    // Draw Radial and In-Track Axes
    ctx.strokeStyle = 'rgb(255,255,255)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(axis_center[0], 0);
    ctx.lineTo(axis_center[0], height);
    ctx.moveTo(0, axis_center[1]);
    ctx.lineTo(width, axis_center[1]);
    ctx.stroke();
    // Draw Markers
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.textAlign = "center";
    ctx.font = "15px Arial";
    ctx.lineWidth = 3;
    let point = axis_center[0] + 0, ii = 0;
    if (axis_center[1] < 0) {
        otherPoint = 0;
        // console.log('hey');
    } else if (axis_center[1] > height) {
        otherPoint = height;
    } else {
        otherPoint = axis_center[1]
    }
    while (point > 0) {
        point -= 10 / limit / 2 * width;
        ctx.moveTo(point, otherPoint - height / 70);
        ctx.lineTo(point, otherPoint + height / 70);
        ii++;
        ctx.fillText(ii*10,point, otherPoint + height / 30);
    }
    ii = 0;
    point = axis_center[0] + 0;
    while (point < width) {
        point += 10 / limit / 2 * width;
        ctx.moveTo(point, otherPoint - height / 70);
        ctx.lineTo(point, otherPoint + height / 70);
        ii++;
        ctx.fillText(-ii*10,point, otherPoint + height / 30);
    }
    point = axis_center[1] + 0;
    ii = 0;
    if (axis_center[0] < 0) {
        otherPoint = 0;
    } else if (axis_center[0] > width) {
        otherPoint = width;
    } else {
        otherPoint = axis_center[0]
    }
    while (point < height) {
        point += 10 / limit / 2 / yxRatio * height;
        ctx.moveTo(otherPoint - height / 70, point);
        ctx.lineTo(otherPoint + height / 70, point);
        ii++
        ctx.fillText(-ii*10,otherPoint - height / 30, point+5);
    }
    point = axis_center[1] + 0; ii = 0;
    while (point > 0) {
        point -= 10 / limit / 2 / yxRatio * height;
        ctx.moveTo(otherPoint - height / 70, point);
        ctx.lineTo(otherPoint + height / 70, point);
        ii++
        ctx.fillText(ii*10,otherPoint - height / 30, point+5);
    }
    ctx.stroke()

}

function drawSatInfo(ctx, cnvs, limit, center, sat) {
    drawSatTrajectory(ctx, cnvs, limit, center, {
        satellite: sat,
        nBurns: main_app.scenario_data.burns_per_player,
        tBurns: main_app.turn_length
    });
    drawBurnPoints(sat.name);
}

function calculateBurnPoints(sat, burns, initial_state) {

    let state = [
        [initial_state[0]],
        [initial_state[1]],
        [initial_state[2]],
        [initial_state[3]]
    ];
    state[2][0] += burns[0][0] / 1000;
    state[3][0] += burns[0][1] / 1000;
    let out_points = [state];
    let pRR = PhiRR(main_app.scenario_data.scenario_length * 3600 / main_app.scenario_data.burns_per_player),
        pRV = PhiRV(main_app.scenario_data.scenario_length * 3600 / main_app.scenario_data.burns_per_player),
        pVR = PhiVR(main_app.scenario_data.scenario_length * 3600 / main_app.scenario_data.burns_per_player),
        pVV = PhiVV(main_app.scenario_data.scenario_length * 3600 / main_app.scenario_data.burns_per_player);
    for (ii = 1; ii < burns.length; ii++) {
        r = math.add(math.multiply(pRR, out_points[ii - 1].slice(0, 2)), math.multiply(pRV, out_points[ii - 1].slice(2, 4)));
        v = math.add(math.multiply(pVR, out_points[ii - 1].slice(0, 2)), math.multiply(pVV, out_points[ii - 1].slice(2, 4)));
        v[0][0] += burns[ii][0] / 1000;
        v[1][0] += burns[ii][1] / 1000;
        // console.log(r);
        out_points.push(math.concat(r, v, 0));
    }

    return out_points;
}

function drawBurnPoints(sat) {
    let cnvs = $('#main-canvas')[0];
    let ctx = cnvs.getContext('2d');
    let pixel_point;
    ctx.fillStyle = 'black';
    ctx.strokeStyle = main_app.players[sat].color;
    main_app.players[sat].burn_points.forEach((point) => {
        pixel_point = getScreenPixel(cnvs, point[0][0], point[1][0], main_app.display_data.axis_limit, main_app.display_data.center);
        ctx.fillRect(pixel_point[0] - 3, pixel_point[1] - 3, 6, 6);
        ctx.strokeRect(pixel_point[0] - 3, pixel_point[1] - 3, 6, 6);
    })
}

function drawSatTrajectory(ctx, cnvs, limit, center, input_object) {
    let points, r, v, pixelPos;
    ctx.strokeStyle = input_object.satellite.color;
    ctx.lineWidth = 3;
    let nodes = 8;
    let pRR = PhiRR(input_object.tBurns * 3600 / nodes),
        pRV = PhiRV(input_object.tBurns * 3600 / nodes),
        pVR = PhiVR(input_object.tBurns * 3600 / nodes),
        pVV = PhiVV(input_object.tBurns * 3600 / nodes);
    for (let jj = 0; jj < input_object.satellite.burn_points.length; jj++) {
        points = [];
        pixelPos = [];
        points.push(input_object.satellite.burn_points[jj]);
        pixelPos.push(getScreenPixel(cnvs, input_object.satellite.burn_points[jj][0], input_object.satellite.burn_points[jj][1], limit, center, true))
        for (ii = 0; ii < nodes; ii++) {
            r = math.add(math.multiply(pRR, points[ii].slice(0, 2)), math.multiply(pRV, points[ii].slice(2, 4)));
            v = math.add(math.multiply(pVR, points[ii].slice(0, 2)), math.multiply(pVV, points[ii].slice(2, 4)));
            points.push(math.concat(r, v, 0))
            pixelPos.push(getScreenPixel(cnvs, r[0][0], r[1][0], limit, center, true))
        }
        drawCurve(ctx, pixelPos, 1);
    }

}

function drawSatShape(ctx, location, ang = 0, size = 0.3, color = '#AAA', sunAngle = 0, transparency = 1) {
    let ct = Math.cos(ang * Math.PI / 180),
        st = Math.sin(ang * Math.PI / 180),
        R = [
            [ct, -st],
            [st, ct]
        ];
    ctx.save();
    ctx.beginPath();
    ctx.translate(location[0], location[1]);
    ctx.strokeStyle = color;
    var grd = ctx.createLinearGradient(-20 * size * Math.sin(-sunAngle), -20 * size * Math.cos(-sunAngle), 20 * size * Math.sin(-sunAngle), 20 * size * Math.cos(-sunAngle));
    grd.addColorStop(0, color);
    grd.addColorStop(1, "black");
    ctx.fillStyle = grd;
    ctx.lineWidth = 4 * size;
    ctx.globalAlpha = transparency;
    let sat = [
        // main body
        [-25, -25],
        [25, -25],
        [25, 25],
        [-25, 25],
        [-25, 0],
        //solar panel 1
        [-150, 12.5],
        [-150, -12.5],
        [-25, -12.5],
        [-25, 12.5],
        //solar panel 2
        [150, -12.5],
        [150, 12.5],
        [25, 12.5],
        [25, -12.5],
        //sensor
        [-9, -30],
        [9, -30],
        [4, -25],
        [-4, -25]
    ];

    let transformedSat = math.transpose(math.multiply(R, math.transpose(sat)));
    transformedSat = math.dotMultiply(transformedSat, size);
    ctx.moveTo(transformedSat[4][0], transformedSat[4][1])
    transformedSat.forEach((point, index) => {
        ctx.lineTo(point[0], point[1]);
        if (index === 4) {
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = 'rgb(50,50,150)';
            ctx.strokeStyle = 'rgb(255,255,255)';
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(transformedSat[8][0], transformedSat[8][1])
        } else if (index === 8) {
            ctx.fill();
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(transformedSat[12][0], transformedSat[12][1])
        } else if (index === 12) {
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = 'rgb(225,225,225)';
            ctx.beginPath();
            ctx.moveTo(transformedSat[16][0], transformedSat[16][1])
        }
    });
    ctx.fill();
    ctx.stroke();
    ctx.restore();
}

function drawArrow(ctx, pixelLocation, length = 15, angle = 0, color = 'rgba(255,255,0,0.5)', width = 6) {
    pixelX = pixelLocation[0];
    pixelY = pixelLocation[1];
    let ct = Math.cos(angle),
        st = Math.sin(angle);
    rotMat = [
        [ct, -st],
        [st, ct]
    ];
    // let arrow = [
    //     [0, -length *  2 + 10 * length / 60],
    //     [3, -length *  2 + 12 * length / 60],
    //     [0, -length *  2],
    //     [-3, -length * 2 + 12 * length / 60],
    //     [0, -length *  2 + 10 * length / 60]
    // ];
    let arrow = [
        [0, -length *  2 + 10 * length / 60],
        [3, -length *  2 + 12 * length / 60],
        [0, -length *  2],
        [-3, -length * 2 + 12 * length / 60],
        [0, -length *  2 + 10 * length / 60]
    ];
    let transformedArrow = math.transpose(math.multiply(rotMat, math.transpose(arrow)));
    ctx.save();
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.beginPath();
    // ctx.translate(cnvs.width / 2 - origin[0] * pixelX / 2 + main_app.display_data.center[0] * pixelX / 2, cnvs.heihgt / 2 + main_app.display_data.center[1] * pixelY * 2 - origin[1] * pixelY * 2);
    ctx.translate(pixelX, pixelY)
    ctx.moveTo(0, 0);
    transformedArrow.forEach((point) => {
        ctx.lineTo(point[0], point[1]);
    });
    ctx.lineWidth = width;
    ctx.stroke();
    ctx.fill();
    ctx.restore();
}

function setMouseCallbacks() {
    $('#main-canvas').mousedown(event => {
        main_app.scenario_data.mousedown_location = [event.offsetX, event.offsetY];
        let location_point = getScreenPoint(event.offsetX, event.offsetY, main_app.display_data.axis_limit, main_app.display_data.center);
        if (checkClose(location_point[0], location_point[1])) {
            main_app.scenario_data.tactic_data = ['burn']
            setTimeout(()=>{
                let newPoint = getScreenPoint(main_app.scenario_data.mousemove_location[0], main_app.scenario_data.mousemove_location[1], main_app.display_data.axis_limit, main_app.display_data.center);
                if (math.norm(math.subtract(location_point, newPoint)) < main_app.display_data.axis_limit / 50) {
                    console.log('start target');
                }
            },500)
            return;
        }
        main_app.display_data.drag_data = [
            [event.offsetX, event.offsetY],
            [...main_app.display_data.center]
        ];
    })
    $('#main-canvas').mousemove(event => {
        main_app.scenario_data.mousemove_location = [event.offsetX, event.offsetY];
        let cart_point = getScreenPoint(event.offsetX, event.offsetY, main_app.display_data.axis_limit, main_app.display_data.center);
        if (main_app.scenario_data.tactic_data !== null) {
            switch(main_app.scenario_data.tactic_data[0]) {
                case 'burn': 
                    burnCalc(main_app.scenario_data.selected_burn_point, [event.offsetX, event.offsetY]);
                    break;
                default: 
                    break;
            }
        }
        if (main_app.display_data.drag_data !== null) {
            main_app.display_data.center[0] = (event.offsetX - main_app.display_data.drag_data[0][0]) * 2 * main_app.display_data.axis_limit / main_app.display_data.width + main_app.display_data.drag_data[1][0];
            main_app.display_data.center[1] = (event.offsetY - main_app.display_data.drag_data[0][1]) * 2 * main_app.display_data.axis_limit / main_app.display_data.width + main_app.display_data.drag_data[1][1];
        }
    })
    $('#main-canvas').mouseup(() => {
        main_app.scenario_data.tactic_data = null;
        if (main_app.display_data.drag_data !== null) {
            main_app.display_data.drag_data = null;
        }
    })
}

setMouseCallbacks()
resizeCanvas();
window.requestAnimationFrame(animation);
for (player in main_app.players) {
    main_app.players[player].burns = math.zeros(main_app.scenario_data.burns_per_player, 2)._data;
}


function animation(time) {
    main_app.updateScreen();
    main_app.scenario_data.game_time += 20/3600;
    window.requestAnimationFrame(animation);
}

function PhiRR(t, n = 2 * Math.PI / 86164) {
    let nt = n * t;
    return [
        [4 - 3 * Math.cos(nt), 0],
        [6 * (Math.sin(nt) - nt), 1]
    ];
}

function PhiRV(t, n = 2 * Math.PI / 86164) {
    let nt = n * t;
    return [
        [Math.sin(nt) / n, 2 * (1 - Math.cos(nt)) / n],
        [(Math.cos(nt) - 1) * 2 / n, (4 * Math.sin(nt) - 3 * nt) / n]
    ];
}

function PhiVR(t, n = 2 * Math.PI / 86164) {
    let nt = n * t;
    return [
        [3 * n * Math.sin(nt), 0],
        [6 * n * (Math.cos(nt) - 1), 0]
    ];
}

function PhiVV(t, n = 2 * Math.PI / 86164) {
    let nt = n * t;
    return [
        [Math.cos(nt), 2 * Math.sin(nt)],
        [-2 * Math.sin(nt), 4 * Math.cos(nt) - 3]
    ];
}

function drawCurve(ctx, points, tension) {
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);

    var t = (tension != null) ? tension : 1;
    // console.log(t,points)
    for (var i = 0; i < points.length - 1; i++) {
        var p0 = (i > 0) ? points[i - 1] : points[0];
        var p1 = points[i];
        var p2 = points[i + 1];
        var p3 = (i != points.length - 2) ? points[i + 2] : p2;

        var cp1x = p1.x + (p2.x - p0.x) / 6 * t;
        var cp1y = p1.y + (p2.y - p0.y) / 6 * t;

        var cp2x = p2.x - (p3.x - p1.x) / 6 * t;
        var cp2y = p2.y - (p3.y - p1.y) / 6 * t;

        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
        // console.log(cp1x, cp1y, cp2x, cp2y)
    }
    ctx.stroke();
}

function checkClose(x, y, change = true) {
    let xPoint, yPoint;
    let turn = math.ceil(main_app.scenario_data.game_time / main_app.scenario_data.scenario_length * main_app.scenario_data.burns_per_player);
    for (sat in main_app.players) {
        for (var ii = turn; ii < main_app.players[sat].burn_points.length; ii++) {
            xPoint = main_app.players[sat].burn_points[ii][1][0];
            yPoint = main_app.players[sat].burn_points[ii][0][0];
            if (math.norm([xPoint - x, yPoint - y]) < main_app.display_data.axis_limit / 50) {
                if (change) {
                    main_app.scenario_data.selected_burn_point = {
                        satellite: sat,
                        point: ii
                    }
                }
                return true;
            }
        }
    }
    return false;
}

function calcCurrentPoint(curTime, sat, pRR, pRV, pVR, pVV) {
    let priorWaypoint = Math.floor(curTime / (main_app.scenario_data.scenario_length / main_app.scenario_data.burns_per_player));
	priorWaypoint = priorWaypoint > (main_app.scenario_data.burns_per_player - 1) ? main_app.scenario_data.burns_per_player - 1 : priorWaypoint;
    let timeDelta = 3600 * (curTime - priorWaypoint * main_app.scenario_data.scenario_length / main_app.scenario_data.burns_per_player);
    pRR = PhiRR(timeDelta);
	pRV = PhiRV(timeDelta);
	pVR = PhiVR(timeDelta);
    pVV = PhiVV(timeDelta);
    let waypointState = [...main_app.players[sat].burn_points[priorWaypoint]]
	let r = math.add(math.multiply(pRR, waypointState.slice(0,2)), math.multiply(pRV, waypointState.slice(2,4)));
    let v = math.add(math.multiply(pVR, waypointState.slice(0,2)), math.multiply(pVV, waypointState.slice(2,4)));
	return math.concat(math.squeeze(r),math.squeeze(v),0);
}

function burnCalc(sat, position2) {
    let position1 = main_app.scenario_data.mousedown_location;
    let rel = math.subtract(position1, position2);
    rel = rel.reverse();
    let dist = math.norm(rel);
    let magnitude = dist / 60; 
    main_app.players[sat.satellite].burns.splice(sat.point,1,math.dotMultiply(magnitude, math.dotDivide(rel,dist)))
}

function drawTargetLimit(sat,dV) {

}