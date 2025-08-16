/* payments.js — שמירה במסד ואז הפניה למשולם.
   מצפה ל-window.CLASS_IDS ול-window.PAYMENT_URLS שמוגדרים ב-script.js
*/

const apiBase = location.origin;
const getGroup = () => new URL(location.href).searchParams.get('group') || '';

function $pick(selectors) {
  for (const s of selectors) {
    const el = document.querySelector(s);
    if (el && typeof el.value !== 'undefined') return el.value;
  }
  return '';
}

async function enrollAndRedirect(payload, grpId, selected_option) {
  const r = await fetch(`${apiBase}/api/enroll`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const d = await r.json();
  if (!d.ok) throw new Error(d.error || 'שגיאה בהרשמה');

  const url =
    (window.PAYMENT_URLS?.[grpId]?.[selected_option]) ||
    (window.PAYMENT_URLS?.[grpId]?.single);

  if (!url) { alert('לא הוגדר לינק תשלום לקבוצה/אפשרות זו'); return; }
  location.href = url;
}

/** פונקציה גלובלית שמחוברת לכפתור דרך onclick */
window.saveThenPay = async function saveThenPay(e) {
  if (e) { e.preventDefault(); e.stopImmediatePropagation(); }

  const grpId = getGroup();
  if (!grpId) { alert('קישור שגוי (חסר group)'); return false; }

  const class_id = window.CLASS_IDS?.[grpId];
  if (!class_id) { alert('לא הוגדר class_id לקבוצה זו'); return false; }

  // איסוף שדות (עם fallbacks לשמות שונים)
  const first = $pick(['#firstName','[name="firstName"]','[name="first_name"]','#first_name']);
  const last  = $pick(['#lastName','[name="lastName"]','[name="last_name"]','#last_name']);
  const full_name = `${(first||'').trim()} ${(last||'').trim()}`.trim()
                 || $pick(['#fullName','[name="fullName"]','[name="full_name"]']);

  const email = $pick(['#email','[name="email"]']);
  const phone = $pick(['#phone','[name="phone"]','[name="mobile"]']);
  const notes = $pick(['#notes','[name="notes"]']);

  let selected_option = $pick(['#meetingOption','[name="meetingOption"]']);
  if (!selected_option) selected_option = 'single';

  if (!full_name) { alert('נא למלא שם מלא'); return false; }

  try {
    await enrollAndRedirect(
      { class_id, full_name, email, phone, notes, selected_option },
      grpId,
      selected_option
    );
  } catch (err) {
    console.error(err);
    alert(err.message || 'שגיאה בשליחה');
  }
  return false;
};

/* אופציונלי: נחבר גם submit/לחיצות בצורה גנרית — אבל ה-onclick כבר פותר הכל */
document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('#regForm') || document.querySelector('form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      window.saveThenPay(e);
    });
  }
  document
    .querySelectorAll('[data-pay], .pay-now, .go-pay, a[href*="meshulam"], button.pay, .btn.primary')
    .forEach(el => el.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      window.saveThenPay(e);
    }, true));
});
