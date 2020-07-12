function handleHover(valueX,valueY){
    if (tactic !== undefined) {
        handleTechnique(tactic,valueX,valueY,'hover');
        return;
    }
    
    if (dragPoint){
        globalChartRef.config.data.datasets[app.dataLoc.way].data[chosenWaypoint].x = valueX;
        globalChartRef.config.data.datasets[app.dataLoc.way].data[chosenWaypoint].y = valueY;
        globalChartRef.config.data.datasets[app.dataLoc.chosen].data[0].y = valueY;
        globalChartRef.config.data.datasets[app.dataLoc.chosen].data[0].x = valueX;
        plotBurnDirections(chosenWaypoint);
        calculateTrajecories();
        annotateBurnHistory();
    }
}

function handleClick(valueX,valueY){
    if (tactic !== undefined) {
        handleTechnique(tactic,valueX,valueY,'click');
        return;
    }
    if (dragPoint){
        globalChartRef.config.data.datasets[app.dataLoc.way].data[chosenWaypoint].x = valueX;
        globalChartRef.config.data.datasets[app.dataLoc.way].data[chosenWaypoint].y = valueY;
        globalChartRef.update();
        dragPoint = !dragPoint;
        return;
    }
    let oldChosen = chosenWaypoint;
    if (checkClose(valueX,valueY)){
        if (oldChosen === chosenWaypoint) {
            dragPoint = true;
        }
        globalChartRef.update();
        return;
    }
    globalChartRef.config.data.datasets[app.dataLoc.way].data.push({
        x: valueX,
        y: valueY,
        dx: valueY,
        dy: valueY,
        deltaX: 0,
        deltaY: 0,
        time: 7200
    });
    addBurnHistoryRow();
    calculateTrajecories();
    setSelectedWaypoint('last');
    globalChartRef.update();
    tooltipOpen = false;
}

function handleKeyPress(k) {
    k = k.toLowerCase();
    if (k === 'd'){
        // Delete last waypoint
        let len = globalChartRef.config.data.datasets[app.dataLoc.way].data.length;
        if (len === 1) {
            showNoteBar('Cannot delete first waypoint');
            return;
        }
        globalChartRef.config.data.datasets[app.dataLoc.way].data.pop();
        document.getElementById("burnTableBody").deleteRow(globalChartRef.config.data.datasets[app.dataLoc.way].data.length);
        tooltipOpen = false;
        if (chosenWaypoint === globalChartRef.config.data.datasets[app.dataLoc.way].data.length){
            setSelectedWaypoint('last');
        }
        calculateTrajecories();
    }
    else if (k === '-' || k === '_'){
        // Zoom out
        axisLimits += 1;
        globalChartRef.config.options.scales.xAxes[0].ticks.min = -axisLimits;
        globalChartRef.config.options.scales.xAxes[0].ticks.max = axisLimits;
        globalChartRef.config.options.scales.yAxes[0].ticks.min = -axisLimits*3/5;
        globalChartRef.config.options.scales.yAxes[0].ticks.max = axisLimits*3/5;
    }
    else if (k === '=' || k === '+'){
        //Zooom in
        axisLimits -= 1;
        globalChartRef.config.options.scales.xAxes[0].ticks.min = -axisLimits;
        globalChartRef.config.options.scales.xAxes[0].ticks.max = axisLimits;
        globalChartRef.config.options.scales.yAxes[0].ticks.min = -axisLimits*3/5;
        globalChartRef.config.options.scales.yAxes[0].ticks.max = axisLimits*3/5;
    }else if (k === 'n'){
        tactic = 'nmc';
        showNoteBar('Natural Motion Circumnavigation');
    }
    else if (k === 'k'){
        tactic = 'dsk';
        handleTechnique(tactic,0,0,'start');
    }
    else if (k === 'h'){
        globalChartRef.config.data.datasets[app.dataLoc.way].data.push({
            x: 0,
            y: 0,
            time: 0,
            dx: 0,
            dy: 0,
            deltaX: 0,
            deltaY: 0,
        })
        addBurnHistoryRow();
        tactic = 'ht';
    }
    else if (k === 'p'){
        if (!playBool){
            playBool = true;
        }
        else{
            playBool = false;
            return;
        }
            wholeTraj = playTrajectory(); playFrame = 0;
            globalChartRef.config.data.datasets[app.dataLoc.pass].data = [];
            idInterval = setInterval(() => { 
                globalChartRef.config.data.datasets[app.dataLoc.traj].data.push({
                    x: wholeTraj[playFrame][0],
                    y: wholeTraj[playFrame][1],
                });
                drawSunMoonVectors(julianDateCalc(startTime),playFrame*playDt);
                playFrame++;
                globalChartRef.update();
                if (playFrame === wholeTraj.length || !playBool){
                    clearInterval(idInterval);
                    setSelectedWaypoint('last');
                    calculateTrajecories();
                }
            }, 25);
    }
    else if (k === 'f'){
        tactic = 'flyby';
        handleTechnique(tactic,0,0,'start');
        return;
    }
    else if (k === 'b'){
        tactic = 'burn';
        showNoteBar('Manual Burn');
        handleTechnique(tactic,0,0,'start');
    }
    else if (k === 'e'){
        if (chosenWaypoint === undefined){
            showNoteBar('Must choose a waypoint to edit');
        }
        else {
            globalChartRef.config.data.datasets[app.dataLoc.way].data[chosenWaypoint].y = Number(prompt('Enter new Radial Position',globalChartRef.config.data.datasets[app.dataLoc.way].data[chosenWaypoint].y));
            globalChartRef.config.data.datasets[app.dataLoc.way].data[chosenWaypoint].x = Number(prompt('Enter new In-Track Position',globalChartRef.config.data.datasets[app.dataLoc.way].data[chosenWaypoint].x));
            calculateTrajecories();
            setSelectedWaypoint('last');
            // Look at order of this should I use setSelectedWaypoint
        }
    }
    else if (k === 'z'){
        tactic = 'sensor';
        showNoteBar('Add Zone');
        handleTechnique('sensor',undefined,undefined,'start');
    }
    else if (k === 'm'){
        tactic = 'fmc';
		showNoteBar('Forced Motion Cirumnavigation');
    }
    globalChartRef.update();
}

