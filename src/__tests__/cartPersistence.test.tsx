import React from 'react';
import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { render } from '@/test-utils';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, Link } from 'react-router-dom';
import { CartProvider, useCart } from '@/contexts/CartContext';

// Home component that adds an item
const Home = () => {
  const { addToCart } = useCart();
  return (
    <div>
      <button onClick={() => addToCart({ id: 'test-1', name: 'Test 1', price: 100 })}>
        Add Test
      </button>
      <Link to="/cart">Go to Cart</Link>
    </div>
  );
};

// Cart view that reads items from context
const CartView = () => {
  const { items } = useCart();
  return (
    <div>
      <div data-testid="cart-items-count">{items.length}</div>
      {items.map((it: any) => (
        <div key={it.id} data-testid="cart-item-name">{it.name}</div>
      ))}
      <Link to="/">Back Home</Link>
    </div>
  );
};

describe('Cart persistence across navigation', () => {
  it('keeps items after navigating away and back', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={["/"]}>
        <CartProvider>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/cart" element={<CartView />} />
          </Routes>
        </CartProvider>
      </MemoryRouter>
    );

    // Add item on Home
    await user.click(screen.getByText('Add Test'));

    // Navigate to cart
    await user.click(screen.getByText('Go to Cart'));

    // Assert item present
    expect(await screen.findByTestId('cart-items-count')).toHaveTextContent('1');
    expect(screen.getByTestId('cart-item-name')).toHaveTextContent('Test 1');

    // Navigate back home and then back to cart
    await user.click(screen.getByText('Back Home'));
    await user.click(screen.getByText('Go to Cart'));

    // Assert item still present
    expect(await screen.findByTestId('cart-items-count')).toHaveTextContent('1');
    expect(screen.getByTestId('cart-item-name')).toHaveTextContent('Test 1');
  });
});
