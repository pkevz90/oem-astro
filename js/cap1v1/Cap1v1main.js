let globalChartRef;

class Satellite {
	constructor(initState, name, dataLoc) {
		this.name = name;
		this.initState = initState;
		if (name !== 'gray') {
			this.burns = [
				[0, 0],
				[0, 0],
				[0, 0],
				[0, 0],
				[0, 0]
			];
		} 
		this.calculateTrajecory = calculateTrajecory;
		this.dataLoc = dataLoc;
	}
}
let app = {
	players: {
		blue: undefined,
		red: undefined
	},
	chosenWaypoint: undefined,
	axisLimits: 40,
	axisCenter: [0, 0],
	currentTime: 0,
	initSunVector: [
		[0],
		[40 * 0.4]
	],
	calcDt: 240,
	burnChange: false,
	timeBetween: 10800,
	tactic: '',
	tacticData: undefined,
	deltaVAvail: undefined,
	reqCats: undefined,
	rangeReq: undefined,
	spans: {
		manRows: undefined,
		scenData: undefined
	},
	dataLoc: {
		blueFormer: 2,
		redFormer: 5,
		burnDir: 6,
		Sun: 7,
		selectedWay: 8,
		view: 11,
		relLine: 12,
		curGray: 13,
		grayTraj: 14,
		targetLim: 17
	},
	updateApp: function () {
		for (var sat in app.players) {
			app.players[sat].calculateTrajecory();
			calcData(app.currentTime);
		}
	}
}

function createGraph() {
	var config = {
		type: 'scatter',
		data: {
			datasets: [{
				// label: "Blue Waypoints",
				data: [],
				showLine: false,
				fill: false,
				pointRadius: 7,
				borderColor: 'rgba(120,200,255,1)'
			}, {
				// label: "Blue Trajectory",
				data: [],
				showLine: true,
				fill: false,
				pointRadius: 0,
				borderColor: 'rgba(120,200,255,1)'
			}, {
				// label: "Blue Former Trajectory",
				data: [],
				showLine: true,
				fill: false,
				pointRadius: 0,
				borderColor: 'rgba(120,200,255,0.5)'
			}, {
				// label: "Red Waypoints",
				data: [],
				showLine: false,
				fill: false,
				pointRadius: 7,
				borderColor: 'rgba(255,200,120,1)'
			}, {
				// label: "Red Trajectory",
				data: [],
				showLine: true,
				fill: false,
				pointRadius: 0,
				borderColor: 'rgba(255,200,120,1)'
			}, {
				// label: "Red Former Trajectory",
				data: [],
				showLine: true,
				fill: false,
				pointRadius: 0,
				borderColor: 'rgba(60,100,255,0.5)'
			}, {
				// label: "Burn Directions",
				data: [],
				showLine: true,
				fill: false,
				pointRadius: 0,
				borderWidth: 6,
				borderColor: 'rgba(255,255,255,0.5)',
			}, {
				// label: "Sun",
				data: [{
					x: 0,
					y: 0
				}, {
					x: 0,
					y: 0
				}],
				fill: false,
				showLine: true,
				pointRadius: 0,
				borderWidth: 6,
				borderColor: 'rgba(200,200,0,1)',
			}, {
				// label: "Selected Waypoint",
				data: [],
				fill: false,
				showLine: false,
				pointRadius: 5,
				backgroundColor: 'rgba(255,255,255,1)',
			}, {
				// label: "Current Blue",
				data: [{
					x: 0,
					y: 0
				}],
				fill: false,
				showLine: false,
				pointRadius: 15,
				pointStyle: 'triangle',
				backgroundColor: 'rgba(120,200,255,1)',
			}, {
				// label: "Current Red",
				data: [{
					x: 0,
					y: 0
				}],
				fill: false,
				showLine: false,
				pointRadius: 15,
				pointStyle: 'triangle',
				backgroundColor: 'rgba(255,200,120,1)',
			}, {
				// label: "Viewpoint",
				data: [],
				fill: true,
				showLine: true,
				pointRadius: 0,
				backgroundColor: 'rgba(255,200,120,0.25)',
			}, {
				// label: "Relative Line",
				data: [{
					x: 0,
					y: 0
				}, {
					x: 0,
					y: 0
				}],
				fill: false,
				showLine: true,
				pointRadius: 0,
				borderDash: [10, 10],
				borderColor: 'rgba(255,255,255,0.5)',
			}, {
				// label: "Current Gray1",
				data: [],
				showLine: false,
				fill: false,
				pointRadius: 15,
				pointStyle: 'rect',
				backgroundColor: 'rgba(150,150,150,1)',
			}, {
				// label: "Gray Trajectory1",
				data: [],
				fill: false,
				showLine: true,
				pointRadius: 0,
				borderColor: 'rgba(150,150,150,1)',
			}, {
				// label: "Current Gray2",
				data: [],
				showLine: false,
				fill: false,
				pointRadius: 15,
				pointStyle: 'rect',
				backgroundColor: 'rgba(150,150,150,1)',
			}, {
				// label: "Gray Trajectory2",
				data: [],
				fill: false,
				showLine: true,
				pointRadius: 0,
				borderColor: 'rgba(150,150,150,1)',
			}, {
				// label: "Targeting Limits",
				
                data: [],
                fill: true,
                showLine: true,
				pointRadius: 0,
				lineTension: 0,
				backgroundColor: 'rgba(255,255,255,0.25)'
			}]
		},
		options: {
			animation: {
				duration: 0
			},
			tooltips: {
				enabled: false
			},
			legend: {
				display: false
			},
			onHover: function (element) {
				let scaleRef, valueX, valueY;
				for (var scaleKey in this.scales) {
					scaleRef = this.scales[scaleKey];
					if (scaleRef.isHorizontal() && scaleKey === 'x-axis-1') {
						valueX = scaleRef.getValueForPixel(element.offsetX);
					} else if (scaleKey === 'y-axis-1') {
						valueY = scaleRef.getValueForPixel(element.offsetY);
					}
				}
				handleHover(valueX, valueY);
			},
			onClick: function (element) {
				let scaleRef, valueX, valueY;
				for (var scaleKey in this.scales) {
					scaleRef = this.scales[scaleKey];
					if (scaleRef.isHorizontal() && scaleKey == 'x-axis-1') {
						valueX = scaleRef.getValueForPixel(element.offsetX);
					} else if (scaleKey == 'y-axis-1') {
						valueY = scaleRef.getValueForPixel(element.offsetY);
					}
				}
				handleClick(valueX, valueY);
			},
			title: {
				display: false
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
						labelString: 'In-Track [km]',
						fontColor: 'rgba(255,255,255,1)',
						fontSize: 30
					},
					ticks: {
						min: -app.axisLimits,
						max: app.axisLimits,
						fontSize: 20,
						reverse: true,
						fontColor: 'rgba(255,255,255,1)'
					}
				}],
				yAxes: [{
					gridLines: {
						zeroLineColor: '#ffcc33',
						color: 'rgba(255,255,255,0.25)'
					},
					display: true,
					scaleLabel: {
						display: true,
						labelString: 'Radial [km]',
						fontColor: 'rgba(255,255,255,1)',
						fontSize: 30
					},
					ticks: {
						min: -app.axisLimits * 0.5,
						max: app.axisLimits * 0.5,
						fontColor: 'rgba(255,255,255,1)',
						fontSize: 20
					}
				}]
			},
			responsive: true,
			maintainAspectRatio: true
		}
	};
	var ctx = document.getElementById('ChartCnvs').getContext('2d');
	globalChartRef = new Chart(ctx, config);
}

