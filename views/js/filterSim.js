let mainDiv = document.querySelector('#main')

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
    drawChar(message, point, left = true) {
        
    }

}

class unscentedFilter {
    constructor() {

    }
    step(dt = 1) {

    }
}

let mainCanvas = new canvasObject(document.querySelector('#main-canvas'))
mainCanvas.drawRectangle()
mainCanvas.drawRectangle({
    color: 'rgb(100,100,200)',
    center: {x: 3*mainCanvas.cnvs.width/4, y: 3*mainCanvas.cnvs.height/4}
})