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
            lineAnimate = 0;
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
  drawAxis();
  try {
	  let linePoint;
    ctx.fillStyle = '#000';
	  points.forEach(point => {
      linePoint = convert({x: point.x, y: point.y}, false);
      ctx.beginPath();
      ctx.arc(linePoint.x, linePoint.y, 5, 0, 2 * Math.PI);
      ctx.fill();
	  });
  }
  catch (err) {
  }
  if (lineOrder === 'circle') {
    calcCircle(points);
    if (lineAnimate < 0.9999999) {
      lineAnimate += 0.1;
    } else {
      lineAnimate = 1;
      oldLine = [
        ...newLine
      ];
    }
    let circle = math.add(oldLine, math.dotMultiply(lineAnimate, math.subtract(newLine, oldLine)));
    drawCircle(circle);
    showEquation(circle)
  }
  else {
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
    drawLine(line);
    showEquation(line)
    try {
      calcRms(points,line);
    }
    catch (err) {

    }
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
    if (lineOrder === 'circle') {
      equationDom.innerHTML = '(x - ' + line[1].toFixed(4) + ')<sup>2</sup> + (y - ' + line[2].toFixed(4) + ')<sup>2</sup> = ' + line[0].toFixed(4) + '<sup>2</sup>';
      return;
    }
    else if (lineOrder === 'ellipse') {
      return;
    }
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
  else if (item.key === 'c') {
    if (lineOrder === 'circle') {
      lineOrder = 1;
      oldLine = [0, 0];
      lineAnimate = 0;
    }
    else {
      lineOrder = 'circle';
      oldLine = [0, 0, 0];
      lineAnimate = 0;
    }
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

function calcCircle(points = [{x: 2, y: 0}, {x: -2, y: -3}, {x: -3, y: 2}, {x: -2, y: 4}]) {
  if (points.length < 3) {
    newLine = [10,0,0]
  }
  let xP = points.map(element => {
    return element.x;
  })
  let yP = points.map(element => {
    return element.y;
  })
  let dfdr = (r) => {
    let array = [];
    for (let ii = 0; ii < points.length; ii++) {
      array.push(-2*r);
    }
    return math.transpose([array])
  }
  let f = (r,xc,yc,x,y) => {
    let array = [];
    x.forEach((element,ii) => {
      array.push(Math.pow(element-xc, 2) + Math.pow(y[ii]-yc, 2) - r*r);
    })
    return math.transpose([array]);
  };
  let dfdxc = (xc,x) => {
    let array = [];
    x.forEach((element,ii) => {
      array.push([-2*(element - xc)]);
    })
    return array;
  }
  let dfdyc = (yc,y) => {
    let array = [];
    y.forEach((element,ii) => {
      array.push([-2*(element - yc)]);
    })
    return array;
  }
  let rGuess = [[2],[0],[0]];
  let rms = 10, rmsOld = 0, count = 0, A, y;
  while (count < 10) {
    A = math.concat(dfdr(rGuess[0][0]), dfdxc(rGuess[1][0], xP), dfdyc(rGuess[2][0], yP));
    y = f(rGuess[0][0], rGuess[1][0], rGuess[2][0], xP, yP);
    A = math.multiply(math.inv(math.multiply(math.transpose(A),A)), math.transpose(A));
    rGuess = math.subtract(rGuess, math.multiply(A,y));
    count++;
  }
  newLine = math.squeeze(rGuess);
}

function drawCircle(circle) {
  ctx.strokeStyle = '#000';
  let drawPoints = [];
  for (ii = 0; ii <= 360; ii++) {
    drawPoints.push({x: circle[0]*Math.cos(ii * Math.PI / 180) + circle[1], y: circle[0]*Math.sin(ii * Math.PI / 180) + circle[2]});
  }
  drawPoints = drawPoints.map(point => {
    return convert(point, false);
  });
  drawCurve(ctx, drawPoints, 0.7);
  let centerPixel = convert({x: circle[1], y: circle[2]}, false);
  ctx.beginPath();
  ctx.fillStyle = 'orange';
  ctx.arc(centerPixel.x, centerPixel.y, 5, 0, 2*Math.PI);
  ctx.fill();
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