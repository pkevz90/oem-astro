// Functions to build techniques
function handleTechnique(tactic, X, Y, event, wheelDir) {
	switch (tactic) {
		case 'nmc':
			nmcBuilder(X, Y, event);
			break;
		case 'flyby':
			flyBy(X, event);
			break;
		case 'fmc':
			fmcBuilder(X, Y, event, wheelDir);
			break;
		case 'dsk':
			dskBuilder(Y, event);
			break;
		case 'ht':
			htBuilder(Y, event);
			break;
		case 'burn':
			burnCalc(X, Y, event, wheelDir);
			break;
		case 'sensor':
			buildSensor(X, Y, event)
			break;

	}
}

function nmcBuilder(X, Y, event) {
	if (app.tacticArray.ae === undefined) {
		if (event === 'click') {
			let len = app.chartData.waypoints.data.length - 1;
			let B0 = Math.atan2(app.chartData.waypoints.data[len].x - X, -app.chartData.waypoints.data[len].y * 2);
			let ae = (app.chartData.waypoints.data[len].x - X) / Math.sin(B0);
			app.tacticArray = {
				xd: X,
				b0: B0,
				ae: ae
			};
			app.chartData.technique.data = [];
			app.chartData.waypoints.data.push({
				x: 0,
				y: 0,
				time: 0,
				dx: 0,
				dy: 0,
				deltaX: 0,
				deltaY: 0,
			});
			
			addBurnHistoryRow();
			setSelectedWaypoint('last');
			globalChartRef.update();
			return;
		}
		app.chartData.technique.data = [{
			x: X,
			y: -app.axisLimits * 3 / 4
		}, {
			x: X,
			y: app.axisLimits * 3 / 4
		}];
		globalChartRef.update();
	} else {
		if (event === 'click') {
			app.tacticArray = {};
			app.tactic = undefined;
			return;
		}
		let len = app.chartData.waypoints.data.length - 1;
		let B = Math.atan2(X - app.tacticArray.xd, -Y * 2);
		if (B * app.tacticArray.b0 < 0) {
			if (B < 0) {
				B += 2 * Math.PI;
			}
		} else {
			if (app.tacticArray.b0 > B) {
				B += 2 * Math.PI;
			}
		}

		Object.assign(app.chartData.waypoints.data[len], {
			x: app.tacticArray.ae * Math.sin(B) + app.tacticArray.xd,
			y: -app.tacticArray.ae / 2 * Math.cos(B),
			time: (B - app.tacticArray.b0) / (2 * Math.PI / 86164)
		})
		app.chartData.chosen.data = [{
			x: app.chartData.waypoints.data[len].x,
			y: app.chartData.waypoints.data[len].y,
		}];
		calculateTrajecories();
		drawSunMoonVectors(julianDateCalc(app.startTime), Number(app.maneuverListSpans[app.chosenWaypoint * 5].innerText) * 3600);
	}
}

function flyBy(X, event) {
	if (event === 'start') {
		let len = app.chartData.waypoints.data.length;
		if (app.chartData.waypoints.data[len - 1].y === 0) {
			app.tactic = undefined;
			showNoteBar('No drift occurs while perched on V-Bar');
			return;
		}
		showNoteBar('Fly-By: Choose End Point');
		app.chartData.waypoints.data.push({
			x: 0,
			y: 0,
			time: 0,
			dx: 0,
			dy: 0,
			deltaX: 0,
			deltaY: 0,
		})
		addBurnHistoryRow();
		setSelectedWaypoint('last');
		globalChartRef.update();
	} else if (event === 'click') {
		app.tactic = undefined;
		app.tacticArray = {};
		tooltipOpen = false;
		app.chartData.technique.data = [];
		globalChartRef.update();
	} else {
		let len = app.chartData.waypoints.data.length - 1;
		if (app.chartData.waypoints.data[len - 1].y * (X - app.chartData.waypoints.data[len - 1].x) > 0) {
			// Fly-By must occur in proper direction
			showNoteBar('Drift must occur in proper direction');
			return;
		}
		let t = Math.abs((X - app.chartData.waypoints.data[len - 1].x) / (1.5 * app.chartData.waypoints.data[len - 1].y * 2 * Math.PI / 86164));
		if (t === 0) {
			// time of 0 seconds will return a singularity in the HCW equations
			return;
		}
		if (X === undefined) {
			X = 0;
		}
		app.chartData.technique.data = [{
			x: X,
			y: -app.axisLimits * 3 / 4
		}, {
			x: X,
			y: app.axisLimits * 3 / 4
		}];

		Object.assign(app.chartData.waypoints.data[len], {
			x: X,
			y: app.chartData.waypoints.data[len - 1].y,
			time: t
		})
		app.chartData.chosen.data = [{
			x: app.chartData.waypoints.data[len].x,
			y: app.chartData.waypoints.data[len].y,
		}];
		calculateTrajecories();
		drawSunMoonVectors(julianDateCalc(app.startTime), Number(app.maneuverListSpans[app.chosenWaypoint * 5].innerText) * 3600);
	}
}

