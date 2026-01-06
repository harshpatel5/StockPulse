import React from 'react';

// Centered loading spinner shown during authentication validation
export const LoadingSpinner = () => {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      backgroundColor: '#0f172a',
    }}>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1rem',
      }}>
        {/* Rotating spinner circle */}
        <div style={{
          width: '50px',
          height: '50px',
          border: '4px solid rgba(91, 141, 239, 0.2)',
          borderTop: '4px solid #5B8DEF',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }}></div>
        <p style={{
          color: '#94a3b8',
          fontSize: '0.875rem',
          fontWeight: '500',
        }}>Loading...</p>
      </div>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
