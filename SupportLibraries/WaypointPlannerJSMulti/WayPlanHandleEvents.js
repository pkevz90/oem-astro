function handleHover(valueX,valueY){
    if (tactic !== undefined) {
        handleTechnique(tactic,valueX,valueY,'hover');
        return;
    }
    let trajSet = (dataPoints.workingRso-1)*2;
    if (dragPoint){
        console.log(trajSet,chosenWaypoint);
        
        globalChartRef.config.data.datasets[trajSet].data[chosenWaypoint].x = valueX;
        globalChartRef.config.data.datasets[trajSet].data[chosenWaypoint].y = valueY;
        globalChartRef.config.data.datasets[dataPoints.chosenWaypoint].data[0].y = valueY;
        globalChartRef.config.data.datasets[dataPoints.chosenWaypoint].data[0].x = valueX;
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
    let trajSet = (dataPoints.workingRso-1)*2;
    if (dragPoint){
        globalChartRef.config.data.datasets[trajSet].data[chosenWaypoint].x = valueX;
        globalChartRef.config.data.datasets[trajSet].data[chosenWaypoint].y = valueY;
        globalChartRef.update();
        dragPoint = !dragPoint;
        return;
    }
    
    let oldChosen = chosenWaypoint;
    if (checkClose(valueX,valueY)){
        console.log(oldChosen, chosenWaypoint);
        
        if (oldChosen === chosenWaypoint) {
            dragPoint = true;
        }
        globalChartRef.update();
        return;
    }
    globalChartRef.config.data.datasets[trajSet].data.push({
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
        
	    let trajSet = (dataPoints.workingRso-1)*2;
        // Delete last waypoint
        let len = globalChartRef.config.data.datasets[trajSet].data.length;
        if (len === 1) {
            showNoteBar('Cannot delete first waypoint');
            return;
        }
        globalChartRef.config.data.datasets[trajSet].data.pop();
        if (dataPoints.workingRso === 1){
            document.getElementById("burnTableBody").deleteRow(globalChartRef.config.data.datasets[0].data.length);
        }
        tooltipOpen = false;
        if (chosenWaypoint === globalChartRef.config.data.datasets[trajSet].data.length){
            setSelectedWaypoint('last');
        }
        calculateTrajecories();
    }
    else if (k === '-' || k === '_'){
        // Zoom out
        axisLimits += 1;
        globalChartRef.config.options.scales.xAxes[0].ticks.min = -axisLimits;
        globalChartRef.config.options.scales.xAxes[0].ticks.max = axisLimits;
        globalChartRef.config.options.scales.yAxes[0].ticks.min = -axisLimits*3/4;
        globalChartRef.config.options.scales.yAxes[0].ticks.max = axisLimits*3/4;
    }
    else if (k === '=' || k === '+'){
        //Zooom in
        axisLimits -= 1;
        globalChartRef.config.options.scales.xAxes[0].ticks.min = -axisLimits;
        globalChartRef.config.options.scales.xAxes[0].ticks.max = axisLimits;
        globalChartRef.config.options.scales.yAxes[0].ticks.min = -axisLimits*3/4;;
        globalChartRef.config.options.scales.yAxes[0].ticks.max = axisLimits*3/4;;
    }else if (k === 'n'){
        tactic = 'nmc';
        showNoteBar('Natural Motion Circumnavigation');
    }
    else if (k === 'k'){
        tactic = 'dsk';
        handleTechnique(tactic,0,0,'start');
    }
    else if (k === 'h'){
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
        wholeTrajBlue = playTrajectory(0); 
        wholeTrajRed = playTrajectory(2);
        playFrame = 0;
        globalChartRef.config.data.datasets[dataPoints.passiveTrajectory].data = [];
        idInterval = setInterval(() => { 
            globalChartRef.config.data.datasets[1].data.push({
                x: wholeTrajBlue[playFrame][0],
                y: wholeTrajBlue[playFrame][1],
            });
            if (playFrame < wholeTrajRed.length-1){
                globalChartRef.config.data.datasets[3].data.push({
                    y: wholeTrajRed[playFrame][1],
                    x: wholeTrajRed[playFrame][0],
                });
            }
            drawSunMoonVectors(julianDateCalc(startTime),playFrame*playDt);
            playFrame++;
            globalChartRef.update();
            if (playFrame === wholeTrajBlue.length || !playBool){
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
	    let trajSet = (dataPoints.workingRso-1)*2;
        if (chosenWaypoint === undefined){
            showNoteBar('Must choose a waypoint to edit');
        }
        else {
            globalChartRef.config.data.datasets[trajSet].data[chosenWaypoint].y = Number(prompt('Enter new Radial Position',globalChartRef.config.data.datasets[0].data[chosenWaypoint].y));
            globalChartRef.config.data.datasets[trajSet].data[chosenWaypoint].x = Number(prompt('Enter new In-Track Position',globalChartRef.config.data.datasets[0].data[chosenWaypoint].x));
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
    
    let trajSet = (dataPoints.workingRso-1)*2;
    chosenWaypoint = index;
	if (index === 'last'){
		index = globalChartRef.config.data.datasets[trajSet].data.length-1;
		chosenWaypoint = index;
    }
	calcPassiveTraj();
	globalChartRef.config.data.datasets[dataPoints.chosenWaypoint].data = [];
	globalChartRef.config.data.datasets[dataPoints.chosenWaypoint].data.push({
		x: globalChartRef.config.data.datasets[trajSet].data[index].x,
		y: globalChartRef.config.data.datasets[trajSet].data[index].y,
    })
    if (dataPoints.workingRso !== 1) {
        return;
    }
    $("tr").removeClass("selectedTableRow");
    $("#burnTableBody tr:nth-child(" + (chosenWaypoint+1) + ")").addClass("selectedTableRow");
    drawSunMoonVectors(julianDateCalc(startTime),Number(maneuverListSpans[chosenWaypoint*5].innerText)*3600);
}

function checkClose(X,Y) {
    let trajSet = (dataPoints.workingRso-1)*2;
    let xPoint, yPoint;
    for (var ii = 0; ii < globalChartRef.config.data.datasets[trajSet].data.length; ii++) {
        xPoint = globalChartRef.config.data.datasets[trajSet].data[ii].x;
        yPoint = globalChartRef.config.data.datasets[trajSet].data[ii].y;
        // console.log(math.norm([xPoint-X,yPoint-Y]))
        console.log(math.norm([xPoint-X,yPoint-Y]));
        
        console.log(xPoint,X,yPoint,Y,ii);
        if (math.norm([xPoint-X,yPoint-Y]) < 2) {
            setSelectedWaypoint(ii);
            
            console.log(chosenWaypoint);
            return true;
        }
    }
    return false;
}

function addBurnHistoryRow() {
    if (dataPoints.workingRso !== 1) {
        return;
    }
	var row = document.getElementById("burnTableBody").querySelectorAll("tr")[0];
	var table = document.getElementById("burnTableBody");
	var clone = row.cloneNode(true);
	table.appendChild(clone)
	maneuverListSpans = document.getElementById("burnTable").querySelectorAll("span");
}

function annotateBurnHistory() {
	let timeTotal = 0;
	for (var ii = 0; ii < globalChartRef.config.data.datasets[0].data.length; ii++) {
		timeTotal += globalChartRef.config.data.datasets[0].data[ii].time;
		maneuverListSpans[ii*5].textContent = (timeTotal/3600).toFixed(2);
		maneuverListSpans[ii*5+1].textContent = (globalChartRef.config.data.datasets[0].data[ii].y).toFixed(2);
		maneuverListSpans[ii*5+2].textContent = (globalChartRef.config.data.datasets[0].data[ii].x).toFixed(2);
		maneuverListSpans[ii*5+3].textContent = (globalChartRef.config.data.datasets[0].data[ii].deltaY*1000).toFixed(2);
		maneuverListSpans[ii*5+4].textContent = (globalChartRef.config.data.datasets[0].data[ii].deltaX*1000).toFixed(2);
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