function burnCalc(X, Y, event, wheelDir) {
	if (event === 'start') {
		app.tacticArray = {
			t: 7200,
			x: 0,
			y: 0
		};
		app.chartData.waypoints.data.push({
			x: 0,
			y: 0,
			time: 7200,
			dx: 0,
			dy: 0,
			deltaX: 0,
			deltaY: 0,
		})
		addBurnHistoryRow();
		globalChartRef.update();
		return;
	} else if (event === 'click') {
		app.tactic = undefined;
		app.tacticArray = {};
		tooltipOpen = false;
		app.chartData.technique.data = [];
		globalChartRef.update();
		return;
	} else if (event === 'wheel') {
		if (wheelDir > 0) {
			if (app.tacticArray.t > 3600) {
				app.tacticArray.t -= 3600;
			}
		} else {
			app.tacticArray.t += 3600;
		}
	}
	let len = app.chartData.waypoints.data.length - 1;
	let t = app.tacticArray.t;

	if (X === undefined || Y === undefined) {
		X = app.tacticArray.x;
		Y = app.tacticArray.y;
	} else {
		app.tacticArray.x = X;
		app.tacticArray.y = Y;
	}
	let pos = [
		[app.chartData.waypoints.data[len - 1].y],
		[app.chartData.waypoints.data[len - 1].x]
	];
	let vel = [
		[app.chartData.waypoints.data[len - 1].dy],
		[app.chartData.waypoints.data[len - 1].dx]
	];
	let az = Math.atan2(Y - pos[0], X - pos[1]);
	let dV = 0.00005 * math.norm([Y - pos[0], X - pos[1]]);
	dV = [
		[dV * Math.sin(az)],
		[dV * Math.cos(az)]
	];
	vel = math.add(vel, dV);
	let r = math.add(math.multiply(PhiRR(t), pos), math.multiply(PhiRV(t), vel));
	Object.assign(app.chartData.waypoints.data[len], {
		x: r[1][0],
		y: r[0][0],
		time: t
	})
	app.chartData.technique.data = [{
		x: pos[1][0],
		y: pos[0][0],
	}, {
		x: X,
		y: Y,
	}];
	calculateTrajecories();


}

