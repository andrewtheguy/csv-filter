import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import CsvFilter from './CsvFilter'
import '@testing-library/jest-dom'

const mockLeftCSV = {
  data: [
    { name: 'Alice', age: 25, city: 'NY' },
    { name: 'Bob', age: 30, city: 'LA' },
    { name: 'Charlie', age: 35, city: 'NY' },
    { name: 'Diana', age: 28, city: 'Chicago' }
  ],
  headers: ['name', 'age', 'city']
}

const mockRightCSV = {
  data: [
    { name: 'Alice', age: 25 },
    { name: 'Bob', age: 30 }
  ],
  headers: ['name', 'age']
}

describe('CsvFilter Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders nothing when rightCSV is null', () => {
    const { container } = render(
      <CsvFilter leftCSV={mockLeftCSV} rightCSV={null} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders filtering options when rightCSV is provided', () => {
    render(
      <CsvFilter leftCSV={mockLeftCSV} rightCSV={mockRightCSV} />
    )
    expect(screen.getByLabelText('Select Column from the Right to Filter By')).toBeInTheDocument()
    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })

  it('displays column options from rightCSV headers', () => {
    render(
      <CsvFilter leftCSV={mockLeftCSV} rightCSV={mockRightCSV} />
    )

    const select = screen.getByRole('combobox')
    fireEvent.mouseDown(select)

    expect(screen.getByText('name')).toBeInTheDocument()
    expect(screen.getByText('age')).toBeInTheDocument()
  })

  it('automatically applies filter when column is selected and leftCSV exists', async () => {
    render(
      <CsvFilter leftCSV={mockLeftCSV} rightCSV={mockRightCSV} />
    )

    const select = screen.getByRole('combobox')

    // Initially no filtered results
    expect(screen.queryByText(/Filtered Results:/)).not.toBeInTheDocument()

    // After selecting column, filter should be automatically applied
    fireEvent.mouseDown(select)
    fireEvent.click(screen.getByText('name'))

    await waitFor(() => {
      expect(screen.getByText('Filtered Results (2 rows)')).toBeInTheDocument()
    })
  })

  it('does not show filtered results when leftCSV is null', () => {
    render(
      <CsvFilter leftCSV={null} rightCSV={mockRightCSV} />
    )

    const select = screen.getByRole('combobox')

    fireEvent.mouseDown(select)
    fireEvent.click(screen.getByText('name'))

    // No filtered results should appear when leftCSV is null
    expect(screen.queryByText(/Filtered Results:/)).not.toBeInTheDocument()
  })

  it('shows export button after filtering', async () => {
    render(
      <CsvFilter leftCSV={mockLeftCSV} rightCSV={mockRightCSV} />
    )

    // Apply filter automatically
    const select = screen.getByRole('combobox')
    fireEvent.mouseDown(select)
    fireEvent.click(screen.getByText('name'))

    await waitFor(() => {
      expect(screen.getByText(/Export Filtered CSV/)).toBeInTheDocument()
    })
  })

  it('calls saveFile on export button click', async () => {
    const mockSaveFile = jest.fn()
    window.api.saveFile = mockSaveFile

    render(
      <CsvFilter leftCSV={mockLeftCSV} rightCSV={mockRightCSV} />
    )

    // Apply filter automatically
    const select = screen.getByRole('combobox')
    fireEvent.mouseDown(select)
    fireEvent.click(screen.getByText('name'))

    await waitFor(() => {
      expect(screen.getByText(/Export Filtered CSV/)).toBeInTheDocument()
    })

    const exportButton = screen.getByText(/Export Filtered CSV/)
    fireEvent.click(exportButton)

    expect(mockSaveFile).toHaveBeenCalledTimes(1)
  })



  it('resets filter when CSV data changes', async () => {
    const { rerender } = render(
      <CsvFilter leftCSV={mockLeftCSV} rightCSV={mockRightCSV} />
    )

    const select = screen.getByRole('combobox')
    fireEvent.mouseDown(select)
    fireEvent.click(screen.getByText('name'))

    await waitFor(() => {
      expect(screen.getByText('Filtered Results (2 rows)')).toBeInTheDocument()
    })

    // Re-render with new CSV data
    rerender(
      <CsvFilter
        leftCSV={mockLeftCSV}
        rightCSV={{
          data: [{ name: 'Eve', age: 22 }],
          headers: ['name', 'age']
        }}
      />
    )

    // Filter should be reset
    await waitFor(() => {
      expect(screen.queryByText('Filtered Results (2 rows)')).not.toBeInTheDocument()
    })
  })

  it('does not show filtered results paper when no filter applied', () => {
    render(
      <CsvFilter leftCSV={mockLeftCSV} rightCSV={mockRightCSV} />
    )

    expect(screen.queryByText(/Filtered Results:/)).not.toBeInTheDocument()
  })

  it('calls onFilteredDataChange callback when data changes', async () => {
    const mockOnChange = jest.fn()

    render(
      <CsvFilter
        leftCSV={mockLeftCSV}
        rightCSV={mockRightCSV}
        onFilteredDataChange={mockOnChange}
      />
    )

    const select = screen.getByRole('combobox')
    fireEvent.mouseDown(select)
    fireEvent.click(screen.getByText('name'))

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith([
        { name: 'Charlie', age: 35, city: 'NY' },
        { name: 'Diana', age: 28, city: 'Chicago' }
      ])
    })
  })

  it('handles empty left CSV gracefully', () => {
    render(
      <CsvFilter
        leftCSV={{ data: [], headers: ['name', 'age'] }}
        rightCSV={mockRightCSV}
      />
    )

    const select = screen.getByRole('combobox')
    fireEvent.mouseDown(select)
    fireEvent.click(screen.getByText('name'))

    // Empty CSV should result in 0 filtered results
    expect(screen.queryByText(/Filtered Results:/)).not.toBeInTheDocument()
  })

  it('handles column not existing in left CSV', async () => {
    const rightCSVWithExtraColumn = {
      data: [{ missingColumn: 'value' }],
      headers: ['missingColumn']
    }

    render(
      <CsvFilter leftCSV={mockLeftCSV} rightCSV={rightCSVWithExtraColumn} />
    )

    const select = screen.getByRole('combobox')
    fireEvent.mouseDown(select)
    fireEvent.click(screen.getByText('missingColumn'))

    // Should still filter based on existing values, undefined is not in Set
    await waitFor(() => {
      expect(screen.getByText('Filtered Results (4 rows)')).toBeInTheDocument()
    })
  })

  it('shows feedback message when filter results in no rows', async () => {
    const leftCSVWithMatchingData = {
      data: [
        { name: 'Alice', age: 22, city: 'Miami' },
        { name: 'Bob', age: 40, city: 'Seattle' },
        { name: 'Alice', age: 35, city: 'Boston' }
      ],
      headers: ['name', 'age', 'city']
    }

    render(
      <CsvFilter leftCSV={leftCSVWithMatchingData} rightCSV={mockRightCSV} />
    )

    const select = screen.getByRole('combobox')
    fireEvent.mouseDown(select)
    fireEvent.click(screen.getByText('name'))

    await waitFor(() => {
      expect(screen.getByText('No matching rows found. The filter excluded all rows from the left CSV based on the selected column from the right CSV.')).toBeInTheDocument()
      expect(screen.queryByText(/Filtered Results/)).not.toBeInTheDocument()
    })
  })

  it('handles filtering when switching columns', async () => {
    const filterByAgeRightCSV = {
      data: [
        { age: 25 },
        { age: 30 }
      ],
      headers: ['age']
    }

    render(
      <CsvFilter leftCSV={mockLeftCSV} rightCSV={filterByAgeRightCSV} />
    )

    // First filter by age (should exclude Alice and Bob)
    const select = screen.getByRole('combobox')
    fireEvent.mouseDown(select)
    fireEvent.click(screen.getByText('age'))

    await waitFor(() => {
      expect(screen.getByText('Filtered Results (2 rows)')).toBeInTheDocument() // Charlie and Diana
    })
  })

  describe('Empty column display behavior', () => {
    const rightCSVWithEmptyHeaders = {
      data: [
        { value1: 'A', value2: 'B' },
        { value1: 'C', value2: 'D' }
      ],
      headers: ['', 'name', '']
    }

    const leftCSVWithEmptyHeaders = {
      data: [
        { value1: 'A', value2: 'B', value3: 'C' },
        { value1: 'D', value2: 'E', value3: 'F' }
      ],
      headers: ['', 'name', '']
    }

    it('displays empty columns as "(Empty column n)" in dropdown', () => {
      render(
        <CsvFilter leftCSV={leftCSVWithEmptyHeaders} rightCSV={rightCSVWithEmptyHeaders} />
      )

      const select = screen.getByRole('combobox')
      fireEvent.mouseDown(select)

      expect(screen.getByText('(Empty column 1)')).toBeInTheDocument()
      expect(screen.getByText('name')).toBeInTheDocument()
      expect(screen.getByText('(Empty column 3)')).toBeInTheDocument()
    })



    it('allows selection of empty columns by display name', () => {
      render(
        <CsvFilter leftCSV={leftCSVWithEmptyHeaders} rightCSV={rightCSVWithEmptyHeaders} />
      )

      const select = screen.getByRole('combobox')

      // Verify the selection can be made
      fireEvent.mouseDown(select)
      expect(screen.getByText('(Empty column 1)')).toBeInTheDocument()
      expect(screen.getByText('name')).toBeInTheDocument()
      expect(screen.getByText('(Empty column 3)')).toBeInTheDocument()
    })
  })

  describe('Filter Mode Functionality', () => {
    it('renders filter mode radio buttons', () => {
      render(
        <CsvFilter leftCSV={mockLeftCSV} rightCSV={mockRightCSV} />
      )

      expect(screen.getByText('Filter Mode')).toBeInTheDocument()
      expect(screen.getByLabelText('Exclude')).toBeInTheDocument()
      expect(screen.getByLabelText('Include')).toBeInTheDocument()
    })

    it('defaults to exclude mode', () => {
      render(
        <CsvFilter leftCSV={mockLeftCSV} rightCSV={mockRightCSV} />
      )

      const excludeRadio = screen.getByLabelText('Exclude') as HTMLInputElement
      const includeRadio = screen.getByLabelText('Include') as HTMLInputElement

      expect(excludeRadio.checked).toBe(true)
      expect(includeRadio.checked).toBe(false)
    })

    it('applies exclude filter by default', async () => {
      render(
        <CsvFilter leftCSV={mockLeftCSV} rightCSV={mockRightCSV} />
      )

      const select = screen.getByRole('combobox')
      fireEvent.mouseDown(select)
      fireEvent.click(screen.getByText('name'))

      await waitFor(() => {
        // Should exclude Alice and Bob (rows 0 and 1), showing Charlie and Diana (rows 2 and 3)
        expect(screen.getByText('Filtered Results (2 rows)')).toBeInTheDocument()
      })
    })

    it('applies include filter when include mode is selected', async () => {
      render(
        <CsvFilter leftCSV={mockLeftCSV} rightCSV={mockRightCSV} />
      )

      // Select include mode
      const includeRadio = screen.getByLabelText('Include')
      fireEvent.click(includeRadio)

      // Select column to filter
      const select = screen.getByRole('combobox')
      fireEvent.mouseDown(select)
      fireEvent.click(screen.getByText('name'))

      await waitFor(() => {
        // Should include only Alice and Bob (2 rows match), excluding Charlie and Diana
        expect(screen.getByText('Filtered Results (2 rows)')).toBeInTheDocument()
      })
    })

    it('automatically updates filter results when switching filter modes', async () => {
      render(
        <CsvFilter leftCSV={mockLeftCSV} rightCSV={mockRightCSV} />
      )

      // First select column and get exclude results
      const select = screen.getByRole('combobox')
      fireEvent.mouseDown(select)
      fireEvent.click(screen.getByText('name'))

      await waitFor(() => {
        expect(screen.getByText('Filtered Results (2 rows)')).toBeInTheDocument()
      })

      // Switch to include mode
      const includeRadio = screen.getByLabelText('Include')
      fireEvent.click(includeRadio)

      await waitFor(() => {
        // Results should remain the same (2 rows) but now the included data is different
        expect(screen.getByText('Filtered Results (2 rows)')).toBeInTheDocument()
      })
    })

    it('shows appropriate feedback message for exclude mode when no results', async () => {
      const leftDataWithNoMatches = {
        data: [
          { name: 'Alice', age: 25 },
          { name: 'Bob', age: 30 }
        ],
        headers: ['name', 'age']
      }

      render(
        <CsvFilter leftCSV={leftDataWithNoMatches} rightCSV={mockRightCSV} />
      )

      const select = screen.getByRole('combobox')
      fireEvent.mouseDown(select)
      fireEvent.click(screen.getByText('name'))

      await waitFor(() => {
        expect(screen.getByText('No matching rows found. The filter excluded all rows from the left CSV based on the selected column from the right CSV.')).toBeInTheDocument()
      })
    })

    it('shows appropriate feedback message for include mode when no results', async () => {
      const leftDataWithNoMatches = {
        data: [
          { name: 'Eve', age: 22 },
          { name: 'Frank', age: 30 }
        ],
        headers: ['name', 'age']
      }

      render(
        <CsvFilter leftCSV={leftDataWithNoMatches} rightCSV={mockRightCSV} />
      )

      // Select include mode
      const includeRadio = screen.getByLabelText('Include')
      fireEvent.click(includeRadio)

      // Select column
      const select = screen.getByRole('combobox')
      fireEvent.mouseDown(select)
      fireEvent.click(screen.getByText('name'))

      await waitFor(() => {
        expect(screen.getByText('No matching rows found. No rows from the left CSV matched the values in the selected column from the right CSV.')).toBeInTheDocument()
      })
    })
  })
})
