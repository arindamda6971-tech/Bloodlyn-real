import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@/test-utils';
import { MemoryRouter } from 'react-router-dom';
import LabSelectionScreen from '@/pages/LabSelectionScreen';

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ supabaseUserId: 'test-user-id' })
}));

describe('LabSelectionScreen', () => {
  it('renders correctly without crashing', () => {
    const { container } = render(
      <MemoryRouter>
        <LabSelectionScreen />
      </MemoryRouter>
    );
    expect(container).toBeTruthy();
  });
});