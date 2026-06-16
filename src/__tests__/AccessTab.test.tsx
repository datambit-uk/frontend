import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AccessTab from '../components/admin/AccessTab';
import * as apiModule from '../api/api';

jest.mock('../api/api');
jest.mock('lucide-react', () => ({
  AlertCircle: () => <svg />, ChevronDown: () => <svg />, ChevronRight: () => <svg />,
  KeyRound: () => <svg />, Copy: () => <svg />, Check: () => <svg />,
}));

const mockedApiCall = apiModule.apiCall as jest.Mock;
beforeEach(() => { mockedApiCall.mockReset(); });

test('generates an access code and shows it', async () => {
  mockedApiCall.mockResolvedValueOnce({ code: 'success', message: [] }); // GET users
  render(<AccessTab />);
  await waitFor(() => expect(mockedApiCall).toHaveBeenCalled());

  mockedApiCall.mockResolvedValueOnce({
    code: 'success',
    message: { email: 'bob@acme.com', access_code: '123456' },
  });
  fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'bob@acme.com' } });
  fireEvent.click(screen.getByRole('button', { name: /generate/i }));

  expect(await screen.findByText('123456')).toBeInTheDocument();
  const post = mockedApiCall.mock.calls.find(
    (c) => c[0].endpoint === '/api/v2/auth/save/generate-access-code'
  );
  expect(post[0].method).toBe('POST');
  expect(post[0].body).toEqual({ email: 'bob@acme.com', role: 4 });
});

test('updates a user role', async () => {
  mockedApiCall.mockResolvedValueOnce({
    code: 'success',
    message: [{ user_id: 'u1', email: 'alice@acme.com', role_id: 5 }],
  });
  render(<AccessTab />);
  expect(await screen.findByText('alice@acme.com')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /alice@acme.com/i }));

  const select = screen.getByRole('combobox', { name: /change role/i });
  fireEvent.change(select, { target: { value: '4' } });

  mockedApiCall
    .mockResolvedValueOnce({ code: 'success', message: [] }) // POST update role
    .mockResolvedValueOnce({ code: 'success', message: [{ user_id: 'u1', email: 'alice@acme.com', role_id: 4 }] }); // refetch
  fireEvent.click(screen.getByRole('button', { name: /^save$/i }));

  await waitFor(() => {
    const post = mockedApiCall.mock.calls.find(
      (c) => c[0].endpoint === '/api/v2/auth/update/user/role'
    );
    expect(post).toBeTruthy();
    expect(post[0].method).toBe('POST');
    expect(post[0].body).toEqual({ user_id: 'u1', role_id: 4 });
  });
});
