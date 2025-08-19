// ================= Utils =================
function getQueryParam(name) {
  const url = new URL(window.location.href);
  return url.searchParams.get(name);
}

// ============ B1: מיפוי groupId → class_id (UUID) מה-Supabase ============
window.CLASS_IDS = {
  // זוגי (שני/רביעי)
  'grp-rated-1200-1400': 'de3b6ad8-0980-4080-bd77-cd658644779b',
  'grp-adv-1400-1600':   '3c8123ba-1667-4d19-be91-f8297e41a4b6',

  // חד-שבועיים
  'cls-kids-maya-sun':   'b366fea7-cb67-40f2-8de2-49aa3e4eac1f',
  'cls-girls-beg-tue':   '0c347cee-e870-4238-aa4e-97ed0b38b5a2',
  'cls-girls-adv-tue':   '397afb6a-6d89-4ac5-91fb-bc02cb8b4731',
  'yaron_thu_kids_beg':  '8d1b5900-e8a8-4002-93f2-d236d3c7bcd2',
  'yaron_thu_kids_cont': '7104d655-2c47-4da1-8724-1481a479a5af',

  // ראשון/שני
  'yaron_sun_rated1200': 'b4d9f361-1aa7-495c-b85b-803ddc1ea19d',
  'vitali_mon_1600':     '7523e664-26ad-4cd1-acde-a4fb4152451c',

  // מבוגרים — ראשון
  'yaron_sun_adults':    '026437ff-49a4-45dd-a4c8-358563ac6e1a'

  // מבוגרים +1900 — רביעי (אור) — לשימוש עתידי:
  // 'adults_plus_1900_wed': '0fe6a281-5cf0-498d-a90e-2f39ec066d0c'
};

// ============ B2: מיפוי groupId+option → לינק עמוד משולם ============
window.PAYMENT_URLS = {
  // זוגי — מדורגים 1200–1400
  'grp-rated-1200-1400': {
    day1: 'https://meshulam.co.il/purchase?b=28c285802ed7b9e20144601019fd895d',
    day2: 'https://meshulam.co.il/purchase?b=28c285802ed7b9e20144601019fd895d',
    both: 'https://meshulam.co.il/purchase?b=779414282cc42ace3a7910b5519e3208'
  },
  // זוגי — מתקדמים 1400–1600
  'grp-adv-1400-1600': {
    day1: 'https://meshulam.co.il/purchase?b=ce976e44d99950191d8234a1c8bac33a',
    day2: 'https://meshulam.co.il/purchase?b=ce976e44d99950191d8234a1c8bac33a',
    both: 'https://meshulam.co.il/purchase?b=f4339424ec52b34e25dd1721d3b7661e'
  },

  // חד-שבועיים
  'cls-kids-maya-sun':   { single: 'https://meshulam.co.il/purchase?b=b43a28b1f2c05646c5e306fdfa29ec76' },
  'cls-girls-beg-tue':   { single: 'https://meshulam.co.il/purchase?b=90d7e8c8f069d0634ec636ee8dba0dd2' },
  'cls-girls-adv-tue':   { single: 'https://meshulam.co.il/purchase?b=c62bbbba3b7d719a7d093420ac1faf7c' },
  'yaron_thu_kids_beg':  { single: 'https://meshulam.co.il/purchase?b=b6d2eec45b75673832ed360488f3bf5d' },
  'yaron_thu_kids_cont': { single: 'https://meshulam.co.il/purchase?b=64cea8000708357f8146213729ac3bec' },

  // 235 ₪ single
  'yaron_sun_rated1200': { single: 'https://meshulam.co.il/purchase?b=df23ad22774cc219f5e0013115c96bc7' },
  'vitali_mon_1600':     { single: 'https://meshulam.co.il/purchase?b=cf8f51bfa8f806f245abe3341dd2dfdd' },
  'yaron_sun_adults':    { single: 'https://meshulam.co.il/purchase?b=a7a4c5fc5deb10e52b05f5f11c666c91' }

  // מבוגרים +1900 — רביעי (אור) — כשיושלם:
  // 'adults_plus_1900_wed': { single: 'https://meshulam.co.il/purchase?b=PASTE_WHEN_READY' }
};

// ================= B3: שמירה במסד + ניתוב למשולם =================
async function enrollAndRedirect(apiBase, payload, grpId, selected_option){
  const r = await fetch(`${apiBase}/api/enroll`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const d = await r.json();
  if (!d.ok) throw new Error(d.error || 'שגיאה בהרשמה');

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
    const selected_option = document.querySelector('#meetingOption')?.value || 'single';

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

// טוענים את ה-hook רק בעמוד ההרשמה
document.addEventListener('DOMContentLoaded', () => {
  const groupId = getQueryParam('group');
  if (!groupId) return;
  hookRegisterSubmit({ id: groupId });
});
