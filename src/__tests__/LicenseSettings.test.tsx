import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import LicenseSettings from '../pages/LicenseSettings';
import * as apiModule from '../api/api';

// Mock the API module
jest.mock('../api/api');

// Mock lucide-react icons as SVG elements
jest.mock('lucide-react', () => ({
  AlertCircle: () => <svg data-testid="alert-icon">AlertIcon</svg>,
  RefreshCw: () => <svg data-testid="refresh-icon">RefreshIcon</svg>,
  Check: () => <svg data-testid="check-icon">CheckIcon</svg>,
  X: () => <svg data-testid="x-icon">XIcon</svg>,
}));

// Fixture matches the real backend contract:
// GET /api/v2/auth/users/me/license -> { code, message: <this> }
// (authentication-service PermissionController.get_user_license)
const mockLicenseData = {
  license_id: 'sub_acme_001',
  expires_at: '2026-12-31T00:00:00Z',
  subscription_active: true,
  permissions: {
    video_model_1: true,
    video_model_2: false,
    audio_detection: false,
    audio_transcription: true,
    reasoning: false,
  },
  usage_this_month: {
    uploads_used: 45,
    uploads_limit: 500,
    uploads_remaining: 455,
    gb_used: 2.5,
    max_file_size_mb: 500,
  },
  next_reset_date: '2026-07-15T00:00:00Z',
};

const mockSuccessResponse = {
  code: 'success',
  message: mockLicenseData,
};

