class Player {
    constructor(name, initial, color, exist) {
        this.name = name;
        this.initial_state = initial;
        this.color = color;
        this.exist = exist;
        this.burn_change = {
                old_burn: null,
                new_burn: null,
                change: 1
            },
            this.current_state = null;
        this.burns = [];
        this.burn_points = [];
        this.traj = [];
        this.burn_total = 0;
        this.burned = true;
        this.angle = 0;
        this.scenario_fuel = 6;
        this.turn_fuel = 1;
        this.required_cats = [0, 90];
        this.max_range = 30;
        this.target = 'closest';
        this.engine = null;
        this.focus = false;
        this.burnTip = 'yep';
        this.display = {
            thickness: 4,
            opacity: 1,
            point: 5
        }
        this.uncertainty = {
            magnitude: 0,
            direction: 0,
            failure: 0
        }
    }
}


var main_app = new Vue({
    el: "#main-app",
    data: {
        // fetchURL: 'http://localhost:5000/first-firebase-app-964fe/us-central1/app',
        // fetchURL: 'https://us-central1-first-firebase-app-964fe.cloudfunctions.net/app',
        fetchURL: 'https://rposimapi.glitch.me/',
        games: [],
        chosenGamePlayers: [],
        players: {
            blue: new Player('blue', [20, 20, 0, 0], 'rgba(100,150,255,1)', true),
            red: new Player('red', [30, 0, 0, 0], 'rgba(255,150,100,1)', true),
            green: new Player('green', [30, 30, 0, 0], 'rgba(120,255,120,1)', false),
            gray: new Player('gray', [30, -30, 0, 0], 'rgba(150,150,150,1)', false),
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
                    relative: [0,0],
                    poca: 0
                }
            },
            server: false,
            gameId: '',
            player: '',
            playerFail: {
                blue: 0,
                red: 0,
                gray: 0,
                green: 0
            },
            selected_burn_point: null,
            game_started: false,
            game_time: 0,
            game_time_string: '00:00',
            target_display: 1,
            mousedown_location: null,
            mousemove_location: null,
            tactic_data: ['none'],
            turn: 0,
            opposingTurn: 0,
            timeOld: 0,
            turnTime: 0,
            turnLimit: 0,
            nodes: 8,
            updating: false
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
            transition: false,
            rangeExtended: false
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
            // Calculate Player Burns
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
                        this.players[sat].burned = true;

                    } else {
                        calcBurns = this.players[sat].burns;
                    }
                    calcSatTrajectory(ctx, cnvs, {
                        sat: this.players[sat],
                        nBurns: this.scenario_data.burns_per_player,
                        tBurns: this.turn_length,
                        burns: this.players[sat].burn_change.change < 1 ? calcBurns : this.players[sat].burns
                    });
                    this.players[sat].current_state = calcCurrentPoint(this.scenario_data.game_time, sat);
                }
            }
            // Draw Sun
            let sunPos;
            if (this.scenario_data.sat_data.target === null) {
                sunPos = [0, 0];
            } else {
                sunPos = this.players[this.scenario_data.sat_data.target].current_state || [0, 0];
            }
            drawArrow(ctx, getScreenPixel(cnvs, sunPos[0], sunPos[1], this.display_data.axis_limit, this.display_data.center), 135, -this.scenario_data.init_sun_angl * Math.PI / 180 + 2 * Math.PI / 86164 * this.scenario_data.game_time * 3600, 'rgba(150,150,50,1)', 9);
            if (this.scenario_data.game_started) {
                drawAnimations(cnvs, ctx, this.display_data.center, this.display_data.axis_limit);
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

            // Draw reachability if planning targeted maneuver
            if (main_app.scenario_data.tactic_data[0] === 'target') {
                if ((1 - main_app.scenario_data.target_display) > 1e-6) {
                    main_app.scenario_data.target_display += 0.08333333;
                }
                drawTargetLimit(ctx, cnvs, main_app.scenario_data.selected_burn_point.satellite, main_app.scenario_data.tactic_data[3] / 1000, main_app.scenario_data.tactic_data[1] * this.scenario_data.target_display)
            }
            // Draw trajectory, burn points, and burn directions
            for (sat in this.players) {
                if (this.players[sat].exist) {
                    drawSatData(ctx, cnvs, this.players[sat]);
                }
            }
            // Draw satellite picture at current position for players that exist
            for (sat in this.players) {
                if (this.players[sat].exist) {
                    drawSatShape(ctx, getScreenPixel(cnvs, this.players[sat].current_state[0], this.players[sat].current_state[1], this.display_data.axis_limit, this.display_data.center), this.players[sat].angle, 0.25, this.players[sat].color);
                }
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
            if (this.scenario_data.player === 'referee') {
                this.getGameData();
                return;
            }
            if (this.scenario_data.turn > this.scenario_data.opposingTurn && this.scenario_data.server) {
                return;
            }
            let blueBurns = this.players[this.scenario_data.player].burns.map((burn, ii) => {
                if (ii === this.scenario_data.turn) {
                    if (Math.random() < this.players[this.scenario_data.player].uncertainty.failure / 100) {
                        burn = [0, 0];
                    }
                    else {
                        let burnN = math.norm(burn);
                        let burnD = math.atan2(burn[1], burn[0]) * 180 / Math.PI;
                        burnN += burnN * (this.players[this.scenario_data.player].uncertainty.magnitude / 100) * normalRandom();
                        burnD +=  this.players[this.scenario_data.player].uncertainty.direction * normalRandom();
                        burn = [burnN * Math.cos(burnD * Math.PI / 180), burnN * Math.sin(burnD * Math.PI / 180)];
                    }

                }
                return burn;
            })
            this.scenario_data.turn++;

            console.log(blueBurns);
            if (!this.scenario_data.server) {
                return;
            }
            this.scenario_data.turnTime = 0;
            let burnData = blueBurns.map((burn, ii) => {
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
            let response = await fetch(this.fetchURL + '/update/' + this.scenario_data.gameId + '/' + this.scenario_data.player, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(outData)
            });
            response = await response.json();
            if (!response.resp && math.norm(blueBurns[this.scenario_data.turn - 1]) > 1e-6) {
                blueBurns[this.scenario_data.turn - 1] = [0,0];
                alert('Burn Failed');
            }
            this.players[this.scenario_data.player].burn_change.old = [...this.players[this.scenario_data.player].burns];
            this.players[this.scenario_data.player].burn_change.new = blueBurns;
            this.players[this.scenario_data.player].burn_change.change = 0;
            this.players[this.scenario_data.player].burned = true;
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
                    this.scenario_data.turnLimit = $('#turn-time').val() === "" ? 0 : Number($('#turn-time').val()) * 1000;
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
                            turn: 0,
                        });
                    }
                    let outData = {
                        players: outPlayers,
                        scenarioConditions: {
                            initSun: this.scenario_data.init_sun_angl,
                            gameLength: this.scenario_data.scenario_length,
                            nBurns: this.scenario_data.burns_per_player,
                            turnLength: $('#turn-time').val() === "" ? 0 : Number($('#turn-time').val()) * 1000
                        },
                        name: $('#game-name').val()
                    }
                    this.scenario_data.player = 'referee';
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
                    this.scenario_data.updating = true;
                    let response = await fetch(this.fetchURL + '/games');
                    response = await response.json();
                    this.games = response;
                    this.scenario_data.updating = false;
                    break;
                case 'start-join':
                    let responseJoin = await fetch(this.fetchURL + '/games/' + $('#join-game').val());

                    responseJoin = await responseJoin.json();
                    let playerJoin = responseJoin.players.filter(player => {
                        return player.name === $('#team-select').val();
                    });
                    this.scenario_data.turn = playerJoin.length === 0 ? 0 : playerJoin[0].turn;
                    this.players.blue.exist = false;
                    this.players.green.exist = false;
                    this.players.red.exist = false;
                    this.players.gray.exist = false;
                    responseJoin.players.forEach(player => {
                        Object.assign(this.players[player.name], {
                            exist: true,
                            initial_state: player.initState,
                            burns: player.burns,
                            required_cats: player.cats,
                            max_range: player.range,
                            scenario_fuel: player.fuel,
                            turn_fuel: player.turn_fuel,
                            burned: true
                        })
                    })
                    Object.assign(this.scenario_data, {
                        scenario_length: responseJoin.scenarioConditions.gameLength,
                        burns_per_player: responseJoin.scenarioConditions.nBurns,
                        init_sun_angl: responseJoin.scenarioConditions.initSun,
                        turnLimit: responseJoin.scenarioConditions.turnLength,
                        server: true,
                        gameId: responseJoin._id,
                        player: $('#team-select').val()
                    });
                    setTimeout(this.startGame, 500);
                    break;
                case 'start-delete':
                    await fetch(this.fetchURL + '/' + $('#join-game').val(), {
                        method: 'DELETE'
                    });
                    this.games = this.games.filter(game => game._id !== $('#join-game').val());
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
            if (this.scenario_data.player !== 'referee') {
                $('#turn-button').css('color', this.players[this.scenario_data.player].color);
            }
            $('#data-container').animate({
                opacity: 0
            }, 500, () => {
                $('#data-container').css('width', '50%');
            })
            let $cvns = $('canvas')[0];
            let del_height = window.innerHeight - $cvns.height;
            let del_width = window.innerWidth - $cvns.width;
            let int_ii = 0;

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
            if (this.scenario_data.player === 'referee') {
                return;
            }
            setInterval(this.getGameData, 5000);
        },
        add_player: function () {
            if (!this.players.green.exist) {
                this.players.green.exist = true;
            } else {
                this.players.gray.exist = true;
            }
        },
        changeNumBurns: function () {
            this.scenario_data.burns_per_player = this.scenario_data.burns_per_player === 0 || this.scenario_data.burns_per_player === '' ? 1 : this.scenario_data.burns_per_player;
            for (player in this.players) {
                this.players[player].burns = math.zeros(this.scenario_data.burns_per_player, 2)._data;
                this.players[player].burned = true;
            }
        },
        initialChange: function (player) {
            this.scenario_data.scenario_length = this.scenario_data.scenario_length < 5 || this.scenario_data.scenario_length === '' ? 5 : this.scenario_data.scenario_length;
            
            if (player === 'all') {
                for (let player in this.players) {
                    this.players[player].burned = true;
                }
                return;
            }
            this.players[player].burned = true;
        },
        getGameData: async function() {
            if (this.scenario_data.turn <= this.scenario_data.opposingTurn && this.scenario_data.player !== 'referee') {
                if (this.scenario_data.turnLimit !== 0 && this.scenario_data.turnTime === 0) {
                    this.scenario_data.turnTime = this.scenario_data.turnLimit;
                    console.log(this.scenario_data.turnTime);
                }
                return;
            }
            let responseInt = await fetch(this.fetchURL + '/games/' + this.scenario_data.gameId);
            responseInt = await responseInt.json();
            this.scenario_data.opposingTurn = math.min(responseInt.players.map(player => {
                return player.turn;
            }));
            if (this.scenario_data.player !== 'referee') {
                let serverTurn = responseInt.players.filter(player => {
                    console.log(player.name === this.scenario_data.player);
                    return player.name === this.scenario_data.player
                });
                if (serverTurn[0].turn < this.scenario_data.turn) {
                    this.scenario_data.turn--;
                    this.turn_button_click();
                    return;
                }
            }
            this.scenario_data.turn = this.scenario_data.player === 'referee' ? this.scenario_data.opposingTurn + 0 : this.scenario_data.turn;
            if (this.scenario_data.turn === this.scenario_data.opposingTurn && this.scenario_data.player !== 'referee') {
                this.scenario_data.turnTime = this.scenario_data.turnLimit;
                console.log(this.scenario_data.turnTime);
            }
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
                    this.players[player.name].burned = true;
                }
            })
        },
        setPlayerFail: async function(player) {
            let outData = {
                player: player,
                failRate: this.scenario_data.playerFail[player]
            };
            let response = await fetch(this.fetchURL + '/referee/' + this.scenario_data.gameId, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(outData)
            });
            await response.json();
            alert(`${player.toUpperCase()} fail rate updated to ${outData.failRate}%`)
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


