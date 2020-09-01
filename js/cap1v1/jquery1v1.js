var teamNum, $turn = $('.selectable:first span'), down = false;
createGraph();
document.getElementById('ChartCnvs').addEventListener('touchstart',event=>{
    console.log(event);
    let X = app.axisCenter[0] + app.axisLimits - 2*(event.touches[0].clientX-globalChartRef.chartArea.left)*app.axisLimits / (globalChartRef.chartArea.right-globalChartRef.chartArea.left);
    let Y = app.axisCenter[1] + 0.5*app.axisLimits - (event.touches[0].clientY-globalChartRef.chartArea.top)*app.axisLimits / (globalChartRef.chartArea.bottom-globalChartRef.chartArea.top);
    console.log(X,Y);
})

$('canvas').on('mousewheel',event => {
    // console.log(app.tactic);
    if (app.tactic === 'target') {
        changeTargetTime(event.deltaY)
        return;
    }
    else if (app.chosenWaypoint !== undefined) {
        return;
    }
    drawSunVectors(app.currentTime * 3600);
    if (app.axisLimits > 5 || event.deltaY < 0) {
        app.axisLimits -= event.deltaY*5;
        setAxisZoomPos();
    }
})
$('canvas').mousedown(event => {
    let X = app.axisCenter[0] + app.axisLimits - 2*(event.offsetX-globalChartRef.chartArea.left)*app.axisLimits / (globalChartRef.chartArea.right-globalChartRef.chartArea.left);
    let Y = app.axisCenter[1] + 0.5*app.axisLimits - (event.offsetY-globalChartRef.chartArea.top)*app.axisLimits / (globalChartRef.chartArea.bottom-globalChartRef.chartArea.top);
    down = true;
    if (app.tactic === '') {
        if (checkClose(X, Y)) {
            if (!down) {
                return;
            }
            app.tactic = 'burn';
            app.players[app.chosenWaypoint[1]].burns.splice(app.chosenWaypoint[0],1, [0, 0]);
            app.players[app.chosenWaypoint[1]].calculateTrajecory();
            calcData(app.currentTime);
            globalChartRef.update();
            setTimeout(() => {
                if (checkClose(app.mouseCoor.x, app.mouseCoor.y, false) && app.chosenWaypoint !== undefined) {
                    startTarget();
                    $('canvas').css('cursor','crosshair');
                }
            },250)
            return;
        }
    }
    
    app.appDrag = [[event.offsetX,event.offsetY],
                   [...app.axisCenter]];
    $('canvas').css('cursor','grabbing')
})
$('canvas').mousemove(event => {
    app.mouseCoor.x = app.axisCenter[0] + app.axisLimits - 2*(event.offsetX-globalChartRef.chartArea.left)*app.axisLimits / (globalChartRef.chartArea.right-globalChartRef.chartArea.left);
    app.mouseCoor.y = app.axisCenter[1] + 0.5*app.axisLimits - (event.offsetY-globalChartRef.chartArea.top)*app.axisLimits / (globalChartRef.chartArea.bottom-globalChartRef.chartArea.top); 
    switch(app.tactic) {
        case 'burn':
            burnCalc(app.mouseCoor.x,app.mouseCoor.y);
            return;
        case 'target':
            targetCalc(app.mouseCoor.x,app.mouseCoor.y);
            return;
        default:
            break;
    }
    if (!app.appDrag) {
        return;
    }
    app.axisCenter[0] = app.appDrag[1][0] + 2*(event.offsetX-app.appDrag[0][0])*app.axisLimits / (globalChartRef.chartArea.right-globalChartRef.chartArea.left);
    app.axisCenter[1] = app.appDrag[1][1] + 2*(event.offsetY-app.appDrag[0][1])*0.5*app.axisLimits / (globalChartRef.chartArea.bottom-globalChartRef.chartArea.top); 
    drawSunVectors(app.currentTime * 3600);
    setAxisZoomPos();
})
$('canvas').mouseup(() => {
    down = false;
    setTimeout(() => {
        if (down) {
            console.log('saved');
            return;
        }
        switch(app.tactic) {
            case 'burn':
                burnCalc(0,0,true);
                break;
            case 'target':
                targetCalc(0, 0, true);
                let turn = Number($turn.text());
                let timeDelta = (turn - 1) * (app.scenLength / app.numBurns) - app.currentTime;
                let ii = 0;
                let inter = setInterval(() => {
                    app.currentTime += timeDelta / 11;
                    app.currentTime = app.currentTime < 0 ? 0 : app.currentTime;
                    $('.nav-element input')[0].value = app.currentTime;
                    $('.nav-element input').parent().prev().find('p').find('span').text(hrsToTime(app.currentTime));
                    calcData(app.currentTime);
                    if (ii === 10) {
                        clearInterval(inter);
                    }
                    ii++;
                }, 15);
                break;
            default:
                break;
        }
        app.appDrag = undefined;
        $('canvas').css('cursor','grab')
    },50)
    
})
$('.nav-element-right:first').on('click', () => {
    $('.instruction-screen').slideToggle(250);
})
$('.selectable:first').on('click', () => {
    let turn = Number($turn.text());
    if (turn > app.redTurn && setupData.server) {
        return;
    }
    turn++;
    // setSelectedWaypoint(turn - 1, setupData.team);
    $('.selectable:first span').text(turn)
    for (player in app.players) {
        app.players[player].calculateTrajecory();
    }
    calcData(app.currentTime);
    if (setupData.server) {
        let outBurns = math.zeros(Number(setupData.scenario_start.bp), 2)._data;
        for (let ii = 0; ii < (turn - 1); ii++) {
            outBurns[ii] = app.players[setupData.team].burns[ii];
        }
        firebase.database().ref('players/' + setupData.team + '/').set({
            burn: outBurns,
            turn: turn,
            init: app.players[setupData.team].initState
        });
    }
    let ii = 0;
    let timeDelta = (turn - 1) * (app.scenLength / app.numBurns) - app.currentTime;
    let inter = setInterval(() => {
        app.currentTime += timeDelta / 31;
        $('.nav-element input')[0].value = app.currentTime;
        $('.nav-element input').parent().prev().find('p').find('span').text(hrsToTime(app.currentTime));
        calcData(app.currentTime);
        if (ii === 30) {
            clearInterval(inter);
        }
        ii++;
    }, 15);

})
// Other control title buttons are handled by callback within Vue object
$('.controlTitle :first').on('click', (a) => {
    if ($(a.target).is('span')) {
        a.target = $(a.target).parent();
    }
    if (!$(a.target).next().is(":hidden")) {
        $(a.target).next().slideUp(250);
        return;
    }
    $('.side-data').slideUp(250);
    $(a.target).next().slideDown(250);
})
$('.start-button').on('click', () => {
    $('.setup-screen').fadeOut(500);
    $('.selectable:first').parent().fadeIn(500);
    $('.selectable:first').parent().prev().fadeIn(500);
    $('.selectable:first').parent().prev().prev().fadeIn(500);
    // $('.nav-element:first p').css('color',sideData.scenario_data.players[setupData.team].name)
    app.initSunVector = [
        [Math.cos(Number(setupData.scenario_start.initSun) * Math.PI / 180)],
        [Math.sin(Number(setupData.scenario_start.initSun) * Math.PI / 180)],
    ];
    
    app.scenLength = Number(setupData.scenario_start.sl);
    app.numBurns = Number(setupData.scenario_start.bp);
    sideData.scenario_data.numBurns = app.numBurns;
    sideData.scenario_data.scenLength = app.scenLength;
    $('.slider')[0].max = app.scenLength;
    let blueInit = stateFromRoe({
        ae: Number(setupData.blue.ae),
        xd: Number(setupData.blue.xd),
        yd: Number(setupData.blue.yd),
        B: Number(setupData.blue.B)
    });
    let redInit = stateFromRoe({
        ae: Number(setupData.red.ae),
        xd: Number(setupData.red.xd),
        yd: Number(setupData.red.yd),
        B: Number(setupData.red.B)
    });
    app.players.blue = new Satellite(blueInit, 'blue', {
        waypoints: globalChartRef.config.data.datasets[0],
        trajectory: globalChartRef.config.data.datasets[1],
        current: globalChartRef.config.data.datasets[5],
    });
    app.players.red = new Satellite(redInit, 'red', {
        waypoints: globalChartRef.config.data.datasets[2],
        trajectory: globalChartRef.config.data.datasets[3],
        current: globalChartRef.config.data.datasets[6],
    });
    let init;
    if (setupData.green.exist) {
        init = stateFromRoe({
            ae: Number(setupData.green.ae),
            xd: Number(setupData.green.xd),
            yd: Number(setupData.green.yd),
            B: Number(setupData.green.B)
        });
        app.players.green = new Satellite(init, 'green', {
            trajectory: globalChartRef.config.data.datasets[11],
            current: globalChartRef.config.data.datasets[10],
            waypoints: globalChartRef.config.data.datasets[9]
        })
    }
    if (setupData.gray.exist) {
        init = stateFromRoe({
            ae: Number(setupData.gray.ae),
            xd: Number(setupData.gray.xd),
            yd: Number(setupData.gray.yd),
            B:  Number(setupData.gray.B)
        });
        app.players.gray = new Satellite(init, 'gray', {
            waypoints: globalChartRef.config.data.datasets[12],
            trajectory: globalChartRef.config.data.datasets[14],
            current: globalChartRef.config.data.datasets[13]
        })
    }
    if (setupData.server) {
        firebase.database().ref('/players/' + setupData.team + '/').set({
            burn: math.zeros(Number(setupData.scenario_start.bp), 2)._data,
            turn: 1,
            init: app.players[setupData.team].initState
        });
    }
    app.reqCats = Number(setupData.scenario_start.reqCats) * Math.PI / 180;
    app.rangeReq = [Number(setupData.scenario_start.rangeReq[0]), Number(setupData.scenario_start.rangeReq[1])];
    if (setupData.server) {
        setInterval(() => {
            firebase.database().ref('players/').once('value').then(function (snapshot) {
                let inData = snapshot.val();
                if (app.burnTransition) {
                    return;
                }
                app.redTurn = 1000; // arbitrarily high number, will always be reduced
                for (player in inData) {
                    if (player == setupData.team || app.players[player] === undefined) {
                        continue;
                    }
                    app.redTurn = inData[player].turn < app.redTurn ? inData[player].turn : app.redTurn;
                    let turn = Math.min(Number($turn.text()), inData[player].turn);
                    let oldNorm, newNorm, change = undefined, oldBurn = [...app.players[player].burns];
                    for (let ii = 0; ii < (turn - 1); ii++) {
                        oldNorm = math.norm(app.players[player].burns[ii]);
                        newNorm = math.norm(inData[player].burn[ii]);
                        change = (Math.abs(oldNorm-newNorm) > 1e-4) ? ii : change;
                    }
                    if (change !== undefined) {
                        let frames = 15, frame = 0;
                        app.burnTransition = true;
                        let changePlayer = player;
                        let intB = setInterval(() => {
                            app.players[changePlayer].burns.splice(change,1,math.add(math.dotMultiply(math.subtract(inData[changePlayer].burn[change],oldBurn[change]),frame/frames),oldBurn[change]));
                            frame++;
                            app.players[changePlayer].calculateTrajecory();
                            calcData(app.currentTime);
                            if (frame > frames) {
                                clearInterval(intB)
                                app.burnTransition = false;
                            }
                        },33)
                    }
                }
                
                if (Number($turn.text()) > app.redTurn) {
                    $('.nav-element-right').prev().find('p').css("color","rgb(255,100,100)")
                }
                else {
                    $('.nav-element-right').prev().find('p').css("color","white")
                }
            })//.catch(() => {
            //     console.log('error');
            // });
        }, 500);
    }
    
    startGame();

})
$('.nav-element input').on('input', (a) => {
    $(a.target).parent().prev().find('p').find('span').text(hrsToTime(a.target.value));
    app.currentTime = Number(a.target.value);
    setBottomInfo();
    calcData(app.currentTime);
})

