// Undercooked Networking-Test 1 Server, written 2024-09-03.
// Protocol Format Version: 1
// Config Format Version: 1
//


// Server Config (defaults, may be changed via a config.json file in the same directory)
const default_port = 3000;
const default_host = "localhost";
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
    "tickRate": default_tickRate, // How fast the 'tick()' updater function should be called
    "filterIps": true, // Filter ip's from being sent to client?
    "filterPlayerData": true, // If a recipient is known should the server filter other players data from being sent to the recipient?
    "unknownRecipientSendMode": "None", // If the recipient is unknown should we send all players data or none? ("None" or "All")
    "disconnectEventHandlerMode": "client", // Which identification-techinque should be used when a disconnect event is recieved ("Client" or "PlayerId")
    "keepAliveWsOnDisconnectEvent": false, // Should the server not close the websocket-connection apon a disconnect event?
    "resetGameStateOnStop": true, // Should the gameState be reset when the stop-event is recieved and the game is stopped.
    "resetGameStateOnLoopStop": false, // Should the gameState be reset when 'stopBroadcastLoop' is called, which happends when 0 players are connected?
    "sendJoinAndLeaveEvents": false, // Should the server add join/leave events to the 'lastEvents' field sent to the clients? Note, theese are only reset when the stop-event is recieved.
    "playerIdRetriver": "Short", // How should player id's be generated? "Incremental" +1 the amount of players, "UUID" generates a full UUID, "Short" generates a 8-char long UUID. Note, short/uuid should be less likely to asign the same id to diffrent players, but might be harder for the server to keep track of.
    "includePortInClientIP": false, // Should the port be added to the ip stored for each client? Note, this would allow more then once client per IP, but usualy port numbers aren't persistant across page-refreshes which breaks re-connect.
    "fuzzyMatchIpByName": true, // Attempts to fix re-connects when ports are present in the client-ip, by matching for the non-port-ip-adress and the requestedName (trimmed of _), should work but can fault if more then one client has the same name, or if a client sets an empty name.
    "startingBroadcastIndex": 0, // Leave at 0
    // handShakeInfo is sent at the first update given to a client after it connects, this might for example contain the server-protocol-version.
    "handShakeInfo": {},
    // gameState is both the template and default values for the game data.
    "gameState": {
        "format": 1,
        "state": "idle", // "idle" or "started"
        "turn": null, // playerid
        "data": {}, // playerdata mapped to playerid
        "choices": {}, // choices mapped to playerid
        "options": {}, // field for additional game-options that the client should be aware of
        "lastEvents": [], // logs
        "currentEvents": [], // logs, unused
        "_ws_clients_": 0, // internal
        "_msg_": "Default gamestate! (2024-09-03)" // sent on first update after connect.
    },
    // When a new player joins their data is based of the following template:
    "playerData_template": {
        "status": "inactive", // "inactive" or "active"
        "name": "player", // username for a player
        "hand": [0], // list of cardId
        "recipe": {}, // the recipies a player has and if they are completed or not.
        "points": 0, // the game-points a player has
        "_dox_": null, // internal, used for identifing a player
        "_wsclient_": null // internal, used for identifing a player
    },
    // When a player gets a recipe, the recipie field will contain an instance of this template.
    "playerRecipe_template": {
        "id": 0, // the recipeid
        "locker": [], // cardId's locked into the recipe
        "completed": false
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
    },
    // function to be called when the selectEvent has a set "cause"
    "selectEventCauses": {
        "action": handleAction,
        "lockin": handleLockIn,
        "steal": handleSteal,
        "gamble": handleGamble
    },
    // Registry
    "registry": {
        "cards": {
            0: {
                "cardName": "Ägg"
            },
            1: {
                "cardName": "Bär"
            },
            3: {
                "cardName": "Tomat"
            },
            4: {
                "cardName": "Skål"
            },
            5: {
                "cardName": "Frukt"
            },
            6: {
                "cardName": "Fisk"
            },
            7: {
                "cardName": "Nudlar"
            },
            8: {
                "cardName": "Broccoli"
            },
            9: {
                "cardName": "Rött Kött"
            },
            10: {
                "cardName": "Pasta"
            },
            11: {
                "cardName": "Sallad"
            },
            12: {
                "cardName": "Gurka"
            },
            13: {
                "cardName": "Räkor"
            },
            14: {
                "cardName": "Fågel Kött"
            },
            15: {
                "cardName": "Glass"
            },
            16: {
                "cardName": "Potatis"
            },
            17: {
                "cardName": "Strut"
            },
            18: {
                "cardName": "Grönsaker"
            },
            19: {
                "cardName": "Räkor"
            }
        },
        "recipes": {
            0: {
                "recipeName": "Pastasallad",
                "ingredients":[10,11],
                "points": 1
            },
            1: {
                "recipeName": "Köttgryta",
                "ingredients":[18,9,4],
                "points": 2
            },
            2: {
                "omelett": "Ägg",
                "ingredients":[0],
                "points": 1
            },
            2: {
                "recipeName": "Glasstrut",
                "ingredients":[15,17],
                "points": 1
            },
            3: {
                "recipeName": "Carbonara",
                "ingredients":[10,9,0],
                "points": 2
            },
            4: {
                "recipeName": "Rä-Rä-Rä-Räksallad",
                "ingredients":[19,11],
                "points": 1
            },
            5: {
                "recipeName": "Köttbullar & Potatismos",
                "ingredients":[16,9],
                "points": 1
            },
            6: {
                "recipeName": "Fruktsallad",
                "ingredients":[5,4],
                "points": 1
            }
        },
        "actions": {
            0: {
                "cardName": "Reset",
                "cardDescription": "Välj en spelare som lägger alla sina kort i botten av korthögen & tar 3 nyad",
                "action": (parsedData,affectedPlayers) => {}
            },
            1: {
                "cardName": "Steal Hand",
                "cardDescription": "Byt hand med en valfri spelare",
                "action": (parsedData,affectedPlayers) => {}
            },
            2: {
                "cardName": "Apocalyps",
                "cardDescription": "Alla lägger sina kort i botten av högen tar 3 nya kort",
                "action": (parsedData,affectedPlayers) => {}
            }
        }
    }
};
//#region setup
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
let gameRestartsIndex = 0;

