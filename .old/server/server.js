// Undercooked Networking-Test 1 Server, written 2024-09-03.
// Protocol Format Version: 1
// Config Format Version: 1
//


// Server Config (defaults, may be changed via a config.json file in the same directory)
const default_port = 3000;
const default_host = "192.168.39.188";
const default_tickRate = 5000; // Delay in ms
const configFile = './config.json';

// Imports
const WebSocket = require('ws');
const fs = require('fs');

// Setup default deffinitions
let config = {
    "format": 1,
    "port": default_port,
    "host": default_host,
    "tickRate": default_tickRate,
    "filterIps": true,
    "filterPlayerData": true,
    "startingBroadcastIndex": 0,
    "unknownRecipientSendMode": "None", // "None" or "All"
    "disconnectEventHandlerMode": "client", // "Client" or "PlayerId"
    "keepAliveWsOnDisconnectEvent": false,
    "handShakeInfo": {},
    "gameState": {
        "format": 1,
        "state": "idle",
        "turn": null,
        "data": {},
        "choices": {},
        "options": {},
        "lastEvents": [],
        "currentEvents": [],
        "_ws_clients_": 0,
        "_msg_": "Default gamestate! (2024-09-03)"
    },
    "playerData_template": {
        "status": "inactive",
        "name": "player",
        "hand": [0],
        "recipe": {},
        "points": 0,
        "_dox_": null,
        "_wsclient_": null
    },
    // Filters are paths within the gameState that are filtered out in a given scenario,
    // from the data sent to clients.
    // ~ means to iterate over al entries
    // % means the recipient-playerid (only usable in the "playerdata" scenario)
    // !<query> means to iterate over al entries which key dosen't match the query.
    "filters": {
        "default":        ["data.~._wsclient_"],
        "ip":             ["data.~._dox_"],
        "playerdata":     ["data.!%.hand","choices.!%"],
        "exclAlPlayers":  ["data.~"], // Used when "unknownRecipientSendMode" is set to All, and no recipient is identified.
        "emptyMsgFilter": ["_msg_"]
    }
};
// Load config
if (fs.existsSync(configFile)) {
    const configFile_content = fs.readFileSync(configFile);
    const configFile_data = JSON.parse(configFile_content, 'utf8')
    config = deepMerge(config, configFile_data);
    log(`Merged-in config from ${configFile}!`, "conf")
}

// Object to store the setInterval linker for the tick calls.
let tickIntervalObj;
let broadcastIndex = config["startingBroadcastIndex"];

// Prep GameState
const defaultGameState = { ...config["gameState"] };
let gameState = { ...config["gameState"] };

// Create a WebSocket server
const wss = new WebSocket.Server({ host: config["host"], port: config["port"] });

// [Functions]

function deepMerge(target, source) {
    // Iterate through each property in the source object
    for (const key of Object.keys(source)) {
      // Check if the value of the property is an object
      if (source[key] instanceof Object && key in target) {
        // If it's an object, recursively merge it
        deepMerge(target[key], source[key]);
      } else {
        // Otherwise, just assign the value
        target[key] = source[key];
      }
    }
    return target;
  }

// Function to handle logging
function log(msg,domain="main",padd=2,padder=" ") {
    if (padd !== null) {
        msg = padder.repeat(padd) + msg;
    }
    if (domain !== null && domain !== undefined) {
        msg = `[${domain}]${msg}`;
    }
    console.log(msg);
}

// Deeply filters an object based on specified paths.
// 
// Path format examples:
// - 'data.~._dox_': Iterates over all entries in 'data' and removes the '_dox_' field from each.
// - 'data.bob': Removes the 'bob' key from 'data'.
// - 'data.!bob._dox_': Iterates over all entries in 'data' except the one with the key 'bob' and removes the '_dox_' field from each.
// - 'data.~.sub.~.field': Iterates over all entries in 'data', looks at their 'sub' key, iterates over its children, and removes the 'field' key.
// - '~' iterates over all keys at the current level.
// - '!' iterates over all keys except the specified one.
function deepFilter(obj, paths) {
    // Create a deep copy of the input object to avoid modifying the original
    const objCopy = JSON.parse(JSON.stringify(obj));

    // Helper function to recursively process paths
    function filterObject(toFilter, pathParts) {
        const part = pathParts[0];
        const remaining = pathParts.slice(1);
        // Iterate all
        if (part === "~") {
            if (typeof toFilter === 'object' && toFilter !== null) {
                Object.keys(toFilter).forEach(key => {
                    if (remaining.length > 0) {
                        filterObject(toFilter[key],remaining);
                    } else {
                        delete toFilter[key];
                    }
                });
            }
        // Iterate excluding
        } else if (part.trim().startsWith("!") && part.length > 1) {
            fpart = part.trim().replace(/^!+/, '');
            // Iterate over al keys that arent part
            if (typeof toFilter === 'object' && toFilter !== null) {
                Object.keys(toFilter).forEach(key => {
                    if (key !== fpart) {
                        if (remaining.length > 0) {
                            filterObject(toFilter[key],remaining);
                        } else {
                            delete toFilter[key];
                        }
                    }
                });
            }
        // Delete
        } else {
            if (remaining.length > 0) {
                filterObject(toFilter[part],remaining);
            } else {
                delete toFilter[part];
            }
        }
    }

    // Iterate over each path provided
    paths.forEach(path => {
        const pathParts = path.split('.');
        filterObject(objCopy, pathParts);
    });

    return objCopy;
}

