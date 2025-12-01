// modules/api.js - Adicione estes métodos ao seu ApiService existente

import { AuthService } from './auth.js';
import { CONFIG } from '../config.js';

export class ApiService {
    static async request(endpoint, options = {}) {
        const token = AuthService.getToken();
        const url = `${CONFIG.API_BASE_URL}${endpoint}`;
        
        console.log('🔐 Token recuperado:', token ? `${token.substring(0, 50)}...` : 'NULL');
        
        const config = {
            headers: {
                'Accept': 'text/plain, application/json',
                'Content-Type': 'application/json',
                ...(token && { Authorization: `Bearer ${token}` }),
                ...options.headers
            },
            ...options
        };

        console.log('📋 Headers da requisição:', {
            ...config.headers,
            Authorization: config.headers.Authorization ? `Bearer ${token.substring(0, 20)}...` : 'MISSING'
        });

        if (options.body && typeof options.body === 'object') {
            config.body = JSON.stringify(options.body);
        } else if (options.body) {
            config.body = options.body;
        }

        try {
            console.log('🌐 API Request:', { 
                url, 
                method: config.method || 'GET',
                hasToken: !!token,
                tokenLength: token ? token.length : 0
            });

            const response = await fetch(url, config);
            
            console.log('📨 Response Status:', response.status);
            console.log('📨 Response Headers:', {
                contentType: response.headers.get('content-type'),
                authorization: response.headers.get('authorization')
            });
            
            // Se não autorizado, limpa auth e recarrega
            if (response.status === 401) {
                console.error('🚫 ERRO 401: Token inválido ou expirado');
                console.log('🔍 Token usado:', token);
                alert('⚠️ Sua sessão expirou. Faça login novamente.');
                AuthService.clearAuth();
                window.location.reload();
                return;
            }

            // Lê o conteúdo da resposta
            let data;
            const contentType = response.headers.get('content-type');
            
            // Tenta parsear como JSON primeiro
            try {
                const text = await response.text();
                console.log('📄 Response Text:', text.substring(0, 200));
                
                if (text) {
                    data = JSON.parse(text);
                    console.log('✅ JSON parseado com sucesso');
                } else {
                    data = null;
                    console.log('⚠️ Response vazio');
                }
            } catch (parseError) {
                console.error('❌ Erro ao parsear JSON:', parseError);
                // Se não conseguir parsear como JSON, usa o texto
                const text = await response.text();
                data = text;
                console.log('📝 Usando response como texto:', text);
            }

            console.log('📥 API Response:', { 
                status: response.status, 
                dataType: typeof data,
                data: data 
            });

            if (!response.ok) {
                const errorMessage = typeof data === 'object' ? 
                    (data.message || data.error || data.title || `HTTP error! status: ${response.status}`) :
                    (data || `HTTP error! status: ${response.status}`);
                console.error('❌ Response não OK:', errorMessage);
                throw new Error(errorMessage);
            }

            return data;
        } catch (error) {
            console.error('❌ API Request failed:', error);
            console.error('❌ Stack trace:', error.stack);
            throw error;
        }
    }

    // ====== MÉTODOS DE AUTENTICAÇÃO ======

    static async login(credentials) {
        return this.request('/Authenticate/login', {
            method: 'POST',
            body: {
                email: credentials.email,
                password: credentials.password
            }
        });
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

    // ====== MÉTODOS DE ESPECIALIDADES ======

    // (Removido: getSpeciality antigo)

    /**
     * POST /api/serviceProvider/specialities
     * Salva/Atualiza a especialidade do prestador
     * @param {string} speciality - Nome da especialidade
     */
    static async saveSpeciality(speciality) {
        return this.request('/serviceProvider/specialities', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(speciality) // Envia a string diretamente como JSON
        });
    }

    // ====== MÉTODOS DE SERVIÇOS ======

    // (Removido: getServices antigo)
    /**
     * GET /api/service/all
     * Busca todos os serviços disponíveis (para agendamento)
     */
    static async getServices() {
        return this.request('/service/all', {
            method: 'GET'
        });
    }

    /**
     * GET /api/serviceProvider/all
     * Busca todos os prestadores de serviço (inclui especialidade)
     */
    static async getSpeciality() {
        return this.request('/serviceProvider/all', {
            method: 'GET'
        });
    }

    /**
     * GET /api/service/{id}
     * Busca um serviço específico por ID
     */
    static async getServiceById(serviceId) {
        return this.request(`/service/${serviceId}`, {
            method: 'GET'
        });
    }

    /**
     * POST /api/service/create-service
     * Cria um novo serviço
     */
    static async createService(serviceData) {
        return this.request('/service/create-service', {
            method: 'POST',
            body: serviceData
        });
    }

    /**
     * PUT /api/service/{id}
     * Atualiza um serviço existente
     */
    static async updateService(id, serviceData) {
        return this.request(`/service/${id}`, {
            method: 'PUT',
            body: serviceData
        });
    }

    /**
     * DELETE /api/service/services?serviceId={id}
     * Deleta um serviço
     */
    static async deleteService(serviceId) {
        return this.request(`/service/${serviceId}`, {
            method: 'DELETE'
        });
    }

    // ====== MÉTODOS DE PROVIDERS ======

    /**
     * GET /api/serviceProvider/all
     * Busca todos os prestadores de serviço
     */
    static async getAllProviders() {
        return this.request('/serviceProvider/all', {
            method: 'GET'
        });
    }

    /**
     * GET /api/serviceProvider/{id}
     * Busca um prestador específico por ID
     */
    static async getProviderById(providerId) {
        return this.request(`/serviceProvider/${providerId}`, {
            method: 'GET'
        });
    }

    // ====== MÉTODOS DE AGENDAMENTOS ======

    /**
     * GET /api/appointment/all
     * Busca todos os agendamentos do usuário logado
     */
    static async getAllAppointments() {
        return this.request('/appointment/all', {
            method: 'GET'
        });
    }

    /**
     * POST /api/appointment/create-appointment
     * Cria um novo agendamento
     * @param {Object} appointmentData
     *   - serviceId
     *   - serviceProviderId
     *   - startDateTime
     *   - endDateTime
     *   - price
     *   - durationInMinutes
     */
    static async createAppointment(appointmentData) {
        const {
            serviceId,
            serviceProviderId,
            startDateTime,
            endDateTime,
            price,
            durationInMinutes
        } = appointmentData;

        const queryParams = new URLSearchParams({
            ServiceId: serviceId,
            ServiceProviderId: serviceProviderId,
            StartDateTime: startDateTime,
            EndDateTime: endDateTime,
            Price: price,
            DurationInMinutes: durationInMinutes
        });

        return this.request(`/appointment/create-appointment?${queryParams}`, {
            method: 'POST'
        });
    }

static async deleteAppointment(appointmentId) {
    if (!appointmentId) {
        throw new Error('ID do agendamento é obrigatório');
    }

    return this.request(`/appointment/${appointmentId}`, {
        method: 'DELETE'
    });
}

}