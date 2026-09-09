import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { Field } from '../../components/ui/index.jsx';
import { IconSparkle } from '../../components/ui/Icons.jsx';

const Login = () => {
  const { login, user, loading } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();

  const [form, setForm] = useState({ email: '', password: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!loading && user) return <Navigate to={location.state?.from || '/admin'} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const account = await login(form);
      toast.success(`স্বাগতম, ${account.name}!`);
      navigate(location.state?.from || '/admin', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <div className="card card--pad login-card">
        <Link to="/" className="brand" style={{ justifyContent: 'center', marginBottom: 10 }}>
          <span className="brand__mark">
            <IconSparkle width={19} height={19} />
          </span>
          <span className="brand__text">AuraCraft</span>
        </Link>
        <div className="text-center" style={{ marginBottom: 22 }}>
          <h1 className="display t-h3">Admin Login</h1>
          <p className="mute-2" style={{ margin: 0 }}>ড্যাশবোর্ডে প্রবেশ করতে লগইন করুন</p>
        </div>

        {params.get('expired') && (
          <p className="field-error text-center" style={{ marginBottom: 14 }}>
            আপনার সেশন শেষ হয়ে গিয়েছিল — অনুগ্রহ করে আবার লগইন করুন।
          </p>
        )}

        <form onSubmit={submit}>
          <Field label="ইমেইল" required>
            <input
              className="input"
              type="email"
              autoComplete="username"
              placeholder="admin@auracraft.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </Field>
          <Field label="পাসওয়ার্ড" required error={error}>
            <input
              className="input"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          </Field>
          <button type="submit" className="btn btn--primary btn--block" disabled={submitting}>
            {submitting ? 'লগইন হচ্ছে…' : 'Login'}
          </button>
        </form>

        <p className="mute-2 text-center" style={{ marginTop: 16, marginBottom: 0 }}>
          ডেমো: admin@auracraft.com / admin123
        </p>
      </div>
    </div>
  );
};

export default Login;
