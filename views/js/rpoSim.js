var main_app = new Vue({
    el: "#main-app",
    data: {
        fetchURL: 'http://localhost:5000/first-firebase-app-964fe/us-central1/app',
        // fetchURL: 'https://us-central1-first-firebase-app-964fe.cloudfunctions.net/app',
        games: [],
        chosenGamePlayers: [],
        players: {
            blue: {
                exist: true,
                name: 'blue',
                color: 'rgba(100,150,255,1)',
                initial_state: [20, 20, 0, 0],
                burn_change: {
                    old_burn: null,
                    new_burn: null,
                    change: 1
                },
                current_state: null,
                burns: [],
                burn_points: [],
                burn_total: 0,
                angle: 0,
                scenario_fuel: 6,
                turn_fuel: 1,
                required_cats: [0, 90],
                max_range: 30,
                target: 'red',
                engine: null
            },
            red: {
                exist: true,
                name: 'red',
                color: 'rgba(255,150,100,1)',
                initial_state: [30, 0, 0, 0],
                burn_change: {
                    old_burn: null,
                    new_burn: null,
                    change: 1
                },
                current_state: null,
                burns: [],
                burn_points: [],
                burn_total: 0,
                angle: 0,
                scenario_fuel: 6,
                turn_fuel: 1,
                required_cats: [0, 90],
                max_range: 30,
                target: 'green',
                engine: null
            },
            green: {
                exist: false,
                name: 'green',
                color: 'rgba(120,255,120,1)',
                initial_state: [30, 30, 0, 0],
                burn_change: {
                    old_burn: null,
                    new_burn: null,
                    change: 1
                },
                current_state: null,
                burns: [],
                burn_points: [],
                burn_total: 0,
                angle: 0,
                scenario_fuel: 6,
                turn_fuel: 1,
                required_cats: [0, 90],
                max_range: 30,
                target: null,
                engine: null
            },
            gray: {
                exist: false,
                name: 'gray',
                color: 'rgba(150,150,150,1)',
                initial_state: [30, -30, 0, 0],
                burn_change: {
                    old_burn: null,
                    new_burn: null,
                    change: 1
                },
                current_state: null,
                burns: [],
                burn_points: [],
                burn_total: 0,
                angle: 0,
                scenario_fuel: 6,
                turn_fuel: 1,
                required_cats: [0, 90],
                max_range: 30,
                target: null,
                engine: null
            }
        },
        scenario_data: {
            scenario_length: 30,
            burns_per_player: 10,
            init_sun_angl: 0,
            sat_data: {
                origin: 'blue',
                target: 'red',
                data: {
                    range: 0,
                    cats: 0,
                    range_rate: 0,
                    poca: 0
                }
            },
            server: false,
            gameId: '',
            player: '',
            selected_burn_point: null,
            game_started: false,
            game_time: 0,
            game_time_string: '00:00',
            target_display: 1,
            mousedown_location: null,
            mousemove_location: null,
            tactic_data: ['none'],
            turn: 0,
            opposingTurn: 0
        },
        display_data: {
            center: [0, 0],
            axis_limit: 100,
            width: null,
            height: null,
            drag_data: null,
            shift_key: false,
            stars: math.random([100, 3], -0.5, 0.5),
            update_time: true,
            transition: false
        }
    },
    computed: {
        turn_length: function () {
            return this.scenario_data.scenario_length / this.scenario_data.burns_per_player;
        },
        active_players: function () {
            let players = [];
            for (player in this.players) {
                if (this.players[player].exist) {
                    players.push(this.players[player].name);
                }
            }
            return players;
        }
    },
    methods: {
        updateScreen: function () {
            let cnvs = document.getElementById("main-canvas");
            let ctx = cnvs.getContext('2d');
            this.display_data.height = cnvs.height;
            this.display_data.width = cnvs.width;
            ctx.clearRect(0, 0, cnvs.width, cnvs.height);
            drawStars(cnvs, ctx);
            drawAxes(cnvs, ctx, this.display_data.center, this.display_data.axis_limit);
            // Draw Sun
            let sunPos;
            if (this.scenario_data.sat_data.target === null) {
                sunPos = [0, 0];
            } else {
                sunPos = this.players[this.scenario_data.sat_data.target].current_state || [0, 0];
            }
            drawArrow(ctx, getScreenPixel(cnvs, sunPos[0], sunPos[1], this.display_data.axis_limit, this.display_data.center), 90, this.scenario_data.init_sun_angl + 2 * Math.PI / 86164 * this.scenario_data.game_time * 3600, 'rgba(255,255,0,0.5)', 9);
            let calcBurns;
            for (sat in this.players) {
                if (this.players[sat].exist) {
                    if (this.players[sat].burn_change.change < 1) {
                        this.players[sat].burn_change.change += 0.025;
                        calcBurns = math.add(this.players[sat].burn_change.old, math.multiply(this.players[sat].burn_change.change, math.subtract(this.players[sat].burn_change.new, this.players[sat].burn_change.old)));
                        if (this.players[sat].burn_change.change > 0.999999) {
                            this.players[sat].burns = [...this.players[sat].burn_change.new];
                            this.players[sat].burn_change.change = 1;
                        }
                    } else {
                        calcBurns = this.players[sat].burns;
                    }
                    this.players[sat].burn_points = calculateBurnPoints('blue', calcBurns, this.players[sat].initial_state);
                    drawSatInfo(ctx, cnvs, this.display_data.axis_limit, this.display_data.center, this.players[sat]);
                }
            }
            if (this.scenario_data.game_started) {
                drawAnimations(cnvs, ctx, this.display_data.center, this.display_data.axis_limit);
            }
            for (sat in this.players) {
                if (this.players[sat].exist) {
                    this.players[sat].current_state = calcCurrentPoint(this.scenario_data.game_time, sat);
                    drawSatShape(ctx, getScreenPixel(cnvs, this.players[sat].current_state[0], this.players[sat].current_state[1], this.display_data.axis_limit, this.display_data.center), this.players[sat].angle, 0.25, this.players[sat].color);
                }
            }
            // Calculate total fuel used
            for (player in this.players) {
                if (!this.players[player].exist) {
                    continue;
                }
                let total_burn = 0;
                for (let ii = 0; ii < main_app.scenario_data.burns_per_player; ii++) {
                    total_burn += math.norm(main_app.players[player].burns[ii]);
                }
                main_app.players[player].burn_total = total_burn;
            }
            // Draw burn if point is focused upon
            if (this.scenario_data.selected_burn_point !== null) {
                let location = main_app.players[this.scenario_data.selected_burn_point.satellite].burn_points[this.scenario_data.selected_burn_point.point];
                let burn = main_app.players[this.scenario_data.selected_burn_point.satellite].burns[this.scenario_data.selected_burn_point.point];
                let burnN = math.norm(burn);
                if (burnN > 1e-6) {
                    drawArrow(ctx, getScreenPixel(cnvs, location[0][0], location[1][0], this.display_data.axis_limit, this.display_data.center), 30 * burnN, Math.atan2(-burn[1], burn[0]), main_app.players[this.scenario_data.selected_burn_point.satellite].color, 4);
                }
            }
            if (main_app.scenario_data.tactic_data[0] === 'target') {
                if ((1 - main_app.scenario_data.target_display) > 1e-6) {
                    main_app.scenario_data.target_display += 0.08333333;
                }
                drawTargetLimit(ctx, cnvs, main_app.scenario_data.selected_burn_point.satellite, main_app.scenario_data.tactic_data[3] / 1000, main_app.scenario_data.tactic_data[1] * this.scenario_data.target_display)
            }
            calcData(this.scenario_data.sat_data.origin, this.scenario_data.sat_data.target)
        },
        chosenGameChange: function (event) {
            let chosenGame = this.games.filter(game => {
                return game._id === event.target.value;
            })
            this.chosenGamePlayers = chosenGame[0].players;
        },
        slider_change: function (event) {
            this.scenario_data.game_time = event.target.value;
            this.scenario_data.game_time_string = hrsToTime(event.target.value);
        },
        slider_click: function (event) {
            this.display_data.update_time = event;
        },
        turn_button_click: async function () {
            if (this.scenario_data.turn > this.scenario_data.opposingTurn && this.scenario_data.server) {
                return;
            }
            this.scenario_data.turn++;
            if (!this.scenario_data.server) {
                return;
            }
            let burnData = this.players[this.scenario_data.player].burns.map((burn, ii) => {
                if (ii < this.scenario_data.turn) {
                    return burn;
                } else {
                    return [0, 0];
                }
            })
            let outData = {
                burns: burnData,
                turn: this.scenario_data.turn
            };
            await fetch(this.fetchURL + '/update/' + this.scenario_data.gameId + '/' + this.scenario_data.player, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(outData)
            });
        },
        startScreenClick: async function (event = {
            target: {
                id: 'start-refresh'
            }
        }) {
            switch (event.target.id) {
                case 'start-game':
                    $('.start-game-div').fadeIn(500);
                    break;
                case 'start-server':
                    // POST Request new game
                    this.scenario_data.server = true;
                    let outPlayers = [];
                    for (var player in this.players) {
                        if (!this.players[player].exist) {
                            continue;
                        }
                        outPlayers.push({
                            name: this.players[player].name,
                            initState: this.players[player].initial_state,
                            burns: math.zeros(this.scenario_data.burns_per_player, 2)._data,
                            fuel: this.players[player].scenario_fuel,
                            turn_fuel: this.players[player].turn_fuel,
                            cats: this.players[player].required_cats,
                            range: this.players[player].max_range,
                            turn: 0
                        });
                    }
                    let outData = {
                        players: outPlayers,
                        scenarioConditions: {
                            initSun: this.scenario_data.init_sun_angl,
                            gameLength: this.scenario_data.scenario_length,
                            nBurns: this.scenario_data.burns_per_player,
                        },
                        name: $('#game-name').val()
                    }
                    this.scenario_data.player = $("input[name='player']:checked").val();
                    let responsePost = await fetch(this.fetchURL + '/new', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(outData)
                    });
                    responsePost = await responsePost.json();
                    this.scenario_data.gameId = responsePost._id;
                    this.scenario_data.turn = 0;
                    setTimeout(this.startGame, 500);
                    break;
                case 'start-refresh':
                    // GET request for current games
                    let response = await fetch(this.fetchURL + '/games');
                    response = await response.json();
                    this.games = response;
                    break;
                case 'start-join':
                    let responseJoin = await fetch(this.fetchURL + '/games/' + $('select')[0].value)
                    responseJoin = await responseJoin.json();
                    let playerJoin = responseJoin.players.filter(player => {
                        return player.name === $('select')[1].value;
                    });
                    this.scenario_data.gameId = responseJoin._id;
                    this.scenario_data.player = $('select')[1].value;
                    this.scenario_data.server = true;
                    this.scenario_data.turn = playerJoin[0].turn;
                    // this.scenario_data.turn = responseJoin.turn;
                    this.players.blue.exist = false;
                    this.players.green.exist = false;
                    this.players.red.exist = false;
                    this.players.gray.exist = false;
                    responseJoin.players.forEach(player => {
                        this.players[player.name].exist = true;
                        this.players[player.name].initial_state = player.initState;
                        this.players[player.name].burns = player.burns;
                        this.players[player.name].required_cats = player.cats;
                        this.players[player.name].max_range = player.range;
                        this.players[player.name].scenario_fuel = player.fuel;
                        this.players[player.name].turn_fuel = player.turn_fuel;
                    })
                    this.scenario_data.scenario_length = responseJoin.scenarioConditions.gameLength;
                    this.scenario_data.burns_per_player = responseJoin.scenarioConditions.nBurns;
                    this.scenario_data.init_sun_angl = responseJoin.scenarioConditions.initSun;
                    setTimeout(this.startGame, 500);
                    break;
                case 'start-offline':
                    // Start with no requests
                    this.scenario_data.player = $("input[name='player']:checked").val();
                    this.startGame();
                    break;
            }
        },
        startGame: function () {
            $('.start-game-div').fadeOut(500);
            this.scenario_data.game_started = true;
            $('#turn-button').show();
            $('.setup-zone').fadeOut(500);
            $('#game-data-container').fadeIn(500);
            $('#time-slider').fadeIn(500);
            $('.setup-input-div').slideUp(500);
            $("input[name='player']").hide();
            $('#turn-button').css('color', this.players[this.scenario_data.player].color);
            $('#data-container').animate({
                opacity: 0
            }, 500, () => {
                $('#data-container').css('width', '50%');
            })
            let $cvns = $('canvas')[0];
            let del_height = window.innerHeight - $cvns.height;
            let del_width = window.innerWidth - $cvns.width;
            let int_ii = 0;
            // for (player in this.players) {
            //     this.players[player].burns = math.zeros(this.scenario_data.burns_per_player, 2)._data;
            // }
            // Probably the dumbest way to do it ever
            function make_right_size() {
                int_ii++;
                $cvns.height += del_height / 30;
                $cvns.width += del_width / 30;
                if (int_ii < 30) {
                    setTimeout(make_right_size, 16);
                } else {
                    $('#data-container').animate({
                        opacity: 1,
                        width: '20%',
                        'top': '5%',
                        'left': '0%',
                    }, 500);
                }
            }
            make_right_size();
            if (!this.scenario_data.server) {
                return;
            }
            setInterval(async () => {
                if (this.scenario_data.turn <= this.scenario_data.opposingTurn) {
                    return;
                }
                let responseInt = await fetch(this.fetchURL + '/games/' + this.scenario_data.gameId);
                responseInt = await responseInt.json();
                this.scenario_data.opposingTurn = math.min(responseInt.players.map(player => {
                    return player.turn;
                }));
                responseInt.players.forEach(player => {
                    if (player.name !== this.scenario_data.player) {
                        this.players[player.name].burn_change.old = [...this.players[player.name].burns];
                        this.players[player.name].burn_change.new = player.burns.map((burn, ii) => {
                            if (ii >= this.scenario_data.opposingTurn) {
                                return [0, 0];
                            } else {
                                return burn;
                            }
                        });
                        this.players[player.name].burn_change.change = 0;
                    }
                })
            }, 5000)
        },
        add_player: function () {
            if (!this.players.green.exist) {
                this.players.green.exist = true;
            } else {
                this.players.gray.exist = true;
            }
        },
        changeNumBurns: function () {
            for (player in this.players) {
                this.players[player].burns = math.zeros(this.scenario_data.burns_per_player, 2)._data;
            }
        }
    },
    watch: {
        'scenario_data.display_time': function () {
            for (player in this.players) {
                this.players[player].display_state = calcCurrentPoint(this.scenario_data.display_time, player);
            }
        }
    }
})


