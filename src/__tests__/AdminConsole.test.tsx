import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import AdminConsole from '../pages/AdminConsole';

jest.mock('../components/admin/GroupsTab', () => () => <div data-testid="groups-tab">G</div>);
jest.mock('../components/admin/TemplatesTab', () => () => <div data-testid="templates-tab">T</div>);
jest.mock('../components/admin/UsersTab', () => () => <div data-testid="users-tab">U</div>);
jest.mock('../components/admin/AccessTab', () => () => <div data-testid="access-tab">A</div>);
jest.mock('../components/admin/MaintenanceTab', () => () => <div data-testid="maintenance-tab">M</div>);
jest.mock('lucide-react', () => ({
  Shield: () => <svg />, Users: () => <svg />,
  SlidersHorizontal: () => <svg />, UserCog: () => <svg />, KeyRound: () => <svg />,
  Settings: () => <svg />,
}));

test('defaults to Groups tab and switches tabs on click', () => {
  render(<AdminConsole />);
  expect(screen.getByTestId('groups-tab')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /templates/i }));
  expect(screen.getByTestId('templates-tab')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /users/i }));
  expect(screen.getByTestId('users-tab')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /access/i }));
  expect(screen.getByTestId('access-tab')).toBeInTheDocument();

  fireEvent.click(screen.getByText('Maintenance'));
  expect(screen.getByTestId('maintenance-tab')).toBeInTheDocument();
});
