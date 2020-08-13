function calculateTrajecory() {
	r = [
		[this.initState[0][0]],
		[this.initState[1][0]]
	];
	v = [
		[this.initState[2][0]],
		[this.initState[3][0]]
	];
	let numPoints = 5;
	app.calcDt = (app.scenLength / app.numBurns) * 3600 / (numPoints + 1);
	let pRR = PhiRR(app.calcDt),
		pRV = PhiRV(app.calcDt),
		pVR = PhiVR(app.calcDt),
		pVV = PhiVV(app.calcDt);

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
	let curPoints = setCurrentPoints(curTime);
	let curSun = math.squeeze(drawSunVectors(curTime * 3600)),
		relVector, catsAngle, satRange, pointAngle;
	let canSee = false;
	let minRangeSat = 1000; //Arbitrarily Large
	for (player in app.players) {
		if (player === setupData.team) {
			continue;
		}
		relVector = [curPoints[setupData.team + 'R'][0] - curPoints[player + 'R'][0], curPoints[setupData.team + 'R'][1] - curPoints[player + 'R'][1]],
			// console.log(relVector);
			catsAngle = Math.acos(math.dot(curSun, relVector) / math.norm(relVector) / math.norm(curSun));
		satRange = math.norm(relVector);
		Object.assign(sideData.scenario_data.data[player], {
			range: satRange,
			cats: catsAngle * 180 / Math.PI
		});
		if (minRangeSat > satRange) {
			pointAngle = Math.atan2(relVector[1], -relVector[0]);
			minRangeSat = satRange;
		}
		if (catsAngle < (Number(setupData.blue.reqCats) * Math.PI / 180) && math.norm(relVector) >= Number(setupData.blue.rangeReq[0]) && math.norm(relVector) <= Number(setupData.blue.rangeReq[1])) {
			drawViewpoint([curPoints[setupData.team + 'R'][0][0], curPoints[setupData.team + 'R'][1][0]], Math.atan2(-relVector[0], -relVector[1]), math.norm(relVector), setupData.team);
			canSee = true;
		}
	}
	// Set angle of the player's character
	pointAngle = pointAngle < 0 ? pointAngle * 180 / Math.PI + 360 : pointAngle * 180 / Math.PI;
	let pointDiff = pointAngle - app.players[setupData.team].attitude;
	if (Math.abs(pointDiff) > 180) {
		pointAngle = pointAngle > app.players[setupData.team].attitude ? pointAngle - 360 : pointAngle + 360;
	}
	if (Math.abs(pointDiff) > app.maxSlew && app.players[setupData.team].attitude !== undefined) {
		app.players[setupData.team].attitude += math.sign(pointDiff) * app.maxSlew;
	} else {
		app.players[setupData.team].attitude = pointAngle;
	}
	if (!canSee) {
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


function burnCalc(xMouse = 0, yMouse = 0, click = false) {
	if (click) {
		app.tactic = '';
		app.chosenWaypoint = undefined;
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
		let totalDv = 0;
		for (let ii = 0; ii < app.players[sat].burns.length; ii++) {
			if (ii === app.chosenWaypoint[0]) {
				continue;
			};
			totalDv += math.norm(app.players[sat].burns[ii]);
		}
		maxDv = setupData[sat].dVavail - totalDv;
		distance = (distance > 10 * maxDv) ? 10 * maxDv : distance;
		// app.players[sat].burns[app.chosenWaypoint[0]] = [distance / 10 * Math.sin(az), distance / 10 * Math.cos(az)];
		app.players[sat].burns.splice(app.chosenWaypoint[0], 1, [distance / 10 * Math.sin(az), distance / 10 * Math.cos(az)]);
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
		$('.info-right').text('');
		app.chartData.selected.data = [];
		setBottomInfo();
		let ii = 0;
		let inter = setInterval(() => {
			showDeltaVLimit((app.chosenWaypoint[1] === app.players.blue.dataLoc.way) ? 'blue' : 'red', {
				time: app.tacticData.time,
				availDv: app.tacticData.availDv * (10 - ii) / 10
			})
			globalChartRef.update();
			if (ii === 10) {
				app.chartData.targetLim.data = [];
				app.chosenWaypoint = undefined;
				app.tacticData = undefined;
				clearInterval(inter);
			}
			globalChartRef.update();
			ii++;
		}, 5);
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
		app.players[sat].burns.splice(app.chosenWaypoint[0], 1, [dV[0][0] * 1000, dV[1][0] * 1000]);
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