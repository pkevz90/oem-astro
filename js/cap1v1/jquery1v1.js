var teamNum, $turn = $('#turn-button p span')[0];
createGraph();
$('#setup').on('click', () => {
    $('.instruction-screen').slideToggle(250);
})
$('#turn-button').on('click', () => {
    let turn = $('#turn-button p span')[0].textContent;
    turn++;
    setSelectedWaypoint(turn - 1, 'blue');
    $('#turn-button p span')[0].textContent = turn;
    let outBurns = math.zeros(Number(setupData.scenario_start.bp), 2)._data;
    for (let ii = 0; ii < (turn - 1); ii++) {
        outBurns[ii] = app.players.blue.burns[ii];
    }
    console.log(outBurns);
    // firebase.database().ref('team' + setupData.teamNumber + '/').set({
    //     burn: outBurns,
    //     turn: turn
    // });

})
$('.start-button').on('click', () => {
    $('.setup-screen').fadeOut(500);
    app.initSunVector = [
        [15 * Math.cos(Number(setupData.scenario_start.initSun) * Math.PI / 180)],
        [15 * Math.sin(Number(setupData.scenario_start.initSun) * Math.PI / 180)],
    ];
    // firebase.database().ref('team' + setupData.teamNumber + '/').set({
    //     burn: math.zeros(Number(setupData.scenario_start.bp), 2)._data,
    //     turn: 1
    // });
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
        app.players.gray1 = new Satellite(init, 'gray1', {
            trajectory: globalChartRef.config.data.datasets[14],
            current: globalChartRef.config.data.datasets[13]
        })
    }
    if (setupData.gray2.exist) {
        init = stateFromRoe({
            ae: Number(setupData.gray2.ae),
            xd: Number(setupData.gray2.xd),
            yd: Number(setupData.gray2.yd),
            B:  Number(setupData.gray2.B)
        });
        app.players.gray2 = new Satellite(init, 'gray2', {
            trajectory: globalChartRef.config.data.datasets[16],
            current: globalChartRef.config.data.datasets[15]
        })
    }
    app.deltaVAvail = Number(setupData.scenario_start.dVavail);
    app.reqCats = Number(setupData.scenario_start.reqCats) * Math.PI / 180;
    app.rangeReq = [Number(setupData.scenario_start.rangeReq[0]), Number(setupData.scenario_start.rangeReq[1])];
    // setInterval(() => {
    //     firebase.database().ref('team' + ((setupData.teamNumber == '1') ? '2' : '1') + '/').once('value').then(function (snapshot) {
    //         let turn = Math.min(Number($('#turn-button p span')[0].textContent), snapshot.val().turn);
    //         for (let ii = 0; ii < (turn - 1); ii++) {
    //             app.players.red.burns[ii] = snapshot.val().burn[ii];
    //         }
    //         app.players.red.calculateTrajecory();
    //         calcData(app.currentTime);
    //     });
    // }, 500);
    startGame();

})
$('.controlTitle').on('click', (a) => {
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
$('.slider-contain input').on('input', (a) => {
    $(a.target).prev().find('span')[0].textContent = hrsToTime(a.target.value);
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