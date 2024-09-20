// Undercooked Networking Client, written 2024-09-20.
// Protocol Format Version: 3
//
// Note: Assets registry should be an object with fields for each id-typ ("recipe","card",...) with objects with mappings.
//       it should be named registry.
//

const protocolformat = 3;

var registry = {
    "cards": {
        0: {
            "type": "card",
            "cardName": "Ägg",
            "poolOccurence": 1
        },
        1: {
            "type": "card",
            "cardName": "Bär",
            "poolOccurence": 1
        },
        3: {
            "type": "card",
            "cardName": "Tomat",
            "poolOccurence": 1
        },
        4: {
            "type": "card",
            "cardName": "Skål",
            "poolOccurence": 1
        },
        5: {
            "type": "card",
            "cardName": "Frukt",
            "poolOccurence": 1
        },
        6: {
            "type": "card",
            "cardName": "Fisk",
            "poolOccurence": 1
        },
        7: {
            "type": "card",
            "cardName": "Nudlar",
            "poolOccurence": 1
        },
        8: {
            "type": "card",
            "cardName": "Broccoli",
            "poolOccurence": 1
        },
        9: {
            "type": "card",
            "cardName": "Rött Kött",
            "poolOccurence": 1
        },
        10: {
            "type": "card",
            "cardName": "Pasta",
            "poolOccurence": 1
        },
        11: {
            "type": "card",
            "cardName": "Sallad",
            "poolOccurence": 1
        },
        12: {
            "type": "card",
            "cardName": "Gurka",
            "poolOccurence": 1
        },
        13: {
            "type": "card",
            "cardName": "Räkor",
            "poolOccurence": 1
        },
        14: {
            "type": "card",
            "cardName": "Fågel Kött",
            "poolOccurence": 1
        },
        15: {
            "type": "card",
            "cardName": "Glass",
            "poolOccurence": 1
        },
        16: {
            "type": "card",
            "cardName": "Potatis",
            "poolOccurence": 1
        },
        17: {
            "type": "card",
            "cardName": "Strut",
            "poolOccurence": 1
        },
        18: {
            "type": "card",
            "cardName": "Grönsaker",
            "poolOccurence": 1
        },
        19: {
            "type": "card",
            "cardName": "Räkor",
            "poolOccurence": 1
        },

        20: {
            "type": "action",
            "cardName": "Reset",
            "cardDescription": "Välj en spelare som lägger alla sina kort i botten av korthögen & tar 3 nyad",
            "action": (parsedData,affectedPlayers) => {},
            // pls note, occurence is not a weight but the actuall amount in the pool
            "poolOccurence": 1
        },
        21: {
            "type": "action",
            "cardName": "Steal Hand",
            "cardDescription": "Byt hand med en valfri spelare",
            "action": (parsedData,affectedPlayers) => {},
            // pls note, occurence is not a weight but the actuall amount in the pool
            "poolOccurence": 1
        },
        22: {
            "type": "action",
            "cardName": "Apocalyps",
            "cardDescription": "Alla lägger sina kort i botten av högen tar 3 nya kort",
            "action": (parsedData,affectedPlayers) => {},
            // pls note, occurence is not a weight but the actuall amount in the pool
            "poolOccurence": 1
        }
    },
    "recipes": {
        0: {
            "recipeName": "Pastasallad",
            "ingredients":[10,11],
            "points": 1,
            "poolOccurence": 1
        },
        1: {
            "recipeName": "Köttgryta",
            "ingredients":[18,9,4],
            "points": 2,
            "poolOccurence": 1
        },
        2: {
            "omelett": "Ägg",
            "ingredients":[0],
            "points": 1,
            "poolOccurence": 1
        },
        3: {
            "recipeName": "Glasstrut",
            "ingredients":[15,17],
            "points": 1,
            "poolOccurence": 1
        },
        4: {
            "recipeName": "Carbonara",
            "ingredients":[10,9,0],
            "points": 2,
            "poolOccurence": 1
        },
        5: {
            "recipeName": "Rä-Rä-Rä-Räksallad",
            "ingredients":[19,11],
            "points": 1,
            "poolOccurence": 1
        },
        6: {
            "recipeName": "Köttbullar & Potatismos",
            "ingredients":[16,9],
            "points": 1,
            "poolOccurence": 1
        },
        7: {
            "recipeName": "Fruktsallad",
            "ingredients":[5,4],
            "points": 1,
            "poolOccurence": 1
        }
    }
}

class Scene {
    constructor(container,errorMethod,msgMethod){
        this.container = container;
        this.errorMethod = errorMethod;
        this.msgMethod = msgMethod;
    }
    
