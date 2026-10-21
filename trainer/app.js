(() => {
  'use strict';
  const C = window.TrainerContent;
  const KEY = 'questomanija-last-rehearsal-v1';
  const main = document.getElementById('main');
  let storageOK = true;
  const fresh = () => ({ version: 1, answers: {}, step: 0, started: false, submitted: false });
  let state = fresh();
  try {
    const stored = JSON.parse(localStorage.getItem(KEY));
    if (stored?.version === 1 && stored.answers && typeof stored.answers === 'object') {
      state.answers = Object.fromEntries(C.steps.filter(s => C.optionFor(s.key, stored.answers[s.key])).map(s => [s.key, stored.answers[s.key]]));
      state.step = Number.isInteger(stored.step) ? Math.max(0, Math.min(6, stored.step)) : 0;
      state.started = stored.started === true;
      state.submitted = stored.submitted === true && C.steps.every(s => state.answers[s.key]);
      // A saved position cannot skip unanswered steps.
      const firstMissing = C.steps.findIndex(s => !state.answers[s.key]);
      if (firstMissing >= 0) state.step = Math.min(state.step, firstMissing);
    }
  } catch { storageOK = false; }
  const esc = text => String(text).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const complete = () => state.submitted && C.evaluate(state.answers).every(c => c.ok);
  const currentChapter = () => Math.max(0, C.slugs.indexOf(location.hash.slice(1)));
  const selected = key => C.optionFor(key, state.answers[key]);
  const card = html => `<article class="card"><div class="inner">${html}</div></article>`;
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { storageOK = false; }
    status();
  }
  function status() {
    document.getElementById('save-status').textContent = storageOK ? 'Прогресс сохраняется в этом браузере на этом устройстве.' : 'Сохранение в браузере недоступно. Прогресс сохранится только до закрытия или обновления страницы.';
  }
  function render(focus = true) {
    const chapter = currentChapter();
    document.getElementById('chapters').innerHTML = C.chapters.map((title, i) => `<a href="#${C.slugs[i]}" class="chapter${chapter === i ? ' active' : ''}" ${chapter === i ? 'aria-current="page"' : ''}><b>${String(i + 1).padStart(2, '0')}</b><span>${title}<small>${i === 0 ? (complete() ? 'Собран' : 'Рабочая глава') : 'Каркас главы'}</small></span></a>`).join('');
    if (chapter > 0) renderSkeleton(chapter);
    else if (state.submitted) renderResult();
    else if (state.started) renderStep();
    else renderIntro();
    status();
    if (focus) { main.focus({ preventScroll: true }); main.scrollIntoView({ behavior: 'instant', block: 'start' }); }
  }
  function renderIntro() {
    main.innerHTML = card(`<p class="eyebrow">Глава 01 / Сюжет</p><div class="intro-grid"><div><h1>Последняя<br>репетиция</h1><p class="lead">До премьеры — час.<br>Режиссёр исчез.</p><p>Что превратит это событие в историю, в которую хочется войти?</p></div><aside class="case-file" aria-label="Исходная ситуация"><span class="stamp">РЕПЕТИЦИЯ ПРЕРВАНА</span><p>Кресло режиссёра пустует.<br>Занавес ещё закрыт.</p><small>ТЕАТР / ДО ПРЕМЬЕРЫ 01:00</small></aside></div><div class="brief"><p>Соберите свою версию сюжета: выберите жанр, завязку, развитие действия, кульминацию, роль участников, цель и название.</p></div><p class="muted">Готовой истории здесь нет. Есть несколько допустимых решений — важно, как ваши выборы связаны друг с другом. Разбор появится только в конце.</p><div class="actions"><button class="button" data-action="start">Собрать сюжет <span aria-hidden="true">&nbsp;→</span></button></div><div class="meta"><span>7 шагов выбора</span><span>Без регистрации</span><span>Урок — отдельно, здесь практика</span></div>`);
  }
  function renderStep() {
    const s = C.steps[state.step];
    const count = C.steps.filter(s => state.answers[s.key]).length;
    main.innerHTML = card(`<div class="question-head"><span>Глава 01 · Сюжет</span><span>Шаг ${state.step + 1} из 7</span></div><div class="progress" role="progressbar" aria-label="Выбрано компонентов сюжета" aria-valuenow="${count}" aria-valuemin="0" aria-valuemax="7"><span style="width:${count / 7 * 100}%"></span></div><p class="eyebrow">${s.title}</p><h2>${s.question}</h2><p class="muted">${s.prompt}</p><p class="context">Исходная ситуация: <strong>режиссёр исчез перед премьерой.</strong>${state.step > 0 ? ` Ваш жанр: <strong>${esc(selected('genre')?.text || 'не выбран')}.</strong>` : ''}</p><fieldset><legend>Выберите один вариант</legend>${s.options.map((o, i) => `<label class="option"><input type="radio" name="${s.key}" value="${o.id}" ${state.answers[s.key] === o.id ? 'checked' : ''}><span><strong>${esc(o.text)}</strong>${o.note ? `<span class="option-note">${esc(o.note)}</span>` : ''}</span></label>`).join('')}</fieldset><div class="step-actions"><button class="text-button" data-action="back">${state.step ? '← Назад' : '← К началу'}</button><small>Оценки и объяснения — после всех выборов.</small><button class="button" data-action="next" ${!state.answers[s.key] ? 'disabled' : ''}>${state.step === 6 ? 'Получить разбор' : 'Дальше →'}</button></div>`);
  }
  function renderResult() {
    const checks = C.evaluate(state.answers);
    const issues = checks.filter(c => !c.ok).length;
    const text = key => esc(selected(key)?.text || 'Не выбрано');
    main.innerHTML = card(`<p class="eyebrow">Глава 01 / Итоговый разбор</p><h2>${issues ? 'Посмотрим на связки' : 'История готова к началу'}</h2><div class="result-banner"><h3>${issues ? `Мест для доработки: ${issues}` : 'Ваша версия логически согласована'}</h3><p>${issues ? 'Ниже — ваши выборы и объяснения. Можно вернуться к любому шагу и собрать новую версию.' : 'Жанр, обстоятельства, роль и цель поддерживают друг друга. Это один из допустимых вариантов, а не единственный правильный сюжет.'}</p></div><section class="assembled" aria-label="Собранный сюжет"><p class="eyebrow">Ваша версия · ${text('genre')}</p><h3>${text('name')}</h3><p>${text('opening')}</p><p>${text('development')}</p><p>${text('climax')} ${text('role')} ${text('goal')}</p></section><h3>Почему это работает — или требует доработки</h3><ul class="checks">${checks.map(c => `<li><span class="check-icon" aria-hidden="true">${c.ok ? '✓' : '↗'}</span><div><strong>${esc(c.title)} · ${c.ok ? 'согласовано' : 'проверьте'}</strong><p>${esc(c.message)}</p><button class="text-button" data-edit="${c.key}">Изменить выбор</button></div></li>`).join('')}</ul><p class="muted">Завязка, развитие действия и кульминация составляют сюжет. Роль и цель включены в приглашение к действию, а не добавляют новые этапы истории. Развязка остаётся для самой игры.</p>${!issues ? fragment() : '<div class="brief"><p>Фрагмент пьесы откроется, когда выборы будут согласованы. Исправьте отмеченные связки и снова получите разбор.</p></div>'}<div class="actions">${!issues ? '<a class="button" href="#route">К главе «Маршрут» →</a>' : '<button class="button" data-action="revise">Доработать сюжет</button>'}<button class="button secondary" data-action="print">Сохранить разбор в PDF / печать</button><button class="text-button" data-action="reset">Начать заново</button></div>`);
  }
  function fragment() {
    return `<section class="fragment"><p class="eyebrow">Найденный лист / К следующей главе</p><h3>Фрагмент пьесы «Последняя репетиция»</h3><blockquote>«Не ищи меня там, где все ждут выхода.<br>Начни у афиши, которую уже сняли.<br>Тот, кто знает путь, оставил на ней след».</blockquote><small>Авторский учебный фрагмент для тренажёра.</small><p style="margin:16px 0 0">Где именно искать снятую афишу? Следующая глава превратит намёк в точки маршрута.</p></section>`;
  }
  function renderSkeleton(index) {
    const ready = complete();
    const descriptions = {
      1: 'Здесь предстоит выбрать точки маршрута и порядок движения по следу режиссёра.',
      2: 'Здесь предстоит связать событие, персонажей, точки маршрута и финал в последовательность событий.',
      3: 'Здесь предстоит собрать задания, которые раскрывают новые детали истории и ведут к следующей точке.'
    };
    main.innerHTML = card(`<p class="eyebrow">Глава ${String(index + 1).padStart(2, '0')} / Последняя репетиция</p><h1>${C.chapters[index]}</h1><span class="chapter-state">Каркас главы · упражнения ещё не добавлены</span><p class="lead">${descriptions[index]}</p><p class="muted">Эта страница обозначает следующий этап тренажёра. Пройти главу и получить результат пока нельзя.</p>${ready ? `<div class="overview"><h3>Из главы «Сюжет»</h3><p><strong>Название:</strong> ${esc(selected('name').text)}</p><p><strong>Жанр:</strong> ${esc(selected('genre').text)}</p><p><strong>Роль:</strong> ${esc(selected('role').text)}</p><p><strong>Цель:</strong> ${esc(selected('goal').text)}</p></div>${index === 1 ? fragment() : ''}` : '<div class="brief"><p>Сначала соберите согласованный сюжет в первой главе. Он станет основой следующих этапов.</p></div>'}<div class="actions"><a class="button" href="#plot">${ready ? 'Вернуться к своему сюжету' : 'К главе «Сюжет»'}</a>${index > 1 ? `<a class="button secondary" href="#${C.slugs[index - 1]}">← ${C.chapters[index - 1]}</a>` : ''}${index < 3 ? `<a class="button secondary" href="#${C.slugs[index + 1]}">Каркас: ${C.chapters[index + 1]} →</a>` : ''}</div>`);
  }
  main.addEventListener('change', event => {
    if (!event.target.matches('input[type="radio"]')) return;
    const step = C.steps[state.step];
    if (event.target.name !== step.key || !C.optionFor(step.key, event.target.value)) return;
    state.answers[step.key] = event.target.value;
    state.submitted = false;
    save();
    main.querySelector('[data-action="next"]').disabled = false;
    const bar = main.querySelector('[role="progressbar"]');
    const count = C.steps.filter(s => state.answers[s.key]).length;
    bar.setAttribute('aria-valuenow', count);
    bar.firstElementChild.style.width = `${count / 7 * 100}%`;
  });
  main.addEventListener('click', event => {
    const button = event.target.closest('[data-action],[data-edit]');
    if (!button) return;
    if (button.dataset.edit) {
      state.step = C.steps.findIndex(s => s.key === button.dataset.edit);
      state.submitted = false;
      state.started = true;
    } else switch (button.dataset.action) {
      case 'start': state.started = true; break;
      case 'back': if (state.step) state.step--; else state.started = false; break;
      case 'next':
        if (!state.answers[C.steps[state.step].key]) return;
        if (state.step < 6) state.step++;
        else if (C.steps.every(s => state.answers[s.key])) state.submitted = true;
        break;
      case 'revise': state.step = C.steps.findIndex((s, i) => !C.evaluate(state.answers)[i].ok); state.submitted = false; break;
      case 'print': window.print(); return;
      case 'reset': showReset(); return;
      default: return;
    }
    save(); render();
  });
  function showReset() {
    const dialog = document.createElement('dialog');
    dialog.innerHTML = '<h3>Начать новую версию?</h3><p>Текущие выборы и разбор будут удалены из этого браузера.</p><div class="actions"><button class="button secondary" data-cancel>Сохранить текущую</button><button class="button" data-confirm>Начать заново</button></div>';
    document.body.append(dialog);
    dialog.querySelector('[data-cancel]').onclick = () => dialog.close();
    dialog.querySelector('[data-confirm]').onclick = () => { state = fresh(); save(); dialog.close(); render(); };
    dialog.addEventListener('close', () => dialog.remove());
    dialog.showModal();
  }
  window.addEventListener('hashchange', () => render());
  render(false);
})();
