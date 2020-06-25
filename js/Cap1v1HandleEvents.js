function handleHover(valueX, valueY) {
    if (app.tactic === 'burn') {
        burnCalc(valueX, valueY);
    } else if (app.tactic === 'target') {
        targetCalc(valueX, valueY);
    }
}

function handleClick(valueX, valueY) {
    lastClick = [valueX, valueY];
    // If actively changing a maneuver, switch off
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
    // If waypoint is already chosen, see if clicked again, if so, initiate changing the burn
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
    // Else, check if clicked anywhere near any points
    if (checkClose(valueX, valueY)) {
        globalChartRef.update();
        return;
    }
    // Otherwise, if clicked near the trajectory, add a burn location
    let check = checkClose(lastClick[0], lastClick[1], "traj");
    if (check === false) {
        return;
    }
    let time = (1 + check[0]) * app.calcDt;
    // If user chose location in the past, will put burn 1 hour in the future

    if (app.players[check[1]].burns.length === 0) {
        index = 'start';
    } else {
        index = 'end';
        for (let ii = 0; ii < app.players[check[1]].burns.length; ii++) {
            
            if (time < app.players[check[1]].burns[ii].time) {
                if (ii === 0) {
                    index = 'start';
                } else {
                    index = ii;
                }
                break;
            }
        }
    }
    addBurn(check[1], time, index);
}

function handleKeyPress(k) {
    k = k.toLowerCase();
    console.log(k);

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
        case 'arrowleft':
            app.axisCenter[0] += 1;
            break;
        case 'arrowright':
            app.axisCenter[0] -= 1;
            break;
        case 'arrowup':
            app.axisCenter[1] += 1;
            break;
        case 'arrowdown':
            app.axisCenter[1] -= 1;
            break;
        case 'd':
            if (app.chosenWaypoint === undefined) {
                return;
            }
            let trList = $('#' + ((app.chosenWaypoint[1] === app.players.blue.dataLoc.way) ? 'blue' : 'red') + 'BurnTable tr');
            if (trList.length === 0) {
                return;
            }
            $(trList[app.chosenWaypoint[0]]).remove();
            app.chosenWaypoint = undefined;
            globalChartRef.config.data.datasets[app.dataLoc.selectedWay].data = [];
            globalChartRef.config.data.datasets[app.dataLoc.burnDir].data = [];
            retrieveBurns();
            break;
        case '1':
            // Zero out relative eccentricity
            if (app.tactic === '') {return;}
            let sat = (app.chosenWaypoint[1] === app.players.blue.dataLoc.way) ? 'blue' : 'red';
            let v = [
                [globalChartRef.config.data.datasets[app.chosenWaypoint[1]].data[app.chosenWaypoint[0]].dRad],
                [globalChartRef.config.data.datasets[app.chosenWaypoint[1]].data[app.chosenWaypoint[0]].dIt]
            ];
            let r = [
                [globalChartRef.config.data.datasets[app.chosenWaypoint[1]].data[app.chosenWaypoint[0]].y],
                [globalChartRef.config.data.datasets[app.chosenWaypoint[1]].data[app.chosenWaypoint[0]].x]
            ];
            // xd needs to be zero
            let n = 2*Math.PI/86164;
            let dItDes = -3/2*r[0][0]*n;
            $('#' + sat + 'BurnTable td')[app.chosenWaypoint[0] * 3 + 1].textContent = (-v[0][0]*1000).toFixed(2);
		    $('#' + sat + 'BurnTable td')[app.chosenWaypoint[0] * 3 + 2].textContent = (dItDes*1000-v[1][0]*1000).toFixed(2);
            app.chosenWaypoint = undefined;
            globalChartRef.config.data.datasets[app.dataLoc.selectedWay].data = [];
            burnCalc(0, 0, true);
            retrieveBurns();
            break;
        case '2':
            // Zero out relative eccentricity
            if (app.tactic === '') {return;}
            let sat2 = (app.chosenWaypoint[1] === app.players.blue.dataLoc.way) ? 'blue' : 'red';
            let v2 = [
                [globalChartRef.config.data.datasets[app.chosenWaypoint[1]].data[app.chosenWaypoint[0]].dRad],
                [globalChartRef.config.data.datasets[app.chosenWaypoint[1]].data[app.chosenWaypoint[0]].dIt]
            ];
            let r2 = [
                [globalChartRef.config.data.datasets[app.chosenWaypoint[1]].data[app.chosenWaypoint[0]].y],
                [globalChartRef.config.data.datasets[app.chosenWaypoint[1]].data[app.chosenWaypoint[0]].x]
            ];
            // xd needs to be zero
            let n2 = 2*Math.PI/86164;
            let dItDes2 = -4*r2[0][0]*n2/2;
            $('#' + sat2 + 'BurnTable td')[app.chosenWaypoint[0] * 3 + 1].textContent = (0).toFixed(2);
		    $('#' + sat2 + 'BurnTable td')[app.chosenWaypoint[0] * 3 + 2].textContent = (dItDes2*1000-v2[1][0]*1000).toFixed(2);
            app.chosenWaypoint = undefined;
            globalChartRef.config.data.datasets[app.dataLoc.selectedWay].data = [];
            burnCalc(0, 0, true);
            retrieveBurns();
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

function checkClose(X, Y, loc = "way") {
    let xPoint, yPoint;

    for (sat in app.players) {
        for (var ii = 0; ii < globalChartRef.config.data.datasets[app.players[sat].dataLoc[loc]].data.length; ii++) {
            xPoint = globalChartRef.config.data.datasets[app.players[sat].dataLoc[loc]].data[ii].x;
            yPoint = globalChartRef.config.data.datasets[app.players[sat].dataLoc[loc]].data[ii].y;
            if (math.norm([xPoint - X, yPoint - Y]) < 0.5) {
                if (loc === 'way') {
                    if (sat === 'blue') {
                        if (!app.players.blue.burns[ii].selectable) {
                            return true;
                        }
                    }
                    setSelectedWaypoint(ii, sat);
                    return true;
                } else {
                    return [ii, sat];
                }
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

function advanceSimTime() {
    app.currentTime += 0.000555 * 2;
    $('#time')[0].textContent = curTimeToHHMMSS(app.currentTime);
    checkBurns(app.currentTime);
    calcData(app.currentTime);
}

function checkBurns(time) {
    // Check and see if burn is in past, if so, make not selectable
    app.players.blue.burns.forEach((burn, index) => {
        if ((burn.time / 3600 < time) && burn.selectable) {
            burn.selectable = false;
            $($('#blueBurnTable').find('.time-button')[index]).hide();
        }
    });
}