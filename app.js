/**
 * GripMetrics · app.js
 *
 * Módulos:
 *  - Storage     : abstração sobre localStorage
 *  - UI          : utilitários DOM / toast / tabs
 *  - Trainer     : lógica da aba Treinador
 *  - Athlete     : lógica da aba Aluno
 *  - Evaluation  : lógica da aba Avaliação + cálculo de métricas
 *  - DataTab     : lógica da aba Dados + exportações
 *
 * Estrutura de dados (localStorage):
 *  gm_workouts   : Workout[]
 *  gm_feedbacks  : Feedback[]
 *  gm_evaluations: Evaluation[]
 *
 * Pronto para futura integração com sensores BLE/WebSerial.
 */

'use strict';

/* ================================================================
   STORAGE
   ================================================================ */
const Storage = (() => {
  const KEYS = {
    workouts:    'gm_workouts',
    feedbacks:   'gm_feedbacks',
    evaluations: 'gm_evaluations',
  };

  /** @param {string} key @returns {any[]} */
  function load(key) {
    try {
      return JSON.parse(localStorage.getItem(key) || '[]');
    } catch {
      return [];
    }
  }

  /** @param {string} key @param {any[]} data */
  function save(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  return {
    getWorkouts:    () => load(KEYS.workouts),
    saveWorkouts:   (d) => save(KEYS.workouts, d),

    getFeedbacks:   () => load(KEYS.feedbacks),
    saveFeedbacks:  (d) => save(KEYS.feedbacks, d),

    getEvaluations:   () => load(KEYS.evaluations),
    saveEvaluations:  (d) => save(KEYS.evaluations, d),

    /** Remover todos os dados */
    clearAll() {
      Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
    },
  };
})();

/* ================================================================
   UI UTILITIES
   ================================================================ */
const UI = (() => {
  let toastTimer = null;

  /**
   * Exibe uma mensagem de notificação flutuante.
   * @param {string} message
   * @param {'success'|'error'|'info'} type
   */
  function toast(message, type = 'success') {
    const el = document.getElementById('toast');
    el.textContent = message;
    el.className = `toast toast--${type} show`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      el.className = 'toast';
    }, 3000);
  }

  /**
   * Retorna o valor numérico de um input range.
   * @param {string} id
   * @returns {number}
   */
  function rangeVal(id) {
    return Number(document.getElementById(id).value);
  }

  /**
   * Gera um ID único baseado em timestamp + random.
   * @returns {string}
   */
  function uid() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  }

  /**
   * Formata uma data ISO (YYYY-MM-DD) para exibição local.
   * @param {string} isoDate
   * @returns {string}
   */
  function formatDate(isoDate) {
    if (!isoDate) return '';
    const [y, m, d] = isoDate.split('-');
    return `${d}/${m}/${y}`;
  }

  return { toast, rangeVal, uid, formatDate };
})();

/* ================================================================
   TAB NAVIGATION
   ================================================================ */
function initTabs() {
  const buttons = document.querySelectorAll('.tab-btn');
  const panels  = document.querySelectorAll('.tab-panel');

  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab;

      buttons.forEach((b) => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      panels.forEach((p) => {
        p.classList.remove('active');
        p.hidden = true;
      });

      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');

      const panel = document.getElementById(`tab-${target}`);
      panel.classList.add('active');
      panel.hidden = false;

      // Recarregar dados ao mudar de aba
      if (target === 'athlete')    Athlete.refresh();
      if (target === 'data')       DataTab.refresh();
    });
  });
}

/* ================================================================
   TRAINER
   ================================================================ */