// Function to reset the gameState
function resetGameState() {
    gameState = { ...defaultGameState };
}

// Function to broadcast the gameState to every connected player/client.
// override_recipient is a playerid, if null it will match to the client.
function broadcastGameState(override_recipient=null,isConnectAnswer=false) {
    log(`Broadcasted update (i:${broadcastIndex})`, "route",1);
    localGameState = { ...gameState };
    // Append basic request meta
    const timestamp = Date.now()
    localGameState["_req"] = {
        "timestamp": timestamp.toString(),
        "index": broadcastIndex,
        "recipient": "unknown",
    }
    if (isConnectAnswer === true) {
        localGameState["_req"]["handShakeInfo"] = config["handShakeInfo"];
    }
    // Iterate over al clients, try to identify recipient, convert the data to JSON, and send.
    i = 0;
    wss.clients.forEach( (client) => {
        i++;
        recipient = null;
        currentFilters = [];
        // Find playerid matching client
        if (override_recipient !== null) {
            recipient = override_recipient;
        } else {
            // Identify
            for (const [key,value] of Object.entries(localGameState["data"])) {
                //const peername = value["_wsclient_"]._socket._peername;
                //const builtAdress = value["_wsclient_"]._socket._peername.address + ":" + value["_wsclient_"]._socket._peername.port;
                //console.log(value["_dox_"], builtAdress)
                //console.log( Object.keys(value["_wsclient_"]) );
                if (value["_wsclient_"] === client) {
                    recipient = key;
                    console.log(`Matched pid '${key}' on ${i}:th client. (r:${recipient})`)
                    break;
                }
                console.log(`Could not match pid for ${i}:th client. (r:${recipient})`)
            }
        }
        // Note: The following code adds stuff to the 'currentFilters' to be filtered from the
        //       sent out gameState. This list is applied from first entry to last, meaning
        //       the more aggressive filters should be first, thus playerdata is.
        // Add recipient?
        if (config["filterPlayerData"] === true) {
            if (recipient !== null) {
                localGameState["_req"]["recipient"] = recipient;
                currentFilters = currentFilters.concat( config["filters"]["playerdata"].map(str => str.replace(/%/g, recipient)) )
            } else {
                if (config["unknownRecipientSendMode"].toLowerCase() === "all") {
                    currentFilters = config["filters"]["exclAlPlayers"];
                }
            }
        }
        // Filter ips?
        if (config["filterIps"] === true) {
            currentFilters = currentFilters.concat( config["filters"]["ip"] );
        }
        // Add default filters
        currentFilters = currentFilters.concat( config["filters"]["default"] );
        // Filter Msg
        if (localGameState["_msg_"] == undefined || localGameState["_msg_"] === "" || localGameState["_msg_"] === null) {
            currentFilters = currentFilters.concat( config["filters"]["emptyMsgFilter"] );
        }
        // Filter
        if (currentFilters.length > 0) {
            localGameState = deepFilter(localGameState,currentFilters);
        }
        var updateMessage = JSON.stringify(localGameState);
        // Send
        if (client.readyState === WebSocket.OPEN) {
            client.send(updateMessage);
        }
    });
    // Increment index
    broadcastIndex++;
}

// Function to start the broadcast loop
function startBroadcastLoop() {
    if (tickIntervalObj) return; // Avoid starting multiple intervals
    //resetGameState();
    log("Starting loop! (new client)", "loop");
    tickIntervalObj = setInterval(() => {
        tick(); // DEFINED AT BOTTOM OF FILE
    }, config["tickRate"]);
}

