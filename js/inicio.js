function showPage(user) {
    document.querySelector('#welcome').textContent = `Olá, ${user.name}.`;

    document.querySelector('#home-status').textContent =
        user.housingType && user.location.trim()
            ? 'Seu perfil está pronto para gerar planos de preparação.'
            : 'Complete sua moradia e localização para gerar seus primeiros planos.';
}
