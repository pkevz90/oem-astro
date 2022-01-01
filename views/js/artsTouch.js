mainWindow.touchHandler = {
    start: false,
    n: 0,
    distance: false
};
document.getElementById('canvas-div').addEventListener('touchstart', event => {
    console.log(event.touches);
    if (event.touches.length > 1) {
        mainWindow.touchHandler.distance = math.norm([event.touches[0].clientX - event.touches[1].clientX, event.touches[0].clientY - event.touches[1].clientY])
        return
    }
    mainWindow.touchHandler.start = {
        x: event.changedTouches[0].clientX,
        y: event.changedTouches[0].clientY
    }
    if (mainWindow.touchHandler.n === 0) {
        setTimeout(() => {
            mainWindow.touchHandler.n = 0;
        }, 250)
    }
    else if (mainWindow.touchHandler.n > 0) {
        keydownFunction({key: ' '})
        mainWindow.touchHandler.n = 0;
        setTimeout(() => {
            mainWindow.touchHandler.n = 0;
        }, 250)
    }
    mainWindow.touchHandler.n++;
})
document.getElementById('canvas-div').addEventListener('touchmove', event => {
    event.preventDefault()
    mainWindow.desired.plotCenter += (event.changedTouches[0].clientX - mainWindow.touchHandler.start.x) / mainWindow.cnvs.width * mainWindow.desired.plotWidth;
    mainWindow.touchHandler.start = {
        x: event.changedTouches[0].clientX,
        y: event.changedTouches[0].clientY
    }
})

