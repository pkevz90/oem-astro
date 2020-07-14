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
})
$('.start-button').on('click', () => {
    $('.setup-screen').fadeOut(500);
    let n = 2 * Math.PI / 86164;
    let $inputs = $('.setup-container').find('input');
    app.initSunVector = [
        [15*Math.cos($('#sun')[0].value*Math.PI/180)],
        [15*Math.sin($('#sun')[0].value*Math.PI/180)]
    ];
    app.scenLength = Number($('#sl')[0].value);
    app.numBurns = Number($('#bp')[0].value);
    sideData.scenario_data.numBurns = app.numBurns;
    sideData.scenario_data.scenLength = app.scenLength;
    $('.slider')[0].max = app.scenLength;
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
        [-Number($inputs[8].value) / 2 * Math.cos(Number($inputs[11].value) * Math.PI / 180) +
            Number($inputs[9].value)
        ],
        [Number($inputs[8].value) * Math.sin(Number($inputs[11].value) * Math.PI / 180) + Number(
            $inputs[10].value)],
        [Number($inputs[8].value) * n / 2 * Math.sin(Number($inputs[11].value) * Math.PI / 180)],
        [Number($inputs[8].value) * n * Math.cos(Number($inputs[11].value) * Math.PI / 180) - 1.5 *
            Number($inputs[9].value) * n
        ]
    ];
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
    if ($('.setup-container').eq(2).find('div').eq(0).is(':visible')) {
        init = [
            [-Number($inputs[12].value) / 2 * Math.cos(Number($inputs[15].value) * Math.PI / 180) +
                Number($inputs[13].value)
            ],
            [Number($inputs[12].value) * Math.sin(Number($inputs[15].value) * Math.PI / 180) + Number(
                $inputs[14].value)],
            [Number($inputs[12].value) * n / 2 * Math.sin(Number($inputs[15].value) * Math.PI / 180)],
            [Number($inputs[12].value) * n * Math.cos(Number($inputs[15].value) * Math.PI / 180) - 1.5 *
                Number($inputs[13].value) * n
            ]
        ];
        app.players.gray1 = new Satellite(init,'gray1',{trajectory: globalChartRef.config.data.datasets[14], current: globalChartRef.config.data.datasets[13]})
    }
    if ($('.setup-container').eq(3).find('div').eq(0).is(':visible')) {
        init = [
            [-Number($inputs[16].value) / 2 * Math.cos(Number($inputs[19].value) * Math.PI / 180) +
                Number($inputs[17].value)
            ],
            [Number($inputs[16].value) * Math.sin(Number($inputs[19].value) * Math.PI / 180) + Number(
                $inputs[18].value)],
            [Number($inputs[16].value) * n / 2 * Math.sin(Number($inputs[19].value) * Math.PI / 180)],
            [Number($inputs[16].value) * n * Math.cos(Number($inputs[19].value) * Math.PI / 180) - 1.5 *
                Number($inputs[17].value) * n
            ]
        ];
        app.players.gray2 = new Satellite(init,'gray2',{trajectory: globalChartRef.config.data.datasets[16], current: globalChartRef.config.data.datasets[15]})
    }
    app.deltaVAvail = Number($inputs[4].value);
    app.reqCats = Number($inputs[5].value)*Math.PI/180;
    app.rangeReq = [Number($inputs[6].value), Number($inputs[7].value)];
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
    $(a.target).prev().find('span')[0].textContent = hrsToTime(a.target.value);
    app.currentTime = Number(a.target.value);
    setBottomInfo();
    calcData(app.currentTime);
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
function hrsToTime(hrs) {
	return ("0" + Math.floor(hrs)).slice(-2) + ':' + ('0' + Math.floor(60*(hrs-Math.floor(hrs)))).slice(-2);
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