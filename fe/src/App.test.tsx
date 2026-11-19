import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { expect, it } from 'vitest'
import App from './App'

it('renders the home page', () => {
  render(
    <MemoryRouter>
      <App />
    </MemoryRouter>,
  )
  expect(screen.getByRole('heading', { name: 'Fish Caring' })).toBeInTheDocument()
})

it('renders 404 for unknown routes', () => {
  render(
    <MemoryRouter initialEntries={['/nope']}>
      <App />
    </MemoryRouter>,
  )
  expect(screen.getByText('Không tìm thấy trang')).toBeInTheDocument()
})
