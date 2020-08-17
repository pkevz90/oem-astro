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
            setSelectedWaypoint(burnNumber, sat);
        }
    }   
})

Vue.component('player-data', {
    props: ['inburns','in_turn_length'],
    data: function() {
        // console.log(this.inburns);
        return {visible: false, totalDv: 0};
    },
    template: ' <div>\
                    <div class="controlTitle pointer" @click="togglelist" v-bind:style="{color: inburns.color}">\
                        <span>{{inburns.name.toUpperCase()}} ({{ totalDv.toFixed(1) }} m/s)</span>\
                    </div>\
                    <div class="side-data burn-container" id="dataContainer" style="display:none;">\
                        <table class="table" id="burnTable" style="margin-top: 3%;">\
                            <thead>\
                                <tr>\
                                    <th>Time [hrs]</th>\
                                    <th>Radial [m/s]</th>\
                                    <th>In-Track [m/s]</th>\
                                </tr>\
                            </thead>\
                            <tbody class="pointer">\
                                <tr is="burn-data" v-for="(burn,index) in inburns.burns" :satburn="burn" :thisindex="index" :key="index" :turn_length="in_turn_length"></tr>\
                            </tbody>\
                        </table>\
                    </div>\
                </div>',
    methods: {
        togglelist: function(event) {
            let $target = event.target;
            while (!$($target).is('div')) {
                $target = $($target).parent();
            }
            if (!$($target).next().is(":hidden")) {
                $($target).next().slideUp(250);
                return;
            }
            $('.side-data').slideUp(250);
            $($target).next().slideDown(250);
        }
    },
    watch: {
        'inburns.burns': function() {
            let total = 0;
            for (burn in this.inburns.burns) {
                total += math.norm(this.inburns.burns[burn]);
            }
            this.totalDv = total;
        }
    }

})

