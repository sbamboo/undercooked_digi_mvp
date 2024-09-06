// server.js
const http = require('http');
const fs = require('fs');
const path = require('path');

const hostname = 'localhost';
const port = 3002;

const server = http.createServer((req, res) => {
    // Serve the HTML file
    if (req.url === '/') {
        fs.readFile(path.join(__dirname, 'dev.html'), (err, data) => {
            if (err) {
                res.writeHead(500, {'Content-Type': 'text/plain'});
                res.end('500 Internal Server Error');
                return;
            }
            res.writeHead(200, {'Content-Type': 'text/html'});
            res.end(data);
        });
    } else {
        res.writeHead(404, {'Content-Type': 'text/plain'});
        res.end('404 Not Found');
    }
});

server.listen(port, hostname, () => {
    console.log(`Server running at http://${hostname}:${port}/`);
});
