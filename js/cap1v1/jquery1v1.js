var teamNum, $turn = $('#turn-button p span')[0];
createGraph();
// $.get("./start", (data, status) => {
//     teamNum = data;
//     console.log('Server connected: Assigned team ' + data)
//     $('.team-number')[0].textContent = 'Team ' + teamNum;
// }).fail(() => {
//     $('.team-number')[0].textContent = '';
// });
$('#setup').on('click', () => {
    $('.instruction-screen').slideToggle(250);
})
$('#turn-button').on('click', () => {
    let turn = $('#turn-button p span')[0].textContent;
    turn++;
    setSelectedWaypoint(turn - 1, 'blue');
    $('#turn-button p span')[0].textContent = turn;
})
$('.start-button').on('click', () => {
    $('.setup-screen').fadeOut(500);
    let n = 2 * Math.PI / 86164;
    let $inputs = $('.setup-container').find('input');
    app.initSunVector = [
        [15*Math.cos($('#sun')[0].value*Math.PI/180)],
        [15*Math.sin($('#sun')[0].value*Math.PI/180)]
    ];

    let blueInit = [
        [-Number($inputs[0].value) / 2 * Math.cos(Number($inputs[3].value) * Math.PI / 180) +
            Number($inputs[1].value)
        ],
        [Number($inputs[0].value) * Math.sin(Number($inputs[3].value) * Math.PI / 180) + Number(
            $inputs[2].value)],
        [Number($inputs[0].value) * n / 2 * Math.sin(Number($inputs[3].value) * Math.PI / 180)],
        [Number($inputs[0].value) * n * Math.cos(Number($inputs[3].value) * Math.PI / 180) - 1.5 *
            Number($inputs[1].value) * n
        ]
    ];
    let redInit = [
        [-Number($inputs[9].value) / 2 * Math.cos(Number($inputs[12].value) * Math.PI / 180) +
            Number($inputs[10].value)
        ],
        [Number($inputs[9].value) * Math.sin(Number($inputs[12].value) * Math.PI / 180) + Number(
            $inputs[11].value)],
        [Number($inputs[9].value) * n / 2 * Math.sin(Number($inputs[12].value) * Math.PI / 180)],
        [Number($inputs[9].value) * n * Math.cos(Number($inputs[12].value) * Math.PI / 180) - 1.5 *
            Number($inputs[10].value) * n
        ]
    ];
    app.players.blue = new Satellite(blueInit, 'blue', {
        way: 0,
        traj: 1,
        cur: 9
    });
    app.players.red = new Satellite(redInit, 'red', {
        way: 3,
        traj: 4,
        cur: 10
    });
    let init;
    if ($('.setup-container').eq(2).find('div').eq(0).is(':visible')) {
        init = [
            [-Number($inputs[13].value) / 2 * Math.cos(Number($inputs[16].value) * Math.PI / 180) +
                Number($inputs[14].value)
            ],
            [Number($inputs[13].value) * Math.sin(Number($inputs[16].value) * Math.PI / 180) + Number(
                $inputs[15].value)],
            [Number($inputs[13].value) * n / 2 * Math.sin(Number($inputs[16].value) * Math.PI / 180)],
            [Number($inputs[13].value) * n * Math.cos(Number($inputs[16].value) * Math.PI / 180) - 1.5 *
                Number($inputs[14].value) * n
            ]
        ];
        app.players.gray1 = new Satellite(init,'gray1',{traj: 14, cur: 13})
    }
    if ($('.setup-container').eq(3).find('div').eq(0).is(':visible')) {
        init = [
            [-Number($inputs[17].value) / 2 * Math.cos(Number($inputs[20].value) * Math.PI / 180) +
                Number($inputs[18].value)
            ],
            [Number($inputs[17].value) * Math.sin(Number($inputs[20].value) * Math.PI / 180) + Number(
                $inputs[19].value)],
            [Number($inputs[17].value) * n / 2 * Math.sin(Number($inputs[20].value) * Math.PI / 180)],
            [Number($inputs[17].value) * n * Math.cos(Number($inputs[20].value) * Math.PI / 180) - 1.5 *
                Number($inputs[18].value) * n
            ]
        ];
        app.players.gray2 = new Satellite(init,'gray2',{traj: 16, cur: 15})
    }
    app.deltaVAvail = Number($inputs[5].value);
    app.reqCats = Number($inputs[6].value)*Math.PI/180;
    app.rangeReq = [Number($inputs[7].value), Number($inputs[8].value)];
    // setInterval(() => {
    //     let outData = {
    //         teamName: teamNum,
    //         burns: JSON.stringify(app.players.blue.burns)
    //     };
    //     // outData = JSON.stringify(outData);
    //     console.log(outData)
    //     $.post("./data", outData, (data, status) => {
    //         let turn = Number($turn.textContent) - 1;
    //         let tempBurns = Object.values(JSON.parse(data));
    //         console.log(tempBurns)
    //         change = false;
    //         let sat = 'red';
    //         for (let ii = 0; ii < turn; ii++) {
    //             console.log(app.players.red.burns[ii][0],tempBurns[ii][0],app.players.red.burns[ii][1],tempBurns[ii][1])
    //             if ((app.players.red.burns[ii][0] === tempBurns[ii][0]) && (app.players
    //                     .red.burns[ii][1] === tempBurns[ii][1])) {
    //                 continue;
    //             } else {
    //                 app.players.red.burns[ii] = tempBurns[ii];
    //                 change = true;
    //                 app.spans.manRows[sat][ii * 2].textContent = (tempBurns[ii][0])
    //                     .toFixed(2);
    //                 app.spans.manRows[sat][ii * 2 + 1].textContent = (tempBurns[ii][1])
    //                     .toFixed(2);
    //             }
    //         }
    //         if (change) {
    //             app.players.red.calculateTrajecory();
    //             calcData(app.currentTime);
    //         }
    //     });
    // }, 2500);
    startGame();
})
$('.add-button').on('click', (a) => {
    $(a.target).hide();
    $(a.target).prev().fadeIn();
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
    $(a.target).prev().find('span')[0].textContent = a.target.value;
    app.currentTime = Number(a.target.value);
    setBottomInfo();
    calcData(app.currentTime);
})
$('tr').on('click', (a) => {
    let ii = 0;
    while (!$(a.target).is('tr')) {
        a.target = $(a.target).parent();
        console.log(a.target);
        ii++;
        if (ii > 5) {
            break;
        }
    }
    ii = $('tr').index(a.target);
    if ((ii === 0) || (ii === 6)) {
        return;
    }
    let sat = (ii > 6) ? 'red' : 'blue';
    if (app.chosenWaypoint === undefined) {
        app.tactic = '';
    } else if ((app.chosenWaypoint[0] === (ii-1)) && (sat === 'blue')) {
        console.log(1)
        app.tactic = 'burn';
    } else if ((app.chosenWaypoint[0] === (ii-7)) && (sat === 'red')) {
        console.log(2)
        app.tactic = 'burn';
    } else {
        console.log(3)
        app.tactic = '';
    }
    setSelectedWaypoint((ii > 6) ? ii - 7 : ii - 1, sat);
    globalChartRef.config.data.datasets[app.dataLoc.burnDir].data = [{
        x: 0,
        y: 0
    }, {
        x: 0,
        y: 0
    }];

})
var burnRows, dataRows; {
    let $tableRows = $('td');
    app.spans.manRows = {
        blue: $tableRows.splice(0, 10),
        red: $tableRows
    }
    $tableRows = $('.side-data span');
    app.spans.scenData = {
        curRange: $tableRows.splice(0, 1),
        minRange: $tableRows.splice(0, 2),
        cats: $tableRows.splice(0, 1),
        totalDv: {
            blue: $tableRows.splice(0, 1),
            red: $tableRows.splice(0, 1)
        }
    }
}

function showNoteBar(s) {
    $(".noteBar").stop();
    $(".noteBar").stop();
    $('.noteBar').hide();
    $('.noteBar p')[0].textContent = s;
    $('.noteBar').css('bottom','0%');
    $('.noteBar').css('opacity','1');
    $('.noteBar').show();
    $('.noteBar').animate({
        opacity: 0.99
    },500);
    $('.noteBar').animate({
        bottom: '-=100px',
    },250);
    
}