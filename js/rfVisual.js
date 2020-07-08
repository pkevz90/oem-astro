let globalChartRef;

let baseSignal = {
    amplitude: 2,
    frequency: 0.25, //MHz
    phase: 0
}

let signals = [];

function createGraph() {
	var config = {
		type: 'scatter',
		data: {
			datasets: [{
				// Base Signal
				data: [], showLine: true, fill: false,
				pointRadius: 0, borderColor: 'rgba(255,255,255,0.5)'
			},{
				// Base Signal Point
				data: [], showLine: false, fill: false,
				pointRadius: 10, borderColor: 'rgba(255,255,255,0.5)'
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
				return;
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
				return;
			},
			title: {
				display: false
			},
			scales: {
				xAxes: [{
					gridLines: {
                        display: false,
						zeroLineColor: 'rgba(255,255,255,0.25)',
						color: 'rgba(255,255,255,0.25)'
					},
					type: "linear",
					display: true,
					scaleLabel: {
						display: true,
						labelString: 'Time',
						fontColor: 'rgba(255,255,255,1)',
						fontSize: 20
					},
					ticks: {
                        display: false,
						min: 0,
						max: 100,
						fontSize: 20,
						fontColor: 'rgba(255,255,255,1)'
					}
				}],
				yAxes: [{
					gridLines: {
						zeroLineColor: 'rgba(255,255,255,0.25)',
						color: 'rgba(255,255,255,0.25)'
					},
					display: true,
					scaleLabel: {
						display: true,
						labelString: 'Amplitude',
						fontColor: 'rgba(255,255,255,1)',
						fontSize: 20
					},
					ticks: {
                        display: false,
						min: -5,
						max: 5,
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
let time = 75;
createGraph();

setInterval(() => {
    globalChartRef.config.data.datasets[0].data.push({
        x: time,
        y: baseSignal.amplitude * Math.sin(baseSignal.frequency * time + baseSignal.phase)
    });
    globalChartRef.config.options.scales.xAxes[0].ticks.min = time - 75;
    globalChartRef.config.options.scales.xAxes[0].ticks.max = time + 25;
    time += 0.25;
    if (globalChartRef.config.data.datasets[0].data.length > 300) {
        globalChartRef.config.data.datasets[0].data.shift();
    }
    globalChartRef.update();
},20)