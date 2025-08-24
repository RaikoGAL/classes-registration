// ===== Rishon Chess Club — data, filters, and rendering =====
(function(global){
  const $  = (sel, root=document)=>root.querySelector(sel);
  const $$ = (sel, root=document)=>Array.from(root.querySelectorAll(sel));

  // --- Helpers: "מד כושר" ופורמט מחיר ---
  const isRatingLike = (txt) => /\d{3,4}\s*[–-]\s*\d{3,4}|^\+?\d{3,4}\+?$/.test(String(txt));
  const displayLevel = (lvl) => {
    const t = String(lvl||'').trim();
    if (isRatingLike(t)) {
      const normalized = t.replace('-', '–').replace(/\s+/g,'');
      return `מד כושר ${normalized}`;
    }
    return t;
  };
  const formatPrice = (p) => {
    const raw = String(p||'').replace(/\s+/g,'');
    const m = raw.match(/₪?(\d{2,5})\/₪?(\d{2,5})/);
    if (!m) return p || '';
    const one = Math.min(+m[1], +m[2]);
    const two = Math.max(+m[1], +m[2]);
    return `יום אחד: ${one}₪ • יומיים: ${two}₪`;
  };
  const setEmptyClass = (sel)=> sel && sel.classList.toggle('select-empty', !sel.value);

  // ---- Meshulam links ----
  const M = {
    g1200_day1: "https://meshulam.co.il/purchase?b=28c285802ed7b9e20144601019fd895d",
    g1200_day2: "https://meshulam.co.il/purchase?b=28c285802ed7b9e20144601019fd895d",
    g1200_both: "https://meshulam.co.il/purchase?b=779414282cc42ace3a7910b5519e3208",
    g1400_day1: "https://meshulam.co.il/purchase?b=ce976e44d99950191d8234a1c8bac33a",
    g1400_day2: "https://meshulam.co.il/purchase?b=ce976e44d99950191d8234a1c8bac33a",
    g1400_both: "https://meshulam.co.il/purchase?b=f4339424ec52b34e25dd1721d3b7661e",
    maya_sun_kids: "https://meshulam.co.il/purchase?b=b43a28b1f2c05646c5e306fdfa29ec76",
    yaron_sun_rated1200: "https://meshulam.co.il/purchase?b=df23ad22774cc219f5e0013115c96bc7",
    yaron_sun_adults: "https://meshulam.co.il/purchase?b=a7a4c5fc5deb10e52b05f5f11c666c91",
    or_wed_adults: "#",
    girls_beg_tue: "https://meshulam.co.il/purchase?b=90d7e8c8f069d0634ec636ee8dba0dd2",
    girls_adv_tue: "https://meshulam.co.il/purchase?b=c62bbbba3b7d719a7d093420ac1faf7c",
    yaron_thu_kids_beg: "https://meshulam.co.il/purchase?b=b6d2eec45b75673832ed360488f3bf5d",
    yaron_thu_kids_cont: "https://meshulam.co.il/purchase?b=64cea8000708357f8146213729ac3bec",
    vitali_mon_1600: "https://meshulam.co.il/purchase?b=cf8f51bfa8f806f245abe3341dd2dfdd"
  };

  // ---- Data ----
  const classGroups = [
    { id:'grp-rated-1200-1400', title:'מדורגים', level:'1200–1400', coach:'גלב קגנסקי', price:'₪235/₪355',
      sessions:[{ day:1, dayName:'שני', time:'16:00–17:30' }, { day:3, dayName:'רביעי', time:'16:00–17:30' }],
      meshulamOptions: { day1: M.g1200_day1, day2: M.g1200_day2, both: M.g1200_both } },
    { id:'grp-adv-1400-1600', title:'מתקדמים', level:'1400–1600', coach:'גלב קגנסקי', price:'₪235/₪355',
      sessions:[{ day:1, dayName:'שני', time:'17:45–19:15' }, { day:3, dayName:'רביעי', time:'17:45–19:15' }],
      meshulamOptions: { day1: M.g1400_day1, day2: M.g1400_day2, both: M.g1400_both } },

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
      sessions:[{ day:3, dayName:'רביעי', time:'19:30–21:00' }], meshulam: M.or_wed_adults },
  ];

  function getQuery(){ const q = new URLSearchParams(location.search); return Object.fromEntries(q.entries()); }

  // ---- Filters ----
  function populateCoachFilter(){
    const sel = $('#coachSelect'); if(!sel) return;
    const coaches = Array.from(new Set(classGroups.map(g => g.coach))).sort((a,b)=>a.localeCompare(b,'he'));
    sel.innerHTML = `<option value="">בחר מאמן/ת</option><option value="all">כל המאמנים</option>` +
      coaches.map(c=>`<option value="${c}">${c}</option>`).join('');
  }
  function populateLevelFilter(){
    const sel = $('#levelSelect'); if(!sel) return;
    const levels = Array.from(new Set(classGroups.map(g => g.level)));
    sel.innerHTML = `<option value="">בחר רמה</option><option value="all">כל הרמות</option>` +
      levels.map(l=>`<option value="${l}">${displayLevel(l)}</option>`).join('');
  }

  function renderTimetable(){
    const grid = $('#grid'); if (!grid) return;
    const daySel   = $('#daySelect');
    const levelSel = $('#levelSelect');
    const coachSel = $('#coachSelect');

    // מצב פתיחה/placeholder – אל תציג קלפים עד שיש בחירה כלשהי
    setEmptyClass(daySel); setEmptyClass(levelSel); setEmptyClass(coachSel);
    const day   = daySel?.value || '';
    const level = levelSel?.value || '';
    const coach = coachSel?.value || '';

    if (!day && !level && !coach) { grid.innerHTML = ''; return; }

    const filtered = classGroups.filter(g=>{
      const hitDay   = (!day   || day==='all'   || g.sessions.some(s=>String(s.day)===String(day)));
      const hitLevel = (!level || level==='all' || g.level === level);
      const hitCoach = (!coach || coach==='all' || g.coach === coach);
      return hitDay && hitLevel && hitCoach;
    });

    grid.innerHTML='';
    filtered.forEach(g=>{
      const card = document.createElement('div');
      card.className='card';
      const sessions = g.sessions.map(s=>`<span class="session">${s.dayName} • ${s.time}</span>`).join('');
      card.innerHTML = `
        <div class="kv">
          <div>${displayLevel(g.level)}</div>
          <div>${g.coach}</div>
        </div>
        <h3>${g.title}</h3>
        <div class="sessions">${sessions}</div>
        <div class="cta">
          <div class="price">${formatPrice(g.price)}</div>
          <a class="btn primary" href="register.html?groupId=${encodeURIComponent(g.id)}">להרשמה</a>
        </div>`;
      grid.appendChild(card);
    });
  }

  function initIndex(){
    if (!$('#grid')) return;
    populateCoachFilter();
    populateLevelFilter();
    ['daySelect','levelSelect','coachSelect'].forEach(id=>{
      const el = $('#'+id);
      if(el){ setEmptyClass(el); el.addEventListener('change', ()=>{ setEmptyClass(el); renderTimetable(); }); }
    });
    // פתיחה: הכל ריק → אין קלפים
    renderTimetable();
  }

  function initRegisterMeta(){
    if (!$('#regForm')) return;
    const { groupId } = getQuery();
    const grp = classGroups.find(g => g.id === groupId);
    if (!grp) return;
    $('#classTitle').textContent = grp.title;
    $('#classMeta').textContent  = `${displayLevel(grp.level)} • מאמן/ת: ${grp.coach}`;
  }

  // חשיפה ל-payments.js
  global.RCC = { classGroups, M };

  if (document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded', ()=>{ initIndex(); initRegisterMeta(); });
  } else { initIndex(); initRegisterMeta(); }
})(window);
