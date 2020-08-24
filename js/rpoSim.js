var main_app = new Vue({
    el: "#main-app",
    data: {
        players: {
            blue: {
                exist: true,
                color: 'rgba(100,150,255,1)',
                initial_state: [0,30,0.0005,0],
                current_state: [0,30,0,0],
                burns: [],
                burn_points: [],
                scenario_fuel: 6,
                turn_fuel: 1,
                required_cats: [0,90],
                max_range: 30,
                target: null,
                engine: null
            },
            red: {
                exist: true,
                color: 'rgba(255,150,100,1)',
                initial_state: [0,-30,0,0],
                current_state: [0,-30,0,0],
                burns: [],
                burn_points: [],
                scenario_fuel: 6,
                turn_fuel: 1,
                required_cats: [0,90],
                max_range: 30,
                target: null,
                engine: null
            },
            green: {
                exist: true,
                color: 'rgba(120,255,120,1)',
                initial_state: [30,-30,0,0],
                current_state: [30,-30,0,0],
                burns: [],
                burn_points: [],
                scenario_fuel: 6,
                turn_fuel: 1,
                required_cats: [0,90],
                max_range: 30,
                target: null,
                engine: null
            },
            gray: {
                exist: true,
                color: 'rgba(150,150,150,1)',
                initial_state: [-30,-30,0,0],
                current_state: [-30,-30,0,0],
                burns: [],
                burn_points: [],
                scenario_fuel: 6,
                turn_fuel: 1,
                required_cats: [0,90],
                max_range: 30,
                target: null,
                engine: null
            }
        },
        scenario_data: {
            scenario_length: 30,
            burns_per_player: 2.5
        },
        display_data: {
            center: [0,0],
            axis_limit: 100,
            width: null,
            height: null,
            drag_data: null
        }
    },
    computed: {
        turn_length: function() {
            return this.scenario_data.scenario_length / this.scenario_data.burns_per_player;
        }
    },
    methods: {
        updateScreen: function() {
            let cnvs = document.getElementById("main-canvas");
            let ctx = cnvs.getContext('2d');
            this.display_data.height = cnvs.height;
            this.display_data.width = cnvs.width;
            ctx.clearRect(0, 0, cnvs.width, cnvs.height);
            drawAxes(cnvs, ctx, this.display_data.center, this.display_data.axis_limit);
            for (sat in this.players) {
                if (this.players[sat].exist) {
                    drawSatInfo(ctx, cnvs, this.display_data.axis_limit, this.display_data.center, this.players[sat]);
                }
            }
            for (sat in this.players) {
                if (this.players[sat].exist) {
                    drawSatShape(ctx, getScreenPixel(cnvs, this.players[sat].current_state[0], this.players[sat].current_state[1], this.display_data.axis_limit, this.display_data.center),45,0.3,this.players[sat].color);
                }
            }
        }
    },
    watch: {
        'players.blue.burns': function() {
            console.log('hey');
            console.log(this.players.blue.burns);
            this.players.blue.burn_points = calculateBurnPoints('blue', this.players.blue.burns, this.players.blue.initial_state);
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
        return {x: width / 2 + ((center[0] - it) / limit) * width / 2, y: height / 2 + ((center[1] - rad) / limit / yxRatio) * height / 2}
    }
    return [width / 2 + ((center[0] - it) / limit) * width / 2, height / 2 + ((center[1] - rad) / limit / yxRatio) * height / 2]
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
    ctx.lineWidth = 3;
    let point = axis_center[0] + 0;
    if (axis_center[1] < 0) {
        otherPoint = 0;
        console.log('hey');
    }
    else if (axis_center[1] > height) { 
        otherPoint = height;
    }
    else {
        otherPoint = axis_center[1]
    }
    while (point > 0) {
        point -= 10 / limit / 2 * width;
        ctx.moveTo(point, otherPoint - height / 70);
        ctx.lineTo(point, otherPoint + height / 70);
    }
    point = axis_center[0] + 0;
    while (point < width) {
        point += 10 / limit / 2 * width;
        ctx.moveTo(point, otherPoint - height / 70);
        ctx.lineTo(point, otherPoint + height / 70);
    }
    point = axis_center[1] + 0;
    if (axis_center[0] < 0) {
        otherPoint = 0;
    }
    else if (axis_center[0] > width) {
        otherPoint = width;
    }
    else {
        otherPoint = axis_center[0]
    }
    while (point < height) {
        point += 10 / limit / 2 / yxRatio * height;
        ctx.moveTo(otherPoint - height / 70,point);
        ctx.lineTo(otherPoint + height / 70,point);
    }
    point = axis_center[1] + 0;
    while (point > 0) {
        point -= 10 / limit / 2 / yxRatio * height;
        ctx.moveTo(otherPoint - height / 70,point);
        ctx.lineTo(otherPoint + height / 70,point);
    }
    ctx.stroke()

}

function drawSatInfo(ctx, cnvs, limit, center, sat) {
    drawSatTrajectory(ctx, cnvs, limit, center, {satellite: sat, nBurns: main_app.scenario_data.burns_per_player, tBurns: main_app.turn_length});

}

function calculateBurnPoints(sat,burns, initial_state) {

    console.log([initial_state[3]]);
    let state = [[initial_state[0]], [initial_state[1]], [initial_state[2]], [initial_state[3]]];
    console.log(burns, initial_state, state);
    state[3][0] += burns[0][0];
    state[4][0] += burns[0][1];
    let out_points = [state]; 
    console.log(out_points);
    // for (ii = 1; ii < burns.length; ii++) {
    //     r = math.add(math.multiply(pRR, out_points[ii-1].slice(0,2)), math.multiply(pRV, out_points[ii-1].slice(2,4)));
    //     v = math.add(math.multiply(pVR, out_points[ii-1].slice(0,2)), math.multiply(pVV, out_points[ii-1].slice(2,4)));
    // }

}

function drawBurnPoints(ctx, cnvs, satellite_burns) {

}

function drawSatTrajectory(ctx, cnvs, limit, center, input_object) {
    let init_state = math.transpose([input_object.satellite.initial_state]);
    let points = [], r, v, pixelPos = [];
    let pRR = PhiRR(input_object.tBurns * 450),
        pRV = PhiRV(input_object.tBurns * 450),
        pVR = PhiVR(input_object.tBurns * 450),
        pVV = PhiVV(input_object.tBurns * 450);
    points.push(init_state);
    pixelPos.push(getScreenPixel(cnvs, init_state[0][0], init_state[1][0], limit, center, true))
    for (ii = 0; ii < 8; ii++) {
        r = math.add(math.multiply(pRR, points[ii].slice(0,2)), math.multiply(pRV, points[ii].slice(2,4)));
        v = math.add(math.multiply(pVR, points[ii].slice(0,2)), math.multiply(pVV, points[ii].slice(2,4)));
        points.push(math.concat(r,v,0))
        pixelPos.push(getScreenPixel(cnvs, r[0][0], r[1][0], limit, center, true))
    }
    ctx.strokeStyle = input_object.satellite.color;
    ctx.lineWidth = 3;
    drawCurve(ctx, pixelPos, 1);

}

function drawSatShape(ctx,location, ang = 0, size = 0.3, color = '#AAA', sunAngle = 0) {
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
	var grd = ctx.createLinearGradient(-20*size*Math.sin(-sunAngle),-20*size*Math.cos(-sunAngle),20*size*Math.sin(-sunAngle),20*size*Math.cos(-sunAngle));
	grd.addColorStop(0,color);
	grd.addColorStop(1,"black");
	ctx.fillStyle = grd;
	ctx.lineWidth = 4 * size;
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
	[9,-30],
	[4,-25],
	[-4,-25]
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


function drawArrow(ctx, pixelLocation, length = 15, origin = [0,0], angle = 0, color = 'rgba(255,255,0,0.5)', width = 6) {
    pixelX = pixelLocation[0];
    pixelY = pixelLocation[1];
	let ct = Math.cos(angle),
		st = Math.sin(angle);
		rotMat = [
			[ct, -st],
			[st, ct]
		];
	let arrow = [
		[0,-length * pixelY * 2 + 10],
		[3,-length * pixelY * 2 + 12],
		[0,-length * pixelY * 2],
		[-3,-length * pixelY * 2 + 12],
		[0,-length * pixelY * 2 + 10]
	];
	let transformedArrow = math.transpose(math.multiply(rotMat,math.transpose(arrow)));
	ctx.save();
	ctx.fillStyle = color;
	ctx.strokeStyle = color;
	ctx.beginPath();
	ctx.translate(globalChartRef.chartArea.left + (globalChartRef.chartArea.right-globalChartRef.chartArea.left) / 2  - origin[0]*pixelX/2 + app.axisCenter[0]*pixelX/2, globalChartRef.chartArea.top + (globalChartRef.chartArea.bottom-globalChartRef.chartArea.top) / 2 + app.axisCenter[1]*pixelY*2 - origin[1]*pixelY*2);
	ctx.moveTo(0,0);
	transformedArrow.forEach((point) => {
		ctx.lineTo(point[0],point[1]);
	});
	ctx.lineWidth = width;
	ctx.stroke();
	ctx.fill();
	ctx.restore();
}

function setMouseCallbacks() {
    $('#main-canvas').mousedown(event => {
        main_app.display_data.drag_data = [[event.offsetX,event.offsetY],
                                           [...main_app.display_data.center]];
    })
    $('#main-canvas').mousemove(event => {
        if (main_app.display_data.drag_data !== null) {
            main_app.display_data.center[0] = (event.offsetX - main_app.display_data.drag_data[0][0]) * 2 * main_app.display_data.axis_limit / main_app.display_data.width  + main_app.display_data.drag_data[1][0];
            main_app.display_data.center[1] = (event.offsetY - main_app.display_data.drag_data[0][1]) * 2 * main_app.display_data.axis_limit / main_app.display_data.width  + main_app.display_data.drag_data[1][1];
        }
    })
    $('#main-canvas').mouseup(() => {
        if (main_app.display_data.drag_data !== null) {
            main_app.display_data.drag_data = null;
        }
    })
}



setMouseCallbacks()
resizeCanvas();
window.requestAnimationFrame(animation);
function animation(time) {
    main_app.players.blue.current_state[0] += 0.1;
    main_app.players.red.current_state[0] += (0.1 * Math.random()) - 0.05;
    main_app.players.red.current_state[1] += (0.1 * Math.random()) - 0.05;
    main_app.updateScreen();
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