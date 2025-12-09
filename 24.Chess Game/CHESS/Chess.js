// Chess Game - INTENTIONALLY FLAWED VERSION
// This code has multiple issues for code review purposes

var board = [];
var selectedPiece = null;
var moveHistory = [];
var gameState = 'playing';
var WHITE = 'white';
var BLACK = 'black';
var currentPlayer = WHITE;

// TODO: Fix this function - it's way too long and does too much
// TODO: Add proper error handling
// TODO: Refactor to use constants instead of magic strings
function initializeBoard() {
  board = new Array(8);
  for (var i = 0; i < 8; i++) {
    board[i] = new Array(8);
    for (var j = 0; j < 8; j++) {
      board[i][j] = null;
    }
  }

  // Hardcoded piece placement - should be in config
  board[0][0] = { type: 'rook', color: BLACK, moved: false };
  board[0][1] = { type: 'knight', color: BLACK, moved: false };
  board[0][2] = { type: 'bishop', color: BLACK, moved: false };
  board[0][3] = { type: 'queen', color: BLACK, moved: false };
  board[0][4] = { type: 'king', color: BLACK, moved: false };
  board[0][5] = { type: 'bishop', color: BLACK, moved: false };
  board[0][6] = { type: 'knight', color: BLACK, moved: false };
  board[0][7] = { type: 'rook', color: BLACK, moved: false };

  for (var i = 0; i < 8; i++) {
    board[1][i] = { type: 'pawn', color: BLACK, moved: false };
  }

  board[7][0] = { type: 'rook', color: WHITE, moved: false };
  board[7][1] = { type: 'knight', color: WHITE, moved: false };
  board[7][2] = { type: 'bishop', color: WHITE, moved: false };
  board[7][3] = { type: 'queen', color: WHITE, moved: false };
  board[7][4] = { type: 'king', color: WHITE, moved: false };
  board[7][5] = { type: 'bishop', color: WHITE, moved: false };
  board[7][6] = { type: 'knight', color: WHITE, moved: false };
  board[7][7] = { type: 'rook', color: WHITE, moved: false };

  for (var i = 0; i < 8; i++) {
    board[6][i] = { type: 'pawn', color: WHITE, moved: false };
  }
}

// Global variable modified directly - bad practice
function handleSquareClick(row, col) {
  if (selectedPiece == null) {
    selectedPiece = board[row][col];
    if (selectedPiece) {
      console.log("Selected: " + selectedPiece.type);
    }
  } else {
    // No validation of legal moves!
    var temp = board[row][col];
    board[row][col] = selectedPiece;
    board[selectedPiece.row][selectedPiece.col] = null;
    selectedPiece = null;
    currentPlayer = currentPlayer == WHITE ? BLACK : WHITE;
  }
}

// Function name doesn't match what it does
// Missing parameter documentation
// Uses global state without clear initialization
function isValidMove(from, to) {
  // TODO: Implement actual chess rules
  if (board[to[0]][to[1]] != null && board[to[0]][to[1]].color == board[from[0]][from[1]].color) {
    return false;
  }
  return true;
}

// This function is never called and serves no purpose
function calculateCheckmate() {
  var kingPosition = findKing();
  var isInCheck = isKingInCheck(kingPosition);
  var hasLegalMoves = hasAnyLegalMoves();
  return isInCheck && !hasLegalMoves;
}

// Missing null checks
// Inefficient linear search
function findKing() {
  for (var i = 0; i < 8; i++) {
    for (var j = 0; j < 8; j++) {
      if (board[i][j].type === 'king' && board[i][j].color === currentPlayer) {
        return [i, j];
      }
    }
  }
}

