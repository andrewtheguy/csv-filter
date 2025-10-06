export type CSVRow = {
  [key: string]: string | number | undefined | null
}

/**
 * Filters out rows that are completely empty (all values are empty strings, undefined, or null)
 * @param data - Array of CSV rows to filter
 * @returns Filtered array with empty rows removed
 */
export function filterEmptyRows(data: CSVRow[]): CSVRow[] {
  return data.filter(row => {
    return Object.values(row).some(value =>
      value !== null &&
      value !== undefined &&
      String(value).trim() !== ''
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
    import('papaparse').then((Papa) => {
      // Check if this might be a single-column CSV (no standard delimiters)
      // For empty content, don't set delimiter to preserve auto-detection error
      const hasDelimiters = csvContent.trim() ? /[,\t;|]/.test(csvContent) : undefined

      Papa.parse(csvContent, {
        header: false,
        skipEmptyLines: true,
        // For single-column CSVs, force tab delimiter to avoid auto-detection issues
        // Leave undefined for empty content to preserve delimiter auto-detection error
        delimiter: hasDelimiters === false ? '\t' : hasDelimiters === true ? undefined : undefined,
        complete: (results) => {
          try {
            // Check for parsing errors
            if (results.errors && results.errors.length > 0) {
              const error = new Error(`CSV parsing errors found in ${filePath}: ${results.errors.map(err => err.message).join(', ')}`) as ParseCSVError
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
              if (row.some(value => value !== null && value !== undefined && String(value).trim() !== '')) {
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
              const error = new Error(`CSV file contains duplicate column names: ${uniqueDuplicates.join(', ')}. Please fix the file and try again.`) as ParseCSVError
              error.filePath = filePath
              error.type = 'duplicate_headers'
              reject(error)
              return
            }

            // Count empty headers for proper column mapping
            const emptyHeadersCount = headers.filter(h => !h).length

            // Convert raw data to objects using headers as keys, starting from the row after the header row
            const dataRows: CSVRow[] = results.data.slice(firstNonEmptyRowIndex + 1).map(row => {
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
            const parseError = new Error(`Failed to process CSV file ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`) as ParseCSVError
            parseError.filePath = filePath
            parseError.type = 'parsing_error'
            reject(parseError)
          }
        },
        error: (error) => {
          const parseError = new Error(`Failed to parse CSV file ${filePath}: ${error.message}`) as ParseCSVError
          parseError.filePath = filePath
          parseError.type = 'parsing_error'
          reject(parseError)
        }
      })
    }).catch((error) => {
      const parseError = new Error(`Failed to load Papa Parse library: ${error instanceof Error ? error.message : 'Unknown error'}`) as ParseCSVError
      parseError.filePath = filePath
      parseError.type = 'parsing_error'
      reject(parseError)
    })
  })
}

export type FilterMode = 'exclude' | 'include'

/**
 * Filters left CSV data based on values in right CSV data.
 * @param leftData - Array of CSV rows from the left CSV file
 * @param rightData - Array of CSV rows from the right CSV file to filter against
 * @param column - The column name to filter on
 * @param mode - Filter mode: 'exclude' (remove matching rows) or 'include' (keep only matching rows)
 * @returns Filtered array of CSV rows
 * @throws Error if data validation fails
 */
export function filterCsvData(
  leftData: CSVRow[],
  rightData: CSVRow[],
  column: string,
  mode: FilterMode = 'exclude'
): CSVRow[] {
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
  if (!rightData.some(row => column in row)) {
    return leftData
  }

  const rightValues = new Set(rightData.map(row => row[column] || undefined))

  if (mode === 'include') {
    // Include only rows that have matching values
    return leftData.filter(row => rightValues.has(row[column] || undefined))
  } else {
    // Exclude rows that have matching values (default behavior)
    return leftData.filter(row => !rightValues.has(row[column] || undefined))
  }
}
