let globalChartRef;
let tooltipOpen, 
	tooltipIndex, 
	chosenWaypoint,
	dragPoint, 
	axisLimits = 20, 
	tacticArray = [], passiveTime = 12, 
	tactic = undefined, 
	idInterval, 
	wholeTraj, 
	playFrame, playBool = false, 
	initSunVector = [[axisLimits*3/8],[0]], playDt = 100, numSensors = 0,
	startTime,
	maneuverListSpans,
	firstClick = undefined;
// console.log(math.inv([[2,-1,3],[2,-2,1],[1,1,1]]));
function createGraph() {
    var config = {
        type: 'scatter',
        data: {
            datasets: [{
                // label: "Waypoints",
                data: [{
					x: -15,
					y: 0,
					dx: 0,
					dy: 0,
					deltaX: 0,
					deltaY: 0,
					time: 0
				}],
                fill: false,
                showLine: false,
				pointRadius: 7,
				borderColor: 'rgba(120,200,255,1)'
            },{
                // label: "Trajectory",
                data: [],
                fill: false,
                showLine: true,
				pointRadius: 0,
				borderColor: 'rgba(60,100,255,1)'
            },{
                // label: "Chosen Point",
                data: [],
                fill: false,
                showLine: false,
				pointRadius: 8,
				pointBackgroundColor: 'rgba(255,0,0,1)'
            },{
                // label: "Technique Plot",
                data: [],
                fill: false,
                showLine: true,
				pointRadius: 0,
				borderDash: [10,10],
				borderColor: 'rgba(255,255,255,1)'
            },{
                // label: "Passive Trajectory",
                data: [],
                fill: false,
                showLine: true,
				pointRadius: 0,
				borderColor: 'rgba(120,200,250,0.5)'
            },{
                // label: "Sun",
                data: [],
                fill: false,
                showLine: true,
				pointRadius: 0,
				borderWidth: 6,
				borderColor: 'rgba(200,200,0,1)',
            },{
                // label: "Moon",
                data: [],
                fill: false,
                showLine: true,
				pointRadius: 0,
				borderWidth: 6,
				borderColor: 'rgba(150,150,150,1)',
            },{
                // label: "Burn Direction",
                data: [{
					x: 0,
					y: 0,
				},{
					x: 0,
					y: 0,
				}],
                fill: false,
                showLine: true,
				pointRadius: 0,
				borderWidth: 3,
				spanGaps: false,
				borderColor: 'rgba(255,255,255,1)',
            },{
				// label: "Sensor",
                data: [],
                fill: true,
                showLine: true,
				pointRadius: 0,
				lineTension: 0,
				backgroundColor: 'rgba(255,150,150,0.5)'
			}]
        },
        options: {
			onResize: function (element,a) {
				// console.log(globalChartRef.config.options.scales.xAxes[0].scaleLabel)
				setLabelSize(a.width);
            },
			animation:{
				duration: 0
			},
			tooltips: {
				enabled: false
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
                display: false,
                text: "",
				fontColor: 'rgba(255,255,255,1)',
				fontSize: 40
            },
            scales: {
                xAxes: [{
					gridLines: {
						zeroLineColor: 'rgba(255,255,255,0.5)',
						color: 'rgba(255,255,255,0.25)'
					},
                    type: "linear",
                    display: true,
                    scaleLabel: {
                        display: true,
                        labelString: 'In-Track',
						fontColor: 'rgba(255,255,255,1)',
						fontSize: 20,
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
						zeroLineColor: 'rgba(255,255,255,0.5)',
						color: 'rgba(255,255,255,0.25)'
					},
                    display: true,
                    scaleLabel: {
                        display: true,
                        labelString: 'Radial',
						fontColor: 'rgba(255,255,255,1)',
						fontSize:  20,
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
    
    config.data.datasets.forEach(function (dataset) {
        dataset.pointBorderWidth = 2;
        dataset.pointHoverRadius = 12;
    });
    
    var ctx = document.getElementById('ChartCnvs').getContext('2d');
    globalChartRef = new Chart(ctx, config);
}


window.addEventListener('DOMContentLoaded', function () {
	createGraph();
	setLabelSize($('#ChartCnvs').width()); // Scale label size to browser window size
	let v = document.getElementById("start-time").value;
	startTime = [Number(v.substring(0,4)), Number(v.substring(5,7)), Number(v.substring(8,10)), Number(v.substring(11,13)), Number(v.substring(14,16))];
	drawSunMoonVectors(julianDateCalc(startTime));
	maneuverListSpans = document.getElementById("burnTable").querySelectorAll("span");
	annotateBurnHistory();
	globalChartRef.update();
	document.getElementById("ChartCnvs").addEventListener("wheel", function(a){
		a.preventDefault();
		if (tactic !== undefined) {
			handleTechnique(tactic,undefined,undefined,'wheel',a.deltaY);
			return;
		}
		if (a.deltaY > 0){
			if (globalChartRef.config.data.datasets[0].data[chosenWaypoint].time > 300){
				globalChartRef.config.data.datasets[0].data[chosenWaypoint].time -= 300;
			}
			else {
				showNoteBar('Cannot have negative transfer time');
			}
		}
		else{
			globalChartRef.config.data.datasets[0].data[chosenWaypoint].time += 300;
		}
		calculateTrajecories();
		drawSunMoonVectors(julianDateCalc(startTime),Number(maneuverListSpans[chosenWaypoint*5].innerText)*3600);
	});
	document.addEventListener('keypress', function(key){
		let k = key.key;
		handleKeyPress(k);
	});
	// console.log(document.getElementById("Play"));
	document.getElementById("start-time").addEventListener("change",(a)=>{
		let v = a.srcElement.value;
		startTime = [Number(v.substring(0,4)), Number(v.substring(5,7)), Number(v.substring(8,10)), Number(v.substring(11,13)), Number(v.substring(14,16))];
    	drawSunMoonVectors(julianDateCalc(startTime));
	});
	document.getElementById("sunCheck").addEventListener("change",() => {
		drawSunMoonVectors(julianDateCalc(startTime));
	})
	document.getElementById("moonCheck").addEventListener("change",() => {
		drawSunMoonVectors(julianDateCalc(startTime));
	})
	document.getElementById("burnCheck").addEventListener("change",() => {
		plotBurnDirections();
		globalChartRef.update();
	})
}, false);

function setLabelSize(canvasWidth) {
	globalChartRef.config.options.scales.xAxes[0].scaleLabel.fontSize = canvasWidth/40;
	globalChartRef.config.options.scales.yAxes[0].scaleLabel.fontSize = canvasWidth/40;
	globalChartRef.config.options.scales.xAxes[0].ticks.fontSize = canvasWidth/60;
	globalChartRef.config.options.scales.yAxes[0].ticks.fontSize = canvasWidth/60
}