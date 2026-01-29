export type CSVRow = {
  [key: string]: string | number | undefined | null
}

export type OperationMode = 'filter' | 'compare'

export type ComparisonStatus = 'matched' | 'diff' | 'only left' | 'only right'

export interface ComparisonRow {
  keyValue: string | number | null
  leftValue: string | number | null | undefined
  rightValue: string | number | null | undefined
  status: ComparisonStatus
}

export interface ComparisonResult {
  rows: ComparisonRow[]
  keyColumnName: string
  valueColumnName: string
  summary: {
    total: number
    matched: number
    diff: number
    onlyLeft: number
    onlyRight: number
  }
}

/**
 * Filters out rows that are completely empty (all values are empty strings, undefined, or null)
 * @param data - Array of CSV rows to filter
 * @returns Filtered array with empty rows removed
 */
export function filterEmptyRows(data: CSVRow[]): CSVRow[] {
  return data.filter((row) => {
    return Object.values(row).some(
      (value) => value !== null && value !== undefined && String(value).trim() !== ''
    )
  })
}

export interface CSVData {
  data: CSVRow[]
  headers: string[]
}

export interface ParseCSVError extends Error {
  filePath: string
  type: 'parsing_error' | 'duplicate_headers' | 'invalid_data'
}

/**
 * Parses CSV content into structured data with headers and filtered rows
 * @param csvContent - Raw CSV content as a string
 * @param filePath - Path to the CSV file for error reporting
 * @returns Promise resolving to parsed CSV data with headers and filtered data rows
 * @throws ParseCSVError for parsing errors, duplicate headers, or invalid data
 */
export async function parseCSV(csvContent: string, filePath: string): Promise<CSVData> {
  return new Promise((resolve, reject) => {
    // Import Papa dynamically to avoid bundling issues in tests
    import('papaparse')
      .then((Papa) => {
        // Check if this might be a single-column CSV (no standard delimiters)
        // For empty content, don't set delimiter to preserve auto-detection error
        const hasDelimiters = csvContent.trim() ? /[,\t;|]/.test(csvContent) : undefined

        Papa.parse(csvContent, {
          header: false,
          skipEmptyLines: true,
          // For single-column CSVs, force tab delimiter to avoid auto-detection issues
          // Leave undefined for empty content to preserve delimiter auto-detection error
          delimiter:
            hasDelimiters === false ? '\t' : hasDelimiters === true ? undefined : undefined,
          complete: (results) => {
            try {
              // Check for parsing errors
              if (results.errors && results.errors.length > 0) {
                const error = new Error(
                  `CSV parsing errors found in ${filePath}: ${results.errors.map((err) => err.message).join(', ')}`
                ) as ParseCSVError
                error.filePath = filePath
                error.type = 'parsing_error'
                reject(error)
                return
              }

              // Check for valid data
              if (!results.data || results.data.length === 0) {
                const error = new Error(`No data found in CSV file: ${filePath}`) as ParseCSVError
                error.filePath = filePath
                error.type = 'invalid_data'
                reject(error)
                return
              }

              // Skip empty rows at the beginning (rows where all values are empty/whitespace)
              let firstNonEmptyRowIndex = -1
              for (let i = 0; i < results.data.length; i++) {
                const row = results.data[i] as string[]
                if (
                  row.some(
                    (value) => value !== null && value !== undefined && String(value).trim() !== ''
                  )
                ) {
                  firstNonEmptyRowIndex = i
                  break
                }
              }

              if (firstNonEmptyRowIndex === -1) {
                // All rows are empty
                const csvData: CSVData = {
                  data: [],
                  headers: []
                }
                resolve(csvData)
                return
              }

              // Extract headers from the first non-empty row and remove quotes
              const rawHeaders = results.data[firstNonEmptyRowIndex] || []
              const headers = rawHeaders.map((header) =>
                typeof header === 'string' && header.startsWith('"') && header.endsWith('"')
                  ? header.slice(1, -1)
                  : header
              )

              // Check for duplicate non-empty column names (allow multiple empty columns since they're excluded from filtering)
              const duplicateHeaders = headers.filter(
                (header, index) => header && headers.indexOf(header) !== index
              )
              if (duplicateHeaders.length > 0) {
                const uniqueDuplicates = [...new Set(duplicateHeaders)]
                const error = new Error(
                  `CSV file contains duplicate column names: ${uniqueDuplicates.join(', ')}. Please fix the file and try again.`
                ) as ParseCSVError
                error.filePath = filePath
                error.type = 'duplicate_headers'
                reject(error)
                return
              }

              // Count empty headers for proper column mapping
              const emptyHeadersCount = headers.filter((h) => !h).length

              // Convert raw data to objects using headers as keys, starting from the row after the header row
              const dataRows: CSVRow[] = results.data
                .slice(firstNonEmptyRowIndex + 1)
                .map((row) => {
                  const obj: CSVRow = {}
                  let emptyHeaderIndex = 0
                  headers.forEach((header, index) => {
                    if (!header) {
                      if (emptyHeadersCount === 1) {
                        if (index === headers.length - 1) {
                          obj[`col_${index + 1}`] = row[index] || ''
                        } else {
                          obj[''] = row[index] || ''
                        }
                      } else {
                        if (emptyHeaderIndex === 0) {
                          obj[''] = row[index] || ''
                        } else {
                          obj[`col_${emptyHeaderIndex + 2}`] = row[index] || ''
                        }
                        emptyHeaderIndex++
                      }
                    } else {
                      obj[header] = row[index] || ''
                    }
                  })
                  return obj
                })

              const filteredData = filterEmptyRows(dataRows)
              const csvData: CSVData = {
                data: filteredData,
                headers: headers
              }

              resolve(csvData)
            } catch (error) {
              const parseError = new Error(
                `Failed to process CSV file ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`
              ) as ParseCSVError
              parseError.filePath = filePath
              parseError.type = 'parsing_error'
              reject(parseError)
            }
          },
          error: (error) => {
            const parseError = new Error(
              `Failed to parse CSV file ${filePath}: ${error.message}`
            ) as ParseCSVError
            parseError.filePath = filePath
            parseError.type = 'parsing_error'
            reject(parseError)
          }
        })
      })
      .catch((error) => {
        const parseError = new Error(
          `Failed to load Papa Parse library: ${error instanceof Error ? error.message : 'Unknown error'}`
        ) as ParseCSVError
        parseError.filePath = filePath
        parseError.type = 'parsing_error'
        reject(parseError)
      })
  })
}

