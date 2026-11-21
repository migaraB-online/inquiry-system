const express = require('express');
const { z } = require('zod');
const pool = require('./db');
const { requireAuth } = require('./auth');

const router = express.Router();
router.use(requireAuth); // මේ router එකේ හැම route එකක්ම login ඕන

const STATUSES = ['New', 'In Progress', 'Resolved'];

// Allowed status transitions
const TRANSITIONS = {
  'New': ['In Progress'],
  'In Progress': ['Resolved'],
  'Resolved': ['In Progress'],
};

const createSchema = z.object({
  customer_name: z.string().trim().min(1, 'Customer name is required').max(100),
  customer_contact: z.string().trim().min(3, 'Contact is required').max(255),
  subject: z.string().trim().min(1, 'Subject is required').max(200),
  description: z.string().trim().min(1, 'Description is required').max(5000),
});

const statusSchema = z.object({
  status: z.enum(STATUSES),
  updated_at: z.string().min(1, 'updated_at is required'),
});

function validationError(res, zodError) {
  const fields = {};
  for (const issue of zodError.issues) {
    fields[issue.path[0] ?? 'form'] = issue.message;
  }
  return res.status(400).json({ error: 'Validation failed', fields });
}

function parseId(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: 'Invalid inquiry id' });
    return null;
  }
  return id;
}

// CREATE
router.post('/', async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return validationError(res, parsed.error);

  const { customer_name, customer_contact, subject, description } = parsed.data;

  try {
    // Duplicate policy: same owner + contact + subject within 5 minutes
    const dup = await pool.query(
      `SELECT id FROM inquiries
       WHERE owner_id = $1
         AND LOWER(customer_contact) = LOWER($2)
         AND LOWER(subject) = LOWER($3)
         AND created_at > NOW() - INTERVAL '5 minutes'
       LIMIT 1`,
      [req.user.id, customer_contact, subject]
    );
    if (dup.rows.length > 0) {
      return res.status(409).json({
        error: 'A similar inquiry was just submitted',
        existing_id: dup.rows[0].id,
      });
    }

    const result = await pool.query(
      `INSERT INTO inquiries (customer_name, customer_contact, subject, description, owner_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [customer_name, customer_contact, subject, description, req.user.id]
    );
    res.status(201).json({ inquiry: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// LIST (+ filter by status, search by text)
router.get('/', async (req, res) => {
  const { status, q } = req.query;

  if (status && !STATUSES.includes(status)) {
    return res.status(400).json({ error: 'Invalid status filter' });
  }

  const conditions = ['owner_id = $1'];
  const params = [req.user.id];

  if (status) {
    params.push(status);
    conditions.push(`status = $${params.length}`);
  }
  if (q && String(q).trim()) {
    params.push(`%${String(q).trim()}%`);
    const p = `$${params.length}`;
    conditions.push(
      `(customer_name ILIKE ${p} OR subject ILIKE ${p} OR customer_contact ILIKE ${p})`
    );
  }

  try {
    const result = await pool.query(
      `SELECT * FROM inquiries
       WHERE ${conditions.join(' AND ')}
       ORDER BY created_at DESC`,
      params
    );
    res.json({ inquiries: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// GET ONE
router.get('/:id', async (req, res) => {
  const id = parseId(req, res);
  if (id === null) return;

  try {
    // owner_id check is in the SQL: someone else's inquiry looks like "not found"
    const result = await pool.query(
      'SELECT * FROM inquiries WHERE id = $1 AND owner_id = $2',
      [id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Inquiry not found' });
    }
    res.json({ inquiry: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// CHANGE STATUS
router.patch('/:id/status', async (req, res) => {
  const id = parseId(req, res);
  if (id === null) return;

  const parsed = statusSchema.safeParse(req.body);
  if (!parsed.success) return validationError(res, parsed.error);

  const { status: newStatus, updated_at: clientUpdatedAt } = parsed.data;

  try {
    const current = await pool.query(
      'SELECT * FROM inquiries WHERE id = $1 AND owner_id = $2',
      [id, req.user.id]
    );
    if (current.rows.length === 0) {
      return res.status(404).json({ error: 'Inquiry not found' });
    }
    const inquiry = current.rows[0];

    // Invalid transition?
    if (!TRANSITIONS[inquiry.status].includes(newStatus)) {
      return res.status(422).json({
        error: `Cannot change status from "${inquiry.status}" to "${newStatus}"`,
        allowed: TRANSITIONS[inquiry.status],
        inquiry,
      });
    }

    // Atomic update: only if nobody changed it since the client last saw it
    const updated = await pool.query(
      `UPDATE inquiries
       SET status = $1, updated_at = NOW()
       WHERE id = $2 AND owner_id = $3 AND updated_at = $4
       RETURNING *`,
      [newStatus, id, req.user.id, clientUpdatedAt]
    );

    if (updated.rows.length === 0) {
      // Someone else (e.g. another tab) changed it first
      const fresh = await pool.query('SELECT * FROM inquiries WHERE id = $1', [id]);
      return res.status(409).json({
        error: 'This inquiry was changed elsewhere. Showing the latest version.',
        inquiry: fresh.rows[0],
      });
    }

    res.json({ inquiry: updated.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

module.exports = router;