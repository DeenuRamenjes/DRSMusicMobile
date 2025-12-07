import axios from 'axios';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// API Configuration
const BACKEND_PORT = 5000;

// YOUR COMPUTER'S IP ADDRESS - Use this for physical device testing
const LOCAL_IP = '192.168.1.40';

const getBaseUrl = () => {
    if (__DEV__) {
        if (Platform.OS === 'android') {
            // For Android Emulator: use 10.0.2.2
            // For Physical Device: use your computer's IP
            // Change this based on your testing setup:

            // OPTION 1: Android Emulator
            // return `http://10.0.2.2:${BACKEND_PORT}/api`;

            // OPTION 2: Physical Device (using your IP)
            return `http://${LOCAL_IP}:${BACKEND_PORT}/api`;
        }
        // iOS Simulator
        return `http://localhost:${BACKEND_PORT}/api`;
    }
    return 'https://your-production-api.com/api';
};

const API_URL = getBaseUrl();
console.log('🌐 API Base URL:', API_URL);

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
        console.log(`📡 ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);

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
        console.log(`✅ ${response.config.url} - ${response.status}`);
        return response;
    },
    (error) => {
        console.error('❌ API Error:', {
            url: error.config?.url,
            message: error.message,
        });
        return Promise.reject(error);
    }
);

export default axiosInstance;
