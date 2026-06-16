import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import UsersTab from '../components/admin/UsersTab';
import * as apiModule from '../api/api';

jest.mock('../api/api');
jest.mock('lucide-react', () => ({
  AlertCircle: () => <svg />, ChevronDown: () => <svg />, ChevronRight: () => <svg />, X: () => <svg />,
}));

const mockedApiCall = apiModule.apiCall as jest.Mock;
beforeEach(() => { mockedApiCall.mockReset(); });

test('lists users and clears an override', async () => {
  // GET /users  +  GET /templates (for override dropdown)
  mockedApiCall
    .mockResolvedValueOnce({ code: 'success', message: [{ user_id: 'u1', email: 'alice@test.com', role_id: 4 }] })
    .mockResolvedValueOnce({ code: 'success', message: { templates: [{ id: 't1', name: 'Pro', description: 'd' }], count: 1 } });

  render(<UsersTab />);
  expect(await screen.findByText('alice@test.com')).toBeInTheDocument();

  // expand row -> GET scope + GET override
  mockedApiCall
    .mockResolvedValueOnce({ code: 'success', message: { video_model_1: true, audio_detection: false } })
    .mockResolvedValueOnce({ code: 'success', message: { user_id: 'u1', template_id: 't1', template_name: 'Pro', override_reason: 'vip' } });
  fireEvent.click(screen.getByRole('button', { name: /alice@test.com/i }));

  expect(await screen.findByText(/override: pro/i)).toBeInTheDocument();

  // clear override -> DELETE + refetch override(null)
  mockedApiCall
    .mockResolvedValueOnce({ code: 'success', message: { message: 'removed' } })
    .mockResolvedValueOnce({ code: 'success', message: null });
  fireEvent.click(screen.getByRole('button', { name: /clear override/i }));

  await waitFor(() => {
    const del = mockedApiCall.mock.calls.find(
      (c) => c[0].endpoint === '/api/v2/auth/users/u1/template-override' && c[0].method === 'DELETE'
    );
    expect(del).toBeTruthy();
  });
});