// Prep GameState
const defaultGameState = { ...config["gameState"] };
let gameState = { ...config["gameState"] };

// Create a WebSocket server
const wss = new WebSocket.Server({ host: config["host"], port: config["port"] });
//#endregion setup

// [Functions]
//#region helperFunctions
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

// Function
function keyfilterlist(list,filterkey) {
    if (list.length <= 0) {
        return list;
    }
    filterkey = filterkey.trim()
    if (filterkey.startsWith("*")) {
        return list;
    } else if (filterkey.startsWith("!")) {
        filterkey = filterkey.replace(/^!+/, '');
        let toret = [];
        list.forEach( (key) => {
            if (key != filterkey) {
                toret.push(key);
            }
        });
        return toret;
    } else {
        if (list.includes(filterkey)) {
            return [filterkey];
        } else {
            return [];
        }
    }
}
function keyfilterlist_multiple(list,filterkeys) {
    let toret = [];
    if (typeof filterkeys === 'string') {
        filterkeys = [filterkeys];
    }
    filterkeys.forEach( (filterkey) => {
        keyfilterlist(list,filterkey).forEach( (rem) => {
            if (!toret.includes(rem)) {
                toret.push(rem);
            }
        } );
    } );
    return toret;
}
//#endregion helperFunctions

//#region serverStuff

