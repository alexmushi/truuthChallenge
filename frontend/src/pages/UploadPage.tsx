import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import ResultModal from '../components/ResultModal';
import { RequiredDocType, Submission, User } from '../types';

const REQUIRED_DOCS: { type: RequiredDocType; label: string; accept: string }[] = [
  { type: 'AU_PASSPORT', label: 'Australian Passport', accept: 'image/jpeg,image/png,application/pdf' },
  { type: 'AU_DRIVER_LICENCE', label: 'Australian Driver Licence', accept: 'image/jpeg,image/png,application/pdf' },
  { type: 'RESUME', label: 'Resume', accept: 'application/pdf,image/jpeg,image/png' }
];

const ALLOWED = ['image/jpeg', 'image/png', 'application/pdf'];

export default function UploadPage({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [error, setError] = useState('');
  const [busyType, setBusyType] = useState<RequiredDocType | null>(null);
  const [openResult, setOpenResult] = useState<unknown | null>(null);
  const navigate = useNavigate();

  const refresh = () => api.listDocuments().then((res) => setSubmissions(res.submissions)).catch(() => setError('Could not load your documents right now.'));

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 5000);
    return () => clearInterval(timer);
  }, []);

  const uploadedCount = useMemo(() => submissions.filter((s) => s.status !== 'NOT_SUBMITTED').length, [submissions]);

  const uploadFile = async (docType: RequiredDocType, file?: File) => {
    if (!file) return setError('Please select a file before submitting.');
    if (!ALLOWED.includes(file.type)) return setError('Unsupported file type. Please upload PDF, PNG, or JPEG.');

    setError('');
    setBusyType(docType);
    try {
      await api.uploadDocument(docType, file);
      await refresh();
    } catch (err) {
      setError((err as Error).message || 'We could not process that upload right now.');
    } finally {
      setBusyType(null);
    }
  };

  const getByType = (docType: RequiredDocType) => submissions.find((s) => s.docType === docType) || { docType, status: 'NOT_SUBMITTED' } as Submission;

  return (
    <div className="page">
      <header className="topbar">
        <div>
          <h2>Document Upload</h2>
          <p>{uploadedCount} of 3 required documents uploaded.</p>
        </div>
        <div className="header-actions">
          <button className="secondary" onClick={() => navigate('/selection')}>Back</button>
          <button className="secondary" onClick={onLogout}>Logout</button>
        </div>
      </header>

      <p className="muted">Signed in as {user.username}</p>
      {error && <p className="error">{error}</p>}

      <div className="grid">
        {REQUIRED_DOCS.map((doc) => {
          const submission = getByType(doc.type);
          return (
            <section className="card doc-card" key={doc.type}>
              <h3>{doc.label}</h3>
              <p>Status: <strong>{submission.status === 'NOT_SUBMITTED' ? 'Not uploaded' : submission.status}</strong></p>
              {submission.documentVerifyId && <p className="tiny">Verify ID: {submission.documentVerifyId}</p>}
              <input type="file" accept={doc.accept} onChange={(e) => uploadFile(doc.type, e.target.files?.[0])} disabled={busyType === doc.type} />
              <p className="tiny">{busyType === doc.type ? 'Uploading...' : 'Select a file to submit this document.'}</p>
              {submission.status === 'DONE' || submission.status === 'FAILED' ? (
                <button className="secondary" onClick={async () => {
                  const result = await api.getResult(submission.id);
                  setOpenResult(result.resultJson);
                }}>View Result</button>
              ) : null}
            </section>
          );
        })}
      </div>
      <ResultModal open={Boolean(openResult)} onClose={() => setOpenResult(null)} result={openResult} />
    </div>
  );
}
