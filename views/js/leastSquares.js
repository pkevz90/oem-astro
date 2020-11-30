let globalChartRef;

let app = new Vue({
    el: '#app-data',
    data: {
        points: [],
        modelOrder: 1,
        estimate: []
    },
    watch: {
        points: function() {
			globalChartRef.config.data.datasets[1].data = [];
            for (point in this.points) {
                globalChartRef.config.data.datasets[1].data.push({
                    x: this.points[point][0],
                    y: this.points[point][1]
                });
			}
			if (this.points.length > 1) {
				performLeastSquares();
			}
			
            globalChartRef.update();
        }
    }
});

function performLeastSquares() {
	if (app.modelOrder === 1) {
		let p = math.transpose(app.points);
		let px = p[0];
		let py = p[1];
		let A = math.transpose(math.concat([math.ones(app.points.length)._data],[px],0));
		let psuedoInvA = math.multiply(math.inv(math.multiply(math.transpose(A),A)),math.transpose(A))
		let result = math.multiply(psuedoInvA,math.transpose(py))
		globalChartRef.config.data.datasets[0].data = [];
		globalChartRef.config.data.datasets[0].data.push({
			x: 0,
			y: result[1]*0+result[0]
		},{
			x: 40,
			y: result[1]*40+result[0]
		});
	}
	else if (app.modelOrder === 2) {
		let p = math.transpose(app.points);
		let px = p[0];
		let py = p[1];
		let A = math.transpose(math.concat([math.ones(app.points.length)._data],[px],[math.dotPow(px,2)],0));
		let psuedoInvA = math.multiply(math.inv(math.multiply(math.transpose(A),A)),math.transpose(A))
		let result = math.multiply(psuedoInvA,math.transpose(py))
		console.log(result)
		globalChartRef.config.data.datasets[0].data = [];
		globalChartRef.config.data.datasets[0].data.push({
			x: 0,
			y: result[2]*0*0+result[1]*0+result[0]
		},{
			x: 10,
			y: result[2]*10*10+result[1]*10+result[0]
		},{
			x: 20,
			y: result[2]*20*20+result[1]*20+result[0]
		},{
			x: 30,
			y: result[2]*30*30+result[1]*30+result[0]
		},{
			x: 40,
			y: result[2]*40*40+result[1]*40+result[0]
		});
	}
	
	
}

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
				borderColor: 'rgba(120,200,255,1)'
			}, {
				// label: "Data",
				data: [],
				fill: false,
				showLine: false,
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
			tooltips: {
				enabled: false
			},
			onClick: function (element) {
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
                app.points.push([valueX, valueY]);
            },
			title: {
				display: false,
			},
			scales: {
				xAxes: [{
					gridLines: {
						zeroLineColor: 'rgba(255,255,255,0.25)',
						color: 'rgba(255,255,255,0.025)'
					},
					ticks: {
                        display: false,
						min: 0,
						max: 40,
						fontSize: 20,
						fontColor: 'rgba(255,255,255,1)',
					}
				}, ],
				yAxes: [{
					gridLines: {
						zeroLineColor: 'rgba(255,255,255,0.25)',
						color: 'rgba(255,255,255,0.025)'
					},
					ticks: {
                        display: false,
						min: 0,
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

	var ctx = document.getElementById('ChartCnvs').getContext('2d');
	globalChartRef = new Chart(ctx, config);
}


window.addEventListener('DOMContentLoaded', function () {
	createGraph();
	globalChartRef.update();
}, false);


