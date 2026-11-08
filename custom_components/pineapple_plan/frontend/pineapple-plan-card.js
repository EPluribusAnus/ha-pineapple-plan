/*
 * Pineapple Plan card for Home Assistant.
 * Plain web component (no build step). Talks to the pineapple_plan integration
 * over the websocket API.
 */

const PP_VERSION = '0.1.0';

/* ---------------------------------------------------------------- theme */

const THEMES = {
  light: {
    bg: '#F1F4EF', sf: '#FFFFFF', sk: '#F5F7F3', skb: '#EBEFE9', ln: '#E0E5DE', ln2: '#D5DCD4',
    ink: '#17201B', mu: '#56615A', fa: '#6B756E', ac: '#1F6A4A', aci: '#FFFFFF', acs: '#EAF4EE',
    dnb: '#FFF8E8', dnd: '#F2E3BC', dni: '#5E5132', gpb: '#FFF4D6', gpd: '#D9A21B', gpi: '#7A5200',
    tkb: '#FFFFFF', tkd: '#DDE3DC', inp: '#F8FAF7', sel: '#EEF3EE', tgo: '#BFC9C1',
    scr: 'rgba(23,32,27,0.4)', mlb: '#E2F0E8', mlf: '#17573C', tob: '#FCE7D8', tof: '#8A3A0E',
    otb: '#ECE9F8', otf: '#4B3592', hm: '#17573C', of: '#2A4F9E', dg: '#A0331F', dgb: '#E8C9C3',
    cs: 'light',
  },
  dark: {
    bg: '#101512', sf: '#192019', sk: '#212923', skb: '#29322C', ln: '#2D3730', ln2: '#3A463E',
    ink: '#E8EEE9', mu: '#A4AFA7', fa: '#8D988F', ac: '#5BBF8E', aci: '#0B1A12', acs: '#1C3327',
    dnb: '#2A2415', dnd: '#463C21', dni: '#E5D5A9', gpb: '#382C0F', gpd: '#C9971F', gpi: '#F3D27C',
    tkb: '#232B25', tkd: '#333E36', inp: '#141A16', sel: '#26342B', tgo: '#4A564D',
    scr: 'rgba(0,0,0,0.6)', mlb: '#1D3A2B', mlf: '#9EDFBD', tob: '#3D2617', tof: '#F3B48B',
    otb: '#2B2644', otf: '#C7BAF6', hm: '#8FD9B2', of: '#A2BDF4', dg: '#F29C8A', dgb: '#5A2E26',
    cs: 'dark',
  },
};

const themeVars = (t) =>
  Object.keys(t).filter((k) => k !== 'cs').map((k) => `--pp-${k}:${t[k]}`).join(';') + `;color-scheme:${t.cs}`;

/* ---------------------------------------------------------------- helpers */

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const attrJson = (v) => esc(JSON.stringify(v));
const pad = (n) => String(n).padStart(2, '0');
const isoOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseIso = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (s, n) => { const d = parseIso(s); d.setDate(d.getDate() + n); return isoOf(d); };
const todayIso = () => isoOf(new Date());
const weekStartOf = (s, ws) => {
  const d = parseIso(s);
  const startDow = ws === 'mon' ? 1 : 0;
  d.setDate(d.getDate() - ((d.getDay() - startDow + 7) % 7));
  return isoOf(d);
};
const initials = (name) => (String(name || '?').trim().split(/\s+/).map((p) => p[0]).join('').slice(0, 2) || '?').toUpperCase();
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

