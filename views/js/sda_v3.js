let title = 'Relative Covariance System'
let acronym = 'RCS'
document.title = acronym
let cao = '25 Apr 23'

function setDefaultValues() {
    let curDate = new Date()
    let satEpoch = new Date(curDate.getFullYear(), curDate.getMonth(), curDate.getDate())
    document.querySelector('#sat-epoch-input').value = convertTimeToDateTimeInput(satEpoch)
    document.querySelector('#sim-start-input').value = convertTimeToDateTimeInput(satEpoch)
    document.querySelector('#sim-finish-input').value = convertTimeToDateTimeInput(new Date(satEpoch - (-1000*21600)))

    let coes = document.querySelector('#coe-display').querySelectorAll('input')
    coes[0].value = 42164
    coes[1].value = 0
    coes[2].value = 0
    coes[3].value = 0
    coes[4].value = 0
    coes[5].value = 0
    
}
setDefaultValues()

function displaySensors() {
    let div = document.querySelector('#sensor-list')
    let sensorHtml = sensors.filter(s => s.active).map(sens => {
        return `<div style="color: ${sens.active ? 'rgb(100,200,100)' : 'rgb(200,100,100)'}"><span>${sens.name}</span><span style="font-size: 0.5em;">${sens.type}<span></div>`
    }).join('')
    sensorHtml += sensors.filter(s => !s.active).map(sens => {
        return `<div style="color: ${sens.active ? 'rgb(100,200,100)' : 'rgb(200,100,100)'}"><span>${sens.name}</span><span style="font-size: 0.5em;">${sens.type}<span></div>`
    }).join('')
    div.innerHTML = sensorHtml
}
displaySensors()

function runSimulation() {
    let satState = [...document.querySelector('#coe-display').querySelectorAll('input')].map(s => Number(s.value))
    satState = {
        a: satState[0],
        e: satState[1],
        i: satState[2] * Math.PI / 180,
        raan: satState[3] * Math.PI / 180,
        arg: satState[4] * Math.PI / 180,
        tA: satState[5] * Math.PI / 180,
    }
    let satEpoch = new Date(document.querySelector('#sat-epoch-input').value)

    let simTimes = {
        start: new Date(document.querySelector('#sim-start-input').value),
        finish: new Date(document.querySelector('#sim-finish-input').value)
    }
    let timeDelta = 3600
    let times = math.range(0,(simTimes.finish-simTimes.start)/1000, timeDelta, true)._data.map(time => {
        return new Date(simTimes.start - (-1000*time))
    })
    let satStateHistory = times.map(time => {
        return {
            time,
            state: propToTimeAnalytic(satState, (time - satEpoch)/1000)
        }
    }) 
    let activeSensors = sensors.map((s,ii) => [ii, s]).filter(s =>s[1].active)

    let obs = satStateHistory.map(state => {
        let sunVec = astro.sunEciFromTime(state.time)
        let moonVec = astro.moonEciFromTime(state.time)
        let sensors = activeSensors.map(sens => {
            return {
                vector: math.subtract(state.state, astro.latlong2eci(sens.lat, sens.long, state.time)),
                view: astro.rAzEl(state.state.slice(0,3), state.time, sens.lat, sens.long),
                type: sens.type,
                name: sens.name
            }
        }).filter(sens => {

            let elevation = sens.view.el > 0

            let solarEx = true
            if (type === 'optical' || type === 'space') {
                
            }
            return elevation || solarEx
        })
        console.log(sensors);
    })
}



function convertTimeToDateTimeInput(timeIn = mainWindow.startDate, seconds = true) {
    let padNumber = function(n) {
        return n < 10 ? '0' + n : n
    }
    timeIn = new Date(timeIn)
    if (timeIn == 'Invalid Date') return
    if (seconds) {
        return `${timeIn.getFullYear()}-${padNumber(timeIn.getMonth()+1)}-${padNumber(timeIn.getDate())}T${padNumber(timeIn.getHours())}:${padNumber(timeIn.getMinutes())}:${padNumber(timeIn.getSeconds())}`
    }
    return `${timeIn.getFullYear()}-${padNumber(timeIn.getMonth()+1)}-${padNumber(timeIn.getDate())}T${padNumber(timeIn.getHours())}:${padNumber(timeIn.getMinutes())}:${padNumber(timeIn.getSeconds())}`
}

function propToTimeAnalytic(state= {a: 42164, e: 0, i: 0, raan: 0, arg: 0, tA: 0}, dt = 7200, j2 = false) {
    state = {...state}
    if (j2) {
        state.tA = propTrueAnomalyj2(state.tA, state.a, state.e, state.i, dt)
        let j2 = 1.082626668e-3
        let n = (398600.4418 / state.a / state.a / state.a) ** 0.5
        let n_rEarth2 = n*40680622.66137769
        let p = state.a * (1 - state.e ** 2)
        let raanJ2Rate = -3 * n_rEarth2*j2*Math.cos(state.i) / 2 / p / p
        let argJ2Rate = 3 * n_rEarth2 * j2 * (4 - 5 * Math.sin(state.i) ** 2) / 4 / p / p 
        state.raan += raanJ2Rate * dt
        state.arg += argJ2Rate * dt
    }
    else {
        state.tA = propTrueAnomaly(state.tA, state.a, state.e, dt)
    }
    return astro.coe2J2000(state)
}

function propTrueAnomaly(tA = 0, a = 10000, e = 0.1, time = 3600) {
    function True2Eccentric(e, ta) {
        return Math.atan(Math.sqrt((1 - e) / (1 + e)) * Math.tan(ta / 2)) * 2;
    }
    function Eccentric2True(e,E) {
        return Math.atan(Math.sqrt((1+e)/(1-e))*Math.tan(E/2))*2;
    }
    
    function solveKeplersEquation(M,e) {
        let E = M;
        let del = 1;
        while (Math.abs(del) > 1e-4) {
            del = (E-e*Math.sin(E)-M)/(1-e*Math.cos(E));
            E -= del;
        }
        return E;
    }

    let eccA = True2Eccentric(e, tA)
    let meanA = eccA - e * Math.sin(eccA)
    meanA += Math.sqrt(398600.4418 / (a ** 3)) * time
    eccA = solveKeplersEquation(meanA, e)
    return Eccentric2True(e, eccA)
}

function propTrueAnomalyj2(tA = 0, a = 10000, e = 0.1, i, time = 3600) {
    function True2Eccentric(e, ta) {
        return Math.atan(Math.sqrt((1 - e) / (1 + e)) * Math.tan(ta / 2)) * 2;
    }
    function Eccentric2True(e,E) {
        return Math.atan(Math.sqrt((1+e)/(1-e))*Math.tan(E/2))*2;
    }
    
    let j2 = 1.082626668e-3
    let n = (398600.4418 / a / a / a) ** 0.5
    let rEarth = 6378.1363
    let p = a * (1 - e ** 2)
    let mAj2rate = -3 * n * rEarth * rEarth * j2 * (1 - e * e) * (3 * Math.sin(i) ** 2 - 2) / 4 / p / p
    function solveKeplersEquation(M,e) {
        let E = M;
        let del = 1;
        while (Math.abs(del) > 1e-6) {
            del = (E-e*Math.sin(E)-M)/(1-e*Math.cos(E));
            E -= del;
        }
        return E;
    }

    let eccA = True2Eccentric(e, tA)
    let meanA = eccA - e * Math.sin(eccA)
    meanA += Math.sqrt(398600.4418 / (a ** 3)) * time
    meanA += mAj2rate * time
    eccA = solveKeplersEquation(meanA, e)
    return Eccentric2True(e, eccA)
}
