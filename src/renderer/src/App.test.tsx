import { render, screen } from '@testing-library/react'
import App from './App'
import '@testing-library/jest-dom'

describe('App Component', () => {
  describe('Basic UI rendering', () => {
    it('displays the main heading and buttons', () => {
      render(<App />)

      expect(screen.getByText('CSV Filter')).toBeInTheDocument()
      expect(screen.getByText('Load Left CSV (Source)')).toBeInTheDocument()
      expect(screen.getByText('Load Right CSV (Filter)')).toBeInTheDocument()
    })

    it('renders without crashing', () => {
      const { container } = render(<App />)
      expect(container.querySelector('.MuiTypography-h4')).toHaveTextContent('CSV Filter')
    })
  })
})
