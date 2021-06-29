let cnvs = document.getElementById("main-plot");
let ctx = cnvs.getContext("2d");
let timeSlider = document.getElementById('time-slider-range');
let encoder = new GIFEncoder();
encoder.setRepeat(1);
encoder.setDelay(33);
let windowOptions = {
    mm: 2 * Math.PI / 86164,
    center: [0, 0],
    width: 120,
    width_des: 120,
    sunInit: 0,
    initSun: [-1, 0, 0], // [R, I, C]
    w_h_ratio: cnvs.width / cnvs.height,
    mousePosition: {
        pixel: [0, 0],
        ric: {
            r: 0,
            i: 0
        },
        screen: 'ri',
        object: false,
        fill: 0
    },
    mouseState: false, // true if down
    frame_move: false,
    closeLimit: 0.025 * 60,
    closeSat: false,
    scenario_length: 24,
    start_date: new Date(document.getElementById('start-time').value),
    time_delta: 86164 / 200,
    scenario_time: 0,
    scenario_time_des: 0,
    animate_step: 240,
    lineWidth: 3,
    previewTime: 0,
    previewPath: [],
    screen: {
        mode: 'ri only',
        ri_center: cnvs.height / 2,
        ci_center: 3 * cnvs.height / 2,
        ri_h_w_ratio: cnvs.height / cnvs.width,
        ci_h_w_ratio: 0,
        lineHeight: cnvs.height
    },
    burn_point_size: 0.00625,
    burn_sensitivity: 0.15, // 0.15 m/s per 1 km distance
    burn_status: false, // {object: null, burn: null}
    mouse_time: false,
    mouse_hold: 500,
    origin_it: 0,
    origin_it_des: 0,
    draw_style: 'points',
    makeGif: {
        start: false,
        stop: false
    },
    maneuver_type: 'manual',
    refresh_time: 0,
    arrowColor: 'rgb(100,100,100)',
    passiveDropoff: {
        time: 10800,
        constant: 0.0003
    },
    showFinite: true,
    finiteTarget: true,
    relativeData: {
        origin: undefined,
        target: undefined,
        data: {
            range: {
                exist: false,
                units: 'km',
                name: 'R'
            },
            rangeRate: {
                exist: false,
                units: 'm/s',
                name: 'RR'
            },
            sunAngle: {
                exist: false,
                units: 'deg',
                name: 'CATS'
            },
            poca: {
                exist: false,
                units: 'km',
                name: 'POCA'
            },
            tanRate: {
                exist: false,
                units: 'm/s',
                name: 'R'
            }
        },
    },
    options3d: {
        rotation: {
            x: 0,
            y: 0,
            z: 0
        },
        rotation_des: {
            x: 0,
            y: 0,
            z: 0
        },
        focalLength: 10000,
        circleTrig: (() => {
            out = [];
            for (let ii = 0; ii < 2 * Math.PI; ii += Math.PI / 100) {
                out.push([Math.cos(ii), Math.sin(ii), 0])
            }
            return math.transpose(out);
        })()
    }
}
formatCanvas();
windowOptions.screen = {
    mode: 'ri only',
    ri_center: cnvs.height / 2,
    ci_center: 3 * cnvs.height / 2,
    ri_h_w_ratio: cnvs.height / cnvs.width,
    ci_h_w_ratio: 0,
    lineHeight: cnvs.height
};

function newSatellite(options) {
    let {
        color = 'red', shape = "square", size = 0.035, position, burns = [], shownTraj = [], a = 0.00001
    } = options;
    currentPosition = {
        r: [position.r],
        i: [position.i],
        c: [position.c],
        rd: [position.rd],
        id: [position.id],
        cd: [position.cd],
    }
    return {
        color,
        shape,
        size,
        position,
        currentPosition,
        burns,
        shownTraj,
        a,
        completedBurn: false,
        calcTraj: calcSatShownTrajectories,
        burnsDrawn: 0,
        burnSeparation: 1800, // Burns no closer than 30 minutes
        getPositionArray: function () {
            return [this.currentPosition.r, this.currentPosition.i, this.currentPosition.c];
        },
        getVelocityArray: function () {
            return [this.currentPosition.rd, this.currentPosition.id, this.currentPosition.cd];
        },
        getCurrentState: getSatCurrentPosition,
        generateBurns
    };
}
satellites = [];
animation();
window.addEventListener("resize", formatCanvas)
window.addEventListener("keydown", keydownFunction);

function keydownFunction(e) {
    if (e.shiftKey && e.ctrlKey && e.key === 'S') {
        satellites.push(newSatellite({
            position: {
                r: 0,
                i: Math.random() * 100 - 50,
                c: 10,
                cd: 0,
                rd: 0,
                id: 0
            },
            color: `rgb(${math.random() * 155},${math.random() * 155},${math.random() * 155})`,
            shape: Math.random() < 0.33 ? 'square' : Math.random() < 0.5 ? 'triangle' : 'up-triangle'
        }))
        satellites[satellites.length - 1].calcTraj();
    }
    if (e.key === ',' || e.key === '<' || e.key === '.' || e.key === '>') {
        if (e.shiftKey || e.ctrlKey) {
            windowOptions.scenario_time_des += (e.key === ',' || e.key === '<' ? -1 : (e.ctrlKey ? 5 :
                6)) * (e.ctrlKey ? 60 : 300);
            windowOptions.scenario_time = windowOptions.scenario_time_des + 0;
            return;
        }
        mouseWheelFunction({
            deltaY: e.key === ',' || e.key === '<' ? 1 : -1
        });
    }
    if (windowOptions.burn_status) {
        let currentLocation = satellites[windowOptions.burn_status.object].getCurrentState({
            burnStop: windowOptions.burn_status
                .burn,
            time: satellites[windowOptions.burn_status.object].burns[windowOptions.burn_status
                .burn].time
        });
        let n = windowOptions.mm,
            desVel, dV;
        switch (e.key) {
            case '1':
                // Zero relative eccentricity
                desVel = [
                    [0],
                    [-3 * currentLocation.r * n / 2], currentLocation.cd
                ];
                dV = math.subtract(desVel, [currentLocation.rd, currentLocation.id, currentLocation
                    .cd
                ]);
                satellites[windowOptions.burn_status.object].burns[windowOptions.burn_status.burn]
                    .direction = {
                        r: dV[0][0],
                        i: dV[1][0],
                        c: satellites[windowOptions.burn_status.object].burns[windowOptions.burn_status
                            .burn].direction.c
                    }
                break;
            case '2':
                // Zero relative semi-major axis (assumes top or bottom of NMC for now)
                desVel = [
                    [0],
                    [-4 * currentLocation.r * n / 2], currentLocation.cd
                ];
                dV = math.subtract(desVel, [currentLocation.rd, currentLocation.id, currentLocation
                    .cd
                ]);
                satellites[windowOptions.burn_status.object].burns[windowOptions.burn_status.burn]
                    .direction = {
                        r: dV[0][0],
                        i: dV[1][0],
                        c: satellites[windowOptions.burn_status.object].burns[windowOptions.burn_status
                            .burn].direction.c
                    }
                break;
            case '4':
                // Zero cross-track velocity
                break;
            case '3':
                // Zero relative semi-major axis with chosen center
                let yd = window.prompt("In-Track Center of NMC [km]: ", 0);
                let rd = (currentLocation.i - yd) * n / 2;
                desVel = [
                    [rd],
                    [-4 * currentLocation.r * n / 2], currentLocation.cd
                ];
                dV = math.subtract(desVel, [currentLocation.rd, currentLocation.id, currentLocation
                    .cd
                ]);
                satellites[windowOptions.burn_status.object].burns[windowOptions.burn_status.burn]
                    .direction = {
                        r: dV[0][0],
                        i: dV[1][0],
                        c: satellites[windowOptions.burn_status.object].burns[windowOptions.burn_status
                            .burn].direction.c
                    }
                break;
            default:
                return;
        }
        windowOptions.scenario_time_des = satellites[windowOptions.burn_status.object].burns[
            windowOptions.burn_status.burn].time + 7200;
        satellites[windowOptions.burn_status.object].calcTraj();
        windowOptions.burn_status = false;
        windowOptions.mouseState = false;
        windowOptions.frame_move = false;
        return;
    }
    if (e.key === ' ') {
        switch (windowOptions.screen.mode) {
            case 'ri only':
                windowOptions.screen.mode = 'ri ci';
                break;
            case 'ri ci':
                windowOptions.screen.mode = 'ci only';
                break;
            case 'ci only':
                windowOptions.screen.mode = '3d';
                cnvs.style.cursor = 'all-scroll';
                windowOptions.options3d.rotation = {
                    x: 0,
                    y: 90,
                    z: 0
                }
                windowOptions.options3d.rotation_des = {
                    x: 0,
                    y: 90,
                    z: 0
                }
                setTimeout(() => {
                    windowOptions.options3d.rotation_des = {
                        x: 45,
                        y: 45,
                        z: 0
                    }
                }, 350)
                break;
            case '3d':
                windowOptions.screen.mode = 'ri only';
                windowOptions.mousePosition = {
                    screen: "ri",
                    pixel: windowOptions.mousePosition,
                    ric: {
                        r: 0,
                        i: 0
                    },
                    object: false,
                    fill: 0
                }
                cnvs.style.cursor = '';
                break;

        }
        formatCanvas();
    } else if (e.key === 'a') {
        if (windowOptions.makeGif.start) {
            windowOptions.makeGif.stop = true;
            return
        }
        encoder.start();
        windowOptions.makeGif.start = true;
    }
}

timeSlider.addEventListener("input", e => {
    windowOptions.scenario_time_des = Number(e.target.value);
})
document.getElementById('canvas-div').addEventListener('mousemove', event => {
    if (windowOptions.screen.mode === '3d') {
        if (windowOptions.mouseState) {
            windowOptions.options3d.rotation_des.x += (event.clientX - windowOptions.mousePosition[0]) * 0.5;
            windowOptions.options3d.rotation_des.y -= (event.clientY - windowOptions.mousePosition[1]) * 0.5;
        }
        windowOptions.mousePosition = [event.clientX, event.clientY];
        return;
    }
    windowOptions.mousePosition = getMousePosition(event.clientX, event.clientY);
    windowOptions.mousePosition.object = false;
    if (windowOptions.frame_move && !windowOptions.burn_status) {
        windowOptions.origin_it_des = -windowOptions.mousePosition.ric.i + windowOptions.frame_move.i +
            windowOptions.frame_move.origin;
        return;
    }
    satellites.forEach((sat, ii) => {
        windowOptions.mousePosition.object = checkClose(windowOptions.mousePosition.ric,
                sat.currentPosition,
                windowOptions.mousePosition.screen === 'ci') ? ii : windowOptions.mousePosition
            .object === false ? false : windowOptions.mousePosition.object;
    });
})
document.getElementById('canvas-div').addEventListener('mousedown', event => {
    windowOptions.mouseState = true;
    if (windowOptions.screen.mode === '3d') return;
    // check burns to see if clicked on ones
    satellites.forEach((sat, ii) => {
        for (let jj = sat.burns.length - 1; jj >= 0; jj--) {
            let burnLocation = sat.getCurrentState({
                time: sat.burns[jj].time
            });
            if (checkClose(burnLocation, windowOptions.mousePosition.ric, windowOptions
                    .mousePosition.screen === 'ci')) {
                if (event.ctrlKey) {
                    satellites[ii].burns.splice(jj, 1);
                    satellites[ii].calcTraj();
                    return;
                }
                if (windowOptions.mousePosition.screen !== 'ci') {
                    satellites[ii].burns[jj].direction = {
                        r: 0,
                        i: 0,
                        c: satellites[ii].burns[jj].direction.c
                    };
                }
                let type = windowOptions.mousePosition.screen === 'ci' ? 'manual' :
                    windowOptions.maneuver_type;
                if (type === 'waypoint') {
                    windowOptions.scenario_time_des = sat.burns[jj].time + 7200;
                }
                let burnLocation = sat.getCurrentState({
                    time: satellites[ii].burns[jj].time
                });
                windowOptions.burn_status = {
                    object: ii,
                    burn: jj,
                    type,
                    time: 7200,
                    burnLocation,
                    origScreen: windowOptions.mousePosition.screen
                };
                return;
            }
        }
    })
    if (windowOptions.mousePosition.object === false) {
        windowOptions.frame_move = {
            i: windowOptions.mousePosition.ric.i,
            origin: windowOptions.origin_it
        };
        return;
    }
    if (windowOptions.burn_status) {
        return;
    }
    setTimeout(() => {
        if (satellites[windowOptions.mousePosition.object].burns.find(burn => math.abs(burn.time - windowOptions.scenario_time_des) < satellites[windowOptions.mousePosition.object].burnSeparation)) return;
        if (windowOptions.mouseState && windowOptions.mousePosition.object !== false) {
            let targetState = satellites[windowOptions.mousePosition.object].getCurrentState({
                time: windowOptions.scenario_time_des + 7200
            });
            satellites[windowOptions.mousePosition.object].burns.push({
                time: windowOptions.scenario_time_des,
                direction: {
                    r: 0,
                    i: 0,
                    c: 0
                },
                waypoint: {
                    tranTime: 7200,
                    target: {
                        r: targetState.r[0],
                        i: targetState.i[0],
                        c: targetState.c[0]
                    }
                }
            })
            satellites[windowOptions.mousePosition.object].burns.sort((a, b) => {
                return a.time - b.time;
            })
            let burnN = satellites[windowOptions.mousePosition.object].burns.findIndex(burn =>
                burn.time === windowOptions.scenario_time_des);
            let burnLocation = satellites[windowOptions.mousePosition.object].getCurrentState({
                time: satellites[
                    windowOptions.mousePosition.object].burns[burnN].time
            });
            let type = windowOptions.mousePosition.screen === 'ci' ? 'manual' : windowOptions
                .maneuver_type;
            if (type === 'waypoint') {
                windowOptions.scenario_time_des += 7200;
            }
            windowOptions.burn_status = {
                object: windowOptions.mousePosition.object,
                burn: burnN,
                type,
                time: 7200,
                burnLocation,
                origScreen: windowOptions.mousePosition.screen
            };
        }
    }, windowOptions.mouse_hold)
})
document.getElementById('canvas-div').addEventListener('mouseup', event => {
    windowOptions.mouseState = false;
    if (windowOptions.burn_status) {
        windowOptions.scenario_time_des = windowOptions.maneuver_type === 'waypoint' && windowOptions.mousePosition.screen === 'ri' ? satellites[windowOptions.burn_status.object].burns[
            windowOptions.burn_status.burn].time : windowOptions.scenario_time_des;
    }
    windowOptions.burn_status = false;
    windowOptions.frame_move = false;
})
document.getElementById('canvas-div').addEventListener('wheel', mouseWheelFunction)

function toStkFormat(time) {
    time = time.split('GMT')[0].substring(4, time.split('GMT')[0].length - 1) + '.000';
    time = time.split(' ');
    return time[1] + ' ' + time[0] + ' ' + time[2] + ' ' + time[3];
}

