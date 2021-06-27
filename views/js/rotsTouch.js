windowOptions.touchHandler = {};
document.getElementById('canvas-div').addEventListener('touchstart', event => {
    windowOptions.touchHandler.start = {
        x: event.changedTouches[0].clientX,
        y: event.changedTouches[0].clientY
    }
    console.log('touch started');
})
document.getElementById('canvas-div').addEventListener('touchmove', event => {
    console.log(event.changedTouches[0].clientX, event.changedTouches[0].clientY);
    console.log('touch moved');
})