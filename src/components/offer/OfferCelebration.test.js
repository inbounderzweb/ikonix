import React from 'react';
import { act, render, screen } from '@testing-library/react';
import OfferCelebration, { useOfferBurst } from './OfferCelebration';
import { useCart } from '../../context/CartContext';

jest.mock('../../context/CartContext', () => ({ useCart: jest.fn() }));

const freeItems = [{
  pid: '88',
  vid: '45',
  name: 'Inspired By Sauvage',
  variant_value: '30',
  free_qty: 1,
  original_price: 499,
  discount: 499,
  final_price: 0,
}];

function Celebration({ items = freeItems }) {
  const burst = useOfferBurst();
  return <OfferCelebration freeItems={items} burst={burst} />;
}

function setOfferTick(offerTick) {
  useCart.mockReturnValue({ offerTick });
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  window.matchMedia.mockImplementation((query) => ({ matches: false, media: query }));
  setOfferTick(0);
});

afterEach(() => {
  jest.useRealTimers();
});

test('loading an already eligible cart shows its free product without starting a burst', () => {
  const { container } = render(<Celebration />);

  expect(screen.getByRole('status')).toHaveTextContent('Congratulations! 1 bottle free');
  expect(screen.getByRole('status')).toHaveTextContent('Inspired By Sauvage — 30 ml × 1 free');
  expect(screen.getByRole('status')).toHaveTextContent('You save Rs.499.00/- on this order');
  expect(container.querySelector('.ikx-offer-confetti')).not.toBeInTheDocument();
});

test('a qualifying add celebrates the validated free product and each rapid add restarts the burst', () => {
  const { container, rerender } = render(<Celebration />);

  setOfferTick(1);
  rerender(<Celebration />);
  const firstBurst = container.querySelector('.ikx-offer-confetti');
  expect(firstBurst).toBeInTheDocument();
  expect(firstBurst.children).toHaveLength(36);

  act(() => jest.advanceTimersByTime(2000));
  setOfferTick(2);
  rerender(<Celebration />);
  const secondBurst = container.querySelector('.ikx-offer-confetti');
  expect(secondBurst).toBeInTheDocument();
  expect(secondBurst).not.toBe(firstBurst);
  expect(firstBurst).not.toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent('Inspired By Sauvage — 30 ml × 1 free');

  act(() => jest.advanceTimersByTime(600));
  expect(secondBurst).toBeInTheDocument();
  act(() => jest.advanceTimersByTime(2000));
  expect(container.querySelector('.ikx-offer-confetti')).not.toBeInTheDocument();
});

test('reduced motion keeps the congratulations and product details without confetti', () => {
  window.matchMedia.mockImplementation((query) => ({ matches: true, media: query }));
  const { container, rerender } = render(<Celebration />);

  setOfferTick(1);
  rerender(<Celebration />);

  expect(screen.getByRole('status')).toHaveTextContent('Congratulations! 1 bottle free');
  expect(screen.getByRole('status')).toHaveTextContent('Inspired By Sauvage — 30 ml × 1 free');
  expect(container.querySelector('.ikx-offer-confetti')).not.toBeInTheDocument();
});

test('a response without validated free products removes the celebration', () => {
  const { container, rerender } = render(<Celebration />);
  setOfferTick(1);
  rerender(<Celebration items={[]} />);

  expect(screen.queryByRole('status')).not.toBeInTheDocument();
  expect(container.querySelector('.ikx-offer-confetti')).not.toBeInTheDocument();
});
