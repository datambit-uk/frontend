import { apiCall, ApiNetworkError, loginUrl } from '../api/api';

// Minimal Response stand-in — apiCall only touches ok/status/json.
const mockResponse = (
  { ok, status, json }: { ok: boolean; status: number; json: () => Promise<unknown> }
) => ({ ok, status, json }) as unknown as Response;

const jsonResponse = (status: number, body: unknown) =>
  mockResponse({ ok: status >= 200 && status < 300, status, json: async () => body });

// A 404 from a misrouting load balancer returns HTML, so json() rejects.
const nonJsonResponse = (status: number) =>
  mockResponse({
    ok: false,
    status,
    json: async () => {
      throw new SyntaxError("Unexpected token '<', \"<html>\" is not valid JSON");
    },
  });

// Regression tests for the GitHub Pages login redirect: the app is served from
// the /frontend/ sub-path behind a HashRouter, so the session-expiry redirect
// must land on /frontend/#/login. Assigning a bare '/login' resolved against the
// origin root and served a 404, locking users out of the app entirely.
describe('loginUrl', () => {
  it('preserves the deployment sub-path and the hash route', () => {
    expect(loginUrl('/frontend/')).toBe('/frontend/#/login');
  });

  it('resolves to the hash route at the dev-server root', () => {
    expect(loginUrl('/')).toBe('/#/login');
  });

  it('handles a base path served without its trailing slash', () => {
    expect(loginUrl('/frontend')).toBe('/frontend/#/login');
  });

  it('keeps the sub-path when index.html is named explicitly', () => {
    expect(loginUrl('/frontend/index.html')).toBe('/frontend/index.html#/login');
  });

  it('never produces a root-absolute path that bypasses the hash router', () => {
    expect(loginUrl('/frontend/')).not.toBe('/login');
  });

  it('defaults to the current document path', () => {
    // jsdom serves the suite from http://localhost/
    expect(loginUrl()).toBe('/#/login');
  });
});

describe('apiCall', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    jest.restoreAllMocks();
  });

  describe('network failures', () => {
    // Regression test for the "Load Failed" login bug: a stale DNS A record sent
    // requests to a load balancer that answered the CORS preflight with a 404 and
    // no Access-Control-Allow-Origin, so fetch rejected with TypeError("Load failed")
    // and that raw string was rendered on the login form.
    it('converts a rejected fetch into ApiNetworkError, not the raw browser message', async () => {
      global.fetch = jest.fn().mockRejectedValue(new TypeError('Load failed'));

      await expect(apiCall({ endpoint: '/auth/login', method: 'POST' }))
        .rejects.toBeInstanceOf(ApiNetworkError);
    });

    it('never surfaces the raw "Load failed" text to the caller', async () => {
      global.fetch = jest.fn().mockRejectedValue(new TypeError('Load failed'));

      await expect(apiCall({ endpoint: '/auth/login', method: 'POST' }))
        .rejects.toThrow(/can't reach the server/i);
    });
  });

  describe('non-JSON error bodies', () => {
    it('reports the status code rather than a JSON parse error', async () => {
      global.fetch = jest.fn().mockResolvedValue(nonJsonResponse(404));

      await expect(apiCall({ endpoint: '/auth/login', method: 'POST' }))
        .rejects.toThrow('Error: 404');
    });
  });

  describe('successful requests', () => {
    it('resolves with the parsed body', async () => {
      global.fetch = jest.fn().mockResolvedValue(
        jsonResponse(200, { message: { access_token: 'a', refresh_token: 'r' } })
      );

      await expect(apiCall({ endpoint: '/auth/login', method: 'POST' }))
        .resolves.toEqual({ message: { access_token: 'a', refresh_token: 'r' } });
    });

    it('surfaces the API error message on a JSON error body', async () => {
      global.fetch = jest.fn().mockResolvedValue(
        jsonResponse(400, { message: 'Invalid credentials' })
      );

      await expect(apiCall({ endpoint: '/auth/login', method: 'POST' }))
        .rejects.toThrow('Invalid credentials');
    });
  });

  describe('401 refresh flow', () => {
    it('refreshes the token and retries the original request', async () => {
      localStorage.setItem('refreshToken', 'stored-refresh-token');

      const fetchMock = jest.fn()
        .mockResolvedValueOnce(jsonResponse(401, { message: 'expired' }))
        .mockResolvedValueOnce(jsonResponse(200, { message: 'new-jwt' }))
        .mockResolvedValueOnce(jsonResponse(200, { message: 'ok' }));
      global.fetch = fetchMock;

      await expect(apiCall({ endpoint: '/reports/list' })).resolves.toEqual({ message: 'ok' });

      expect(fetchMock).toHaveBeenCalledTimes(3);
      expect(fetchMock.mock.calls[1][0]).toContain('/auth/refresh');
      expect(localStorage.getItem('jwtToken')).toBe('new-jwt');
    });

    it('wraps a network failure during refresh as ApiNetworkError', async () => {
      localStorage.setItem('refreshToken', 'stored-refresh-token');

      global.fetch = jest.fn()
        .mockResolvedValueOnce(jsonResponse(401, { message: 'expired' }))
        .mockRejectedValueOnce(new TypeError('Load failed'));

      // Refresh fails, so the caller is told the server is unreachable rather than
      // being bounced to /login as if their session had genuinely expired.
      await expect(apiCall({ endpoint: '/reports/list' }))
        .rejects.toBeInstanceOf(ApiNetworkError);
    });
  });
});
