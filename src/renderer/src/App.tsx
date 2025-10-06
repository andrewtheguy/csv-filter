import { useState } from 'react'
import Papa from 'papaparse'
import {
  Box, Button,
  Paper, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Grid
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
      }
    })
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
      
      <CsvFilter leftCSV={leftCSV} rightCSV={rightCSV} />
    </Box>
  )
}

export default App
