let globalChartRef;

let app = new Vue({
    el: '#app-data',
    data: {
        points: [],
        model: [],
        estimate: []
    },
    watch: {
        points: function() {
            for (point in this.points) {
                globalChartRef.config.data.datasets[1].data.push({
                    x: this.points[point][0],
                    y: this.points[point][1]
                });
            }
            globalChartRef.update();
        }
    }
});

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


