function handleHover(valueX, valueY) {
    if (app.tactic === 'burn') {
        burnCalc(valueX, valueY);
    } else if (app.tactic === 'target') {
        targetCalc(valueX, valueY);
    }
}

function handleClick(valueX, valueY) {
    if (app.tactic === 'burn') {
        app.chosenWaypoint = undefined;
        globalChartRef.config.data.datasets[app.dataLoc.selectedWay].data = [];
        burnCalc(valueX, valueY, true);
        return;
    } else if (app.tactic === 'target') {
        app.chosenWaypoint = undefined;
        globalChartRef.config.data.datasets[app.dataLoc.selectedWay].data = [];
        targetCalc(valueX, valueY, true);
        return;
    }
    if (app.chosenWaypoint !== undefined) {
        if (checkPointClose(valueX, valueY,
                globalChartRef.config.data.datasets[app.chosenWaypoint[1]].data[app.chosenWaypoint[0]].x,
                globalChartRef.config.data.datasets[app.chosenWaypoint[1]].data[app.chosenWaypoint[0]].y)) {
            app.tactic = 'burn';
            globalChartRef.config.data.datasets[app.dataLoc.burnDir].data = [{
                x: 0,
                y: 0
            }, {
                x: 0,
                y: 0
            }];
            globalChartRef.update();
            return;
        }

    }
    if (checkClose(valueX, valueY)) {
        globalChartRef.update();
        return;
    }
}

function handleKeyPress(k) {
    k = k.toLowerCase();
    switch (k) {
        case '=':
            app.axisLimits -= 1;
            break;
        case '-':
            if (app.axisLimits < 5) {
                return;
            }
            app.axisLimits += 1;
            break;
        case 'a':
            app.axisCenter[0] += 1;
            break;
        case 'd':
            app.axisCenter[0] -= 1;
            break;
        case 'w':
            app.axisCenter[1] += 1;
            break;
        case 's':
            app.axisCenter[1] -= 1;
            break;
        case 'e':
            if (app.chosenWaypoint === undefined) {
                return;
            }
            let newR = Number(window.prompt('Enter new radial burn [m/s]: '));
            let newI = Number(window.prompt('Enter new radial burn [m/s]: '));

            let sat = (app.chosenWaypoint[1] === app.dataLoc.blueWay) ? 'blue' : 'red';
            app.burns[sat][app.chosenWaypoint[0]][0] = newR;
            app.burns[sat][app.chosenWaypoint[0]][1] = newI;
            app.spans.manRows[sat][(app.chosenWaypoint[0]) * 2].textContent = (newR).toFixed(2);
            app.spans.manRows[sat][(app.chosenWaypoint[0]) * 2 + 1].textContent = (newI).toFixed(2);
            burns2waypoints(app.initStates[sat], app.burns[sat], app.dataLoc[sat + 'Way'], app.timeBetween);
            globalChartRef.update();
            break;
        case 't':
            if (app.chosenWaypoint === undefined) {
                return;
            }
            app.tactic = 'target';
            let totalDv = 0;
            app.players[(app.chosenWaypoint[1] === app.players.blue.dataLoc.way) ? 'blue' : 'red'].burns.forEach((burn, element) => {
                if (element < app.chosenWaypoint[0]) {
                    totalDv += math.norm(burn);
                } else if (element > app.chosenWaypoint[0]) {
                    app.players[(app.chosenWaypoint[1] === app.players.blue.dataLoc.way) ? 'blue' : 'red'].burns[element] = [0, 0];
                }
            })
            app.tacticData = [10800, app.deltaVAvail - totalDv];
            globalChartRef.config.data.datasets[app.dataLoc.burnDir].data = [{
                x: 0,
                y: 0
            }, {
                x: 0,
                y: 0
            }];
            app.players[(app.chosenWaypoint[1] === app.players.blue.dataLoc.way) ? 'blue' : 'red'].calculateTrajecory();
            calcData(app.currentTime);
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
    let sideIndex = app.players[side].dataLoc.way;

    if (sideIndex === 0) {
        $('tr').removeClass('selected');
        $($('tr')[index + 1]).toggleClass('selected')
    } else {
        $('tr').removeClass('selected');
        $($('tr')[index + 7]).toggleClass('selected')
    }
    app.chosenWaypoint = [index, sideIndex];
    let xPoint = globalChartRef.config.data.datasets[sideIndex].data[index].x,
        yPoint = globalChartRef.config.data.datasets[sideIndex].data[index].y;
    globalChartRef.config.data.datasets[app.dataLoc.selectedWay].data = [{
        x: xPoint,
        y: yPoint
    }];
    globalChartRef.config.data.datasets[app.dataLoc.burnDir].data = [{
        x: xPoint,
        y: yPoint
    }, {
        x: xPoint + app.players[side].burns[index][1] * 10,
        y: yPoint + app.players[side].burns[index][0] * 10
    }];
    globalChartRef.update();
}

function checkClose(X, Y) {
    let xPoint, yPoint;
    let turn = Number($turn.textContent) - 1;

    for (sat in app.players) {
        for (var ii = turn; ii < globalChartRef.config.data.datasets[app.players[sat].dataLoc.way].data.length; ii++) {
            xPoint = globalChartRef.config.data.datasets[app.players[sat].dataLoc.way].data[ii].x;
            yPoint = globalChartRef.config.data.datasets[app.players[sat].dataLoc.way].data[ii].y;
            if (math.norm([xPoint - X, yPoint - Y]) < 2) {
                setSelectedWaypoint(ii, sat);
                return true;
            }
        }
    }
    return false;
}

function checkPointClose(X1, Y1, X2, Y2) {
    if (math.norm([X1 - X2, Y1 - Y2]) < 2) {
        return true;
    }
}