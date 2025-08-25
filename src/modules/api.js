import { CONFIG } from '../config.js';
import { AuthService } from './auth.js';

export class ApiService {
    static async request(endpoint, options = {}) {
        const token = AuthService.getToken();
        const url = `${CONFIG.API_BASE_URL}${endpoint}`;
        
        const config = {
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                ...(token && { Authorization: `Bearer ${token}` }),
                ...options.headers
            },
            ...options
        };

        if (options.body && typeof options.body === 'object') {
            config.body = JSON.stringify(options.body);
        }

        try {
            const response = await fetch(url, config);
            
            const contentType = response.headers.get('content-type');
            let data;
            
            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                data = await response.text();
            }

            if (!response.ok) {
                const errorMessage = typeof data === 'object' 
                    ? (data.message || data.error || JSON.stringify(data))
                    : (data || `HTTP error! status: ${response.status}`);
                throw new Error(errorMessage);
            }

            return data;
        } catch (error) {
            console.error('API Request failed:', error);
            throw error;
        }
    }

    static async register(userData) {
        return this.request('/Authenticate/register', {
            method: 'POST',
            body: {
                username: userData.username,
                role: userData.role,
                email: userData.email,
                password: userData.password
            }
        });
    }

    static async login(credentials) {
        return this.request('/Authenticate/login', {
            method: 'POST',
            body: {
                email: credentials.email, // O backend espera 'username', não 'email'
                password: credentials.password
            }
        });
    }
}