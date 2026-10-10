import { fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CollectionConfirmPrompt from '@/components/orders/CollectionConfirmPrompt';

const mocks = vi.hoisted(() => ({ invoke: vi.fn(), update: vi.fn(), select: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {
  functions: { invoke: mocks.invoke },
  from: () => ({ update: mocks.update }),
} }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const onConfirmed = vi.fn();
function mount(date = '2020-01-01') {
  return render(<CollectionConfirmPrompt orderId="12345678-1234-4234-8234-123456789012" scheduledDate={date} scheduledTimeSlot="Morning (6 AM - 8 AM)" partnerPhone="+919876543210" onConfirmed={onConfirmed} />);
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.update.mockReturnValue({ eq: () => ({ select: mocks.select }) });
  mocks.select.mockResolvedValue({ data: [{ status: 'sample_collected' }], error: null });
  mocks.invoke.mockResolvedValue({ data: { success: true, partner_synced: true }, error: null });
});
afterEach(cleanup);

describe('No-show escalation', () => {
  it('No reveals options without submitting or changing an order', () => {
    mount();
    fireEvent.click(screen.getByRole('button', { name: /^No$/ }));
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.invoke).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: /^Yes$/ })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Call Partner' })).toHaveAttribute('href', 'tel:+919876543210');
  });
  it('keeps No disabled before the collection slot ends', () => {
    mount('2099-01-01');
    expect(screen.getByRole('button', { name: /^No$/ })).toBeDisabled();
  });
  it('requires a comment, submits once and confirms cancellation', async () => {
    mount();
    fireEvent.click(screen.getByRole('button', { name: /^No$/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Report Lab' }));
    expect(screen.getByRole('button', { name: 'Submit report' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Comment'), { target: { value: 'The collector did not arrive.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Submit report' }));
    await waitFor(() => expect(onConfirmed).toHaveBeenCalledWith('cancelled'));
    expect(mocks.invoke).toHaveBeenCalledTimes(1);
    expect(mocks.invoke).toHaveBeenCalledWith('report-no-show', { body: { orderId: '12345678-1234-4234-8234-123456789012', comment: 'The collector did not arrive.' } });
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it('retains comment and order when reporting fails', async () => {
    mocks.invoke.mockResolvedValue({ data: { error: 'Please try again' }, error: new Error('offline') });
    mount();
    fireEvent.click(screen.getByRole('button', { name: /^No$/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Report Lab' }));
    fireEvent.change(screen.getByLabelText('Comment'), { target: { value: 'The collector did not arrive.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Submit report' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Please try again');
    expect(onConfirmed).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Comment')).toHaveValue('The collector did not arrive.');
  });
  it('preserves the existing Yes mutation', async () => {
    mount();
    fireEvent.click(screen.getByRole('button', { name: /^Yes$/ }));
    await waitFor(() => expect(onConfirmed).toHaveBeenCalledWith('sample_collected'));
    expect(mocks.update).toHaveBeenCalledWith({ status: 'sample_collected' });
    expect(mocks.invoke).not.toHaveBeenCalled();
  });
});