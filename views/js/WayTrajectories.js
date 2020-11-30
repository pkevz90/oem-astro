function calculateTrajecories() {
	let numWaypoints = app.chartData.waypoints.data.length;
	let r1, r2, r, v1, t;
	var dt = 1000;
	app.chartData.trajectory.data = [];
	let vxOld = 0,
		vyOld = 0;
	for (var ii = 0; ii < (numWaypoints - 1); ii++) {
		t = app.chartData.waypoints.data[ii + 1].time;
		r1 = [
			[app.chartData.waypoints.data[ii].y],
			[app.chartData.waypoints.data[ii].x]
		];
		r2 = [
			[app.chartData.waypoints.data[ii + 1].y],
			[app.chartData.waypoints.data[ii + 1].x]
		];

		v1 = math.multiply(math.inv(PhiRV(t)), math.subtract(r2, math.multiply(PhiRR(t), r1)));
		v2 = math.add(math.multiply(PhiVR(t), r1), math.multiply(PhiVV(t), v1));
		Object.assign(app.chartData.waypoints.data[ii], {
			deltaX: v1[1][0] - vxOld,
			deltaY: v1[0][0] - vyOld
		});
		vxOld = v2[1][0];
		vyOld = v2[0][0];
		Object.assign(app.chartData.waypoints.data[ii + 1], {
			dx: vxOld,
			dy: vyOld
		});
		for (var kk = 0; kk < t; kk += dt) {
			r = math.add(math.multiply(PhiRR(kk), r1), math.multiply(PhiRV(kk), v1));
			app.chartData.trajectory.data.push({
				x: r[1],
				y: r[0]
			});
		}
		app.chartData.trajectory.data.push({
			x: r2[1],
			y: r2[0]
		});
	}
	if (app.chosenWaypoint !== undefined) {
		calcPassiveTraj();
	}
	plotBurnDirections();
	annotateBurnHistory();
	globalChartRef.update();
}

function playTrajectory() {
	let numWaypoints = app.chartData.waypoints.data.length;
	let r1, r2, r, v1, t;
	var dt = 100;
	app.chartData.trajectory.data = [];
	let traj = [];
	for (var ii = 0; ii < (numWaypoints - 1); ii++) {
		t = app.chartData.waypoints.data[ii + 1].time;
		r1 = [
			[app.chartData.waypoints.data[ii].y],
			[app.chartData.waypoints.data[ii].x]
		];
		r2 = [
			[app.chartData.waypoints.data[ii + 1].y],
			[app.chartData.waypoints.data[ii + 1].x]
		];

		v1 = math.multiply(math.inv(PhiRV(t)), math.subtract(r2, math.multiply(PhiRR(t), r1)));
		for (var kk = 0; kk < t; kk += dt) {
			r = math.add(math.multiply(PhiRR(kk), r1), math.multiply(PhiRV(kk), v1));
			traj.push([r[1], r[0]]);
		}
	}
	return traj;
}

function calcPassiveTraj() {
	// Show passive trajectory
	app.chartData.passive.data = [];
	let rPass = [
		[app.chartData.waypoints.data[app.chosenWaypoint].y],
		[app.chartData.waypoints.data[app.chosenWaypoint].x]
	];
	let vPass = [
		[app.chartData.waypoints.data[app.chosenWaypoint].dy],
		[app.chartData.waypoints.data[app.chosenWaypoint].dx]
	];
	let r2;
	for (var jj = 0; jj <= app.passiveTime; jj += 0.5) {
		r2 = math.add(math.multiply(PhiRR(jj * 3600), rPass), math.multiply(PhiRV(jj * 3600), vPass));
		app.chartData.passive.data.push({
			x: r2[1],
			y: r2[0],
		});
	}
}

function plotBurnDirections() {

	let numWaypoints = app.chartData.waypoints.data.length;
	app.chartData.burn.data = [];
	if (!document.getElementById("burnCheck").checked) {
		return;
	}
	for (var ii = 0; ii < (numWaypoints - 1); ii++) {
		app.chartData.burn.data.push({
			x: app.chartData.waypoints.data[ii].x,
			y: app.chartData.waypoints.data[ii].y,
		},{
			x: app.chartData.waypoints.data[ii].x + app.chartData.waypoints.data[ii].deltaX * 4000,
			y: app.chartData.waypoints.data[ii].y + app.chartData.waypoints.data[ii].deltaY * 4000,
		},{
			x: NaN,
			y: NaN
		});
	}
}

function drawSunMoonVectors(time, dt) {
	let long = 0 * Math.PI / 180;
	let theta0 = thetaGMST(time) * Math.PI / 180;
	let n = 2 * Math.PI / 86164;
	app.chartData.sun.data = [];
	app.chartData.moon.data = [];
	if (document.getElementById("sunCheck").checked) {
		initSunVector = sunVectorCalc(time);
		if (dt === undefined) {
			dt = 0;
		}
		let R = [
			[Math.cos(-long - theta0 - n * dt), -Math.sin(-long - theta0 - n * dt), 0],
			[Math.sin(-long - theta0 - n * dt), Math.cos(-long - theta0 - n * dt), 0],
			[0, 0, 1]
		];
		initSunVector = math.multiply(R, initSunVector);
		app.chartData.sun.data = [{
			x: 0,
			y: 0
		}, {
			x: initSunVector[1][0] * 10,
			y: initSunVector[0][0] * 10
		}];
	}
	if (document.getElementById("moonCheck").checked) {
		let initMoonVector = moonVectorCalc(time);
		if (dt === undefined) {
			dt = 0;
		}
		let R = [
			[Math.cos(-long - theta0 - n * dt), -Math.sin(-long - theta0 - n * dt), 0],
			[Math.sin(-long - theta0 - n * dt), Math.cos(-long - theta0 - n * dt), 0],
			[0, 0, 1]
		];
		initMoonVector = math.multiply(R, initMoonVector);
		app.chartData.moon.data = [{
			x: 0,
			y: 0
		}, {
			x: initMoonVector[1][0] * 10,
			y: initMoonVector[0][0] * 10
		}];
	}
	globalChartRef.update();
}