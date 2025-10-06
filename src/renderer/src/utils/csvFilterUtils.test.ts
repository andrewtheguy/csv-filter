import { filterCsvData, filterEmptyRows, parseCSV, ParseCSVError } from './csvFilterUtils'

const mockLeftData = [
  { name: 'Alice', age: 25, city: 'NY' },
  { name: 'Bob', age: 30, city: 'LA' },
  { name: 'Charlie', age: 35, city: 'NY' },
  { name: 'Diana', age: 28, city: 'Chicago' }
]

const mockRightData = [
  { name: 'Alice', age: 25 },
  { name: 'Bob', age: 30 }
]

const mockRightDataEmpty = []

describe('filterCsvData', () => {
  it('filters data by matching column values', () => {
    const result = filterCsvData(mockLeftData, mockRightData, 'name')

    expect(result).toEqual([
      { name: 'Charlie', age: 35, city: 'NY' },
      { name: 'Diana', age: 28, city: 'Chicago' }
    ])
  })

  it('returns all left data when right data is empty', () => {
    const result = filterCsvData(mockLeftData, mockRightDataEmpty, 'name')

    expect(result).toEqual(mockLeftData)
  })

  it('throws error when column is empty', () => {
    expect(() => {
      filterCsvData(mockLeftData, mockRightData, '')
    }).toThrow('Cannot filter by empty column name')
  })

  it('returns all left data when left data is empty', () => {
    const result = filterCsvData([], mockRightData, 'name')

    expect(result).toEqual([])
  })

  it('handles filtering by different columns', () => {
    const leftData = [
      { id: 1, value: 'A' },
      { id: 2, value: 'B' },
      { id: 3, value: 'A' }
    ]

    const rightData = [
      { id: 10, value: 'A' },
      { id: 20, value: 'C' }
    ]

    const result = filterCsvData(leftData, rightData, 'value')

    expect(result).toEqual([
      { id: 2, value: 'B' }
    ])
  })

  it('returns all left data when column does not exist in right data', () => {
    const result = filterCsvData(mockLeftData, mockRightData, 'nonexistent')

    expect(result).toEqual(mockLeftData)
  })

  it('handles undefined values in columns', () => {
    const leftData = [
      { name: 'Alice' },
      { name: 'Bob' },
      { name: undefined }
    ]

    const rightData = [
      { name: undefined }
    ]

    const result = filterCsvData(leftData, rightData, 'name')

    expect(result).toEqual([
      { name: 'Alice' },
      { name: 'Bob' }
    ])
  })

  it('handles null values in columns', () => {
    const leftData = [
      { name: 'Alice' },
      { name: 'Bob' },
      { name: null }
    ]

    const rightData = [
      { name: null }
    ]

    const result = filterCsvData(leftData, rightData, 'name')

    expect(result).toEqual([
      { name: 'Alice' },
      { name: 'Bob' }
    ])
  })

  it('filters correctly with empty strings', () => {
    const leftData = [
      { name: 'Alice' },
      { name: '' },
      { name: 'Bob' }
    ]

    const rightData = [
      { name: '' }
    ]

    const result = filterCsvData(leftData, rightData, 'name')

    expect(result).toEqual([
      { name: 'Alice' },
      { name: 'Bob' }
    ])
  })

  it('handles duplicate values in right data correctly', () => {
    const leftData = [
      { name: 'Alice' },
      { name: 'Bob' },
      { name: 'Alice' } // duplicate
    ]

    const rightData = [
      { name: 'Alice' },
      { name: 'Alice' } // duplicate in right should not affect
    ]

    const result = filterCsvData(leftData, rightData, 'name')

    expect(result).toEqual([
      { name: 'Bob' }
    ])
  })

  it('does not mutate original data', () => {
    const originalLeft = [...mockLeftData]
    const originalRight = [...mockRightData]

    filterCsvData(mockLeftData, mockRightData, 'name')

    expect(mockLeftData).toEqual(originalLeft)
    expect(mockRightData).toEqual(originalRight)
  })

  it('filters by numeric values', () => {
    const leftData = [
      { id: 1 },
      { id: 2 },
      { id: 3 }
    ]

    const rightData = [
      { id: 1 },
      { id: 3 }
    ]

    const result = filterCsvData(leftData, rightData, 'id')

    expect(result).toEqual([
      { id: 2 }
    ])
  })

  it('includes only matching rows when mode is "include"', () => {
    const result = filterCsvData(mockLeftData, mockRightData, 'name', 'include')

    expect(result).toEqual([
      { name: 'Alice', age: 25, city: 'NY' },
      { name: 'Bob', age: 30, city: 'LA' }
    ])
  })

  it('excludes matching rows by default (backwards compatibility)', () => {
    const result = filterCsvData(mockLeftData, mockRightData, 'name', 'exclude')

    expect(result).toEqual([
      { name: 'Charlie', age: 35, city: 'NY' },
      { name: 'Diana', age: 28, city: 'Chicago' }
    ])
  })

  it('returns only matching rows with include mode for different columns', () => {
    const result = filterCsvData(mockLeftData, mockRightData, 'age', 'include')

    expect(result).toEqual([
      { name: 'Alice', age: 25, city: 'NY' },
      { name: 'Bob', age: 30, city: 'LA' }
    ])
  })

  it('returns empty array with include mode when no matches', () => {
    const leftData = [
      { name: 'Eve', age: 22 }
    ]

    const result = filterCsvData(leftData, mockRightData, 'name', 'include')

    expect(result).toEqual([])
  })

  it('maintains backwards compatibility with default exclude mode', () => {
    const result = filterCsvData(mockLeftData, mockRightData, 'name')

    expect(result).toEqual([
      { name: 'Charlie', age: 35, city: 'NY' },
      { name: 'Diana', age: 28, city: 'Chicago' }
    ])
  })
})

