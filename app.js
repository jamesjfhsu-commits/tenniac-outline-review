import outline from './outline.js';
import GUI from 'lil-gui';
import { createCourt } from './court.js';

const $ = id => document.getElementById(id);
const STORAGE_KEY = 'outline-review-v1';
const DEFAULTS = {
  fields: {},
  style: {
    surface: '硬地 hard',
    speed: 1,
    showRoute: true,
    rotate: false,
    fontSize: 100,
    theme: '暗',
  },
};
const STOPS = ['OPEN', 'Topic 1', 'Topic 2', 'Topic 3', '新聞'];
const IDS = ['open', 't1', 't2', 't3', 'news'];
const BADGES = { 保留: 'keep', 要修改: 'revise', 有疑問: 'question' };
let state;

try {
  state = { ...DEFAULTS, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') };
} catch {
  state = structuredClone(DEFAULTS);
}
state.fields ||= {};
state.style = { ...DEFAULTS.style, ...state.style };

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // The page still works when browser storage is unavailable.
  }
}

function element(tag, attributes = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attributes)) {
    if (key === 'text') node.textContent = value;
    else if (key === 'class') node.className = value;
    else node.setAttribute(key, value);
  }
  for (const child of children) node.append(child);
  return node;
}

function sticker(name, alt, className, size, lazy = true) {
  const image = element('img', {
    src: './assets/stickers/' + name + '.webp',
    alt,
    class: className,
    width: String(size),
    height: String(size),
  });
  if (lazy) image.loading = 'lazy';
  return image;
}

function boundField(key, tag, attributes = {}) {
  const node = element(tag, attributes);
  node.value = state.fields[key] || '';
  const update = () => {
    state.fields[key] = node.value;
    save();
    renderPreview();
  };
  node.addEventListener('input', update);
  node.addEventListener('change', update);
  return node;
}

// Review cards and their single-choice stickers
function card(id, title, body, topic = false) {
  const article = element('article', { class: 'review-card', 'data-card': id });
  article.append(
    element('h3', { text: title }),
    element('p', { class: 'card-body', text: body }),
  );

  const choices = element('div', {
    class: 'choices',
    role: 'group',
    'aria-label': title + ' 的評價',
  });
  const badge = sticker('keep', '', 'choice-badge', 48);
  badge.hidden = true;
  for (const choice of ['保留', '要修改', '有疑問']) {
    const button = element('button', {
      type: 'button',
      text: choice,
      'aria-pressed': String(state.fields[id + ':choice'] === choice),
    });
    button.addEventListener('click', () => {
      state.fields[id + ':choice'] =
        state.fields[id + ':choice'] === choice ? '' : choice;
      refreshChoice();
      save();
      renderPreview();
      updateProgress();
    });
    choices.append(button);
  }
  function refreshChoice() {
    const selected = state.fields[id + ':choice'];
    for (const button of choices.querySelectorAll('button')) {
      button.setAttribute('aria-pressed', String(button.textContent === selected));
    }
    badge.hidden = !selected;
    if (selected) {
      badge.src = './assets/stickers/' + BADGES[selected] + '.webp';
      badge.alt = selected;
    }
  }
  refreshChoice();
  article.append(choices, badge);

  const noteId = id + '-note';
  article.append(
    element('label', { for: noteId, text: '我的建議' }),
    boundField(id + ':note', 'textarea', {
      id: noteId,
      rows: '3',
      placeholder: '寫下你想調整或追問的地方',
    }),
  );
  if (topic) {
    const storyId = id + '-story';
    article.append(
      element('label', { for: storyId, text: '我想補的故事' }),
      boundField(id + ':story', 'textarea', {
        id: storyId,
        rows: '3',
        placeholder: '一個具體的畫面、一句話或一個數字',
      }),
    );
  }
  return article;
}

// Episode heading and source text
$('episode-title').textContent = outline.title;
$('status').textContent = outline.status;
for (const [key, value] of Object.entries(outline.meta)) {
  $('meta').append(element('div', {}, [
    element('dt', { text: key }),
    element('dd', { text: value }),
  ]));
}