window.addEventListener('resize', () => {
    resizeCanvas();
});

function calcData(origin, target) {
    if (main_app.scenario_data.sat_data.target === null) {
        return;
    }
    let rel_vector = math.subtract(main_app.players[origin].current_state.slice(0, 2), main_app.players[target].current_state.slice(0, 2));
    main_app.scenario_data.sat_data.data.range = math.norm(rel_vector);
    let sunVector = [
        [Math.cos(main_app.scenario_data.init_sun_angl + 2 * Math.PI / 86164 * main_app.scenario_data.game_time * 3600)],
        [-Math.sin(main_app.scenario_data.init_sun_angl + 2 * Math.PI / 86164 * main_app.scenario_data.game_time * 3600)]
    ];
    main_app.scenario_data.sat_data.data.cats = Math.acos(math.dot(rel_vector, sunVector) / math.norm(rel_vector)) * 180 / Math.PI;
    for (player in main_app.players) {
        if (main_app.players[player].exist && main_app.players[player].target !== null && main_app.players[main_app.players[player].target].current_state !== null) {
            rel_vector = math.subtract(main_app.players[main_app.players[player].target].current_state.slice(0, 2), main_app.players[player].current_state.slice(0, 2));
            main_app.players[player].angle = Math.atan2(-rel_vector[1], rel_vector[0]) * 180 / Math.PI;
        }
    }
}

