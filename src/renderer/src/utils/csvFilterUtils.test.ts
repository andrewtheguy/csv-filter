import { filterCsvData } from './csvFilterUtils'

const mockLeftData = [
  { name: 'Alice', age: 25, city: 'NY' },
  { name: 'Bob', age: 30, city: 'LA' },
  { name: 'Charlie', age: 35, city: 'NY' },
  { name: 'Diana', age: 28, city: 'Chicago' }
]

const mockRightData = [
  { name: 'Alice', age: 25 },
  { name: 'Bob', age: 30 }
]

const mockRightDataEmpty = []

describe('filterCsvData', () => {
  it('filters data by matching column values', () => {
    const result = filterCsvData(mockLeftData, mockRightData, 'name')

    expect(result).toEqual([
      { name: 'Charlie', age: 35, city: 'NY' },
      { name: 'Diana', age: 28, city: 'Chicago' }
    ])
  })

  it('returns all left data when right data is empty', () => {
    const result = filterCsvData(mockLeftData, mockRightDataEmpty, 'name')

    expect(result).toEqual(mockLeftData)
  })

  it('returns all left data when column is empty', () => {
    const result = filterCsvData(mockLeftData, mockRightData, '')

    expect(result).toEqual(mockLeftData)
  })

  it('returns all left data when left data is empty', () => {
    const result = filterCsvData([], mockRightData, 'name')

    expect(result).toEqual([])
  })

  it('handles filtering by different columns', () => {
    const leftData = [
      { id: 1, value: 'A' },
      { id: 2, value: 'B' },
      { id: 3, value: 'A' }
    ]

    const rightData = [
      { id: 10, value: 'A' },
      { id: 20, value: 'C' }
    ]

    const result = filterCsvData(leftData, rightData, 'value')

    expect(result).toEqual([
      { id: 2, value: 'B' }
    ])
  })

  it('returns all left data when column does not exist in right data', () => {
    const result = filterCsvData(mockLeftData, mockRightData, 'nonexistent')

    expect(result).toEqual(mockLeftData)
  })

  it('handles undefined values in columns', () => {
    const leftData = [
      { name: 'Alice' },
      { name: 'Bob' },
      { name: undefined }
    ]

    const rightData = [
      { name: undefined }
    ]

    const result = filterCsvData(leftData, rightData, 'name')

    expect(result).toEqual([
      { name: 'Alice' },
      { name: 'Bob' }
    ])
  })

  it('handles null values in columns', () => {
    const leftData = [
      { name: 'Alice' },
      { name: 'Bob' },
      { name: null }
    ]

    const rightData = [
      { name: null }
    ]

    const result = filterCsvData(leftData, rightData, 'name')

    expect(result).toEqual([
      { name: 'Alice' },
      { name: 'Bob' }
    ])
  })

  it('filters correctly with empty strings', () => {
    const leftData = [
      { name: 'Alice' },
      { name: '' },
      { name: 'Bob' }
    ]

    const rightData = [
      { name: '' }
    ]

    const result = filterCsvData(leftData, rightData, 'name')

    expect(result).toEqual([
      { name: 'Alice' },
      { name: 'Bob' }
    ])
  })

  it('handles duplicate values in right data correctly', () => {
    const leftData = [
      { name: 'Alice' },
      { name: 'Bob' },
      { name: 'Alice' } // duplicate
    ]

    const rightData = [
      { name: 'Alice' },
      { name: 'Alice' } // duplicate in right should not affect
    ]

    const result = filterCsvData(leftData, rightData, 'name')

    expect(result).toEqual([
      { name: 'Bob' }
    ])
  })

  it('does not mutate original data', () => {
    const originalLeft = [...mockLeftData]
    const originalRight = [...mockRightData]

    filterCsvData(mockLeftData, mockRightData, 'name')

    expect(mockLeftData).toEqual(originalLeft)
    expect(mockRightData).toEqual(originalRight)
  })

  it('filters by numeric values', () => {
    const leftData = [
      { id: 1 },
      { id: 2 },
      { id: 3 }
    ]

    const rightData = [
      { id: 1 },
      { id: 3 }
    ]

    const result = filterCsvData(leftData, rightData, 'id')

    expect(result).toEqual([
      { id: 2 }
    ])
  })
})
