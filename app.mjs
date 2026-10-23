import {WIDTH, HEIGHT, DPI, STYLE, BRANCHES, FOOTER} from './config.mjs';
import {readEvents, buildDefaults, formatRange, withDpi} from './data.mjs';

const $ = id => document.getElementById(id);
const canvas = $('canvas'), ctx = canvas.getContext('2d');
const today = new Date();
const state = {
  branch: '남천점',
  year: today.getFullYear(),
  month: today.getMonth() + 1,
  defaults: {values: {}, candidates: {}},
  overrides: {},   // `${branch}|${year}-${month}` → {슬롯키: 글}
  editing: null,
};
// 세팅 달력에서 넘어오면 주소의 지점·월을 씁니다. 예: ?branch=서면점&year=2026&month=11
const query = new URLSearchParams(location.search);
const queryYear = Number(query.get('year')), queryMonth = Number(query.get('month'));
if (Object.hasOwn(BRANCHES, query.get('branch'))) state.branch = query.get('branch');
if (Number.isInteger(queryYear) && queryYear >= 1900 && queryYear <= 2200 && Number.isInteger(queryMonth) && queryMonth >= 1 && queryMonth <= 12) {
  state.year = queryYear;
  state.month = queryMonth;
}
const CALENDAR_URL = 'https://igoodimin.github.io/waverock-Routesetting-calendar/';
const images = {};
let loadSeq = 0, drawSeq = 0;

const monthKey = () => `${state.branch}|${state.year}-${state.month}`;
const edits = () => (state.overrides[monthKey()] ??= {});
const valueOf = key => edits()[key] ?? state.defaults.values[key] ?? '';

// 글자 칸 목록: 섹터 날짜 칸 + 아래 문구 2줄
function slots() {
  return [
    ...BRANCHES[state.branch].slots.map(s => ({key: s.sector, label: s.sector, x: s.x, y: s.y, style: STYLE.date})),
    {key: 'line1', label: '안내 문구 1', ...FOOTER.line1, style: STYLE.line1},
    {key: 'line2', label: '안내 문구 2', ...FOOTER.line2, style: STYLE.line2},
  ];
}

const fontOf = (style, scale = 1) => `${style.weight} ${style.size * scale}px Pretendard`;

function loadImage(src) {
  return images[src] ??= new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(Error('배경 이미지를 불러오지 못했습니다.'));
    img.src = src;
  });
}

async function draw() {
  const seq = ++drawSeq;
  const list = slots();
  const [bg] = await Promise.all([
    loadImage(BRANCHES[state.branch].bg),
    ...list.map(s => document.fonts.load(fontOf(s.style), valueOf(s.key) + s.style.ref)),
  ]);
  if (seq !== drawSeq) return;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bg, 0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = '#000';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  for (const slot of list) {
    const text = valueOf(slot.key);
    if (!text) continue;
    ctx.font = fontOf(slot.style);
    // 기준 문구의 위아래 높이로 줄 위치를 고정해, 글이 바뀌어도 높이가 흔들리지 않게 합니다.
    const ref = ctx.measureText(slot.style.ref);
    const baseline = slot.y + (ref.actualBoundingBoxAscent - ref.actualBoundingBoxDescent) / 2;
    ctx.fillText(text, slot.x, baseline, slot.style.box[0] - 40);
  }
  renderHotspots();
}

const pct = (v, total) => `${(v / total) * 100}%`;
function placeBox(el, slot) {
  const [w, h] = slot.style.box;
  Object.assign(el.style, {
    left: pct(slot.x - w / 2, WIDTH), top: pct(slot.y - h / 2, HEIGHT),
    width: pct(w, WIDTH), height: pct(h, HEIGHT),
  });
}

function renderHotspots() {
  const host = $('hotspots');
  host.replaceChildren(...slots().map(slot => {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'hot';
    el.title = `${slot.label} 수정`;
    el.setAttribute('aria-label', `${slot.label} 수정`);
    if (slot.key in edits()) el.classList.add('edited');
    else if (!valueOf(slot.key)) el.classList.add('empty');
    placeBox(el, slot);
    el.addEventListener('click', () => openEditor(slot));
    return el;
  }));
}