document.getElementById('export-burns').addEventListener('click', () => {
    let selectEl = document.getElementById('satellite-way-select').value, time;
    let outString = '';
    outString += `Position  r: ${satellites[selectEl].position.r} km  i: ${satellites[selectEl].position.i} km c: ${satellites[selectEl].position.c} km \n`;
    outString += `Velocity  r: ${satellites[selectEl].position.rd * 1000} m/s  i: ${satellites[selectEl].position.id * 1000} m/s c: ${satellites[selectEl].position.cd * 1000} m/s \n\n`;
    outString += `Engine Acceleration  ${satellites[selectEl].a} km/s2\n\n`;
    satellites[selectEl].burns.forEach(burn => {
        time = new Date(windowOptions.start_date.getTime() + burn.time * 1000).toString();
        timeEnd = new Date(windowOptions.start_date.getTime() + burn.time * 1000 + burn.waypoint.tranTime * 1000).toString();
        time = toStkFormat(time);
        timeEnd = toStkFormat(timeEnd);
        outString += `Burn Time ${time} \n`
        outString += `Waypoint  r: ${burn.waypoint.target.r.toFixed(1)} km  i: ${burn.waypoint.target.i.toFixed(1)} km  c: ${burn.waypoint.target.c.toFixed(1)} km\n`;
        outString += `Transfer Time ${(burn.waypoint.tranTime.toFixed(1) / 3600)} hrs\n`;
        outString += `Direction  r: ${burn.direction.r.toFixed(6)}  i: ${burn.direction.i.toFixed(6)}  c: ${burn.direction.c.toFixed(6)}\n`;
        outString += `Burn Duration ${(math.norm([burn.direction.r, burn.direction.i, burn.direction.c]) / satellites[selectEl].a).toFixed(1)} seconds\n`;
        outString += `break${time}break${timeEnd}break${burn.waypoint.target.r.toFixed(2)}break${burn.waypoint.target.i.toFixed(2)}break${burn.waypoint.target.c.toFixed(2)}break${burn.direction.r.toFixed(6)}break${burn.direction.i.toFixed(6)}break${burn.direction.c.toFixed(6)}break${(math.norm([burn.direction.r, burn.direction.i, burn.direction.c]) / satellites[selectEl].a).toFixed(1)}\n\n`
    })
    // downloadFile('burns.txt', JSON.stringify(satellites[selectEl].burns));
    downloadFile('burns.txt', outString);
})
document.getElementById('satellite-way-select').addEventListener('input', event => {
    generateBurnTable(event.target.value)
    event.target.style.color = satellites[event.target.value].color;
})
document.getElementById('target-select').addEventListener('change', event => {
    event.target.style.color = satellites[event.target.value].color;
})
document.getElementById('origin-select').addEventListener('change', event => {
    event.target.style.color = satellites[event.target.value].color;
})
document.getElementById('add-satellite-button').addEventListener('click', (click) => {
    let el = click.target,
        n = windowOptions.mm;
    el = el.parentNode.parentNode.parentNode;
    let state = {
        a: Number(el.children[1].children[1].children[0].children[0].getElementsByTagName('input')[0].value),
        x: Number(el.children[1].children[1].children[0].children[1].getElementsByTagName('input')[0].value),
        y: Number(el.children[1].children[1].children[0].children[2].getElementsByTagName('input')[0].value),
        b: Number(el.children[1].children[1].children[0].children[3].getElementsByTagName('input')[0].value) * Math
            .PI / 180,
        m: Number(el.children[1].children[1].children[0].children[5].getElementsByTagName('input')[0].value) * Math
            .PI / 180,
        z: Number(el.children[1].children[1].children[0].children[4].getElementsByTagName('input')[0].value)
    };
    let color = el.children[2].children[3].getElementsByTagName('input')[0].value;
    let shape = el.children[2].children[1].getElementsByTagName('select')[0].value;
    let a = Number(el.children[2].children[2].getElementsByTagName('input')[0].value) / 1e6;
    state = {
        r: -state.a / 2 * Math.cos(state.b) + state.x,
        i: state.a * Math.sin(state.b) + state.y,
        c: state.z * Math.sin(state.m),
        rd: state.a * n / 2 * Math.sin(state.b),
        id: state.a * n * Math.cos(state.b) - 1.5 * state.x * n,
        cd: state.z * n * Math.cos(state.m),
    }
    satellites.push(newSatellite({
        position: state,
        color,
        shape,
        a
    }));
    satellites[satellites.length - 1].calcTraj();
    document.getElementById('add-satellite-panel').classList.toggle("hidden")
})
document.getElementById('data-button').addEventListener('click', (click) => {
    if (satellites.length < 2) {
        return;
    }
    document.getElementById('options-panel').classList.toggle("hidden")
    let originSel = document.getElementById('origin-select');
    let targetSel = document.getElementById('target-select');
    while (originSel.firstChild) {
        originSel.removeChild(originSel.firstChild);
    }
    while (targetSel.firstChild) {
        targetSel.removeChild(targetSel.firstChild);
    }
    satellites.forEach((sat, ii) => {
        addedElement = document.createElement('option');
        addedElement.value = ii;
        addedElement.textContent = sat.shape;
        addedElement.style.color = sat.color;
        originSel.appendChild(addedElement);
        addedElement = document.createElement('option');
        addedElement.value = ii;
        addedElement.textContent = sat.shape;
        addedElement.style.color = sat.color;
        targetSel.appendChild(addedElement);
    })
    targetSel.value = windowOptions.relativeData.target !== undefined ? windowOptions.relativeData.target : 1;
    targetSel.style.color = windowOptions.relativeData.target !== undefined ? satellites[windowOptions.relativeData.target].color : satellites[1].color;
    originSel.value = windowOptions.relativeData.origin !== undefined ? windowOptions.relativeData.origin : 0;
    originSel.style.color = windowOptions.relativeData.origin !== undefined ? satellites[windowOptions.relativeData.origin].color : satellites[0].color;

    document.getElementById('data-panel').classList.toggle("hidden")
})
document.getElementById('confirm-option-button').addEventListener('click', (click) => {
    let el = click.target;
    el = el.parentNode.parentNode.children;
    let date = el[1].children[1].getElementsByTagName('input')[0].value;
    let sun = el[1].children[4].getElementsByTagName('input')[0].value;
    windowOptions.mm = Math.sqrt(398600.4418 / Math.pow(Number(el[1].children[3].getElementsByTagName('input')[0].value), 3));
    windowOptions.scenario_length = Number(el[1].children[2].getElementsByTagName('input')[0].value);
    timeSlider.max = windowOptions.scenario_length * 3600;
    let timeStep = el[1].children[7].getElementsByTagName('input')[0].value;
    let fps = el[1].children[8].getElementsByTagName('input')[0].value;
    let repeat = el[1].children[9].getElementsByTagName('input')[0].checked;
    windowOptions.time_delta = windowOptions.scenario_length * 3600 / Number( el[2].children[1].getElementsByTagName('input')[0].value);
    windowOptions.draw_style = el[2].children[2].getElementsByTagName('input')[0].checked ? 'line' : 'points';
    windowOptions.showFinite = el[2].children[3].getElementsByTagName('input')[0].checked;
    windowOptions.finiteTarget = el[2].children[4].getElementsByTagName('input')[0].checked;
    satellites.forEach(sat => {
        sat.generateBurns();
        sat.calcTraj()
    });
    encoder.setRepeat(repeat ? 0 : 1);
    encoder.setDelay(1000 / fps);
    windowOptions.animate_step = timeStep * 60;
    sunIR = -Number(sun.substring(0, 2)) * 3600 + Number(sun.substring(2, 4)) / 86400 * 2 * Math.PI;
    sunC = Number(el[1].children[5].getElementsByTagName('input')[0].value) * Math.PI / 180;
    windowOptions.initSun = [-Math.cos(sunIR) * Math.cos(sunC), Math.sin(sunIR) * Math.cos(sunC), Math.sin(sunC)];
    windowOptions.start_date = new Date(date);
    document.getElementById('options-panel').classList.toggle("hidden")
})
document.getElementById('confirm-data-button').addEventListener('click', (click) => {
    let el = click.target;
    windowOptions.relativeData.data.range.exist = el.parentNode.children[0].children[0].checked;
    windowOptions.relativeData.data.rangeRate.exist = el.parentNode.children[1].children[0].checked;
    windowOptions.relativeData.data.tanRate.exist = el.parentNode.children[2].children[0].checked;
    windowOptions.relativeData.data.poca.exist = el.parentNode.children[3].children[0].checked;
    windowOptions.relativeData.data.sunAngle.exist = el.parentNode.children[4].children[0].checked;
    windowOptions.relativeData.origin = el.parentNode.parentNode.children[0].children[1].value;
    windowOptions.relativeData.target = el.parentNode.parentNode.children[0].children[3].value;
    document.getElementById('data-panel').classList.toggle("hidden")
})
document.getElementById('maneuver-type-input').addEventListener('change', (click) => {
    el = click.target;
    switch (windowOptions.maneuver_type) {
        case 'manual':
            windowOptions.maneuver_type = 'waypoint';
            el.parentNode.parentNode.children[0].innerText = 'Waypoint';
            break;
        default:
            windowOptions.maneuver_type = 'manual';
            el.parentNode.parentNode.children[0].innerText = 'Manual';
            break;
    }
})
document.getElementById('export-option-button').addEventListener('click', () => {
    downloadFile('test.sas', JSON.stringify({
        windowOptions,
        satellites
    }));
})
document.getElementById('add-waypoint-button').addEventListener('click', event => {
    let chosenSat = Number(document.getElementById('satellite-way-select').value);
    let divTarget = event.target.parentNode.parentNode.parentNode.children;
    let tableTrs = document.getElementById('waypoint-table').children[1].children,
        waypoints = [], target;
    for (let tr = 0; tr < tableTrs.length; tr++) {
        target = tableTrs[tr].children[1].children[0].innerText.substr(1, tableTrs[tr].children[1].children[0].innerText.length - 2).split(',');
        waypoints.push({
            time: Date.parse(tableTrs[tr].children[0].innerText),
            r: Number(target[0]),
            i: Number(target[1]),
            c: Number(target[2]),
            tranTime: Number(tableTrs[tr].children[2].innerText)
        })
    }
    if (divTarget[3].children[1].children[0].checked) {
        // Switch to 2-burn calculation, delete all burns after
        divTarget = divTarget[2].children;
        let startTime = Date.parse(divTarget[0].getElementsByTagName('input')[0].value);
        waypoints = waypoints.filter(point => point.time < startTime);
        let curPos = satellites[chosenSat].getCurrentState({
            time: startTime / 1000 - Date.parse(windowOptions.start_date) / 1000
        })
        let newPoints = calcTwoBurn({
            stateI: {
                x: curPos.r[0],
                y: curPos.i[0],
                z: curPos.c[0],
                xd: curPos.rd[0],
                yd: curPos.id[0],
                zd: curPos.cd[0]
            },
            stateF: {
                x: Number(divTarget[1].getElementsByTagName('input')[0].value),
                y: Number(divTarget[2].getElementsByTagName('input')[0].value),
                z: Number(divTarget[3].getElementsByTagName('input')[0].value),
                xd: 0,
                yd: 0,
                zd: 0
            },
            a: satellites[chosenSat].a,
            startTime: startTime / 1000 - Date.parse(windowOptions.start_date) / 1000,
            tf: Number(divTarget[4].getElementsByTagName('input')[0].value) === 0 ? 7200 : 60 * Number(divTarget[4].getElementsByTagName('input')[0].value)
        })
        if (!newPoints) {
            alert("No solution found, increase transfer time or move target point closer to origin");
            return;
        }
        waypoints.push({
            time: newPoints[0].time * 1000 + Date.parse(windowOptions.start_date),
            r: newPoints[0].waypoint.target.r,
            i: newPoints[0].waypoint.target.i,
            c: newPoints[0].waypoint.target.c,
            tranTime: newPoints[0].waypoint.tranTime / 60,
        }, {
            time: newPoints[1].time * 1000 + Date.parse(windowOptions.start_date),
            r: newPoints[1].waypoint.target.r,
            i: newPoints[1].waypoint.target.i,
            c: newPoints[1].waypoint.target.c,
            tranTime: newPoints[1].waypoint.tranTime / 60,
        })
    } else {
        divTarget = divTarget[2].children;
        let newWaypoint = {
            time: Date.parse(divTarget[0].getElementsByTagName('input')[0].value),
            r: Number(divTarget[1].getElementsByTagName('input')[0].value),
            i: Number(divTarget[2].getElementsByTagName('input')[0].value),
            c: Number(divTarget[3].getElementsByTagName('input')[0].value),
            tranTime: Number(divTarget[4].getElementsByTagName('input')[0].value) === 0 ? 120 : Number(divTarget[4].getElementsByTagName('input')[0].value)
        }

        let filterLimit = 15 * 60 * 1000; // Reject burns closer than 15 minutes to other burns 
        if (waypoints.filter(point => Math.abs(point.time - newWaypoint.time) < filterLimit).length > 0) {
            return;
        }
        waypoints.push(newWaypoint);
        waypoints.sort((a, b) => a.time - b.time);
    }
    waypoints2table(waypoints);
    table2burns(chosenSat);
})
document.getElementById('add-start-time').addEventListener('input', event => {
    let startTime = new Date(event.target.value).getTime();
    let dt = startTime - windowOptions.start_date.getTime() + Number(document.getElementById('add-tran-time').value) * 60000;
    let crossState = satellites[document.getElementById('satellite-way-select').value].getCurrentState({
        time: dt / 1000
    });
    document.getElementById('add-cross').value = crossState.c[0].toFixed(2);
})
document.getElementById('add-tran-time').addEventListener('input', event => {
    let startTime = new Date(document.getElementById('add-start-time').value).getTime();
    let dt = startTime - windowOptions.start_date.getTime() + Number(document.getElementById('add-tran-time').value) * 60000;
    let crossState = satellites[document.getElementById('satellite-way-select').value].getCurrentState({
        time: dt / 1000
    });
    document.getElementById('add-cross').value = crossState.c[0].toFixed(2);
})

function openPanel(button) {
    if (button.id === 'burns') {
        if (satellites.length === 0) {
            return;
        }
        let selectEl = document.getElementById('satellite-way-select');
        let chosenSat = Number(selectEl.value);
        generateBurnTable(chosenSat);
        while (selectEl.firstChild) {
            selectEl.removeChild(selectEl.firstChild);
        }
        satellites.forEach((sat, ii) => {
            addedElement = document.createElement('option');
            addedElement.value = ii;
            addedElement.textContent = sat.shape;
            addedElement.style.color = sat.color;
            selectEl.appendChild(addedElement);
        })
        selectEl.selectedIndex = chosenSat;
        selectEl.style.color = satellites[chosenSat].color;
    }
    document.getElementById(button.id + '-panel').classList.toggle("hidden")
}

function closeAll() {
    let buttons = document.getElementsByClassName('panel');
    for (let jj = 0; jj < buttons.length; jj++) {
        buttons[jj].classList.add('hidden');
    }
}

