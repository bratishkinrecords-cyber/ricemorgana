const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const querystring = require('querystring');

const PORT = process.env.PORT || 3000;
const dataFile = path.join(__dirname, 'data', 'forum.json');
const cssFile = path.join(__dirname, 'public', 'styles.css');

function ensureDataFile() {
  const dir = path.dirname(dataFile);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(dataFile)) fs.writeFileSync(dataFile, JSON.stringify(seedData(), null, 2));
}

function seedData() {
  return {
    nextOfferId: 6,
    nextCommentId: 4,
    nextTopicId: 4,
    nextReplyId: 4,
    offers: [
      {
        id: 1,
        title: 'Steam аккаунт с библиотекой 120+ игр',
        category: 'Игры',
        price: 2490,
        seller: 'GameVault',
        rating: 4.9,
        orders: 1342,
        warranty: '14 дней',
        description: 'Доступ к аккаунту с AAA-играми, смена данных возможна. Поддержка 24/7.',
        tags: ['Steam', 'AAA', 'Смена данных']
      },
      {
        id: 2,
        title: 'Telegram Premium 12 месяцев',
        category: 'Подписки',
        price: 790,
        seller: 'SubStore',
        rating: 5.0,
        orders: 854,
        warranty: '30 дней',
        description: 'Официальная активация Telegram Premium на 1 год. Быстрая выдача.',
        tags: ['Telegram', 'Premium', 'Годовая']
      },
      {
        id: 3,
        title: 'YouTube канал 40K подписчиков',
        category: 'Соцсети',
        price: 15990,
        seller: 'SocialKing',
        rating: 4.8,
        orders: 211,
        warranty: 'Гарант сделки',
        description: 'Канал с активной аудиторией, ниша: технологии. Передача через бренд-аккаунт.',
        tags: ['YouTube', 'Монетизация', 'Актив']
      },
      {
        id: 4,
        title: 'Discord Nitro 1 месяц',
        category: 'Подписки',
        price: 249,
        seller: 'NitroHub',
        rating: 4.9,
        orders: 2301,
        warranty: '7 дней',
        description: 'Моментальная выдача кода Nitro. Подходит для новых аккаунтов.',
        tags: ['Discord', 'Nitro', 'Code']
      },
      {
        id: 5,
        title: 'VPN аккаунт (WireGuard) 1 год',
        category: 'Сервисы',
        price: 990,
        seller: 'SafeConnect',
        rating: 4.7,
        orders: 492,
        warranty: '30 дней',
        description: 'Стабильный VPN с серверами в 20 странах. До 5 устройств.',
        tags: ['VPN', 'WireGuard', '1 год']
      }
    ],
    comments: [
      { id: 1, offerId: 1, author: 'neo', text: 'Покупал 2 раза, всё чётко и быстро.', createdAt: '2026-02-27 18:10' },
      { id: 2, offerId: 1, author: 'irka', text: 'Поддержка помогла со сменой почты.', createdAt: '2026-02-27 19:43' },
      { id: 3, offerId: 3, author: 'maxx', text: 'Сделка через гаранта, рекомендую.', createdAt: '2026-02-28 09:00' }
    ],
    topics: [
      {
        id: 1,
        title: 'Как выбрать надёжного продавца?',
        author: 'mod_alex',
        content: 'Делимся чеклистом: рейтинг, отзывы, срок на площадке и гарант.',
        createdAt: '2026-02-27 14:40'
      },
      {
        id: 2,
        title: 'Какие категории добавить в маркет?',
        author: 'community',
        content: 'Пишите идеи по новым товарам и сервисам.',
        createdAt: '2026-02-27 21:12'
      },
      {
        id: 3,
        title: 'Лучшие практики безопасной сделки',
        author: 'security_team',
        content: 'Используйте только встроенный гарант и не уходите в личные сообщения.',
        createdAt: '2026-02-28 08:20'
      }
    ],
    replies: [
      { id: 1, topicId: 1, author: 'wizard', text: 'Смотрю на % успешных заказов и возраст магазина.', createdAt: '2026-02-27 15:01' },
      { id: 2, topicId: 1, author: 'sunny', text: 'Если отзывов мало — не рискую с большими суммами.', createdAt: '2026-02-27 16:17' },
      { id: 3, topicId: 3, author: 'safe_user', text: 'Поддерживаю, гарант обязателен.', createdAt: '2026-02-28 09:12' }
    ]
  };
}

