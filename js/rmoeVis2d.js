let globalChartRef1, globalChartRef2, globalChartRef3, axisLimits = 20,
	axisCenter = 0;

function createGraph1() {
	var config = {
		type: 'scatter',
		data: {
			datasets: [{
				// label: "Waypoints",
				data: [],
				fill: false,
				showLine: true,
				pointRadius: 0,
				borderColor: 'rgba(120,200,255,1)'
			}, {
				// label: "Current Point",
				data: [{
					x: 0,
					y: 0
				}],
				fill: false,
				showLine: true,
				pointRadius: 5,
				pointBackgroundColor: 'rgba(120,255,255,1)',
				borderColor: 'rgba(120,200,255,1)'
			}]
		},
		options: {
			animation: {
				duration: 0
			},
			legend: {
				display: false
			},
			onClick: function (element, dataAtClick) {

			},
			title: {
				display: true,
				text: "View from Earth",
				fontColor: 'rgba(255,255,255,1)',
				fontSize: 20
			},
			scales: {
				xAxes: [{
					gridLines: {
						zeroLineColor: '#ffcc33',
						color: 'rgba(255,255,255,0.25)'
					},
					type: "linear",
					display: true,
					scaleLabel: {
						display: true,
						labelString: 'In-Track',
						fontColor: 'rgba(255,255,255,1)',
						fontSize: 30
					},
					ticks: {
						min: -axisLimits,
						max: axisLimits,
						fontSize: 20,
						reverse: true,
						fontColor: 'rgba(255,255,255,1)',
					},
					afterBuildTicks: (a, ticks) => {

						if (app.playBool) {
							ticks.pop();
							ticks.shift();
							ticks.pop();
							ticks.shift();
						}
						return ticks;
					}
				}, ],
				yAxes: [{
					gridLines: {
						zeroLineColor: '#ffcc33',
						color: 'rgba(255,255,255,0.25)'
					},
					display: true,
					scaleLabel: {
						display: true,
						labelString: 'Cross-Track',
						fontColor: 'rgba(255,255,255,1)',
						fontSize: 30
					},
					ticks: {
						min: -3 * axisLimits / 4,
						max: 3 * axisLimits / 4,
						fontColor: 'rgba(255,255,255,1)',
						fontSize: 20,
					}
				}]
			},
			responsive: true,
			maintainAspectRatio: true
		}
	};

	var ctx = document.getElementById('ChartCnvs1').getContext('2d');
	globalChartRef1 = new Chart(ctx, config);
}

function createGraph2() {
	var config = {
		type: 'scatter',
		data: {
			datasets: [{
				// label: "Waypoints",
				data: [],
				fill: false,
				showLine: true,
				pointRadius: 0,
				borderColor: 'rgba(120,200,255,1)'
			}, {
				// label: "Current Point",
				data: [{
					x: 0,
					y: 0
				}],
				fill: false,
				showLine: true,
				pointRadius: 5,
				pointBackgroundColor: 'rgba(120,255,255,1)',
				borderColor: 'rgba(120,200,255,1)'
			}]
		},
		options: {
			animation: {
				duration: 0
			},
			legend: {
				display: false
			},
			onClick: function (element, dataAtClick) {

			},
			title: {
				display: true,
				text: "Looking Down Orbit",
				fontColor: 'rgba(255,255,255,1)',
				fontSize: 20
			},
			scales: {
				xAxes: [{
					gridLines: {
						zeroLineColor: '#ffcc33',
						color: 'rgba(255,255,255,0.25)'
					},
					type: "linear",
					display: true,
					scaleLabel: {
						display: true,
						labelString: 'Radial',
						fontColor: 'rgba(255,255,255,1)',
						fontSize: 30
					},
					ticks: {
						min: -20,
						max: 20,
						fontSize: 20,
						reverse: true,
						fontColor: 'rgba(255,255,255,1)',
					}
				}, ],
				yAxes: [{
					gridLines: {
						zeroLineColor: '#ffcc33',
						color: 'rgba(255,255,255,0.25)'
					},
					display: true,
					scaleLabel: {
						display: true,
						labelString: 'Cross-Track',
						fontColor: 'rgba(255,255,255,1)',
						fontSize: 30
					},
					ticks: {
						min: -15,
						max: 15,
						fontColor: 'rgba(255,255,255,1)',
						fontSize: 20,
					}
				}]
			},
			responsive: true,
			maintainAspectRatio: true
		}
	};

	var ctx = document.getElementById('ChartCnvs2').getContext('2d');
	globalChartRef2 = new Chart(ctx, config);
}

