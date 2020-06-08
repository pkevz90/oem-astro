let globalChartRef;
let tooltipOpen, 
	tooltipIndex, 
	chosenWaypoint,
	axisLimits = 40, axisCenter = [0,0],
	blueInitState, redInitState, currentTime = 0,
	blueBurns, redBurns, burnChange = false,
	playFrame, playBool = false, posHistory = {red: [], blue: []}, 
	tactic, maxDv = 0.5,
	initSunVector = [[0],[axisLimits*0.4]], calcDt = 240;

function createGraph() {
    var config = {
        type: 'scatter',
        data: {
            datasets: [{
                // label: "Blue Waypoints",
                data: [], showLine: false, fill: false, pointRadius: 7, borderColor: 'rgba(120,200,255,1)'
            },{
                // label: "Blue Trajectory",
                data: [], showLine: true, fill: false, pointRadius: 0, borderColor: 'rgba(120,200,255,1)'
            },{
                // label: "Blue Former Trajectory",
                data: [], showLine: true, fill: false, pointRadius: 0, borderColor: 'rgba(120,200,255,0.5)'
            },{
                // label: "Red Waypoints",
                data: [], showLine: false, fill: false, pointRadius: 7, borderColor: 'rgba(255,200,120,1)'
            },{
                // label: "Red Trajectory",
                data: [], showLine: true, fill: false, pointRadius: 0, borderColor: 'rgba(255,200,120,1)'
            },{
                // label: "Red Former Trajectory",
                data: [], showLine: true, fill: false, pointRadius: 0, borderColor: 'rgba(60,100,255,0.5)'
            },{
                // label: "Burn Directions",
                data: [], showLine: true, fill: false, pointRadius: 0, borderWidth: 6, borderColor: 'rgba(255,255,255,0.5)',
            },{
                // label: "Sun",
                data: [{x: 0, y: 0},{x: 0, y: 0}], fill: false, showLine: true, pointRadius: 0,
				borderWidth: 6, borderColor: 'rgba(200,200,0,1)',
            },{
                // label: "Selected Waypoint",
                data: [], fill: false, showLine: false, pointRadius: 5, backgroundColor: 'rgba(255,255,255,1)',
            },{
                // label: "Current Blue",
                data: [{x: 0, y: 0}], fill: false, showLine: false, pointRadius: 15,
				pointStyle: 'triangle', backgroundColor: 'rgba(120,200,255,1)',
            },{
                // label: "Current Red",
                data: [{x: 0, y: 0}], fill: false, showLine: false, pointRadius: 15,
				pointStyle: 'triangle', backgroundColor: 'rgba(255,200,120,1)',
			},{
                // label: "Viewpoint",
                data: [], fill: true, showLine: true, pointRadius: 0, backgroundColor: 'rgba(255,200,120,0.25)',
			},{
                // label: "Relative Line",
                data: [{x: 0, y: 0},{x: 0, y: 0}], fill: false, showLine: true, pointRadius: 0,
				borderDash: [10,10], borderColor: 'rgba(255,255,255,0.5)',
			},{
                // label: "Current Gray",
                data: [{x: 0, y: 0}], showLine: false, fill: false, showLine: false, pointRadius: 15,
				pointStyle: 'square', backgroundColor: 'rgba(150,150,150,1)',
            },{
                // label: "Gray Trajectory",
                data: [], fill: false, showLine: true, pointRadius: 0, borderColor: 'rgba(150,150,150,1)',
            }
		]
        },
        options: {
			animation:{
				duration: 0
			},
			tooltips: {
				enabled: false,	
				bodyFontSize: 30,
				// Filters to ensure only waypoints display a tooltip
				filter: function(tooltipItem){
					return tooltipItem.datasetIndex === 0;
				},
				// Runs when tooltip opens and closes
				custom: function(tooltip){
					if (tooltip.opacity > 0){
						tooltipOpen = true;
					}
					else{
						tooltipOpen = false;
					}
				},
				callbacks:{
					// Allows custom text on tooltip
					label: function(a){
						tooltipIndex = a.index;
						return ['R: ' + a.yLabel.toFixed(2) + ' km', 
								'I: ' + a.xLabel.toFixed(2) + ' km'];
								// 'Time: ' + (globalChartRef.config.data.datasets[0].data[a.index].time/3600).toFixed(2) + ' hrs' ];
					}	
				}
				
			},
			legend: {
				display: false
			},
			onHover: function(element) {
				let scaleRef,
				valueX,
				valueY;
				for (var scaleKey in this.scales) {
					scaleRef = this.scales[scaleKey];
					if (scaleRef.isHorizontal() && scaleKey == 'x-axis-1') {
						valueX = scaleRef.getValueForPixel(element.offsetX);
					} else if (scaleKey == 'y-axis-1') {
						valueY = scaleRef.getValueForPixel(element.offsetY);
					}
				}
				handleHover(valueX,valueY);
			},
            onClick: function (element, dataAtClick) {
				// console.log('click')
                let scaleRef,
                    valueX,
                    valueY;
                for (var scaleKey in this.scales) {
                    scaleRef = this.scales[scaleKey];
                    if (scaleRef.isHorizontal() && scaleKey == 'x-axis-1') {
                        valueX = scaleRef.getValueForPixel(element.offsetX);
                    } else if (scaleKey == 'y-axis-1') {
                        valueY = scaleRef.getValueForPixel(element.offsetY);
                    }
				}
				handleClick(valueX,valueY,element.shiftKey || element.ctrlKey);
            },
            title: {
                display: true,
                text: "",
				fontColor: 'rgba(255,255,255,1)',
				fontSize: 40
            },
            scales: {
                xAxes: [{
					gridLines: {
						zeroLineColor: '#ffcc33', color: 'rgba(255,255,255,0.25)'
					},
                    type: "linear",
                    display: true,
                    scaleLabel: {display: true, labelString: 'In-Track [km]', fontColor: 'rgba(255,255,255,1)',
						fontSize: 30
                    },
					ticks: {min: -axisLimits, max: axisLimits, fontSize: 20,
						reverse: true, fontColor: 'rgba(255,255,255,1)',
					}
                }, ],
                yAxes: [{
					gridLines: {zeroLineColor: '#ffcc33', color: 'rgba(255,255,255,0.25)'
					},
                    display: true,
                    scaleLabel: {display: true, labelString: 'Radial [km]', fontColor: 'rgba(255,255,255,1)',
						fontSize: 30
                    },
					ticks: { min: -axisLimits*0.5, max: axisLimits*0.5, fontColor: 'rgba(255,255,255,1)',
						fontSize: 20,
					}
                }]
            },
            responsive: true,
            maintainAspectRatio: true
        }
    };
    
    config.data.datasets.forEach(function (dataset) {
        dataset.pointBorderWidth = 2;
        dataset.pointHoverRadius = 10;
    });
    
    var ctx = document.getElementById('ChartCnvs').getContext('2d');
    globalChartRef = new Chart(ctx, config);
}


