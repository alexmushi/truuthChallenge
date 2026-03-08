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
const activePollers = new Map();
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'application/pdf']);

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

function auth(req, res, next) {
  const token = req.cookies.authToken;
  if (!token) return res.status(401).json({ message: 'Please login.' });

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
    return next();
  } catch {
    return res.status(401).json({ message: 'Session expired. Please login again.' });
  }
}

function startPoller(submissionId, verifyId) {
  if (activePollers.has(submissionId)) return;

  const poll = async () => {
    try {
      const result = await fetchVerificationResult(verifyId);
      const status = result?.status;
      if (status === 'DONE' || status === 'FAILED') {
        await prisma.submission.update({ where: { id: submissionId }, data: { status, resultJson: result } });
        clearInterval(interval);
        activePollers.delete(submissionId);
      }
    } catch {
      // keep polling
    }
  };

  const interval = setInterval(poll, 5000);
  activePollers.set(submissionId, interval);
  poll();
}

async function bootstrapPollers() {
  const processing = await prisma.submission.findMany({ where: { status: 'PROCESSING' } });
  processing.forEach((item) => {
    if (item.documentVerifyId) startPoller(item.id, item.documentVerifyId);
  });
}

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ message: 'Username and password are required.' });

  let user = await prisma.user.findUnique({ where: { username } });
  if (!user) {
    const passwordHash = await bcrypt.hash(password, 10);
    user = await prisma.user.create({ data: { username, passwordHash } });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return res.status(401).json({ message: 'Invalid credentials.' });

  const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET || 'dev-secret', { expiresIn: '12h' });

  res.cookie('authToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 12 * 60 * 60 * 1000
  });

  return res.json({ user: { id: user.id, username: user.username } });
});

app.post('/api/auth/logout', (_req, res) => {
  res.clearCookie('authToken');
  return res.json({ ok: true });
});

app.get('/api/auth/me', auth, (req, res) => res.json({ user: { id: req.user.id, username: req.user.username } }));

app.get('/api/documents', auth, async (req, res) => {
  const submissions = await prisma.submission.findMany({ where: { userId: req.user.id } });
  submissions.forEach((item) => {
    if (item.status === 'PROCESSING' && item.documentVerifyId) startPoller(item.id, item.documentVerifyId);
  });

  const complete = ['AU_PASSPORT', 'AU_DRIVER_LICENCE', 'RESUME'].map((docType) => submissions.find((s) => s.docType === docType)
    || { id: -1, docType, status: 'NOT_SUBMITTED', documentVerifyId: null, resultJson: null });

  return res.json({ submissions: complete });
});

app.post('/api/documents/upload', auth, upload.single('file'), async (req, res) => {
  try {
    const { docType } = req.body;
    const file = req.file;

    if (!file) return res.status(400).json({ message: 'Please select a file before submitting.' });
    if (!['AU_PASSPORT', 'AU_DRIVER_LICENCE', 'RESUME'].includes(docType)) return res.status(400).json({ message: 'Unsupported document type.' });
    if (!ALLOWED_TYPES.has(file.mimetype)) return res.status(400).json({ message: 'Unsupported file type. Please upload PDF, PNG, or JPEG.' });

    const base64Image = file.buffer.toString('base64');
    await classifyIfNeeded(docType, file.mimetype, base64Image);

    const verifyResponse = await submitForVerification(docType, file.mimetype, base64Image, `user-${req.user.id}-${docType}-${Date.now()}`);
    if (!verifyResponse.documentVerifyId) return res.status(502).json({ message: 'Could not submit verification at this time.' });

    const submission = await prisma.submission.upsert({
      where: { userId_docType: { userId: req.user.id, docType } },
      update: { documentVerifyId: verifyResponse.documentVerifyId, status: 'PROCESSING', resultJson: null },
      create: { userId: req.user.id, docType, documentVerifyId: verifyResponse.documentVerifyId, status: 'PROCESSING' }
    });

    startPoller(submission.id, verifyResponse.documentVerifyId);
    return res.json({ submission });
  } catch (error) {
    return res.status(400).json({ message: error.message || 'Upload failed.' });
  }
});

app.get('/api/documents/:id/result', auth, async (req, res) => {
  const submission = await prisma.submission.findFirst({ where: { id: Number(req.params.id), userId: req.user.id } });
  if (!submission) return res.status(404).json({ message: 'Submission not found.' });
  if (!['DONE', 'FAILED'].includes(submission.status)) return res.status(409).json({ message: 'Result is still processing.' });
  return res.json({ resultJson: submission.resultJson });
});

app.get('/api/health', (_req, res) => res.json({ ok: true }));

module.exports = { app, bootstrapPollers };