function createGraph3() {
	var config = {
		type: 'scatter',
		data: {
			datasets: [{
				// label: "Waypoints",
				data: [],
				fill: false,
				showLine: true,
				pointRadius: 0,
				borderColor: 'rgba(120,200,255,1)'
			}, {
				// label: "Current Point",
				data: [{
					x: 0,
					y: 0
				}],
				fill: false,
				showLine: true,
				pointRadius: 5,
				pointBackgroundColor: 'rgba(120,255,255,1)',
				borderColor: 'rgba(120,200,255,1)'
			}, {
				// label: "Ellipse",
				data: [],
				fill: false,
				showLine: true,
				pointRadius: 0,
				borderDash: [10, 10],
				borderColor: 'rgba(255,255,255,0.5)'
			}, {
				// label: "Beta Fill",
				data: [],
				fill: true,
				showLine: true,
				pointRadius: 0,
				borderColor: 'rgba(255,255,255,0)',
				backgroundColor: 'rgba(255,255,250,0.15)'
			}]
		},
		options: {
			onResize: function (element, a) {
				// console.log(globalChartRef.config.options.scales.xAxes[0].scaleLabel)
				setLabelSize(a.width);
			},
			animation: {
				duration: 0
			},
			legend: {
				display: false
			},
			onClick: function (element, dataAtClick) {

			},
			title: {
				display: true,
				text: "In-Plane View",
				fontColor: 'rgba(255,255,255,1)',
				fontSize: 40
			},
			scales: {
				xAxes: [{
					gridLines: {
						zeroLineColor: '#ffcc33',
						color: 'rgba(255,255,255,0.25)'
					},
					type: "linear",
					display: true,
					scaleLabel: {
						display: true,
						labelString: 'In-Track',
						fontColor: 'rgba(255,255,255,1)',
						fontSize: 30
					},
					ticks: {
						min: -40,
						max: 40,
						fontSize: 20,
						reverse: true,
						fontColor: 'rgba(255,255,255,1)',
					},
					afterBuildTicks: (a, ticks) => {

						if (app.playBool) {
							ticks.pop();
							ticks.shift();
							ticks.pop();
							ticks.shift();
						}
						return ticks;
					}
				}, ],
				yAxes: [{
					gridLines: {
						zeroLineColor: '#ffcc33',
						color: 'rgba(255,255,255,0.25)'
					},
					display: true,
					scaleLabel: {
						display: true,
						labelString: 'Radial',
						fontColor: 'rgba(255,255,255,1)',
						fontSize: 30
					},
					ticks: {
						min: -20,
						max: 20,
						fontColor: 'rgba(255,255,255,1)',
						fontSize: 20,
					}
				}]
			},
			responsive: true,
			maintainAspectRatio: true
		}
	};

	var ctx = document.getElementById('ChartCnvs3').getContext('2d');
	globalChartRef3 = new Chart(ctx, config);
}


window.addEventListener('DOMContentLoaded', function () {
	createGraph1();
	createGraph2();
	createGraph3();
	setLabelSize($('#ChartCnvs3').width());
	globalChartRef1.update();
	globalChartRef2.update();
	globalChartRef3.update();
}, false);

// HCW equations
function PhiRR(t, n = 2 * Math.PI / 86164) {
	let nt = n * t;
	return [
		[4 - 3 * Math.cos(nt), 0, 0],
		[6 * (Math.sin(nt) - nt), 1, 0],
		[0, 0, Math.cos(nt)]
	];
}

function PhiRV(t, n = 2 * Math.PI / 86164) {
	let nt = n * t;
	return [
		[Math.sin(nt) / n, 2 * (1 - Math.cos(nt)) / n, 0],
		[(Math.cos(nt) - 1) * 2 / n, (4 * Math.sin(nt) - 3 * nt) / n, 0],
		[0, 0, Math.sin(nt) / n]
	];
}

function PhiVR(t, n = 2 * Math.PI / 86164) {
	let nt = n * t;
	return [
		[3 * n * Math.sin(nt), 0, 0],
		[6 * n * (Math.cos(nt) - 1), 0, 0],
		[0, 0, -n * Math.sin(nt)]
	];
}

function PhiVV(t, n = 2 * Math.PI / 86164) {
	let nt = n * t;
	return [
		[Math.cos(nt), 2 * Math.sin(nt), 0],
		[-2 * Math.sin(nt), 4 * Math.cos(nt) - 3, 0],
		[0, 0, Math.cos(nt)]
	];
}

function calculateTrajecories() {
	if (app.playBool) {
		return;
	}
	let dt = 1000;
	let n = 2 * Math.PI / 86164;
	let beta = app.b * Math.PI / 180;
	let m = app.m * Math.PI / 180;
	let r = [
		[-app.ae / 2 * Math.cos(beta) + app.xd],
		[app.ae * Math.sin(beta) + app.yd],
		[app.zmax * Math.sin(m)]
	];
	let v = [
		[app.ae * n / 2 * Math.sin(beta)],
		[app.ae * n * Math.cos(beta) - 1.5 * app.xd * n],
		[app.zmax * n * Math.cos(m)]
	];
	rr = PhiRR(dt, n);
	rv = PhiRV(dt, n);
	vr = PhiVR(dt, n);
	vv = PhiVV(dt, n);
	resetTrajectory();
	setCurrentPosition(r);
	createEllipse(app.yd, app.xd, app.ae, beta);
	for (ii = 0; ii < 186164; ii += dt) {
		globalChartRef3.config.data.datasets[0].data.push({
			x: r[1][0],
			y: r[0][0]
		});
		globalChartRef1.config.data.datasets[0].data.push({
			x: r[1][0],
			y: r[2][0]
		});
		if (ii < 90000) {
			globalChartRef2.config.data.datasets[0].data.push({
				x: r[0][0],
				y: r[2][0]
			})
		}
		let rTemp = math.add(math.multiply(rr, r), math.multiply(rv, v));
		v = math.add(math.multiply(vr, r), math.multiply(vv, v));
		r = rTemp;
	}
	globalChartRef3.update();
	globalChartRef2.update();
	globalChartRef1.update();
}

