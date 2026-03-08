import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import ErrorModal from '../components/ErrorModal';
import { RequiredDocType, Submission, User } from '../types';

const REQUIRED_DOCS: { type: RequiredDocType; label: string; accept: string }[] = [
  { type: 'AU_PASSPORT', label: 'Australian Passport', accept: 'image/jpeg,image/png' },
  { type: 'AU_DRIVER_LICENCE', label: 'Australian Driver Licence', accept: 'image/jpeg,image/png' },
  { type: 'RESUME', label: 'Resume', accept: 'image/jpeg,image/png' }
];

const ALLOWED = ['image/jpeg', 'image/png'];

export default function UploadPage({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [fileNames, setFileNames] = useState<Record<RequiredDocType, string>>({
    AU_PASSPORT: '',
    AU_DRIVER_LICENCE: '',
    RESUME: ''
  });
  const [error, setError] = useState('');
  const [busyType, setBusyType] = useState<RequiredDocType | null>(null);
  const [deletingType, setDeletingType] = useState<RequiredDocType | null>(null);
  const [extraDocsCount, setExtraDocsCount] = useState(0);
  const inputRefs = useRef<Record<RequiredDocType, HTMLInputElement | null>>({
    AU_PASSPORT: null,
    AU_DRIVER_LICENCE: null,
    RESUME: null
  });
  const navigate = useNavigate();

  // Polls the backend for latest document statuses so the UI reflects async verification updates.
  const refresh = () => api.listDocuments().then((res) => setSubmissions(res.submissions)).catch(() => setError('Could not load your documents right now.'));
  // Store selected filenames per-user because backend does not persist original file names.
  const namesStorageKey = `upload-filenames-${user.id}`;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(namesStorageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<Record<RequiredDocType, string>>;
        setFileNames({
          AU_PASSPORT: parsed.AU_PASSPORT || '',
          AU_DRIVER_LICENCE: parsed.AU_DRIVER_LICENCE || '',
          RESUME: parsed.RESUME || ''
        });
      }
    } catch {
      // ignore invalid local storage data
    }
    refresh();
    const timer = setInterval(refresh, 5000);
    return () => clearInterval(timer);
  }, [namesStorageKey]);

  const uploadedCount = useMemo(() => submissions.filter((s) => s.status !== 'NOT_SUBMITTED').length, [submissions]);
  const totalRequired = REQUIRED_DOCS.length;
  const uploadRatio = Math.max(0, Math.min(100, (uploadedCount / totalRequired) * 100));

  const uploadFile = async (docType: RequiredDocType, file?: File) => {
    if (!file) return setError('Please select a file before submitting.');
    if (!ALLOWED.includes(file.type)) return setError('Unsupported file type. Please upload PNG or JPEG.');

    setError('');
    setBusyType(docType);
    try {
      await api.uploadDocument(docType, file);
      // Persist the selected name locally so it remains visible after refresh/navigation.
      setFileNames((current) => {
        const next = { ...current, [docType]: file.name };
        localStorage.setItem(namesStorageKey, JSON.stringify(next));
        return next;
      });
      await refresh();
    } catch (err) {
      setError((err as Error).message || 'We could not process that upload right now.');
    } finally {
      setBusyType(null);
    }
  };

  const deleteFile = async (docType: RequiredDocType, submissionId: number) => {
    if (!window.confirm('Delete this uploaded document?')) return;
    setError('');
    setDeletingType(docType);
    try {
      await api.deleteDocument(submissionId);
      // Keep local filename cache in sync with server-side deletion.
      setFileNames((current) => {
        const next = { ...current, [docType]: '' };
        localStorage.setItem(namesStorageKey, JSON.stringify(next));
        return next;
      });
      await refresh();
    } catch (err) {
      setError((err as Error).message || 'Could not delete this document right now.');
    } finally {
      setDeletingType(null);
    }
  };

  const getByType = (docType: RequiredDocType) => submissions.find((s) => s.docType === docType) || { docType, status: 'NOT_SUBMITTED' } as Submission;
  const formatDate = (value?: string) => (value ? new Date(value).toLocaleString() : 'Awaiting upload');
  const statusCopy = (status: Submission['status']) => {
    if (status === 'DONE') return 'Uploaded';
    if (status === 'PROCESSING') return 'Processing';
    if (status === 'FAILED') return 'Failed';
    return 'Not started';
  };

  return (
    <div className="upload-shell">
      <header className="upload-header">
        <div className="upload-header-inner">
          <button type="button" className="upload-header-logo-link" onClick={() => navigate('/selection')}>
            <img src="/logo-light.svg" alt="Truuth" className="upload-header-logo" />
          </button>
          <div className="upload-user-box">
            <div>
              <p className="upload-user-name">{user.username}</p>
              <button className="upload-logout-link" onClick={onLogout}>Logout</button>
            </div>
            <span className="upload-user-avatar" aria-hidden="true">
              {user.username.slice(0, 1).toUpperCase()}
            </span>
          </div>
        </div>
      </header>

      <main className="upload-page">
        <section className="upload-progress-card">
          <div className="upload-progress-head">
            <div>
              <h1>Document Upload Progress</h1>
              <p>Track your required document submissions</p>
            </div>
            <p className="upload-progress-count">
              <strong>{uploadedCount}</strong> of {totalRequired} required
            </p>
          </div>
          <div className="upload-progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(uploadRatio)}>
            <span style={{ width: `${uploadRatio}%` }} />
          </div>
          <p className="upload-progress-copy">{uploadedCount} of {totalRequired} required documents uploaded</p>
        </section>

        <section className="upload-section">
          <h2>Required Documents</h2>
          <p>Please upload all required documents to complete your onboarding</p>

          <div className="upload-list">
            {REQUIRED_DOCS.map((doc) => {
              const submission = getByType(doc.type);
              const isUploaded = submission.status !== 'NOT_SUBMITTED';
              return (
                <article key={doc.type} className={`upload-doc-row ${isUploaded ? 'is-uploaded' : ''}`}>
                  <div className="upload-doc-main">
                    <span className="upload-doc-icon" aria-hidden="true">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <path d="M7 3h7l5 5v13H7V3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                        <path d="M14 3v5h5" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                      </svg>
                    </span>
                    <div>
                      <h3>{doc.label}</h3>
                      <div className="upload-doc-meta">
                        <p className={`upload-doc-badge status-${submission.status.toLowerCase()}`}>
                          {statusCopy(submission.status)}
                        </p>
                        {fileNames[doc.type] ? <span className="upload-doc-name">{fileNames[doc.type]}</span> : null}
                      </div>
                      <p className="upload-doc-date">Uploaded on {formatDate(submission.updatedAt)}</p>
                    </div>
                  </div>

                  <div className="upload-doc-actions">
                    <input
                      ref={(el) => {
                        inputRefs.current[doc.type] = el;
                      }}
                      type="file"
                      accept={doc.accept}
                      onChange={(e) => uploadFile(doc.type, e.target.files?.[0])}
                      disabled={busyType === doc.type || deletingType === doc.type}
                      className="upload-hidden-input"
                    />
                    <button
                      type="button"
                      className={isUploaded ? 'upload-again-btn' : 'upload-primary-btn'}
                      disabled={busyType === doc.type || deletingType === doc.type}
                      onClick={() => inputRefs.current[doc.type]?.click()}
                    >
                      {busyType === doc.type ? 'Uploading...' : (isUploaded ? 'Upload again' : 'Upload')}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="upload-section">
          <h2>Additional Documents</h2>
          <p>If you have been asked to provide additional documents, you can upload them here.</p>
          <button type="button" className="upload-add-btn">
            + Add document
          </button>
        </section>

        <div className="upload-bottom-actions">
          <button type="button" className="upload-confirm-btn" onClick={() => navigate('/selection')}>
            Confirm
          </button>
        </div>
      </main>

      <ErrorModal open={Boolean(error)} message={error} onClose={() => setError('')} />
    </div>
  );
}
