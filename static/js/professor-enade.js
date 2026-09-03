(() => {
    'use strict';

    const COURSES = {
        'engenharia-civil': {
            label: 'Engenharia Civil',
            knowledgeObjects: [
                'Administração e Economia aplicadas à Engenharia Civil',
                'Informática, algoritmos e programação',
                'Ciência dos materiais',
                'Ciências do ambiente',
                'Eletricidade aplicada à Engenharia Civil',
                'Estatística, Física, Matemática e Química aplicadas à Engenharia Civil',
                'Expressão gráfica e desenho universal',
                'Fenômenos de transporte',
                'Mecânica dos sólidos',
                'Metodologia científica e tecnológica',
                'Topografia',
                'Construção civil',
                'Estruturas',
                'Geotecnia',
                'Recursos hídricos e saneamento',
                'Transportes',
            ],
            subjectSuggestions: {
                'Administração e Economia aplicadas à Engenharia Civil': ['Viabilidade técnico-econômica', 'Gestão de custos', 'Lean Construction e Just-in-Time'],
                'Informática, algoritmos e programação': ['Lógica e pseudocódigo', 'Automação de cálculos', 'IA aplicada à engenharia'],
                'Ciência dos materiais': ['Dosagem e controle do concreto', 'Aços para construção', 'Ensaios mecânicos'],
                'Ciências do ambiente': ['Resíduos da construção', 'Licenciamento ambiental', 'Análise de ciclo de vida'],
                'Eletricidade aplicada à Engenharia Civil': ['Instalações prediais', 'Dispositivos de proteção', 'Eficiência energética'],
                'Estatística, Física, Matemática e Química aplicadas à Engenharia Civil': ['Controle estatístico', 'Otimização de projetos', 'Química dos materiais'],
                'Expressão gráfica e desenho universal': ['Modelagem paramétrica', 'Projeções ortogonais', 'Nuvem de pontos e LiDAR'],
                'Fenômenos de transporte': ['Condutos forçados', 'Escoamento em canais', 'Perda de carga'],
                'Mecânica dos sólidos': ['Esforço cortante e momento fletor', 'Tensão e deformação', 'Análise de treliças'],
                'Metodologia científica e tecnológica': ['Metodologias ágeis', 'Pesquisa aplicada', 'Inovação tecnológica'],
                'Topografia': ['Nivelamento', 'Cálculo de volumes', 'SIG e sensoriamento remoto'],
                'Construção civil': ['Last Planner System', 'Mapeamento do Fluxo de Valor', 'BIM e transformação digital', 'Linha de Balanço', '5S e redução de perdas'],
                'Estruturas': ['Concreto armado', 'Estruturas metálicas', 'Combinações de carregamento'],
                'Geotecnia': ['Fundações', 'Empuxos e contenções', 'Adensamento', 'Estabilidade de taludes'],
                'Recursos hídricos e saneamento': ['ETA e ETE', 'Drenagem urbana', 'Hidrologia de bacias'],
                'Transportes': ['Projeto geométrico', 'Pavimentação', 'Mobilidade urbana', 'Terraplenagem'],
            },
        },
        'arquitetura-urbanismo': {
            label: 'Arquitetura e Urbanismo',
            knowledgeObjects: [
                'Estética e história das artes',
                'Estudos sociais, econômicos e ambientais',
                'Sustentabilidade',
                'Desenho e meios de representação e de expressão',
                'Teoria e história da arquitetura, do urbanismo e da arquitetura da paisagem',
                'Projeto de arquitetura',
                'Projeto de urbanismo',
                'Projeto de arquitetura da paisagem',
                'Projeto de arquitetura de interiores',
                'Planejamento urbano e regional',
                'Políticas públicas e habitacionais',
                'Tecnologia da construção',
                'Infraestrutura urbana',
                'Gestão e coordenação de projetos e obras',
                'Sistemas estruturais',
                'Conforto ambiental e eficiência energética',
                'Mobilidade urbana',
                'Desenho universal e acessibilidade',
                'Patrimônio cultural e técnicas retrospectivas',
                'Tecnologias digitais aplicadas a arquitetura e urbanismo',
            ],
            subjectSuggestions: {
                'Sustentabilidade': ['Certificações ambientais', 'Eficiência hídrica', 'Materiais de baixo impacto'],
                'Projeto de arquitetura': ['Programa de necessidades', 'Partido arquitetônico', 'Modulação estrutural'],
                'Projeto de urbanismo': ['Uso e ocupação do solo', 'Desenho de espaços públicos', 'Adensamento urbano'],
                'Tecnologia da construção': ['Sistemas construtivos industrializados', 'Alvenaria estrutural', 'BIM na execução'],
                'Conforto ambiental e eficiência energética': ['Ventilação natural', 'Conforto térmico', 'Iluminação natural'],
                'Patrimônio cultural e técnicas retrospectivas': ['Restauro arquitetônico', 'Retrofit de edificações', 'Tombamento e preservação'],
                'Mobilidade urbana': ['Sistema viário', 'Transporte ativo', 'Acessibilidade urbana'],
                'Desenho universal e acessibilidade': ['NBR 9050', 'Rotas acessíveis', 'Desenho inclusivo'],
            },
        },
        'engenharia-producao': {
            label: 'Engenharia de Produção',
            enabled: false,
            knowledgeObjects: [],
            subjectSuggestions: {},
        },
    };

    const form = document.getElementById('enade-form');
    if (!form) return;

    const state = {
        course: '',
        itemType: '',
        knowledgeObject: '',
        subject: '',
        bloomLevel: 'Analisar',
        difficulty: 'Média',
        result: null,
        activeTab: 'item',
        loading: false,
    };

    const courseButtons = [...document.querySelectorAll('[data-course]')];
    const stepCourseNumber = document.getElementById('step-course-number');
    const stepType = document.getElementById('step-type');
    const typeButtons = [...document.querySelectorAll('[data-item-type]')];
    const stepTwo = document.getElementById('step-two');
    const stepOneNumber = document.getElementById('step-one-number');
    const stepTwoNumber = document.getElementById('step-two-number');
    const knowledgeSelect = document.getElementById('knowledge-object');
    const refinement = document.getElementById('enade-refinement');
    const subjectInput = document.getElementById('enade-subject');
    const suggestions = document.getElementById('subject-suggestions');
    const generateButton = document.getElementById('enade-generate');
    const emptyState = document.getElementById('enade-empty');
    const loadingState = document.getElementById('enade-loading');
    const output = document.getElementById('enade-output');
    const resultPanel = document.getElementById('enade-result');
    const alertBox = document.getElementById('enade-alert');
    const tabButtons = [...document.querySelectorAll('.enade-tabs [data-tab]')];

    function escapeHtml(value) {
        return String(value ?? '')
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#039;');
    }

    function fillKnowledgeObjects() {
        const course = COURSES[state.course];
        knowledgeSelect.replaceChildren();
        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.selected = true;
        placeholder.disabled = true;
        placeholder.textContent = course ? `Selecione um dos ${course.knowledgeObjects.length} objetos` : 'Selecione o curso primeiro';
        knowledgeSelect.append(placeholder);
        (course ? course.knowledgeObjects : []).forEach((object, index) => {
            const option = document.createElement('option');
            option.value = object;
            option.textContent = `${String(index + 1).padStart(2, '0')} · ${object}`;
            knowledgeSelect.append(option);
        });
    }

    function markStep(numberElement, done, fallback) {
        numberElement.classList.toggle('is-done', done);
        numberElement.innerHTML = done ? '<i class="fas fa-check" aria-hidden="true"></i>' : fallback;
    }

    function updateReadyState() {
        generateButton.disabled = !(state.course && state.itemType && state.knowledgeObject) || state.loading;
    }

    function showAlert(message, type = 'error') {
        alertBox.textContent = message;
        alertBox.hidden = false;
        alertBox.classList.toggle('is-success', type === 'success');
        alertBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    function hideAlert() {
        alertBox.hidden = true;
        alertBox.textContent = '';
        alertBox.classList.remove('is-success');
    }

    function renderSuggestions() {
        suggestions.replaceChildren();
        const course = COURSES[state.course];
        const list = (course && course.subjectSuggestions[state.knowledgeObject]) || [];
        list.forEach(label => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'enade-suggestion';
            button.textContent = label;
            button.classList.toggle('is-active', state.subject === label);
            button.addEventListener('click', () => {
                state.subject = label;
                subjectInput.value = label;
                renderSuggestions();
            });
            suggestions.append(button);
        });
    }

    courseButtons.forEach(button => {
        if (button.disabled) return;
        button.addEventListener('click', () => {
            state.course = button.dataset.course;
            state.itemType = '';
            state.knowledgeObject = '';
            state.subject = '';
            subjectInput.value = '';
            refinement.hidden = true;

            courseButtons.forEach(item => {
                const selected = item === button;
                item.classList.toggle('is-selected', selected);
                item.setAttribute('aria-pressed', String(selected));
            });
            typeButtons.forEach(item => {
                item.classList.remove('is-selected');
                item.setAttribute('aria-pressed', 'false');
            });
            stepType.disabled = false;
            stepType.classList.remove('is-disabled');
            stepTwo.disabled = true;
            stepTwo.classList.add('is-disabled');
            markStep(stepCourseNumber, true, '1');
            markStep(stepOneNumber, false, '2');
            markStep(stepTwoNumber, false, '3');
            fillKnowledgeObjects();
            updateReadyState();
        });
    });

    typeButtons.forEach(button => {
        button.addEventListener('click', () => {
            state.itemType = button.dataset.itemType;
            typeButtons.forEach(item => {
                const selected = item === button;
                item.classList.toggle('is-selected', selected);
                item.setAttribute('aria-pressed', String(selected));
            });
            stepTwo.disabled = false;
            stepTwo.classList.remove('is-disabled');
            markStep(stepOneNumber, true, '2');
            updateReadyState();
        });
    });

    knowledgeSelect.addEventListener('change', () => {
        state.knowledgeObject = knowledgeSelect.value;
        state.subject = '';
        subjectInput.value = '';
        refinement.hidden = !state.knowledgeObject;
        markStep(stepTwoNumber, Boolean(state.knowledgeObject), '3');
        renderSuggestions();
        updateReadyState();
    });

    subjectInput.addEventListener('input', () => {
        state.subject = subjectInput.value.trim();
        renderSuggestions();
    });

    document.querySelectorAll('.enade-segmented').forEach(group => {
        group.querySelectorAll('button').forEach(button => {
            button.addEventListener('click', () => {
                group.querySelectorAll('button').forEach(item => item.classList.toggle('is-active', item === button));
                if (group.dataset.group === 'bloom') state.bloomLevel = button.dataset.value;
                if (group.dataset.group === 'difficulty') state.difficulty = button.dataset.value;
            });
        });
    });

    function setLoading(loading) {
        state.loading = loading;
        updateReadyState();
        generateButton.querySelector('span').textContent = loading ? 'Elaborando e auditando...' : 'Gerar questão ENADE';
        generateButton.querySelector('i').className = loading ? 'fas fa-spinner fa-spin' : 'fas fa-wand-magic-sparkles';
        if (loading) {
            emptyState.hidden = true;
            output.hidden = true;
            loadingState.hidden = false;
            resultPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
            loadingState.hidden = true;
            if (!state.result) emptyState.hidden = false;
        }
    }

    async function generateQuestion() {
        if (!state.course || !state.itemType || !state.knowledgeObject || state.loading) return;
        hideAlert();
        setLoading(true);

        try {
            // Parâmetro de teste temporário, lido só da URL (?thinkingLevel=low), sem UI visível. Remover após decidirmos o valor definitivo.
            const testThinkingLevel = new URLSearchParams(window.location.search).get('thinkingLevel');
            const response = await fetch('/api/generate-professor-enade', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    course: state.course,
                    itemType: state.itemType,
                    knowledgeObject: state.knowledgeObject,
                    subject: state.subject,
                    bloomLevel: state.bloomLevel,
                    difficulty: state.difficulty,
                    ...(testThinkingLevel ? { thinkingLevel: testThinkingLevel } : {}),
                }),
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(data.error || 'Não foi possível gerar a questão.');
            if (data.debug) console.info('[PROFESSOR-ENADE debug]', data.debug);
            state.result = data;
            state.activeTab = 'item';
            renderResult();
            showAlert('Questão gerada e aprovada na auditoria estrutural.', 'success');
            document.getElementById('enade-result').scrollIntoView({ behavior: 'smooth', block: 'start' });
        } catch (error) {
            showAlert(error instanceof Error ? error.message : 'Não foi possível gerar a questão agora.');
            if (state.result) output.hidden = false;
        } finally {
            setLoading(false);
        }
    }

    form.addEventListener('submit', event => {
        event.preventDefault();
        generateQuestion();
    });

    form.addEventListener('reset', () => {
        window.setTimeout(() => {
            state.course = '';
            state.itemType = '';
            state.knowledgeObject = '';
            state.subject = '';
            state.bloomLevel = 'Analisar';
            state.difficulty = 'Média';
            state.result = null;
            state.activeTab = 'item';
            state.loading = false;
            courseButtons.forEach(button => {
                button.classList.remove('is-selected');
                button.setAttribute('aria-pressed', 'false');
            });
            typeButtons.forEach(button => {
                button.classList.remove('is-selected');
                button.setAttribute('aria-pressed', 'false');
            });
            stepType.disabled = true;
            stepType.classList.add('is-disabled');
            stepTwo.disabled = true;
            stepTwo.classList.add('is-disabled');
            refinement.hidden = true;
            suggestions.replaceChildren();
            fillKnowledgeObjects();
            document.querySelectorAll('.enade-segmented').forEach(group => {
                const defaultValue = group.dataset.group === 'bloom' ? 'Analisar' : 'Média';
                group.querySelectorAll('button').forEach(button => button.classList.toggle('is-active', button.dataset.value === defaultValue));
            });
            markStep(stepCourseNumber, false, '1');
            markStep(stepOneNumber, false, '2');
            markStep(stepTwoNumber, false, '3');
            emptyState.hidden = false;
            loadingState.hidden = true;
            output.hidden = true;
            hideAlert();
            updateReadyState();
        }, 0);
    });

    function section(kicker, content, customClass = '') {
        return `<section class="enade-output-section"><h4 class="enade-output-kicker">${escapeHtml(kicker)}</h4><div class="${customClass || 'enade-output-copy'}">${content}</div></section>`;
    }

    function renderItemTab(item) {
        let html = section('01 · Texto-base / Contexto', escapeHtml(item.baseText));
        html += section('02 · Comando / Enunciado', escapeHtml(item.command), 'enade-command');
        if (item.itemType === 'Múltipla Escolha') {
            const options = item.options.map(option => `<div class="enade-option"><span>${escapeHtml(option.letter)}</span><p>${escapeHtml(option.text)}</p></div>`).join('');
            html += section('03 · Opções de resposta', options, 'enade-options');
        }
        return html;
    }

    function renderAnswerTab(item) {
        if (item.itemType === 'Múltipla Escolha') {
            const rationales = item.justifications.map(entry => `
                <div class="enade-rationale ${entry.status === 'CORRETA' ? 'is-correct' : ''}">
                    <div class="enade-rationale-head"><strong>Alternativa ${escapeHtml(entry.letter)}</strong><span class="enade-status">${escapeHtml(entry.status)}</span></div>
                    <p>${escapeHtml(entry.rationale)}</p>
                </div>`).join('');
            return `<div class="enade-answer-hero"><span>Resposta correta</span><strong>${escapeHtml(item.correctAnswer)}</strong></div><div class="enade-rationales">${rationales}</div>`;
        }

        const rubricRows = item.rubric.map(row => `<tr><td>${escapeHtml(row.criterion)}</td><td>${escapeHtml(row.evidence)}</td><td>${Number(row.points).toFixed(1).replace('.', ',')}</td></tr>`).join('');
        const paths = item.alternativePaths.map(entry => `<li>${escapeHtml(entry)}</li>`).join('');
        const criteria = item.correctionCriteria.map(entry => `<li>${escapeHtml(entry)}</li>`).join('');
        return section('Resolução analítica / técnica esperada', escapeHtml(item.expectedAnswer)) +
            section('Distribuição de pontos', `<div class="enade-rubric-wrap"><table class="enade-rubric"><thead><tr><th>Quesito</th><th>Critério de avaliação</th><th>Pontos</th></tr></thead><tbody>${rubricRows}<tr class="enade-total"><td>Total</td><td></td><td>10,0</td></tr></tbody></table></div>`, '') +
            section('Caminhos alternativos válidos', `<ul class="enade-criteria">${paths}</ul>`, '') +
            section('Critérios detalhados de correção', `<ul class="enade-criteria">${criteria}</ul>`, '');
    }

    function renderAuditTab(item, result) {
        const auditRows = item.qualityAudit.map(check => `
            <div class="enade-audit-row"><span class="enade-audit-icon"><i class="fas fa-check"></i></span><div><strong>${escapeHtml(check.rule)}</strong><p>${escapeHtml(check.evidence)}</p></div></div>`).join('');
        return `<div class="enade-audit-summary"><div><i class="fas fa-circle-check"></i><span><strong>Item aprovado</strong>${escapeHtml(result.validation.message)}</span></div><span class="enade-audit-count">${result.validation.checks}/${result.validation.checks}</span></div>
            <div class="enade-audit-list">${auditRows}</div>
            <div class="enade-model-note"><i class="fas fa-microchip"></i> Gerado por <strong>${escapeHtml(result.model)}</strong>. A aprovação final permanece sob responsabilidade docente.</div>`;
    }

    function renderActiveTab() {
        if (!state.result) return;
        const item = state.result.item;
        const content = document.getElementById('output-content');
        tabButtons.forEach(button => {
            const active = button.dataset.tab === state.activeTab;
            button.classList.toggle('is-active', active);
            button.setAttribute('aria-selected', String(active));
        });
        if (state.activeTab === 'item') content.innerHTML = renderItemTab(item);
        if (state.activeTab === 'answer') content.innerHTML = renderAnswerTab(item);
        if (state.activeTab === 'audit') content.innerHTML = renderAuditTab(item, state.result);
    }

    function renderResult() {
        const item = state.result.item;
        document.getElementById('output-title').textContent = item.title;
        document.getElementById('answer-tab-button').querySelector('span').textContent = item.itemType === 'Múltipla Escolha' ? 'Gabarito' : 'Padrão de resposta';
        document.getElementById('output-metadata').innerHTML = `
            <span class="enade-meta-chip is-primary">${escapeHtml(item.itemType)}</span>
            <span class="enade-meta-chip">Bloom · ${escapeHtml(item.metadata.bloomLevel)}</span>
            <span class="enade-meta-chip">${escapeHtml(item.metadata.difficulty)}</span>
            <span class="enade-meta-chip">${escapeHtml(item.metadata.skillCode)}</span>
            <span class="enade-meta-time">${escapeHtml(item.metadata.estimatedMinutes)} min estimados</span>`;
        emptyState.hidden = true;
        loadingState.hidden = true;
        output.hidden = false;
        renderActiveTab();
    }

    tabButtons.forEach(button => button.addEventListener('click', () => {
        state.activeTab = button.dataset.tab;
        renderActiveTab();
    }));

    function formatMarkdown(result) {
        const item = result.item;
        const metadata = item.metadata;
        const lines = [
            `# ${item.title}`, '',
            `**Tipo:** ${item.itemType}`,
            `**Objeto de conhecimento:** ${metadata.knowledgeObject}`,
            `**Tema:** ${metadata.subject}`,
            `**Competência/Habilidade:** ${metadata.competence} — ${metadata.skillCode} (${metadata.skillDescription})`,
            `**Taxonomia de Bloom:** ${metadata.bloomLevel}`,
            `**Dificuldade:** ${metadata.difficulty}`, '',
            '## Texto-base / Contexto', '', item.baseText, '',
            '## Comando / Enunciado', '', item.command, '',
        ];
        if (item.itemType === 'Múltipla Escolha') {
            lines.push('## Opções de resposta', '');
            item.options.forEach(option => lines.push(`**${option.letter})** ${option.text}`, ''));
            lines.push(`## Resposta correta: ${item.correctAnswer}`, '', '### Justificativas', '');
            item.justifications.forEach(entry => lines.push(`**${entry.letter} — ${entry.status}:** ${entry.rationale}`, ''));
        } else {
            lines.push('## Padrão de resposta', '', item.expectedAnswer, '', '### Rubrica', '', '| Quesito | Critério de avaliação | Pontos |', '|---|---|---:|');
            item.rubric.forEach(row => lines.push(`| ${row.criterion} | ${row.evidence} | ${Number(row.points).toFixed(1).replace('.', ',')} |`));
            lines.push('| **Total** |  | **10,0** |', '', '### Caminhos alternativos válidos', '');
            item.alternativePaths.forEach(entry => lines.push(`- ${entry}`));
            lines.push('', '### Critérios de correção', '');
            item.correctionCriteria.forEach(entry => lines.push(`- ${entry}`));
        }
        lines.push('', '---', `Gerado em vicduarte.site com ${result.model}. Revisão docente obrigatória.`);
        return lines.join('\n');
    }

    document.getElementById('enade-copy').addEventListener('click', async () => {
        if (!state.result) return;
        const text = formatMarkdown(state.result);
        try {
            await navigator.clipboard.writeText(text);
            showAlert('Questão copiada em formato Markdown.', 'success');
        } catch {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.append(textarea);
            textarea.select();
            document.execCommand('copy');
            textarea.remove();
            showAlert('Questão copiada em formato Markdown.', 'success');
        }
    });

    document.getElementById('enade-download').addEventListener('click', () => {
        if (!state.result) return;
        const blob = new Blob([formatMarkdown(state.result)], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `questao-enade-${Date.now()}.md`;
        anchor.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        showAlert('Arquivo Markdown baixado.', 'success');
    });

    document.getElementById('enade-regenerate').addEventListener('click', generateQuestion);

    fillKnowledgeObjects();
    updateReadyState();
})();