function loadData() {
  ensureDataFile();
  return JSON.parse(fs.readFileSync(dataFile, 'utf8'));
}

function saveData(data) {
  fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
}

function now() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(
    d.getHours()
  ).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function send(res, status, body, type = 'text/html; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': type });
  res.end(body);
}

function redirect(res, to) {
  res.writeHead(302, { Location: to });
  res.end();
}

function readBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
      if (body.length > 1e6) req.socket.destroy();
    });
    req.on('end', () => resolve(querystring.parse(body)));
  });
}

function layout(title, content) {
  return `<!doctype html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)} · RiceMorgana Market</title>
    <link rel="stylesheet" href="/styles.css" />
  </head>
  <body>
    <header class="header">
      <div class="container nav">
        <a class="logo" href="/">RiceMorgana</a>
        <nav>
          <a href="/catalog">Каталог</a>
          <a href="/community">Сообщество</a>
          <a href="/safety">Безопасность</a>
        </nav>
        <a class="btn btn-small" href="/community/new">Создать тему</a>
      </div>
    </header>
    <main class="container">${content}</main>
  </body>
</html>`;
}

function offerCard(offer) {
  return `<article class="card offer">
    <div class="offer-head">
      <span class="badge">${escapeHtml(offer.category)}</span>
      <span class="rating">★ ${offer.rating}</span>
    </div>
    <h3><a href="/offers/${offer.id}">${escapeHtml(offer.title)}</a></h3>
    <p>${escapeHtml(offer.description)}</p>
    <div class="tags">${offer.tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join('')}</div>
    <div class="offer-foot">
      <strong>${offer.price.toLocaleString('ru-RU')} ₽</strong>
      <span>${offer.orders} заказов</span>
    </div>
  </article>`;
}

function renderHome(data) {
  const featured = [...data.offers].sort((a, b) => b.orders - a.orders).slice(0, 3);
  const totalOrders = data.offers.reduce((sum, item) => sum + item.orders, 0);
  const categories = [...new Set(data.offers.map((o) => o.category))];
  return layout(
    'Главная',
    `<section class="hero card">
      <p class="eyebrow">marketplace + community</p>
      <h1>Маркет и форум в стиле современной торговой площадки</h1>
      <p>Покупайте цифровые товары, общайтесь в темах и проводите сделки безопасно через гаранта.</p>
      <div class="hero-actions">
        <a class="btn" href="/catalog">Смотреть каталог</a>
        <a class="btn ghost" href="/community">Открыть форум</a>
      </div>
      <div class="stats">
        <div><strong>${data.offers.length}</strong><span>товаров</span></div>
        <div><strong>${totalOrders}</strong><span>заказов</span></div>
        <div><strong>${data.topics.length}</strong><span>тем в сообществе</span></div>
      </div>
    </section>

    <section class="chips">${categories.map((c) => `<a class="chip" href="/catalog?category=${encodeURIComponent(c)}">${escapeHtml(c)}</a>`).join('')}</section>

    <section>
      <div class="section-head"><h2>Популярные предложения</h2><a href="/catalog">Все товары →</a></div>
      <div class="grid">${featured.map(offerCard).join('')}</div>
    </section>

    <section>
      <div class="section-head"><h2>Горячие темы сообщества</h2><a href="/community">Все темы →</a></div>
      <div class="list">${data.topics
        .slice(0, 3)
        .map(
          (t) => `<a class="card topic" href="/community#topic-${t.id}"><strong>${escapeHtml(t.title)}</strong><span>${escapeHtml(
            t.author
          )} · ${escapeHtml(t.createdAt)}</span></a>`
        )
        .join('')}</div>
    </section>`
  );
}

