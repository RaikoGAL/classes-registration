// ---------- helpers ----------
function $(sel, root=document){ return root.querySelector(sel); }
function $all(sel, root=document){ return Array.from(root.querySelectorAll(sel)); }

// ---------- Meshulam links (כמו אצלך) ----------
const M = {
  g1200_day1: 'https://meshulam.co.il/purchase?b=28c285802ed7b9e20144601019fd895d',
  g1200_day2: 'https://meshulam.co.il/purchase?b=28c285802ed7b9e20144601019fd895d',
  g1200_both: 'https://meshulam.co.il/purchase?b=779414282cc42ace3a7910b5519e3208',

  g1400_day1: 'https://meshulam.co.il/purchase?b=ce976e44d99950191d8234a1c8bac33a',
  g1400_day2: 'https://meshulam.co.il/purchase?b=ce976e44d99950191d8234a1c8bac33a',
  g1400_both: 'https://meshulam.co.il/purchase?b=f4339424ec52b34e25dd1721d3b7661e',

  maya_sun_kids:        'https://meshulam.co.il/purchase?b=b43a28b1f2c05646c5e306fdfa29ec76',
  girls_beg_tue:        'https://meshulam.co.il/purchase?b=90d7e8c8f069d0634ec636ee8dba0dd2',
  girls_adv_tue:        'https://meshulam.co.il/purchase?b=c62bbbba3b7d719a7d093420ac1faf7c',
  yaron_thu_kids_beg:   'https://meshulam.co.il/purchase?b=b6d2eec45b75673832ed360488f3bf5d',
  yaron_thu_kids_cont:  'https://meshulam.co.il/purchase?b=64cea8000708357f8146213729ac3bec',

  yaron_sun_rated1200:  'https://meshulam.co.il/purchase?b=df23ad22774cc219f5e0013115c96bc7',
  vitali_mon_1600:      'https://meshulam.co.il/purchase?b=cf8f51bfa8f806f245abe3341dd2dfdd',
  yaron_sun_adults:     'https://meshulam.co.il/purchase?b=a7a4c5fc5deb10e52b05f5f11c666c91',

  or_wed_adults:        '#'
};

// ---------- תצורה עסקית (כרטיסיות חוגים לתצוגה) ----------
const classGroups = [
  // זוגי (235/355)
  { id:'grp-rated-1200-1400', title:'מדורגים', level:'1200–1400', coach:'גלב קגנסקי', price:'₪235/₪355',
    sessions:[{ day:1, dayName:'שני', time:'16:00–17:30' }, { day:3, dayName:'רביעי', time:'16:00–17:30' }],
    meshulamOptions: { day1: M.g1200_day1, day2: M.g1200_day2, both: M.g1200_both } },

  { id:'grp-adv-1400-1600', title:'מתקדמים', level:'1400–1600', coach:'גלב קגנסקי', price:'₪235/₪355',
    sessions:[{ day:1, dayName:'שני', time:'17:45–19:15' }, { day:3, dayName:'רביעי', time:'17:45–19:15' }],
    meshulamOptions: { day1: M.g1400_day1, day2: M.g1400_day2, both: M.g1400_both } },

  // חד-שבועיים (195/235)
  { id:'cls-kids-maya-sun', title:"גן–א' מתחילים", level:'גן–א׳', coach:'מאיה לפושניאן', price:'₪195',
    sessions:[{ day:0, dayName:'ראשון', time:'16:30–17:30' }], meshulam: M.maya_sun_kids },

  { id:'cls-girls-beg-tue', title:'חוג בנות מתחילות', level:'בנות', coach:'מאיה לפושניאן', price:'₪195',
    sessions:[{ day:2, dayName:'שלישי', time:'16:00–17:00' }], meshulam: M.girls_beg_tue },

  { id:'cls-girls-adv-tue', title:'חוג בנות ממשיכות', level:'בנות', coach:'מאיה לפושניאן', price:'₪195',
    sessions:[{ day:2, dayName:'שלישי', time:'17:00–18:00' }], meshulam: M.girls_adv_tue },

  { id:'cls-kids-yaron-thu', title:"גן–א' מתחילים", level:'גן–א׳', coach:'ירון ליניק', price:'₪195',
    sessions:[{ day:4, dayName:'חמישי', time:'16:30–17:30' }], meshulam: M.yaron_thu_kids_beg },

  { id:'cls-kids-cont-yaron-thu', title:"גן–א' ממשיכים", level:'גן–א׳', coach:'ירון ליניק', price:'₪195',
    sessions:[{ day:4, dayName:'חמישי', time:'17:30–18:30' }], meshulam: M.yaron_thu_kids_cont },

  { id:'cls-rated-yaron-1200-1400-sun', title:'מדורגים', level:'1200–1400', coach:'ירון ליניק', price:'₪235',
    sessions:[{ day:0, dayName:'ראשון', time:'17:30–19:00' }], meshulam: M.yaron_sun_rated1200 },

  { id:'cls-vitali-1600-1800-mon', title:'מתקדמים', level:'1600–1800', coach:'ויטלי גולוד', price:'₪235',
    sessions:[{ day:1, dayName:'שני', time:'19:30–21:00' }], meshulam: M.vitali_mon_1600 },

  { id:'cls-adults-yaron-sun', title:'חוג מבוגרים', level:'מבוגרים', coach:'ירון ליניק', price:'₪235',
    sessions:[{ day:0, dayName:'ראשון', time:'19:15–20:45' }], meshulam: M.yaron_sun_adults },

  { id:'cls-adults-or-wed', title:'חוג מבוגרים', level:'+1900', coach:'אור ברונשטיין', price:'יפורסם בהמשך',
    sessions:[{ day:3, dayName:'רביעי', time:'19:30–21:00' }], meshulam: M.or_wed_adults }
];

