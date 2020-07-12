function handleHover(valueX,valueY){
    if (app.tactic !== undefined) {
        handleTechnique(app.tactic,valueX,valueY,'hover');
        return;
    }
    
    if (app.dragPoint){
        globalChartRef.config.data.datasets[app.dataLoc.way].data[app.chosenWaypoint].x = valueX;
        globalChartRef.config.data.datasets[app.dataLoc.way].data[app.chosenWaypoint].y = valueY;
        globalChartRef.config.data.datasets[app.dataLoc.chosen].data[0].y = valueY;
        globalChartRef.config.data.datasets[app.dataLoc.chosen].data[0].x = valueX;
        plotBurnDirections(app.chosenWaypoint);
        calculateTrajecories();
        annotateBurnHistory();
    }
}

function handleClick(valueX,valueY){
    if (app.tactic !== undefined) {
        handleTechnique(app.tactic,valueX,valueY,'click');
        return;
    }
    if (app.dragPoint){
        globalChartRef.config.data.datasets[app.dataLoc.way].data[app.chosenWaypoint].x = valueX;
        globalChartRef.config.data.datasets[app.dataLoc.way].data[app.chosenWaypoint].y = valueY;
        globalChartRef.update();
        app.dragPoint = !app.dragPoint;
        return;
    }
    let oldChosen = app.chosenWaypoint;
    if (checkClose(valueX,valueY)){
        if (oldChosen === app.chosenWaypoint) {
            app.dragPoint = true;
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
        app.axisLimits += 1;
        globalChartRef.config.options.scales.xAxes[0].ticks.min = -app.axisLimits;
        globalChartRef.config.options.scales.xAxes[0].ticks.max = app.axisLimits;
        globalChartRef.config.options.scales.yAxes[0].ticks.min = -app.axisLimits*3/5;
        globalChartRef.config.options.scales.yAxes[0].ticks.max = app.axisLimits*3/5;
    }
    else if (k === '=' || k === '+'){
        //Zooom in
        app.axisLimits -= 1;
        globalChartRef.config.options.scales.xAxes[0].ticks.min = -app.axisLimits;
        globalChartRef.config.options.scales.xAxes[0].ticks.max = app.axisLimits;
        globalChartRef.config.options.scales.yAxes[0].ticks.min = -app.axisLimits*3/5;
        globalChartRef.config.options.scales.yAxes[0].ticks.max = app.axisLimits*3/5;
    }else if (k === 'n'){
        app.tactic = 'nmc';
        showNoteBar('Natural Motion Circumnavigation');
    }
    else if (k === 'k'){
        app.tactic = 'dsk';
        handleTechnique(app.tactic,0,0,'start');
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
        app.tactic = 'ht';
    }
    else if (k === 'p'){
        if (!app.playBool){
            app.playBool = true;
        }
        else{
            app.playBool = false;
            return;
        }
            let wholeTraj = playTrajectory(), playFrame = 0;
            globalChartRef.config.data.datasets[app.dataLoc.pass].data = [];
            let idInterval = setInterval(() => { 
                globalChartRef.config.data.datasets[app.dataLoc.traj].data.push({
                    x: wholeTraj[playFrame][0],
                    y: wholeTraj[playFrame][1],
                });
                drawSunMoonVectors(julianDateCalc(app.startTime),playFrame*app.playDt);
                playFrame++;
                globalChartRef.update();
                if (playFrame === wholeTraj.length || !app.playBool){
                    clearInterval(idInterval);
                    setSelectedWaypoint('last');
                    calculateTrajecories();
                }
            }, 25);
    }
    else if (k === 'f'){
        app.tactic = 'flyby';
        handleTechnique(app.tactic,0,0,'start');
        return;
    }
    else if (k === 'b'){
        app.tactic = 'burn';
        showNoteBar('Manual Burn');
        handleTechnique(app.tactic,0,0,'start');
    }
    else if (k === 'e'){
        if (app.chosenWaypoint === undefined){
            showNoteBar('Must choose a waypoint to edit');
        }
        else {
            globalChartRef.config.data.datasets[app.dataLoc.way].data[app.chosenWaypoint].y = Number(prompt('Enter new Radial Position',globalChartRef.config.data.datasets[app.dataLoc.way].data[app.chosenWaypoint].y));
            globalChartRef.config.data.datasets[app.dataLoc.way].data[app.chosenWaypoint].x = Number(prompt('Enter new In-Track Position',globalChartRef.config.data.datasets[app.dataLoc.way].data[app.chosenWaypoint].x));
            calculateTrajecories();
            setSelectedWaypoint('last');
            // Look at order of this should I use setSelectedWaypoint
        }
    }
    else if (k === 'z'){
        app.tactic = 'sensor';
        showNoteBar('Add Zone');
        handleTechnique('sensor',undefined,undefined,'start');
    }
    else if (k === 'm'){
        app.tactic = 'fmc';
		showNoteBar('Forced Motion Cirumnavigation');
    }
    globalChartRef.update();
}

function setSelectedWaypoint(index){
    app.chosenWaypoint = index;
	if (index === 'last'){
		index = globalChartRef.config.data.datasets[app.dataLoc.way].data.length-1;
		app.chosenWaypoint = index;
	}
	calcPassiveTraj();
	globalChartRef.config.data.datasets[app.dataLoc.chosen].data = [{
		x: globalChartRef.config.data.datasets[app.dataLoc.way].data[index].x,
		y: globalChartRef.config.data.datasets[app.dataLoc.way].data[index].y,
    }];
    $("tr").removeClass("selectedTableRow");
    $("#burnTableBody tr:nth-child(" + (app.chosenWaypoint+1) + ")").addClass("selectedTableRow");
    drawSunMoonVectors(julianDateCalc(app.startTime),Number(app.maneuverListSpans[app.chosenWaypoint*5].innerText)*3600);
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
	app.maneuverListSpans = document.getElementById("burnTable").querySelectorAll("span");
}

function annotateBurnHistory() {
	let timeTotal = 0;
	for (var ii = 0; ii < globalChartRef.config.data.datasets[app.dataLoc.way].data.length; ii++) {
		timeTotal += globalChartRef.config.data.datasets[app.dataLoc.way].data[ii].time;
		app.maneuverListSpans[ii*5].textContent = (timeTotal/3600).toFixed(2);
		app.maneuverListSpans[ii*5+1].textContent = (globalChartRef.config.data.datasets[app.dataLoc.way].data[ii].y).toFixed(2);
		app.maneuverListSpans[ii*5+2].textContent = (globalChartRef.config.data.datasets[app.dataLoc.way].data[ii].x).toFixed(2);
		app.maneuverListSpans[ii*5+3].textContent = (globalChartRef.config.data.datasets[app.dataLoc.way].data[ii].deltaY*1000).toFixed(2);
		app.maneuverListSpans[ii*5+4].textContent = (globalChartRef.config.data.datasets[app.dataLoc.way].data[ii].deltaX*1000).toFixed(2);
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