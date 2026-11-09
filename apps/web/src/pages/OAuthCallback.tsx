import React, { useEffect, useState } from 'react';

export const OAuthCallback: React.FC = () => {
  const [status, setStatus] = useState<string>(
    'গুগল অনুমোদন যাচাই করা হচ্ছে... (Processing Google Authorization...)'
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    const error = params.get('error');

    if (error) {
      setStatus(`অনুমোদন ব্যর্থ হয়েছে: ${error} (Authorization failed)`);
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage(
          { type: 'DHAMRAI_OAUTH_ERROR', error },
          window.location.origin
        );
        setTimeout(() => window.close(), 1200);
      }
      return;
    }

    if (code && state) {
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage(
          { type: 'DHAMRAI_OAUTH_CODE', code, state },
          window.location.origin
        );
        setStatus(
          'অনুমোদন সম্পন্ন হয়েছে! উইন্ডো বন্ধ হচ্ছে... (Authorization complete! Closing window...)'
        );
        setTimeout(() => window.close(), 400);
      } else {
        // Fallback for full-window redirect
        setStatus('রিডাইরেক্ট করা হচ্ছে... (Redirecting to game...)');
        window.location.href = `/?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`;
      }
    } else {
      setStatus('অবৈধ অনুমোদন প্যারামিটার। (Invalid authorization parameters.)');
    }
  }, []);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        backgroundColor: '#0b0f19',
        color: '#f3f4f6',
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        padding: '24px',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: '48px',
          height: '48px',
          border: '4px solid #1e293b',
          borderTop: '4px solid #10b981',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          marginBottom: '20px',
        }}
      />
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      <h2 style={{ margin: '0 0 10px 0', fontSize: '20px', fontWeight: 600 }}>
        Dhamrai Life — Authentication
      </h2>
      <p style={{ margin: 0, color: '#9ca3af', fontSize: '14px' }}>{status}</p>
    </div>
  );
};