describe('filterEmptyRows', () => {
  it('returns the same array when no empty rows exist', () => {
    const data = [
      { name: 'Alice', age: 25 },
      { name: 'Bob', age: 30 }
    ]

    const result = filterEmptyRows(data)
    expect(result).toEqual(data)
    expect(result).not.toBe(data) // Should return a new array
  })

  it('filters out rows where all values are empty strings', () => {
    const data = [
      { name: 'Alice', age: 25 },
      { name: '', age: '', city: '' },
      { name: 'Bob', age: 30 }
    ]

    const result = filterEmptyRows(data)
    expect(result).toEqual([
      { name: 'Alice', age: 25 },
      { name: 'Bob', age: 30 }
    ])
  })

  it('filters out rows where all values are null or undefined', () => {
    const data = [
      { name: 'Alice', age: 25 },
      { name: null, age: null, city: null },
      { name: 'Bob', age: 30 }
    ]

    const result = filterEmptyRows(data)
    expect(result).toEqual([
      { name: 'Alice', age: 25 },
      { name: 'Bob', age: 30 }
    ])
  })

  it('filters out rows where all values are undefined', () => {
    const data = [
      { name: 'Alice', age: 25 },
      { name: undefined, age: undefined },
      { name: 'Bob', age: 30 }
    ]

    const result = filterEmptyRows(data)
    expect(result).toEqual([
      { name: 'Alice', age: 25 },
      { name: 'Bob', age: 30 }
    ])
  })

  it('filters out rows with mixed empty values', () => {
    const data = [
      { name: 'Alice', age: 25 },
      { name: '', age: null, city: undefined },
      { name: '   ', age: 0 }, // This should not be filtered as age: 0 is not empty
      { name: 'Bob', age: 30 }
    ]

    const result = filterEmptyRows(data)
    expect(result).toEqual([
      { name: 'Alice', age: 25 },
      { name: '   ', age: 0 },
      { name: 'Bob', age: 30 }
    ])
  })

  it('handles rows with whitespace-only strings as empty', () => {
    const data = [
      { name: 'Alice', age: 25 },
      { name: '   ', age: '', city: '\t' },
      { name: 'Bob', age: 30 }
    ]

    const result = filterEmptyRows(data)
    expect(result).toEqual([
      { name: 'Alice', age: 25 },
      { name: 'Bob', age: 30 }
    ])
  })

  it('handles numeric zero values as non-empty', () => {
    const data = [
      { name: 'Alice', age: 25 },
      { name: '', age: 0 },
      { name: 'Bob', age: 30 }
    ]

    const result = filterEmptyRows(data)
    expect(result).toEqual([
      { name: 'Alice', age: 25 },
      { name: '', age: 0 }, // Zero is a valid value
      { name: 'Bob', age: 30 }
    ])
  })

  it('returns empty array when all rows are empty', () => {
    const data = [
      { name: '', age: null },
      { city: undefined, zip: '' },
      { title: null, description: undefined }
    ]

    const result = filterEmptyRows(data)
    expect(result).toEqual([])
  })

  it('returns empty array for empty input', () => {
    const result = filterEmptyRows([])
    expect(result).toEqual([])
  })
})

