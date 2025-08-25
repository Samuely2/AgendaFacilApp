export class UIUtils {
    static showElement(id) {
        const element = document.getElementById(id);
        if (element) {
            element.classList.remove('hidden');
            element.classList.add('show');
        }
    }

    static hideElement(id) {
        const element = document.getElementById(id);
        if (element) {
            element.classList.add('hidden');
            element.classList.remove('show');
        }
    }

    static showError(message) {
        const errorDiv = document.getElementById('errorMessage');
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
            this.hideElement('successMessage');
        }
    }

    static showSuccess(message) {
        const successDiv = document.getElementById('successMessage');
        if (successDiv) {
            successDiv.textContent = message;
            successDiv.style.display = 'block';
            this.hideElement('errorMessage');
        }
    }

    static hideMessages() {
        const errorDiv = document.getElementById('errorMessage');
        const successDiv = document.getElementById('successMessage');
        if (errorDiv) errorDiv.style.display = 'none';
        if (successDiv) successDiv.style.display = 'none';
    }

    static setLoading(buttonId, loadingId, textId, isLoading) {
        const button = document.getElementById(buttonId);
        const loading = document.getElementById(loadingId);
        const text = document.getElementById(textId);
        
        if (button) button.disabled = isLoading;
        
        if (loading && text) {
            if (isLoading) {
                loading.classList.remove('hidden');
                text.classList.add('hidden');
            } else {
                loading.classList.add('hidden');
                text.classList.remove('hidden');
            }
        }
    }
}

export function showTab(tabName) {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const loginTabBtn = document.getElementById('loginTabBtn');
    const registerTabBtn = document.getElementById('registerTabBtn');

    if (tabName === 'login') {
        loginForm.classList.remove('hidden');
        registerForm.classList.add('hidden');
        loginTabBtn.classList.add('active');
        registerTabBtn.classList.remove('active');
    } else {
        loginForm.classList.add('hidden');
        registerForm.classList.remove('hidden');
        loginTabBtn.classList.remove('active');
        registerTabBtn.classList.add('active');
    }
    UIUtils.hideMessages();
}