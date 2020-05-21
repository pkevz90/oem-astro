// Functions to build techniques
function handleTechnique(tactic,X,Y,event,wheelDir) {
	switch(tactic) {
		case 'nmc':
			nmcBuilder(X,Y,event);
			break;
		case 'flyby':
			flyBy(X,event);
			break;
		case 'fmc':
			fmcBuilder(X,Y,event,wheelDir);
			break;
		case 'dsk':
			dskBuilder(Y,event)
			break;
		case 'ht':
			break;
		case 'burn':
			burnCalc(X,Y,event,wheelDir);
			break;
		case 'sensor':
			buildSensor(X,Y,event)
			break;

	}
}
function nmcBuilder(X,Y,event){
	if (tacticArray.length === 0){
		if (event === 'click'){
			let len = globalChartRef.config.data.datasets[0].data.length-1;
			let B0 = Math.atan2(globalChartRef.config.data.datasets[0].data[len].x-X,-globalChartRef.config.data.datasets[0].data[len].y*2);
			let ae = (globalChartRef.config.data.datasets[0].data[len].x-X)/Math.sin(B0);
			
			tacticArray.push(X); tacticArray.push(B0); tacticArray.push(ae);
			// console.log(globalChartRef.config.data.datasets[0].data[len].x,X,ae,B0);
			globalChartRef.config.data.datasets[3].data = [];
			globalChartRef.config.options.title.text = '';
			globalChartRef.config.data.datasets[0].data.push({
				x: 0,
				y: 0,
				time: 0,
				dx: 0,
				dy: 0,
				deltaX: 0,
				deltaY: 0,
			})
			addBurnHistoryRow();
			globalChartRef.update();
			return;
		}
		globalChartRef.config.data.datasets[3].data = [];
		globalChartRef.config.data.datasets[3].data.push({
			x: X,
			y: -axisLimits*3/4
		});
		globalChartRef.config.data.datasets[3].data.push({
			x: X,
			y: axisLimits*3/4
		});
		globalChartRef.config.options.title.text = 'NMC In-Track Midpoint: ' + X.toFixed(2) + ' km';
		globalChartRef.update();
	}
	else if (tacticArray.length === 3){
		if (event === 'click'){
			tacticArray = [];
			tactic = undefined;
			return;
		}
		let len = globalChartRef.config.data.datasets[0].data.length-1;
		let B = Math.atan2(X-tacticArray[0],-Y*2);
		if (B*tacticArray[1] < 0) {
			if (B < 0){
				B += 2*Math.PI;
			}
		}
		else {
			if (tacticArray[1] > B) {
				B += 2*Math.PI;
			}
		}
		
		globalChartRef.config.data.datasets[0].data[len].x = tacticArray[2]*Math.sin(B)+tacticArray[0];
		globalChartRef.config.data.datasets[0].data[len].y = -tacticArray[2]/2*Math.cos(B);
		globalChartRef.config.data.datasets[0].data[len].time = (B-tacticArray[1])/(2*Math.PI/86164);
		console.log(globalChartRef.config.data.datasets[0].data[len].time)
		calculateTrajecories();
	}
}
function flyBy(X,event){
	if (event === 'start') {
		let len = globalChartRef.config.data.datasets[0].data.length;
		if (globalChartRef.config.data.datasets[0].data[len-1].y === 0) {
			tactic = undefined;
			showNoteBar('No drift occurs while perched on V-Bar');
			return;
		}
		showNoteBar('Fly-By: Choose End Point');
		globalChartRef.config.data.datasets[0].data.push({
            x: 0,
            y: 0,
            time: 0,
            dx: 0,
            dy: 0,
            deltaX: 0,
            deltaY: 0,
        })
        addBurnHistoryRow();
        setSelectedWaypoint('last');
        globalChartRef.update();
	}
	else if (event === 'click'){
        tactic = undefined;
        tacticArray = [];
        tooltipOpen = false;
        globalChartRef.config.data.datasets[3].data = [];
        globalChartRef.update();
	}
	else {
		let len = globalChartRef.config.data.datasets[0].data.length-1;
		if (globalChartRef.config.data.datasets[0].data[len-1].y*(X-globalChartRef.config.data.datasets[0].data[len-1].x) > 0){
			// Fly-By must occur in proper direction
			showNoteBar('Drift must occur in proper direction');
			return;
		}
		let t = Math.abs((X-globalChartRef.config.data.datasets[0].data[len-1].x)/(1.5*globalChartRef.config.data.datasets[0].data[len-1].y*2*Math.PI/86164));
		if (t === 0){
			// time of 0 seconds will return a singularity in the HCW equations
			return;
		}
		if (X === undefined){
			X = 0;
		}
		globalChartRef.config.data.datasets[3].data = [];
		globalChartRef.config.data.datasets[3].data.push({
			x: X,
			y: -axisLimits*3/4
		});
		globalChartRef.config.data.datasets[3].data.push({
			x: X,
			y: axisLimits*3/4
		});
		globalChartRef.config.data.datasets[0].data[len].x = X;
		globalChartRef.config.data.datasets[0].data[len].y = globalChartRef.config.data.datasets[0].data[len-1].y;
		globalChartRef.config.data.datasets[0].data[len].time = t;
		globalChartRef.config.data.datasets[2].data = [];
		globalChartRef.config.data.datasets[2].data.push({
			x: globalChartRef.config.data.datasets[0].data[len].x,
			y: globalChartRef.config.data.datasets[0].data[len].y,
		})
		calculateTrajecories();
		drawSunMoonVectors(julianDateCalc(startTime),Number(maneuverListSpans[chosenWaypoint*5].innerText)*3600);
	}
}
function burnCalc(X,Y,event,wheelDir){
	if (event === 'start') {
		tacticArray.push(7200);
        tacticArray.push(0);
        tacticArray.push(0);
        globalChartRef.config.data.datasets[0].data.push({
            x: 0,
            y: 0,
            time: 7200,
            dx: 0,
            dy: 0,
            deltaX: 0,
            deltaY: 0,
        })
        addBurnHistoryRow();
		globalChartRef.update();
		return;
	}
	else if (event === 'click') {
		tactic = undefined;
        tacticArray = [];
        tooltipOpen = false;
        globalChartRef.config.data.datasets[3].data = [];
        globalChartRef.config.options.title.text = '';
		globalChartRef.update();
		return;
	}
	else if (event === 'wheel') {
		if (wheelDir > 0){
			if (tacticArray[0] > 3600){
				tacticArray[0] -= 3600;
			}
		}
		else{
			tacticArray[0] += 3600;
		}
	}
	let len = globalChartRef.config.data.datasets[0].data.length-1;
	let t = tacticArray[0];
	
	if (X === undefined || Y === undefined) {
		X = tacticArray[1];
		Y = tacticArray[2];
	}
	else {
		tacticArray[1] = X;
		tacticArray[2] = Y;
	}
	let pos = [[globalChartRef.config.data.datasets[0].data[len-1].y],[globalChartRef.config.data.datasets[0].data[len-1].x]];
	let vel = [[globalChartRef.config.data.datasets[0].data[len-1].dy],[globalChartRef.config.data.datasets[0].data[len-1].dx]];
	let az = Math.atan2(Y-pos[0],X-pos[1]);
	let dV = 0.00005*math.norm([Y-pos[0],X-pos[1]]);
	globalChartRef.config.options.title.text = 'Delta-V: ' + (dV*1000).toFixed(2) + ' m/s -- Drift Time: ' + (t/3600).toFixed(2) + 'hrs';
	dV = [[dV*Math.sin(az)],[dV*Math.cos(az)]];
	vel = math.add(vel,dV);
	let r = math.add(math.multiply(PhiRR(t),pos),math.multiply(PhiRV(t),vel));
	globalChartRef.config.data.datasets[0].data[len].x = r[1][0];
	globalChartRef.config.data.datasets[0].data[len].y = r[0][0];
	globalChartRef.config.data.datasets[0].data[len].time = t;
	globalChartRef.config.data.datasets[3].data = [];
	globalChartRef.config.data.datasets[3].data.push({
		x: pos[1][0],
		y: pos[0][0],
	})
	globalChartRef.config.data.datasets[3].data.push({
		x: X,
		y: Y,
	})
	calculateTrajecories();
	
	
}
function fmcBuilder(X,Y,eventType,wheelDir){
	if (eventType === 'wheel'){
		// Adds or takes away waypoints in FMC
		let len = globalChartRef.config.data.datasets[0].data.length-1;
		X = globalChartRef.config.data.datasets[0].data[len].x;
		Y = globalChartRef.config.data.datasets[0].data[len].y;
		if (wheelDir < 0){
			tacticArray[1]++;
			globalChartRef.config.data.datasets[0].data.push({
				x: 0,
				y: 0,
				dx: 0,
				dy: 0,
				deltaX: 0,
				deltaY: 0,
				time: 7200
			})
			addBurnHistoryRow();
		}
		else {
			if (tacticArray[1] < 3){
				return;
			}
			tacticArray[1]--;
			globalChartRef.config.data.datasets[0].data.pop();
			document.getElementById("burnTableBody").deleteRow(globalChartRef.config.data.datasets[0].data.length+1);
		}
		globalChartRef.update();
	}
	else if (eventType === 'click') {
		if (tacticArray.length === 0){
			// Finds length of current vector of waypoints
			let len = globalChartRef.config.data.datasets[0].data.length-1;
			// Finds azimuth of last waypoint taking into account middle of FMC
			let az = Math.atan2(globalChartRef.config.data.datasets[0].data[len].y,globalChartRef.config.data.datasets[0].data[len].x-X);
			// Finds initial distance from middle of FMC to find radius of desired FMC
			let r = math.norm([globalChartRef.config.data.datasets[0].data[len].y, globalChartRef.config.data.datasets[0].data[len].x-X]);
			// Pushes values to tacticArray 
			// 		1-Initial Azimuth
			//		2-Number of waypoints--defaults to 4
			//		3-In-track center of FMC
			//		4-Radius of FMC
			tacticArray.push(az); tacticArray.push(4); tacticArray.push(X); tacticArray.push(r);
			for (var ii = 0; ii < 4; ii++){
				globalChartRef.config.data.datasets[0].data.push({
					x: 0,
					y: 0,
					dx: 0,
					dy: 0,
					deltaX: 0,
					deltaY: 0,
					time: 7200
				})
				addBurnHistoryRow();
			}
			
			globalChartRef.update();
		}
		else {
			tactic = undefined;
			tacticArray = [];
			globalChartRef.config.data.datasets[3].data = [];
			globalChartRef.update();
		}
	}
	// Runs on wheel command as well to make visuals smoother
	if (eventType === 'hover' || eventType === 'wheel'){
		if (tacticArray.length === 0){
			// No data given, user selecting in-track center
			globalChartRef.config.data.datasets[3].data = [];
			globalChartRef.config.data.datasets[3].data.push({
				x: X,
				y: -axisLimits*3/4
			});
			globalChartRef.config.data.datasets[3].data.push({
				x: X,
				y: axisLimits*3/4
			});
			globalChartRef.update();
		}
		else {
			// User selecting ending azimuth of FMC, filling in points in-between
			let len = globalChartRef.config.data.datasets[0].data.length-1;
			let azCur, xCur, yCur, az = Math.atan2(Y,X-tacticArray[2]);
			// Accounts for ambiguity in radians
			if (az*tacticArray[0] < 0) {
				if (az < 0){
					az += 2*Math.PI;
				}
			}
			else {
				if (tacticArray[0] > az) {
					az += 2*Math.PI;
				}
			}
			// Time between FMC waypoints
			dt = (az-tacticArray[0])/(2*Math.PI/86164)/tacticArray[1];
			for (var ii = 0; ii < tacticArray[1]; ii++){
				azCur = tacticArray[0]+(az-tacticArray[0])*(ii+1)/tacticArray[1];
				xCur = tacticArray[3]*Math.cos(azCur)+tacticArray[2];
				yCur = tacticArray[3]*Math.sin(azCur);
				globalChartRef.config.data.datasets[0].data[len-(tacticArray[1]-1)+ii].x = xCur;
				globalChartRef.config.data.datasets[0].data[len-(tacticArray[1]-1)+ii].y = yCur;
				globalChartRef.config.data.datasets[0].data[len-(tacticArray[1]-1)+ii].time = dt;
			}
			calculateTrajecories();
		}
	}
}
function buildSensor(X,Y,event){
	if (event === 'start'){
		if (numSensors > 0){
            globalChartRef.config.data.datasets.push({
                data: [],
                fill: true,
                showLine: true,
                pointRadius: 0,
                lineTension: 0,
                backgroundColor: 'rgba(255,150,150,0.5)'
            });
        }
	}
	else if (event === 'click'){
		if (tacticArray.length === 0){
			tacticArray.push(Math.atan2(Y,X));
			if (tacticArray[0] < 0) {
				tacticArray[0] += 2*Math.PI;
			}
			tacticArray.push(math.norm([Y,X]));
		}
		else{
			globalChartRef.config.data.datasets[3].data = [];
			numSensors++;
			tactic = undefined;
			tacticArray = [];
		}
	}
	else{
		if (tacticArray.length === 0){
			globalChartRef.config.data.datasets[3].data = [];
			globalChartRef.config.data.datasets[3].data.push({
				x: 0,
				y: 0,
			})
			globalChartRef.config.data.datasets[3].data.push({
				x: X,
				y: Y,
			})
		}
		else{
			let az = Math.atan2(Y,X);
			if (az < 0) {
				az += 2*Math.PI;
			}
			let azDel = (tacticArray[0]-az);
			if (azDel > Math.PI) {
				azDel = -Math.PI + (azDel-Math.PI);
			}
			else if (azDel < -Math.PI) {
				azDel = Math.PI + (azDel+Math.PI);
			}
			console.log(az*180/3.1416,azDel*180/3.1416)
			globalChartRef.config.data.datasets[8+numSensors].data = [];
			globalChartRef.config.data.datasets[8+numSensors].data.push({
				x: 0,
				y: 0,
			})
			let numW = Math.floor(Math.abs(azDel)/0.1), azT;
			
			for (var ii = 0; ii <= numW*2; ii++){
				azT = az+ii*azDel/numW;
				
				// console.log(tacticArray[1]*Math.cos(azT),tacticArray[1]*Math.sin(azT));
				globalChartRef.config.data.datasets[8+numSensors].data.push({
					x: tacticArray[1]*Math.cos(azT),
					y: tacticArray[1]*Math.sin(azT),
				})
			} 
			globalChartRef.config.data.datasets[8+numSensors].data.push({
				x: 0,
				y: 0,
			})
		}
	}
	globalChartRef.update();
}
function dskBuilder(Yvalue,event){
	if (event === 'start'){
		let len = globalChartRef.config.data.datasets[0].data.length-1;
		if (globalChartRef.config.data.datasets[0].data[len].y === 0) {
			tactic = undefined;
			showNoteBar('DSK not possible perched on V-Bar');
			return;
		}
		showNoteBar('Dynamic Station Keeping');
        globalChartRef.config.data.datasets[0].data.push({
            x: globalChartRef.config.data.datasets[0].data[len].x,
            y: globalChartRef.config.data.datasets[0].data[len].y,
            time: 0,
            dx: 0,
            dy: 0,
            deltaX: 0,
            deltaY: 0,
        })
        addBurnHistoryRow();
        setSelectedWaypoint('last');
	}
    else if (event === 'click'){
        tacticArray = [];
        tactic = undefined;
        globalChartRef.config.data.datasets[3].data = [];
        globalChartRef.update();
        return;
    }
    else {
        let len = globalChartRef.config.data.datasets[0].data.length-1;
		let X = globalChartRef.config.data.datasets[0].data[len].x;
        let Y = globalChartRef.config.data.datasets[0].data[len].y;
        if (Math.abs(Yvalue) > Math.abs(Y)) {
            if (Yvalue*Y > 0) {
                Yvalue = Y;
				showNoteBar('Must be towards V-Bar');
            }
            else {
				Yvalue = -Y;
				showNoteBar('Results in NMC');
            }
        }
        globalChartRef.config.data.datasets[3].data = [];
        globalChartRef.config.data.datasets[3].data.push({
            x: -axisLimits,
            y: Yvalue
        });
        globalChartRef.config.data.datasets[3].data.push({
            x: axisLimits,
            y: Yvalue
        });
        let desHeight = Math.abs(Y-Yvalue);
        let t1 = 7200, t2 = 7300, v1, r1, h2, v2, r2, dh; 
        let del = 100; pos = [[Y],[X]];
        while (Math.abs(del) > 1e-3) {
            v1 = math.multiply(math.inv(PhiRV(t1)),math.subtract(pos,math.multiply(PhiRR(t1),pos)));
            r1 = math.add(math.multiply(PhiRR(t1/2),pos),math.multiply(PhiRV(t1/2),v1));
            h1 = Math.abs(r1[0][0]-pos[0][0]);
            // console.log(h1)
            v2 = math.multiply(math.inv(PhiRV(t2)),math.subtract(pos,math.multiply(PhiRR(t2),pos)));
            r2 = math.add(math.multiply(PhiRR(t2/2),pos),math.multiply(PhiRV(t2/2),v2));
            h2 = Math.abs(r2[0][0]-pos[0][0]);
            // console.log(h2)
            dh = (h2-h1)/100;
            del = (h1-desHeight)/dh;
            t1 -= del;
            t2 = t1 + 100;
            // console.log(t1,t2)
        }
	    globalChartRef.config.data.datasets[0].data[len].time = t1;
		calculateTrajecories();
		drawSunMoonVectors(julianDateCalc(startTime),Number(maneuverListSpans[chosenWaypoint*5].innerText)*3600);

    }
}
function htBuilder(Xvalue,Yvalue,click){
    if (click){
        tacticArray = [];
        tactic = '';
        globalChartRef.config.data.datasets[3].data = [];
        globalChartRef.update();
        return;
    }
    else {
        let len = globalChartRef.config.data.datasets[0].data.length-1;
		X = globalChartRef.config.data.datasets[0].data[len-1].x;
        Y = globalChartRef.config.data.datasets[0].data[len-1].y;
        let xd = (Y+Yvalue)/2;
        globalChartRef.config.data.datasets[0].data[len].x = X-1.5*xd*Math.PI;
	    globalChartRef.config.data.datasets[0].data[len].y = Yvalue;
        globalChartRef.config.data.datasets[0].data[len].time = 43082;
        globalChartRef.config.data.datasets[3].data = [];
        globalChartRef.config.data.datasets[3].data.push({
            x: -axisLimits,
            y: Yvalue
        });
        globalChartRef.config.data.datasets[3].data.push({
            x: axisLimits,
            y: Yvalue
        });
        calculateTrajecories();
    }
}