function resizeCanvas() {
    if (main_app.scenario_data.game_started) {
        $('#main-canvas')[0].width = window.innerWidth;
        $('#main-canvas')[0].height = window.innerHeight;
    } else {
        $('#main-canvas')[0].width = window.innerWidth / 2;
        $('#main-canvas')[0].height = window.innerHeight / (10 / 8);
    }
}

function drawStars(cnvs, ctx) {
    let w = cnvs.width,
        h = cnvs.height;
    let ct = Math.cos(main_app.scenario_data.game_time * 3600 * Math.PI * 2 / 86164),
        st = Math.sin(main_app.scenario_data.game_time * 3600 * Math.PI * 2 / 86164);
    let rotMat = [
        [ct, -st, 0],
        [st, ct, 0],
        [0, 0, 1]
    ];
    ctx.save();
    ctx.translate(w / 2, h / 2);
    let starR = math.transpose(math.multiply(rotMat, math.transpose(main_app.display_data.stars)));
    ctx.fillStyle = "rgb(255,255,255)";
    starR.forEach(star => {
        ctx.fillRect((w > h ? w : h) * star[0], (w > h ? w : h) * star[1], 3 * (star[2] + 0.5), 3 * (star[2] + 0.5));
    });
    ctx.restore();
}

function getScreenPixel(cnvs, rad, it, limit, center, object = false) {
    let height = cnvs.height,
        width = cnvs.width,
        yxRatio = height / width;
    if (object) {
        return {
            x: width / 2 + ((center[0] - it) / limit) * width / 2,
            y: height / 2 + ((center[1] - rad) / limit / yxRatio) * height / 2
        }
    }
    return [width / 2 + ((center[0] - it) / limit) * width / 2, height / 2 + ((center[1] - rad) / limit / yxRatio) * height / 2]
}

