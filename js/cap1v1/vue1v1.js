Vue.component('burn-data', {
    props: ['satburn','thisindex','turn_length'],
    data: function() {
        // console.log(this.satburn);
        return {};
    },
    template:  '<tr @click="burnclick">\
                    <th>{{ (thisindex * turn_length).toFixed(1) }}</th>\
                    <td>{{ satburn[0].toFixed(3) }}</td>\
                    <td>{{ satburn[1].toFixed(3) }}</td>\
                </tr>',
    methods: {
        burnclick: function(event) {
            let $target = event.target;
            while (!$($target).is('th')) {
                $target = $($target).prev();
            }
            console.log(event.target);
            console.log($($target).parent().parent().parent().parent());
            let burnNumber = Number($($target).text()) / this.turn_length;
            let playerIndex = $('.burn-container').index($($target).parent().parent().parent().parent())
            let sat = Object.keys(app.players)[playerIndex];
            console.log(sat);
            setSelectedWaypoint(burnNumber, sat);
        }
    }   
})

Vue.component('player-data', {
    props: ['inburns','in_turn_length'],
    data: function() {
        return {visible: false};
    },
    template: ' <div>\
                    <div class="controlTitle pointer" @click="togglelist">\
                        <span>Satellite</span>\
                    </div>\
                    <div class="side-data burn-container" id="dataContainer" v-if="visible">\
                        <table class="table" id="burnTable" style="margin-top: 3%;">\
                            <thead>\
                                <tr>\
                                    <th>Time [hrs]</th>\
                                    <th>Radial [m/s]</th>\
                                    <th>In-Track [m/s]</th>\
                                </tr>\
                            </thead>\
                            <tbody class="pointer">\
                                <tr is="burn-data" v-for="(burn,index) in inburns" :satburn="burn" :thisindex="index" :key="index" :turn_length="in_turn_length"></tr>\
                            </tbody>\
                        </table>\
                    </div>\
                </div>',
    methods: {
        togglelist: function() {
            this.visible = !this.visible;
        }
    }

})

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
            burns: {
                blue: [[0,0]],
                red: [[0,0]]
            },
            scenLength: 15,
            numBurns: 5
        }
    },
    computed: {
        turnLength: function() {
            return this.scenario_data.scenLength / this.scenario_data.numBurns;
        }
    },
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
        teamNumber: 1,
        server: false
    },
    watch: {
        teamNumber: (val) => {
            setupData.blue.yd = (val == 1) ? (30).toFixed(1) : (-30).toFixed(1);
            setupData.red.yd =  (val == 1) ? (-30).toFixed(1) :  (30).toFixed(1);
        }
    },
    methods: {
        addGray: function (event) {
            let num = $(event.target).attr("id");
            $(event.target).hide();
            $(event.target).prev().fadeIn();
            setupData['gray' + num].exist = true;
        },
        selectScenario: function (event) {
            switch(event.target.value) {
                case 'knifefight':
                    this.blue = {
                        ae: 0,
                        xd: 0,
                        yd: 30,
                        B: 0
                    };
                    this.red = {
                        ae: 0,
                        xd: 0,
                        yd: -30,
                        B: 0
                    };
                    this.gray1 = {
                        exist: false,
                        ae: 0,
                        xd: 0,
                        yd:0,
                        B: 0
                    };
                    this.gray2 = {
                        exist: false,
                        ae: 0,
                        xd: 0,
                        yd: 0,
                        B: 0
                    };
                    return;
                case 'driveby':
                    this.blue = {
                        ae: 0,
                        xd: -30,
                        yd: -80,
                        B: 0
                    };
                    this.red = {
                        ae: 0,
                        xd: 0,
                        yd: 0,
                        B: 0
                    };
                    this.gray1 = {
                        exist: false,
                        ae: 0,
                        xd: 0,
                        yd:0,
                        B: 0
                    };
                    this.gray2 = {
                        exist: false,
                        ae: 0,
                        xd: 0,
                        yd: 0,
                        B: 0
                    };
                    return;
                case 'defend':
                    this.blue = {
                        ae: 20,
                        xd: 0,
                        yd: 0,
                        B: 90
                    };
                    this.red = {
                        ae: 0,
                        xd: 30,
                        yd: 80,
                        B: 0
                    };
                    this.gray1 = {
                        exist: true,
                        ae: 0,
                        xd: 0,
                        yd: 0,
                        B: 0
                    };
                    this.gray2 = {
                        exist: false,
                        ae: 0,
                        xd: 0,
                        yd: 0,
                        B: 0
                    };
                    return;
                default:
                    return;
            }
            
        }
    }
});