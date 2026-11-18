const account = document.querySelector('#account');
const message = document.querySelector('#account-message');
const logout = document.querySelector('#logout');
const retry = document.querySelector('#retry');
const form = document.querySelector('#details-form');
const save = form.querySelector('button');
const detailsMessage = document.querySelector('#details-message');
const housing = form.elements.namedItem('housing');
const housingType = form.elements.namedItem('housingType');
const region = form.elements.namedItem('location');
const needs = document.querySelector('#needs');
const planForm = document.querySelector('#plan-form');
const emergency = document.querySelector('#emergency');
const generate = document.querySelector('#generate-plan');
const savedPlans = document.querySelector('#saved-plans');
const planMessage = document.querySelector('#plan-message');
const planRetry = document.querySelector('#retry-plans');
const planResult = document.querySelector('#plan-result');
const editPlanForm = document.querySelector('#edit-plan-form');
const planEmergency = document.querySelector('#plan-emergency');
const updatePlan = document.querySelector('#update-plan');
const deletePlan = document.querySelector('#delete-plan');

let changed = false;
let plansReady = false;
let planBusy = false;
let planRequest = 0;

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
    changed = false;

    updatePlanButton();
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

        housingType.replaceChildren(new Option('Selecione seu tipo de moradia', ''));
        for (const type of user.housingTypes) {
            housingType.add(new Option(type.name, type.code));
        }
        housingType.disabled = false;

        showDetails(user);

        message.hidden = true;
        detailsMessage.hidden = true;
        account.hidden = false;
        logout.hidden = false;

        await loadPlans();
    } catch {
        message.textContent = 'Não foi possível carregar sua conta. Tente novamente.';
        retry.hidden = false;
    }
}

form.addEventListener('input', () => {
    detailsMessage.hidden = true;
    changed = true;
    updatePlanButton();
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

    updatePlanButton();

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

        updatePlanButton();

        detailsMessage.hidden = false;
        detailsMessage.focus();
    }
});

function updatePlanButton() {
    const incomplete = !housingType.value || !region.value.trim();
    const locked = !plansReady || save.disabled || planBusy;

    generate.disabled = locked || changed || incomplete;
    updatePlan.disabled = generate.disabled || planResult.hidden;
    deletePlan.disabled = locked || planResult.hidden;
    planEmergency.disabled = locked || planResult.hidden;

    document.querySelector('#plan-hint').textContent = changed
        ? 'Salve as alterações nos detalhes antes de gerar um plano.'
        : incomplete
        ? 'Selecione seu tipo de moradia e salve sua localização antes de gerar um plano.'
        : 'Usa os dados que você salvou no perfil.';

    document.querySelector('#edit-plan-hint').textContent = changed
        ? 'Salve as alterações nos detalhes antes de atualizar este plano.'
        : incomplete
        ? 'Selecione seu tipo de moradia e salve sua localização antes de atualizar este plano.'
        : 'Substitui as orientações deste plano usando seu perfil salvo.';
}

function setPlanBusy(busy) {
    planBusy = busy;

    if (busy) {
        planRequest += 1;
    }

    save.disabled = busy;
    emergency.disabled = busy || !plansReady;

    savedPlans.disabled =
        busy || !plansReady || ![...savedPlans.options].some((option) => option.value);

    updatePlanButton();
}

async function requestPlan(path, body, method = body ? 'POST' : 'GET') {
    const response = await fetch(new URL(path, API_URL), {
        method,
        credentials: 'include',
        cache: 'no-store',
        body,
    });

    if (response.status === 401) {
        window.location.replace('index.html');
        throw new Error('Entre na sua conta para continuar.');
    }

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || 'Não foi possível acessar seus planos.');
    }

    return data;
}

function showPlanError(error) {
    planMessage.textContent =
        error instanceof TypeError || error instanceof SyntaxError
            ? 'Não foi possível conectar à plataforma. Tente novamente.'
            : error.message;
    planMessage.hidden = false;
}

function planLabel(plan) {
    return `${plan.title} · ${new Date(plan.createdAt).toLocaleString('pt-BR')}`;
}

function showPlan(plan) {
    document.querySelector('#plan-title').textContent = plan.title;
    document.querySelector('#plan-meta').textContent = `Criado em ${new Date(
        plan.createdAt,
    ).toLocaleString('pt-BR')}`;

    planEmergency.value = plan.emergency;

    const profile = document.querySelector('#plan-profile');
    const labels = new Map(
        [...needs.querySelectorAll('label')].map((label) => [
            label.querySelector('input').value,
            label.querySelector('span').textContent,
        ]),
    );

    const types = new Map(
        [...housingType.options]
            .filter((option) => option.value)
            .map((option) => [option.value, option.textContent]),
    );

    profile.replaceChildren();

    for (const [label, value] of [
        ['Nome', plan.profile.name],
        ['Tipo de moradia', types.get(plan.profile.housingType) || 'Não informado'],
        ['Detalhes da moradia', plan.profile.housing || 'Não informados'],
        ['Localização', plan.profile.location],
        [
            'Necessidades de assistência',
            plan.profile.needs
                .map((code) => labels.get(code) || 'Necessidade de assistência')
                .join(', ') || 'Nenhuma cadastrada',
        ],
    ]) {
        const row = document.createElement('div');
        const title = document.createElement('dt');
        const text = document.createElement('dd');

        title.textContent = label;
        text.textContent = value;

        row.append(title, text);
        profile.append(row);
    }

    const list = document.querySelector('#orientations');
    list.replaceChildren();

    for (const item of plan.orientations) {
        const row = document.createElement('li');
        const text = document.createElement('p');
        const source = document.createElement('a');

        text.textContent = item.text;

        source.textContent = 'Saiba mais';
        source.href = item.source;
        source.target = '_blank';
        source.rel = 'noopener noreferrer';

        row.append(text, source);
        list.append(row);
    }

    planResult.hidden = false;

    updatePlanButton();
}

