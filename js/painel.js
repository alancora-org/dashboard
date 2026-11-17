const account = document.querySelector('#account');
const message = document.querySelector('#account-message');
const logout = document.querySelector('#logout');
const retry = document.querySelector('#retry');

async function loadAccount() {
    account.hidden = true;
    logout.hidden = true;
    retry.hidden = true;

    message.textContent = 'Carregando sua conta...';
    message.hidden = false;

    try {
        const response = await fetch('https://api.alancora.org/api/auth/me', {
            credentials: 'include',
            cache: 'no-store',
        });

        if (response.status === 401) {
            window.location.replace('index.html');
            return;
        }

        if (!response.ok) {
            throw new Error('Não foi possível carregar sua conta.');
        }

        const user = await response.json();

        document.querySelector('#welcome').textContent = `Olá, ${user.name}.`;
        document.querySelector('#account-name').textContent = user.name;
        document.querySelector('#account-email').textContent = user.email;

        message.hidden = true;
        account.hidden = false;
        logout.hidden = false;
    } catch {
        message.textContent = 'Não foi possível carregar sua conta. Tente novamente.';
        retry.hidden = false;
    }
}

logout.addEventListener('click', async () => {
    logout.disabled = true;

    try {
        const response = await fetch('https://api.alancora.org/api/auth/logout', {
            method: 'POST',
            credentials: 'include',
        });

        if (!response.ok) {
            throw new Error('Não foi possível sair.');
        }

        window.location.replace('index.html');
    } catch {
        message.textContent = 'Não foi possível sair da conta. Tente novamente.';
        message.hidden = false;
        logout.disabled = false;
    }
});

retry.addEventListener('click', loadAccount);

window.addEventListener('pageshow', loadAccount);
window.addEventListener('pagehide', () => {
    account.hidden = true;
    logout.hidden = true;
});