function createEllipse(xC, yC, a, B) {
	globalChartRef3.config.data.datasets[2].data = [];
	globalChartRef3.config.data.datasets[3].data = [];
	B = B % (2 * Math.PI);
	for (ii = 0; ii <= 2 * Math.PI; ii += 0.05) {
		globalChartRef3.config.data.datasets[2].data.push({
			x: a * Math.cos(ii) + xC,
			y: a / 2 * Math.sin(ii) + yC
		})
	}
	globalChartRef3.config.data.datasets[3].data.push({
		x: xC,
		y: yC
	})
	for (ii = 0; ii <= B; ii += 0.05) {
		globalChartRef3.config.data.datasets[3].data.push({
			x: a * Math.sin(ii) + xC,
			y: -a / 2 * Math.cos(ii) + yC
		})
	}
	globalChartRef3.config.data.datasets[3].data.push({
		x: a * Math.sin(B) + xC,
		y: -a / 2 * Math.cos(B) + yC
	}, {
		x: xC,
		y: yC
	});
}

function resetAxisSize() {
	globalChartRef3.config.options.scales.xAxes[0].ticks.min = -40 + axisCenter;
	globalChartRef3.config.options.scales.xAxes[0].ticks.max = 40 + axisCenter;
	globalChartRef1.config.options.scales.xAxes[0].ticks.min = -20 + axisCenter;
	globalChartRef1.config.options.scales.xAxes[0].ticks.max = 20 + axisCenter;
	//globalChartRef3.config.options.scales.yAxes[0].ticks.min = -3*axisLimits/4;
	//globalChartRef3.config.options.scales.yAxes[0].ticks.max = 3*axisLimits/4;
}

function setLabelSize(canvasWidth) {
	let labelSize = 60,
		fontSize = 90;;
	// console.log(canvasWidth);
	// console.log(globalChartRef1.config.options.title.fontSize);
	globalChartRef1.config.options.title.fontSize = canvasWidth / labelSize * 1.2;
	globalChartRef1.config.options.scales.xAxes[0].scaleLabel.fontSize = canvasWidth / labelSize;
	globalChartRef1.config.options.scales.yAxes[0].scaleLabel.fontSize = canvasWidth / labelSize;
	globalChartRef1.config.options.scales.xAxes[0].ticks.fontSize = canvasWidth / fontSize;
	globalChartRef1.config.options.scales.yAxes[0].ticks.fontSize = canvasWidth / fontSize
	globalChartRef2.config.options.title.fontSize = canvasWidth / labelSize * 1.2;
	globalChartRef2.config.options.scales.xAxes[0].scaleLabel.fontSize = canvasWidth / labelSize;
	globalChartRef2.config.options.scales.yAxes[0].scaleLabel.fontSize = canvasWidth / labelSize;
	globalChartRef2.config.options.scales.xAxes[0].ticks.fontSize = canvasWidth / fontSize;
	globalChartRef2.config.options.scales.yAxes[0].ticks.fontSize = canvasWidth / fontSize;
	globalChartRef3.config.options.title.fontSize = canvasWidth / labelSize * 1.2;
	globalChartRef3.config.options.scales.xAxes[0].scaleLabel.fontSize = canvasWidth / labelSize;
	globalChartRef3.config.options.scales.yAxes[0].scaleLabel.fontSize = canvasWidth / labelSize;
	globalChartRef3.config.options.scales.xAxes[0].ticks.fontSize = canvasWidth / fontSize;
	globalChartRef3.config.options.scales.yAxes[0].ticks.fontSize = canvasWidth / fontSize;


}

function setCurrentPosition(data) {
	globalChartRef3.config.data.datasets[1].data[0].x = data[1][0];
	globalChartRef3.config.data.datasets[1].data[0].y = data[0][0];
	globalChartRef2.config.data.datasets[1].data[0].x = data[0][0];
	globalChartRef2.config.data.datasets[1].data[0].y = data[2][0];
	globalChartRef1.config.data.datasets[1].data[0].x = data[1][0];
	globalChartRef1.config.data.datasets[1].data[0].y = data[2][0];
}

function resetTrajectory() {
	globalChartRef3.config.data.datasets[0].data = [];
	globalChartRef2.config.data.datasets[0].data = [];
	globalChartRef1.config.data.datasets[0].data = [];
}