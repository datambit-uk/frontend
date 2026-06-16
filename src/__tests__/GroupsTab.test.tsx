import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import GroupsTab from '../components/admin/GroupsTab';
import * as apiModule from '../api/api';

jest.mock('../api/api');
jest.mock('lucide-react', () => ({
  Users: () => <svg />, UserPlus: () => <svg />, Trash2: () => <svg />, Edit: () => <svg />,
  ChevronRight: () => <svg />, ShieldAlert: () => <svg />, PlusCircle: () => <svg />, ArrowLeft: () => <svg />,
}));

const mockedApiCall = apiModule.apiCall as jest.Mock;
beforeEach(() => { mockedApiCall.mockReset(); jest.spyOn(window, 'alert').mockImplementation(() => {}); });

test('selecting a group then assigning a template posts {template_id}', async () => {
  // initial: GET groups (raw array) + GET templates (envelope)
  mockedApiCall
    .mockResolvedValueOnce([{ id: 'g1', name: 'Acme', domain: null, is_auto_domain: false, created_at: '2026-01-01T00:00:00Z' }])
    .mockResolvedValueOnce({ code: 'success', message: { templates: [{ id: 't1', name: 'Pro', description: 'd' }], count: 1 } });

  render(<GroupsTab />);
  const card = await screen.findByText('Acme');

  // select group: GET members (raw) + GET group template (envelope, null)
  mockedApiCall
    .mockResolvedValueOnce([])
    .mockResolvedValueOnce({ code: 'success', message: null });
  fireEvent.click(card);

  // pick template, assign: POST assign + GET group template refetch
  const select = await screen.findByRole('combobox');
  mockedApiCall
    .mockResolvedValueOnce({ code: 'success', message: { recomputed_users: 3 } })
    .mockResolvedValueOnce({ code: 'success', message: { template_name: 'Pro' } });
  fireEvent.change(select, { target: { value: 't1' } });
  fireEvent.click(screen.getByRole('button', { name: /^assign$/i }));

  await waitFor(() => {
    const post = mockedApiCall.mock.calls.find(
      (c) => c[0].endpoint === '/api/v2/auth/groups/g1/template' && c[0].method === 'POST'
    );
    expect(post).toBeTruthy();
    expect(post[0].body).toEqual({ template_id: 't1' });
  });
});
