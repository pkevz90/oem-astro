function handleHover(valueX, valueY) {
    if (app.tactic !== undefined) {
        handleTechnique(app.tactic, valueX, valueY, 'hover');
        return;
    }

    if (app.dragPoint) {
        Object.assign(app.chartData.waypoints.data[app.chosenWaypoint], {
            x: valueX,
            y: valueY
        });
        Object.assign(app.chartData.chosen.data[0], {
            x: valueX,
            y: valueY
        });
        plotBurnDirections(app.chosenWaypoint);
        calculateTrajecories();
        annotateBurnHistory();
    }
}

function handleClick(valueX, valueY) {
    if (app.tactic !== undefined) {
        handleTechnique(app.tactic, valueX, valueY, 'click');
        return;
    }
    if (app.dragPoint) {
        Object.assign(app.chartData.waypoints.data[app.chosenWaypoint], {
            x: valueX,
            y: valueY
        });
        globalChartRef.update();
        app.dragPoint = !app.dragPoint;
        return;
    }
    let oldChosen = app.chosenWaypoint;
    if (checkClose(valueX, valueY)) {
        if (oldChosen === app.chosenWaypoint) {
            app.dragPoint = true;
        }
        globalChartRef.update();
        return;
    }
    app.chartData.waypoints.data.push({
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
    if (k === 'd') {
        // Delete last waypoint
        let len = app.chartData.waypoints.data.length;
        if (len === 1) {
            showNoteBar('Cannot delete first waypoint');
            return;
        }
        app.chartData.waypoints.data.pop();
        document.getElementById("burnTableBody").deleteRow(app.chartData.waypoints.data.length);
        tooltipOpen = false;
        if (chosenWaypoint === app.chartData.waypoints.data.length) {
            setSelectedWaypoint('last');
        }
        calculateTrajecories();
    } else if (k === '-' || k === '_' || k === '+' || k === '=') {
        // Zoom
        app.axisLimits = (k === '-' || k === '_') ? app.axisLimits + 1 : app.axisLimits - 1;
        Object.assign(globalChartRef.config.options.scales.xAxes[0].ticks, {
            min: -app.axisLimits,
            max: app.axisLimits
        });
        Object.assign(globalChartRef.config.options.scales.yAxes[0].ticks, {
            min: -app.axisLimits * 3 / 5,
            max: app.axisLimits * 3 / 5
        });
    } else if (k === 'n') {
        app.tactic = 'nmc';
        showNoteBar('Natural Motion Circumnavigation');
    } else if (k === 'k') {
        app.tactic = 'dsk';
        handleTechnique(app.tactic, 0, 0, 'start');
    } else if (k === 'h') {
        app.chartData.waypoints.data.push({
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
    } else if (k === 'p') {
        if (!app.playBool) {
            app.playBool = true;
        } else {
            app.playBool = false;
            return;
        }
        let wholeTraj = playTrajectory(),
            playFrame = 0;
        app.chartData.passive.data = [];
        let idInterval = setInterval(() => {
            app.chartData.trajectory.data.push({
                x: wholeTraj[playFrame][0],
                y: wholeTraj[playFrame][1],
            });
            drawSunMoonVectors(julianDateCalc(app.startTime), playFrame * app.playDt);
            playFrame++;
            globalChartRef.update();
            if (playFrame === wholeTraj.length || !app.playBool) {
                clearInterval(idInterval);
                setSelectedWaypoint('last');
                calculateTrajecories();
            }
        }, 25);
    } else if (k === 'f') {
        app.tactic = 'flyby';
        handleTechnique(app.tactic, 0, 0, 'start');
        return;
    } else if (k === 'b') {
        app.tactic = 'burn';
        showNoteBar('Manual Burn');
        handleTechnique(app.tactic, 0, 0, 'start');
    } else if (k === 'e') {
        if (app.chosenWaypoint === undefined) {
            showNoteBar('Must choose a waypoint to edit');
        } else {
            Object.assign(app.chartData.waypoints.data[app.chosenWaypoint], {
                y: Number(prompt('Enter new Radial Position', app.chartData.waypoints.data[app.chosenWaypoint].y)),
                x: Number(prompt('Enter new Radial Position', app.chartData.waypoints.data[app.chosenWaypoint].x)),
            })
            calculateTrajecories();
            setSelectedWaypoint('last');
        }
    } else if (k === 'z') {
        app.tactic = 'sensor';
        showNoteBar('Add Zone');
        handleTechnique('sensor', undefined, undefined, 'start');
    } else if (k === 'm') {
        app.tactic = 'fmc';
        showNoteBar('Forced Motion Cirumnavigation');
    }
    globalChartRef.update();
}

function setSelectedWaypoint(index) {
    app.chosenWaypoint = index;
    if (index === 'last') {
        index = app.chartData.waypoints.data.length - 1;
        app.chosenWaypoint = index;
    }
    calcPassiveTraj();
    app.chartData.chosen.data = [{
        x: app.chartData.waypoints.data[index].x,
        y: app.chartData.waypoints.data[index].y,
    }];
    $("tr").removeClass("selectedTableRow");
    $("#burnTableBody tr:nth-child(" + (app.chosenWaypoint + 1) + ")").addClass("selectedTableRow");
    drawSunMoonVectors(julianDateCalc(app.startTime), Number(app.maneuverListSpans[app.chosenWaypoint * 5].innerText) * 3600);
}

function checkClose(X, Y) {
    for (var ii = 0; ii < app.chartData.waypoints.data.length; ii++) {
        if (math.norm([app.chartData.waypoints.data[ii].x - X, app.chartData.waypoints.data[ii].y - Y]) < 2) {
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
    for (var ii = 0; ii < app.chartData.waypoints.data.length; ii++) {
        timeTotal += app.chartData.waypoints.data[ii].time;
        app.maneuverListSpans[ii * 5].textContent = (timeTotal / 3600).toFixed(2);
        app.maneuverListSpans[ii * 5 + 1].textContent = (app.chartData.waypoints.data[ii].y).toFixed(2);
        app.maneuverListSpans[ii * 5 + 2].textContent = (app.chartData.waypoints.data[ii].x).toFixed(2);
        app.maneuverListSpans[ii * 5 + 3].textContent = (app.chartData.waypoints.data[ii].deltaY * 1000).toFixed(2);
        app.maneuverListSpans[ii * 5 + 4].textContent = (app.chartData.waypoints.data[ii].deltaX * 1000).toFixed(2);
    }
}

function showNoteBar(s) {
    $(".noteBar").stop();
    $('.noteBar').hide();
    $('.noteBar p')[0].textContent = s;
    $('.noteBar').css('bottom', '5%');
    $('.noteBar').css('opacity', '0.5');
    $('.noteBar').show();
    $('.noteBar').animate({
        bottom: '+=50px',
        opacity: 0
    }, 1500);
}