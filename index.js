import express from 'express';
import http from 'http';
import socketio from 'socket.io';

const app = express();
const httpServer = http.createServer(app);
const io = socketio(httpServer);

app.use(express.static('client'));

let blocks = [{x: 0, y: 0, z: 0, r: 1.0, g: 0.2, b: 0.2}];
io.on('connection', socket => {
    console.log('connected');

    socket.emit('init_blocks', blocks);

    socket.on('spawn_block', block => {
        const id = blocks.push(block);
        block.id = id;
        io.emit('spawned_block', block);
    });

    socket.on('delete_block', id => {
        for(let i = 0; i < blocks.length; i++) {
            if(blocks[i].id === id) {
                blocks.splice(i, 1);
                break;
            }
        }
        io.emit('deleted_block', id);
    });
});

const port = process.env.PORT || 8080;
httpServer.listen(port, () => {
    console.log("Listening on port 8080");
});