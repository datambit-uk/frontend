import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import TemplatesTab from '../components/admin/TemplatesTab';
import * as apiModule from '../api/api';

jest.mock('../api/api');
jest.mock('lucide-react', () => ({
  PlusCircle: () => <svg />, Edit: () => <svg />, Trash2: () => <svg />, AlertCircle: () => <svg />,
}));

const mockedApiCall = apiModule.apiCall as jest.Mock;

beforeEach(() => {
  mockedApiCall.mockReset();
});

test('lists templates then creates one with flags + quotas', async () => {
  // initial list
  mockedApiCall.mockResolvedValueOnce({ code: 'success', message: { templates: [{ id: 't1', name: 'Basic', description: 'b' }], count: 1 } });
  render(<TemplatesTab />);
  expect(await screen.findByText('Basic')).toBeInTheDocument();

  // open create modal
  fireEvent.click(screen.getByRole('button', { name: /new template/i }));
  fireEvent.change(screen.getByLabelText(/^name$/i), { target: { value: 'Pro' } });
  fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'full' } });
  fireEvent.click(screen.getByLabelText(/audio detection/i));
  fireEvent.change(screen.getByLabelText(/max uploads per month/i), { target: { value: '500' } });

  // POST create, then refetch list
  mockedApiCall.mockResolvedValueOnce({ code: 'success', message: { id: 't2', name: 'Pro' } });
  mockedApiCall.mockResolvedValueOnce({ code: 'success', message: { templates: [], count: 0 } });
  fireEvent.click(screen.getByRole('button', { name: /^create$/i }));

  await waitFor(() => {
    const postCall = mockedApiCall.mock.calls.find(
      (c) => c[0].endpoint === '/api/v2/auth/templates' && c[0].method === 'POST'
    );
    expect(postCall).toBeTruthy();
    expect(postCall[0].body).toMatchObject({
      name: 'Pro', description: 'full', audio_detection: true, max_uploads_per_month: 500,
    });
  });
});
