let mainDiv = document.querySelector('#main')
let initTime = new Date()
let timeMultiplier = 1
let mm = Math.PI / 180
let trueState = {r: -10, i: -50, c: 0, rd: 0, id: -10 * mm * 3/2, cd: 0}
let ricWidth = 100
let timeElapsed = 0

function popupTitleClick(title) {
    let parentDiv = title.parentElement
    parentDiv.style.top = parentDiv.style.top === '95vh' ? '50vh' : '95vh'
}

function changeFilterStatus(button) {
    button.innerText = button.innerText === 'Start Filter' ? 'Stop Filter' : 'Start Filter'
    document.querySelector('#filter-status-span').innerText = button.innerText === 'Start Filter' ? 'Off' : 'Active'
    button.style.backgroundColor = button.style.backgroundColor === 'rgb(70, 140, 70)' || button.style.backgroundColor === '' ? 'rgb(140,70,70)' : 'rgb(70,140,70)'
    document.querySelector('#filter-status-span').style.color = button.style.backgroundColor === 'rgb(70, 140, 70)'  ? 'rgb(140,70,70)' : 'rgb(70,140,70)'

}

class canvasObject {
    constructor(cnvs, height=window.innerHeight, width=window.innerWidth) {
        this.cnvs = cnvs
        console.log(height, width);
        this.cnvs.width = width
        this.cnvs.height = height
    }
    getContext() {
        return this.cnvs.getContext('2d')
    }
    drawLine(points) {

    }
    drawRectangle(options = {}) {
        let {height = 10, width = 10, center={x: this.cnvs.width/2, y: this.cnvs.height/2}, color='rgb(200,100,100)', angle=0} = options
        let ctx = this.getContext()
        ctx.fillStyle = color
        ctx.fillRect(center.x - width/2, center.y - height/2, width, height)
    } 
    drawChar(options = {}) {
        let {message = 'test', point, fontSize, left = true} = options
    }
    clearCnvs() {
        this.getContext().clearRect(0,0,this.cnvs.width, this.cnvs.height)
    }
}

class unscentedFilter {
    constructor() {

    }
    step(dt = 1) {

    }
}

let mainCanvas = new canvasObject(document.querySelector('#main-canvas'))


function formatTime(time) {
    time = time.split('GMT')[0].substring(4, time.split('GMT')[0].length - 1);
    time = time.split(' ');
    return time[1] + ' ' + time[0] + ' ' + time[2].slice(2,4) + ' ' + time[3];
}

function advanceTime(dt = 1) {
    if (timeMultiplier === 0) return
    timeElapsed += timeMultiplier * dt
    initTime.setSeconds(initTime.getSeconds() + dt * timeMultiplier)
    document.querySelector('#time-display').innerText = formatTime(initTime.toString());
    formatCanvas()
}
function formatCanvas() {
    mainCanvas.clearCnvs()
    mainCanvas.drawRectangle()
    mainCanvas.drawRectangle({
        color: 'rgb(100,100,200)',
        center: {x: 3*mainCanvas.cnvs.width/4 - timeElapsed, y: 3*mainCanvas.cnvs.height/4}
    })
}
function timeControls(button) {
    if (button.innerText === '<<') {
        timeMultiplier = timeMultiplier > 0 ? timeMultiplier - 1 : timeMultiplier
    }
    else if (button.innerText === '>>') {
        timeMultiplier = timeMultiplier < 100 ? timeMultiplier + 1 : timeMultiplier
    }
    else {
        timeMultiplier = 0
    }
    document.querySelector('#time-multiplier-span').innerText = timeMultiplier
}



setInterval(advanceTime, 1000)