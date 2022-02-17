let files = []
let filesLoaded = document.getElementById('files-loaded')


function fileDrop(event) {
    event.preventDefault();
    for (let ii = 0; ii < event.dataTransfer.files.length; ii++) {
        let fileReader = new FileReader();
        fileReader.onload = function (fileLoadedEvent) {
            let text = fileLoadedEvent.target.result;
            text = text.split('EphemerisTimePosVel');
            let data = text[1].split('CovarianceTimePos')
            data[0] = data[0].split(/\n/).map(line => line.split(/ +/)).filter(line => line.length > 2).map(line => line.filter(item => item !== '').map(item => Number(item)))
            files.push({
                startTime: data[0][0][0],
                header: text[0] + '\n' + 'EphemerisTimePosVel',
                posVelData: data[0],
                covData: data.length > 1 ? data[1].split(/\n/).map(line => line.split(/ +/)).filter(line => line.length > 2).map(line => line.filter(item => item !== '').map(item => Number(item))) : []
            })
        };
        console.log(event.dataTransfer.files[ii]);
        fileReader.readAsText(event.dataTransfer.files[ii], "UTF-8");
        let div = document.createElement("div")
        div.innerText = event.dataTransfer.files[ii].name
        filesLoaded.append(div)
    }
    
}

function exportConsolidated() {
    files = files.sort((a, b) => a.startTime - b.startTime)
    console.log(files.length);
    for (let file = 0; file < files.length; file++) {
        let endTime = file === files.length - 1 ? 1e10 : files[file + 1].startTime
        files[file].posVelData = files[file].posVelData.filter(data => data[0] < endTime)
        files[file].covData = files[file].covData.length > 0 ? files[file].covData : files[file].posVelData.map(line => [line[0], 0, 0, 0, 0, 0, 0])
        files[file].covData = files[file].covData.filter(data => data[0] < endTime)
        files[file].posVelData = files[file].posVelData.map(line => line.join(' ')).join('\n')
        files[file].covData = files[file].covData.map(line => line.join(' ')).join('\n')
    }
    let out = ''
    out += files[0].header + '\n'
    out += files.map(file => file.posVelData).join('\n')
    out += 'CovarianceTimePos \n\n'
    out += files.map(file => file.covData).join('\n')
    out += 'END Ephemeris'
    downloadFile('combined.e', out)
}

function downloadFile(filename, text) {
    var pom = document.createElement('a');
    pom.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    pom.setAttribute('download', filename);

    if (document.createEvent) {
        var event = document.createEvent('MouseEvents');
        event.initEvent('click', true, true);
        pom.dispatchEvent(event);
    } else {
        pom.click();
    }
}

function dragOverHandler(event) {
    if (event.type === 'dragenter') {
        event.target.classList.add('dragged-on');
    }
    else if (event.type === 'dragleave') {
        event.target.classList.remove('dragged-on');

    }
    event.preventDefault();

}