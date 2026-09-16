# Statistical Methods in Epidemiology — Study Guides

An interactive study-guide site covering key ideas in biostatistics and epidemiology: exposure, outcome, and confounders; risk ratio, rate ratio, odds ratio, and risk difference; standardization and screening test accuracy; estimation, confidence intervals, and hypothesis testing; simple and multiple linear regression, including linearity and multicollinearity diagnostics; ANOVA and categorical comparisons; logistic regression; and survival analysis.

Made in collaboration with Washington, Claude, and WSU.

## Structure

- `index.html` — course hub listing all lecture guides, with a saved-progress tracker
- `lectures/week01-measuring-disease.html` — Session 1 · Week 1: Measuring Disease in Populations
- `lectures/week02-probability-distributions.html` — Session 1 · Week 2: Probability & Sampling Distributions
- `lectures/week03-estimation-hypothesis-testing.html` — Session 2 · Week 3: Estimation, CIs & Hypothesis Testing
- `lectures/week04-simple-linear-regression.html` — Session 2 · Week 4: Simple Linear Regression
- `lectures/week05-anova-categorical.html` — Session 2 · Week 5: ANOVA & Categorical Comparisons
- `lectures/week06-mlr-diagnostics.html` — Session 3 · Week 6: Diagnostics for Multiple Linear Regression
- `lectures/week07-logistic-regression.html` — Session 3 · Week 7: Logistic Regression
- `lectures/week08-survival-analysis.html` — Session 3 · Week 8: Survival Analysis
- `style.css` / `script.js` — shared styling and site logic: theme toggle, nav bar (with account widget), search, topic modals, and an account-backed "mark as reviewed" progress tracker synced via the Flask API
- `backend/` — Flask API providing accounts (register/login) and cross-device progress sync; see below

## Running the frontend locally

Serve the folder with a static file server so relative links and `location.hostname` checks resolve correctly, e.g.:

```
python -m http.server 5500
```

then open `http://127.0.0.1:5500/index.html`. Opening `index.html` directly via `file://` will *not* talk to a local API (see `API_BASE` in `script.js`) — use a server for full functionality while developing.

## Backend

The site's account system and progress sync are served by a small Flask API in `backend/`. See `backend/.env.example` for the required environment variables.

**Run locally** (uses SQLite, zero setup):

```
cd backend
python -m venv .venv
source .venv/Scripts/activate   # Windows Git Bash; use .venv\Scripts\activate.bat on cmd.exe
pip install -r requirements.txt
python app.py
```

The API listens on `http://127.0.0.1:5000`. `script.js` automatically points at this URL when the frontend is served from `localhost`/`127.0.0.1`.

**Deploy to Render** (production, PostgreSQL):

1. Push this repo to GitHub (already done) and create a new Render **Web Service**, connecting this repo with root directory `backend`
2. Build command: `pip install -r requirements.txt` — Start command: `gunicorn app:app`
3. Add a Render **PostgreSQL** instance (free tier) and copy its connection string into the web service's `DATABASE_URL` env var
4. Set `JWT_SECRET_KEY` (a long random string) and `ALLOWED_ORIGINS=https://robertkutwa.github.io` env vars
5. Deploy, then update the production `API_BASE` value in `script.js` to `https://<your-service-name>.onrender.com/api` and push

Render's free tier spins down when idle, so the first request after inactivity is slow (cold start) — expected behavior, not a bug.
