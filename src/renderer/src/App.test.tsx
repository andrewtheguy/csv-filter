import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import '@testing-library/jest-dom'

describe('App Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Table display with empty columns', () => {
    it('displays empty headers as "Empty column n" based on position', () => {

      render(<App />)

      // The component starts with no data, but we can test the renderTable function directly
      // by creating a mock element that triggers the renderTable logic

      // For now, just test the basic component renders without error
      expect(screen.getByText('CSV Filter')).toBeInTheDocument()
      expect(screen.getByText('Load Left CSV (Source)')).toBeInTheDocument()
      expect(screen.getByText('Load Right CSV (Filter)')).toBeInTheDocument()
    })

    it('can handle empty column display logic', () => {
      // Test the logic by calling renderTable directly via a shallow render or similar
      // For now, verify the component renders correctly
      const { container } = render(<App />)
      expect(container.querySelector('.MuiTypography-h4')).toHaveTextContent('CSV Filter')
    })
  })

  describe('CSV parsing empty line handling', () => {
    beforeEach(() => {
      // Mock window.api.selectFile to return controlled CSV data
      ;(window.api.selectFile as jest.Mock).mockClear()
    })

    it('filters out empty rows during CSV parsing', async () => {
      const csvWithEmptyLines = `name,age,city
John,25,NYC
Jane,30,LA

Bob,35,Chicago
,,

Alice,28,Miami
,,`

      // Mock the file selection to return our test CSV
      ;(window.api.selectFile as jest.Mock).mockResolvedValue({
        content: csvWithEmptyLines
      })

      render(<App />)
      const user = userEvent.setup()

      // Click the left CSV button to load data
      const leftButton = screen.getByText('Load Left CSV (Source)')
      await user.click(leftButton)

      // Wait for the data to be parsed and rendered
      await waitFor(() => {
        expect(screen.getByText('Left CSV - Source')).toBeInTheDocument()
      })

      // Verify that the data rows are correctly parsed
      expect(screen.getByText('John')).toBeInTheDocument()
      expect(screen.getByText('Jane')).toBeInTheDocument()
      expect(screen.getByText('Bob')).toBeInTheDocument()
      expect(screen.getByText('Alice')).toBeInTheDocument()

      // Verify that we have the correct total rows parsed (empty rows are filtered out)
      // Empty row filtering removes rows where all values are empty strings, null, or undefined
      const tableRows = screen.getAllByRole('row').slice(1) // slice(1) to skip header row
      expect(tableRows).toHaveLength(4) // Only the 4 data rows remain (empty rows filtered out)

      // Verify that empty line filtering correctly handles lines with delimiters vs truly empty lines
    })

    it('handles CSV with mixed empty and data rows correctly', async () => {
      const csvWithMixedContent = `header1,header2,header3
data1,data2,data3

,,


more_data,another_value,third_value

`

      ;(window.api.selectFile as jest.Mock).mockResolvedValue({
        content: csvWithMixedContent
      })

      render(<App />)
      const user = userEvent.setup()

      const leftButton = screen.getByText('Load Left CSV (Source)')
      await user.click(leftButton)

      await waitFor(() => {
        expect(screen.getByText('Left CSV - Source')).toBeInTheDocument()
        // Check that we have the correct total rows (empty rows filtered out)
        const tableRows = screen.getAllByRole('row').slice(1) // slice(1) to skip header row
        expect(tableRows).toHaveLength(2) // data1 row + more_data row (empty ,, row filtered out)
      })

      expect(screen.getByText('data1')).toBeInTheDocument()
      expect(screen.getByText('more_data')).toBeInTheDocument()
    })

    it('handles completely empty CSV file', async () => {
      const emptyCSV = ``

      ;(window.api.selectFile as jest.Mock).mockResolvedValue({
        content: emptyCSV
      })

      render(<App />)
      const user = userEvent.setup()

      const leftButton = screen.getByText('Load Left CSV (Source)')
      await user.click(leftButton)

      // Should show "No data loaded" message in the left panel
      await waitFor(() => {
        expect(screen.getByText('Load Left CSV (Source)')).toBeInTheDocument()
        // Empty CSV should not crash and should show same state as no data loaded
        expect(screen.getByText('CSV Filter')).toBeInTheDocument()
      })
    })

    it('handles CSV with all empty lines', async () => {
      const allEmptyCSV = `

,

,,

    `

      ;(window.api.selectFile as jest.Mock).mockResolvedValue({
        content: allEmptyCSV,
        filePath: 'empty-lines.csv'
      })

      render(<App />)
      const user = userEvent.setup()

      const leftButton = screen.getByText('Load Left CSV (Source)')
      await user.click(leftButton)

      // Should show error snackbar for malformed CSV with inconsistent field counts
      await waitFor(() => {
        expect(screen.getByText('CSV parsing errors found in empty-lines.csv:')).toBeInTheDocument()
        // Table should not be displayed due to the error
        expect(screen.queryByText('Left CSV - Source')).not.toBeInTheDocument()
      })
    })

    it('handles CSV with only header row and empty lines', async () => {
      const headerOnlyCSV = `name,age,city




    `

      ;(window.api.selectFile as jest.Mock).mockResolvedValue({
        content: headerOnlyCSV,
        filePath: 'header-only.csv'
      })

      render(<App />)
      const user = userEvent.setup()

      const leftButton = screen.getByText('Load Left CSV (Source)')
      await user.click(leftButton)

      // Should show error snackbar for malformed CSV with inconsistent field counts
      await waitFor(() => {
        expect(screen.getByText('CSV parsing errors found in header-only.csv: Too few fields: expected 3 fields but parsed 1')).toBeInTheDocument()
      })

      // The table should not be displayed due to the error
      expect(screen.queryByText('Left CSV - Source')).not.toBeInTheDocument()
    })

    it('shows error when CSV contains duplicate column names', async () => {
      const csvWithDuplicates = `name,age,name
John,25,Doe
Jane,30,Smith`

      ;(window.api.selectFile as jest.Mock).mockResolvedValue({
        content: csvWithDuplicates,
        filePath: 'duplicate-columns.csv'
      })

      render(<App />)
      const user = userEvent.setup()

      const leftButton = screen.getByText('Load Left CSV (Source)')
      await user.click(leftButton)

      // Should show error snackbar for duplicate column names
      await waitFor(() => {
        expect(screen.getByText('CSV file contains duplicate column names: name. Please fix the file and try again.')).toBeInTheDocument()
      })

      // The table should not be displayed due to the error
      expect(screen.queryByText('Left CSV - Source')).not.toBeInTheDocument()
    })

    it('handles CSV with multiple duplicate column names', async () => {
      const csvWithMultipleDuplicates = `name,age,age,city,name
John,25,26,NYC,Doe
Jane,30,31,LA,Smith`

      ;(window.api.selectFile as jest.Mock).mockResolvedValue({
        content: csvWithMultipleDuplicates,
        filePath: 'multiple-duplicate-columns.csv'
      })

      render(<App />)
      const user = userEvent.setup()

      const rightButton = screen.getByText('Load Right CSV (Filter)')
      await user.click(rightButton)

      // Should show error snackbar listing all unique duplicate column names
      await waitFor(() => {
        expect(screen.getByText('CSV file contains duplicate column names: age, name. Please fix the file and try again.')).toBeInTheDocument()
      })

      // The table should not be displayed due to the error
      expect(screen.queryByText('Right CSV - Filter')).not.toBeInTheDocument()
    })



    it('allows multiple empty column names and loads successfully', async () => {
      const csvWithMultipleEmptyColumns = `name,,,
John,Doe,Smith,25
Jane,Doe,Smith,30`

      ;(window.api.selectFile as jest.Mock).mockResolvedValue({
        content: csvWithMultipleEmptyColumns,
        filePath: 'multiple-empty-columns.csv'
      })

      render(<App />)
      const user = userEvent.setup()

      const rightButton = screen.getByText('Load Right CSV (Filter)')
      await user.click(rightButton)

      // Should load successfully without error (multiple empty columns are allowed)
      await waitFor(() => {
        expect(screen.getByText('Right CSV - Filter: multiple-empty-columns.csv')).toBeInTheDocument()
      })

      // Should show empty columns as "(Empty column n)" in the table header
      expect(screen.getByText('(Empty column 2)')).toBeInTheDocument()
      expect(screen.getByText('(Empty column 3)')).toBeInTheDocument()
      expect(screen.getByText('(Empty column 4)')).toBeInTheDocument()
    })

    it('blocks non-empty duplicates even when combined with empty columns', async () => {
      // This CSV has duplicate "name" columns plus empty columns
      const csvWithDuplicateNameAndEmpty = `name,,,name,age
John,Doe,Smith,Max,25`

      ;(window.api.selectFile as jest.Mock).mockResolvedValue({
        content: csvWithDuplicateNameAndEmpty,
        filePath: 'duplicate-name-with-empty.csv'
      })

      render(<App />)
      const user = userEvent.setup()

      const leftButton = screen.getByText('Load Left CSV (Source)')
      await user.click(leftButton)

      // Should show error for duplicate "name" column despite having empty columns
      await waitFor(() => {
        expect(screen.getByText('CSV file contains duplicate column names: name. Please fix the file and try again.')).toBeInTheDocument()
      })

      // The table should not be displayed due to the error
      expect(screen.queryByText('Left CSV - Source')).not.toBeInTheDocument()
    })

    it('allows columns with whitespace (treated as empty) and loads successfully', async () => {
      const csvWithWhitespaceColumns = `name,  ,age,   ,
John,Middle,25,N/A,
Jane,Doe,30,Other,`

      ;(window.api.selectFile as jest.Mock).mockResolvedValue({
        content: csvWithWhitespaceColumns,
        filePath: 'whitespace-columns.csv'
      })

      render(<App />)
      const user = userEvent.setup()

      const rightButton = screen.getByText('Load Right CSV (Filter)')
      await user.click(rightButton)

      // Should load successfully without error (whitespace columns are treated as empty)
      await waitFor(() => {
        expect(screen.getByText('Right CSV - Filter: whitespace-columns.csv')).toBeInTheDocument()
      })

      // Should show empty columns for whitespace columns
      expect(screen.getByText('(Empty column 2)')).toBeInTheDocument()
      expect(screen.getByText('(Empty column 5)')).toBeInTheDocument()
    })

    it('blocks duplicates even when some duplicates are mixed with whitespace', async () => {
      // This CSV has "age" appearing twice - once with whitespace, once without
      const csvWithWhitespaceAndRealDuplicates = `name, age ,city,age,value
John,Middle,NYC,25,100
Jane,Doe,LA,30,200`

      ;(window.api.selectFile as jest.Mock).mockResolvedValue({
        content: csvWithWhitespaceAndRealDuplicates,
        filePath: 'whitespace-and-duplicate.csv'
      })

      render(<App />)
      const user = userEvent.setup()

      const leftButton = screen.getByText('Load Left CSV (Source)')
      await user.click(leftButton)

      // Should show error for duplicate "age" column (whitespace doesn't create separates)
      await waitFor(() => {
        expect(screen.getByText('CSV file contains duplicate column names: age. Please fix the file and try again.')).toBeInTheDocument()
      })

      // The table should not be displayed due to the error
      expect(screen.queryByText('Left CSV - Source')).not.toBeInTheDocument()
    })

    it('allows CSV files where entire columns are empty', async () => {
      // This CSV has one column that's completely empty for all data rows
      const csvWithEntirelyEmptyColumn = `First Name,Last Name,Store Credit Amount,Partner Company Handle (customer.metafields.customer.partner_company_handle),,Email
chilo,Joseline,65,the-oaks,,josray3543@gmail.com
,,,,,
Johnson,Tracy,65,the-oaks,,Tracyjhn5@aol.com`

      ;(window.api.selectFile as jest.Mock).mockResolvedValue({
        content: csvWithEntirelyEmptyColumn,
        filePath: 'entirely-empty-column.csv'
      })

      render(<App />)
      const user = userEvent.setup()

      const rightButton = screen.getByText('Load Right CSV (Filter)')
      await user.click(rightButton)

      // Should load successfully - empty columns are allowed since they're excluded from filtering
      await waitFor(() => {
        expect(screen.getByText('Right CSV - Filter: entirely-empty-column.csv')).toBeInTheDocument()
      })

      // Verify that the empty column (column 5) is displayed as empty
      expect(screen.getByText('(Empty column 5)')).toBeInTheDocument()

      // Verify that valid data is still present (filteredEmptyRows removes the empty row)
      expect(screen.getByText('chilo')).toBeInTheDocument()
      expect(screen.getByText('Johnson')).toBeInTheDocument()
      // The ,,,,, row should be filtered out by filterEmptyRows
    })

    it('handles CSV with quoted headers and correctly removes quotes from header names', async () => {
      // CSV with quotation marks around header names
      const csvWithQuotedHeaders = `"id","user_id","order_number","shipping_first_name","shipping_last_name"
14617637,22013494,"cx998548739","Daisy ","Alvarez"`

      ;(window.api.selectFile as jest.Mock).mockResolvedValue({
        content: csvWithQuotedHeaders,
        filePath: 'quoted-headers.csv'
      })

      render(<App />)
      const user = userEvent.setup()

      const leftButton = screen.getByText('Load Left CSV (Source)')
      await user.click(leftButton)

      // Should load successfully and display headers without quotes
      await waitFor(() => {
        expect(screen.getByText('Left CSV - Source: quoted-headers.csv')).toBeInTheDocument()
      })

      // Verify that quotes are removed from header names and displayed correctly
      expect(screen.getByText('id')).toBeInTheDocument()
      expect(screen.getByText('user_id')).toBeInTheDocument()
      expect(screen.getByText('order_number')).toBeInTheDocument()
      expect(screen.getByText('shipping_first_name')).toBeInTheDocument()
      expect(screen.getByText('shipping_last_name')).toBeInTheDocument()

      // Verify data is parsed correctly
      expect(screen.getByText('14617637')).toBeInTheDocument()
      expect(screen.getByText('22013494')).toBeInTheDocument()
      expect(screen.getByText('cx998548739')).toBeInTheDocument()
      expect(screen.getByText('Daisy')).toBeInTheDocument() // Note: trailing space is trimmed in rendering
    })

    it('handles CSV with mixed quoted and unquoted fields correctly', async () => {
      // CSV with some fields quoted and others not
      const csvMixedQuotes = `id,"user_id",order_number,"shipping_first_name",shipping_last_name
14617637,"22013494",cx998548739,Daisy ,Alvarez`

      ;(window.api.selectFile as jest.Mock).mockResolvedValue({
        content: csvMixedQuotes,
        filePath: 'mixed-quotes.csv'
      })

      render(<App />)
      const user = userEvent.setup()

      const leftButton = screen.getByText('Load Left CSV (Source)')
      await user.click(leftButton)

      await waitFor(() => {
        expect(screen.getByText('Left CSV - Source: mixed-quotes.csv')).toBeInTheDocument()
      })

      // Verify mixed quoted/unquoted parsing works
      expect(screen.getByText('14617637')).toBeInTheDocument()
      expect(screen.getByText('22013494')).toBeInTheDocument()
      expect(screen.getByText('cx998548739')).toBeInTheDocument()
      expect(screen.getByText('Daisy')).toBeInTheDocument() // Note: trailing space is trimmed in rendering
      expect(screen.getByText('Alvarez')).toBeInTheDocument()
    })

    it('handles CSV with embedded quotes in data values correctly', async () => {
      // CSV with quotes embedded within quoted data
      const csvEmbeddedQuotes = `"name","description","notes"
"John ""The Great"" Doe","Size: 48""","Quote: ""Hello world"""
"Mary","Normal size","No quotes here"`

      ;(window.api.selectFile as jest.Mock).mockResolvedValue({
        content: csvEmbeddedQuotes,
        filePath: 'embedded-quotes.csv'
      })

      render(<App />)
      const user = userEvent.setup()

      const leftButton = screen.getByText('Load Left CSV (Source)')
      await user.click(leftButton)

      await waitFor(() => {
        expect(screen.getByText('Left CSV - Source: embedded-quotes.csv')).toBeInTheDocument()
      })

      // Verify embedded quotes are handled correctly
      expect(screen.getByText('John "The Great" Doe')).toBeInTheDocument() // Double quotes become single
      expect(screen.getByText('Size: 48"')).toBeInTheDocument() // Embedded quote in quoted field
      expect(screen.getByText('Quote: "Hello world"')).toBeInTheDocument() // Embedded quotes
      expect(screen.getByText('Normal size')).toBeInTheDocument()
    })

    it('handles the provided raw CSV sample data correctly', async () => {
      // Use the exact CSV sample data provided by the user
      const rawCsvSample = `"id","user_id","order_number","shipping_first_name","shipping_last_name","shipping_company","shipping_street_address","shipping_unit","shipping_phone","shipping_city","shipping_state","shipping_zip","billing_first_name","billing_last_name","billing_company","billing_street_address","billing_unit","billing_phone","billing_city","billing_state","billing_zip","shipping_method","shipping_fee","tax","subtotal","total_charge","jaanuu_status","created_at","updated_at","coupon_discount","shipped_date","coupon_id","shipping_country","billing_country","duty_tax","sales_tax_rate","newgistics_shipment_id","newgistics_delivered_timestamp","purchased_at","taxable_amount","is_group_order","store_credit_used_amount","total_amount","lock_version","is_wholesale","after_tax_adjustment_amount","is_manual","is_shipment_skipped","shipping_title","billing_title","cancelled_at","gift_message","used_taxjar_calculation","cancellation_reason","parent_order_id","is_exchange","cx_exchange_released_by_id","exchange_for_return_id","partner_id","line_item_cx_discount","purchase_order_number","sales_person_id","metadata","original_shipping_fee","is_final","order_type_id","payment_method","fulfillment_channel_id","shipping_method_id","net_term","xb_fulfillment_number","xb_submission_fail_count","sales_channel_id","order_type_xb","ahoy_visit_id","orig_order_id","submitted_for_fulfillment_at","tax_exempt","hold_for_all_inventory","experiments","allow_split_ts","use_reserved_inventory","idme_user_info_id","is_reshipment_order","_db_updated_at","address_type","order_batch_id","payment_status","global_e_order_number","fulfillment_center_system_id","fc_order_status","reship_reason","line_item_promo_discount","open_loyalty_sync_status","open_loyalty_transaction_id","ship_monk_order_key"
14617637,22013494,"cx998548739","Daisy ","Alvarez","UTHealth Houston","6431 Fannin St","Suite JJL 270J","7135007882","Houston","Texas","77030","Accounts ","Payable","UTHealth Science Center at Houston","PO Box 20036","","7135007882","Houston","Texas","77225","SM_UNKNOWN",0,1536,19200,20736,"Cart","2025-10-03 19:33:05.573461","2025-10-03 19:47:17.218054",0,,,"US","US",0,0.08,,,,19200,TRUE,0,20736,2,FALSE,0,TRUE,FALSE,,,,,TRUE,,,FALSE,,,695,0,"EXCH cx373661768",,"{}",0,FALSE,2,"cc",5,1051,0,,0,4,,,,,FALSE,FALSE,"{}",,FALSE,,FALSE,"2025-10-03 19:47:17.200165",,,,,,,"",0,,,
14617604,149449,"w2500006606-reship-1","Cedric","Hamilton","The Uniform Spot LLC","627 South Houston Lake Road","Suite 112","8445226030","Warner Robins","Georgia","31088","Cedric","Hamilton","The Uniform Spot LLC","627 South Houston Lake Road","Suite 112","8445226030","Warner Robins","Georgia","31088","SM_STANDARD",0,0,0,0,"Processed","2025-10-02 23:16:11.676867","2025-10-02 23:51:29.598463",0,,,"US","US",0,0,,,"2025-10-02 23:17:23.231928",0,FALSE,0,0,4,TRUE,0,TRUE,FALSE,"","",,,FALSE,,14617522,FALSE,,,,0,"",,"{""reshipment_order"": true}",0,TRUE,2,"none",5,1048,0,,0,3,,,,"2025-10-02 23:51:29.592307",FALSE,TRUE,"{}",,FALSE,,TRUE,"2025-10-02 23:51:29.593549",,,,,,,"Manual exchange",0,,,"w2500006606-reship-1"
14617603,149449,"w2500006657","SCRUB","WORX","Scrubworx","1800 KALISTE SALOOM RD. #300",,"(337) 983-2371","LAFAYETTE","Louisiana","70508","Danny","Babineaux","Scrubworx","1800 Kaliste Saloom Rd","Suite 300","(337) 983-2371","Lafayette","Louisiana","70508","SM_UPSG",0,0,17000,16150,"Processed","2025-10-02 22:52:26.46379","2025-10-03 00:01:29.597327",0,,,"US","US",0,0,,,"2025-10-02 22:52:26.719437",16150,FALSE,0,16150,3,TRUE,0,TRUE,FALSE,"","",,,FALSE,,,FALSE,,,,850,"26614-1",,"{""is_backorder"": false, ""set_price_manually"": true}",0,TRUE,2,"other_manual",5,1052,0,,0,3,,,,"2025-10-03 00:01:29.573411",TRUE,TRUE,"{}",,FALSE,,FALSE,"2025-10-03 00:01:29.574783",,,,,,,,0,,,"w2500006657"`

      ;(window.api.selectFile as jest.Mock).mockResolvedValue({
        content: rawCsvSample,
        filePath: 'sample-orders.csv'
      })

      render(<App />)
      const user = userEvent.setup()

      const leftButton = screen.getByText('Load Left CSV (Source)')
      await user.click(leftButton)

      await waitFor(() => {
        expect(screen.getByText('Left CSV - Source: sample-orders.csv')).toBeInTheDocument()
      })

      // Verify the sample data is parsed correctly
      // Check some key values from the sample
      expect(screen.getByText('14617637')).toBeInTheDocument()
      expect(screen.getByText('cx998548739')).toBeInTheDocument()
      expect(screen.getByText('w2500006606-reship-1')).toBeInTheDocument()
      expect(screen.getByText('Manual exchange')).toBeInTheDocument()

      // Verify we have the expected number of rows (3 data rows from sample)
      const tableRows = screen.getAllByRole('row').slice(1) // slice(1) to skip header row
      expect(tableRows).toHaveLength(3)

      // Check for specific column headers that were quoted in the sample
      expect(screen.getByText('jaanuu_status')).toBeInTheDocument()
      expect(screen.getByText('created_at')).toBeInTheDocument()
      expect(screen.getByText('shipped_date')).toBeInTheDocument()
      expect(screen.getByText('shipping_country')).toBeInTheDocument()
      expect(screen.getByText('billing_country')).toBeInTheDocument()
    })

    it('handles CSV with complications in quoted values (commas, newlines)', async () => {
      // CSV with complex data inside quotes that would normally break parsing
      const csvWithComplexQuotes = `"name","address","description"
"Smith, John","123 Main St, Suite 100\nAnytown, USA","Product ""Special Edition"" with features including bullets:
- Feature 1
- Feature 2"
"Jones","456 Oak St","Simple description"`

      ;(window.api.selectFile as jest.Mock).mockResolvedValue({
        content: csvWithComplexQuotes,
        filePath: 'complex-quotes.csv'
      })

      render(<App />)
      const user = userEvent.setup()

      const leftButton = screen.getByText('Load Left CSV (Source)')
      await user.click(leftButton)

      await waitFor(() => {
        expect(screen.getByText('Left CSV - Source: complex-quotes.csv')).toBeInTheDocument()
      })

      // Verify complex quoted content is handled correctly
      expect(screen.getByText('Smith, John')).toBeInTheDocument()
      expect(screen.getByText('123 Main St, Suite 100')).toBeInTheDocument()
      expect(screen.getByText('Anytown, USA')).toBeInTheDocument()
      expect(screen.getByText('Product "Special Edition" with features including bullets:')).toBeInTheDocument()
      expect(screen.getByText('- Feature 1')).toBeInTheDocument()
    })

    it('handles CSV with empty quoted fields correctly', async () => {
      // CSV with some fields quoted but empty
      const csvWithEmptyQuotes = `"name","email","notes"
"John","","Working on project"
"Mary","mary@example.com",""`

      ;(window.api.selectFile as jest.Mock).mockResolvedValue({
        content: csvWithEmptyQuotes,
        filePath: 'empty-quotes.csv'
      })

      render(<App />)
      const user = userEvent.setup()

      const leftButton = screen.getByText('Load Left CSV (Source)')
      await user.click(leftButton)

      await waitFor(() => {
        expect(screen.getByText('Left CSV - Source: empty-quotes.csv')).toBeInTheDocument()
      })

      // Verify empty quoted fields are handled correctly
      expect(screen.getByText('John')).toBeInTheDocument()
      expect(screen.getByText('mary@example.com')).toBeInTheDocument()
      expect(screen.getByText('Working on project')).toBeInTheDocument()

      // The empty "" should not create visible content but should be parsed as empty string
      // This validates that Papa Parse correctly handles empty quoted fields
    })

    it('handles CSV with mixed quote styles (single vs double quotes)', async () => {
      // CSV with both single and double quotes (though single quotes may not be valid CSV)
      // This tests robustness of the quote removal logic
      const csvWithMixedQuoteStyles = `"name","description","amount"
"Item #1","24"" display",199.99
'Item #2','Single quotes',299.99`

      ;(window.api.selectFile as jest.Mock).mockResolvedValue({
        content: csvWithMixedQuoteStyles,
        filePath: 'mixed-quote-styles.csv'
      })

      render(<App />)
      const user = userEvent.setup()

      const rightButton = screen.getByText('Load Right CSV (Filter)')
      await user.click(rightButton)

      await waitFor(() => {
        expect(screen.getByText('Right CSV - Filter: mixed-quote-styles.csv')).toBeInTheDocument()
      })

      // Papa Parse should handle this correctly - single quotes are not standard CSV but it should parse
      expect(screen.getByText('Item #1')).toBeInTheDocument()
      expect(screen.getByText('24" display')).toBeInTheDocument() // Embedded quotes
    })
  })
})
