const form = document.querySelector('#details-form');
const save = form.querySelector('button');
const detailsMessage = document.querySelector('#details-message');

const housing = form.elements.namedItem('housing');
const housingType = form.elements.namedItem('housingType');
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
    housingType.value = user.housingType || '';
    region.value = user.location || '';

    for (const input of form.querySelectorAll('input[type="checkbox"]')) {
        input.checked = (user.needs || []).includes(input.value);
    }
}

function showPage(user) {
    showOptions(user.options);

    housingType.replaceChildren(new Option('Selecione seu tipo de moradia', ''));

    for (const type of user.housingTypes) {
        housingType.add(new Option(type.name, type.code));
    }

    housingType.disabled = false;

    showDetails(user);

    detailsMessage.hidden = true;
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
    const fields = form.querySelectorAll('input, select');

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