    show() {
        this.container.style.display = "block";
    }
    
    hide() {
        this.container.style.display = "none";
    }
}

class Manager {
    constructor() {
        this.scenes = {};
        this.current;
    }
    
    register(name,scene) {
        if (Object.keys(this.scenes).includes(name)) {
            throw new Error(`A scene named ${name} already exists!`);
        }
        this.scenes[name] = scene;
    }

    unregister(name) {
        if (!Object.keys(this.scenes).includes(name)) {
            throw new Error(`A scene named ${name} dosen't exist!`);
        }
        delete this.scenes[name];
    }

    // Function to hide al scenes except the requested one,
    // saving the matched scene to a var to ensure its shown after the others are hidden.
    switch(sceneName) {
        if (!Object.keys(this.scenes).includes(sceneName)) {
            throw new Error(`A scene named ${sceneName} dosen't exist!`);
        }
        let found = null;
        for (const name of Object.keys(this.scenes)) {
            if (name == sceneName) {
                found = this.scenes[name];
                // Set current
                this.current = name;
            } else {
                this.scenes[name].hide();
            }
        }
        if (found != null) {
            found.show()
        }
    }

    sendError(error) {
        if (this.current == null || this.current == undefined) {
            throw new Error(`Can't send error, no scene set! Use .switch(<sceneName>)`);
        }
        const obj = this.scenes[this.current];
        obj.errorMethod(obj,error);
    }

    sendMsg(event,parsed) {
        if (this.current == null || this.current == undefined) {
            throw new Error(`Can't send message, no scene set! Use .switch(<sceneName>)`);
        }
        const obj = this.scenes[this.current];
        obj.msgMethod(obj,event,parsed);
    }

    resetErrors() {
        for (const obj of Objects.values(this.scenes)) {
            obj.errorMethod(obj,"");
        }
    }
}


const sceneManager = new Manager()
var serverAddress;
var reqName;
var playersList;
var sentConnect = false;
var lastMessage;
var lastData;
var socket;
var responseContainer;

// Global Vars
window.onload = () => {
    playersList = document.getElementById('players');
    responseContainer = document.getElementById('response');

    // Set default adress
    const currentURL = new URL(window.location.href);
    currentURL.protocol = 'ws:';
    currentURL.port = '3000';
    const defaultAddress = currentURL.toString();
    document.getElementById('serverAddress').value = defaultAddress;

    // Define buttons
    document.getElementById('menuDisconnectButton').addEventListener('click', sendDisconnectMessage);

    document.getElementById('gameDisconnectButton').addEventListener('click', sendDisconnectMessage);

    document.getElementById('startButton').addEventListener('click', () => {
        if (socket.readyState === WebSocket.OPEN) {
            // Send a "start" event
            const startMessage = JSON.stringify({ event: 'start' });
            socket.send(startMessage);
            sceneManager.switch("game");
        }
    });
    document.getElementById('gameStopButton').addEventListener('click', () => {
        if (socket.readyState === WebSocket.OPEN) {
            // Send a "stop" event
            const stopMessage = JSON.stringify({ event: 'stop' });
            socket.send(stopMessage);
            sceneManager.switch("menu");
        }
    });

    document.getElementById('reconnectButton').addEventListener('click', connectWebSocket);

    // Define ConnectScene
    sceneManager.register(
        "connect",
        new Scene(
            container = document.getElementById('connect-scene'),

            // OnError
            errorMethod = (_,error) => {
                document.getElementById('connect-error').innerText = error;
            },

            // OnMessage
            msgMethod = (scene,event,parsed) => {
                if (sentConnect == true) {
                    if (event.data == "connected") {
                        scene.errorMethod("Empty response from server!");
                    } else {
                        sceneManager.switch("menu");
                        updatePlayerList(parsed.data);
                    }
                } else {
                    console.log('Message from server:', parsed.data);
                }
            }
        )
    )

    // Define MenuScene
    sceneManager.register(
        "menu",
        new Scene(
            container = document.getElementById('menu-scene'),

            // OnError
            errorMethod = (_,error) => {
                document.getElementById('menu-error').innerText = error;
            },

            // OnMessage
            msgMethod = (_,event,parsed) => {
                updatePlayerList(parsed.data);
                document.getElementById('game-state').innerText = parsed.state;
            }
        )
    )

    // Define GameScene
    sceneManager.register(
        "game",
        new Scene(
            container = document.getElementById('game-scene'),

            // OnError
            errorMethod = (_,error) => {
                document.getElementById('game-error').innerText = error;
            },

            // OnMessage
            msgMethod = (scene,event,parsed) => {
                main(scene,event,parsed); // DEFINED AT BOTTOM OF FILE
            }
        )
    )

    // Default
    sceneManager.switch("connect");
}

