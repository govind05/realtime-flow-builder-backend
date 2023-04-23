import * as express from 'express';
import * as http from 'http';
import { Server } from 'socket.io';
import { constants } from './constants';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

app.get('/', (req: express.Request, res: express.Response) => {
  res.json(
    'This is the realtime flow builder backend. Use websocket to connect to this service'
  );
});

server.listen(8088, () => {
  console.log('Listening on Port: 8088');
});

const rooms: {
  [roomId: string]: {
    [socketId: string]: { id: string; name: string; mousePos: object };
  };
} = {};

io.on('connection', socket => {
  const { name, roomId } = <{ name: string; roomId: string }>(
    socket.handshake.query
  );

  // join the room and get the list of all users in that room
  socket.join(roomId);
  if (!rooms[roomId]) rooms[roomId] = {};

  io.to(socket.id).emit(
    constants.socketEvents.USER_LIST,
    Object.values(rooms[roomId])
  );

  // create a socket entry in rooms object

  rooms[roomId][socket.id] = { id: socket.id, name, mousePos: {} };

  // emit to others in the room about new user joined
  socket
    .to(roomId)
    .emit(constants.socketEvents.USER_JOINED, rooms[roomId][socket.id]);

  // emit to others in the room when this user leaves and delete entry from rooms
  socket.on('disconnect', () => {
    socket
      .to(roomId)
      .emit(constants.socketEvents.USER_LEFT, rooms[roomId][socket.id]);
    delete rooms[roomId][socket.id];
  });

  socket.on(constants.socketEvents.MOUSE_POS_UPDATE, data => {
    rooms[roomId][socket.id].mousePos = data;

    socket
      .to(roomId)
      .emit(constants.socketEvents.USER_UPDATE, rooms[roomId][socket.id]);
  });

  socket.on(constants.socketEvents.NODE_CHANGE, changes => {
    socket.to(roomId).emit(constants.socketEvents.NODE_CHANGE, changes);
  });

  socket.on(constants.socketEvents.EDGE_CHANGE, changes => {
    socket.to(roomId).emit(constants.socketEvents.EDGE_CHANGE, changes);
  });
});
