import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { readFileSync } from 'fs'
import { writeFile } from 'fs/promises'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import * as XLSX from 'xlsx'

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    icon,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  // Set the dock icon on macOS
  if (process.platform === 'darwin') {
    app.dock?.setIcon(icon)
  }

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  // File operations
  ipcMain.handle('select-file', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [
        { name: 'CSV and Excel Files', extensions: ['csv', 'xlsx'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    })
    if (result.canceled || result.filePaths.length === 0) {
      return null
    }
    const filePath = result.filePaths[0]

    // Check if it's an Excel file
    const isExcel = filePath.toLowerCase().endsWith('.xlsx')

    let content: string
    if (isExcel) {
      try {
        // Read Excel file and convert first sheet to CSV
        const workbook = XLSX.readFile(filePath)

        // Validate that the workbook has exactly one sheet
        if (workbook.SheetNames.length !== 1) {
          throw new Error(
            `Excel file must contain exactly one sheet. This file has ${workbook.SheetNames.length} sheets: ${workbook.SheetNames.join(', ')}. Please ensure only one worksheet exists (visible or hidden) and try again.`
          )
        }

        const sheetName = workbook.SheetNames[0] // Use first sheet
        const worksheet = workbook.Sheets[sheetName]
        content = XLSX.utils.sheet_to_csv(worksheet)
      } catch (error) {
        if (error instanceof Error && error.message.includes('must contain exactly one sheet')) {
          throw error // Re-throw validation errors as-is
        }
        throw new Error(
          `Failed to read Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      }
    } else {
      // Read as CSV file
      content = readFileSync(filePath, 'utf-8')
    }

    return { content, filePath }
  })

  ipcMain.handle('save-file', async (_, content: string) => {
    const result = await dialog.showSaveDialog({
      filters: [{ name: 'CSV Files', extensions: ['csv'] }]
    })
    if (!result.canceled && result.filePath) {
      await writeFile(result.filePath, content, 'utf-8')
    }
  })

  ipcMain.handle('save-file-with-name', async (_, content: string, suggestedName: string) => {
    const result = await dialog.showSaveDialog({
      filters: [{ name: 'CSV Files', extensions: ['csv'] }],
      defaultPath: suggestedName
    })
    if (!result.canceled && result.filePath) {
      await writeFile(result.filePath, content, 'utf-8')
    }
  })

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