function getScreenPoint(x, y, limit, center, object = false) {
    cnvs = $('#main-canvas')[0];
    let height = cnvs.height,
        width = cnvs.width,
        yxRatio = height / width;
    if (object) {
        return {
            it: center[0] - (x - width / 2) / (width / 2) * limit,
            rad: center[1] - (y - height / 2) / (height / 2) * limit * yxRatio,
        }
    }
    return [center[0] - (x - width / 2) / (width / 2) * limit, center[1] - (y - height / 2) / (height / 2) * limit * yxRatio];
}

function drawAnimations(cnvs, ctx, center, limit) {
    // Draw Line showing data origin and target
    let line_origin = main_app.players[main_app.scenario_data.sat_data.origin].current_state || [0, 0],
        line_end;
    if (main_app.scenario_data.sat_data.target === null) {
        line_end = main_app.scenario_data.mousemove_location;
    } else {
        line_end = main_app.players[main_app.scenario_data.sat_data.target].current_state || [0, 0];
        line_end = getScreenPixel(cnvs, line_end[0], line_end[1], limit, center);
    }
    line_origin = getScreenPixel(cnvs, line_origin[0], line_origin[1], limit, center);
    ctx.strokeStyle = 'rgba(200,200,200,0.7)';
    ctx.lineWidth = 3;
    ctx.setLineDash([2, 10]);
    ctx.beginPath();
    ctx.moveTo(line_origin[0], line_origin[1]);
    ctx.lineTo(line_end[0], line_end[1]);
    ctx.stroke();
    ctx.setLineDash([]);

    if (main_app.display_data.shift_key) {
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.lineWidth = 3;
        for (player in main_app.players) {
            let location;
            ctx.beginPath();
            if (main_app.players[player].exist) {
                location = getScreenPixel(cnvs, main_app.players[player].current_state[0], main_app.players[player].current_state[1], limit, center);
                ctx.arc(location[0], location[1], 25, 0, 2 * Math.PI);
                ctx.fill();
                ctx.stroke();
            }
        }
    }
}

function drawAxes(cnvs, ctx, center, limit) {
    let height = cnvs.height,
        width = cnvs.width,
        yxRatio = height / width,
        axis_center = [width / 2 + (center[0] / limit) * width / 2, height / 2 + (center[1] / limit / yxRatio) * height / 2];
    // Draw Radial and In-Track Axes
    ctx.strokeStyle = 'rgb(255,255,255)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(axis_center[0], 0);
    ctx.lineTo(axis_center[0], height);
    ctx.moveTo(0, axis_center[1]);
    ctx.lineTo(width, axis_center[1]);
    ctx.stroke();
    // Draw Markers
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.textAlign = "center";
    ctx.font = "20px Arial";
    ctx.lineWidth = 0.5;
    let point = axis_center[0] + 0,
        ii = 0;
    if (axis_center[1] < 0) {
        otherPoint = 0;
        // console.log('hey');
    } else if (axis_center[1] > height) {
        otherPoint = height;
    } else {
        otherPoint = axis_center[1]
    }
    axisStep = 20;
    while (point > 0) {
        // point -= 7.359 / limit / 2 * width;
        point -= axisStep / limit / 2 * width;
        // ctx.moveTo(point, otherPoint - height / 70);
        // ctx.lineTo(point, otherPoint + height / 70);
        ctx.moveTo(point, -height);
        ctx.lineTo(point, height);
        ii++;
        ctx.fillText(ii * axisStep, point, otherPoint + height / 30);
    }
    ii = 0;
    point = axis_center[0] + 0;
    while (point < width) {
        // point += 7.359 / limit / 2 * width;
        point += axisStep / limit / 2 * width;
        // ctx.moveTo(point, otherPoint - height / 70);
        // ctx.lineTo(point, otherPoint + height / 70);
        ctx.moveTo(point, -height);
        ctx.lineTo(point, height);
        ii++;
        ctx.fillText(-ii * axisStep, point, otherPoint + height / 30);
        // ctx.fillText(-ii*0.01,point, otherPoint + height / 30);
    }
    point = axis_center[1] + 0;
    ii = 0;
    if (axis_center[0] < 0) {
        otherPoint = 0;
    } else if (axis_center[0] > width) {
        otherPoint = width;
    } else {
        otherPoint = axis_center[0]
    }
    while (point < height) {
        point += axisStep / limit / 2 / yxRatio * height;
        // ctx.moveTo(otherPoint - height / 70, point);
        // ctx.lineTo(otherPoint + height / 70, point);
        ctx.moveTo(-width / 70, point);
        ctx.lineTo(width, point);
        ii++
        ctx.fillText(-ii * axisStep, otherPoint - height / 30, point + 5);
    }
    point = axis_center[1] + 0;
    ii = 0;
    while (point > 0) {
        point -= axisStep / limit / 2 / yxRatio * height;
        // ctx.moveTo(otherPoint - height / 70, point);
        // ctx.lineTo(otherPoint + height / 70, point);
        ctx.moveTo(-width / 70, point);
        ctx.lineTo(width, point);
        ii++
        ctx.fillText(ii * axisStep, otherPoint - height / 30, point + 5);
    }
    ctx.stroke()

}

