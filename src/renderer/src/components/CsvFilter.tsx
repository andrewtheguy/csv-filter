import React, { useState, useEffect } from 'react'
import {
  Box, Button, Select, MenuItem, FormControl, InputLabel, Typography, Paper
} from '@mui/material'
import DownloadIcon from '@mui/icons-material/Download'
import Papa from 'papaparse'
import { filterCsvData, CSVRow } from '../utils/csvFilterUtils'

interface CSVData {
  data: CSVRow[]
  headers: string[]
}

export interface CsvFilterProps {
  leftCSV: CSVData | null
  rightCSV: CSVData | null
  onFilteredDataChange?: (filteredData: CSVRow[]) => void
  onError?: (error: string) => void
}

const CsvFilter: React.FC<CsvFilterProps> = ({
  leftCSV,
  rightCSV,
  onFilteredDataChange,
  onError
}) => {
  const [selectedColumnIndex, setSelectedColumnIndex] = useState<number | ''>('')
  const [filteredData, setFilteredData] = useState<CSVRow[]>([])

  // Reset filter when CSV data changes
  useEffect(() => {
    setSelectedColumnIndex('')
    setFilteredData([])
  }, [leftCSV, rightCSV])

  // Notify parent component of filtered data changes
  useEffect(() => {
    onFilteredDataChange?.(filteredData)
  }, [filteredData, onFilteredDataChange])

  const applyFilter = () => {
    try {
      if (!leftCSV || !rightCSV || selectedColumnIndex === '') return

      const selectedColumn = rightCSV.headers[selectedColumnIndex as number]
      const filtered = filterCsvData(leftCSV.data, rightCSV.data, selectedColumn)
      setFilteredData(filtered)
    } catch (error) {
      const errorMessage = `Failed to apply filter: ${error instanceof Error ? error.message : 'Unknown error'}`
      onError?.(errorMessage)
    }
  }

  const exportFiltered = async () => {
    try {
      if (!leftCSV || filteredData.length === 0) return

      const csvString = Papa.unparse(filteredData)
      await window.api.saveFile(csvString)
    } catch (error) {
      const errorMessage = `Failed to export filtered CSV: ${error instanceof Error ? error.message : 'Unknown error'}`
      onError?.(errorMessage)
    }
  }

  if (!rightCSV) {
    return null
  }

  return (
    <Box sx={{
      mt: 2,
      p: 2,
      bgcolor: 'background.paper',
      borderRadius: 2,
      border: '1px solid',
      borderColor: 'divider'
    }}>
      <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
        Filtering Options
      </Typography>

      <Box sx={{ mb: 2 }}>
        <FormControl fullWidth>
          <InputLabel id="column-select-label">Select Column to Filter By</InputLabel>
          <Select
            labelId="column-select-label"
            id="column-select"
            value={selectedColumnIndex}
            onChange={(e) => setSelectedColumnIndex(Number(e.target.value))}
            label="Select Column to Filter By"
          >
            {rightCSV.headers.map((header, index) => {
              const displayText = !header.trim() ? `(Empty column ${index + 1})` : header
              return (
                <MenuItem key={index} value={index}>
                  <Typography variant="body2">{displayText}</Typography>
                </MenuItem>
              )
            })}
          </Select>
        </FormControl>
        {selectedColumnIndex !== '' && (
          <Typography variant="body2" sx={{ mt: 0.5, color: 'text.secondary', fontSize: '0.875rem' }}>
            {rightCSV.headers[selectedColumnIndex as number].trim() === ''
              ? `Filter using column ${(selectedColumnIndex as number) + 1}`
              : `Filter by column "${rightCSV.headers[selectedColumnIndex as number]}" from right CSV`
            }
          </Typography>
        )}
      </Box>

      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
        <Button
          variant="contained"
          color="secondary"
          size="medium"
          onClick={applyFilter}
          disabled={!leftCSV || selectedColumnIndex === ''}
        >
          Apply Filter
        </Button>
        {filteredData.length > 0 && (
          <Button
            variant="contained"
            color="success"
            size="medium"
            startIcon={<DownloadIcon />}
            onClick={exportFiltered}
          >
            Export Filtered CSV ({filteredData.length} rows)
          </Button>
        )}
      </Box>

      {filteredData.length > 0 && (
        <Paper sx={{ mt: 2, p: 1.5 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 500 }}>
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
