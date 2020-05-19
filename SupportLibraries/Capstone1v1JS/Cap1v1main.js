let globalChartRef;
let tooltipOpen, 
	tooltipIndex, 
	chosenWaypoint,
	axisLimits = 40, axisCenter = [0,0],
	blueInitState, redInitState,
	blueBurns, redBurns, burnChange = false,
	playFrame, playBool = false, posHistory = {red: [], blue: []}, dataSpans, blueSpans, redSpans, burnRows, redRows,
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
                    scaleLabel: {display: true, labelString: 'In-Track', fontColor: 'rgba(255,255,255,1)',
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
                    scaleLabel: {display: true, labelString: 'Radial', fontColor: 'rgba(255,255,255,1)',
						fontSize: 30
                    },
					ticks: { min: -axisLimits*0.75, max: axisLimits*0.75, fontColor: 'rgba(255,255,255,1)',
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


window.addEventListener('DOMContentLoaded', function () {
	createGraph();
	blueBurns = [[0,0],[0,0],[0,0],[0,0],[0,0]];
	blueInitState = [[0],[10],[0],[0]];
	redBurns = [[0,0],[0,0],[0,0],[0,0],[0,0]];
	redInitState = [[0],[-10],[0],[0]];
	burns2waypoints(blueInitState, blueBurns, 0, 10800);
	burns2waypoints(redInitState, redBurns, 3, 10800);
	currentTime = document.getElementById("timeSlider");
	currentTimeSpan = document.getElementById("time");
	dataSpans = document.getElementById("dataContainer").querySelectorAll("span");
	burnRows =  document.getElementById("burnTableBody").querySelectorAll("th");
	setupInputs = document.getElementById("setupContainer").querySelectorAll("input");
	document.getElementById("setScenario").addEventListener("click", () => {
		if (setupInputs[0].value !== ''){
			blueInitState = [[Number(setupInputs[0].value)], [Number(setupInputs[1].value)], [Number(setupInputs[2].value)/1000],[Number(setupInputs[3].value)/1000]];
		}
		if (setupInputs[4].value !== ''){
			redInitState = [[Number(setupInputs[4].value)], [Number(setupInputs[5].value)], [Number(setupInputs[6].value)/1000],[Number(setupInputs[7].value)/1000]];
		}
		if (setupInputs[8].value !== ''){
			let sunAng = Number(setupInputs[8].value)*Math.PI/180;
			initSunVector = [[Math.cos(sunAng)*axisLimits*0.4],[Math.sin(sunAng)*axisLimits*0.4]];
		}
		burns2waypoints(blueInitState, blueBurns, 0, 10800);
		burns2waypoints(redInitState, redBurns, 3, 10800);
		drawSunVectors(0);
		calcTrajectoryHistory();
		setCurrentPoints(9,[blueInitState[0],blueInitState[1]],10,[redInitState[0],redInitState[1]]);
		// document.getElementById("setupContainer").classList.add("collapse");
		$(".collapse2").collapse();
		globalChartRef.update();
	});
	drawSunVectors(0);
	calcTrajectoryHistory();
	setCurrentPoints(9,[blueInitState[0],blueInitState[1]],10,[redInitState[0],redInitState[1]]);
	document.getElementById("timeSlider").addEventListener('input',() => {
		currentTimeSpan.textContent = currentTime.value;
		calcData();
	});
	document.addEventListener('keydown', function(key){
		let k = key.key;
		handleKeyPress(k);
	});
	globalChartRef.update();
}, false);

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
	// console.log(R,SunVector,t,n)
	if (plot){
		globalChartRef.config.data.datasets[7].data[0].x = orgin[1];
		globalChartRef.config.data.datasets[7].data[0].y = orgin[0];
		globalChartRef.config.data.datasets[7].data[1].x = SunVector[1][0]+orgin[1];
		globalChartRef.config.data.datasets[7].data[1].y = SunVector[0][0]+orgin[0];
		globalChartRef.update();
	}
	return SunVector;
}

function setCurrentPoints(blueIndex,bluePoint,redIndex,redPoint) {
	globalChartRef.config.data.datasets[blueIndex].data[0].x = bluePoint[1];
	globalChartRef.config.data.datasets[blueIndex].data[0].y = bluePoint[0];
	globalChartRef.config.data.datasets[redIndex].data[0].x = redPoint[1];
	globalChartRef.config.data.datasets[redIndex].data[0].y = redPoint[0];
	globalChartRef.config.data.datasets[12].data[0].x = redPoint[1];
	globalChartRef.config.data.datasets[12].data[0].y = redPoint[0];
	globalChartRef.config.data.datasets[12].data[1].x = bluePoint[1];
	globalChartRef.config.data.datasets[12].data[1].y = bluePoint[0];
}

function drawViewpoint(pos,az,range,index,color) {
	globalChartRef.config.data.datasets[index].data = [];
	globalChartRef.config.data.datasets[index].data.push({x: pos[1], y: pos[0]});
	range *= 1.5;
	// let angWidth = 5/range;
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