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
    expect(screen.getByText('Filtering Options')).toBeInTheDocument()
    expect(screen.getByLabelText('Select Column to Filter By')).toBeInTheDocument()
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

  it('enables Apply Filter button when column is selected and leftCSV exists', () => {
    render(
      <CsvFilter leftCSV={mockLeftCSV} rightCSV={mockRightCSV} />
    )

    const select = screen.getByRole('combobox')
    const applyButton = screen.getByText('Apply Filter')

    // Initially disabled
    expect(applyButton).toBeDisabled()

    // After selecting column, button should be enabled
    fireEvent.mouseDown(select)
    fireEvent.click(screen.getByText('name'))

    expect(applyButton).toBeEnabled()
  })

  it('disables Apply Filter button when leftCSV is null', () => {
    render(
      <CsvFilter leftCSV={null} rightCSV={mockRightCSV} />
    )

    const select = screen.getByRole('combobox')
    const applyButton = screen.getByText('Apply Filter')

    fireEvent.mouseDown(select)
    fireEvent.click(screen.getByText('name'))

    expect(applyButton).toBeDisabled()
  })

  it('correctly filters data by selected column', async () => {
    render(
      <CsvFilter leftCSV={mockLeftCSV} rightCSV={mockRightCSV} />
    )

    const select = screen.getByRole('combobox')
    fireEvent.mouseDown(select)
    fireEvent.click(screen.getByText('name'))

    const applyButton = screen.getByText('Apply Filter')
    fireEvent.click(applyButton)

    await waitFor(() => {
      expect(screen.getByText('Filtered Results: 2 rows')).toBeInTheDocument()
    })

    expect(screen.getByText('Rows from left CSV excluding those that match in selected column from right CSV')).toBeInTheDocument()
  })

  it('shows export button after filtering', async () => {
    render(
      <CsvFilter leftCSV={mockLeftCSV} rightCSV={mockRightCSV} />
    )

    // Apply filter
    const select = screen.getByRole('combobox')
    fireEvent.mouseDown(select)
    fireEvent.click(screen.getByText('name'))

    fireEvent.click(screen.getByText('Apply Filter'))

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

    // Apply filter
    const select = screen.getByRole('combobox')
    fireEvent.mouseDown(select)
    fireEvent.click(screen.getByText('name'))

    fireEvent.click(screen.getByText('Apply Filter'))

    await waitFor(() => {
      expect(screen.getByText(/Export Filtered CSV/)).toBeInTheDocument()
    })

    const exportButton = screen.getByText(/Export Filtered CSV/)
    fireEvent.click(exportButton)

    expect(mockSaveFile).toHaveBeenCalledTimes(1)
  })

  it('shows selected column description', () => {
    render(
      <CsvFilter leftCSV={mockLeftCSV} rightCSV={mockRightCSV} />
    )

    const select = screen.getByRole('combobox')
    fireEvent.mouseDown(select)
    fireEvent.click(screen.getByText('name'))

    expect(screen.getByText('Filter by column "name" from right CSV')).toBeInTheDocument()
  })

  it('resets filter when CSV data changes', async () => {
    const { rerender } = render(
      <CsvFilter leftCSV={mockLeftCSV} rightCSV={mockRightCSV} />
    )

    const select = screen.getByRole('combobox')
    fireEvent.mouseDown(select)
    fireEvent.click(screen.getByText('name'))

    fireEvent.click(screen.getByText('Apply Filter'))

    await waitFor(() => {
      expect(screen.getByText('Filtered Results: 2 rows')).toBeInTheDocument()
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
      expect(screen.queryByText('Filtered Results: 2 rows')).not.toBeInTheDocument()
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

    fireEvent.click(screen.getByText('Apply Filter'))

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith([
        { name: 'Charlie', age: 35, city: 'NY' },
        { name: 'Diana', age: 28, city: 'Chicago' }
      ])
    })
  })

  it('handles empty left CSV gracefully', async () => {
    render(
      <CsvFilter
        leftCSV={{ data: [], headers: ['name', 'age'] }}
        rightCSV={mockRightCSV}
      />
    )

    const select = screen.getByRole('combobox')
    fireEvent.mouseDown(select)
    fireEvent.click(screen.getByText('name'))

    const applyButton = screen.getByText('Apply Filter')
    expect(applyButton).toBeEnabled()

    fireEvent.click(applyButton)

    // Empty CSV should result in 0 filtered results, so no results paper should show
    await waitFor(() => {
      expect(screen.queryByText(/Filtered Results:/)).not.toBeInTheDocument()
    })
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

    fireEvent.click(screen.getByText('Apply Filter'))

    // Should still filter based on existing values, undefined is not in Set
    await waitFor(() => {
      expect(screen.getByText('Filtered Results: 4 rows')).toBeInTheDocument()
    })
  })

  it('handles filtering multiple calls correctly', async () => {
    const multipleFilterRightCSV = {
      data: [
        { city: 'NY' },
        { city: 'LA' }
      ],
      headers: ['city']
    }

    render(
      <CsvFilter leftCSV={mockLeftCSV} rightCSV={multipleFilterRightCSV} />
    )

    // First filter by city
    const select = screen.getByRole('combobox')
    fireEvent.mouseDown(select)
    fireEvent.click(screen.getByText('city'))

    fireEvent.click(screen.getByText('Apply Filter'))

    await waitFor(() => {
      expect(screen.getByText('Filtered Results: 1 rows')).toBeInTheDocument() // Only Diana in Chicago
    })

    // Apply same filter again - should not change
    fireEvent.click(screen.getByText('Apply Filter'))

    await waitFor(() => {
      expect(screen.getByText('Filtered Results: 1 rows')).toBeInTheDocument()
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

    it('shows appropriate captions for empty column selections', () => {
      render(
        <CsvFilter leftCSV={leftCSVWithEmptyHeaders} rightCSV={rightCSVWithEmptyHeaders} />
      )

      const select = screen.getByRole('combobox')
      fireEvent.mouseDown(select)
      fireEvent.click(screen.getByText('(Empty column 1)'))

      expect(screen.getByText('Filter using column 1')).toBeInTheDocument()
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
})
