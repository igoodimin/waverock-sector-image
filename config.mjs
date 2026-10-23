// 세팅 달력과 같은 Supabase 프로젝트. 공개용 Publishable key만 사용합니다(읽기 전용으로만 씁니다).
export const SUPABASE_URL = 'https://ihwogqxnxsvydatxzdyn.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_4mOcQLpNgrBkXGUWPEWxoA_r_DRaQq8';

// 출력 크기: 1080 × 1350 디자인의 2배
export const WIDTH = 2160, HEIGHT = 2700, DPI = 150;

// 글자 스타일 (2160px 기준). 완성본에서 측정한 값입니다.
export const STYLE = {
  date:  { weight: 600, size: 70,ref: '1/12(월) ~ 1/13(화)', box: [804, 180] },
  line1: { weight: 700, size: 86.4, ref: '전 섹터 오픈 세팅  8:00 - 18:00', box: [1500, 110] },
  line2: { weight: 400, size: 69, ref: '세팅 외 섹터는 자유롭게 이용 가능합니다', box: [1500, 90] },
};

// 좌표는 글자 묶음의 가운데 위치 (2160 × 2700 기준)
export const BRANCHES = {
  '남천점': {
    code: 'nam', bg: 'assets/bg-nam.jpg',
    slots: [
      { sector: '레드', x: 1625, y: 824 },
      { sector: '화이트', x: 1625, y: 1218 },
      { sector: '브라운1', x: 1625, y: 1613 },
      { sector: '브라운2', x: 1625, y: 2008 },
    ],
  },
  '서면점': {
    code: 'seo', bg: 'assets/bg-seo.jpg',
    slots: [
      { sector: '해피', x: 536, y: 922 },
      { sector: '미드나잇', x: 536, y: 1316 },
      { sector: '락랜드', x: 536, y: 1710 },
      { sector: '캐슬', x: 536, y: 2103 },
    ],
  },
  '부산대점': {
    code: 'bus', bg: 'assets/bg-bus.jpg',
    slots: [
      { sector: '버터밀크', x: 1676, y: 738 },
      { sector: '아이스버그', x: 512, y: 2175 },
      { sector: '비숍', x: 1357, y: 2175 },
    ],
  },
};
export const FOOTER = { line1: { x: 1080, y: 2430 }, line2: { x: 1080, y: 2537 } };

export const FOOTER_NOTE = {
  open: '세팅 외 섹터는 자유롭게 이용 가능합니다',
  close: '세팅시간 동안 센터를 이용하실 수 없습니다.',
};
export const DEFAULT_SETTING = { '남천점': '오픈 세팅', '서면점': '오픈 세팅', '부산대점': '클로즈 세팅' };
export const DEFAULT_TIME = '8:00 - 18:00';