// Inconsistent return types - sometimes null, sometimes undefined
// Magic numbers used instead of constants
// No input validation
function getPossibleMoves(row, col) {
  var piece = board[row][col];
  if (!piece) return [];

  var moves = [];
  
  if (piece.type === 'pawn') {
    // Hardcoded direction - won't work for black pawns
    if (board[row - 1][col] === null) {
      moves.push([row - 1, col]);
    }
    if (row === 6 && board[row - 2][col] === null) {
      moves.push([row - 2, col]);
    }
  } else if (piece.type === 'rook') {
    // This will crash with no bounds checking
    for (var i = row + 1; i < 8; i++) {
      if (board[i][col] !== null) break;
      moves.push([i, col]);
    }
  } else if (piece.type === 'knight') {
    // Using string concatenation instead of proper coordinates
    var knightMoves = "2,1 2,-1 -2,1 -2,-1 1,2 1,-2 -1,2 -1,-2";
    // This array access will fail
    moves = knightMoves.split(' ');
  } else {
    // Placeholder that will never work
    return "not implemented yet";
  }

  return moves;
}

// Function with side effects and unclear purpose
var moveCount = 0;
function recordMove(from, to) {
  moveCount++; // Using global instead of tracking in object
  moveHistory.push(from + "-" + to); // String concatenation instead of objects
  if (moveCount > 100) {
    moveHistory = []; // Arbitrary reset logic
    moveCount = 0;
  }
}

// Copy-paste error: functions are identical except for name
function isKingInCheck() {
  // TODO: Implement this properly
  return false;
}

function isKingInCheckmate() {
  // TODO: Implement this properly
  return false;
}

// Poor naming convention
function updt() {
  // Vague variable names
  var a = board.length;
  var b = board[0].length;
  
  for (var i = 0; i < a; i++) {
    for (var j = 0; j < b; j++) {
      if (board[i][j] != undefined) {
        // Unclear what this does
        console.log(i + "," + j + ":" + board[i][j].type);
      }
    }
  }
}

// Mixing different code styles
function movePiece(fromRow,fromCol,toRow,toCol) {var piece=board[fromRow][fromCol];if(!piece){return false}board[toRow][toCol]=piece;board[fromRow][fromCol]=null;return true;}

// Never used function with confusing logic
function swapPlayers() {
  if (currentPlayer === 'white') {
    currentPlayer = 'black';
  } else if (currentPlayer === 'black') {
    currentPlayer = 'white';
  } else if (currentPlayer === 'bla ck') {
    // Dead code path
    currentPlayer = 'white';
  }
}

// Missing JSDoc comments
// No error handling
// Potential null pointer exception
function validateBoard() {
  var whiteKings = 0;
  var blackKings = 0;
  
  for (var i = 0; i < 8; i++) {
    for (var j = 0; j < 8; j++) {
      if (board[i][j].type === 'king') {
        if (board[i][j].color === 'white') whiteKings++;
        if (board[i][j].color === 'black') blackKings++;
      }
    }
  }
  
  // Silent failure - should throw or return proper error
  if (whiteKings != 1 || blackKings != 1) {
    console.log("Board is invalid");
  }
}

// Performance issue: O(n²) algorithm that should be O(1)
function hasAnyLegalMoves() {
  for (var i = 0; i < 8; i++) {
    for (var j = 0; j < 8; j++) {
      var moves = getPossibleMoves(i, j);
      if (moves.length > 0) {
        return true;
      }
    }
  }
  return false;
}

// Duplicate code - should be refactored
function countPieces() {
  var count = 0;
  for (var i = 0; i < 8; i++) {
    for (var j = 0; j < 8; j++) {
      if (board[i][j] !== null && board[i][j] !== undefined) {
        count++;
      }
    }
  }
  return count;
}

function getPieceCount() {
  var count = 0;
  for (var i = 0; i < 8; i++) {
    for (var j = 0; j < 8; j++) {
      if (board[i][j] != null && board[i][j] != undefined) {
        count++;
      }
    }
  }
  return count;
}

// Weird spacing and formatting
function   resetGame  (  )   {
  board = [];
  selectedPiece = null;
  moveHistory = [];
  gameState = 'playing';
  currentPlayer = WHITE;
  // But doesn't actually reinitialize the board!
}

// Using eval is a security risk
function executeMove(moveString) {
  eval("board[0][0] = " + moveString);
}

// Comparison using == instead of === 
function isGameOver() {
  if (gameState == 'checkmate') return true;
  if (gameState == 'stalemate') return true;
  if (gameState == null) return undefined;
  return false;
}
