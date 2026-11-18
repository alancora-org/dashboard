const deleteAccount = document.querySelector('#delete-account');

function showPage(user) {
    document.querySelector('#account-name').textContent = user.name;
    document.querySelector('#account-email').textContent = user.email;
}

deleteAccount.addEventListener('click', async () => {
    if (
        deleteAccount.disabled ||
        logout.disabled ||
        !window.confirm('Excluir sua conta e todos os seus dados? Esta ação não pode ser desfeita.')
    ) {
        return;
    }

    deleteAccount.disabled = true;
    logout.disabled = true;
    deleteAccount.textContent = 'Excluindo...';
    message.hidden = true;

    try {
        const response = await fetch(new URL('/api/auth/me', API_URL), {
            method: 'DELETE',
            credentials: 'include',
        });

        if (response.status === 401) {
            window.location.replace('index.html');
            return;
        }

        if (!response.ok) {
            throw new Error('Não foi possível excluir sua conta.');
        }

        window.location.replace('index.html');
    } catch {
        message.textContent = 'Não foi possível excluir sua conta. Tente novamente.';
        message.hidden = false;
        deleteAccount.disabled = false;
        logout.disabled = false;
        deleteAccount.textContent = 'Excluir conta';
    }
});
