var xAxis, yAxis;
app = {
    paths: {
        bluePoint: undefined,
        redPoint: undefined,
        blueTraj: undefined,
        sun: undefined
    }
}
            // Get a reference to the canvas object
var canvas = document.getElementById('myCanvas');
// Create an empty project and a view for the canvas:
paper.setup(canvas);
// Create a Paper.js Path to draw a line into it:
xAxis = new paper.Path();
xAxis.strokeColor = '#888';
xAxis.strokeWidth = 5;
xAxis.add(new paper.Point(0, canvas.height / 2));
xAxis.add(new paper.Point(canvas.width, canvas.height / 2));
yAxis = new paper.Path();
yAxis.strokeWidth = 5;
yAxis.strokeColor = '#888888';
yAxis.add(new paper.Point(canvas.width / 2, 0));
yAxis.add(new paper.Point(canvas.width / 2, canvas.height));
app.bluePoint = new paper.Path.RegularPolygon(new paper.Point(canvas.width / 4,canvas.height / 2),4,20);
app.bluePoint.fillColor = '#99ddff';
app.bluePoint.strokeColor = 'black';
app.bluePoint.strokeWidth = 4;
app.redPoint = new paper.Path.RegularPolygon(new paper.Point(3*canvas.width / 4,canvas.height / 2),3,20);
app.redPoint.fillColor = '#ffdd99';
app.redPoint.strokeColor = 'black';
app.redPoint.strokeWidth = 4;


function drawTrajectory() {
    if (app.blueTraj === undefined) {
        app.blueTraj = new paper.Path();
        app.blueTraj.strokeColor = '#99ddff';
    }
    app.blueTraj.removeSegments();
    app.blueTraj.add(new paper.Point(canvas.width / 4,canvas.height / 2));
    app.blueTraj.add(new paper.Point(canvas.width / 3,canvas.height / 3));
}