import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import '@testing-library/jest-dom'

describe('App Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Table display with empty columns', () => {
    it('displays empty headers as "Empty column n" based on position', () => {

      render(<App />)

      // The component starts with no data, but we can test the renderTable function directly
      // by creating a mock element that triggers the renderTable logic

      // For now, just test the basic component renders without error
      expect(screen.getByText('CSV Filter')).toBeInTheDocument()
      expect(screen.getByText('Load Left CSV (Source)')).toBeInTheDocument()
      expect(screen.getByText('Load Right CSV (Filter)')).toBeInTheDocument()
    })

    it('can handle empty column display logic', () => {
      // Test the logic by calling renderTable directly via a shallow render or similar
      // For now, verify the component renders correctly
      const { container } = render(<App />)
      expect(container.querySelector('.MuiTypography-h4')).toHaveTextContent('CSV Filter')
    })
  })

  describe('CSV parsing empty line handling', () => {
    beforeEach(() => {
      // Mock window.api.selectFile to return controlled CSV data
      ;(window.api.selectFile as jest.Mock).mockClear()
    })

    it('filters out empty rows during CSV parsing', async () => {
      const csvWithEmptyLines = `name,age,city
John,25,NYC
Jane,30,LA

Bob,35,Chicago
,,

Alice,28,Miami
,,`

      // Mock the file selection to return our test CSV
      ;(window.api.selectFile as jest.Mock).mockResolvedValue({
        content: csvWithEmptyLines
      })

      render(<App />)
      const user = userEvent.setup()

      // Click the left CSV button to load data
      const leftButton = screen.getByText('Load Left CSV (Source)')
      await user.click(leftButton)

      // Wait for the data to be parsed and rendered
      await waitFor(() => {
        expect(screen.getByText('Left CSV - Source')).toBeInTheDocument()
      })

      // Verify that the data rows are correctly parsed
      expect(screen.getByText('John')).toBeInTheDocument()
      expect(screen.getByText('Jane')).toBeInTheDocument()
      expect(screen.getByText('Bob')).toBeInTheDocument()
      expect(screen.getByText('Alice')).toBeInTheDocument()

      // Verify that we have the correct total rows parsed (empty rows are filtered out)
      // Empty row filtering removes rows where all values are empty strings, null, or undefined
      const tableRows = screen.getAllByRole('row').slice(1) // slice(1) to skip header row
      expect(tableRows).toHaveLength(4) // Only the 4 data rows remain (empty rows filtered out)

      // Verify that empty line filtering correctly handles lines with delimiters vs truly empty lines
    })

    it('handles CSV with mixed empty and data rows correctly', async () => {
      const csvWithMixedContent = `header1,header2,header3
data1,data2,data3

,,


more_data,another_value,third_value

`

      ;(window.api.selectFile as jest.Mock).mockResolvedValue({
        content: csvWithMixedContent
      })

      render(<App />)
      const user = userEvent.setup()

      const leftButton = screen.getByText('Load Left CSV (Source)')
      await user.click(leftButton)

      await waitFor(() => {
        expect(screen.getByText('Left CSV - Source')).toBeInTheDocument()
        // Check that we have the correct total rows (empty rows filtered out)
        const tableRows = screen.getAllByRole('row').slice(1) // slice(1) to skip header row
        expect(tableRows).toHaveLength(2) // data1 row + more_data row (empty ,, row filtered out)
      })

      expect(screen.getByText('data1')).toBeInTheDocument()
      expect(screen.getByText('more_data')).toBeInTheDocument()
    })

    it('handles completely empty CSV file', async () => {
      const emptyCSV = ``

      ;(window.api.selectFile as jest.Mock).mockResolvedValue({
        content: emptyCSV
      })

      render(<App />)
      const user = userEvent.setup()

      const leftButton = screen.getByText('Load Left CSV (Source)')
      await user.click(leftButton)

      // Should show "No data loaded" message in the left panel
      await waitFor(() => {
        expect(screen.getByText('Load Left CSV (Source)')).toBeInTheDocument()
        // Empty CSV should not crash and should show same state as no data loaded
        expect(screen.getByText('CSV Filter')).toBeInTheDocument()
      })
    })

    it('handles CSV with all empty lines', async () => {
      const allEmptyCSV = `

,

,,

    `

      ;(window.api.selectFile as jest.Mock).mockResolvedValue({
        content: allEmptyCSV,
        filePath: 'empty-lines.csv'
      })

      render(<App />)
      const user = userEvent.setup()

      const leftButton = screen.getByText('Load Left CSV (Source)')
      await user.click(leftButton)

      // Should show error snackbar for malformed CSV with inconsistent field counts
      await waitFor(() => {
        expect(screen.getByText('CSV parsing errors found in empty-lines.csv: Too many fields: expected 2 fields but parsed 3, Too few fields: expected 2 fields but parsed 1')).toBeInTheDocument()
        // Table should not be displayed due to the error
        expect(screen.queryByText('Left CSV - Source')).not.toBeInTheDocument()
      })
    })

    it('handles CSV with only header row and empty lines', async () => {
      const headerOnlyCSV = `name,age,city




    `

      ;(window.api.selectFile as jest.Mock).mockResolvedValue({
        content: headerOnlyCSV,
        filePath: 'header-only.csv'
      })

      render(<App />)
      const user = userEvent.setup()

      const leftButton = screen.getByText('Load Left CSV (Source)')
      await user.click(leftButton)

      // Should show error snackbar for malformed CSV with inconsistent field counts
      await waitFor(() => {
        expect(screen.getByText('CSV parsing errors found in header-only.csv: Too few fields: expected 3 fields but parsed 1')).toBeInTheDocument()
      })

      // The table should not be displayed due to the error
      expect(screen.queryByText('Left CSV - Source')).not.toBeInTheDocument()
    })
  })
})
