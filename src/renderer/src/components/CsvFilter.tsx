import React, { useState, useEffect, useMemo } from 'react'
import {
  Box,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Pagination,
  RadioGroup,
  FormControlLabel,
  Radio,
  Checkbox,
  Tabs,
  Tab,
  Chip
} from '@mui/material'
import DownloadIcon from '@mui/icons-material/Download'
import Papa from 'papaparse'
import {
  filterCsvData,
  filterEmptyRows,
  compareCSVData,
  CSVRow,
  FilterMode,
  OperationMode,
  ComparisonResult
} from '../utils/csvFilterUtils'

interface CSVData {
  data: CSVRow[]
  headers: string[]
}

export interface CsvFilterProps {
  leftCSV: CSVData | null
  rightCSV: CSVData | null
  leftFileName?: string | null
  onFilteredDataChange?: (filteredData: CSVRow[]) => void
  onError?: (error: string) => void
}

const getRowColor = (status: string): string => {
  switch (status) {
    case 'diff':
      return 'error.light'
    case 'only left':
      return 'warning.light'
    case 'only right':
      return 'info.light'
    default:
      return 'inherit'
  }
}

const getRowHoverColor = (status: string): string => {
  switch (status) {
    case 'diff':
      return 'error.main'
    case 'only left':
      return 'warning.main'
    case 'only right':
      return 'info.main'
    default:
      return 'action.hover'
  }
}

