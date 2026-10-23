import {SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, BRANCHES, FOOTER_NOTE, DEFAULT_SETTING, DEFAULT_TIME} from './config.mjs';

const WEEKDAYS = '일월화수목금토';

const isoDate = d => d.toISOString().slice(0, 10);
export const monthId = (year, month) => isoDate(new Date(Date.UTC(year, month - 1, 1))).slice(0, 7);

// 달력의 일정을 읽기만 합니다. 이전달 1일 ~ 다음달 말일까지 가져옵니다.
export async function readEvents(branch, year, month) {
  const query = new URLSearchParams({
    select: 'id,branch,sector,time,note,start,end',
    branch: `eq.${branch}`,
    order: 'start,id',
  });
  query.append('start', `gte.${isoDate(new Date(Date.UTC(year, month - 2, 1)))}`);
  query.append('start', `lte.${isoDate(new Date(Date.UTC(year, month + 1, 0)))}`);
  const response = await fetch(`${SUPABASE_URL}/rest/v1/calendar_events?${query}`, {
    headers: {apikey: SUPABASE_PUBLISHABLE_KEY}, cache: 'no-store', signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw Error('달력 서버에서 일정을 가져오지 못했습니다.');
  const rows = await response.json();
  if (!Array.isArray(rows)) throw Error('일정 데이터 형식을 확인해 주세요.');
  return rows;
}

// '브라운1&2' → ['브라운1','브라운2'], '해피 & 미드나잇' → ['해피','미드나잇']
export function sectorsOf(name) {
  const parts = String(name).replace(/\s/g, '').split('&').filter(Boolean);
  let prefix = '';
  return parts.map(part => {
    if (/^\d+$/.test(part)) return prefix + part;
    prefix = part.replace(/\d+$/, '');
    return part;
  });
}

export function formatDay(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return `${m}/${d}(${WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]})`;
}

export function formatRange(start, end) {
  return start === end ? formatDay(start) : `${formatDay(start)} ~ ${formatDay(end)}`;
}

// '08:00~18:00' → '8:00 - 18:00'
export function formatTime(time) {
  const parts = String(time).split(/[~\-–]/).map(t => t.trim().replace(/^0(\d)/, '$1')).filter(Boolean);
  return parts.length === 2 ? parts.join(' - ') : DEFAULT_TIME;
}

// 섹터별 후보 일정과 기본 문구를 만듭니다.
// 그달 일정이 없으면 다음달 첫 일정, 그것도 없으면 이전달 마지막 일정을 씁니다.
export function buildDefaults(branch, events, year, month) {
  const current = monthId(year, month), next = monthId(year, month + 1), prev = monthId(year, month - 1);
  const candidates = {}, sources = {}, values = {};
  for (const slot of BRANCHES[branch].slots) candidates[slot.sector] = [];
  for (const event of events) {
    for (const sector of sectorsOf(event.sector)) candidates[sector]?.push(event);
  }
  for (const [sector, list] of Object.entries(candidates)) {
    const inMonth = id => list.filter(e => e.start.startsWith(id));
    const pick = inMonth(current)[0] ?? inMonth(next)[0] ?? inMonth(prev).at(-1);
    values[sector] = pick ? formatRange(pick.start, pick.end) : '';
    sources[sector] = !pick ? 'none' : pick.start.startsWith(current) ? 'current' : pick.start.startsWith(next) ? 'next' : 'prev';
  }
  const inCurrent = events.filter(e => e.start.startsWith(current));
  const first = [...inCurrent, ...events].find(e => sectorsOf(e.sector).some(s => s in candidates));
  const setting = first?.note?.trim() || DEFAULT_SETTING[branch];
  const time = first ? formatTime(first.time) : DEFAULT_TIME;
  values.line1 = `전 섹터 ${setting}  ${time}`;
  values.line2 = setting.includes('클로즈') ? FOOTER_NOTE.close : FOOTER_NOTE.open;
  return {values, candidates, sources};
}

// PNG에 dpi 정보(pHYs)를 넣습니다.
function crc32(bytes) {
  let crc = 0xffffffff;
  for (const b of bytes) { crc ^= b; for (let j = 0; j < 8; j++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0); }
  return (crc ^ 0xffffffff) >>> 0;
}
export function withDpi(bytes, dpi) {
  const chunk = new Uint8Array(21), v = new DataView(chunk.buffer);
  v.setUint32(0, 9); chunk.set([112, 72, 89, 115], 4);
  v.setUint32(8, Math.round(dpi / 0.0254)); v.setUint32(12, Math.round(dpi / 0.0254)); chunk[16] = 1;
  v.setUint32(17, crc32(chunk.subarray(4, 17)));
  const parts = [bytes.subarray(0, 33), chunk];
  for (let pos = 33; pos < bytes.length;) {
    const length = new DataView(bytes.buffer, bytes.byteOffset + pos, 4).getUint32(0) + 12;
    if (String.fromCharCode(...bytes.subarray(pos + 4, pos + 8)) !== 'pHYs') parts.push(bytes.subarray(pos, pos + length));
    pos += length;
  }
  const result = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let offset = 0;
  for (const p of parts) { result.set(p, offset); offset += p.length; }
  return result;
}
