export default function ErrorModal({
  open,
  message,
  status = 'error',
  onClose
}: {
  open: boolean;
  message: string;
  status?: 'loading' | 'success' | 'error';
  onClose: () => void;
}) {
  if (!open) return null;
  const isLoading = status === 'loading';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal error-modal" onClick={(event) => event.stopPropagation()}>
        {isLoading ? <div className="spinner" aria-hidden="true" /> : null}
        <p className={`error-modal-copy status-${status}`}>{message}</p>
        {!isLoading ? (
          <div className="modal-actions error-modal-actions">
            <button className="error-modal-btn" onClick={onClose}>OK</button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
