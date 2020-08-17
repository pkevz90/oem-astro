let globalChartRef, targetR, oldr1, r1 = 26500, satState, playState, xAngOld, sidTime, playBool,sliders = [],sliderLabels = [], targets = [], dtPlay = 100,t, tBurn1, tBurn2, drag, spans = [], canvasBack;

function createGraph() {
    var config = {
        type: 'scatter',
        data: {
            datasets: [{
                // label: "Orbit",
                data: [],
                fill: false,
				showLine: true,
                pointRadius: 0,
                spanGaps: false,
                borderWidth: 5,
				borderColor: 'rgba(240, 120, 90, 1)'
            },{
                // label: "Field of View",
                data: [],
                fill: true,
				showLine: true,
                pointRadius: 0,
                spanGaps: false,
                borderWidth: 0,
                backgroundColor: 'rgba(255,255,255,0.25)',
				borderColor: 'rgba(240, 120, 90, 1)'
            }]
        },
        options: {
			animation:{
				duration: 0
			},
			legend: {
				display: false
            },
            onResize: function (element,a) {
                console.log(globalChartRef.chartArea,element.chartArea,a)
                
                setTimeout(function() { resizeBackground(globalChartRef.chartArea,document.getElementById('ChartCnvs')); }, 10);
            },
			onHover: function(element){
				
			},
            onClick: function (element, dataAtClick) {

            },
            title: {
                display: false,
				fontColor: 'rgba(255,255,255,1)',
				fontSize: 20
            },
            scales: {
                xAxes: [{
					gridLines: {
						zeroLineColor: 'rgba(255,255,255,0)',
						color: 'rgba(100,100,100,0)'
					},
                    type: "linear",
                    display: true,
                    scaleLabel: {
                        display: true,
                        labelString: '',
						fontColor: 'rgba(255,255,255,1)',
						fontSize: 30
                    },
					ticks: {
                        display: true,
						min: -180,
						max: 180,
						fontSize: 20,
						fontColor: 'rgba(255,255,255,1)',
					},
                    afterBuildTicks: (a,ticks) => {
						return [-180,-150,-120,-90,-60,-30,0,30,60,90,120,150,180];
					}
                }, ],
                yAxes: [{
					gridLines: {
						zeroLineColor: 'rgba(100,100,100,0)',
						color: 'rgba(100,100,100,0)'
					},
                    display: true,
                    scaleLabel: {
                        display: false,
                        labelString: '',
						fontColor: 'rgba(255,255,255,1)',
						fontSize: 30
                    },
					ticks: {
                        display: true,
						min: -90,
						max: 90,
						fontColor: 'rgba(255,255,255,1)',
						fontSize: 20,
                    },
                    afterBuildTicks: (a,ticks) => {
						return [-90,-60,-30,0,30,60,90];
					}
                }]
            },
            responsive: true,
            maintainAspectRatio: true,
            width: '400px',
            height: '200px'
        }
    };
    
    var ctx = document.getElementById('ChartCnvs').getContext('2d');
    globalChartRef = new Chart('ChartCnvs', config);
}