// Function to stop the broadcast loop
function stopBroadcastLoop() {
    if (tickIntervalObj) {
        clearInterval(tickIntervalObj);
        tickIntervalObj = null;
        log("Stopping loop! (no clients)", "loop");
    }
}

// Function to handle new connections.
// Returns the playerid of the new connection.
function handleNewConnection(senderIp,requestedName,wsclient) {
    var playerid = gameState["_ws_clients_"]+1;
    // Check if the name is taken aswell as if the ip is already linked,
    // meaning its a reconnect.
    var foundReqName = false;
    var foundIP = false;
    for (const [key,value] of Object.entries(gameState.data)) {
        if (value.name == requestedName) {
            if (foundReqName === false) {
                requestedName = requestedName + "_";
                foundReqName = true;
            }
        }
        if (value._dox_ == senderIp) {
            if (foundIP === false) {
                playerid = key;
                foundIP = true;
            }
        }
    }
    // If not found, meaning its a new player, add data and save wsclient.
    if (foundIP == false) {
        gameState.data[playerid] = { ...config["playerData_template"] };
        if (requestedName !== null && requestedName !== undefined && requestedName !== "") {
            gameState.data[playerid]["name"] = requestedName;
        }
        var foundPlayers = 0;
        for (const value of Object.values(gameState["data"])) {
            if (value["name"] === config["playerData_template"]["name"]) {
                foundPlayers++;
            }
        }
        if (foundPlayers > 1) {
            gameState.data[playerid]["name"] = config["playerData_template"]["name"] + `${foundPlayers-1}`;
        }
        gameState.data[playerid]["_dox_"] = senderIp;
        gameState.data[playerid]["_wsclient_"] = wsclient;
        log(`Connected new player. (IP:${senderIp})`, "route",1)
    }
    // Else just set status
    else {
        log(`Re-connected new player. (IP:${senderIp})`, "route",1)
        gameState.data[playerid]["_wsclient_"] = wsclient;
    }
    gameState.data[playerid]["status"] = "active";
    // Return ID
    return playerid
}

// Function to handle disconnection
// Mode can be either 'remove' or 'inactivate'
function handleDisconnectionByPlayerId(senderIp,playerid,mode="remove") {
    // If playerid is set and asked to inactivate do so.
    if (playerid !== null) {
        if (mode.toLowerCase() === "inactivate") {
            gameState.data[playerid]["status"] = "inactive";
            log(`${senderIp} inactivated.`, "route",1);
        } else {
            delete gameState.data[playerid];
            log(`Removed ${senderIp}, disconnected.`, "netio",1);
        }
    } else {
        if (mode.toLowerCase() === "inactivate") {
            log(`${senderIp} disconnected. (${mode} failed, no-pid)`, "netio",1);
        } else {
            log(`${senderIp} disconnected. (${mode} failed, no-pid)`, "netio",1);
        }
    }
}
function handleDisconnectionByClient(senderIp,client,mode="remove") {
    // Check if client is known?
    var knownPlayerid = null;
    for (const [key,value] of Object.entries(gameState.data)) {
        if (value["_wsclient_"] === client) {
            knownPlayerid = key;
            break;
        }
    }
    if (knownPlayerid !== null) {
        if (mode.toLowerCase() == "inactivate") {
            gameState.data[knownPlayerid]["status"] = "inactive";
            log(`${senderIp} inactivated. (pid:${knownPlayerid})`, "route",1);
        } else {
            delete gameState.data[knownPlayerid];
            log(`Removed ${senderIp}, disconnected. (pid:${knownPlayerid})`, "netio",1);
        }
    } else {
        log(`Unmatched client ${senderIp} disconnected.`, "netio",1);
    }
}

