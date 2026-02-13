const API_URL = "https://production.datambit.com";

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

// Track if we're currently refreshing the token
let isRefreshing = false;

const getJwtToken = (): string | null => {
    return localStorage.getItem('jwtToken') ?? sessionStorage.getItem('jwtToken') ?? null;
};

const getRefreshToken = (): string | null => {
    return localStorage.getItem('refreshToken') ?? sessionStorage.getItem('refreshToken') ?? null;
};

const saveTokens = (jwt: string, refreshToken: string, useSessionStorage: boolean = false) => {
    const storage = useSessionStorage ? sessionStorage : localStorage;
    console.log(storage);
    localStorage.setItem('jwtToken', jwt);
    console.log(localStorage.getItem('jwtToken'));
    localStorage.setItem('refreshToken', refreshToken);
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
        const response = await fetch(`${API_URL}/api/v2/auth/refresh`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${refreshToken}`,
            }, 
            mode: "cors"
        });

        console.log(response)
        
        if (!response.ok) {
            throw new Error("Token refresh failed");
        }
        
        const data = await response.json();

        console.log(data.message)
        
        const useSessionStorage = !localStorage.getItem('jwtToken') && !!sessionStorage.getItem('jwtToken');
        saveTokens(data.message, refreshToken, useSessionStorage);
        
        return true;
    } catch (error) {
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
        const token = getJwtToken();
        if (token === null) {
            window.location.href = '/login';
            throw new Error("Token missing");
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
        console.log("UNATHHH")
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
            // localStorage.removeItem('jwtToken');
            // localStorage.removeItem('refreshToken');
            // sessionStorage.removeItem('jwtToken');
            // sessionStorage.removeItem('refreshToken');
            // window.location.href = '/login';
            throw new Error("Authentication failed. Redirecting to login page.");
        }
    }
    
    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(data.message || `Error: ${response.status}`);
    }
    
    return data;
};