const Trainer = (() => {
  /** @type {Array<object>} Blocos do treino em edição */
  let pendingBlocks = [];

  function init() {
    setDefaultDate('workout-date');
    document.getElementById('btn-add-block').addEventListener('click', addBlock);
    document.getElementById('btn-save-workout').addEventListener('click', saveWorkout);
    renderSavedWorkouts();
  }

  /** Define a data atual como padrão */
  function setDefaultDate(inputId) {
    const el = document.getElementById(inputId);
    if (!el.value) el.value = today();
  }

  function today() {
    return new Date().toISOString().slice(0, 10);
  }

  /** Lê o formulário do bloco e adiciona à lista pendente */
  function addBlock() {
    const category       = document.getElementById('block-category').value;
    const qty            = Number(document.getElementById('block-qty').value) || 1;
    const intensityType  = document.getElementById('block-intensity-type').value;
    const intensityValue = document.getElementById('block-intensity-value').value.trim();
    const minutes        = Number(document.getElementById('block-minutes').value) || 0;
    const notes          = document.getElementById('block-notes').value.trim();

    const block = { id: UI.uid(), category, qty, intensityType, intensityValue, minutes, notes };
    pendingBlocks.push(block);
    renderPendingBlocks();
    clearBlockForm();
  }

  /** Renderiza os blocos em edição */
  function renderPendingBlocks() {
    const container = document.getElementById('blocks-container');
    container.innerHTML = pendingBlocks.map((b, i) => blockItemHTML(b, i, true)).join('');

    container.querySelectorAll('.btn-remove-block').forEach((btn) => {
      btn.addEventListener('click', () => {
        pendingBlocks.splice(Number(btn.dataset.index), 1);
        renderPendingBlocks();
      });
    });
  }

  /**
   * Gera HTML para um bloco de exercício.
   * @param {object} block
   * @param {number} index
   * @param {boolean} removable
   * @returns {string}
   */
  function blockItemHTML(block, index, removable = false) {
    return `
      <div class="block-item">
        <div class="block-item__info">
          <div class="block-item__title">
            <span class="block-item__badge">${block.category}</span>
          </div>
          <div class="block-item__meta">
            <span>Qtd: ${block.qty}</span>
            <span>Intensidade: ${block.intensityValue || '—'} (${block.intensityType})</span>
            <span>Tempo: ${block.minutes} min</span>
            ${block.notes ? `<span>📝 ${block.notes}</span>` : ''}
          </div>
        </div>
        ${removable ? `
          <div class="block-item__actions">
            <button class="btn btn--danger btn--icon-sm btn-remove-block" data-index="${index}" title="Remover bloco">✕</button>
          </div>
        ` : ''}
      </div>`;
  }

  /** Limpa os campos do editor de bloco */
  function clearBlockForm() {
    document.getElementById('block-intensity-value').value = '';
    document.getElementById('block-notes').value = '';
    document.getElementById('block-qty').value = 1;
    document.getElementById('block-minutes').value = 10;
  }

  /** Salva o treino no localStorage */
  function saveWorkout() {
    const date    = document.getElementById('workout-date').value;
    const athlete = document.getElementById('workout-athlete').value.trim();
    const goal    = document.getElementById('workout-goal').value.trim();

    if (!date || !athlete || !goal) {
      UI.toast('Preencha data, aluno e objetivo!', 'error');
      return;
    }
    if (pendingBlocks.length === 0) {
      UI.toast('Adicione ao menos um bloco!', 'error');
      return;
    }

    const workout = {
      id:        UI.uid(),
      createdAt: new Date().toISOString(),
      date,
      athlete,
      goal,
      blocks:    [...pendingBlocks],
    };

    const workouts = Storage.getWorkouts();
    workouts.push(workout);
    Storage.saveWorkouts(workouts);

    // Reset
    pendingBlocks = [];
    renderPendingBlocks();
    document.getElementById('workout-athlete').value = '';
    document.getElementById('workout-goal').value    = '';
    setDefaultDate('workout-date');

    renderSavedWorkouts();
    UI.toast('Treino salvo com sucesso!', 'success');
  }

  /** Renderiza a lista de treinos salvos */
  function renderSavedWorkouts() {
    const list     = document.getElementById('saved-workouts-list');
    const workouts = Storage.getWorkouts();

    if (workouts.length === 0) {
      list.innerHTML = '<p style="color:var(--text-muted);font-size:.88rem;">Nenhum treino salvo ainda.</p>';
      return;
    }

    list.innerHTML = [...workouts].reverse().map((w) => `
      <div class="workout-card">
        <div class="workout-card__header">
          <span class="workout-card__title">${w.athlete}</span>
          <button class="btn btn--danger btn--icon-sm btn-delete-workout" data-id="${w.id}" title="Excluir treino">🗑</button>
        </div>
        <div class="workout-card__meta">
          <span>📅 ${UI.formatDate(w.date)}</span>
          <span>🎯 ${w.goal}</span>
          <span>ID: <code>${w.id}</code></span>
        </div>
        <div class="workout-card__blocks">
          ${w.blocks.map((b) => `<span class="block-item__badge">${b.category} (${b.minutes}min)</span>`).join('')}
        </div>
      </div>
    `).join('');

    list.querySelectorAll('.btn-delete-workout').forEach((btn) => {
      btn.addEventListener('click', () => deleteWorkout(btn.dataset.id));
    });
  }

  /** Remove um treino pelo ID */
  function deleteWorkout(id) {
    if (!confirm('Excluir este treino?')) return;
    const workouts = Storage.getWorkouts().filter((w) => w.id !== id);
    Storage.saveWorkouts(workouts);
    renderSavedWorkouts();
    UI.toast('Treino removido.', 'info');
  }

  return { init, renderSavedWorkouts };
})();

