import { renderHook, waitFor } from '@testing-library/react';
import { useMaintenance } from '../config/maintenance';
import { apiCall } from '../api/api';

jest.mock('../api/api');
const mockedApiCall = apiCall as jest.MockedFunction<typeof apiCall>;

describe('useMaintenance', () => {
  beforeEach(() => jest.clearAllMocks());

  it('exposes fetched settings', async () => {
    mockedApiCall.mockResolvedValue({ uploads_disabled: true, message: 'Down' });
    const { result } = renderHook(() => useMaintenance());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.uploadsDisabled).toBe(true);
    expect(result.current.message).toBe('Down');
  });

  it('fails open when the request errors', async () => {
    mockedApiCall.mockRejectedValue(new Error('network'));
    const { result } = renderHook(() => useMaintenance());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.uploadsDisabled).toBe(false);
  });
});
