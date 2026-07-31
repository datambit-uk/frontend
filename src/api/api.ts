export const API_URL = "https://production.datambit.com";

const headers = {
    "Content-Type": "application/json",
};

const NETWORK_ERROR_MESSAGE = "Can't reach the server. Check your connection and try again.";

/**
 * The request never reached the API — DNS, TLS, CORS or an offline client.
 * Distinct from an API that responded with an error status.
 */
export class ApiNetworkError extends Error {
    constructor(message: string = NETWORK_ERROR_MESSAGE) {
        super(message);
        this.name = "ApiNetworkError";
        // Required for `instanceof` to survive down-level compilation.
        Object.setPrototypeOf(this, ApiNetworkError.prototype);
    }
}

// fetch() rejects with a TypeError for every transport-level failure, and the
// browser's wording ("Load failed" in Safari, "Failed to fetch" in Chrome) is
// meaningless to users. Callers surface `error.message` directly, so that raw
// text must never escape this module.
const request = async (url: string, options: RequestInit): Promise<Response> => {
    try {
        return await fetch(url, options);
    } catch {
        throw new ApiNetworkError();
    }
};

// Error responses are not guaranteed to be JSON — a misrouted request can return
// an HTML error page, whose parse failure would otherwise reach the UI as
// "Unexpected token '<'".
const parseJsonBody = async (response: Response) => {
    try {
        return await response.json();
    } catch {
        return null;
    }
};

/**
 * Absolute-path URL of the login screen, for the hard redirects below.
 *
 * The app is served from a sub-path on GitHub Pages (/frontend/) behind a
 * HashRouter, so the login screen lives at `<base>#/login`. A bare '/login'
 * resolves against the origin root and 404s. `window.location.pathname` is the
 * base: a HashRouter never changes it after the document loads. It is read at
 * call time rather than from `import.meta.env.BASE_URL` so this module stays
 * loadable under ts-jest's CommonJS transform.
 */
export const loginUrl = (pathname: string = window.location.pathname): string =>
    `${pathname.endsWith('/') || pathname.includes('.') ? pathname : `${pathname}/`}#/login`;

const redirectToLogin = () => {
    window.location.href = loginUrl();
};

export interface ApiCallParams {
    endpoint: string;
    method?: string;
    body?: any;
    params?: Record<string, string>;
    jwtToken?: boolean;
    isFormData?: boolean;
    auto_refresh?: boolean
}

export interface RefreshTokenResponse {
    accessToken: string;
    refreshToken: string;
}

// Track if we're currently refreshing the token
let isRefreshing = false;

const getJwtToken = (): string | null => {
    return localStorage.getItem('jwtToken') ?? sessionStorage.getItem('jwtToken') ?? null;
};

const getRefreshToken = (): string | null => {
    return localStorage.getItem('refreshToken') ?? sessionStorage.getItem('refreshToken') ?? null;
};

export const isTokenExpired = (token: string | null): boolean => {
    if (!token) return true;
    try {
        const parts = token.split('.');
        if (parts.length < 2) return true;
        
        const base64Url = parts[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));

        const payload = JSON.parse(jsonPayload);
        if (!payload || typeof payload.exp !== 'number') return true;
        
        const now = Math.floor(Date.now() / 1000);
        return payload.exp < now;
    } catch (e) {
        return true;
    }
};

const saveTokens = (jwt: string, refreshToken: string, useSessionStorage: boolean = false) => {
    const storage = useSessionStorage ? sessionStorage : localStorage;
    storage.setItem('jwtToken', jwt);
    storage.setItem('refreshToken', refreshToken);
    window.dispatchEvent(new Event('auth-change'));
};

const clearTokens = () => {
    localStorage.removeItem('jwtToken');
    localStorage.removeItem('refreshToken');
    sessionStorage.removeItem('jwtToken');
    sessionStorage.removeItem('refreshToken');
    window.dispatchEvent(new Event('auth-change'));
};

const refreshAuthToken = async (): Promise<boolean> => {
    // If already refreshing, wait for the current refresh to complete
    if (isRefreshing) {
        return false;
    }

    isRefreshing = true;
    const refreshToken = getRefreshToken();
    
    if (!refreshToken) {
        isRefreshing = false;
        throw new Error("Refresh token missing");
    }
    
    try {
        const response = await request(`${API_URL}/auth/refresh`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${refreshToken}`,
            },
            mode: "cors"
        });

        if (!response.ok) {
            throw new Error("Token refresh failed");
        }

        const data = await parseJsonBody(response);

        if (!data?.message) {
            throw new Error("Token refresh failed");
        }

        const useSessionStorage = !localStorage.getItem('jwtToken') && !!sessionStorage.getItem('jwtToken');
        saveTokens(data.message, refreshToken, useSessionStorage);

        return true;
    } catch (error) {
        // An unreachable server is not an expired session — let it propagate so the
        // caller reports a connection problem instead of forcing a logout.
        if (error instanceof ApiNetworkError) {
            throw error;
        }
        console.error("Failed to refresh token:", error);
        return false;
    } finally {
        isRefreshing = false;
    }
};

const appendParamsToUrl = (url: string, params: Record<string, string>) => {
    const urlParams = new URLSearchParams(params).toString();
    return urlParams ? `${url}?${urlParams}` : url;
};

export const apiCall = async ({
    endpoint,
    method = "GET",
    body = null,
    params = {},
    jwtToken = false,
    isFormData = false,
    auto_refresh = true
}: ApiCallParams): Promise<any> => {
    let url = `${API_URL}${endpoint}`;
    
    if (Object.keys(params).length > 0) {
        url = appendParamsToUrl(url, params);
    }
    
    const requestHeaders: Record<string, string> = { ...headers };

    if (isFormData && requestHeaders["Content-Type"]) {
        delete requestHeaders["Content-Type"];
    }
    
    if (jwtToken) {
        let token = getJwtToken();
        if (token === null) {
            redirectToLogin();
            throw new Error("Token missing");
        }

        if (isTokenExpired(token) && auto_refresh) {
            const refreshed = await refreshAuthToken();
            if (refreshed) {
                token = getJwtToken();
            } else {
                clearTokens();
                redirectToLogin();
                throw new Error("Session expired. Redirecting to login page.");
            }
        }
        
        requestHeaders["Authorization"] = `Bearer ${token}`;
    }

    const options: RequestInit = {
        method,
        headers: requestHeaders,
        mode: "cors"
    };

    if (body) {
        options.body = isFormData ? body : JSON.stringify(body);
    }

    // First attempt
    let response = await request(url, options);
    
    // If unauthorized and we haven't tried refreshing yet
    if (auto_refresh && response.status === 401 ) {
        const refreshed = await refreshAuthToken();
        
        if (refreshed) {
            // Update the authorization header with the new token
            const newToken = getJwtToken();
            if (newToken) {
                options.headers = {
                    ...options.headers,
                    Authorization: `Bearer ${newToken}`
                };
                
                // Second attempt with new token
                response = await request(url, options);
            }
        } else {
            // Clear tokens and redirect if refresh failed
            clearTokens();
            redirectToLogin();
            throw new Error("Authentication failed. Redirecting to login page.");
        }
    }
    
    const data = await parseJsonBody(response);

    if (!response.ok) {
        if (response.status === 401) {
            clearTokens();
            redirectToLogin();
        }
        throw new Error(data?.message || `Error: ${response.status}`);
    }

    if (data === null) {
        throw new Error("Received an invalid response from the server.");
    }

    return data;
};