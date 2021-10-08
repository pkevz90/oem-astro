var array, checkArray, jobAssigned;
var row = true;
var hits = 0;
window.addEventListener('keydown', event => {
    if (event.key === ' ') {
        if (hits < 2) {
            array = iterateMatrix([...array], row);
            console.log(array);
            row = !row;
            hits++;
            return;
        } else {
            checkMatrix([...array]);
        }
    }
})

function createMatrix(n = 4) {
    array = [];
    checkArray = [[],[]];
    jobAssigned = [];
    for (let ii = 0; ii < n; ii++) {
        let row = [];
        for (let jj = 0; jj < n; jj++) {
            row.push(Math.floor(Math.random()*20+1));
        }
        array.push(row);
        checkArray[0].push(0)
        checkArray[1].push(0)
        jobAssigned.push(false)
    }
}
function checkMatrix(array) {
    // Check rows
    array.forEach((row, ii) => {
        if (math.min(row) === 0) checkArray[0][ii] = 1;
    })
    array = math.transpose(array);
    array.forEach((row, ii) => {
        if (math.min(row) === 0) checkArray[1][ii] = 1;
    })
}
createMatrix(4);
function iterateMatrix(array, row) {
    if (!row) array = math.transpose(array);
    let min = math.min(array, 1);
    for (let row = 0; row < array.length; row++) {
        array[row] = math.subtract(array[row], min[row]);
    }
    if (!row) array = math.transpose(array);
    return array;
}
