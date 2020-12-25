const http = require('http')
const WebSocket = require('ws')
const url = require('url')

const server = http.createServer()
const wss = new WebSocket.Server({noServer: true})

let tokens = [
    {'user_id': 1, token: '123456', 'username': 'mohamed'},
    {'user_id': 2, token: '1234567', 'username': 'ahmed'},
    {'user_id': 3, token: '12345678', 'username': 'ali'},
]

let clients = []

setInterval(pingPong, 3000)

function noop() {
}

function pingPong() {
    for (let i = 0; i < clients.length; i++) {
        if (!clients[i].ws.isAlive) {
            clients[i].ws.terminate();
            clients.splice(i, 1)
            broadcastToAll(onlineClients())
            return
        }
        console.log("ping", clients[i].ws.isAlive)
        clients[i].ws.isAlive = false;
        clients[i].ws.ping(noop)
    }
}

wss.on('connection', (ws) => {
    broadcastToAll(onlineClients())
    ws.on("message", (message) => {
        message = JSON.parse(message)
        if (message.type && message.type === 'broadcast') {
            broadcast(message)
        }
        if (message.type && message.type === 'chat') {
            sendToUser(message)
        }
    })
    ws.on('pong', () => {
        ws.isAlive = true;
        console.log("pong", ws.isAlive)
    })
})

function onlineClients() {
    let online = {
        type: "who_is_online",
        clients: []
    }
    for (let i = 0; i < clients.length; i++) {
        online.clients.push({
            username: clients[i].user.username,
            user_id: clients[i].user.user_id
        })
    }
    return online
}

server.on("upgrade", (request, socket, head) => {
    let querystring = url.parse(request.url, true).query
    let auth = authenticate(querystring)
    if (typeof auth === "boolean") {
        socket.write("invalid token");
        socket.destroy();
        return
    }
    wss.handleUpgrade(request, socket, head, (ws) => {
        ws.isAlive = true
        clients.push({'token': querystring.token, 'ws': ws, 'user': auth})
        wss.emit('connection', ws, request)
        ws.send(JSON.stringify({
            type: 'user_data',
            user: auth
        }))
    })
})

function authenticate(querystring) {
    if (!querystring.token) {
        return false;
    }
    for (let i = 0; i < tokens.length; i++) {
        if (querystring.token == tokens[i].token) {
            return tokens[i];
        }
    }
    return false;
}

function sendToUser(message) {
    for (let i = 0; i < clients.length; i++) {
        if (message.to === clients[i].user.user_id) {
            clients[i].ws.send(JSON.stringify(message));
            return
        }
    }
}

function broadcastToAll(message) {
    for (let i = 0; i < clients.length; i++) {
        clients[i].ws.send(JSON.stringify(message));
    }
}

function broadcast(message) {
    for (let i = 0; i < clients.length; i++) {
        if (message.user_id !== clients[i].user.user_id) {
            clients[i].ws.send(JSON.stringify(message));
        }
    }
}

server.listen(8080)