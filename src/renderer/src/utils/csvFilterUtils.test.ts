import { filterCsvData, filterEmptyRows, parseCSV, ParseCSVError, compareCSVData } from './csvFilterUtils'

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

    expect(result).toEqual([{ id: 2, value: 'B' }])
  })

  it('returns all left data when column does not exist in right data', () => {
    const result = filterCsvData(mockLeftData, mockRightData, 'nonexistent')

    expect(result).toEqual(mockLeftData)
  })

  it('handles undefined values in columns', () => {
    const leftData = [{ name: 'Alice' }, { name: 'Bob' }, { name: undefined }]

    const rightData = [{ name: undefined }]

    const result = filterCsvData(leftData, rightData, 'name')

    expect(result).toEqual([{ name: 'Alice' }, { name: 'Bob' }])
  })

  it('handles null values in columns', () => {
    const leftData = [{ name: 'Alice' }, { name: 'Bob' }, { name: null }]

    const rightData = [{ name: null }]

    const result = filterCsvData(leftData, rightData, 'name')

    expect(result).toEqual([{ name: 'Alice' }, { name: 'Bob' }])
  })

  it('filters correctly with empty strings', () => {
    const leftData = [{ name: 'Alice' }, { name: '' }, { name: 'Bob' }]

    const rightData = [{ name: '' }]

    const result = filterCsvData(leftData, rightData, 'name')

    expect(result).toEqual([{ name: 'Alice' }, { name: 'Bob' }])
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

    expect(result).toEqual([{ name: 'Bob' }])
  })

  it('does not mutate original data', () => {
    const originalLeft = [...mockLeftData]
    const originalRight = [...mockRightData]

    filterCsvData(mockLeftData, mockRightData, 'name')

    expect(mockLeftData).toEqual(originalLeft)
    expect(mockRightData).toEqual(originalRight)
  })

  it('filters by numeric values', () => {
    const leftData = [{ id: 1 }, { id: 2 }, { id: 3 }]

    const rightData = [{ id: 1 }, { id: 3 }]

    const result = filterCsvData(leftData, rightData, 'id')

    expect(result).toEqual([{ id: 2 }])
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
    const leftData = [{ name: 'Eve', age: 22 }]

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

  it('performs case-sensitive comparison by default', () => {
    const leftData = [
      { email: 'Alice@example.com' },
      { email: 'bob@example.com' },
      { email: 'CHARLIE@example.com' }
    ]
    const rightData = [{ email: 'alice@example.com' }, { email: 'BOB@example.com' }]

    const result = filterCsvData(leftData, rightData, 'email')

    // None should be excluded because case doesn't match
    expect(result).toEqual([
      { email: 'Alice@example.com' },
      { email: 'bob@example.com' },
      { email: 'CHARLIE@example.com' }
    ])
  })

  it('performs case-insensitive comparison when caseInsensitive option is true', () => {
    const leftData = [
      { email: 'Alice@example.com' },
      { email: 'bob@example.com' },
      { email: 'CHARLIE@example.com' }
    ]
    const rightData = [{ email: 'alice@example.com' }, { email: 'BOB@example.com' }]

    const result = filterCsvData(leftData, rightData, 'email', { caseInsensitive: true })

    // Alice and bob should be excluded (case-insensitive match)
    expect(result).toEqual([{ email: 'CHARLIE@example.com' }])
  })

  it('performs case-insensitive include when both options are set', () => {
    const leftData = [
      { email: 'Alice@example.com' },
      { email: 'bob@example.com' },
      { email: 'CHARLIE@example.com' }
    ]
    const rightData = [{ email: 'alice@example.com' }, { email: 'BOB@example.com' }]

    const result = filterCsvData(leftData, rightData, 'email', {
      mode: 'include',
      caseInsensitive: true
    })

    // Only Alice and bob should be included (case-insensitive match)
    expect(result).toEqual([{ email: 'Alice@example.com' }, { email: 'bob@example.com' }])
  })

  it('accepts options object with only mode specified', () => {
    const result = filterCsvData(mockLeftData, mockRightData, 'name', { mode: 'include' })

    expect(result).toEqual([
      { name: 'Alice', age: 25, city: 'NY' },
      { name: 'Bob', age: 30, city: 'LA' }
    ])
  })

  it('accepts options object with only caseInsensitive specified (defaults to exclude mode)', () => {
    const leftData = [{ name: 'ALICE' }, { name: 'bob' }, { name: 'Charlie' }]
    const rightData = [{ name: 'alice' }]

    const result = filterCsvData(leftData, rightData, 'name', { caseInsensitive: true })

    expect(result).toEqual([{ name: 'bob' }, { name: 'Charlie' }])
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

    expect(result.headers).toEqual([
      'id',
      'user_id',
      'order_number',
      'shipping_first_name',
      'shipping_last_name'
    ])
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

    await expect(parseCSV(emptyCSV, 'empty.csv')).rejects.toThrow(
      'Unable to auto-detect delimiting character; defaulted to'
    )
  })

  it('handles mixed quoted and unquoted headers', async () => {
    const csvMixedQuotes = `"id",user_id,"order_number",shipping_first_name,"shipping_last_name"
123456789,98765432,"ORD-TEST-001","John",Smith`

    const result = await parseCSV(csvMixedQuotes, 'test.csv')

    expect(result.headers).toEqual([
      'id',
      'user_id',
      'order_number',
      'shipping_first_name',
      'shipping_last_name'
    ])
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

  it('blocks non-empty duplicates even when combined with empty columns', async () => {
    const csvWithDuplicateNameAndEmpty = `name,,,name,age
John,Doe,Smith,Max,25`

    await expect(
      parseCSV(csvWithDuplicateNameAndEmpty, 'duplicate-name-with-empty.csv')
    ).rejects.toThrow('CSV file contains duplicate column names: name.')
    await expect(
      parseCSV(csvWithDuplicateNameAndEmpty, 'duplicate-name-with-empty.csv')
    ).rejects.toThrow('CSV file contains duplicate column names: name.')
  })

  it('allows columns with whitespace (treated as empty) and loads successfully', async () => {
    const csvWithWhitespaceColumns = `name,  ,age,   ,
John,Middle,25,N/A,
Jane,Doe,30,Other,`

    const result = await parseCSV(csvWithWhitespaceColumns, 'whitespace-columns.csv')

    expect(result.headers).toEqual(['name', '  ', 'age', '   ', ''])
    expect(result.data).toEqual([
      { name: 'John', '  ': 'Middle', age: '25', '   ': 'N/A', col_5: '' },
      { name: 'Jane', '  ': 'Doe', age: '30', '   ': 'Other', col_5: '' }
    ])
  })

  it('handles CSV with special characters and complex data', async () => {
    const csvSample = `"id","user_id","order_number","shipping_first_name","shipping_last_name"
123456789,98765432,"ORD-TEST-001","John","Smith"`

    const result = await parseCSV(csvSample, 'sample-orders.csv')

    expect(result.headers).toEqual([
      'id',
      'user_id',
      'order_number',
      'shipping_first_name',
      'shipping_last_name'
    ])
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

    expect(result.headers).toEqual([
      'id',
      'user_id',
      'order_number',
      'shipping_first_name',
      'shipping_last_name'
    ])
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

    expect(result.headers).toEqual([
      'id',
      'user_id',
      'order_number',
      'shipping_first_name',
      'shipping_last_name'
    ])
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
      description:
        'Product "Special Edition" with features including bullets:\n- Feature 1\n- Feature 2'
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
        Email: 'josray3543@gmail.com'
      },
      {
        'First Name': 'Johnson',
        'Last Name': 'Tracy',
        'Store Credit Amount': '65',
        '': '',
        Email: 'Tracyjhn5@aol.com'
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
      { '': 'John', age: '25', col_3: 'NYC' },
      { '': 'Jane', age: '30', col_3: 'LA' }
    ])
  })

  it('handles single-column CSV with no delimiters correctly', async () => {
    const singleColumnCSV = `Partner Companies
nova-skin-therapy
unity-health-systems
vertex-medical-group
azure-eye-care-center`

    const result = await parseCSV(singleColumnCSV, 'single-column.csv')

    expect(result.headers).toEqual(['Partner Companies'])
    expect(result.data).toEqual([
      { 'Partner Companies': 'nova-skin-therapy' },
      { 'Partner Companies': 'unity-health-systems' },
      { 'Partner Companies': 'vertex-medical-group' },
      { 'Partner Companies': 'azure-eye-care-center' }
    ])
  })

  it('handles single-column CSV with realistic data from user example', async () => {
    const singleColumnCSV = `Partner Companies
zenith-dental-clinic
boreal-medical-associates
crystal-wellness-center
diamond-family-practice
echo-primary-care-clinic
falcon-sports-medicine
glacier-orthopedic-group
harmony-mental-health
indigo-cardiology-institute
jade-neurology-center
kestrel-physical-therapy
lark-urgent-care
marble-dermatology-practice
nebula-oncology-center
oasis-emergency-services
pearl-obstetrics-group
quasar-surgical-associates
raven-womens-health
sage-general-medicine
tundra-pediatrics-clinic
umbra-urology-specialists
vapor-nutrition-services
willow-skin-care-center
xavier-pharmacy-services
yarn-imaging-radiology
zodiac-obstetrics-practice
apex-senior-living-center
bravo-trauma-care-unit
charlie-critical-medicine
delta-rehab-services
echo-pathology-lab
foxtrot-endocrine-group
golf-gastroenterology-center
hotel-pulmonary-medicine
indigo-rheumatology-care
juliet-arthritis-treatment
kilo-sleep-disorder-clinic
lima-healthcare-managers
mike-cardiovascular-care
november-wound-healing
oscar-infectious-diseases
papa-oncology-treatment
quebec-reproductive-health
romeo-emergency-medicine
sierra-pediatric-care
tango-internal-medicine
uniform-allergy-specialists
victor-general-surgery
whiskey-rehabilitation
xray-imaging-services
yankee-laboratory-testing`

    const result = await parseCSV(singleColumnCSV, 'user-example-single-column.csv')

    expect(result.headers).toEqual(['Partner Companies'])
    expect(result.data).toHaveLength(51) // All non-empty rows after filtering
    expect(result.data[0]).toEqual({
      'Partner Companies': 'zenith-dental-clinic'
    })
    expect(result.data[50]).toEqual({
      'Partner Companies': 'yankee-laboratory-testing'
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
      { Numbers: '1' },
      { Numbers: '2' },
      { Numbers: '3' },
      { Numbers: '4' },
      { Numbers: '5' }
    ])
  })

  it('handles CSV with BOM prefix correctly (BOM is stripped automatically)', async () => {
    const csvWithoutBOM = `name,age,city
John,25,NYC
Jane,30,LA`

    const csvWithBOM = `\uFEFFname,age,city
John,25,NYC
Jane,30,LA`

    const resultWithoutBOM = await parseCSV(csvWithoutBOM, 'test-without-bom.csv')
    const resultWithBOM = await parseCSV(csvWithBOM, 'test-with-bom.csv')

    expect(resultWithBOM.headers).toEqual(resultWithoutBOM.headers)
    expect(resultWithBOM.data).toEqual(resultWithoutBOM.data)
  })

  it('handles CSV with BOM and quoted headers correctly', async () => {
    const csvWithoutBOM = `"name","age","city"
"John","25","NYC"
"Jane","30","LA"`

    const csvWithBOM = `\uFEFF"name","age","city"
"John","25","NYC"
"Jane","30","LA"`

    const resultWithoutBOM = await parseCSV(csvWithoutBOM, 'quoted-without-bom.csv')
    const resultWithBOM = await parseCSV(csvWithBOM, 'quoted-with-bom.csv')

    expect(resultWithBOM.headers).toEqual(resultWithoutBOM.headers)
    expect(resultWithBOM.data).toEqual(resultWithoutBOM.data)
  })

  it('handles CSV with BOM and mixed quoted/unquoted data', async () => {
    const csvWithoutBOM = `"name",age,"city"
John,25,"NYC"
"Jane",30,LA`

    const csvWithBOM = `\uFEFF"name",age,"city"
John,25,"NYC"
"Jane",30,LA`

    const resultWithoutBOM = await parseCSV(csvWithoutBOM, 'mixed-without-bom.csv')
    const resultWithBOM = await parseCSV(csvWithBOM, 'mixed-with-bom.csv')

    expect(resultWithBOM.headers).toEqual(resultWithoutBOM.headers)
    expect(resultWithBOM.data).toEqual(resultWithoutBOM.data)
  })

  it('handles CSV with BOM and special characters', async () => {
    const csvWithoutBOM = `name,description
John,"Product ""Special Edition"" with features"
Jane,"Normal description with, commas"`

    const csvWithBOM = `\uFEFFname,description
John,"Product ""Special Edition"" with features"
Jane,"Normal description with, commas"`

    const resultWithoutBOM = await parseCSV(csvWithoutBOM, 'special-without-bom.csv')
    const resultWithBOM = await parseCSV(csvWithBOM, 'special-with-bom.csv')

    expect(resultWithBOM.headers).toEqual(resultWithoutBOM.headers)
    expect(resultWithBOM.data).toEqual(resultWithoutBOM.data)
    expect(resultWithBOM.data[0].description).toBe('Product "Special Edition" with features')
  })

  it('handles CSV with BOM and empty first row (just BOM)', async () => {
    const csvWithoutBOM = `
name,age
John,25`

    const csvWithBOM = `\uFEFF
name,age
John,25`

    const resultWithoutBOM = await parseCSV(csvWithoutBOM, 'empty-first-without-bom.csv')
    const resultWithBOM = await parseCSV(csvWithBOM, 'empty-first-with-bom.csv')

    expect(resultWithBOM.headers).toEqual(resultWithoutBOM.headers)
    expect(resultWithBOM.data).toEqual(resultWithoutBOM.data)
  })

  it('handles CSV with BOM and empty first row with delimiter', async () => {
    const csvWithoutBOM = `,
name,age
John,25`

    const csvWithBOM = `\uFEFF,
name,age
John,25`

    const resultWithoutBOM = await parseCSV(csvWithoutBOM, 'empty-delimiter-without-bom.csv')
    const resultWithBOM = await parseCSV(csvWithBOM, 'empty-delimiter-with-bom.csv')

    expect(resultWithBOM.headers).toEqual(resultWithoutBOM.headers)
    expect(resultWithBOM.data).toEqual(resultWithoutBOM.data)
  })
})

