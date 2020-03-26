(() => {
  const socket = io();

  const cellEvent = new Event('cellEvent');
  const Ncells = 10;

  var gameRoom = undefined;
  var myTurn = false;

  function byId(id) {
    return document.getElementById(id);
  }

  function init() {
    generateBoard('playerBoard');
    byId('playerBoard').className = 'paleBlueRows';
    socket.emit('join room');
  }

  function addMessage(message) {
    // TODO If too many messages (ex: > 30), delete the last one before adding
    let li = document.createElement('li');
    li.textContent = message;
    byId('messages').insertBefore(li, byId('messages').firstChild)
  }

  function generateBoard(boardId) {
    let board = document.createElement('table');
    board.id = boardId;
    for (let i = 0 ; i < Ncells ; ++i) {
      let row = document.createElement('tr');
      row.id = i;
      for (let j = 0 ; j < Ncells ; ++j) {
        let col = document.createElement('td');
        col.id = j + Ncells * i
        col.textContent = col.id
        col.addEventListener('click', event => {
          alert('You clicked ' + col.id + ' and gameRoom is ' + gameRoom);
          if (gameRoom && myTurn) {
            socket.emit('cell clicked', col.id);
          }
        });
        row.appendChild(col);
      }
      board.appendChild(row);
    }
    byId('playerZone').appendChild(board);
  }

  byId('chat-form').onsubmit = e => {
    e.preventDefault(); // prevents page reloading
    socket.emit('user message', byId('m').value);
    byId('m').value = '';
    return false;
  };

  socket.on('user message', (msg, senderId, senderUniqueCount) => {
    addMessage("[" + senderId + " / " + senderUniqueCount + "] " + msg);
  });

  socket.on('server message', (msg) => {
    addMessage("[Server Info] " + msg);
  });

  socket.on('game message', (msg) => {
    addMessage("<Game> " + msg);
  });

  socket.on('start game', (roomName) => {
    gameRoom = roomName;
    console.log("Game room joined: " + gameRoom);
    addMessage("<Game> " + "Game started!");
  });

  socket.on('your turn', () => {
    addMessage("<Game> " + "This is your turn!");
    myTurn = true;
  });

  socket.on('wait your turn', () => {
    addMessage("<Game> " + "Waiting for the opponent to play...");
    myTurn = false;
  });

  socket.on('opponent left game', () => {
    addMessage("[Game Info] Opponent left game ! Trying to rejoin a room...");
    socket.emit('join room');
  });

  init();

})();
