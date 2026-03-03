import { render } from '@testing-library/react';
import App from './App';

test('renders app without crashing', () => {
  render(<App />);
  // Simple render test passes if no errors are thrown
  expect(true).toBeTruthy();
});