// Function to broadcast the gameState to every connected player/client.
// override_recipient is a playerid, if null it will match to the client.
function broadcastGameState(override_recipient=null,isConnectAnswer=false) {
    log(`Broadcasted update (i:${broadcastIndex})`, "route",1);
    const timestamp = Date.now()
    // Iterate over al clients, try to identify recipient, convert the data to JSON, and send.
    i=0;
    wss.clients.forEach( (wsclient) => {
        i++;
        let localGameState = { ...gameState };
        let recipient = null;
        let currentFilters = [];
        let updateMessage;
        // Find playerid matching client
        if (override_recipient !== null) {
            recipient = override_recipient;
        } else {
            // Identify
            for (const [playerid,playerdata] of Object.entries(localGameState["data"])) {
                if (playerdata["_wsclient_"] === wsclient) {
                    recipient = playerid;
                    break;
                }
            }
        }
        // Append basic request data
        localGameState["_req"] = {
            "timestamp": timestamp.toString(),
            "index": broadcastIndex,
            "restarts": gameRestartsIndex
        }
        if (recipient != null) {
            localGameState["_req"]["recipient"] = recipient;
        }
        if (isConnectAnswer === true) {
            localGameState["_req"]["handShakeInfo"] = config["handShakeInfo"];
        }
        // Note: The following code adds stuff to the 'currentFilters' to be filtered from the
        //       sent out gameState. This list is applied from first entry to last, meaning
        //       the more aggressive filters should be first, thus playerdata is.
        // Add recipient?
        if (config["filterPlayerData"] === true) {
            if (recipient !== null) {
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
        updateMessage = JSON.stringify(localGameState);
        // Send
        if (wsclient.readyState === WebSocket.OPEN) {
            wsclient.send(updateMessage);
        }
    });
    // Increment index
    broadcastIndex++;
}

// Function to add an event to lastEvents
function addLoggedEvent(event) {
    if (config["sendJoinAndLeaveEvents"] === true) {
        gameState.lastEvents.push(event);
    }
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
        if (config["resetGameStateOnLoopStop"]) {
            resetGameState();
        }
        log("Stopping loop! (no clients)", "loop");
        if (config["sendJoinAndLeaveEvents"] === true) { gameState.lastEvents = []; };
    }
}

// Function to handle new connections.
// Returns the playerid of the new connection.
function handleNewConnection(senderIp,requestedName,wsclient) {
    var playerid;
    if (config["playerIdRetriver"].toLowerCase() === "uuid") {
        playerid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    } else if (config["playerIdRetriver"].toLowerCase() === "short") {
        playerid = 'xxxxxxxx'.replace(/x/g, function() {
            return (Math.random() * 16 | 0).toString(16);
        });
    } else {
        playerid = gameState["_ws_clients_"]+1;
    }
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
        // If port is included in the ip and "fuzzyMatchIpByName" is enabled match username and base-ip instead of ip+port
        if (config["includePortInClientIP"] === true && config["fuzzyMatchIpByName"] === true) {
            let senderIp_base = null;
            let storedIp_base = null;
            if (senderIp.includes(":")) {
                senderIp_base = senderIp.split(":")[0];
            } else {
                senderIp_base = senderIp;
            }
            if (value._dox_.includes(":")) {
                storedIp_base = value._dox_.split(":")[0];
            } else {
                storedIp_base = value._dox_;
            }
            log(`Fuzzy matching ip with name ${requestedName}/${requestedName.replace(/_+$/, '')}?=${value.name}, ${senderIp_base}?=${storedIp_base}`);
            if (senderIp_base === storedIp_base && (requestedName === value.name || requestedName.replace(/_+$/, '') === value.name)) {
                if (foundIP === false) {
                    playerid = key;
                    foundIP = true;
                }
            }
        } else {
            if (value._dox_ == senderIp) {
                if (foundIP === false) {
                    playerid = key;
                    foundIP = true;
                }
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
        addLoggedEvent( {"playerJoin": `${playerid}`} );
    }
    // Else just set status
    else {
        log(`Re-connected existing player. (IP:${senderIp})`, "route",1)
        gameState.data[playerid]["_wsclient_"] = wsclient;
        addLoggedEvent( {"playerJoin": `${playerid}`} );
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
            addLoggedEvent( {"playerInactivate": `${playerid}`} );
            log(`${senderIp} inactivated.`, "route",1);
        } else {
            delete gameState.data[playerid];
            addLoggedEvent( {"playerDisconnect": `${playerid}`} );
            log(`Removed ${senderIp}, disconnected.`, "netio",1);
        }
    } else {
        if (mode.toLowerCase() === "inactivate") {
            log(`${senderIp} disconnected. (${mode} failed, no-pid)`, "netio",1);
        } else {
            log(`${senderIp} disconnected. (${mode} failed, no-pid)`, "netio",1);
        }
        addLoggedEvent( {"playerDisconnect": "unknown"} );
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
            addLoggedEvent( {"playerInactivate": `${knownPlayerid}`} );
            log(`${senderIp} inactivated. (pid:${knownPlayerid})`, "route",1);
        } else {
            delete gameState.data[knownPlayerid];
            addLoggedEvent( {"playerDisconnect": `${knownPlayerid}`} );
            log(`Removed ${senderIp}, disconnected. (pid:${knownPlayerid})`, "netio",1);
        }
    } else {
        addLoggedEvent( {"playerDisconnect": "unknown"} );
        log(`Unmatched client ${senderIp} disconnected.`, "netio",1);
    }
}

