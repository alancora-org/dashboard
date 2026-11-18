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

let profile = null;
let plansReady = false;
let planBusy = false;
let planRequest = 0;

async function showPage(user) {
    profile = user;

    await loadPlans();
}

function updatePlanButton() {
    const incomplete = !profile || !profile.housingType || !profile.location.trim();
    const locked = !plansReady || planBusy;

    generate.disabled = locked || incomplete;
    updatePlan.disabled = generate.disabled || planResult.hidden;
    deletePlan.disabled = locked || planResult.hidden;
    planEmergency.disabled = locked || planResult.hidden;

    document.querySelector('#plan-hint').textContent = incomplete
        ? 'Preencha seu tipo de moradia e sua localização em Moradia e necessidades para gerar um plano.'
        : 'Usa os dados que você salvou no perfil.';

    document.querySelector('#edit-plan-hint').textContent = incomplete
        ? 'Preencha seu tipo de moradia e sua localização em Moradia e necessidades para atualizar este plano.'
        : 'Substitui as orientações deste plano usando seu perfil salvo.';
}

function setPlanBusy(busy) {
    planBusy = busy;

    if (busy) {
        planRequest += 1;
    }

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

    const details = document.querySelector('#plan-profile');
    const labels = new Map(profile.options.map((item) => [item.code, item.name]));
    const types = new Map(profile.housingTypes.map((item) => [item.code, item.name]));

    details.replaceChildren();

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
        details.append(row);
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