export type FilterMode = 'exclude' | 'include'

export interface FilterOptions {
  mode?: FilterMode
  caseInsensitive?: boolean
}

/**
 * Filters left CSV data based on values in right CSV data.
 * @param leftData - Array of CSV rows from the left CSV file
 * @param rightData - Array of CSV rows from the right CSV file to filter against
 * @param column - The column name to filter on
 * @param modeOrOptions - Filter mode or options object. Mode: 'exclude' (remove matching rows) or 'include' (keep only matching rows)
 * @returns Filtered array of CSV rows
 * @throws Error if data validation fails
 */
export function filterCsvData(
  leftData: CSVRow[],
  rightData: CSVRow[],
  column: string,
  modeOrOptions: FilterMode | FilterOptions = 'exclude'
): CSVRow[] {
  // Handle both old signature (mode string) and new signature (options object)
  const options: FilterOptions =
    typeof modeOrOptions === 'string' ? { mode: modeOrOptions } : modeOrOptions
  const mode = options.mode ?? 'exclude'
  const caseInsensitive = options.caseInsensitive ?? false
  // Validate input data
  if (!Array.isArray(leftData)) {
    throw new Error('Left CSV data must be an array')
  }
  if (!Array.isArray(rightData)) {
    throw new Error('Right CSV data must be an array')
  }
  if (typeof column !== 'string') {
    throw new Error('Column name must be a string')
  }

  // Throw error for empty column names
  if (!column.trim()) {
    throw new Error('Cannot filter by empty column name')
  }

  // Check for empty data
  if (!leftData.length) {
    return leftData
  }
  if (!rightData.length) {
    // Return left data unchanged if right data is empty (maintains backward compatibility)
    return leftData
  }

  // If the column doesn't exist in right data, return left data unchanged (maintains backward compatibility)
  if (!rightData.some((row) => column in row)) {
    return leftData
  }

  // Normalize values for comparison (lowercase if case-insensitive)
  const normalizeValue = (value: string | number | undefined | null): string | undefined => {
    if (value === null || value === undefined) return undefined
    const strValue = String(value)
    return caseInsensitive ? strValue.toLowerCase() : strValue
  }

  const rightValues = new Set(rightData.map((row) => normalizeValue(row[column])))

  if (mode === 'include') {
    // Include only rows that have matching values
    return leftData.filter((row) => rightValues.has(normalizeValue(row[column])))
  } else {
    // Exclude rows that have matching values (default behavior)
    return leftData.filter((row) => !rightValues.has(normalizeValue(row[column])))
  }
}

