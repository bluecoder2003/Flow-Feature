import Link from 'next/link';

export default function Home() {
  return (
    <div style={{ fontFamily: 'var(--font-dm-sans, system-ui)' }} className="flex flex-col flex-1 items-center justify-center min-h-screen bg-[#f0f0f0] px-6">
      <div className="flex flex-col items-center gap-2 mb-10">
        <span style={{ fontSize: 32, fontWeight: 700, letterSpacing: -1, color: '#0a0a0a' }}>
          Wellfare<span style={{ color: '#e63329' }}>•</span>
        </span>
        <span style={{ fontSize: 14, color: '#888', fontWeight: 400 }}>AI-powered wellbeing assistant</span>
      </div>

      <Link
        href="/flow"
        style={{
          display: 'flex', alignItems: 'center', gap: 12,
          background: '#fff', border: '1px solid #e8e8e8', borderRadius: 20,
          padding: '16px 24px', textDecoration: 'none',
          boxShadow: '0 2px 8px rgba(0,0,0,.06)',
          transition: 'box-shadow 0.15s',
        }}
      >
        <div style={{
          width: 44, height: 44, borderRadius: 14,
          background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
        }}>🌊</div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#0a0a0a', letterSpacing: '-0.3px' }}>Flow</div>
          <div style={{ fontSize: 13, color: '#888', marginTop: 2 }}>AI routine &amp; commute assistant</div>
        </div>
        <span style={{ marginLeft: 8, color: '#bbb', fontSize: 18 }}>→</span>
      </Link>
    </div>
  );
}
