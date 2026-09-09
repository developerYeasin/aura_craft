import axios from 'axios';

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5050/api/v1';
export const TOKEN_KEY = 'auracraft_token';

const client = axios.create({ baseURL: API_URL, timeout: 20000 });

client.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/** Server messages are English; the UI is Bengali, so auth failures get translated. */
const friendly = (status, message) => {
  if (status === 401) return 'আপনার সেশন শেষ হয়ে গেছে — আবার লগইন করুন।';
  if (status === 403) return 'এই কাজটি করার অনুমতি আপনার নেই।';
  if (status === 429) return 'অনেকবার চেষ্টা করা হয়েছে, কিছুক্ষণ পর আবার চেষ্টা করুন।';
  return message;
};

client.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const status = error.response?.status;
    const payload = error.response?.data;
    const isLogin = error.config?.url?.includes('/auth/login');

    // Any 401 on a non-login call means the stored token is gone or no longer valid.
    // Drop it and send staff back to the login screen instead of rendering an error card.
    if (status === 401 && !isLogin) {
      localStorage.removeItem(TOKEN_KEY);
      if (window.location.pathname.startsWith('/admin') && !window.location.pathname.endsWith('/login')) {
        window.location.assign('/admin/login?expired=1');
      }
    }

    if (!error.response) {
      return Promise.reject({
        status: 0,
        message: 'সার্ভারের সাথে সংযোগ করা যায়নি। ব্যাকএন্ড চালু আছে কিনা দেখুন।',
        errors: null,
      });
    }

    return Promise.reject({
      status,
      message: isLogin ? payload?.message || error.message : friendly(status, payload?.message || error.message),
      errors: payload?.errors || null,
    });
  }
);

export default client;
