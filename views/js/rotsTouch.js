windowOptions.touchHandler = {
    start: false,
    n: 0
};
document.getElementById('canvas-div').addEventListener('touchstart', event => {
    windowOptions.touchHandler.start = {
        x: event.changedTouches[0].clientX,
        y: event.changedTouches[0].clientY
    }
    if (windowOptions.touchHandler.n === 0) {
        setTimeout(() => {
            windowOptions.touchHandler.n = 0;
        }, 250)
    }
    else if (windowOptions.touchHandler.n > 0) {
        keydownFunction({key: ' '})
        windowOptions.touchHandler.n = 0;
        setTimeout(() => {
            windowOptions.touchHandler.n = 0;
        }, 250)
    }
    windowOptions.touchHandler.n++;
})
document.getElementById('canvas-div').addEventListener('touchmove', event => {
    event.preventDefault()
    console.log(event);
    windowOptions.origin_it_des += (event.changedTouches[0].clientX - windowOptions.touchHandler.start.x) * 2 / cnvs.width * windowOptions.width;
    windowOptions.width_des *= (event.changedTouches[0].clientY - windowOptions.touchHandler.start.y) > 0 ? 1.01 : 0.9900990099009;
    windowOptions.touchHandler.start = {
        x: event.changedTouches[0].clientX,
        y: event.changedTouches[0].clientY
    }
})

window.onwheel = () => {
    console.log('hey');
}