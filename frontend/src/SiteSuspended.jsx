const WHATSAPP = '8801865385882';

export default function SiteSuspended() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#0f0f12', color: '#f5f5f5', padding: 16, fontFamily: "'Noto Sans Bengali', 'Hind Siliguri', system-ui, sans-serif",
    }}>
      <div style={{ maxWidth: 520, textAlign: 'center' }}>
        <div style={{ fontSize: 56, marginBottom: 12 }}>⚠️</div>
        <h1 style={{ fontSize: 28, margin: '0 0 12px' }}>সাইটটি সাময়িকভাবে বন্ধ আছে</h1>
        <p style={{ fontSize: 18, lineHeight: 1.7, opacity: 0.85, margin: '0 0 24px' }}>
          সাইটটি আবার সচল করার জন্য নিচের নাম্বারে WhatsApp করুন।
        </p>
        <a
          href={`https://wa.me/${WHATSAPP}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-block', background: '#25D366', color: '#fff', textDecoration: 'none',
            padding: '14px 28px', borderRadius: 999, fontSize: 20, fontWeight: 600,
          }}
        >
          WhatsApp: +880 1865-385882
        </a>
      </div>
    </div>
  );
}
