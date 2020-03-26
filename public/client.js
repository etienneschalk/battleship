(() => {
  const chatSocket = io('/chat');
  const gameSocket = io('/game');

  const cellEvent = new Event('cellEvent');
  const Ncells = 10;

  var gameRoom = undefined;

  function byId(id) {
    return document.getElementById(id);
  }

  function init() {
    generateBoard('playerBoard');
  }

  function addMessage(message) {
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
          alert('You clicked ' + col.id);
          gameSocket.to(roomName).emit('start', roomName);
        });
        row.appendChild(col);
      }
      board.appendChild(row);
    }
    byId('app').appendChild(board);
  }

  byId('chat-form').onsubmit = e => {
    e.preventDefault(); // prevents page reloading
    chatSocket.emit('user message', byId('m').value);
    byId('m').value = '';
    return false;
  };

  chatSocket.on('user message', (msg, senderId, senderUniqueCount) => {
    addMessage("[" + senderId + " / " + senderUniqueCount + "] " + msg);
  });

  chatSocket.on('server message', (msg) => {
    addMessage("[Server Info] " + msg);
  });

  gameSocket.on('start', (roomName) => {
    gameRoom = roomName;
    console.log("Game room joined: " + gameRoom);
  });

  init();

})();
