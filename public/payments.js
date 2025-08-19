// ===== Rishon Chess Club — registration save + redirect to Meshulam =====
async function guardAndPay(e){
  e && e.preventDefault && e.preventDefault();

  const groupId = (document.body.dataset.group || document.getElementById('groupKey')?.value || '').trim();
  const option  = document.getElementById('meetingOption')?.value || '';
  if(!option){ alert('נא לבחור ימי מפגש לפני מעבר לתשלום'); document.getElementById('meetingOption')?.focus(); return false; }

  // איסוף שדות טופס
  const payload = {
    groupId,
    selected_option: option,
    first_name: document.getElementById('firstName')?.value || '',
    last_name:  document.getElementById('lastName')?.value || '',
    birth_date: document.getElementById('birthDate')?.value || '',
    parent_name:document.getElementById('parentName')?.value || '',
    phone:      document.getElementById('phone')?.value || '',
    email:      document.getElementById('email')?.value || '',
    notes:      document.getElementById('notes')?.value || ''
  };

  // 1) ניסיון שמירה בצד שרת שיחזיר קישור תשלום (מומלץ)
  try{
    const r = await fetch('/api/register', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify(payload)
    });
    if(r.ok){
      const data = await r.json();
      if(data && data.paymentUrl){
        location.href = data.paymentUrl; return true;
      }
    }
  }catch(err){
    // ניפול לפתרון 2
  }

  // 2) פולבק: לפתור קישור Meshulam בצד לקוח לפי מיפוי הקבוצה
  const grp = window.RCC?.classGroups?.find(x=>x.id===groupId);
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
