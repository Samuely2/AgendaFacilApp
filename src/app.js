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
            console.error('❌ dashboardContent não encontrado!');
            return;
        }
        
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
        } 
        else if (role === 'ServiceProvider') {
            content.innerHTML = `
                <h3 style="${baseTitleStyle}">Painel do Prestador</h3>
                <p style="${baseParagraphStyle}">Acompanhe sua agenda, gerencie horários e serviços disponíveis.</p>
                
                <!-- Seção de Especialidade -->
                <div style="background: linear-gradient(135deg, #f8fafc, #e0e7ff); padding: 24px; border-radius: 12px; margin-bottom: 24px; border: 2px solid #667eea;">
                    <h4 style="color: #1f2937; font-size: 20px; margin-bottom: 16px;">
                        ✨ Minha Especialidade
                    </h4>
                    
                    <div id="specialityContainer"></div>
                    
                    <div id="specialityFormContainer" style="margin-top: 16px;">
                        <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                            <input 
                                type="text" 
                                id="specialityInput" 
                                placeholder="Ex: Cabeleireiro, Massagista, Personal Trainer..."
                                style="flex: 1; min-width: 250px; padding: 12px 16px; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 16px;"
                            />
                            <button 
                                id="saveSpecialityBtn"
                                type="button"
                                style="padding: 12px 24px; background: linear-gradient(135deg, #667eea, #764ba2); color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; white-space: nowrap;"
                            >
                                💾 Salvar
                            </button>
                        </div>
                        <p style="color: #6b7280; font-size: 14px; margin-top: 8px;">
                            💡 Dica: Defina sua especialidade principal para aparecer nas buscas.
                        </p>
                    </div>
                </div>

                <!-- Seção de Serviços -->
                <div style="background: linear-gradient(135deg, #fef3c7, #fde68a); padding: 24px; border-radius: 12px; margin-bottom: 24px; border: 2px solid #f59e0b;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 12px;">
                        <h4 style="color: #1f2937; font-size: 20px; margin: 0;">
                            🛠️ Meus Serviços
                        </h4>
                        <button 
                            id="newServiceBtn"
                            type="button"
                            style="padding: 10px 20px; background: linear-gradient(135deg, #f59e0b, #d97706); color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;"
                        >
                            ➕ Novo Serviço
                        </button>
                    </div>
                    
                    <div id="servicesContainer"></div>
                </div>

                <!-- Modal de Criar/Editar Serviço -->
                <div id="serviceModal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000; align-items: center; justify-content: center;">
                    <div style="background: white; border-radius: 16px; padding: 32px; max-width: 500px; width: 90%; max-height: 90vh; overflow-y: auto;">
                        <h3 style="color: #1f2937; font-size: 24px; margin-bottom: 24px;" id="modalTitle">Novo Serviço</h3>
                        
                        <div style="margin-bottom: 16px;">
                            <label style="display: block; color: #374151; font-weight: 600; margin-bottom: 8px;">Nome do Serviço *</label>
                            <input 
                                type="text" 
                                id="serviceName"
                                placeholder="Ex: Corte de cabelo"
                                style="width: 100%; padding: 12px; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 16px;"
                            />
                        </div>

                        <div style="margin-bottom: 16px;">
                            <label style="display: block; color: #374151; font-weight: 600; margin-bottom: 8px;">Descrição *</label>
                            <textarea 
                                id="serviceDescription"
                                placeholder="Descreva o serviço..."
                                rows="3"
                                style="width: 100%; padding: 12px; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 16px; resize: vertical;"
                            ></textarea>
                        </div>

                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px;">
                            <div>
                                <label style="display: block; color: #374151; font-weight: 600; margin-bottom: 8px;">Duração (min) *</label>
                                <input 
                                    type="number" 
                                    id="serviceDuration"
                                    placeholder="30"
                                    min="1"
                                    style="width: 100%; padding: 12px; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 16px;"
                                />
                            </div>
                            <div>
                                <label style="display: block; color: #374151; font-weight: 600; margin-bottom: 8px;">Preço (R$) *</label>
                                <input 
                                    type="number" 
                                    id="servicePrice"
                                    placeholder="50.00"
                                    min="0"
                                    step="0.01"
                                    style="width: 100%; padding: 12px; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 16px;"
                                />
                            </div>
                        </div>

                        <div style="display: flex; gap: 12px; justify-content: flex-end;">
                            <button 
                                id="cancelServiceBtn"
                                type="button"
                                style="padding: 12px 24px; background: #e5e7eb; color: #374151; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;"
                            >
                                Cancelar
                            </button>
                            <button 
                                id="saveServiceBtn"
                                type="button"
                                style="padding: 12px 24px; background: linear-gradient(135deg, #667eea, #764ba2); color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;"
                            >
                                💾 Salvar Serviço
                            </button>
                        </div>
                    </div>
                </div>
                
                <ul class="features-list">
                    <li>Visualizar minha agenda diária/semanal</li>
                    <li>Configurar meus horários de atendimento</li>
                    <li>Gerenciar os serviços que ofereço</li>
                </ul>`;
            
            setTimeout(() => {
                console.log('🎬 Iniciando setup de especialidade e serviços...');
                this.setupSpecialityEvents();
                this.loadSpecialityFromAPI();
                this.setupServicesEvents();
                this.loadServicesFromAPI();
            }, 100);
        }
        else if (role === 'Client') {
            content.innerHTML = `
                <h3 style="${baseTitleStyle}">Minha Conta</h3>
                <p style="${baseParagraphStyle}">Agende novos serviços e gerencie seus compromissos existentes.</p>
                <ul class="features-list">
                    <li>Agendar um novo serviço</li>
                    <li>Visualizar meus próximos agendamentos</li>
                    <li>Cancelar ou reagendar um horário</li>
                </ul>`;
        }
        else {
            content.innerHTML = `<p>Dashboard não configurado para este tipo de usuário.</p>`;
        }
    }

    // ==========================================
    // ESPECIALIDADE - MÉTODOS
    // ==========================================

    static setupSpecialityEvents() {
        console.log('⚙️ setupSpecialityEvents()');
        
        const saveBtn = document.getElementById('saveSpecialityBtn');
        const input = document.getElementById('specialityInput');
        
        if (saveBtn) {
            saveBtn.onclick = () => {
                console.log('🖱️ Botão salvar clicado');
                this.saveSpecialityToAPI();
            };
            console.log('✅ Event listener do botão configurado');
        } else {
            console.error('❌ saveSpecialityBtn NÃO encontrado');
        }
        
        if (input) {
            input.onkeypress = (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    console.log('⌨️ Enter pressionado');
                    this.saveSpecialityToAPI();
                }
            };
            console.log('✅ Event listener do input configurado');
        } else {
            console.error('❌ specialityInput NÃO encontrado');
        }
    }

    static async loadSpecialityFromAPI() {
        console.log('📥 loadSpecialityFromAPI() INICIADO');
        
        const container = document.getElementById('specialityContainer');
        
        if (!container) {
            console.error('❌ specialityContainer NÃO encontrado');
            return;
        }

        // Mostra loading
        container.innerHTML = `
            <div style="text-align: center; padding: 20px;">
                <div style="font-size: 30px;">⏳</div>
                <p style="color: #9ca3af; margin-top: 8px;">Carregando...</p>
            </div>`;

        try {
            console.log('🌐 Chamando API...');
            const response = await ApiService.getSpeciality();
            
            console.log('📦 RESPONSE COMPLETA:', response);
            console.log('✅ success:', response?.success);
            console.log('📋 data:', response?.data);
            console.log('📏 data.length:', response?.data?.length);
            
            if (response && response.success && response.data && Array.isArray(response.data) && response.data.length > 0) {
                const speciality = response.data[0];
                console.log('🎯 ESPECIALIDADE ENCONTRADA:', speciality);
                this.showSpecialityCard(speciality);
            } else {
                console.log('📭 Nenhuma especialidade encontrada');
                this.showEmptyState();
            }
            
        } catch (error) {
            console.error('❌ ERRO:', error);
            this.showErrorState(error.message);
        }
    }

    static showSpecialityCard(speciality) {
        console.log('🎨 showSpecialityCard() com:', speciality);
        
        const container = document.getElementById('specialityContainer');
        const formContainer = document.getElementById('specialityFormContainer');
        
        if (!container) {
            console.error('❌ Container não encontrado');
            return;
        }

        container.innerHTML = `
            <div style="background: white; padding: 20px; border-radius: 10px; border-left: 4px solid #667eea; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
                <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px;">
                    <div style="display: flex; align-items: center; gap: 14px; flex: 1;">
                        <span style="background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 12px 18px; border-radius: 10px; font-size: 24px;">
                            🎯
                        </span>
                        <div>
                            <p style="color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Sua Especialidade</p>
                            <p style="color: #1f2937; font-weight: 700; font-size: 20px;">
                                ${speciality}
                            </p>
                        </div>
                    </div>
                    <button 
                        onclick="AppController.editSpeciality('${speciality.replace(/'/g, "\\'")}')"
                        style="background: #e0e7ff; color: #667eea; border: none; padding: 10px 18px; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 14px;"
                    >
                        ✏️ Editar
                    </button>
                </div>
            </div>`;
        
        if (formContainer) {
            formContainer.style.display = 'none';
        }
        
        console.log('✅ Card renderizado com sucesso');
    }

    static showEmptyState() {
        console.log('📭 showEmptyState()');
        
        const container = document.getElementById('specialityContainer');
        const formContainer = document.getElementById('specialityFormContainer');
        
        if (!container) return;

        container.innerHTML = `
            <div style="text-align: center; padding: 20px; background: white; border-radius: 8px; border: 2px dashed #e5e7eb;">
                <div style="font-size: 48px; margin-bottom: 10px;">📋</div>
                <p style="color: #6b7280; font-weight: 600; font-size: 16px;">Nenhuma especialidade definida</p>
                <p style="color: #9ca3af; font-size: 14px; margin-top: 8px;">Defina sua especialidade abaixo</p>
            </div>`;
        
        if (formContainer) {
            formContainer.style.display = 'block';
        }
        
        console.log('✅ Estado vazio mostrado');
    }

    static showErrorState(message) {
        console.log('⚠️ showErrorState():', message);
        
        const container = document.getElementById('specialityContainer');
        if (!container) return;

        container.innerHTML = `
            <div style="text-align: center; padding: 20px; background: #fee2e2; border-radius: 8px;">
                <div style="font-size: 40px; margin-bottom: 10px;">⚠️</div>
                <p style="color: #dc2626; font-weight: 600;">Erro ao carregar</p>
                <p style="color: #7f1d1d; font-size: 14px; margin-top: 8px;">${message}</p>
                <button onclick="AppController.loadSpecialityFromAPI()" style="margin-top: 12px; padding: 8px 16px; background: #dc2626; color: white; border: none; border-radius: 6px; cursor: pointer;">
                    🔄 Tentar Novamente
                </button>
            </div>`;
    }

    static editSpeciality(currentValue) {
        console.log('✏️ editSpeciality():', currentValue);
        
        const input = document.getElementById('specialityInput');
        const formContainer = document.getElementById('specialityFormContainer');
        
        if (formContainer) formContainer.style.display = 'block';
        if (input) {
            input.value = currentValue;
            input.focus();
        }
    }

    // ==========================================
    // SERVIÇOS - MÉTODOS
    // ==========================================

    static currentEditingServiceId = null;

    static setupServicesEvents() {
        console.log('⚙️ setupServicesEvents()');
        
        const newServiceBtn = document.getElementById('newServiceBtn');
        const cancelServiceBtn = document.getElementById('cancelServiceBtn');
        const saveServiceBtn = document.getElementById('saveServiceBtn');
        
        if (newServiceBtn) {
            newServiceBtn.onclick = () => {
                console.log('🆕 Novo serviço clicado');
                this.openServiceModal();
            };
        }
        
        if (cancelServiceBtn) {
            cancelServiceBtn.onclick = () => {
                console.log('❌ Cancelar clicado');
                this.closeServiceModal();
            };
        }
        
        if (saveServiceBtn) {
            saveServiceBtn.onclick = () => {
                console.log('💾 Salvar serviço clicado');
                this.saveService();
            };
        }
        
        // Fechar modal ao clicar fora
        const modal = document.getElementById('serviceModal');
        if (modal) {
            modal.onclick = (e) => {
                if (e.target === modal) {
                    this.closeServiceModal();
                }
            };
        }
        
        console.log('✅ Event listeners de serviços configurados');
    }

    static async loadServicesFromAPI() {
        console.log('📥 loadServicesFromAPI() INICIADO');
        
        const container = document.getElementById('servicesContainer');
        
        if (!container) {
            console.error('❌ servicesContainer NÃO encontrado');
            return;
        }

        container.innerHTML = `
            <div style="text-align: center; padding: 20px;">
                <div style="font-size: 30px;">⏳</div>
                <p style="color: #9ca3af; margin-top: 8px;">Carregando serviços...</p>
            </div>`;

        try {
            const response = await ApiService.getServices();
            
            console.log('📦 SERVICES RESPONSE:', response);
            
            if (response && response.success && response.data && Array.isArray(response.data)) {
                if (response.data.length > 0) {
                    console.log(`✅ ${response.data.length} serviços encontrados`);
                    this.renderServices(response.data);
                } else {
                    console.log('📭 Nenhum serviço encontrado');
                    this.renderEmptyServices();
                }
            } else {
                console.warn('⚠️ Resposta inválida');
                this.renderEmptyServices();
            }
            
        } catch (error) {
            console.error('❌ ERRO ao carregar serviços:', error);
            this.renderServicesError(error.message);
        }
    }

    static renderServices(services) {
        console.log('🎨 renderServices() com', services.length, 'serviços');
        
        const container = document.getElementById('servicesContainer');
        if (!container) return;

        container.innerHTML = services.map(service => `
            <div style="background: white; padding: 20px; border-radius: 10px; margin-bottom: 12px; border-left: 4px solid #f59e0b; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
                <div style="display: flex; justify-content: space-between; align-items: start; gap: 16px; flex-wrap: wrap;">
                    <div style="flex: 1; min-width: 250px;">
                        <h5 style="color: #1f2937; font-size: 18px; font-weight: 700; margin-bottom: 8px;">
                            ${service.name}
                        </h5>
                        <p style="color: #6b7280; font-size: 14px; margin-bottom: 12px; line-height: 1.5;">
                            ${service.description}
                        </p>
                        <div style="display: flex; gap: 16px; flex-wrap: wrap;">
                            <div style="display: flex; align-items: center; gap: 6px;">
                                <span style="font-size: 16px;">⏱️</span>
                                <span style="color: #374151; font-size: 14px; font-weight: 600;">
                                    ${service.defaultDurationInMinutes} min
                                </span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 6px;">
                                <span style="font-size: 16px;">💰</span>
                                <span style="color: #16a34a; font-size: 16px; font-weight: 700;">
                                    R$ ${service.defaultPrice.toFixed(2)}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button 
                            onclick="AppController.editService('${service.id}')"
                            style="background: #e0e7ff; color: #667eea; border: none; padding: 8px 16px; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 14px;"
                        >
                            ✏️ Editar
                        </button>
                        <button 
                            onclick="AppController.deleteService('${service.id}', '${service.name.replace(/'/g, "\\'")}')"
                            style="background: #fee2e2; color: #dc2626; border: none; padding: 8px 16px; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 14px;"
                        >
                            🗑️ Excluir
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
        
        console.log('✅ Serviços renderizados');
    }

    static renderEmptyServices() {
        const container = document.getElementById('servicesContainer');
        if (!container) return;

        container.innerHTML = `
            <div style="text-align: center; padding: 40px 20px; background: white; border-radius: 8px; border: 2px dashed #e5e7eb;">
                <div style="font-size: 48px; margin-bottom: 10px;">📦</div>
                <p style="color: #6b7280; font-weight: 600; font-size: 16px;">Nenhum serviço cadastrado</p>
                <p style="color: #9ca3af; font-size: 14px; margin-top: 8px;">Clique em "Novo Serviço" para começar</p>
            </div>`;
    }

    static renderServicesError(message) {
        const container = document.getElementById('servicesContainer');
        if (!container) return;

        container.innerHTML = `
            <div style="text-align: center; padding: 20px; background: #fee2e2; border-radius: 8px;">
                <div style="font-size: 40px; margin-bottom: 10px;">⚠️</div>
                <p style="color: #dc2626; font-weight: 600;">Erro ao carregar serviços</p>
                <p style="color: #7f1d1d; font-size: 14px; margin-top: 8px;">${message}</p>
                <button onclick="AppController.loadServicesFromAPI()" style="margin-top: 12px; padding: 8px 16px; background: #dc2626; color: white; border: none; border-radius: 6px; cursor: pointer;">
                    🔄 Tentar Novamente
                </button>
            </div>`;
    }

    static openServiceModal(service = null) {
        console.log('📝 openServiceModal()', service ? 'EDITAR' : 'NOVO');
        
        const modal = document.getElementById('serviceModal');
        const modalTitle = document.getElementById('modalTitle');
        const nameInput = document.getElementById('serviceName');
        const descInput = document.getElementById('serviceDescription');
        const durationInput = document.getElementById('serviceDuration');
        const priceInput = document.getElementById('servicePrice');
        
        if (service) {
            // Modo edição
            this.currentEditingServiceId = service.id;
            modalTitle.textContent = 'Editar Serviço';
            nameInput.value = service.name;
            descInput.value = service.description;
            durationInput.value = service.defaultDurationInMinutes;
            priceInput.value = service.defaultPrice;
        } else {
            // Modo criação
            this.currentEditingServiceId = null;
            modalTitle.textContent = 'Novo Serviço';
            nameInput.value = '';
            descInput.value = '';
            durationInput.value = '';
            priceInput.value = '';
        }
        
        modal.style.display = 'flex';
    }

    static closeServiceModal() {
        console.log('❌ closeServiceModal()');
        
        const modal = document.getElementById('serviceModal');
        modal.style.display = 'none';
        this.currentEditingServiceId = null;
    }

    static async saveService() {
        console.log('💾 saveService() INICIADO');
        
        const nameInput = document.getElementById('serviceName');
        const descInput = document.getElementById('serviceDescription');
        const durationInput = document.getElementById('serviceDuration');
        const priceInput = document.getElementById('servicePrice');
        const saveBtn = document.getElementById('saveServiceBtn');
        
        const name = nameInput.value.trim();
        const description = descInput.value.trim();
        const duration = parseInt(durationInput.value);
        const price = parseFloat(priceInput.value);
        
        // Validações
        if (!name) {
            alert('⚠️ Digite o nome do serviço');
            nameInput.focus();
            return;
        }
        
        if (!description) {
            alert('⚠️ Digite a descrição do serviço');
            descInput.focus();
            return;
        }
        
        if (!duration || duration <= 0) {
            alert('⚠️ Digite uma duração válida');
            durationInput.focus();
            return;
        }
        
        if (!price || price < 0) {
            alert('⚠️ Digite um preço válido');
            priceInput.focus();
            return;
        }
        
        const serviceData = {
            name,
            description,
            defaultDurationInMinutes: duration,
            defaultPrice: price
        };
        
        console.log('📤 Dados do serviço:', serviceData);
        
        // Desabilita botão
        saveBtn.disabled = true;
        saveBtn.innerHTML = '⏳ Salvando...';
        
        try {
            let response;
            
            if (this.currentEditingServiceId) {
                // Atualizar serviço existente
                console.log('🔄 Atualizando serviço:', this.currentEditingServiceId);
                try {
                    response = await ApiService.updateService(this.currentEditingServiceId, serviceData);
                    console.log('✅ Serviço atualizado com sucesso:', response);
                } catch (updateError) {
                    console.error('❌ Erro ao atualizar serviço:', updateError);
                    throw updateError;
                }
            } else {
                // Criar novo serviço
                console.log('🆕 Criando novo serviço');
                response = await ApiService.createService(serviceData);
            }
            
            console.log('📦 RESPONSE:', response);
            
            if (response && response.success) {
                console.log('✅ Serviço salvo com sucesso!');
                
                // Feedback
                saveBtn.innerHTML = '✅ Salvo!';
                saveBtn.style.background = 'linear-gradient(135deg, #16a34a, #15803d)';
                
                // Fecha modal e recarrega lista
                setTimeout(async () => {
                    this.closeServiceModal();
                    await this.loadServicesFromAPI();
                    
                    saveBtn.innerHTML = '💾 Salvar Serviço';
                    saveBtn.style.background = 'linear-gradient(135deg, #667eea, #764ba2)';
                    saveBtn.disabled = false;
                }, 1000);
            } else {
                throw new Error('Resposta inválida da API');
            }
            
        } catch (error) {
            console.error('❌ ERRO ao salvar serviço:', error);
            alert(`❌ Erro ao salvar: ${error.message}`);
            
            saveBtn.innerHTML = '💾 Salvar Serviço';
            saveBtn.disabled = false;
        }
    }

    static async editService(serviceId) {
        console.log('✏️ editService():', serviceId);
        
        try {
            // Busca os serviços novamente para pegar os dados atualizados
            const response = await ApiService.getServices();
            
            if (response && response.success && response.data) {
                const service = response.data.find(s => s.id === serviceId);
                
                if (service) {
                    this.openServiceModal(service);
                } else {
                    alert('❌ Serviço não encontrado');
                }
            }
        } catch (error) {
            console.error('❌ ERRO ao buscar serviço:', error);
            alert('❌ Erro ao carregar dados do serviço');
        }
    }

    static async deleteService(serviceId, serviceName) {
        console.log('🗑️ deleteService():', serviceId, serviceName);
        
        if (!confirm(`🗑️ Deseja realmente excluir o serviço "${serviceName}"?`)) {
            return;
        }
        
        try {
            console.log('🌐 Deletando serviço...');
            const response = await ApiService.deleteService(serviceId);
            
            console.log('📦 RESPONSE:', response);
            
            if (response && response.success) {
                console.log('✅ Serviço excluído com sucesso!');
                await this.loadServicesFromAPI();
            } else {
                throw new Error('Erro ao excluir serviço');
            }
            
        } catch (error) {
            console.error('❌ ERRO ao excluir:', error);
            alert(`❌ Erro ao excluir: ${error.message}`);
        }
    }
}


// Expõe globalmente
window.AppController = AppController;

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 APP INICIADO');
    AppController.init();
});