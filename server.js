const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const querystring = require('querystring');

const PORT = process.env.PORT || 3000;
const dataDir = path.join(__dirname, 'data');
const dataFile = path.join(dataDir, 'forum.json');
const cssFile = path.join(__dirname, 'public', 'styles.css');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getNow() {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

function loadData() {
  if (!fs.existsSync(dataFile)) {
    const seed = {
      nextThreadId: 2,
      nextReplyId: 2,
      threads: [
        {
          id: 1,
          title: 'Добро пожаловать на форум!',
          author: 'Admin',
          content: 'Это ваш первый форум. Создавайте темы, общайтесь и делитесь идеями.',
          createdAt: getNow()
        }
      ],
      replies: [
        {
          id: 1,
          threadId: 1,
          author: 'Admin',
          content: 'Чтобы начать — нажмите «Новая тема» и задайте вопрос.',
          createdAt: getNow()
        }
      ]
    };
    fs.writeFileSync(dataFile, JSON.stringify(seed, null, 2));
    return seed;
  }

  return JSON.parse(fs.readFileSync(dataFile, 'utf-8'));
}

function saveData(data) {
  fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
}

function layout(title, content) {
  return `<!doctype html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)} · RiceMorgana Forum</title>
    <link rel="stylesheet" href="/styles.css" />
  </head>
  <body>
    <header class="topbar">
      <div class="container topbar__inner">
        <a class="brand" href="/">RiceMorgana Forum</a>
        <a class="button button--small" href="/threads/new">Новая тема</a>
      </div>
    </header>
    <main class="container">
      ${content}
    </main>
    <footer class="footer">
      <div class="container">Сделано с нуля для общения и обсуждений.</div>
    </footer>
  </body>
</html>`;
}

function renderIndex(data, query = '') {
  const q = query.toLowerCase();
  const threads = data.threads
    .filter((thread) => {
      if (!q) return true;
      return [thread.title, thread.author, thread.content].some((item) =>
        String(item).toLowerCase().includes(q)
      );
    })
    .sort((a, b) => b.id - a.id);

  const threadCards =
    threads.length === 0
      ? '<div class="card empty-state">По вашему запросу ничего не найдено.</div>'
      : threads
          .map(
            (thread) => `<article class="card thread-card">
      <h2><a href="/threads/${thread.id}">${escapeHtml(thread.title)}</a></h2>
      <p class="meta">Автор: <strong>${escapeHtml(thread.author)}</strong> · ${escapeHtml(thread.createdAt)}</p>
      <p>${escapeHtml(thread.content.slice(0, 180))}${thread.content.length > 180 ? '…' : ''}</p>
      <a class="link" href="/threads/${thread.id}">Перейти к обсуждению →</a>
    </article>`
          )
          .join('');

  return layout(
    'Главная',
    `<section class="hero">
      <h1>Форум для общения</h1>
      <p>Создавайте темы, отвечайте другим участникам и развивайте сообщество.</p>
    </section>

    <form class="search" action="/" method="GET">
      <input type="text" name="q" placeholder="Поиск по темам, автору, содержимому" value="${escapeHtml(
        query
      )}" />
      <button class="button" type="submit">Найти</button>
    </form>

    <section class="thread-list">${threadCards}</section>`
  );
}

function renderNewThread(error = '', values = {}) {
  return layout(
    'Новая тема',
    `<section class="card form-card">
      <h1>Создать новую тему</h1>
      <p>Заполните форму ниже и начните обсуждение.</p>
      ${error ? `<div class="alert">${escapeHtml(error)}</div>` : ''}
      <form class="stack" method="POST" action="/threads">
        <label>Заголовок
          <input type="text" name="title" maxlength="120" value="${escapeHtml(values.title || '')}" required />
        </label>
        <label>Ваше имя
          <input type="text" name="author" maxlength="40" value="${escapeHtml(values.author || '')}" required />
        </label>
        <label>Сообщение
          <textarea name="content" rows="7" maxlength="2000" required>${escapeHtml(values.content || '')}</textarea>
        </label>
        <button class="button" type="submit">Опубликовать тему</button>
      </form>
    </section>`
  );
}

function renderThread(thread, replies, error = '', values = {}) {
  const repliesMarkup =
    replies.length === 0
      ? '<div class="card empty-state">Пока нет ответов. Станьте первым!</div>'
      : replies
          .map(
            (reply) => `<article class="card reply-card">
        <p class="meta"><strong>${escapeHtml(reply.author)}</strong> · ${escapeHtml(reply.createdAt)}</p>
        <p>${escapeHtml(reply.content)}</p>
      </article>`
          )
          .join('');

  return layout(
    thread.title,
    `<article class="card thread-view">
      <h1>${escapeHtml(thread.title)}</h1>
      <p class="meta">Автор: <strong>${escapeHtml(thread.author)}</strong> · ${escapeHtml(thread.createdAt)}</p>
      <p class="thread-content">${escapeHtml(thread.content)}</p>
    </article>

    <section>
      <h2>Ответы (${replies.length})</h2>
      ${repliesMarkup}
    </section>

    <section class="card form-card">
      <h2>Добавить ответ</h2>
      ${error ? `<div class="alert">${escapeHtml(error)}</div>` : ''}
      <form class="stack" method="POST" action="/threads/${thread.id}/replies">
        <label>Ваше имя
          <input type="text" name="author" maxlength="40" value="${escapeHtml(values.author || '')}" required />
        </label>
        <label>Ответ
          <textarea name="content" rows="5" maxlength="1500" required>${escapeHtml(values.content || '')}</textarea>
        </label>
        <button class="button" type="submit">Отправить</button>
      </form>
    </section>`
  );
}

function render404() {
  return layout(
    'Страница не найдена',
    `<section class="card form-card center">
      <h1>404</h1>
      <p>Упс, такой страницы не существует.</p>
      <a class="button" href="/">Вернуться на главную</a>
    </section>`
  );
}

function readBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
      if (body.length > 1e6) req.socket.destroy();
    });
    req.on('end', () => {
      resolve(querystring.parse(body));
    });
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;
  const data = loadData();

  if (req.method === 'GET' && pathname === '/styles.css') {
    res.writeHead(200, { 'Content-Type': 'text/css; charset=utf-8' });
    res.end(fs.readFileSync(cssFile, 'utf-8'));
    return;
  }

  if (req.method === 'GET' && pathname === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(renderIndex(data, url.searchParams.get('q') || ''));
    return;
  }

  if (req.method === 'GET' && pathname === '/threads/new') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(renderNewThread());
    return;
  }

  if (req.method === 'POST' && pathname === '/threads') {
    const form = await readBody(req);
    const title = (form.title || '').trim();
    const author = (form.author || '').trim();
    const content = (form.content || '').trim();

    if (!title || !author || !content) {
      res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(renderNewThread('Все поля обязательны для заполнения.', { title, author, content }));
      return;
    }

    const thread = {
      id: data.nextThreadId,
      title,
      author,
      content,
      createdAt: getNow()
    };
    data.nextThreadId += 1;
    data.threads.push(thread);
    saveData(data);

    res.writeHead(302, { Location: `/threads/${thread.id}` });
    res.end();
    return;
  }

  const threadMatch = pathname.match(/^\/threads\/(\d+)$/);
  if (req.method === 'GET' && threadMatch) {
    const threadId = Number(threadMatch[1]);
    const thread = data.threads.find((item) => item.id === threadId);
    if (!thread) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(render404());
      return;
    }

    const replies = data.replies.filter((reply) => reply.threadId === threadId);
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(renderThread(thread, replies));
    return;
  }

  const replyMatch = pathname.match(/^\/threads\/(\d+)\/replies$/);
  if (req.method === 'POST' && replyMatch) {
    const threadId = Number(replyMatch[1]);
    const thread = data.threads.find((item) => item.id === threadId);
    if (!thread) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(render404());
      return;
    }

    const form = await readBody(req);
    const author = (form.author || '').trim();
    const content = (form.content || '').trim();

    if (!author || !content) {
      const replies = data.replies.filter((reply) => reply.threadId === threadId);
      res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(renderThread(thread, replies, 'Имя и сообщение обязательны.', { author, content }));
      return;
    }

    const reply = {
      id: data.nextReplyId,
      threadId,
      author,
      content,
      createdAt: getNow()
    };
    data.nextReplyId += 1;
    data.replies.push(reply);
    saveData(data);

    res.writeHead(302, { Location: `/threads/${threadId}` });
    res.end();
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(render404());
});

server.listen(PORT, () => {
  console.log(`Forum started on http://localhost:${PORT}`);
});
