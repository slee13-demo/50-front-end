/**
 * Chess Game Engine
 * Handles board initialization, move validation, and game state management
 */

// ===== CONSTANTS =====
const BOARD_SIZE = 8;
const COLORS = {
  WHITE: 'white',
  BLACK: 'black'
};

const PIECE_TYPES = {
  PAWN: 'pawn',
  ROOK: 'rook',
  KNIGHT: 'knight',
  BISHOP: 'bishop',
  QUEEN: 'queen',
  KING: 'king'
};

const GAME_STATES = {
  PLAYING: 'playing',
  CHECK: 'check',
  CHECKMATE: 'checkmate',
  STALEMATE: 'stalemate',
  DRAW: 'draw'
};

const PIECE_CONFIG = {
  [PIECE_TYPES.PAWN]: { value: 1, initialRows: [1, 6] },
  [PIECE_TYPES.ROOK]: { value: 5, positions: [0, 7] },
  [PIECE_TYPES.KNIGHT]: { value: 3, positions: [1, 6] },
  [PIECE_TYPES.BISHOP]: { value: 3, positions: [2, 5] },
  [PIECE_TYPES.QUEEN]: { value: 9, positions: [3] },
  [PIECE_TYPES.KING]: { value: 0, positions: [4] }
};

// ===== GAME STATE =====
class ChessGame {
  constructor() {
    this.board = [];
    this.currentPlayer = COLORS.WHITE;
    this.gameState = GAME_STATES.PLAYING;
    this.moveHistory = [];
    this.selectedPiece = null;
    this.selectedPosition = null;
    this.whiteKingPosition = [7, 4];
    this.blackKingPosition = [0, 4];
    this.castlingRights = {
      [COLORS.WHITE]: { kingside: true, queenside: true },
      [COLORS.BLACK]: { kingside: true, queenside: true }
    };
  }

  /**
   * Initialize the chess board with standard starting position
   */
  initializeBoard() {
    // Create empty board
    this.board = Array(BOARD_SIZE)
      .fill(null)
      .map(() => Array(BOARD_SIZE).fill(null));

    // Place black pieces
    this.placePieces(COLORS.BLACK);
    
    // Place white pieces
    this.placePieces(COLORS.WHITE);
  }

  /**
   * Place pieces for a given color on the board
   * @param {string} color - The color of pieces to place
   */
  placePieces(color) {
    const isWhite = color === COLORS.WHITE;
    const backRow = isWhite ? 7 : 0;
    const pawnRow = isWhite ? 6 : 1;

    // Place pawns
    for (let col = 0; col < BOARD_SIZE; col++) {
      this.board[pawnRow][col] = this.createPiece(PIECE_TYPES.PAWN, color);
    }

    // Place back row pieces
    const backRowPieces = [
      PIECE_TYPES.ROOK,
      PIECE_TYPES.KNIGHT,
      PIECE_TYPES.BISHOP,
      PIECE_TYPES.QUEEN,
      PIECE_TYPES.KING,
      PIECE_TYPES.BISHOP,
      PIECE_TYPES.KNIGHT,
      PIECE_TYPES.ROOK
    ];

    for (let col = 0; col < BOARD_SIZE; col++) {
      this.board[backRow][col] = this.createPiece(backRowPieces[col], color);
    }
  }

  /**
   * Create a piece object
   * @param {string} type - The type of piece
   * @param {string} color - The color of the piece
   * @returns {Object} The piece object
   */
  createPiece(type, color) {
    return {
      type,
      color,
      hasMoved: false
    };
  }

  /**
   * Handle a square click on the board
   * @param {number} row - The row index (0-7)
   * @param {number} col - The column index (0-7)
   * @returns {boolean} Whether the action was successful
   */
  handleSquareClick(row, col) {
    // Validate coordinates
    if (!this.isValidCoordinate(row, col)) {
      console.error(`Invalid coordinates: [${row}, ${col}]`);
      return false;
    }

    // If no piece selected, try to select one
    if (!this.selectedPiece) {
      return this.selectPiece(row, col);
    }

    // Try to move the selected piece
    return this.movePiece(this.selectedPosition[0], this.selectedPosition[1], row, col);
  }

  /**
   * Select a piece on the board
   * @param {number} row - The row index
   * @param {number} col - The column index
   * @returns {boolean} Whether a piece was successfully selected
   */
  selectPiece(row, col) {
    const piece = this.board[row][col];

    if (!piece) {
      console.log('No piece at that location');
      return false;
    }

    if (piece.color !== this.currentPlayer) {
      console.log('Cannot select opponent\'s piece');
      return false;
    }

    this.selectedPiece = piece;
    this.selectedPosition = [row, col];
    console.log(`Selected: ${piece.color} ${piece.type} at [${row}, ${col}]`);
    return true;
  }