function startGame() {
	createGraph();
	burns2waypoints(blueInitState, blueBurns, 0, 10800);
	burns2waypoints(redInitState, redBurns, 3, 10800);
	drawSunVectors(0);
	calcTrajectoryHistory();
	document.addEventListener('keydown', function(key){
		let k = key.key;
		handleKeyPress(k);
	});
	globalChartRef.update();
}

function drawSunVectors(t,orgin,plot) {
	if (plot === undefined) {
		plot = true;
		if (orgin === undefined) {
			orgin = [0,0];
		}
	}
	let n = 2*Math.PI/86164;
	let R = [[Math.cos(-t*n), -Math.sin(-t*n)],[Math.sin(-t*n), Math.cos(-t*n)]];
	let SunVector = math.multiply(R,initSunVector);
	if (plot){
		globalChartRef.config.data.datasets[7].data[0].x = orgin[1];
		globalChartRef.config.data.datasets[7].data[0].y = orgin[0];
		globalChartRef.config.data.datasets[7].data[1].x = SunVector[1][0]+orgin[1];
		globalChartRef.config.data.datasets[7].data[1].y = SunVector[0][0]+orgin[0];
		globalChartRef.update();
	}
	return SunVector;
}

function setCurrentPoints(blueIndex,bluePoint,redIndex,redPoint,gray1Index,gray1Point) {
	globalChartRef.config.data.datasets[blueIndex].data[0].x = bluePoint[1];
	globalChartRef.config.data.datasets[blueIndex].data[0].y = bluePoint[0];
	globalChartRef.config.data.datasets[redIndex].data[0].x = redPoint[1];
	globalChartRef.config.data.datasets[redIndex].data[0].y = redPoint[0];
	if (gray1Point !== undefined) {
		console.log('hey');
		globalChartRef.config.data.datasets[gray1Index].data[0].x = gray1Point[1];
		globalChartRef.config.data.datasets[gray1Index].data[0].y = gray1Point[0];
	}
	globalChartRef.config.data.datasets[12].data[0].x = redPoint[1];
	globalChartRef.config.data.datasets[12].data[0].y = redPoint[0];
	globalChartRef.config.data.datasets[12].data[1].x = bluePoint[1];
	globalChartRef.config.data.datasets[12].data[1].y = bluePoint[0];
}

function drawViewpoint(pos,az,range,index,color) {
	globalChartRef.config.data.datasets[index].data = [];
	globalChartRef.config.data.datasets[index].data.push({x: pos[1], y: pos[0]});
	range *= 1.5;
	let angWidth = Math.PI/9;
	for (var ii = az-angWidth/2; ii <= az+angWidth/2; ii += 0.01) {
		globalChartRef.config.data.datasets[index].data.push({x: pos[1]+range*Math.cos(ii), y: pos[0]+range*Math.sin(ii)});
	}
	globalChartRef.config.data.datasets[index].data.push({x: pos[1], y: pos[0]});
	if (color === 'red') {
		globalChartRef.config.data.datasets[index].backgroundColor = 'rgba(255,200,120,0.25)';
	}
	else {
		globalChartRef.config.data.datasets[index].backgroundColor = 'rgba(120,200,255,0.25)';
	}
}