function drawSatInfo(ctx, cnvs, limit, center, sat) {
    drawSatTrajectory(ctx, cnvs, limit, center, {
        satellite: sat,
        nBurns: main_app.scenario_data.burns_per_player,
        tBurns: main_app.turn_length
    });
    drawBurnPoints(sat.name);
}

function calculateBurnPoints(sat, burns, initial_state) {
    let n = 2 * Math.PI / 86164;
    let state = [
        [-initial_state[0] / 2 * Math.cos(initial_state[3] * Math.PI / 180) + initial_state[1]],
        [initial_state[0] * Math.sin(initial_state[3] * Math.PI / 180) + initial_state[2]],
        [initial_state[0] * n / 2 * Math.sin(initial_state[3] * Math.PI / 180)],
        [initial_state[0] * n * Math.cos(initial_state[3] * Math.PI / 180) - n * initial_state[1] * 3 / 2],
    ];
    state[2][0] += burns[0][0] / 1000;
    state[3][0] += burns[0][1] / 1000;
    let out_points = [state];
    let pRR = PhiRR(main_app.scenario_data.scenario_length * 3600 / main_app.scenario_data.burns_per_player),
        pRV = PhiRV(main_app.scenario_data.scenario_length * 3600 / main_app.scenario_data.burns_per_player),
        pVR = PhiVR(main_app.scenario_data.scenario_length * 3600 / main_app.scenario_data.burns_per_player),
        pVV = PhiVV(main_app.scenario_data.scenario_length * 3600 / main_app.scenario_data.burns_per_player);
    for (ii = 1; ii < burns.length; ii++) {
        r = math.add(math.multiply(pRR, out_points[ii - 1].slice(0, 2)), math.multiply(pRV, out_points[ii - 1].slice(2, 4)));
        v = math.add(math.multiply(pVR, out_points[ii - 1].slice(0, 2)), math.multiply(pVV, out_points[ii - 1].slice(2, 4)));
        v[0][0] += burns[ii][0] / 1000;
        v[1][0] += burns[ii][1] / 1000;
        // console.log(r);
        out_points.push(math.concat(r, v, 0));
    }

    return out_points;
}

function drawBurnPoints(sat) {
    let cnvs = $('#main-canvas')[0];
    let ctx = cnvs.getContext('2d');
    let pixel_point;
    ctx.fillStyle = 'black';
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = main_app.players[sat].color;
    main_app.players[sat].burn_points.forEach((point, ii) => {
        if (ii >= main_app.scenario_data.turn) {
            ctx.beginPath()
            pixel_point = getScreenPixel(cnvs, point[0][0], point[1][0], main_app.display_data.axis_limit, main_app.display_data.center);
            // ctx.fillRect(pixel_point[0] - 3, pixel_point[1] - 3, 6, 6);
            // ctx.strokeRect(pixel_point[0] - 3, pixel_point[1] - 3, 6, 6);
            ctx.arc(pixel_point[0], pixel_point[1], 7, 0, 2 * Math.PI);
            ctx.stroke();
        }
    })
}

function drawSatTrajectory(ctx, cnvs, limit, center, input_object) {
    let points, r, v, pixelPos;
    ctx.strokeStyle = input_object.satellite.color;
    ctx.lineWidth = 4;
    let nodes = 8;
    let pRR = PhiRR(input_object.tBurns * 3600 / nodes),
        pRV = PhiRV(input_object.tBurns * 3600 / nodes),
        pVR = PhiVR(input_object.tBurns * 3600 / nodes),
        pVV = PhiVV(input_object.tBurns * 3600 / nodes);
    for (let jj = 0; jj < input_object.satellite.burn_points.length; jj++) {
        // if (jj === main_app.scenario_data.turn) {
        //     ctx.globalAlpha = 0.75; // turns future trajectory transparent
        // }
        points = [];
        pixelPos = [];
        points.push(input_object.satellite.burn_points[jj]);
        pixelPos.push(getScreenPixel(cnvs, input_object.satellite.burn_points[jj][0], input_object.satellite.burn_points[jj][1], limit, center, true))
        for (ii = 0; ii < nodes; ii++) {
            r = math.add(math.multiply(pRR, points[ii].slice(0, 2)), math.multiply(pRV, points[ii].slice(2, 4)));
            v = math.add(math.multiply(pVR, points[ii].slice(0, 2)), math.multiply(pVV, points[ii].slice(2, 4)));
            points.push(math.concat(r, v, 0))
            pixelPos.push(getScreenPixel(cnvs, r[0][0], r[1][0], limit, center, true))
        }
        drawCurve(ctx, pixelPos, 1);
    }
    ctx.globalAlpha = 1;

}

