import { useState } from 'react'
import Papa from 'papaparse'
import {
  Box, Button, Select, MenuItem, FormControl, InputLabel,
  Paper, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Grid
} from '@mui/material'
import FileUploadIcon from '@mui/icons-material/FileUpload'
import DownloadIcon from '@mui/icons-material/Download'

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
  const [selectedColumn, setSelectedColumn] = useState<string>('')
  const [filteredData, setFilteredData] = useState<CSVRow[]>([])

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
        } else {
          setRightCSV(csvData)
        }
        resetFilter()
      }
    })
  }

  const resetFilter = () => {
    setSelectedColumn('')
    setFilteredData([])
  }

  const applyFilter = () => {
    if (!leftCSV || !rightCSV || !selectedColumn) return

    const rightValues = new Set(
      rightCSV.data.map(row => row[selectedColumn])
    )

    const filtered = leftCSV.data.filter(row => 
      !rightValues.has(row[selectedColumn])
    )
    setFilteredData(filtered)
  }

  const exportFiltered = async () => {
    if (!leftCSV || filteredData.length === 0) return

    const csvString = Papa.unparse(filteredData)
    await window.api.saveFile(csvString)
  }

  const renderTable = (data: CSVData | null, title: string) => {
    if (!data || data.data.length === 0) {
      return (
        <Paper sx={{ p: 2, height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography>No data loaded</Typography>
        </Paper>
      )
    }
    const previewData = data.data.slice(0, 10)
    return (
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>{title}</Typography>
        <TableContainer sx={{ maxHeight: 300 }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                {data.headers.map(header => (
                  <TableCell key={header}>{header}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {previewData.map((row, index) => (
                <TableRow key={index}>
                  {data.headers.map(header => (
                    <TableCell key={header} size="small">{row[header]}</TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <Typography variant="caption" sx={{ mt: 1 }}>
          Showing {previewData.length} of {data.data.length} rows
        </Typography>
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
          {renderTable(leftCSV, "Left CSV - Source")}
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
          {renderTable(rightCSV, "Right CSV - Filter")}
        </Grid>
      </Grid>
      
      {rightCSV && (
        <Box sx={{
          mt: 4,
          p: 3,
          bgcolor: 'background.paper',
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider'
        }}>
          <Typography variant="h5" gutterBottom>
            Filtering Options
          </Typography>

          <Box sx={{ mb: 3 }}>
            <FormControl fullWidth sx={{ minHeight: 56 }}>
              <InputLabel>Select Column to Filter By</InputLabel>
              <Select
                value={selectedColumn}
                onChange={(e) => setSelectedColumn(e.target.value)}
                label="Select Column to Filter By"
              >
                {rightCSV.headers.map(header => (
                  <MenuItem key={header} value={header}>
                    <Box>
                      <Typography variant="body2" fontWeight="bold">{header}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Click to filter left CSV using this column
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {selectedColumn && (
              <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
                Filter by column "{selectedColumn}" from right CSV
              </Typography>
            )}
          </Box>

          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              color="secondary"
              size="large"
              onClick={applyFilter}
              disabled={!leftCSV || !selectedColumn}
              sx={{ minWidth: 140 }}
            >
              Apply Filter
            </Button>
            {filteredData.length > 0 && (
              <Button
                variant="contained"
                color="success"
                size="large"
                startIcon={<DownloadIcon />}
                onClick={exportFiltered}
                sx={{ minWidth: 160 }}
              >
                Export Filtered CSV ({filteredData.length} rows)
              </Button>
            )}
          </Box>
        </Box>
      )}
      
      {filteredData.length > 0 && (
        <Paper sx={{ mt: 3, p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Filtered Results: {filteredData.length} rows
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Rows from left CSV excluding those that match in selected column from right CSV
          </Typography>
        </Paper>
      )}
    </Box>
  )
}

export default App
