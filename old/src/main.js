import './style.css';

const app = document.querySelector('#app');

const WEEKDAY_JA = ['日', '月', '火', '水', '木', '金', '土'];

function formatDate(dateStr) {
  const [, m, d] = dateStr.split('-').map(Number);
  const weekday = WEEKDAY_JA[new Date(dateStr).getDay()];
  return `${m}/${d}(${weekday})`;
}

function isToday(dateStr) {
  return dateStr === new Date().toISOString().slice(0, 10);
}

async function fetchJSON(url, options) {
  const res = await fetch(url, options);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `request failed: ${res.status}`);
  }
  return res.json();
}

function render(html) {
  app.innerHTML = html;
}

async function renderMonitor() {
  render(`<section class="monitor"><p class="loading">読み込み中...</p></section>`);

  const [today, week] = await Promise.all([
    fetchJSON('/api/today'),
    fetchJSON('/api/week'),
  ]);

  const todayHtml = today.theme
    ? `<p class="today-theme">${escapeHtml(today.theme.text)}</p>
       ${today.theme.author ? `<p class="today-author">投稿: ${escapeHtml(today.theme.author)}</p>` : ''}`
    : `<p class="today-empty">まだテーマの投稿がありません。<br />ぜひ投稿してください！</p>`;

  const weekHtml = week
    .map(
      (day) => `
      <li class="week-item ${isToday(day.date) ? 'is-today' : ''}">
        <span class="week-date">${formatDate(day.date)}</span>
        <span class="week-text">${day.theme ? escapeHtml(day.theme.text) : '(未定)'}</span>
      </li>`
    )
    .join('');

  render(`
    <section class="monitor">
      <p class="label">今日のトークテーマ</p>
      ${todayHtml}
      <div class="week-panel">
        <p class="week-title">今後1週間のトークテーマ</p>
        <ul class="week-list">${weekHtml}</ul>
      </div>
      <a class="submit-link" href="#/submit">＋ トークテーマを投稿する</a>
      <div class="dev-tools">
        <button id="advance-day-btn" type="button">⏩ 1日進める（テスト用）</button>
        ${today.dayOffset ? `<button id="reset-day-btn" type="button">実際の日付に戻す（+${today.dayOffset}日進行中）</button>` : ''}
      </div>
    </section>
  `);

  document.querySelector('#advance-day-btn').addEventListener('click', async () => {
    await fetchJSON('/api/dev/advance-day', { method: 'POST' });
    renderMonitor();
  });
  document.querySelector('#reset-day-btn')?.addEventListener('click', async () => {
    await fetchJSON('/api/dev/reset-day', { method: 'POST' });
    renderMonitor();
  });
}

async function renderSubmit() {
  render(`
    <section class="submit">
      <a class="back-link" href="#/">← モニター表示に戻る</a>
      <h1>トークテーマを投稿する</h1>
      <form id="theme-form">
        <label for="text">テーマ</label>
        <textarea id="text" name="text" maxlength="200" rows="3" required
          placeholder="例）最近ハマっていること"></textarea>
        <label for="author">名前（任意）</label>
        <input id="author" name="author" maxlength="50" placeholder="例）田中" />
        <button type="submit">投稿する</button>
      </form>
      <p id="submit-message"></p>
      <div id="theme-list-wrap">
        <p class="theme-list-title">投稿済みのテーマ</p>
        <ul id="theme-list"><li class="loading">読み込み中...</li></ul>
      </div>
    </section>
  `);

  document.querySelector('#theme-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = document.querySelector('#text').value;
    const author = document.querySelector('#author').value;
    const messageEl = document.querySelector('#submit-message');
    try {
      await fetchJSON('/api/themes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, author }),
      });
      messageEl.textContent = '投稿しました！';
      messageEl.className = 'success';
      e.target.reset();
      loadThemeList();
    } catch (err) {
      messageEl.textContent = err.message;
      messageEl.className = 'error';
    }
  });

  loadThemeList();
}

async function loadThemeList() {
  const listEl = document.querySelector('#theme-list');
  if (!listEl) return;
  try {
    const themes = await fetchJSON('/api/themes');
    if (themes.length === 0) {
      listEl.innerHTML = `<li class="empty">まだ投稿がありません</li>`;
      return;
    }
    listEl.innerHTML = themes
      .slice()
      .reverse()
      .map(
        (t) => `<li>${escapeHtml(t.text)}${t.author ? ` <span class="author">(${escapeHtml(t.author)})</span>` : ''}</li>`
      )
      .join('');
  } catch (err) {
    listEl.innerHTML = `<li class="error">読み込みに失敗しました</li>`;
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

let pollTimer = null;

function route() {
  if (pollTimer) clearInterval(pollTimer);
  const hash = window.location.hash;
  if (hash === '#/submit') {
    renderSubmit();
  } else {
    renderMonitor();
    pollTimer = setInterval(renderMonitor, 60_000);
  }
}

window.addEventListener('hashchange', route);
route();