function mouseWheelFunction(event) {
    if (windowOptions.burn_status) {
        windowOptions.burn_status.time += event.deltaY < 0 ? 600 : -60;
        windowOptions.scenario_time_des += event.deltaY < 0 ? 600 : -60;
        return;
    }
    windowOptions.width_des = event.deltaY < 0 ? windowOptions.width_des / 1.1 : windowOptions
        .width_des * 1.1;
    windowOptions.closeLimit = 0.0125 * windowOptions.width_des;
}

function getMousePosition(mouseX, mouseY) {
    let plot = mouseY > (windowOptions.screen.ci_center + windowOptions.screen.ri_center) / 2 ? 'ci' : 'ri';
    let pixel = [mouseX, mouseY];
    let ric = pixelToRic(pixel, plot === 'ci');
    return {
        screen: plot,
        pixel,
        ric
    }
}

function animation(time) {
    let a = performance.now();
    windowOptions.origin_it += (windowOptions.origin_it_des - windowOptions.origin_it) * 0.2;
    windowOptions.width += (windowOptions.width_des - windowOptions.width) * 0.2;
    windowOptions.scenario_time += (windowOptions.scenario_time_des - windowOptions.scenario_time) * 0.2;
    // Transition frames
    let mode = windowOptions.screen.mode;
    windowOptions.screen.ri_center += ((mode === 'ri only' || mode === '3d' ? cnvs.height / 2 : mode === 'ci only' ? -cnvs
            .height / 2 : cnvs.height / 4) - windowOptions
        .screen.ri_center) * 0.1;
    windowOptions.screen.ci_center += ((mode === 'ri only' || mode === '3d' ? 3 * cnvs.height / 2 : mode === 'ci only' ? cnvs
            .height / 2 : 3 * cnvs.height / 4) -
        windowOptions.screen.ci_center) * 0.1;
    windowOptions.screen.lineHeight += ((mode === 'ri only' || mode === 'ci only' || mode === '3d' ? cnvs.height : cnvs.height /
            2) - windowOptions
        .screen.lineHeight) * 0.1;
    if (windowOptions.mouseState) {
        windowOptions.mousePosition.fill += (1 - windowOptions.mousePosition.fill) * 0.08;
    } else {
        windowOptions.mousePosition.fill = 0;
    }
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, cnvs.width, cnvs.height);

    drawScreenText();
    if (windowOptions.screen.mode !== '3d') {
        drawScreenArrows();
        drawSats();
        if (windowOptions.burn_status) {
            if (windowOptions.mousePosition.screen === windowOptions.burn_status.origScreen) {
                calcBurns(windowOptions.burn_status, windowOptions.mousePosition.screen === 'ci')
            } else {
                windowOptions.burn_status = false;
            }
        }
        if (windowOptions.screen.mode === 'ri ci') {
            ctx.fillStyle = 'white';
            ctx.fillRect(0, windowOptions.screen.lineHeight - cnvs.height * 0.01, cnvs.width, cnvs.height * 0.02)
            ctx.fillStyle = 'black';
            ctx.fillRect(0, windowOptions.screen.lineHeight - cnvs.height * 0.00125, cnvs.width, cnvs.height *
                0.0025)
        }
    } else {
        draw3dScene();
    }
    if (windowOptions.makeGif.start) {
        windowOptions.scenario_time_des += windowOptions.animate_step;
        windowOptions.scenario_time += windowOptions.animate_step;
        encoder.addFrame(ctx);
        if (windowOptions.makeGif.stop) {
            windowOptions.makeGif = {
                start: false,
                stop: false
            }
            encoder.finish();
            encoder.download("download.gif");
        }
    }
    // console.log(performance.now() - a);
    windowOptions.refresh_time += (performance.now() - a - windowOptions.refresh_time) * 0.01;
    window.requestAnimationFrame(animation);
}

function draw3dScene() {
    let constRot = 0.1;
    windowOptions.options3d.rotation.x += (windowOptions.options3d.rotation_des.x - windowOptions.options3d.rotation.x) * constRot;
    windowOptions.options3d.rotation.y += (windowOptions.options3d.rotation_des.y - windowOptions.options3d.rotation.y) * constRot;
    windowOptions.options3d.rotation.z += (windowOptions.options3d.rotation_des.z - windowOptions.options3d.rotation.z) * constRot;

    let pointsToDraw = [];
    let arrowLen = windowOptions.width_des * 0.2;
    let arrowsEnd = [
        [arrowLen, 0, 0],
        [0, arrowLen, 0],
        [0, 0, arrowLen]
    ];
    let arrowsOrigin = [
        [0, 0, 0],
        [0, 0, 0],
        [0, 0, 0]
    ];
    let labels = [{
        text: 'R',
        location: [
            [arrowLen * 1.2],
            [0],
            [0]
        ]
    }, {
        text: 'I',
        location: [
            [0],
            [arrowLen * 1.2],
            [0]
        ]
    }, {
        text: 'C',
        location: [
            [0],
            [0],
            [arrowLen * 1.2]
        ]
    }]
    let rot = math.multiply(math.multiply(rotationMatrices(windowOptions.options3d.rotation.x, 1, ), rotationMatrices(windowOptions.options3d.rotation.y, 2)), rotationMatrices(windowOptions.options3d.rotation.z, 3));
    arrowsEnd = math.transpose(math.multiply(rot, arrowsEnd));
    arrowsOrigin = math.transpose(math.multiply(rot, arrowsOrigin));
    arrowsEnd.forEach((endPoint, ii) => {
        let jj = 0;
        while (jj <= 1) {
            pointsToDraw.push({
                r: arrowsOrigin[ii][0] + (endPoint[0] - arrowsOrigin[ii][0]) * jj,
                i: arrowsOrigin[ii][1] + (endPoint[1] - arrowsOrigin[ii][1]) * jj,
                c: arrowsOrigin[ii][2] + (endPoint[2] - arrowsOrigin[ii][2]) * jj,
                color: windowOptions.arrowColor,
                thick: 4,
                type: 'dot'
            })
            jj += 0.01;
        }
    })
    labels.forEach(label => {
        let loc = math.multiply(rot, label.location);
        pointsToDraw.push({
            r: loc[0][0],
            i: loc[1][0],
            c: loc[2][0],
            color: 'black',
            thick: 2,
            type: 'text',
            text: label.text
        })
    })
    satellites.forEach(sat => {
        sat.currentPosition = sat.getCurrentState();
        sat.shownTraj.forEach(point => {
            let loc = math.multiply(rot, [
                [point.r],
                [point.i],
                [point.c]
            ]);
            pointsToDraw.push({
                r: loc[0][0],
                i: loc[1][0],
                c: loc[2][0],
                color: sat.color,
                thick: 2,
            })
        })
        let loc = math.multiply(rot, [sat.currentPosition.r, sat.currentPosition.i, [sat.currentPosition.c[0]]]);
        pointsToDraw.push({
            r: loc[0][0],
            i: loc[1][0],
            c: loc[2][0],
            color: sat.color,
            thick: 10,
            type: 'object'
        })
    })
    let sunAngle = math.squeeze(math.multiply(rotationMatrices(-windowOptions.scenario_time * windowOptions.mm * 180 / Math.PI, 3), math.transpose([windowOptions.initSun])));

    let sun0 = [
        [0],
        [0],
        [0]
    ]
    let sunF = math.dotMultiply(arrowLen, math.transpose([sunAngle]));
    sun0 = math.multiply(rot, sun0);
    sunF = math.multiply(rot, sunF);
    let jj = 0.02;
    while (jj <= 1) {
        pointsToDraw.push({
            r: sun0[0][0] + (sunF[0][0] - sun0[0][0]) * jj,
            i: sun0[1][0] + (sunF[1][0] - sun0[1][0]) * jj,
            c: sun0[2][0] + (sunF[2][0] - sun0[2][0]) * jj,
            color: 'orange',
            thick: 2,
            type: 'dot'
        })
        jj += 0.01;
    }

    // Draw in-plane concentric circles
    let loc = math.transpose(math.multiply(rot, windowOptions.options3d.circleTrig));
    loc.forEach(l => {
        pointsToDraw.push({
            r: l[0] * windowOptions.width / 3,
            i: l[1] * windowOptions.width / 3,
            c: l[2] * windowOptions.width / 3,
            color: 'black',
            thick: 0.5,
            type: 'dot'
        });
        pointsToDraw.push({
            r: l[0] * windowOptions.width / 6,
            i: l[1] * windowOptions.width / 6,
            c: l[2] * windowOptions.width / 6,
            color: 'black',
            thick: 0.25,
            type: 'dot'
        })
    })


    pointsToDraw.sort((a, b) => a.c - b.c)
    // Draw pointsToDraw
    pointsToDraw.forEach((point) => {
        point.r = windowOptions.options3d.focalLength / (-point.c + windowOptions.options3d.focalLength) * point.r;
        point.i = windowOptions.options3d.focalLength / (-point.c + windowOptions.options3d.focalLength) * point.i;

        let pixPoint = ricToPixel(point);
        // pixPoint = math.dotMultiply(windowOptions.options3d.focalLength / (point.c + windowOptions.options3d.focalLength), pixPoint)

        if (point.type === 'text') {
            // pixPoint = math.dotMultiply(windowOptions.options3d.focalLength / (-point.c + windowOptions.options3d.focalLength), pixPoint)
            ctx.textAlign = 'center';
            ctx.font = '30px Arial';
            ctx.fillStyle = 'black';
            ctx.fillText(point.text, pixPoint[0], pixPoint[1] + 15)
        } else if (point.type === 'object') {
            ctx.fillStyle = point.color;
            ctx.beginPath()
            ctx.arc(pixPoint[0], pixPoint[1], 10, 0, 2 * Math.PI);
            ctx.fill();
        } else {
            ctx.fillStyle = point.color;
            ctx.beginPath()
            ctx.arc(pixPoint[0], pixPoint[1], point.thick, 0, 2 * Math.PI);
            ctx.fill();
        }
    })
}

function formatCanvas() {
    cnvs.width = document.documentElement.clientWidth;
    cnvs.height = document.documentElement.clientHeight;
    windowOptions.screen.ri_h_w_ratio = cnvs.height / (windowOptions.screen.mode === 'ri ci' || windowOptions.screen.mode === 'ci only' ? 2 : 1) / cnvs
        .width;
}

function drawScreenText() {
    let fontSize = cnvs.height / 30;
    fontSize = fontSize < cnvs.width / 20 ? fontSize : cnvs.width / 20;
    ctx.textAlign = 'start';
    ctx.font = fontSize + 'px Arial';
    ctx.fillStyle = 'black';
    
    let height = windowOptions.screen.mode === 'ri ci' ? cnvs.height / 8 : cnvs.height / 6;
    // Draw mouse positon on the active axis
    if (!windowOptions.makeGif.start && windowOptions.screen.mode !== '3d') {
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.strokeStyle = windowOptions.mousePosition.object === false ? 'black' : satellites[windowOptions
            .mousePosition.object].color;
        ctx.lineWidth = windowOptions.closeSat === false ? 0.75 : 2;
        ctx.moveTo(0, windowOptions.mousePosition.pixel[1]);
        ctx.lineTo(cnvs.width, windowOptions.mousePosition.pixel[1]);
        ctx.moveTo(windowOptions.mousePosition.pixel[0], 0);
        ctx.lineTo(windowOptions.mousePosition.pixel[0], cnvs.height);
        ctx.stroke();
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(windowOptions.mousePosition.pixel[0], windowOptions.mousePosition.pixel[1], 15, 0, 2 * Math.PI *
            windowOptions.mousePosition.fill);
        ctx.stroke();
        ctx.fillText((windowOptions.mousePosition.screen === 'ci' ? 'C: ' : 'R:') + windowOptions.mousePosition
            .ric[windowOptions.mousePosition.screen === 'ci' ? 'c' : 'r'].toFixed(2) + ' km    I: ' +
            windowOptions.mousePosition.ric.i.toFixed(2) + ' km', cnvs.width * 0.01, cnvs.height - 20 - fontSize*1.5
        );
    }
    if (windowOptions.screen.mode !== '3d') {
        ctx.strokeStyle = 'RGB(0,0,0,0.5)';
        // Write current mouse position
        ctx.textAlign = 'center';
        ctx.fillText('I', cnvs.width / 2 + windowOptions.origin_it / windowOptions.width / 2 * cnvs.width - height * 1.1,
            windowOptions.screen.ri_center + fontSize / 3);
        ctx.fillText('R', cnvs.width / 2 + windowOptions.origin_it / windowOptions.width / 2 * cnvs.width,
            windowOptions.screen.ri_center - height * 1.1);
        ctx.fillText('I', cnvs.width / 2 + windowOptions.origin_it / windowOptions.width / 2 * cnvs.width - height * 1.1,
            windowOptions.screen.ci_center + fontSize / 3);
        ctx.fillText('C', cnvs.width / 2 + windowOptions.origin_it / windowOptions.width / 2 * cnvs.width,
            windowOptions.screen.ci_center - height * 1.1);
    }

    ctx.textAlign = 'start';
    ctx.fillStyle = 'black';

    ctx.fillText(new Date(windowOptions.start_date.getTime() + windowOptions.scenario_time * 1000).toString()
        .split(' GMT')[0].substring(4), cnvs.width * 0.01, cnvs.height - 20);
    // ctx.fillText((windowOptions.refresh_time).toFixed(2), cnvs.width * 0.01, cnvs.height * 0.67);
    ctx.font = '15px Arial';
    if (windowOptions.relativeData.origin !== undefined && windowOptions.relativeData.target !== undefined && windowOptions.relativeData.origin !== windowOptions.relativeData.target) {
        let relDataIn = getRelativeData(windowOptions.relativeData.origin, windowOptions.relativeData.target);
        let y_location = cnvs.height * 0.1;
        for (relData in windowOptions.relativeData.data) {
            if (windowOptions.relativeData.data[relData].exist) {
                ctx.fillText(windowOptions.relativeData.data[relData].name + ': ' + relDataIn[relData].toFixed(
                        1) + ' ' + windowOptions.relativeData.data[relData].units, cnvs.width * 0.01,
                    y_location);
                y_location += 30;
            }
        }
        if (windowOptions.relativeData.data.poca.exist) {
            let {
                poca,
                toca
            } = relDataIn;
            let position1 = satellites[windowOptions.relativeData.origin].shownTraj[toca];
            let position2 = satellites[windowOptions.relativeData.target].shownTraj[toca];

            position1 = ricToPixel(position1);
            position2 = ricToPixel(position2);

            ctx.beginPath();
            ctx.lineWidth = 1;
            ctx.moveTo(position1[0], position1[1]);
            ctx.lineTo(position2[0], position2[1]);
            ctx.stroke();
        }
    }

    // Draw Scale
    ctx.strokeStyle = 'RGB(0,0,0,0.5)';
    ctx.textAlign = 'center';
    ctx.lineWidth = 2;
    let scaleLength = windowOptions.width * 0.7;
    let logScale = Math.pow(10, math.floor(math.log(windowOptions.width * 2, 10) - 1));
    scaleLength = math.ceil(scaleLength / logScale) * logScale;
    ctx.beginPath();
    ctx.moveTo(0.97 * cnvs.width, cnvs.height * 0.05);
    ctx.lineTo(0.97 * cnvs.width, cnvs.height * 0.09);
    ctx.lineTo(0.97 * cnvs.width, cnvs.height * 0.07);
    ctx.lineTo(0.97 * cnvs.width - scaleLength / windowOptions.width / 2 * cnvs.width, cnvs.height * 0.07);
    ctx.lineTo(0.97 * cnvs.width - scaleLength / windowOptions.width / 2 * cnvs.width, cnvs.height * 0.09);
    ctx.lineTo(0.97 * cnvs.width - scaleLength / windowOptions.width / 2 * cnvs.width, cnvs.height * 0.05);
    ctx.strokeText(scaleLength + ' km', 4 * cnvs.width / 5, cnvs.height * 0.12);
    ctx.stroke();
}

