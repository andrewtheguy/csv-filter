import React, { useState, useEffect } from 'react'
import {
  Box, Button, Select, MenuItem, FormControl, InputLabel, Typography, Paper
} from '@mui/material'
import DownloadIcon from '@mui/icons-material/Download'
import Papa from 'papaparse'

interface CSVRow {
  [key: string]: string | number
}

interface CSVData {
  data: CSVRow[]
  headers: string[]
}

export interface CsvFilterProps {
  leftCSV: CSVData | null
  rightCSV: CSVData | null
  onFilteredDataChange?: (filteredData: CSVRow[]) => void
}

const CsvFilter: React.FC<CsvFilterProps> = ({
  leftCSV,
  rightCSV,
  onFilteredDataChange
}) => {
  const [selectedColumn, setSelectedColumn] = useState<string>('')
  const [filteredData, setFilteredData] = useState<CSVRow[]>([])

  // Reset filter when CSV data changes
  useEffect(() => {
    setSelectedColumn('')
    setFilteredData([])
  }, [leftCSV, rightCSV])

  // Notify parent component of filtered data changes
  useEffect(() => {
    onFilteredDataChange?.(filteredData)
  }, [filteredData, onFilteredDataChange])

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

  if (!rightCSV) {
    return null
  }

  return (
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
          <InputLabel id="column-select-label">Select Column to Filter By</InputLabel>
          <Select
            labelId="column-select-label"
            id="column-select"
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

export default CsvFilter
