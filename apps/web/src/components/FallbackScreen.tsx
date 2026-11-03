import React from 'react';

interface FallbackScreenProps {
  errorMessage: string | null;
}

export const FallbackScreen: React.FC<FallbackScreenProps> = ({ errorMessage }) => {
  return (
    <div
      role="alert"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        width: '100%',
        padding: '2rem',
        backgroundColor: '#0d1117',
        color: '#f0f6fc',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          maxWidth: '560px',
          border: '1px solid #30363d',
          borderRadius: '8px',
          padding: '2rem',
          backgroundColor: '#161b22',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
        }}
      >
        <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#f85149' }}>
          WebGL 2 Hardware Acceleration Required
        </h1>
        <p style={{ lineHeight: '1.6', color: '#8b949e', marginBottom: '1.5rem' }}>
          {errorMessage ??
            'Dhamrai Life requires WebGL 2 with hardware acceleration to render the 3D town slice.'}
        </p>
        <div style={{ textAlign: 'left', backgroundColor: '#0d1117', padding: '1rem', borderRadius: '6px' }}>
          <h2 style={{ fontSize: '0.9rem', marginBottom: '0.5rem', color: '#58a6ff' }}>Troubleshooting steps:</h2>
          <ol style={{ fontSize: '0.85rem', color: '#c9d1d9', paddingLeft: '1.25rem', margin: 0, lineHeight: '1.6' }}>
            <li>Verify you are using a modern browser (Chrome 115+, Edge 115+, Firefox 120+, Safari 17+).</li>
            <li>Ensure "Use graphics acceleration when available" is enabled in browser settings.</li>
            <li>In Chrome/Edge, navigate to <code>chrome://gpu</code> to verify WebGL status.</li>
            <li>Update your graphics driver to the latest manufacturer version.</li>
          </ol>
        </div>
      </div>
    </div>
  );
};