function drawSatShape(ctx, location, ang = 0, size = 0.3, color = '#AAA', sunAngle = 0, transparency = 1) {
    let ct = Math.cos(ang * Math.PI / 180),
        st = Math.sin(ang * Math.PI / 180),
        R = [
            [ct, -st],
            [st, ct]
        ];
    ctx.save();
    ctx.beginPath();
    ctx.translate(location[0], location[1]);
    ctx.strokeStyle = color;
    var grd = ctx.createLinearGradient(-20 * size * Math.sin(-sunAngle), -20 * size * Math.cos(-sunAngle), 20 * size * Math.sin(-sunAngle), 20 * size * Math.cos(-sunAngle));
    grd.addColorStop(0, color);
    grd.addColorStop(1, "black");
    ctx.fillStyle = grd;
    ctx.lineWidth = 4 * size;
    ctx.globalAlpha = transparency;
    let sat = [
        // main body
        [-25, -25],
        [25, -25],
        [25, 25],
        [-25, 25],
        [-25, 0],
        //solar panel 1
        [-150, 12.5],
        [-150, -12.5],
        [-25, -12.5],
        [-25, 12.5],
        //solar panel 2
        [150, -12.5],
        [150, 12.5],
        [25, 12.5],
        [25, -12.5],
        //sensor
        [-9, -30],
        [9, -30],
        [4, -25],
        [-4, -25]
    ];

    let transformedSat = math.transpose(math.multiply(R, math.transpose(sat)));
    transformedSat = math.dotMultiply(transformedSat, size);
    ctx.moveTo(transformedSat[4][0], transformedSat[4][1])
    transformedSat.forEach((point, index) => {
        ctx.lineTo(point[0], point[1]);
        if (index === 4) {
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = color;
            ctx.strokeStyle = color;
            ctx.lineWidth = 0.7;
            ctx.beginPath();
            ctx.moveTo(transformedSat[8][0], transformedSat[8][1])
        } else if (index === 8) {
            ctx.fill();
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(transformedSat[12][0], transformedSat[12][1])
        } else if (index === 12) {
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = 'rgb(225,225,225)';
            ctx.beginPath();
            ctx.moveTo(transformedSat[16][0], transformedSat[16][1])
        }
    });
    ctx.fill();
    ctx.stroke();
    ctx.restore();
}

function drawArrow(ctx, pixelLocation, length = 15, angle = 0, color = 'rgba(255,255,0,0.5)', width = 6) {
    pixelX = pixelLocation[0];
    pixelY = pixelLocation[1];
    let ct = Math.cos(angle),
        st = Math.sin(angle);
    rotMat = [
        [ct, -st],
        [st, ct]
    ];
    // let arrow = [
    //     [0, -length *  2 + 10 * length / 60],
    //     [3, -length *  2 + 12 * length / 60],
    //     [0, -length *  2],
    //     [-3, -length * 2 + 12 * length / 60],
    //     [0, -length *  2 + 10 * length / 60]
    // ];
    let arrow = [
        [0, -length * 2 + 10 * length / 60],
        [3, -length * 2 + 12 * length / 60],
        [0, -length * 2],
        [-3, -length * 2 + 12 * length / 60],
        [0, -length * 2 + 10 * length / 60]
    ];
    let transformedArrow = math.transpose(math.multiply(rotMat, math.transpose(arrow)));
    ctx.save();
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.beginPath();
    // ctx.translate(cnvs.width / 2 - origin[0] * pixelX / 2 + main_app.display_data.center[0] * pixelX / 2, cnvs.heihgt / 2 + main_app.display_data.center[1] * pixelY * 2 - origin[1] * pixelY * 2);
    ctx.translate(pixelX, pixelY)
    ctx.moveTo(0, 0);
    transformedArrow.forEach((point) => {
        ctx.lineTo(point[0], point[1]);
    });
    ctx.lineWidth = width;
    ctx.stroke();
    ctx.fill();
    ctx.restore();
}

