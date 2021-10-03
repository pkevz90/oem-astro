var cnvs = document.getElementsByTagName('canvas')[0];
cnvs.width = window.innerWidth;
cnvs.height = window.innerHeight;
var ctx = cnvs.getContext('2d');
var rEarth = 6371;
var rOrbit = 6700;
var mu = 398600.4418;
let satState = math.transpose([[rOrbit, 0, 0, Math.sqrt(mu / rOrbit)]]);
let sitePos = [0, rEarth];
var paused = false;
var timeStep = 5;
var interceptor = undefined;
var debris = [];
var timeToImpact = undefined;
function runge_kutta(eom, state, dt) {
    let k1 = eom(state);
    let k2 = eom(math.add(state, math.dotMultiply(dt/2, k1)));
    let k3 = eom(math.add(state, math.dotMultiply(dt/2, k2)));
    let k4 = eom(math.add(state, math.dotMultiply(dt/1, k3)));
    return math.add(state, math.dotMultiply(dt / 6, (math.add(k1, math.dotMultiply(2, k2), math.dotMultiply(2, k3), k4))));
}

let twoBodyEom2d = function(state, mu = 398600.4418) {
    let s = math.squeeze(state);
    let r = math.norm(math.squeeze(state.slice(0,2)));
    return [
        [s[2]],
        [s[3]],
        [-mu / r**3 * s[0]],
        [-mu / r**3 * s[1]],
    ]
} 

var screenWidth = 5000;
var screenHeight = screenWidth * cnvs.height / cnvs.width;
var earthCenter = -6000;

function position2pixel(position) {
    position = math.squeeze(position);
    let x = position[0], y = position[1];
    return [
        cnvs.width / 2 + x / screenWidth * cnvs.width,
        cnvs.height - earthCenter / screenWidth * cnvs.width - y / screenWidth * cnvs.width
    ]
}

function drawEarth() {
    ctx.fillStyle = 'green';
    let pixPos = position2pixel([0, 0]);
    ctx.beginPath();
    ctx.arc(pixPos[0], pixPos[1], rEarth / screenWidth * cnvs.width, 0, 2 * Math.PI);
    ctx.fill();
}

function drawSat(state, size = 10) {
    let pixPos = position2pixel([state[0][0], state[1][0]]);
    
    ctx.fillStyle = 'black';
    ctx.beginPath();
    ctx.arc(pixPos[0], pixPos[1], size / screenWidth * cnvs.width, 0, 2 * Math.PI);
    ctx.fill();

}

function drawSite() {
    let pixPos = position2pixel([sitePos[0], sitePos[1]]);
    
    ctx.fillStyle = 'black';
    ctx.beginPath();
    ctx.arc(pixPos[0], pixPos[1], 10 / screenWidth * cnvs.width, 0, 2 * Math.PI);
    ctx.fill();

}

function createRendezvousObject() {
    timeToImpact = 15*60;
    interceptor = math.transpose([[sitePos[0], sitePos[1], 0, 2]]);
    timeStep /= 4 ;
}

function generateDebris() {
    let pos = math.squeeze(satState).slice(0,2);
    let vel1 = math.squeeze(satState).slice(2,4);
    let vel2 = math.squeeze(interceptor).slice(2,4);
    let c = 20, c1, c2;
    debris = [];
    for (let ii = 0; ii < 300; ii++) {
        c1 = Math.random() * c;
        c2 = Math.random();

        debris.push(math.transpose([[pos[0], pos[1], vel1[0] * c1 / (c1 + c2) + vel2[0] * c2 / (c1 + c2), vel1[1] * c1 / (c1 + c2) + vel2[1] * c2 / (c1 + c2)]]))
    }
}

function updateTargetState() {
    if (timeToImpact <= 5) {
        generateDebris();
        interceptor = undefined;
        return;
    }
    timeToImpact -= timeStep;
    let newState = runge_kutta(twoBodyEom2d, satState, timeToImpact);
    let result = solveLambertsProblem(math.squeeze(interceptor).slice(0,2), math.squeeze(newState).slice(0,2), timeToImpact, 0, true);
    interceptor[2][0] += (result.v1[0] - interceptor[2][0]) * 1/(timeToImpact ** 0.8);
    interceptor[3][0] += (result.v1[1] - interceptor[3][0]) * 1/(timeToImpact ** 0.8);
    // console.log(interceptor[2][0], result.v1[0]);
}

(function animate() {
    ctx.clearRect(0,0,cnvs.width, cnvs.height);
    drawEarth();
    if (!paused) satState = runge_kutta(twoBodyEom2d, satState, timeStep);
    if (debris) {
        if (!paused) {
            for (let ii = 0; ii < debris.length; ii++) {
                if (!debris[ii]) continue;
                debris[ii] = runge_kutta(twoBodyEom2d, debris[ii], timeStep)
                drawSat(debris[ii], 2.5);
                if (math.norm([debris[ii][0][0], debris[ii][1][0]]) < 6500) debris[ii] = undefined;
            }
        } 
    }
    if (interceptor) {
        updateTargetState();
        if (!paused && interceptor) interceptor = runge_kutta(twoBodyEom2d, interceptor, timeStep)
        if (interceptor) drawSat(interceptor);
        
    }
    drawSat(satState);
    drawSite()
    window.requestAnimationFrame(animate);
})() 

window.addEventListener('keydown', event => {
    if (event.key === ' ') {
        createRendezvousObject();
    }
})