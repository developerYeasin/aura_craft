import { useEffect, useState } from 'react';
import { uploadApi } from '../../api/index.js';
import { useToast } from '../../context/ToastContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { Loader, ErrorBox, ConfirmDialog, Empty } from '../../components/ui/index.jsx';
import ClearAllButton from '../../components/ui/ClearAll.jsx';
import { IconTrash, IconBox, IconPlus } from '../../components/ui/Icons.jsx';
import { enNum, formatDate } from '../../utils/format.js';

const FILTERS = [
  ['all', 'সব'],
  ['image', 'ছবি'],
  ['video', 'ভিডিও'],
  ['unused', 'অব্যবহৃত'],
];

const size = (bytes) => (bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);

const AdminMedia = () => {
  const toast = useToast();
  const { canDelete } = useAuth();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [uploading, setUploading] = useState(false);
  const [confirm, setConfirm] = useState(null);

  const load = () => {
    setLoading(true);
    setError(null);
    uploadApi
      .list()
      .then((res) => setFiles(res.data || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const upload = async (list) => {
    const chosen = Array.from(list || []);
    if (!chosen.length) return;
    setUploading(true);
    try {
      for (const file of chosen) {
        if (file.type.startsWith('video/')) await uploadApi.video(file);
        else await uploadApi.image(file);
      }
      toast.success(`${enNum(chosen.length)} টি ফাইল আপলোড হয়েছে`);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  };

  const copy = async (url) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('লিংক কপি হয়েছে');
    } catch {
      toast.error('কপি করা যায়নি');
    }
  };

  const remove = async () => {
    try {
      await uploadApi.remove(confirm.filename);
      toast.success('ফাইল ডিলিট হয়েছে');
      setConfirm(null);
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const shown = files.filter((f) => (filter === 'all' ? true : filter === 'unused' ? !f.in_use : f.kind === filter));
  const total = files.reduce((sum, f) => sum + f.size, 0);

  return (
    <>
      <div className="admin__top">
        <div>
          <h1 className="display t-h2">Media</h1>
          <p className="mute-2" style={{ margin: 0 }}>
            আপলোড করা {enNum(files.length)} টি ফাইল · {size(total)}
          </p>
        </div>
        <div className="admin__actions">
          <ClearAllButton
            section="media"
            label="Media"
            sensitive
            warning="যেসব প্রোডাক্ট, ক্যাটাগরি বা টিম মেম্বার এই ফাইল ব্যবহার করছে সেখানে ছবি/ভিডিও আর দেখাবে না।"
            onCleared={load}
          />
          <label className="btn btn--primary btn--sm" style={{ cursor: 'pointer' }}>
            <IconPlus width={15} height={15} /> {uploading ? 'আপলোড হচ্ছে…' : 'ফাইল আপলোড'}
            <input type="file" accept="image/*,video/mp4,video/webm,video/quicktime" multiple hidden onChange={(e) => upload(e.target.files)} />
          </label>
        </div>
      </div>

      <div className="toolbar">
        <div className="seg">
          {FILTERS.map(([key, label]) => (
            <button type="button" key={key} className={`seg__btn${filter === key ? ' is-on' : ''}`} onClick={() => setFilter(key)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading && <Loader />}
      {error && !loading && <ErrorBox message={error} onRetry={load} />}
      {!loading && !error && shown.length === 0 && <Empty icon={IconBox} title="কোনো ফাইল নেই" />}

      {!loading && !error && shown.length > 0 && (
        <div className="media-grid">
          {shown.map((f) => (
            <div className="card media-tile" key={f.filename}>
              {f.kind === 'video' ? (
                <video className="media-tile__thumb" src={f.url} muted playsInline preload="metadata" />
              ) : (
                <img className="media-tile__thumb" src={f.url} alt="" loading="lazy" />
              )}
              <div className="media-tile__body">
                <span className="media-tile__name" title={f.filename}>{f.filename}</span>
                <span className="mute-2">
                  {size(f.size)} · {formatDate(f.created_at)}
                </span>
                <div className="row gap-8" style={{ justifyContent: 'space-between' }}>
                  <span className={`badge ${f.in_use ? 'badge--ok' : 'badge--mute'}`}>{f.in_use ? 'ব্যবহৃত' : 'অব্যবহৃত'}</span>
                  <div className="actions-cell">
                    <button type="button" className="btn btn--xs" onClick={() => copy(f.url)} title="লিংক কপি">
                      URL
                    </button>
                    {canDelete && (
                      <button type="button" className="btn btn--xs btn--danger" onClick={() => setConfirm(f)} title="ডিলিট">
                        <IconTrash width={12} height={12} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!confirm}
        text={
          confirm?.in_use
            ? `"${confirm?.filename}" এখন ব্যবহার হচ্ছে — ডিলিট করলে সেখানে ছবি/ভিডিও আর দেখাবে না।`
            : `"${confirm?.filename}" স্থায়ীভাবে ডিলিট হয়ে যাবে।`
        }
        onCancel={() => setConfirm(null)}
        onConfirm={remove}
      />
    </>
  );
};

export default AdminMedia;
