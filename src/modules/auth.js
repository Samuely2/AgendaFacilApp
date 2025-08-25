import { CONFIG } from '../config.js';

export class AuthService {
    static setToken(token) {
        localStorage.setItem(CONFIG.TOKEN_KEY, token);
    }

    static getToken() {
        return localStorage.getItem(CONFIG.TOKEN_KEY);
    }

    static setUser(user) {
        localStorage.setItem(CONFIG.USER_KEY, JSON.stringify(user));
    }

    static getUser() {
        const user = localStorage.getItem(CONFIG.USER_KEY);
        return user ? JSON.parse(user) : null;
    }

    static clearAuth() {
        localStorage.removeItem(CONFIG.TOKEN_KEY);
        localStorage.removeItem(CONFIG.USER_KEY);
    }

    static isAuthenticated() {
        return !!this.getToken();
    }
}