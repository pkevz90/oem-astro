let cnvs = document.getElementById('main-cnvs');
let ctx = cnvs.getContext('2d');
let screen_width = 1000000;
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
let omega_moon = 2*Math.PI / 27.321661/86164;
cnvs.width = window.innerWidth;
cnvs.height = window.innerHeight;
ctx.fillStyle = 'green';
ctx.beginPath();
ctx.arc(cnvs.width / 2 - p_earth / screen_width * cnvs.width, cnvs.height / 2, r_Earth / screen_width * cnvs.width, 0, 2 * Math.PI);
ctx.fill();

ctx.fillStyle = 'gray';
ctx.beginPath();
ctx.arc(cnvs.width / 2 + p_moon / screen_width * cnvs.width, cnvs.height / 2, r_moon / screen_width * cnvs.width, 0, 2 * Math.PI);
ctx.fill();
ctx.strokeStyle = 'gray';
ctx.beginPath();
ctx.arc(cnvs.width / 2 - p_earth / screen_width * cnvs.width, cnvs.height / 2, 42164 / screen_width * cnvs.width, 0, 2 * Math.PI);
ctx.stroke();

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
            [-mu_earth * (x + p_earth) / Math.pow(r1,3) - mu_moon * (x - p_moon) / Math.pow(r2,3) + 2*dy*omega_moon+x*omega_moon*omega_moon],
            [-mu_earth*y / Math.pow(r1,3) - mu_moon * y / Math.pow(r2,3) - 2*dx*omega_moon+y*omega_moon*omega_moon]];
}
// let state_sat = [[-11568], [0], [0], [-10.55]];
let alpha = 64, v = 9.825, p = 8000;
let state_sat = [[-p*math.cos(alpha*Math.PI / 180)-p_earth], [-p*math.sin(alpha*Math.PI / 180)], [v*math.sin(alpha*Math.PI / 180)], [-v*math.cos(alpha*Math.PI / 180)]];
state_sat = [[326400 - p_earth],[-0.0],[0.05],[0]];
state_sat = [[111396.481],[154892.626], [-0.325965],[0.978304]];
console.log(math.squeeze(state_sat));
function runge_kutta(eom, state, dt) {
    let k1 = eom(state);
    let k2 = eom(math.add(state, math.dotMultiply(dt/2, k1)));
    let k3 = eom(math.add(state, math.dotMultiply(dt/2, k2)));
    let k4 = eom(math.add(state, math.dotMultiply(dt/1, k3)));
    return math.add(state, math.dotMultiply(dt / 6, (math.add(k1, math.dotMultiply(2, k2), math.dotMultiply(2, k3), k4))));
}

console.log(jacobi_constant(state_sat))
for (let t = 0; t < 160*86164; t += 50) {
    ctx.beginPath();
    ctx.arc(state_sat[0][0] / screen_width * cnvs.width + cnvs.width / 2, -state_sat[1][0] / screen_width * cnvs.width + cnvs.height / 2, 0.15, 0, 2*Math.PI);
    ctx.fill();
    state_sat = runge_kutta(crtbd_eom, state_sat, 50);
    // console.log(state_sat);
}

function drawJacobiConstant() {
    let c = jacobi_constant(state_sat), stateCheck;
    ctx.fillStyle = 'black';
    for (let xx = -0.5; xx <= 0.5; xx += 0.0025) {
        for (let yy = -0.5; yy <= 0.5; yy += 0.0025) {
            stateCheck = [xx * screen_width, yy*screen_width];
            if (checkJacobiConstant(stateCheck, c) < 0) {
                ctx.beginPath();
                ctx.arc(cnvs.width / 2 + xx * cnvs.width, cnvs.height / 2 - yy * cnvs.width, 0.125, 0, 2 * Math.PI);
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
console.log(jacobi_constant(state_sat))
drawJacobiConstant()