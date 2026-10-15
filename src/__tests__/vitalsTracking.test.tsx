import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TrackingScreen from '@/pages/TrackingScreen';

const mocks = vi.hoisted(() => ({ order: {} as Record<string, unknown>, invoke: vi.fn() }));
vi.mock('@/hooks/useOrderDetails', () => ({ useOrderDetails: () => ({ data: { order: mocks.order, items: [], testNames: [mocks.order.test_name] }, isLoading: false }) }));
vi.mock('@/hooks/useRealtimeOrders', () => ({ useRealtimeOrders: () => ({ latestStatus: null }) }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ supabaseUserId: 'user-1', user: { id: 'user-1' } }) }));
vi.mock('@/components/layout/MobileLayout', () => ({ default: ({ children }: { children: React.ReactNode }) => <main>{children}</main> }));
vi.mock('@/components/layout/ScreenHeader', () => ({ default: ({ title }: { title: string }) => <h1>{title}</h1> }));
vi.mock('@/components/orders/CancelOrderDialog', () => ({ default: () => null }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { functions: { invoke: mocks.invoke }, from: vi.fn() } }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

function mount(status: string, assigned = false, name = 'Home BP Check — Lab') {
  mocks.order = {
    id: '12345678-1234-4234-8234-123456789012', status, test_name: name,
    scheduled_date: '2020-01-01', scheduled_time_slot: 'Morning (6 AM - 8 AM)',
    delivery_partner_name: assigned ? 'Assigned Professional' : null,
    delivery_partner_phone: assigned ? '+919876543210' : null,
    total: 100, report_url: null,
  };
  render(<QueryClientProvider client={new QueryClient()}><MemoryRouter><TrackingScreen /></MemoryRouter></QueryClientProvider>);
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.invoke.mockResolvedValue({ data: { success: true, status: 'completed' }, error: null });
});
afterEach(cleanup);

describe('BP and ECG tracking', () => {
  it('waits for explicit acceptance before showing confirmation', () => {
    mount('confirmed');
    expect(screen.getAllByText(/accepted by the lab shortly/i).length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: 'Yes' })).not.toBeInTheDocument();
  });
  it('shows assignment pending after acceptance', () => {
    mount('accepted');
    expect(screen.getByText('The lab is assigning a service partner.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Yes' })).not.toBeInTheDocument();
  });
  it.each(['Home BP Check — Lab', '12-Lead ECG Test — Lab'])('confirms %s through the isolated service endpoint', async (name) => {
    mount('partner_assigned', true, name);
    expect(screen.getByText('Assigned Professional')).toBeInTheDocument();
    expect(screen.getByText('Was your BP or ECG check completed by our partner?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Yes' }));
    await waitFor(() => expect(mocks.invoke).toHaveBeenCalledWith('confirm-vitals-service', { body: { orderId: mocks.order.id } }));
  });
  it('completed vitals require no report or confirmation', () => {
    mount('completed', true);
    expect(screen.queryByRole('button', { name: 'Yes' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /View Reports/ })).not.toBeInTheDocument();
  });
  it('No preserves the existing call and report flow', () => {
    mount('partner_assigned', true);
    fireEvent.click(screen.getByRole('button', { name: 'No' }));
    expect(screen.getByRole('link', { name: 'Call Partner' })).toHaveAttribute('href', 'tel:+919876543210');
    expect(screen.getByRole('button', { name: 'Report Lab' })).toBeInTheDocument();
    expect(mocks.invoke).not.toHaveBeenCalled();
  });
  it('failed confirmation keeps Yes available and displays an error', async () => {
    mocks.invoke.mockResolvedValue({ data: { error: 'Please try again' }, error: new Error('offline') });
    mount('partner_assigned', true);
    fireEvent.click(screen.getByRole('button', { name: 'Yes' }));
    expect(await screen.findByText('Please try again')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Yes' })).toBeEnabled();
  });
});