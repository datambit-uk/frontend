import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import AdminRoute from '../router/AdminRoute';

const mockUseAuth = jest.fn();

jest.mock('../auth/AuthenticationContent', () => ({
  useAuth: () => mockUseAuth(),
}));

function renderWithRoutes(authState: Record<string, unknown>) {
  mockUseAuth.mockReturnValue(authState);
  return render(
    <MemoryRouter initialEntries={['/group-management']}>
      <Routes>
        <Route path="/login" element={<div>Login Page</div>} />
        <Route path="/home" element={<div>Home Page</div>} />
        <Route
          path="/group-management"
          element={
            <AdminRoute>
              <div>Admin Console</div>
            </AdminRoute>
          }
        />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  mockUseAuth.mockReset();
});

test('redirects unauthenticated users to login', () => {
  renderWithRoutes({
    isAuthenticated: false,
    isAdmin: null,
    adminLoading: false,
  });
  expect(screen.getByText('Login Page')).toBeInTheDocument();
});

test('shows loading state while admin status is resolving', () => {
  renderWithRoutes({
    isAuthenticated: true,
    isAdmin: null,
    adminLoading: true,
  });
  expect(screen.getByText(/checking permissions/i)).toBeInTheDocument();
});

test('redirects non-admin authenticated users to home', () => {
  renderWithRoutes({
    isAuthenticated: true,
    isAdmin: false,
    adminLoading: false,
  });
  expect(screen.getByText('Home Page')).toBeInTheDocument();
});

test('renders children for platform admins', () => {
  renderWithRoutes({
    isAuthenticated: true,
    isAdmin: true,
    adminLoading: false,
  });
  expect(screen.getByText('Admin Console')).toBeInTheDocument();
});
