class Sudoku {
  constructor(grid) {
    // 防御性深拷贝，防止外部修改影响内部
    this._grid = grid.map(row => [...row]);
  }

  getGrid() {
    return this._grid.map(row => [...row]);
  }

  guess(move) {
    const { row, col, value } = move;
    
    // 边界检查
    if (row < 0 || row > 8 || col < 0 || col > 8) {
      throw new Error(`Position out of bounds: (${row}, ${col})`);
    }
    
    // 允许的值：1-9，或0/null表示清空
    if (value !== null && value !== 0 && (value < 1 || value > 9)) {
      throw new Error(`Invalid value: ${value}`);
    }
    
    // 执行操作
    this._grid[row][col] = value === null ? 0 : value;
  }

  clone() {
    return new Sudoku(this._grid);
  }

  toJSON() {
    return this._grid;
  }

  toString() {
    let result = '┌───────┬───────┬───────┐\n';
    for (let i = 0; i < 9; i++) {
      if (i === 3 || i === 6) {
        result += '├───────┼───────┼───────┤\n';
      }
      let row = '│ ';
      for (let j = 0; j < 9; j++) {
        const val = this._grid[i][j];
        row += (val === 0 ? '.' : val) + ' ';
        // 每3列加一个分隔
        if (j === 2 || j === 5) row += '│ ';
      }
      row += '│\n';
      result += row;
    }
    result += '└───────┴───────┴───────┘';
    return result;
  }
}


class Game {
  constructor({ sudoku }) {
    this._sudoku = sudoku;
    // 历史栈：存储Sudoku的快照
    this._history = [];
    // Redo栈：存储被撤销的状态
    this._redoStack = [];
  }

  getSudoku() {
    return this._sudoku;
  }

  guess(move) {
    // 1. 保存当前状态到历史
    this._history.push(this._sudoku.clone());
    
    // 2. 执行操作
    this._sudoku.guess(move);
    
    // 3. 清空redo栈
    this._redoStack = [];
  }

  undo() {
    if (!this.canUndo()) return;
    
    // 1. 保存当前状态到redo栈
    this._redoStack.push(this._sudoku.clone());
    
    // 2. 从历史恢复上一个状态
    this._sudoku = this._history.pop();
  }

  redo() {
    if (!this.canRedo()) return;
    
    // 1. 保存当前状态到历史
    this._history.push(this._sudoku.clone());
    
    // 2. 从redo栈恢复
    this._sudoku = this._redoStack.pop();
  }

  canUndo() {
    return this._history.length > 0;
  }

  canRedo() {
    return this._redoStack.length > 0;
  }

  toJSON() {
    return {
      sudoku: this._sudoku.toJSON(),
      history: this._history.map(s => s.toJSON()),
      redoStack: this._redoStack.map(s => s.toJSON())
    };
  }
}

export function createSudoku(input) {
  return new Sudoku(input);
}

export function createSudokuFromJSON(json) {
  return new Sudoku(json);
}

export function createGame({ sudoku }) {
  return new Game({ sudoku });
}


export function createGameFromJSON(json) {
  const sudoku = createSudokuFromJSON(json.sudoku);
  const game = new Game({ sudoku });
  
  // 恢复历史
  if (json.history) {
    game._history = json.history.map(h => createSudokuFromJSON(h));
  }
  if (json.redoStack) {
    game._redoStack = json.redoStack.map(h => createSudokuFromJSON(h));
  }
  
  return game;
}