import { useState, useEffect } from "react";
import { apiCall, ApiCallParams } from "./api";

interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

const useApi = <T>({
  endpoint,
  method = "GET",
  body = null,
  params = {},
  jwtToken = false,
  isFormData = false
}: ApiCallParams) => {
  
    const [state, setState] = useState<ApiState<T>>({
        data: null,
        loading: true,  
        error: null,   
    });

    useEffect(() => {
        const fetchData = async () => {
        try {
            
            setState((prevState) => ({ ...prevState, loading: true, error: null }));

            const data = await apiCall({
                endpoint,
                method,
                body,
                params,
                jwtToken,
                isFormData
            });

            setState({ data, loading: false, error: null });

        } catch (error: any) {
            
            setState({
            data: null,
            loading: false,
            error: error.message || "An error occurred",
            });
        }
        };

        fetchData();
    }, [endpoint, method, body, params, jwtToken]); 

    return state;
    };

export default useApi;
