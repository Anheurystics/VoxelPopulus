import express from 'express';
import http from 'http';
import socketio from 'socket.io';

const app = express();
const httpServer = http.createServer(app);
const io = socketio(httpServer);

app.use(express.static('client'));

io.on('connection', socket => {
    console.log('connected');
});

httpServer.listen(8080, () => {
    console.log("Listening on port 8080");
});