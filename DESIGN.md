# 设计文档 - Homework 1.1

## 1. 领域对象设计

### Sudoku 职责
- 持有当前 9x9 棋盘状态 (`_grid`)
- 记录初始给定数字位置 (`_fixed`)，防止修改
- 提供 `guess(move)` 操作接口
- 提供 `getInvalidCells()` 冲突检测（检查行/列/宫重复）
- 提供 `isWon()` 完成判断（填满且无冲突）
- 提供 `isFixed(row, col)` 判断格子是否可修改
- 提供 `clone()` 深拷贝（支持 Undo/Redo）
- 提供 `toJSON()/toString()` 序列化（包含 grid 和 fixed）

### Game 职责
- 持有当前 `Sudoku` 实例
- 管理历史栈 (`_history`) 和重做栈 (`_redoStack`)
- 提供 `undo()` / `redo()` 操作
- 提供 `canUndo()` / `canRedo()` 状态查询
- 对外提供统一的游戏操作接口

## 2. View 如何消费领域对象

### 直接消费的是什么？
View 层**不直接**消费 `Game` 或 `Sudoku`，而是消费 **`gameStore`**（Svelte Store Adapter）以及兼容层 `userGrid`。

架构层次：

Svelte Component (userGrid, invalidCells, etc.)  
↓  
createGameStore (Adapter Layer - writable/derived)  
↓  
Game / Sudoku (Domain Layer)

### View 层拿到的数据
- `$userGrid`（即 `$gameStore.sudokuGrid`）: 当前棋盘状态（二维数组）
- `$invalidCells`: 冲突格子坐标数组（如 `["1,0", "3,2"]`）
- `$gameStore.fixedGrid`: 固定标记网格（true 表示初始给定）
- `$gameStore.won`: 是否完成（布尔值）
- `$gameStore.canUndo` / `canRedo`: 操作可用状态

### 用户操作如何进入领域对象
所有操作通过 `userGrid`（兼容层）转发：
- 输入数字 → `userGrid.set(pos, value)` → `gameStore.guess()` → `Game.guess()` → `Sudoku.guess()`
- Undo → `userGrid.undo()` → `gameStore.undo()` → `Game.undo()`
- Redo → `userGrid.redo()` → `gameStore.redo()` → `Game.redo()`
- Hint → `userGrid.applyHint(pos)` → `gameStore.applyHint()` → `Game.guess()`

## 3. 响应式机制说明

### 依赖的机制
- **`writable` store**: 内部存储 `Game` 实例
- **`derived` stores**: 从 `Game` 实例派生 UI 状态（grid, invalidCells, won 等）
- **Svelte `$` 语法糖**: 组件中使用 `$store` 自动订阅

### 为什么 UI 会更新？
使用 `update` 模式：
```javascript
function guess(pos, value) {
  update(game => {
    game.guess({row: pos.y, col: pos.x, value});  // 修改领域对象
    return game;  // 返回同一实例触发 writable 更新
  });
}
```
`writable.update()` 会通知所有订阅者，`derived` 重新计算，组件刷新。

### 如果直接 mutate 会怎样？

如果组件直接执行：
```javascript
game.getSudoku()._grid[0][0] = 5;
```

- `writable` 不会收到通知
- `derived` 不会重新计算
- UI 不会刷新

必须通过 Store 的 update/set 方法来触发 Svelte 响应式更新。

### 响应式边界
- **对 UI 可见**: `sudokuGrid`, `invalidCells`, `won`, `canUndo`, `canRedo`, `fixedGrid`
- **留在内部**: `Game._history`, `Game._redoStack`, `Sudoku._grid` 的原始引用

## 4. 相比 HW1 的改进

### 改进 1：增加校验和胜利判断
- 新增 `getInvalidCells()`: 检测行/列/宫冲突，返回冲突坐标
- 新增 `isWon()`: 判断游戏完成（填满且无冲突）
- 新增 `isFixed()`: 保护初始给定数字不被修改

### 改进 2：改进序列化设计
- **HW1**: `toJSON()` 只返回 `grid` 数组，丢失初始标记信息
- **HW1.1**: `toJSON()` 返回 `{grid, fixed}` 对象，能正确恢复初始数字位置
- 更新了测试文件 `05-serialization.test.js` 支持新格式，并验证 `getFixedGrid()` 正确恢复

### 改进 3：建立 Store Adapter 层
- **HW1**: 领域对象独立存在，未接入 Svelte 响应式系统
- **HW1.1**: 创建 `createGameStore()`，使用 `writable` + `derived` 桥接 Svelte 响应式系统
- 保留 `userGrid` 兼容接口，现有组件无需修改即可使用

### 改进 4：状态派生自动化
- **HW1**: 冲突检测在组件层计算（`invalidCells` 是单独 store）
- **HW1.1**: 冲突检测移到领域对象层（`Sudoku.getInvalidCells()`），通过 `derived` 自动派生
- 消除手动状态同步，减少 bug 可能