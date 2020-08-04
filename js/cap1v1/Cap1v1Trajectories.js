function calculateTrajecory() {
	r = [
		[this.initState[0][0]],
		[this.initState[1][0]]
	];
	v = [
		[this.initState[2][0]],
		[this.initState[3][0]]
	];
	let numPoints = 12;
	app.calcDt = (app.scenLength / app.numBurns) * 3600 / (numPoints + 1);
	let pRR = PhiRR(app.calcDt),
		pRV = PhiRV(app.calcDt),
		pVR = PhiVR(app.calcDt),
		pVV = PhiVV(app.calcDt);

	if (this.name.substr(0, 4) === 'gray') {
		for (let t = 0; t <= app.scenLength * 3600; t += app.calcDt) {
			let r1 = r;
			r = math.add(math.multiply(pRR, r), math.multiply(pRV, v));
			v = math.add(math.multiply(pVR, r1), math.multiply(pVV, v));
			this.dataLoc.trajectory.data.push({
				x: r[1][0],
				y: r[0][0]
			});
		}
		return;
	}
	let turn = Number($turn.text()) - 1;
	this.dataLoc.waypoints.data = [];
	this.dataLoc.trajectory.data = [];
	this.dataLoc.waypoints.data.push({
		x: turn > 0 ? NaN : r[1][0],
		y: turn > 0 ? NaN : r[0][0],
		dRad: v[0][0],
		dIt: v[1][0]
	});
	this.dataLoc.trajectory.data.push({
		x: r[1][0],
		y: r[0][0]
	});
	this.burns.forEach((burn, index) => {
		v = math.add(v, math.dotDivide(math.transpose([burn]), 1000));
		for (let ii = 0; ii <= numPoints; ii++) {
			let r1 = r;
			r = math.add(math.multiply(pRR, r), math.multiply(pRV, v));
			v = math.add(math.multiply(pVR, r1), math.multiply(pVV, v));
			this.dataLoc.trajectory.data.push({
				x: r[1][0],
				y: r[0][0]
			});
		}
		// console.log(turn,index);
		// if ((index !== (app.burns[sat].length-1)) && (index >= (Number($turn.textContent)-1))) {
		if (index !== (this.burns.length - 1)) {
			this.dataLoc.waypoints.data.push({
				x: turn > index + 1 ? NaN : r[1][0],
				y: turn > index + 1 ? NaN : r[0][0],
				dRad: v[0][0],
				dIt: v[1][0]
			});
		}
	})
	globalChartRef.update();
}

function calcData(curTime = 0) {
	let redR, blueR;
	drawSunVectors(curTime);
	let curPoints = setCurrentPoints(curTime);

	let curSun = math.squeeze(drawSunVectors(curTime * 3600, [curPoints.redR[0][0], curPoints.redR[1][0]])),
		relVector = [curPoints.blueR[0] - curPoints.redR[0], curPoints.blueR[1] - curPoints.redR[1]],
		catsAngle = Math.acos(math.dot(curSun, relVector) / math.norm(relVector) / math.norm(curSun));

	// Update Data
	Object.assign(sideData.scenario_data, {
		curRange: math.norm([curPoints.redR[0][0] - curPoints.blueR[0][0], curPoints.redR[1][0] - curPoints.blueR[1][0]]),
		curCats: catsAngle * 180 / Math.PI
	});

	for (let sat in app.players) {
		let total = 0;
		if (app.players[sat].name.substr(0, 4) === 'gray') {
			continue;
		}
		app.players[sat].burns.forEach(element => {
			total += math.norm(element);
		});
		sideData.scenario_data[sat + 'Dv'] = total;
	}

	if (catsAngle < app.reqCats && math.norm(relVector) >= app.rangeReq[0] && math.norm(relVector) <= app.rangeReq[1]) {
		drawViewpoint([curPoints.blueR[0][0], curPoints.blueR[1][0]], Math.atan2(-relVector[0], -relVector[1]), math.norm(relVector), 'blue');
	} else {
		app.chartData.view.data = [];
		globalChartRef.update();
	}
	let t1 = 1000,
		t2 = 0,
		range1, range2, t0 = 0,
		tf = app.players.red.dataLoc.trajectory.data.length * app.calcDt;
	while (Math.abs(t1 - t2) > 60) {
		t1 = (tf - t0) / 3 + t0;
		t2 = (tf - t0) * 2 / 3 + t0;
		redR = app.players.red.dataLoc.trajectory.data[Math.floor(t1 / app.calcDt)];
		redR = [
			[redR.y],
			[redR.x]
		];
		blueR = app.players.blue.dataLoc.trajectory.data[Math.floor(t1 / app.calcDt)];
		blueR = [
			[blueR.y],
			[blueR.x]
		];
		range1 = math.norm([redR[0][0] - blueR[0][0], redR[1][0] - blueR[1][0]]);
		redR = app.players.red.dataLoc.trajectory.data[Math.floor(t2 / app.calcDt)];
		redR = [
			[redR.y],
			[redR.x]
		];
		blueR = app.players.blue.dataLoc.trajectory.data[Math.floor(t2 / app.calcDt)];
		blueR = [
			[blueR.y],
			[blueR.x]
		];
		range2 = math.norm([redR[0][0] - blueR[0][0], redR[1][0] - blueR[1][0]]);
		if (range2 > range1) {
			tf = t2;
		} else {
			t0 = t1;
		}
	}
	Object.assign(sideData.scenario_data, {
		closeApproach: math.norm([redR[0][0] - blueR[0][0], redR[1][0] - blueR[1][0]]),
		closeTime: hrsToTime(t2 / 3600)
	});
	globalChartRef.update();
}


