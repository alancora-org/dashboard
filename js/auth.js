const form = document.querySelector('#auth-form');
const button = form.querySelector('button');
const message = document.querySelector('#form-message');
const label = button.textContent;
const confirmation = form.elements.namedItem('confirmation');

function checkPasswords() {
    if (confirmation) {
        confirmation.setCustomValidity(
            confirmation.value !== form.elements.namedItem('password').value
                ? 'As senhas não coincidem.'
                : '',
        );
    }
}

form.addEventListener('input', () => {
    checkPasswords();
    message.hidden = true;
});

form.addEventListener('submit', async (event) => {
    event.preventDefault();

    checkPasswords();
    if (!form.reportValidity() || button.disabled) {
        return;
    }

    button.disabled = true;
    button.textContent = 'Carregando...';
    message.hidden = true;

    try {
        const response = await fetch(form.getAttribute('action'), {
            method: 'POST',
            credentials: 'include',
            body: new URLSearchParams(new FormData(form)),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Não foi possível continuar. Tente novamente.');
        }

        window.location.replace('painel.html');
    } catch (error) {
        message.textContent =
            error instanceof TypeError || error instanceof SyntaxError
                ? 'Não foi possível conectar à plataforma. Tente novamente.'
                : error.message;
        message.hidden = false;
        message.focus();

        button.disabled = false;
        button.textContent = label;
    }
});

fetch('https://api.alancora.org/api/auth/me', { credentials: 'include', cache: 'no-store' }).then((response) => {
    if (response.ok) {
        window.location.replace('painel.html');
    }
});
