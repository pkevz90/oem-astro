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
let r_l1 = 323050;
let r_l2 = 445747;
let start_List = [
    [320000, 0.0373198],
    [315000, 0.1690624],
    [305000, 0.4017912],
    [295000, 0.4950998],
    [290000, 0.5285252],
    [285000, 0.5592776],
    [281695, 0.5789062],
    [277982, 0.6066675],
    [273619, 0.6212661],
    [268433, 0.6565165],
    [262189, 0.6936229],
    [395000, 0.7651171],
    [400000, 0.6359031],
    [405000, 0.5374359],
    [410000, 0.4553654],
    [420000, 0.3154343],
    [430000, 0.1876775],
    [440000, 0.0574053],
    [330000, -0.1632151],
    [340000, -0.3245016],
    [345000, -0.4011516],
    [350000, -0.4801243],
    [360000, -0.6683041],
    [361000, -0.6917287], 
    [362000, -0.7165618],
    [365000, -0.8021397], 
    [366000, -0.8355603],
    [368000, -0.9130046], 
    [369000, -0.9587229],
    [370000, -1.0107337],
    [371000, -1.0708598],
    // [375000, -1.4723240],
]
let lineFits = {
    negL1: [1.4767699104458463e-34, -1.444802714244446e-28, 3.178239681119367e-23, 7.781419479231116e-18, -1.8200377175309124e-12, -0.0000011272047365332115, 0.39307073789995134, -34562.87981910345],
    negL2: [1.1643443351043588e-19, -1.9937362098427212e-13, 1.2800708620166524e-7, -0.03653599771316007, 3913.0928052662703],
    // posL1: [-5.806226091280285e-30, 4.663676345076874e-24, 2.1747576940358077e-18, -3.7876259884365225e-12, 0.000001685834259013218, -0.32806773006227147, 24246.91817584545],
    posL1: [2.6985012487887867e-29, -6.063233670389052e-23, 5.605914087504013e-17, -2.735889785771263e-11, 0.000007445253078495057, -1.072502930476524, 63954.08354692072]
}
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
    let r1 = Math.pow(Math.sqrt(Math.pow(x + p_earth, 2) + y*y), 3);
    let r2 = Math.pow(Math.sqrt(Math.pow(x - p_moon, 2) + y*y), 3);
    return [[dx],
            [dy],
            [-mu_earth * (x + p_earth) / r1 - mu_moon * (x - p_moon) / r2 + 2*dy*omega_moon + x*omega_moon*omega_moon],
            [-mu_earth*y / r1 - mu_moon * y / r2 - 2*dx*omega_moon + y*omega_moon*omega_moon]];
}
// let state_sat = [[-11568], [0], [0], [-10.55]];
let state_sat, inertial, angle;

updateState(document.getElementById('update-button'));
function runge_kuttaRalston(eom, state, dt) {
    let k1 = eom(state);
    let k2 = eom(math.add(state, math.dotMultiply(dt*0.4, k1)));
    let k3 = eom(math.add(state, math.dotMultiply(dt*0.15875964, k2), math.dotMultiply(dt*0.29697761, k1)));
    let k4 = eom(math.add(state, math.dotMultiply(dt*(-3.050961516), k2), math.dotMultiply(dt*0.21810040, k1), math.dotMultiply(dt*3.83286476, k3)));
    return math.add(state, math.dotMultiply(dt, (math.add(math.dotMultiply(0.17476028, k1), math.dotMultiply(-0.55148066, k2), math.dotMultiply(1.20553560, k3), math.dotMultiply(0.17118478, k4)))));
}
function runge_kutta(eom, state, dt) {
    let k1 = eom(state);
    let k2 = eom(math.add(state, math.dotMultiply(dt/2, k1)));
    let k3 = eom(math.add(state, math.dotMultiply(dt/2, k2)));
    let k4 = eom(math.add(state, math.dotMultiply(dt/1, k3)));
    return math.add(state, math.dotMultiply(dt / 6, (math.add(k1, math.dotMultiply(2, k2), math.dotMultiply(2, k3), k4))));
}

