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
    formData: FormData
): Promise<any> => {
    const baseUrl = getApiUrl();
    const token = await AsyncStorage.getItem('authToken');
    
    console.log('uploadWithFetch - baseUrl:', baseUrl);
    console.log('uploadWithFetch - endpoint:', endpoint);
    console.log('uploadWithFetch - token exists:', !!token);
    
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${baseUrl}${endpoint}`);
        
        // Set auth header
        if (token) {
            xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        }
        
        xhr.onload = () => {
            console.log('uploadWithFetch - response status:', xhr.status);
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
                console.log('uploadWithFetch - error data:', errorData);
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
            if (event.lengthComputable) {
                const percentComplete = Math.round((event.loaded / event.total) * 100);
                console.log(`Upload progress: ${percentComplete}%`);
            }
        };
        
        xhr.send(formData);
    });
};

// Helper function for file uploads using PUT with XMLHttpRequest
export const uploadWithFetchPut = async (
    endpoint: string,
    formData: FormData
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