function burnCalc(xMouse, yMouse, click = false) {
	if (click) {
		app.tactic = '';
		$('.info-right')[0].textContent = '';
		app.chosenWaypoint = undefined;
		app.chartData.burnDir.data = [];
		app.chartData.selected.data = [];
		setBottomInfo();
		globalChartRef.update();
		return;
	} else {
		let xPoint = app.players[app.chosenWaypoint[1]].dataLoc.waypoints.data[app.chosenWaypoint[0]].x,
			yPoint = app.players[app.chosenWaypoint[1]].dataLoc.waypoints.data[app.chosenWaypoint[0]].y,
			distance = math.norm([xPoint - xMouse, yPoint - yMouse]),
			az = Math.atan2(-yPoint + yMouse, -xPoint + xMouse);


		let sat = app.chosenWaypoint[1];
		let maxDv = 10;
		if (sat === 'blue') {
			let totalDv = 0;
			for (let ii = 0; ii < app.players.blue.burns.length; ii++) {
				if (ii === app.chosenWaypoint[0]) {
					continue;
				};
				totalDv += math.norm(app.players.blue.burns[ii]);
			}
			maxDv = app.deltaVAvail - totalDv;
		}
		distance = (distance > 10 * maxDv) ? 10 * maxDv : distance;
		// app.players[sat].burns[app.chosenWaypoint[0]] = [distance / 10 * Math.sin(az), distance / 10 * Math.cos(az)];
		app.players[sat].burns.splice(app.chosenWaypoint[0],1,[distance / 10 * Math.sin(az), distance / 10 * Math.cos(az)]);
		setBottomInfo('R: ' + (distance / 10 * Math.sin(az)).toFixed(3) + ' m/s, I: ' + (distance / 10 * Math.cos(az)).toFixed(3) + ' m/s');
		app.chartData.burnDir.data = [{
			x: xPoint,
			y: yPoint
		}, {
			x: xPoint + distance * Math.cos(az),
			y: yPoint + distance * Math.sin(az)
		}];
		app.players[sat].calculateTrajecory();
		calcData(app.currentTime);
	}
}