// ---------- B1: מיפוי groupId → class_id (UUID מה־DB) ----------
window.CLASS_IDS = {
  // זוגי
  'grp-rated-1200-1400': 'de3b6ad8-0980-4080-bd77-cd658644779b',
  'grp-adv-1400-1600':   '3c8123ba-1667-4d19-be91-f8297e41a4b6',

  // חד-שבועיים
  'cls-kids-maya-sun':        'b366fea7-cb67-40f2-8de2-49aa3e4eac1f',
  'cls-girls-beg-tue':        '0c347cee-e870-4238-aa4e-97ed0b38b5a2',
  'cls-girls-adv-tue':        '397afb6a-6d89-4ac5-91fb-bc02cb8b4731',
  'cls-kids-yaron-thu':       '8d1b5900-e8a8-4002-93f2-d236d3c7bcd2',
  'cls-kids-cont-yaron-thu':  '7104d655-2c47-4da1-8724-1481a479a5af',

  'cls-rated-yaron-1200-1400-sun': 'b4d9f361-1aa7-495c-b85b-803ddc1ea19d',
  'cls-vitali-1600-1800-mon':     '7523e664-26ad-4cd1-acde-a4fb4152451c',
  'cls-adults-yaron-sun':         '026437ff-49a4-45dd-a4c8-358563ac6e1a',
  // עתידי:
  'cls-adults-or-wed':            '0fe6a281-5cf0-498d-a90e-2f39ec066d0c'
};

// ---------- B2: מיפוי groupId + option → Meshulam URL ----------
window.PAYMENT_URLS = {
  'grp-rated-1200-1400': {
    day1: M.g1200_day1, day2: M.g1200_day2, both: M.g1200_both
  },
  'grp-adv-1400-1600': {
    day1: M.g1400_day1, day2: M.g1400_day2, both: M.g1400_both
  },

  'cls-kids-maya-sun':        { single: M.maya_sun_kids },
  'cls-girls-beg-tue':        { single: M.girls_beg_tue },
  'cls-girls-adv-tue':        { single: M.girls_adv_tue },
  'cls-kids-yaron-thu':       { single: M.yaron_thu_kids_beg },
  'cls-kids-cont-yaron-thu':  { single: M.yaron_thu_kids_cont },

  'cls-rated-yaron-1200-1400-sun': { single: M.yaron_sun_rated1200 },
  'cls-vitali-1600-1800-mon':     { single: M.vitali_mon_1600 },
  'cls-adults-yaron-sun':         { single: M.yaron_sun_adults },
  'cls-adults-or-wed':            { single: M.or_wed_adults }
};

