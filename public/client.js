(() => {
  const socket = io();

  const cellEvent = new Event('cellEvent');
  const Ncells = 10;

  const RIGHT_ORIENTATION = "horizontal-right";
  const LEFT_ORIENTATION = "horizontal-left";
  const DOWN_ORIENTATION = "vertical-down";
  const UP_ORIENTATION = "vertical-up";

  let ship1 = new Ship(1, 4);
  let ship2 = new Ship(2, 3);
  let ship3 = new Ship(3, 3);
  let ship4 = new Ship(4, 2);
  let ship5 = new Ship(5, 2);
  let ship6 = new Ship(6, 2);
  let ship7 = new Ship(7, 1);
  let ship8 = new Ship(8, 1);
  let ship9 = new Ship(9, 1);
  let ship10 = new Ship(10, 1);

  const allShips = [ship1, ship2, ship3, ship4, ship5, ship6, ship7, ship8, ship9, ship10];

  let cells = [];

  var gameRoom = undefined;
  var myTurn = false;

  function byId(id) {
    return document.getElementById(id);
  }

  function init() {
    initCells();
    //console.log(cells);
    generateBoard('playerBoard');
    placeShips();

    console.log(allShips);
    byId('playerBoard').className = 'paleBlueRows';
    socket.emit('join room');
  }

   //get neighbouring cells. Returns an array
  function getCellNeighbours(cellId){
    var cellNeighbours = [];

    //up neighbour
    if(cellId - Ncells >= 0){
        cellNeighbours.push(cellId - Ncells);
    }

    // down neighbour
    if(cellId + Ncells <= (Ncells * Ncells) - 1){
        cellNeighbours.push(cellId + Ncells);
    }

    //right neighbour. last column cells have no right neighbour
    if((cellId + 1) < ((Ncells * Ncells ) - 1) && ((cellId + 1) % Ncells) != 0){
        cellNeighbours.push(cellId + 1);
    }

    //left neighbour. first column cells have no left neighbour
    if(cellId % Ncells != 0){
        cellNeighbours.push(cellId - 1);
    }

    //top left diagonal
    if((cellId - Ncells - 1) > 0 && cellId % Ncells != 0){
        cellNeighbours.push(cellId - Ncells - 1);
    }

    //bottom left diagonal
    if((cellId + Ncells - 1) < (Ncells * Ncells - 1) && cellId % Ncells != 0){
        cellNeighbours.push(cellId + Ncells - 1);
    }

    //top right diagonal
    if((cellId - Ncells + 1) > 0 && (cellId + 1) % Ncells != 0){
        cellNeighbours.push(cellId - Ncells + 1);
    }

    //bottom right diagonal
    if(cellId + Ncells + 1 < (Ncells * Ncells - 1) && (cellId + 1) % Ncells != 0){
        cellNeighbours.push(cellId + Ncells + 1);
    }

    return cellNeighbours;
  }

  function Cell(cellId, free){
    this.cellId = cellId;
    this.free = free;
    this.clicked = false;
    this.shipId = undefined;
    this.neighbours = getCellNeighbours(cellId);
    this.belowCells = Ncells - Math.floor(this.cellId/Ncells) - 1;
    this.aboveCells = Ncells - this.belowCells - 1;
    this.rightCells = Ncells - (this.cellId % Ncells) - 1;
    this.leftCells = Ncells - this.rightCells - 1;

    this.onclick = function(e){
        alert("You clicked cell " + this.cellId);
    }
  }

  function Ship(shipId, size){
    this.shipId = shipId;
    this.shipSize = size;
    this.orientation = undefined;
    this.cells = [];
  }

  function initCells(){
    for(var i = 0; i < 100; i++){
        var cell = new Cell(i, true);
        cells.push(cell);
    }
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
      row.id = "tr"+i;
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

  //the cells that the ship is to be put on
  function getShipCoveringCells(ship, cellId){
    var coveringCells = [cellId];
    if(ship.orientation == RIGHT_ORIENTATION){
        for(var i = 1; i < ship.shipSize; i++){
            coveringCells.push(cellId + i);
        }
    }
    else if(ship.orientation == LEFT_ORIENTATION){
        for(var i = 1; i < ship.shipSize; i++){
            coveringCells.push(cellId - i);
        }
    }
    else if(ship.orientation == DOWN_ORIENTATION){
        for(var i = 1; i < ship.shipSize; i++){
            coveringCells.push(cellId + (i * Ncells));
        }
    }
    else if(ship.orientation == UP_ORIENTATION){
        for(var i = 1; i < ship.shipSize; i++){
            coveringCells.push(cellId - (i * Ncells));
        }
    }

    return coveringCells;
  }

  function getPlacingOptions(cell, ship){
    var placingOptions = [];

    if(cell.rightCells + 1 >= ship.shipSize){
        var rightCells = cell.rightCells;
        var totalFreeCells = 0;
        for(var i = 1; i <= rightCells; i++){
            var nextCell = cells[cell.cellId + i];

            if(!nextCell.free){
                break;
            }
            else{
                totalFreeCells++;
            }
        }

        //consider this cell
        if(totalFreeCells + 1 >= ship.shipSize){
            placingOptions.push(RIGHT_ORIENTATION);
        }
    }

    if(cell.leftCells + 1 >= ship.shipSize){
        var leftCells = cell.leftCells;
        var totalFreeCells = 0;
        for(var i = 1; i <= leftCells; i++){
            var nextCell = cells[cell.cellId - i];
            if(!nextCell.free){
                break;
            }
            else{
                totalFreeCells++;
            }
        }

        //consider this cell
        if(totalFreeCells + 1 >= ship.shipSize){
            placingOptions.push(LEFT_ORIENTATION);
        }
    }

    if(cell.belowCells + 1 >= ship.shipSize){
        var belowCells = cell.belowCells;
        var totalFreeCells = 0;
        for(var i = 1; i <= belowCells; i++){
            var nextCell = cells[cell.cellId + (i * Ncells)];
            if(!nextCell.free){
                break;
            }
            else{
                totalFreeCells++;
            }
        }

        //consider this cell
        if(totalFreeCells + 1 >= ship.shipSize){
            placingOptions.push(DOWN_ORIENTATION);
        }
    }

    if(cell.aboveCells + 1 >= ship.shipSize){
        var aboveCells = cell.aboveCells;
        var totalFreeCells = 0;
        for(var i = 1; i <= aboveCells; i++){
            var nextCell = cells[cell.cellId - (i * Ncells)];
            if(!nextCell.free){
                break;
            }
            else{
                totalFreeCells++;
            }
        }

        //consider this cell
        if(totalFreeCells + 1 >= ship.shipSize){
            placingOptions.push(UP_ORIENTATION);
        }
    }

    return placingOptions;
  }

  //marks the cells occupied by the ship including their neighbours as not free
  function markCellsNotFree(coveringCells){
    for(var i = 0; i < coveringCells.length; i++){
        var cell = cells[coveringCells[i]];
        console.log(cell);
        cell.free = false;

        document.getElementById(cell.cellId).style.color = "red";

        var neighbours = cell.neighbours;
        console.log(neighbours);
        for(var j = 0; j < neighbours.length; j++){
            //document.getElementById(neighbours[j]).style.color = "red";
            cells[neighbours[j]].free = false;
        }
    }
  }

   function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
   }

  function placeShips(){
    for(var i = 0; i < allShips.length; i++){
        var ship = allShips[i];
        var placed = false;

        var counter = Ncells  * Ncells;
        while(!placed && counter >= 0){
            //generate random cell to place ship
            var cellId = getRandomInt(0, (Ncells*Ncells)-1);
            var cell = cells[cellId];
            if(cell.free){
                var placingOptions = getPlacingOptions(cell, ship);

                if(placingOptions.length > 0){
                    console.log(ship);
                    console.log("Placing ship size " + ship.shipSize);
                    console.log("Placing options is " + placingOptions);
                    document.getElementById(cellId).style.color = "green !important";

                    var coveringCells = [];
                    if(placingOptions.length == 1){
                        ship.orientation = placingOptions[0];
                        coveringCells.push(cellId);
                    }
                    else{
                        var j = getRandomInt(0, placingOptions.length - 1);
                        var orientation = placingOptions[j];

                        ship.orientation = orientation;
                        coveringCells = getShipCoveringCells(ship, cellId);
                    }

                    console.log("Selected orientation " + ship.orientation);
                    console.log("Covering cells is " + coveringCells);
                    ship.cells = coveringCells;
                    markCellsNotFree(coveringCells);
                    placed = true;
                }
            }

            counter--;
        }
    }
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
