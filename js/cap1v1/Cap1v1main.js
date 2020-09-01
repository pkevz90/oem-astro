let globalChartRef;

class Satellite {
	constructor(initState, name, dataLoc) {
		this.name = name;
		this.initState = initState;
		this.burns = math.zeros(app.numBurns,2)._data;
		this.calculateTrajecory = calculateTrajecory;
		this.dataLoc = dataLoc;
		this.attitude = undefined;
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
	maxSlew: 4,
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
				pointRadius: 6,
				borderColor: 'rgba(120,200,255,1)'
			}, {
				// label: "Blue Trajectory",
				data: [],
				showLine: true,
				pointRadius: 0,
				borderColor: 'rgba(120,200,255,1)'
			}, {
				// label: "Red Waypoints",
				data: [],
				showLine: false,
				pointRadius: 6,
				borderColor: 'rgba(255,200,120,1)'
			}, {
				// label: "Red Trajectory",
				data: [],
				showLine: true,
				pointRadius: 0,
				borderColor: 'rgba(255,200,120,1)'
			}, {
				// label: "Selected Waypoint",
				data: [],
				showLine: false,
				pointRadius: 5,
				backgroundColor: 'rgba(255,255,255,1)',
			}, {
				// label: "Current Blue",
				data: []
			}, {
				// label: "Current Red",
				data: []
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
				showLine: true,
				pointRadius: 0,
				borderDash: [10, 10],
				borderColor: 'rgba(255,255,255,0.5)',
			},{
				// label: "Green Waypoints",
				data: [],
				showLine: false,
				pointRadius: 6,
				borderColor: 'rgba(160,255,160,1)'
			},{
				// label: "Current Green",
				data: []
			}, {
				// label: "Green Trajectory",
				data: [],
				showLine: true,
				pointRadius: 0,
				borderColor: 'rgba(160,255,160,1)',
			},{
				// label: "Gray Waypoints",
				data: [],
				showLine: false,
				pointRadius: 6,
				borderColor: 'rgba(150,150,150,1)'
			}, {
				// label: "Current Gray",
				data: []
			}, {
				// label: "Gray Trajectory",
				data: [],
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
					// Draw Axis Labels
					let pixelX = (globalChartRef.chartArea.right-globalChartRef.chartArea.left) / app.axisLimits;
					let pixelY = (globalChartRef.chartArea.bottom-globalChartRef.chartArea.top) / app.axisLimits / 2;
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
					let positionX = app.chartData === undefined ? 0 : app.chartData.relative.data[1].x;
					let positionY = app.chartData === undefined ? 0 : app.chartData.relative.data[1].y;
					drawArrow(ctx, pixelX, pixelY, app.axisLimits / 3, [positionX, positionY], sunInit + n * app.currentTime * 3600);
					
					// Draw Burn if applicable
					if (app.tactic !== '' && app.chosenWaypoint !== undefined) {
						positionX = app.players[app.chosenWaypoint[1]].dataLoc.waypoints.data[app.chosenWaypoint[0]].x;
						positionY = app.players[app.chosenWaypoint[1]].dataLoc.waypoints.data[app.chosenWaypoint[0]].y;
						let burnX = app.players[app.chosenWaypoint[1]].burns[app.chosenWaypoint[0]][0];
						let burnY = app.players[app.chosenWaypoint[1]].burns[app.chosenWaypoint[0]][1];
						drawArrow(ctx, pixelX, pixelY, math.norm([burnX, burnY]) * 10, [positionX, positionY], Math.atan2(-burnY, burnX), sideData.scenario_data.colors[app.chosenWaypoint[1]], 3);
					}

					// Draw satellite images
					let pos;
					if (app.players['blue'] !== undefined) {
						for (player in app.players) {
							pos = [app.players[player].dataLoc.current.data[0].x, app.players[player].dataLoc.current.data[0].y];
							drawSat(ctx,[(app.axisCenter[0] + app.axisLimits - pos[0])*pixelX / 2 + globalChartRef.chartArea.left,(app.axisCenter[1] + app.axisLimits / 2 - pos[1])*pixelY*2  + globalChartRef.chartArea.top],app.players[player].attitude,0.2,sideData.scenario_data.colors[player],sunInit + n * app.currentTime * 3600 );
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
	switch(setupData.team) {
		case 'blue': 
			$('.navbar').css('background-image','linear-gradient(to right,rgb(25,35,100), rgb(12,17,50),#06090c)')
			break;
		case 'red':
			$('.navbar').css('background-image','linear-gradient(to right,rgb(100,35,25), rgb(50,17,12),#06090c)')
			break;
		case 'green':
			$('.navbar').css('background-image','linear-gradient(to right,rgb(35,100,25), rgb(17,50,12),#06090c)')
			break;
		case 'gray': 
			$('.navbar').css('background-image','linear-gradient(to right,rgb(100,100,100), rgb(50,50,50),#06090c)')
			break;
		default: 
			break;
	}
    for (sat in app.players) {
		sideData.scenario_data.data[sat].exist = (sat === setupData.team) ? false : true;
		Vue.set(sideData.scenario_data.players,sat,{})
		Vue.set(sideData.scenario_data.players[sat],'burns',app.players[sat].burns)
		Vue.set(sideData.scenario_data.players[sat],'name',sat)
		Vue.set(sideData.scenario_data.players[sat],'color',sideData.scenario_data.colors[sat])
	}
	app.chartData = {
		selected: globalChartRef.config.data.datasets[4],
		relative: globalChartRef.config.data.datasets[8],
		targetLim: globalChartRef.config.data.datasets[15],
		view: globalChartRef.config.data.datasets[7]
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

function drawArrow(ctx, pixelX, pixelY, length = 15, origin = [0,0], angle = 0, color = 'rgba(255,255,0,0.5)', width = 6) {
	let ct = Math.cos(angle),
		st = Math.sin(angle);
		rotMat = [
			[ct, -st],
			[st, ct]
		];
	let arrow = [
		[0,-length * pixelY * 2 + 10],
		[3,-length * pixelY * 2 + 12],
		[0,-length * pixelY * 2],
		[-3,-length * pixelY * 2 + 12],
		[0,-length * pixelY * 2 + 10]
	];
	let transformedArrow = math.transpose(math.multiply(rotMat,math.transpose(arrow)));
	ctx.save();
	ctx.fillStyle = color;
	ctx.strokeStyle = color;
	ctx.beginPath();
	ctx.translate(globalChartRef.chartArea.left + (globalChartRef.chartArea.right-globalChartRef.chartArea.left) / 2  - origin[0]*pixelX/2 + app.axisCenter[0]*pixelX/2, globalChartRef.chartArea.top + (globalChartRef.chartArea.bottom-globalChartRef.chartArea.top) / 2 + app.axisCenter[1]*pixelY*2 - origin[1]*pixelY*2);
	ctx.moveTo(0,0);
	transformedArrow.forEach((point) => {
		ctx.lineTo(point[0],point[1]);
	});
	ctx.lineWidth = width;
	ctx.stroke();
	ctx.fill();
	ctx.restore();
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
	}
	if (!noPlot) {
		app.chartData.relative.data = [{
			x: points[sideData.scenario_data.engageData[0] + 'R'][1],
			y: points[sideData.scenario_data.engageData[0] + 'R'][0]
		}, {
			x: points[sideData.scenario_data.engageData[1] + 'R'][1],
			y: points[sideData.scenario_data.engageData[1] + 'R'][0]
		}]
	}
	return points;
}

function drawViewpoint(pos, az, range, colorIn) {
	let viewColor = sideData.scenario_data.colors[colorIn].substring(0,17) + '0.25)';
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

function drawSat(ctx,location, ang = 0, size = 1, color = '#AAA', sunAngle = 0) {
	let ct = Math.cos(ang * Math.PI / 180),
	  st = Math.sin(ang * Math.PI / 180),
	  R = [
		[ct, -st],
		[st, ct]
	  ];
	ctx.save();
	ctx.beginPath();
	ctx.translate(location[0], location[1]);
	ctx.strokeStyle = color;
	var grd = ctx.createLinearGradient(-20*size*Math.sin(-sunAngle),-20*size*Math.cos(-sunAngle),20*size*Math.sin(-sunAngle),20*size*Math.cos(-sunAngle));
	grd.addColorStop(0,color);
	grd.addColorStop(1,"black");
	ctx.fillStyle = grd;
	ctx.lineWidth = 4 * size;
	let sat = [
  	// main body
	  [-25, -25],
	  [25, -25],
	  [25, 25],
	  [-25, 25],
	  [-25, 0],
    //solar panel 1
	  [-150, 12.5],
	  [-150, -12.5],
	  [-25, -12.5],
	  [-25, 12.5],
    //solar panel 2
	  [150, -12.5],
	  [150, 12.5],
	  [25, 12.5],
	  [25, -12.5],
    //sensor
	[-9, -30],
	[9,-30],
	[4,-25],
	[-4,-25]
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
		ctx.strokeStyle = 'rgb(255,255,255)';
		ctx.lineWidth = 0.5;
		ctx.beginPath();
		ctx.moveTo(transformedSat[8][0], transformedSat[8][1])
	  } else if (index === 8) {
		ctx.fill();
		ctx.stroke();
		ctx.beginPath();
		ctx.moveTo(transformedSat[12][0], transformedSat[12][1])
	  } else if (index === 12) {
		ctx.fill();
		ctx.stroke();
		ctx.fillStyle = 'rgb(225,225,225)';
		ctx.beginPath();
		ctx.moveTo(transformedSat[16][0], transformedSat[16][1])
	  }
	});
	ctx.fill();
	ctx.stroke();
	ctx.restore();
}