# Design: Plataforma de Estudos para Concursos do Ceará 2026

**Data:** 2026-06-22  
**Status:** Aprovado  
**URL:** vicduarte.site/concursos

---

## Contexto

Victoria Duarte quer disponibilizar gratuitamente para o público geral uma plataforma de estudos voltada para os concursos ALECE 2026, TJ-CE 2026 e SEFAZ-CE 2026. A plataforma deve oferecer banco de questões interativo com gamificação e resumos por matéria — tudo como recurso de acesso livre, sem login.

---

## Decisões de arquitetura

- **Stack:** HTML + Bootstrap 5.3 + vanilla JS — mesmo do site existente (`vicduarte.site`)
- **Hospedagem:** Vercel, mesmo projeto, deploy automático via push na `main`
- **Armazenamento:** `localStorage` no navegador (sem backend, sem banco de dados)
- **Conteúdo:** Arquivos JSON dentro do projeto, gerados com base nos editais típicos de ALECE, TJ-CE e SEFAZ-CE

---

## Estrutura de arquivos

```
concursos/               ← renomear "concursos 2026/" para remover espaço da URL
  index.html             ← hub: seleção entre ALECE, TJ-CE e SEFAZ-CE
  alece/
    index.html           ← página principal ALECE 2026
  tjce/
    index.html           ← página principal TJ-CE 2026
  sefaz/
    index.html           ← página principal SEFAZ-CE 2026
  data/
    questoes-alece.json  ← banco de questões ALECE (nunca repetir IDs vistos)
    questoes-tjce.json   ← banco de questões TJ-CE
    questoes-sefaz.json  ← banco de questões SEFAZ-CE
    resumos-alece.json   ← resumos por matéria ALECE
    resumos-tjce.json    ← resumos por matéria TJ-CE
    resumos-sefaz.json   ← resumos por matéria SEFAZ-CE
```

Reutiliza `../static/css/style.css` e `../static/js/main.js` já existentes. Cada página de concurso inclui JS inline para lógica de quiz e gamificação.

---

## Funcionalidades

### 1. Hub (`/concursos`)

- Três cartões Bootstrap: ALECE 2026, TJ-CE 2026 e SEFAZ-CE 2026
- Cada cartão exibe: data estimada da prova, número de questões disponíveis, status de progresso do usuário (% respondidas)
- Visual: paleta `--primary: #092140`, `--accent-1: #BF452A`, fonte Inter — igual ao restante do site

### 2. Página de concurso (`/concursos/alece`, `/concursos/tjce` e `/concursos/sefaz`)

Duas abas principais:

#### Aba "Praticar Questões"

- Filtro por matéria (dropdown ou pills de filtro)
- Uma questão de múltipla escolha por vez (A a E)
- Ao responder: feedback imediato
  - Verde + ✓ se correto
  - Vermelho + ✗ + destaque da alternativa correta se errado
  - Explicação textual abaixo da resposta
- Botão "Próxima Questão"
- Placar da sessão visível no topo (X acertos de Y respondidas)
- Ao responder todas as questões da seleção: modal de encerramento com pontuação e opção de recomeçar

#### Aba "Resumos"

- Lista de matérias em accordion (Bootstrap Accordion)
- Cada matéria abre um resumo conciso: pontos-chave, artigos importantes, macetes
- Leitura rápida — não substitui material completo, complementa o quiz

### 3. Sistema "nunca repetir questões"

- Cada questão tem um `id` único (ex: `"alece-lp-001"`)
- `localStorage` salva o array de IDs já respondidos por concurso
- A cada sessão: questões não vistas têm prioridade; quando todas forem vistas, aparece aviso com opção de resetar
- Questões erradas podem ser marcadas para revisão prioritária (flag `revisao` no localStorage)

---

## Gamificação (localStorage, sem backend)