// [Websocket Setup]
wss.on('connection', (ws, req) => {
    const senderIp = req.socket.remoteAddress+":"+req.socket.remotePort;
    log(`New connection from IP: ${senderIp}`, "netio",1);

    gameState._ws_clients_++;
    if (gameState._ws_clients_ === 1) {
        startBroadcastLoop();
    }

    // Handle incomming messages
    ws.on('message', (message) => {
        try {
            // Handle events
            const parsedData = JSON.parse(message);

            //// Connect Event (Request)
            if (parsedData.event === "connect") {
                var playerid = handleNewConnection(senderIp,parsedData.reqname,ws);
                if (parsedData.reqname) {
                    log(`Connect event received with requested name "${parsedData.reqname}" from ${senderIp}. (pid:${playerid},cf:${parsedData.format})`, "route",1);
                } else {
                    log(`Connect event received without name from ${senderIp}. (pid:${playerid},cf:${parsedData.format})`, "route",1);
                }
                broadcastGameState(null,true);
            }

            //// Disconnect Event
            else if (parsedData.event === "disconnect") {
                log(`Disconenct event received from ${senderIp}.`, "route",1);
                // Disconnect using client
                if (config["disconnectEventHandlerMode"].toLowerCase() === "client") {
                    handleDisconnectionByClient(senderIp,ws,"remove");
                // Disconnect using playerid
                } else {
                    var playerid = null;
                    if (parsedData.playerid) {
                        playerid = parsedData.playerid;
                    } else {
                        // Identify playerid by ip
                        for (const [key,value] of Object.entries(gameState.data)) {
                            if (value._dox_ === senderIp) {
                                playerid = key;
                                break;
                            }
                        }
                    }
                    handleDisconnectionByPlayerId(senderIp,playerid,"remove");
                }
                // Close Websocket
                if (config["keepAliveWsOnDisconnectEvent"] !== true) {
                    ws.close();
                }
            }

            //// Select event
            else if (parsedData.event === 'select') {
                if (typeof parsedData.choiceIndex === 'number') {
                    handleSelection(parsedData.choiceIndex); // DEFINED AT BOTTOM OF FILE
                } else {
                    ws.send(JSON.stringify({ error: 'Invalid choiceIndex' }));
                }
            }

            //// Start event
            else if (parsedData.event === 'start') {
                handleStart(); // DEFINED AT BOTTOM OF FILE
            }

            //// Stop event
            else if (parsedData.event === 'stop') {
                handleStop(); // DEFINED AT BOTTOM OF FILE
            }

            //// Action event
            else if (parsedData.event === 'action') {
                handleAction(parsedData); // DEFINED AT BOTTOM OF FILE
            }
            
            //// Fallback
            else {
                log(`Recieved invalid event from ${senderIp}`, "route",1)
                ws.send(JSON.stringify({ error: 'Invalid event' }));
            }

        // Errhandle
        } catch (e) {
            log(e, null,null);
            ws.send(JSON.stringify({ error: 'Invalid JSON' }));
        }
    });

    // Handle client disconnection
    ws.on('close', () => {
        // Disconnect using client
        if (config["disconnectEventHandlerMode"].toLowerCase() === "client") {
            handleDisconnectionByClient(senderIp,ws,"inactivate");
        // Disconnect using playerid
        } else {
            var playerid = null;
            // Identify playerid by ip
            for (const [key,value] of Object.entries(gameState.data)) {
                if (value._dox_ === senderIp) {
                    playerid = key;
                    break;
                }
            }
            handleDisconnectionByPlayerId(senderIp,playerid,"inactivate");
        }
        gameState["_ws_clients_"]--;
        if (gameState["_ws_clients_"] === 0) {
            stopBroadcastLoop();
        }
    });
});

// [Log address]
if (config["host"].toLowerCase().trimStart().startsWith("ws://")) {
    var hostaddr = config["host"];
} else {
    var hostaddr = "ws://"+config["host"];
}
const parts = config["host"].split("//");
if (parts[parts.length - 1].includes(":")) {
    log(`WebSocket server running at ${hostaddr} on port ${config["port"]}`)
} else {
    log(`WebSocket server running at ${hostaddr}:${config["port"]}/`)
}





// [Main GameHost Logic Bellow]

// Main tick function
function tick() {
    broadcastGameState();
}

// Function called apon the start event
function handleStart(skipBroadcast=false) {
    log("Started game!");
    gameState.state = "started";
    if (skipBroadcast !== true) {
        broadcastGameState();
    }
}

// Function called apon the stop event
function handleStop(skipBroadcast=false) {
    log("Stopped game!");
    gameState.state = "idle";
    if (skipBroadcast !== true) {
        broadcastGameState();
    }
}

// Function to handle selection made by client (select event)
function handleSelection(choiceIndex,skipBroadcast=false) {
    log(`Selection made: ChoiceIndex=${choiceIndex}`)
    if (skipBroadcast !== true) {
        broadcastGameState();
    }
}

// Function to handle action sent by client 
function handleAction(parsedData) {
    // parsedData is the Object sent to the server
    // ´parsedData.event´ should always be `action`
    // `parsedData.`
}