function renderCatalog(data, query, category, sort) {
  const q = (query || '').trim().toLowerCase();
  let offers = data.offers.filter((offer) => {
    const okCategory = category ? offer.category === category : true;
    const okQuery = q
      ? `${offer.title} ${offer.description} ${offer.seller} ${offer.tags.join(' ')}`.toLowerCase().includes(q)
      : true;
    return okCategory && okQuery;
  });

  if (sort === 'price_asc') offers.sort((a, b) => a.price - b.price);
  else if (sort === 'price_desc') offers.sort((a, b) => b.price - a.price);
  else offers.sort((a, b) => b.orders - a.orders);

  const categories = [...new Set(data.offers.map((o) => o.category))];

  return layout(
    'Каталог',
    `<section class="section-head"><h1>Каталог товаров</h1><span>${offers.length} результатов</span></section>
    <form class="filters card" method="GET" action="/catalog">
      <input type="text" name="q" value="${escapeHtml(query || '')}" placeholder="Поиск товаров, тегов, продавцов" />
      <select name="category">
        <option value="">Все категории</option>
        ${categories
          .map((c) => `<option value="${escapeHtml(c)}" ${c === category ? 'selected' : ''}>${escapeHtml(c)}</option>`)
          .join('')}
      </select>
      <select name="sort">
        <option value="popular" ${sort === 'popular' || !sort ? 'selected' : ''}>По популярности</option>
        <option value="price_asc" ${sort === 'price_asc' ? 'selected' : ''}>Сначала дешевле</option>
        <option value="price_desc" ${sort === 'price_desc' ? 'selected' : ''}>Сначала дороже</option>
      </select>
      <button class="btn" type="submit">Применить</button>
    </form>

    <section class="grid">${offers.length ? offers.map(offerCard).join('') : '<div class="card">Ничего не найдено, попробуйте изменить фильтры.</div>'}</section>`
  );
}

function renderOffer(data, offer, error = '', values = {}) {
  const comments = data.comments.filter((c) => c.offerId === offer.id);
  return layout(
    offer.title,
    `<section class="card offer-page">
      <div class="offer-head"><span class="badge">${escapeHtml(offer.category)}</span><span class="rating">★ ${offer.rating}</span></div>
      <h1>${escapeHtml(offer.title)}</h1>
      <p>${escapeHtml(offer.description)}</p>
      <p><strong>Продавец:</strong> ${escapeHtml(offer.seller)} · <strong>Гарантия:</strong> ${escapeHtml(offer.warranty)}</p>
      <div class="tags">${offer.tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join('')}</div>
      <div class="offer-foot"><strong class="price">${offer.price.toLocaleString('ru-RU')} ₽</strong><span>${offer.orders} заказов</span></div>
    </section>

    <section class="card">
      <h2>Отзывы и обсуждение</h2>
      ${comments.length ? comments.map((c) => `<div class="comment"><strong>${escapeHtml(c.author)}</strong><span>${escapeHtml(c.createdAt)}</span><p>${escapeHtml(c.text)}</p></div>`).join('') : '<p>Пока нет отзывов — оставьте первый.</p>'}
      ${error ? `<p class="error">${escapeHtml(error)}</p>` : ''}
      <form class="stack" method="POST" action="/offers/${offer.id}/comments">
        <input type="text" name="author" value="${escapeHtml(values.author || '')}" placeholder="Ваш ник" maxlength="40" required />
        <textarea name="text" rows="4" maxlength="500" placeholder="Ваш отзыв" required>${escapeHtml(values.text || '')}</textarea>
        <button class="btn" type="submit">Отправить отзыв</button>
      </form>
    </section>`
  );
}

function renderCommunity(data, error = '') {
  return layout(
    'Сообщество',
    `<section class="section-head"><h1>Форум сообщества</h1><a href="/community/new">+ Новая тема</a></section>
    ${error ? `<p class="error">${escapeHtml(error)}</p>` : ''}
    <section class="list">
      ${data.topics
        .map((topic) => {
          const replies = data.replies.filter((r) => r.topicId === topic.id);
          return `<article class="card" id="topic-${topic.id}">
            <h3>${escapeHtml(topic.title)}</h3>
            <p>${escapeHtml(topic.content)}</p>
            <p class="muted">${escapeHtml(topic.author)} · ${escapeHtml(topic.createdAt)} · ${replies.length} ответов</p>
            <div class="thread-replies">${replies
              .map((r) => `<div class="reply"><strong>${escapeHtml(r.author)}:</strong> ${escapeHtml(r.text)}</div>`)
              .join('')}</div>
            <form class="inline" method="POST" action="/community/${topic.id}/replies">
              <input type="text" name="author" maxlength="40" placeholder="Ник" required />
              <input type="text" name="text" maxlength="280" placeholder="Быстрый ответ" required />
              <button class="btn btn-small" type="submit">Ответить</button>
            </form>
          </article>`;
        })
        .join('')}
    </section>`
  );
}

