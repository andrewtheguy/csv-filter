export type CSVRow = {
  [key: string]: string | number | undefined | null
}

/**
 * Filters left CSV data by excluding rows where the specified column matches values in right CSV data.
 * @param leftData - Array of CSV rows from the left CSV file
 * @param rightData - Array of CSV rows from the right CSV file to filter against
 * @param column - The column name to filter on
 * @returns Filtered array of CSV rows
 * @throws Error if data validation fails
 */
export function filterCsvData(
  leftData: CSVRow[],
  rightData: CSVRow[],
  column: string
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

  // Return left data unchanged for empty or invalid column names (maintains backward compatibility)
  if (!column.trim()) {
    return leftData
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

  return leftData.filter(row => !rightValues.has(row[column] || undefined))
}