function drawScreenArrows() {
    let height = windowOptions.screen.mode === 'ri ci' ? cnvs.height / 8 : cnvs.height / 6;
    // Draw axis arrows on each graph, RI Frame
    drawArrow({
        origin: [cnvs.width / 2 + windowOptions.origin_it / windowOptions.width / 2 * cnvs.width,
            windowOptions.screen.ri_center
        ],
        height,
        color: windowOptions.arrowColor
    });
    drawArrow({
        angle: -90,
        backHalf: true,
        origin: [cnvs.width / 2 + windowOptions.origin_it / windowOptions.width / 2 * cnvs.width,
            windowOptions.screen.ri_center
        ],
        height,
        color: windowOptions.arrowColor
    });
    // CI Frame
    drawArrow({
        origin: [cnvs.width / 2 + windowOptions.origin_it / windowOptions.width / 2 * cnvs.width,
            windowOptions.screen.ci_center
        ],
        height,
        color: windowOptions.arrowColor
    });
    drawArrow({
        angle: -90,
        backHalf: true,
        origin: [cnvs.width / 2 + windowOptions.origin_it / windowOptions.width / 2 * cnvs.width,
            windowOptions.screen.ci_center
        ],
        height,
        color: windowOptions.arrowColor
    });
    // Draw Sun
    let sunAngle = math.squeeze(math.multiply(rotationMatrices(-windowOptions.scenario_time * windowOptions.mm * 180 / Math.PI, 3), math.transpose([windowOptions.initSun])));
    let startRic = {
        r: 0,
        i: 0,
        c: 0
    };
    let stopRic = {
        r: windowOptions.width * 0.2 * sunAngle[0],
        i: windowOptions.width * 0.2 * sunAngle[1],
        c: windowOptions.width * 0.2 * sunAngle[2]
    }
    let angle = math.atan2(-stopRic.i, stopRic.r) * 180 / Math.PI;
    drawRicArrow({
        startRic,
        stopRic,
        angle,
        color: 'rgb(255,128,0)'
    })
    angle = math.atan2(-stopRic.i, stopRic.c) * 180 / Math.PI;
    drawRicArrow({
        startRic,
        stopRic,
        angle,
        color: 'rgb(255,128,0)',
        cross: true
    })
}

function drawSats() {
    let drawnTraj, passiveBurns;
    ctx.lineWidth = windowOptions.lineWidth;
    satellites.forEach((satellite, ii) => {
        ctx.strokeStyle = satellite.color;
        satellite.currentPosition = satellite.getCurrentState();
        let isBurning = false;
        satellite.burns.forEach((burn, jj) => {
            if (burn.time <= windowOptions.scenario_time_des) {
                let burnTime = math.norm([burn.direction.i, burn.direction.r, burn.direction
                    .c
                ]) / satellite.a;
                let constant = (windowOptions.scenario_time_des - burn.time) / burnTime;
                satellite.completedBurn = satellite.completedBurn ? satellite.completedBurn :
                    constant < 1 && constant >= -1e-6 ? {
                        constant,
                        burn: jj
                    } : false;
                if (windowOptions.burn_status.object !== ii || windowOptions.burn_status
                    .burn !== jj) {
                    drawBurnArrow(burn, {
                        cross: false,
                        object: ii,
                        constant,
                        trans: true,
                        length: cnvs.height * 0.075,
                        limit: {
                            min: 0,
                            max: (windowOptions.screen.ri_center + windowOptions.screen.ci_center) / 2
                        }
                    })
                    drawBurnArrow(burn, {
                        cross: true,
                        object: ii,
                        constant,
                        trans: true,
                        length: cnvs.height * 0.075,
                        limit: {
                            min: (windowOptions.screen.ri_center + windowOptions.screen.ci_center) / 2,
                            max: cnvs.height
                        }
                    })
                }
                if ((windowOptions.scenario_time - burn.time) < windowOptions.passiveDropoff
                    .time) {
                    passiveBurns = satellite.burns.slice(0, jj);
                    ctx.globalAlpha = Math.exp(-windowOptions.passiveDropoff.constant * (
                        windowOptions.scenario_time - burn.time));
                    drawSatellite({
                        position: satellite.position,
                        burns: passiveBurns,
                        data: false,
                        shape: satellite.shape,
                        size: satellite.size,
                        color: satellite.color,
                        a: satellite.a
                    });
                    ctx.globalAlpha = 1;
                }
            }
        })
        ctx.strokeStyle = satellite.color;

        if (satellite.completedBurn || satellite.burns.filter(burn => burn.time < (windowOptions
                .scenario_time_des)).length !== satellite.burnsDrawn) satellite.calcTraj();

        if (windowOptions.screen.mode !== 'ri only') {

            if (windowOptions.draw_style === 'line') {
                drawCurve(ctx, satellite.shownTraj, {
                    ric: true,
                    cross: true
                });
            } else {
                drawCurvePoints(ctx, satellite.shownTraj, {
                    ric: true,
                    cross: true,
                    color: satellite.color
                });
            }
            drawBurns(satellite, {
                cross: true
            });
            drawSatellite(satellite, true);
        }
        ctx.strokeStyle = satellite.color;
        if (windowOptions.draw_style === 'line') {
            drawCurve(ctx, satellite.shownTraj, {
                ric: true
            });
        } else {
            drawCurvePoints(ctx, satellite.shownTraj, {
                ric: true,
                color: satellite.color
            });
        }
        drawBurns(satellite);
        drawSatellite(satellite);
    })
}

function drawRicArrow(options) {
    let {
        startRic,
        stopRic,
        lineWidth = 10,
        arrowWidth = 20,
        arrowHeight = 20,
        color = 'black',
        cross = false,
        angle = 45
    } = options;
    let height = math.norm([startRic[cross ? 'c' : 'r'] - stopRic[cross ? 'c' : 'r'], startRic.i - stopRic.i]);
    height = height / windowOptions.width / 2 * cnvs.width;
    let origin = ricToPixel(startRic, {
        cross
    });
    drawArrow({
        angle,
        origin,
        lineWidth,
        arrowWidth,
        arrowHeight,
        color,
        cnvs,
        ctx,
        height
    })
}

function drawArrow(options = {}) {
    let {
        height = 150, lineWidth = 10, arrowWidth = 20, arrowHeight = 20, color = 'black', origin = [cvns.width /
            2, cvns.height / 2
        ], angle = 0, backHalf = false
    } = options;
    // console.log(origin);
    let points = [
        [-lineWidth / 2, 0 + (backHalf ? lineWidth / 2 : 0)],
        [-lineWidth / 2, -height + arrowHeight],
        [-arrowWidth / 2, -height + arrowHeight],
        [0, -height],
        [arrowWidth / 2, -height + arrowHeight],
        [lineWidth / 2, -height + arrowHeight],
        [lineWidth / 2, 0 + (backHalf ? lineWidth / 2 : 0)],
        [-lineWidth / 2, 0 + (backHalf ? lineWidth / 2 : 0)],
    ];
    points = math.transpose(math.multiply(rotMatrix({
        angle: angle
    }), math.transpose(points)));
    ctx.fillStyle = color;
    ctx.beginPath();
    points.forEach((point, ii) => {
        if (ii === 0) {
            ctx.moveTo(origin[0] + point[0], origin[1] + point[1]);
        } else {
            ctx.lineTo(origin[0] + point[0], origin[1] + point[1]);
        }
    });
    ctx.fill();
}

function rotMatrix(options = {}) {
    let {
        axis = 3, angle = 45, units = 'deg'
    } = options;
    return [
        [Math.cos(angle * (units === 'deg' ? Math.PI / 180 : 1)), -Math.sin(angle * (units === 'deg' ? Math
            .PI / 180 : 1))],
        [Math.sin(angle * (units === 'deg' ? Math.PI / 180 : 1)), Math.cos(angle * (units === 'deg' ? Math
            .PI / 180 : 1))]
    ];
}

function rotationMatrices(angle = 0, axis = 1, type = 'deg') {
    angle *= Math.PI / 180;
    let rotMat;
    if (axis === 1) {
        rotMat = [
            [1, 0, 0],
            [0, Math.cos(angle), -Math.sin(angle)],
            [0, Math.sin(angle), Math.cos(angle)]
        ];
    } else if (axis === 2) {
        rotMat = [
            [Math.cos(angle), 0, Math.sin(angle)],
            [0, 1, 0],
            [-Math.sin(angle), 0, Math.cos(angle)]
        ];
    } else {
        rotMat = [
            [Math.cos(angle), -Math.sin(angle), 0],
            [Math.sin(angle), Math.cos(angle), 0],
            [0, 0, 1]
        ]
    }
    return rotMat;
}

function drawSatellite(satellite, cross = false) {
    let {
        color = 'blue', shape = 'triangle', size = 0.1, position = {
            r: 0,
            i: 0
        }, data = false
    } = satellite;
    let pixelPosition = ricToPixel(getSatCurrentPosition({
        position: satellite.position,
        burns: satellite.burns,
        a: satellite.a
    }), {
        cross
    });
    // console.log(pixelPosition, satellite.position, satellite.burns)
    let limit = {
        min: cross ? (windowOptions.screen.ri_center + windowOptions.screen.ci_center) / 2 : 0,
        max: cross ? cnvs.height : (windowOptions.screen.ri_center + windowOptions.screen.ci_center) / 2
    }
    if (pixelPosition[1] > limit.max || pixelPosition[1] < limit.min) {
        return;
    }
    let shapeHeight = size * window.innerHeight;
    let points;
    switch (shape) {
        case 'triangle':
            points = [
                [0, -shapeHeight / 2],
                [-shapeHeight / 2, shapeHeight / 2],
                [shapeHeight / 2, shapeHeight / 2],
                [0, -shapeHeight / 2]
            ];
            drawPoints({
                points: points,
                color: color,
                origin: pixelPosition,
                ctx
            });
            break;
        case 'square':
            points = [
                [-shapeHeight / 2, -shapeHeight / 2],
                [shapeHeight / 2, -shapeHeight / 2],
                [shapeHeight / 2, shapeHeight / 2],
                [-shapeHeight / 2, shapeHeight / 2],
                [-shapeHeight / 2, -shapeHeight / 2]
            ];
            drawPoints({
                points: points,
                color: color,
                origin: pixelPosition,
                ctx
            });
            break;
        case 'up-triangle':
            points = [
                [0, shapeHeight / 2],
                [-shapeHeight / 2, -shapeHeight / 2],
                [shapeHeight / 2, -shapeHeight / 2],
                [0, shapeHeight / 2]
            ];
            drawPoints({
                points: points,
                color: color,
                origin: pixelPosition,
                ctx
            });
            break;
        case 'circle':
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(pixelPosition[0], pixelPosition[1], shapeHeight / 2, 0, 2 * Math.PI)
            ctx.fill()
            break;
    }
}

function ricToPixel(point = {
    r: 0,
    i: 0,
    c: 0
}, options = {}) {
    let {
        struct = false, cross = false
    } = options;
    let pointOut;
    let plotW = cnvs.width;
    let plotH = ((windowOptions.screen.mode === 'ci only' || windowOptions.screen.mode === '3da' ? -1 : 1) * windowOptions.screen.ri_center +
        windowOptions.screen.ci_center) / 2;
    let hwr = windowOptions.screen.ri_h_w_ratio;
    if (cross) {
        pointOut = [plotW / 2 - (point.i - windowOptions.origin_it) / windowOptions.width * plotW / 2, -point
            .c / windowOptions.width / hwr * plotH / 2 + windowOptions.screen.ci_center
        ];
        return struct ? {
            x: pointOut[0],
            y: pointOut[1]
        } : pointOut;
    }
    pointOut = [plotW / 2 - (point.i - windowOptions.origin_it) / windowOptions.width * plotW / 2, -point.r /
        windowOptions.width / hwr * plotH / 2 + windowOptions.screen.ri_center
    ];
    return struct ? {
        x: pointOut[0],
        y: pointOut[1]
    } : pointOut;
}

function pixelToRic(point = [0, 0], cross = false) {
    let plotW = cnvs.width;
    let plotH = ((windowOptions.screen.mode === 'ci only' ? -1 : 1) * windowOptions.screen.ri_center +
        windowOptions.screen.ci_center) / 2;
    let hwr = windowOptions.screen.ri_h_w_ratio;
    if (cross) {
        return {
            i: (plotW / 2 - point[0]) * windowOptions.width * 2 / plotW + windowOptions.origin_it,
            c: (windowOptions.screen.ci_center - point[1]) * windowOptions.width * hwr * 2 / plotH
        };
    }
    return {
        i: (plotW / 2 - point[0]) * windowOptions.width * 2 / plotW + windowOptions.origin_it,
        r: (windowOptions.screen.ri_center - point[1]) * windowOptions.width * hwr * 2 / plotH
    };
}

function drawPoints(options = {}) {
    let {
        color,
        points,
        borderWidth = 3,
        borderColor = 'white',
        ctx = ctx,
        origin
    } = options;
    ctx.fillStyle = color;
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = borderWidth;
    ctx.beginPath();
    points.forEach((point, ii) => {
        if (ii === 0) {
            ctx.moveTo(origin[0] + point[0], origin[1] + point[1]);
        } else {
            ctx.lineTo(origin[0] + point[0], origin[1] + point[1]);
        }
    });
    ctx.fill();
    ctx.stroke();
}

function drawBurnArrow(burn, options) {
    let {
        location = undefined, constant = 1, object = undefined, cross = windowOptions.mousePosition.screen ===
            'ci', trans = false, length, limit
    } = options;
    constant = constant > 1 ? 1 : constant;
    if (location === undefined) {
        location = satellites[object].getCurrentState({
            time: burn.time
        });
    }
    let burnMag = math.norm([burn.direction.r, burn.direction.i, burn.direction.c]);
    let angle = math.atan2(-burn.direction.i, cross ? burn.direction.c : burn.direction.r) * 180 / Math.PI;
    let height = length ? length * constant : math.norm([burn.direction[cross ? 'c' : 'r'], burn.direction.i]) * 1000 / windowOptions.burn_sensitivity * constant * cnvs
        .width / windowOptions.width /
        2;
    let origin = ricToPixel(location, {
        cross
    });
    if (limit) {
        if (origin[1] < limit.min || origin[1] > limit.max) return;
    }
    let color = satellites[object].color || 'black';
    ctx.textAlign = 'center';
    ctx.font = '25px Arial';
    ctx.fillStyle = color;
    if (trans) {
        if (windowOptions.scenario_time_des === burn.time) ctx.globalAlpha = 0;
        else ctx.globalAlpha = Math.exp(-windowOptions.passiveDropoff.constant * 0.5 * (
            windowOptions.scenario_time - burn.time));
    }
    ctx.fillText((burnMag * constant * 1000).toFixed(2) + ' m/s', origin[0], origin[1] + (burn.direction[cross ?
        'c' : 'r'] < 0.001 ? -25 : 35))
    // if (trans) {
    //     ctx.globalAlpha = 0.4
    // }
    drawArrow({
        angle,
        origin,
        color,
        cnvs,
        ctx,
        height,
        lineWidth: length ? 5 : 10,
        arrowWidth: length ? 10 : 20,
        arrowHeight: length ? 10 : 20
    })
    ctx.globalAlpha = 1;
    // ctx.strokeText((burnMag * 1000).toFixed(2) + ' m/s', origin[0], origin[1] + 55)

}

