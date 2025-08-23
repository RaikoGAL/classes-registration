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
app.use(cors());
// הגשה סטטית (אם הקבצים אצלך ב-root אפשר להוסיף גם את השורה הבאה):
// app.use(express.static('.'));
// אם אתה מגיש מתוך "public" השאר ככה:
app.use(express.static('public'));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const { Pool } = pg;

// שימוש ב-SSL בפרודקשן (Render) בלי אימות CA כדי למנוע SELF_SIGNED_CERT_IN_CHAIN
const useSSL = !!(process.env.RENDER || process.env.NODE_ENV === 'production');

const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: useSSL ? { rejectUnauthorized: false } : false,
      }
    : {
        host: process.env.PGHOST,
        port: process.env.PGPORT ? Number(process.env.PGPORT) : undefined,
        database: process.env.PGDATABASE,
        user: process.env.PGUSER,
        password: process.env.PGPASSWORD,
        ssl: useSSL ? { rejectUnauthorized: false } : false,
      }
);


const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');

/* ========= Guards ========= */

// Bearer JWT (כפי שהיה)
function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.replace('Bearer ', '');
  try {
    const data = jwt.verify(token, JWT_SECRET);
    req.user = data;
    next();
  } catch {
    res.status(401).json({ error: 'unauthorized' });
  }
}

// Admin guard: מאפשר או X-Admin-Key או JWT
function adminGuard(req, res, next) {
  const sent = String(req.headers['x-admin-key'] || '').trim();
  const expected = String(process.env.ADMIN_KEY || '').trim();

  // נסיון timing-safe (נופל אם אורכים שונים)
  try {
    if (expected && sent &&
        crypto.timingSafeEqual(Buffer.from(sent), Buffer.from(expected))) {
      return next();
    }
  } catch (_) { /* ניפול להשוואה רגילה */ }

  if (expected && sent && sent === expected) return next();

  // תאימות: אם יש JWT תקף – גם טוב
  const header = req.headers.authorization || '';
  const token = header.replace('Bearer ', '');
  try {
    if (token) {
      const data = jwt.verify(token, JWT_SECRET);
      req.user = data;
      return next();
    }
  } catch { /* ignore */ }

  return res.status(401).json({ error: 'unauthorized' });
}

/* ========= Health ========= */

app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true, db: 'up' });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

/* ========= Auth (אופציונלי לניהול באמצעות משתמש/סיסמה) ========= */

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

/* ========= Enroll ========= */

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

/* ========= Admin API ========= */

// רשימת הרשמות — כעת מקבל X-Admin-Key או JWT
app.get('/api/admin/enrollments', adminGuard, async (_req, res) => {
  const r = await pool.query(
    `SELECT e.id, e.full_name, e.email, e.phone, e.payment_status, e.payment_ref,
            e.selected_option, e.created_at, c.name AS class_name
     FROM enrollments e
     JOIN classes c ON c.id=e.class_id
     ORDER BY e.created_at DESC NULLS LAST, e.id DESC`
  );
  res.json(r.rows);
});

// עדכון סטטוס בנתיב התואם לפרונט: POST /api/admin/enrollments/:id/status
app.post('/api/admin/enrollments/:id/status', adminGuard, async (req, res) => {
  const id = Number(req.params.id);
  const { status, ref } = req.body || {};
  if (!id || !status) return res.status(400).json({ error: 'missing id/status' });
  await pool.query(
    `UPDATE enrollments
     SET payment_status=$2, payment_ref=COALESCE($3, payment_ref)
     WHERE id=$1`,
    [id, status, ref || null]
  );
  res.json({ ok: true });
});

// שימור תאימות לנתיבים הישנים שלך (אם משהו משתמש בהם)
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

/* ========= Start ========= */

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('listening on', PORT));
