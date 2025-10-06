import React, { useState, useEffect } from 'react'
import {
  Box, Button, Select, MenuItem, FormControl, InputLabel, Typography, Paper,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Pagination,
  RadioGroup, FormControlLabel, Radio
} from '@mui/material'
import DownloadIcon from '@mui/icons-material/Download'
import Papa from 'papaparse'
import { filterCsvData, filterEmptyRows, CSVRow, FilterMode } from '../utils/csvFilterUtils'

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
  const [filterMode, setFilterMode] = useState<FilterMode>('exclude')
  const [filteredData, setFilteredData] = useState<CSVRow[]>([])
  const [filteredPage, setFilteredPage] = useState(1)

  // Reset filter when CSV data changes
  useEffect(() => {
    setSelectedColumnIndex('')
    setFilteredData([])
    setFilteredPage(1)
  }, [leftCSV, rightCSV])

  // Auto-apply filter when column selection or filter mode changes
  useEffect(() => {
    if (leftCSV && rightCSV && selectedColumnIndex !== '') {
      try {
        const selectedColumn = rightCSV.headers[selectedColumnIndex as number]
        const filtered = filterCsvData(leftCSV.data, rightCSV.data, selectedColumn, filterMode)
        const filteredWithoutEmpty = filterEmptyRows(filtered)
        setFilteredData(filteredWithoutEmpty)
        setFilteredPage(1) // Reset to first page when filter changes
      } catch (error) {
        const errorMessage = `Failed to apply filter: ${error instanceof Error ? error.message : 'Unknown error'}`
        onError?.(errorMessage)
      }
    } else {
      setFilteredData([])
      setFilteredPage(1)
    }
  }, [leftCSV, rightCSV, selectedColumnIndex, filterMode, onError])

  // Notify parent component of filtered data changes
  useEffect(() => {
    onFilteredDataChange?.(filteredData)
  }, [filteredData, onFilteredDataChange])

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
      {/* Filter Mode Selection */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="body1" sx={{ mb: 1, fontWeight: 500, color: 'text.primary' }}>
          Filter Mode
        </Typography>
        <RadioGroup
          row
          value={filterMode}
          onChange={(e) => setFilterMode(e.target.value as FilterMode)}
        >
          <FormControlLabel
            value="exclude"
            control={<Radio />}
            label={<Typography sx={{ color: 'text.primary' }}>Exclude</Typography>}
          />
          <FormControlLabel
            value="include"
            control={<Radio />}
            label={<Typography sx={{ color: 'text.primary' }}>Include</Typography>}
          />
        </RadioGroup>
      </Box>

      <Box sx={{ mb: 2 }}>
        <FormControl fullWidth>
          <InputLabel id="column-select-label">Select Column from the Right to Filter By</InputLabel>
          <Select
            labelId="column-select-label"
            id="column-select"
            value={selectedColumnIndex}
            onChange={(e) => setSelectedColumnIndex(Number(e.target.value))}
            label="Select Column from the Right to Filter By"
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
      </Box>

      {selectedColumnIndex !== '' && filteredData.length === 0 && leftCSV && (
        <Box sx={{ mt: 2, p: 2, bgcolor: 'action.hover', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
          <Typography variant="body2" color="text.secondary">
            {filterMode === 'exclude'
              ? 'No matching rows found. The filter excluded all rows from the left CSV based on the selected column from the right CSV.'
              : 'No matching rows found. No rows from the left CSV matched the values in the selected column from the right CSV.'
            }
          </Typography>
        </Box>
      )}

      {filteredData.length > 0 && (
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center', mt: 1 }}>
          <Button
            variant="contained"
            color="success"
            size="medium"
            startIcon={<DownloadIcon />}
            onClick={exportFiltered}
          >
            Export Filtered CSV ({filteredData.length} rows)
          </Button>
        </Box>
      )}

      {filteredData.length > 0 && leftCSV && (
        <Paper sx={{ mt: 2, p: 2 }}>
          <Typography variant="body1" sx={{ mb: 2, fontSize: '0.875rem', fontWeight: 500 }}>
            Filtered Results ({filteredData.length} rows)
          </Typography>
          <TableContainer sx={{ maxHeight: 300 }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  {leftCSV.headers.map((header, index) => (
                    <TableCell key={index}>{!header.trim() ? `(Empty column ${index + 1})` : header}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {(() => {
                  const ITEMS_PER_PAGE = 10
                  const startIndex = (filteredPage - 1) * ITEMS_PER_PAGE
                  const endIndex = startIndex + ITEMS_PER_PAGE
                  const currentPageData = filteredData.slice(startIndex, endIndex)

                  return currentPageData.map((row, index) => (
                    <TableRow key={startIndex + index}>
                      {leftCSV.headers.map((header, headerIndex) => (
                        <TableCell key={headerIndex} size="small">{row[header]}</TableCell>
                      ))}
                    </TableRow>
                  ))
                })()}
              </TableBody>
            </Table>
          </TableContainer>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
            {(() => {
              const ITEMS_PER_PAGE = 10
              const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE)
              const startIndex = (filteredPage - 1) * ITEMS_PER_PAGE
              const endIndex = startIndex + ITEMS_PER_PAGE

              return (
                <>
                  <Typography variant="caption">
                    Showing {startIndex + 1}-{Math.min(endIndex, filteredData.length)} of {filteredData.length} rows
                  </Typography>
                  {totalPages > 1 && (
                    <Pagination
                      count={totalPages}
                      page={filteredPage}
                      onChange={(_event, page) => setFilteredPage(page)}
                      size="small"
                      siblingCount={1}
                      boundaryCount={1}
                    />
                  )}
                </>
              )
            })()}
          </Box>
        </Paper>
      )}
    </Box>
  )
}

export default CsvFilter