describe('LicenseSettings Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn(() => 'mock-token'),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn(),
      },
      writable: true,
    });
    Object.defineProperty(window, 'sessionStorage', {
      value: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn(),
      },
      writable: true,
    });
  });

  // ============================================================================
  // Mount and Loading Tests
  // ============================================================================

  describe('Mount and Loading Tests', () => {
    test('test_renders_with_loading_state', async () => {
      const mockApiCall = jest.fn(() => new Promise(() => {})); // Never resolves
      (apiModule.apiCall as jest.Mock).mockImplementation(mockApiCall);

      render(<LicenseSettings />);

      expect(screen.getByText('Loading license information...')).toBeInTheDocument();
      const spinner = screen.getByText('Loading license information...').previousElementSibling;
      expect(spinner).toHaveClass('animate-spin');
    });

    test('test_renders_license_info', async () => {
      (apiModule.apiCall as jest.Mock).mockResolvedValue(mockSuccessResponse);

      render(<LicenseSettings />);

      await waitFor(() => {
        expect(screen.getByText('sub_acme_001')).toBeInTheDocument();
      });

      expect(screen.queryByText('Loading license information...')).not.toBeInTheDocument();
    });

    test('test_calls_license_endpoint_on_mount', async () => {
      (apiModule.apiCall as jest.Mock).mockResolvedValue(mockSuccessResponse);

      render(<LicenseSettings />);

      await waitFor(() => {
        expect(apiModule.apiCall).toHaveBeenCalledTimes(1);
      });

      expect(apiModule.apiCall).toHaveBeenCalledWith({
        endpoint: '/api/v2/auth/users/me/license',
        method: 'GET',
        jwtToken: true,
      });
    });
  });

  // ============================================================================
  // License Status Display Tests
  // ============================================================================

  describe('License Status Display', () => {
    beforeEach(() => {
      (apiModule.apiCall as jest.Mock).mockResolvedValue(mockSuccessResponse);
    });

    test('test_displays_license_id', async () => {
      render(<LicenseSettings />);

      await waitFor(() => {
        expect(screen.getByText('sub_acme_001')).toBeInTheDocument();
      });
    });

    test('test_displays_expiry_date', async () => {
      render(<LicenseSettings />);

      await waitFor(() => {
        expect(screen.getByText(/December 31, 2026/)).toBeInTheDocument();
      });
    });

    test('test_displays_active_status', async () => {
      render(<LicenseSettings />);

      await waitFor(() => {
        const statusText = screen.getByText('Active');
        expect(statusText).toBeInTheDocument();
        expect(statusText).toHaveClass('text-green-400');
      });
    });

    test('test_displays_expired_status', async () => {
      const expiredData = {
        code: 'success',
        message: {
          ...mockLicenseData,
          subscription_active: false,
        },
      };
      (apiModule.apiCall as jest.Mock).mockResolvedValue(expiredData);

      render(<LicenseSettings />);

      await waitFor(() => {
        const statusText = screen.getByText('Expired');
        expect(statusText).toBeInTheDocument();
        expect(statusText).toHaveClass('text-red-400');
      });
    });

    test('test_handles_null_expiry', async () => {
      const noExpiry = {
        code: 'success',
        message: { ...mockLicenseData, expires_at: null },
      };
      (apiModule.apiCall as jest.Mock).mockResolvedValue(noExpiry);

      render(<LicenseSettings />);

      await waitFor(() => {
        expect(screen.getByText('No expiry')).toBeInTheDocument();
      });
    });
  });

  // ============================================================================
  // Usage Progress Tests
  // ============================================================================

  describe('Usage Progress', () => {
    beforeEach(() => {
      (apiModule.apiCall as jest.Mock).mockResolvedValue(mockSuccessResponse);
    });

    test('test_displays_upload_progress', async () => {
      render(<LicenseSettings />);

      await waitFor(() => {
        expect(screen.getByText('45 / 500')).toBeInTheDocument();
      });
    });

    test('test_uploads_progress_bar_percentage', async () => {
      render(<LicenseSettings />);

      await waitFor(() => {
        // 45/500 = 9%
        expect(screen.getByText('9.0% used')).toBeInTheDocument();
      });
    });

    test('test_displays_data_processed', async () => {
      render(<LicenseSettings />);

      await waitFor(() => {
        expect(screen.getByText('2.50 GB')).toBeInTheDocument();
      });
    });

    test('test_displays_max_file_size', async () => {
      render(<LicenseSettings />);

      await waitFor(() => {
        expect(screen.getByText('500 MB')).toBeInTheDocument();
      });
    });

    test('test_handles_null_upload_limit', async () => {
      const noLimit = {
        code: 'success',
        message: {
          ...mockLicenseData,
          usage_this_month: { ...mockLicenseData.usage_this_month, uploads_limit: null },
        },
      };
      (apiModule.apiCall as jest.Mock).mockResolvedValue(noLimit);

      render(<LicenseSettings />);

      await waitFor(() => {
        expect(screen.getByText('45 (no limit)')).toBeInTheDocument();
      });
    });
  });

  // ============================================================================
  // Feature Access Table Tests
  // ============================================================================

  describe('Feature Access Table', () => {
    beforeEach(() => {
      (apiModule.apiCall as jest.Mock).mockResolvedValue(mockSuccessResponse);
    });

    test('test_displays_features', async () => {
      render(<LicenseSettings />);

      await waitFor(() => {
        expect(screen.getByText('Video Processing')).toBeInTheDocument();
        expect(screen.getByText('Audio Processing')).toBeInTheDocument();
        expect(screen.getByText('Transcription')).toBeInTheDocument();
        expect(screen.getByText('Reasoning')).toBeInTheDocument();
      });
    });

    test('test_feature_availability_checkmarks', async () => {
      render(<LicenseSettings />);

      await waitFor(() => {
        expect(screen.getByText('Video Processing')).toBeInTheDocument();
      });

      // video_model_1 + audio_transcription = 2 available
      const availableTexts = screen.getAllByText('Available');
      expect(availableTexts.length).toBe(2);
    });

    test('test_feature_availability_crosses', async () => {
      render(<LicenseSettings />);

      await waitFor(() => {
        expect(screen.getByText('Video Processing')).toBeInTheDocument();
      });

      // audio_detection + reasoning = 2 unavailable
      const unavailableTexts = screen.getAllByText('Unavailable');
      expect(unavailableTexts.length).toBe(2);
    });

    test('test_video_available_via_model_2', async () => {
      const videoViaModel2 = {
        code: 'success',
        message: {
          ...mockLicenseData,
          permissions: { ...mockLicenseData.permissions, video_model_1: false, video_model_2: true },
        },
      };
      (apiModule.apiCall as jest.Mock).mockResolvedValue(videoViaModel2);

      render(<LicenseSettings />);

      await waitFor(() => {
        // Video still available because video_model_2 is true
        expect(screen.getAllByText('Available').length).toBe(2);
      });
    });
  });

  // ============================================================================
  // Error Handling Tests
  // ============================================================================

  describe('Error Handling', () => {
    test('test_displays_error_on_fetch_failure', async () => {
      const errorMessage = 'Failed to fetch license data';
      (apiModule.apiCall as jest.Mock).mockRejectedValue(new Error(errorMessage));

      render(<LicenseSettings />);

      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });

      const errorElement = screen.getByText(errorMessage);
      expect(errorElement.parentElement).toHaveClass('text-red-200');
    });

    test('test_displays_error_message', async () => {
      const customError = 'Custom API error message';
      (apiModule.apiCall as jest.Mock).mockRejectedValue(new Error(customError));

      render(<LicenseSettings />);

      await waitFor(() => {
        expect(screen.getByText(customError)).toBeInTheDocument();
      });
    });

    test('test_displays_alert_icon_on_error', async () => {
      (apiModule.apiCall as jest.Mock).mockRejectedValue(new Error('API Error'));

      render(<LicenseSettings />);

      await waitFor(() => {
        expect(screen.getByTestId('alert-icon')).toBeInTheDocument();
      });
    });
  });

  // ============================================================================
  // Refresh Button Tests
  // ============================================================================

  describe('Refresh Button', () => {
    beforeEach(() => {
      (apiModule.apiCall as jest.Mock).mockResolvedValue(mockSuccessResponse);
    });

    test('test_refresh_button_refetches_data', async () => {
      render(<LicenseSettings />);

      await waitFor(() => {
        expect(screen.getByText('sub_acme_001')).toBeInTheDocument();
      });

      jest.clearAllMocks();
      (apiModule.apiCall as jest.Mock).mockResolvedValue(mockSuccessResponse);

      const refreshButton = screen.getByRole('button', { name: /Refresh/i });
      fireEvent.click(refreshButton);

      await waitFor(() => {
        expect(apiModule.apiCall).toHaveBeenCalled();
      });
    });

    test('test_refresh_button_enabled_after_load', async () => {
      (apiModule.apiCall as jest.Mock).mockResolvedValue(mockSuccessResponse);

      render(<LicenseSettings />);

      await waitFor(() => {
        expect(screen.getByText('sub_acme_001')).toBeInTheDocument();
      });

      const refreshButton = screen.getByRole('button', { name: /Refresh/i });
      expect(refreshButton).not.toBeDisabled();
    });

    test('test_refresh_clears_previous_error', async () => {
      const errorMessage = 'Initial API Error';
      (apiModule.apiCall as jest.Mock).mockRejectedValueOnce(new Error(errorMessage));

      render(<LicenseSettings />);

      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });

      (apiModule.apiCall as jest.Mock).mockResolvedValueOnce(mockSuccessResponse);

      const refreshButton = screen.getByRole('button', { name: /Refresh/i });
      fireEvent.click(refreshButton);

      await waitFor(() => {
        expect(screen.getByText('sub_acme_001')).toBeInTheDocument();
      });

      expect(screen.queryByText(errorMessage)).not.toBeInTheDocument();
    });
  });

  // ============================================================================
  // User Actions Tests
  // ============================================================================

  describe('User Actions', () => {
    beforeEach(() => {
      (apiModule.apiCall as jest.Mock).mockResolvedValue(mockSuccessResponse);
    });

    test('test_refresh_icon_visible_on_button', async () => {
      render(<LicenseSettings />);

      await waitFor(() => {
        expect(screen.getByText('sub_acme_001')).toBeInTheDocument();
      });

      expect(screen.getByTestId('refresh-icon')).toBeInTheDocument();
    });

    test('test_renders_header_title', async () => {
      render(<LicenseSettings />);

      await waitFor(() => {
        expect(screen.getByText('License & Usage Settings')).toBeInTheDocument();
      });
    });

    test('test_renders_all_section_headers', async () => {
      render(<LicenseSettings />);

      await waitFor(() => {
        expect(screen.getByText('License Status')).toBeInTheDocument();
        expect(screen.getByText('Usage Progress')).toBeInTheDocument();
        expect(screen.getByText('Feature Access')).toBeInTheDocument();
      });
    });
  });

  // ============================================================================
  // Integration Tests
  // ============================================================================

  describe('Integration Tests', () => {
    test('test_complete_flow_from_loading_to_display', async () => {
      (apiModule.apiCall as jest.Mock).mockResolvedValue(mockSuccessResponse);

      render(<LicenseSettings />);

      expect(screen.getByText('Loading license information...')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText('sub_acme_001')).toBeInTheDocument();
      });

      expect(screen.getByText('License & Usage Settings')).toBeInTheDocument();
      expect(screen.getByText('License Status')).toBeInTheDocument();
      expect(screen.getByText('Usage Progress')).toBeInTheDocument();
      expect(screen.getByText('Feature Access')).toBeInTheDocument();

      expect(screen.queryByText('Loading license information...')).not.toBeInTheDocument();
    });

    test('test_displays_reset_date', async () => {
      (apiModule.apiCall as jest.Mock).mockResolvedValue(mockSuccessResponse);

      render(<LicenseSettings />);

      await waitFor(() => {
        expect(screen.getByText(/July 15, 2026/)).toBeInTheDocument();
      });
    });
  });

  // ============================================================================
  // Edge Cases Tests
  // ============================================================================

  describe('Edge Cases', () => {
    test('test_handles_zero_usage', async () => {
      const zeroUsageData = {
        code: 'success',
        message: {
          ...mockLicenseData,
          usage_this_month: { ...mockLicenseData.usage_this_month, uploads_used: 0, gb_used: 0 },
        },
      };
      (apiModule.apiCall as jest.Mock).mockResolvedValue(zeroUsageData);

      render(<LicenseSettings />);

      await waitFor(() => {
        expect(screen.getByText('0 / 500')).toBeInTheDocument();
        expect(screen.getByText('0.0% used')).toBeInTheDocument();
        expect(screen.getByText('0.00 GB')).toBeInTheDocument();
      });
    });

    test('test_handles_100_percent_usage', async () => {
      const fullUsageData = {
        code: 'success',
        message: {
          ...mockLicenseData,
          usage_this_month: { ...mockLicenseData.usage_this_month, uploads_used: 500 },
        },
      };
      (apiModule.apiCall as jest.Mock).mockResolvedValue(fullUsageData);

      render(<LicenseSettings />);

      await waitFor(() => {
        expect(screen.getByText('500 / 500')).toBeInTheDocument();
        expect(screen.getByText('100.0% used')).toBeInTheDocument();
      });
    });

    test('test_handles_exceeding_limits', async () => {
      const overLimitData = {
        code: 'success',
        message: {
          ...mockLicenseData,
          usage_this_month: { ...mockLicenseData.usage_this_month, uploads_used: 600 },
        },
      };
      (apiModule.apiCall as jest.Mock).mockResolvedValue(overLimitData);

      render(<LicenseSettings />);

      await waitFor(() => {
        // Capped at 100%
        expect(screen.getByText('100.0% used')).toBeInTheDocument();
      });
    });
  });
});
