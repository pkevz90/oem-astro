let globalChartRef, R, Q, P, H, K, F, x, xEst, zAct, zEst, dt, play = 0,rangaAmb = 0.3, angAmb = 0.5*Math.PI/180, angles = true, range = false, radialBurn = false;
function createGraph() {
    var config = {
        type: 'scatter',
        data: {
            datasets: [{
                // label: "Truth",
                data: [],
                fill: false,
				showLine: true,
				pointRadius: 0,
				borderColor: 'rgba(200,200,255,1)'
            },{
                // label: "Estimate",
                data: [],
                fill: false,
				showLine: true,
				pointRadius: 0,
				pointBackgroundColor: 'rgba(120,255,255,1)',
				borderColor: 'rgba(120,200,255,1)'
            }]
        },
        options: {
			animation:{
				duration: 0
			},
			legend: {
				display: false
			},
            onClick: function (element, dataAtClick) {
				
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
                        labelString: 'Radial',
						fontColor: 'rgba(255,255,255,1)',
						fontSize: 30
                    },
					ticks: {
						min: -40,
						max: 40,
						fontSize: 20,
						reverse: true,
						fontColor: 'rgba(255,255,255,1)',
					},
					afterBuildTicks: (a,ticks) => {

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
                        labelString: 'Cross-Track',
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
    
    var ctx = document.getElementById('ChartCnvs').getContext('2d');
    globalChartRef = new Chart(ctx, config);
}

window.addEventListener('DOMContentLoaded', function () {
    createGraph();
    P = [[0.01, 0, 0, 0],[0, 0.01, 0, 0],[0, 0, 0.00000001, 0],[0, 0, 0, 0.00000001]];
    R = [[Math.pow(rangaAmb,2), 0],[0, Math.pow(angAmb,2)]];
    Q = [[Math.pow(0.00001,2),0,0,0],[0,Math.pow(0.00001,2),0,0],[0,0,Math.pow(0.00000001,2),0],[0,0,0,Math.pow(0.00000001,2)]]
    // x = [[-15],[0],[0],[30*2*Math.PI/86164]];
    x = [[10],[0],[0],[-20*2*Math.PI/86164]];
    dt = 100;
    console.log(x);
    
    xEst = math.add(x,[[5*Math.random()-2.5],[5*Math.random()-2.5],[0.0001*Math.random()-0.00005],[0.0001*Math.random()-0.00005]])
    let onesP = [[1,0,0,0],[0,1,0,0],[0,0,1,0],[0,0,0,1]];

    range = false;
    document.addEventListener('keypress', function(key){
        let k = key.key;
        if (k === 'r') {
            range = !range;
        }
        else if (k === 'b') {
            radialBurn = !radialBurn;
        }
    });
    idInterval = setInterval(() => {
        F = Fmatrix(dt);
        if (radialBurn) {
            x = math.add(math.multiply(transitionMatrix(dt),x),[[0],[0],[0.0000001*dt],[0]]);
        }
        else {
            x = math.multiply(transitionMatrix(dt),x);
        }
        x[0][0] += Math.sqrt(Q[0][0]);
        x[1][0] += Math.sqrt(Q[1][1]);
        x[2][0] += Math.sqrt(Q[2][2]);
        x[3][0] += Math.sqrt(Q[3][3]);
        xEst = math.multiply(transitionMatrix(dt),xEst);
        P = math.add(math.multiply(F,P,math.transpose(F)),Q);
        if (range === false) {
            zAct = measEst(x,'angles');
            zEst = measEst(xEst,'angles')+normalRandom()*angAmb;
            H = Hmatrix(xEst,'angles');
            if (zAct*zEst < 0 && Math.abs(zEst) > 1) {
                if (zEst < 0) {
                    zEst += 2*Math.PI;
                }
                else {
                    zAct += 2*Math.PI;
                }
            }
            K  = Kmatrix(P,H,R[1][1]);
            K = [[K[0]],[K[1]],[K[2]],[K[3]]];
            P = math.multiply(math.subtract(onesP,math.multiply(K,[H])),P);
        }
        else {
            zAct = measEst(x,'both');
            zEst = measEst(xEst,'both');
            zEst[0][0] += normalRandom()*rangaAmb;
            zEst[1][0] += normalRandom()*angAmb;
            if (zAct[1][0]*zEst[1][0] < 0 && Math.abs(zEst[1][0]) > 1) {
                if (zEst[1][0] < 0) {
                    zEst[1][0] += 2*Math.PI;
                }
                else {
                    zAct[1][0] += 2*Math.PI;
                }
            }
            H = Hmatrix(xEst,'both');
            K = Kmatrix(P,H,R);
            P = math.multiply(math.subtract(onesP,math.multiply(K,H)),P);
        }
        let y = math.subtract(zAct,zEst);
        // console.log(zAct, zEst,K,P,H);
        // console.log(x,xEst);
        
        xEst = math.add(xEst,math.multiply(K,y));
        globalChartRef.config.data.datasets[0].data.push({
            x: x[1][0],
            y: x[0][0],
        });
        globalChartRef.config.data.datasets[1].data.push({
            x: xEst[1][0],
            y: xEst[0][0],
        });
        globalChartRef.update();
    },10);
}, false);

function Kmatrix(P,H,R) {
    let S = math.add(math.multiply(math.multiply(H,P),math.transpose(H)),R);
    return math.multiply(math.multiply(P,math.transpose(H)),math.inv(S));
}

function Hmatrix(x,type) {
    normX12 = math.norm([x[0][0],x[1][0]]);
    if (type === "range") {
        return [x[0][0]/normX12, x[1][0]/normX12, 0, 0];
    }
    else if (type === "angles") {
        return [-x[1][0]/Math.pow(normX12,2), x[0][0]/Math.pow(normX12,2), 0, 0];
    }
    else {
        return [[x[0][0]/normX12, x[1][0]/normX12, 0, 0],
                [-x[1][0]/Math.pow(normX12,2), x[0][0]/Math.pow(normX12,2), 0, 0]];
    }
}

function Fmatrix(t,n) {
    if (n === undefined) {
        n = 2*Math.PI/86164;
    }
    return [[1,0,t,0],
            [0,1,0,t],
            [3*n*n*t,0,1,2*n*t],
            [0,0,-2*n*t,1]];
}

function measEst(x,type) {
    if (type === "range") {
        return math.norm([x[0][0],x[1][0]]);
    }
    else if (type === "angles") {
        return Math.atan2(x[1][0],x[0][0]);
    }
    else {
        return [[math.norm([x[0][0],x[1][0]])],[Math.atan2(x[1][0],x[0][0])]];
    }
}

function transitionMatrix(dt,n) {
    if (n === undefined) {
        n = 2*Math.PI/86164;
    }
    let nt = n*dt; let cnt = Math.cos(nt); let snt = Math.sin(nt);
    return [[4-3*cnt, 0, snt/n, 2*(1-cnt)/n],[6*(snt-nt), 1, 2*(cnt-1)/n, (4*snt-3*nt)/n],[3*n*snt, 0, cnt, 2*snt],[6*n*(cnt-1), 0, -2*snt, 4*cnt-3]];
}

function normalRandom()
{
	var val, u, v, s, mul;
    spareRandom = null;
	if(spareRandom !== null)
	{
		val = spareRandom;
		spareRandom = null;
	}
	else
	{
		do
		{
			u = Math.random()*2-1;
			v = Math.random()*2-1;

			s = u*u+v*v;
		} while(s === 0 || s >= 1);

		mul = Math.sqrt(-2 * Math.log(s) / s);

		val = u * mul;
		spareRandom = v * mul;
	}
	
	return val;
}