$('.nav-element input').on('change', () => {
    let turn = Number($turn.text());
    let timeDelta = (turn - 1) * (app.scenLength / app.numBurns) - app.currentTime;
    let limit = Math.abs(Math.floor(timeDelta / (app.scenLength / app.numBurns) * 12));
    // console.log((turn - 1) * (app.scenLength / app.numBurns), app.currentTime, timeDelta, limit);
    let ii = 0;
    let inter = setInterval(() => {
        app.currentTime += timeDelta / (limit + 1);
        app.currentTime = app.currentTime < 0 ? 0 : app.currentTime;
        $('.nav-element input').val(app.currentTime);
        $('.nav-element input').parent().prev().find('p').find('span').text(hrsToTime(app.currentTime));
        calcData(app.currentTime);
        if (ii === limit) {
            clearInterval(inter);
        }
        ii++;
    }, 15);
})

function hrsToTime(hrs) {
    hrs = Math.round(hrs * 100) / 100; // rounding to truncate and not have for example 2.9999999 instead of 3, producing 2:59 instread of 3:00
    return ("0" + Math.floor(hrs)).slice(-2) + ':' + ('0' + Math.floor(60 * (hrs - Math.floor(hrs)))).slice(-2);
}

$('.server-button p').click(()=>{
    $('.server-button').animate({
        height: '20%'
    },300)
})
