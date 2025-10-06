import '@testing-library/jest-dom'

// Mock Electron API for tests
Object.defineProperty(window, 'api', {
  value: {
    selectFile: jest.fn(),
    saveFile: jest.fn()
  }
})