  /**
   * Deselect the current piece
   */
  deselectPiece() {
    this.selectedPiece = null;
    this.selectedPosition = null;
  }

  /**
   * Move a piece from one position to another
   * @param {number} fromRow - Source row
   * @param {number} fromCol - Source column
   * @param {number} toRow - Destination row
   * @param {number} toCol - Destination column
   * @returns {boolean} Whether the move was successful
   */
  movePiece(fromRow, fromCol, toRow, toCol) {
    // Validate coordinates
    if (!this.isValidCoordinate(fromRow, fromCol) || 
        !this.isValidCoordinate(toRow, toCol)) {
      console.error('Invalid move coordinates');
      this.deselectPiece();
      return false;
    }

    const piece = this.board[fromRow][fromCol];

    // Validate move legality
    if (!this.isLegalMove(fromRow, fromCol, toRow, toCol)) {
      console.log('Illegal move');
      this.deselectPiece();
      return false;
    }

    // Execute the move
    const capturedPiece = this.board[toRow][toCol];
    this.board[toRow][toCol] = piece;
    this.board[fromRow][fromCol] = null;
    piece.hasMoved = true;

    // Update king positions
    if (piece.type === PIECE_TYPES.KING) {
      if (piece.color === COLORS.WHITE) {
        this.whiteKingPosition = [toRow, toCol];
      } else {
        this.blackKingPosition = [toRow, toCol];
      }
    }

    // Record move
    this.recordMove(fromRow, fromCol, toRow, toCol, capturedPiece);

    // Update game state
    this.updateGameState();

    // Switch player
    this.switchPlayer();

    this.deselectPiece();
    return true;
  }

  /**
   * Check if coordinates are valid
   * @param {number} row - Row index
   * @param {number} col - Column index
   * @returns {boolean}
   */
  isValidCoordinate(row, col) {
    return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
  }

  /**
   * Check if a move is legal according to chess rules
   * @param {number} fromRow - Source row
   * @param {number} fromCol - Source column
   * @param {number} toRow - Destination row
   * @param {number} toCol - Destination column
   * @returns {boolean}
   */
  isLegalMove(fromRow, fromCol, toRow, toCol) {
    const piece = this.board[fromRow][fromCol];

    if (!piece) {
      return false;
    }

    // Cannot capture own piece
    const targetPiece = this.board[toRow][toCol];
    if (targetPiece && targetPiece.color === piece.color) {
      return false;
    }

    // Check if move is valid for piece type
    if (!this.isValidPieceMove(piece, fromRow, fromCol, toRow, toCol)) {
      return false;
    }

    // Simulate move to check if king is in check
    const originalTarget = this.board[toRow][toCol];
    this.board[toRow][toCol] = piece;
    this.board[fromRow][fromCol] = null;

    const kingPos = piece.color === COLORS.WHITE ? 
      [toRow, toCol] : this.whiteKingPosition;
    
    const isInCheck = this.isKingInCheck(piece.color);

    // Undo simulation
    this.board[fromRow][fromCol] = piece;
    this.board[toRow][toCol] = originalTarget;

    return !isInCheck;
  }

  /**
   * Check if a piece move is valid according to piece movement rules
   * @param {Object} piece - The piece
   * @param {number} fromRow - Source row
   * @param {number} fromCol - Source column
   * @param {number} toRow - Destination row
   * @param {number} toCol - Destination column
   * @returns {boolean}
   */
  isValidPieceMove(piece, fromRow, fromCol, toRow, toCol) {
    const rowDiff = Math.abs(toRow - fromRow);
    const colDiff = Math.abs(toCol - fromCol);

    switch (piece.type) {
      case PIECE_TYPES.PAWN:
        return this.isValidPawnMove(piece, fromRow, fromCol, toRow, toCol);
      
      case PIECE_TYPES.ROOK:
        return this.isValidRookMove(fromRow, fromCol, toRow, toCol);
      
      case PIECE_TYPES.KNIGHT:
        return this.isValidKnightMove(rowDiff, colDiff);
      
      case PIECE_TYPES.BISHOP:
        return this.isValidBishopMove(fromRow, fromCol, toRow, toCol);
      
      case PIECE_TYPES.QUEEN:
        return this.isValidQueenMove(fromRow, fromCol, toRow, toCol);
      
      case PIECE_TYPES.KING:
        return this.isValidKingMove(rowDiff, colDiff);
      
      default:
        return false;
    }
  }

