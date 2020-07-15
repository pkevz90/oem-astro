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
    if (app.chosenWaypoint !== undefined) {
        if (checkPointClose(valueX, valueY,
                app.players[app.chosenWaypoint[1]].dataLoc.waypoints.data[app.chosenWaypoint[0]].x,
                app.players[app.chosenWaypoint[1]].dataLoc.waypoints.data[app.chosenWaypoint[0]].y)) {
            app.tactic = 'burn';
            app.chartData.burnDir.data = [{
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
        case (',' || '<'):
            if (app.tactic === 'target' && app.tacticData.targetPos > 1) {
                let {x, y} = app.players[app.chosenWaypoint[1]].dataLoc.waypoints.data[app.chosenWaypoint[0]+app.tacticData.targetPos];
                let oldTarget = app.tacticData.targetPos + 0;
                let ii = 0;
                let timeDelta = (app.tacticData.targetPos - 1 + app.chosenWaypoint[0]) * (app.scenLength / app.numBurns) - app.currentTime;
                app.tactic = '';
                let inter = setInterval(() => {
                    showDeltaVLimit(app.chosenWaypoint[1], {
                        targetPos: oldTarget - ii / 5,
                        availDv: app.tacticData.availDv
                    })
                    app.tacticData.targetPos -= 1 / 6;
                    app.currentTime += timeDelta / 6;
                    $('.slider')[0].value = app.currentTime;
                    $('.slider').prev().find('span')[0].textContent = hrsToTime(app.currentTime);
                    targetCalc(x,y);
                    if (ii === 5) {
                        app.tactic = 'target';
                        app.tacticData.targetPos = Math.round(app.tacticData.targetPos);
                        clearInterval(inter);
                    }
                    ii++;
                }, 10);
            }
            break;
        case ('.' || '>'):
            if (app.tactic === 'target' && (app.tacticData.targetPos + 1 + app.chosenWaypoint[0]) < app.players[app.chosenWaypoint[1]].dataLoc.waypoints.data.length) {
                let {x, y} = app.players[app.chosenWaypoint[1]].dataLoc.waypoints.data[app.chosenWaypoint[0]+app.tacticData.targetPos];
                let oldTarget = app.tacticData.targetPos + 0;
                let ii = 0;
                let timeDelta = (app.tacticData.targetPos + 1 + app.chosenWaypoint[0]) * (app.scenLength / app.numBurns) - app.currentTime;
                app.tactic = '';
                let inter = setInterval(() => {
                    showDeltaVLimit(app.chosenWaypoint[1], {
                        targetPos: oldTarget + ii / 5,
                        availDv: app.tacticData.availDv
                    })
                    app.tacticData.targetPos += 1 / 6;
                    app.currentTime += timeDelta / 6;
                    $('.slider')[0].value = app.currentTime;
                    $('.slider').prev().find('span')[0].textContent = hrsToTime(app.currentTime);
                    targetCalc(x,y);
                    // calcData(app.currentTime);
                    // globalChartRef.update();
                    if (ii === 5) {
                        app.tactic = 'target';
                        app.tacticData.targetPos = Math.round(app.tacticData.targetPos);
                        clearInterval(inter);
                    }
                    ii++;
                }, 10);
            }

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

            let sat = app.chosenWaypoint[1];
            app.players[sat].burns[app.chosenWaypoint[0]][0] = newR;
            app.players[sat].burns[app.chosenWaypoint[0]][1] = newI;
            app.spans.manRows[sat][(app.chosenWaypoint[0]) * 2].textContent = (newR).toFixed(3);
            app.spans.manRows[sat][(app.chosenWaypoint[0]) * 2 + 1].textContent = (newI).toFixed(3);
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
        case 'b':
            app.tactic = 'burn';
            $('.info-right')[0].textContent = 'Set burn magnitude and direction by hovering mouse'
            app.chartData.burnDir.data = [{
                x: 0,
                y: 0
            }, {
                x: 0,
                y: 0
            }];
            globalChartRef.update();
            return;
        case 't':
            if (app.chosenWaypoint === undefined) {
                return;
            }
            app.tactic = 'target';
            
            $('.info-right')[0].textContent = 'Target burn by hovering over desired location. Change target waypoint with [<] & [>]'
            let totalDv = 0;
            app.players[app.chosenWaypoint[1]].burns.forEach((burn, element) => {
                if (element < app.chosenWaypoint[0]) {
                    totalDv += math.norm(burn);
                } else if (element > app.chosenWaypoint[0]) {
                    app.players[app.chosenWaypoint[1]].burns[element] = [0, 0];
                }
            })
            app.tacticData = {
                availDv: app.deltaVAvail - totalDv,
                targetPos: 1
            };
            let ii = 0;
            let timeDelta = (app.tacticData.targetPos + app.chosenWaypoint[0]) * (app.scenLength / app.numBurns) - app.currentTime;
            let inter = setInterval(() => {
                showDeltaVLimit(app.chosenWaypoint[1], {
                    targetPos: app.tacticData.targetPos,
                    availDv: app.tacticData.availDv * ii / 5
                });
                app.currentTime += timeDelta / 6;
                $('.slider')[0].value = app.currentTime;
                $('.slider').prev().find('span')[0].textContent = hrsToTime(app.currentTime);
                calcData(app.currentTime);
                if (ii === 5) {
                    app.tactic = 'target';
                    clearInterval(inter);
                }
                ii++;
            }, 15);


            app.chartData.burnDir.data = [{
                x: 0,
                y: 0
            }, {
                x: 0,
                y: 0
            }];
            app.players[app.chosenWaypoint[1]].calculateTrajecory();
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

    $('tr').removeClass('selected');
    $($('tr')[index + ((side === 'blue') ? 1 : 7)]).toggleClass('selected')

    app.chosenWaypoint = [index, side];
    $('.info-right')[0].textContent = 'Press [B] to manual burn, [T] to target burn'
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

function checkClose(X, Y) {
    let xPoint, yPoint;
    let turn = Number($turn.textContent) - 1;

    for (sat in app.players) {
        if (app.players[sat].name.substr(0, 4) === 'gray') {
            continue;
        }
        for (var ii = turn; ii < app.players[sat].dataLoc.waypoints.data.length; ii++) {
            xPoint = app.players[sat].dataLoc.waypoints.data[ii].x;
            yPoint = app.players[sat].dataLoc.waypoints.data[ii].y;
            if (math.norm([xPoint - X, yPoint - Y]) < 2) {
                setSelectedWaypoint(ii, sat);
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