function startGame() {
	for (sat in app.players) {
		app.players[sat].calculateTrajecory();
	}
	calcData();
	// app.updateApp()
	document.addEventListener('keydown', function (element) {
		handleKeyPress(element.key);
	});
	globalChartRef.update();
}

function drawSunVectors(t, origin = [0, 0], plot = true) {
	let n = 2 * Math.PI / 86164,
		ct = Math.cos(-t * n),
		st = Math.sin(-t * n),
		R = [
			[ct, -st],
			[st, ct]
		];
	let SunVector = math.multiply(R, app.initSunVector);
	if (plot) {
		globalChartRef.config.data.datasets[app.dataLoc.Sun].data = [{
			x: origin[1],
			y: origin[0]
		}, {
			x: SunVector[1][0] + origin[1],
			y: SunVector[0][0] + origin[0]
		}];
		globalChartRef.update();
	}
	return SunVector;
}

function setCurrentPoints(curTime) {
	var points = {};
	for (sat in app.players) {
		points[sat+'R'] = [
			[globalChartRef.config.data.datasets[app.players[sat].dataLoc.traj].data[Math.floor(curTime * 3600 / app.calcDt)].y],
			[globalChartRef.config.data.datasets[app.players[sat].dataLoc.traj].data[Math.floor(curTime * 3600 / app.calcDt)].x]
		];
		globalChartRef.config.data.datasets[app.players[sat].dataLoc.cur].data = [{
			x: points[sat+'R'][1],
			y: points[sat+'R'][0]
		}];
	}

	globalChartRef.config.data.datasets[app.dataLoc.relLine].data = [{
		x: points['redR'][1],
		y: points['redR'][0]
	}, {
		x: points['blueR'][1],
		y: points['blueR'][0]
	}]
	return points;
}

function drawViewpoint(pos, az, range, color = 'red') {
	globalChartRef.config.data.datasets[app.dataLoc.view].data = [{
		x: pos[1],
		y: pos[0]
	}];
	range *= 1.5;
	let angWidth = Math.PI / 9;
	for (var ii = az - angWidth / 2; ii <= az + angWidth / 2; ii += 0.01) {
		globalChartRef.config.data.datasets[app.dataLoc.view].data.push({
			x: pos[1] + range * Math.cos(ii),
			y: pos[0] + range * Math.sin(ii)
		});
	}
	globalChartRef.config.data.datasets[app.dataLoc.view].data.push({
		x: pos[1],
		y: pos[0]
	});
	globalChartRef.config.data.datasets[app.dataLoc.view].backgroundColor = (color === 'red') ? 'rgba(255,200,120,0.25)' : 'rgba(120,200,255,0.25)';

}