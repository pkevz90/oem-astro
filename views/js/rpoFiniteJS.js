try{
let globalChartRef,
    dragPoint, state1, state2,a,tf, $spanList = $('table span');
let meanFocusDist

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
				borderColor: 'rgba(255,200,120,0.45)'
            },{
                // label: "Points",
                data: [],
                fill: false,
				showLine: false,
				pointRadius: 8,
                borderColor: 'rgba(255,255,255,1)',
				pointBackgroundColor: 'rgba(255,255,255,0.5)'
            }]
        },
        options: {
            tooltips: {
                enabled: false
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
				handleClick(valueX,valueY);
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
    state1 = {x: 0, y: 0, z: 0, xd: 0, yd: 0.0, zd: 0};
    state2 = {x: -10, y: 2, z: 0, xd: 0, yd: 0, zd: 0};
    tf = 43200; a = 0.0000001; tf = 14400;
    showReach(state1,a,tf);
    performOneBurnAnalysis();
    $('.slidercontainer').on('input',()=>{
        tf = Number($('.slidercontainer input')[0].value)*3600;
        $('.slidercontainer span')[0].textContent = (tf/3600).toFixed(2);
        a = Number($('.slidercontainer input')[1].value);
        a = Math.pow(10,a)/1000;
        $('.slidercontainer span')[1].textContent = a.toExponential(2);
        showReach(state1,a,tf);
        performOneBurnAnalysis();
    })
}, false);

function isInsideEllipse(checkX,checkY){
    let mindist = 1000000;
    let inside = true;
    for (count = 0; count < globalChartRef.config.data.datasets[2].data.length; count++){
        let bndryX=globalChartRef.config.data.datasets[2].data[count].x;
        let bndryY=globalChartRef.config.data.datasets[2].data[count].y;
        //console.log(count)
        if (math.norm([bndryX-checkX,bndryY-checkY])<mindist){
            mindist = math.norm([bndryX-checkX,bndryY-checkY]);
            if (math.norm([bndryX,bndryY]) < math.norm([checkX,checkY])){
                inside = false;
            } else {
                inside = true;
            }
        }
    }
    return inside;
}

function performOneBurnAnalysis() {
    let X = hcwFiniteBurnOneBurn(state1, state2, undefined, tf, a);
    drawStartEnd();
    //showReach(state1,a,tf);
    if (X[0] !== false){
        drawOneBurnTrajectory(state1,X[1],tf,a);
        recordStats(X,tf,a);
    }
    else {
        drawOneBurnTrajectory('delete');
        console.log('not possible')
    }
    drawImpulsiveTraj();
}
function performTwoBurnAnalysis() {
    let S = proxOpsJacobianTwoBurn(state1,a,0.1,0,0.25,0.2, 0,0.25,3600,2*Math.PI/86164);
    let X2 = hcwFiniteBurnTwoBurn(state1, state2, undefined, tf, a);
    
    
    //showReach(state1,a,tf);
    if (X2[0] !== false){
        drawOneBurnTrajectory(state1,X2[0],tf,a);
        recordStats(X2,tf,a);
    }
    else {
        console.log('not possible')
    }
    drawTwoBurnTrajectory(state1,X2,tf,a)
    drawImpulsiveTraj();
}
function drawStartEnd() {
    globalChartRef.config.data.datasets[4].data = [];
    globalChartRef.config.data.datasets[4].data.push({
        x: state1.y,
        y: state1.x
    })
    globalChartRef.config.data.datasets[4].data.push({
        x: state2.y,
        y: state2.x
    })
    globalChartRef.update();
}
function drawOneBurnTrajectory(state,X,tf,a0) {
    globalChartRef.config.data.datasets[0].data = [];
    globalChartRef.config.data.datasets[1].data = [];
    if (state === 'delete') {
        return;
    }
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
    let maxR =0, maxI = 0;
    for (var ii = 0; ii <= 360; ii+=5){
        finiteState = hcwBurnClosed(state,a0,ii*Math.PI/180,tf);
        // r1 = [[finiteState[0]],[finiteState[1]]];
        // v1 = [[finiteState[2]],[finiteState[3]]];
        //console.log(finiteState)
        if (finiteState[1] > maxI) {
            maxI = finiteState[1];
        }
        if (finiteState[0] > maxR) {
            maxR = finiteState[0]
        }
        globalChartRef.config.data.datasets[2].data.push({
            x: finiteState[1],
            y: finiteState[0]
        })
    }
    globalChartRef.update();
    if ((maxI/2) < maxR) {
        globalChartRef.config.options.scales.yAxes[0].ticks.min = -maxR*1.2;
        globalChartRef.config.options.scales.yAxes[0].ticks.max = maxR*1.2;
        globalChartRef.config.options.scales.xAxes[0].ticks.min = -2*maxR*1.2;
        globalChartRef.config.options.scales.xAxes[0].ticks.max = 2*maxR*1.2;
    }
    else {
            globalChartRef.config.options.scales.yAxes[0].ticks.min = -maxI*1.2/2;
            globalChartRef.config.options.scales.yAxes[0].ticks.max = maxI*1.2/2;
            globalChartRef.config.options.scales.xAxes[0].ticks.min = -maxI*1.2;
            globalChartRef.config.options.scales.xAxes[0].ticks.max = maxI*1.2;
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
function recordStats(X,tf,a) {
    
    $spanList[0].textContent = Number(a*1000).toExponential(1);
    $spanList[1].textContent = (tf/3600).toFixed(2);
    $spanList[2].textContent = (X[0][2]*tf/60).toFixed(2);
    $spanList[3].textContent = (Math.cos(X[0][0])).toFixed(3);
    $spanList[4].textContent = (Math.sin(X[0][0])).toFixed(3);
    $spanList[8].textContent = (X[1][2]*tf/60).toFixed(2);
    $spanList[9].textContent = (Math.cos(X[1][0])).toFixed(3);
    $spanList[10].textContent = (Math.sin(X[1][0])).toFixed(3);

}
function handleHover(valueX,valueY){
    if (dragPoint && isInsideEllipse(1.02*valueX,1.02*valueY)){
        globalChartRef.config.data.datasets[4].data[1].x = valueX;
        globalChartRef.config.data.datasets[4].data[1].y = valueY;
        state2.x = valueY;
        state2.y = valueX;
        performOneBurnAnalysis();
    }
}
function handleClick(valueX,valueY){
    if (dragPoint && isInsideEllipse(1.02*valueX,1.02*valueY)){
        dragPoint = !dragPoint;
        return;
    }
    if (checkClose(valueX,valueY)){
        dragPoint = true;
        return;
    }
}
function checkClose(X,Y) {
    let xPoint, yPoint;
    xPoint = globalChartRef.config.data.datasets[4].data[1].x;
    yPoint = globalChartRef.config.data.datasets[4].data[1].y;
    if (math.norm([xPoint-X,yPoint-Y]) < 2) {
        return true;
    }
    return false;
}
}catch(error){
    alert(error)
}