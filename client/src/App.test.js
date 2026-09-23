import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the booking client', () => {
  render(<App />);
  expect(screen.getByText('Đặt lịch dễ dàng.')).toBeInTheDocument();
});
