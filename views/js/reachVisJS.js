let globalChartRef,
	sliders = [],
	sliderLabels = [],
	axisLimits = 40,
	axisCenter = 0,
	dtPlay = 500,
	playFrame, nPlay, playRR, playRV, playVR, playVV,
	rPlay, vPlay, aePlay, ydPlay, xdPlay, bPlay, playBool = false,
	colorMap = [
		[255, 255, 255],
		[207, 255, 25],
		[159, 255, 25],
		[112, 243, 25],
		[67, 195, 25],
		[22, 148, 25],
		[0, 101, 231],
		[0, 56, 183],
		[0, 11, 136],
		[0, 0, 90],
		[0, 0, 4],
		[0, 0, 0]
	];

function createGraph() {
	var config = {
		type: 'scatter',
		data: {
			datasets: [{
				// label: "Trajectory",
				data: [],
				fill: false,
				showLine: true,
				pointRadius: 0,
				borderColor: 'rgba(120,200,255,0.35)'
			}, {
				// label: "CurrentPosition",
				data: [{
					x: 0,
					y: 0
				}],
				fill: false,
				showLine: false,
				pointRadius: 7,
				borderColor: 'rgba(120,200,255,1)',
				backgroundColor: 'rgba(120,200,255,1)'
			}, {
				// label: "Reach",
				data: [],
				fill: false,
				showLine: true,
				pointRadius: 0,
				borderColor: 'rgba(255,255,255,1)',
			}]
		},
		options: {
			onResize: function (element, a) {
				// console.log(globalChartRef.config.options.scales.xAxes[0].scaleLabel)
				globalChartRef.config.options.scales.xAxes[0].scaleLabel.fontSize = a.width / 40;
				globalChartRef.config.options.scales.yAxes[0].scaleLabel.fontSize = a.width / 40;
				globalChartRef.config.options.scales.xAxes[0].ticks.fontSize = a.width / 60;
				globalChartRef.config.options.scales.yAxes[0].ticks.fontSize = a.width / 60;
			},
			animation: {
				duration: 0
			},
			legend: {
				display: false
			},
			title: {
				display: false,
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
						labelString: 'Radial',
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

						if (playBool) {
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
	globalChartRef = new Chart(ctx, config);
}

window.addEventListener('DOMContentLoaded', function () {

	createGraph();
	
	globalChartRef.chart.options.tooltips.enabled = false;
	globalChartRef.chart.options.events = [];
	console.log(globalChartRef)
	sliders = document.getElementById("sliderDiv").querySelectorAll("input");
	sliderLabels = document.getElementById("sliderDiv").querySelectorAll("span");
	for (var ii = 0; ii < sliders.length; ii++) {
		sliders[ii].addEventListener('input', calculateTrajecories);
	}
	calculateTrajecories();
	document.addEventListener('keypress', function (key) {
		let k = key.key;
		if (k === '-' || k === '_') {
			// Zoom out
			axisLimits += 1;
			globalChartRef.config.options.scales.xAxes[0].ticks.min = -axisLimits;
			globalChartRef.config.options.scales.xAxes[0].ticks.max = axisLimits;
			globalChartRef.config.options.scales.yAxes[0].ticks.min = -axisLimits / 2;
			globalChartRef.config.options.scales.yAxes[0].ticks.max = axisLimits / 2;
		} else if (k === '=' || k === '+') {
			//Zooom in
			axisLimits -= 1;
			globalChartRef.config.options.scales.xAxes[0].ticks.min = -axisLimits;
			globalChartRef.config.options.scales.xAxes[0].ticks.max = axisLimits;
			globalChartRef.config.options.scales.yAxes[0].ticks.min = -axisLimits / 2;
			globalChartRef.config.options.scales.yAxes[0].ticks.max = axisLimits / 2;
		} else if (k === 'e' || k === 'E') {}
		globalChartRef.update();
	});
}, false);

// HCW equations


// Calculate trajectories based off of waypoints and trajectory if burned
// missed at selected waypoint
function calculateTrajecories() {
	let dt = 1000;
	let n = 2 * Math.PI / 86164;
	let ae = Number(sliders[0].value);
	let xd = Number(sliders[1].value);
	let yd = Number(sliders[2].value);
	let beta = Number(sliders[3].value) * Math.PI / 180;
	let zmax = Number(sliders[4].value);
	let m = Number(sliders[5].value) * Math.PI / 180;
	for (var ii = 0; ii < sliders.length - 1; ii++) {
		sliderLabels[ii].textContent = sliders[ii].value;
	}
	if (sliders[ii].value === '0') {
		sliderLabels[ii].innerHTML = '&#8734';
	} else {
		sliderLabels[ii].textContent = Math.pow(10, sliders[ii].value).toExponential(1);
	}

	globalChartRef.config.data.datasets[0].data = [];
	let curState, rmoeCur = [ae, xd, yd, beta, zmax, m];
	for (ii = 0; ii < 186164; ii += dt) {
		rmoeCur[2] = yd - 1.5 * xd * n * ii;
		rmoeCur[3] = beta + n * ii;
		curState = rmoe2state(rmoeCur, n);
		if (ii === 0) {
			showReachability(curState);
			globalChartRef.config.data.datasets[1].data[0].x = curState[1][0];
			globalChartRef.config.data.datasets[1].data[0].y = curState[0][0];
		}
		globalChartRef.config.data.datasets[0].data.push({
			x: curState[1][0],
			y: curState[0][0]
		})
	}
	globalChartRef.update();
}

function resetAxisSize() {
	globalChartRef.config.options.scales.xAxes[0].ticks.min = -40 + axisCenter;
	globalChartRef.config.options.scales.xAxes[0].ticks.max = 40 + axisCenter;
	globalChartRef.config.options.scales.yAxes[0].ticks.min = -20 + axisCenter;
	globalChartRef.config.options.scales.yAxes[0].ticks.max = 20 + axisCenter;
}

function showReachability(state) {
	globalChartRef.config.data.datasets[2].data = [];
	let reachDv = Number(sliders[4].value) / 1000;
	if (Number(sliders[5].value) < 0) {
		finiteReachability(reachDv, state);
		return;
	} else {
		impulsiveReachability(reachDv, state);
	}

}

function impulsiveReachability(reachDv, state) {
	let newState, burn, t, r1, v1, r;
	for (var kk = 2; kk <= 12; kk += 2) {
		t = kk * 3600;
		let PRR = PhiRR(t),
			PRV = PhiRV(t);
		let negR = false;
		for (var ii = 0; ii <= 360; ii += 5) {
			burn = [
				[0],
				[0],
				[0],
				[reachDv * Math.cos(ii * Math.PI / 180)],
				[reachDv * Math.sin(ii * Math.PI / 180)],
				[0]
			];
			if (negR && burn[3][0] > 0) {
				burn[3][0] = 0;
				burn[4][0] *= reachDv * Math.sign(burn[4][0]);
			}
			newState = math.add(state, burn);
			r1 = [newState[0], newState[1]];
			v1 = [newState[3], newState[4]];
			r = math.add(math.multiply(PRR, r1), math.multiply(PRV, v1));
			globalChartRef.config.data.datasets[2].data.push({
				x: r[1][0],
				y: r[0][0]
			})
		}
		globalChartRef.config.data.datasets[2].data.push({
			x: NaN,
			y: NaN
		})
	}
}

function finiteReachability(reachDv, state) {
	let a0 = Number(sliderLabels[5].textContent) / 1000;
	let tBurn = reachDv / a0;
	let PRR, PRV, finiteState;
	state = {
		x: state[0],
		xd: state[3],
		y: state[1],
		yd: state[4]
	};
	globalChartRef.config.data.datasets[2].data = [];
	for (var kk = 0; kk <= 12; kk += 2) {
		t = kk * 3600;
		PRR = PhiRR(t - tBurn);
		PRV = PhiRV(t - tBurn);
		for (var ii = 0; ii <= 360; ii += 20) {
			if (tBurn > t) {
				finiteState = hcwBurnClosed(state, a0, ii * Math.PI / 180, t);
			} else {
				finiteState = hcwBurnClosed(state, a0, ii * Math.PI / 180, tBurn);
			}
			r1 = [
				[finiteState[0]],
				[finiteState[1]]
			];
			v1 = [
				[finiteState[2]],
				[finiteState[3]]
			];
			// console.log(r1,v1,ii,a0,tBurn/3600)
			if (tBurn < t) {
				r1 = math.add(math.multiply(PRR, r1), math.multiply(PRV, v1));
			}
			globalChartRef.config.data.datasets[2].data.push({
				x: r1[1][0],
				y: r1[0][0]
			})
		}
		globalChartRef.config.data.datasets[2].data.push({
			x: NaN,
			y: NaN
		})
	}
}