import { ApiService } from './modules/api.js';
import { AuthService } from './modules/auth.js';
import { UIUtils, showTab } from './modules/ui.js';
import { USER_ROLES } from './config.js';

class AppController {
    static init() {
        this.setupEventListeners();
        this.checkAuthStatus();
    }

    static setupEventListeners() {
        document.getElementById('loginForm')?.addEventListener('submit', this.handleLogin.bind(this));
        document.getElementById('registerForm')?.addEventListener('submit', this.handleRegister.bind(this));
        document.getElementById('loginTabBtn')?.addEventListener('click', () => showTab('login'));
        document.getElementById('registerTabBtn')?.addEventListener('click', () => showTab('register'));
        document.getElementById('logoutBtn')?.addEventListener('click', this.handleLogout.bind(this));
    }

    // --- MÉTODO ATUALIZADO ---
    static checkAuthStatus() {
        const token = AuthService.getToken();
        const user = AuthService.getUser();
        
        if (token && user && !AuthService.isTokenExpired(token)) {
            this.showDashboard();
        } else {
            AuthService.clearAuth();
            this.showAuth();
        }
    }

    static showAuth() {
        UIUtils.showElement('authContainer');
        UIUtils.hideElement('dashboardContainer');
    }

    static showDashboard() {
        UIUtils.hideElement('authContainer');
        UIUtils.showElement('dashboardContainer');
        this.loadDashboard();
    }

    static handleLogout() {
        AuthService.clearAuth();
        this.showAuth();
    }

    // --- MÉTODO ATUALIZADO ---
    static async handleLogin(e) {
        e.preventDefault();
        
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        
        UIUtils.setLoading('loginBtn', 'loginLoading', 'loginText', true);
        UIUtils.hideMessages();
        
        try {
            const response = await ApiService.login({ email, password });
            
            console.log('Login response:', response);
            
            if (response.token) {
                // Store token and expiration
                AuthService.setToken(response.token);
                
                // Parse JWT to extract user info
                const userInfo = AuthService.parseJwt(response.token);
                console.log('Parsed JWT:', userInfo);
                
                // Create user object from JWT claims and response
                const user = {
                    email: email,
                    username: userInfo['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] || email,
                    role: response.roles && response.roles.length > 0 ? response.roles[0] : 
                          userInfo['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] || 'Client',
                    roles: response.roles || [],
                    expiration: response.expiration,
                    jti: userInfo.jti
                };
                
                console.log('User object:', user);
                AuthService.setUser(user);
                
                UIUtils.showSuccess('Login realizado com sucesso!');
                setTimeout(() => this.showDashboard(), 1000);
            } else {
                throw new Error("Token não encontrado na resposta da API.");
            }
            
        } catch (error) {
            console.error('Login error:', error);
            UIUtils.showError(error.message || 'Erro ao fazer login. Verifique suas credenciais.');
        } finally {
            UIUtils.setLoading('loginBtn', 'loginLoading', 'loginText', false);
        }
    }

    static async handleRegister(e) {
        e.preventDefault();
        const username = document.getElementById('registerUsername').value;
        const email = document.getElementById('registerEmail').value;
        const role = document.getElementById('registerRole').value;
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        
        if (password !== confirmPassword) {
            UIUtils.showError('As senhas não coincidem.');
            return;
        }
        if (password.length < 8) {
            UIUtils.showError('A senha deve ter pelo menos 8 caracteres.');
            return;
        }
        
        UIUtils.setLoading('registerBtn', 'registerLoading', 'registerText', true);
        UIUtils.hideMessages();
        
        try {
            await ApiService.register({ username, email, role, password });
            UIUtils.showSuccess('Cadastro realizado! Faça o login para continuar.');
            document.getElementById('registerForm').reset();
            setTimeout(() => showTab('login'), 2000);
        } catch (error) {
            UIUtils.showError(error.message || 'Erro ao realizar cadastro.');
        } finally {
            UIUtils.setLoading('registerBtn', 'registerLoading', 'registerText', false);
        }
    }

    static loadDashboard() {
        const user = AuthService.getUser();
        if (!user) return;

        document.getElementById('userWelcome').textContent = `Bem-vindo, ${user.username}`;
        const roleElement = document.getElementById('userRole');
        roleElement.textContent = this.getRoleDisplayName(user.role);
        roleElement.className = `role-badge role-${user.role.toLowerCase()}`;

        this.loadRoleSpecificContent(user.role);
    }
    
    static getRoleDisplayName(role) {
        const roleNames = {
            [USER_ROLES.ADMIN]: 'Administrador',
            [USER_ROLES.SERVICE_PROVIDER]: 'Prestador',
            [USER_ROLES.CLIENT]: 'Cliente'
        };
        return roleNames[role] || role;
    }

    static loadRoleSpecificContent(role) {
        const content = document.getElementById('dashboardContent');
        if (!content) return;
        
        let htmlContent = '';
        const baseTitleStyle = "color: #1f2937; font-size: 28px; margin-bottom: 16px;";
        const baseParagraphStyle = "color: #6b7280; font-size: 18px; margin-bottom: 30px;";

        switch (role) {
            case USER_ROLES.ADMIN:
                htmlContent = `
                    <h3 style="${baseTitleStyle}">Painel Administrativo</h3>
                    <p style="${baseParagraphStyle}">Gerencie usuários, serviços e visualize relatórios completos do sistema.</p>
                    <ul class="features-list">
                        <li>Gerenciar usuários e prestadores</li>
                        <li>Visualizar relatórios detalhados</li>
                        <li>Configurar serviços e categorias</li>
                    </ul>`;
                break;
            case USER_ROLES.SERVICE_PROVIDER:
                htmlContent = `
                    <h3 style="${baseTitleStyle}">Painel do Prestador</h3>
                    <p style="${baseParagraphStyle}">Acompanhe sua agenda, gerencie horários e serviços disponíveis.</p>
                     <ul class="features-list">
                        <li>Visualizar minha agenda diária/semanal</li>
                        <li>Configurar meus horários de atendimento</li>
                        <li>Gerenciar os serviços que ofereço</li>
                    </ul>`;
                break;
            case USER_ROLES.CLIENT:
                htmlContent = `
                    <h3 style="${baseTitleStyle}">Minha Conta</h3>
                    <p style="${baseParagraphStyle}">Agende novos serviços e gerencie seus compromissos existentes.</p>
                    <ul class="features-list">
                        <li>Agendar um novo serviço</li>
                        <li>Visualizar meus próximos agendamentos</li>
                        <li>Cancelar ou reagendar um horário</li>
                    </ul>`;
                break;
            default:
                htmlContent = `<p>Dashboard não configurado para este tipo de usuário.</p>`;
        }
        content.innerHTML = htmlContent;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    AppController.init();
});