// Function to update the player list on the menu scene
function updatePlayerList(players) {
    // Clear the existing list
    playersList.innerHTML = '';

    // Populate the list with new data
    for (const [playerId, playerData] of Object.entries(players)) {
        const listItem = document.createElement('li');
        listItem.textContent = `${playerData.name} (${playerId})`;
        playersList.appendChild(listItem);
    }
}

function connectWebSocket() {
    // Retrive values
    serverAddress = document.getElementById('serverAddress').value;
    reqName = document.getElementById('reqName').value;
    
    // Define connection
    socket = new WebSocket(serverAddress);

    // Socket.onopen
    socket.onopen = () => {
        console.log('Connected to WebSocket server');

        // Send a "connect" event with the requested-name
        const connectMessage = JSON.stringify({ event: 'connect', reqname: reqName, format: protocolformat });
        socket.send(connectMessage);
        sentConnect = true;
        console.log('Sent connect request.');
    }

    // Socket.onmessage
    socket.onmessage = (event) => {
        lastMessage = event.data;
        lastData = JSON.parse(lastMessage);
        sceneManager.sendMsg(event,lastData);
    }

    // Socket.onclose
    socket.onclose = () => {
        console.log('Disconnected from WebSocket server');
        if (sceneManager.current != "connect") {
            sceneManager.switch("connect");
        }
    };

    // Socket.onerror
    socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        sceneManager.sendError(error);
    };
}

// Disconnect Method
function sendDisconnectMessage() {
    if (socket.readyState === WebSocket.OPEN) {
        // Send a "disconnect" event
        const disconnectMessage = JSON.stringify({ event: 'disconnect' });
        socket.send(disconnectMessage);
        // Close the WebSocket connection after sending the event
        socket.close();
        sceneManager.switch("connect");
    }
}


// [Main GameClient Logic Bellow]
function main(scene,event,parsed) {
    let playerId;
    if (parsed._req.recipient) {
        playerId = parsed._req.recipient;
    } else {
        playerId = null;
    }
    // [PLACEHOLDER FOR GAME RENDERING, START]
    // Display response
    responseContainer.innerHTML = `<code class="json">${JSON.stringify(parsed,null,2)}</code>`;
    // Reinitialize highlight.js to apply syntax highlighting
    hljs.highlightElement(responseContainer.querySelector('code'));
    // [PLACEHOLDER FOR GAME RENDERING, STOP]

    // Identify player
    if (playerId !== null) {
        if (parsed.choices.length > 0) {
            showCardChoice( parsed.choices[playerId], playerId );
        }

        //Collection of data for the UI elements representing the hand(0:{"cardID":"0", "cardName":"Ägg", })
        playerHandData = [];
        playerHandUI = document.getElementsByClassName("card");
        for (let i = 0; i < 3; i++) {
            //
            UICardID = parsed.data[playerId].hand[i];
            if(UICardID == null){   
                break;
            }
            UICardName = registry.cards[parsed.data[playerId].hand[i]].cardName;
            
            //The HTML element
            UICard = playerHandUI[i].getElementsByClassName("title")[1];
            UICard.innerHTML = UICardName;

            playerHandData.push(UICardID, UICardName, UICard);
        }
        console.log(playerHandData);
    }
}

// Function to show a hidden choice and return index
function showHiddenChoice(amnt) {
    console.log(`Got hidden choice for ${amnt} cards!`);
    return 0;
}

// Function to show a visible choice and return index
function showVisibleChoice(cards) {
    console.log(`Got visible choice for ${cards}!`);
    return 0;
}

// Function to display a choice of cards
function showCardChoice(choiceObj,playerId) {
    if (choiceObj.status === "waiting") {
        let index;
        // Hidden?
        if (choiceObj.hidden == true) {
            // Is the cardAmnt correctly set for hidden choices? Or should we fallback to .cards.length?
            if (choiceObj.cardAmnt != null && choiceObj.cardAmnt != undefined) {
                index = showHiddenChoice(choiceObj.cardAmnt);
            } else {
                index = showHiddenChoice(choiceObj.cards.length);
            }
        } else {
            index = showVisibleChoice(choiceObj.cards);
        }
        // Build, Serialize and Send data.
        const data = {
            "event": "select",
            "choiceIndex": `${index}`,
            "choiceId": choiceObj.id,
            // Unused currently
            "choicePlayerId": playerId
        };
        const connectMessage = JSON.stringify(data);
        socket.send(connectMessage);
    }
}