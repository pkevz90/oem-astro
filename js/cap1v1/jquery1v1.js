var teamNum, $turn = $('.selectable:first span');;
createGraph();
$('canvas').on('mousewheel',event => {
    app.axisLimits -= event.deltaY*5;
    setAxisZoomPos();
})
$('canvas').mousedown(event => {
    if (app.tactic !== '') {
        return;
    }
    let X = app.axisCenter[0] + app.axisLimits - 2*(event.offsetX-globalChartRef.chartArea.left)*app.axisLimits / (globalChartRef.chartArea.right-globalChartRef.chartArea.left);
    let Y = app.axisCenter[1] + 0.5*app.axisLimits - (event.offsetY-globalChartRef.chartArea.top)*app.axisLimits / (globalChartRef.chartArea.bottom-globalChartRef.chartArea.top);
    if (checkClose(X, Y, false)) {
        return;
    }
    app.appDrag = [[event.offsetX,event.offsetY],
                   [...app.axisCenter]];
    $('canvas').css('cursor','grabbing')
})
$('canvas').mousemove(event => {
    if (!app.appDrag) {
        return;
    }
    app.axisCenter[0] = app.appDrag[1][0] + 2*(event.offsetX-app.appDrag[0][0])*app.axisLimits / (globalChartRef.chartArea.right-globalChartRef.chartArea.left);
    app.axisCenter[1] = app.appDrag[1][1] + 2*(event.offsetY-app.appDrag[0][1])*0.5*app.axisLimits / (globalChartRef.chartArea.bottom-globalChartRef.chartArea.top);
    setAxisZoomPos();
})
$('canvas').mouseup(() => {
    app.appDrag = undefined;
    $('canvas').css('cursor','grab')
})