var sideData = new Vue({
    el: '#side-data',
    data: {
        scenario_data: {
            curRange: 0,
            data: {
                blue: {
                    cats: 0,
                    exist: false,
                    range: 0,
                    data: {
                        red: {
                            range: 0,
                            cats: 0
                        },
                        green: {
                            range: 0,
                            cats: 0
                        },
                        gray: {
                            range: 0,
                            cats: 0
                        }
                    }
                },
                red: {
                    cats: 0,
                    exist: false,
                    range: 0,
                    data: {
                        blue: {
                            range: 0,
                            cats: 0
                        },
                        green: {
                            range: 0,
                            cats: 0
                        },
                        gray: {
                            range: 0,
                            cats: 0
                        }
                    }
                },
                green: {
                    cats: 0,
                    exist: false,
                    range: 0,
                    data: {
                        red: {
                            range: 0,
                            cats: 0
                        },
                        blue: {
                            range: 0,
                            cats: 0
                        },
                        gray: {
                            range: 0,
                            cats: 0
                        }
                    }
                },
                gray: {
                    cats: 0,
                    exist: false,
                    range: 0,
                    data: {
                        red: {
                            range: 0,
                            cats: 0
                        },
                        green: {
                            range: 0,
                            cats: 0
                        },
                        blue: {
                            range: 0,
                            cats: 0
                        }
                    }
                }
            },
            closeApproach: 0,
            closeTime: 0,
            players: {
                blue: {
                    burns: [[0,0]],
                    name: 'blue'
                },
                red: {
                    burns: [[0,0]],
                    name: 'red'
                },
            },
            engageData: ['blue','red'],
            scenLength: 15,
            numBurns: 5,
            colors: {
                blue:  'rgba(100,150,255,1)',
                red:   'rgba(255,150,100,1)',
                green: 'rgba(120,255,120,1)',
                gray: 'rgba(150,150,150,1)'
            }
        }
    },
    computed: {
        turnLength: function() {
            return this.scenario_data.scenLength / this.scenario_data.numBurns;
        }
    },
    methods: {
        engageChange: function(event) {
            if (event.target.value !== this.scenario_data.engageData[1]) {
                return;
            }
            for (player in this.scenario_data.players) {
                if (player !== event.target.value) {
                    this.scenario_data.engageData[1] = player;
                }
            }
            calcData(app.currentTime);
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
            B:  (0).toFixed(1),
            dVavail: (6).toFixed(1),
            reqCats: (90).toFixed(0),
            rangeReq: [(10).toFixed(0), (15).toFixed(0)],
            maxDv: (2).toFixed(1)
        },
        red: {
            ae: (0).toFixed(1),
            xd: (0).toFixed(1),
            yd: (-30).toFixed(1),
            B:  (0).toFixed(1),
            dVavail: (6).toFixed(1),
            reqCats: (90).toFixed(0),
            rangeReq: [(10).toFixed(0), (15).toFixed(0)],
            maxDv: (2).toFixed(1)
        },
        green: {
            exist: false,
            ae: (0).toFixed(1),
            xd: (0).toFixed(1),
            yd: (0).toFixed(1),
            B:  (0).toFixed(1),
            dVavail: (6).toFixed(1),
            maxDv: (2).toFixed(1)
        },
        gray: {
            exist: false,
            ae: (0).toFixed(1),
            xd: (0).toFixed(1),
            yd: (0).toFixed(1),
            B:  (0).toFixed(1),
            dVavail: (6).toFixed(1),
            maxDv: (2).toFixed(1)
        },
        scenario_start: {
            dVavail: (6).toFixed(1),
            reqCats: (90).toFixed(0),
            rangeReq: [(10).toFixed(0), (15).toFixed(0)],
            initSun: (90).toFixed(0),
            bp: (10).toFixed(0),
            sl: (30).toFixed(0),
        },
        team: 'blue',
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
            let sat = $(event.target).attr("id");
            $(event.target).hide();
            $(event.target).prev().fadeIn();
            setupData[sat].exist = true;
        },
        selectScenario: function (event) {
            switch(event.target.value) {
                case 'knifefight':
                    this.blue = {
                        ae: 0,
                        xd: 0,
                        yd: 30,
                        B:  0, 
                        dVavail: (6).toFixed(1),
                        reqCats: (90).toFixed(0),
                        rangeReq: [(10).toFixed(0), (15).toFixed(0)],
                    };
                    this.red = {
                        ae: 0,
                        xd: 0,
                        yd: -30,
                        B:  0, 
                        dVavail: (6).toFixed(1),
                        reqCats: (90).toFixed(0),
                        rangeReq: [(10).toFixed(0), (15).toFixed(0)],
                    };
                    this.green = {
                        ae: 0,
                        xd: 0,
                        yd: 0,
                        B:  0,
                        dVavail: (0).toFixed(1),
                        exist: false
                    };
                    this.gray = {
                        ae: 0,
                        xd: 0,
                        yd: 0,
                        B:  0,
                        dVavail: (0).toFixed(1),
                        exist: false
                    };
                    break;
                case 'driveby':
                    this.blue = {
                        ae: 0,
                        xd: 0,
                        yd: 0,
                        B:  0, 
                        dVavail: (6).toFixed(1),
                        reqCats: (90).toFixed(0),
                        rangeReq: [(10).toFixed(0), (15).toFixed(0)],
                    };
                    this.red = {
                        ae: 0,
                        xd: 30,
                        yd: 80,
                        B:  0, 
                        dVavail: (6).toFixed(1),
                        reqCats: (90).toFixed(0),
                        rangeReq: [(10).toFixed(0), (15).toFixed(0)],
                    };
                    this.green = {
                        ae: 0,
                        xd: 0,
                        yd: 0,
                        B:  0,
                        dVavail: (0).toFixed(1),
                        exist: false
                    };
                    this.gray = {
                        ae: 0,
                        xd: 0,
                        yd: 0,
                        B:  0,
                        dVavail: (0).toFixed(1),
                        exist: false
                    };
                    break;
                case 'defend':
                    this.blue = {
                        ae: 0,
                        xd: 0,
                        yd: 25,
                        B:  0, 
                        dVavail: (9).toFixed(1),
                        reqCats: (135).toFixed(0),
                        maxDv: (1.5).toFixed(2),
                        rangeReq: [(10).toFixed(0), (60).toFixed(0)],
                    };
                    this.red = {
                        ae: 0,
                        xd: -40,
                        yd: -90,
                        B:  0, 
                        dVavail: (9).toFixed(1),
                        reqCats: (90).toFixed(0),
                        maxDv: (1.75).toFixed(2),
                        rangeReq: [(0).toFixed(0), (40).toFixed(0)],
                    };
                    this.green = {
                        ae: 0,
                        xd: 0,
                        yd: 0,
                        B:  0,
                        dVavail: (9).toFixed(1),
                        maxDv: (0.2).toFixed(2),
                        reqCats: (90).toFixed(0),
                        rangeReq: [(0).toFixed(0), (5).toFixed(0)],
                        exist: true
                    };
                    this.gray = {
                        ae: 0,
                        xd: 0,
                        yd: 0,
                        B:  0,
                        dVavail: (0).toFixed(1),
                        exist: false
                    };
                    this.scenario_start.bp = 18;
                    this.scenario_start.sl = 36;
                    break;
                    case '2defend':
                        this.blue = {
                            ae: 20,
                            xd: 0,
                            yd: 0,
                            B:  0, 
                            dVavail: (3).toFixed(1),
                            reqCats: (90).toFixed(0),
                            rangeReq: [(10).toFixed(0), (15).toFixed(0)],
                        };
                        this.red = {
                            ae: 0,
                            xd: -30,
                            yd: -80,
                            B:  0, 
                            dVavail: (6).toFixed(1),
                            reqCats: (90).toFixed(0),
                            rangeReq: [(10).toFixed(0), (15).toFixed(0)],
                        };
                        this.green = {
                            ae: 0,
                            xd: 0,
                            yd: 0,
                            B:  0,
                            dVavail: (0.5).toFixed(1),
                            exist: true
                        };
                        this.gray = {
                            ae: 30,
                            xd: 0,
                            yd: 0,
                            B:  90,
                            dVavail: (3).toFixed(1),
                            exist: true
                        };
                        break;
                case 'mayhem':
                    this.blue = {
                        ae: 0,
                        xd: 0,
                        yd: 30,
                        B:  0, 
                        dVavail: (6).toFixed(1),
                        reqCats: (90).toFixed(0),
                        rangeReq: [(10).toFixed(0), (15).toFixed(0)],
                    };
                    this.red = {
                        ae: 0,
                        xd: 15,
                        yd: 0,
                        B:  0, 
                        dVavail: (6).toFixed(1),
                        reqCats: (90).toFixed(0),
                        rangeReq: [(10).toFixed(0), (15).toFixed(0)],
                    };
                    this.green = {
                        ae: 0,
                        xd: 0,
                        yd: -30,
                        B:  0,
                        dVavail: (6).toFixed(1),
                        exist: true
                    };
                    this.gray = {
                        ae: 0,
                        xd: -15,
                        yd: 0,
                        B:  0,
                        dVavail: (6).toFixed(1),
                        exist: true
                    };
                    break;
                default:
                    this.green = {
                        ae: 0,
                        xd: 0,
                        yd: 0,
                        B:  0,
                        dVavail: (0.5).toFixed(1),
                        exist: false
                    };
                    this.gray = {
                        ae: 0,
                        xd: 0,
                        yd: 0,
                        B:  0,
                        dVavail: (0).toFixed(1),
                        exist: false
                    };
                    break;
            }
            if (this.gray.exist) {
                $('#gray').prev().show();
                $('#gray').hide();
            }
            else {
                $('#gray').prev().hide();
                $('#gray').show();
            }
            if (this.green.exist) {
                $('#green').prev().show();
                $('#green').hide();
            }
            else {
                $('#green').prev().hide();
                $('#green').show();
            }
        },
        checkServer: function (event) {
            if ($(event.target).prev().val() === '533trs') {
                $(event.target).parent().prev().text('Server On');
                $('.server-button').css('background-color','rgb(100,200,100)');
                $('.server-button').animate({
                    height: '5%'
                },300)
                this.server = true;
            }
            else {
                $(event.target).prev().css('color','red')
            }
        }
    }
});