function setSelectedWaypoint(index){
    chosenWaypoint = index;
	if (index === 'last'){
		index = globalChartRef.config.data.datasets[app.dataLoc.way].data.length-1;
		chosenWaypoint = index;
	}
	calcPassiveTraj();
	globalChartRef.config.data.datasets[app.dataLoc.chosen].data = [];
	globalChartRef.config.data.datasets[app.dataLoc.chosen].data.push({
		x: globalChartRef.config.data.datasets[app.dataLoc.way].data[index].x,
		y: globalChartRef.config.data.datasets[app.dataLoc.way].data[index].y,
    })
    $("tr").removeClass("selectedTableRow");
    $("#burnTableBody tr:nth-child(" + (chosenWaypoint+1) + ")").addClass("selectedTableRow");
    drawSunMoonVectors(julianDateCalc(startTime),Number(maneuverListSpans[chosenWaypoint*5].innerText)*3600);
}

function checkClose(X,Y,shiftcntl) {
    let xPoint, yPoint;
    for (var ii = 0; ii < globalChartRef.config.data.datasets[app.dataLoc.way].data.length; ii++) {
        xPoint = globalChartRef.config.data.datasets[app.dataLoc.way].data[ii].x;
        yPoint = globalChartRef.config.data.datasets[app.dataLoc.way].data[ii].y;
        if (math.norm([xPoint-X,yPoint-Y]) < 2) {
            setSelectedWaypoint(ii);
            return true;
        }
    }
    return false;
}

function addBurnHistoryRow() {
	var row = document.getElementById("burnTableBody").querySelectorAll("tr")[0];
	var table = document.getElementById("burnTableBody");
	var clone = row.cloneNode(true);
	table.appendChild(clone)
	maneuverListSpans = document.getElementById("burnTable").querySelectorAll("span");
}

function annotateBurnHistory() {
	let timeTotal = 0;
	for (var ii = 0; ii < globalChartRef.config.data.datasets[app.dataLoc.way].data.length; ii++) {
		timeTotal += globalChartRef.config.data.datasets[app.dataLoc.way].data[ii].time;
		maneuverListSpans[ii*5].textContent = (timeTotal/3600).toFixed(2);
		maneuverListSpans[ii*5+1].textContent = (globalChartRef.config.data.datasets[app.dataLoc.way].data[ii].y).toFixed(2);
		maneuverListSpans[ii*5+2].textContent = (globalChartRef.config.data.datasets[app.dataLoc.way].data[ii].x).toFixed(2);
		maneuverListSpans[ii*5+3].textContent = (globalChartRef.config.data.datasets[app.dataLoc.way].data[ii].deltaY*1000).toFixed(2);
		maneuverListSpans[ii*5+4].textContent = (globalChartRef.config.data.datasets[app.dataLoc.way].data[ii].deltaX*1000).toFixed(2);
	}
}

function showNoteBar(s) {
    $(".noteBar").stop();
    $('.noteBar').hide();
    $('.noteBar p')[0].textContent = s;
    $('.noteBar').css('bottom','5%');
    $('.noteBar').css('opacity','0.5');
    $('.noteBar').show();
    $('.noteBar').animate({
        bottom: '+=50px',
        opacity: 0
    },1500);
}