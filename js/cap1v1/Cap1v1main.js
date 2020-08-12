let globalChartRef;

class Satellite {
	constructor(initState, name, dataLoc) {
		this.name = name;
		this.initState = initState;
		this.burns = math.zeros(app.numBurns,2)._data;
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
	axisLimits: 100,
	axisCenter: [0, 0],
	appDrag: undefined,
	currentTime: 0,
	initSunVector: undefined,
	mouseCoor: {
		x: undefined,
		y: undefined
	},
	calcDt: 240,
	burnChange: false,
	tactic: '',
	tacticData: undefined,
	scenLength: undefined,
	numBurns: undefined,
	reqCats: undefined,
	rangeReq: undefined,
	redTurn: 1,
	burnTransition: false,
	spans: {
		manRows: undefined,
		scenData: undefined
	},
	chartData: undefined,
	dataLoc: {
		blueFormer: 2,
		redFormer: 5,
	},
	updateApp: function () {
		for (var sat in app.players) {
			app.players[sat].calculateTrajecory();
		}
		calcData(app.currentTime);
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
				pointRadius: 6,
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
				pointRadius: 6,
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
				lineTension: 0,
				borderColor: 'rgba(225,225,0,0.5)',
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
				backgroundColor: 'rgba(120,200,255,0)',
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
				backgroundColor: 'rgba(255,200,120,0)',
			}, {
				// label: "Viewpoint",
				data: [],
				fill: true,
				showLine: true,
				pointRadius: 0,
				backgroundColor: 'rgba(120,200,255,0.25)',
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
			},{
				// label: "Green Waypoints",
				data: [],
				showLine: false,
				fill: false,
				pointRadius: 6,
				borderColor: 'rgba(160,255,160,1)'
			},{
				// label: "Current Green",
				data: [],
				showLine: false,
				fill: false,
				pointRadius: 15,
				pointStyle: 'rect',
				backgroundColor: 'rgba(160,255,160,0)',
			}, {
				// label: "Green Trajectory",
				data: [],
				fill: false,
				showLine: true,
				pointRadius: 0,
				borderColor: 'rgba(160,255,160,1)',
			},{
				// label: "Gray Waypoints",
				data: [],
				showLine: false,
				fill: false,
				pointRadius: 6,
				borderColor: 'rgba(150,150,150,1)'
			}, {
				// label: "Current Gray",
				data: [],
				showLine: false,
				fill: false,
				pointRadius: 15,
				pointStyle: 'rect',
				backgroundColor: 'rgba(150,150,150,0)',
			}, {
				// label: "Gray Trajectory",
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
				spanGaps: false,
				borderColor: 'rgba(255,255,255,0.5)',
				backgroundColor: 'rgba(255,255,255,0.025)'
			}]
		},
		options: {
			animation: {
				duration: 10,
				onProgress: function() {
					let pixelX = (globalChartRef.chartArea.right-globalChartRef.chartArea.left) / app.axisLimits;
					let pixelY = (globalChartRef.chartArea.bottom-globalChartRef.chartArea.top) / app.axisLimits / 2;
					console.log(globalChartRef.chartArea.bottom-globalChartRef.chartArea.top);
					let ctx=globalChartRef.canvas.getContext("2d");
					ctx.font="20px Arial";
					ctx.fillStyle = 'rgba(255,255,255,0.3)';
					ctx.textAlign = "center";
					ctx.fillText("In-Track [km]", globalChartRef.chartArea.left + (globalChartRef.chartArea.right-globalChartRef.chartArea.left) / 4, globalChartRef.chartArea.top + (globalChartRef.chartArea.bottom-globalChartRef.chartArea.top) * 11 / 20 + app.axisCenter[1]*pixelY*2);
					
					ctx.save();
					ctx.font="20px Arial";
					ctx.fillStyle = 'rgba(255,255,255,0.3)';
					ctx.textAlign = "center";
					ctx.translate(globalChartRef.chartArea.left + (globalChartRef.chartArea.right-globalChartRef.chartArea.left) * 41 / 80 + app.axisCenter[0]*pixelX / 2, globalChartRef.chartArea.top + (globalChartRef.chartArea.bottom-globalChartRef.chartArea.top) / 4);
					ctx.rotate(Math.PI/2)
					ctx.fillText("Radial [km]", 0, 0);
					ctx.restore();
					// Draw Sun Arrow
					let sunInit = -Number(setupData.scenario_start.initSun) * Math.PI / 180;
					let n = 2 * Math.PI / 86164;
					let ct = Math.cos(sunInit + n * app.currentTime * 3600 ),
						st = Math.sin(sunInit + n * app.currentTime * 3600 );
						R = [
							[ct, -st],
							[st, ct]
						];
					let arrow = [
						[0,-200],
						[3,-198],
						[0,-210],
						[-3,-198],
						[0,-200]
					];
					let transformedArrow = math.transpose(math.multiply(R,math.transpose(arrow)));
					ctx.save();
					ctx.fillStyle = 'rgba(255,255,0,0.5)';
					ctx.strokeStyle = 'rgba(255,255,0,0.5)';
					ctx.beginPath();
					ctx.translate(globalChartRef.chartArea.left + (globalChartRef.chartArea.right-globalChartRef.chartArea.left) / 2, globalChartRef.chartArea.top + (globalChartRef.chartArea.bottom-globalChartRef.chartArea.top) / 2 + app.axisCenter[1]*pixelY*2);
					ctx.moveTo(0,0);
					transformedArrow.forEach((point) => {
						ctx.lineTo(point[0],point[1]);
					});
					ctx.lineWidth = 6;
					ctx.stroke();
					ctx.fill();
					ctx.restore();
					let pos;
					if (app.players['blue'] !== undefined) {
						for (player in app.players) {
							pos = [app.players[player].dataLoc.current.data[0].x, app.players[player].dataLoc.current.data[0].y];
							drawSat(ctx,[(app.axisCenter[0] + app.axisLimits - pos[0][0])*pixelX / 2 + globalChartRef.chartArea.left,(app.axisCenter[1] + app.axisLimits / 2 - pos[1][0])*pixelY*2  + globalChartRef.chartArea.top],0,20 / app.axisLimits,app.colors[player]);
						}
					}
				}
			},
			tooltips: {
				enabled: false
			},
			legend: {
				display: false
			},
			scales: {
				xAxes: [{
					gridLines: {
						zeroLineColor: '#fff',
						color: 'rgba(255,255,255,0.125)'
					},
					type: "linear",
					display: true,
					ticks: {
						min: -app.axisLimits,
						max: app.axisLimits,
						fontSize: 20,
						reverse: true,
						fontColor: 'rgba(255,255,255,0.5)'
					},
					afterBuildTicks: () => {
						let newTicks = math.range(math.ceil((app.axisCenter[0] - app.axisLimits) / 10) * 10, math.floor((app.axisCenter[0] +app.axisLimits) / 10) * 10, 10,true)._data.reverse();
						newTicks.pop();
						// newTicks.shift();
						return newTicks;
					}
				}],
				yAxes: [{
					gridLines: {
						zeroLineColor: '#fff',
						color: 'rgba(255,255,255,0.125)'
					},
					display: true,
					ticks: {
						min: -app.axisLimits * 0.5,
						max: app.axisLimits * 0.5,
						fontColor: 'rgba(255,255,255,0.5)',
						fontSize: 20
					},
					afterBuildTicks: (a, ticks) => {
						let newTicks = math.range(math.ceil((app.axisCenter[1] - app.axisLimits / 2) / 10) * 10, math.floor((app.axisCenter[1] + app.axisLimits / 2) / 10) * 10, 10,true)._data.reverse();
						// newTicks.pop();
						// newTicks.shift();
						return newTicks;
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
	app.colors = {
		blue:  'rgba(100,150,255,1)',
		red:   'rgba(255,150,100,1)',
		green: 'rgba(120,255,120,1)',
		gray: 'rgba(150,150,150,1)'
	}
    $('.nav-element:first p').css('color',app.colors[setupData.team])
	for (sat in app.players) {
		sideData.scenario_data.data[sat].exist = (sat === setupData.team) ? false : true;
		Vue.set(sideData.scenario_data.players,sat,{})
		Vue.set(sideData.scenario_data.players[sat],'burns',app.players[sat].burns)
		Vue.set(sideData.scenario_data.players[sat],'name',sat)
		Vue.set(sideData.scenario_data.players[sat],'color',app.colors[sat])
	}
	app.chartData = {
		burnDir: globalChartRef.config.data.datasets[6],
		sun: globalChartRef.config.data.datasets[7],
		selected: globalChartRef.config.data.datasets[8],
		relative: globalChartRef.config.data.datasets[12],
		targetLim: globalChartRef.config.data.datasets[19],
		view: globalChartRef.config.data.datasets[11]
	};
	for (sat in app.players) {
		app.players[sat].calculateTrajecory();
	}
	calcData();
	// app.updateApp()
	document.addEventListener('keydown', function (element) {
		handleKeyPress(element.key);
	});
	setBottomInfo();
	globalChartRef.update();
}

function drawSunVectors(t) {
	let n = 2 * Math.PI / 86164,
		ct = Math.cos(-t * n),
		st = Math.sin(-t * n),
		R = [
			[ct, -st],
			[st, ct]
		];
	let sunVector = math.multiply(R, app.initSunVector);
	sunVector = math.dotMultiply(sunVector,app.axisLimits*0.2);
	return sunVector;
}

function setCurrentPoints(curTime, noPlot = false) {
	var points = {};
	let point1, point2, dt;
	// console.log(Math.floor(curTime * 3600 / app.calcDt),Math.floor(curTime * 3600 / app.calcDt)+1)
	for (sat in app.players) {
		point1 = [
			[app.players[sat].dataLoc.trajectory.data[Math.floor(curTime * 3600 / app.calcDt)].y],
			[app.players[sat].dataLoc.trajectory.data[Math.floor(curTime * 3600 / app.calcDt)].x]
		];
		if (Math.floor(curTime * 3600 / app.calcDt) + 1 === app.players[sat].dataLoc.trajectory.data.length) {
			point2 = [...point1];
		}
		else {
			point2 = [
				[app.players[sat].dataLoc.trajectory.data[Math.floor(curTime * 3600 / app.calcDt)+1].y],
				[app.players[sat].dataLoc.trajectory.data[Math.floor(curTime * 3600 / app.calcDt)+1].x]
			];
		}
		dt = (curTime * 3600) % app.calcDt;
		points[sat + 'R'] = [
			[point1[0][0] + (point2[0][0]-point1[0][0]) * dt / app.calcDt],
			[point1[1][0] + (point2[1][0]-point1[1][0]) * dt / app.calcDt]
		];
		app.players[sat].dataLoc.current.data = [{
			x: points[sat + 'R'][1],
			y: points[sat + 'R'][0]
		}];
	}
	if (noPlot) {
		return points
	}
	// app.chartData.relative.data = [{
	// 	x: points['redR'][1],
	// 	y: points['redR'][0]
	// }, {
	// 	x: points['blueR'][1],
	// 	y: points['blueR'][0]
	// }]
	return points;
}

function drawViewpoint(pos, az, range, colorIn) {
	let viewColor = app.colors[colorIn].substring(0,17) + '0.25)';
	app.chartData.view.backgroundColor = viewColor;
	app.chartData.view.data = [{
		x: pos[1],
		y: pos[0]
	}];
	
	range *= 1.5;
	let angWidth = Math.PI / 9;
	for (var ii = az - angWidth / 2; ii <= az + angWidth / 2; ii += 0.01) {
		app.chartData.view.data.push({
			x: pos[1] + range * Math.cos(ii),
			y: pos[0] + range * Math.sin(ii)
		});
	}
	app.chartData.view.data.push({
		x: pos[1],
		y: pos[0]
	});

}

function drawSat(ctx,location, ang = 0, size = 1, color = '#AAA') {
	let ct = Math.cos(ang * Math.PI / 180),
	  st = Math.sin(ang * Math.PI / 180),
	  R = [
		[ct, -st],
		[st, ct]
	  ];
	ctx.save();
	ctx.beginPath();
	ctx.translate(location[0], location[1]);
	ctx.fillStyle = color;
	ctx.strokeStyle = 'rgb(200,200,200)';
	let sat = [
	  [-25, -25],
	  [25, -25],
	  [25, 25],
	  [-25, 25],
	  [-25, 0],
	  [-150, 12.5],
	  [-150, -12.5],
	  [-25, -12.5],
	  [-25, 12.5],
	  [150, -12.5],
	  [150, 12.5],
	  [25, 12.5],
	  [25, -12.5]
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
		ctx.beginPath();
		ctx.moveTo(transformedSat[8][0], transformedSat[8][1])
	  } else if (index === 8) {
		ctx.fill();
		ctx.stroke();
		ctx.beginPath();
		ctx.moveTo(transformedSat[12][0], transformedSat[12][1])
	  }
	});
	ctx.fill();
	ctx.stroke();
	ctx.restore();
}