async function loadPlan() {
    const id = savedPlans.value;
    const request = ++planRequest;

    planResult.hidden = true;
    planMessage.hidden = true;
    planRetry.hidden = true;

    updatePlanButton();

    if (!id) {
        return;
    }

    try {
        const plan = await requestPlan(`/api/plans/${id}`);

        if (savedPlans.value === id && request === planRequest && !planBusy) {
            showPlan(plan);
        }
    } catch (error) {
        if (savedPlans.value === id && request === planRequest && !planBusy) {
            showPlanError(error);
            planRetry.hidden = false;
        }
    }
}

async function loadPlans() {
    plansReady = false;

    emergency.disabled = true;
    savedPlans.disabled = true;
    planRetry.hidden = true;
    planMessage.hidden = true;
    planResult.hidden = true;

    updatePlanButton();

    try {
        const data = await requestPlan('/api/plans');

        emergency.replaceChildren(new Option('Selecione uma emergência', ''));
        planEmergency.replaceChildren();

        for (const item of data.emergencies) {
            emergency.add(new Option(item.name, item.code));
            planEmergency.add(new Option(item.name, item.code));
        }

        savedPlans.replaceChildren(
            new Option(data.plans.length ? 'Selecione um plano' : 'Nenhum plano salvo', ''),
        );

        for (const plan of data.plans) {
            savedPlans.add(new Option(planLabel(plan), plan.id));
        }

        plansReady = true;

        emergency.disabled = false;
        savedPlans.disabled = !data.plans.length;

        if (data.plans.length) {
            savedPlans.value = String(data.plans[0].id);
            await loadPlan();
        }
    } catch (error) {
        showPlanError(error);

        planRetry.hidden = false;
    } finally {
        updatePlanButton();
    }
}

planForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (generate.disabled || !planForm.reportValidity()) {
        return;
    }

    const body = new URLSearchParams(new FormData(planForm));

    setPlanBusy(true);

    planRetry.hidden = true;
    planMessage.hidden = true;

    generate.textContent = 'Gerando...';

    try {
        const plan = await requestPlan('/api/plans', body);

        savedPlans.querySelector('option[value=""]').textContent = 'Selecione um plano';
        savedPlans.add(new Option(planLabel(plan), plan.id), 0);
        savedPlans.value = String(plan.id);

        showPlan(plan);

        planMessage.textContent = 'Plano salvo.';
        planMessage.hidden = false;
    } catch (error) {
        showPlanError(error);
    } finally {
        generate.textContent = 'Gerar e salvar plano';

        setPlanBusy(false);
    }
});

editPlanForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (updatePlan.disabled || !editPlanForm.reportValidity()) {
        return;
    }

    const id = savedPlans.value;
    const body = new URLSearchParams(new FormData(editPlanForm));

    setPlanBusy(true);

    planRetry.hidden = true;
    planMessage.hidden = true;
    updatePlan.textContent = 'Atualizando...';

    try {
        const plan = await requestPlan(`/api/plans/${id}`, body, 'PUT');

        savedPlans.selectedOptions[0].textContent = planLabel(plan);

        showPlan(plan);

        planMessage.textContent = 'Plano atualizado.';
        planMessage.hidden = false;
    } catch (error) {
        showPlanError(error);

        planRetry.hidden = false;
    } finally {
        updatePlan.textContent = 'Atualizar plano';

        setPlanBusy(false);
    }
});

deletePlan.addEventListener('click', async () => {
    if (
        deletePlan.disabled ||
        !window.confirm('Excluir este plano? Esta ação não pode ser desfeita.')
    ) {
        return;
    }

    const id = savedPlans.value;

    setPlanBusy(true);

    planRetry.hidden = true;
    planMessage.hidden = true;

    deletePlan.textContent = 'Excluindo...';

    try {
        await requestPlan(`/api/plans/${id}`, undefined, 'DELETE');

        savedPlans.selectedOptions[0].remove();
        savedPlans.value = '';
        savedPlans.querySelector('option[value=""]').textContent = [...savedPlans.options].some(
            (option) => option.value,
        )
            ? 'Selecione um plano'
            : 'Nenhum plano salvo';

        planResult.hidden = true;
        planMessage.textContent = 'Plano excluído.';
        planMessage.hidden = false;
    } catch (error) {
        showPlanError(error);
        planRetry.hidden = false;
    } finally {
        deletePlan.textContent = 'Excluir plano';
        setPlanBusy(false);
    }
});

savedPlans.addEventListener('change', loadPlan);
planRetry.addEventListener('click', loadPlans);

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
