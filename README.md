# CSV Filter

A cross-platform desktop application built with Electron, React, and TypeScript for filtering and comparing CSV/Excel data.

## Features

- **Dual File Support**: Load and compare two CSV or Excel (.xlsx) files side by side
- **Filter Mode**: Filter one dataset based on values from another
- **Compare Mode**: VLOOKUP-style comparison to find matches, differences, and unique records
- **Excel Support**: Automatically converts single-sheet Excel files to CSV
- **Case-Insensitive Matching**: Optional toggle for case-insensitive operations
- **Export Results**: Save filtered or compared data as CSV files
- **Swap Function**: Quickly swap left and right datasets

## Usage

### Loading Files

1. Click **Load Left CSV (Source)** to load your primary data file
2. Click **Load Right CSV (Filter)** to load your reference/comparison file
3. Use the **Swap Left & Right** button to exchange datasets if needed

Supported formats: `.csv` and `.xlsx` (single-sheet Excel files)

### Filter Mode

Filter the left CSV based on values from the right CSV:

1. Select the **Filter** tab
2. Choose a column from the right CSV to use as filter criteria
3. Select filter mode:
   - **Exclude**: Remove rows where values match the right CSV column
   - **Include**: Keep only rows where values match the right CSV column
4. Optionally enable **Case insensitive** matching
5. Click **Export Filtered CSV** to save results

### Compare Mode

Perform VLOOKUP-style comparison between datasets:

1. Select the **Compare** tab
2. Choose a **Key Column** (identifier) from columns common to both files
3. Choose a **Value Column** (data to compare) from common columns
4. View color-coded results:
   - **Matched** (Green): Same key with identical values
   - **Diff** (Red): Same key but different values
   - **Only Left** (Orange): Key exists only in left CSV
   - **Only Right** (Blue): Key exists only in right CSV
5. Click **Export Comparison CSV** to save results

## Tech Stack

- **Frontend**: React 19, TypeScript, Material-UI (MUI)
- **Desktop**: Electron 38
- **Build**: Electron Vite, Electron Builder
- **CSV Parsing**: Papa Parse
- **Excel Support**: XLSX

## Project Setup

### Install

```bash
npm install
```

### Development

```bash
npm run dev
```

### Testing

```bash
npm run test
npm run test:watch
npm run test:coverage
```

### Build

```bash
# For Windows
npm run build:win

# For macOS
npm run build:mac

# For Linux
npm run build:linux
```

## Recommended IDE Setup

[VSCode](https://code.visualstudio.com/) + [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) + [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)