function fmcBuilder(X, Y, eventType, wheelDir) {
	if (eventType === 'wheel') {
		// Adds or takes away waypoints in FMC
		let len = app.chartData.waypoints.data.length - 1;
		X = app.chartData.waypoints.data[len].x;
		Y = app.chartData.waypoints.data[len].y;
		if (wheelDir < 0) {
			app.tacticArray.n++;
			app.chartData.waypoints.data.push({
				x: 0,
				y: 0,
				dx: 0,
				dy: 0,
				deltaX: 0,
				deltaY: 0,
				time: 7200
			})
			addBurnHistoryRow();
		} else {
			if (app.tacticArray.n < 3) {
				return;
			}
			app.tacticArray.n--;
			app.chartData.waypoints.data.pop();
			document.getElementById("burnTableBody").deleteRow(app.chartData.waypoints.data.length);
		}
		globalChartRef.update();
	} else if (eventType === 'click') {
		if (app.tacticArray.az0 === undefined) {
			// Finds length of current vector of waypoints
			let len = app.chartData.waypoints.data.length - 1;
			// Finds azimuth of last waypoint taking into account middle of FMC
			let az = Math.atan2(app.chartData.waypoints.data[len].y, app.chartData.waypoints.data[len].x - X);
			// Finds initial distance from middle of FMC to find radius of desired FMC
			let r = math.norm([app.chartData.waypoints.data[len].y, app.chartData.waypoints.data[len].x - X]);
			app.tacticArray = {
				az0: az,
				n: 4,
				xd: X,
				r: r
			};
			for (var ii = 0; ii < 4; ii++) {
				app.chartData.waypoints.data.push({
					x: 0,
					y: 0,
					dx: 0,
					dy: 0,
					deltaX: 0,
					deltaY: 0,
					time: 7200
				})
				addBurnHistoryRow();
			}
			globalChartRef.update();
		} else {
			app.tactic = undefined;
			app.tacticArray = {};
			app.chartData.technique.data = [];
			globalChartRef.update();
		}
	}
	// Runs on wheel command as well to make visuals smoother
	if (eventType === 'hover' || eventType === 'wheel') {
		if (app.tacticArray.az0 === undefined) {
			// No data given, user selecting in-track center
			app.chartData.technique.data = [{
				x: X,
				y: -app.axisLimits * 3 / 4
			}, {
				x: X,
				y: app.axisLimits * 3 / 4
			}];
			globalChartRef.update();
		} else {
			// User selecting ending azimuth of FMC, filling in points in-between
			let len = app.chartData.waypoints.data.length - 1;
			let azCur, xCur, yCur, az = Math.atan2(Y, X - app.tacticArray.xd);
			// Accounts for ambiguity in radians
			if (az * app.tacticArray.az0 < 0) {
				if (az < 0) {
					az += 2 * Math.PI;
				}
			} else {
				if (app.tacticArray.az0 > az) {
					az += 2 * Math.PI;
				}
			}
			// Time between FMC waypoints
			dt = (az - app.tacticArray.az0) / (2 * Math.PI / 86164) / app.tacticArray.n;
			for (var ii = 0; ii < app.tacticArray.n; ii++) {
				azCur = app.tacticArray.az0 + (az - app.tacticArray.az0) * (ii + 1) / app.tacticArray.n;
				xCur = app.tacticArray.r * Math.cos(azCur) + app.tacticArray.xd;
				yCur = app.tacticArray.r * Math.sin(azCur);
				Object.assign(app.chartData.waypoints.data[len - (app.tacticArray.n - 1) + ii], {
					x: xCur,
					y: yCur,
					time: dt
				});
			}
			calculateTrajecories();
		}
	}
}

function buildSensor(X, Y, event) {
	if (event === 'start') {
		if (app.numSensors > 0) {
			globalChartRef.config.data.datasets.push({
				data: [],
				fill: true,
				showLine: true,
				pointRadius: 0,
				lineTension: 0,
				backgroundColor: 'rgba(255,150,150,0.5)'
			});
		}
	} else if (event === 'click') {
		if (app.tacticArray.az0 === undefined) {
			app.tacticArray.az0 = Math.atan2(Y, X);
			if (app.tacticArray.az0 < 0) {
				app.tacticArray.az0 += 2 * Math.PI;
			}
			app.tacticArray.r = math.norm([Y, X]);
		} else {
			app.chartData.technique.data = [];
			app.numSensors++;
			app.tactic = undefined;
			app.tacticArray = {};
		}
	} else {
		if (app.tacticArray.az0 === undefined) {
			app.chartData.technique.data = [{
				x: 0,
				y: 0,
			}, {
				x: X,
				y: Y,
			}];
		} else {
			let az = Math.atan2(Y, X);
			if (az < 0) {
				az += 2 * Math.PI;
			}
			let azDel = (app.tacticArray.az0 - az);
			if (azDel > Math.PI) {
				azDel = -Math.PI + (azDel - Math.PI);
			} else if (azDel < -Math.PI) {
				azDel = Math.PI + (azDel + Math.PI);
			}
			globalChartRef.config.data.datasets[app.dataLoc.sensorStart + app.numSensors].data = [{
				x: 0,
				y: 0,
			}];
			let numW = Math.floor(Math.abs(azDel) / 0.1),
				azT;

			for (var ii = 0; ii <= numW * 2; ii++) {
				azT = az + ii * azDel / numW;

				globalChartRef.config.data.datasets[app.dataLoc.sensorStart + app.numSensors].data.push({
					x: app.tacticArray.r * Math.cos(azT),
					y: app.tacticArray.r * Math.sin(azT),
				})
			}
			globalChartRef.config.data.datasets[app.dataLoc.sensorStart + app.numSensors].data.push({
				x: 0,
				y: 0,
			})
		}
	}
	globalChartRef.update();
}

