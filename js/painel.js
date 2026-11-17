const account = document.querySelector('#account');
const message = document.querySelector('#account-message');
const logout = document.querySelector('#logout');
const retry = document.querySelector('#retry');
const form = document.querySelector('#details-form');
const save = form.querySelector('button');
const detailsMessage = document.querySelector('#details-message');
const housing = form.elements.namedItem('housing');
const region = form.elements.namedItem('location');
const needs = document.querySelector('#needs');

function showOptions(options) {
    needs.replaceChildren();

    for (const option of options) {
        const label = document.createElement('label');
        const input = document.createElement('input');
        const text = document.createElement('span');

        label.className = 'choice';
        input.type = 'checkbox';
        input.name = 'needs';
        input.value = option.code;
        text.textContent = option.name;

        label.append(input, text);
        needs.append(label);
    }

    if (!needs.childElementCount) {
        needs.textContent = 'Nenhuma opção disponível.';
    }
}

function showDetails(user) {
    housing.value = user.housing || '';
    region.value = user.location || '';

    for (const input of form.querySelectorAll('input[type="checkbox"]')) {
        input.checked = (user.needs || []).includes(input.value);
    }
}

async function loadAccount() {
    account.hidden = true;
    logout.hidden = true;
    retry.hidden = true;

    message.textContent = 'Carregando sua conta...';
    message.hidden = false;

    try {
        const response = await fetch(new URL('/api/auth/me', API_URL), {
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

        showOptions(user.options);
        showDetails(user);

        message.hidden = true;
        detailsMessage.hidden = true;
        account.hidden = false;
        logout.hidden = false;
    } catch {
        message.textContent = 'Não foi possível carregar sua conta. Tente novamente.';
        retry.hidden = false;
    }
}

form.addEventListener('input', () => {
    detailsMessage.hidden = true;
});

form.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!form.reportValidity() || save.disabled) {
        return;
    }

    const body = new URLSearchParams(new FormData(form));
    const fields = form.querySelectorAll('input');

    save.disabled = true;
    for (const field of fields) {
        field.disabled = true;
    }
    save.textContent = 'Salvando...';
    detailsMessage.hidden = true;

    try {
        const response = await fetch(new URL(form.getAttribute('action'), API_URL), {
            method: 'POST',
            credentials: 'include',
            body,
        });

        if (response.status === 401) {
            window.location.replace('index.html');
            return;
        }

        const user = await response.json();

        if (!response.ok) {
            throw new Error(user.error || 'Não foi possível salvar os detalhes.');
        }

        showDetails(user);

        detailsMessage.textContent = 'Detalhes salvos.';
    } catch (error) {
        detailsMessage.textContent =
            error instanceof TypeError || error instanceof SyntaxError
                ? 'Não foi possível conectar à plataforma. Tente novamente.'
                : error.message;
    } finally {
        save.disabled = false;
        for (const field of fields) {
            field.disabled = false;
        }
        save.textContent = 'Salvar detalhes';
        detailsMessage.hidden = false;
        detailsMessage.focus();
    }
});

logout.addEventListener('click', async () => {
    logout.disabled = true;

    try {
        const response = await fetch(new URL('/api/auth/logout', API_URL), {
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
