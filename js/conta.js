function showPage(user) {
    document.querySelector('#account-name').textContent = user.name;
    document.querySelector('#account-email').textContent = user.email;
}
