var http = require('http');
var fs = require('fs');
var url = require('url');

http.createServer(function (req, res) {
    var q = url.parse(req.url, true);
    if (q.pathname === '/') {q.pathname = '/index.html'}
    res.writeHead(200, {'Content-Type': 'text/html'});
    fs.readFile('C:/Users/pvanz/Documents/GitHub/pkevz.github.io' + q.pathname, function(err, data) {
    if (err) {
      res.writeHead(404, {'Content-Type': 'text/html'});
      return res.end("404 Not Found");
    } 
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.write(data);
    return res.end();
  });
}).listen(8080);