function calcLine(x, line) {
    let returnValue = 0;
    for (let ii = line.length - 1; ii >=0; ii--) {
        returnValue += Math.pow(x, ii) * line[line.length - 1 - ii];
    }
    return returnValue;
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
        state_sat = runge_kuttaRalston(crtbd_eom, state_sat, timeStep);
        // state_sat = runge_kutta(crtbd_eom, state_sat, timeStep);
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

function updateStateL(state) {
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

    state_sat = JSON.parse(JSON.stringify(state));
    drawJacobiConstant();
    angle = 0;
    total_time = 0;
}

function findYcrossingBetter(state) {
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
    for (let ii = 1; ii < 20; ii++) {
        dt_check *= -0.1;
        iter = 0;
        old_Y = state[1][0];
        while (state[1][0] * old_Y >= 0 && iter < 1000) {
            old_Y = state[1][0];
            state = runge_kutta(crtbd_eom, state, dt_check);
            totalTime += dt_check;
            iter++;
        }  
    }
    return {state, totalTime}
}

function findYcrossing(state) {
    let dt_check = 1500;
    let old_Y, iter = 0;
    let totalTime = 0;
    let runs = 0;
    // console.log(math.squeeze(state));
    while ((state[1][0] * old_Y >= 0 || iter < 10) && iter < 100000) {
        old_Y = state[1][0];
        // state = runge_kutta(crtbd_eom, state, dt_check);
        state = runge_kuttaRalston(crtbd_eom, state, dt_check);
        totalTime += dt_check;
        iter++;
        runs++;
    }   
    // console.log(runs);
    // runs = 0;
    for (let ii = 1; ii < 20; ii++) {
        dt_check *= -0.1;
        iter = 0;
        old_Y = state[1][0];
        while (state[1][0] * old_Y >= 0 && iter < 1000) {
            old_Y = state[1][0];
            // state = runge_kutta(crtbd_eom, state, dt_check);
            state = runge_kuttaRalston(crtbd_eom, state, dt_check);
            totalTime += dt_check;
            iter++;
            runs++;
        }  
    }
    // console.log(runs);
    return {state, totalTime}
}

function calcInPlaneLagrangeOrbit(relX) {
    state_sat = math.transpose([[relX, 0, 0, calcLine(relX, relX > a_moon ? lineFits.negL2 :  (relX > 324000 ? lineFits.posL1 : lineFits.negL1))]]);
    console.log(state_sat);
    // return
    findZeroX(state_sat);
}

function findZeroX(state) {
    console.time()
    let r1, r2, r, dr;
    let ii = 0;
    let origState = JSON.parse(JSON.stringify(state));
    let oldDx = 1000, ddr = 10, consecBad = 0, limit = 60;
    let ii_total = 0;
    while ((ii < limit && ii_total < 200) && math.abs(oldDx) > 1e-14) {
        r1 = findYcrossing([state[0], state[1], state[2], [state[3][0] - 0.000001]]);
        r2 = findYcrossing([state[0], state[1], state[2], [state[3][0] + 0.000001]]);
        r = findYcrossing(JSON.parse(JSON.stringify(state)));
        dr = (r2.state[2][0] - r1.state[2][0]) / 0.000002;
        state[3][0] += dr / ddr * (0 - r.state[2][0])
        ii++;
        ii_total++;
        if (Math.pow(oldDx, 2) < Math.pow(r.state[2][0], 2)) {
            console.log('consecBad: ' + consecBad);
            if ((consecBad > 1 || (ii < 10)) && math.abs(oldDx) > 1e-8 ) {
                console.log('Reset to ddr of' + ddr / 0.5);
                ddr /= 0.5;
                state = JSON.parse(JSON.stringify(origState));
                ii = 0;
                oldDx = 1000;
                consecBad = 0;
            }
            else {
                consecBad++;
            }
        }
        oldDx = r.state[2][0];
        console.log(ii, math.abs(math.squeeze(r.state)[2]));
    }
    r = findYcrossing(JSON.parse(JSON.stringify(state)));
    console.log(math.squeeze(r.state));
    console.log(math.squeeze(state));
    console.timeEnd()
    updateStateL(state);
    drawAnimation();
} 

function calcCovariance(points, order) {
    let x = [],
        y = [],
        b = math.zeros(order + 1, 1)._data;
    points.forEach(point => {
        x.push(point[0]);
        y.push(point[1])
    });
    x = math.transpose([x]);
    y = math.transpose([y]);
    let a;
    for (let ii = order; ii >= 0; ii--) {
        if (ii === order) {
        a = math.dotPow(x, ii);
        } else {
        a = math.concat(a, math.dotPow(x, ii));
        }
    }
    let yCalc;
    for (let ii = 0; ii < 1; ii++) {
        yCalc = [];
        x.forEach(xDig => {
            yCalc.push([calcLine(xDig, math.squeeze(b))]);
        })
        b = math.add(math.multiply(math.multiply(math.inv(math.multiply(math.transpose(a), a)), math.transpose(a)), math.subtract(y, yCalc)), b);
        console.log(math.norm(math.squeeze(math.subtract(y, yCalc))));
    }
    return b;
}


// drawAnimation();