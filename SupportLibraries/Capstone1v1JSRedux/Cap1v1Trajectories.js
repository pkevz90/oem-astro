function calculateTrajecory() {
	let numPoints = 50;
	app.calcDt = app.timeBetween / (numPoints + 1);
	globalChartRef.config.data.datasets[this.dataLoc.way].data = [];
	globalChartRef.config.data.datasets[this.dataLoc.traj].data = [];
	r = [
		[this.initState[0][0]],
		[this.initState[1][0]]
	];
	v = [
		[this.initState[2][0]],
		[this.initState[3][0]]
	];
	globalChartRef.config.data.datasets[this.dataLoc.way].data.push({
		x: r[1][0],
		y: r[0][0],
		dRad: v[0][0],
		dIt: v[1][0]
	});
	globalChartRef.config.data.datasets[this.dataLoc.traj].data.push({
		x: r[1][0],
		y: r[0][0]
	});
	let pRR = PhiRR(app.calcDt),
		pRV = PhiRV(app.calcDt),
		pVR = PhiVR(app.calcDt),
		pVV = PhiVV(app.calcDt);
	this.burns.forEach((burn, index) => {
		v = math.add(v, math.dotDivide(math.transpose([burn]), 1000));
		for (let ii = 0; ii <= numPoints; ii++) {
			let r1 = r;
			r = math.add(math.multiply(pRR, r), math.multiply(pRV, v));
			v = math.add(math.multiply(pVR, r1), math.multiply(pVV, v));
			globalChartRef.config.data.datasets[this.dataLoc.traj].data.push({
				x: r[1][0],
				y: r[0][0]
			});
		}
		// if ((index !== (app.burns[sat].length-1)) && (index >= (Number($turn.textContent)-1))) {
		if (index !== (this.burns.length - 1)) {
			globalChartRef.config.data.datasets[this.dataLoc.way].data.push({
				x: r[1][0],
				y: r[0][0],
				dRad: v[0][0],
				dIt: v[1][0]
			});
		}
	})
	globalChartRef.update();
}

