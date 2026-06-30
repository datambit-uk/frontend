import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import MaintenanceTab from '../components/admin/MaintenanceTab';
import { apiCall } from '../api/api';

jest.mock('../api/api');
const mockedApiCall = apiCall as jest.MockedFunction<typeof apiCall>;

describe('MaintenanceTab', () => {
  beforeEach(() => jest.clearAllMocks());

  it('loads current settings and saves an update', async () => {
    mockedApiCall.mockResolvedValueOnce({ uploads_disabled: false, message: 'Hi' });
    render(<MaintenanceTab />);

    await waitFor(() =>
      expect(screen.getByDisplayValue('Hi')).toBeInTheDocument()
    );

    mockedApiCall.mockResolvedValueOnce({ uploads_disabled: true, message: 'Hi' });
    fireEvent.click(screen.getByTestId('maintenance-toggle'));
    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() =>
      expect(mockedApiCall).toHaveBeenLastCalledWith(
        expect.objectContaining({
          endpoint: '/api/v2/auth/maintenance',
          method: 'PUT',
          jwtToken: true,
          body: expect.objectContaining({ uploads_disabled: true, message: 'Hi' }),
        })
      )
    );
  });
});