  /**
   * Validate pawn movement
   */
  isValidPawnMove(piece, fromRow, fromCol, toRow, toCol) {
    const direction = piece.color === COLORS.WHITE ? -1 : 1;
    const startRow = piece.color === COLORS.WHITE ? 6 : 1;
    const rowDiff = toRow - fromRow;
    const colDiff = Math.abs(toCol - fromCol);

    // Forward move
    if (colDiff === 0) {
      if (rowDiff === direction && !this.board[toRow][toCol]) {
        return true;
      }
      if (rowDiff === direction * 2 && fromRow === startRow && 
          !this.board[toRow][toCol] && 
          !this.board[fromRow + direction][fromCol]) {
        return true;
      }
      return false;
    }

    // Diagonal capture
    if (colDiff === 1 && rowDiff === direction && this.board[toRow][toCol]) {
      return true;
    }

    return false;
  }

  /**
   * Validate rook movement
   */
  isValidRookMove(fromRow, fromCol, toRow, toCol) {
    if (fromRow !== toRow && fromCol !== toCol) {
      return false;
    }

    return this.isPathClear(fromRow, fromCol, toRow, toCol);
  }

  /**
   * Validate knight movement
   */
  isValidKnightMove(rowDiff, colDiff) {
    return (rowDiff === 2 && colDiff === 1) || (rowDiff === 1 && colDiff === 2);
  }

  /**
   * Validate bishop movement
   */
  isValidBishopMove(fromRow, fromCol, toRow, toCol) {
    if (Math.abs(toRow - fromRow) !== Math.abs(toCol - fromCol)) {
      return false;
    }

    return this.isPathClear(fromRow, fromCol, toRow, toCol);
  }

  /**
   * Validate queen movement
   */
  isValidQueenMove(fromRow, fromCol, toRow, toCol) {
    const rowDiff = Math.abs(toRow - fromRow);
    const colDiff = Math.abs(toCol - fromCol);

    if (fromRow === toRow || fromCol === toCol || rowDiff === colDiff) {
      return this.isPathClear(fromRow, fromCol, toRow, toCol);
    }

    return false;
  }

  /**
   * Validate king movement
   */
  isValidKingMove(rowDiff, colDiff) {
    return rowDiff <= 1 && colDiff <= 1 && (rowDiff + colDiff > 0);
  }

  /**
   * Check if path between two squares is clear
   */
  isPathClear(fromRow, fromCol, toRow, toCol) {
    const rowStep = fromRow === toRow ? 0 : (toRow > fromRow ? 1 : -1);
    const colStep = fromCol === toCol ? 0 : (toCol > fromCol ? 1 : -1);

    let row = fromRow + rowStep;
    let col = fromCol + colStep;

    while (row !== toRow || col !== toCol) {
      if (this.board[row][col]) {
        return false;
      }
      row += rowStep;
      col += colStep;
    }

    return true;
  }

