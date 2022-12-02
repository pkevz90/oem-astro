// mainWindow.touchHandler = {
//     start: false,
//     n: 0,
//     distance: false,
//     time: null
// };
// document.getElementById('canvas-div').addEventListener('touchstart', event => {
//     mainWindow.touchHandler.start = {
//         x: event.changedTouches[0].clientX,
//         y: event.changedTouches[0].clientY
//     }
    
// })

// document.getElementById('canvas-div').addEventListener('touchend', event => {
//     console.log(event.touches);
// })

// document.getElementById('canvas-div').addEventListener('touchmove', event => {
//     event.preventDefault()
//     mainWindow.desired.plotCenter += (event.changedTouches[0].clientX - mainWindow.touchHandler.start.x) / mainWindow.cnvs.width * mainWindow.desired.plotWidth;
//     mainWindow.plotCenter = mainWindow.desired.plotCenter
//     mainWindow.touchHandler.start = {
//         x: event.changedTouches[0].clientX,
//         y: event.changedTouches[0].clientY
//     }
// })

