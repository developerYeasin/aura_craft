import { useEffect, useState } from 'react';
import { maintenanceApi } from '../../api/index.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { Modal } from './index.jsx';
import { IconTrash, IconAlert } from './Icons.jsx';
import { enNum } from '../../utils/format.js';

/**
 * "Clear All" for an admin section. Two guards before anything is deleted:
 * the admin types the section key back, and sensitive sections also need an
 * explicit "I understand" tick. The server re-checks the typed key.
 */
const ClearAllButton = ({ section, label, warning, sensitive = false, onCleared }) => {
  const { canDelete } = useAuth();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(null);
  const [typed, setTyped] = useState('');
  const [understood, setUnderstood] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTyped('');
    setUnderstood(false);
    setCount(null);
    maintenanceApi
      .counts()
      .then((res) => setCount(res.data?.[section] ?? 0))
      .catch(() => setCount(null));
  }, [open, section]);

  if (!canDelete) return null;

  const ready = typed.trim() === section && (!sensitive || understood) && !busy;

  const run = async () => {
    if (!ready) return;
    setBusy(true);
    try {
      const res = await maintenanceApi.clear(section, typed.trim());
      toast.success(`${label} — ${enNum(res.data.removed)} টি রেকর্ড মুছে ফেলা হয়েছে`);
      setOpen(false);
      onCleared?.();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button type="button" className="btn btn--danger btn--sm" onClick={() => setOpen(true)}>
        <IconTrash width={14} height={14} /> Clear All
      </button>

      <Modal open={open} title={`${label} — সব ডাটা মুছবেন?`} onClose={() => !busy && setOpen(false)}>
        <div className="warn-box">
          <IconAlert width={18} height={18} />
          <div>
            <b>এই কাজটি আর ফেরানো যাবে না।</b>
            <p style={{ margin: '4px 0 0' }}>
              {count == null ? 'রেকর্ড গোনা হচ্ছে…' : `মোট ${enNum(count)} টি রেকর্ড স্থায়ীভাবে মুছে যাবে।`}
              {warning ? ` ${warning}` : ''}
            </p>
          </div>
        </div>

        <label className="field" style={{ marginTop: 16 }}>
          <span className="mute-2">
            নিশ্চিত করতে নিচে <b className="num" style={{ color: 'var(--danger)' }}>{section}</b> লিখুন
          </span>
          <input
            className="input num"
            autoFocus
            autoComplete="off"
            spellCheck={false}
            value={typed}
            placeholder={section}
            onChange={(e) => setTyped(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && run()}
          />
        </label>

        {sensitive && (
          <label className="checkbox" style={{ marginBottom: 6 }}>
            <input type="checkbox" checked={understood} onChange={(e) => setUnderstood(e.target.checked)} />
            আমি বুঝেছি — এটি সংবেদনশীল ডাটা এবং ব্যাকআপ ছাড়া ফিরিয়ে আনা যাবে না
          </label>
        )}

        <div className="row gap-8" style={{ justifyContent: 'flex-end', marginTop: 16 }}>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => setOpen(false)} disabled={busy}>
            Cancel
          </button>
          <button type="button" className="btn btn--danger btn--sm" onClick={run} disabled={!ready}>
            <IconTrash width={14} height={14} /> {busy ? 'মুছে ফেলা হচ্ছে…' : 'Delete All'}
          </button>
        </div>
      </Modal>
    </>
  );
};

export default ClearAllButton;
