import { useState } from 'react'
import Papa from 'papaparse'
import {
  Box, Button,
  Paper, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Grid, Pagination, Alert, Snackbar
} from '@mui/material'
import FileUploadIcon from '@mui/icons-material/FileUpload'
import CsvFilter from './components/CsvFilter'
import { filterEmptyRows, CSVRow } from './utils/csvFilterUtils'

interface CSVData {
  data: CSVRow[]
  headers: string[]
}

function App(): React.JSX.Element {
  const [leftCSV, setLeftCSV] = useState<CSVData | null>(null)
  const [rightCSV, setRightCSV] = useState<CSVData | null>(null)
  const [leftPage, setLeftPage] = useState(1)
  const [rightPage, setRightPage] = useState(1)
  const [leftFilePath, setLeftFilePath] = useState<string | null>(null)
  const [rightFilePath, setRightFilePath] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [errorOpen, setErrorOpen] = useState(false)

  const truncatePath = (path: string, maxLength: number = 50): string => {
    if (path.length <= maxLength) return path

    const fileName = path.split('/').pop() || ''
    const pathWithoutFile = path.substring(0, path.lastIndexOf('/'))

    if (pathWithoutFile.length === 0) return `.../${fileName}`

    // Reserve space for start + "..." + "/" + filename
    const startLength = Math.floor((maxLength - fileName.length - 4) / 2)

    let start = pathWithoutFile.substring(0, startLength)
    let end = pathWithoutFile.substring(pathWithoutFile.length - startLength)

    // If we have enough space, show full path without truncation
    if (pathWithoutFile.length <= maxLength - fileName.length - 1) {
      return path
    }

    return `${start}...${end}/${fileName}`
  }

  const handleFileUpload = async (isLeft: boolean) => {
    try {
      const result = await window.api.selectFile()
      if (!result) return

      Papa.parse<string[]>(result.content, {
        header: false,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.errors && results.errors.length > 0) {
            setError(`CSV parsing errors found in ${result.filePath}: ${results.errors.map(err => err.message).join(', ')}`)
            setErrorOpen(true)
            return
          }

          if (!results.data || results.data.length === 0) {
            setError(`No data found in CSV file: ${result.filePath}`)
            setErrorOpen(true)
            return
          }

          // Extract headers from the first row and remove quotes
          const rawHeaders = results.data[0] || []
          const headers = rawHeaders.map(header =>
            typeof header === 'string' && header.startsWith('"') && header.endsWith('"')
              ? header.slice(1, -1)
              : header
          )

          // Check for duplicate non-empty column names (allow multiple empty columns since they're excluded from filtering)
          const duplicateHeaders = headers.filter((header, index) =>
            header && headers.indexOf(header) !== index
          )
          if (duplicateHeaders.length > 0) {
            const uniqueDuplicates = [...new Set(duplicateHeaders)]
            setError(`CSV file contains duplicate column names: ${uniqueDuplicates.join(', ')}. Please fix the file and try again.`)
            setErrorOpen(true)
            return
          }

          // Convert raw data to objects using headers as keys, starting from row 1 (skip header row)
          const dataRows: CSVRow[] = results.data.slice(1).map(row => {
            const obj: CSVRow = {}
            headers.forEach((header, index) => {
              obj[header || `col_${index + 1}`] = row[index] || ''
            })
            return obj
          })

          const filteredData = filterEmptyRows(dataRows)
          const csvData: CSVData = {
            data: filteredData,
            headers: headers
          }
          if (isLeft) {
            setLeftCSV(csvData)
            setLeftFilePath(result.filePath)
            setLeftPage(1) // Reset to first page when new data is loaded
          } else {
            setRightCSV(csvData)
            setRightFilePath(result.filePath)
            setRightPage(1) // Reset to first page when new data is loaded
          }
        },
        error: (error) => {
          setError(`Failed to parse CSV file ${result.filePath}: ${error.message}`)
          setErrorOpen(true)
        }
      })
    } catch (error) {
      setError(`Failed to load file: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setErrorOpen(true)
    }
  }

  const renderTable = (data: CSVData | null, title: string, filePath: string | null, currentPage: number, onPageChange: (event: React.ChangeEvent<unknown>, page: number) => void) => {
    const displayTitle = filePath ? `${title}: ${truncatePath(filePath)}` : title
    if (!data || data.data.length === 0) {
      return (
        <Paper sx={{ p: 2, height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography>No data loaded</Typography>
        </Paper>
      )
    }

    const ITEMS_PER_PAGE = 10
    const totalPages = Math.ceil(data.data.length / ITEMS_PER_PAGE)
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
    const endIndex = startIndex + ITEMS_PER_PAGE
    const currentPageData = data.data.slice(startIndex, endIndex)

    // Create display headers, showing "(Empty column n)" for empty headers (where n is column position)
    const displayHeaders = data.headers.map((header, index) => {
      if (!header.trim()) {
        return `(Empty column ${index + 1})`
      }
      return header
    })

    return (
      <Paper sx={{ p: 2 }}>
        <Typography variant="body1" sx={{ mb: 2, fontSize: '0.875rem', fontWeight: 500 }}>{displayTitle}</Typography>
        <TableContainer sx={{ maxHeight: 300, overflowX: 'auto' }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                {displayHeaders.map((header, index) => (
                  <TableCell key={index}>{header}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {currentPageData.map((row, index) => (
                <TableRow key={startIndex + index}>
                  {data.headers.map(header => (
                    <TableCell key={header} size="small">{row[header]}</TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
          <Typography variant="caption">
            Showing {startIndex + 1}-{Math.min(endIndex, data.data.length)} of {data.data.length} rows
          </Typography>
          {totalPages > 1 && (
            <Pagination
              count={totalPages}
              page={currentPage}
              onChange={onPageChange}
              size="small"
              siblingCount={1}
              boundaryCount={1}
            />
          )}
        </Box>
      </Paper>
    )
  }

  return (
    <Box sx={{ p: 3, maxWidth: 'xl', mx: 'auto', height: '100vh', overflow: 'auto' }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
        CSV Filter
      </Typography>
      
      <Grid container spacing={3}>
        <Grid size={6}>
          <Box sx={{ mb: 2 }}>
            <Button
              variant="contained"
              startIcon={<FileUploadIcon />}
              onClick={() => handleFileUpload(true)}
              fullWidth
            >
              Load Left CSV (Source)
            </Button>
          </Box>
          {renderTable(leftCSV, "Left CSV - Source", leftFilePath, leftPage, (_event, page) => setLeftPage(page))}
        </Grid>

        <Grid size={6}>
          <Box sx={{ mb: 2 }}>
            <Button
              variant="contained"
              startIcon={<FileUploadIcon />}
              onClick={() => handleFileUpload(false)}
              fullWidth
            >
              Load Right CSV (Filter)
            </Button>
          </Box>
          {renderTable(rightCSV, "Right CSV - Filter", rightFilePath, rightPage, (_event, page) => setRightPage(page))}
        </Grid>
      </Grid>
      
      <CsvFilter
        leftCSV={leftCSV}
        rightCSV={rightCSV}
        leftFileName={leftFilePath ? leftFilePath.split('/').pop() || null : null}
        onError={(error) => {
          setError(error)
          setErrorOpen(true)
        }}
      />

      <Snackbar
        open={errorOpen}
        autoHideDuration={6000}
        onClose={() => setErrorOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setErrorOpen(false)}
          severity="error"
          sx={{ width: '100%', maxWidth: 600 }}
        >
          {error}
        </Alert>
      </Snackbar>
    </Box>
  )
}

export default App
