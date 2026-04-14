import { describe, expect, it } from 'vitest'
import { loadDomainApi, makePuzzle } from './helpers/domain-api.js'

describe('HW1 serialization / deserialization', () => {
  it('supports sudoku round-trip serialization', async () => {
    const { createSudoku, createSudokuFromJSON } = await loadDomainApi()

    const sudoku = createSudoku(makePuzzle())
    sudoku.guess({ row: 0, col: 2, value: 4 })

    const json = sudoku.toJSON()
    const restored = createSudokuFromJSON(
      JSON.parse(JSON.stringify(json)),
    )

    // 验证网格数据正确
    expect(restored.getGrid()).toEqual(sudoku.getGrid())
    // 验证 fixed 标记也正确恢复（新增检查）
    expect(restored.getFixedGrid()).toEqual(sudoku.getFixedGrid())
    expect(typeof restored.toString()).toBe('string')
  })

  it('supports game round-trip serialization for the current board state', async () => {
    const { createGame, createGameFromJSON, createSudoku } = await loadDomainApi()

    const game = createGame({ sudoku: createSudoku(makePuzzle()) })
    game.guess({ row: 0, col: 2, value: 4 })
    game.guess({ row: 1, col: 1, value: 7 })

    const json = game.toJSON()
    const restored = createGameFromJSON(
      JSON.parse(JSON.stringify(json)),
    )

    expect(restored.getSudoku().getGrid()).toEqual(game.getSudoku().getGrid())
    // 验证 fixed 标记也正确恢复（新增检查）
    expect(restored.getSudoku().getFixedGrid()).toEqual(game.getSudoku().getFixedGrid())
  })
})