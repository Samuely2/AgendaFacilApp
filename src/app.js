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

    static async handleLogin(e) {
        e.preventDefault();
        
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        
        UIUtils.setLoading('loginBtn', 'loginLoading', 'loginText', true);
        UIUtils.hideMessages();
        
        try {
            const response = await ApiService.login({ email, password });
            
            if (response.token) {
                AuthService.setToken(response.token);
                
                const userInfo = AuthService.parseJwt(response.token);
                
                const user = {
                    email: email,
                    username: userInfo['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] || email,
                    userId: userInfo['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'],
                    role: response.roles && response.roles.length > 0 ? response.roles[0] : 
                            userInfo['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] || 'Client',
                    roles: response.roles || [],
                    expiration: response.expiration,
                    jti: userInfo.jti
                };
                
                AuthService.setUser(user);
                
                UIUtils.showSuccess('Login realizado com sucesso!');
                setTimeout(() => this.showDashboard(), 1000);
            } else {
                throw new Error("Token não encontrado na resposta da API.");
            }
            
        } catch (error) {
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
            'Admin': 'Administrador',
            'ServiceProvider': 'Prestador',
            'Client': 'Cliente'
        };
        return roleNames[role] || role;
    }

    static loadRoleSpecificContent(role) {
        const content = document.getElementById('dashboardContent');
        if (!content) {
            console.error('dashboardContent não encontrado!');
            return;
        }

        const clientContainer = document.getElementById('appointmentsContainer');
        const providerContainer = document.getElementById('providerAppointmentsContainer');
        if (clientContainer) clientContainer.style.display = 'none';
        if (providerContainer) providerContainer.style.display = 'none';

        const baseTitleStyle = "color: #1f2937; font-size: 28px; margin-bottom: 16px;";
        const baseParagraphStyle = "color: #6b7280; font-size: 18px; margin-bottom: 30px;";

        if (role === 'Admin') {
            content.innerHTML = `
                <h3 style="${baseTitleStyle}">Painel Administrativo</h3>
                <p style="${baseParagraphStyle}">Gerencie usuários, serviços e visualize relatórios completos do sistema.</p>
                <ul class="features-list">
                    <li>Gerenciar usuários e prestadores</li>
                    <li>Visualizar relatórios detalhados</li>
                    <li>Configurar serviços e categorias</li>
                </ul>`;
        } else if (role === 'ServiceProvider') {
            if (providerContainer) providerContainer.style.display = '';
            content.innerHTML = `
                <h3 style="${baseTitleStyle}">Painel do Prestador</h3>
                <p style="${baseParagraphStyle}">Acompanhe sua agenda, gerencie horários e serviços disponíveis.</p>
                <div style="background: linear-gradient(135deg, #f8fafc, #e0e7ff); padding: 24px; border-radius: 12px; margin-bottom: 24px; border: 2px solid #667eea;">
                    <h4 style="color: #1f2937; font-size: 20px; margin-bottom: 16px;">Minha Especialidade</h4>
                    <div id="specialityContainer"></div>
                    <div id="specialityFormContainer" style="margin-top: 16px;">
                        <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                            <input type="text" id="specialityInput" placeholder="Ex: Cabeleireiro, Massagista, Personal Trainer..." style="flex: 1; min-width: 250px; padding: 12px 16px; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 16px;" />
                            <button id="saveSpecialityBtn" type="button" style="padding: 12px 24px; background: linear-gradient(135deg, #667eea, #764ba2, #764ba2); color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; white-space: nowrap;">Salvar</button>
                        </div>
                        <p style="color: #6b7280; font-size: 14px; margin-top: 8px;">Dica: Defina sua especialidade principal para aparecer nas buscas.</p>
                    </div>
                </div>
                <div style="background: linear-gradient(135deg, #fef3c7, #fde68a); padding: 24px; border-radius: 12px; margin-bottom: 24px; border: 2px solid #f59e0b;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 12px;">
                        <h4 style="color: #1f2937; font-size: 20px; margin: 0;">Meus Serviços</h4>
                        <button id="newServiceBtn" type="button" style="padding: 10px 20px; background: linear-gradient(135deg, #f59e0b, #d97706); color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">+ Novo Serviço</button>
                    </div>
                    <div id="servicesContainer"></div>
                </div>
                <div id="serviceModal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000; align-items: center; justify-content: center;">
                    <div style="background: white; border-radius: 16px; padding: 32px; max-width: 500px; width: 90%; max-height: 90vh; overflow-y: auto;">
                        <h3 style="color: #1f2937; font-size: 24px; margin-bottom: 24px;" id="modalTitle">Novo Serviço</h3>
                        <div style="margin-bottom: 16px;">
                            <label style="display: block; color: #374151; font-weight: 600; margin-bottom: 8px;">Nome do Serviço *</label>
                            <input type="text" id="serviceName" placeholder="Ex: Corte de cabelo" style="width: 100%; padding: 12px; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 16px;" />
                        </div>
                        <div style="margin-bottom: 16px;">
                            <label style="display: block; color: #374151; font-weight: 600; margin-bottom: 8px;">Descrição *</label>
                            <textarea id="serviceDescription" placeholder="Descreva o serviço..." rows="3" style="width: 100%; padding: 12px; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 16px; resize: vertical;"></textarea>
                        </div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px;">
                            <div>
                                <label style="display: block; color: #374151; font-weight: 600; margin-bottom: 8px;">Duração (min) *</label>
                                <input type="number" id="serviceDuration" placeholder="30" min="1" style="width: 100%; padding: 12px; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 16px;" />
                            </div>
                            <div>
                                <label style="display: block; color: #374151; font-weight: 600; margin-bottom: 8px;">Preço (R$) *</label>
                                <input type="number" id="servicePrice" placeholder="50.00" min="0" step="0.01" style="width: 100%; padding: 12px; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 16px;" />
                            </div>
                        </div>
                        <div style="display: flex; gap: 12px; justify-content: flex-end;">
                            <button id="cancelServiceBtn" type="button" style="padding: 12px 24px; background: #e5e7eb; color: #374151; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">Cancelar</button>
                            <button id="saveServiceBtn" type="button" style="padding: 12px 24px; background: linear-gradient(135deg, #667eea, #764ba2); color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">Salvar Serviço</button>
                        </div>
                    </div>
                </div>
                <ul class="features-list">
                    <li>Visualizar minha agenda diária/semanal</li>
                    <li>Configurar meus horários de atendimento</li>
                    <li>Gerenciar os serviços que ofereço</li>
                </ul>`;
            setTimeout(() => {
                this.setupSpecialityEvents();
                this.loadSpecialityFromAPI();
                this.setupServicesEvents();
                this.loadServicesFromAPI();
                this.loadProviderAppointments();
            }, 100);
        } else if (role === 'Client') {
            if (clientContainer) clientContainer.style.display = '';
            content.innerHTML = `
                <h3 style="${baseTitleStyle}">Minha Conta</h3>
                <p style="${baseParagraphStyle}">Agende novos serviços e gerencie seus compromissos existentes.</p>
                <div style="background: linear-gradient(135deg, #dbeafe, #bfdbfe); padding: 24px; border-radius: 12px; margin-bottom: 24px; border: 2px solid #3b82f6;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 12px;">
                        <h4 style="color: #1f2937; font-size: 20px; margin: 0;">Novo Agendamento</h4>
                        <button id="newAppointmentBtn" type="button" style="padding: 10px 20px; background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">+ Agendar Serviço</button>
                    </div>
                </div>
                <div id="appointmentModal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000; align-items: center; justify-content: center;">
                    <div style="background: white; border-radius: 16px; padding: 32px; max-width: 600px; width: 90%; max-height: 90vh; overflow-y: auto;">
                        <h3 style="color: #1f2937; font-size: 24px; margin-bottom: 24px;">Novo Agendamento</h3>
                        <div style="margin-bottom: 16px;">
                            <label style="display: block; color: #374151; font-weight: 600; margin-bottom: 8px;">Serviço *</label>
                            <select id="appointmentService" style="width: 100%; padding: 12px; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 16px;"><option value="">Carregando serviços...</option></select>
                        </div>
                        <div style="margin-bottom: 16px;">
                            <label style="display: block; color: #374151; font-weight: 600; margin-bottom: 8px;">Prestador *</label>
                            <select id="appointmentProvider" style="width: 100%; padding: 12px; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 16px;"><option value="">Carregando prestadores...</option></select>
                        </div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
                            <div>
                                <label style="display: block; color: #374151; font-weight: 600; margin-bottom: 8px;">Data Início *</label>
                                <input type="datetime-local" id="appointmentStartDate" style="width: 100%; padding: 12px; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 16px;" />
                            </div>
                            <div>
                                <label style="display: block; color: #374151; font-weight: 600; margin-bottom: 8px;">Data Fim *</label>
                                <input type="datetime-local" id="appointmentEndDate" style="width: 100%; padding: 12px; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 16px;" />
                            </div>
                        </div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px;">
                            <div>
                                <label style="display: block; color: #374151; font-weight: 600; margin-bottom: 8px;">Duração (min) *</label>
                                <input type="number" id="appointmentDuration" placeholder="60" min="1" style="width: 100%; padding: 12px; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 16px;" />
                            </div>
                            <div>
                                <label style="display: block; color: #374151; font-weight: 600; margin-bottom: 8px;">Preço (R$) *</label>
                                <input type="number" id="appointmentPrice" placeholder="100.00" min="0" step="0.01" style="width: 100%; padding: 12px; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 16px;" />
                            </div>
                        </div>
                        <div style="display: flex; gap: 12px; justify-content: flex-end;">
                            <button id="cancelAppointmentBtn" type="button" style="padding: 12px 24px; background: #e5e7eb; color: #374151; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">Cancelar</button>
                            <button id="saveAppointmentBtn" type="button" style="padding: 12px 24px; background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">Confirmar Agendamento</button>
                        </div>
                    </div>
                </div>
                <ul class="features-list">
                    <li>Buscar serviços disponíveis</li>
                    <li>Escolher prestador de confiança</li>
                    <li>Agendar com data e horário</li>
                    <li>Acompanhar status dos agendamentos</li>
                </ul>`;
            setTimeout(() => {
                this.setupAppointmentsEvents();
                this.loadClientAppointments();
            }, 100);
        } else {
            content.innerHTML = `<p>Dashboard não configurado para este tipo de usuário.</p>`;
        }
    }

    // ==========================================
    // ESPECIALIDADE
    // ==========================================

    static setupSpecialityEvents() {
        const saveBtn = document.getElementById('saveSpecialityBtn');
        const input = document.getElementById('specialityInput');
        
        if (saveBtn) saveBtn.onclick = () => this.saveSpecialityToAPI();
        if (input) input.onkeypress = (e) => e.key === 'Enter' && this.saveSpecialityToAPI();
    }

    static async loadSpecialityFromAPI() {
        const container = document.getElementById('specialityContainer');
        if (!container) return;

        container.innerHTML = `<div style="text-align: center; padding: 20px;"><div style="font-size: 30px;">Carregando...</div><p style="color: #9ca3af; margin-top: 8px;">Carregando...</p></div>`;

        try {
            const response = await ApiService.getSpeciality();
            if (response?.success && response.data?.length > 0) {
                let speciality = response.data[0];
                if (typeof speciality === 'object') speciality = speciality.speciality || speciality.name || speciality.nome || 'Especialidade';
                this.showSpecialityCard(speciality);
            } else {
                this.showEmptyState();
            }
        } catch (error) {
            this.showErrorState(error.message);
        }
    }

    static async saveSpecialityToAPI() {
        const input = document.getElementById('specialityInput');
        const saveBtn = document.getElementById('saveSpecialityBtn');
        const speciality = input.value.trim();

        if (!speciality) return alert('Por favor, insira uma especialidade.');

        const originalText = saveBtn.innerHTML;
        saveBtn.disabled = true;
        saveBtn.innerHTML = 'Salvando...';

        try {
            await ApiService.saveSpeciality(speciality);
            saveBtn.innerHTML = 'Salvo!';
            saveBtn.style.background = 'linear-gradient(135deg, #16a34a, #15803d)';
            setTimeout(() => {
                this.loadSpecialityFromAPI();
                saveBtn.innerHTML = originalText;
                saveBtn.style.background = '';
                saveBtn.disabled = false;
            }, 1500);
        } catch (error) {
            alert(`Erro ao salvar: ${error.message}`);
            saveBtn.innerHTML = originalText;
            saveBtn.disabled = false;
        }
    }

    static showSpecialityCard(speciality) {
        const container = document.getElementById('specialityContainer');
        const form = document.getElementById('specialityFormContainer');
        container.innerHTML = `
            <div style="background: white; padding: 20px; border-radius: 10px; border-left: 4px solid #667eea; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
                <div style="display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap;">
                    <div style="display: flex; align-items: center; gap: 14px;">
                        <span style="background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 12px 18px; border-radius: 10px; font-size: 24px;">Especialidade</span>
                        <div>
                            <p style="color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Sua Especialidade</p>
                            <p style="color: #1f2937; font-weight: 700; font-size: 20px;">${speciality}</p>
                        </div>
                    </div>
                    <button onclick="AppController.editSpeciality('${speciality.replace(/'/g, "\\'")}')" style="background: #e0e7ff; color: #667eea; border: none; padding: 10px 18px; border-radius: 8px; cursor: pointer; font-weight: 600;">Editar</button>
                </div>
            </div>`;
        if (form) form.style.display = 'none';
    }

    static showEmptyState() {
        const container = document.getElementById('specialityContainer');
        const form = document.getElementById('specialityFormContainer');
        container.innerHTML = `<div style="text-align: center; padding: 20px; background: white; border-radius: 8px; border: 2px dashed #e5e7eb;"><div style="font-size: 48px; margin-bottom: 10px;">Nenhuma especialidade definida</div><p style="color: #6b7280; font-weight: 600;">Nenhuma especialidade definida</p></div>`;
        if (form) form.style.display = 'block';
    }

    static showErrorState(message) {
        document.getElementById('specialityContainer').innerHTML = `<div style="text-align: center; padding: 20px; background: #fee2e2; border-radius: 8px;"><div style="font-size: 40px;">Erro ao carregar</div><p style="color: #dc2626;">${message}</p><button onclick="AppController.loadSpecialityFromAPI()" style="margin-top: 12px; padding: 8px 16px; background: #dc2626; color: white; border: none; border-radius: 6px; cursor: pointer;">Tentar Novamente</button></div>`;
    }

    static editSpeciality(value) {
        const input = document.getElementById('specialityInput');
        const form = document.getElementById('specialityFormContainer');
        if (form) form.style.display = 'block';
        if (input) { input.value = value; input.focus(); }
    }

    // ==========================================
    // SERVIÇOS
    // ==========================================

    static currentEditingServiceId = null;

    static setupServicesEvents() {
        document.getElementById('newServiceBtn')?.addEventListener('click', () => this.openServiceModal());
        document.getElementById('cancelServiceBtn')?.addEventListener('click', () => this.closeServiceModal());
        document.getElementById('saveServiceBtn')?.addEventListener('click', () => this.saveService());
        document.getElementById('serviceModal')?.addEventListener('click', (e) => e.target === e.currentTarget && this.closeServiceModal());
    }

    static async loadServicesFromAPI() {
        const container = document.getElementById('servicesContainer');
        if (!container) return;
        container.innerHTML = `<div style="text-align: center; padding: 20px;"><div style="font-size: 30px;">Carregando...</div><p style="color: #9ca3af;">Carregando serviços...</p></div>`;
        try {
            const response = await ApiService.getServices();
            if (response?.success && response.data?.length > 0) {
                this.renderServices(response.data);
            } else {
                this.renderEmptyServices();
            }
        } catch (error) {
            this.renderServicesError(error.message);
        }
    }

    static renderServices(services) {
        const container = document.getElementById('servicesContainer');
        container.innerHTML = services.map(s => `
            <div style="background: white; padding: 20px; border-radius: 10px; margin-bottom: 12px; border-left: 4px solid #f59e0b; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
                <div style="display: flex; justify-content: space-between; align-items: start; gap: 16px; flex-wrap: wrap;">
                    <div style="flex: 1;">
                        <h5 style="margin: 0 0 8px; font-size: 18px; font-weight: 700;">${s.name}</h5>
                        <p style="color: #6b7280; margin: 0 0 12px; font-size: 14px; line-height: 1.5;">${s.description}</p>
                        <div style="display: flex; gap: 16px; flex-wrap: wrap; font-size: 14px;">
                            <div>Duração: ${s.defaultDurationInMinutes} min</div>
                            <div style="color: #16a34a; font-weight: 700;">R$ ${s.defaultPrice.toFixed(2)}</div>
                        </div>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button onclick="AppController.editService('${s.id}')" style="background: #e0e7ff; color: #667eea; border: none; padding: 8px 16px; border-radius: 8px; cursor: pointer;">Editar</button>
                        <button onclick="AppController.deleteService('${s.id}', '${s.name.replace(/'/g, "\\'")}')" style="background: #fee2e2; color: #dc2626; border: none; padding: 8px 16px; border-radius: 8px; cursor: pointer;">Excluir</button>
                    </div>
                </div>
            </div>`).join('');
    }

    static renderEmptyServices() {
        document.getElementById('servicesContainer').innerHTML = `<div style="text-align: center; padding: 40px; background: white; border: 2px dashed #e5e7eb; border-radius: 8px;"><div style="font-size: 48px;">Nenhum serviço cadastrado</div><p style="color: #6b7280;">Clique em "Novo Serviço" para começar</p></div>`;
    }

    static renderServicesError(msg) {
        document.getElementById('servicesContainer').innerHTML = `<div style="text-align: center; padding: 20px; background: #fee2e2; border-radius: 8px;"><div style="font-size: 40px;">Erro</div><p style="color: #dc2626;">${msg}</p></div>`;
    }

    static openServiceModal(service = null) {
        this.currentEditingServiceId = service?.id || null;
        document.getElementById('modalTitle').textContent = service ? 'Editar Serviço' : 'Novo Serviço';
        document.getElementById('serviceName').value = service?.name || '';
        document.getElementById('serviceDescription').value = service?.description || '';
        document.getElementById('serviceDuration').value = service?.defaultDurationInMinutes || '';
        document.getElementById('servicePrice').value = service?.defaultPrice || '';
        document.getElementById('serviceModal').style.display = 'flex';
    }

    static closeServiceModal() {
        document.getElementById('serviceModal').style.display = 'none';
        this.currentEditingServiceId = null;
    }

    static async saveService() {
        const name = document.getElementById('serviceName').value.trim();
        const desc = document.getElementById('serviceDescription').value.trim();
        const duration = parseInt(document.getElementById('serviceDuration').value);
        const price = parseFloat(document.getElementById('servicePrice').value);
        const btn = document.getElementById('saveServiceBtn');

        if (!name || !desc || !duration || !price) return alert('Preencha todos os campos');

        btn.disabled = true;
        btn.innerHTML = 'Salvando...';

        try {
            const data = { name, description: desc, defaultDurationInMinutes: duration, defaultPrice: price };
            if (this.currentEditingServiceId) {
                await ApiService.updateService(this.currentEditingServiceId, data);
            } else {
                await ApiService.createService(data);
            }
            this.closeServiceModal();
            await this.loadServicesFromAPI();
        } catch (err) {
            alert('Erro ao salvar serviço');
        } finally {
            btn.disabled = false;
            btn.innerHTML = 'Salvar Serviço';
        }
    }

    static async editService(id) {
        const res = await ApiService.getServices();
        const service = res.data.find(s => s.id === id);
        if (service) this.openServiceModal(service);
    }

    static async deleteService(id, name) {
        if (!confirm(`Excluir o serviço "${name}"?`)) return;
        await ApiService.deleteService(id);
        this.loadServicesFromAPI();
    }

    // ==========================================
    // AGENDAMENTOS
    // ==========================================

    static setupAppointmentsEvents() {
        document.getElementById('newAppointmentBtn')?.addEventListener('click', () => this.openAppointmentModal());
        document.getElementById('cancelAppointmentBtn')?.addEventListener('click', () => this.closeAppointmentModal());
        document.getElementById('saveAppointmentBtn')?.addEventListener('click', () => this.saveAppointment());
        document.getElementById('appointmentModal')?.addEventListener('click', e => e.target === e.currentTarget && this.closeAppointmentModal());
        document.getElementById('appointmentService')?.addEventListener('change', e => this.onServiceSelect(e.target));
    }

    static async openAppointmentModal() {
        document.getElementById('appointmentModal').style.display = 'flex';
        await this.loadServicesForModal();
        await this.loadProvidersForModal();
    }

    static closeAppointmentModal() {
        document.getElementById('appointmentModal').style.display = 'none';
    }

    static async loadServicesForModal() {
        const select = document.getElementById('appointmentService');
        try {
            const res = await ApiService.getServices();
            select.innerHTML = '<option value="">Selecione um serviço</option>';
            res.data.forEach(s => {
                const opt = document.createElement('option');
                opt.value = s.id;
                opt.textContent = s.name;
                opt.dataset.price = s.defaultPrice;
                opt.dataset.duration = s.defaultDurationInMinutes;
                select.appendChild(opt);
            });
        } catch { select.innerHTML = '<option value="">Erro ao carregar</option>'; }
    }

    static async loadProvidersForModal() {
        const select = document.getElementById('appointmentProvider');
        try {
            const res = await ApiService.getAllProviders();
            select.innerHTML = '<option value="">Selecione um prestador</option>';
            res.data.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p.id;
                opt.textContent = p.fullname || p.username || 'Prestador';
                select.appendChild(opt);
            });
        } catch { select.innerHTML = '<option value="">Erro ao carregar</option>'; }
    }

    static onServiceSelect(select) {
        const opt = select.options[select.selectedIndex];
        if (opt && opt.value) {
            document.getElementById('appointmentPrice').value = parseFloat(opt.dataset.price).toFixed(2);
            document.getElementById('appointmentDuration').value = opt.dataset.duration;
        }
    }

    static async saveAppointment() {
        const serviceId = document.getElementById('appointmentService').value;
        const serviceProviderId = document.getElementById('appointmentProvider').value;
        const startDateTime = document.getElementById('appointmentStartDate').value;
        const endDateTime = document.getElementById('appointmentEndDate').value;
        const price = parseFloat(document.getElementById('appointmentPrice').value);
        const durationInMinutes = parseInt(document.getElementById('appointmentDuration').value);

        if (!serviceId || !serviceProviderId || !startDateTime || !endDateTime) return alert('Preencha todos os campos');
        if (new Date(startDateTime) >= new Date(endDateTime)) return alert('Data de início deve ser anterior à data de fim');

        const btn = document.getElementById('saveAppointmentBtn');
        btn.disabled = true;
        btn.innerHTML = 'Agendando...';

        try {
            const res = await ApiService.createAppointment({ serviceId, serviceProviderId, startDateTime, endDateTime, price, durationInMinutes });
            if (res.success) {
                btn.innerHTML = 'Agendado!';
                btn.style.background = 'linear-gradient(135deg, #16a34a, #15803d)';
                setTimeout(() => {
                    this.closeAppointmentModal();
                    this.loadClientAppointments();
                    btn.innerHTML = 'Confirmar Agendamento';
                    btn.style.background = '';
                    btn.disabled = false;
                }, 1500);
            }
        } catch (err) {
            alert('Erro ao agendar');
            btn.disabled = false;
            btn.innerHTML = 'Confirmar Agendamento';
        }
    }

    static async loadClientAppointments() {
        const container = document.getElementById('appointmentsContainer');
        if (!container) return;
        container.innerHTML = `<div style="text-align: center; padding: 40px;"><div style="font-size: 40px;">Carregando...</div></div>`;
        try {
            const res = await ApiService.getAllAppointments();
            if (res?.success && res.data?.length > 0) {
                await this.renderAppointments(res.data, container, 'client');
            } else {
                container.innerHTML = `<div style="text-align: center; padding: 60px; background: white; border: 2px dashed #e5e7eb; border-radius: 12px;"><div style="font-size: 60px;">Nenhum agendamento</div><p style="color: #6b7280;">Clique em "Agendar Serviço" para começar</p></div>`;
            }
        } catch { container.innerHTML = `<div style="text-align: center; padding: 40px; color: #dc2626;">Erro ao carregar</div>`; }
    }

    static async loadProviderAppointments() {
        const container = document.getElementById('providerAppointmentsContainer');
        if (!container) return;
        container.innerHTML = `<div style="text-align: center; padding: 40px;"><div style="font-size: 40px;">Carregando...</div></div>`;
        try {
            const res = await ApiService.getAllAppointments();
            if (res?.success && res.data?.length > 0) {
                await this.renderAppointments(res.data, container, 'provider');
            } else {
                container.innerHTML = `<div style="text-align: center; padding: 60px; background: white; border: 2px dashed #e5e7eb; border-radius: 12px;"><div style="font-size: 60px;">Nenhum agendamento</div></div>`;
            }
        } catch { container.innerHTML = `<div style="text-align: center; padding: 40px; color: #dc2626;">Erro ao carregar</div>`; }
    }

    static async renderAppointments(appointments, container, userType) {
        const detailed = await Promise.all(appointments.map(async app => {
            try {
                const [srv, prov] = await Promise.all([
                    app.serviceId ? ApiService.getServiceById(app.serviceId) : {},
                    app.serviceProviderId ? ApiService.getProviderById(app.serviceProviderId) : {}
                ]);
                return { ...app, service: srv?.data, provider: prov?.data };
            } catch { return app; }
        }));

        const statusNames = { 0: 'Agendado', 1: 'Confirmado', 2: 'Cancelado', 3: 'Concluído' };
        const statusColors = { 0: '#3b82f6', 1: '#22c55e', 2: '#ef4444', 3: '#6b7280' };

        container.innerHTML = detailed.map(app => {
            const personName = userType === 'client'
                ? (app.provider?.fullname || app.provider?.username || 'Prestador')
                : (app.user?.fullname || app.user?.username || 'Cliente');

            return `
<div style="background: white; padding: 20px; border-radius: 12px; margin-bottom: 16px; border-left: 5px solid ${statusColors[app.status]}; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
    <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; flex-wrap: wrap;">
        <div style="flex: 1; min-width: 280px;">
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 10px;">
                <h5 style="margin: 0; font-size: 19px; font-weight: 700; color: #1f2937;">${app.service?.name || 'Serviço'}</h5>
                <span style="background: ${statusColors[app.status]}; color: white; padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: 600;">${statusNames[app.status]}</span>
            </div>
            <p style="margin: 8px 0; color: #6b7280; font-size: 15px;">${userType === 'client' ? 'Prestador' : 'Cliente'}: <strong>${personName}</strong></p>
            <div style="display: flex; flex-wrap: wrap; gap: 16px; font-size: 15px; color: #374151;">
                <div><strong>${new Date(app.startDateTime).toLocaleDateString('pt-BR')}</strong></div>
                <div>${new Date(app.startDateTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
                <div>${app.durationInMinutes} min</div>
                <div style="color: #16a34a; font-weight: 700;">R$ ${app.price?.toFixed(2) || '0.00'}</div>
            </div>
        </div>

        ${[0, 1].includes(app.status) ? `
        <div style="align-self: center;">
            <button onclick="App.deleteAppointment('${app.id}', event)"
                style="background: #ef4444; color: white; border: none; padding: 12px 20px; border-radius: 10px; font-weight: 600; cursor: pointer; box-shadow: 0 4px 10px rgba(239,68,68,0.3); transition: 0.2s;"
                onmouseover="this.style.background='#dc2626'"
                onmouseout="this.style.background='#ef4444'">
                Cancelar Agendamento
            </button>
        </div>` : ''}
    </div>
</div>`;
        }).join('');
    }

    // EXCLUSÃO DE AGENDAMENTO - 100% FUNCIONAL
    static async deleteAppointment(appointmentId, event) {
        if (!confirm('Tem certeza que deseja cancelar este agendamento?')) return;

        const button = event.target;
        const originalText = button.innerHTML;
        button.disabled = true;
        button.innerHTML = 'Cancelando...';

        try {
            const response = await ApiService.deleteAppointment(appointmentId);

            if (response && response.success) {
                alert('Agendamento cancelado com sucesso!');
                await this.loadClientAppointments();
                await this.loadProviderAppointments();
            } else {
                throw new Error(response?.message || 'Erro ao cancelar');
            }
        } catch (error) {
            console.error('Erro ao cancelar:', error);
            alert('Não foi possível cancelar o agendamento.');
        } finally {
            button.disabled = false;
            button.innerHTML = originalText;
        }
    }
}

// EXPOR GLOBALMENTE (ESSENCIAL PARA O BOTÃO FUNCIONAR)
window.App = AppController;
window.AppController = AppController;

document.addEventListener('DOMContentLoaded', () => {
    console.log('AgendaFácil - App iniciado');
    AppController.init();
});