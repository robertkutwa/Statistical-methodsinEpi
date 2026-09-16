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

  const API_BASE = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
    ? 'http://127.0.0.1:5000/api'
    : 'https://statistical-methodsinepi.onrender.com/api';

  const THEME_KEY = 'epi-site-theme';
  const TOKEN_KEY = 'epi-auth-token';
  const EMAIL_KEY = 'epi-auth-email';
  const isLecturePage = location.pathname.includes('/lectures/');
  const base = isLecturePage ? '../' : '';

  // ---------- Auth session ----------

  function getToken() {
    try { return localStorage.getItem(TOKEN_KEY); } catch (e) { return null; }
  }
  function getStoredEmail() {
    try { return localStorage.getItem(EMAIL_KEY); } catch (e) { return null; }
  }
  function setSession(token, email) {
    try {
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(EMAIL_KEY, email);
    } catch (e) {}
    dispatchAuthChange();
  }
  function clearSession() {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(EMAIL_KEY);
    } catch (e) {}
    dispatchAuthChange();
  }
  function dispatchAuthChange() {
    progressCache = null;
    progressPromise = null;
    window.dispatchEvent(new CustomEvent('epi-auth-change'));
  }
  function onAuthChange(fn) {
    window.addEventListener('epi-auth-change', fn);
  }

  async function authFetch(path, options) {
    const token = getToken();
    const opts = Object.assign({}, options);
    opts.headers = Object.assign(
      { 'Content-Type': 'application/json' },
      (options && options.headers) || {},
      token ? { Authorization: 'Bearer ' + token } : {}
    );
    let res;
    try {
      res = await fetch(API_BASE + path, opts);
    } catch (e) {
      throw new Error('Could not reach the server. Please try again in a moment.');
    }
    if (res.status === 401 && token) clearSession();
    return res;
  }

  async function parseJson(res) {
    try { return await res.json(); } catch (e) { return {}; }
  }

  // ---------- Toast notifications ----------

  function showToast(message, type) {
    let container = document.getElementById('toastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = 'toast' + (type === 'error' ? ' toast-error' : '');
    toast.textContent = message;
    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  // ---------- Progress (API-backed, with a short in-flight cache) ----------

  let progressCache = null; // { progress, ts }
  let progressPromise = null;
  const PROGRESS_CACHE_MS = 4000;

  async function getProgress() {
    if (!getToken()) return {};
    if (progressCache && Date.now() - progressCache.ts < PROGRESS_CACHE_MS) return progressCache.progress;
    if (progressPromise) return progressPromise;
    progressPromise = authFetch('/progress')
      .then(parseJson)
      .then((data) => {
        progressCache = { progress: data.progress || {}, ts: Date.now() };
        progressPromise = null;
        return progressCache.progress;
      })
      .catch(() => {
        progressPromise = null;
        return {};
      });
    return progressPromise;
  }

  async function setProgress(id, done) {
    if (!getToken()) return {};
    const res = await authFetch('/progress/' + encodeURIComponent(id), {
      method: 'PUT',
      body: JSON.stringify({ done })
    });
    const data = await parseJson(res);
    if (!res.ok) throw new Error(data.error || 'Could not save your progress.');
    progressCache = { progress: data.progress || {}, ts: Date.now() };
    return progressCache.progress;
  }

  // ---------- Theme ----------

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

  // ---------- Nav bar + account widget ----------

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
        <div class="site-nav-auth" id="siteNavAuth"></div>
      </div>`;
    reflectProgressDots();
    renderAuthWidget();
    onAuthChange(reflectProgressDots);
    onAuthChange(renderAuthWidget);
  }

  async function reflectProgressDots() {
    const progress = await getProgress();
    document.querySelectorAll('[data-progress-dot]').forEach((dot) => {
      const id = dot.getAttribute('data-progress-dot');
      dot.textContent = progress[id] ? ' ✓' : '';
    });
  }

  function renderAuthWidget() {
    const mount = document.getElementById('siteNavAuth');
    if (!mount) return;
    const token = getToken();
    const email = getStoredEmail();
    if (token && email) {
      mount.innerHTML = `<span class="nav-auth-email" id="navAuthEmail"></span><button type="button" id="navLogoutBtn">Log out</button>`;
      const emailEl = document.getElementById('navAuthEmail');
      if (emailEl) { emailEl.textContent = email; emailEl.title = email; }
      const logoutBtn = document.getElementById('navLogoutBtn');
      if (logoutBtn) logoutBtn.addEventListener('click', clearSession);
    } else {
      mount.innerHTML = `<button type="button" id="navLoginBtn">Log in</button>`;
      const loginBtn = document.getElementById('navLoginBtn');
      if (loginBtn) loginBtn.addEventListener('click', () => openAuthModal());
    }
  }

  // ---------- Auth modal (login / register), injected once on demand ----------

  let authMode = 'login';

  function ensureAuthModal() {
    if (document.getElementById('authModal')) return;
    const wrap = document.createElement('div');
    wrap.innerHTML = `
      <div class="modal-backdrop" id="authModal" role="presentation">
        <article class="modal" role="dialog" aria-modal="true" aria-labelledby="authModalTitle">
          <div class="modal-top">
            <div><p class="modal-kicker">Account</p><h2 id="authModalTitle">Log in</h2></div>
            <button class="modal-close" id="authModalClose" type="button" aria-label="Close">&times;</button>
          </div>
          <form id="authForm" novalidate>
            <label class="field">Email<input type="email" id="authEmail" required autocomplete="email"></label>
            <label class="field">Password<input type="password" id="authPassword" required minlength="8" autocomplete="current-password"></label>
            <p class="form-error hidden" id="authError"></p>
            <button class="button" type="submit" id="authSubmit">Log in</button>
          </form>
          <p class="form-switch">No account yet? <button type="button" id="authSwitch">Create one</button></p>
        </article>
      </div>`;
    document.body.appendChild(wrap.firstElementChild);

    const modal = document.getElementById('authModal');
    const form = document.getElementById('authForm');
    const errorEl = document.getElementById('authError');
    const closeBtn = document.getElementById('authModalClose');
    const switchBtn = document.getElementById('authSwitch');

    function close() {
      modal.classList.remove('open');
      document.body.classList.remove('modal-open');
    }
    closeBtn.addEventListener('click', close);
    modal.addEventListener('click', (event) => { if (event.target === modal) close(); });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && modal.classList.contains('open')) close();
    });

    switchBtn.addEventListener('click', () => setAuthMode(authMode === 'login' ? 'register' : 'login'));

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      errorEl.classList.add('hidden');
      const email = document.getElementById('authEmail').value.trim();
      const password = document.getElementById('authPassword').value;
      const submitBtn = document.getElementById('authSubmit');
      submitBtn.disabled = true;
      const previousLabel = submitBtn.textContent;
      submitBtn.textContent = authMode === 'login' ? 'Logging in…' : 'Creating account…';
      try {
        const res = await authFetch(authMode === 'login' ? '/auth/login' : '/auth/register', {
          method: 'POST',
          body: JSON.stringify({ email, password })
        });
        const data = await parseJson(res);
        if (!res.ok) {
          errorEl.textContent = data.error || 'Something went wrong. Please try again.';
          errorEl.classList.remove('hidden');
          return;
        }
        setSession(data.token, data.email);
        form.reset();
        close();
      } catch (e) {
        errorEl.textContent = e.message || 'Could not reach the server.';
        errorEl.classList.remove('hidden');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = previousLabel;
      }
    });
  }

  function setAuthMode(mode) {
    authMode = mode;
    const title = document.getElementById('authModalTitle');
    const submit = document.getElementById('authSubmit');
    const switchBtn = document.getElementById('authSwitch');
    const switchWrap = switchBtn ? switchBtn.parentElement : null;
    const password = document.getElementById('authPassword');
    if (!title || !submit || !switchWrap) return;
    if (mode === 'login') {
      title.textContent = 'Log in';
      submit.textContent = 'Log in';
      if (password) password.autocomplete = 'current-password';
      switchWrap.innerHTML = 'No account yet? <button type="button" id="authSwitch">Create one</button>';
    } else {
      title.textContent = 'Create account';
      submit.textContent = 'Create account';
      if (password) password.autocomplete = 'new-password';
      switchWrap.innerHTML = 'Already have an account? <button type="button" id="authSwitch">Log in</button>';
    }
    document.getElementById('authSwitch').addEventListener('click', () => setAuthMode(mode === 'login' ? 'register' : 'login'));
    const errorEl = document.getElementById('authError');
    if (errorEl) errorEl.classList.add('hidden');
  }

  function openAuthModal(mode) {
    ensureAuthModal();
    setAuthMode(mode || 'login');
    const modal = document.getElementById('authModal');
    modal.classList.add('open');
    document.body.classList.add('modal-open');
    const emailInput = document.getElementById('authEmail');
    if (emailInput) emailInput.focus();
  }

  // ---------- Search ----------

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

  // ---------- Topic modals ----------

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

  // ---------- Per-lecture "mark as reviewed" toggle ----------

  function initProgressToggle(pageId, buttonId, onChange) {
    const btn = document.getElementById(buttonId || 'progressToggle');
    if (!btn || !pageId) return;

    const reflectLoggedOut = () => {
      btn.classList.remove('is-active');
      btn.textContent = '○ Log in to track progress';
    };
    const reflect = (done) => {
      btn.classList.toggle('is-active', done);
      btn.textContent = done ? '✓ Reviewed' : '○ Mark as reviewed';
    };
    async function refresh() {
      if (!getToken()) { reflectLoggedOut(); return; }
      const progress = await getProgress();
      reflect(Boolean(progress[pageId]));
    }

    btn.addEventListener('click', async () => {
      if (!getToken()) { openAuthModal(); return; }
      const wantDone = !btn.classList.contains('is-active');
      btn.disabled = true;
      try {
        const progress = await setProgress(pageId, wantDone);
        reflect(Boolean(progress[pageId]));
        if (onChange) onChange(Boolean(progress[pageId]));
      } catch (e) {
        showToast(e.message || 'Could not save your progress. Please try again.', 'error');
      } finally {
        btn.disabled = false;
      }
    });

    onAuthChange(refresh);
    refresh();
  }

  // ---------- End-of-lecture course progress strip + prev/next ----------

  const subscribedFooters = new Set();

  async function renderLectureFooter(pageId, mountId) {
    const key = pageId + '|' + (mountId || 'lectureFooter');
    const mount = document.getElementById(mountId || 'lectureFooter');
    if (!mount || !pageId) return;
    const idx = COURSE.findIndex((l) => l.id === pageId);
    if (idx === -1) return;
    const prev = idx > 0 ? COURSE[idx - 1] : null;
    const next = idx < COURSE.length - 1 ? COURSE[idx + 1] : null;
    const loggedIn = Boolean(getToken());
    const progress = loggedIn ? await getProgress() : {};
    const done = COURSE.filter((l) => progress[l.id]).length;
    const pct = loggedIn ? Math.round((done / COURSE.length) * 100) : 0;

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

    const progressText = loggedIn
      ? `${done} of ${COURSE.length} reviewed`
      : `<button type="button" class="inline-login-link" id="lectureFooterLogin">Log in</button> to track progress`;

    mount.innerHTML = `
      <div class="course-progress-mini">
        <div class="course-progress-mini-head"><p class="side-title">Course progress</p><span class="progress-summary-text">${progressText}</span></div>
        <div class="progress-bar"><div class="progress-bar-fill" style="width:${pct}%"></div></div>
        <div class="week-dots">${dots}</div>
      </div>
      <div class="up-next-links">${prevCard}${nextCard}</div>`;

    const loginLink = document.getElementById('lectureFooterLogin');
    if (loginLink) loginLink.addEventListener('click', () => openAuthModal());

    if (!subscribedFooters.has(key)) {
      subscribedFooters.add(key);
      onAuthChange(() => renderLectureFooter(pageId, mountId));
    }
  }

  // ---------- Course home page ----------

  const subscribedGrids = new Set();

  function renderSkeletonCards(count) {
    return Array.from({ length: count || 4 }).map(() => `
      <div class="skeleton-card" aria-hidden="true">
        <div class="skeleton-line short"></div>
        <div class="skeleton-line" style="width:82%;height:18px;"></div>
        <div class="skeleton-line"></div>
        <div class="skeleton-line" style="width:55%;"></div>
      </div>`).join('');
  }

  async function renderCourseGrid(containerId) {
    const key = containerId || 'courseGrid';
    const mount = document.getElementById(key);
    if (!mount) return;
    const loggedIn = Boolean(getToken());
    if (loggedIn && !progressCache) mount.innerHTML = renderSkeletonCards(COURSE.length);
    const progress = loggedIn ? await getProgress() : {};
    let html = '';
    let lastSession = null;
    COURSE.forEach((l) => {
      if (l.session !== lastSession) {
        lastSession = l.session;
        const inSession = COURSE.filter((x) => x.session === l.session);
        const doneInSession = inSession.filter((x) => progress[x.id]).length;
        const countSuffix = loggedIn ? ` <span class="session-heading-count">— ${doneInSession} of ${inSession.length} reviewed</span>` : '';
        html += `<p class="session-heading">Session ${l.session}${countSuffix}</p>`;
      }
      const done = Boolean(progress[l.id]);
      const pillText = loggedIn ? (done ? '✓ Reviewed' : 'Not started') : 'Log in to track';
      html += `
        <a class="course-card searchable" href="${l.href}">
          <span class="session-tag">Week ${l.week}</span>
          <h3>${l.title}</h3>
          <p>${l.subtitle}</p>
          <div class="topic-tags">${l.topics.map((t) => `<span>${t}</span>`).join('')}</div>
          <span class="progress-pill${done ? ' is-done' : ''}">${pillText}</span>
        </a>`;
    });
    mount.innerHTML = html;
    if (!subscribedGrids.has(key)) {
      subscribedGrids.add(key);
      onAuthChange(() => renderCourseGrid(key));
    }
  }

  // ---------- Progress dashboard (circular meter + session breakdown) ----------

  const subscribedDashboards = new Set();
  const GAUGE_R = 50;
  const GAUGE_CIRCUMFERENCE = 2 * Math.PI * GAUGE_R;

  async function renderProgressDashboard(containerId) {
    const key = containerId || 'progressDashboard';
    const mount = document.getElementById(key);
    if (!mount) return;

    if (!subscribedDashboards.has(key)) {
      subscribedDashboards.add(key);
      onAuthChange(() => renderProgressDashboard(key));
    }

    if (!getToken()) {
      mount.innerHTML = `
        <div class="dashboard-loggedout">
          <div class="gauge is-empty" role="img" aria-label="Progress not tracked">
            <svg viewBox="0 0 120 120"><circle class="gauge-track" cx="60" cy="60" r="${GAUGE_R}"></circle></svg>
            <div class="gauge-center"><span class="gauge-pct">—</span><span class="gauge-label">Not tracked</span></div>
          </div>
          <div class="dashboard-loggedout-body">
            <p class="dashboard-loggedout-text">Log in to track your progress across every device and pick up right where you left off.</p>
            <button type="button" class="dashboard-cta" id="dashboardLoginBtn">Log in to start tracking</button>
          </div>
        </div>`;
      const loginBtn = document.getElementById('dashboardLoginBtn');
      if (loginBtn) loginBtn.addEventListener('click', () => openAuthModal());
      return;
    }

    if (!progressCache) {
      mount.innerHTML = `
        <div class="dashboard-inner">
          <div class="gauge is-loading"><svg viewBox="0 0 120 120"><circle class="gauge-track" cx="60" cy="60" r="${GAUGE_R}"></circle></svg><div class="gauge-center"><span class="gauge-pct">···</span></div></div>
          <div class="dashboard-stats"><p class="dashboard-loading-text">Loading your progress…</p></div>
        </div>`;
    }

    const progress = await getProgress();
    const done = COURSE.filter((l) => progress[l.id]).length;
    const total = COURSE.length;
    const pct = Math.round((done / total) * 100);
    const offset = GAUGE_CIRCUMFERENCE * (1 - pct / 100);

    const sessionRows = [1, 2, 3].map((s) => {
      const inSession = COURSE.filter((l) => l.session === s);
      const doneInSession = inSession.filter((l) => progress[l.id]).length;
      const sPct = Math.round((doneInSession / inSession.length) * 100);
      return `
        <div class="session-stat">
          <span>Session ${s}</span>
          <div class="progress-bar"><div class="progress-bar-fill" style="width:${sPct}%"></div></div>
          <span class="session-stat-count">${doneInSession}/${inSession.length}</span>
        </div>`;
    }).join('');

    const next = COURSE.find((l) => !progress[l.id]);
    let ctaHref, ctaText;
    if (!next) {
      ctaHref = COURSE[0].href;
      ctaText = '🎉 Course complete — review again';
    } else if (done === 0) {
      ctaHref = COURSE[0].href;
      ctaText = 'Start Week 1 →';
    } else {
      ctaHref = next.href;
      ctaText = `Continue: Week ${next.week} →`;
    }

    mount.innerHTML = `
      <div class="dashboard-inner">
        <div class="gauge" role="img" aria-label="${pct} percent of the course reviewed">
          <svg viewBox="0 0 120 120">
            <circle class="gauge-track" cx="60" cy="60" r="${GAUGE_R}"></circle>
            <circle class="gauge-fill" cx="60" cy="60" r="${GAUGE_R}" style="stroke-dasharray:${GAUGE_CIRCUMFERENCE.toFixed(2)};stroke-dashoffset:${offset.toFixed(2)};"></circle>
          </svg>
          <div class="gauge-center"><span class="gauge-pct">${pct}%</span><span class="gauge-label">${done} of ${total}</span></div>
        </div>
        <div class="dashboard-stats">
          <div class="dashboard-sessions">${sessionRows}</div>
          <a class="dashboard-cta" href="${ctaHref}">${ctaText}</a>
        </div>
      </div>`;
  }

  window.SITE = {
    COURSE,
    getToken,
    getProgress,
    setProgress,
    openAuthModal,
    initTheme,
    initNav,
    initSearch,
    initTopicModals,
    initProgressToggle,
    renderCourseGrid,
    renderLectureFooter,
    renderProgressDashboard
  };
})();
