mainWindow.touchHandler = {
    start: false,
    n: 0
};
document.getElementById('canvas-div').addEventListener('touchstart', event => {
    mainWindow.touchHandler.start = {
        x: event.changedTouches[0].clientX,
        y: event.changedTouches[0].clientY
    }
    console.log(event);
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

