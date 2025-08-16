// ================= Utils =================
function getQueryParam(name) {
  const url = new URL(window.location.href);
  return url.searchParams.get(name);
}

// ============ B1: מיפוי groupId → class_id (UUID) מה-Supabase ============
// כולל הערה עם מזהה מבוגרים +1900 (עדיין בלי קישור, לשימוש עתידי)
window.CLASS_IDS = {
  // זוגי (שני/רביעי)
  'grp-rated-1200-1400': 'de3b6ad8-0980-4080-bd77-cd658644779b', // מדורגים 1200–1400 — שני/רביעי
  'grp-adv-1400-1600':   '3c8123ba-1667-4d19-be91-f8297e41a4b6', // מתקדמים 1400–1600 — שני/רביעי

  // חד-שבועיים
  'cls-kids-maya-sun':   'b366fea7-cb67-40f2-8de2-49aa3e4eac1f', // גן–א׳ מתחילים — ראשון (מאיה)
  'cls-girls-beg-tue':   '0c347cee-e870-4238-aa4e-97ed0b38b5a2', // חוג בנות מתחילות — שלישי
  'cls-girls-adv-tue':   '397afb6a-6d89-4ac5-91fb-bc02cb8b4731', // חוג בנות ממשיכות — שלישי
  'yaron_thu_kids_beg':  '8d1b5900-e8a8-4002-93f2-d236d3c7bcd2', // גן–א׳ מתחילים — חמישי (ירון)
  'yaron_thu_kids_cont': '7104d655-2c47-4da1-8724-1481a479a5af', // גן–א׳ ממשיכים — חמישי (ירון)

  // ראשון/שני מתקדמים/מדורגים
  'yaron_sun_rated1200': 'b4d9f361-1aa7-495c-b85b-803ddc1ea19d', // מדורגים 1200–1400 — ראשון (ירון)
  'vitali_mon_1600':     '7523e664-26ad-4cd1-acde-a4fb4152451c', // מתקדמים 1600–1800 — שני (ויטלי)

  // מבוגרים — ראשון
  'yaron_sun_adults':    '026437ff-49a4-45dd-a4c8-358563ac6e1a'  // חוג מבוגרים — ראשון (ירון)

  // מבוגרים +1900 — רביעי (אור ברונשטיין) — לשימוש עתידי:
  // 'adults_plus_1900_wed': '0fe6a281-5cf0-498d-a90e-2f39ec066d0c'
};

