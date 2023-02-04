const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

const PORT = 3000;

app.use(express.static(__dirname + '/public'));

server.listen(PORT, () => {
    console.log(`Server listening on PORT ${PORT}`);
})

io.on('connection', socket => {
    console.log("a user connected");
    socket.on('disconnect', () => {
        console.log('user disconnected');
    });

    socket.on("send_message", function(data) {
        socket.broadcast.emit("new_message", {"message": data.message});
    });
})