// [Websocket Setup]
wss.on('connection', (ws, req) => {
    let senderIp;
    if (config["includePortInClientIP"] === true) {
        senderIp = req.socket.remoteAddress+":"+req.socket.remotePort;
    } else {
        senderIp = req.socket.remoteAddress;
    }
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

            // Identify playerid by ip
            parsedData.sender = null;
            for (const [key,value] of Object.entries(gameState.data)) {
                if (value._dox_ === senderIp) {
                    parsedData.sender = key;
                    break;
                }
            }

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
                log(`Disconnect event received from ${senderIp}.`, "route",1);
                // Disconnect using client
                if (config["disconnectEventHandlerMode"].toLowerCase() === "client") {
                    handleDisconnectionByClient(senderIp,ws,"remove");
                // Disconnect using playerid
                } else {
                    var playerid = null;
                    if (parsedData.playerid) {
                        playerid = parsedData.playerid;
                    } else {
                        playerid = parsedData.sender;
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
                if (!isNaN(parsedData.choiceIndex) && parsedData.choiceIndex.trim() !== '') {
                    handleSelection(parsedData); // DEFINED AT BOTTOM OF FILE
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

            //// Action event (Usualy caused by the selectEventHandler)
            else if (parsedData.event === 'action') {
                handleAction(parsedData); // DEFINED AT BOTTOM OF FILE
            }
            //// LockIn event (Usualy caused by the selectEventHandler)
            else if (parsedData.event === 'lockin') {
                handleLockIn(parsedData); // DEFINED AT BOTTOM OF FILE
            }
            //// Steal event (Usualy caused by the selectEventHandler)
            else if (parsedData.event === 'steal') {
                handleSteal(parsedData); // DEFINED AT BOTTOM OF FILE
            }
            //// Gamble event (Usualy caused by the selectEventHandler)
            else if (parsedData.event === 'gamble') {
                handleGamble(parsedData); // DEFINED AT BOTTOM OF FILE
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

//#endregion serverStuff

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

// Function to reset the gameState
function resetGameState() {
    gameState = { ...defaultGameState };
}

// Function to post a choice of cards (cards will be sent to client)
// Returns the playerid and the choiceid as a list. => [playerid,choiceid]
// Note! This function does not broadcast and `posted` will be index of last broadcast!
function postChoice(playerid,listOfCardIds,hidden=false) {
    const timestamp = Date.now();
    const id = timestamp.toString();
    gameState["choices"][playerid] = {
        "id": id,
        "posted": broadcastIndex,
        "status": "waiting",
        "cards": listOfCardIds,
        "hidden": hidden,
        "cardAmnt": null
    };
    return [playerid,id];
}
// Function to post a choice of cards (same as postChoice but just takes an amount to not send cards to client)
// also returns a list of [playerid,choiceid]
// Note! This function does not broadcast and `posted` will be index of last broadcast!
function postChoiceAmnt(playerid,amntOfCards) {
    const timestamp = Date.now();
    const id = timestamp.toString();
    gameState["choices"][playerid] = {
        "id": id,
        "posted": broadcastIndex,
        "status": "waiting",
        "cards": [],
        "hidden": true,
        "cardAmnt": amntOfCards
    };
    return [playerid,id];
}
// Function to "de-list"/remove al choices from a player
// returns the list of choices if playerid was found else null.
function delistChoicesForPlayer(playerid) {
    if (Object.keys(gameState["choices"]).includes(playerid)) {
        const toret = {...gameState["choices"][playerid]};
        delete gameState["choices"][playerid];
        return toret;
    }
    return null;
}
// Function to "de-list" a specific choice given it's id.
// returns the list of choices if playerid was found else null.
function delistChoice(choiceid) {
    for (const [playerid,playersChoices] of Object.entries(gameState["choices"])) {
        if (playersChoices.id === choiceid) {
            const toret = {...playersChoices};
            delete gameState["choices"][playerid];
            return toret;
        }
    }
    return null;
}

// Function to set the recipe for a player
function setRecipeForPlayer(playerId,recipeId) {
    gameState.data[playerId]["recipe"] = {...config["playerRecipe_template"]};
    gameState.data[playerId]["recipe"]["id"] = recipeId;
}
// Function to get the recipe for a player
function getRecipeForPlayer(playerId) {
    return gameState.data[playerId]["recipe"];
}
// Function to complete a recipe and yeild the points to the player
function completeRecipeForPlayer(playerId) {
    gameState.data[playerId]["recipe"]["completed"] = true;
    gameState.data[playerId]["points"] += config.registry["recipes"][ gameState.data[playerId]["recipe"]["id"] ]["points"];
}
// Function to lockin a card for a recipe
// returns if recipe got autocompleted or not.
function lockinCardForPlayerRecipe(playerId,cardId,autoComplete=true) {
    gameState.data[playerId]["recipe"]["locker"].push(cardId);
    if (autoComplete === true) {
        missing = false;
        config.registry["recipes"][ gameState.data[playerId]["recipe"]["id"] ]["ingredients"].forEach( (ingredient) => {
            if (!gameState.data[playerId]["recipe"]["locker"].includes(ingredient)) {
                if (missing !== true) {
                    missing = true;
                }
            }
        });
        if (missing === false) {
            completeRecipeForPlayer(playerId);
        }
        return !missing;
    } else {
        return false;
    }
}

// Function to remove a card from playerhand
function removeCardFromHand(playerId,cardId) {
    let index = gameState.data[playerId]["hand"].indexOf(cardId);
    if (index !== -1) {
        // Remove the value at that index
        gameState.data[playerId]["hand"].splice(index, 1);
    }
}


// Function to randomize a hand
function randomizeHand(playerId) {
    const keys = Object.keys(obj);
    const hand = [
        keys[Math.floor(Math.random() * keys.length)],
        keys[Math.floor(Math.random() * keys.length)],
        keys[Math.floor(Math.random() * keys.length)]
    ];
    gameState.data[playerId]["hand"] = hand;
}


// Main tick function
function tick() {
    gameRestartsIndex++;
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
    if (config["resetGameStateOnStop"]) {
        resetGameState();
    }
    if (skipBroadcast !== true) {
        broadcastGameState();
    }
}

// Function to handle selection made by client (select event)
function handleSelection(parsedData,skipBroadcast=false) {
    // Start by getting the choice data and set it to "completed"
    //gameState.choices[playerId].status = "completed";
    let choiceObj = {"isPlaceholder": true, "hidden":true, "cards":[]};
    for (const [key,value] of Object.entries(gameState.choices)) {
        if (value.id === parsedData.choiceId) {
            gameState.choices[key].status = "completed";
            choiceObj = gameState.choices[key];
            break;
        }
    }
    // Set cardIndex in parsedData
    if (!isNaN(parsedData.cardId) && parsedData.cardId.trim() !== '') {
    } else {
        if (choiceObj.hidden == true || choiceObj.cards.length < 1) {
            parsedData.cardId = -1;
        } else {
            parsedData.cardId = choiceObj.cards[parsedData.choiceIndex];
        }
    }
    // DEBUG
    if (parsedData.cause) {
        log(`Selection made: ChoiceIndex=${parsedData.choiceIndex}, Card=${parsedData.cardId}, Cause=${parsedData.cause}, Sender=${parsedData.sender}`)
    } else {
        log(`Selection made: ChoiceIndex=${parsedData.choiceIndex}, Card=${parsedData.cardId}, Sender=${parsedData.sender}`)
    }
    // Handle 'cause'
    if (parsedData.cause) {
        if (Object.keys(config["selectEventCauses"]).includes(parsedData.cause)) {
            config["selectEventCauses"][parsedData.cause](parsedData);
        }
    }
    // Broadcast
    if (skipBroadcast !== true) {
        broadcastGameState();
    }
}

// Function to handle action sent by client 
function handleAction(parsedData) {
    // parsedData is the Object sent to the server
    //
    // ´parsedData.event´ may not always be 'action'.
    //   If the event was fired from the selectEventHandler the `parsedData.cause` will instead be 'action'
    //
    // `parsedData.sender` should be the playerId of the sender of the event. (Aslong as they where able to be identified)
    //
    // `parsedData.cardId` should be the `cardId` used to invoke the action.
    //
    // `parsedData.affected` should be a list of the targets of the effects,
    //    where the string "*" means everyone and the string "!<playerid>" is everyone
    //    except a sertain player, "<playerids>" would be a specific player.
    //    The `keyfilterlist(<list>,<filterStr>)` function takes one string and returns
    //      the list entries selected by that key.
    //    To quickely filter the entire `parsedData.affected` list, one can call
    //      `keyfilterlist_multiple(<list>,<filterList>)` which runs through each entry
    //      in the filterList and merges non-already-selected entries.
    //    Example:
    //      Given the players ['one','two','three']
    //      and the filters   ['!two']
    //      Should return     ['three','one'] 
    //
    if (!parsedData.affects) {
        log(`Recieved action event without affects-targets!`);
        return;
    }
    const affectedPlayers = keyfilterlist_multiple( Object.keys(gameState["data"]), parsedData.affects );
    log(`Got action event with cardId '${parsedData.cardId}' with sender '${parsedData.sender}' which tagets [${parsedData.affects}] affecting [${affectedPlayers}]!`);
    
    if (Object.keys(config.registry["actions"]).includes(parsedData.cardId)) {
        config.registry["actions"][parsedData.cardId]["action"](parsedData,affectedPlayers);
    }
}

// Function to handle a LockIn request by the client
function handleLockIn(parsedData) {
    // parsedData is the Object sent to the server
    //
    // ´parsedData.event´ may not always be 'lockin'.
    //   If the event was fired from the selectEventHandler the `parsedData.cause` will instead be 'lockin'
    //
    // `parsedData.sender` should be the playerId of the sender of the event. (Aslong as they where able to be identified)
    //
    // ´parsedData.cardId´ should be the `cardId` requested to lockin.
    //
    log(`Got lockin event with cardId '${parsedData.cardId}' with sender '${parsedData.sender}'!`);
    lockinCardForPlayerRecipe(parsedData.sender,parsedData.cardId);
    removeCardFromHand(playerId,parsedData.cardId);
}

// Function to handle a steal request by the client
function handleSteal(parsedData) {
    // parsedData is the Object sent to the server
    //
    // ´parsedData.event´ may not always be 'steal'.
    //   If the event was fired from the selectEventHandler the `parsedData.cause` will instead be 'steal'
    //
    // `parsedData.sender` should be the playerId of the sender of the event. (Aslong as they where able to be identified)
    //
    // ´parsedData.cardId´ should be the `cardId` placed on the "table" by the player.
    //
    log(`Got steal event with cardId '${parsedData.cardId}' with sender '${parsedData.sender}'!`);
}

// Function to handle a gamble request by the client
function handleGamble(parsedData) {
    // parsedData is the Object sent to the server
    //
    // ´parsedData.event´ may not always be 'gamble'.
    //   If the event was fired from the selectEventHandler the `parsedData.cause` will instead be 'gamble'
    //
    // `parsedData.sender` should be the playerId of the sender of the event. (Aslong as they where able to be identified)
    //
    // (´parsedData.cardId´ should always be `-1` thus does not matter for this function.)
    //
    log(`Got gamble event with cardId '${parsedData.cardId}' with sender '${parsedData.sender}'!`);
}