import express from 'express';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pg from 'pg';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();

const app = express();

// אפשר להשאיר פתוח, או להגביל לדומיין שלך:
// app.use(cors({ origin: ['https://classes-registration.onrender.com'] }));
app.use(cors());

app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const { Pool } = pg;

// חיבור ל-Supabase (Pooler) עם SSL סלחני
const pool = new Pool({
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT || 6543),
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  ssl: { rejectUnauthorized: false }
});

const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');

/* -------------------- Auth -------------------- */

// בדיקת JWT (נשמרת לתאימות)
function jwtGuard(req) {
  const header = req.headers.authorization || '';
  const token = header.replace('Bearer ', '');
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

// מגן אדמין: או ADMIN_KEY דרך X-Admin-Key או JWT תקין
function adminGuard(req, res, next) {
  const byKey = process.env.ADMIN_KEY && req.headers['x-admin-key'] === process.env.ADMIN_KEY;
  const byJwt = !!jwtGuard(req);
  if (byKey || byJwt) return next();
  return res.status(401).json({ error: 'unauthorized' });
}

/* -------------------- Health -------------------- */

app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true, db: 'up' });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

/* --------- Admin user (אופציונלי) + JWT login --------- */

app.post('/api/admin/create-user', async (req, res) => {
  const { email, phone, password, role = 'admin' } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'email & password required' });
  const hash = await bcrypt.hash(password, 12);
  await pool.query(
    `INSERT INTO users (email, phone, password_hash, role)
     VALUES ($1,$2,$3,$4) ON CONFLICT (email) DO NOTHING`,
    [email, phone || null, hash, role]
  );
  res.json({ ok: true });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body || {};
  const r = await pool.query(
    'SELECT id, email, password_hash, role FROM users WHERE email=$1',
    [email]
  );
  if (!r.rowCount) return res.status(401).json({ error: 'bad credentials' });
  const u = r.rows[0];
  const ok = await bcrypt.compare(password, u.password_hash);
  if (!ok) return res.status(401).json({ error: 'bad credentials' });
  const token = jwt.sign({ uid: u.id, role: u.role }, JWT_SECRET, { expiresIn: '12h' });
  res.json({ token });
});

/* -------------------- Enroll -------------------- */

