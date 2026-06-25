import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';

test('renders navigation links', () => {
  render(
    <MemoryRouter>
      <App />
    </MemoryRouter>
  );

  expect(screen.getByText(/📊 Dashboard/)).toBeInTheDocument();
  expect(screen.getByText(/📦 Inventario/)).toBeInTheDocument();
  expect(screen.getByText(/🛒 Pedidos/)).toBeInTheDocument();
});