function targetCalc(xMouse, yMouse, click = false) {
	if (click) {
		app.tactic = '';
		
		$('.info-right')[0].textContent = '';
		app.chartData.burnDir.data = [];
		app.chartData.selected.data = [];
		setBottomInfo();
		let ii = 0;
		let inter = setInterval(() => {
			showDeltaVLimit((app.chosenWaypoint[1] === app.players.blue.dataLoc.way) ? 'blue' : 'red', {
				time: app.tacticData.time,
				availDv: app.tacticData.availDv * (5 - ii) / 5
			})
			globalChartRef.update();
			if (ii === 5) {
				app.chartData.targetLim.data = [];
				app.chosenWaypoint = undefined;
				app.tacticData = undefined;
				clearInterval(inter);
			}
			globalChartRef.update();
			ii++;
		}, 10);
		globalChartRef.update();
		return;
	} else {
		let r1 = [
				[app.players[app.chosenWaypoint[1]].dataLoc.waypoints.data[app.chosenWaypoint[0]].y],
				[app.players[app.chosenWaypoint[1]].dataLoc.waypoints.data[app.chosenWaypoint[0]].x]
			],
			r2 = [
				[yMouse],
				[xMouse]
			],
			v10 = [
				[app.players[app.chosenWaypoint[1]].dataLoc.waypoints.data[app.chosenWaypoint[0]].dRad],
				[app.players[app.chosenWaypoint[1]].dataLoc.waypoints.data[app.chosenWaypoint[0]].dIt]
			],
			v1f = math.multiply(math.inv(PhiRV(app.tacticData.targetPos * app.scenLength / app.numBurns * 3600)), math.subtract(r2, math.multiply(PhiRR(app.tacticData.targetPos * app.scenLength / app.numBurns * 3600), r1))),
			dV = math.subtract(v1f, v10);
			
		if ((1000 * math.norm(math.squeeze(dV))) > app.tacticData.availDv) {
			let newNorm = app.tacticData.availDv / 1000;
			let newR = dV[0][0] / math.norm(math.squeeze(dV)) * newNorm;
			let newI = dV[1][0] / math.norm(math.squeeze(dV)) * newNorm;
			dV = [
				[newR],
				[newI]
			];
		}
		let sat = app.chosenWaypoint[1];
		app.players[sat].burns[app.chosenWaypoint[0]] = [dV[0][0] * 1000, dV[1][0] * 1000];
		setBottomInfo('R: ' + (dV[0][0] * 1000).toFixed(3) + ' m/s, I: ' + (dV[1][0] * 1000).toFixed(3) + ' m/s');
		app.chartData.burnDir.data = [{
			x: r1[1][0],
			y: r1[0][0]
		}, {
			x: r1[1][0] + dV[1][0] * 10000,
			y: r1[0][0] + dV[0][0] * 10000
		}];
		app.players[sat].calculateTrajecory();

		calcData(app.currentTime);

	}
}

function showDeltaVLimit(sat, avail) {
	app.chartData.targetLim.data = [];
	let dV = avail.availDv / 1000;
	let angle, nodes = 50,
		rBurn, iBurn;
	let initState = app.players[sat].dataLoc.waypoints.data[app.chosenWaypoint[0]];
	let r = [
		[initState.y],
		[initState.x]
	];
	let v = [
		[initState.dRad],
		[initState.dIt]
	];
	let vNew, r2;
	let pRR = PhiRR(avail.targetPos * app.scenLength / app.numBurns * 3600),
		pRV = PhiRV(avail.targetPos * app.scenLength / app.numBurns * 3600);
	for (let ii = 0; ii <= 50; ii++) {
		angle = 2 * Math.PI * ii / nodes;
		rBurn = dV * Math.cos(angle);
		iBurn = dV * Math.sin(angle);
		vNew = [
			[v[0][0] + rBurn],
			[v[1][0] + iBurn]
		]
		r2 = math.add(math.multiply(pRR, r), math.multiply(pRV, vNew));

		app.chartData.targetLim.data.push({
			x: r2[1][0],
			y: r2[0][0]
		});
	}
	globalChartRef.update();
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

function stateFromRoe(roe, n = 2 * Math.PI / 86164) {
	return [
        [-roe.ae / 2 * Math.cos(roe.B * Math.PI / 180) + roe.xd],
        [roe.ae * Math.sin(roe.B * Math.PI / 180) + roe.yd],
        [roe.ae * n / 2 * Math.sin(roe.B * Math.PI / 180)],
        [roe.ae * n * Math.cos(roe.B * Math.PI / 180) - 1.5 * roe.xd * n]
    ];
} 