describe('parseCSV', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('correctly processes headers by removing quotes', async () => {
    const csvWithQuotes = `"id","user_id","order_number","shipping_first_name","shipping_last_name"
123456789,98765432,"ORD-TEST-001","John","Smith"`

    const result = await parseCSV(csvWithQuotes, 'test.csv')

    expect(result.headers).toEqual(['id', 'user_id', 'order_number', 'shipping_first_name', 'shipping_last_name'])
  })

  it('creates proper CSVRow objects from parsed data', async () => {
    const csvData = `id,user_id,order_number,shipping_first_name,shipping_last_name
123456789,98765432,ORD-TEST-001,John,Smith`

    const result = await parseCSV(csvData, 'test.csv')

    expect(result.data).toEqual([
      {
        id: '123456789',
        user_id: '98765432',
        order_number: 'ORD-TEST-001',
        shipping_first_name: 'John',
        shipping_last_name: 'Smith'
      }
    ])
  })

  it('handles empty data CSV gracefully', async () => {
    const emptyCSV = ''

    await expect(parseCSV(emptyCSV, 'empty.csv')).rejects.toThrow('Unable to auto-detect delimiting character; defaulted to')
  })

  it('handles mixed quoted and unquoted headers', async () => {
    const csvMixedQuotes = `"id",user_id,"order_number",shipping_first_name,"shipping_last_name"
123456789,98765432,"ORD-TEST-001","John",Smith`

    const result = await parseCSV(csvMixedQuotes, 'test.csv')

    expect(result.headers).toEqual(['id', 'user_id', 'order_number', 'shipping_first_name', 'shipping_last_name'])
    expect(result.data).toEqual([
      {
        id: '123456789',
        user_id: '98765432',
        order_number: 'ORD-TEST-001',
        shipping_first_name: 'John',
        shipping_last_name: 'Smith'
      }
    ])
  })

  it('filters out empty rows', async () => {
    const csvWithEmptyRows = `name,age,city
John,25,NYC

Jane,30,LA

,,
Bob,35,Chicago`

    const result = await parseCSV(csvWithEmptyRows, 'test.csv')

    expect(result.data).toEqual([
      { name: 'John', age: '25', city: 'NYC' },
      { name: 'Jane', age: '30', city: 'LA' },
      { name: 'Bob', age: '35', city: 'Chicago' }
    ])
  })

  it('shows error when CSV contains duplicate column names', async () => {
    const csvWithDuplicates = `name,age,name
John,25,Doe
Jane,30,Smith`

    await expect(parseCSV(csvWithDuplicates, 'duplicate-columns.csv')).rejects.toThrow('CSV file contains duplicate column names: name.')
  })

  it('handles CSV with multiple duplicate column names', async () => {
    const csvWithMultipleDuplicates = `name,age,age,city,name
John,25,26,NYC,Doe
Jane,30,31,LA,Smith`


    await expect(parseCSV(csvWithMultipleDuplicates, 'multiple-duplicate-columns.csv')).rejects.toThrow('CSV file contains duplicate column names: age, name.')
  })

  it('allows multiple empty column names and loads successfully', async () => {
    const csvWithMultipleEmptyColumns = `name,,,
John,Doe,Smith,25
Jane,Doe,Smith,30`

    const result = await parseCSV(csvWithMultipleEmptyColumns, 'multiple-empty-columns.csv')

    expect(result.headers).toEqual(['name', '', '', ''])
    expect(result.data).toEqual([
      { name: 'John', '': 'Doe', 'col_3': 'Smith', 'col_4': '25' },
      { name: 'Jane', '': 'Doe', 'col_3': 'Smith', 'col_4': '30' }
    ])
  })

  it('blocks non-empty duplicates even when combined with empty columns', async () => {
    const csvWithDuplicateNameAndEmpty = `name,,,name,age
John,Doe,Smith,Max,25`

    await expect(parseCSV(csvWithDuplicateNameAndEmpty, 'duplicate-name-with-empty.csv')).rejects.toThrow('CSV file contains duplicate column names: name.')
    await expect(parseCSV(csvWithDuplicateNameAndEmpty, 'duplicate-name-with-empty.csv')).rejects.toThrow('CSV file contains duplicate column names: name.')
  })

  it('allows columns with whitespace (treated as empty) and loads successfully', async () => {
    const csvWithWhitespaceColumns = `name,  ,age,   ,
John,Middle,25,N/A,
Jane,Doe,30,Other,`

    const result = await parseCSV(csvWithWhitespaceColumns, 'whitespace-columns.csv')

    expect(result.headers).toEqual(['name', '  ', 'age', '   ', ''])
    expect(result.data).toEqual([
      { name: 'John', '  ': 'Middle', age: '25', '   ': 'N/A', 'col_5': '' },
      { name: 'Jane', '  ': 'Doe', age: '30', '   ': 'Other', 'col_5': '' }
    ])
  })

  it('handles CSV with special characters and complex data', async () => {
    const csvSample = `"id","user_id","order_number","shipping_first_name","shipping_last_name"
123456789,98765432,"ORD-TEST-001","John","Smith"`

    const result = await parseCSV(csvSample, 'sample-orders.csv')

    expect(result.headers).toEqual(['id', 'user_id', 'order_number', 'shipping_first_name', 'shipping_last_name'])
    expect(result.data).toHaveLength(1)
    expect(result.data[0]).toEqual({
      id: '123456789',
      user_id: '98765432',
      order_number: 'ORD-TEST-001',
      shipping_first_name: 'John',
      shipping_last_name: 'Smith'
    })
  })

  it('handles CSV with embedded quotes in data values correctly', async () => {
    const csvEmbeddedQuotes = `"name","description","notes"
"John ""The Great"" Doe","Size: 48""","Quote: ""Hello world"""
"Mary","Normal size","No quotes here"`

    const result = await parseCSV(csvEmbeddedQuotes, 'embedded-quotes.csv')

    expect(result.data[0]).toEqual({
      name: 'John "The Great" Doe',
      description: 'Size: 48"',
      notes: 'Quote: "Hello world"'
    })
  })

  it('handles completely empty CSV file', async () => {
    const emptyCSV = ``

    await expect(parseCSV(emptyCSV, 'empty.csv')).rejects.toThrow()
  })

  it('handles CSV with all empty lines', async () => {
    const allEmptyCSV = `

,

,,

    `

    const result = await parseCSV(allEmptyCSV, 'empty-lines.csv')
    expect(result.data).toEqual([])
    expect(result.headers).toEqual([])
  })

  it('handles CSV with only header row and empty lines', async () => {
    const headerOnlyCSV = `name,age,city




    `

    const result = await parseCSV(headerOnlyCSV, 'header-only.csv')
    expect(result.data).toEqual([])
    expect(result.headers).toEqual(['name', 'age', 'city'])
  })

  it('handles CSV with quoted headers correctly', async () => {
    const csvWithQuotedHeaders = `"id","user_id","order_number","shipping_first_name","shipping_last_name"
14617637,22013494,"cx998548739","Daisy ","Alvarez"`

    const result = await parseCSV(csvWithQuotedHeaders, 'quoted-headers.csv')

    expect(result.headers).toEqual(['id', 'user_id', 'order_number', 'shipping_first_name', 'shipping_last_name'])
    expect(result.data[0]).toEqual({
      id: '14617637',
      user_id: '22013494',
      order_number: 'cx998548739',
      shipping_first_name: 'Daisy ',
      shipping_last_name: 'Alvarez'
    })
  })

  it('handles CSV with mixed quoted and unquoted fields correctly', async () => {
    const csvMixedQuotes = `id,"user_id",order_number,"shipping_first_name",shipping_last_name
14617637,"22013494",cx998548739,Daisy ,Alvarez`

    const result = await parseCSV(csvMixedQuotes, 'mixed-quotes.csv')

    expect(result.headers).toEqual(['id', 'user_id', 'order_number', 'shipping_first_name', 'shipping_last_name'])
    expect(result.data[0]).toEqual({
      id: '14617637',
      user_id: '22013494',
      order_number: 'cx998548739',
      shipping_first_name: 'Daisy ',
      shipping_last_name: 'Alvarez'
    })
  })

  it('handles CSV with complications in quoted values (commas, newlines)', async () => {
    const csvWithComplexQuotes = `"name","address","description"
"Smith, John","123 Main St, Suite 100\nAnytown, USA","Product ""Special Edition"" with features including bullets:
- Feature 1
- Feature 2"
"Jones","456 Oak St","Simple description"`

    const result = await parseCSV(csvWithComplexQuotes, 'complex-quotes.csv')

    expect(result.data).toHaveLength(2)
    expect(result.data[0]).toEqual({
      name: 'Smith, John',
      address: '123 Main St, Suite 100\nAnytown, USA',
      description: 'Product "Special Edition" with features including bullets:\n- Feature 1\n- Feature 2'
    })
  })

  it('handles CSV with empty quoted fields correctly', async () => {
    const csvWithEmptyQuotes = `"name","email","notes"
"John","","Working on project"
"Mary","mary@example.com",""`

    const result = await parseCSV(csvWithEmptyQuotes, 'empty-quotes.csv')

    expect(result.data).toEqual([
      { name: 'John', email: '', notes: 'Working on project' },
      { name: 'Mary', email: 'mary@example.com', notes: '' }
    ])
  })

  it('handles CSV files where entire columns are empty', async () => {
    const csvWithEntirelyEmptyColumn = `First Name,Last Name,Store Credit Amount,,Email
chilo,Joseline,65,,josray3543@gmail.com
,,
Johnson,Tracy,65,,Tracyjhn5@aol.com`

    const result = await parseCSV(csvWithEntirelyEmptyColumn, 'entirely-empty-column.csv')

    expect(result.headers).toEqual(['First Name', 'Last Name', 'Store Credit Amount', '', 'Email'])
    expect(result.data).toEqual([
      {
        'First Name': 'chilo',
        'Last Name': 'Joseline',
        'Store Credit Amount': '65',
        '': '',
        'Email': 'josray3543@gmail.com'
      },
      {
        'First Name': 'Johnson',
        'Last Name': 'Tracy',
        'Store Credit Amount': '65',
        '': '',
        'Email': 'Tracyjhn5@aol.com'
      }
    ])
  })

  it('returns correct CSVData structure', async () => {
    const simpleCSV = `name,age
John,25
Jane,30`

    const result = await parseCSV(simpleCSV, 'test.csv')

    expect(result).toHaveProperty('data')
    expect(result).toHaveProperty('headers')
    expect(Array.isArray(result.data)).toBe(true)
    expect(Array.isArray(result.headers)).toBe(true)
    expect(result.headers).toEqual(['name', 'age'])
    expect(result.data).toHaveLength(2)
  })

  it('includes file path in error messages', async () => {
    const csvWithDuplicates = `name,age,name
John,25,Doe`

    try {
      await parseCSV(csvWithDuplicates, 'test-file.csv')
      fail('Should have thrown an error')
    } catch (error) {
      expect(error instanceof Error).toBe(true)
      const parseError = error as ParseCSVError
      expect(parseError.filePath).toBe('test-file.csv')
      expect(parseError.type).toBe('duplicate_headers')
    }
  })

  it('skips empty rows at the beginning and treats first non-empty row as headers', async () => {
    const csvWithLeadingEmptyRows = `,,
,,
name,age,city
John,25,NYC
Jane,30,LA`

    const result = await parseCSV(csvWithLeadingEmptyRows, 'leading-empty.csv')

    expect(result.headers).toEqual(['name', 'age', 'city'])
    expect(result.data).toEqual([
      { name: 'John', age: '25', city: 'NYC' },
      { name: 'Jane', age: '30', city: 'LA' }
    ])
  })

  it('skips initial empty rows and detects second line as header when first line is completely empty', async () => {
    const csvWithFirstEmpty = `,,
,age,
John,25,NYC
Jane,30,LA`

    const result = await parseCSV(csvWithFirstEmpty, 'first-empty-second-header.csv')

    expect(result.headers).toEqual(['', 'age', ''])
    expect(result.data).toEqual([
      { '': 'John', age: '25', 'col_3': 'NYC' },
      { '': 'Jane', age: '30', 'col_3': 'LA' }
    ])
  })

  it('handles single-column CSV with no delimiters correctly', async () => {
    const singleColumnCSV = `Associated Company/Partnership Site
advanced-hair-restoration
alliance-medical-center
axiomhealth
azul-vision`

    const result = await parseCSV(singleColumnCSV, 'single-column.csv')

    expect(result.headers).toEqual(['Associated Company/Partnership Site'])
    expect(result.data).toEqual([
      { 'Associated Company/Partnership Site': 'advanced-hair-restoration' },
      { 'Associated Company/Partnership Site': 'alliance-medical-center' },
      { 'Associated Company/Partnership Site': 'axiomhealth' },
      { 'Associated Company/Partnership Site': 'azul-vision' }
    ])
  })

  it('handles single-column CSV with realistic data from user example', async () => {
    const singleColumnCSV = `Associated Company/Partnership Site
advanced-hair-restoration
alliance-medical-center
axiomhealth
azul-vision
azul-vision-management
broad-street
citymd-scrubs
citymd-summit-health
doctors-urgent-care-of-dfw
eastern-virginia-medical-school
elite-anesthesia-associates
embo-partners
exquisite-dental-implant-center
favorite-staffing
georgia-kidney-and-hypertension-clinic
groth-pain-spine
isto-biologics
ivim
kaiser-permanente-oakland-emergency-dept
kestra-medical
keyops
kindbody
kiwanda-cottages-noble-house
lucid-staffing-solutions-llc
memory-treatment-centers
michigan-state-university
millennium-neonatology
modern-dermatology-westport
montana-arthritis-center
noble-anethesia-partners
partners-in-nephrology-and-endocrinology
phoenix-children-s-hospital
pritzker-school-of-medicine
pure-infusion
rady-children-s-hospital-san-diego
retina-consultants-of-orange-county
reunion-rehabilitation-hospital-plano
rma
south-marin-health-wellness-center
summit-medical-staffing
summit-radiology
sunflower-development-center
texas-health-breeze-urgent-care
the-oaks
timothy-groth-md-pc
uc-davis
university-of-louisville
waterville-animal-group`

    const result = await parseCSV(singleColumnCSV, 'user-example-single-column.csv')

    expect(result.headers).toEqual(['Associated Company/Partnership Site'])
    expect(result.data).toHaveLength(48) // All non-empty rows after filtering
    expect(result.data[0]).toEqual({
      'Associated Company/Partnership Site': 'advanced-hair-restoration'
    })
    expect(result.data[47]).toEqual({
      'Associated Company/Partnership Site': 'waterville-animal-group'
    })
  })

  it('handles single-column CSV with empty lines mixed in', async () => {
    const singleColumnWithEmpty = `Single Column Header

first-row
second-row


third-row`

    const result = await parseCSV(singleColumnWithEmpty, 'single-column-with-empty.csv')

    expect(result.headers).toEqual(['Single Column Header'])
    expect(result.data).toEqual([
      { 'Single Column Header': 'first-row' },
      { 'Single Column Header': 'second-row' },
      { 'Single Column Header': 'third-row' }
    ])
  })

  it('handles single-column CSV with numeric data', async () => {
    const singleColumnNumbers = `Numbers
1
2
3
4
5`

    const result = await parseCSV(singleColumnNumbers, 'single-column-numbers.csv')

    expect(result.headers).toEqual(['Numbers'])
    expect(result.data).toEqual([
      { 'Numbers': '1' },
      { 'Numbers': '2' },
      { 'Numbers': '3' },
      { 'Numbers': '4' },
      { 'Numbers': '5' }
    ])
  })
})
