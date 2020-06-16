var http = require('http');
var fs = require('fs');
var url = require('url');
var team1Init,team2Init;
var burns = {
  1: {
    0: [0,0],
    1: [0,0],
    2: [0,0],
    3: [0,0],
    4: [0,0],
  },
  2: {
    0: [0.25,0.25],
    1: [0,0.25],
    2: [0,0],
    3: [0,0],
    4: [0,0],
  }
};
const server = http.createServer(function (req, res) {
    var q = url.parse(req.url, true);
    console.log(q.pathname);
    
    if (q.pathname === '/') {q.pathname = '/index.html'}
    if (q.pathname.substring(1,5) === 'team') {
      let data = [];
      req.on('data', chunk => {
        data = `${chunk}`;
      });
      req.on('end', () => {
        burns[q.pathname.substring(5,6)] = JSON.parse(data);
      })
      outstring = handleBurnRequests(q.pathname);
      res.write(outstring);
      return res.end();
    }
    res.writeHead(200, {'Content-Type': 'text/html'});
    fs.readFile('C:/Users/pvanz/Documents/GitHub/pkevz.github.io' + q.pathname, function(err, data) {
    if (err) {
      res.writeHead(404, {'Content-Type': 'text/html'});
      return res.end("404 Not Found");
    } 
    res.write(data);
    return res.end();
  });
}).listen(8080);


function handleBurnRequests(urlIn) {

    let tempTeamNum = urlIn.substring(5,6);
    if (tempTeamNum === '1') {
      tempTeamNum = '2';
    }
    else {
      tempTeamNum = '1';
    }
    
    let outstring = JSON.stringify(burns[tempTeamNum]);
    
    return outstring;
}