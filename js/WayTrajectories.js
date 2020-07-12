function calculateTrajecories(){
	let numWaypoints = globalChartRef.config.data.datasets[0].data.length;
	let r1, r2, r, v1,t, PRR, PRV;
	var dt = 1000;
	globalChartRef.config.data.datasets[1].data = [];
	let vxOld = 0, vyOld = 0; 
	for (var ii = 0; ii < (numWaypoints-1); ii++){
		t = globalChartRef.config.data.datasets[app.dataLoc.way].data[ii+1].time;
		r1 = [[globalChartRef.config.data.datasets[app.dataLoc.way].data[ii].y],[globalChartRef.config.data.datasets[app.dataLoc.way].data[ii].x]];
		r2 = [[globalChartRef.config.data.datasets[app.dataLoc.way].data[ii+1].y],[globalChartRef.config.data.datasets[app.dataLoc.way].data[ii+1].x]];

		v1 = math.multiply(math.inv(PhiRV(t)),math.subtract(r2,math.multiply(PhiRR(t),r1)));
		v2 = math.add(math.multiply(PhiVR(t),r1),math.multiply(PhiVV(t),v1));
		globalChartRef.config.data.datasets[app.dataLoc.way].data[ii].deltaX = v1[1][0]-vxOld; 
		globalChartRef.config.data.datasets[app.dataLoc.way].data[ii].deltaY = v1[0][0]-vyOld;
		globalChartRef.config.data.datasets[app.dataLoc.way].data[ii+1].dy = vyOld; 
		vxOld = v2[1][0]; vyOld = v2[0][0];
		globalChartRef.config.data.datasets[app.dataLoc.way].data[ii+1].dx = vxOld; 
		globalChartRef.config.data.datasets[app.dataLoc.way].data[ii+1].dy = vyOld; 
		for (var kk = 0; kk < t; kk += dt){
			r = math.add(math.multiply(PhiRR(kk),r1),math.multiply(PhiRV(kk),v1));
			globalChartRef.config.data.datasets[app.dataLoc.traj].data.push({
				x: r[1],
				y: r[0]
			});
		}
		globalChartRef.config.data.datasets[app.dataLoc.traj].data.push({
			x: r2[1],
			y: r2[0]
		});
	}
	if (app.chosenWaypoint !== undefined){
		calcPassiveTraj();
	}
	plotBurnDirections();
	annotateBurnHistory();
	globalChartRef.update();
}
function playTrajectory(){
	let numWaypoints = globalChartRef.config.data.datasets[app.dataLoc.way].data.length;
	let r1, r2, r, v1, t;
	var dt = 100;
	globalChartRef.config.data.datasets[1].data = []; let traj = [];
	for (var ii = 0; ii < (numWaypoints-1); ii++){
		t = globalChartRef.config.data.datasets[app.dataLoc.way].data[ii+1].time;
		r1 = [[globalChartRef.config.data.datasets[app.dataLoc.way].data[ii].y],[globalChartRef.config.data.datasets[app.dataLoc.way].data[ii].x]];
		r2 = [[globalChartRef.config.data.datasets[app.dataLoc.way].data[ii+1].y],[globalChartRef.config.data.datasets[app.dataLoc.way].data[ii+1].x]];

		v1 = math.multiply(math.inv(PhiRV(t)),math.subtract(r2,math.multiply(PhiRR(t),r1)));
		for (var kk = 0; kk < t; kk += dt){
			r = math.add(math.multiply(PhiRR(kk),r1),math.multiply(PhiRV(kk),v1));
			traj.push([r[1],r[0]]);
		}
	}
	return traj;
}
function calcPassiveTraj(){
	// Show passive trajectory
	globalChartRef.config.data.datasets[app.dataLoc.pass].data = [];
	let rPass = [[globalChartRef.config.data.datasets[app.dataLoc.way].data[app.chosenWaypoint].y],[globalChartRef.config.data.datasets[app.dataLoc.way].data[app.chosenWaypoint].x]];
	let vPass = [[globalChartRef.config.data.datasets[app.dataLoc.way].data[app.chosenWaypoint].dy],[globalChartRef.config.data.datasets[app.dataLoc.way].data[app.chosenWaypoint].dx]];
	let r2;
	for (var jj = 0; jj <= passiveTime; jj+= 0.5){
		r2 = math.add(math.multiply(PhiRR(jj*3600),rPass),math.multiply(PhiRV(jj*3600),vPass));
		globalChartRef.config.data.datasets[app.dataLoc.pass].data.push({
			x: r2[1],
			y: r2[0],
		});
	}
}
function plotBurnDirections(){
	
	let numWaypoints = globalChartRef.config.data.datasets[app.dataLoc.way].data.length;
	globalChartRef.config.data.datasets[app.dataLoc.burn].data = [];
	if (!document.getElementById("burnCheck").checked) {
		return;
	}
	for (var ii = 0; ii < (numWaypoints-1); ii++){
		globalChartRef.config.data.datasets[app.dataLoc.burn].data.push({
			x: globalChartRef.config.data.datasets[app.dataLoc.way].data[ii].x,
			y: globalChartRef.config.data.datasets[app.dataLoc.way].data[ii].y,
		})
		globalChartRef.config.data.datasets[app.dataLoc.burn].data.push({
			x: globalChartRef.config.data.datasets[app.dataLoc.way].data[ii].x+globalChartRef.config.data.datasets[app.dataLoc.way].data[ii].deltaX*4000,
			y: globalChartRef.config.data.datasets[app.dataLoc.way].data[ii].y+globalChartRef.config.data.datasets[app.dataLoc.way].data[ii].deltaY*4000,
		})
		globalChartRef.config.data.datasets[app.dataLoc.burn].data.push({
			x: NaN,
			y: NaN
		})
	}
} 
function drawSunMoonVectors(time,dt) {
	let long = 0*Math.PI/180;
	let theta0 = thetaGMST(time)*Math.PI/180;
	let n = 2*Math.PI/86164;
	globalChartRef.config.data.datasets[app.dataLoc.sun].data = [];
	globalChartRef.config.data.datasets[app.dataLoc.moon].data = [];
	if (document.getElementById("sunCheck").checked) {
		initSunVector = sunVectorCalc(time);
		if (dt === undefined) {
			dt = 0;
		}
		let R = [[Math.cos(-long-theta0-n*dt), -Math.sin(-long-theta0-n*dt), 0],[Math.sin(-long-theta0-n*dt), Math.cos(-long-theta0-n*dt), 0],[0, 0, 1]];
		initSunVector = math.multiply(R,initSunVector);
		globalChartRef.config.data.datasets[app.dataLoc.sun].data.push({
			x: 0,
			y: 0
		})
		globalChartRef.config.data.datasets[app.dataLoc.sun].data.push({
			x: initSunVector[1][0]*10,
			y: initSunVector[0][0]*10
		})
	}
	if (document.getElementById("moonCheck").checked) {
		initSunVector = moonVectorCalc(time);
		if (dt === undefined) {
			dt = 0;
		}
		let R = [[Math.cos(-long-theta0-n*dt), -Math.sin(-long-theta0-n*dt), 0],[Math.sin(-long-theta0-n*dt), Math.cos(-long-theta0-n*dt), 0],[0, 0, 1]];
		initSunVector = math.multiply(R,initSunVector);
		globalChartRef.config.data.datasets[app.dataLoc.moon].data.push({
			x: 0,
			y: 0
		})
		globalChartRef.config.data.datasets[app.dataLoc.moon].data.push({
			x: initSunVector[1][0]*10,
			y: initSunVector[0][0]*10
		})
	}
	globalChartRef.update();
}