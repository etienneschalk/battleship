const path = require('path')
const express = require('express');
const app = express();
const http = require('http').createServer(app);

const io = require('socket.io')(http);
const CronJob = require('cron').CronJob;

const cronjob = new CronJob('* 0 * * * *', function() {
  console.log("[Cron]")
  console.log("\tusers connected:", io.engine.clientsCount);
}, null, true, 'Europe/Paris');
cronjob.start();

const chatio = io.of('/chat');
const gameio = io.of('/game');

var uniqueCount = 0;
var availableRooms = [];

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

chatio.on('connection', socket => {
  console.log("user " + socket.id + " connected");

  chatio.emit('server message', "Welcome player " + uniqueCount + "! There are " + io.engine.clientsCount + " players online.")

  socket.on('user message', msg => {
    console.log(socket.id + ' said: ' + msg);
    chatio.emit('user message', msg, socket.id, socket.uniqueCount);
  })

  socket.on('disconnect', () => {
    console.log("user " + socket.id + " disconnected");
  });
});

gameio.on('connection', socket => {
  console.log("user " + socket.id + " connected");
  socket.uniqueCount = ++uniqueCount;
  gameRoom = undefined;
  socket.state = 'created';
  joinOrCreateRoom();

  function joinOrCreateRoom() {
    if (availableRooms.length) {
      roomName = availableRooms.pop();
      socket.join(roomName);
      gameRoom = roomName;
      console.log("An available room ( " + roomName + " ) was joined");
      // The game can be started
      gameio.to(roomName).emit('start', roomName);
      // The game started
      socket.state = 'gameStarted'
    }
    else {
      // Use the uniqueCount of the socket as a room reference

      console.log("rooms: " + JSON.stringify(io.sockets.adapter.rooms, undefined, 4));
      socket.join(socket.uniqueCount);
      availableRooms.push(socket.uniqueCount);
      gameRoom = socket.uniqueCount;
      console.log(availableRooms);
      console.log("----");
      console.log("No available room ! A new one has been created");
      // Wait for a new player to join
      socket.state = 'waiting'
    }
    console.log("rooms: " + JSON.stringify(io.sockets.adapter.rooms, undefined, 4));
  }

  socket.on('disconnect', () => {
    // Clear game room
    console.log("Player disconnects")
    gameio.in(gameRoom).clients((error, socketIds) => {
      if (error) throw error;

      let playerStillOnline = undefined;

      socketIds.forEach(socketId => {
        console.log("FOREACH");
        io.sockets.sockets[socketId].leave(gameRoom);
        if (socketId != socket.id) { // The other player must find a new room
          playerStillOnline = socketId;
        }
      });

      if (playerStillOnline) {
        console.log("Other player rejoin");
        console.log(availableRooms);
        joinOrCreateRoom();
      }
    });
  });
});

const server = http.listen(process.env.PORT || 3000, () => {
  let host = server.address().address
  let port = server.address().port
  console.log('App listening at http://%s:%s', host, port)
});
