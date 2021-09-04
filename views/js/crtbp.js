let cnvs = document.getElementById('main-cnvs');
let ctx = cnvs.getContext('2d');
let screen_width = 1600000;
let r_Earth = 6371;
let r_moon = 1738.1;
let a_moon = 384399;
let m_moon = 7.342;
let m_earth = 597.237;
let mass_ratio = m_moon / m_earth;
let mu_star = mass_ratio / (1 + mass_ratio);
let p_earth = a_moon * mu_star;
let p_moon = a_moon * (1-mu_star);
let mu_earth = 398600.4418;
let mu_moon = 4904.8695;
let total_time = 0;
let timeStep = 50;
let r_l1 = 326400;
let start_List = [
    [315331, 0.159517],
    [305331, 0.39],
    [295331, 0.4927294],
    [285331, 0.557289],
    [275331, 0.557289],
]
// mu_moon = 000;
let omega_moon = 2*Math.PI / 27.321661/86164;
cnvs.width = window.innerWidth;
cnvs.height = window.innerHeight;
// L2 R 425747 V 0.30137 Ang 180
function jacobi_constant(state) {
    state = math.squeeze(state);
    x = state[0];
    y = state[1];
    dx = state[2];
    dy = state[3];
    
    let r1 = Math.sqrt(Math.pow(x + p_earth, 2) + y*y);
    let r2 = Math.sqrt(Math.pow(x - p_moon, 2) + y*y);
    return 2 * mu_earth / r1 + 2 * mu_moon / r2 + omega_moon * omega_moon * (x*x + y*y) - dx*dx - dy*dy;
}

function crtbd_eom(state) {
    state = math.squeeze(state);
    x = state[0];
    y = state[1];
    dx = state[2];
    dy = state[3];
    let r1 = Math.sqrt(Math.pow(x + p_earth, 2) + y*y);
    let r2 = Math.sqrt(Math.pow(x - p_moon, 2) + y*y);
    // console.log(r1, r2, -mu_earth * (x + p_earth), -mu_earth * (x + p_earth) / Math.pow(r1,3), mu_moon * (x - p_moon) / Math.pow(r2,3));
    return [[dx],
            [dy],
            [-mu_earth * (x + p_earth) / Math.pow(r1,3) - mu_moon * (x - p_moon) / Math.pow(r2,3) + 2*dy*omega_moon + x*omega_moon*omega_moon],
            [-mu_earth*y / Math.pow(r1,3) - mu_moon * y / Math.pow(r2,3) - 2*dx*omega_moon + y*omega_moon*omega_moon]];
}
// let state_sat = [[-11568], [0], [0], [-10.55]];
let state_sat, inertial, angle;

updateState(document.getElementById('update-button'));
function runge_kutta(eom, state, dt) {
    let k1 = eom(state);
    let k2 = eom(math.add(state, math.dotMultiply(dt/2, k1)));
    let k3 = eom(math.add(state, math.dotMultiply(dt/2, k2)));
    let k4 = eom(math.add(state, math.dotMultiply(dt/1, k3)));
    return math.add(state, math.dotMultiply(dt / 6, (math.add(k1, math.dotMultiply(2, k2), math.dotMultiply(2, k3), k4))));
}


function drawJacobiConstant() {
    let c = jacobi_constant(state_sat), stateCheck;
    ctx.fillStyle = 'black';
    for (let xx = -0.5; xx <= 0.5; xx += 0.0025) {
        for (let yy = -0.5; yy <= 0.5; yy += 0.0025) {
            stateCheck = [xx * screen_width, yy*screen_width];
            if (checkJacobiConstant(stateCheck, c) < 0) {
                ctx.beginPath();
                ctx.arc(cnvs.width / 2 + xx * cnvs.width, cnvs.height / 2 - yy * cnvs.width, 0.5, 0, 2 * Math.PI);
                ctx.fill()
            }
        }
    }
}

