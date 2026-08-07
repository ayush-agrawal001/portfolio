import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Ayush Agrawal — Web Developer & Automation Engineer';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'flex-start',
          background: '#1a1b2e',
          backgroundImage:
            'radial-gradient(circle at 78% 30%, rgba(122,162,247,0.28), transparent 55%), radial-gradient(circle at 15% 85%, rgba(187,154,247,0.22), transparent 55%)',
          padding: '80px',
          fontFamily: 'monospace',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            color: '#9ece6a',
            fontSize: 28,
            marginBottom: 28,
          }}
        >
          <span style={{ color: '#565f89', marginRight: 12 }}>~$</span>
          whoami
        </div>
        <div
          style={{
            display: 'flex',
            color: '#c0caf5',
            fontSize: 76,
            fontWeight: 700,
            letterSpacing: '-0.02em',
          }}
        >
          Ayush Agrawal
        </div>
        <div
          style={{
            display: 'flex',
            color: '#7aa2f7',
            fontSize: 36,
            marginTop: 20,
          }}
        >
          Backend Developer · Web Developer · Web3 Developer
        </div>
        <div
          style={{
            display: 'flex',
            color: '#565f89',
            fontSize: 28,
            marginTop: 40,
          }}
        >
          ayush-agrawal.in
        </div>
      </div>
    ),
    { ...size }
  );
}
