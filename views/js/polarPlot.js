let cnvs = document.getElementsByTagName('canvas')[0];
let ctx = cnvs.getContext('2d');
const imageIn = document.getElementById('source');
cnvs.width = window.innerWidth;
cnvs.height = window.innerHeight;
let sma = 42164;
let travelTime = 7*86164;
let satellites = [];
let dVline = undefined;
let grabSat = false;
axisTransition = false;
let axisState = 'polar';
let axisProperties = {
    incLimit: 12,
    incStep: 3,
    heightRatio: 0.88,
    center: {
        x: cnvs.width / 2,
        y: cnvs.height / 2
    }
};
function getJulianDate() {
    var now = new Date();
    var start = new Date(now.getFullYear(), 0, 0);
    var diff = (now - start + now.getTimezoneOffset()*60000) / 86400000;
    let timeCur = {
        year: now.getFullYear(),
        month: 0,
        day: diff,
        hour: 0,
        minute: 0,
        second: 0
    };
    return {
        jd: diff,
        gmst: thetaGMST(julianDateCalcStruct(timeCur))
    };
}
let currentDate = getJulianDate();
function drawAxis(polar, cartesian) {
    if (polar === undefined) {
        polar = axisState === 'polar' ? 1 : 0;
    }
    if (cartesian === undefined) {
        cartesian = axisState === 'polar' ? 0 : 1;
    }
    if (cartesian > 0) {
        let rEarth = axisProperties.heightRatio * cnvs.height / 2 * 6371 / 42164;
        ctx.drawImage(imageIn, cnvs.width / 2 - rEarth, cnvs.height / 2 - rEarth, rEarth * 2, rEarth * 2);
        ctx.strokeStyle = 'rgba(75,75,75,'+cartesian+')';
        ctx.lineWidth = 3;
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(75,75,75,'+cartesian+')';
        ctx.font = '20px sans-serif';
        ctx.beginPath();
        ctx.arc(cnvs.width / 2, cnvs.height / 2, axisProperties.heightRatio * cnvs.height / 2, 0, 2 * Math.PI);
        ctx.stroke();
        for (let ii = 0; ii < 360; ii += 15) {
            ctx.fillText(ii, cnvs.width / 2 - 1.05 * axisProperties.heightRatio * cnvs.height / 2 * Math.sin(ii * Math.PI / 180), cnvs.height / 2 - 1.05 * axisProperties.heightRatio * cnvs.height / 2 * Math.cos(ii * Math.PI / 180));
        }
        ctx.beginPath();
        ctx.arc(cnvs.width / 2, cnvs.height / 2, axisProperties.heightRatio * cnvs.height / 2 * 6371 / 42164, 0, 2*Math.PI);
        ctx.fillStyle = 'rgba(173, 181, 189,'+(1-cartesian)+')';
        ctx.fill();

    }
    if (polar > 0) {
        ctx.strokeStyle = 'rgba(75,75,75,'+polar+')';
        ctx.lineWidth = 2;
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(75,75,75,'+polar+')';
        ctx.font = '20px sans-serif';
        for (let ii = axisProperties.incStep; ii <= axisProperties.incLimit; ii += axisProperties.incStep) {
            if (ii === axisProperties.incLimit) {
                ctx.lineWidth = 4;
            }
            ctx.beginPath();
            ctx.arc(cnvs.width / 2, cnvs.height / 2, ii / axisProperties.incLimit * axisProperties.heightRatio * cnvs.height / 2, 0, 2 * Math.PI);
            ctx.fillText(ii, cnvs.width / 2 - (ii / axisProperties.incLimit * axisProperties.heightRatio * cnvs.height / 2 - 0.05 * axisProperties.heightRatio * cnvs.height / 2) * Math.cos(Math.PI / 12), cnvs.height / 2 - (ii / axisProperties.incLimit * axisProperties.heightRatio * cnvs.height / 2 - 0.05 * axisProperties.heightRatio * cnvs.height / 2) * Math.sin(Math.PI / 12));
            ctx.stroke();
        }
        ctx.lineWidth = 1;
        for (let ii = 0; ii < 360; ii += 30) {
            ctx.beginPath();
            ctx.moveTo(cnvs.width / 2, cnvs.height / 2);
            ctx.lineTo(cnvs.width / 2 - axisProperties.heightRatio * cnvs.height / 2 * Math.sin(ii * Math.PI / 180), cnvs.height / 2 - axisProperties.heightRatio * cnvs.height / 2 * Math.cos(ii * Math.PI / 180));
            ctx.stroke();
            ctx.fillText(ii, cnvs.width / 2 - 1.05 * axisProperties.heightRatio * cnvs.height / 2 * Math.sin(ii * Math.PI / 180), cnvs.height / 2 - 1.05 * axisProperties.heightRatio * cnvs.height / 2 * Math.cos(ii * Math.PI / 180));
        }
    } 
}
animate();
cnvs.addEventListener('mousedown', event => {
    let location = {
        x: event.offsetX,
        y: event.offsetY
    };
    if (!event.shiftKey && !event.ctrlKey) {
        dVline = {
            start: location,
            end: location
        };
        return;
    }
    grabSat = checkCurrentSat(location);
    if (grabSat !== false) {
        return;
    }
    let name = window.prompt('Satellite Name');
    if (!name) {
        return;
    }
    satellites.push({
        name: name
    });
    if (axisState === 'polar') {
        let long = Number(window.prompt('Satellite Longitude (deg)'));
        satellites[satellites.length - 1].long = long ? long : 0;
        satellites[satellites.length - 1].raan = pixelToRaanLong(location);
        satellites[satellites.length - 1].inc = pixelToInc(location);
    }
    else {
        let inc = Number(window.prompt('Satellite Inclination (deg)'));
        satellites[satellites.length - 1].inc = inc ? inc : 0;
        let raan = Number(window.prompt('Satellite RAAN (deg)'));
        satellites[satellites.length - 1].raan = raan ? raan : 0;
        satellites[satellites.length - 1].long = pixelToRaanLong(location);
    }
    satellites[satellites.length - 1].color = event.ctrlKey ? 'rgb(150,112,75)' : 'rgb(75,112,150)';
});
cnvs.addEventListener('mousemove', event => {
    let location = {
        x: event.offsetX,
        y: event.offsetY
    };
    if (dVline) {
        dVline.end = location;
    }
    else if (grabSat !== false && axisState === 'polar') {
        satellites[grabSat].raan = pixelToRaanLong(location);
        satellites[grabSat].inc = pixelToInc(location);
    }
    else if (grabSat !== false && axisState !== 'polar') {

    }
});
cnvs.addEventListener('mouseup', () => {
    dVline = undefined;
    grabSat = false;
});
function drawSat(satellite, size = 0.75, center) {
    let busWidth = cnvs.height * 0.03 * size;
    let panelWidth = cnvs.height * 0.06 * size;
    let panelHeight = cnvs.height * 0.015 * size;
    if (!center) {
        center = raanLongIncToPixel(axisState === 'polar' ? satellite.raan : satellite.long, axisState === 'polar' ? satellite.inc : axisProperties.incLimit);
    }
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'black';
    ctx.fillStyle = satellite.color;
    ctx.beginPath();
    ctx.moveTo(center.x - busWidth / 2, center.y - busWidth / 2);
    ctx.lineTo(center.x + busWidth / 2, center.y - busWidth / 2);
    ctx.lineTo(center.x + busWidth / 2, center.y + busWidth / 2);
    ctx.lineTo(center.x - busWidth / 2, center.y + busWidth / 2);
    ctx.lineTo(center.x - busWidth / 2, center.y - busWidth / 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(center.x - busWidth / 2, center.y - panelHeight / 2);
    ctx.lineTo(center.x - busWidth / 2 - panelWidth, center.y - panelHeight / 2);
    ctx.lineTo(center.x - busWidth / 2 - panelWidth, center.y + panelHeight / 2);
    ctx.lineTo(center.x - busWidth / 2, center.y + panelHeight / 2);
    ctx.lineTo(center.x - busWidth / 2, center.y - panelHeight / 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(center.x + busWidth / 2, center.y - panelHeight / 2);
    ctx.lineTo(center.x + busWidth / 2 + panelWidth, center.y - panelHeight / 2);
    ctx.lineTo(center.x + busWidth / 2 + panelWidth, center.y + panelHeight / 2);
    ctx.lineTo(center.x + busWidth / 2, center.y + panelHeight / 2);
    ctx.lineTo(center.x + busWidth / 2, center.y - panelHeight / 2);
    ctx.fill();
    ctx.stroke();
    ctx.font = '12px sans-serif';
    ctx.lineWidth = 1;
    ctx.fillText('RAAN: ' + satellite.raan.toFixed(1), center.x, center.y + busWidth / 2 + 10);
    ctx.fillText('Inc: ' + satellite.inc.toFixed(1), center.x, center.y + busWidth / 2 + 22);
    ctx.fillText('Long: ' + satellite.long.toFixed(1), center.x, center.y + busWidth / 2 + 34);
    ctx.font = '15px sans-serif';
    ctx.fillText(satellite.name, center.x, center.y + busWidth / 2 - 15);
}
function calculateDvBudget(dVline) {
    let raan = {
        init: pixelToRaanLong(dVline.start),
        final: pixelToRaanLong(dVline.end)
    };
    let inc = {
        init: pixelToInc(dVline.start),
        final: pixelToInc(dVline.end)
    }
    return deltaVPlaneChange(angleBetween(inc, raan));
}
function deltaVPlaneChange(angle = 0, velocity = Math.sqrt(398600.4418 / sma)) {
    return Math.sqrt(velocity * velocity + velocity * velocity - 2 * velocity * velocity * Math.cos(angle * Math.PI / 180));
}
function angleBetween(inc, raan) {
    inc.init *= Math.PI / 180;
    inc.final *= Math.PI / 180;
    raan.init *= Math.PI / 180;
    raan.final *= Math.PI / 180;
    return Math.acos(Math.cos(inc.init) * Math.cos(inc.final) + Math.sin(inc.init) * Math.sin(inc.final) * Math.cos(raan.final - raan.init)) * 180 / Math.PI;
}
function animate() {
    ctx.clearRect(0,0,cnvs.width,cnvs.height);
    if (axisTransition) {
        let satLoc;
        for (let ii = 0; ii < axisTransition.oldLoc.length; ii++) {
            satLoc = {
                x: axisTransition.oldLoc[ii].x + (axisTransition.newLoc[ii].x - axisTransition.oldLoc[ii].x) * axisTransition.animateState,
                y: axisTransition.oldLoc[ii].y + (axisTransition.newLoc[ii].y - axisTransition.oldLoc[ii].y) * axisTransition.animateState
            }
            drawSat(satellites[ii], 0.375, satLoc);
        }
        axisTransition.animateState += 0.025;
        drawAxis(axisState === 'polar' ? 1 - axisTransition.animateState : axisTransition.animateState, axisState === 'polar' ? axisTransition.animateState : 1 - axisTransition.animateState);
        if (axisTransition.animateState >= 1) {
            axisTransition = false;
            axisState = axisState === 'polar' ? 'cartesian' : 'polar';
        }  
    }
    else {
        drawAxis();
        satellites.forEach(satellite => drawSat(satellite, 0.375));
    }
    if (dVline) {
        ctx.strokeStyle = 'rgb(200,75,50)';
        ctx.font = '30px sans-serif';
        ctx.fillStyle = 'rgb(75,75,75)';
        ctx.lineWidth = 5;
        if (axisState === 'polar') {
            ctx.beginPath();
            ctx.moveTo(dVline.start.x, dVline.start.y);
            ctx.lineTo(dVline.end.x, dVline.end.y);
            ctx.stroke();
            ctx.fillText((calculateDvBudget(dVline) * 1000).toFixed(2) + ' m/s', 80, 80);
        }
        else {
            let longStart = Math.atan2(-dVline.start.x + axisProperties.center.x, -dVline.start.y + axisProperties.center.y);
            let longEnd = Math.atan2(-dVline.end.x + axisProperties.center.x, -dVline.end.y + axisProperties.center.y);
            let deltaLong = (longEnd - longStart) / travelTime;
            let nNewOrbit = 2*Math.PI / 86164 + deltaLong;
            let aNewOrbit = Math.pow(398600.4418 / Math.pow(nNewOrbit,2), 1/3);
            let points = [], radius = axisProperties.heightRatio * (aNewOrbit / 42164) * cnvs.height / 2;
            for (let ii = 0; ii < 20; ii += 0.5) {
                points.push({
                    x: axisProperties.center.x - radius * Math.sin(longStart + (longEnd - longStart) * ii / 20),
                    y: axisProperties.center.y - radius * Math.cos(longStart + (longEnd - longStart) * ii / 20)
                });
                drawCurve(ctx, points, 1);
            }
            dV = 2000*Math.abs((Math.sqrt(398600.4418 / 42164) - Math.sqrt(398600.4418 * (2/42164-2/(42164 + aNewOrbit)))));
            ctx.fillText(dV.toFixed(2) + ' m/s', 80, 80);

        }
    }
    window.requestAnimationFrame(animate);
}
function checkCurrentSat(location) {
    let limit = cnvs.height * 0.03, indexOut = false, satLoc;
    satellites.forEach((satellite, index) => {
        satLoc = raanLongIncToPixel(satellite.raan, satellite.inc);
        if (Math.sqrt(Math.pow(satLoc.x - location.x, 2) + Math.pow(satLoc.y - location.y, 2)) < limit) {
            indexOut = index;
        }
    });
    return indexOut;
}
function pixelToRaanLong(location) {
    return Math.atan2(-location.x + cnvs.width / 2, cnvs.height / 2 - location.y) * 180 / Math.PI;
}
function pixelToInc(location) {
    let inc = Math.sqrt(Math.pow(location.x - cnvs.width / 2, 2) + Math.pow(location.y - cnvs.height / 2, 2)) * axisProperties.incLimit / axisProperties.heightRatio / cnvs.height / 0.5
    return inc;
}
function raanLongIncToPixel(raanLong, inc = axisProperties.incLimit) {
    return {
        x: cnvs.width / 2 - inc * axisProperties.heightRatio * cnvs.height / 2 / axisProperties.incLimit * Math.sin(raanLong * Math.PI / 180),
        y: cnvs.height / 2 - inc * axisProperties.heightRatio * cnvs.height / 2 / axisProperties.incLimit * Math.cos(raanLong * Math.PI / 180)
    };
}
document.addEventListener('keypress', event => {
    if (event.key === ' ') {
        if (axisTransition) {
            return;
        }
        axisTransition = {
            oldLoc: satellites.map((satellite) => {
                return raanLongIncToPixel(axisState === 'polar' ? satellite.raan : satellite.long, axisState === 'polar' ? satellite.inc : axisProperties.incLimit);
            }),
            newLoc: satellites.map((satellite) => {
                return raanLongIncToPixel(axisState === 'polar' ? satellite.long : satellite.raan, axisState === 'polar' ? axisProperties.incLimit : satellite.inc);
            }),
            animateState: 0
        };
        
    }
})
document.getElementById('fileToLoad').addEventListener('change', event => {
    loadFileAsText(event.path[0].files[0])
})
function loadFileAsText(fileToLoad){

    var fileReader = new FileReader();
    fileReader.onload = function(fileLoadedEvent){
        var textFromFileLoaded = fileLoadedEvent.target.result;
        handleNewTle(textFromFileLoaded.split(/\r?\n/));
    };

    fileReader.readAsText(fileToLoad, "UTF-8");
}
function handleNewTle(file) {
    let tle;
    for (let ii = 0; ii < file.length; ii++) {
        
        if (file[ii].substr(0,4) === 'Name') {
            tle = [file[ii+2].split(/ +/), file[ii+3].split(/ +/)];
            tle = {
                raan: Number(tle[1][3]),
                inc: Number(tle[1][2]),
                arg: Number(tle[1][5]),
                time: Number(tle[0][3].substr(2, tle[0][3].length)),
                mA: Number(tle[1][6]),
                mm: Number(tle[1][7])
            };
            tle.mA += 360/tle.mm/86400 * ((currentDate.jd - tle.time) * 86400);
            tle.long = (tle.raan + tle.arg + tle.mA - currentDate.gmst) % 360;
            satellites.push({
                name: file[ii].substr(6,file[ii].length),
                raan: tle.raan,
                inc: tle.inc,
                long: tle.long,
                color:  file[ii+1].substr(0,1).toLowerCase() === 'r' ? 'rgb(200,150,100)' : 'rgb(100,150,200)'
            })

        }
    }
}
function julianDateCalcStruct(time) {
    // Good
    // return 367*time.year-Math.floor(7*(time.year+Math.floor((time.month+9)/12))/4)+Math.floor(275*time.month/9)+time.day+
    //     1721013.5+((time.second/60+time.minute)/60+time.hour)/24 + 30; //?
    time.year -= 2000;
    return 2451544.5 + 365 * (time.year - 2000) + Math.floor(0.25 * (time.year - 2000)) - Math.floor(0.01 * (time.year - 2000)) + Math.floor(0.0025 * (time.year - 2000)) + -1 + time.day;
}
function thetaGMST(JDUTI) {
    // Good
    TUTI = (JDUTI-2451545)/36525;
    theta = 67310.54841+(876600*3600+8640184.812866)*TUTI+0.093104*TUTI*TUTI-6.2e-6*Math.pow(TUTI,3);
    if (theta > 0) {
        theta = theta % 86400;
    }
    else {
        theta = theta % (-86400);
    }
    return theta / 240;
}
window.addEventListener('wheel', event => {
    axisProperties.incLimit += event.deltaY > 0 ? 1 : -1;
})
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
    }
    else {
        ctx.fill();
    }
}