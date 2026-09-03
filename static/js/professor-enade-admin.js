(() => {
    'use strict';

    const restricted = document.getElementById('admin-restricted');
    const loading = document.getElementById('admin-metrics-loading');
    const content = document.getElementById('admin-metrics-content');
    const totalEl = document.getElementById('admin-total');
    const sevenEl = document.getElementById('admin-7d');
    const thirtyEl = document.getElementById('admin-30d');
    const porProfessorEl = document.getElementById('admin-por-professor');
    const porCursoEl = document.getElementById('admin-por-curso');
    const workspaceContent = document.getElementById('enade-workspace-content');
    if (!workspaceContent) return;

    function renderList(el, counts) {
        el.innerHTML = '';
        const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
        if (entries.length === 0) {
            const li = document.createElement('li');
            li.innerHTML = '<span>Nenhum registro ainda</span>';
            el.appendChild(li);
            return;
        }
        for (const [label, count] of entries) {
            const li = document.createElement('li');
            li.innerHTML = `<span>${label}</span><span>${count}</span>`;
            el.appendChild(li);
        }
    }

    async function loadMetrics() {
        loading.hidden = false;
        content.hidden = true;
        restricted.hidden = true;

        try {
            const token = await window.ProfessorEnadeAuth?.getIdToken?.();
            const response = await fetch('/api/admin-metrics', {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });

            if (response.status === 403) {
                restricted.hidden = false;
                return;
            }

            const data = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(data.error || 'Não foi possível carregar as métricas.');

            totalEl.textContent = data.total ?? 0;
            sevenEl.textContent = data.ultimos7Dias ?? 0;
            thirtyEl.textContent = data.ultimos30Dias ?? 0;
            renderList(porProfessorEl, data.porProfessor || {});
            renderList(porCursoEl, data.porCurso || {});
            content.hidden = false;
        } catch (error) {
            restricted.hidden = false;
            restricted.textContent = error instanceof Error ? error.message : 'Não foi possível carregar as métricas.';
        } finally {
            loading.hidden = true;
        }
    }

    // Observa quando o gate de auth revela o conteúdo (usuário logado e
    // verificado) pra só então buscar as métricas — sem isso, tentaríamos
    // buscar antes de haver um usuário autenticado.
    const observer = new MutationObserver(() => {
        if (!workspaceContent.hidden) loadMetrics();
    });
    observer.observe(workspaceContent, { attributes: true, attributeFilter: ['hidden'] });

    if (!workspaceContent.hidden) loadMetrics();
})();
