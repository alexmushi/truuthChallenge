export default function ResultModal({
  open,
  onClose,
  result
}: {
  open: boolean;
  onClose: () => void;
  result: unknown;
}) {
  if (!open) return null;

  const json = JSON.stringify(result, null, 2);

  const download = () => {
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'verification-result.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Verification Result</h3>
        <div className="modal-actions">
          <button className="secondary" onClick={() => navigator.clipboard.writeText(json)}>Copy JSON</button>
          <button className="secondary" onClick={download}>Download JSON</button>
          <button onClick={onClose}>Close</button>
        </div>
        <pre>{json}</pre>
      </div>
    </div>
  );
}