/* ================================================================
   ATHLETE
   ================================================================ */
const Athlete = (() => {
  function init() {
    bindRangeOutput('feedback-pain', 'feedback-pain-val');
    bindRangeOutput('feedback-rpe',  'feedback-rpe-val');

    document.getElementById('athlete-select-workout').addEventListener('change', onWorkoutSelect);
    document.getElementById('btn-save-feedback').addEventListener('click', saveFeedback);
  }

  /** Recarrega o select de treinos */
  function refresh() {
    const sel      = document.getElementById('athlete-select-workout');
    const workouts = Storage.getWorkouts();
    sel.innerHTML  = '<option value="">-- Selecione um treino --</option>';
    workouts.forEach((w) => {
      const opt   = document.createElement('option');
      opt.value   = w.id;
      opt.text    = `${UI.formatDate(w.date)} · ${w.athlete} — ${w.goal}`;
      sel.appendChild(opt);
    });

    // Esconder detalhe
    document.getElementById('athlete-workout-detail').hidden = true;
  }

  /** Mostra detalhes do treino selecionado */
  function onWorkoutSelect() {
    const id       = document.getElementById('athlete-select-workout').value;
    const detail   = document.getElementById('athlete-workout-detail');

    if (!id) { detail.hidden = true; return; }

    const workout = Storage.getWorkouts().find((w) => w.id === id);
    if (!workout) { detail.hidden = true; return; }

    document.getElementById('athlete-workout-title').textContent =
      `${workout.athlete} · ${UI.formatDate(workout.date)} · ${workout.goal}`;

    const list = document.getElementById('athlete-blocks-list');
    list.innerHTML = workout.blocks.map((b, i) => `
      <div class="block-item">
        <div class="block-item__info">
          <div class="block-item__title"><span class="block-item__badge">${b.category}</span></div>
          <div class="block-item__meta">
            <span>Qtd: ${b.qty}</span>
            <span>Intensidade: ${b.intensityValue || '—'} (${b.intensityType})</span>
            <span>Tempo: ${b.minutes} min</span>
            ${b.notes ? `<span>📝 ${b.notes}</span>` : ''}
          </div>
        </div>
      </div>`).join('');

    detail.hidden = false;
  }

  /** Salva o retorno do aluno */
  function saveFeedback() {
    const workoutId = document.getElementById('athlete-select-workout').value;
    if (!workoutId) { UI.toast('Selecione um treino!', 'error'); return; }

    const feedback = {
      id:        UI.uid(),
      createdAt: new Date().toISOString(),
      workoutId,
      status:    document.getElementById('feedback-status').value,
      pain:      UI.rangeVal('feedback-pain'),
      rpe:       UI.rangeVal('feedback-rpe'),
      comment:   document.getElementById('feedback-comment').value.trim(),
    };

    const feedbacks = Storage.getFeedbacks();
    feedbacks.push(feedback);
    Storage.saveFeedbacks(feedbacks);

    document.getElementById('feedback-comment').value = '';
    UI.toast('Retorno enviado!', 'success');
  }

  return { init, refresh };
})();

