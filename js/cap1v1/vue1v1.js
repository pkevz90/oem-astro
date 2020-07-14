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
        },
        items: [
            {
                message: 'hey'
            },{
                message: 'goodbye'
            }
        ],
        
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
    el: '#setup',
    data: {
        blue: {
            ae: 0,
            xd: 0,
            yd: 0,
            B: 0
        }
    }
});