function setMouseCallbacks() {
    $('#main-canvas').mousedown(event => {
        if (main_app.display_data.shift_key) {
            let location;
            let click_location = [event.offsetX, event.offsetY];
            let cnvs = document.getElementById("main-canvas");
            // let ctx = cnvs.getContext('2d');
            for (player in main_app.players) {
                if (main_app.players[player].exist) {
                    location = main_app.players[player].current_state;
                    location = getScreenPixel(cnvs, location[0], location[1], main_app.display_data.axis_limit, main_app.display_data.center);
                    if (math.norm(math.subtract(click_location, location)) < 25) {
                        if (main_app.scenario_data.sat_data.target === null) {
                            main_app.scenario_data.sat_data.target = player;
                            $('#game-data-container').css({
                                "background-image": 'linear-gradient(135deg,' + main_app.players[main_app.scenario_data.sat_data.origin].color.slice(0, -2) + '0.45),rgba(0,0,0,0),' + main_app.players[main_app.scenario_data.sat_data.target].color.slice(0, -2) + '0.45))'
                            });
                        } else {
                            main_app.scenario_data.sat_data.origin = player;
                            main_app.scenario_data.sat_data.target = null;
                        }
                    }
                }
            }
            return;
        }
        main_app.scenario_data.mousedown_location = [event.offsetX, event.offsetY];
        let location_point = getScreenPoint(event.offsetX, event.offsetY, main_app.display_data.axis_limit, main_app.display_data.center);
        if (checkClose(location_point[0], location_point[1])) {
            let total_burn = 0;
            for (let ii = 0; ii < main_app.scenario_data.selected_burn_point.point; ii++) {
                total_burn += math.norm(main_app.players[main_app.scenario_data.selected_burn_point.satellite].burns[ii]);
            }
            for (let ii = main_app.scenario_data.selected_burn_point.point; ii < main_app.scenario_data.burns_per_player; ii++) {
                main_app.players[main_app.scenario_data.selected_burn_point.satellite].burns.splice(ii, 1, [0, 0]);
            }
            main_app.scenario_data.tactic_data = ['burn', math.min(main_app.players[main_app.scenario_data.selected_burn_point.satellite].scenario_fuel - total_burn, main_app.players[main_app.scenario_data.selected_burn_point.satellite].turn_fuel)]
            setTimeout(() => {
                let newPoint = getScreenPoint(main_app.scenario_data.mousemove_location[0], main_app.scenario_data.mousemove_location[1], main_app.display_data.axis_limit, main_app.display_data.center);
                if (math.norm(math.subtract(location_point, newPoint)) < main_app.display_data.axis_limit / 50 && main_app.scenario_data.mousedown_location !== null) {
                    main_app.scenario_data.tactic_data = ['target', main_app.scenario_data.scenario_length / main_app.scenario_data.burns_per_player, main_app.players[main_app.scenario_data.selected_burn_point.satellite].burn_points[main_app.scenario_data.selected_burn_point.point].slice(2, 4), main_app.scenario_data.tactic_data[1]];
                    main_app.scenario_data.target_display = 0;
                }
            }, 250)
            return;
        }
        main_app.display_data.drag_data = [
            [event.offsetX, event.offsetY],
            [...main_app.display_data.center]
        ];
    })
    $('#main-canvas').mousemove(event => {
        main_app.scenario_data.mousemove_location = [event.offsetX, event.offsetY];
        let cart_point = getScreenPoint(event.offsetX, event.offsetY, main_app.display_data.axis_limit, main_app.display_data.center);
        if (main_app.scenario_data.tactic_data !== null) {
            switch (main_app.scenario_data.tactic_data[0]) {
                case 'burn':
                    burnCalc(main_app.scenario_data.selected_burn_point, [event.offsetX, event.offsetY]);
                    break;
                case 'target':
                    targetCalc(main_app.scenario_data.selected_burn_point, math.transpose([cart_point]));
                default:
                    break;
            }
        }
        let easement = 0.5;
        if (main_app.display_data.drag_data !== null) {
            let targetCenterX = (event.offsetX - main_app.display_data.drag_data[0][0]) * 2 * main_app.display_data.axis_limit / main_app.display_data.width + main_app.display_data.drag_data[1][0];
            let targetCenterY = (event.offsetY - main_app.display_data.drag_data[0][1]) * 2 * main_app.display_data.axis_limit / main_app.display_data.width + main_app.display_data.drag_data[1][1];
            main_app.display_data.center[0] = (targetCenterX - main_app.display_data.center[0]) * easement + main_app.display_data.center[0];
            main_app.display_data.center[1] = (targetCenterY - main_app.display_data.center[1]) * easement + main_app.display_data.center[1];
        }
    })
    $('#main-canvas').mouseup(() => {
        main_app.scenario_data.mousedown_location = null;
        main_app.scenario_data.tactic_data = ['none'];
        if (main_app.display_data.drag_data !== null) {
            main_app.display_data.drag_data = null;
        }
    })
    $('#main-canvas').on('mousewheel', event => {
        if (main_app.scenario_data.tactic_data[0] === 'target') {
            if (main_app.scenario_data.tactic_data[1] > 1 || event.deltaY > 0) {
                main_app.scenario_data.tactic_data[1] += event.deltaY / 10
            }
            let cart_point = getScreenPoint(event.offsetX, event.offsetY, main_app.display_data.axis_limit, main_app.display_data.center);
            targetCalc(main_app.scenario_data.selected_burn_point, math.transpose([cart_point]));
            return;
        }
        if (main_app.display_data.axis_limit > 2 || event.deltaY < 0) {
            main_app.display_data.axis_limit -= event.deltaY * 2;
        }
    })
    window.addEventListener('keydown', (event) => {
        if (event.key === 'Shift') {
            main_app.display_data.shift_key = true;
        }
    })
    window.addEventListener('keyup', (event) => {
        if (event.key === 'Shift') {
            main_app.display_data.shift_key = false;
            if (main_app.scenario_data.sat_data.target === null) {
                main_app.scenario_data.sat_data.origin = 'blue';
                main_app.scenario_data.sat_data.target = 'red';
            }
        }
    })
}

setMouseCallbacks();
resizeCanvas();
window.requestAnimationFrame(animation);
$("input[name='player']")[0].checked = true;
for (player in main_app.players) {
    main_app.players[player].burns = math.zeros(main_app.scenario_data.burns_per_player, 2)._data;
}
fetch(main_app.fetchURL + '/games').then(res => res.json()).then(res => {
    main_app.games = res;
}).catch(err => alert(err))


function animation(time) {
    // console.time()
    main_app.updateScreen();
    if (main_app.display_data.update_time) {
        let expected_time;
        if (main_app.scenario_data.tactic_data[0] === 'target') {
            expected_time = main_app.scenario_data.selected_burn_point.point * main_app.turn_length + main_app.scenario_data.tactic_data[1];
        } else {
            expected_time = main_app.scenario_data.turn * main_app.turn_length;
        }
        let game_time = Number(main_app.scenario_data.game_time);
        if (Math.abs(expected_time - game_time) > 1 / 10) {
            game_time += Math.sign(expected_time - game_time) * 1 / 10;
        } else {
            game_time = expected_time;
        }
        $('#time-slider input').val(game_time);
        main_app.scenario_data.game_time = game_time;
        main_app.scenario_data.game_time_string = hrsToTime(main_app.scenario_data.game_time);
    }
    window.requestAnimationFrame(animation);
}

function PhiRR(t, n = 2 * Math.PI / 86164) {
    let nt = n * t;
    return [
        [4 - 3 * Math.cos(nt), 0],
        [6 * (Math.sin(nt) - nt), 1]
    ];
}

function PhiRV(t, n = 2 * Math.PI / 86164) {
    let nt = n * t;
    return [
        [Math.sin(nt) / n, 2 * (1 - Math.cos(nt)) / n],
        [(Math.cos(nt) - 1) * 2 / n, (4 * Math.sin(nt) - 3 * nt) / n]
    ];
}

function PhiVR(t, n = 2 * Math.PI / 86164) {
    let nt = n * t;
    return [
        [3 * n * Math.sin(nt), 0],
        [6 * n * (Math.cos(nt) - 1), 0]
    ];
}

function PhiVV(t, n = 2 * Math.PI / 86164) {
    let nt = n * t;
    return [
        [Math.cos(nt), 2 * Math.sin(nt)],
        [-2 * Math.sin(nt), 4 * Math.cos(nt) - 3]
    ];
}