function openEditor(slot) {
  closeEditor();
  const wrap = document.createElement('div');
  wrap.className = 'editor';
  placeBox(wrap, slot);
  const input = document.createElement('input');
  input.value = valueOf(slot.key);
  input.setAttribute('aria-label', slot.label);
  // 미리보기 배율에 맞춰 글자 크기를 맞춥니다.
  input.style.font = `${slot.style.weight} ${(slot.style.size / WIDTH) * 100}cqw Pretendard`;
  input.addEventListener('input', () => setValue(slot.key, input.value));
  input.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === 'Escape') closeEditor(); });

  const menu = document.createElement('div');
  menu.className = 'menu';
  const addButton = (text, onClick, cls) => {
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = text; if (cls) b.className = cls;
    b.addEventListener('mousedown', e => e.preventDefault()); // 입력칸 포커스 유지
    b.addEventListener('click', onClick);
    menu.append(b);
  };
  for (const event of state.defaults.candidates[slot.key] ?? []) {
    const text = formatRange(event.start, event.end);
    addButton(text, () => { input.value = text; setValue(slot.key, text); });
  }
  addButton('연동값으로 되돌리기', () => {
    delete edits()[slot.key];
    input.value = valueOf(slot.key);
    draw();
  });
  addButton('완료', closeEditor, 'done');

  wrap.append(input, menu);
  state.editing = {el: wrap, key: slot.key};
  $('stage').append(wrap);
  input.focus();
  input.select();
  input.addEventListener('blur', () => setTimeout(() => {
    if (state.editing?.el === wrap && !wrap.contains(document.activeElement)) closeEditor();
  }, 0));
}

function closeEditor() {
  if (!state.editing) return;
  state.editing.el.remove();
  state.editing = null;
  renderHotspots();
}

function setValue(key, text) {
  if (text === (state.defaults.values[key] ?? '')) delete edits()[key];
  else edits()[key] = text;
  draw();
}

function renderControls() {
  $('branches').replaceChildren(...Object.keys(BRANCHES).map(name => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = name;
    b.setAttribute('aria-pressed', String(name === state.branch));
    b.addEventListener('click', () => { state.branch = name; load(); });
    return b;
  }));
  $('monthLabel').textContent = `${state.year}년 ${state.month}월`;
  const params = new URLSearchParams({branch: state.branch, year: state.year, month: state.month});
  $('calendarLink').href = `${CALENDAR_URL}?${params}`;
  history.replaceState(null, '', `?${params}`);
}

function renderEvents() {
  const list = BRANCHES[state.branch].slots.map(({sector}) => {
    const li = document.createElement('li');
    const name = document.createElement('span'), when = document.createElement('span');
    name.textContent = sector;
    const source = state.defaults.sources?.[sector] ?? 'none';
    when.textContent = state.defaults.values[sector] || '일정 없음';
    if (source === 'next') when.textContent += ' · 다음달';
    if (source === 'prev') when.textContent += ' · 이전달';
    if (source === 'none') li.className = 'empty';
    li.append(name, when);
    return li;
  });
  $('events').replaceChildren(...list);
}

function setStatus(text, error = false) {
  $('status').textContent = text;
  $('status').classList.toggle('error', error);
}

async function load() {
  closeEditor();
  renderControls();
  const seq = ++loadSeq;
  const {branch, year, month} = state;
  setStatus('달력에서 일정을 불러오는 중…');
  try {
    const events = await readEvents(branch, year, month);
    if (seq !== loadSeq) return;
    state.defaults = buildDefaults(branch, events, year, month);
    const time = new Date().toLocaleTimeString('ko-KR', {hour: '2-digit', minute: '2-digit'});
    setStatus(`세팅 달력과 동기화 완료 · ${time}`);
  } catch (error) {
    if (seq !== loadSeq) return;
    state.defaults = buildDefaults(branch, [], year, month);
    setStatus(`${error.message} 날짜 칸을 직접 입력할 수 있어요.`, true);
  }
  renderEvents();
  draw();
}

function shiftMonth(delta) {
  const d = new Date(state.year, state.month - 1 + delta, 1);
  state.year = d.getFullYear();
  state.month = d.getMonth() + 1;
  load();
}

async function download() {
  const button = $('download');
  button.disabled = true;
  try {
    closeEditor();
    await draw();
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    const bytes = withDpi(new Uint8Array(await blob.arrayBuffer()), DPI);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([bytes], {type: 'image/png'}));
    a.download = `세팅일정_${state.branch}_${state.year}-${String(state.month).padStart(2, '0')}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  } finally {
    button.disabled = false;
  }
}

$('prev').addEventListener('click', () => shiftMonth(-1));
$('next').addEventListener('click', () => shiftMonth(1));
$('reload').addEventListener('click', load);
$('download').addEventListener('click', download);
load();
