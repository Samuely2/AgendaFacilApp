// modules/auth.js - AuthService completo com debug

import { CONFIG } from '../config.js';

export class AuthService {
    static setToken(token) {
        console.log('💾 Salvando token:', token ? `${token.substring(0, 50)}...` : 'NULL');
        localStorage.setItem(CONFIG.TOKEN_KEY, token);
        console.log('✅ Token salvo no localStorage');
    }

    static getToken() {
        const token = localStorage.getItem(CONFIG.TOKEN_KEY);
        console.log('🔑 Recuperando token:', token ? `${token.substring(0, 50)}...` : 'NULL');
        
        if (!token) {
            console.warn('⚠️ Token NÃO encontrado no localStorage');
            console.log('🔍 Chaves no localStorage:', Object.keys(localStorage));
        }
        
        return token;
    }

    static setUser(user) {
        console.log('💾 Salvando usuário:', user);
        localStorage.setItem(CONFIG.USER_KEY, JSON.stringify(user));
        console.log('✅ Usuário salvo no localStorage');
    }

    static getUser() {
        const userStr = localStorage.getItem(CONFIG.USER_KEY);
        console.log('👤 Recuperando usuário:', userStr ? 'Encontrado' : 'NULL');
        
        if (!userStr) {
            console.warn('⚠️ Usuário NÃO encontrado no localStorage');
            return null;
        }
        
        try {
            const user = JSON.parse(userStr);
            console.log('✅ Usuário parseado:', {
                email: user.email,
                role: user.role,
                hasUserId: !!user.userId
            });
            return user;
        } catch (error) {
            console.error('❌ Erro ao parsear usuário:', error);
            return null;
        }
    }

    static clearAuth() {
        console.log('🗑️ Limpando autenticação...');
        localStorage.removeItem(CONFIG.TOKEN_KEY);
        localStorage.removeItem(CONFIG.USER_KEY);
        console.log('✅ Autenticação limpa');
    }

    static isAuthenticated() {
        const token = this.getToken();
        const isAuth = token && !this.isTokenExpired(token);
        console.log('🔐 isAuthenticated:', isAuth);
        return isAuth;
    }

    static parseJwt(token) {
        console.log('🔍 Parseando JWT...');
        
        if (!token) {
            console.error('❌ Token vazio para parsear');
            return null;
        }
        
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(
                window.atob(base64)
                    .split('')
                    .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                    .join('')
            );
            
            const parsed = JSON.parse(jsonPayload);
            console.log('✅ JWT parseado:', {
                userId: parsed['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'],
                role: parsed['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'],
                exp: new Date(parsed.exp * 1000).toLocaleString(),
                jti: parsed.jti
            });
            
            return parsed;
        } catch (error) {
            console.error('❌ Erro ao parsear JWT:', error);
            return null;
        }
    }

    static isTokenExpired(token) {
        const decoded = this.parseJwt(token);
        if (!decoded || !decoded.exp) {
            console.warn('⚠️ Token sem expiração ou inválido');
            return true;
        }
        
        const currentTime = Math.floor(Date.now() / 1000);
        const isExpired = decoded.exp < currentTime;
        
        console.log('⏰ Verificação de expiração:', {
            exp: new Date(decoded.exp * 1000).toLocaleString(),
            now: new Date(currentTime * 1000).toLocaleString(),
            isExpired: isExpired
        });
        
        return isExpired;
    }

    static getUserRole() {
        const user = this.getUser();
        const role = user?.role || null;
        console.log('👥 Role do usuário:', role);
        return role;
    }

    // Método auxiliar para debug
    static debugAuth() {
        console.log('🔍 DEBUG COMPLETO DA AUTENTICAÇÃO:');
        console.log('==========================================');
        
        const token = this.getToken();
        const user = this.getUser();
        
        console.log('1️⃣ Token existe?', !!token);
        if (token) {
            console.log('   - Token length:', token.length);
            console.log('   - Token preview:', token.substring(0, 50) + '...');
            console.log('   - Token expirado?', this.isTokenExpired(token));
        }
        
        console.log('2️⃣ User existe?', !!user);
        if (user) {
            console.log('   - Email:', user.email);
            console.log('   - Username:', user.username);
            console.log('   - Role:', user.role);
            console.log('   - UserId:', user.userId);
        }
        
        console.log('3️⃣ Está autenticado?', this.isAuthenticated());
        console.log('==========================================');
    }
}

// Expõe debugAuth globalmente para testes no console
if (typeof window !== 'undefined') {
    window.AuthServiceDebug = AuthService.debugAuth.bind(AuthService);
    console.log('💡 Dica: Execute "AuthServiceDebug()" no console para debug completo');
}