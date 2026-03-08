require('dotenv').config();

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { classifyIfNeeded, submitForVerification, fetchVerificationResult } = require('./truuthService');

const prisma = new PrismaClient();
const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png']);

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

function wrapAsync(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function auth(req, res, next) {
  // Accept either cookie session or Authorization bearer token.
  const bearer = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.slice(7)
    : null;
  const token = req.cookies.authToken || bearer;
  if (!token) return res.status(401).json({ message: 'Please login.' });

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
    return next();
  } catch {
    return res.status(401).json({ message: 'Session expired. Please login again.' });
  }
}

async function reconcileProcessingSubmission(submission) {
  if (submission.status !== 'PROCESSING' || !submission.documentVerifyId) return submission;

  try {
    const result = await fetchVerificationResult(submission.documentVerifyId);
    const status = result?.status;
    if (status === 'DONE' || status === 'FAILED') {
      return prisma.submission.update({
        where: { id: submission.id },
        data: { status, resultJson: result }
      });
    }
  } catch {
    // Keep current status and try again on a future request.
  }

  return submission;
}

async function bootstrapPollers() {
  const processing = await prisma.submission.findMany({ where: { status: 'PROCESSING' } });
  await Promise.all(processing.map(reconcileProcessingSubmission));
}

app.post('/api/session/login', wrapAsync(async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ message: 'Username and password are required.' });

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) return res.status(401).json({ message: 'Invalid credentials.' });

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return res.status(401).json({ message: 'Invalid credentials.' });

  const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET || 'dev-secret', { expiresIn: '12h' });

  res.cookie('authToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 12 * 60 * 60 * 1000
  });

  return res.json({ user: { id: user.id, username: user.username }, token });
}));

app.post('/api/session/logout', (_req, res) => {
  res.clearCookie('authToken');
  return res.json({ ok: true });
});

app.get('/api/session/me', auth, (req, res) => res.json({ user: { id: req.user.id, username: req.user.username } }));

app.get('/api/documents', auth, wrapAsync(async (req, res) => {
  const submissions = await prisma.submission.findMany({ where: { userId: req.user.id } });
  const refreshed = await Promise.all(submissions.map(reconcileProcessingSubmission));

  // Always return all required document slots so frontend rendering is stable.
  const complete = ['AU_PASSPORT', 'AU_DRIVER_LICENCE', 'RESUME'].map((docType) => refreshed.find((s) => s.docType === docType)
    || { id: -1, docType, status: 'NOT_SUBMITTED', documentVerifyId: null, resultJson: null });

  return res.json({ submissions: complete });
}));

app.post('/api/documents/upload', auth, upload.single('file'), wrapAsync(async (req, res) => {
  try {
    const { docType } = req.body;
    const file = req.file;

    if (!file) return res.status(400).json({ message: 'Please select a file before submitting.' });
    if (!['AU_PASSPORT', 'AU_DRIVER_LICENCE', 'RESUME'].includes(docType)) return res.status(400).json({ message: 'Unsupported document type.' });
    if (!ALLOWED_TYPES.has(file.mimetype)) return res.status(400).json({ message: 'Unsupported file type. Please upload PNG or JPEG.' });

    const base64Image = file.buffer.toString('base64');
    await classifyIfNeeded(docType, file.mimetype, base64Image);

    const verifyResponse = await submitForVerification(docType, file.mimetype, base64Image, `user-${req.user.id}-${docType}-${Date.now()}`);
    if (!verifyResponse.documentVerifyId) return res.status(502).json({ message: 'Could not submit verification at this time.' });

    // Upsert ensures one submission row per (user, docType), replacing previous attempts.
    const submission = await prisma.submission.upsert({
      where: { userId_docType: { userId: req.user.id, docType } },
      update: { documentVerifyId: verifyResponse.documentVerifyId, status: 'PROCESSING', resultJson: null },
      create: { userId: req.user.id, docType, documentVerifyId: verifyResponse.documentVerifyId, status: 'PROCESSING' }
    });

    return res.json({ submission });
  } catch (error) {
    return res.status(400).json({ message: error.message || 'Upload failed.' });
  }
}));

app.delete('/api/documents/:id', auth, wrapAsync(async (req, res) => {
  const submissionId = Number(req.params.id);
  if (!Number.isInteger(submissionId) || submissionId <= 0) {
    return res.status(400).json({ message: 'Invalid submission id.' });
  }

  const submission = await prisma.submission.findFirst({ where: { id: submissionId, userId: req.user.id } });
  if (!submission) return res.status(404).json({ message: 'Submission not found.' });

  await prisma.submission.delete({ where: { id: submission.id } });
  return res.json({ ok: true });
}));

app.get('/api/documents/:id/result', auth, wrapAsync(async (req, res) => {
  const submission = await prisma.submission.findFirst({ where: { id: Number(req.params.id), userId: req.user.id } });
  if (!submission) return res.status(404).json({ message: 'Submission not found.' });
  if (!['DONE', 'FAILED'].includes(submission.status)) return res.status(409).json({ message: 'Result is still processing.' });
  return res.json({ resultJson: submission.resultJson });
}));

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.use((error, _req, res, _next) => {
  console.error(error);
  if (error?.type === 'entity.parse.failed' || error?.statusCode === 400 || error?.status === 400) {
    return res.status(400).json({ message: 'Invalid JSON request body.' });
  }
  if (error?.code === 'P2021') {
    return res.status(500).json({ message: 'Database schema is missing in production. Run Prisma migrations and import seed data.' });
  }
  return res.status(500).json({ message: 'Something went wrong. Please try again.' });
});

module.exports = { app, bootstrapPollers };