| Elemento | Regra |
|---|---|
| **Pontos** | +10 pts por acerto; +5 pts por erro (incentiva tentar) |
| **Streak** | Contador de acertos consecutivos; quebra ao errar; streak ≥ 3 ativa bônus ×2 |
| **Badges** | Desbloqueados por marcos: "Primeiro Acerto", "10 Seguidas", "Mestre em Dir. Constitucional", "100 Questões" etc. |
| **Nível** | Calouro (0–99 pts) → Candidato (100–499) → Aprovado (500–1499) → Elite (1500+) |
| **Progresso por matéria** | Barra de progresso mostrando % de questões de cada matéria já respondidas ao menos uma vez |

Badges aparecem com animação CSS ao serem desbloqueados (sem bibliotecas externas).

---

## Estrutura do JSON de questões

```json
{
  "questoes": [
    {
      "id": "alece-lp-001",
      "concurso": "ALECE",
      "materia": "Língua Portuguesa",
      "subtopico": "Concordância verbal",
      "enunciado": "Assinale a alternativa em que a concordância verbal está correta:",
      "alternativas": {
        "A": "Fazem dois anos que não te vejo.",
        "B": "Faz dois anos que não te vejo.",
        "C": "Fazem dois anos que não lhe vejo.",
        "D": "Faz dois anos que não lhe vejo.",
        "E": "Há dois anos que não te vejo."
      },
      "resposta": "B",
      "explicacao": "'Faz' é verbo impessoal quando indica tempo decorrido — fica sempre na 3ª pessoa do singular."
    }
  ]
}
```

## Estrutura do JSON de resumos

```json
{
  "resumos": [
    {
      "materia": "Língua Portuguesa",
      "subtopicos": [
        {
          "titulo": "Concordância verbal e nominal",
          "conteudo": "Regras principais: verbos impessoais (haver, fazer, ser) ficam no singular..."
        }
      ]
    }
  ]
}
```

---

## Matérias por concurso (base nos editais típicos)

### ALECE 2026
- Língua Portuguesa
- Direito Constitucional
- Direito Administrativo
- Regimento Interno da ALECE
- Ética no Serviço Público
- Informática

### TJ-CE 2026
- Língua Portuguesa
- Direito Constitucional
- Direito Administrativo
- Direito Processual Civil
- Direito Processual Penal
- Regimento Interno do TJ-CE
- Ética no Serviço Público

### SEFAZ-CE 2026
- Língua Portuguesa
- Direito Constitucional
- Direito Administrativo
- Direito Tributário
- Legislação Tributária do Ceará (ICMS-CE e legislação SEFAZ)
- Contabilidade Geral e Pública
- Administração Financeira e Orçamentária
- Raciocínio Lógico e Matemática Financeira
- Ética no Serviço Público

> **Nota:** As matérias serão confirmadas/ajustadas quando os editais oficiais de 2026 forem publicados. Os JSONs facilitam essa atualização sem mudanças de código.

---

## Quantidade de conteúdo inicial

- Mínimo de 15 questões por matéria por concurso (garantir volume suficiente para o sistema "nunca repetir" ser percebido)
- Resumo de ~300 palavras por matéria
- Total estimado: ~315 questões + 22 resumos no lançamento (3 concursos)

---

## Verificação (como testar)

1. `git push origin main` → Vercel detecta e faz deploy automático em ~30s
2. Acessar `vicduarte.site/concursos` e verificar hub com os três concursos (ALECE, TJ-CE, SEFAZ-CE)
3. Entrar em ALECE → Praticar Questões → responder sequência de 3+ acertos e confirmar bônus de streak
4. Responder questão errada → confirmar explicação e destaque da alternativa correta
5. Inspecionar `localStorage` no DevTools → chave `alece_seen_ids` deve acumular IDs respondidos
6. Responder todas as questões de uma matéria → confirmar modal de encerramento com opção de reset
7. Voltar ao hub → confirmar barra de progresso atualizada
8. Desbloquear badge "Primeiro Acerto" → confirmar animação
9. Acessar aba Resumos → confirmar accordion funcionando por matéria
10. Rodar `npm test` e garantir que nenhuma regressão foi introduzida no site existente
