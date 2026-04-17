# con-oo-Kaltsit-km-2 - Review

## Review 结论

代码已经做出可见的领域封装和 store adapter，但 `Game/Sudoku` 还没有成为唯一事实来源；同时固定格约束与 undo/redo 语义存在核心缺陷。按作业要求看，属于“部分接入 Svelte 流程，但设计没有真正收口”的状态。

## 总体评价

| 维度 | 评价 |
| --- | --- |
| OOP | fair |
| JS Convention | fair |
| Sudoku Business | poor |
| OOD | fair |

## 缺点

### 1. 固定格约束没有在领域层闭合

- 严重程度：core
- 位置：src/domain/index.js:33-45
- 原因：`Sudoku.guess()` 只阻止对固定格写入 1-9，却允许写入 `0/null` 清空题面 givens。数独的核心业务规则因此依赖 UI 层的 `keyboardDisabled` 兜底，而不是由领域对象自身保证。

### 2. 无效操作和笔记操作会污染 Undo/Redo 历史

- 严重程度：core
- 位置：src/domain/index.js:33-45,172-180; src/components/Controls/Keyboard.svelte:12-18
- 原因：`Game.guess()` 在真正执行前就无条件保存快照；而 `Sudoku.guess()` 对固定格写入会静默 no-op，`Keyboard.svelte` 在 notes 模式下还会调用 `userGrid.set($cursor, 0)`。静态上可推断：对固定格输入、对空格重复写 0、仅编辑候选数，都可能生成一条没有棋盘变化的历史记录，并清空 redo。

### 3. Svelte 主流程仍然以旧 `grid` store 为中心，而不是以 `Game/Sudoku` 为中心

- 严重程度：core
- 位置：src/node_modules/@sudoku/game.js:13-34; src/node_modules/@sudoku/stores/grid.js:177-187; src/components/Board/index.svelte:4,48,51
- 原因：开始新局时并不是直接创建 `Game`/`Sudoku`，而是先写入 legacy `grid` store，再由订阅副作用 `gameStore.init($grid)` 间接创建领域对象；Board 渲染时也同时依赖 `$grid` 和 `$userGrid`。这说明领域对象尚未成为单一真实来源，和“View 真正消费领域对象”的要求仍有距离。

### 4. 胜利判定在领域层之外被重复实现

- 严重程度：major
- 位置：src/node_modules/@sudoku/stores/grid.js:76-80; src/node_modules/@sudoku/stores/game.js:7-18; src/App.svelte:6,12-17
- 原因：领域层已经提供 `Sudoku.isWon()`，adapter 也已经暴露 `won`，但 `stores/game.js` 又基于 `$userGrid` 和 `$invalidCells` 重新计算一次胜利条件，`App.svelte` 消费的还是这套重复逻辑。业务规则分叉会让后续修改更容易漂移。

### 5. `toJSON()` 暴露了内部可变引用，破坏封装

- 严重程度：major
- 位置：src/domain/index.js:130-135,211-216
- 原因：`Sudoku.toJSON()` 直接返回内部 `grid/fixed` 数组，`Game.toJSON()` 也沿用这套对象。外部只要修改返回值，就能反向篡改活的领域对象状态，这不符合良好的 OOP/OOD 封装。

### 6. Undo/Redo 的响应式能力没有完整接到 UI

- 严重程度：minor
- 位置：src/node_modules/@sudoku/stores/grid.js:205-216; src/components/Controls/ActionBar/Actions.svelte:26-35
- 原因：adapter 已经提供了 `canUndo/canRedo`，但按钮禁用状态只看 `$gamePaused`，没有消费这两个状态。结果是 adapter 的一部分设计价值没有真正进入界面流程。

## 优点

### 1. 读写边界做了防御性拷贝

- 位置：src/domain/index.js:2-17
- 原因：构造函数、`getGrid()`、`getFixedGrid()` 都在做二维数组拷贝，说明作者有意识地隔离外部输入和内部状态，避免 UI 直接握住内部数组引用。

### 2. 冲突校验和完成判定被集中到了领域对象中

- 位置：src/domain/index.js:47-122
- 原因：行、列、九宫格冲突检查，以及 `isWon()` 的封装方向是对的，至少把关键数独规则放回了 `Sudoku`，没有散落在组件事件里。

### 3. 存在清晰的 Svelte adapter 层雏形

- 位置：src/node_modules/@sudoku/stores/grid.js:46-170
- 原因：`createGameStore()` 已经在尝试把 `Game` 映射成 `sudokuGrid`、`fixedGrid`、`invalidCells`、`won`、`canUndo`、`canRedo` 等可订阅状态，同时暴露 `guess/undo/redo` 命令，这个方向符合作业推荐的 store adapter 方案。

### 4. 组件事件处理整体较薄，主要通过 store 命令进入领域层

- 位置：src/components/Controls/Keyboard.svelte:10-25; src/components/Controls/ActionBar/Actions.svelte:13-19,26-32
- 原因：键盘输入、提示、撤销、重做没有直接在组件里改二维数组，而是通过 `userGrid` 适配层转发到 `Game/Sudoku`。这比把业务逻辑继续写在 `.svelte` 里要更接近正确架构。

## 补充说明

- 本次结论全部基于对 `src/domain/*`、相关 store 以及 Svelte 组件的静态阅读；按要求未运行测试，也未实际点击 UI。
- 关于“notes 会污染 undo 栈”“`loadFromJSON()`/恢复场景下旧 `grid` 与 adapter 可能失步”等判断，来自调用链静态推导，而非运行期复现。
- 审查范围已限制在领域对象及其 Svelte 接入路径，没有扩展到与本题无关的目录。