function calcData(curTime = 0) {
	let redR = globalChartRef.config.data.datasets[app.players.red.dataLoc.traj].data[Math.floor(curTime * 3600 / app.calcDt)];
	redR = [
		[redR.y],
		[redR.x]
	];
	let blueR = globalChartRef.config.data.datasets[app.players.blue.dataLoc.traj].data[Math.floor(curTime * 3600 / app.calcDt)];
	blueR = [
		[blueR.y],
		[blueR.x]
	];

	drawSunVectors(curTime);
	setCurrentPoints(blueR, redR);

	let curSun = math.squeeze(drawSunVectors(curTime * 3600, [redR[0][0], redR[1][0]])),
		relVector = [blueR[0] - redR[0], blueR[1] - redR[1]],
		catsAngle = Math.acos(math.dot(curSun, relVector) / math.norm(relVector) / math.norm(curSun));

	// Update Data
	app.spans.scenData.curRange[0].textContent = math.norm([redR[0][0] - blueR[0][0], redR[1][0] - blueR[1][0]]).toFixed(2);
	app.spans.scenData.cats[0].textContent = (catsAngle * 180 / Math.PI).toFixed(2);

	for (var sat in app.players) {
		let total = 0;
		app.players[sat].burns.forEach(element => {
			total += math.norm(element);
		});
		app.spans.scenData.totalDv[sat][0].textContent = total.toFixed(2);
	}

	if (catsAngle > Math.PI / 2 && math.norm(relVector) >= 10 && math.norm(relVector) <= 15) {
		drawViewpoint([redR[0][0], redR[1][0]], Math.atan2(relVector[0], relVector[1]), math.norm(relVector), 'red');
	} else if (catsAngle < Math.PI / 2 && math.norm(relVector) >= 10 && math.norm(relVector) <= 15) {
		drawViewpoint([blueR[0][0], blueR[1][0]], Math.atan2(-relVector[0], -relVector[1]), math.norm(relVector), 'blue');
	} else {
		globalChartRef.config.data.datasets[app.dataLoc.view].data = [];
		globalChartRef.update();
	}
	let t1 = 1000,
		t2 = 0,
		range1, range2, t0 = 0,
		tf = globalChartRef.config.data.datasets[app.players.red.dataLoc.traj].data.length * app.calcDt;
	while (Math.abs(t1 - t2) > app.calcDt * 4) {
		t1 = (tf - t0) / 3 + t0;
		t2 = (tf - t0) * 2 / 3 + t0;
		redR = globalChartRef.config.data.datasets[app.players.red.dataLoc.traj].data[Math.floor(t1 / app.calcDt)];
		redR = [
			[redR.y],
			[redR.x]
		];
		blueR = globalChartRef.config.data.datasets[app.players.blue.dataLoc.traj].data[Math.floor(t1 / app.calcDt)];
		blueR = [
			[blueR.y],
			[blueR.x]
		];
		range1 = math.norm([redR[0][0] - blueR[0][0], redR[1][0] - blueR[1][0]]);
		redR = globalChartRef.config.data.datasets[app.players.red.dataLoc.traj].data[Math.floor(t2 / app.calcDt)];
		redR = [
			[redR.y],
			[redR.x]
		];
		blueR = globalChartRef.config.data.datasets[app.players.blue.dataLoc.traj].data[Math.floor(t2 / app.calcDt)];
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
	app.spans.scenData.minRange[0].textContent = math.norm([redR[0][0] - blueR[0][0], redR[1][0] - blueR[1][0]]).toFixed(2);
	app.spans.scenData.minRange[1].textContent = (t2 / 3600).toFixed(1);
	globalChartRef.update();
}

function plotBurnDirections() {
	let numWaypoints = globalChartRef.config.data.datasets[0].data.length;
	globalChartRef.config.data.datasets[7].data = [];
	for (var ii = 0; ii < (numWaypoints - 1); ii++) {
		globalChartRef.config.data.datasets[7].data.push({
			x: globalChartRef.config.data.datasets[0].data[ii].x,
			y: globalChartRef.config.data.datasets[0].data[ii].y,
		})
		globalChartRef.config.data.datasets[7].data.push({
			x: globalChartRef.config.data.datasets[0].data[ii].x + globalChartRef.config.data.datasets[0].data[ii].deltaX * 4000,
			y: globalChartRef.config.data.datasets[0].data[ii].y + globalChartRef.config.data.datasets[0].data[ii].deltaY * 4000,
		})
		globalChartRef.config.data.datasets[7].data.push({
			x: NaN,
			y: NaN
		})
	}
}

function burnCalc(xMouse, yMouse, click = false) {
	if (click) {
		app.tactic = '';
		globalChartRef.config.data.datasets[app.dataLoc.burnDir].data = [];
		return;
	} else {
		let xPoint = globalChartRef.config.data.datasets[app.chosenWaypoint[1]].data[app.chosenWaypoint[0]].x,
			yPoint = globalChartRef.config.data.datasets[app.chosenWaypoint[1]].data[app.chosenWaypoint[0]].y,
			distance = math.norm([xPoint - xMouse, yPoint - yMouse]),
			az = Math.atan2(-yPoint + yMouse, -xPoint + xMouse);


		let sat = (app.chosenWaypoint[1] === app.players.blue.dataLoc.way) ? 'blue' : 'red';
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
		app.players[sat].burns[app.chosenWaypoint[0]] = [distance / 10 * Math.sin(az), distance / 10 * Math.cos(az)];
		app.spans.manRows[sat][(app.chosenWaypoint[0]) * 2].textContent = (distance / 10 * Math.sin(az)).toFixed(2);
		app.spans.manRows[sat][(app.chosenWaypoint[0]) * 2 + 1].textContent = (distance / 10 * Math.cos(az)).toFixed(2);
		globalChartRef.config.data.datasets[app.dataLoc.burnDir].data = [{
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
		app.tacticData = undefined;
		globalChartRef.config.data.datasets[app.dataLoc.burnDir].data = [];
		return;
	} else {
		let r1 = [
				[globalChartRef.config.data.datasets[app.chosenWaypoint[1]].data[app.chosenWaypoint[0]].y],
				[globalChartRef.config.data.datasets[app.chosenWaypoint[1]].data[app.chosenWaypoint[0]].x]
			],
			r2 = [
				[yMouse],
				[xMouse]
			],
			v10 = [
				[globalChartRef.config.data.datasets[app.chosenWaypoint[1]].data[app.chosenWaypoint[0]].dRad],
				[globalChartRef.config.data.datasets[app.chosenWaypoint[1]].data[app.chosenWaypoint[0]].dIt]
			],
			v1f = math.multiply(math.inv(PhiRV(app.tacticData[0])), math.subtract(r2, math.multiply(PhiRR(app.tacticData[0]), r1))),
			dV = math.subtract(v1f, v10);

		if ((1000 * math.norm(math.squeeze(dV))) > app.tacticData[1]) {
			return;
		}
		app.players[sat].burns[app.chosenWaypoint[0]] = [dV[0][0] * 1000, dV[1][0] * 1000];
		app.spans.manRows[sat][(app.chosenWaypoint[0]) * 2].textContent = (dV[0][0] * 1000).toFixed(2);
		app.spans.manRows[sat][(app.chosenWaypoint[0]) * 2 + 1].textContent = (dV[1][0] * 1000).toFixed(2);

		globalChartRef.config.data.datasets[app.dataLoc.burnDir].data = [{
			x: r1[1][0],
			y: r1[0][0]
		}, {
			x: r1[1][0] + dV[1][0] * 10000,
			y: r1[0][0] + dV[0][0] * 10000
		}];
		app.players[(app.chosenWaypoint[1] === app.players.blue.dataLoc.way) ? 'blue' : 'red'].calculateTrajecory();
		calcData(app.currentTime);

	}
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