const ICON = {
  left: '<path d="M15 18l-6-6 6-6"/>',
  right: '<path d="M9 18l6-6-6-6"/>',
  down: '<path d="M6 9l6 6 6-6"/>',
  close: '<path d="M18 6L6 18M6 6l12 12"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  collapse: '<path d="M11 17l-5-5 5-5M18 17l-5-5 5-5"/>',
  inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
  home: '<path d="M3 10.5L12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
  office: '<rect x="4" y="3" width="16" height="18" rx="1"/><path d="M9 7h1M14 7h1M9 11h1M14 11h1M9 15h1M14 15h1"/>',
  fork: '<path d="M7 2v8a2 2 0 0 0 2 2v10M11 2v6a2 2 0 0 1-2 2M17 22V2c-2 1-3 4-3 8h3"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  tasks: '<path d="M9 11l3 3 8-8"/><path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
};
const icon = (name, size = 18, sw = 2) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[name]}</svg>`;
const GRIP = '<svg class="grip" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="9" cy="6" r="1.8"/><circle cx="15" cy="6" r="1.8"/><circle cx="9" cy="12" r="1.8"/><circle cx="15" cy="12" r="1.8"/><circle cx="9" cy="18" r="1.8"/><circle cx="15" cy="18" r="1.8"/></svg>';
const LOGO = '<svg width="36" height="36" viewBox="0 0 40 40" aria-hidden="true" style="flex:none"><path d="M20 3c-2 3-2 6 0 9 2-3 2-6 0-9Z" fill="#2E7D55"/><path d="M20 12c-4-4-9-5-12-4 2 3 6 5 12 4Z" fill="#1F6A4A"/><path d="M20 12c4-4 9-5 12-4-2 3-6 5-12 4Z" fill="#1F6A4A"/><ellipse cx="20" cy="25" rx="10" ry="12" fill="#F5B92E"/><path d="M12 19l16 12M28 19L12 31M11 25l9 7M29 25l-9 7M14 15l12 9M26 15l-12 9" stroke="#C98A12" stroke-width="1.2" fill="none" stroke-linecap="round"/></svg>';

/* ---------------------------------------------------------------- styles */

const FONT_LINK = 'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700&family=Inter:wght@400;500;600;700&display=swap';

const BASE_CSS = `
*{box-sizing:border-box}
button{font:inherit;color:inherit}
.pp,.portal{font-family:var(--pp-font);color:var(--pp-ink);-webkit-font-smoothing:antialiased}
.disp{font-family:var(--pp-display)}
.av{flex:none;border-radius:999px;color:#fff;font-weight:700;display:inline-flex;align-items:center;justify-content:center;overflow:hidden;object-fit:cover;line-height:1}
.av.sq{border-radius:28%}
.lbl{font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--pp-mu)}
.ib{appearance:none;border:0;background:transparent;width:36px;height:36px;border-radius:9px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;color:var(--pp-ink);padding:0}
.ib.box{width:44px;height:44px;border:1px solid var(--pp-ln);background:var(--pp-sf);border-radius:12px}
.ib.soft{width:40px;height:40px;background:var(--pp-sk);border-radius:12px}
.ib:disabled{opacity:.35;cursor:default}
.ib:focus-visible,.sec:focus-visible,.chip:focus-visible,.opt:focus-visible,.seg:focus-visible,.tt:focus-visible,.chk:focus-visible,.btn:focus-visible,.gap:focus-visible{outline:2px solid var(--pp-ac);outline-offset:2px}
.btn{appearance:none;border:0;height:48px;padding:0 22px;border-radius:12px;cursor:pointer;font-size:15px;font-weight:600;background:var(--pp-ac);color:var(--pp-aci)}
.btn.ghost{background:var(--pp-sf);color:var(--pp-ink);border:1px solid var(--pp-ln)}
.btn.danger{background:var(--pp-sf);color:var(--pp-dg);border:1px solid var(--pp-dgb)}
.inp{font:inherit;font-size:15px;height:46px;width:100%;padding:0 14px;border:1px solid var(--pp-ln2);border-radius:12px;background:var(--pp-inp);color:var(--pp-ink)}
.inp:focus{outline:2px solid var(--pp-ac);outline-offset:-1px}
.badge{font-size:12px;font-weight:700;color:var(--pp-aci);background:var(--pp-ac);border-radius:999px;padding:2px 8px}
.gapchip{height:22px;padding:0 8px;border-radius:999px;border:1.5px dashed var(--pp-gpd);color:var(--pp-gpi);background:var(--pp-gpb);font-size:11px;font-weight:700;display:inline-flex;align-items:center;white-space:nowrap}
.task{display:flex;align-items:center;gap:2px;min-height:42px;padding:3px 8px 3px 2px;background:var(--pp-tkb);border:1px solid var(--pp-tkd);border-radius:10px;cursor:grab}
.task.dragging{opacity:.45}
.chk{appearance:none;flex:none;width:36px;height:36px;padding:0;border:0;background:transparent;border-radius:9px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center}
.ring{width:19px;height:19px;border-radius:999px;border:2px solid var(--pp-ln2);display:inline-flex;align-items:center;justify-content:center;color:var(--pp-aci)}
.task.done .ring{background:var(--pp-ac);border-color:var(--pp-ac)}
.tt{appearance:none;flex:1;min-width:0;text-align:left;border:0;background:transparent;padding:6px 2px;cursor:pointer;color:var(--pp-ink);font-size:13px;font-weight:500;line-height:1.3;overflow-wrap:anywhere}
.task.done .tt{color:var(--pp-fa);text-decoration:line-through}
.grip{flex:none;color:var(--pp-fa);margin-left:6px}
.empty{display:block;padding:10px;text-align:center;font-size:12px;color:var(--pp-fa);border:1.5px dashed var(--pp-ln2);border-radius:10px}
`;

const CARD_CSS = `
:host{display:block}
.pp{background:var(--pp-bg);border-radius:var(--ha-card-border-radius,16px);overflow:hidden;display:flex;flex-direction:column;position:relative}
.hdr{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:18px 20px 14px}
.n1 .hdr{padding:12px 14px 8px}
.brand{display:flex;align-items:center;gap:12px;min-width:0}
.brand-t{font-size:21px;font-weight:700;letter-spacing:-.01em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.brand-s{font-size:13px;color:var(--pp-mu);font-weight:500;white-space:nowrap}
.hdr-r{display:flex;align-items:center;gap:10px;flex:none}
.wknav{display:flex;align-items:center;gap:4px;background:var(--pp-sf);border:1px solid var(--pp-ln);border-radius:12px;padding:3px}
.txtbtn{appearance:none;border:0;background:var(--pp-sk);height:36px;padding:0 12px;border-radius:9px;cursor:pointer;font-size:13px;font-weight:600}
.txtbtn:disabled{opacity:.5;cursor:default}
.chip{appearance:none;display:inline-flex;align-items:center;gap:8px;height:42px;padding:0 10px 0 6px;border:1px solid var(--pp-ln);background:var(--pp-sf);border-radius:999px;cursor:pointer}
.chip-l{font-size:13px;font-weight:600;white-space:nowrap}
.n1 .chip-l{display:none}
.chip-ic{width:30px;height:30px;border-radius:999px;background:var(--pp-acs);color:var(--pp-ac);display:inline-flex;align-items:center;justify-content:center}
.gapcount{font-size:12px;font-weight:700;color:var(--pp-gpi);background:var(--pp-gpb);border:1px dashed var(--pp-gpd);border-radius:999px;padding:1px 7px}
.daynav{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:0 20px 12px}
.n1 .daynav{padding:4px 14px 10px}
.daynav-c{appearance:none;border:0;background:transparent;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:6px;padding:4px 8px;border-radius:10px}
.daynav-t{font-size:19px;font-weight:700}
.dots{display:flex;gap:5px}
.dot{width:6px;height:6px;border-radius:999px;background:var(--pp-ln2);transition:width .15s}
.dot.on{width:16px;background:var(--pp-ac)}
.body{display:flex;gap:14px;padding:0 20px 20px;min-height:0}
.n1 .body{padding:0 14px}
.rail{flex:0 0 56px;border:1.5px solid var(--pp-ln);background:var(--pp-sf);border-radius:18px;display:flex;flex-direction:column;align-items:center;gap:14px;padding:6px 0;align-self:stretch}
.rail.over,.inbox.over{background:var(--pp-acs);border-color:var(--pp-ac)}
.rail-btn{appearance:none;position:relative;width:44px;height:44px;border:0;background:var(--pp-sk);border-radius:12px;cursor:pointer;color:var(--pp-ac);display:inline-flex;align-items:center;justify-content:center}
.rail-n{position:absolute;top:-4px;right:-4px;min-width:20px;height:20px;padding:0 5px;border-radius:999px;background:var(--pp-ac);color:var(--pp-aci);font-size:11px;font-weight:700;display:inline-flex;align-items:center;justify-content:center;border:2px solid var(--pp-sf)}
.rail-t{appearance:none;border:0;background:transparent;padding:0;cursor:pointer;writing-mode:vertical-rl;transform:rotate(180deg);font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--pp-mu)}
.inbox{flex:0 0 300px;border:1.5px solid var(--pp-ln);background:var(--pp-sf);border-radius:18px;display:flex;flex-direction:column;gap:12px;padding:14px;min-height:0;align-self:stretch}
.n3 .inbox,.n5 .inbox{flex-basis:272px}
.strip{flex:1;min-width:0;display:flex;gap:12px;overflow-x:auto;overflow-y:hidden;scroll-snap-type:x mandatory;scrollbar-width:none;overscroll-behavior-x:contain;align-items:stretch}
.strip::-webkit-scrollbar{display:none}
.col{flex:0 0 calc((100% - (var(--n) - 1) * 12px) / var(--n));min-width:0;scroll-snap-align:start;background:var(--pp-sf);border:1.5px solid var(--pp-ln);border-radius:18px;padding:12px;display:flex;flex-direction:column;gap:10px;overflow-y:auto;scrollbar-width:thin}
.col.over{background:var(--pp-acs);border-color:var(--pp-ac)}
.col.past{opacity:.72}
.dh{display:flex;align-items:center;justify-content:space-between;gap:6px;padding:2px 2px 0}
.dh-n{font-size:26px;font-weight:700;line-height:1}
.dh-d{font-size:13px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--pp-mu);margin-left:7px}
.pill{font-size:11px;font-weight:700;border-radius:999px;padding:3px 8px;white-space:nowrap}
.pill.today{color:var(--pp-aci);background:var(--pp-ac)}
.pill.tom{color:var(--pp-ac);background:var(--pp-acs)}
.pill.we{color:var(--pp-otf);background:var(--pp-otb)}
.sec{appearance:none;text-align:left;width:100%;display:flex;flex-direction:column;gap:8px;padding:10px;background:var(--pp-sk);border:1px solid var(--pp-skb);border-radius:12px;cursor:pointer}
.sec:hover{border-color:var(--pp-ln2)}
.sec.dn{background:var(--pp-dnb);border-color:var(--pp-dnd)}
.sec.dn .lbl{color:var(--pp-dni);display:flex;align-items:center;gap:6px}
.row{display:flex;align-items:center;gap:8px;min-height:22px}
.row.sb{justify-content:space-between}
.t13{font-size:13px;font-weight:500}
.off{color:var(--pp-fa)}
.loc{display:inline-flex;align-items:center;gap:4px;font-size:12px}
.loc.home{color:var(--pp-hm)}
.loc.office{color:var(--pp-of)}
.kid{display:flex;flex-direction:column;gap:6px}
.slots{display:flex;flex-wrap:wrap;gap:6px 12px;padding-left:30px}
.slot{display:inline-flex;align-items:center;gap:6px;font-size:12px;color:var(--pp-mu)}
.who{display:inline-flex;align-items:center;gap:6px}
.who-n{font-size:13px;font-weight:500;color:var(--pp-ink)}
.meal{font-size:14px;font-weight:600;line-height:1.3}
.tag{font-size:11px;font-weight:700;border-radius:999px;padding:3px 8px}
.tag.mealie{background:var(--pp-mlb);color:var(--pp-mlf)}
.tag.takeout{background:var(--pp-tob);color:var(--pp-tof)}
.tag.other{background:var(--pp-otb);color:var(--pp-otf)}
.plan-dn{display:inline-flex;align-items:center;gap:6px;font-size:13px;font-weight:600;color:var(--pp-gpi)}
.tasks{display:flex;flex-direction:column;gap:6px;padding:4px 2px 2px}
.ib-add{appearance:none;border:0;background:var(--pp-ac);color:var(--pp-aci);width:44px;height:44px;border-radius:12px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;flex:none}
.inb-h{display:flex;align-items:center;justify-content:space-between;gap:8px}
.inb-ht{display:flex;align-items:center;gap:8px;color:var(--pp-ac)}
.inb-ht h2{margin:0;font-size:18px;font-weight:700;color:var(--pp-ink)}
.inb-sub{margin:0;font-size:13px;line-height:1.45;color:var(--pp-mu)}
.inb-add{display:flex;gap:8px}
.inb-add .inp{height:44px;font-size:14px}
.inb-list{flex:1;min-height:0;overflow-y:auto;display:flex;flex-direction:column;gap:8px;padding:2px}
.inb-list .task{min-height:46px}
.inb-list .tt{font-size:14px}
.foot{padding:10px 14px 14px}
.tasksbtn{appearance:none;width:100%;height:52px;border:0;background:var(--pp-ac);border-radius:14px;cursor:pointer;color:var(--pp-aci);display:inline-flex;align-items:center;justify-content:center;gap:10px;font-size:15px;font-weight:600}
.tasksbtn .cnt{font-size:12px;font-weight:700;color:var(--pp-ac);background:var(--pp-aci);border-radius:999px;padding:2px 8px}
.msg{padding:32px 20px;text-align:center;color:var(--pp-mu);font-size:15px;line-height:1.5}
.msg strong{display:block;color:var(--pp-ink);font-size:17px;margin-bottom:6px}
`;

const PORTAL_CSS = `
.portal{position:fixed;inset:0;z-index:9;display:block}
.scrim{position:absolute;inset:0;border:0;padding:0;background:var(--pp-scr);cursor:default;width:100%}
.sheet{position:absolute;background:var(--pp-sf);box-shadow:0 24px 64px rgba(0,0,0,.3);display:flex;flex-direction:column;overflow:hidden}
.sheet.center{top:48px;left:50%;width:min(560px,calc(100vw - 32px));transform:translateX(-50%);max-height:calc(100vh - 96px);border-radius:20px}
.sheet.center.narrow{width:min(400px,calc(100vw - 32px))}
.sheet.bottom{left:0;right:0;bottom:0;max-height:92vh;border-radius:22px 22px 0 0;padding-bottom:env(safe-area-inset-bottom)}
.sheet.bottom.tall{height:78vh}
.sh-h{display:flex;align-items:center;gap:8px;padding:16px 16px 12px 20px}
.sh-ht{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
.sh-k{font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--pp-mu)}
.sh-h h2{margin:0;font-size:22px;font-weight:700;overflow-wrap:anywhere}
.sh-b{flex:1;min-height:0;overflow-y:auto;padding:0 20px 8px}
.sh-f{display:flex;align-items:center;gap:10px;padding:12px 20px 18px;border-top:1px solid var(--pp-ln)}
.sh-f .note{flex:1;font-size:12px;color:var(--pp-mu)}
.esec{display:flex;flex-direction:column;gap:14px;padding:16px 0 18px;border-top:1px solid var(--pp-ln)}
.esec-h{display:flex;align-items:center;gap:10px}
.esec-h h3{margin:0;font-size:17px;font-weight:700}
.field{display:flex;flex-direction:column;gap:8px}
.flabel{font-size:13px;font-weight:600;color:var(--pp-mu)}
.trow{display:flex;align-items:center;justify-content:space-between;gap:12px}
.trow-l{display:inline-flex;align-items:center;gap:10px;font-size:15px;font-weight:600}
.tog{appearance:none;display:inline-flex;align-items:center;gap:10px;background:none;border:0;padding:0;min-height:44px;cursor:pointer}
.tog-t{font-size:14px;font-weight:500;color:var(--pp-mu)}
.track{position:relative;display:inline-block;width:46px;height:26px;border-radius:999px;background:var(--pp-tgo);transition:background .15s}
.knob{position:absolute;top:3px;left:3px;width:20px;height:20px;border-radius:999px;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.25);transition:transform .15s}
.tog[aria-pressed="true"] .track{background:var(--pp-ac)}
.tog[aria-pressed="true"] .knob{transform:translateX(20px)}
.tog:focus-visible .track{outline:2px solid var(--pp-ac);outline-offset:2px}
.opts{display:flex;flex-wrap:wrap;gap:8px}
.opt{appearance:none;display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:0 14px 0 8px;border:1.5px solid var(--pp-tkd);background:var(--pp-sf);border-radius:999px;cursor:pointer;font-size:14px;font-weight:500}
.opt[aria-pressed="true"]{border-color:var(--pp-ink);background:var(--pp-sel)}
.opt .none{flex:none;width:26px;height:26px;border-radius:999px;border:1.5px dashed var(--pp-fa)}
.seg{appearance:none;min-height:44px;padding:0 16px;border:1.5px solid var(--pp-tkd);background:var(--pp-sf);color:var(--pp-ink);border-radius:12px;cursor:pointer;font-size:14px;font-weight:600}
.seg[aria-pressed="true"]{background:var(--pp-ink);color:var(--pp-sf);border-color:var(--pp-ink)}
.seg:disabled{opacity:.4;cursor:not-allowed}
.hint{font-size:13px;color:var(--pp-dni);background:var(--pp-dnb);border:1px solid var(--pp-dnd);border-radius:10px;padding:8px 12px}
.search{position:relative}
.search svg{position:absolute;left:12px;top:14px;color:var(--pp-fa)}
.search .inp{padding-left:38px}
.stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
.stat{background:var(--pp-sk);border-radius:12px;padding:10px;display:flex;flex-direction:column;gap:2px}
.stat b{font-size:24px;font-weight:700;line-height:1.1}
.stat span{font-size:12px;color:var(--pp-mu);line-height:1.3}
.gaps{display:flex;flex-direction:column;gap:6px}
.gap{appearance:none;display:flex;align-items:center;gap:10px;width:100%;min-height:44px;padding:0 12px;text-align:left;border:1px dashed var(--pp-gpd);background:var(--pp-gpb);color:var(--pp-gpi);border-radius:12px;cursor:pointer;font-size:14px;font-weight:600}
.gap-d{flex:none;min-width:48px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.04em}
.gap-l{flex:1}
.ok{font-size:14px;color:var(--pp-ac);font-weight:600}
.prow{display:flex;align-items:center;gap:12px;padding:8px 0}
.prow-n{font-size:15px;font-weight:600}
.prow-s{font-size:13px;color:var(--pp-mu)}
.sumb{display:flex;flex-direction:column;gap:16px;padding:4px 20px 20px;overflow-y:auto}
.inbox-sheet{display:flex;flex-direction:column;gap:12px;padding:0 16px 16px;flex:1;min-height:0}
`;

/* ---------------------------------------------------------------- card */

class PineapplePlanCard extends HTMLElement {
  static getStubConfig() {
    return {};
  }

  constructor() {
    super();
    this._config = {};
    this._cfg = null;
    this._days = [];
    this._tasks = [];
    this._weekStart = null;
    this._n = 7;
    this._vis = 0;
    this._ui = { edit: null, taskEdit: null, inboxOpen: false, summaryOpen: false };
    this._railOpen = false;
    try { this._railOpen = localStorage.getItem('pineapple-plan-rail') === 'open'; } catch (_) { /* private mode */ }
    this._draft = '';
    this._recipes = { query: '', list: [], loading: false, available: true };
    this._dragId = null;
    this._pendingScroll = null;
  }

  setConfig(config) {
    this._config = { summary: 'auto', fonts: true, ...(config || {}) };
    if (!['auto', 'household', 'hidden'].includes(this._config.summary)) this._config.summary = 'auto';
    this._render();
  }

  set hass(hass) {
    const first = !this._hass;
    const prevDark = this._dark;
    this._hass = hass;
    this._dark = this._config.theme === 'dark' || (this._config.theme !== 'light' && !!hass.themes?.darkMode);
    if (first) {
      this._init();
    } else if (prevDark !== this._dark) {
      this._render();
    }
  }

  getCardSize() {
    return 12;
  }

  getGridOptions() {
    return { columns: 'full', min_columns: 6 };
  }

  connectedCallback() {
    if (!this.shadowRoot) this._build();
    if (!this._ro) {
      this._ro = new ResizeObserver((entries) => {
        const w = entries[0].contentRect.width;
        const n = w < 640 ? 1 : w < 1100 ? 3 : w < 1380 ? 5 : 7;
        if (n !== this._n) {
          this._n = n;
          this._vis = Math.min(this._vis, 7 - n);
          this._pendingScroll = this._vis;
          this._render();
        }
      });
    }
    this._ro.observe(this);
    if (this._hass && !this._unsub && this._cfg) this._subscribe();
    this._renderPortal();
  }

  disconnectedCallback() {
    if (this._ro) this._ro.disconnect();
    if (this._unsub) { this._unsub.then((u) => u && u()).catch(() => {}); this._unsub = null; }
    if (this._portalHost) this._portalHost.remove();
  }

  /* ------------------------------------------------------------ setup */

  _build() {
    const root = this.attachShadow({ mode: 'open' });
    root.innerHTML = `<style>${BASE_CSS}${CARD_CSS}</style><div class="pp"></div>`;
    this._root = root.querySelector('.pp');
    this._wireEvents(root);

    this._portalHost = document.createElement('div');
    this._portalHost.setAttribute('data-pineapple-plan', '');
    const pr = this._portalHost.attachShadow({ mode: 'open' });
    pr.innerHTML = `<style>${BASE_CSS}${PORTAL_CSS}</style><div class="portal" hidden></div>`;
    this._portal = pr.querySelector('.portal');
    this._wireEvents(pr);
    this._portalKeydown = (e) => { if (e.key === 'Escape') this._closeOverlay(); };
    pr.addEventListener('keydown', this._portalKeydown);
  }

  async _init() {
    if (!this.shadowRoot) this._build();
    if (this._config.fonts !== false && !document.querySelector('link[data-pineapple-plan-fonts]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = FONT_LINK;
      link.setAttribute('data-pineapple-plan-fonts', '');
      document.head.appendChild(link);
    }
    this._render();
    try {
      this._cfg = await this._ws('config');
      this._weekStart = weekStartOf(todayIso(), this._cfg.week_start);
      await this._loadWeek(true);
      this._subscribe();
    } catch (err) {
      this._error = err;
      this._render();
    }
  }

  _subscribe() {
    this._unsub = this._hass.connection
      .subscribeMessage(() => this._queueReload(), { type: 'pineapple_plan/subscribe' })
      .catch(() => null);
  }

  _ws(type, data = {}) {
    return this._hass.callWS({ type: `pineapple_plan/${type}`, ...data });
  }

  async _loadWeek(scrollToToday = false) {
    const res = await this._ws('week', { start: this._weekStart });
    this._days = res.days;
    this._tasks = res.tasks;
    this._error = null;
    if (scrollToToday) {
      const idx = this._days.findIndex((d) => d.date === todayIso());
      this._vis = Math.max(0, Math.min(idx < 0 ? 0 : idx, 7 - this._n));
      this._pendingScroll = this._vis;
    }
    this._render();
  }

  _queueReload() {
    clearTimeout(this._reloadTimer);
    this._reloadTimer = setTimeout(async () => {
      try {
        this._cfg = await this._ws('config');
        await this._loadWeek();
      } catch (err) {
        this._error = err;
        this._render();
      }
    }, 150);
  }

  async _changeWeek(delta, scrollTo = null) {
    this._weekStart = delta === 0 ? weekStartOf(todayIso(), this._cfg.week_start) : addDays(this._weekStart, delta * 7);
    this._ui.edit = null;
    if (delta === 0) {
      await this._loadWeek(true);
    } else {
      this._vis = scrollTo == null ? 0 : scrollTo;
      this._pendingScroll = this._vis;
      await this._loadWeek();
    }
  }

  /* ------------------------------------------------------------ people */

  _person(key) {
    if (!key || !this._cfg) return null;
    const m = this._cfg.members[key];
    if (m) return m;
    return this._cfg.helpers.find((h) => h.key === key) || null;
  }

  _me() {
    if (!this._cfg || this._config.summary === 'household') return null;
    const uid = this._hass?.user?.id;
    return Object.values(this._cfg.members).find((m) => m.user_id && m.user_id === uid) || null;
  }

  _drivers() {
    return ['adult1', 'adult2', ...this._cfg.helpers.map((h) => h.key)];
  }

  _everyone() {
    return ['adult1', 'adult2', 'child1', 'child2', ...this._cfg.helpers.map((h) => h.key)];
  }

  _av(key, size = 22, sq = false) {
    const p = this._person(key);
    if (!p) return '';
    const st = `width:${size}px;height:${size}px;font-size:${Math.round(size * 0.45)}px`;
    if (p.picture) return `<img class="av${sq ? ' sq' : ''}" src="${esc(p.picture)}" alt="" title="${esc(p.name)}" style="${st}">`;
    return `<span class="av${sq ? ' sq' : ''}" title="${esc(p.name)}" style="${st};background:${esc(p.color)}">${esc(initials(p.name))}</span>`;
  }

  _who(key) {
    const p = this._person(key);
    if (!p) return '<span class="gapchip">Who?</span>';
    const name = this._n <= 3 ? `<span class="who-n">${esc(p.name)}</span>` : '';
    return `<span class="who">${this._av(key)}${name}</span>`;
  }

  _name(key) {
    return this._person(key)?.name || '';
  }

  /* ------------------------------------------------------------ derived */

  _mealText(d) {
    if (d.dinner_type === 'mealie') return d.dinner_meal || (this._cfg.mealie ? 'Pick a recipe' : 'Home-cooked');
    if (d.dinner_type === 'takeout') return d.dinner_note ? `${d.dinner_note} takeout` : 'Takeout';
    if (d.dinner_type === 'other') return d.dinner_note || 'Something else';
    return '';
  }

  _cooks(d) {
    if (d.dinner_type === 'takeout') return [];
    if (d.dinner_cook === 'both') return ['adult1', 'adult2'];
    if (d.dinner_cook === 'adult1' || d.dinner_cook === 'adult2') return [d.dinner_cook];
    return [];
  }

  _gaps() {
    const c1 = this._name('child1');
    const c2 = this._name('child2');
    const out = [];
    this._days.forEach((d, i) => {
      const add = (label) => out.push({ i, day: `${this._dow(d.date)} ${parseIso(d.date).getDate()}`, label });
      if (d.child1_school) { if (!d.child1_drop) add(`${c1}’s drop-off`); if (!d.child1_pick) add(`${c1}’s pick-up`); }
      if (d.child2_daycare) { if (!d.child2_drop) add(`${c2}’s drop-off`); if (!d.child2_pick) add(`${c2}’s pick-up`); }
      if (d.jj && !d.jj_who) add(`${c1} to jiu jitsu`);
      if (d.swim && !d.swim_who) add(`${c1} to swimming`);
      if (!d.dinner_type) add('Dinner isn’t planned');
    });
    return out;
  }

  _loadFor(key) {
    let runs = 0;
    let trips = 0;
    let dinners = 0;
    this._days.forEach((d) => {
      if (d.child1_school) runs += (d.child1_drop === key) + (d.child1_pick === key);
      if (d.child2_daycare) runs += (d.child2_drop === key) + (d.child2_pick === key);
      if (d.jj && d.jj_who === key) trips += 1;
      if (d.swim && d.swim_who === key) trips += 1;
      if (this._cooks(d).includes(key)) dinners += 1;
    });
    const tasks = this._tasks.filter((t) => t.who === key && !t.done).length;
    return { runs, trips, dinners, tasks };
  }

  _dow(iso, long = false) {
    return parseIso(iso).toLocaleDateString(this._hass?.locale?.language, { weekday: long ? 'long' : 'short' });
  }

  _weekLabel() {
    const s = parseIso(this._weekStart);
    const e = parseIso(addDays(this._weekStart, 6));
    const lang = this._hass?.locale?.language;
    const m = (d) => d.toLocaleDateString(lang, { month: 'short' });
    return s.getMonth() === e.getMonth()
      ? `Week of ${m(s)} ${s.getDate()} – ${e.getDate()}`
      : `Week of ${m(s)} ${s.getDate()} – ${m(e)} ${e.getDate()}`;
  }

  _longDate(iso) {
    return parseIso(iso).toLocaleDateString(this._hass?.locale?.language, { weekday: 'long', month: 'short', day: 'numeric' });
  }

  /* ------------------------------------------------------------ render: card */

  _render() {
    if (!this._root) return;
    const snap = this._snapshot(this._root);
    const t = THEMES[this._dark ? 'dark' : 'light'];
    const fonts = this._config.fonts === false
      ? '--pp-font:var(--paper-font-body1_-_font-family,inherit);--pp-display:var(--pp-font)'
      : "--pp-font:'Inter',system-ui,sans-serif;--pp-display:'Bricolage Grotesque','Inter',sans-serif";
    this._root.setAttribute('style', `${themeVars(t)};${fonts}`);
    this._root.className = `pp n${this._n}`;
    this._root.innerHTML = this._mainHtml();
    this._restore(this._root, snap);
    if (this._pendingScroll != null) {
      const strip = this._root.querySelector('.strip');
      if (strip) {
        const step = (strip.clientWidth + 12) / this._n;
        strip.scrollLeft = this._pendingScroll * step;
      }
      this._pendingScroll = null;
    }
    this._renderPortal();
  }

  _mainHtml() {
    if (this._error) {
      const code = this._error.code;
      const text = code === 'unknown_command' || code === 'not_configured'
        ? 'Add the Pineapple Plan integration under Settings → Devices &amp; services, then reload this page.'
        : esc(this._error.message || String(this._error));
      return `<div class="msg"><strong>Pineapple Plan isn’t ready</strong>${text}</div>`;
    }
    if (!this._cfg || !this._days.length) return '<div class="msg">Loading the plan…</div>';

    const n = this._n;
    const title = this._config.title || this._cfg.title || 'Pineapple Plan';
    const isThisWeek = this._weekStart === weekStartOf(todayIso(), this._cfg.week_start);
    const gaps = this._gaps();
    const me = this._me();
    const inboxOpenCount = this._tasks.filter((t) => !t.date && !t.done).length;

    let chip = '';
    if (this._config.summary !== 'hidden') {
      const lead = me ? this._av(me.key, 30) : `<span class="chip-ic">${icon('calendar', 16)}</span>`;
      const label = me ? 'Your week' : 'This week';
      chip = `<button type="button" class="chip" data-action="summary" aria-expanded="${this._ui.summaryOpen}" aria-label="${label} summary${gaps.length ? `, ${gaps.length} open` : ''}">
        ${lead}<span class="chip-l">${label}</span>
        ${gaps.length ? `<span class="gapcount">${gaps.length}</span>` : ''}${icon('down', 16)}</button>`;
    }

    const weekNav = n === 7 ? `<div class="wknav">
        <button type="button" class="ib" data-action="week" data-v="-1" aria-label="Previous week">${icon('left')}</button>
        <button type="button" class="txtbtn" data-action="week" data-v="0" ${isThisWeek ? 'disabled' : ''}>This week</button>
        <button type="button" class="ib" data-action="week" data-v="1" aria-label="Next week">${icon('right')}</button>
      </div>` : '';

    const header = `<header class="hdr">
      <div class="brand">${LOGO}<div style="display:flex;flex-direction:column;gap:1px;min-width:0">
        <span class="brand-t disp">${esc(title)}</span><span class="brand-s">${esc(this._weekLabel())}</span></div></div>
      <div class="hdr-r">${weekNav}${chip}</div></header>`;

    const dayNav = n < 7 ? `<div class="daynav">${this._dayNavHtml()}</div>` : '';

    let side = '';
    if (n > 1) {
      side = this._railOpen
        ? `<aside class="inbox" data-drop="inbox" aria-label="Task inbox">${this._inboxHtml(false)}</aside>`
        : `<aside class="rail" data-drop="inbox" aria-label="Task inbox">
            <button type="button" class="rail-btn" data-action="rail" aria-expanded="false" aria-label="Open task inbox, ${inboxOpenCount} open">${icon('inbox', 20)}<span class="rail-n">${inboxOpenCount}</span></button>
            <button type="button" class="rail-t" data-action="rail" tabindex="-1" aria-hidden="true">Task inbox</button></aside>`;
    }

    const height = this._config.height ? `max-height:${esc(this._config.height)};` : '';
    const strip = `<div class="strip" style="--n:${n}">${this._days.map((d, i) => this._dayHtml(d, i, height)).join('')}</div>`;

    const foot = n === 1 ? `<div class="foot"><button type="button" class="tasksbtn" data-action="inbox-open">${icon('tasks', 20)}Tasks<span class="cnt">${inboxOpenCount} in inbox</span></button></div>` : '';

    return `${header}${dayNav}<div class="body">${side}${strip}</div>${foot}`;
  }

  _dayNavHtml() {
    const n = this._n;
    const first = this._days[this._vis];
    const last = this._days[Math.min(this._vis + n - 1, 6)];
    if (!first) return '';
    const label = n === 1
      ? this._longDate(first.date)
      : `${this._dow(first.date)} ${parseIso(first.date).getDate()} – ${this._dow(last.date)} ${parseIso(last.date).getDate()}`;
    const dots = this._days.map((_, i) => `<span class="dot${i >= this._vis && i < this._vis + n ? ' on' : ''}"></span>`).join('');
    return `<button type="button" class="ib box" data-action="day" data-v="-1" aria-label="Previous day">${icon('left', 20)}</button>
      <button type="button" class="daynav-c" data-action="week" data-v="0" title="Jump to today"><span class="daynav-t disp">${esc(label)}</span><span class="dots" aria-hidden="true">${dots}</span></button>
      <button type="button" class="ib box" data-action="day" data-v="1" aria-label="Next day">${icon('right', 20)}</button>`;
  }

  _dayHtml(d, i, height) {
    const today = todayIso();
    const c1 = this._cfg.members.child1;
    const c2 = this._cfg.members.child2;
    const dow = parseIso(d.date).getDay();
    const pill = d.date === today ? '<span class="pill today">Today</span>'
      : d.date === addDays(today, 1) ? '<span class="pill tom">Tomorrow</span>'
        : (dow === 0 || dow === 6) ? '<span class="pill we">Weekend</span>' : '';
    const long = this._longDate(d.date);

    const work = (key, works, hours, loc) => `<span class="row">${this._av(key)}
      <span class="t13${works ? '' : ' off'}">${works ? esc(hours || 'Working') : 'Off'}</span>
      ${works && loc ? `<span class="loc ${loc}" title="${loc === 'home' ? 'Working from home' : 'In the office'}">${icon(loc, 14)}${loc === 'home' ? 'Home' : 'Office'}</span>` : ''}</span>`;

    const kid = (m, on, onLabel, offLabel, drop, pick) => `<span class="kid">
      <span class="row">${this._av(m.key, 22, true)}<span class="t13" style="font-weight:600">${esc(m.name)}</span>
        <span class="t13${on ? '' : ' off'}" style="font-weight:400">${on ? onLabel : offLabel}</span></span>
      ${on ? `<span class="slots"><span class="slot">Drop ${this._who(drop)}</span><span class="slot">Pick up ${this._who(pick)}</span></span>` : ''}</span>`;

    const act = (label, on, who) => `<span class="row sb"><span class="t13${on ? '' : ' off'}">${label}</span>
      ${on ? this._who(who) : '<span class="t13 off" style="font-size:12px">Not today</span>'}</span>`;

    let dinner;
    if (d.dinner_type) {
      const tag = d.dinner_type === 'mealie' ? (this._cfg.mealie ? 'Mealie' : 'Home-cooked') : d.dinner_type === 'takeout' ? 'Takeout' : 'Other';
      const cooks = this._cooks(d);
      let whoText = '';
      if (d.dinner_type === 'takeout') whoText = 'No one cooks';
      else if (d.dinner_cook === 'both') whoText = 'Both cooking';
      else if (cooks.length) whoText = `${this._name(cooks[0])} cooks`;
      else if (d.dinner_type === 'mealie') whoText = 'Who’s cooking?';
      dinner = `<span class="meal">${esc(this._mealText(d))}</span>
        <span class="row" style="flex-wrap:wrap;gap:6px"><span class="tag ${d.dinner_type}">${tag}</span>
        ${cooks.map((k) => this._av(k)).join('')}<span style="font-size:12px;color:var(--pp-dni)">${whoText}</span></span>`;
    } else {
      dinner = `<span class="plan-dn">${icon('plus', 14, 2.2)}Plan dinner</span>`;
    }

    const tasks = this._tasks.filter((t) => t.date === d.date).sort((a, b) => a.done - b.done);
    const taskHtml = tasks.length
      ? tasks.map((t) => this._taskHtml(t)).join('')
      : `<span class="empty">${this._n === 1 ? 'No tasks yet' : 'Drop a task here'}</span>`;

    return `<div class="col${d.date < today ? ' past' : ''}" data-drop="${i}" data-col="${i}" style="${height}">
      <div class="dh"><div style="display:flex;align-items:baseline"><span class="dh-n disp">${parseIso(d.date).getDate()}</span><span class="dh-d">${esc(this._dow(d.date))}</span></div>${pill}</div>
      <button type="button" class="sec" data-action="edit" data-i="${i}" aria-label="Edit work for ${esc(long)}">
        <span class="lbl">Work</span>
        ${work('adult1', d.adult1_works, d.adult1_hours, d.adult1_location)}
        ${work('adult2', d.adult2_works, d.adult2_hours, null)}
      </button>
      <button type="button" class="sec" data-action="edit" data-i="${i}" aria-label="Edit school and daycare for ${esc(long)}">
        <span class="lbl">School &amp; daycare</span>
        ${kid(c1, d.child1_school, 'School', 'No school', d.child1_drop, d.child1_pick)}
        ${kid(c2, d.child2_daycare, 'Daycare', 'No daycare', d.child2_drop, d.child2_pick)}
      </button>
      <button type="button" class="sec" data-action="edit" data-i="${i}" aria-label="Edit activities for ${esc(long)}">
        <span class="lbl">${esc(c1.name)}’s activities</span>
        ${act('Jiu jitsu', d.jj, d.jj_who)}
        ${act('Swimming', d.swim, d.swim_who)}
      </button>
      <button type="button" class="sec dn" data-action="edit" data-i="${i}" aria-label="Edit dinner for ${esc(long)}">
        <span class="lbl">${icon('fork', 13, 2.2)}Dinner</span>${dinner}
      </button>
      <div class="tasks"><span class="lbl">Tasks</span>${taskHtml}</div>
    </div>`;
  }

  _taskHtml(t) {
    const label = `${t.done ? 'Mark not done' : 'Mark done'}: ${t.title}`;
    return `<div class="task${t.done ? ' done' : ''}" draggable="true" data-drag="${esc(t.id)}">
      <button type="button" class="chk" data-action="task-done" data-id="${esc(t.id)}" aria-pressed="${!!t.done}" aria-label="${esc(label)}">
        <span class="ring">${t.done ? icon('check', 11, 3.4) : ''}</span></button>
      <button type="button" class="tt" data-action="task-open" data-id="${esc(t.id)}">${esc(t.title)}</button>
      ${t.who ? this._av(t.who) : ''}</div>`;
  }

  _inboxHtml(sheet) {
    const list = this._tasks.filter((t) => !t.date).sort((a, b) => a.done - b.done);
    const open = list.filter((t) => !t.done).length;
    const closeBtn = sheet
      ? `<button type="button" class="ib soft" data-action="close" aria-label="Close tasks">${icon('close')}</button>`
      : `<button type="button" class="ib soft" data-action="rail" aria-label="Collapse task inbox">${icon('collapse')}</button>`;
    return `<div class="inb-h"><div class="inb-ht">${icon('inbox', 20)}<h2 class="disp">Task inbox</h2><span class="badge">${open}</span></div>${closeBtn}</div>
      <p class="inb-sub">${sheet ? 'Tap the circle to check a task off, or tap its name to give it a day or a person.' : 'Not tied to a day yet. Drag one onto a day, or tap it to assign.'}</p>
      <div class="inb-add"><label for="pp-draft" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)">New task</label>
        <input id="pp-draft" class="inp" type="text" placeholder="Add a task…" data-focus="draft" data-input="draft" value="${esc(this._draft)}">
        <button type="button" class="ib-add" data-action="task-add" aria-label="Add task">${icon('plus', 20, 2.2)}</button></div>
      <div class="inb-list" data-scroll="inbox">${list.length ? list.map((t) => this._taskHtml(t)).join('') : '<div class="empty" style="padding:24px 12px;font-size:14px">All caught up. New tasks land here.</div>'}</div>`;
  }

  /* ------------------------------------------------------------ render: overlays */

  _renderPortal() {
    if (!this._portal) return;
    const html = this._cfg ? this._overlayHtml() : '';
    if (!html) {
      this._portal.hidden = true;
      this._portal.innerHTML = '';
      if (this._portalHost.isConnected) this._portalHost.remove();
      return;
    }
    if (!this._portalHost.isConnected) document.body.appendChild(this._portalHost);
    const snap = this._snapshot(this._portal);
    const t = THEMES[this._dark ? 'dark' : 'light'];
    const fonts = this._config.fonts === false
      ? '--pp-font:inherit;--pp-display:inherit'
      : "--pp-font:'Inter',system-ui,sans-serif;--pp-display:'Bricolage Grotesque','Inter',sans-serif";
    this._portal.setAttribute('style', `${themeVars(t)};${fonts}`);
    this._portal.hidden = false;
    const opening = !this._portal.innerHTML;
    this._portal.innerHTML = html;
    this._restore(this._portal, snap);
    if (opening) {
      const focusEl = this._portal.querySelector('[data-autofocus]') || this._portal.querySelector('.sheet button');
      if (focusEl) focusEl.focus({ preventScroll: true });
    }
  }

  _phoneSheets() {
    return window.innerWidth < 700;
  }

  _overlayHtml() {
    const u = this._ui;
    const phone = this._phoneSheets();
    if (u.edit != null && this._days[u.edit]) return this._dayEditorHtml(u.edit, phone);
    if (u.taskEdit != null) {
      const t = this._tasks.find((x) => x.id === u.taskEdit);
      if (t) return this._taskEditorHtml(t, phone);
    }
    if (u.summaryOpen) return this._summaryHtml(phone);
    if (u.inboxOpen && this._n === 1) {
      return `<button type="button" class="scrim" data-action="close" aria-label="Close tasks"></button>
        <div class="sheet bottom tall" role="dialog" aria-modal="true" aria-label="Tasks" style="padding-top:16px">
        <div class="inbox-sheet">${this._inboxHtml(true)}</div></div>`;
    }
    return '';
  }

  _sheet(phone, { kicker, title, nav, body, foot, narrow }) {
    return `<button type="button" class="scrim" data-action="close" aria-label="Close"></button>
      <div class="sheet ${phone ? 'bottom' : 'center'}${narrow ? ' narrow' : ''}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
        <div class="sh-h"><div class="sh-ht"><span class="sh-k">${esc(kicker)}</span><h2 class="disp">${esc(title)}</h2></div>${nav || ''}
          <button type="button" class="ib soft" data-action="close" aria-label="Close">${icon('close')}</button></div>
        <div class="sh-b" data-scroll="sheet">${body}</div>
        ${foot ? `<div class="sh-f">${foot}</div>` : ''}
      </div>`;
  }

  /* controls used in editors. scope = 'day' | 'task' */
  _toggle(scope, field, value, label, onText, offText, avKey) {
    return `<div class="trow"><span class="trow-l">${avKey ? this._av(avKey, 26) : ''}${esc(label)}</span>
      <button type="button" class="tog" data-action="set" data-scope="${scope}" data-field="${field}" data-v="${attrJson(!value)}" aria-pressed="${!!value}" aria-label="${esc(label)}">
      <span class="tog-t">${value ? onText : offText}</span><span class="track"><span class="knob"></span></span></button></div>`;
  }

  _picker(scope, field, value, keys, label, noneLabel = 'Nobody yet') {
    const opts = keys.map((k) => `<button type="button" class="opt" data-action="set" data-scope="${scope}" data-field="${field}" data-v="${attrJson(k)}" aria-pressed="${value === k}">${this._av(k, 28)}${esc(this._name(k))}</button>`);
    opts.push(`<button type="button" class="opt" data-action="set" data-scope="${scope}" data-field="${field}" data-v="null" aria-pressed="${!value}"><span class="none"></span>${esc(noneLabel)}</button>`);
    return `<div class="field"><span class="flabel">${esc(label)}</span><div class="opts">${opts.join('')}</div></div>`;
  }

  _seg(scope, field, value, opts, label, disabled = false) {
    const btns = opts.map(([v, l]) => `<button type="button" class="seg" data-action="set" data-scope="${scope}" data-field="${field}" data-v="${attrJson(v)}" aria-pressed="${!disabled && value === v}" ${disabled ? 'disabled' : ''}>${esc(l)}</button>`);
    return `<div class="field"><span class="flabel">${esc(label)}</span><div class="opts">${btns.join('')}</div></div>`;
  }

  _input(scope, field, value, label, placeholder) {
    const id = `pp-${scope}-${field}`;
    return `<div class="field"><label class="flabel" for="${id}">${esc(label)}</label>
      <input id="${id}" class="inp" type="text" data-change="set" data-scope="${scope}" data-field="${field}" data-focus="${id}" value="${esc(value)}" placeholder="${esc(placeholder)}"></div>`;
  }

  _section(title, items, avKey) {
    return `<section class="esec"><div class="esec-h">${avKey ? this._av(avKey, 28, avKey.startsWith('child')) : ''}<h3 class="disp">${esc(title)}</h3></div>${items.join('')}</section>`;
  }

  _dayEditorHtml(i, phone) {
    const d = this._days[i];
    const m = this._cfg.members;
    const drivers = this._drivers();
    const S = 'day';

    const work = [this._toggle(S, 'adult1_works', d.adult1_works, m.adult1.name, 'Working', 'Day off', 'adult1')];
    if (d.adult1_works) {
      work.push(this._input(S, 'adult1_hours', d.adult1_hours, `${m.adult1.name}’s hours`, 'e.g. 9–5'));
      work.push(this._seg(S, 'adult1_location', d.adult1_location, [['home', 'Home'], ['office', 'Office']], 'Working from'));
    }
    work.push(this._toggle(S, 'adult2_works', d.adult2_works, m.adult2.name, 'Working', 'Day off', 'adult2'));
    if (d.adult2_works) work.push(this._input(S, 'adult2_hours', d.adult2_hours, `${m.adult2.name}’s hours`, 'e.g. 7:30–4'));

    const c1 = [this._toggle(S, 'child1_school', d.child1_school, 'School', 'Yes', 'No')];
    if (d.child1_school) {
      c1.push(this._picker(S, 'child1_drop', d.child1_drop, drivers, 'Drop-off'));
      c1.push(this._picker(S, 'child1_pick', d.child1_pick, drivers, 'Pick-up'));
    }
    c1.push(this._toggle(S, 'jj', d.jj, 'Jiu jitsu', 'Yes', 'No'));
    if (d.jj) c1.push(this._picker(S, 'jj_who', d.jj_who, drivers, `Who’s taking ${m.child1.name} to jiu jitsu?`));
    c1.push(this._toggle(S, 'swim', d.swim, 'Swimming', 'Yes', 'No'));
    if (d.swim) c1.push(this._picker(S, 'swim_who', d.swim_who, drivers, `Who’s taking ${m.child1.name} to swimming?`));

    const c2 = [this._toggle(S, 'child2_daycare', d.child2_daycare, 'Daycare', 'Yes', 'No')];
    if (d.child2_daycare) {
      c2.push(this._picker(S, 'child2_drop', d.child2_drop, drivers, 'Drop-off'));
      c2.push(this._picker(S, 'child2_pick', d.child2_pick, drivers, 'Pick-up'));
    }

    const takeout = d.dinner_type === 'takeout';
    const mealie = this._cfg.mealie;
    const dinner = [this._seg(S, 'dinner_type', d.dinner_type, [['mealie', mealie ? 'From Mealie' : 'Home-cooked'], ['takeout', 'Takeout'], ['other', 'Other']], 'What’s for dinner?')];
    dinner.push(this._seg(S, 'dinner_cook', d.dinner_cook, [['adult1', m.adult1.name], ['adult2', m.adult2.name], ['both', 'Both'], ['none', 'Nobody']], 'Who’s cooking?', takeout));
    if (takeout) dinner.push('<div class="hint">Takeout night — nobody needs to cook.</div>');
    if (d.dinner_type === 'mealie') {
      if (mealie) dinner.push(this._recipePickerHtml(d));
      else dinner.push(this._input(S, 'dinner_meal', d.dinner_meal, 'What are you making?', 'e.g. Turkey chili'));
    }
    if (takeout) dinner.push(this._input(S, 'dinner_note', d.dinner_note, 'From where? (optional)', 'e.g. Thai, pizza'));
    if (d.dinner_type === 'other') dinner.push(this._input(S, 'dinner_note', d.dinner_note, 'What’s the plan?', 'e.g. Nana’s bringing lasagna'));
    if (d.dinner_type) dinner.push(`<div><button type="button" class="btn ghost" style="height:40px;font-size:14px" data-action="set" data-scope="day" data-field="dinner_type" data-v="null">Clear dinner</button></div>`);

    const nav = `<button type="button" class="ib box" data-action="edit-step" data-v="-1" aria-label="Previous day">${icon('left')}</button>
      <button type="button" class="ib box" data-action="edit-step" data-v="1" aria-label="Next day">${icon('right')}</button>`;

    return this._sheet(phone, {
      kicker: 'Plan the day',
      title: this._longDate(d.date),
      nav,
      body: [
        this._section('Work', work),
        this._section(m.child1.name, c1, 'child1'),
        this._section(m.child2.name, c2, 'child2'),
        this._section('Dinner', dinner),
      ].join(''),
      foot: '<span class="note">Changes save as you go.</span><button type="button" class="btn" data-action="close">Done</button>',
    });
  }

  _recipePickerHtml(d) {
    const r = this._recipes;
    return `<div class="field"><span class="flabel">Recipe from Mealie${d.dinner_meal ? ` · <span style="color:var(--pp-ink)">${esc(d.dinner_meal)}</span>` : ''}</span>
      <div class="search">${icon('search', 18)}<label for="pp-recipe-q" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)">Search recipes</label>
      <input id="pp-recipe-q" class="inp" type="search" placeholder="Search your recipes" data-input="recipes" data-focus="recipes" value="${esc(r.query)}"></div>
      <div class="opts" data-recipes>${this._recipeListHtml(d)}</div></div>`;
  }

  _recipeListHtml(d) {
    const r = this._recipes;
    if (!r.available) return '<span class="flabel">Couldn’t reach Mealie. You can still type the meal under Other.</span>';
    if (r.loading && !r.list.length) return '<span class="flabel">Loading recipes…</span>';
    if (!r.list.length) return `<span class="flabel">${r.query ? 'No recipes match.' : 'No recipes found.'}</span>`;
    return r.list.slice(0, 24).map((x) => `<button type="button" class="seg" data-action="recipe" data-id="${esc(x.id)}" data-name="${esc(x.name)}" aria-pressed="${d.dinner_recipe_id === x.id}">${esc(x.name)}</button>`).join('');
  }

  _taskEditorHtml(t, phone) {
    const S = 'task';
    const when = [['__inbox', 'Inbox'], ...this._days.map((d) => [d.date, `${this._dow(d.date)} ${parseIso(d.date).getDate()}`])];
    if (t.date && !this._days.some((d) => d.date === t.date)) when.push([t.date, t.date]);
    const body = [
      '<section class="esec" style="border-top:0;padding-top:4px">',
      this._input(S, 'title', t.title, 'What needs doing?', 'Task name'),
      this._toggle(S, 'done', t.done, 'Done', 'Done', 'Not yet'),
      this._picker(S, 'who', t.who, this._everyone(), 'Assign to', 'Anyone'),
      this._seg(S, 'date', t.date || '__inbox', when, 'When'),
      '</section>',
    ].join('');
    return this._sheet(phone, {
      kicker: 'Task',
      title: t.title || 'Untitled task',
      body,
      foot: '<button type="button" class="btn danger" data-action="task-delete">Delete</button><span class="note"></span><button type="button" class="btn" data-action="close">Done</button>',
    });
  }

  _summaryHtml(phone) {
    const me = this._me();
    const gaps = this._gaps();
    const gapHtml = gaps.length
      ? `<div class="gaps">${gaps.map((g) => `<button type="button" class="gap" data-action="edit" data-i="${g.i}"><span class="gap-d">${esc(g.day)}</span><span class="gap-l">${esc(g.label)}</span>${icon('right', 16)}</button>`).join('')}</div>`
      : '<span class="ok">Everything’s covered.</span>';

    let top;
    if (me) {
      const l = this._loadFor(me.key);
      const isAdult = me.key === 'adult1' || me.key === 'adult2';
      const stats = isAdult
        ? [[l.runs, 'school run', 'school runs'], [l.trips, 'activity trip', 'activity trips'], [l.dinners, 'dinner to cook', 'dinners to cook']]
        : [[l.tasks, 'task', 'tasks']];
      top = `<div style="display:flex;flex-direction:column;gap:4px"><span class="disp" style="font-size:18px;font-weight:700">Hi ${esc(me.name)}</span>
        <span style="font-size:14px;color:var(--pp-mu)">Here’s what’s yours this week.</span></div>
        <div class="stats" style="${isAdult ? '' : 'grid-template-columns:1fr'}">${stats.map(([n, one, many]) => `<div class="stat"><b class="disp">${n}</b><span>${n === 1 ? one : many}</span></div>`).join('')}</div>`;
    } else {
      // Shared screens (e.g. a kitchen kiosk account): show the whole household.
      const rows = this._drivers().map((k) => {
        const l = this._loadFor(k);
        const parts = [];
        if (l.runs) parts.push(plural(l.runs, 'school run', 'school runs'));
        if (l.trips) parts.push(plural(l.trips, 'activity', 'activities'));
        if (l.dinners) parts.push(plural(l.dinners, 'dinner', 'dinners'));
        if (l.tasks) parts.push(plural(l.tasks, 'task', 'tasks'));
        if (!parts.length && k.startsWith('h_')) return '';
        return `<div class="prow">${this._av(k, 36)}<div><div class="prow-n">${esc(this._name(k))}</div><div class="prow-s">${parts.length ? parts.join(' · ') : 'Nothing assigned'}</div></div></div>`;
      }).join('');
      top = `<div style="display:flex;flex-direction:column">${rows}</div>`;
    }

    return `<button type="button" class="scrim" data-action="close" aria-label="Close"></button>
      <div class="sheet ${phone ? 'bottom' : 'center narrow'}" role="dialog" aria-modal="true" aria-label="${me ? 'Your week' : 'This week'}">
        <div class="sh-h"><div class="sh-ht"><span class="sh-k">${esc(this._weekLabel())}</span><h2 class="disp">${me ? 'Your week' : 'This week'}</h2></div>
          <button type="button" class="ib soft" data-action="close" aria-label="Close" data-autofocus>${icon('close')}</button></div>
        <div class="sumb">${top}<div style="display:flex;flex-direction:column;gap:6px"><span class="lbl">${gaps.length ? 'Still needs someone' : 'Open items'}</span>${gapHtml}</div></div>
      </div>`;
  }

  /* ------------------------------------------------------------ snapshot / restore */

  _snapshot(root) {
    const snap = { scroll: {}, focus: null };
    root.querySelectorAll('[data-scroll],[data-col]').forEach((el) => {
      const k = el.dataset.scroll || `col${el.dataset.col}`;
      snap.scroll[k] = el.scrollTop;
    });
    const strip = root.querySelector('.strip');
    if (strip) snap.strip = strip.scrollLeft;
    const active = root.getRootNode().activeElement || null;
    if (active && root.contains(active)) {
      if (active.dataset.focus) {
        snap.focus = { key: active.dataset.focus, value: active.value, start: active.selectionStart, end: active.selectionEnd };
      } else if (active.dataset.action) {
        snap.focus = { action: active.dataset.action, field: active.dataset.field || '', v: active.dataset.v || '', id: active.dataset.id || '', i: active.dataset.i || '' };
      }
    }
    return snap;
  }

  _restore(root, snap) {
    root.querySelectorAll('[data-scroll],[data-col]').forEach((el) => {
      const k = el.dataset.scroll || `col${el.dataset.col}`;
      if (snap.scroll[k] != null) el.scrollTop = snap.scroll[k];
    });
    const strip = root.querySelector('.strip');
    if (strip && snap.strip != null) strip.scrollLeft = snap.strip;
    const f = snap.focus;
    if (!f) return;
    let el = null;
    if (f.key) {
      el = root.querySelector(`[data-focus="${CSS.escape(f.key)}"]`);
      if (el) {
        el.value = f.value;
        el.focus({ preventScroll: true });
        try { el.setSelectionRange(f.start, f.end); } catch (_) { /* not a text input */ }
      }
      return;
    }
    const sel = [`[data-action="${CSS.escape(f.action)}"]`];
    if (f.field) sel.push(`[data-field="${CSS.escape(f.field)}"]`);
    if (f.id) sel.push(`[data-id="${CSS.escape(f.id)}"]`);
    if (f.i) sel.push(`[data-i="${CSS.escape(f.i)}"]`);
    const candidates = root.querySelectorAll(sel.join(''));
    el = [...candidates].find((c) => (c.dataset.v || '') === f.v) || (f.action === 'set' && f.field ? candidates[0] : null) || candidates[0];
    if (el) el.focus({ preventScroll: true });
  }

  /* ------------------------------------------------------------ events */

  _wireEvents(root) {
    root.addEventListener('click', (e) => this._onClick(e));
    root.addEventListener('change', (e) => this._onChange(e));
    root.addEventListener('input', (e) => this._onInput(e));
    root.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.target.dataset?.input === 'draft') { e.preventDefault(); this._addTask(); }
      if (e.key === 'Enter' && e.target.dataset?.change) { e.preventDefault(); e.target.blur(); }
    });
    root.addEventListener('scroll', (e) => {
      if (e.target.classList?.contains('strip')) this._onStripScroll(e.target);
    }, true);
    root.addEventListener('dragstart', (e) => {
      const el = e.target.closest?.('[data-drag]');
      if (!el) return;
      this._dragId = el.dataset.drag;
      el.classList.add('dragging');
      try { e.dataTransfer.setData('text/plain', this._dragId); e.dataTransfer.effectAllowed = 'move'; } catch (_) { /* ignore */ }
    });
    root.addEventListener('dragend', (e) => {
      e.target.closest?.('[data-drag]')?.classList.remove('dragging');
      this._dragId = null;
      root.querySelectorAll('.over').forEach((x) => x.classList.remove('over'));
    });
    root.addEventListener('dragover', (e) => {
      if (!this._dragId) return;
      const zone = e.target.closest?.('[data-drop]');
      if (!zone) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (!zone.classList.contains('over')) {
        root.querySelectorAll('.over').forEach((x) => x.classList.remove('over'));
        zone.classList.add('over');
      }
    });
    root.addEventListener('dragleave', (e) => {
      const zone = e.target.closest?.('[data-drop]');
      if (zone && !zone.contains(e.relatedTarget)) zone.classList.remove('over');
    });
    root.addEventListener('drop', (e) => {
      const zone = e.target.closest?.('[data-drop]');
      if (!zone || !this._dragId) return;
      e.preventDefault();
      const id = this._dragId;
      this._dragId = null;
      const date = zone.dataset.drop === 'inbox' ? null : this._days[Number(zone.dataset.drop)]?.date ?? null;
      this._patchTask(id, { date });
    });
  }

  _onStripScroll(strip) {
    const step = (strip.clientWidth + 12) / this._n;
    const v = Math.max(0, Math.min(Math.round(strip.scrollLeft / step), 7 - this._n));
    if (v !== this._vis) {
      this._vis = v;
      const nav = this._root.querySelector('.daynav');
      if (nav) {
        const snap = this._snapshot(nav);
        nav.innerHTML = this._dayNavHtml();
        this._restore(nav, snap);
      }
    }
  }

  _onClick(e) {
    const el = e.target.closest?.('[data-action]');
    if (!el) return;
    const a = el.dataset.action;
    const v = el.dataset.v;
    switch (a) {
      case 'week':
        this._changeWeek(Number(v));
        break;
      case 'day':
        this._stepDay(Number(v));
        break;
      case 'summary':
        this._ui = { edit: null, taskEdit: null, inboxOpen: false, summaryOpen: !this._ui.summaryOpen };
        this._render();
        break;
      case 'rail':
        this._railOpen = !this._railOpen;
        try { localStorage.setItem('pineapple-plan-rail', this._railOpen ? 'open' : 'closed'); } catch (_) { /* ignore */ }
        this._render();
        break;
      case 'inbox-open':
        this._ui = { edit: null, taskEdit: null, inboxOpen: true, summaryOpen: false };
        this._renderPortal();
        break;
      case 'close':
        this._closeOverlay();
        break;
      case 'edit':
        this._openDay(Number(el.dataset.i));
        break;
      case 'edit-step': {
        const next = this._ui.edit + Number(v);
        if (next < 0) this._changeWeek(-1, 6).then(() => this._openDay(6));
        else if (next > 6) this._changeWeek(1, 0).then(() => this._openDay(0));
        else this._openDay(next);
        break;
      }
      case 'set':
        this._set(el.dataset.scope, el.dataset.field, JSON.parse(v));
        break;
      case 'recipe':
        this._patchDay(this._ui.edit, { dinner_type: 'mealie', dinner_recipe_id: el.dataset.id, dinner_meal: el.dataset.name });
        break;
      case 'task-add':
        this._addTask();
        break;
      case 'task-done': {
        const t = this._tasks.find((x) => x.id === el.dataset.id);
        if (t) this._patchTask(t.id, { done: !t.done });
        break;
      }
      case 'task-open':
        this._ui = { edit: null, taskEdit: el.dataset.id, inboxOpen: false, summaryOpen: false };
        this._renderPortal();
        break;
      case 'task-delete': {
        const id = this._ui.taskEdit;
        this._tasks = this._tasks.filter((x) => x.id !== id);
        this._ui.taskEdit = null;
        this._render();
        this._ws('task/delete', { id }).catch((err) => this._toastError(err));
        break;
      }
      default:
        break;
    }
  }

  _onChange(e) {
    const el = e.target;
    if (el.dataset?.change !== 'set') return;
    this._set(el.dataset.scope, el.dataset.field, el.value);
  }

  _onInput(e) {
    const el = e.target;
    if (el.dataset?.input === 'draft') this._draft = el.value;
    if (el.dataset?.input === 'recipes') {
      this._recipes.query = el.value;
      clearTimeout(this._recipeTimer);
      this._recipeTimer = setTimeout(() => this._loadRecipes(), 250);
    }
  }

  _closeOverlay() {
    const wasTask = this._ui.taskEdit;
    this._ui = { edit: null, taskEdit: null, inboxOpen: false, summaryOpen: false };
    this._render();
    if (wasTask) {
      const back = this._root.querySelector(`[data-action="task-open"][data-id="${CSS.escape(wasTask)}"]`);
      if (back) back.focus({ preventScroll: true });
    }
  }

  _openDay(i) {
    this._ui = { edit: i, taskEdit: null, inboxOpen: false, summaryOpen: false };
    this._renderPortal();
    const d = this._days[i];
    if (d && d.dinner_type === 'mealie' && this._cfg.mealie && !this._recipes.list.length) this._loadRecipes();
  }

  _stepDay(dir) {
    const strip = this._root.querySelector('.strip');
    if (!strip) return;
    const step = (strip.clientWidth + 12) / this._n;
    const vis = Math.max(0, Math.min(Math.round(strip.scrollLeft / step), 7 - this._n));
    if (dir < 0 && vis === 0) { this._changeWeek(-1, 7 - this._n); return; }
    if (dir > 0 && vis >= 7 - this._n) { this._changeWeek(1, 0); return; }
    strip.scrollBy({ left: (dir * (strip.clientWidth + 12)) / this._n, behavior: 'smooth' });
  }

  /* ------------------------------------------------------------ mutations */

  _set(scope, field, value) {
    if (scope === 'day') {
      const patch = { [field]: value };
      if (field === 'dinner_type' && value === 'mealie' && this._cfg.mealie && !this._recipes.list.length) this._loadRecipes();
      if (field === 'dinner_type' && value === null) Object.assign(patch, { dinner_recipe_id: null, dinner_meal: '', dinner_note: '', dinner_cook: 'none' });
      this._patchDay(this._ui.edit, patch);
    } else if (scope === 'task') {
      let v = value;
      if (field === 'date' && v === '__inbox') v = null;
      if (field === 'title' && !String(v).trim()) return;
      this._patchTask(this._ui.taskEdit, { [field]: v });
    }
  }

  _patchDay(i, patch) {
    const d = this._days[i];
    if (!d) return;
    Object.assign(d, patch);
    this._render();
    this._ws('day/update', { date: d.date, patch })
      .then((day) => { const idx = this._days.findIndex((x) => x.date === day.date); if (idx >= 0) { this._days[idx] = day; } })
      .catch((err) => { this._toastError(err); this._queueReload(); });
  }

  _patchTask(id, patch) {
    const t = this._tasks.find((x) => x.id === id);
    if (!t) return;
    Object.assign(t, patch);
    this._render();
    this._ws('task/update', { id, patch }).catch((err) => { this._toastError(err); this._queueReload(); });
  }

  _addTask() {
    const input = this.shadowRoot.querySelector('[data-input="draft"]') || this._portal.querySelector('[data-input="draft"]');
    const title = ((input && input.value) || this._draft).trim();
    if (!title) return;
    this._draft = '';
    const temp = { id: `tmp-${Date.now()}`, title, who: null, date: null, done: false };
    this._tasks.push(temp);
    if (input) input.value = '';
    this._render();
    this._ws('task/create', { title })
      .then((task) => { const idx = this._tasks.indexOf(temp); if (idx >= 0) this._tasks[idx] = task; this._render(); })
      .catch((err) => { this._tasks = this._tasks.filter((x) => x !== temp); this._toastError(err); this._render(); });
  }

  async _loadRecipes() {
    this._recipes.loading = true;
    this._updateRecipeList();
    try {
      const res = await this._ws('recipes', { query: this._recipes.query });
      this._recipes = { ...this._recipes, list: res.recipes || [], available: res.available !== false, loading: false };
    } catch (_) {
      this._recipes = { ...this._recipes, list: [], available: false, loading: false };
    }
    this._updateRecipeList();
  }

  _updateRecipeList() {
    const box = this._portal?.querySelector('[data-recipes]');
    const d = this._days[this._ui.edit];
    if (box && d) box.innerHTML = this._recipeListHtml(d);
  }

  _toastError(err) {
    this.dispatchEvent(new CustomEvent('hass-notification', {
      detail: { message: `Pineapple Plan: ${err?.message || err}` },
      bubbles: true,
      composed: true,
    }));
  }
}

if (!customElements.get('pineapple-plan-card')) {
  customElements.define('pineapple-plan-card', PineapplePlanCard);
  window.customCards = window.customCards || [];
  window.customCards.push({
    type: 'pineapple-plan-card',
    name: 'Pineapple Plan',
    description: 'Plan the family’s week: work, school runs, activities, dinner and tasks.',
    preview: false,
  });
  // eslint-disable-next-line no-console
  console.info(`%c PINEAPPLE-PLAN %c ${PP_VERSION} `, 'background:#F5B92E;color:#17201B;font-weight:700', 'background:#1F6A4A;color:#fff');
}
