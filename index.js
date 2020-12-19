const http =  require('http')
const WebSocket = require('ws')
const url =  require('url')

const server = http.createServer()
const wss = new WebSocket.Server({noServer : true})

let tokens = [
    {'user_id' :1 , token : '123456' , 'username' : 'mohamed'},
    {'user_id' :2 , token : '1234567' , 'username' : 'ahmed'},
    {'user_id' :3 , token : '12345678' , 'username' : 'ali'},
]

let clients = []

setInterval(pingPong , 3000)

function noop(){}

function pingPong(){
    for(let i = 0 ; i < clients.length ;i++){
        if(!clients[i].ws.isAlive){
            clients[i].ws.terminate();
            clients.splice(i , 1)
            return
        }
        console.log("ping" , clients[i].ws.isAlive)
        clients[i].ws.isAlive = false;
        clients[i].ws.ping(noop)
    }
}

wss.on('connection' , (ws) => {
    // go to database
    //check in send notification
    //ws.send(message)

    ws.on("message" , (message) => {
        message = JSON.parse(message)
        if(message.type && message.type === 'broadcast'){
            broadcast(message)
        }
        if(message.type && message.type === 'chat'){
            sendToUser(message)
        }
    })
    ws.on('pong' , () => {
        ws.isAlive = true;
        console.log("pong" , ws.isAlive)
    })
})

server.on("upgrade" , (request , socket , head) => {
    let querystring = url.parse(request.url , true).query
    let auth = authenticate(querystring)
    if(typeof auth === "boolean"){
        socket.write("invalid token");
        socket.destroy();
        return
    }
    wss.handleUpgrade(request , socket , head , (ws) => {
        ws.isAlive = true
        wss.emit('connection' , ws , request)
        clients.push({'token' :querystring.token , 'ws' : ws , 'user' : auth })
    })
})

function authenticate(querystring){
    if(!querystring.token){
        return false;
    }
    for(let i = 0 ; i < tokens.length ;i++){
        if(querystring.token == tokens[i].token){
            return tokens[i];
        }
    }
    return false;
}

function sendToUser(message){
    for(let i = 0 ; i < clients.length ;i++){
        if(message.to === clients[i].user.user_id){
            clients[i].ws.send(JSON.stringify(message));
            return
        }
    }
}

function broadcast(message){
    for(let i = 0 ; i < clients.length ;i++){
        if(message.user_id !== clients[i].user.user_id){
            clients[i].ws.send(JSON.stringify(message));
        }
    }
}

server.listen(8080)