export interface CompareOptions {
  caseInsensitive?: boolean
}

/**
 * Compares two CSV datasets using a VLOOKUP-style comparison.
 * Matches rows by a key column and compares values in a value column.
 * @param leftData - Array of CSV rows from the left CSV file
 * @param rightData - Array of CSV rows from the right CSV file
 * @param keyColumn - The column name to use as the key for matching
 * @param valueColumn - The column name to compare values
 * @param options - Comparison options (e.g., caseInsensitive)
 * @returns ComparisonResult with rows showing differences and summary counts
 * @throws Error if data validation fails
 */
export function compareCSVData(
  leftData: CSVRow[],
  rightData: CSVRow[],
  keyColumn: string,
  valueColumn: string,
  options: CompareOptions = {}
): ComparisonResult {
  // Validate input data
  if (!Array.isArray(leftData)) {
    throw new Error('Left CSV data must be an array')
  }
  if (!Array.isArray(rightData)) {
    throw new Error('Right CSV data must be an array')
  }
  if (typeof keyColumn !== 'string') {
    throw new Error('Key column name must be a string')
  }
  if (!keyColumn.trim()) {
    throw new Error('Key column name cannot be empty')
  }
  if (typeof valueColumn !== 'string') {
    throw new Error('Value column name must be a string')
  }
  if (!valueColumn.trim()) {
    throw new Error('Value column name cannot be empty')
  }

  const { caseInsensitive = false } = options

  // Sentinel value for null/undefined keys to avoid collision with empty string keys
  const NULL_SENTINEL = '\0__NULL__\0'

  // Normalize key values for comparison
  const normalizeKey = (value: string | number | undefined | null): string => {
    if (value === null || value === undefined) return NULL_SENTINEL
    const strValue = String(value)
    return caseInsensitive ? strValue.toLowerCase() : strValue
  }

  // Build maps for left and right data
  // Map<normalizedKey, { originalKey, value }>
  type MapEntry = { keyValue: string | number | null; value: string | number | null | undefined }
  const leftMap = new Map<string, MapEntry>()
  const rightMap = new Map<string, MapEntry>()

  for (const row of leftData) {
    const keyValue = row[keyColumn]
    const normalizedKey = normalizeKey(keyValue)
    const value = row[valueColumn]
    // Store the original key value for display
    leftMap.set(normalizedKey, {
      keyValue: keyValue === undefined ? null : keyValue,
      value: value === undefined ? null : value
    })
  }

  for (const row of rightData) {
    const keyValue = row[keyColumn]
    const normalizedKey = normalizeKey(keyValue)
    const value = row[valueColumn]
    rightMap.set(normalizedKey, {
      keyValue: keyValue === undefined ? null : keyValue,
      value: value === undefined ? null : value
    })
  }

  // Collect all unique normalized keys
  const allKeys = new Set<string>([...leftMap.keys(), ...rightMap.keys()])

  const rows: ComparisonRow[] = []
  let matchedCount = 0
  let diffCount = 0
  let onlyLeftCount = 0
  let onlyRightCount = 0

  for (const normalizedKey of allKeys) {
    const leftEntry = leftMap.get(normalizedKey)
    const rightEntry = rightMap.get(normalizedKey)

    let status: ComparisonStatus
    if (leftEntry !== undefined && rightEntry === undefined) {
      status = 'only left'
      onlyLeftCount++
    } else if (rightEntry !== undefined && leftEntry === undefined) {
      status = 'only right'
      onlyRightCount++
    } else {
      // Both exist - check if values match (normalize to handle type differences like 100 vs "100")
      const leftValNorm = String(leftEntry?.value ?? '').trim()
      const rightValNorm = String(rightEntry?.value ?? '').trim()
      if (leftValNorm === rightValNorm) {
        status = 'matched'
        matchedCount++
      } else {
        status = 'diff'
        diffCount++
      }
    }

    // Use the original key value from whichever side has it (prefer left)
    const keyValue = leftEntry?.keyValue ?? rightEntry?.keyValue ?? null

    rows.push({
      keyValue,
      leftValue: leftEntry?.value,
      rightValue: rightEntry?.value,
      status
    })
  }

  return {
    rows,
    keyColumnName: keyColumn,
    valueColumnName: valueColumn,
    summary: {
      total: rows.length,
      matched: matchedCount,
      diff: diffCount,
      onlyLeft: onlyLeftCount,
      onlyRight: onlyRightCount
    }
  }
}
