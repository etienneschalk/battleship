const path = require('path')
const express = require('express');
const app = express();
const http = require('http').createServer(app);

const io = require('socket.io')(http);
const CronJob = require('cron').CronJob;

const cronjob = new CronJob('* * 0 * * *', function() {
  console.log("[Cron]")
  console.log("\tusers connected:", io.engine.clientsCount);
}, null, true, 'Europe/Paris');
cronjob.start();

var uniqueCount = 0;
var availableRooms = [];

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', socket => {
  console.log("user " + socket.id + " connected");
  io.emit('server message', "Welcome player " + uniqueCount + "! There are " + io.engine.clientsCount + " players online.");

  socket.uniqueCount = ++uniqueCount;
  socket.gameRoom = undefined;
  socket.state = 'created';

  function joinOrCreateRoom() {
    if (availableRooms.length) {
      roomName = availableRooms.shift(); // FIFO
      socket.join(roomName);
      socket.gameRoom = roomName;
      console.log("An available room ( " + roomName + " ) was joined");
      // The game can be started
      io.to(roomName).emit('server message', "You joined room #" + roomName);
      io.to(roomName).emit('start game', roomName);
      // The game started
      // socket.state = 'inGame'
      io.in(roomName).clients((error, socketIds) => {
        if (error) throw error;
        socketIds.forEach(socketId => {
          io.sockets.sockets[socketId].state = 'inGame'
        });
      });

      io.sockets.adapter.rooms[roomName].gameState = {};
      s = io.sockets.adapter.rooms[roomName].gameState;
      let socketIds = Object.keys(io.sockets.adapter.rooms[roomName].sockets);
      console.log(socketIds);
      initialRandomPlayer = getRandomInt(2);
      s.socketTurn = socketIds[initialRandomPlayer];
      s.socketNotTurn = socketIds[(initialRandomPlayer + 1) % 2];
      io.to(s.socketTurn).emit('your turn');
      io.to(s.socketNotTurn).emit('wait your turn');
      console.log([s.turn, s.socketTurn, s.socketNotTurn]);
      s.turn = 1;
    }
    else {
      // Use the uniqueCount of the socket as a room reference

      console.log(availableRooms);
      console.log("rooms: " + JSON.stringify(io.sockets.adapter.rooms, undefined, 4));
      newRoomName = '_game_' + Math.random().toString(36).substr(2);
      socket.join(newRoomName);
      availableRooms.push(newRoomName);
      socket.gameRoom = newRoomName;
      console.log(availableRooms);
      console.log("----");
      console.log("No available room ! A new one has been created");
      io.to(newRoomName).emit('server message', "No available room ! A new one has been created: #" + newRoomName);
      // Wait for a new player to join
      socket.state = 'waiting';
    }
    console.log(availableRooms);
    console.log("rooms: " + JSON.stringify(io.sockets.adapter.rooms, undefined, 4));
  }

  socket.on('join room', () => {
    joinOrCreateRoom();
  });

  socket.on('cell clicked', (colId) => {
    if (socket.state == 'inGame') {
      let roomName = socket.gameRoom;
      s = io.sockets.adapter.rooms[roomName].gameState;
      if (s.socketTurn == socket.id) {
        // Send messages
        console.log(socket.id + " clicked on col with id: " + colId);
        socket
          .emit('game message', "You clicked on " + colId);
        socket
          .in(socket.gameRoom)
          .emit('game message', "Opponent clicked on " + colId);

        // Next turn
        let socketIds = Object.keys(io.sockets.adapter.rooms[roomName].sockets);
        console.log(socketIds);
        s.socketTurn = s.socketNotTurn
        s.socketNotTurn = socket.id;
        s.turn += 1;
        io.to(s.socketTurn).emit('your turn');
        io.to(s.socketNotTurn).emit('wait your turn');
      }
    }
  });

  socket.on('user message', msg => {
    console.log(socket.id + ' said: ' + msg);
    io.emit('user message', msg, socket.id, socket.uniqueCount);
  })

  socket.on('disconnect', () => {
    console.log("user " + socket.id + " disconnected");
    // Clear game room
    console.log("Player disconnects")
    io.in(socket.gameRoom).clients((error, socketIds) => {
      if (error) throw error;

      let playerStillOnline = undefined;

      socketIds.forEach(socketId => {
        console.log("FOREACH in gameRoom " + socket.gameRoom);
        console.log("socketId: " + socketId)
        io.sockets.sockets[socketId].leave(socket.gameRoom);
        if (socketId != socket.id) { // The other player must find a new room
          playerStillOnline = socketId; // works only for 2-players game, otherwise it should be a list
        }
      });

      // Remove from available room list
      console.log("<<<<<<<");
      console.log(availableRooms);
      console.log("======= socket.gameRoom: " + socket.gameRoom);
      if (availableRooms.includes(socket.gameRoom)) {
        availableRooms.splice(availableRooms.indexOf(socket.gameRoom), 1);
      }
      console.log(availableRooms);
      console.log(">>>>>>>");

      if (playerStillOnline) {
        console.log("Other player rejoin");
        console.log(availableRooms);
        io.sockets.sockets[playerStillOnline].state = 'waiting';
        io.sockets.sockets[playerStillOnline].emit('opponent left game');
      }
    });
  });
});

const server = http.listen(process.env.PORT || 3000, () => {
  let host = server.address().address
  let port = server.address().port
  console.log('App listening at http://%s:%s', host, port)
});

function getRandomInt(max) {
  return Math.floor(Math.random() * Math.floor(max));
}
