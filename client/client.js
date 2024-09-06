// server.js
const http = require('http');
const fs = require('fs');
const path = require('path');

const default_port = 3001;
const default_hostname = 'localhost';
const configFile = './config.json';

// Default config
var config = {
    "host": default_hostname,
    "port": default_port
}

// Load config (if found)
if (fs.existsSync(configFile)) {
    const configFile_content = fs.readFileSync(configFile);
    const configFile_data = JSON.parse(configFile_content, 'utf8')
    config = {...config,...configFile_data};
    console.log(`Merged-in config from ${configFile}!`)
}

const server = http.createServer((req, res) => {
    // Build file path
    let filePath = path.join(__dirname, 'public', req.url === '/' ? 'index.html' : req.url);

    // Get the file extension
    let extname = String(path.extname(filePath)).toLowerCase();
    
    // Set default content type
    let contentType = 'text/html';
    
    // Check ext and set content type
    const mimeTypes = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpg',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
        '.wav': 'audio/wav',
        '.mp4': 'video/mp4',
        '.woff': 'application/font-woff',
        '.ttf': 'application/font-ttf',
        '.eot': 'application/vnd.ms-fontobject',
        '.otf': 'application/font-otf',
        '.wasm': 'application/wasm'
    };

    contentType = mimeTypes[extname] || 'application/octet-stream';

    // Read file
    fs.readFile(filePath, (err, content) => {
        if (err) {
            if (err.code == 'ENOENT') {
                // Page not found
                fs.readFile(path.join(__dirname, 'public', '404.html'), (err, content) => {
                    res.writeHead(404, { 'Content-Type': 'text/html' });
                    res.end(content, 'utf8');
                });
            } else {
                // Some server error
                res.writeHead(500);
                res.end(`Server Error: ${err.code}`);
            }
        } else {
            // Success
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf8');
        }
    });
});

server.listen(config["port"], config["host"], () => {
    console.log(`Client running at http://${config["host"]}:${config["port"]}/`);
});
