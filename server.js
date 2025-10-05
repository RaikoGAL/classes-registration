import express from "express";
import crypto from "crypto";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import pg from "pg";
import bodyParser from "body-parser";
import dotenv from "dotenv";
// import cors from "cors"; // לא צריך אם הכל אותו דומיין
dotenv.config();

const app = express();
// app.use(cors());
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// CSP: מאפשר סקריפטים מקומיים (ול-CDN שביקשת), וחיבורים רק לדומיין עצמו
app.use((req, res, next) => {
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; " +
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data: https:; " +
      "connect-src 'self'; " + // fetch לאותו origin
      "font-src 'self' data:; " +
      "frame-ancestors 'none'; " +
      "base-uri 'self';"
  );
  next();
});

const { Pool } = pg;
const useSSL = !!(process.env.RENDER || process.env.NODE_ENV === "production");

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

const JWT_SECRET =
  process.env.JWT_SECRET || crypto.randomBytes(32).toString("hex");

/* ===== Guards ===== */

// Bearer JWT (optional)
function auth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.replace("Bearer ", "");
  try {
    const data = jwt.verify(token, JWT_SECRET);
    req.user = data;
    next();
  } catch {
    res.status(401).json({ error: "unauthorized" });
  }
}

// Admin: allow X-Admin-Key OR JWT
function adminGuard(req, res, next) {
  const sent = String(req.headers["x-admin-key"] || "").trim();
  const expected = String(process.env.ADMIN_KEY || "").trim();

  try {
    if (
      expected &&
      sent &&
      crypto.timingSafeEqual(Buffer.from(sent), Buffer.from(expected))
    ) {
      return next();
    }
  } catch {
    /* fall through */
  }

  if (expected && sent && sent === expected) return next();

  const header = req.headers.authorization || "";
  const token = header.replace("Bearer ", "");
  try {
    if (token) {
      const data = jwt.verify(token, JWT_SECRET);
      req.user = data;
      return next();
    }
  } catch {
    /* ignore */
  }

  return res.status(401).json({ error: "unauthorized" });
}