window.addEventListener('DOMContentLoaded', function () {
    
    createGraph();
    sliders.push(document.getElementById("smaSlider"));
	sliderLabels.push(document.getElementById("SMA"));
	sliders.push(document.getElementById("eccSlider"));
	sliderLabels.push(document.getElementById("ecc"));
	sliders.push(document.getElementById("incSlider"));
	sliderLabels.push(document.getElementById("inc"));
	sliders.push(document.getElementById("raanSlider"));
	sliderLabels.push(document.getElementById("raan"));
	sliders.push(document.getElementById("argSlider"));
	sliderLabels.push(document.getElementById("argP"));
	sliders.push(document.getElementById("taSlider"));
    sliderLabels.push(document.getElementById("ta"));
	for (const slider in sliders) {
		sliders[slider].addEventListener('input',changeState);	
	}
    // canvasBack = document.getElementById('ChartCnvs');
    resizeBackground(globalChartRef.chartArea,document.getElementById('ChartCnvs'));
    globalChartRef.chartArea = {
        bottom: 0,
        left: 0,
        right: 475,
        top: 0
    }
    satState = [7000,0,Math.PI/4,0,0,0];
    drawGroundTrack();
	document.addEventListener('keypress', function(key){
        let k = key.key;
		if (k === 'p') {
            if (playBool) {playBool = false; return;} else {playBool = true;}
            xAngOld = 0;
            sidTime = 0;
            globalChartRef.config.data.datasets[0].data = [];
            globalChartRef.update();
            playState = satState.slice();
            // console.log(playState,satState)
            idInterval = setInterval(function() {
                // console.log(playState,satState)
                posVelState = Coe2PosVel(playState);
                r = [[posVelState[0][0][0]],[posVelState[0][1][0]],[posVelState[0][2][0]]];
                r = Eci2Ecef (sidTime, r); sidTime += 360/86164*100;
                xAng = Math.atan2(r[1],r[0]);
                yAng = Math.atan2(r[2],Math.sqrt(Math.pow(r[0],2)+Math.pow(r[1],2)));
                if (xAng*xAngOld < 0 && Math.abs(xAng) > 1.6) {
                    let x1,x2,y1,y2,y3,s,len = globalChartRef.config.data.datasets[0].data.length;
                    x1 = globalChartRef.config.data.datasets[0].data[len-2].x;
                    x2 = globalChartRef.config.data.datasets[0].data[len-1].x;
                    y1 = globalChartRef.config.data.datasets[0].data[len-2].y;
                    y2 = globalChartRef.config.data.datasets[0].data[len-1].y;
                    s = (y2-y1)/(x2-x1);
                    if (x2 > 0) {
                        y3 = (180-x2)*s+y2;
                        globalChartRef.config.data.datasets[0].data.push({
                            x: 180,
                            y: y3
                        }) 
                        globalChartRef.config.data.datasets[0].data.push({
                            x: NaN,
                            y: NaN
                        }) 
                        globalChartRef.config.data.datasets[0].data.push({
                            x: -180,
                            y: y3
                        }) 
                    }
                    else {
                        y3 = (-180-x2)*s+y2;
                        globalChartRef.config.data.datasets[0].data.push({
                            x: -180,
                            y: y3
                        }) 
                        globalChartRef.config.data.datasets[0].data.push({
                            x: NaN,
                            y: NaN
                        }) 
                        globalChartRef.config.data.datasets[0].data.push({
                            x: 180,
                            y: y3
                        }) 
                    }
                    // console.log(x1,x2,y1,y2,y3)
                }
                xAngOld = xAng; yAngOld = yAng;
                globalChartRef.config.data.datasets[0].data.push({
                    x: xAng*180/Math.PI,
                    y: yAng*180/Math.PI
                })
                
                playState = twoBodyProp(playState,100);
                globalChartRef.update();
                
				if (!playBool) {
                    clearInterval(idInterval);
                    drawGroundTrack();
				}
            },25)
        }
    });
    
    globalChartRef.update();
    idInterval = setInterval(() => {
        // console.log(t,tBurn1)
        
    },25);
}, false);

function changeState() {
    let a = Number(sliders[0].value);
	let e = Number(sliders[1].value);
	let i = Number(sliders[2].value);
	let ra = Number(sliders[3].value);
	let arg = Number(sliders[4].value);
	let ta = Number(sliders[5].value);
	for (slide in sliders) {
		sliderLabels[slide].textContent = sliders[slide].value;
    }
    satState = [a,e,i*Math.PI/180,ra*Math.PI/180,arg*Math.PI/180,ta*Math.PI/180];
    // console.log(satState)
    drawGroundTrack()
}

