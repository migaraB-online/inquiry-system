import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import NewInquiryPage from '../app/inquiries/new/page';
import { api } from '../lib/api';

// The page uses the router and a token check; replace them with simple fakes
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock('../lib/api', async () => {
  const actual = await vi.importActual<typeof import('../lib/api')>('../lib/api');
  return {
    ...actual,
    getToken: () => 'fake-token',
    api: { ...actual.api, createInquiry: vi.fn() },
  };
});

describe('New inquiry form', () => {
  it('shows validation messages and does not call the API when submitted empty', async () => {
    const user = userEvent.setup();
    render(<NewInquiryPage />);

    await user.click(screen.getByRole('button', { name: /save inquiry/i }));

    expect(screen.getByText('Customer name is required')).toBeInTheDocument();
    expect(screen.getByText(/phone number or email/i)).toBeInTheDocument();
    expect(screen.getByText('Subject is required')).toBeInTheDocument();
    expect(screen.getByText('Description is required')).toBeInTheDocument();
    expect(api.createInquiry).not.toHaveBeenCalled();
  });
});