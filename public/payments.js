// ===== Rishon Chess Club — registration save + redirect to Meshulam =====
function isValidPhone(value){
  const v = String(value||'').replace(/[^\d+]/g,'');
  // תומך ב-05XXXXXXXX וב-+9725XXXXXXX
  return /^05\d{8}$/.test(v) || /^\+9725\d{8}$/.test(v);
}
function isValidEmail(value){
  const v = String(value||'').trim();
  if(!v) return true; // אימייל אינו חובה; אם יש — נבדוק
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function getGroup(groupId){
  return window.RCC?.classGroups?.find(g => g.id === groupId);
}
function groupHasTwoSessions(grp){
  return Array.isArray(grp?.sessions) && grp.sessions.length >= 2;
}

async function guardAndPay(e){
  e && e.preventDefault && e.preventDefault();

  const groupId = (document.body.dataset.group || document.getElementById('groupKey')?.value || '').trim();
  const selEl   = document.getElementById('meetingOption');
  const grp     = getGroup(groupId);

  const first = document.getElementById('firstName')?.value?.trim() || '';
  const last  = document.getElementById('lastName')?.value?.trim()  || '';
  const phone = document.getElementById('phone')?.value?.trim()     || '';
  const email = document.getElementById('email')?.value?.trim()     || '';
  const notes = document.getElementById('notes')?.value?.trim()     || '';

  // 1) ולידציה בסיסית
  if(!first || !last){ alert('נא למלא שם פרטי ושם משפחה'); (first?document.getElementById('lastName'):document.getElementById('firstName'))?.focus(); return false; }
  if(!isValidPhone(phone)){ alert('מספר טלפון לא תקין'); document.getElementById('phone')?.focus(); return false; }
  if(!isValidEmail(email)){ alert('אימייל לא תקין'); document.getElementById('email')?.focus(); return false; }

  // 2) קביעת אופציה: דו-יומי דורש בחירה; חד-יומי -> single
  let option = '';
  if (groupHasTwoSessions(grp)) {
    option = selEl?.value || '';
    if(!option){ alert('נא לבחור ימי מפגש לפני מעבר לתשלום'); selEl?.focus(); return false; }
  } else {
    option = 'single';
  }

  // 3) ניסיון שמירה בצד שרת (נשתמש ב-/api/register שתואם לפורמט הזה)
  try{
    const r = await fetch('/api/register', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        groupId,
        selected_option: option,
        first_name: first,
        last_name:  last,
        phone, email, notes
      })
    });
    // אם שרת יחזיר קישור תשלום – נשתמש בו, אחרת ניפול לפולבק
    if(r.ok){
      const data = await r.json().catch(()=> ({}));
      if(data && data.paymentUrl){
        location.href = data.paymentUrl;
        return true;
      }
    }
  }catch(err){
    // ניפול לפולבק
  }

  // 4) פולבק Meshulam מה-data המקומי
  if(!grp){
    alert('לא נמצאה קבוצה עבור התשלום.'); return false;
  }
  let url = grp.meshulam || null;
  if(grp.meshulamOptions){
    url = option==='day1' ? grp.meshulamOptions.day1
        : option==='day2' ? grp.meshulamOptions.day2
        : grp.meshulamOptions.both;
  }
  if(!url || url==='#'){ alert('קישור התשלום יפורסם בהמשך.'); return false; }

  location.href = url;
  return true;
}
