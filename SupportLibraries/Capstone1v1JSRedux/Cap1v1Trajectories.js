function calculateTrajecories(index){
	let numWaypoints = globalChartRef.config.data.datasets[index].data.length;
	let r1, r2, r, v1,t;
	var dt = 1000;
	globalChartRef.config.data.datasets[index+1].data = [];
	let vxOld = 0, vyOld = 0; 
	for (var ii = 0; ii < (numWaypoints-1); ii++){
		t = globalChartRef.config.data.datasets[index].data[ii+1].time;
		r1 = [[globalChartRef.config.data.datasets[index].data[ii].y],[globalChartRef.config.data.datasets[index].data[ii].x]];
		r2 = [[globalChartRef.config.data.datasets[index].data[ii+1].y],[globalChartRef.config.data.datasets[index].data[ii+1].x]];
		
		// console.log(r1,r2)
		v1 = math.multiply(math.inv(PhiRV(t)),math.subtract(r2,math.multiply(PhiRR(t),r1)));
		v2 = math.add(math.multiply(PhiVR(t),r1),math.multiply(PhiVV(t),v1));
		// console.log(v2);
		globalChartRef.config.data.datasets[index].data[ii].deltaX = v1[1][0]-vxOld; 
		globalChartRef.config.data.datasets[index].data[ii].deltaY = v1[0][0]-vyOld;
		// console.log(v1[1][0],v1[0][0])
		// console.log(globalChartRef.config.data.datasets[0].data[ii+1].deltaX,globalChartRef.config.data.datasets[0].data[ii+1].deltaY)
		globalChartRef.config.data.datasets[index].data[ii+1].dy = vyOld; 
		vxOld = v2[1][0]; vyOld = v2[0][0];
		globalChartRef.config.data.datasets[index].data[ii+1].dx = vxOld; 
		globalChartRef.config.data.datasets[index].data[ii+1].dy = vyOld; 
		for (var kk = 0; kk < t; kk += dt){
			r = math.add(math.multiply(PhiRR(kk),r1),math.multiply(PhiRV(kk),v1));
			globalChartRef.config.data.datasets[index+1].data.push({
				x: r[1],
				y: r[0]
			});
		}
		globalChartRef.config.data.datasets[index+1].data.push({
			x: r2[1],
			y: r2[0]
		});
	}
	globalChartRef.update();
}
function calcTrajectoryHistory() {
	// Blue Trajectory
	posHistory.blue = [];
	let numWaypoints = globalChartRef.config.data.datasets[0].data.length;
	let r1, r2, r, v1, t;
	for (var ii = 0; ii < (numWaypoints-1); ii++){
		t = globalChartRef.config.data.datasets[0].data[ii+1].time;
		r1 = [[globalChartRef.config.data.datasets[0].data[ii].y],[globalChartRef.config.data.datasets[0].data[ii].x]];
		r2 = [[globalChartRef.config.data.datasets[0].data[ii+1].y],[globalChartRef.config.data.datasets[0].data[ii+1].x]];

		v1 = math.multiply(math.inv(PhiRV(t)),math.subtract(r2,math.multiply(PhiRR(t),r1)));
		for (var kk = 0; kk < t; kk += calcDt){
			r = math.add(math.multiply(PhiRR(kk),r1),math.multiply(PhiRV(kk),v1));
			posHistory.blue.push([r[0],r[1]]);
		}
	}
	// Red Trajectory
	posHistory.red = [];
	numWaypoints = globalChartRef.config.data.datasets[3].data.length;
	for (var ii = 0; ii < (numWaypoints-1); ii++){
		t = globalChartRef.config.data.datasets[3].data[ii+1].time;
		r1 = [[globalChartRef.config.data.datasets[3].data[ii].y],[globalChartRef.config.data.datasets[3].data[ii].x]];
		r2 = [[globalChartRef.config.data.datasets[3].data[ii+1].y],[globalChartRef.config.data.datasets[3].data[ii+1].x]];

		v1 = math.multiply(math.inv(PhiRV(t)),math.subtract(r2,math.multiply(PhiRR(t),r1)));
		for (var kk = 0; kk < t; kk += calcDt){
			r = math.add(math.multiply(PhiRR(kk),r1),math.multiply(PhiRV(kk),v1));
			posHistory.red.push([r[0],r[1]]);
		}
	}
	// Gray1 Trajectory
	if (graySat[0] && (graySat[2] === undefined) ) {
		t = 15*3600;
		graySat[2] = [];
		r1 = [[graySat[0][0][0]],[graySat[0][1][0]]];
		v1 = [[graySat[0][2][0]],[graySat[0][3][0]]];
		
		for (var kk = 0; kk < t; kk += calcDt){
			r = math.add(math.multiply(PhiRR(kk),r1),math.multiply(PhiRV(kk),v1));
			graySat[2].push([r[0],r[1]]);
			globalChartRef.config.data.datasets[14].data.push({
				x: r[1],
				y: r[0]
			});
		}
	}
	calcData();
}
function calcData(curTime = 0) {
	let redR = posHistory.red[Math.floor(curTime*3600/calcDt)];
	let blueR = posHistory.blue[Math.floor(curTime*3600/calcDt)];
	let gray1R, gray2R;
	if (graySat[2] !== undefined) {
		gray1R = graySat[2][Math.floor(curTime*3600/calcDt)];
	}
	if (graySat[3] !== undefined) {
		gray2R = graySat[3][Math.floor(curTime*3600/calcDt)];
	}
	
	setCurrentPoints(9,blueR,10,redR,13,gray1R);
	let curSun = drawSunVectors(curTime*3600,[redR[0][0],redR[1][0]]);
	curSun = [curSun[0][0],curSun[1][0]];
	let relVector = [blueR[0]-redR[0],blueR[1]-redR[1]];
	let catsAngle = Math.acos(math.dot(curSun,relVector)/math.norm(relVector)/math.norm(curSun));

	// Update Data
	dataRows.curRange[0].textContent = math.norm([redR[0][0]-blueR[0][0],redR[1][0]-blueR[1][0]]).toFixed(2);
	dataRows.cats[0].textContent  = (catsAngle*180/Math.PI).toFixed(2);

	if (catsAngle > Math.PI/2 && math.norm(relVector) >= 10 && math.norm(relVector) <= 15) {
		drawViewpoint([redR[0][0],redR[1][0]],Math.atan2(relVector[0],relVector[1]),math.norm(relVector),11,'red');
	}
	else if (catsAngle < Math.PI/2 && math.norm(relVector) >= 10 && math.norm(relVector) <= 15) {
		drawViewpoint([blueR[0][0],blueR[1][0]],Math.atan2(-relVector[0],-relVector[1]),math.norm(relVector),11,'blue');	
	}
	else {
		globalChartRef.config.data.datasets[11].data = [];
		globalChartRef.update();
	}
	let t1 = 1000,t2 = 0, range1, range2, t0 = 0, tf = posHistory.red.length*calcDt; 
	let ii = 0;
	while (Math.abs(t1-t2) > calcDt*2) {
		t1 = (tf-t0)/3+t0;
		t2 = (tf-t0)*2/3+t0;
		redR = posHistory.red[Math.floor(t1/calcDt)];
		blueR = posHistory.blue[Math.floor(t1/calcDt)];
		range1 = math.norm([redR[0][0]-blueR[0][0],redR[1][0]-blueR[1][0]]);
		redR = posHistory.red[Math.floor(t2/calcDt)];
		blueR = posHistory.blue[Math.floor(t2/calcDt)];
		range2 = math.norm([redR[0][0]-blueR[0][0],redR[1][0]-blueR[1][0]]);
		if (range2 > range1) {
			tf = t2;
		}
		else {
			t0 = t1;
		}
	}
	dataRows.minRange[0].textContent = math.norm([redR[0][0]-blueR[0][0],redR[1][0]-blueR[1][0]]).toFixed(2);
	dataRows.minRange[1].textContent = (t2/3600).toFixed(1);
	globalChartRef.update();
}
function burns2waypoints(initialState, burnList, waypointIndex, dtBurns) {
	let state = initialState.slice(); //4x1 State Vector, burn list 5x2
	globalChartRef.config.data.datasets[waypointIndex].data = [];
	globalChartRef.config.data.datasets[waypointIndex].data.push({
		x: state[1][0],
		y: state[0][0]
	})
	let r1,v1,r2,v2;
	for (let kk = 0; kk < burnList.length; kk++) {
		v1 = [[state[2][0]],[state[3][0]]];
		v1[0][0] += burnList[kk][0] / 1000;
		v1[1][0] += burnList[kk][1] / 1000;
		r1 = [[state[0][0]],[state[1][0]]];
		r2 = math.add(math.multiply(PhiRR(dtBurns),r1),math.multiply(PhiRV(dtBurns),v1));
		v2 = math.add(math.multiply(PhiVR(dtBurns),r1),math.multiply(PhiVV(dtBurns),v1));
		state = [[r2[0][0]],[r2[1][0]],[v2[0][0]],[v2[1][0]]];
		globalChartRef.config.data.datasets[waypointIndex].data.push({
			x: state[1][0],
			y: state[0][0],
			time: dtBurns
		})
		
	}
	calculateTrajecories(waypointIndex);
}
function plotBurnDirections(){
	let numWaypoints = globalChartRef.config.data.datasets[0].data.length;
	globalChartRef.config.data.datasets[7].data = [];
	for (var ii = 0; ii < (numWaypoints-1); ii++){
		globalChartRef.config.data.datasets[7].data.push({
			x: globalChartRef.config.data.datasets[0].data[ii].x,
			y: globalChartRef.config.data.datasets[0].data[ii].y,
		})
		globalChartRef.config.data.datasets[7].data.push({
			x: globalChartRef.config.data.datasets[0].data[ii].x+globalChartRef.config.data.datasets[0].data[ii].deltaX*4000,
			y: globalChartRef.config.data.datasets[0].data[ii].y+globalChartRef.config.data.datasets[0].data[ii].deltaY*4000,
		})
		globalChartRef.config.data.datasets[7].data.push({
			x: NaN,
			y: NaN
		})
	}
} 
function burnCalc(xMouse, yMouse, click) {
	if (click) {
		tactic = '';
		globalChartRef.config.data.datasets[6].data = [];
		return;
	}
	else {
		let xPoint = globalChartRef.config.data.datasets[chosenWaypoint[1]].data[chosenWaypoint[0]].x,
		yPoint = globalChartRef.config.data.datasets[chosenWaypoint[1]].data[chosenWaypoint[0]].y,
		distance = math.norm([xPoint-xMouse,yPoint-yMouse]),
		az = Math.atan2(-yPoint+yMouse,-xPoint+xMouse);
		if (distance > 10) {distance = 10};
		if (chosenWaypoint[1] === 0) {
			blueBurns[chosenWaypoint[0]] = [distance/20*Math.sin(az), distance/20*Math.cos(az)];
			burns2waypoints(blueInitState,blueBurns,0,10800);
			burnRows.blue[(chosenWaypoint[0])*2].textContent = (distance/20*Math.sin(az)).toFixed(2);
			burnRows.blue[(chosenWaypoint[0])*2+1].textContent = (distance/20*Math.cos(az)).toFixed(2);
		}
		else {
			redBurns[chosenWaypoint[0]] = [distance/20*Math.sin(az), distance/20*Math.cos(az)];
			burns2waypoints(redInitState,redBurns,3,10800);
			burnRows.red[(chosenWaypoint[0])*2].textContent = (distance/20*Math.sin(az)).toFixed(2);
			burnRows.red[(chosenWaypoint[0])*2+1].textContent = (distance/20*Math.cos(az)).toFixed(2);
		}
		globalChartRef.config.data.datasets[6].data[0].x = xPoint;
		globalChartRef.config.data.datasets[6].data[0].y = yPoint;
		globalChartRef.config.data.datasets[6].data[1].x = xPoint+distance*Math.cos(az);
		globalChartRef.config.data.datasets[6].data[1].y = yPoint+distance*Math.sin(az);
		calcTrajectoryHistory()
	}
}
function findTrajectory(r1,r2,t,dt) {
	let trajHistory = [];
	v1 = math.multiply(math.inv(PhiRV(t)),math.subtract(r2,math.multiply(PhiRR(t),r1)));
	trajhistory.push({
		x: r1[0],
		y: r1[1]
	});
	for (var kk = dt; kk < t; kk += dt){
		r = math.add(math.multiply(PhiRR(kk),r1),math.multiply(PhiRV(kk),v1));
		trajhistory.push({
			x: r[0],
			y: r[1]
		});
	}
	trajhistory.push({
		x: r2[0],
		y: r2[1]
	});
}