function drawCurve(ctx, points, tension, type = 'stroke') {
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);

    var t = (tension != null) ? tension : 1;
    // console.log(t,points)
    for (var i = 0; i < points.length - 1; i++) {
        var p0 = (i > 0) ? points[i - 1] : points[0];
        var p1 = points[i];
        var p2 = points[i + 1];
        var p3 = (i != points.length - 2) ? points[i + 2] : p2;

        var cp1x = p1.x + (p2.x - p0.x) / 6 * t;
        var cp1y = p1.y + (p2.y - p0.y) / 6 * t;

        var cp2x = p2.x - (p3.x - p1.x) / 6 * t;
        var cp2y = p2.y - (p3.y - p1.y) / 6 * t;

        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
        // console.log(cp1x, cp1y, cp2x, cp2y)
    }
    if (type === 'stroke') {
        ctx.stroke();
    } else {
        ctx.fill();
    }
}

function checkClose(x, y, change = true) {
    let xPoint, yPoint;
    let turn = math.ceil(main_app.scenario_data.game_time / main_app.scenario_data.scenario_length * main_app.scenario_data.burns_per_player);
    for (sat in main_app.players) {
        for (var ii = turn; ii < main_app.players[sat].burn_points.length; ii++) {
            xPoint = main_app.players[sat].burn_points[ii][1][0];
            yPoint = main_app.players[sat].burn_points[ii][0][0];
            if (math.norm([xPoint - x, yPoint - y]) < main_app.display_data.axis_limit / 50) {
                if (change) {
                    main_app.scenario_data.selected_burn_point = {
                        satellite: sat,
                        point: ii
                    }
                }
                return true;
            }
        }
    }
    return false;
}

function calcCurrentPoint(curTime, sat, pRR, pRV, pVR, pVV) {
    let priorWaypoint = Math.floor(curTime / (main_app.scenario_data.scenario_length / main_app.scenario_data.burns_per_player));
    priorWaypoint = priorWaypoint > (main_app.scenario_data.burns_per_player - 1) ? main_app.scenario_data.burns_per_player - 1 : priorWaypoint;
    let timeDelta = 3600 * (curTime - priorWaypoint * main_app.scenario_data.scenario_length / main_app.scenario_data.burns_per_player);
    pRR = PhiRR(timeDelta);
    pRV = PhiRV(timeDelta);
    pVR = PhiVR(timeDelta);
    pVV = PhiVV(timeDelta);
    let waypointState = [...main_app.players[sat].burn_points[priorWaypoint]]
    let r = math.add(math.multiply(pRR, waypointState.slice(0, 2)), math.multiply(pRV, waypointState.slice(2, 4)));
    let v = math.add(math.multiply(pVR, waypointState.slice(0, 2)), math.multiply(pVV, waypointState.slice(2, 4)));
    return math.concat(math.squeeze(r), math.squeeze(v), 0);
}

function burnCalc(sat, position2) {
    let position1 = main_app.scenario_data.mousedown_location;
    let rel = math.subtract(position1, position2);
    rel = rel.reverse();
    let dist = math.norm(rel);
    dist = dist < 1e-6 ? 1 : dist;
    let magnitude = dist / 60;
    if (sat.satellite === main_app.scenario_data.player || !main_app.scenario_data.server) {
        magnitude = magnitude > main_app.scenario_data.tactic_data[1] ? main_app.scenario_data.tactic_data[1] : magnitude;
    }
    main_app.players[sat.satellite].burns.splice(sat.point, 1, math.dotMultiply(magnitude, math.dotDivide(rel, dist)))
    main_app.players[sat.satellite].burn_total = math.norm(main_app.players[sat.satellite].burns[ii]);
}

function targetCalc(sat, r2) {
    let r1 = main_app.players[sat.satellite].burn_points[sat.point].slice(0, 2),
        v10 = main_app.scenario_data.tactic_data[2];
    r2 = r2.reverse();
    let v1f = math.multiply(math.inv(PhiRV(3600 * main_app.scenario_data.tactic_data[1])), math.subtract(r2, math.multiply(PhiRR(3600 * main_app.scenario_data.tactic_data[1]), r1)));
    let dV = math.squeeze(math.transpose(math.subtract(v1f, v10)));
    dV = math.norm(dV) > main_app.scenario_data.tactic_data[3] / 1000 ? math.dotMultiply(main_app.scenario_data.tactic_data[3] / 1000, math.dotDivide(dV, math.norm(dV))) : dV;
    main_app.players[sat.satellite].burns.splice(sat.point, 1, math.dotMultiply(dV, 1000));
}

function drawTargetLimit(ctx, cnvs, sat, dV, t) {
    let first_state = main_app.players[sat].burn_points[main_app.scenario_data.selected_burn_point.point];
    // console.log(first_state, sat, main_app.scenario_data.selected_burn_point)
    let r = first_state.slice(0, 2);
    let v = main_app.scenario_data.tactic_data[2];
    // console.log(r,v)
    let ang, dVcomponents, r2, pixelPos = [];
    let pRR = PhiRR(t * 3600),
        pRV = PhiRV(t * 3600);
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    for (ii = 0; ii <= 20; ii++) {
        ang = 2 * Math.PI * ii / 20;
        dVcomponents = [
            [dV * Math.cos(ang)],
            [dV * Math.sin(ang)]
        ];
        r2 = math.add(math.multiply(pRR, r), math.multiply(pRV, math.add(v, dVcomponents)));
        pixelPos.push(getScreenPixel(cnvs, r2[0][0], r2[1][0], main_app.display_data.axis_limit, main_app.display_data.center, true));
    }
    drawCurve(ctx, pixelPos)
    drawCurve(ctx, pixelPos, 1, 'fill')
}

function hrsToTime(hrs) {
    hrs = Math.round(hrs * 100) / 100; // rounding to truncate and not have for example 2.9999999 instead of 3, producing 2:59 instread of 3:00
    return ("0" + Math.floor(hrs)).slice(-2) + ':' + ('0' + Math.floor(60 * (hrs - Math.floor(hrs)))).slice(-2);
}