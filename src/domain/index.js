class Sudoku {
  constructor(grid, fixed = null) {
    // 防御性深拷贝，防止外部修改影响内部
    this._grid = grid.map(row => [...row]);
    // 记录初始给定的数字位置（不可修改）
    // 如果是从JSON恢复，使用传入的fixed；否则根据grid计算
    this._fixed = fixed ? fixed.map(row => [...row]) : 
                  grid.map(row => row.map(val => val !== 0));
  }

  getGrid() {
    return this._grid.map(row => [...row]);
  }

  // 新增：获取固定标记网格
  getFixedGrid() {
    return this._fixed.map(row => [...row]);
  }

  // 新增：判断某个位置是否为初始给定数字
  isFixed(row, col) {
    return this._fixed[row][col];
  }

  guess(move) {
    const { row, col, value } = move;
    
    // 边界检查
    if (row < 0 || row > 8 || col < 0 || col > 8) {
      throw new Error(`Position out of bounds: (${row}, ${col})`);
    }
    
    // 新增：保护初始给定数字不被修改
    if (this._fixed[row][col] && value !== 0 && value !== null) {
      return; // 静默返回，不修改初始数字
    }

    // 允许的值：1-9，或0/null表示清空
    if (value !== null && value !== 0 && (value < 1 || value > 9)) {
      throw new Error(`Invalid value: ${value}`);
    }
    
    // 执行操作
    this._grid[row][col] = value === null ? 0 : value;
  }

  // 新增：获取所有冲突的格子坐标
  // 返回 Set，包含 "row,col" 格式的字符串
  getInvalidCells() {
    const invalid = new Set();
    
    // 检查行
    for (let r = 0; r < 9; r++) {
      const seen = new Map();
      for (let c = 0; c < 9; c++) {
        const val = this._grid[r][c];
        if (val !== 0) {
          if (seen.has(val)) {
            const [pr, pc] = seen.get(val);
            invalid.add(`${r},${c}`);
            invalid.add(`${pr},${pc}`);
          } else {
            seen.set(val, [r, c]);
          }
        }
      }
    }
    
    // 检查列
    for (let c = 0; c < 9; c++) {
      const seen = new Map();
      for (let r = 0; r < 9; r++) {
        const val = this._grid[r][c];
        if (val !== 0) {
          if (seen.has(val)) {
            const [pr, pc] = seen.get(val);
            invalid.add(`${r},${c}`);
            invalid.add(`${pr},${pc}`);
          } else {
            seen.set(val, [r, c]);
          }
        }
      }
    }
    
    // 检查3x3宫
    for (let boxR = 0; boxR < 3; boxR++) {
      for (let boxC = 0; boxC < 3; boxC++) {
        const seen = new Map();
        const startR = boxR * 3;
        const startC = boxC * 3;
        
        for (let r = startR; r < startR + 3; r++) {
          for (let c = startC; c < startC + 3; c++) {
            const val = this._grid[r][c];
            if (val !== 0) {
              if (seen.has(val)) {
                const [pr, pc] = seen.get(val);
                invalid.add(`${r},${c}`);
                invalid.add(`${pr},${pc}`);
              } else {
                seen.set(val, [r, c]);
              }
            }
          }
        }
      }
    }
    
    return invalid;
  }

  // 新增：判断是否已完成（填满且无冲突）
  isWon() {
    // 检查是否填满
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (this._grid[r][c] === 0) return false;
      }
    }
    // 检查是否有冲突
    return this.getInvalidCells().size === 0;
  }

  clone() {
    const newSudoku = new Sudoku(this._grid, this._fixed);
    return newSudoku;
  }

  toJSON() {
    return {
      grid: this._grid,
      fixed: this._fixed
    };
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
  // 防御性检查
  if (!json) {
    throw new Error('Invalid JSON: null or undefined');
  }
  
  // 旧格式：纯数组 [[...], [...]]
  if (Array.isArray(json)) {
    return new Sudoku(json);
  }
  
  // 新格式：{grid: [[...]], fixed: [[...]]}
  if (json.grid && Array.isArray(json.grid)) {
    return new Sudoku(json.grid, json.fixed);
  }
  
  throw new Error('Invalid JSON format for Sudoku');
}

export function createGame({ sudoku }) {
  return new Game({ sudoku });
}


export function createGameFromJSON(json) {
  if (!json || !json.sudoku) {
    throw new Error('Invalid JSON for Game');
  }

  const sudoku = createSudokuFromJSON(json.sudoku);
  const game = new Game({ sudoku });
  
  // 恢复历史
  if (json.history && Array.isArray(json.history)) {
    game._history = json.history.map(h => createSudokuFromJSON(h));
  }
  if (json.redoStack && Array.isArray(json.redoStack)) {
    game._redoStack = json.redoStack.map(h => createSudokuFromJSON(h));
  }
  
  return game;
}