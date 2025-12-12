import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config';

export const axiosInstance = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 15000,
});

// Request interceptor
axiosInstance.interceptors.request.use(
    async (config) => {
        // console.log(`📡 ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);

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
        // console.log(`✅ ${response.config.url} - ${response.status}`);
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
