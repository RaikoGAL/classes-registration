import express from 'express';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pg from 'pg';
import fetch from 'node-fetch';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import cors from 'cors';
dotenv.config();

const app = express();
app.use(cors());
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');

// --- auth middleware ---
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

// --- healthcheck ---
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true, db: 'up' });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// --- admin: create user (one-time) ---
app.post('/api/admin/create-user', async (req, res) => {
  const { email, phone, password, role = 'admin' } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'email & password required' });
  const hash = await bcrypt.hash(password, 12);
  await pool.query(
    'INSERT INTO users (email, phone, password_hash, role) VALUES ($1,$2,$3,$4) ON CONFLICT (email) DO NOTHING',
    [email, phone || null, hash, role]
  );
  res.json({ ok: true });
});

// --- login ---
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body || {};
  const r = await pool.query('SELECT id, email, password_hash, role FROM users WHERE email=$1', [email]);
  if (!r.rowCount) return res.status(401).json({ error: 'bad credentials' });
  const u = r.rows[0];
  const ok = await bcrypt.compare(password, u.password_hash);
  if (!ok) return res.status(401).json({ error: 'bad credentials' });
  const token = jwt.sign({ uid: u.id, role: u.role }, JWT_SECRET, { expiresIn: '12h' });
  res.json({ token });
});

// --- enroll ---
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

// --- create payment (Grow / Meshulam) ---
app.post('/api/payments/create', async (req, res) => {
  const { enrollId } = req.body || {};
  if (!enrollId) return res.status(400).json({ error: 'enrollId required' });

  const er = await pool.query(
    `SELECT e.id, e.full_name, e.email, e.phone, e.selected_option,
            c.name,
            co.price
     FROM enrollments e
     JOIN classes c        ON c.id = e.class_id
     JOIN class_options co ON co.class_id = e.class_id
                          AND co.option_code = COALESCE(e.selected_option, 'single')
     WHERE e.id=$1`,
    [enrollId]
  );
  if (!er.rowCount) return res.status(404).json({ error: 'enrollment not found' });
  const e = er.rows[0];
  const sumILS = Number(e.price).toFixed(2);

  const params = new URLSearchParams({
    userId: process.env.GROW_USER_ID ?? '',
    pageCode: process.env.GROW_PAGE_CODE ?? '',
    apiKey: process.env.GROW_API_KEY ?? '',
    sum: sumILS,
    description: `Enrollment ${e.id}`,
    successUrl: process.env.SUCCESS_URL ?? '',
    cancelUrl: process.env.CANCEL_URL ?? '',
    notifyUrl: process.env.NOTIFY_URL ?? '',
    customerName: e.full_name,
    email: e.email || '',
    phone: e.phone || ''
  });

  const resp = await fetch(process.env.GROW_CREATE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params
  });

  const data = await resp.json().catch(async () => ({ raw: await resp.text() }));
  const txId = data?.data?.transactionId || data?.transactionId || null;
  if (txId) {
    await pool.query('UPDATE enrollments SET payment_tx_id=$1 WHERE id=$2', [txId, enrollId]);
  }
  res.json(data);
});

// --- webhook (notifyUrl) ---
app.post('/api/payments/webhook', async (req, res) => {
  const payload = req.body || {};

  await pool.query(
    'INSERT INTO payment_events (provider, tx_id, raw_payload) VALUES ($1,$2,$3)',
    ['meshulam', payload.transactionId || null, JSON.stringify(payload)]
  );

  if (payload.transactionId && payload.status) {
    const status = (payload.status === 'approved' || payload.status === 'paid') ? 'paid'
                : (payload.status === 'failed' ? 'failed' : 'pending');
    await pool.query(
      'UPDATE enrollments SET payment_status=$1, payment_ref=$2 WHERE payment_tx_id=$3',
      [status, payload.asmachta || payload.reference || null, payload.transactionId]
    );
  }

  try {
    const approveParams = new URLSearchParams({
      pageCode: process.env.GROW_PAGE_CODE ?? '',
      apiKey: process.env.GROW_API_KEY ?? '',
      ...(Object.fromEntries(Object.entries(payload).map(([k,v]) => [k, String(v ?? '')])))
    });
    await fetch(process.env.GROW_APPROVE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: approveParams
    });
    await pool.query(
      'UPDATE payment_events SET approved=true WHERE provider=$1 AND tx_id=$2',
      ['meshulam', payload.transactionId || null]
    );
  } catch (e) {
    console.error('approveTransaction failed', e);
  }

  res.status(200).send('OK');
});

// --- admin list enrollments ---
app.get('/api/admin/enrollments', auth, async (req, res) => {
  const r = await pool.query(
    `SELECT e.id, e.full_name, e.email, e.phone, e.payment_status, e.payment_ref, e.selected_option,
            c.name AS class_name
     FROM enrollments e JOIN classes c ON c.id=e.class_id
     ORDER BY e.id DESC`
  );
  res.json(r.rows);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('listening on', PORT));