$('.nav-element-right').on('click', () => {
    $('.instruction-screen').slideToggle(250);
})
$('.selectable:first').on('click', () => {
    let turn = Number($turn.text());
    if (turn > app.redTurn && setupData.server) {
        return;
    }
    turn++;
    setSelectedWaypoint(turn - 1, 'blue');
    $('.selectable:first span').text(turn)
    for (player in app.players) {
        app.players[player].calculateTrajecory();
    }
    calcData(app.currentTime);
    if (setupData.server) {
        let outBurns = math.zeros(Number(setupData.scenario_start.bp), 2)._data;
        for (let ii = 0; ii < (turn - 1); ii++) {
            outBurns[ii] = app.players.blue.burns[ii];
        }
        firebase.database().ref('team' + setupData.teamNumber + '/').set({
            burn: outBurns,
            turn: turn
        });
    }
    let ii = 0;
    let timeDelta = (turn - 1) * (app.scenLength / app.numBurns) - app.currentTime;
    let inter = setInterval(() => {
        app.currentTime += timeDelta / 6;
        $('.nav-element input')[0].value = app.currentTime;
        $('.nav-element input').parent().prev().find('p').find('span').text(hrsToTime(app.currentTime));
        calcData(app.currentTime);
        if (ii === 5) {
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
    app.initSunVector = [
        [15 * Math.cos(Number(setupData.scenario_start.initSun) * Math.PI / 180)],
        [15 * Math.sin(Number(setupData.scenario_start.initSun) * Math.PI / 180)],
    ];
    if (setupData.server) {
        firebase.database().ref('team' + setupData.teamNumber + '/').set({
            burn: math.zeros(Number(setupData.scenario_start.bp), 2)._data,
            turn: 1
        });
    }
    
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
        current: globalChartRef.config.data.datasets[9],
    });
    app.players.red = new Satellite(redInit, 'red', {
        waypoints: globalChartRef.config.data.datasets[3],
        trajectory: globalChartRef.config.data.datasets[4],
        current: globalChartRef.config.data.datasets[10],
    });
    let init;
    if (setupData.gray1.exist) {
        init = stateFromRoe({
            ae: Number(setupData.gray1.ae),
            xd: Number(setupData.gray1.xd),
            yd: Number(setupData.gray1.yd),
            B: Number(setupData.gray1.B)
        });
        app.players.green = new Satellite(init, 'green', {
            trajectory: globalChartRef.config.data.datasets[15],
            current: globalChartRef.config.data.datasets[14],
            waypoints: globalChartRef.config.data.datasets[13]
        })
    }
    if (setupData.gray2.exist) {
        init = stateFromRoe({
            ae: Number(setupData.gray2.ae),
            xd: Number(setupData.gray2.xd),
            yd: Number(setupData.gray2.yd),
            B:  Number(setupData.gray2.B)
        });
        app.players.gray = new Satellite(init, 'gray', {
            waypoints: globalChartRef.config.data.datasets[16],
            trajectory: globalChartRef.config.data.datasets[18],
            current: globalChartRef.config.data.datasets[17]
        })
    }
    app.deltaVAvail = Number(setupData.scenario_start.dVavail);
    app.reqCats = Number(setupData.scenario_start.reqCats) * Math.PI / 180;
    app.rangeReq = [Number(setupData.scenario_start.rangeReq[0]), Number(setupData.scenario_start.rangeReq[1])];
    if (setupData.server) {
        setInterval(() => {
            firebase.database().ref('team' + ((setupData.teamNumber == '1') ? '2' : '1') + '/').once('value').then(function (snapshot) {
                if (app.burnTransition) {
                    return;
                }
                app.redTurn = snapshot.val().turn;
                let turn = Math.min(Number($turn.text()), app.redTurn);
                if (Number($turn.text()) > snapshot.val().turn) {
                    $('.nav-element-right').prev().find('p').css("color","rgb(255,100,100)")
                }
                else {
                    $('.nav-element-right').prev().find('p').css("color","white")
                }
                let oldNorm, newNorm, change = undefined, oldBurn = [...app.players.red.burns];
                for (let ii = 0; ii < (turn - 1); ii++) {
                    oldNorm = math.norm(app.players.red.burns[ii]);
                    newNorm = math.norm(snapshot.val().burn[ii]);
                    change = (Math.abs(oldNorm-newNorm) > 1e-4) ? ii : change;
                }
                if (change !== undefined) {
                    let frames = 15, frame = 0;
                    app.burnTransition = true;
                    let intB = setInterval(() => {
                        app.players.red.burns.splice(change,1,math.add(math.dotMultiply(math.subtract(snapshot.val().burn[change],oldBurn[change]),frame/frames),oldBurn[change]));
                        frame++;
                        app.players.red.calculateTrajecory();
                        calcData(app.currentTime);
                        if (frame > frames) {
                            clearInterval(intB)
                            app.burnTransition = false;
                        }
                    },33)
                }
            }).catch(() => {
                console.log('error');
            });
        }, 500);
    }
    
    startGame();

})
// $('.controlTitle').on('click', (a) => {
//     if ($(a.target).is('span')) {
//         a.target = $(a.target).parent();
//     }
//     if (!$(a.target).next().is(":hidden")) {
//         $(a.target).next().slideUp(250);
//         return;
//     }
//     $('.side-data').slideUp(250);
//     $(a.target).next().slideDown(250);
// })
$('.nav-element input').on('input', (a) => {
    $(a.target).parent().prev().find('p').find('span').text(hrsToTime(a.target.value));
    app.currentTime = Number(a.target.value);
    setBottomInfo();
    calcData(app.currentTime);
})

function hrsToTime(hrs) {
    return ("0" + Math.floor(hrs)).slice(-2) + ':' + ('0' + Math.floor(60 * (hrs - Math.floor(hrs)))).slice(-2);
}

function showNoteBar(s) {
    $(".noteBar").stop();
    $(".noteBar").stop();
    $('.noteBar').hide();
    $('.noteBar p')[0].textContent = s;
    $('.noteBar').css('bottom', '0%');
    $('.noteBar').css('opacity', '1');
    $('.noteBar').show();
    $('.noteBar').animate({
        opacity: 0.99
    }, 500);
    $('.noteBar').animate({
        bottom: '-=100px',
    }, 250);

}