/* ================================================================
   EVALUATION
   ================================================================ */
const Evaluation = (() => {
  /** Campos com range output */
  const rangeFields = [
    ['eval-rpe',        'eval-rpe-val'],
    ['eval-technique',  'eval-technique-val'],
    ['eval-focus',      'eval-focus-val'],
    ['eval-confidence', 'eval-confidence-val'],
    ['eval-stress',     'eval-stress-val'],
    ['eval-motivation', 'eval-motivation-val'],
  ];

  function init() {
    setDefaultDate('eval-date');
    rangeFields.forEach(([id, out]) => bindRangeOutput(id, out));
    document.getElementById('btn-save-eval').addEventListener('click', saveEvaluation);
  }

  function setDefaultDate(inputId) {
    const el = document.getElementById(inputId);
    if (!el.value) el.value = new Date().toISOString().slice(0, 10);
  }

  /**
   * Calcula as métricas da sessão.
   *
   * PhysicalLoad  = RPE × Duração / 10
   * TechScore     = Técnica × 10
   * MentalScore   = ((Foco + Confiança + Motivação) / 3 - Stress / 2) normalizado 0–100
   * SessionVolume = Duração × Tentativas / 10
   */
  function calcMetrics({ rpe, duration, technique, focus, confidence, stress, motivation, attempts }) {
    const physicalLoad  = parseFloat((rpe * duration / 10).toFixed(1));
    const techScore     = technique * 10;
    const mentalRaw     = (focus + confidence + motivation) / 3 - stress / 2;
    const mentalScore   = parseFloat(Math.max(0, Math.min(100, mentalRaw * 10)).toFixed(1));
    const sessionVolume = parseFloat((duration * attempts / 10).toFixed(1));
    return { physicalLoad, techScore, mentalScore, sessionVolume };
  }

  /** Salva a avaliação no localStorage */
  function saveEvaluation() {
    const date        = document.getElementById('eval-date').value;
    const athlete     = document.getElementById('eval-athlete').value.trim();
    const duration    = Number(document.getElementById('eval-duration').value) || 0;
    const attempts    = Number(document.getElementById('eval-attempts').value) || 0;
    const conclusions = document.getElementById('eval-conclusions').value.trim();

    const rpe        = UI.rangeVal('eval-rpe');
    const technique  = UI.rangeVal('eval-technique');
    const focus      = UI.rangeVal('eval-focus');
    const confidence = UI.rangeVal('eval-confidence');
    const stress     = UI.rangeVal('eval-stress');
    const motivation = UI.rangeVal('eval-motivation');

    if (!date) { UI.toast('Informe a data da sessão!', 'error'); return; }
    if (duration <= 0) { UI.toast('Informe a duração!', 'error'); return; }

    const metrics = calcMetrics({ rpe, duration, technique, focus, confidence, stress, motivation, attempts });

    const evaluation = {
      id:        UI.uid(),
      createdAt: new Date().toISOString(),
      date,
      athlete,
      duration,
      attempts,
      conclusions,
      rpe, technique, focus, confidence, stress, motivation,
      ...metrics,
    };

    const evaluations = Storage.getEvaluations();
    evaluations.push(evaluation);
    Storage.saveEvaluations(evaluations);

    showScores(metrics);
    UI.toast('Avaliação salva!', 'success');
  }

  /** Exibe o painel de scores calculados */
  function showScores({ physicalLoad, techScore, mentalScore, sessionVolume }) {
    document.getElementById('score-physical').textContent = physicalLoad;
    document.getElementById('score-tech').textContent     = techScore;
    document.getElementById('score-mental').textContent   = mentalScore;
    document.getElementById('score-volume').textContent   = sessionVolume;
    document.getElementById('eval-scores-preview').hidden = false;
  }

  return { init };
})();

