import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

describe('App Component', () => {
  it('renders the lobby by default', () => {
    render(<App />);
    expect(screen.getByText(/5 SEKUND/i)).toBeDefined();
    expect(screen.getByText(/STWÓRZ POKÓJ/i)).toBeDefined();
  });
});