const CsvFilter: React.FC<CsvFilterProps> = ({
  leftCSV,
  rightCSV,
  leftFileName,
  onFilteredDataChange,
  onError
}) => {
  const [operationMode, setOperationMode] = useState<OperationMode>('filter')
  const [selectedColumnIndex, setSelectedColumnIndex] = useState<number | ''>('')
  const [filterMode, setFilterMode] = useState<FilterMode>('exclude')
  const [caseInsensitive, setCaseInsensitive] = useState<boolean>(false)
  const [filteredData, setFilteredData] = useState<CSVRow[]>([])
  const [filteredPage, setFilteredPage] = useState(1)

  // Compare mode state
  const [keyColumnIndex, setKeyColumnIndex] = useState<number | ''>('')
  const [valueColumnIndex, setValueColumnIndex] = useState<number | ''>('')
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null)
  const [comparisonPage, setComparisonPage] = useState(1)

  // Compute common columns between left and right CSVs
  const commonColumns = useMemo(() => {
    if (!leftCSV || !rightCSV) return []
    const leftHeaders = new Set(leftCSV.headers.filter((h) => h.trim() !== ''))
    return rightCSV.headers
      .map((header, index) => ({ header, index }))
      .filter(({ header }) => header.trim() !== '' && leftHeaders.has(header))
  }, [leftCSV, rightCSV])

  // Reset filter when CSV data changes
  useEffect(() => {
    setSelectedColumnIndex('')
    setCaseInsensitive(false)
    setFilteredData([])
    setFilteredPage(1)
    // Reset compare mode state
    setKeyColumnIndex('')
    setValueColumnIndex('')
    setComparisonResult(null)
    setComparisonPage(1)
  }, [leftCSV, rightCSV])

  // Auto-apply filter when column selection or filter mode changes (only in filter mode)
  useEffect(() => {
    if (operationMode !== 'filter') return

    if (leftCSV && rightCSV && selectedColumnIndex !== '') {
      try {
        const selectedColumn = rightCSV.headers[selectedColumnIndex as number]
        const filtered = filterCsvData(leftCSV.data, rightCSV.data, selectedColumn, {
          mode: filterMode,
          caseInsensitive
        })
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
  }, [leftCSV, rightCSV, selectedColumnIndex, filterMode, caseInsensitive, onError, operationMode])

  // Auto-apply comparison when key/value columns or case sensitivity changes (only in compare mode)
  useEffect(() => {
    if (operationMode !== 'compare') return

    if (leftCSV && rightCSV && keyColumnIndex !== '' && valueColumnIndex !== '') {
      try {
        const keyColumn = commonColumns[keyColumnIndex as number]?.header
        const valueColumn = commonColumns[valueColumnIndex as number]?.header

        if (!keyColumn || !valueColumn) {
          setComparisonResult(null)
          return
        }

        const result = compareCSVData(leftCSV.data, rightCSV.data, keyColumn, valueColumn, {
          caseInsensitive
        })
        setComparisonResult(result)
        setComparisonPage(1)
      } catch (error) {
        const errorMessage = `Failed to compare: ${error instanceof Error ? error.message : 'Unknown error'}`
        onError?.(errorMessage)
        setComparisonResult(null)
      }
    } else {
      setComparisonResult(null)
      setComparisonPage(1)
    }
  }, [leftCSV, rightCSV, keyColumnIndex, valueColumnIndex, caseInsensitive, onError, operationMode, commonColumns])

  // Notify parent component of filtered data changes
  useEffect(() => {
    onFilteredDataChange?.(filteredData)
  }, [filteredData, onFilteredDataChange])

  const exportFiltered = async (): Promise<void> => {
    try {
      if (!leftCSV || filteredData.length === 0) return

      const csvString = Papa.unparse(filteredData)
      let suggestedFilename = 'filtered.csv'

      if (leftFileName) {
        // Extract filename without extension from leftFileName
        const fileNameWithoutExt = leftFileName.replace(/\.csv$/i, '')
        suggestedFilename = `${fileNameWithoutExt}_filtered.csv`
      }

      await window.api.saveFileWithName(csvString, suggestedFilename)
    } catch (error) {
      const errorMessage = `Failed to export filtered CSV: ${error instanceof Error ? error.message : 'Unknown error'}`
      onError?.(errorMessage)
    }
  }

  const exportComparison = async (): Promise<void> => {
    try {
      if (!comparisonResult || comparisonResult.rows.length === 0) return

      const exportData = comparisonResult.rows.map((row) => ({
        [comparisonResult.keyColumnName]: row.keyValue ?? '',
        [`${comparisonResult.valueColumnName}_left`]: row.leftValue ?? '',
        [`${comparisonResult.valueColumnName}_right`]: row.rightValue ?? '',
        status: row.status
      }))

      const csvString = Papa.unparse(exportData)
      let suggestedFilename = 'comparison.csv'

      if (leftFileName) {
        const fileNameWithoutExt = leftFileName.replace(/\.csv$/i, '')
        suggestedFilename = `${fileNameWithoutExt}_comparison.csv`
      }

      await window.api.saveFileWithName(csvString, suggestedFilename)
    } catch (error) {
      const errorMessage = `Failed to export comparison CSV: ${error instanceof Error ? error.message : 'Unknown error'}`
      onError?.(errorMessage)
    }
  }

  if (!rightCSV) {
    return null
  }

  const ITEMS_PER_PAGE = 10

  return (
    <Box
      sx={{
        mt: 2,
        p: 2,
        bgcolor: 'background.paper',
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider'
      }}
    >
      {/* Operation Mode Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs
          value={operationMode}
          onChange={(_e, value) => setOperationMode(value as OperationMode)}
          aria-label="operation mode tabs"
        >
          <Tab label="Filter" value="filter" />
          <Tab label="Compare" value="compare" />
        </Tabs>
      </Box>

      {/* Filter Mode UI */}
      {operationMode === 'filter' && (
        <>
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
            <FormControlLabel
              control={
                <Checkbox
                  checked={caseInsensitive}
                  onChange={(e) => setCaseInsensitive(e.target.checked)}
                />
              }
              label={<Typography sx={{ color: 'text.primary' }}>Case insensitive</Typography>}
            />
          </Box>

          <Box sx={{ mb: 2 }}>
            <FormControl fullWidth>
              <InputLabel id="column-select-label">
                Select Column from the Right to Filter By
              </InputLabel>
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
            <Box
              sx={{
                mt: 2,
                p: 2,
                bgcolor: 'action.hover',
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'divider'
              }}
            >
              <Typography variant="body2" color="text.secondary">
                {filterMode === 'exclude'
                  ? 'No matching rows found. The filter excluded all rows from the left CSV based on the selected column from the right CSV.'
                  : 'No matching rows found. No rows from the left CSV matched the values in the selected column from the right CSV.'}
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
              <TableContainer sx={{ maxHeight: 300, overflowX: 'auto' }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      {leftCSV.headers.map((header, index) => (
                        <TableCell key={index}>
                          {!header.trim() ? `(Empty column ${index + 1})` : header}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(() => {
                      const startIndex = (filteredPage - 1) * ITEMS_PER_PAGE
                      const endIndex = startIndex + ITEMS_PER_PAGE
                      const currentPageData = filteredData.slice(startIndex, endIndex)

                      return currentPageData.map((row, index) => (
                        <TableRow key={startIndex + index}>
                          {leftCSV.headers.map((header, headerIndex) => (
                            <TableCell key={headerIndex} size="small">
                              {row[header]}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    })()}
                  </TableBody>
                </Table>
              </TableContainer>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mt: 1
                }}
              >
                {(() => {
                  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE)
                  const startIndex = (filteredPage - 1) * ITEMS_PER_PAGE
                  const endIndex = startIndex + ITEMS_PER_PAGE

                  return (
                    <>
                      <Typography variant="caption">
                        Showing {startIndex + 1}-{Math.min(endIndex, filteredData.length)} of{' '}
                        {filteredData.length} rows
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
        </>
      )}

      {/* Compare Mode UI */}
      {operationMode === 'compare' && (
        <>
          {commonColumns.length === 0 ? (
            <Box
              sx={{
                p: 2,
                bgcolor: 'action.hover',
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'divider'
              }}
            >
              <Typography variant="body2" color="text.secondary">
                No common columns found between the left and right CSVs. Please ensure both files
                have at least one column with the same name.
              </Typography>
            </Box>
          ) : (
            <>
              {/* Case insensitive checkbox */}
              <Box sx={{ mb: 2 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={caseInsensitive}
                      onChange={(e) => setCaseInsensitive(e.target.checked)}
                    />
                  }
                  label={<Typography sx={{ color: 'text.primary' }}>Case insensitive</Typography>}
                />
              </Box>

              {/* Key Column Selection */}
              <Box sx={{ mb: 2 }}>
                <FormControl fullWidth>
                  <InputLabel id="key-column-select-label">Key Column</InputLabel>
                  <Select
                    labelId="key-column-select-label"
                    id="key-column-select"
                    value={keyColumnIndex}
                    onChange={(e) => setKeyColumnIndex(Number(e.target.value))}
                    label="Key Column"
                  >
                    {commonColumns.map(({ header }, index) => (
                      <MenuItem key={index} value={index}>
                        <Typography variant="body2">{header}</Typography>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              {/* Value Column Selection */}
              <Box sx={{ mb: 2 }}>
                <FormControl fullWidth>
                  <InputLabel id="value-column-select-label">Value Column</InputLabel>
                  <Select
                    labelId="value-column-select-label"
                    id="value-column-select"
                    value={valueColumnIndex}
                    onChange={(e) => setValueColumnIndex(Number(e.target.value))}
                    label="Value Column"
                  >
                    {commonColumns.map(({ header }, index) => (
                      <MenuItem key={index} value={index}>
                        <Typography variant="body2">{header}</Typography>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              {/* Summary Chips */}
              {comparisonResult && (
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                  <Chip
                    label={`Total: ${comparisonResult.summary.total}`}
                    size="small"
                    variant="outlined"
                  />
                  <Chip
                    label={`Matched: ${comparisonResult.summary.matched}`}
                    size="small"
                    color="success"
                    variant="outlined"
                  />
                  <Chip
                    label={`Diff: ${comparisonResult.summary.diff}`}
                    size="small"
                    color="error"
                    variant="outlined"
                  />
                  <Chip
                    label={`Only Left: ${comparisonResult.summary.onlyLeft}`}
                    size="small"
                    color="warning"
                    variant="outlined"
                  />
                  <Chip
                    label={`Only Right: ${comparisonResult.summary.onlyRight}`}
                    size="small"
                    color="info"
                    variant="outlined"
                  />
                </Box>
              )}

              {/* Export Button */}
              {comparisonResult && comparisonResult.rows.length > 0 && (
                <Box
                  sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center', mb: 2 }}
                >
                  <Button
                    variant="contained"
                    color="success"
                    size="medium"
                    startIcon={<DownloadIcon />}
                    onClick={exportComparison}
                  >
                    Export Comparison CSV ({comparisonResult.rows.length} rows)
                  </Button>
                </Box>
              )}

              {/* Comparison Results Table */}
              {comparisonResult && comparisonResult.rows.length > 0 && (
                <Paper sx={{ mt: 2, p: 2 }}>
                  <Typography variant="body1" sx={{ mb: 2, fontSize: '0.875rem', fontWeight: 500 }}>
                    Comparison Results ({comparisonResult.rows.length} rows)
                  </Typography>
                  <TableContainer sx={{ maxHeight: 300, overflowX: 'auto' }}>
                    <Table stickyHeader size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>{comparisonResult.keyColumnName}</TableCell>
                          <TableCell>{comparisonResult.valueColumnName} (Left)</TableCell>
                          <TableCell>{comparisonResult.valueColumnName} (Right)</TableCell>
                          <TableCell>Status</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {(() => {
                          const startIndex = (comparisonPage - 1) * ITEMS_PER_PAGE
                          const endIndex = startIndex + ITEMS_PER_PAGE
                          const currentPageData = comparisonResult.rows.slice(startIndex, endIndex)

                          return currentPageData.map((row, index) => (
                            <TableRow
                              key={startIndex + index}
                              sx={{
                                bgcolor: getRowColor(row.status),
                                '&:hover': {
                                  bgcolor: getRowHoverColor(row.status)
                                }
                              }}
                            >
                              <TableCell size="small">{row.keyValue ?? ''}</TableCell>
                              <TableCell size="small">{row.leftValue ?? ''}</TableCell>
                              <TableCell size="small">{row.rightValue ?? ''}</TableCell>
                              <TableCell size="small">{row.status}</TableCell>
                            </TableRow>
                          ))
                        })()}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      mt: 1
                    }}
                  >
                    {(() => {
                      const totalPages = Math.ceil(comparisonResult.rows.length / ITEMS_PER_PAGE)
                      const startIndex = (comparisonPage - 1) * ITEMS_PER_PAGE
                      const endIndex = startIndex + ITEMS_PER_PAGE

                      return (
                        <>
                          <Typography variant="caption">
                            Showing {startIndex + 1}-
                            {Math.min(endIndex, comparisonResult.rows.length)} of{' '}
                            {comparisonResult.rows.length} rows
                          </Typography>
                          {totalPages > 1 && (
                            <Pagination
                              count={totalPages}
                              page={comparisonPage}
                              onChange={(_event, page) => setComparisonPage(page)}
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

              {keyColumnIndex !== '' && valueColumnIndex !== '' && !comparisonResult && (
                <Box
                  sx={{
                    mt: 2,
                    p: 2,
                    bgcolor: 'action.hover',
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: 'divider'
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    No comparison results. Please check that the selected columns contain data.
                  </Typography>
                </Box>
              )}
            </>
          )}
        </>
      )}
    </Box>
  )
}

export default CsvFilter
