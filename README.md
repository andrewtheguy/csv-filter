# CSV Filter

An Electron application with React and TypeScript for filtering CSV data.

## Purpose

This project provides a desktop application that allows users to filter one CSV file (referred to as the "left CSV") based on the unique values found in a selected column of another CSV file (referred to as the "right CSV"). This is useful for tasks such as data reconciliation, identifying common or unique records, or cleaning datasets.

## Usage

1.  **Load CSV Files**: The application will prompt you to load two CSV files:
    *   **Left CSV**: This is the primary CSV file that will be filtered.
    *   **Right CSV**: This CSV file contains the reference data for filtering.
2.  **Select Filter Column**: From the "right CSV", select a column whose values will be used as the criteria for filtering.
3.  **Choose Filter Mode**:
    *   **Exclude**: Rows in the "left CSV" that have values matching any value in the selected "right CSV" column will be *excluded* from the results.
    *   **Include**: Only rows in the "left CSV" that have values matching any value in the selected "right CSV" column will be *included* in the results.
4.  **View and Export Results**: The application will display the filtered data. You can then export the filtered results as a new CSV file.

## Recommended IDE Setup

- [VSCode](https://code.visualstudio.com/) + [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) + [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)

## Project Setup

### Install

```bash
$ npm install
```

### Development

```bash
$ npm run dev
```

### Build

```bash
# For windows
$ npm run build:win

# For macOS
$ npm run build:mac

# For Linux
$ npm run build:linux
```
