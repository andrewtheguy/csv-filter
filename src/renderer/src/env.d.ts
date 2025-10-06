/// <reference types="vite/client" />

interface Window {
  api: {
    selectFile: () => Promise<{ content: string; filePath: string } | null>
    saveFile: (content: string) => Promise<void>
    saveFileWithName: (content: string, suggestedName: string) => Promise<void>
  }
}
