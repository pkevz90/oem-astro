var cnvs = document.getElementsByTagName('canvas')[0];
cnvs.width = window.innerWidth;
cnvs.height = window.innerHeight;
var ctx = cnvs.getContext('2d');
var rEarth = 6371;
var mu = 398600.4418;
var timeStep = 5;
var points = {
    r1: [-3000,6600.137, 0],
    r2: [-4464.696, -5102.509, 0],
    r3: [5740.323, 5189.068, 0]
}
var satState = undefined;
var orbit = undefined;
var activePoint = null;
function runge_kutta(eom, state, dt) {
    let k1 = eom(state);
    let k2 = eom(math.add(state, math.dotMultiply(dt/2, k1)));
    let k3 = eom(math.add(state, math.dotMultiply(dt/2, k2)));
    let k4 = eom(math.add(state, math.dotMultiply(dt/1, k3)));
    return math.add(state, math.dotMultiply(dt / 6, (math.add(k1, math.dotMultiply(2, k2), math.dotMultiply(2, k3), k4))));
}

let twoBodyEom = function(state, mu = 398600.4418) {
    let s = math.squeeze(state);
    let r = math.norm(math.squeeze(state.slice(0,2)));
    return [
        [s[3]],
        [s[4]],
        [s[5]],
        [-mu / r**3 * s[0]],
        [-mu / r**3 * s[1]],
        [-mu / r**3 * s[2]],
    ]
} 

var screenWidth = 30000;
var screenHeight = screenWidth * cnvs.height / cnvs.width;
var earthCenter = 0;

function position2pixel(position, show = false) {
    if (show) console.log(position);
    position = math.squeeze(position);
    let x = position[0], y = position[1];
    return [
        cnvs.width / 2 + x / screenWidth * cnvs.width,
        cnvs.height / 2 - earthCenter / screenWidth * cnvs.width - y / screenWidth * cnvs.width
    ]
}

function pixel2position(pixel) {
    return [
        (pixel[0] - cnvs.width / 2) * screenWidth / cnvs.width,
        -(pixel[1] - cnvs.height / 2 + earthCenter / screenWidth * cnvs.width) * screenWidth / cnvs.width
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

function drawPoints(method = 'gibbs') {
    ctx.fillStyle = 'black';
    if (method === 'gibbs') {
        for (point in points) {
            let pixelPos = position2pixel(points[point]);
            ctx.beginPath();
            ctx.arc(pixelPos[0], pixelPos[1], 3, 0, Math.PI * 2);
            ctx.fill();
            
        }
    }
}

function determineOrbit(method = 'gibbs') {
    if (method === 'gibbs') {
        let v2 = gibbsMethod(points.r1, points.r2, points.r3);
        satState = math.concat(points.r2, v2);
    }
}

function drawCurve(ctx, points) {
    ctx.beginPath();
    let point1 = points[0];
    var t = 1;
    for (var i = 0; i < points.length - 1; i++) {
        var p0 = (i > 0) ? points[i - 1] : point1;
        var p1 = points[i];
        var p2 = points[i + 1];
        var p3 = (i != points.length - 2) ? points[i + 2] : p2;

        var cp1x = p1.x + (p2.x - p0.x) / 6 * t;
        var cp1y = p1.y + (p2.y - p0.y) / 6 * t;

        var cp2x = p2.x - (p3.x - p1.x) / 6 * t;
        var cp2y = p2.y - (p3.y - p1.y) / 6 * t;
        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
    }
    ctx.stroke();
}

function totalMechanicalEnergy(state) {
    let rn = math.norm(state.slice(0,3));
    let vn = math.norm(state.slice(3,6));
    return -mu / rn + 1/2 * vn**2;
}
let tM;
function propOrbit(state) {
    let tranState = math.transpose([state]), tProp = findPeriod(state) * 1.1, t = 0, dt, pixelPos;
    orbit = [];
    let hyper = tProp == false;
    tProp = tProp ? tProp > 86164 ? 86164 : tProp : 7200;
    dt = tProp / 120;
    if (hyper) {
        let backState = tranState.slice();
        while (t > -tProp) {
            pixelPos = position2pixel(math.squeeze(backState));
            orbit.unshift({x: pixelPos[0], y: pixelPos[1]});
            backState = runge_kutta(twoBodyEom, backState, -dt);
            t -= dt;
        }
        t = dt;
    }
    while (t < tProp) {
        pixelPos = position2pixel(math.squeeze(tranState));
        orbit.push({x: pixelPos[0], y: pixelPos[1]});
        tranState = runge_kutta(twoBodyEom, tranState, dt);
        t += dt;
    }
}

function findPeriod(state, mu = 398600.4418) {
    let E = totalMechanicalEnergy(state);
    let a = -mu / 2 / E;
    return a > 0 ? 2 * Math.PI * Math.sqrt(a**3 / mu) : 0;
}

determineOrbit();
propOrbit(satState);
(function animate() {
    ctx.clearRect(0,0,cnvs.width, cnvs.height);
    drawEarth();
    drawPoints();
    if (orbit) {
        drawCurve(ctx, orbit);
    }
    window.requestAnimationFrame(animate);
})() 

window.addEventListener('keydown', event => {
    if (event.key === ' ') {
        createRendezvousObject();
    }
})
window.addEventListener('click', event => {
    if (activePoint !== null) {
        activePoint = null;
        return;
    }
    let x = event.clientX, y = event.clientY;
    let screenPos = pixel2position([x,y]);
    let clickSize = 0.025 * screenWidth;
    for (point in points) {
        if (math.norm([points[point][0] - screenPos[0], points[point][1] - screenPos[1]]) < clickSize) {
            activePoint = point;
        }
    }
})
window.addEventListener('mousemove', event => {
    let x = event.clientX, y = event.clientY;
    if (activePoint === null) return;
    points[activePoint] = math.concat(pixel2position([x, y]), [0]);
    determineOrbit();
    propOrbit(satState);
})

window.addEventListener('wheel', event => {
    if (event.deltaY < 0 && screenWidth <= 30000) return;
    screenWidth /= event.deltaY < 0 ? 1.1 : 1/1.1;
    propOrbit(satState);
})