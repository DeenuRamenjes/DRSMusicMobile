import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApiUrl } from '../config';

// Create axios instance - baseURL will be set dynamically in request interceptor
export const axiosInstance = axios.create({
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 15000,
});

// Request interceptor - dynamically sets baseURL and adds auth token
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

// Response interceptor
axiosInstance.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        // console.error('❌ API Error:', {
        //     url: error.config?.url,
        //     message: error.message,
        // });
        return Promise.reject(error);
    }
);

export default axiosInstance;