/* ================================================================
   DATA TAB
   ================================================================ */
const DataTab = (() => {
  function init() {
    document.getElementById('btn-export-json').addEventListener('click', exportJSON);
    document.getElementById('btn-export-csv').addEventListener('click',  exportCSV);
    document.getElementById('btn-clear-data').addEventListener('click',  clearData);
  }

  /** Atualiza os dados exibidos na aba */
  function refresh() {
    renderMetrics();
    renderCategoryDistribution();
    renderCategoryTime();
  }

  /* ── Summary metrics ───────────────────────────────────────── */
  function renderMetrics() {
    const workouts  = Storage.getWorkouts();
    const feedbacks = Storage.getFeedbacks();

    const totalWorkouts = workouts.length;
    const totalItems    = workouts.reduce((acc, w) => acc + w.blocks.length, 0);
    const avgPain       = feedbacks.length
      ? (feedbacks.reduce((s, f) => s + f.pain, 0) / feedbacks.length).toFixed(1)
      : '—';
    const avgRpe        = feedbacks.length
      ? (feedbacks.reduce((s, f) => s + f.rpe, 0) / feedbacks.length).toFixed(1)
      : '—';

    const metrics = [
      { label: 'Total de Treinos',  value: totalWorkouts },
      { label: 'Total de Blocos',   value: totalItems    },
      { label: 'Média de Dor',      value: avgPain       },
      { label: 'Média de RPE',      value: avgRpe        },
      { label: 'Retornos',          value: feedbacks.length },
      { label: 'Avaliações',        value: Storage.getEvaluations().length },
    ];

    document.getElementById('metrics-grid').innerHTML = metrics.map((m) => `
      <div class="metric-item">
        <span class="metric-label">${m.label}</span>
        <span class="metric-value">${m.value}</span>
      </div>`).join('');
  }

  /* ── Category distribution ──────────────────────────────────── */
  function renderCategoryDistribution() {
    const workouts = Storage.getWorkouts();
    const counts   = countByCategory(workouts, 'count');
    renderDistribution('category-distribution', counts);
  }

  /* ── Category time ──────────────────────────────────────────── */
  function renderCategoryTime() {
    const workouts = Storage.getWorkouts();
    const times    = countByCategory(workouts, 'minutes');
    renderDistribution('category-time', times, 'min');
  }

  /**
   * Agrega blocos de todos os treinos por categoria.
   * @param {object[]} workouts
   * @param {'count'|'minutes'} field
   * @returns {Record<string, number>}
   */
  function countByCategory(workouts, field) {
    const map = {};
    workouts.forEach((w) => {
      w.blocks.forEach((b) => {
        map[b.category] = (map[b.category] || 0) + (field === 'minutes' ? b.minutes : 1);
      });
    });
    return map;
  }

  /**
   * Renderiza barras de distribuição.
   * @param {string} containerId
   * @param {Record<string, number>} data
   * @param {string} unit
   */
  function renderDistribution(containerId, data, unit = '') {
    const container = document.getElementById(containerId);
    const entries   = Object.entries(data).sort((a, b) => b[1] - a[1]);

    if (entries.length === 0) {
      container.innerHTML = '<p style="color:var(--text-muted);font-size:.85rem;">Sem dados ainda.</p>';
      return;
    }

    const max = entries[0][1] || 1;
    container.innerHTML = entries.map(([cat, val]) => `
      <div class="dist-row">
        <span class="dist-row__label">${cat}</span>
        <div class="dist-bar-track">
          <div class="dist-bar-fill" style="width:${(val / max * 100).toFixed(1)}%"></div>
        </div>
        <span class="dist-row__count">${val}${unit}</span>
      </div>`).join('');
  }

  /* ── Exports ─────────────────────────────────────────────────── */
  /** Exporta todos os dados como um único arquivo JSON */
  function exportJSON() {
    const payload = {
      exported:    new Date().toISOString(),
      workouts:    Storage.getWorkouts(),
      feedbacks:   Storage.getFeedbacks(),
      evaluations: Storage.getEvaluations(),
    };
    downloadFile(
      'gripmetrics-data.json',
      'application/json',
      JSON.stringify(payload, null, 2)
    );
    UI.toast('JSON exportado!', 'success');
  }

  /** Exporta treinos como CSV */
  function exportCSV() {
    const workouts = Storage.getWorkouts();
    if (workouts.length === 0) { UI.toast('Sem treinos para exportar.', 'error'); return; }

    const rows = [
      ['workout_id', 'date', 'athlete', 'goal',
       'block_id', 'category', 'qty', 'intensity_type', 'intensity_value', 'minutes', 'notes'],
    ];

    workouts.forEach((w) => {
      if (w.blocks.length === 0) {
        rows.push([w.id, w.date, w.athlete, w.goal, '', '', '', '', '', '', '']);
      } else {
        w.blocks.forEach((b) => {
          rows.push([
            w.id, w.date, w.athlete, w.goal,
            b.id, b.category, b.qty, b.intensityType, b.intensityValue, b.minutes, b.notes,
          ]);
        });
      }
    });

    const csv = rows.map((r) => r.map(csvEscape).join(',')).join('\n');
    downloadFile('gripmetrics-workouts.csv', 'text/csv', csv);
    UI.toast('CSV exportado!', 'success');
  }

  /** Escapa um valor para CSV */
  function csvEscape(val) {
    const str = String(val ?? '');
    return str.includes(',') || str.includes('"') || str.includes('\n')
      ? `"${str.replace(/"/g, '""')}"` : str;
  }

  /** Dispara o download de um arquivo no navegador */
  function downloadFile(filename, mimeType, content) {
    const blob = new Blob([content], { type: mimeType });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  /** Limpa todos os dados após confirmação */
  function clearData() {
    if (!confirm('Tem certeza que deseja apagar TODOS os dados? Esta ação não pode ser desfeita.')) return;
    Storage.clearAll();
    refresh();
    Trainer.renderSavedWorkouts();
    UI.toast('Todos os dados foram removidos.', 'info');
  }

  return { init, refresh };
})();

/* ================================================================
   HELPERS
   ================================================================ */

/**
 * Vincula um input[type=range] ao seu elemento output.
 * @param {string} inputId
 * @param {string} outputId
 */
function bindRangeOutput(inputId, outputId) {
  const input  = document.getElementById(inputId);
  const output = document.getElementById(outputId);
  if (!input || !output) return;
  output.textContent = input.value;
  input.addEventListener('input', () => { output.textContent = input.value; });
}

/* ================================================================
   BOOTSTRAP
   ================================================================ */
document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  Trainer.init();
  Athlete.init();
  Evaluation.init();
  DataTab.init();

  // Carregar dados iniciais nas abas estáticas
  DataTab.refresh();

  /*
   * PONTO DE EXTENSÃO – sensores BLE / WebSerial
   * No futuro, inicializar aqui o módulo de sensores:
   *   if ('bluetooth' in navigator) SensorBLE.init();
   *   if ('serial'    in navigator) SensorSerial.init();
   */
});
