function handleHover(valueX,valueY){
    if (tactic === 'burn') {
        burnCalc(valueX,valueY);
    }
}

function handleClick(valueX,valueY,shiftcntl){
    // console.log(valueX,valueY)
    if (tactic === 'burn') {
        chosenWaypoint = undefined;
	    globalChartRef.config.data.datasets[8].data = [];
        burnCalc(valueX,valueY,true);
        return;
    }
    if (chosenWaypoint !== undefined) {
        if(checkPointClose(valueX,valueY,
            globalChartRef.config.data.datasets[chosenWaypoint[1]].data[chosenWaypoint[0]].x,
            globalChartRef.config.data.datasets[chosenWaypoint[1]].data[chosenWaypoint[0]].y)){
                tactic = 'burn';
                globalChartRef.config.data.datasets[6].data.push({x: 0, y: 0});
                globalChartRef.config.data.datasets[6].data.push({x: 0, y: 0});
                // console.log('b')
                globalChartRef.update();
                return;

        }

    }
    if (checkClose(valueX,valueY)){
        globalChartRef.update();
        return;
    }
}

function handleKeyPress(k) {
    k = k.toLowerCase();
    switch (k) {
        case '=':
            axisLimits -= 1;
            break;
        case '-':
            if (axisLimits < 5) {return;}
            axisLimits += 1;
            break;
        case 'a':
            axisCenter[0] += 1;
            break;
        case 'd':
            axisCenter[0] -= 1;
            break;
        case 'w':
            axisCenter[1] += 1;
            break;
        case 's':
            axisCenter[1] -= 1;
            break;
        case 'e':
            if (chosenWaypoint === undefined) {
                return;
            }
            let newR = Number(window.prompt('Enter new radial burn [m/s]: '));
            let newI = Number(window.prompt('Enter new radial burn [m/s]: '));
            // console.log(newR,newI,math.norm([newR, newI]),maxDv)
            let nNew = math.norm([newR, newI]);
            if (nNew > maxDv) {
                newR = newR*maxDv/nNew;
                newI = newI*maxDv/nNew;
                window.alert('Burn scaled to max delta-V')
            }
            if (chosenWaypoint[1] === 0) {
                blueBurns[chosenWaypoint[0]][0] = newR;
                blueBurns[chosenWaypoint[0]][1] = newI;
                burns2waypoints(blueInitState, blueBurns, 0, 10800)
                burnRows[(chosenWaypoint[0])*5+2].textContent = newI.toFixed(2);
                burnRows[(chosenWaypoint[0])*5+1].textContent = newR.toFixed(2);
            }
            else {
                redBurns[chosenWaypoint[0]][0] = newR;
                redBurns[chosenWaypoint[0]][1] = newI;
                burns2waypoints(redInitState, redBurns, 3, 10800)
                burnRows[(chosenWaypoint[0])*5+3].textContent = newR.toFixed(2);
                burnRows[(chosenWaypoint[0])*5+4].textContent = newI.toFixed(2);
            }
	        calcTrajectoryHistory();
            globalChartRef.update();
            break;
        case 'p':
            out = JSON.stringify(Object.assign({},blueBurns));
            xhttp.open("POST", "http://192.168.1.12:8080/team1", true);
            xhttp.send(out);
            
            break;
    }
    setAxisZoomPos();
}

function setAxisZoomPos() {
    globalChartRef.config.options.scales.xAxes[0].ticks.min = axisCenter[0]-axisLimits;
    globalChartRef.config.options.scales.xAxes[0].ticks.max = axisCenter[0]+axisLimits;
    globalChartRef.config.options.scales.yAxes[0].ticks.min = axisCenter[1]-axisLimits*0.5;
    globalChartRef.config.options.scales.yAxes[0].ticks.max = axisCenter[1]+axisLimits*0.5;
    globalChartRef.update()
}

function setSelectedWaypoint(index, side){ 
    let sideIndex = 0;
    if (side === 'red') {
        sideIndex = 3;
    }
    if (sideIndex === 0) {
        // blueRows[index+1].classList.add("selected");
    }
    else {
        // redRows[index+1].classList.add("selected");
    }
    chosenWaypoint = [index,sideIndex];
	globalChartRef.config.data.datasets[8].data = [];
	globalChartRef.config.data.datasets[8].data.push({
		x: globalChartRef.config.data.datasets[sideIndex].data[index].x,
		y: globalChartRef.config.data.datasets[sideIndex].data[index].y,
	})
}

function checkClose(X,Y) {
    let xPoint, yPoint;
    // let turn = Number(document.getElementById('turn').querySelector("span").textContent)-1;
    let turn = Number($('#turn-button p span')[0].textContent)-1;
    
    for (var ii = turn; ii < globalChartRef.config.data.datasets[0].data.length-1; ii++) {
        xPoint = globalChartRef.config.data.datasets[0].data[ii].x;
        yPoint = globalChartRef.config.data.datasets[0].data[ii].y;
        // console.log(math.norm([xPoint-X,yPoint-Y]))
        if (math.norm([xPoint-X,yPoint-Y]) < 2) {
            setSelectedWaypoint(ii,'blue');
            return true;
        }
    }
    for (var ii = turn; ii < globalChartRef.config.data.datasets[3].data.length-1; ii++) {
        xPoint = globalChartRef.config.data.datasets[3].data[ii].x;
        yPoint = globalChartRef.config.data.datasets[3].data[ii].y;
        // console.log(math.norm([xPoint-X,yPoint-Y]))
        if (math.norm([xPoint-X,yPoint-Y]) < 2) {
            setSelectedWaypoint(ii,'red');
            return true;
        }
    }
    return false;
}

function checkPointClose(X1,Y1,X2,Y2) {
    if (math.norm([X1-X2,Y1-Y2]) < 2) {
        return true;
    }
}