// ============ B2: מיפוי groupId+option → לינק עמוד משולם ============
// לינקים נשלפו מהקובץ "חוגים וקישורים.xlsx"
// הערה: בקבוצות שני/רביעי, יום שני ויום רביעי מפנים לאותו עמוד רכישה (לפי הקובץ)
window.PAYMENT_URLS = {
  // זוגי — מדורגים 1200–1400 (גלב)
  'grp-rated-1200-1400': {
    day1: 'https://meshulam.co.il/purchase?b=28c285802ed7b9e20144601019fd895d', // יום שני — 235 ₪
    day2: 'https://meshulam.co.il/purchase?b=28c285802ed7b9e20144601019fd895d', // יום רביעי — 235 ₪
    both: 'https://meshulam.co.il/purchase?b=779414282cc42ace3a7910b5519e3208'  // שני הימים — 355 ₪
  },
  // זוגי — מתקדמים 1400–1600 (גלב)
  'grp-adv-1400-1600': {
    day1: 'https://meshulam.co.il/purchase?b=ce976e44d99950191d8234a1c8bac33a', // יום שני — 235 ₪
    day2: 'https://meshulam.co.il/purchase?b=ce976e44d99950191d8234a1c8bac33a', // יום רביעי — 235 ₪
    both: 'https://meshulam.co.il/purchase?b=f4339424ec52b34e25dd1721d3b7661e'  // שני הימים — 355 ₪
  },

  // חד-שבועיים — 195 ₪
  'cls-kids-maya-sun':   { single: 'https://meshulam.co.il/purchase?b=b43a28b1f2c05646c5e306fdfa29ec76' }, // גן–א׳ מתחילים — ראשון (מאיה)
  'cls-girls-beg-tue':   { single: 'https://meshulam.co.il/purchase?b=90d7e8c8f069d0634ec636ee8dba0dd2' }, // בנות מתחילות — שלישי
  'cls-girls-adv-tue':   { single: 'https://meshulam.co.il/purchase?b=c62bbbba3b7d719a7d093420ac1faf7c' }, // בנות ממשיכות — שלישי
  'yaron_thu_kids_beg':  { single: 'https://meshulam.co.il/purchase?b=b6d2eec45b75673832ed360488f3bf5d' }, // גן–א׳ מתחילים — חמישי (ירון)

  // חד-שבועיים — 195 ₪ (המשך) + 235 ₪
  'yaron_thu_kids_cont': { single: 'https://meshulam.co.il/purchase?b=64cea8000708357f8146213729ac3bec' }, // גן–א׳ ממשיכים — חמישי (ירון)
  'yaron_sun_rated1200': { single: 'https://meshulam.co.il/purchase?b=df23ad22774cc219f5e0013115c96bc7' }, // מדורגים 1200–1400 — ראשון (ירון) — 235 ₪
  'vitali_mon_1600':     { single: 'https://meshulam.co.il/purchase?b=cf8f51bfa8f806f245abe3341dd2dfdd' }, // מתקדמים 1600–1800 — שני (ויטלי) — 235 ₪
  'yaron_sun_adults':    { single: 'https://meshulam.co.il/purchase?b=a7a4c5fc5deb10e52b05f5f11c666c91' }  // חוג מבוגרים — ראשון (ירון) — 235 ₪

  // חוג מבוגרים +1900 — רביעי (אור) — אין קישור כרגע בקובץ:
  // 'adults_plus_1900_wed': { single: 'https://meshulam.co.il/purchase?b=PASTE_WHEN_READY' }
};

// ================= B3: שמירה במסד + ניתוב למשולם =================
async function enrollAndRedirect(apiBase, payload, grpId, selected_option){
  // 1) שמירה במסד
  const r = await fetch(`${apiBase}/api/enroll`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const d = await r.json();
  if (!d.ok) throw new Error(d.error || 'שגיאה בהרשמה');

  // 2) ניתוב למשולם לפי מיפוי
  const url = (window.PAYMENT_URLS?.[grpId]?.[selected_option]) || (window.PAYMENT_URLS?.[grpId]?.single);
  if (!url) { alert('לא הוגדר לינק תשלום לקבוצה/אפשרות זו'); return; }
  location.href = url;
}

function hookRegisterSubmit(grp){
  const form = document.querySelector('#regForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const class_id = (window.CLASS_IDS || {})[grp.id];
    if (!class_id){ alert('לא הוגדר class_id לקבוצה זו'); return; }

    const full_name = (document.querySelector('#firstName')?.value + ' ' + document.querySelector('#lastName')?.value).trim();
    const email     = document.querySelector('#email')?.value || '';
    const phone     = document.querySelector('#phone')?.value || '';
    const notes     = document.querySelector('#notes')?.value || '';
    const selected_option = document.querySelector('#meetingOption')?.value || 'single'; // 'both' | 'day1' | 'day2' | 'single'

    if (!full_name) { alert('נא למלא שם מלא'); return; }

    try {
      const apiBase = location.origin;
      await enrollAndRedirect(apiBase, { class_id, full_name, email, phone, notes, selected_option }, grp.id, selected_option);
    } catch(err){
      console.error(err);
      alert(err.message || 'שגיאה בשליחה');
    }
  });
}

// ===== אתחול: לאחר יצירת הטופס בדף ההרשמה =====
document.addEventListener('DOMContentLoaded', () => {
  const groupId = getQueryParam('group');
  if (!groupId) return;
  const grp = { id: groupId };
  setTimeout(() => hookRegisterSubmit(grp), 0);
});
