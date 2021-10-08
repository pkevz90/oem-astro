var cnvs = document.getElementsByTagName('canvas')[0];
var ctx = cnvs.getContext('2d');
cnvs.width = window.innerWidth;
cnvs.height = window.innerHeight;
var n = 2 * Math.PI / 86164;
var rC = {
    a: 0,
    x: 50,
    y: -50,
    b: 0,
    z: 0,
    p: 0
};

var chart = {
    width: 100
}

var tGuess = 7200;

function finiteDifference(inFunc, x, del = 0.001) {
    return ((inFunc(x+del) - inFunc(x-del)) / del);
}

function position2pixels(r,i) {
    return {
        x: r * 
    }
}

function phiMatrix(t, options = {}) {
    let {nPhi = n, whole = false} = options;
    let nt = nPhi * t;
    let cnt = Math.cos(nt);
    let snt = Math.sin(nt);
    return whole ? [
        [4 - 3 * cnt, 0, 0, snt / n, 2 * (1 - cnt) / nPhi, 0],
        [6 * (snt - nt), 1, 0, 2 * (cnt - 1) / nPhi, (4 * snt - 3 * nt) / nPhi, 0],
        [0, 0, cnt, 0, 0, snt / nPhi],
        [3 * nPhi * snt, 0, 0, cnt, 2 * snt, 0],
        [6 * nPhi * (cnt - 1), 0, 0, -2 * snt, 4 * cnt - 3, 0],
        [0, 0, -nPhi * snt, 0, 0, cnt]
    ] : 
    {
        rr: [
            [4 - 3 * cnt, 0, 0],
            [6 * (snt - nt), 1, 0],
            [0, 0, cnt]
        ],
        rv:  [
            [snt / n, 2 * (1 - cnt) / nPhi, 0],
            [2 * (cnt - 1) / nPhi, (4 * snt - 3 * nt) / nPhi, 0],
            [0, 0, snt / nPhi]
        ],
        vr:  [
            [3 * nPhi * snt, 0, 0],
            [6 * nPhi * (cnt - 1), 0, 0],
            [0, 0, -nPhi * snt]
        ],
        vv:  [
            [cnt, 2 * snt, 0],
            [-2 * snt, 4 * cnt - 3, 0],
            [0, 0, cnt]
        ]
    }
}

function findV1(r1 = [[0], [20], [0]], r2 = [[0], [0], [0]], t = 7200) {
    let phi = phiMatrix(t);
    return math.multiply(math.inv(phi.rv),math.subtract(r2, math.multiply(phi.rr, r1)));
}

function propHCW(r1 = [[0],[0],[0]], v1= [[0],[0.001],[0]], t = 7200) {
    let state = [...r1, ...v1];
    return math.multiply(phiMatrix(t, {whole: true}), state);
}

function findImpulsiveDv(state1, state2, t) {
    let dV;
    let v1 = findV1(state1.slice(0,3), state2.slice(0,3), t);
    return dV;
}

function findMinFuel() {
    var state1 = [[-rC.a / 2 * Math.cos(rC.b) + rC.x], [rC.a * Math.sin(rC.b) + rC.y], [rC.z * Math.sin(rC.p)], [rC.a * n / 2 * Math.sin(rC.b)], [rC.a * n * Math.cos(rC.b) - 1.5 * rC.x * n], [rC.z * n * Math.cos(rC.p)]];
    var state2 = [[0], [5], [0],[0],[0],[0]];

    let v1 = findV1(r1.slice(0,3), r2.slice(0,3));
    let stateF = propHCW(r1.slice(0,3), v1);
}

function getHistory() {

}