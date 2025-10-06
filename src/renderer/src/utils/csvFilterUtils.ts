export type CSVRow = {
  [key: string]: string | number | undefined | null
}

/**
 * Filters left CSV data by excluding rows where the specified column matches values in right CSV data.
 * @param leftData - Array of CSV rows from the left CSV file
 * @param rightData - Array of CSV rows from the right CSV file to filter against
 * @param column - The column name to filter on
 * @returns Filtered array of CSV rows
 */
export function filterCsvData(
  leftData: CSVRow[],
  rightData: CSVRow[],
  column: string
): CSVRow[] {
  if (!leftData.length || !rightData.length || !column) {
    return leftData
  }

  // If the column doesn't exist in right data, return left data unchanged
  if (!rightData.some(row => column in row)) {
    return leftData
  }

  const rightValues = new Set(rightData.map(row => row[column] || undefined))

  return leftData.filter(row => !rightValues.has(row[column] || undefined))
}