function section(id, kicker, title, pose) {
  const node = element('section', { id, class: 'outline-section' });
  const heading = element('div', { class: 'illustrated-heading' }, [
    element('div', {}, [
      element('p', { class: 'eyebrow', text: kicker }),
      element('h2', { text: title }),
    ]),
    sticker(pose, '', 'section-sticker', 72),
  ]);
  node.append(heading);
  $('outline').append(node);
  return node;
}

section('open', 'OPEN', '從一個問題開場', 'serve')
  .append(card('open-1', 'OPEN', outline.open));

outline.topics.forEach((topic, index) => {
  const pose = ['desk', 'rest', 'jump'][index];
  const node = section(topic.id, 'TOPIC 0' + (index + 1), topic.title, pose);
  topic.parts.forEach((part, partIndex) => {
    node.append(card(topic.id + '-' + (partIndex + 1), part.lead, part.text, true));
  });
});

const news = section('news', 'RECENT NEWS', '近期網球新聞', 'news');
news.append(element('a', {
  href: outline.news.url,
  target: '_blank',
  rel: 'noopener noreferrer',
  text: outline.news.label,
}));
outline.news.points.forEach((point, index) => {
  news.append(card('news-' + (index + 1), '新聞重點 ' + (index + 1), point));
});

// Story court, navigation and completion
const court = createCourt($('court-canvas'), index => {
  $(IDS[index]).scrollIntoView({ behavior: 'smooth' });
});
STOPS.forEach((label, index) => {
  const button = element('button', {
    type: 'button',
    'data-stop': IDS[index],
    'aria-label': label + (index > 0 && index < 4
      ? '：' + outline.topics[index - 1].title : ''),
  });
  button.append(element('span', { text: label }));
  if (index > 0 && index < 4) {
    button.append(element('small', {
      class: 'stop-subtitle',
      text: outline.topics[index - 1].title.slice(0, 14),
    }));
  }
  button.addEventListener('click', () => {
    $(IDS[index]).scrollIntoView({ behavior: 'smooth' });
  });
  $('court-stops').append(button);
});
$('reset-camera').addEventListener('click', court.reset);

function updateProgress() {
  const done = IDS.map(id => {
    const cards = [...$(id).querySelectorAll('[data-card]')];
    return cards.length > 0 &&
      cards.every(item => Boolean(state.fields[item.dataset.card + ':choice']));
  });
  done.forEach((complete, index) => {
    $('court-stops').querySelector('[data-stop="' + IDS[index] + '"]')
      .classList.toggle('done', complete);
  });
  court.setProgress(done);
  $('send-cool').hidden = !done.every(Boolean);
  $('send-complete').hidden = !done.every(Boolean);
}

// Local style controls
const style = state.style;
function applyStyle() {
  document.documentElement.style.fontSize = style.fontSize + '%';
  document.documentElement.dataset.theme = style.theme === '亮' ? 'light' : 'dark';
  if (court.reducedMotion) style.rotate = false;
  court.update(style);
  save();
}
const gui = new GUI({ container: $('gui'), autoPlace: false, title: '球場樣式' });
gui.add(style, 'surface', {
  '硬地 hard': '硬地 hard',
  '紅土 clay': '紅土 clay',
  '草地 grass': '草地 grass',
}).name('場地').onChange(applyStyle);
gui.add(style, 'speed', 0.25, 2, 0.25).name('球速').onChange(applyStyle);
gui.add(style, 'showRoute').name('顯示球路').onChange(applyStyle);
gui.add(style, 'rotate').name('自動旋轉').onChange(applyStyle);
gui.add(style, 'fontSize', 90, 120, 5).name('字級 %').onChange(applyStyle);
gui.add(style, 'theme', { 亮: '亮', 暗: '暗' })
  .name('主題').onChange(applyStyle);
if (matchMedia('(max-width: 650px)').matches) $('style-panel').open = false;
applyStyle();