app.post('/api/enroll', async (req, res) => {
  const { class_id, full_name, email, phone, notes, selected_option } = req.body || {};
  if (!class_id || !full_name) return res.status(400).json({ error: 'missing fields' });
  const { rows } = await pool.query(
    `INSERT INTO enrollments (class_id, full_name, email, phone, notes, selected_option)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
    [class_id, full_name, email || null, phone || null, notes || null, selected_option || null]
  );
  res.json({ ok: true, enrollId: rows[0].id });
});

/* --------------- Admin helpers (filters) --------------- */

function buildEnrollmentsFilter(qs) {
  const where = [];
  const args = [];

  // חיפוש חופשי ב-שם/טלפון/מייל
  if (qs.q) {
    args.push(`%${qs.q}%`);
    where.push(`(e.full_name ILIKE $${args.length} OR e.email ILIKE $${args.length} OR e.phone ILIKE $${args.length})`);
  }

  // סטטוס: אפשר אחד, או רשימת ערכים מופרדת בפסיקים
  if (qs.status) {
    const arr = String(qs.status)
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    if (arr.length === 1) {
      args.push(arr[0]);
      where.push(`e.payment_status = $${args.length}`);
    } else if (arr.length > 1) {
      args.push(arr);
      where.push(`e.payment_status = ANY($${args.length})`);
    }
  }

  // class_id: אחד או רשימה
  if (qs.class_id) {
    const arr = String(qs.class_id)
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    if (arr.length === 1) {
      args.push(arr[0]);
      where.push(`e.class_id = $${args.length}`);
    } else if (arr.length > 1) {
      args.push(arr);
      where.push(`e.class_id = ANY($${args.length})`);
    }
  }

  // טווח תאריכים לפי created_at (צפוי ערכי ISO yyyy-mm-dd או datetime)
  if (qs.from) {
    args.push(new Date(qs.from));
    where.push(`e.created_at >= $${args.length}`);
  }
  if (qs.to) {
    // אם הגיע תאריך ללא שעה – נוסיף יום כדי שיהיה inclusive
    const to = new Date(qs.to);
    if (!qs.to.includes('T')) to.setDate(to.getDate() + 1);
    args.push(to);
    where.push(`e.created_at < $${args.length}`);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  // מיון: ברירת מחדל אחרונים תחילה
  const orderSql = `ORDER BY e.created_at DESC NULLS LAST, e.id DESC`;

  // עימוד
  let limit = Math.min(Math.max(parseInt(qs.limit || '200', 10), 1), 1000);
  let offset = Math.max(parseInt(qs.offset || '0', 10), 0);
  args.push(limit);
  const limitSql = `LIMIT $${args.length}`;
  args.push(offset);
  const offsetSql = `OFFSET $${args.length}`;

  return { whereSql, orderSql, limitSql, offsetSql, args };
}

// המרת שורות ל-CSV
function toCsv(rows) {
  const esc = v => {
    if (v == null) return '';
    const s = String(v);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const headers = [
    'id',
    'created_at',
    'full_name',
    'email',
    'phone',
    'class_name',
    'selected_option',
    'payment_status',
    'payment_ref'
  ];
  const lines = [headers.join(',')];
  for (const r of rows) {
    lines.push([
      r.id,
      r.created_at?.toISOString?.() || r.created_at,
      r.full_name,
      r.email,
      r.phone,
      r.class_name,
      r.selected_option,
      r.payment_status,
      r.payment_ref
    ].map(esc).join(','));
  }
  return lines.join('\n');
}

/* -------------------- Admin APIs -------------------- */

// רשימת כיתות (לדרופדאון) — מוגן
app.get('/api/admin/classes', adminGuard, async (_req, res) => {
  const r = await pool.query(
    `SELECT id, name
     FROM classes
     WHERE is_active IS DISTINCT FROM false
     ORDER BY name ASC`
  );
  res.json(r.rows);
});

// רשימת הרשמות עם סינון/עימוד — מוגן
app.get('/api/admin/enrollments', adminGuard, async (req, res) => {
  const { whereSql, orderSql, limitSql, offsetSql, args } = buildEnrollmentsFilter(req.query);
  const sql = `
    SELECT e.id, e.created_at, e.full_name, e.email, e.phone,
           e.selected_option, e.payment_status, e.payment_ref,
           c.name AS class_name
    FROM enrollments e
    JOIN classes c ON c.id = e.class_id
    ${whereSql}
    ${orderSql}
    ${limitSql} ${offsetSql}
  `;
  const r = await pool.query(sql, args);
  res.json(r.rows);
});

// ייצוא CSV — אותם סינונים — מוגן
app.get('/api/admin/enrollments.csv', adminGuard, async (req, res) => {
  const { whereSql, orderSql, args } = buildEnrollmentsFilter({ ...req.query, limit: 100000, offset: 0 });
  const sql = `
    SELECT e.id, e.created_at, e.full_name, e.email, e.phone,
           e.selected_option, e.payment_status, e.payment_ref,
           c.name AS class_name
    FROM enrollments e
    JOIN classes c ON c.id = e.class_id
    ${whereSql}
    ${orderSql}
  `;
  const r = await pool.query(sql, args);
  const csv = toCsv(r.rows);
  const stamp = new Date().toISOString().replace(/[:T\-]/g, '').slice(0, 12);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="enrollments_${stamp}.csv"`);
  res.send(csv);
});

// עדכון סטטוס ידני תואם admin.html — מוגן
app.post('/api/admin/enrollments/:id/status', adminGuard, async (req, res) => {
  const { id } = req.params;
  const { status, payment_ref } = req.body || {};
  const allowed = new Set(['pending', 'paid', 'failed', 'canceled']);
  if (!allowed.has(status)) return res.status(400).json({ error: 'bad status' });

  await pool.query(
    'UPDATE enrollments SET payment_status=$1, payment_ref=COALESCE($2, payment_ref) WHERE id=$3',
    [status, payment_ref || null, id]
  );
  res.json({ ok: true });
});

/* ----- תאימות אחורה לנתיבים הישנים (JWT או ADMIN_KEY) ----- */

app.post('/api/admin/mark-paid', adminGuard, async (req, res) => {
  const { id, ref } = req.body || {};
  if (!id) return res.status(400).json({ error: 'missing id' });
  await pool.query(
    `UPDATE enrollments
     SET payment_status='paid', payment_ref=COALESCE($2,'Manual')
     WHERE id=$1`,
    [id, ref || null]
  );
  res.json({ ok: true });
});

app.post('/api/admin/mark-status', adminGuard, async (req, res) => {
  const { id, status, ref } = req.body || {};
  if (!id || !status) return res.status(400).json({ error: 'missing id/status' });
  await pool.query(
    `UPDATE enrollments
     SET payment_status=$2, payment_ref=COALESCE($3, payment_ref)
     WHERE id=$1`,
    [id, status, ref || null]
  );
  res.json({ ok: true });
});

/* -------------------- Start -------------------- */

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('listening on', PORT));