  /**
   * Check if a king is in check
   * @param {string} color - The color of the king
   * @returns {boolean}
   */
  isKingInCheck(color) {
    const kingPos = color === COLORS.WHITE ? 
      this.whiteKingPosition : this.blackKingPosition;
    
    const opponentColor = color === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;

    // Check if any opponent piece can capture the king
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        const piece = this.board[row][col];
        
        if (piece && piece.color === opponentColor) {
          if (this.canPieceCaptureSquare(piece, row, col, kingPos[0], kingPos[1])) {
            return true;
          }
        }
      }
    }

    return false;
  }

  /**
   * Check if a piece can capture a specific square
   */
  canPieceCaptureSquare(piece, fromRow, fromCol, toRow, toCol) {
    const rowDiff = Math.abs(toRow - fromRow);
    const colDiff = Math.abs(toCol - fromCol);

    switch (piece.type) {
      case PIECE_TYPES.PAWN:
        const direction = piece.color === COLORS.WHITE ? -1 : 1;
        return toRow - fromRow === direction && colDiff === 1;
      
      case PIECE_TYPES.ROOK:
        return this.isValidRookMove(fromRow, fromCol, toRow, toCol);
      
      case PIECE_TYPES.KNIGHT:
        return this.isValidKnightMove(rowDiff, colDiff);
      
      case PIECE_TYPES.BISHOP:
        return this.isValidBishopMove(fromRow, fromCol, toRow, toCol);
      
      case PIECE_TYPES.QUEEN:
        return this.isValidQueenMove(fromRow, fromCol, toRow, toCol);
      
      case PIECE_TYPES.KING:
        return this.isValidKingMove(rowDiff, colDiff);
      
      default:
        return false;
    }
  }

  /**
   * Record a move in the history
   */
  recordMove(fromRow, fromCol, toRow, toCol, capturedPiece) {
    const move = {
      from: { row: fromRow, col: fromCol },
      to: { row: toRow, col: toCol },
      captured: capturedPiece,
      timestamp: new Date().getTime()
    };
    
    this.moveHistory.push(move);
  }

  /**
   * Update the game state (check, checkmate, stalemate)
   */
  updateGameState() {
    const opponentColor = this.currentPlayer === COLORS.WHITE ? 
      COLORS.BLACK : COLORS.WHITE;

    if (this.isKingInCheck(opponentColor)) {
      if (this.hasLegalMoves(opponentColor)) {
        this.gameState = GAME_STATES.CHECK;
      } else {
        this.gameState = GAME_STATES.CHECKMATE;
      }
    } else if (!this.hasLegalMoves(opponentColor)) {
      this.gameState = GAME_STATES.STALEMATE;
    } else {
      this.gameState = GAME_STATES.PLAYING;
    }
  }

  /**
   * Check if a player has any legal moves
   * @param {string} color - The color of the player
   * @returns {boolean}
   */
  hasLegalMoves(color) {
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        const piece = this.board[row][col];
        
        if (piece && piece.color === color) {
          for (let toRow = 0; toRow < BOARD_SIZE; toRow++) {
            for (let toCol = 0; toCol < BOARD_SIZE; toCol++) {
              if (this.isLegalMove(row, col, toRow, toCol)) {
                return true;
              }
            }
          }
        }
      }
    }
    
    return false;
  }

  /**
   * Get all possible moves for a piece
   * @param {number} row - Piece row
   * @param {number} col - Piece column
   * @returns {Array} Array of possible move coordinates
   */
  getPossibleMoves(row, col) {
    const piece = this.board[row][col];
    const moves = [];

    if (!piece) {
      return moves;
    }

    for (let toRow = 0; toRow < BOARD_SIZE; toRow++) {
      for (let toCol = 0; toCol < BOARD_SIZE; toCol++) {
        if (this.isLegalMove(row, col, toRow, toCol)) {
          moves.push({ row: toRow, col: toCol });
        }
      }
    }

    return moves;
  }

  /**
   * Switch to the next player
   */
  switchPlayer() {
    this.currentPlayer = this.currentPlayer === COLORS.WHITE ? 
      COLORS.BLACK : COLORS.WHITE;
  }

  /**
   * Reset the game
   */
  resetGame() {
    this.board = [];
    this.currentPlayer = COLORS.WHITE;
    this.gameState = GAME_STATES.PLAYING;
    this.moveHistory = [];
    this.selectedPiece = null;
    this.selectedPosition = null;
    this.whiteKingPosition = [7, 4];
    this.blackKingPosition = [0, 4];
    this.castlingRights = {
      [COLORS.WHITE]: { kingside: true, queenside: true },
      [COLORS.BLACK]: { kingside: true, queenside: true }
    };
    
    this.initializeBoard();
  }

  /**
   * Get the current game state
   * @returns {string}
   */
  getGameState() {
    return this.gameState;
  }

  /**
   * Get the move history
   * @returns {Array}
   */
  getMoveHistory() {
    return this.moveHistory;
  }

  /**
   * Undo the last move
   * @returns {boolean}
   */
  undoLastMove() {
    if (this.moveHistory.length === 0) {
      return false;
    }

    const move = this.moveHistory.pop();
    const piece = this.board[move.to.row][move.to.col];

    if (!piece) {
      console.error('Invalid board state for undo');
      return false;
    }

    // Restore the piece
    this.board[move.from.row][move.from.col] = piece;
    this.board[move.to.row][move.to.col] = move.captured || null;
    piece.hasMoved = false;

    // Restore king positions
    if (piece.type === PIECE_TYPES.KING) {
      if (piece.color === COLORS.WHITE) {
        this.whiteKingPosition = [move.from.row, move.from.col];
      } else {
        this.blackKingPosition = [move.from.row, move.from.col];
      }
    }

    // Switch back to previous player
    this.switchPlayer();

    return true;
  }
}

// Export for use in other files (Node.js/ES6 modules)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ChessGame;
}
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