/* ===== Health ===== */
app.get("/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ ok: true, db: "up" });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

/* ===== Auth (optional) ===== */
app.post("/api/admin/create-user", async (req, res) => {
  const { email, phone, password, role = "admin" } = req.body || {};
  if (!email || !password)
    return res.status(400).json({ error: "email and password required" });
  const hash = await bcrypt.hash(password, 12);
  await pool.query(
    `INSERT INTO users (email, phone, password_hash, role)
     VALUES ($1,$2,$3,$4) ON CONFLICT (email) DO NOTHING`,
    [email, phone || null, hash, role]
  );
  res.json({ ok: true });
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body || {};
  const r = await pool.query(
    "SELECT id, email, password_hash, role FROM users WHERE email=$1",
    [email]
  );
  if (!r.rowCount) return res.status(401).json({ error: "bad credentials" });
  const u = r.rows[0];
  const ok = await bcrypt.compare(password, u.password_hash);
  if (!ok) return res.status(401).json({ error: "bad credentials" });
  const token = jwt.sign({ uid: u.id, role: u.role }, JWT_SECRET, {
    expiresIn: "12h",
  });
  res.json({ token });
});

/* ===== Helpers: insert with new/old schema ===== */
async function insertEnrollmentSmart({
  class_id,
  full_name,
  email,
  phone,
  notes,
  selected_option,
}) {
  // Insert into the new schema with full_name only
  const q = `
    INSERT INTO enrollments (class_id, full_name, email, phone, notes, selected_option)
    VALUES ($1,$2,$3,$4,$5,$6)
    RETURNING id
  `;
  const r = await pool.query(q, [
    class_id,
    full_name,
    email,
    phone,
    notes,
    selected_option,
  ]);
  return r.rows[0].id;
}

/* ===== Enroll / Register ===== */

// פרונט חדש: first_name/last_name + selected_option
app.post("/api/register", async (req, res) => {
  const b = req.body || {};
  const class_id = b.class_id || null;
  const full_name = (b.full_name || "").trim();
  const email = b.email || null;
  const phone = b.phone || null;
  const notes = b.notes || null;
  let selected_option = b.selected_option || null;

  if (!class_id || !full_name) {
    return res.status(400).json({ error: "missing class_id or full_name" });
  }
  if (!["day1", "day2", "both", "single", null].includes(selected_option)) {
    selected_option = null;
  }

  try {
    const id = await insertEnrollmentSmart({
      class_id,
      full_name,
      email,
      phone,
      notes,
      selected_option,
    });
    return res.status(201).json({ ok: true, enrollId: id });
  } catch (e) {
    console.error("register insert failed", e);
    return res.status(500).json({ error: "db_insert_failed" });
  }
});

// תאימות: אם יש עדיין קריאות ישנות ל-/api/enroll נשמור אותו כאליאס
app.post("/api/enroll", async (req, res) => {
  const b = req.body || {};
  const class_id = b.groupId || b.class_id || null;
  const first_name = (b.first_name || "").trim();
  const last_name = (b.last_name || "").trim();
  const full_name = (b.full_name || "").trim();
  const email = b.email || null;
  const phone = b.phone || null;
  const notes = b.notes || null;
  let selected_option = b.selected_option || null;

  if (!class_id || (!first_name && !last_name && !full_name)) {
    return res.status(400).json({ error: "missing class_id or name" });
  }
  if (!["day1", "day2", "both", "single", null].includes(selected_option)) {
    selected_option = null;
  }

  try {
    // Always combine first_name and last_name into full_name
    const combined_full_name =
      full_name || [first_name, last_name].filter(Boolean).join(" ").trim();

    const id = await insertEnrollmentSmart({
      class_id,
      full_name: combined_full_name,
      email,
      phone,
      notes,
      selected_option,
    });
    return res.status(201).json({ ok: true, enrollId: id });
  } catch (e) {
    console.error("enroll insert failed", e);
    return res.status(500).json({ error: "db_insert_failed" });
  }
});

/* ===== Admin API ===== */
app.get("/api/admin/enrollments", adminGuard, async (_req, res) => {
  const r = await pool.query(`
    SELECT
      e.id,
      COALESCE(e.full_name, trim(concat_ws(' ', e.first_name, e.last_name))) AS full_name,
      e.email,
      e.phone,
      e.payment_status,
      e.payment_ref,
      e.selected_option,
      e.created_at,
      COALESCE(c.name, e.class_id::text) AS class_name
    FROM enrollments e
    LEFT JOIN classes c
      ON e.class_id::text = c.id::text
    ORDER BY e.created_at DESC NULLS LAST, e.id DESC
  `);
  res.json(r.rows);
});

app.post("/api/admin/enrollments/:id/status", adminGuard, async (req, res) => {
  const id = Number(req.params.id);
  const { status, ref } = req.body || {};
  if (!id || !status) {
    return res.status(400).json({ error: "missing id or status" });
  }
  await pool.query(
    `UPDATE enrollments
     SET payment_status=$2, payment_ref=COALESCE($3, payment_ref)
     WHERE id=$1`,
    [id, status, ref || null]
  );
  res.json({ ok: true });
});

// Backward compatibility (נשאר כפי שהוא)
app.post("/api/admin/mark-paid", adminGuard, async (req, res) => {
  const { id, ref } = req.body || {};
  if (!id) return res.status(400).json({ error: "missing id" });
  await pool.query(
    `UPDATE enrollments
     SET payment_status='paid', payment_ref=COALESCE($2,'Manual')
     WHERE id=$1`,
    [id, ref || null]
  );
  res.json({ ok: true });
});

app.post("/api/admin/mark-status", adminGuard, async (req, res) => {
  const { id, status, ref } = req.body || {};
  if (!id || !status) {
    return res.status(400).json({ error: "missing id or status" });
  }
  await pool.query(
    `UPDATE enrollments
     SET payment_status=$2, payment_ref=COALESCE($3, payment_ref)
     WHERE id=$1`,
    [id, status, ref || null]
  );
  res.json({ ok: true });
});

/* ===== Start ===== */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("listening on", PORT));