describe('compareCSVData', () => {
  const leftData = [
    { email: 'alice@example.com', balance: 100 },
    { email: 'bob@example.com', balance: 200 },
    { email: 'charlie@example.com', balance: 300 }
  ]

  const rightData = [
    { email: 'alice@example.com', balance: 150 },
    { email: 'bob@example.com', balance: 200 },
    { email: 'diana@example.com', balance: 400 }
  ]

  it('compares two CSVs and returns correct matched rows', () => {
    const result = compareCSVData(leftData, rightData, 'email', 'balance')

    expect(result.keyColumnName).toBe('email')
    expect(result.valueColumnName).toBe('balance')
    expect(result.summary.total).toBe(4) // alice, bob, charlie, diana
    expect(result.summary.matched).toBe(2) // alice and bob
    expect(result.summary.onlyLeft).toBe(1) // charlie
    expect(result.summary.onlyRight).toBe(1) // diana
  })

  it('identifies only-left rows correctly', () => {
    const result = compareCSVData(leftData, rightData, 'email', 'balance')

    const charlieRow = result.rows.find((r) => r.keyValue === 'charlie@example.com')
    expect(charlieRow).toBeDefined()
    expect(charlieRow?.onlyLeft).toBe(true)
    expect(charlieRow?.onlyRight).toBe(false)
    expect(charlieRow?.leftValue).toBe(300)
    expect(charlieRow?.rightValue).toBeUndefined()
  })

  it('identifies only-right rows correctly', () => {
    const result = compareCSVData(leftData, rightData, 'email', 'balance')

    const dianaRow = result.rows.find((r) => r.keyValue === 'diana@example.com')
    expect(dianaRow).toBeDefined()
    expect(dianaRow?.onlyLeft).toBe(false)
    expect(dianaRow?.onlyRight).toBe(true)
    expect(dianaRow?.leftValue).toBeUndefined()
    expect(dianaRow?.rightValue).toBe(400)
  })

  it('shows both values for matched rows', () => {
    const result = compareCSVData(leftData, rightData, 'email', 'balance')

    const aliceRow = result.rows.find((r) => r.keyValue === 'alice@example.com')
    expect(aliceRow).toBeDefined()
    expect(aliceRow?.onlyLeft).toBe(false)
    expect(aliceRow?.onlyRight).toBe(false)
    expect(aliceRow?.leftValue).toBe(100)
    expect(aliceRow?.rightValue).toBe(150)

    const bobRow = result.rows.find((r) => r.keyValue === 'bob@example.com')
    expect(bobRow).toBeDefined()
    expect(bobRow?.leftValue).toBe(200)
    expect(bobRow?.rightValue).toBe(200)
  })

  it('handles empty left data', () => {
    const result = compareCSVData([], rightData, 'email', 'balance')

    expect(result.summary.total).toBe(3)
    expect(result.summary.onlyLeft).toBe(0)
    expect(result.summary.onlyRight).toBe(3)
    expect(result.summary.matched).toBe(0)
  })

  it('handles empty right data', () => {
    const result = compareCSVData(leftData, [], 'email', 'balance')

    expect(result.summary.total).toBe(3)
    expect(result.summary.onlyLeft).toBe(3)
    expect(result.summary.onlyRight).toBe(0)
    expect(result.summary.matched).toBe(0)
  })

  it('handles both empty data', () => {
    const result = compareCSVData([], [], 'email', 'balance')

    expect(result.summary.total).toBe(0)
    expect(result.summary.onlyLeft).toBe(0)
    expect(result.summary.onlyRight).toBe(0)
    expect(result.summary.matched).toBe(0)
    expect(result.rows).toEqual([])
  })

  it('performs case-sensitive comparison by default', () => {
    const left = [{ email: 'Alice@example.com', balance: 100 }]
    const right = [{ email: 'alice@example.com', balance: 150 }]

    const result = compareCSVData(left, right, 'email', 'balance')

    expect(result.summary.total).toBe(2)
    expect(result.summary.onlyLeft).toBe(1)
    expect(result.summary.onlyRight).toBe(1)
    expect(result.summary.matched).toBe(0)
  })

  it('performs case-insensitive comparison when option is set', () => {
    const left = [{ email: 'Alice@example.com', balance: 100 }]
    const right = [{ email: 'alice@example.com', balance: 150 }]

    const result = compareCSVData(left, right, 'email', 'balance', { caseInsensitive: true })

    expect(result.summary.total).toBe(1)
    expect(result.summary.onlyLeft).toBe(0)
    expect(result.summary.onlyRight).toBe(0)
    expect(result.summary.matched).toBe(1)
  })

  it('preserves original key value (prefers left) in case-insensitive mode', () => {
    const left = [{ email: 'Alice@example.com', balance: 100 }]
    const right = [{ email: 'alice@example.com', balance: 150 }]

    const result = compareCSVData(left, right, 'email', 'balance', { caseInsensitive: true })

    expect(result.rows[0].keyValue).toBe('Alice@example.com')
  })

  it('handles null values in key column', () => {
    const left = [
      { email: 'alice@example.com', balance: 100 },
      { email: null, balance: 999 }
    ]
    const right = [
      { email: 'alice@example.com', balance: 150 },
      { email: null, balance: 888 }
    ]

    const result = compareCSVData(left, right, 'email', 'balance')

    expect(result.summary.matched).toBe(2) // alice and null both match
    const nullRow = result.rows.find((r) => r.keyValue === null)
    expect(nullRow?.leftValue).toBe(999)
    expect(nullRow?.rightValue).toBe(888)
  })

  it('handles undefined values in key column', () => {
    const left = [{ email: undefined, balance: 100 }]
    const right = [{ email: undefined, balance: 200 }]

    const result = compareCSVData(left, right, 'email', 'balance')

    expect(result.summary.matched).toBe(1)
    expect(result.rows[0].keyValue).toBe(null) // undefined is converted to null
  })

  it('handles missing value column data', () => {
    const left = [{ email: 'alice@example.com' }]
    const right = [{ email: 'alice@example.com', balance: 150 }]

    const result = compareCSVData(left, right, 'email', 'balance')

    expect(result.summary.matched).toBe(1)
    expect(result.rows[0].leftValue).toBe(null) // undefined is converted to null
    expect(result.rows[0].rightValue).toBe(150)
  })

  it('handles duplicate keys in left data (last value wins)', () => {
    const left = [
      { email: 'alice@example.com', balance: 100 },
      { email: 'alice@example.com', balance: 999 }
    ]
    const right = [{ email: 'alice@example.com', balance: 150 }]

    const result = compareCSVData(left, right, 'email', 'balance')

    expect(result.summary.total).toBe(1)
    expect(result.rows[0].leftValue).toBe(999) // Last value overwrites
  })

  it('handles numeric key values', () => {
    const left = [
      { id: 1, value: 'A' },
      { id: 2, value: 'B' }
    ]
    const right = [
      { id: 1, value: 'X' },
      { id: 3, value: 'Y' }
    ]

    const result = compareCSVData(left, right, 'id', 'value')

    expect(result.summary.total).toBe(3)
    expect(result.summary.matched).toBe(1)
    expect(result.summary.onlyLeft).toBe(1)
    expect(result.summary.onlyRight).toBe(1)
  })

  it('does not mutate original data', () => {
    const originalLeft = JSON.parse(JSON.stringify(leftData))
    const originalRight = JSON.parse(JSON.stringify(rightData))

    compareCSVData(leftData, rightData, 'email', 'balance')

    expect(leftData).toEqual(originalLeft)
    expect(rightData).toEqual(originalRight)
  })
})