function dskBuilder(Yvalue, event) {
	if (event === 'start') {
		let len = app.chartData.waypoints.data.length - 1;
		if (app.chartData.waypoints.data[len].y === 0) {
			app.tactic = undefined;
			showNoteBar('DSK not possible perched on V-Bar');
			return;
		}
		showNoteBar('Dynamic Station Keeping');
		app.chartData.waypoints.data.push({
			x: app.chartData.waypoints.data[len].x,
			y: app.chartData.waypoints.data[len].y,
			time: 0,
			dx: 0,
			dy: 0,
			deltaX: 0,
			deltaY: 0,
		})
		addBurnHistoryRow();
		setSelectedWaypoint('last');
	} else if (event === 'click') {
		app.tacticArray = {};
		app.tactic = undefined;
		app.chartData.technique.data = [];
		globalChartRef.update();
		return;
	} else {
		let len = app.chartData.waypoints.data.length - 1;
		let X = app.chartData.waypoints.data[len].x;
		let Y = app.chartData.waypoints.data[len].y;
		if (Math.abs(Yvalue) > Math.abs(Y)) {
			if (Yvalue * Y > 0) {
				Yvalue = Y;
				showNoteBar('Must be towards V-Bar');
			} else {
				Yvalue = -Y;
				showNoteBar('Results in NMC');
			}
		}
		app.chartData.technique.data = [{
			x: -app.axisLimits,
			y: Yvalue
		}, {
			x: app.axisLimits,
			y: Yvalue
		}];
		let desHeight = Math.abs(Y - Yvalue);
		let t1 = 7200,
			t2 = 7300,
			v1, r1, h2, v2, r2, dh;
		let del = 100;
		pos = [
			[Y],
			[X]
		];
		while (Math.abs(del) > 1e-3) {
			v1 = math.multiply(math.inv(PhiRV(t1)), math.subtract(pos, math.multiply(PhiRR(t1), pos)));
			r1 = math.add(math.multiply(PhiRR(t1 / 2), pos), math.multiply(PhiRV(t1 / 2), v1));
			h1 = Math.abs(r1[0][0] - pos[0][0]);

			v2 = math.multiply(math.inv(PhiRV(t2)), math.subtract(pos, math.multiply(PhiRR(t2), pos)));
			r2 = math.add(math.multiply(PhiRR(t2 / 2), pos), math.multiply(PhiRV(t2 / 2), v2));
			h2 = Math.abs(r2[0][0] - pos[0][0]);

			dh = (h2 - h1) / 100;
			del = (h1 - desHeight) / dh;
			t1 -= del;
			t2 = t1 + 100;

		}
		app.chartData.waypoints.data[len].time = t1;
		calculateTrajecories();
		drawSunMoonVectors(julianDateCalc(app.startTime), Number(app.maneuverListSpans[app.chosenWaypoint * 5].innerText) * 3600);

	}
}

function htBuilder(Yvalue, event) {
	if (event === 'click') {
		app.tacticArray = {};
		app.tactic = '';
		app.chartData.technique.data = [];
		globalChartRef.update();
		return;
	} else {
		let len = app.chartData.waypoints.data.length - 1;
		let X = app.chartData.waypoints.data[len - 1].x;
		let Y = app.chartData.waypoints.data[len - 1].y;
		let xd = (Y + Yvalue) / 2;
		Object.assign(app.chartData.waypoints.data[len], {
			x: X - 1.5 * xd * Math.PI,
			y: Yvalue,
			time: 43082
		});
		app.chartData.technique.data = [{
			x: -app.axisLimits,
			y: Yvalue
		}, {
			x: app.axisLimits,
			y: Yvalue
		}];
		calculateTrajecories();
	}
}