window.addEventListener('resize', resizeCanvas);

function calcData(origin, target) {
    if (main_app.scenario_data.sat_data.target === null) {
        return;
    }
    let rel_vector = math.subtract(main_app.players[origin].current_state.slice(0, 2), main_app.players[target].current_state.slice(0, 2));
    let rel_velocity = math.subtract(main_app.players[origin].current_state.slice(2, 4), main_app.players[target].current_state.slice(2, 4));
    main_app.scenario_data.sat_data.data.relative = rel_vector;
    main_app.scenario_data.sat_data.data.range_rate = math.dot(rel_vector, rel_velocity) / math.norm(rel_vector) * 1000;
    main_app.scenario_data.sat_data.data.range = math.norm(rel_vector);
    let sunVector = [
        [Math.cos(-main_app.scenario_data.init_sun_angl * Math.PI / 180 + 2 * Math.PI / 86164 * main_app.scenario_data.game_time * 3600)],
        [-Math.sin(-main_app.scenario_data.init_sun_angl * Math.PI / 180 + 2 * Math.PI / 86164 * main_app.scenario_data.game_time * 3600)]
    ];
    main_app.scenario_data.sat_data.data.cats = Math.acos(math.dot(rel_vector, sunVector) / math.norm(rel_vector)) * 180 / Math.PI;
    for (let player in main_app.players) {
        if (main_app.players[player].target === "closest") {
            continue;
        } else if (main_app.players[player].exist && main_app.players[player].target !== null && main_app.players[main_app.players[player].target].current_state !== null) {
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
    } else if (axis_center[1] > height) {
        otherPoint = height;
    } else {
        otherPoint = axis_center[1]
    }
    axisStep = Math.floor(limit / 50) * 10;
    if (limit / 50 < 0.1) {
        axisStep = 1;
    }
    else if (limit / 50 < 0.5) {
        axisStep = 2;
    }
    else if (axisStep === 0) {
        axisStep = 5;
    }
    while (point > 0) {
        point -= axisStep / limit / 2 * width;
        ctx.moveTo(point, -height);
        ctx.lineTo(point, height);
        ii++;
        ctx.fillText(ii * axisStep, point, otherPoint + height / 30);
    }
    ii = 0;
    point = axis_center[0] + 0;
    while (point < width) {
        point += axisStep / limit / 2 * width;
        ctx.moveTo(point, -height);
        ctx.lineTo(point, height);
        ii++;
        ctx.fillText(-ii * axisStep, point, otherPoint + height / 30);
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
        ctx.moveTo(-width / 70, point);
        ctx.lineTo(width, point);
        ii++
        ctx.fillText(-ii * axisStep, otherPoint - height / 30, point + 5);
    }
    point = axis_center[1] + 0;
    ii = 0;
    while (point > 0) {
        point -= axisStep / limit / 2 / yxRatio * height;
        ctx.moveTo(-width / 70, point);
        ctx.lineTo(width, point);
        ii++
        ctx.fillText(ii * axisStep, otherPoint - height / 30, point + 5);
    }
    ctx.stroke()

}

function drawSatData(ctx, cnvs, sat) {
    // Draw trajectory of satellite
    let points = sat.traj.map(point => {
        return getScreenPixel(cnvs, point[0][0], point[1][0], main_app.display_data.axis_limit, main_app.display_data.center, true);
    })
    ctx.globalAlpha = sat.display.opacity;
    for (let ii = 1; ii < points.length - 1; ii += main_app.scenario_data.nodes) {
        ctx.strokeStyle = 'rgba(30, 30, 50)';
        ctx.lineWidth = sat.display.thickness * 2;
        drawCurve(ctx, points.slice(ii - 1, ii + main_app.scenario_data.nodes), 1);
        ctx.strokeStyle = sat.color;
        ctx.lineWidth = sat.display.thickness;
        drawCurve(ctx, points.slice(ii - 1, ii + main_app.scenario_data.nodes), 1);
    }

    // Draw burn currently being planned if associated with satellite
    if (main_app.scenario_data.selected_burn_point !== null && main_app.scenario_data.selected_burn_point.satellite === sat.name) {
        let location = sat.burn_points[main_app.scenario_data.selected_burn_point.point];
        let burn = sat.burns[main_app.scenario_data.selected_burn_point.point];
        let burnN = math.norm(burn);
        if (burnN > 1e-6) {
            drawArrow(ctx, getScreenPixel(cnvs, location[0][0], location[1][0], main_app.display_data.axis_limit, main_app.display_data.center), 90 * burnN, Math.atan2(-burn[1], burn[0]), sat.color, 4);
        }
    }

    // Draw all burns if mouse hovering over satellite on side
    if (sat.focus) {
        sat.burns.forEach((burn, ii) => {
            let location = sat.burn_points[ii];
            let burnN = math.norm(burn);
            drawArrow(ctx, getScreenPixel(cnvs, location[0][0], location[1][0], main_app.display_data.axis_limit, main_app.display_data.center), 90 * burnN, Math.atan2(-burn[1], burn[0]), sat.color, 4);
        });
    }

    // Draw burn points
    ctx.lineWidth = sat.display.thickness;
    ctx.strokeStyle = sat.color;
    ctx.fillStyle = 'rgba(30, 30, 50)';
    let pixel_point;
    let burn_turn = main_app.scenario_data.server ? main_app.scenario_data.turn : Number(main_app.scenario_data.game_time) / main_app.turn_length;
    sat.burn_points.forEach((point, ii) => {
        if (ii >= burn_turn) {
            ctx.beginPath()
            pixel_point = getScreenPixel(cnvs, point[0][0], point[1][0], main_app.display_data.axis_limit, main_app.display_data.center);
            ctx.arc(pixel_point[0], pixel_point[1], sat.display.point, 0, 2 * Math.PI);
            ctx.stroke();
            ctx.fill();
        }
    })
    ctx.globalAlpha = 1;
}

function calcSatTrajectory(ctx, cnvs, options) {
    let {
        sat,
        tBurns,
        nBurns,
        burns
    } = options;
    if (!sat.burned) {
        return;
    }
    let n = 2 * Math.PI / 86164;
    let nodes = main_app.scenario_data.nodes / 2 * main_app.turn_length;
    nodes = nodes < 2 ? 2 : nodes;
    let pRR = PhiRR(tBurns * 3600 / nodes),
        pRV = PhiRV(tBurns * 3600 / nodes),
        pVR = PhiVR(tBurns * 3600 / nodes),
        pVV = PhiVV(tBurns * 3600 / nodes),
        r = [
            [-sat.initial_state[0] / 2 * Math.cos(sat.initial_state[3] * Math.PI / 180) + sat.initial_state[1]],
            [sat.initial_state[0] * Math.sin(sat.initial_state[3] * Math.PI / 180) + sat.initial_state[2]]
        ],
        v = [
            [sat.initial_state[0] * n / 2 * Math.sin(sat.initial_state[3] * Math.PI / 180)],
            [sat.initial_state[0] * n * Math.cos(sat.initial_state[3] * Math.PI / 180) - n * sat.initial_state[1] * 3 / 2]
        ],
        r1;
    ctx.lineWidth = 4;
    ctx.strokeStyle = sat.color;
    sat.burn_points = [];
    sat.traj = [];
    sat.traj.push(r);
    v = math.add(v, math.dotDivide(math.transpose([burns[0]]), 1000));
    sat.burn_points.push(math.concat(r, v, 0));
    for (let burn_point = 0; burn_point < nBurns; burn_point++) {
        for (node = 0; node < nodes; node++) {
            r1 = math.add(math.multiply(pRR, r), math.multiply(pRV, v));
            v = math.add(math.multiply(pVR, r), math.multiply(pVV, v));
            r = r1;
            sat.traj.push(r);
        }
        if (burn_point < nBurns - 1) {
            v = math.add(v, math.dotDivide(math.transpose([burns[burn_point + 1]]), 1000));
        }
        sat.burn_points.push(math.concat(r, v, 0));
    }
    sat.burn_points.pop();
    sat.burned = false;
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
    ctx.strokeStyle = 'rgb(30, 30, 50)';
    // var grd = ctx.createLinearGradient(-20 * size * Math.sin(-sunAngle), -20 * size * Math.cos(-sunAngle), 20 * size * Math.sin(-sunAngle), 20 * size * Math.cos(-sunAngle));
    // grd.addColorStop(0, color);
    // grd.addColorStop(1, "black");
    ctx.fillStyle = changeRgb(color, 1.5);
    ctx.lineWidth = 8 * size;
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
            ctx.fillStyle = changeRgb(color, 0.5);
            ctx.strokeStyle = 'rgb(30, 30, 50)';
            // ctx.lineWidth = 2;
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

function drawArrow(ctx, pixelLocation, length = 30, angle = 0, color = 'rgba(255,255,0,1)', width = 6) {
    let pixelX = pixelLocation[0];
    let pixelY = pixelLocation[1];
    let ct = Math.cos(angle),
        st = Math.sin(angle);
    let rotMat = [
        [ct, -st],
        [st, ct]
    ];
    let arrow = [
        [-0.125, 0],
        [-0.125, -1.5],
        [-0.23, -1.5],
        [0, -2],
        [0.23, -1.5],
        [0.125, -1.5],
        [0.125, 0],
        [0, 0]
    ];
    let transformedArrow = math.dotMultiply(math.transpose(math.multiply(rotMat, math.transpose(arrow))), length / 2);
    ctx.save();
    ctx.fillStyle = 'rgba(30, 30, 50, 0.35)';
    ctx.strokeStyle = 'rgb(30, 30, 50)';
    ctx.beginPath();
    ctx.translate(pixelX, pixelY)
    ctx.moveTo(0, 0);
    transformedArrow.forEach((point) => {
        ctx.lineTo(point[0], point[1]);
    });
    ctx.fill();
    ctx.lineWidth = 8 * length / 80;
    ctx.stroke();
    ctx.strokeStyle = color;
    ctx.lineWidth = 4 * length / 80;
    ctx.stroke();
    ctx.restore();
}

(function setMouseCallbacks() {
    $(window).mousedown(event => {
        // If shift key down, change data players
        if (event.target.className === 'slider') {
            return;
        }
        if (main_app.display_data.shift_key) {
            let location;
            let click_location = [event.pageX, event.pageY];
            let cnvs = document.getElementById("main-canvas");
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
        main_app.scenario_data.mousedown_location = [event.pageX, event.pageY];
        let location_point = getScreenPoint(event.pageX, event.pageY, main_app.display_data.axis_limit, main_app.display_data.center);
        if (checkClose(location_point[0], location_point[1], true, cnvs.width) && main_app.scenario_data.player !== 'referee') {
            main_app.players[main_app.scenario_data.selected_burn_point.satellite].burned = true;
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
            [event.pageX, event.pageY],
            [...main_app.display_data.center]
        ];
    })
    $(window).mousemove(event => {
        main_app.scenario_data.mousemove_location = [event.pageX, event.pageY];
        let cart_point = getScreenPoint(event.pageX, event.pageY, main_app.display_data.axis_limit, main_app.display_data.center);
        if (main_app.scenario_data.tactic_data !== null) {
            switch (main_app.scenario_data.tactic_data[0]) {
                case 'burn':
                    burnCalc(main_app.scenario_data.selected_burn_point, [event.pageX, event.pageY]);
                    break;
                case 'target':
                    targetCalc(main_app.scenario_data.selected_burn_point, math.transpose([cart_point]));
                default:
                    break;
            }
        }
        let easement = 0.5;
        if (main_app.display_data.drag_data !== null) {
            let targetCenterX = (event.pageX - main_app.display_data.drag_data[0][0]) * 2 * main_app.display_data.axis_limit / main_app.display_data.width + main_app.display_data.drag_data[1][0];
            let targetCenterY = (event.pageY - main_app.display_data.drag_data[0][1]) * 2 * main_app.display_data.axis_limit / main_app.display_data.width + main_app.display_data.drag_data[1][1];
            main_app.display_data.center[0] = (targetCenterX - main_app.display_data.center[0]) * easement + main_app.display_data.center[0];
            main_app.display_data.center[1] = (targetCenterY - main_app.display_data.center[1]) * easement + main_app.display_data.center[1];
        }
    })
    $(window).mouseup(() => {
        main_app.scenario_data.mousedown_location = null;
        main_app.scenario_data.tactic_data = ['none'];
        main_app.scenario_data.selected_burn_point = null;
        if (main_app.display_data.drag_data !== null) {
            main_app.display_data.drag_data = null;
        }
    })
    $(window).on('mousewheel', event => {
        if (main_app.scenario_data.tactic_data[0] === 'target') {
            if (main_app.scenario_data.tactic_data[1] > 1 || event.deltaY > 0) {
                main_app.scenario_data.tactic_data[1] += event.deltaY / 10
            }
            let cart_point = getScreenPoint(event.pageX, event.pageY, main_app.display_data.axis_limit, main_app.display_data.center);
            targetCalc(main_app.scenario_data.selected_burn_point, math.transpose([cart_point]));
            return;
        }
        main_app.display_data.axis_limit /= 1 + event.deltaY/10;
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
})()

resizeCanvas();
window.requestAnimationFrame(animation);
$("input[name='player']")[0].checked = true;
for (player in main_app.players) {
    main_app.players[player].burns = math.zeros(main_app.scenario_data.burns_per_player, 2)._data;
}
main_app.scenario_data.updating = true;
fetch(main_app.fetchURL + '/games').then(res => res.json()).then(res => {
    main_app.games = res;
    main_app.scenario_data.updating = false; 
}).catch(err => alert("Server blocked, contact the 533 TRS for support"))


function animation(time) {
    main_app.updateScreen();
    if (main_app.display_data.update_time && main_app.scenario_data.server) {
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
    if (main_app.scenario_data.turnTime > 0) {
        main_app.scenario_data.turnTime -= time - main_app.scenario_data.timeOld;
        if (main_app.scenario_data.turnTime < 0) {
            main_app.scenario_data.turnTime = 0;
            main_app.turn_button_click();
        }
    }
    main_app.scenario_data.timeOld = time;
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

function checkClose(x, y, change = true, width = 100) {
    let xPoint, yPoint;
    let turn = main_app.scenario_data.turn;
    turn = main_app.scenario_data.server ? turn : Math.ceil(Number(main_app.scenario_data.game_time) / main_app.turn_length);
    
    for (sat in main_app.players) {
        for (var ii = turn; ii < main_app.players[sat].burn_points.length; ii++) {
            xPoint = main_app.players[sat].burn_points[ii][1][0];
            yPoint = main_app.players[sat].burn_points[ii][0][0];
            if (math.norm([xPoint - x, yPoint - y]) < main_app.players[sat].display.point / width * 8 * main_app.display_data.axis_limit) {
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
    main_app.players[sat.satellite].burns.splice(sat.point, 1, math.dotMultiply(magnitude, math.dotDivide(rel, dist)));
    main_app.players[sat.satellite].burned = true;
}

function targetCalc(sat, r2) {
    let r1 = main_app.players[sat.satellite].burn_points[sat.point].slice(0, 2),
        v10 = main_app.scenario_data.tactic_data[2];
    r2 = r2.reverse();
    let v1f = math.multiply(math.inv(PhiRV(3600 * main_app.scenario_data.tactic_data[1])), math.subtract(r2, math.multiply(PhiRR(3600 * main_app.scenario_data.tactic_data[1]), r1)));
    let dV = math.squeeze(math.transpose(math.subtract(v1f, v10)));
    dV = math.norm(dV) > main_app.scenario_data.tactic_data[3] / 1000 ? math.dotMultiply(main_app.scenario_data.tactic_data[3] / 1000, math.dotDivide(dV, math.norm(dV))) : dV;
    main_app.players[sat.satellite].burns.splice(sat.point, 1, math.dotMultiply(dV, 1000));
    main_app.players[sat.satellite].burned = true;
}

function drawTargetLimit(ctx, cnvs, sat, dV, t) {
    let first_state = main_app.players[sat].burn_points[main_app.scenario_data.selected_burn_point.point];
    let r = first_state.slice(0, 2);
    let v = main_app.scenario_data.tactic_data[2];
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
    drawCurve(ctx, pixelPos, 1, 'fill')
}

function changeRgb(color, constant) {
    let reg = /\d+/g;
    colors = color.match(reg);
    colors = colors.map(color => {
        color = Number(color) * constant;
        return color > 255 ? 255 : color;
    })
    return `rgb(${colors[0]},${colors[1]},${colors[2]})`;
}

function hrsToTime(hrs) {
    hrs = Math.round(hrs * 100) / 100; // rounding to truncate and not have for example 2.9999999 instead of 3, producing 2:59 instread of 3:00
    return ("0" + Math.floor(hrs)).slice(-2) + ':' + ('0' + Math.floor(60 * (hrs - Math.floor(hrs)))).slice(-2);
}

function normalRandom() {
	var val, u, v, s, mul;
    spareRandom = null;
	if(spareRandom !== null)
	{
		val = spareRandom;
		spareRandom = null;
	}
	else
	{
		do
		{
			u = Math.random()*2-1;
			v = Math.random()*2-1;

			s = u*u+v*v;
		} while(s === 0 || s >= 1);

		mul = Math.sqrt(-2 * Math.log(s) / s);

		val = u * mul;
		spareRandom = v * mul;
	}
	
	return val;
}