// ---------- עמוד ראשי ----------
function renderTimetable(){
  const grid = $('#grid'); if (!grid) return;
  grid.innerHTML='';

  const day   = $('#daySelect')?.value || 'all';
  const level = $('#levelSelect')?.value || 'all';
  const coach = $('#coachSelect')?.value || 'all';

  const filtered = classGroups.filter(g => {
    const hitDay   = (day==='all'   || g.sessions.some(s => String(s.day) === String(day)));
    const hitLevel = (level==='all' || g.level.includes(level));
    const hitCoach = (coach==='all' || g.coach === coach);
    return hitDay && hitLevel && hitCoach;
  });

  filtered.forEach(g => {
    const card = document.createElement('div');
    card.className = 'card';
    const sessions = g.sessions.map(s => `<span class="session">${s.dayName} • ${s.time}</span>`).join('');
    card.innerHTML = `
      <div class="kv">
        <div><span class="badge">${g.level}</span></div>
        <div><span class="badge">${g.coach}</span></div>
      </div>
      <h3>${g.title}</h3>
      <div class="sessions">${sessions}</div>
      <div class="cta">
        <div class="price">${g.price}</div>
        <a class="btn primary" href="register.html?groupId=${encodeURIComponent(g.id)}">להרשמה</a>
      </div>
    `;
    grid.appendChild(card);
  });
}

function populateCoachFilter(){
  const coaches = Array.from(new Set(classGroups.map(g => g.coach))).sort((a,b)=>a.localeCompare(b));
  const sel = $('#coachSelect'); if (!sel) return;
  sel.innerHTML = `<option value="all">כל המאמנים</option>` + coaches.map(c => `<option>${c}</option>`).join('');
}

// ---------- עמוד הרשמה ----------
function getQuery(){ const q = new URLSearchParams(location.search); return Object.fromEntries(q.entries()); }

function initRegister(){
  if (!$('#regForm')) return;
  const q = getQuery();
  const groupKey = q.groupId || q.group || '';
  const grp = classGroups.find(g => g.id === groupKey);
  if (!grp) return; // אם נכנסו בלי קבוצה תקינה – נשאיר את הדף ללא טעינה של פרטי החוג

  // למלא UI
  $('#classTitle')   && ($('#classTitle').textContent = grp.title);
  $('#classMeta')    && ($('#classMeta').textContent  = `${grp.level} • מאמן/ת: ${grp.coach}`);
  $('#price')        && ($('#price').textContent      = grp.price);
  $('#sessionsList') && ($('#sessionsList').innerHTML = grp.sessions.map(s => `<span class="session">${s.dayName} • ${s.time}</span>`).join(''));

  // בחירת ימים
  const optSel = $('#meetingOption');
  if (optSel){
    optSel.innerHTML = '';
    if (grp.sessions.length === 2){
      const [s1, s2] = grp.sessions;
      optSel.innerHTML = `
        <option value="both">שני הימים (${s1.dayName}+${s2.dayName})</option>
        <option value="day1">${s1.dayName} (${s1.time})</option>
        <option value="day2">${s2.dayName} (${s2.time})</option>`;
    } else {
      const s = grp.sessions[0];
      optSel.innerHTML = `<option value="single">${s.dayName} (${s.time})</option>`;
    }
  }

  // למלא את השדה החבוי – פולבק ל-payments.js
  const hidden = $('#groupKey');
  if (hidden) hidden.value = groupKey;

  // חשוב: לא מחברים כאן submit! ההגשה נעשית ב-payments.js (saveThenPay)
}

// ---------- אדמין (שער סיסמה פשוט) ----------
function initAdmin(){
  if (!$('#adminRoot')) return;
  const gate = $('#gate');
  const content = $('#adminContent');
  const btn = $('#unlockBtn');
  if (btn){
    btn.addEventListener('click', () => {
      const val = ($('#pwd').value || '').trim();
      if (val === '123456'){ gate.style.display='none'; content.style.display='block'; }
      else { $('#gateMsg').textContent = 'סיסמה שגויה'; }
    });
  }
}

// ---------- bootstrap ----------
function initIndex(){
  if (!$('#grid')) return;
  populateCoachFilter();
  renderTimetable();
  const ds = $('#daySelect'), ls = $('#levelSelect'), cs = $('#coachSelect');
  ds && ds.addEventListener('change', renderTimetable);
  ls && ls.addEventListener('change', renderTimetable);
  cs && cs.addEventListener('change', renderTimetable);
}

document.addEventListener('DOMContentLoaded', () => {
  initIndex();
  initRegister();
  initAdmin();
});
