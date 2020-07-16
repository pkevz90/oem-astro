var sideData = new Vue({
    el: '#side-data',
    data: {
        scenario_data: {
            curRange: 0,
            curCats: 0,
            closeApproach: 0,
            closeTime: 0,
            blueDv: 0,
            redDv: 0,
            blueBurns: [[0,0],[0,0],[0,0],[0,0],[0,0]],
            redBurns: [[0,0],[0,0],[0,0],[0,0],[0,0]],
            scenLength: 15,
            numBurns: 5
        }
        
    },
    methods: {
        burnClick: function (event) {
            let ii = 0;
            let target = event.target;
            while (!$(target).is('tr')) {
                target = $(target).parent();
                ii++;
                if (ii > 5) {
                    return;
                }
            }
            ii = $('.burnRows').index(target);
            let sat = (ii >= this._data.scenario_data.numBurns) ? 'red' : 'blue';
            ii = (ii >= this._data.scenario_data.numBurns) ? ii - this._data.scenario_data.numBurns : ii;
            if (app.chosenWaypoint === undefined) {
                app.tactic = '';
            } else if ((app.chosenWaypoint[0] === ii) && (sat === 'blue')) {
                console.log(1)
                app.tactic = 'burn';
            } else if ((app.chosenWaypoint[0] === ii) && (sat === 'red')) {
                console.log(2)
                app.tactic = 'burn';
            } else {
                console.log(3)
                app.tactic = '';
            }
            setSelectedWaypoint(ii, sat);
            app.chartData.burnDir.data = [{
                x: 0,
                y: 0
            }, {
                x: 0,
                y: 0
            }];
        }
    }
});

var setupData = new Vue({
    el: '#setup-data',
    data: {
        blue: {
            ae: (0).toFixed(1),
            xd: (0).toFixed(1),
            yd: (30).toFixed(1),
            B:  (0).toFixed(1)
        },
        red: {
            ae: (0).toFixed(1),
            xd: (0).toFixed(1),
            yd: (-30).toFixed(1),
            B:  (0).toFixed(1)
        },
        gray1: {
            exist: false,
            ae: (0).toFixed(1),
            xd: (0).toFixed(1),
            yd: (0).toFixed(1),
            B:  (0).toFixed(1)
        },
        gray2: {
            exist: false,
            ae: (0).toFixed(1),
            xd: (0).toFixed(1),
            yd: (0).toFixed(1),
            B:  (0).toFixed(1)
        },
        scenario_start: {
            dVavail: (6).toFixed(1),
            reqCats: (90).toFixed(0),
            rangeReq: [(10).toFixed(0), (15).toFixed(0)],
            initSun: (90).toFixed(0),
            bp: (10).toFixed(0),
            sl: (30).toFixed(0),
        },
        teamNumber: 1
    },
    watch: {
        teamNumber: (val) => {
            console.log(this);
            setupData.blue.yd = (val == 1) ? (30).toFixed(1) : (-30).toFixed(1);
            setupData.red.yd =  (val == 1) ? (-30).toFixed(1) :  (30).toFixed(1);
        }
    }
});