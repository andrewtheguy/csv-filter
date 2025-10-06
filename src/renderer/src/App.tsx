import { useState } from 'react'
import Papa from 'papaparse'
import {
  Box, Button,
  Paper, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Grid, Pagination
} from '@mui/material'
import FileUploadIcon from '@mui/icons-material/FileUpload'
import CsvFilter from './components/CsvFilter'

interface CSVRow {
  [key: string]: string | number
}

interface CSVData {
  data: CSVRow[]
  headers: string[]
}

function App(): React.JSX.Element {
  const [leftCSV, setLeftCSV] = useState<CSVData | null>(null)
  const [rightCSV, setRightCSV] = useState<CSVData | null>(null)
  const [leftPage, setLeftPage] = useState(1)
  const [rightPage, setRightPage] = useState(1)

  const handleFileUpload = async (isLeft: boolean) => {
    const result = await window.api.selectFile()
    if (!result) return

    Papa.parse<CSVRow>(result.content, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const csvData: CSVData = {
          data: results.data,
          headers: results.meta.fields || []
        }
        if (isLeft) {
          setLeftCSV(csvData)
          setLeftPage(1) // Reset to first page when new data is loaded
        } else {
          setRightCSV(csvData)
          setRightPage(1) // Reset to first page when new data is loaded
        }
      }
    })
  }

  const renderTable = (data: CSVData | null, title: string, currentPage: number, onPageChange: (event: React.ChangeEvent<unknown>, page: number) => void) => {
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
        <Typography variant="h6" gutterBottom>{title}</Typography>
        <TableContainer sx={{ maxHeight: 300 }}>
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
    <Box sx={{ p: 3, maxWidth: 'xl', mx: 'auto' }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
        CSV Comparator
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
          {renderTable(leftCSV, "Left CSV - Source", leftPage, (_event, page) => setLeftPage(page))}
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
          {renderTable(rightCSV, "Right CSV - Filter", rightPage, (_event, page) => setRightPage(page))}
        </Grid>
      </Grid>
      
      <CsvFilter leftCSV={leftCSV} rightCSV={rightCSV} />
    </Box>
  )
}

export default App
