// Dev: same-origin relative URLs → Vite proxy → kubectl port-forwards.
// Prod (GitHub Pages): public gateway host; app paths stay short (/auth, /upload, …).
export const API_URL = import.meta.env.DEV ? "" : "https://production.datambit.com";

/** @deprecated Prefer API_URL — identical host/path switching. */
export const DIRECT_API_URL = API_URL;

const headers = {
    "Content-Type": "application/json",
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

// Shared in-flight refresh so concurrent 401s wait on one request instead of failing.
let refreshPromise: Promise<boolean> | null = null;

const getJwtToken = (): string | null => {
    return localStorage.getItem('jwtToken') ?? sessionStorage.getItem('jwtToken') ?? null;
};

const getRefreshToken = (): string | null => {
    return localStorage.getItem('refreshToken') ?? sessionStorage.getItem('refreshToken') ?? null;
};

/**
 * Decode JWT payload for non-security UX only (e.g. expiry checks).
 * Claims are NOT verified and must NEVER be used for authorization decisions.
 */
export const getTokenClaims = (token: string | null): Record<string, unknown> | null => {
    if (!token) return null;
    try {
        const parts = token.split('.');
        if (parts.length < 2) return null;

        const base64Url = parts[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));

        return JSON.parse(jsonPayload);
    } catch {
        return null;
    }
};

export const isTokenExpired = (token: string | null): boolean => {
    if (!token) return true;
    try {
        const payload = getTokenClaims(token);
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

export const refreshAuthToken = async (): Promise<boolean> => {
    if (refreshPromise) {
        return refreshPromise;
    }

    refreshPromise = (async () => {
        const refreshToken = getRefreshToken();

        if (!refreshToken) {
            throw new Error("Refresh token missing");
        }

        try {
            const response = await fetch(`${API_URL}/auth/refresh`, {
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

            const data = await response.json();

            const useSessionStorage = !localStorage.getItem('jwtToken') && !!sessionStorage.getItem('jwtToken');
            saveTokens(data.message, refreshToken, useSessionStorage);

            return true;
        } catch (error) {
            console.error("Failed to refresh token:", error);
            return false;
        }
    })();

    try {
        return await refreshPromise;
    } finally {
        refreshPromise = null;
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
            window.location.href = '/login';
            throw new Error("Token missing");
        }

        if (isTokenExpired(token) && auto_refresh) {
            const refreshed = await refreshAuthToken();
            if (refreshed) {
                token = getJwtToken();
            } else {
                clearTokens();
                window.location.href = '/login';
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
    let response = await fetch(url, options);
    
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
                response = await fetch(url, options);
            }
        } else {
            // Clear tokens and redirect if refresh failed
            clearTokens();
            window.location.href = '/login';
            throw new Error("Authentication failed. Redirecting to login page.");
        }
    }
    
    if (!response.ok) {
        if (response.status === 401) {
            clearTokens();
            window.location.href = '/login';
        }
        // Error bodies are not always JSON (e.g. the dev proxy returns plain
        // text when a port-forward is down), so parse defensively.
        const text = await response.text();
        let message = `Error: ${response.status}`;
        try {
            const parsed = JSON.parse(text);
            message = parsed.message || parsed.error || message;
        } catch {
            if (text) {
                message = `Error: ${response.status} - ${text.slice(0, 200)}`;
            }
        }
        throw new Error(message);
    }

    return response.json();
};