function checkClose(point1, point2, cross) {
    return windowOptions.closeLimit > math.norm([point1[cross ? 'c' : 'r'] - point2[cross ? 'c' : 'r'], point1
        .i - point2.i
    ]);
}

function getSatCurrentPosition(options = {}) {
    let {
        time = windowOptions.scenario_time, burnStop, position = this.position, burns = this.burns, a = this.a, log = false
    } = options
    if (burnStop === undefined) burnStop = burns.length;
    if (windowOptions.showFinite) {
        let t_prop = 0,
            phi, t_burn, alpha, phi_angle, n = windowOptions.mm;
        let pos = [
            [position.r],
            [position.i],
            [position.c],
            [position.rd],
            [position.id],
            [position.cd]
        ];
        for (let n_burn = 0; n_burn < burns.length; n_burn++) {
            if (time <= burns[n_burn].time) break;
            pos = math.multiply(phiMatrixWhole(burns[n_burn].time - t_prop), pos);
            t_prop = burns[n_burn].time;
            t_burn = burnStop <= n_burn ? 0 : math.norm([burns[n_burn].direction.r, burns[n_burn].direction.i,
                burns[n_burn].direction
                .c
            ]) / a;

            if (n_burn !== burns.length - 1) {
                t_burn = t_burn > (burns[n_burn + 1].time - burns[n_burn].time) ? burns[n_burn + 1].time - burns[n_burn].time : t_burn;
            }
            alpha = math.atan2(burns[n_burn].direction.i, burns[n_burn].direction.r);
            phi_angle = math.atan2(burns[n_burn].direction.c, math.norm([burns[n_burn].direction.r, burns[
                n_burn].direction.i]));
            if ((t_prop + t_burn) > time) {
                t_burn = time - t_prop;
                return {
                    r: [radialPosClosed(pos[0][0], pos[3][0], pos[4][0], a, alpha, phi_angle,
                        t_burn, n)],
                    i: [intrackPosClosed(pos[0][0], pos[3][0], pos[1][0], pos[4][0], a,
                        alpha, phi_angle, t_burn, n)],
                    c: [crosstrackPosClosed(pos[2][0], pos[5][0], a, phi_angle, t_burn, n)],
                    rd: [radialVelClosed(pos[0][0], pos[3][0], pos[4][0], a, alpha, phi_angle,
                        t_burn, n)],
                    id: [intrackVelClosed(pos[0][0], pos[3][0], pos[4][0], a, alpha, phi_angle,
                        t_burn, n)],
                    cd: [crosstrackVelClosed(pos[2][0], pos[5][0], a, phi_angle, t_burn, n)]
                }
            }
            pos = [
                [radialPosClosed(pos[0][0], pos[3][0], pos[4][0], a, alpha, phi_angle,
                    t_burn, n)],
                [intrackPosClosed(pos[0][0], pos[3][0], pos[1][0], pos[4][0], a, alpha,
                    phi_angle, t_burn, n)],
                [crosstrackPosClosed(pos[2][0], pos[5][0], a, phi_angle, t_burn, n)],
                [radialVelClosed(pos[0][0], pos[3][0], pos[4][0], a, alpha, phi_angle,
                    t_burn, n)],
                [intrackVelClosed(pos[0][0], pos[3][0], pos[4][0], a, alpha, phi_angle,
                    t_burn, n)],
                [crosstrackVelClosed(pos[2][0], pos[5][0], a, phi_angle, t_burn, n)]
            ];
            t_prop += t_burn;
        }
        phi = phiMatrixWhole(time - t_prop);
        pos = math.multiply(phi, pos);
        return {
            r: pos[0],
            i: pos[1],
            c: pos[2],
            rd: pos[3],
            id: pos[4],
            cd: pos[5]
        };
    }
    let r = [
            [position.r],
            [position.i],
            [position.c]
        ],
        r1, phi;
    let v = [
        [position.rd],
        [position.id],
        [position.cd]
    ];
    let timeProp = 0;
    for (let ii = 0; ii < burns.length; ii++) {
        if (burns[ii].time <= time) {
            phi = phiMatrix(burns[ii].time - timeProp);
            r1 = math.add(math.multiply(phi.rr, r), math.multiply(phi.rv, v));
            v = math.add(math.multiply(phi.vr, r), math.multiply(phi.vv, v));
            r = r1;
            v[0][0] += burnStop <= ii ? 0 : burnStop <= ii ? 0 : burns[ii].direction.r;
            v[1][0] += burnStop <= ii ? 0 : burns[ii].direction.i;
            v[2][0] += burnStop <= ii ? 0 : burns[ii].direction.c;
            timeProp = burns[ii].time;
        } else {
            break;
        }
    }
    phi = phiMatrix(time - timeProp);
    r1 = math.add(math.multiply(phi.rr, r), math.multiply(phi.rv, v));
    v = math.add(math.multiply(phi.vr, r), math.multiply(phi.vv, v));
    r = r1;
    return {
        r: r[0],
        i: r[1],
        c: r[2],
        rd: v[0],
        id: v[1],
        cd: v[2]
    };
}

function phiMatrix(t = 0, n = windowOptions.mm) {
    let nt = n * t;
    let cnt = Math.cos(nt);
    let snt = Math.sin(nt);
    return {
        rr: [
            [4 - 3 * cnt, 0, 0],
            [6 * (snt - nt), 1, 0],
            [0, 0, cnt]
        ],
        rv: [
            [snt / n, 2 * (1 - cnt) / n, 0],
            [2 * (cnt - 1) / n, (4 * snt - 3 * nt) / n, 0],
            [0, 0, snt / n]
        ],
        vr: [
            [3 * n * snt, 0, 0],
            [6 * n * (cnt - 1), 0, 0],
            [0, 0, -n * snt]
        ],
        vv: [
            [cnt, 2 * snt, 0],
            [-2 * snt, 4 * cnt - 3, 0],
            [0, 0, cnt]
        ]
    };
}

function phiMatrixWhole(t = 0, n = windowOptions.mm) {
    let nt = n * t;
    let cnt = Math.cos(nt);
    let snt = Math.sin(nt);
    return [
        [4 - 3 * cnt, 0, 0, snt / n, 2 * (1 - cnt) / n, 0],
        [6 * (snt - nt), 1, 0, 2 * (cnt - 1) / n, (4 * snt - 3 * nt) / n, 0],
        [0, 0, cnt, 0, 0, snt / n],
        [3 * n * snt, 0, 0, cnt, 2 * snt, 0],
        [6 * n * (cnt - 1), 0, 0, -2 * snt, 4 * cnt - 3, 0],
        [0, 0, -n * snt, 0, 0, cnt]
    ];
}

function calcSatShownTrajectories(whole = false, allBurns = false) {
    let t_calc, currentState, satBurn;
    phiMain = phiMatrixWhole(windowOptions.time_delta);
    this.shownTraj = [];
    t_calc = 0;
    currentState = [
        [this.position.r],
        [this.position.i],
        [this.position.c],
        [this.position.rd],
        [this.position.id],
        [this.position.cd]
    ];
    satBurn = this.burns.length > 0 ? 0 : undefined;
    this.burnsDrawn = 0;
    while (t_calc <= windowOptions.scenario_length * 3600) {
        this.shownTraj.push({
            r: currentState[0][0],
            i: currentState[1][0],
            c: currentState[2][0]
        });
        if (satBurn !== undefined) {
            if (((this.burns[satBurn].time - t_calc) <= windowOptions.time_delta && (this.burns[satBurn].time <=
                    (windowOptions.scenario_time_des + 0.5))) || allBurns) {
                if (windowOptions.showFinite) {
                    let t_burn = math.norm([this.burns[satBurn].direction.r, this.burns[satBurn]
                        .direction.i, this.burns[satBurn].direction.c
                    ]) / this.a;
                    if (satBurn !== this.burns.length - 1) {
                        t_burn = t_burn > (this.burns[satBurn + 1].time - this.burns[satBurn].time) ? this.burns[satBurn + 1].time - this.burns[satBurn].time : t_burn;
                    }
                    if (this.completedBurn && !windowOptions.burn_status) {
                        t_burn = t_burn < (windowOptions.scenario_time_des - this.burns[satBurn].time) ?
                            t_burn : windowOptions.scenario_time_des - this.burns[satBurn].time;
                    } else {
                        this.burnsDrawn++;
                    }
                    let position_start = math.multiply(phiMatrixWhole(this.burns[satBurn].time -
                        t_calc), currentState);
                    let position_finite;
                    let n = windowOptions.mm;
                    let alpha = math.atan2(this.burns[satBurn].direction.i, this.burns[satBurn]
                        .direction.r);
                    let phi_angle = math.atan2(this.burns[satBurn].direction.c, math.norm([this
                        .burns[satBurn].direction.r, this.burns[satBurn].direction.i
                    ]));
                    while ((this.burns[satBurn].time + t_burn - t_calc) > windowOptions
                        .time_delta) {
                        t_calc += windowOptions.time_delta;
                        position_finite = {
                            r: radialPosClosed(position_start[0][0], position_start[3][0],
                                position_start[4][0], this.a, alpha, phi_angle, t_calc -
                                this.burns[satBurn].time, n),
                            i: intrackPosClosed(position_start[0][0], position_start[3][0],
                                position_start[1][0], position_start[4][0], this.a,
                                alpha, phi_angle, t_calc - this.burns[satBurn].time, n),
                            c: crosstrackPosClosed(position_start[2][0], position_start[5][
                                    0
                                ], this.a, phi_angle, t_calc - this.burns[satBurn]
                                .time, n)
                        }
                        this.shownTraj.push(position_finite);
                    }
                    t_calc += windowOptions.time_delta;
                    currentState = [
                        [radialPosClosed(position_start[0][0], position_start[3][0],
                            position_start[4][0], this.a, alpha, phi_angle, t_burn, n)],
                        [intrackPosClosed(position_start[0][0], position_start[3][0],
                            position_start[1][0], position_start[4][0], this.a, alpha,
                            phi_angle, t_burn, n)],
                        [crosstrackPosClosed(position_start[2][0], position_start[5][0], this
                            .a, phi_angle, t_burn, n)],
                        [radialVelClosed(position_start[0][0], position_start[3][0],
                            position_start[4][0], this.a, alpha, phi_angle, t_burn, n)],
                        [intrackVelClosed(position_start[0][0], position_start[3][0],
                            position_start[4][0], this.a, alpha, phi_angle, t_burn, n)],
                        [crosstrackVelClosed(position_start[2][0], position_start[5][0], this
                            .a, phi_angle, t_burn, n)]
                    ];
                    currentState = math.multiply(phiMatrixWhole(t_calc - this.burns[satBurn]
                        .time - t_burn), currentState);
                    satBurn = this.burns.length === satBurn + 1 ? undefined : satBurn + 1;
                    continue;
                } else {
                    this.burnsDrawn++;
                    let phiI = phiMatrixWhole(this.burns[satBurn].time - t_calc),
                        phiF = phiMatrixWhole(windowOptions.time_delta - (this.burns[satBurn]
                            .time - t_calc));
                    currentState = math.multiply(phiI, currentState);
                    currentState[3][0] += this.burns[satBurn].direction.r;
                    currentState[4][0] += this.burns[satBurn].direction.i;
                    currentState[5][0] += this.burns[satBurn].direction.c;
                    currentState = math.multiply(phiF, currentState);
                    satBurn = this.burns.length === satBurn + 1 ? undefined : satBurn + 1;
                    t_calc += windowOptions.time_delta;
                    continue;
                }
            }
        }
        currentState = math.multiply(phiMain, currentState);
        t_calc += windowOptions.time_delta;
    }
}

function generateBurns(options = {}) {
    let {
        drawnBurn
    } = options;
    let startPosition = this.position;
    let r1, r2, v10, v1f, phi;
    for (let ii = 0; ii < this.burns.length; ii++) {
        r1 = this.getCurrentState({
            time: this.burns[ii].time,
            burnStop: ii
        });
        v10 = [r1.rd, r1.id, r1.cd];
        r1 = [r1.r, r1.i, r1.c]
        r2 = [
            [this.burns[ii].waypoint.target.r],
            [this.burns[ii].waypoint.target.i],
            [this.burns[ii].waypoint.target.c]
        ];
        if (windowOptions.showFinite && windowOptions.finiteTarget) {
            let dir = hcwFiniteBurnOneBurn({
                x: r1[0][0],
                y: r1[1][0],
                z: r1[2][0],
                xd: v10[0][0],
                yd: v10[1][0],
                zd: v10[2][0]
            }, {
                x: r2[0][0],
                y: r2[1][0],
                z: r2[2][0],
                xd: 0,
                yd: 0,
                zd: 0
            }, this.burns[ii].waypoint.tranTime, this.a);
            if (dir && dir.t > 0 && dir.t < 1) {
                this.burns[ii].direction.r = dir.r;
                this.burns[ii].direction.i = dir.i;
                this.burns[ii].direction.c = dir.c;

                if (ii === drawnBurn) {
                    drawBurnArrow(this.burns[ii], {
                        location: {
                            r: r1[0][0],
                            i: r1[1][0],
                            c: r1[2][0]
                        },
                        object: windowOptions.burn_status.object,
                        length: undefined
                    });
                }
                continue;
            }
        }
        phi = phiMatrix(this.burns[ii].waypoint.tranTime);
        let v1f = math.multiply(math.inv(phi.rv), math.subtract(r2, math.multiply(phi.rr, r1)));
        this.burns[ii].direction.r = v1f[0][0] - v10[0][0];
        this.burns[ii].direction.i = v1f[1][0] - v10[1][0];
        this.burns[ii].direction.c = v1f[2][0] - v10[2][0];
        if (ii === drawnBurn) {
            drawBurnArrow(this.burns[ii], {
                location: {
                    r: r1[0][0],
                    i: r1[1][0],
                    c: r1[2][0]
                },
                object: windowOptions.burn_status.object,
                length: undefined
            });
        }
    }

    this.calcTraj(true);
}

