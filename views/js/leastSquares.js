let cnvs = document.getElementById("main-canvas");
let ctx = cnvs.getContext('2d');
cnvs.width = window.innerWidth;
cnvs.height = window.innerHeight;
let points = [];
let oldLine = [0, 0],
  newLine = [0, 0],
  lineAnimate = 1,
  lineOrder = 1;
animate();
let axisSize = {
	x: 100,
	y: 100 * cnvs.height / cnvs.width
}
let error = [0,0];
let equationDom = document.getElementById('equation');
let selectedPoint = undefined;

cnvs.addEventListener('mousedown', event => {	
	try {
    if (event.shiftKey || event.ctrlKey) {
      let pointSelect = convert({x: event.x, y: event.y});
      for (let ii = 0; ii < points.length; ii++) {
        if (math.norm([pointSelect.x - points[ii].x, pointSelect.y - points[ii].y]) < 2) {
          if (event.shiftKey) {
            selectedPoint = ii;
          }
          else {
            points.splice(ii,1);
          }
          return;
        }
      }
      return;
    }
		let newPoint = convert({x: event.x, y: event.y});
	  points.push(newPoint);
	  lineAnimate = 0;
	}
	catch(err) {

	}
});
cnvs.addEventListener('mousemove', event => {
  if (selectedPoint === undefined) return;
  points[selectedPoint] = convert({x: event.x, y: event.y});
});
cnvs.addEventListener('mouseup', event => {
  selectedPoint = undefined;
});

window.addEventListener('keypress', changeOrder);

function animate() {
  ctx.clearRect(0, 0, cnvs.width, cnvs.height);
  ctx.fillStyle = '#000';
  calculateLine(lineOrder);
  if (lineAnimate < 0.9999999) {
    lineAnimate += 0.1;
  } else {
    lineAnimate = 1;
    oldLine = [
      ...newLine
    ];
  }
  let line = math.add(oldLine, math.dotMultiply(lineAnimate, math.subtract(newLine, oldLine)));
  drawAxis();
  drawLine(line);
  showEquation(line)
  try {
    calcRms(points,line);
  }
  catch (err) {

  }
  try {
	  let linePoint;
	  points.forEach(point => {
		linePoint = convert({x: point.x, y: point.y}, false);
		ctx.beginPath();
		ctx.arc(linePoint.x, linePoint.y, 5, 0, 2 * Math.PI);
		ctx.fill();
	  });
  }
  catch (err) {

  }
  
  window.requestAnimationFrame(animate);
}

function drawLine(line) {
  ctx.strokeStyle = "#000";
  let y;
  drawPoints = [];
  try {
	for (let ii = -50; ii <= 50; ii += 0.1) {
    y = calcLine(ii, line);
		drawPoints.push(convert({x: ii, y: y}, false));
	  }
	  drawCurve(ctx, drawPoints, 0.7)
  }
  catch (err) {

  }
}

function calcLine(x, line) {
  let y = 0;
  for (let kk = line.length - 1; kk >= 0; kk--) {
    y += Math.pow(x, kk) * line[line.length - 1 - kk];
  }
  return y;
}

function showEquation(line) {
  
	try {
    let htmlOut = '', order;
    for (ii = 0; ii < line.length; ii++) {
      order = lineOrder - ii;
      htmlOut += newLine[ii].toFixed(5) + '(&plusmn' + error[ii].toFixed(4) + ')';
      if (order === 1) {
        htmlOut += 'x'
      }
      else if (order > 1) {
        htmlOut += 'x<sup>' + order + '</sup>';
      }
      if (ii !== lineOrder) {
        htmlOut += ' + '
      }
    }
		equationDom.innerHTML = htmlOut;
	}
	catch (err) {

	}
}

function changeOrder(item) {
	if (item.key === '.') {
  	if (lineOrder >= points.length - 1) {
    	return;
    }
  	lineOrder++;
    oldLine.unshift(0);
    lineAnimate = 0;
  }
  else if (item.key === ',') {
	if (lineOrder === 1) {
		return;
	}
  	lineOrder--;
    oldLine.shift();
    lineAnimate = 0;
  }
}

function calculateLine(order = 1) {
  if (points.length < order + 1) {
    return;
  }
  newLine = math.squeeze(calcCovariance(points, order));
}

function calcCovariance(points, order, multiplyByY = true) {
  let x = [],
    y = [];
  points.forEach(point => {
    x.push(point.x);
    y.push(point.y);
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
  if (multiplyByY) {
    a = math.multiply(math.multiply(math.inv(math.multiply(math.transpose(a), a)), math.transpose(a)), y);
  }
  else {
    a = math.inv(math.multiply(math.transpose(a), a));
  }
  return a;
}

function drawCurve(ctx, points, tension, type = 'stroke') {
ctx.lineWidth = 3;
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

window.addEventListener("resize", () => {
    cnvs.height = window.innerHeight;
	cnvs.width = window.innerWidth;
	axisSize.y = axisSize.x * cnvs.height / cnvs.width
});

function drawAxis() {
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.moveTo(cnvs.width / 2, 0);
    ctx.lineTo(cnvs.width / 2, cnvs.height);
    ctx.moveTo(0,cnvs.height / 2);
	ctx.lineTo(cnvs.width, cnvs.height / 2);
	ctx.stroke();
}

function convert(oldPoint,pixelsToPoints = true) {
	let newPoint = {};
	if (pixelsToPoints) {
		newPoint.x = (oldPoint.x - cnvs.width / 2) * axisSize.x / cnvs.width;
		newPoint.y = (cnvs.height / 2 - oldPoint.y) * axisSize.y / cnvs.height;
	}
	else {
		newPoint.x = oldPoint.x * cnvs.width / axisSize.x + cnvs.width / 2;
		newPoint.y = -oldPoint.y * cnvs.height / axisSize.y + cnvs.height / 2
	}

	return newPoint;
}

function calcRms(points, line) {
  let rms = 0, expectedY;
  points.forEach(point => {
    expectedY = calcLine(point.x, line);
    rms += Math.pow(expectedY - point.y, 2);
  })
  rms = Math.sqrt(rms / points.length);
  let a = calcCovariance(points, lineOrder, false);
  error = math.sqrt(math.diag(math.dotMultiply(a,rms)));
  return rms;
}