function checkJacobiConstant(state, c) {
    x = state[0];
    y = state[1];
    let r1 = Math.sqrt(Math.pow(x + p_earth, 2) + y*y);
    let r2 = Math.sqrt(Math.pow(x - p_moon, 2) + y*y);
    return 2 * mu_earth / r1 + 2 *mu_moon / r2 - c + omega_moon * omega_moon * (x*x + y*y);
}

function applyRotation(ang, state) {
    return math.multiply([[math.cos(ang), -math.sin(ang)],[math.sin(ang), math.cos(ang)]], state);
}
function drawAnimation() {
    let rotState = JSON.parse(JSON.stringify(state_sat));
    rotState = rotState.slice(0,2);
    rotState[0][0] += p_earth;
    rotState = applyRotation(angle, rotState);
    if (inertial) {
        ctx.beginPath();
        ctx.arc(rotState[0][0] / screen_width * cnvs.width + cnvs.width / 2, -rotState[1][0] / screen_width * cnvs.width + cnvs.height / 2, 1, 0, 2*Math.PI);
        ctx.fill()
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.arc(cnvs.width / 2, cnvs.height / 2, p_moon / screen_width * cnvs.width, 0, 2 * Math.PI);
        ctx.stroke();
    }
    else
    {
        ctx.beginPath();
        ctx.arc(state_sat[0][0] / screen_width * cnvs.width + cnvs.width / 2, -state_sat[1][0] / screen_width * cnvs.width + cnvs.height / 2, 1, 0, 2*Math.PI);0
        ctx.fill();
    }
    
    ctx.fillStyle = 'gray';
    ctx.beginPath();
    ctx.arc(cnvs.width / 2 + p_moon*math.cos(angle) / screen_width * cnvs.width, cnvs.height / 2- p_moon*math.sin(angle) / screen_width * cnvs.width, r_moon / screen_width * cnvs.width, 0, 2 * Math.PI);
    ctx.fill();
    for (let ii = 0; ii < 100; ii++) {  
        state_sat = runge_kutta(crtbd_eom, state_sat, timeStep);
        angle += inertial ? timeStep * omega_moon : 0;
        total_time += timeStep;
    }

    window.requestAnimationFrame(drawAnimation);
}

function updateState(el) {
    let inputs = el.parentNode.parentNode.getElementsByTagName('input');
    let p = inputs[0].value, v = inputs[1].value, alpha = inputs[2].value;
    inertial = inputs[3].checked,
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, cnvs.width, cnvs.height);
    ctx.fillStyle = 'green';
    ctx.beginPath();
    ctx.arc(cnvs.width / 2 - p_earth / screen_width * cnvs.width, cnvs.height / 2, r_Earth / screen_width * cnvs.width, 0, 2 * Math.PI);
    ctx.fill();
    
    ctx.fillStyle = 'gray';
    ctx.beginPath();
    ctx.arc(cnvs.width / 2 + p_moon / screen_width * cnvs.width, cnvs.height / 2, r_moon / screen_width * cnvs.width, 0, 2 * Math.PI);
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'gray';
    ctx.beginPath();
    ctx.arc(cnvs.width / 2 - p_earth / screen_width * cnvs.width, cnvs.height / 2, 42164 / screen_width * cnvs.width, 0, 2 * Math.PI);
    ctx.stroke();

    state_sat = [[-p*math.cos(alpha*Math.PI / 180)-p_earth], [-p*math.sin(alpha*Math.PI / 180)], [v*math.sin(alpha*Math.PI / 180)], [-v*math.cos(alpha*Math.PI / 180)]];
    if (!inertial) drawJacobiConstant();
    angle = 0;
    total_time = 0;
}

