import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import Sidebar from '../components/SideBar';

const mockUseAuth = jest.fn();

jest.mock('../auth/AuthenticationContent', () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock('lucide-react', () => ({
  Home: () => <svg />,
  LogOut: () => <svg />,
  Clock: () => <svg />,
  FolderOpen: () => <svg />,
  BarChart3: () => <svg />,
  Shield: () => <svg />,
  LifeBuoy: () => <svg />,
}));

beforeEach(() => {
  mockUseAuth.mockReset();
});

test('hides admin nav for non-admins', () => {
  mockUseAuth.mockReturnValue({ isAdmin: false });
  render(
    <MemoryRouter>
      <Sidebar isOpen logout={jest.fn()} />
    </MemoryRouter>
  );
  expect(screen.queryByText('Admin Console')).not.toBeInTheDocument();
  expect(screen.queryByText('License Test')).not.toBeInTheDocument();
});

test('shows admin nav when server-backed isAdmin is true', async () => {
  mockUseAuth.mockReturnValue({ isAdmin: true });
  render(
    <MemoryRouter>
      <Sidebar isOpen logout={jest.fn()} />
    </MemoryRouter>
  );
  expect(await screen.findByText('Admin Console')).toBeInTheDocument();
  expect(screen.getByText('License Test')).toBeInTheDocument();
});

test('does not trust localStorage JWT role for admin nav', async () => {
  // Tampered token in storage must not affect SideBar — only useAuth().isAdmin.
  const fakePayload = btoa(JSON.stringify({ sub: JSON.stringify({ role: 4 }) }));
  localStorage.setItem('jwtToken', `hdr.${fakePayload}.sig`);
  mockUseAuth.mockReturnValue({ isAdmin: false });

  render(
    <MemoryRouter>
      <Sidebar isOpen logout={jest.fn()} />
    </MemoryRouter>
  );

  await waitFor(() => {
    expect(screen.queryByText('Admin Console')).not.toBeInTheDocument();
  });
  localStorage.removeItem('jwtToken');
});