// Feedback fields and preview
for (const id of ['story-fill', 'story-line', 'name', 'role']) {
  const input = $(id);
  input.value = state.fields[id] || '';
  const update = () => {
    state.fields[id] = input.value;
    save();
    renderPreview();
  };
  input.addEventListener('input', update);
  input.addEventListener('change', update);
}

function touched(id) {
  return Boolean(
    state.fields[id + ':choice'] ||
    state.fields[id + ':note']?.trim() ||
    state.fields[id + ':story']?.trim()
  );
}

function compile() {
  const lines = [
    '訪綱回饋｜' + outline.title,
    '名字：' + (state.fields.name || ''),
    '身分：' + (state.fields.role || ''),
  ];
  let number = 0;
  for (let index = 0; index < IDS.length; index++) {
    const entries = [...$(IDS[index]).querySelectorAll('[data-card]')]
      .filter(item => touched(item.dataset.card));
    if (!entries.length) continue;
    lines.push('', (++number) + '. ' + STOPS[index]);
    for (const item of entries) {
      const key = item.dataset.card;
      const choice = state.fields[key + ':choice'];
      lines.push('  ' + item.querySelector('h3').textContent +
        (choice ? '｜' + choice : ''));
      if (state.fields[key + ':note']?.trim()) {
        lines.push('  我的建議：' + state.fields[key + ':note'].trim());
      }
      if (state.fields[key + ':story']?.trim()) {
        lines.push('  我想補的故事：' + state.fields[key + ':story'].trim());
      }
    }
  }
  if (state.fields['story-fill']?.trim()) {
    lines.push('', '如果你也覺得出國很遙遠，先從' +
      state.fields['story-fill'].trim() + '開始。');
  }
  if (state.fields['story-line']?.trim()) {
    lines.push('', '這集最想讓聽眾帶走的一句話：' +
      state.fields['story-line'].trim());
  }
  return lines.join('\n');
}
function renderPreview() {
  $('preview').textContent = compile();
}

// Reader-controlled email, clipboard and text download
const MAIL_LIMIT = 1900;
export function feedbackMail(to, subject, body) {
  const href = text => 'mailto:' + to + '?subject=' +
    encodeURIComponent(subject) + '&body=' + encodeURIComponent(text);
  if (href(body).length <= MAIL_LIMIT) {
    return { href: href(body), truncated: false };
  }
  const note = '\n\n（內容較長，請在信件中貼上剛才複製的完整回饋）';
  let cut = body.length;
  while (cut > 0 && href(body.slice(0, cut) + note).length > MAIL_LIMIT) {
    cut -= 50;
  }
  return {
    href: href(body.slice(0, Math.max(cut, 0)) + note),
    truncated: true,
  };
}

function selectPreview() {
  const range = document.createRange();
  range.selectNodeContents($('preview'));
  const selection = getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
  $('preview').focus();
}
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    selectPreview();
    return false;
  }
}

$('copy').addEventListener('click', async () => {
  $('message').textContent = await copyText(compile())
    ? '回饋已複製。' : '請複製已選取的回饋文字。';
});
$('mail').addEventListener('click', async () => {
  if (!$('name').value.trim()) {
    $('name').focus();
    $('message').textContent = '請先填寫名字。';
    return;
  }
  const body = compile();
  const mail = feedbackMail(
    'service@tenniactennis.com',
    '【訪綱回饋】泳・網直前｜' + $('name').value.trim(),
    body,
  );
  if (mail.truncated) {
    const copied = await copyText(body);
    $('message').textContent = copied
      ? '內容較長：完整回饋已複製，請貼到信件中'
      : '內容較長：請複製已選取的完整回饋，再貼到信件中';
  } else {
    $('message').textContent = '請在郵件程式中確認並寄出。';
  }
  location.href = mail.href;
});
$('download').addEventListener('click', () => {
  const blob = new Blob([compile()], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  element('a', { href: url, download: '訪綱回饋.txt' }).click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
$('clear').addEventListener('click', () => {
  if (!confirm('確定清除你在此頁的所有回饋？')) return;
  state.fields = {};
  save();
  location.reload();
});
renderPreview();
updateProgress();
window.reviewDebug = { court, compile };

