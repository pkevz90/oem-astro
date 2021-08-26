let P = [10, 10, 10, 0.01, 0.01, 0.01];
P = math.diag(P);
let angAmb = 0.0001 * Math.PI / 180; // degrees
let R = [[Math.pow(angAmb, 2), 0], [0, Math.pow(angAmb, 2)]];
let Q = [Math.pow(0.0001,2), Math.pow(0.0001,2), Math.pow(0.0001,2), Math.pow(0.000001,2), Math.pow(0.000001,2), Math.pow(0.000001,2)]; 
Q = math.diag(Q);
let x = math.transpose([[0, 10, 0, 0.001, 0, 0.002]]);
let xEst = math.transpose([[2, 9, 0, 0, 0, 0]]);
let dt = 6;
let onesP = math.identity(6)._data;
let thrust = 0;


window.addEventListener('keypress', () => {
    for (let ii = 0; ii < 50; ii++) {
        let F = Fmatrix3(dt);
        x = oneBurnFiniteHcw3(x, {t: dt, a0: thrust, phi: Math.PI / 2});
        xEst = oneBurnFiniteHcw3(xEst, {t: dt, a0: thrust, phi: Math.PI / 2});
        P = math.add(math.multiply(F,P,math.transpose(F)),Q);
        let zAct = measEst3(x);
        let zEst = measEst3(xEst);
        zEst[1][0] += normalRandom() * angAmb;
        zEst[0][0] += normalRandom() * angAmb;
        let H = Hmatrix3(xEst);
        if (zAct[0][0]*zEst[0][0] < 0 && Math.abs(zEst[0][0]) > 1) {
            if (zEst[0][0] < 0) {
                zEst[0][0] += 2*Math.PI;
            }
            else {
                zAct[0][0] += 2*Math.PI;
            }
        }
        let K  = Kmatrix(P,H,R);
        P = math.multiply(math.subtract(onesP,math.multiply(K,H)),P);
        let y = math.subtract(zAct, zEst);
        xEst = math.add(xEst, math.multiply(K, y));
    }
    console.log(math.norm(math.subtract(math.squeeze(x), math.squeeze(xEst))));

})

function Kmatrix(P,H,R) {
    let S = math.add(math.multiply(math.multiply(H,P),math.transpose(H)),R);
    return math.multiply(math.multiply(P,math.transpose(H)),math.inv(S));
}

function Hmatrix3(x) {
    x = math.squeeze(x);
    let x12 = math.pow(x[0], 2) + math.pow(x[1],2);
    return [[-x[1]/x12, x[0]/x12, 0, 0, 0, 0],[-x[2]*x[0] / Math.sqrt(x12) / (x12 + x[2]*x[2]), -x[2]*x[1] / Math.sqrt(x12) / (x12 + x[2]*x[2]), Math.sqrt(x12) / (x12 + x[2]*x[2]), 0, 0, 0]];
}

function Fmatrix3(t, n = 2 * Math.PI / 86164) {
    return [[1,0,0,t,0,0],
            [0,1,0,0,t,0],
            [0,0,1,0,0,t],
            [3*n*n*t,0,0,1,2*n*t, 0],
            [0,0,0,-2*n*t,1, 0],
            [0,0,-n*n*t,0,0,1]];
}

function measEst3(x) {
    return [[Math.atan2(x[1][0],x[0][0])], [Math.atan2(x[2][0], Math.sqrt(x[1][0]*x[1][0]+x[0][0]*x[0][0]))]];
}


function normalRandom()
{
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

function oneBurnFiniteHcw3(state, options) {
    let {alpha = 10, phi = 0, tB = 1, t = 3600, n = 2*Math.PI / 86164, a0 = 0.00001} = options;
    x0 = state[0][0];
    xd0 = state[3][0];
    y0 = state[1][0];
    yd0 = state[4][0];
    z0 = state[2][0];
    zd0 = state[5][0];
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
    return [[xF], [yF], [zF], [xdF], [ydF], [zdF]]

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

function resetP() {
    P = [1, 1, 1, 0.01, 0.01, 0.01];
    P = math.diag(P);   
}