function drawGroundTrack() {
    sidTime = 0;
    let posVelState, xAng,yAng,yAngOld = 0;
    xAngOld = 0;
    let dt = 200;
    let ii = 0;
    let ta0 = satState[5];
    globalChartRef.config.data.datasets[0].data = [];
    let iiF = Math.floor(2*2*Math.PI*Math.sqrt(Math.pow(satState[0],3)/398600.4418)/dt)+1;
    while (ii <= iiF){
        posVelState = Coe2PosVel(satState);
        r = [[posVelState[0][0][0]],[posVelState[0][1][0]],[posVelState[0][2][0]]];
        r = Eci2Ecef (sidTime, r); sidTime += 360/86164*dt;
        xAng = Math.atan2(r[1],r[0]);
        yAng = Math.atan2(r[2],Math.sqrt(Math.pow(r[0],2)+Math.pow(r[1],2)));
        if (xAng*xAngOld < 0 && Math.abs(xAng) > 1.6) {
            let x1,x2,y1,y2,y3,s,len = globalChartRef.config.data.datasets[0].data.length;
            console.log(globalChartRef.config.data.datasets[0].data, len, xAng,xAngOld)
            x1 = globalChartRef.config.data.datasets[0].data[len-2].x;
            x2 = globalChartRef.config.data.datasets[0].data[len-1].x;
            y1 = globalChartRef.config.data.datasets[0].data[len-2].y;
            y2 = globalChartRef.config.data.datasets[0].data[len-1].y;
            s = (y2-y1)/(x2-x1);
            if (x2 > 0) {
                y3 = (180-x2)*s+y2;
                globalChartRef.config.data.datasets[0].data.push({
                    x: 180,
                    y: y3
                }) 
                globalChartRef.config.data.datasets[0].data.push({
                    x: NaN,
                    y: NaN
                }) 
                globalChartRef.config.data.datasets[0].data.push({
                    x: -180,
                    y: y3
                }) 
            }
            else {
                y3 = (-180-x2)*s+y2;
                globalChartRef.config.data.datasets[0].data.push({
                    x: -180,
                    y: y3
                }) 
                globalChartRef.config.data.datasets[0].data.push({
                    x: NaN,
                    y: NaN
                }) 
                globalChartRef.config.data.datasets[0].data.push({
                    x: 180,
                    y: y3
                }) 
            }
            // console.log(x1,x2,y1,y2,y3)
        }
        xAngOld = xAng; yAngOld = yAng;
        globalChartRef.config.data.datasets[0].data.push({
            x: xAng*180/Math.PI,
            y: yAng*180/Math.PI
        })
        ii++;  
        satState = twoBodyProp(satState,dt);
    }
    r = satState[0]*(1-Math.pow(satState[1],2))/(1-satState[1]*Math.cos(satState[5]));
    drawFieldOfView(yAng*180/Math.PI,xAng*180/Math.PI,r);
    globalChartRef.update();
    satState[5] = ta0;
}

function resizeBackground(ca,cb) {
    cb.style.backgroundPosition = ca.left +'px ' + ca.top +'px'
    cb.style.backgroundSize = (ca.right-ca.left) +'px ' + (ca.bottom-ca.top) +'px'
}

function drawFieldOfView(lat,long,r) {
    let angGround = groundSwath(r)*180/Math.PI,newCoor, oldLon = 0;
    
    globalChartRef.config.data.datasets[1].data = [];
    for (var ii = 0; ii <= 360; ii += 1 ){
        newCoor = pointRadialDistance(lat,long,ii,angGround)
        if (newCoor[1]*oldLon < 0 && Math.abs(oldLon) > 90) {
            globalChartRef.config.data.datasets[1].data.push({
                x: NaN,
                y: NaN
            })
        }   
        globalChartRef.config.data.datasets[1].data.push({
            x: newCoor[1],
            y: newCoor[0]
        })
        oldLon = newCoor[1];
    }
}

function pointRadialDistance(lat1,lon1,bearing,rdistance) {
    // Assumes degrees
    rlat1 = lat1*Math.PI/180;
    rlon1 = lon1*Math.PI/180;
    rbearing = bearing*Math.PI/180;
    rdistance = rdistance*Math.PI/180;
    rlat = Math.asin( Math.sin(rlat1) * Math.cos(rdistance) + Math.cos(rlat1) * Math.sin(rdistance) * Math.cos(rbearing) );

    if (Math.cos(rlat) == 0 || Math.abs(Math.cos(rlat)) < 0.000001) {
        rlon=rlon1;
    }
    else{
        rlon = rlon1 + Math.atan2(Math.sin(rbearing)*Math.sin(rdistance)*Math.cos(rlat1),Math.cos(rdistance)-Math.sin(rlat1)*Math.sin(rlat));
    }
    lat = rlat*180/Math.PI;
    lon = rlon*180/Math.PI;
    // console.log(lon)
    if (lon < -180) {
        lon += 360;
    }
    else if (lon > 180) {
        lon -= 360;
    }
    return [lat,lon];
}