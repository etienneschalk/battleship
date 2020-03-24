const app = require('express')();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const CronJob = require('cron').CronJob;

const cronjob = new CronJob('0 * * * * *', function() {
  console.log("[Cron]")
  console.log("\tusers connected:", io.engine.clientsCount);
}, null, true, 'Europe/Paris');
cronjob.start();

var uniqueCount = 0;
var availableRooms = [];

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', (socket) => {
  console.log("user " + socket.id + " connected");
  socket.uniqueCount = ++uniqueCount
  io.emit('server message', "Welcome player " + uniqueCount + "! There are " + io.engine.clientsCount + " players online.")

  if (availableRooms.length) {
    console.log(availableRooms == true)
    socket.join(availableRooms.pop());
    console.log("An available room was joined")
    // The game can be started
  }
  else {
    // Use the uniqueCount of the socket as a room reference
    socket.join(socket.uniqueCount)
    availableRooms.push(socket.uniqueCount)
    console.log(availableRooms)
    console.log("No available room ! A new one has been created")
    // Wait for a new player to join
  }
  console.log("rooms: " + JSON.stringify(io.sockets.adapter.rooms, undefined, 4))

  socket.on('chat message', msg => {
    console.log(socket.id + ' said: ' + msg);
    io.emit('chat message', msg, socket.id, socket.uniqueCount);
  })

  socket.on('disconnect', () => {
    console.log("user " + socket.id + " disconnected");
  });
});

http.listen(process.env.PORT || 3000, () => {
  let host = server.address().address
  let port = server.address().port
  console.log('App listening at http://%s:%s', host, port)
});