function drawCurve(ctx, points, options = {}) {
    let {
        tension = 1, type = 'stroke', ric = false, cross = false
    } = options;
    // ctx.beginPath();
    let point1 = ric === false ? points[0] : ricToPixel(points[0], {
        struct: true,
        cross
    });
    var t = tension;
    let limit = {
        min: cross ? (windowOptions.screen.ri_center + windowOptions.screen.ci_center) / 2 : 0,
        max: cross ? cnvs.height : (windowOptions.screen.ri_center + windowOptions.screen.ci_center) / 2
    }
    let withinBounds, lineDrawn = false,
        pathBegun = false;
    for (var i = 0; i < points.length - 1; i++) {
        var p0 = (i > 0) ? ric === true ? ricToPixel(points[i - 1], {
            struct: true,
            cross
        }) : points[i - 1] : point1;
        var p1 = ric === false ? points[i] : ricToPixel(points[i], {
            struct: true,
            cross
        });
        var p2 = ric === false ? points[i + 1] : ricToPixel(points[i + 1], {
            struct: true,
            cross
        });
        var p3 = (i != points.length - 2) ? ric === false ? points[i + 2] : ricToPixel(points[i + 2], {
            struct: true,
            cross
        }) : p2;

        var cp1x = p1.x + (p2.x - p0.x) / 6 * t;
        var cp1y = p1.y + (p2.y - p0.y) / 6 * t;

        var cp2x = p2.x - (p3.x - p1.x) / 6 * t;
        var cp2y = p2.y - (p3.y - p1.y) / 6 * t;
        if ((p1.y < limit.max && p1.y > limit.min) && (p2.y < limit.max && p2.y > limit.min)) {
            if (!withinBounds) {
                ctx.beginPath();
                pathBegun = true;
                ctx.moveTo(p1.x, p1.y);
                lineDrawn = false;
            }
            ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
            withinBounds = true;
        } else {
            if (withinBounds) {
                ctx.stroke();
                lineDrawn = true;
            }
            withinBounds = false;
        }
    }
    if (!pathBegun) {
        ctx.beginPath();
    }
    if (!lineDrawn) {
        ctx.stroke();
    }
}

function drawCurvePoints(ctx, points, options = {}) {
    let {
        ric = false, cross = false, color = 'red'
    } = options;

    let limit = {
        min: cross ? (windowOptions.screen.ri_center + windowOptions.screen.ci_center) / 2 : 0,
        max: cross ? cnvs.height : (windowOptions.screen.ri_center + windowOptions.screen.ci_center) / 2
    }
    points.forEach((point, ii) => {
        if (ii % 1 === 0) {
            let draw_point = ric === false ? point : ricToPixel(point, {
                struct: true,
                cross
            });
            if (draw_point.y < limit.max && draw_point.y > limit.min) {
                // ctx.fillStyle = 'white';
                // ctx.fillRect(draw_point.x-2.5, draw_point.y-2.5, 5, 5);
                ctx.fillStyle = color;
                ctx.fillRect(draw_point.x - 1.5, draw_point.y - 1.5, 3, 3);
            }
        }
    })

}

function drawBurns(satellite, options = {}) {
    let {
        cross = false
    } = options;
    let position;
    let limit = {
        min: cross ? (windowOptions.screen.ri_center + windowOptions.screen.ci_center) / 2 : 0,
        max: cross ? cnvs.height : (windowOptions.screen.ri_center + windowOptions.screen.ci_center) / 2
    }
    satellite.burns.forEach(burn => {
        if (burn.time < windowOptions.scenario_time) {
            position = satellite.getCurrentState({
                time: burn.time
            });
            position = ricToPixel(position, {
                cross
            });
            if (position[1] > limit.min && position[1] < limit.max) {
                ctx.fillStyle = 'white';
                ctx.beginPath();
                ctx.arc(position[0], position[1], window.innerHeight * windowOptions.burn_point_size *
                    1.4, 0, 2 * Math.PI)
                ctx.fill()
                ctx.fillStyle = satellite.color;
                ctx.beginPath();
                ctx.arc(position[0], position[1], window.innerHeight * windowOptions.burn_point_size, 0,
                    2 * Math.PI)
                ctx.fill()
            }
        }
    })
}

function calcBurns(burn, cross = false) {
    let sat = satellites[burn.object];
    let crossState = sat.getCurrentState({
        time: sat.burns[burn.burn].time + burn.time
    })
    if (windowOptions.burn_status.type === 'waypoint') {
        sat.burns[burn.burn].waypoint.tranTime = burn.time;
        sat.burns[burn.burn].waypoint.target = {
            r: cross ? crossState.r[0] : windowOptions.mousePosition.ric.r,
            i: cross ? crossState.i[0] : windowOptions.mousePosition.ric.i,
            c: crossState.c[0]
        }
    } else {
        sat.burns[burn.burn].direction = {
            r: cross ? sat.burns[burn.burn].direction.r : (windowOptions.mousePosition.ric.r - windowOptions
                .burn_status.burnLocation.r[0]) * windowOptions.burn_sensitivity / 1000,
            i: cross ? sat.burns[burn.burn].direction.i : (windowOptions.mousePosition.ric.i - windowOptions
                .burn_status.burnLocation.i[0]) * windowOptions.burn_sensitivity / 1000,
            c: cross ? (windowOptions.mousePosition.ric.c - windowOptions.burn_status.burnLocation.c[0]) *
                windowOptions.burn_sensitivity / 1000 : sat.burns[burn.burn].direction.c
        }
        let tranTime = sat.burns[burn.burn].waypoint.tranTime;
        let targetState = sat.getCurrentState({
            time: sat.burns[burn.burn].time + tranTime,
            burnStop: burn.burn + 1
        });
        sat.burns[burn.burn].waypoint.tranTime = tranTime;
        sat.burns[burn.burn].waypoint.target = {
            r: cross ? sat.burns[burn.burn].waypoint.target.r : targetState.r[0],
            i: cross ? sat.burns[burn.burn].waypoint.target.i : targetState.i[0],
            c: targetState.c[0]
        }
        if (true) {
            // Reset cross-track waypoint values in future to natural motion
            for (let hh = burn.burn + 1; hh < sat.burns.length; hh++) {
                targetState = sat.getCurrentState({
                    time: sat.burns[hh].time + sat.burns[hh].waypoint.tranTime,
                    burnStop: burn.burn + 1
                });
                sat.burns[hh].waypoint.target.c = targetState.c[0];
            }
        }
    }
    sat.generateBurns({
        drawnBurn: burn.burn
    });
}

function getRelativeData(n_target, n_origin) {
    let sunAngle, rangeRate, range, poca, toca, tanRate;
    let relPos = math.squeeze(math.subtract(satellites[n_origin].getPositionArray(), satellites[n_target]
        .getPositionArray()));
    let relVel = math.squeeze(math.subtract(satellites[n_origin].getVelocityArray(), satellites[n_target]
        .getVelocityArray()));
    range = math.norm(relPos);
    sunAngle = math.squeeze(math.multiply(rotationMatrices(-windowOptions.scenario_time * windowOptions.mm * 180 / Math.PI, 3), math.transpose([windowOptions.initSun])));
    sunAngle = math.acos(math.dot(relPos, sunAngle) / range) * 180 / Math.PI;
    sunAngle = 180 - sunAngle; // Appropriate for USSF
    rangeRate = math.dot(relVel, relPos) * 1000 / range;
    tanRate = Math.sqrt(Math.pow(math.norm(relVel), 2) - Math.pow(rangeRate, 2)) * 1000;
    let relPosHis = findMinDistance(satellites[n_origin].shownTraj, satellites[n_target].shownTraj);
    poca = math.min(findMinDistance(satellites[n_origin].shownTraj, satellites[n_target].shownTraj));
    toca = relPosHis.findIndex(element => element === poca);
    return {
        sunAngle,
        rangeRate,
        range,
        poca,
        toca,
        tanRate
    }
}

function findMinDistance(vector1, vector2) {
    let outVec = [];
    for (let jj = 0; jj < vector1.length; jj++) {
        outVec.push(math.norm([vector1[jj].r - vector2[jj].r, vector1[jj].i - vector2[jj].i, vector1[jj].c -
            vector2[jj].c
        ]));
    }
    return outVec
}

function generateBurnTable(object = 0) {
    let table = document.getElementById('waypoint-table').children[1];
    while (table.firstChild) {
        table.removeChild(table.firstChild);
    }
    let addStartTime = document.getElementById('add-start-time');
    let tranTime = Number(document.getElementById('add-tran-time').value);
    let endTime = satellites[object].burns.length === 0 ? windowOptions.start_date : new Date(windowOptions.start_date.getTime() + satellites[object].burns[satellites[object].burns.length - 1].time * 1000 + satellites[object].burns[satellites[object].burns.length - 1].waypoint.tranTime * 1000);
    let dt = (endTime.getTime() - windowOptions.start_date.getTime() + tranTime * 60000) / 1000;
    let crossState = satellites[object].getCurrentState({
        time: dt
    });
    document.getElementById('add-cross').value = crossState.c[0].toFixed(2);
    addStartTime.value = new Date(new Date(endTime).toString().split(' GMT')[0].substring(4) + 'Z').toISOString().substr(0, 19);

    if (satellites[object].burns.length === 0) return;
    let r1, r2, v, addedElement;
    for (let burn = 0; burn < satellites[object].burns.length; burn++) {
        addedElement = document.createElement('tr');
        addedElement.innerHTML = `
            <td>${new Date(windowOptions.start_date.getTime() + satellites[object].burns[burn].time * 1000).toString()
        .split(' GMT')[0].substring(4)}</td>
            <td><span>(${(satellites[object].burns[burn].waypoint.target.r).toFixed(3)}, ${(satellites[object].burns[burn].waypoint.target.i).toFixed(3)}, ${(satellites[object].burns[burn].waypoint.target.c).toFixed(3)})</span> km</td>
            <td><span>${(satellites[object].burns[burn].waypoint.tranTime / 60).toFixed(1)}</span></td>
            <td class="edit-button">Edit</td>
        `;
        table.appendChild(addedElement);
    }
    let editButtons = document.getElementsByClassName('edit-button');
    for (let button = 0; button < editButtons.length; button++) {
        editButtons[button].addEventListener('click', editButtonFunction);
    }
}

function editButtonFunction(event) {
    let tdList = event.target.parentElement.children,
        oldValue;
    if (event.target.innerText === 'Confirm') {
        event.target.innerText = 'Edit';
        oldValue = new Date(tdList[0].children[0].value).toString()
            .split(' GMT')[0].substring(4);
        tdList[0].innerText = oldValue;
        let tarList = tdList[1].children[0].getElementsByTagName('input');
        tdList[1].children[0].innerText = `(${tarList[0].value}, ${tarList[1].value}, ${tarList[2].value})`
        tdList[2].children[0].innerText = tdList[2].children[0].getElementsByTagName('input')[0].value;
        table2burns(Number(document.getElementById('satellite-way-select').value));
        return;
    }
    event.target.innerText = 'Confirm';
    // nextValue = new Date(new Date(event.target.parentElement.nextSibling.children[0].innerText + 'Z') - 15 * 60 * 1000);
    let tarList = tdList[1].children[0].innerText.substr(1, tdList[1].children[0].innerText.length - 2).split(',');
    oldValue = tdList[0].innerText + 'Z';
    tdList[0].innerHTML = `<input type="datetime-local" oninput="editChanged(this)" id="edit-date" style="width: 12vw" value="${new Date(oldValue).toISOString().substr(0,19)}"/>`;
    // tdList[0].children[0].value = '2014-02-09';
    tdList[1].children[0].innerHTML = `(<input style="width: 9vw; font-size: 2.25vw;" type="number" value="${Number(tarList[0])}"/>, <input style="width: 8vw; font-size: 2.25vw;" type="number" value="${Number(tarList[1])}"/>, <input style="width: 8vw; font-size: 2.25vw;" type="number" value="${Number(tarList[2])}"/>)`;
    tdList[2].children[0].innerHTML = `<input style="width: 9vw; font-size: 2.25vw;" type="number" value="${tdList[2].children[0].innerText}"/>`;
    
}

function editChanged(el) {
    let sat = document.getElementById('satellite-way-select').value;
    let parent = el.type === 'number' ? el.parentNode.parentNode.parentNode : el.parentNode.parentNode;
    let tranTime = Number(parent.children[2].children[0].children[0].value) * 60;
    let time = new Date(parent.children[0].children[0].value).getTime() - new Date(windowOptions.start_date).getTime();
    time /= 1000;
    let targetState = satellites[sat].getCurrentState({
        time: time + tranTime
    });
    let tarList = parent.children[1].getElementsByTagName('input');
    tarList[2].value = targetState.c[0].toFixed(1);
}

function waypoints2table(waypoints) {
    let table = document.getElementById('waypoint-table').children[1];
    while (table.firstChild) {
        table.removeChild(table.firstChild);
    }
    let addedElement;
    waypoints.forEach(point => {
        addedElement = document.createElement('tr');
        addedElement.innerHTML = `
            <td>${new Date(point.time).toString()
        .split(' GMT')[0].substring(4)}</td>
            <td><span>(${(point.r).toFixed(3)}, ${(point.i).toFixed(3)}, ${(point.c).toFixed(3)})</span> km</td>
            <td><span>${(point.tranTime).toFixed(3)}</span></td>
            <td class="edit-button">Edit</td>
        `;
        table.appendChild(addedElement);
    });
}

function table2burns(object) {
    let tableTrs = document.getElementById('waypoint-table').children[1].children,
        time, tranTime, startTime = windowOptions.start_date.getTime(),
        burns = [], target;
    for (let tr = 0; tr < tableTrs.length; tr++) {
        time = (Date.parse(tableTrs[tr].children[0].innerText) - startTime) / 1000;
        tranTime = Number(tableTrs[tr].children[2].innerText) * 60;
        target = tableTrs[tr].children[1].children[0].innerText.substr(1, tableTrs[tr].children[1].children[0].innerText.length - 2).split(',');
        burns.push({
            time,
            direction: {
                r: 0,
                i: 0,
                c: 0
            },
            waypoint: {
                tranTime,
                target: {
                    r: Number(target[0]),
                    i: Number(target[1]),
                    c: Number(target[2])
                }
            }
        });
    }
    satellites[object].burns = [...burns];
    satellites[object].generateBurns();
}

function downloadFile(filename, text) {
    var pom = document.createElement('a');
    pom.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    pom.setAttribute('download', filename);

    if (document.createEvent) {
        var event = document.createEvent('MouseEvents');
        event.initEvent('click', true, true);
        pom.dispatchEvent(event);
    } else {
        pom.click();
    }
}

document.getElementById('upload-options-button').addEventListener('change', event => {
    loadFileAsText(event.path[0].files[0])
})

function loadFileAsText(fileToLoad) {

    var fileReader = new FileReader();
    fileReader.onload = function (fileLoadedEvent) {
        var textFromFileLoaded = fileLoadedEvent.target.result;
        textFromFileLoaded = JSON.parse(textFromFileLoaded);
        satellites = textFromFileLoaded.satellites;
        windowOptions = textFromFileLoaded.windowOptions;
        windowOptions.start_date = new Date(windowOptions.start_date);
        let options;
        for (let ii = 0; ii < satellites.length; ii++) {
            // Have to create new satellites as methods don't transfer with JSON.parse
            options = {};
            for (element in satellites[ii]) {
                options[element] = satellites[ii][element];
            }
            satellites[ii] = newSatellite(options);
        }
        document.getElementById('options-panel').classList.toggle("hidden")
    };

    fileReader.readAsText(fileToLoad, "UTF-8");
}

