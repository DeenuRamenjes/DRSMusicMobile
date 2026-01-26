import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApiUrl } from '../config';

// Create axios instance - baseURL will be set dynamically in request interceptor
export const axiosInstance = axios.create({
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 30000, // 30 seconds for normal requests
});

// Create a separate instance for file uploads with longer timeout
export const uploadAxiosInstance = axios.create({
    // Don't set Content-Type header - axios will set it automatically with proper boundary for multipart/form-data
    timeout: 300000, // 5 minutes for file uploads
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
});

// Helper function for file uploads using XMLHttpRequest (more reliable in React Native for content:// URIs)
export const uploadWithFetch = async (
    endpoint: string,
    formData: FormData,
    onProgress?: (progress: number) => void,
    method: 'POST' | 'PATCH' = 'POST'
): Promise<any> => {
    const baseUrl = getApiUrl();
    const token = await AsyncStorage.getItem('authToken');

    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open(method, `${baseUrl}${endpoint}`);

        // Set auth header
        if (token) {
            xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        }

        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    const response = JSON.parse(xhr.responseText);
                    resolve(response);
                } catch (e) {
                    resolve(xhr.responseText);
                }
            } else {
                let errorData;
                try {
                    errorData = JSON.parse(xhr.responseText);
                } catch (e) {
                    errorData = { message: 'Upload failed' };
                }
                const error: any = new Error(errorData.message || 'Upload failed');
                error.response = { status: xhr.status, data: errorData };
                reject(error);
            }
        };

        xhr.onerror = () => {
            console.error('uploadWithFetch - XHR error');
            reject(new Error('Network request failed'));
        };

        xhr.ontimeout = () => {
            console.error('uploadWithFetch - timeout');
            reject(new Error('Upload timed out'));
        };

        // Set timeout to 5 minutes for large files
        xhr.timeout = 300000;

        // Track upload progress (optional)
        xhr.upload.onprogress = (event) => {
            if (event.lengthComputable && onProgress) {
                // Use a larger multiplier for event.total to ensure we don't hit 200% issues 
                // if the browser calculates total differently during stream
                let percentComplete = Math.round((event.loaded / event.total) * 100);

                // Clamp progress between 0 and 100
                percentComplete = Math.min(100, Math.max(0, percentComplete));

                onProgress(percentComplete);
            }
        };

        xhr.send(formData);
    });
};

// Helper function for file uploads using PUT with XMLHttpRequest
export const uploadWithFetchPut = async (
    endpoint: string,
    formData: FormData,
    onProgress?: (progress: number) => void
): Promise<any> => {
    const baseUrl = getApiUrl();
    const token = await AsyncStorage.getItem('authToken');

    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', `${baseUrl}${endpoint}`);

        if (token) {
            xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        }

        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    const response = JSON.parse(xhr.responseText);
                    resolve(response);
                } catch (e) {
                    resolve(xhr.responseText);
                }
            } else {
                let errorData;
                try {
                    errorData = JSON.parse(xhr.responseText);
                } catch (e) {
                    errorData = { message: 'Upload failed' };
                }
                const error: any = new Error(errorData.message || 'Upload failed');
                error.response = { status: xhr.status, data: errorData };
                reject(error);
            }
        };

        xhr.onerror = () => reject(new Error('Network request failed'));
        xhr.ontimeout = () => reject(new Error('Upload timed out'));
        xhr.timeout = 300000;

        // Track upload progress (optional)
        xhr.upload.onprogress = (event) => {
            if (event.lengthComputable && onProgress) {
                let percentComplete = Math.round((event.loaded / event.total) * 100);
                percentComplete = Math.min(100, Math.max(0, percentComplete));
                onProgress(percentComplete);
            }
        };

        xhr.send(formData);
    });
};

// Request interceptor for main instance
axiosInstance.interceptors.request.use(
    async (config) => {
        // Dynamically get the current API URL (allows runtime switching)
        config.baseURL = getApiUrl();

        try {
            const token = await AsyncStorage.getItem('authToken');
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        } catch (error) {
            // Ignore
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Request interceptor for upload instance
uploadAxiosInstance.interceptors.request.use(
    async (config) => {
        config.baseURL = getApiUrl();

        try {
            const token = await AsyncStorage.getItem('authToken');
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        } catch (error) {
            // Ignore
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor
axiosInstance.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor for upload instance
uploadAxiosInstance.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default axiosInstance;
