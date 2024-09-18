// Undercooked Networking-Test 1 Client, written 2024-09-03.
// Protocol Format Version: 1
//
// Note: Assets registry should be an object with fields for each id-typ ("recipe","card",...) with objects with mappings.
//       it should be named registry.
//

const protocolformat = 1;

var registry = {
    "cards": {
        0: {
            
        }
    },
    "recipes": {
        0:{

        }
    },
    "actions": {
        0:{
            
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
    // [PLACEHOLDER FOR GAME RENDERING, START]
    // Display response
    responseContainer.innerHTML = `<code class="json">${JSON.stringify(parsed,null,2)}</code>`;
    // Reinitialize highlight.js to apply syntax highlighting
    hljs.highlightElement(responseContainer.querySelector('code'));
    // [PLACEHOLDER FOR GAME RENDERING, STOP]

    // Identify player
    if (parsed._req.recipient) {
        showCardChoice( parsed.choices[parsed._req.recipient], parsed._req.recipient );
    }
}

// Function to show a hidden choice and return index
function showHiddenChoice(amnt) {
    return 0;
}

// Function to show a visible choice and return index
function showShownChoice(cards) {
    return 0;
}

// Function to display a choice of cards
function showCardChoice(choiceObj,playerId) {
    if (choiceObj.status === "waiting") {
        let index;
        if (choiceObj.hidden == true) {
            if (choiceObj.cardAmnt != null && choiceObj.cardAmnt != undefined) {
                index = showHiddenChoice(choiceObj.cardAmnt);
            } else {
                index = showHiddenChoice(choiceObj.cards.length);
            }
        } else {
            index = showShownChoice(choiceObj.cards);
        }
        const data = {
            "event": "select",
            "choiceIndex": `${index}`,
            "choiceId": choiceObj.id,
            "choicePlayerId": playerId
        };
        const connectMessage = JSON.stringify(data);
        socket.send(connectMessage);
    }
}