function radialPosClosed(x0, xd0, yd0, a0, alpha, phi, t, n) {
    // alpha measured clockwise from +R
    // phi measured clockwise from -I
    return (4 * Math.pow(n, 2) * x0 + 2 * n * yd0 - 3 * Math.pow(n, 2) * x0 * Math.cos(n * t) - 2 * n * yd0 *
        Math.cos(n * t) - a0 * Math.cos(alpha) * Math.cos(phi) * Math.cos(n * t) + a0 * Math.cos(alpha) *
        Math.cos(phi) * Math.pow(Math.cos(n * t), 2) + 2 * a0 * n * t * Math.cos(phi) * Math.sin(alpha) +
        n * xd0 * Math.sin(n * t) - 2 * a0 * Math.cos(phi) * Math.sin(alpha) * Math.sin(n * t) + a0 * Math
        .cos(alpha) * Math.cos(phi) * Math.pow(Math.sin(n * t), 2)) / Math.pow(n, 2);
}

function intrackPosClosed(x0, xd0, y0, yd0, a0, alpha, phi, t, n) {
    return (-12 * Math.pow(n, 3) * t * x0 - 4 * n * xd0 + 2 * Math.pow(n, 2) * y0 - 6 * Math.pow(n, 2) * t *
        yd0 - 4 * a0 * n * t * Math.cos(alpha) * Math.cos(phi) + 4 * n * xd0 * Math.cos(n * t) - 3 * a0 *
        Math.pow(n, 2) * Math.pow(t, 2) * Math.cos(phi) * Math.sin(alpha) - 8 * a0 * Math.cos(phi) * Math
        .cos(n * t) * Math.sin(alpha) + 8 * a0 * Math.cos(phi) * Math.pow(Math.cos(n * t), 2) * Math.sin(
            alpha) + 12 * Math.pow(n, 2) * x0 * Math.sin(n * t) + 8 * n * yd0 * Math.sin(n * t) + 4 * a0 *
        Math.cos(alpha) * Math.cos(phi) * Math.sin(n * t) + 8 * a0 * Math.cos(phi) * Math.sin(alpha) * Math
        .pow(Math.sin(n * t), 2)) / (2 * Math.pow(n, 2));
}

function crosstrackPosClosed(z0, zd0, a0, phi, t, n) {
    return (Math.pow(n, 2) * z0 * Math.cos(n * t) + a0 * Math.sin(phi) - a0 * Math.cos(n * t) * Math.sin(phi) +
        n * zd0 * Math.sin(n * t)) / Math.pow(n, 2);
}

function radialVelClosed(x0, xd0, yd0, a0, alpha, phi, t, n) {
    return (Math.pow(n, 2) * xd0 * Math.cos(n * t) + 2 * a0 * n * Math.cos(phi) * Math.sin(alpha) - 2 * a0 * n *
        Math.cos(phi) * Math.cos(n * t) * Math.sin(alpha) + 3 * Math.pow(n, 3) * x0 * Math.sin(n * t) + 2 *
        Math.pow(n, 2) * yd0 * Math.sin(n * t) + a0 * n * Math.cos(alpha) * Math.cos(phi) * Math.sin(n * t)
    ) / Math.pow(n, 2);
}

function intrackVelClosed(x0, xd0, yd0, a0, alpha, phi, t, n) {
    return (-12 * Math.pow(n, 3) * x0 - 6 * Math.pow(n, 2) * yd0 - 4 * a0 * n * Math.cos(alpha) * Math.cos(
            phi) + 12 * Math.pow(n, 3) * x0 * Math.cos(n * t) + 8 * Math.pow(n, 2) * yd0 * Math.cos(n * t) +
        4 *
        a0 * n * Math.cos(alpha) * Math.cos(phi) * Math.cos(n * t) - 6 * a0 * Math.pow(n, 2) * t * Math.cos(
            phi) * Math.sin(alpha) - 4 * Math.pow(n, 2) * xd0 * Math.sin(n * t) + 8 * a0 * n * Math.cos(
            phi) * Math.sin(alpha) * Math.sin(n * t)) / (2 * Math.pow(n, 2));
}

function crosstrackVelClosed(z0, zd0, a0, phi, t, n) {
    return (Math.pow(n, 2) * zd0 * Math.cos(n * t) - Math.pow(n, 3) * z0 * Math.sin(n * t) + a0 * n * Math.sin(
        phi) * Math.sin(n * t)) / Math.pow(n, 2);
}

function hcwFiniteBurnOneBurn(stateInit, stateFinal, tf, a0, n = windowOptions.mm) {
    state = [
        [stateInit.x],
        [stateInit.y],
        [stateInit.z],
        [stateInit.xd],
        [stateInit.yd],
        [stateInit.zd]
    ];
    stateFinal = [
        [stateFinal.x],
        [stateFinal.y],
        [stateFinal.z],
        [stateFinal.xd],
        [stateFinal.yd],
        [stateFinal.zd]
    ];
    let v = proxOpsTargeter(state.slice(0, 3), stateFinal.slice(0, 3), tf);
    let v1 = v[0],
        yErr, S, dX = 1,
        F;
    let dv1 = math.subtract(v1, state.slice(3, 6));
    let Xret = [
        [Math.atan2(dv1[1][0], dv1[0][0])],
        [Math.atan2(dv1[2], math.norm([dv1[0][0], dv1[1][0]]))],
        [math.norm(math.squeeze(dv1)) / a0 / tf]
    ];
    let X = Xret.slice();
    if (X[2] > 1) {
        return false;
    }
    let errCount = 0;
    while (math.norm(math.squeeze(dX)) > 1e-6) {
        F = oneBurnFiniteHcw(stateInit, X[0][0], X[1][0], X[2][0], tf, a0, n);
        yErr = [
            [stateFinal[0][0] - F.x],
            [stateFinal[1][0] - F.y],
            [stateFinal[2][0] - F.z]
        ];
        S = proxOpsJacobianOneBurn(stateInit, a0, X[0][0], X[1][0], X[2][0], tf, n);
        dX = math.multiply(math.inv(S), yErr);
        // console.log(X,F)
        X = math.add(X, dX)
        if (errCount > 30) {
            // console.log(X)
            return false;
        }
        errCount++;
    }
    return {
        r: a0 * X[2] * tf * Math.cos(X[0][0]) * Math.cos(X[1][0]),
        i: a0 * X[2] * tf * Math.sin(X[0][0]) * Math.cos(X[1][0]),
        c: a0 * X[2] * tf * Math.sin(X[1][0]),
        t: X[2]
    }
    // return [Xret,X];
}

function hcwFiniteBurnTwoBurn(stateInit, stateFinal, tf, a0, n = windowOptions.mm) {
    state = [
        [stateInit.x],
        [stateInit.y],
        [stateInit.z],
        [stateInit.xd],
        [stateInit.yd],
        [stateInit.zd]
    ];
    stateFinal = [
        [stateFinal.x],
        [stateFinal.y],
        [stateFinal.z],
        [stateFinal.xd],
        [stateFinal.yd],
        [stateFinal.zd]
    ];
    let v = proxOpsTargeter(state.slice(0, 3), stateFinal.slice(0, 3), tf);
    let v1 = v[0],
        v2 = v[1],
        yErr, S, dX = 1,
        F, invS, invSSt, ii = 0;
    let dv1 = math.subtract(v1, state.slice(3, 6));
    let dv2 = math.subtract(state.slice(3, 6), v2);
    // [alpha - in plane angle, phi - out of plane angle, tB - total burn time %]
    let X = [
        [Math.atan2(dv1[1][0], dv1[0][0])],
        [Math.atan2(dv1[2], math.norm([dv1[0][0], dv1[1][0]]))],
        [math.norm(math.squeeze(dv1)) / a0 / tf],
        [Math.atan2(dv2[1][0], dv2[0][0])],
        [Math.atan2(dv2[2], math.norm([dv2[0][0], dv2[1][0]]))],
        [math.norm(math.squeeze(dv2)) / a0 / tf]
    ];
    while (math.norm(math.squeeze(dX)) > 1e-6) {
        F = twoBurnFiniteHcw(stateInit, X[0][0], X[1][0], X[3][0], X[4][0], X[2][0], X[5][0], tf, a0, n);
        yErr = [
            [stateFinal[0][0] - F.x],
            [stateFinal[1][0] - F.y],
            [stateFinal[2][0] - F.z],
            [stateFinal[3][0] - F.xd],
            [stateFinal[4][0] - F.yd],
            [stateFinal[5][0] - F.zd]
        ];
        S = proxOpsJacobianTwoBurn(stateInit, a0, X[0][0], X[1][0], X[2][0], X[3][0], X[4][0], X[5][0], tf, n);
        invSSt = math.inv(math.multiply(S, math.transpose(S)));
        invS = math.multiply(math.transpose(S), invSSt);
        // console.log(multiplyMatrix(math.transpose(S),invSSt))
        dX = math.multiply(invS, yErr);
        // console.log(yErr);
        // console.log(F)
        X = math.add(X, dX)
        ii++
        if (ii > 50) {
            break;
        }
    }
    return {
        burn1: {
            r: a0 * X[2] * tf * Math.cos(X[0][0]) * Math.cos(X[1][0]),
            i: a0 * X[2] * tf * Math.sin(X[0][0]) * Math.cos(X[1][0]),
            c: a0 * X[2] * tf * Math.sin(X[1][0]),
            t: X[2][0] * tf
        },
        burn2: {
            r: a0 * X[5] * tf * Math.cos(X[3][0]) * Math.cos(X[4][0]),
            i: a0 * X[5] * tf * Math.sin(X[3][0]) * Math.cos(X[4][0]),
            c: a0 * X[5] * tf * Math.sin(X[4][0]),
            t: X[5][0] * tf
        }
    }
    // return X;
}

function calcTwoBurn(options = {}) {
    let {
        stateF,
        stateI,
        a = 0.00001,
        tf = 7200 * 1.5,
        startTime
    } = options;
    outBurns = [];
    let X = hcwFiniteBurnTwoBurn(stateI, stateF, tf, a);
    if (X.burn1.t < 0 || X.burn2.t < 0 || (X.burn1.t + X.burn2.t) > tf) {
        // Find transfer time that works if original returns no solution
        let ii = tf;
        let tryList = [];
        while (ii >= 1800) {
            tryList.push(ii);
            ii -= 900;
        }
        ii = tf;
        while (ii < 8 * 3600) {
            tryList.push(ii);
            ii += 900;
        }
        let returnBool = true;
        for (let kk = 0; kk < tryList.length; kk++) {
            let Xtry = hcwFiniteBurnTwoBurn(stateI, stateF, tryList[kk], a);
            if (Xtry.burn1.t > 0 && Xtry.burn2.t > 0 && (Xtry.burn1.t + Xtry.burn2.t) < tryList[kk]) {
                returnBool = false;
                X = Xtry;
                tf = tryList[kk];
                alert(`Solution found with tranfer time of ${tryList[kk] / 60} mins`);
                break;
            }
        }
        if (returnBool) return false;
    };
    let alpha = math.atan2(X.burn1.i, X.burn1.r);
    let phi = math.atan2(X.burn1.c, math.norm([X.burn1.r, X.burn1.i]));
    let res = oneBurnFiniteHcw(stateI, alpha, phi, X.burn1.t / tf, tf, a, windowOptions.mm);
    outBurns.push({
        time: startTime,
        direction: {
            r: 0,
            i: 0,
            z: 0
        },
        waypoint: {
            tranTime: tf,
            target: {
                r: res.x,
                i: res.y,
                c: res.z
            }
        }
    })
    res = oneBurnFiniteHcw(stateI, alpha, phi, X.burn1.t / (tf - X.burn2.t), tf - X.burn2.t, a, windowOptions.mm);
    alpha = math.atan2(X.burn2.i, X.burn2.r);
    phi = math.atan2(X.burn2.c, math.norm([X.burn2.r, X.burn2.i]));
    res = oneBurnFiniteHcw(res, alpha, phi, 0.5, X.burn2.t * 2, a, windowOptions.mm);
    outBurns.push({
        time: startTime + tf - X.burn2.t,
        direction: {
            r: 0,
            i: 0,
            z: 0
        },
        waypoint: {
            tranTime: X.burn2.t * 2,
            target: {
                r: res.x,
                i: res.y,
                c: res.z
            }
        }
    })
    console.log(X);
    return outBurns;
}

function testTwoBurn(options = {}) {
    let tf = 7200 * 2;
    let a = 0.00001;

    let stateF = {
        x: 0,
        y: 0,
        z: 0,
        xd: 0,
        yd: 0,
        zd: 0
    };
    let stateI = {
        x: satellites[0].currentPosition.r[0],
        y: satellites[0].currentPosition.i[0],
        z: satellites[0].currentPosition.c[0],
        xd: satellites[0].currentPosition.rd[0],
        yd: satellites[0].currentPosition.id[0],
        zd: satellites[0].currentPosition.cd[0]
    };
    console.log(stateF, stateI, a, tf);
    let X = hcwFiniteBurnTwoBurn(stateI, stateF, tf, a);
    if (X.burn1.t < 0 || X.burn2.t < 0) return false;
    let alpha = math.atan2(X.burn1.i, X.burn1.r);
    let phi = math.atan2(X.burn1.c, math.norm([X.burn1.r, X.burn1.i]));
    let res = oneBurnFiniteHcw(stateI, alpha, phi, X.burn1.t / tf, tf, a, windowOptions.mm);
    satellites[0].burns.push({
        time: windowOptions.scenario_time_des,
        direction: {
            r: 0,
            i: 0,
            z: 0
        },
        waypoint: {
            tranTime: tf,
            target: {
                r: res.x,
                i: res.y,
                c: res.z
            }
        }
    })
    res = oneBurnFiniteHcw(stateI, alpha, phi, X.burn1.t / (tf - X.burn2.t), tf - X.burn2.t, a, windowOptions.mm);
    alpha = math.atan2(X.burn2.i, X.burn2.r);
    phi = math.atan2(X.burn2.c, math.norm([X.burn2.r, X.burn2.i]));
    res = oneBurnFiniteHcw(res, alpha, phi, 0.5, X.burn2.t * 2, a, windowOptions.mm);
    satellites[0].burns.push({
        time: windowOptions.scenario_time_des + tf - X.burn2.t,
        direction: {
            r: 0,
            i: 0,
            z: 0
        },
        waypoint: {
            tranTime: X.burn2.t * 2,
            target: {
                r: res.x,
                i: res.y,
                c: res.z
            }
        }
    })
    satellites[0].generateBurns();
    satellites[0].calcTraj();
}

