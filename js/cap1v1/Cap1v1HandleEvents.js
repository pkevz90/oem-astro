function handleHover(valueX, valueY) {
    if (app.tactic === 'burn') {
        burnCalc(valueX, valueY);
    } else if (app.tactic === 'target') {
        targetCalc(valueX, valueY);
    }
}

function handleClick(valueX, valueY) {
    if (app.tactic === 'burn') {
        burnCalc(valueX, valueY, true);
        return;
    } else if (app.tactic === 'target') {
        targetCalc(valueX, valueY, true);
        return;
    }
}

function handleKeyPress(k) {
    k = k.toLowerCase();
    switch (k) {
        case 'e':
            if (app.chosenWaypoint === undefined) {
                return;
            }
            let newR = Number(window.prompt('Enter new radial burn [m/s]: '));
            let newI = Number(window.prompt('Enter new in-track burn [m/s]: '));

            let sat = app.chosenWaypoint[1];
            app.players[sat].burns.splice(app.chosenWaypoint[0], 1, [newR, newI]);
            let xPoint = app.players[app.chosenWaypoint[1]].dataLoc.waypoints.data[app.chosenWaypoint[0]].x,
                yPoint = app.players[app.chosenWaypoint[1]].dataLoc.waypoints.data[app.chosenWaypoint[0]].y;
            app.chartData.burnDir.data = [{
                x: xPoint,
                y: yPoint
            }, {
                x: xPoint + newI * 10,
                y: yPoint + newR * 10
            }];
            app.players[sat].calculateTrajecory();
            calcData();
            globalChartRef.update();
            break;
    }
    setAxisZoomPos();
}

function setAxisZoomPos() {
    globalChartRef.config.options.scales.xAxes[0].ticks.min = app.axisCenter[0] - app.axisLimits;
    globalChartRef.config.options.scales.xAxes[0].ticks.max = app.axisCenter[0] + app.axisLimits;
    globalChartRef.config.options.scales.yAxes[0].ticks.min = app.axisCenter[1] - app.axisLimits * 0.5;
    globalChartRef.config.options.scales.yAxes[0].ticks.max = app.axisCenter[1] + app.axisLimits * 0.5;
    globalChartRef.update()
}

function setSelectedWaypoint(index, side) {
    $('tr').removeClass('selected');
    $($('.burnRows')[index + ((side === 'blue') ? 0 : Number(setupData.scenario_start.bp))]).toggleClass('selected')
    app.chosenWaypoint = [index, side];
    // $('.info-right')[0].textContent = 'Press [B] to manual burn, [T] to target burn'
    let xPoint = app.players[side].dataLoc.waypoints.data[index].x,
        yPoint = app.players[side].dataLoc.waypoints.data[index].y;
    app.chartData.selected.data = [{
        x: xPoint,
        y: yPoint
    }];
    app.chartData.burnDir.data = [{
        x: xPoint,
        y: yPoint
    }, {
        x: xPoint + app.players[side].burns[index][1] * 10,
        y: yPoint + app.players[side].burns[index][0] * 10
    }];
    globalChartRef.update();
}

function checkClose(X, Y, change = true) {
    let xPoint, yPoint;
    let turn = Number($turn.text()) - 1;

    for (sat in app.players) {
        for (var ii = turn; ii < app.players[sat].dataLoc.waypoints.data.length; ii++) {
            xPoint = app.players[sat].dataLoc.waypoints.data[ii].x;
            yPoint = app.players[sat].dataLoc.waypoints.data[ii].y;
            if (math.norm([xPoint - X, yPoint - Y]) < app.axisLimits / 25) {
                if (change) {
                    setSelectedWaypoint(ii, sat);
                    globalChartRef.update();
                }
                return true;
            }
        }
    }
    return false;
}

function checkPointClose(X1, Y1, X2, Y2) {
    return (math.norm([X1 - X2, Y1 - Y2]) < 2) ? true : false;
}

function setBottomInfo(type = 'state') {
    switch (type) {
        case 'state':
            let curPoints = setCurrentPoints(app.currentTime, true);
            $('.info')[0].textContent = 'Blue R: ' + (curPoints.blueR[0][0]).toFixed(2) + ' km  I: ' + (curPoints.blueR[1][0]).toFixed(2) + 'km -- Red R: ' + (curPoints.redR[0][0]).toFixed(2) + ' km  I: ' + (curPoints.redR[1][0]).toFixed(2)
            break;
        case 'selected':
            $('.info')[0].textContent = '[T] - Target burn, [click] - set burn direction & magnitude'
            break;
        case 'target':
            break;
        default:
            $('.info')[0].textContent = type;
    }

}

function startTarget() {
    app.tactic = '';
    $('.info-right').text('Target burn by hovering over desired location. Change target waypoint with mouse wheel');
    let totalDv = 0;
    app.players[app.chosenWaypoint[1]].burns.forEach((burn, element) => {
        if (element < app.chosenWaypoint[0]) {
            totalDv += math.norm(burn);
        } else if (element > app.chosenWaypoint[0]) {
            app.players[app.chosenWaypoint[1]].burns[element] = [0, 0];
        }
    })
    app.tacticData = {
        availDv: setupData[app.chosenWaypoint[1]].dVavail - totalDv,
        targetPos: 1
    };
    let ii = 0;
    let timeDelta = (app.tacticData.targetPos + app.chosenWaypoint[0]) * (app.scenLength / app.numBurns) - app.currentTime;
    let inter = setInterval(() => {
        showDeltaVLimit(app.chosenWaypoint[1], {
            targetPos: app.tacticData.targetPos,
            availDv: app.tacticData.availDv * ii / 12
        });
        app.currentTime += timeDelta / 13;
        $('.nav-element input').val(app.currentTime);
        $('.nav-element input').parent().prev().find('p').find('span').text(hrsToTime(app.currentTime));
        if (ii === 12) {
            app.tactic = 'target';
            calcData(app.currentTime);
            clearInterval(inter);
        }
        ii++;
    }, 10);

}

function changeTargetTime(direction) {
    if (!((app.tacticData.targetPos > 1 && direction < 0) || (direction > 0 && (app.tacticData.targetPos + 2 + app.chosenWaypoint[0]) < app.players[app.chosenWaypoint[1]].dataLoc.waypoints.data.length))) {
        return;
    }
    let {
        x,
        y
    } = app.players[app.chosenWaypoint[1]].dataLoc.waypoints.data[app.chosenWaypoint[0] + app.tacticData.targetPos];
    let oldTarget = app.tacticData.targetPos + 0;
    let ii = 0;
    let timeDelta = (app.tacticData.targetPos + direction + app.chosenWaypoint[0]) * (app.scenLength / app.numBurns) - app.currentTime;
    app.tactic = '';
    let inter = setInterval(() => {
        showDeltaVLimit(app.chosenWaypoint[1], {
            targetPos: oldTarget + direction * ii / 5,
            availDv: app.tacticData.availDv
        })
        app.tacticData.targetPos += direction * 1 / 6;
        app.currentTime += timeDelta / 6;
        $('.nav-element input').val(app.currentTime);
        $('.nav-element input').parent().prev().find('p').find('span').text(hrsToTime(app.currentTime));
        targetCalc(x, y);
        if (ii === 5) {
            app.tactic = 'target';
            app.tacticData.targetPos = Math.round(app.tacticData.targetPos);
            clearInterval(inter);
        }
        ii++;
    }, 10);
}