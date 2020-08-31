var main_app = new Vue({
    el: "#main-app",
    data: {
        satellite: {
            name: 'blue',
            color: 'rgba(100,150,255,1)',
            current_state: [[0], [0], [0], [0]]
        },
        scenario_data: {
            delta_v: 0.5,
            roes: {
                ae: 0,
                xd: 0,
                yd: 0,
                b: 0,
                delta_v: 0.00025,
            },
            mousedown_location: null,
            mousemove_location: null,
            time: {
                start: 2,
                step: 2,
                end: 24,
                current: 0
            }
        },
        display_data: {
            center: [0, 0],
            axis_limit: 70,
            width: null,
            height: null,
            drag_data: null,
            stars: math.random([100,3], -0.5, 0.5)
        }
    },
    methods: {
        updateScreen: function () {
            let cnvs = document.getElementById("main-canvas");
            let ctx = cnvs.getContext('2d');
            this.display_data.height = cnvs.height;
            this.display_data.width = cnvs.width;
            ctx.clearRect(0, 0, cnvs.width, cnvs.height);
            drawStars(cnvs, ctx);
            drawAxes(cnvs, ctx, this.display_data.center, this.display_data.axis_limit);
            drawSatShape(ctx, getScreenPixel(cnvs, this.satellite.current_state[0][0], this.satellite.current_state[1][0], this.display_data.axis_limit, this.display_data.center), 0, 0.4, '#AAA', sunAngle = 0, transparency = 1)
            drawSatTrajectory(ctx, cnvs, this.display_data.axis_limit, this.display_data.center, this.satellite.current_state);
            let step = this.scenario_data.time.step <= 0 ? 1 : this.scenario_data.time.step;
            for (let kk = this.scenario_data.time.start; kk <= this.scenario_data.time.end; kk += step) {
                drawTargetLimit(cnvs, ctx, this.satellite.current_state,this.scenario_data.roes.delta_v, kk)
            }
        },
        roeChange: function(event) {
            let type = event.target.id;
            let val = event.target.value;
            this.scenario_data.roes[type] = Number(val);

            this.satellite.current_state = [
                [-this.scenario_data.roes.ae / 2 * Math.cos(this.scenario_data.roes.b * Math.PI / 180) + this.scenario_data.roes.xd],
                [this.scenario_data.roes.ae * Math.sin(this.scenario_data.roes.b * Math.PI / 180) + this.scenario_data.roes.yd],
                [this.scenario_data.roes.ae * (2 * Math.PI / 86164)/ 2 * Math.sin(this.scenario_data.roes.b * Math.PI / 180)],
                [this.scenario_data.roes.ae * (2 * Math.PI / 86164) * Math.cos(this.scenario_data.roes.b * Math.PI / 180) - 3/2 * this.scenario_data.roes.xd * (2 * Math.PI / 86164)]
            ]
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

function drawStars(cnvs, ctx) {
    let w = cnvs.width, h = cnvs.height;
    let ct = Math.cos(main_app.scenario_data.time.current *3600 * Math.PI * 2 / 86164),
        st = Math.sin(main_app.scenario_data.time.current *3600 * Math.PI * 2 / 86164);
    let rotMat = [
        [ct, -st, 0],
        [st, ct, 0],
        [0,0,1]
        ];
    ctx.save();
    ctx.translate(w / 2, h / 2);
    let starR = math.transpose(math.multiply(rotMat, math.transpose(main_app.display_data.stars)));
    ctx.fillStyle = "rgba(255,255,255)";
    starR.forEach(star => {
        // console.log(star);
        ctx.fillRect((w > h ? w : h) * star[0], (w > h ? w : h) * star[1], 3 * (star[2] + 0.5), 3 * (star[2] + 0.5));
    });
    ctx.restore();
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
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
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
        // point -= 7.359 / limit / 2 * width;
        point -= 10 / limit / 2 * width;
        ctx.moveTo(point, otherPoint - height / 70);
        ctx.lineTo(point, otherPoint + height / 70);
        ii++;
        ctx.fillText(ii*5,point, otherPoint + height / 30);
    }
    ii = 0;
    point = axis_center[0] + 0;
    while (point < width) {
        // point += 7.359 / limit / 2 * width;
        point += 10 / limit / 2 * width;
        ctx.moveTo(point, otherPoint - height / 70);
        ctx.lineTo(point, otherPoint + height / 70);
        ii++;
        ctx.fillText(-ii*10,point, otherPoint + height / 30);
        // ctx.fillText(-ii*0.01,point, otherPoint + height / 30);
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
}


function drawSatTrajectory(ctx, cnvs, limit, center, state) {
    let r, pixelPos;
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 3;
    let nodes = 40;
    pixelPos = [];
    points = [];
    pixelPos.push(getScreenPixel(cnvs, state[0][0], state[1][0], limit, center, true))
    for (ii = 0; ii < nodes; ii++) {
        r = math.add(math.multiply(PhiRR(ii*(86164 / 1 / nodes)), state.slice(0, 2)), math.multiply(PhiRV(ii*86164 / 1 / nodes), state.slice(2, 4)));
        pixelPos.push(getScreenPixel(cnvs, r[0][0], r[1][0], limit, center, true))
    }
    drawCurve(ctx, pixelPos, 1);

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
        main_app.display_data.drag_data = [
            [event.offsetX, event.offsetY],
            [...main_app.display_data.center]
        ];
    })
    $('#main-canvas').mousemove(event => {
        main_app.scenario_data.mousemove_location = [event.offsetX, event.offsetY];
        if (main_app.display_data.drag_data !== null) {
            main_app.display_data.center[0] = (event.offsetX - main_app.display_data.drag_data[0][0]) * 2 * main_app.display_data.axis_limit / main_app.display_data.width + main_app.display_data.drag_data[1][0];
            main_app.display_data.center[1] = (event.offsetY - main_app.display_data.drag_data[0][1]) * 2 * main_app.display_data.axis_limit / main_app.display_data.width + main_app.display_data.drag_data[1][1];
        }
    })
    $('#main-canvas').mouseup(() => {
        main_app.display_data.drag_data = null;
    })
    $('#main-canvas').on('mousewheel',event => {
        if (main_app.display_data.axis_limit > 2 || event.deltaY < 0) {
            main_app.display_data.axis_limit -= event.deltaY * 2;
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
    // console.time()
    main_app.updateScreen();
    // console.timeEnd();
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

function drawCurve(ctx, points, tension, type = 'stroke') {
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
    if (type === 'stroke') {
        ctx.stroke();
    }
    else {
        ctx.fill();
    }
}


function drawTargetLimit(cnvs, ctx, first_state,dV, t) {
    // console.log(first_state, sat, main_app.scenario_data.selected_burn_point)
    let r = first_state.slice(0,2);
    let v = first_state.slice(2,4);
    // console.log(r,v)
    let ang, dVcomponents, r2, pixelPos = [];
    let pRR = PhiRR(t * 3600), pRV = PhiRV(t * 3600);
    ctx.beginPath();
    // ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.strokeStyle = 'hsl(' + (360 / (main_app.scenario_data.time.end / main_app.scenario_data.time.step)) * t /main_app.scenario_data.time.step  + ', 100%, 50%)';
    for (ii = 0; ii <= 20; ii++) {
        ang = 2 * Math.PI * ii / 20;
        dVcomponents = [[dV * Math.cos(ang)], [dV * Math.sin(ang)]];
        r2 = math.add(math.multiply(pRR, r), math.multiply(pRV, math.add(v,dVcomponents)));    
        pixelPos.push(getScreenPixel(cnvs, r2[0][0], r2[1][0], main_app.display_data.axis_limit, main_app.display_data.center, true)); 
    }
    drawCurve(ctx, pixelPos)
    // drawCurve(ctx, pixelPos,1,'fill')
}

function hrsToTime(hrs) {
    hrs = Math.round(hrs * 100) / 100; // rounding to truncate and not have for example 2.9999999 instead of 3, producing 2:59 instread of 3:00
    return ("0" + Math.floor(hrs)).slice(-2) + ':' + ('0' + Math.floor(60 * (hrs - Math.floor(hrs)))).slice(-2);
}