function oneBurnFiniteHcw(state, alpha, phi, tB, t, a0, n = windowOptions.mm) {
    x0 = state.x;
    xd0 = state.xd;
    y0 = state.y;
    yd0 = state.yd;
    z0 = state.z;
    zd0 = state.zd;
    // console.log(x0,y0,z0)
    let xM = radialPosClosed(x0, xd0, yd0, a0, alpha, phi, tB * t, n);
    let xdM = radialVelClosed(x0, xd0, yd0, a0, alpha, phi, tB * t, n);
    let yM = intrackPosClosed(x0, xd0, y0, yd0, a0, alpha, phi, tB * t, n);
    let ydM = intrackVelClosed(x0, xd0, yd0, a0, alpha, phi, tB * t, n);
    let zM = crosstrackPosClosed(z0, zd0, a0, phi, tB * t, n);
    let zdM = crosstrackVelClosed(z0, zd0, a0, phi, tB * t, n);
    let xF = radialPosClosed(xM, xdM, ydM, 0, 0, 0, t - tB * t, n);
    let xdF = radialVelClosed(xM, xdM, ydM, 0, 0, 0, t - tB * t, n);
    let yF = intrackPosClosed(xM, xdM, yM, ydM, 0, 0, 0, t - tB * t, n);
    let ydF = intrackVelClosed(xM, xdM, ydM, 0, 0, 0, t - tB * t, n);
    let zF = crosstrackPosClosed(zM, zdM, 0, 0, t - tB * t, n);
    let zdF = crosstrackVelClosed(zM, zdM, 0, 0, t - tB * t, n);
    return {
        x: xF,
        y: yF,
        z: zF,
        xd: xdF,
        yd: ydF,
        zd: zdF
    };

}

function proxOpsJacobianOneBurn(state, a, alpha, phi, tB, tF, n) {
    let m1, m2, mC, mFinal = [];
    //alpha
    m1 = oneBurnFiniteHcw(state, alpha, phi, tB, tF, a, n);
    m1 = [
        [m1.x],
        [m1.y],
        [m1.z]
    ];
    m2 = oneBurnFiniteHcw(state, alpha + 0.01, phi, tB, tF, a, n);
    m2 = [
        [m2.x],
        [m2.y],
        [m2.z]
    ];
    // console.log(m1,m2)
    mC = math.dotDivide(math.subtract(m2, m1), 0.01);
    mFinal = mC;
    //phi
    m1 = oneBurnFiniteHcw(state, alpha, phi, tB, tF, a, n);
    m1 = [
        [m1.x],
        [m1.y],
        [m1.z]
    ];
    m2 = oneBurnFiniteHcw(state, alpha, phi + 0.01, tB, tF, a, n);
    m2 = [
        [m2.x],
        [m2.y],
        [m2.z]
    ];
    m = math.dotDivide(math.subtract(m2, m1), 0.01);
    mC = math.concat(mC, m);
    //tB
    m1 = oneBurnFiniteHcw(state, alpha, phi, tB, tF, a, n);
    m1 = [
        [m1.x],
        [m1.y],
        [m1.z]
    ];
    m2 = oneBurnFiniteHcw(state, alpha, phi, tB + 0.01, tF, a, n);
    m2 = [
        [m2.x],
        [m2.y],
        [m2.z]
    ];
    m = math.dotDivide(math.subtract(m2, m1), 0.01);
    mC = math.concat(mC, m);
    return mC;
}

function proxOpsJacobianTwoBurn(state, a, alpha1, phi1, tB1, alpha2, phi2, tB2, tF, n) {
    let m1, m2, mC, mFinal = [];
    //alpha1
    m1 = twoBurnFiniteHcw(state, alpha1, phi1, alpha2, phi2, tB1, tB2, tF, a, n);
    m1 = [
        [m1.x],
        [m1.y],
        [m1.z],
        [m1.xd],
        [m1.yd],
        [m1.zd]
    ];
    m2 = twoBurnFiniteHcw(state, alpha1 + 0.0001, phi1, alpha2, phi2, tB1, tB2, tF, a, n);
    m2 = [
        [m2.x],
        [m2.y],
        [m2.z],
        [m2.xd],
        [m2.yd],
        [m2.zd]
    ];
    mC = math.dotDivide(math.subtract(m2, m1), 0.0001);
    mFinal = mC;
    //phi1
    m1 = twoBurnFiniteHcw(state, alpha1, phi1, alpha2, phi2, tB1, tB2, tF, a, n);
    m1 = [
        [m1.x],
        [m1.y],
        [m1.z],
        [m1.xd],
        [m1.yd],
        [m1.zd]
    ];
    m2 = twoBurnFiniteHcw(state, alpha1, phi1 + 0.0001, alpha2, phi2, tB1, tB2, tF, a, n);
    m2 = [
        [m2.x],
        [m2.y],
        [m2.z],
        [m2.xd],
        [m2.yd],
        [m2.zd]
    ];
    mC = math.dotDivide(math.subtract(m2, m1), 0.0001);
    mFinal = math.concat(mFinal, mC);
    //tB1
    m1 = twoBurnFiniteHcw(state, alpha1, phi1, alpha2, phi2, tB1, tB2, tF, a, n);
    m1 = [
        [m1.x],
        [m1.y],
        [m1.z],
        [m1.xd],
        [m1.yd],
        [m1.zd]
    ];
    m2 = twoBurnFiniteHcw(state, alpha1, phi1, alpha2, phi2, tB1 + 0.0001, tB2, tF, a, n);
    m2 = [
        [m2.x],
        [m2.y],
        [m2.z],
        [m2.xd],
        [m2.yd],
        [m2.zd]
    ];
    mC = math.dotDivide(math.subtract(m2, m1), 0.0001);
    mFinal = math.concat(mFinal, mC);
    //alpha2
    m1 = twoBurnFiniteHcw(state, alpha1, phi1, alpha2, phi2, tB1, tB2, tF, a, n);
    m1 = [
        [m1.x],
        [m1.y],
        [m1.z],
        [m1.xd],
        [m1.yd],
        [m1.zd]
    ];
    m2 = twoBurnFiniteHcw(state, alpha1, phi1, alpha2 + 0.0001, phi2, tB1, tB2, tF, a, n);
    m2 = [
        [m2.x],
        [m2.y],
        [m2.z],
        [m2.xd],
        [m2.yd],
        [m2.zd]
    ];
    mC = math.dotDivide(math.subtract(m2, m1), 0.0001);
    mFinal = math.concat(mFinal, mC);
    //phi2
    m1 = twoBurnFiniteHcw(state, alpha1, phi1, alpha2, phi2, tB1, tB2, tF, a, n);
    m1 = [
        [m1.x],
        [m1.y],
        [m1.z],
        [m1.xd],
        [m1.yd],
        [m1.zd]
    ];
    m2 = twoBurnFiniteHcw(state, alpha1, phi1, alpha2, phi2 + 0.0001, tB1, tB2, tF, a, n);
    m2 = [
        [m2.x],
        [m2.y],
        [m2.z],
        [m2.xd],
        [m2.yd],
        [m2.zd]
    ];
    mC = math.dotDivide(math.subtract(m2, m1), 0.0001);
    mFinal = math.concat(mFinal, mC);
    //tB2
    m1 = twoBurnFiniteHcw(state, alpha1, phi1, alpha2, phi2, tB1, tB2, tF, a, n);
    m1 = [
        [m1.x],
        [m1.y],
        [m1.z],
        [m1.xd],
        [m1.yd],
        [m1.zd]
    ];
    m2 = twoBurnFiniteHcw(state, alpha1, phi1, alpha2, phi2, tB1, tB2 + 0.0001, tF, a, n);
    m2 = [
        [m2.x],
        [m2.y],
        [m2.z],
        [m2.xd],
        [m2.yd],
        [m2.zd]
    ];
    mC = math.dotDivide(math.subtract(m2, m1), 0.0001);
    mFinal = math.concat(mFinal, mC);
    return mFinal;
}

function twoBurnFiniteHcw(state, alpha1, phi1, alpha2, phi2, tB1, tB2, tf, a0, n = windowOptions.mm) {
    x0 = state.x;
    xd0 = state.xd;
    y0 = state.y;
    yd0 = state.yd;
    z0 = state.z;
    zd0 = state.zd;
    let t1 = tB1 * tf,
        t2 = tf - tB1 * tf - tB2 * tf,
        t3 = tB2 * tf;
    let xM1 = radialPosClosed(x0, xd0, yd0, a0, alpha1, phi1, t1, n);
    let xdM1 = radialVelClosed(x0, xd0, yd0, a0, alpha1, phi1, t1, n);
    let yM1 = intrackPosClosed(x0, xd0, y0, yd0, a0, alpha1, phi1, t1, n);
    let ydM1 = intrackVelClosed(x0, xd0, yd0, a0, alpha1, phi1, t1, n);
    let zM1 = crosstrackPosClosed(z0, zd0, a0, phi1, t1, n);
    let zdM1 = crosstrackVelClosed(z0, zd0, a0, phi1, t1, n);
    let xM2 = radialPosClosed(xM1, xdM1, ydM1, 0, 0, 0, t2, n);
    let xdM2 = radialVelClosed(xM1, xdM1, ydM1, 0, 0, 0, t2, n);
    let yM2 = intrackPosClosed(xM1, xdM1, yM1, ydM1, 0, 0, 0, t2, n);
    let ydM2 = intrackVelClosed(xM1, xdM1, ydM1, 0, 0, 0, t2, n);
    let zM2 = crosstrackPosClosed(zM1, zdM1, 0, 0, t2, n);
    let zdM2 = crosstrackVelClosed(zM1, zdM1, 0, 0, t2, n);
    let xF = radialPosClosed(xM2, xdM2, ydM2, a0, alpha2, phi2, t3, n);
    let xdF = radialVelClosed(xM2, xdM2, ydM2, a0, alpha2, phi2, t3, n);
    let yF = intrackPosClosed(xM2, xdM2, yM2, ydM2, a0, alpha2, phi2, t3, n);
    let ydF = intrackVelClosed(xM2, xdM2, ydM2, a0, alpha2, phi2, t3, n);
    let zF = crosstrackPosClosed(zM2, zdM2, a0, phi2, t3, n);
    let zdF = crosstrackVelClosed(zM2, zdM2, a0, phi2, t3, n);
    return {
        x: xF,
        y: yF,
        z: zF,
        xd: xdF,
        yd: ydF,
        zd: zdF
    };

}

function proxOpsTargeter(r1, r2, t) {
    let phi = phiMatrix(t);
    v1 = math.multiply(math.inv(phi.rv), math.subtract(r2, math.multiply(phi.rr, r1)));
    v2 = math.add(math.multiply(phi.vr, r1), math.multiply(phi.vv, v1));
    return [v1, v2];
}

function initStateFunction(el) {
    let nodes; // Set nodes to top div under initial state to grab inputs
    nodes = el.parentNode.parentNode.parentNode;
    if (el.classList.contains('rmoe')) {
        let rmoes = {
            ae: Number(nodes.children[0].children[0].getElementsByTagName('input')[0].value),
            x:  Number(nodes.children[0].children[1].getElementsByTagName('input')[0].value),
            y:  Number(nodes.children[0].children[2].getElementsByTagName('input')[0].value),
            b:  Number(nodes.children[0].children[3].getElementsByTagName('input')[0].value),
            z:  Number(nodes.children[0].children[4].getElementsByTagName('input')[0].value),
            m:  Number(nodes.children[0].children[5].getElementsByTagName('input')[0].value)
        }
        nodes.children[1].children[0].getElementsByTagName('input')[0].value = (-rmoes.ae / 2 * Math.cos(rmoes.b * Math.PI / 180) + rmoes.x).toFixed(3);
        nodes.children[1].children[1].getElementsByTagName('input')[0].value = (rmoes.ae * Math.sin(rmoes.b * Math.PI / 180) + rmoes.y).toFixed(3);
        nodes.children[1].children[2].getElementsByTagName('input')[0].value = (rmoes.z * Math.sin(rmoes.m * Math.PI / 180)).toFixed(3);
        nodes.children[1].children[3].getElementsByTagName('input')[0].value = (1000 * rmoes.ae * windowOptions.mm / 2 * Math.sin(rmoes.b * Math.PI / 180)).toFixed(3);
        nodes.children[1].children[4].getElementsByTagName('input')[0].value = (1000 * rmoes.ae * windowOptions.mm * Math.cos(rmoes.b * Math.PI / 180) - 1500 * rmoes.x * windowOptions.mm).toFixed(3);
        nodes.children[1].children[5].getElementsByTagName('input')[0].value = (1000 * rmoes.z * windowOptions.mm * Math.cos(rmoes.m * Math.PI / 180)).toFixed(3);
    }
    else {
        if (el.classList.contains('panel-button')) {
            nodes = el.parentNode.parentNode.children[1];
        }
        let state = {
            r: Number(nodes.children[1].children[0].getElementsByTagName('input')[0].value),
            i: Number(nodes.children[1].children[1].getElementsByTagName('input')[0].value),
            c: Number(nodes.children[1].children[2].getElementsByTagName('input')[0].value),
            rd: Number(nodes.children[1].children[3].getElementsByTagName('input')[0].value) / 1000,
            id: Number(nodes.children[1].children[4].getElementsByTagName('input')[0].value) / 1000,
            cd: Number(nodes.children[1].children[5].getElementsByTagName('input')[0].value) / 1000
        };
        console.log(state);
        if (el.classList.contains('panel-button')) {
            let a = Math.pow(398600.4418 / Math.pow(windowOptions.mm, 2), 1/3);
            let ang = state.i / a * 180 / Math.PI;
            state.r += (a - a * Math.cos(ang * Math.PI / 180 ));
            let rotState = math.squeeze(math.multiply(rotationMatrices(-ang, 3), [[state.rd], [state.id], [state.cd]]));
            state.rd = rotState[0];
            state.id = rotState[1];
            rotState = math.squeeze(math.multiply(rotationMatrices(-ang, 3), [[state.r], [0], [0]]));
            nodes.children[1].children[0].getElementsByTagName('input')[0].value = (rotState[0]).toFixed(3);
            nodes.children[1].children[1].getElementsByTagName('input')[0].value = (state.i + rotState[1]).toFixed(3);
            nodes.children[1].children[3].getElementsByTagName('input')[0].value = (state.rd * 1000).toFixed(3);
            nodes.children[1].children[4].getElementsByTagName('input')[0].value = (state.id * 1000).toFixed(3);
        }
        nodes.children[0].children[1].getElementsByTagName('input')[0].value = (4 * state.r + 2 * state.id / windowOptions.mm).toFixed(3);
        nodes.children[0].children[2].getElementsByTagName('input')[0].value = (state.i - 2 * state.rd / windowOptions.mm).toFixed(3);
        nodes.children[0].children[0].getElementsByTagName('input')[0].value = (2 * Math.sqrt(Math.pow(3 * state.r + 2 * state.id / windowOptions.mm, 2) + Math.pow(state.rd / windowOptions.mm, 2))).toFixed(3);
        nodes.children[0].children[3].getElementsByTagName('input')[0].value = (Math.atan2(state.rd, 3 * windowOptions.mm * state.r + 2 * state.id) * 180 / Math.PI).toFixed(3);
        nodes.children[0].children[5].getElementsByTagName('input')[0].value = (Math.atan2(state.c, state.cd / windowOptions.mm) * 180 / Math.PI).toFixed(3);
        nodes.children[0].children[4].getElementsByTagName('input')[0].value = (Math.sqrt(Math.pow(state.c, 2) + Math.pow(state.cd / windowOptions.mm, 2))).toFixed(3);
    }
    
}