function renderNewTopic(error = '', values = {}) {
  return layout(
    'Новая тема',
    `<section class="card narrow">
      <h1>Создать тему</h1>
      ${error ? `<p class="error">${escapeHtml(error)}</p>` : ''}
      <form class="stack" method="POST" action="/community/topics">
        <input type="text" name="title" maxlength="120" placeholder="Заголовок" value="${escapeHtml(values.title || '')}" required />
        <input type="text" name="author" maxlength="40" placeholder="Ваш ник" value="${escapeHtml(values.author || '')}" required />
        <textarea name="content" rows="6" maxlength="1000" placeholder="Содержание темы" required>${escapeHtml(values.content || '')}</textarea>
        <button class="btn" type="submit">Опубликовать</button>
      </form>
    </section>`
  );
}

function renderSafety() {
  return layout(
    'Безопасность',
    `<section class="card">
      <h1>Правила безопасной сделки</h1>
      <ul>
        <li>Всегда используйте гаранта площадки.</li>
        <li>Проверяйте рейтинг продавца и историю заказов.</li>
        <li>Никогда не переходите в сторонние мессенджеры до завершения сделки.</li>
        <li>Фиксируйте все договорённости в чате заказа.</li>
      </ul>
    </section>`
  );
}

function render404() {
  return layout('404', '<section class="card narrow"><h1>404</h1><p>Страница не найдена.</p><a class="btn" href="/">На главную</a></section>');
}

const server = http.createServer(async (req, res) => {
  const data = loadData();
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === 'GET' && url.pathname === '/styles.css') {
    return send(res, 200, fs.readFileSync(cssFile, 'utf8'), 'text/css; charset=utf-8');
  }

  if (req.method === 'GET' && url.pathname === '/') return send(res, 200, renderHome(data));
  if (req.method === 'GET' && url.pathname === '/catalog') {
    return send(
      res,
      200,
      renderCatalog(data, url.searchParams.get('q') || '', url.searchParams.get('category') || '', url.searchParams.get('sort') || 'popular')
    );
  }
  if (req.method === 'GET' && url.pathname === '/community') return send(res, 200, renderCommunity(data));
  if (req.method === 'GET' && url.pathname === '/community/new') return send(res, 200, renderNewTopic());
  if (req.method === 'GET' && url.pathname === '/safety') return send(res, 200, renderSafety());

  const offerView = url.pathname.match(/^\/offers\/(\d+)$/);
  if (req.method === 'GET' && offerView) {
    const offer = data.offers.find((o) => o.id === Number(offerView[1]));
    if (!offer) return send(res, 404, render404());
    return send(res, 200, renderOffer(data, offer));
  }

  const offerComment = url.pathname.match(/^\/offers\/(\d+)\/comments$/);
  if (req.method === 'POST' && offerComment) {
    const offerId = Number(offerComment[1]);
    const offer = data.offers.find((o) => o.id === offerId);
    if (!offer) return send(res, 404, render404());

    const form = await readBody(req);
    const author = (form.author || '').trim();
    const text = (form.text || '').trim();
    if (!author || !text) return send(res, 400, renderOffer(data, offer, 'Заполните все поля.', { author, text }));

    data.comments.push({ id: data.nextCommentId, offerId, author, text, createdAt: now() });
    data.nextCommentId += 1;
    saveData(data);
    return redirect(res, `/offers/${offerId}`);
  }

  if (req.method === 'POST' && url.pathname === '/community/topics') {
    const form = await readBody(req);
    const title = (form.title || '').trim();
    const author = (form.author || '').trim();
    const content = (form.content || '').trim();
    if (!title || !author || !content) return send(res, 400, renderNewTopic('Все поля обязательны.', { title, author, content }));

    data.topics.unshift({ id: data.nextTopicId, title, author, content, createdAt: now() });
    data.nextTopicId += 1;
    saveData(data);
    return redirect(res, '/community');
  }

  const topicReply = url.pathname.match(/^\/community\/(\d+)\/replies$/);
  if (req.method === 'POST' && topicReply) {
    const topicId = Number(topicReply[1]);
    const topic = data.topics.find((t) => t.id === topicId);
    if (!topic) return send(res, 404, render404());

    const form = await readBody(req);
    const author = (form.author || '').trim();
    const text = (form.text || '').trim();
    if (!author || !text) return send(res, 400, renderCommunity(data, 'Для ответа нужно заполнить ник и сообщение.'));

    data.replies.push({ id: data.nextReplyId, topicId, author, text, createdAt: now() });
    data.nextReplyId += 1;
    saveData(data);
    return redirect(res, `/community#topic-${topicId}`);
  }

  return send(res, 404, render404());
});

server.listen(PORT, () => {
  console.log(`RiceMorgana Market running on http://localhost:${PORT}`);
});
