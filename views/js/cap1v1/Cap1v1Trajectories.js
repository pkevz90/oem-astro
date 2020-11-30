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
		rad: r[0][0],
		it: r[1][0],
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
				dIt: v[1][0],
				rad: r[0][0],
				it: r[1][0],
			});
		}
	})
	globalChartRef.update();
}

function calcData(curTime = 0) {
	let redR, blueR;
	let curPoints = {};
	let curVel = {};
	for (sat in app.players) {
		curPoints[sat + 'R'] = calcCurrentPoint(curTime, sat)[0];
		curVel[sat + 'R'] = calcCurrentPoint(curTime, sat)[1];
		app.players[sat].dataLoc.current.data = [{
			x: curPoints[sat + 'R'][1],
			y: curPoints[sat + 'R'][0]
		}];
	}
	app.chartData.relative.data = [{
		x: curPoints[sideData.scenario_data.engageData[0] + 'R'][1],
		y: curPoints[sideData.scenario_data.engageData[0] + 'R'][0]
	}, {
		x: curPoints[sideData.scenario_data.engageData[1] + 'R'][1],
		y: curPoints[sideData.scenario_data.engageData[1] + 'R'][0]
	}]
	let curSun = math.squeeze(drawSunVectors(curTime * 3600)),
		relVector, catsAngle, satRange, pointAngle, canSee, minRangeSat;
	for (playerFrom in app.players) {
		canSee = false;
		minRangeSat = 1000; //Arbitrarily Large
		for (playerTo in app.players) {
			if (playerTo === playerFrom) {
				continue;
			}
			relVector = [curPoints[playerFrom + 'R'][0] - curPoints[playerTo + 'R'][0], curPoints[playerFrom + 'R'][1] - curPoints[playerTo + 'R'][1]],
			catsAngle = Math.acos(math.dot(curSun, relVector) / math.norm(relVector) / math.norm(curSun));
			satRange = math.norm(relVector);
			Object.assign(sideData.scenario_data.data[playerFrom].data[playerTo], {
				range: satRange,
				rangeRate: 1000 * math.dot(relVector,math.subtract(curVel[playerFrom + 'R'],curVel[playerTo + 'R'])) / math.norm(relVector),
				cats: catsAngle * 180 / Math.PI,
			});
			let targets = setupData[playerFrom].targets;
			targets = targets === undefined ? [] : targets;
			if (minRangeSat > satRange && (targets.includes(playerTo) || targets.length === 0)) {
				pointAngle = Math.atan2(relVector[1], -relVector[0]);
				minRangeSat = satRange;
			}
			if (playerFrom === setupData.team && (targets.includes(playerTo) || targets.length === 0)) {
				if (catsAngle < (Number(setupData[playerFrom].reqCats) * Math.PI / 180) && math.norm(relVector) >= Number(setupData[playerFrom].rangeReq[0]) && math.norm(relVector) <= Number(setupData[playerFrom].rangeReq[1])) {
					drawViewpoint([curPoints[setupData.team + 'R'][0], curPoints[setupData.team + 'R'][1]], Math.atan2(-relVector[0], -relVector[1]), math.norm(relVector), setupData.team);
					canSee = true;
				}
			}
			
		}
		// Set angle of the player's character
		pointAngle = pointAngle < 0 ? pointAngle * 180 / Math.PI + 360 : pointAngle * 180 / Math.PI;
		if (Math.abs(pointAngle - app.players[playerFrom].attitude) > 180) {
			pointAngle = pointAngle > app.players[playerFrom].attitude ? pointAngle - 360 : pointAngle + 360;
		}
		let pointDiff = pointAngle - app.players[playerFrom].attitude;
		if (Math.abs(pointDiff) > app.maxSlew && app.players[playerFrom].attitude !== undefined) {
			app.players[playerFrom].attitude += math.sign(pointDiff) * app.maxSlew;
		} else {
			app.players[playerFrom].attitude = pointAngle;
		}
		if (playerFrom === setupData.team) {
			if (!canSee) {
				app.chartData.view.data = [];
				globalChartRef.update();
			}
		}
		
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

function calcCurrentPoint(curTime, sat, pRR, pRV, pVR, pVV) {
	let priorWaypoint = Math.floor(curTime / (app.scenLength / app.numBurns));
	priorWaypoint = priorWaypoint > (app.numBurns - 1) ? app.numBurns - 1 : priorWaypoint;
	let timeDelta = 3600 * (curTime - priorWaypoint * app.scenLength / app.numBurns);
	pRR = PhiRR(timeDelta);
	pRV = PhiRV(timeDelta);
	pVR = PhiVR(timeDelta);
	pVV = PhiVV(timeDelta);
	let waypointState = [[app.players[sat].dataLoc.waypoints.data[priorWaypoint].rad],
						 [app.players[sat].dataLoc.waypoints.data[priorWaypoint].it],
						 [app.players[sat].dataLoc.waypoints.data[priorWaypoint].dRad + app.players[sat].burns[priorWaypoint][0] / 1000],
						 [app.players[sat].dataLoc.waypoints.data[priorWaypoint].dIt + app.players[sat].burns[priorWaypoint][1] / 1000]];
	let r = math.add(math.multiply(pRR, waypointState.slice(0,2)), math.multiply(pRV, waypointState.slice(2,4)));
	let v = math.add(math.multiply(pVR, waypointState.slice(0,2)), math.multiply(pVV, waypointState.slice(2,4)));
	return [math.squeeze(r),math.squeeze(v)];
	
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
		if (app.chosenWaypoint === undefined) {
			return;
		}
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
		if (app.chosenWaypoint[1] === setupData.team) {
			maxDv = Math.min(maxDv,setupData[setupData.team].maxDv)
		}
		distance = (distance > 10 * maxDv) ? 10 * maxDv : distance;
		// app.players[sat].burns[app.chosenWaypoint[0]] = [distance / 10 * Math.sin(az), distance / 10 * Math.cos(az)];
		app.players[sat].burns.splice(app.chosenWaypoint[0], 1, [distance / 10 * Math.sin(az), distance / 10 * Math.cos(az)]);
		setBottomInfo('R: ' + (distance / 10 * Math.sin(az)).toFixed(3) + ' m/s, I: ' + (distance / 10 * Math.cos(az)).toFixed(3) + ' m/s');
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
		if (app.chosenWaypoint === undefined) {
			return;
		}
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