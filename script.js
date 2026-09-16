/* Shared site runtime for the Statistical Methods in Epidemiology study guides.
   No build step required — plain JS, loaded on every page via <script src="script.js"> (or "../script.js"). */
(function () {
  'use strict';

  const COURSE = [
    { id: 'week01', session: 1, week: 1, title: 'Measuring Disease in Populations', subtitle: 'Incidence, prevalence, risk, and rate — the building blocks of every epidemiologic claim.', href: 'lectures/week01-measuring-disease.html', topics: ['Incidence vs. prevalence', 'Risk vs. rate', 'Standardization'] },
    { id: 'week02', session: 1, week: 2, title: 'Probability & Sampling Distributions', subtitle: 'From probability rules to the Central Limit Theorem that makes inference possible.', href: 'lectures/week02-probability-distributions.html', topics: ['Binomial & Poisson', 'Normal approximation', 'Central Limit Theorem'] },
    { id: 'week03', session: 2, week: 3, title: 'Estimation, Confidence Intervals & Hypothesis Testing', subtitle: 'Turning a sample statistic into a defensible population-level claim.', href: 'lectures/week03-estimation-hypothesis-testing.html', topics: ['Point & interval estimation', 'p-values', 'Type I/II error & power'] },
    { id: 'week04', session: 2, week: 4, title: 'Simple Linear Regression', subtitle: 'One predictor, least squares, and the assumptions every later model builds on.', href: 'lectures/week04-simple-linear-regression.html', topics: ['Least squares', 'R² and correlation', 'Assumption preview'] },
    { id: 'week05', session: 2, week: 5, title: 'ANOVA & Categorical Comparisons', subtitle: 'Comparing more than two groups, and testing association between categorical variables.', href: 'lectures/week05-anova-categorical.html', topics: ['One-way ANOVA', 'Chi-square test', "Fisher's exact test"] },
    { id: 'week06', session: 3, week: 6, title: 'Diagnostics for Multiple Linear Regression', subtitle: 'Detecting, interpreting, and responding to violations of MLR assumptions.', href: 'lectures/week06-mlr-diagnostics.html', topics: ['Non-normal errors', 'Multicollinearity', 'Influence & leverage'] },
    { id: 'week07', session: 3, week: 7, title: 'Logistic Regression for Binary Outcomes', subtitle: 'Modeling odds, interpreting exponentiated coefficients, and checking fit.', href: 'lectures/week07-logistic-regression.html', topics: ['Logit link', 'Odds ratios', 'Model fit'] },
    { id: 'week08', session: 3, week: 8, title: 'Survival Analysis', subtitle: 'Time-to-event data, censoring, Kaplan-Meier curves, and the Cox model.', href: 'lectures/week08-survival-analysis.html', topics: ['Kaplan-Meier', 'Log-rank test', 'Cox proportional hazards'] }
  ];

  const THEME_KEY = 'epi-site-theme';
  const PROGRESS_KEY = 'epi-progress-v1';
  const isLecturePage = location.pathname.includes('/lectures/');
  const base = isLecturePage ? '../' : '';

  function getProgress() {
    try { return JSON.parse(localStorage.getItem(PROGRESS_KEY)) || {}; }
    catch (e) { return {}; }
  }
  function setProgress(id, done) {
    const p = getProgress();
    if (done) p[id] = true; else delete p[id];
    try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(p)); } catch (e) {}
    return p;
  }

  function initTheme(buttonId) {
    const root = document.documentElement;
    const toggle = document.getElementById(buttonId || 'themeToggle');
    const apply = (mode) => {
      root.dataset.theme = mode;
      if (toggle) toggle.textContent = mode === 'dark' ? '☀ Light theme' : '☾ Toggle theme';
    };
    apply(root.dataset.theme || 'light');
    if (toggle) {
      toggle.addEventListener('click', () => {
        const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
        try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
        apply(next);
      });
    }
  }

  function initNav(currentId) {
    const mount = document.getElementById('siteNav');
    if (!mount) return;
    const links = COURSE.map((l) => {
      const active = l.id === currentId ? ' active' : '';
      return `<a href="${base}${l.href}" class="${active.trim()}" data-week="${l.id}">Wk ${l.week}<span class="nav-progress-dot" data-progress-dot="${l.id}"></span></a>`;
    }).join('');
    mount.innerHTML = `
      <div class="site-nav-inner">
        <a class="site-nav-brand" href="${base}index.html">Epi Stats</a>
        <nav class="site-nav-links">
          <a href="${base}index.html"${currentId ? '' : ' class="active"'}>Home</a>
          ${links}
        </nav>
      </div>`;
    reflectProgressDots();
  }

  function reflectProgressDots() {
    const progress = getProgress();
    document.querySelectorAll('[data-progress-dot]').forEach((dot) => {
      const id = dot.getAttribute('data-progress-dot');
      dot.textContent = progress[id] ? ' ✓' : '';
    });
  }

  function initSearch(inputId, sectionSelector) {
    const search = document.getElementById(inputId || 'search');
    if (!search) return;
    const sections = [...document.querySelectorAll(sectionSelector || '.searchable')];
    search.addEventListener('input', () => {
      const term = search.value.trim().toLowerCase();
      sections.forEach((section) => {
        section.classList.toggle('hidden', Boolean(term) && !section.textContent.toLowerCase().includes(term));
      });
    });
  }

  function initTopicModals(topicDetails) {
    const modal = document.getElementById('topicModal');
    if (!modal || !topicDetails) return;
    const modalTitle = document.getElementById('modalTitle');
    const modalKicker = document.getElementById('modalKicker');
    const modalBody = document.getElementById('modalBody');
    const modalClose = document.getElementById('modalClose');
    let lastTopic;
    function closeTopic() {
      modal.classList.remove('open');
      document.body.classList.remove('modal-open');
      if (lastTopic) lastTopic.focus();
    }
    function openTopic(topicEl) {
      const data = topicDetails[topicEl.id];
      if (!data) return;
      lastTopic = topicEl;
      modalKicker.textContent = data.kicker;
      modalTitle.textContent = data.title;
      modalBody.innerHTML = data.body;
      modal.classList.add('open');
      document.body.classList.add('modal-open');
      modalClose.focus();
      if (window.MathJax && window.MathJax.typesetPromise) window.MathJax.typesetPromise([modalBody]);
    }
    document.querySelectorAll('.topic').forEach((topic) => {
      topic.tabIndex = 0;
      topic.setAttribute('role', 'button');
      topic.addEventListener('click', (event) => {
        if (!event.target.closest('a,button,details,summary,input')) openTopic(topic);
      });
      topic.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openTopic(topic); }
      });
    });
    modalClose.addEventListener('click', closeTopic);
    modal.addEventListener('click', (event) => { if (event.target === modal) closeTopic(); });
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && modal.classList.contains('open')) closeTopic(); });
  }

  function initProgressToggle(pageId, buttonId, onChange) {
    const btn = document.getElementById(buttonId || 'progressToggle');
    if (!btn || !pageId) return;
    const reflect = (done) => {
      btn.classList.toggle('is-active', done);
      btn.textContent = done ? '✓ Reviewed' : '○ Mark as reviewed';
    };
    reflect(Boolean(getProgress()[pageId]));
    btn.addEventListener('click', () => {
      const done = !getProgress()[pageId];
      setProgress(pageId, done);
      reflect(done);
      if (onChange) onChange(done);
    });
  }

  function renderLectureFooter(pageId, mountId) {
    const mount = document.getElementById(mountId || 'lectureFooter');
    if (!mount || !pageId) return;
    const idx = COURSE.findIndex((l) => l.id === pageId);
    if (idx === -1) return;
    const prev = idx > 0 ? COURSE[idx - 1] : null;
    const next = idx < COURSE.length - 1 ? COURSE[idx + 1] : null;
    const progress = getProgress();
    const done = COURSE.filter((l) => progress[l.id]).length;
    const pct = Math.round((done / COURSE.length) * 100);

    const dots = COURSE.map((l) => {
      const cls = ['week-dot'];
      if (l.id === pageId) cls.push('is-current');
      if (progress[l.id]) cls.push('is-done');
      return `<a class="${cls.join(' ')}" href="${base}${l.href}" title="Week ${l.week}: ${l.title}">${l.week}</a>`;
    }).join('');

    const prevCard = prev
      ? `<a class="nav-card nav-prev" href="${base}${prev.href}"><span class="nav-card-label">← Previous</span><strong>Week ${prev.week} · ${prev.title}</strong></a>`
      : `<a class="nav-card nav-prev" href="${base}index.html"><span class="nav-card-label">← Back to</span><strong>Course home</strong></a>`;

    const nextCard = next
      ? `<a class="nav-card nav-next" href="${base}${next.href}"><span class="nav-card-label">Next →</span><strong>Week ${next.week} · ${next.title}</strong></a>`
      : `<a class="nav-card nav-next" href="${base}index.html"><span class="nav-card-label">🎉 End of course</span><strong>Back to course home</strong></a>`;

    mount.innerHTML = `
      <div class="course-progress-mini">
        <div class="course-progress-mini-head"><p class="side-title">Course progress</p><span class="progress-summary-text" id="lectureFooterProgressText">${done} of ${COURSE.length} reviewed</span></div>
        <div class="progress-bar"><div class="progress-bar-fill" id="lectureFooterProgressFill" style="width:${pct}%"></div></div>
        <div class="week-dots">${dots}</div>
      </div>
      <div class="up-next-links">${prevCard}${nextCard}</div>`;
  }

  function renderCourseGrid(containerId) {
    const mount = document.getElementById(containerId || 'courseGrid');
    if (!mount) return;
    const progress = getProgress();
    let html = '';
    let lastSession = null;
    COURSE.forEach((l) => {
      if (l.session !== lastSession) {
        html += `<p class="session-heading">Session ${l.session}</p>`;
        lastSession = l.session;
      }
      const done = Boolean(progress[l.id]);
      html += `
        <a class="course-card searchable" href="${l.href}">
          <span class="session-tag">Week ${l.week}</span>
          <h3>${l.title}</h3>
          <p>${l.subtitle}</p>
          <div class="topic-tags">${l.topics.map((t) => `<span>${t}</span>`).join('')}</div>
          <span class="progress-pill${done ? ' is-done' : ''}">${done ? '✓ Reviewed' : 'Not started'}</span>
        </a>`;
    });
    mount.innerHTML = html;
  }

  function initProgressSummary(barId, textId) {
    const bar = document.getElementById(barId || 'progressBarFill');
    const text = document.getElementById(textId || 'progressSummaryText');
    if (!bar && !text) return;
    const progress = getProgress();
    const done = COURSE.filter((l) => progress[l.id]).length;
    const pct = Math.round((done / COURSE.length) * 100);
    if (bar) bar.style.width = pct + '%';
    if (text) text.textContent = `${done} of ${COURSE.length} lectures reviewed`;
  }

  window.SITE = {
    COURSE,
    getProgress,
    setProgress,
    initTheme,
    initNav,
    initSearch,
    initTopicModals,
    initProgressToggle,
    renderCourseGrid,
    initProgressSummary,
    renderLectureFooter
  };
})();