function findYcrossing(state) {
    let dt_check = 100;
    let old_Y, iter = 0;
    let totalTime = 0;
    // console.log(math.squeeze(state));
    while ((state[1][0] * old_Y >= 0 || iter < 10) && iter < 100000) {
        old_Y = state[1][0];
        state = runge_kutta(crtbd_eom, state, dt_check);
        totalTime += dt_check;
        iter++;
    }   
    // console.log(math.squeeze(state));
    dt_check = -50;
    iter = 0;
    old_Y = state[1][0];
    while (state[1][0] * old_Y >= 0 && iter < 1000) {
        old_Y = state[1][0];
        state = runge_kutta(crtbd_eom, state, dt_check);
        totalTime += dt_check;
        iter++;
    }  
    dt_check = 1;
    iter = 0;
    old_Y = state[1][0];
    while (state[1][0] * old_Y >= 0 && iter < 1000) {
        old_Y = state[1][0];
        state = runge_kutta(crtbd_eom, state, dt_check);
        totalTime += dt_check;
        iter++;
    }   
    dt_check = -0.1;
    iter = 0;
    old_Y = state[1][0];
    while (state[1][0] * old_Y >= 0 && iter < 1000) {
        old_Y = state[1][0];
        state = runge_kutta(crtbd_eom, state, dt_check);
        totalTime += dt_check;
        iter++;
    }  
    // console.log(math.squeeze(state));
    dt_check = 0.01;
    iter = 0;
    old_Y = state[1][0];
    while (state[1][0] * old_Y >= 0 && iter < 1000) {
        old_Y = state[1][0];
        state = runge_kutta(crtbd_eom, state, dt_check);
        totalTime += dt_check;
        iter++;
    }  
    // console.log(math.squeeze(state));
    dt_check = -0.001;
    iter = 0;
    old_Y = state[1][0];
    while (state[1][0] * old_Y >= 0 && iter < 1000) {
        old_Y = state[1][0];
        state = runge_kutta(crtbd_eom, state, dt_check);
        totalTime += dt_check;
        iter++;
    } 
    // console.log(math.squeeze(state));
    dt_check = 0.0001;
    iter = 0;
    old_Y = state[1][0];
    while (state[1][0] * old_Y >= 0 && iter < 1000) {
        old_Y = state[1][0];
        state = runge_kutta(crtbd_eom, state, dt_check);
        totalTime += dt_check;
        iter++;
    } 
    dt_check = -0.00001;
    iter = 0;
    old_Y = state[1][0];
    while (state[1][0] * old_Y >= 0 && iter < 1000) {
        old_Y = state[1][0];
        state = runge_kutta(crtbd_eom, state, dt_check);
        totalTime += dt_check;
        iter++;
    } 
    dt_check = 0.000001;
    iter = 0;
    old_Y = state[1][0];
    while (state[1][0] * old_Y >= 0 && iter < 1000) {
        old_Y = state[1][0];
        state = runge_kutta(crtbd_eom, state, dt_check);
        totalTime += dt_check;
        iter++;
    } 
    dt_check = -0.0000001;
    iter = 0;
    old_Y = state[1][0];
    while (state[1][0] * old_Y >= 0 && iter < 1000) {
        old_Y = state[1][0];
        state = runge_kutta(crtbd_eom, state, dt_check);
        totalTime += dt_check;
        iter++;
    }
    // console.log(math.squeeze(state));
    return {state, totalTime}
}

function findZeroX(state) {
    let r1, r2, r, dr;
    let ii = 0;
    while (ii < 30) {
        r1 = findYcrossing([state[0], state[1], state[2], [state[3][0] - 0.000001]]);
        r2 = findYcrossing([state[0], state[1], state[2], [state[3][0] + 0.000001]]);
        r = findYcrossing(JSON.parse(JSON.stringify(state)));
        dr = (r2.state[2][0] - r1.state[2][0]) / 0.000002;
        state[3][0] += dr/1000 * (0-r.state[2][0])
        ii++;
        console.log(ii);
        console.log(math.squeeze(r.state)[2]);
    }
    r = findYcrossing(JSON.parse(JSON.stringify(state)));
    console.log(math.squeeze(r.state), r.totalTime, math.squeeze(state));
    state_sat = JSON.parse(JSON.stringify(state));
    drawAnimation();
} 

// drawAnimation();