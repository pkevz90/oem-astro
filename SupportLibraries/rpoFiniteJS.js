let globalChartRef,
    dragPoint, state1, state2,a,tf;

function createGraph() {
    var config = {
        type: 'scatter',
        data: {
            datasets: [{
                // label: "BurnTrajectory",
                data: [],
                fill: false,
				showLine: true,
                pointRadius: 0,
                spanGaps: false,
				borderColor: 'rgba(255,200,120,1)'
            },{
                // label: "BurnTrajectory",
                data: [],
                fill: false,
				showLine: true,
				pointRadius: 0,
				borderColor: 'rgba(120,200,255,1)'
            },{
                // label: "Reach",
                data: [],
                fill: false,
				showLine: true,
				pointRadius: 0,
				borderColor: 'rgba(255,255,255,1)',
            },{
                // label: "ImpBurnTrajectory",
                data: [],
                fill: false,
				showLine: true,
				pointRadius: 0,
				borderColor: 'rgba(255,200,120,0.25)'
            }]
        },
        options: {
            tooltips: {
                enabled: false
            },
			animation:{
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
                        labelString: 'In-Track',
						fontColor: 'rgba(255,255,255,1)',
						fontSize: 30
                    },
					ticks: {
						min: -40,
						max: 40,
						fontSize: 20,
						reverse: true,
						fontColor: 'rgba(255,255,255,1)',
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
                        labelString: 'Radial',
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
    state1 = {x: 6.9, y: 8.5, z: 0, xd: 0.0006, yd: 0.0005, zd: 0};
    state2 = {x: 10, y: 0, z: 0, xd: 0, yd: 0, zd: 0};
    a = 0.000000002; tf = 43200; a = 0.0000002; tf = 15000;
    // let S = proxOpsJacobianTwoBurn(state1,a,0.1,0,0.25,0.2, 0,0.25,3600,2*Math.PI/86164);
    // let X2 = hcwFiniteBurnTwoBurn(state1, state2, undefined, tf, a);
    // console.log(X2)
    let X = hcwFiniteBurnOneBurn(state1, state2, undefined, tf, a);
    showReach(state1,a,tf);
    // console.log(state2)
    // X[2][0] = 1;
    if (X !== false){
        drawOneBurnTrajectory(state1,X,tf,a);
    }
    else {
        console.log('not possible')
    }
    // drawTwoBurnTrajectory(state1,X2,tf,a)
    // console.log(state2)
    drawImpulsiveTraj();
}, false);

function drawOneBurnTrajectory(state,X,tf,a0) {
    let s;
    // Draw Burn Trajectory
    for (var ii = 0; ii <= 100; ii++) {
        s = oneBurnFiniteHcw(state,X[0][0],X[1][0],1,tf*X[2][0]*ii/100,a0);
        globalChartRef.config.data.datasets[0].data.push({
            x: s.y,
            y: s.x
        })
    }
    state = s;
    globalChartRef.update();
    //Draw Drift Trajectory
    let td = tf-tf*X[2][0];
    for (var ii = 0; ii <= 100; ii++) {
        s = oneBurnFiniteHcw(state,0,0,0,td*ii/100,0);
        globalChartRef.config.data.datasets[1].data.push({
            x: s.y,
            y: s.x
        })
    }
    // console.log(s)
    globalChartRef.update();
}

function drawTwoBurnTrajectory(state,X,tf,a0) {
    let s;
    // Draw Burn Trajectory
    let t1 = tf*X[2][0], t2 = tf*X[5][0], td = tf-t1-t2;
    for (var ii = 0; ii <= 100; ii++) {
        s = oneBurnFiniteHcw(state,X[0][0],X[1][0],1,t1*ii/100,a0);
        globalChartRef.config.data.datasets[0].data.push({
            x: s.y,
            y: s.x
        })
    }
    
    globalChartRef.config.data.datasets[0].data.push({
        x: NaN,
        y: NaN
    })
    state = s;
    globalChartRef.update();
    //Draw Drift Trajectory
    for (var ii = 0; ii <= 100; ii++) {
        s = oneBurnFiniteHcw(state,0,0,0,td*ii/100,0);
        globalChartRef.config.data.datasets[1].data.push({
            x: s.y,
            y: s.x
        })
    }
    state = s;
    // console.log(s)
    globalChartRef.update();
    for (var ii = 0; ii <= 100; ii++) {
        s = oneBurnFiniteHcw(state,X[3][0],X[4][0],1,t2*ii/100,a0);
        globalChartRef.config.data.datasets[0].data.push({
            x: s.y,
            y: s.x
        })
    }
    globalChartRef.update();
}

function showReach(state,a0,tf) {
    globalChartRef.config.data.datasets[2].data = [];
    for (var ii = 0; ii <= 360; ii+=20){
        finiteState = hcwBurnClosed(state,a0,ii*Math.PI/180,tf);
        r1 = [[finiteState[0]],[finiteState[1]]];
        v1 = [[finiteState[2]],[finiteState[3]]];
        globalChartRef.config.data.datasets[2].data.push({
            x: finiteState[1],
            y: finiteState[0]
        })
    }
    globalChartRef.update();
}

function checkClose(X,Y,waypoints) {
    let xPoint, yPoint;
    for (var ii = 0; ii < waypoints.length; ii++) {
        xPoint = waypoints[ii][1];
        yPoint = waypoints[ii][0];
        // console.log(math.norm([xPoint-X,yPoint-Y]))
        if (math.norm([xPoint-X,yPoint-Y]) < 2) {
            dragPoint = ii;
            return true;
        }
    }
    dragPoint = undefined;
    return false;
}

function drawImpulsiveTraj() {
	let r1, r2, r, v1;
	var dt = 100;
    globalChartRef.config.data.datasets[3].data = [];
    
    r1 = [[state1.x],[state1.y]];
    r2 = [[state2.x],[state2.y]];

    v1 = math.multiply(math.inv(PhiRV(tf)),math.subtract(r2,math.multiply(PhiRR(tf),r1)));
    v2 = math.add(math.multiply(PhiVR(tf),r1),math.multiply(PhiVV(tf),v1));
    // console.log(r1,r2)
    for (var kk = 0; kk < tf; kk += dt){
        r = math.add(math.multiply(PhiRR(kk),r1),math.multiply(PhiRV(kk),v1));
        globalChartRef.config.data.datasets[3].data.push({
            x: r[1],
            y: r[0]
        });
    }
    globalChartRef.config.data.datasets[3].data.push({
        x: r2[1],
        y: r2[0]
    });
	
	globalChartRef.update();
}