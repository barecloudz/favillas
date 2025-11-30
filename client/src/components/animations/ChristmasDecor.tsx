import React from 'react';

const ChristmasDecor: React.FC = () => {
  return (
    <>
      {/* Left Tree Branch */}
      <div
        style={{
          position: 'fixed',
          left: '-80px', // Mostly off-screen
          top: 0,
          width: '200px',
          height: '100vh',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      >
        {/* Tree branch - simple triangle for now, you can replace with SVG */}
        <svg width="200" height="100%" viewBox="0 0 200 1000" style={{ opacity: 0.9 }}>
          {/* Tree branch (green) */}
          <path
            d="M 150 0 L 200 300 L 180 300 L 220 600 L 190 600 L 230 900 L 200 900 L 200 1000 L 150 1000 Z"
            fill="#2d5016"
            opacity="0.95"
          />
          {/* Lighter green layer */}
          <path
            d="M 160 50 L 200 320 L 185 320 L 215 620 L 195 620 L 225 920 L 200 920 L 200 1000 L 160 1000 Z"
            fill="#3d7028"
            opacity="0.8"
          />
        </svg>

        {/* Ornaments hanging from left tree */}
        <div className="ornament" style={{ position: 'absolute', left: '140px', top: '150px' }}>
          <div style={{ width: '2px', height: '30px', background: '#8B4513' }} />
          <div
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              background: 'radial-gradient(circle at 30% 30%, #ff6b6b, #c92a2a)',
              boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
              marginTop: '-2px',
            }}
          />
        </div>

        <div className="ornament" style={{ position: 'absolute', left: '150px', top: '300px' }}>
          <div style={{ width: '2px', height: '40px', background: '#8B4513' }} />
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: 'radial-gradient(circle at 30% 30%, #51cf66, #2f9e44)',
              boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
              marginTop: '-2px',
            }}
          />
        </div>

        <div className="ornament" style={{ position: 'absolute', left: '145px', top: '480px' }}>
          <div style={{ width: '2px', height: '35px', background: '#8B4513' }} />
          <div
            style={{
              width: '22px',
              height: '22px',
              borderRadius: '50%',
              background: 'radial-gradient(circle at 30% 30%, #ff6b6b, #c92a2a)',
              boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
              marginTop: '-2px',
            }}
          />
        </div>

        <div className="ornament" style={{ position: 'absolute', left: '155px', top: '650px' }}>
          <div style={{ width: '2px', height: '45px', background: '#8B4513' }} />
          <div
            style={{
              width: '26px',
              height: '26px',
              borderRadius: '50%',
              background: 'radial-gradient(circle at 30% 30%, #51cf66, #2f9e44)',
              boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
              marginTop: '-2px',
            }}
          />
        </div>
      </div>

      {/* Right Tree Branch (mirror of left) */}
      <div
        style={{
          position: 'fixed',
          right: '-80px', // Mostly off-screen
          top: 0,
          width: '200px',
          height: '100vh',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      >
        {/* Tree branch - mirrored */}
        <svg width="200" height="100%" viewBox="0 0 200 1000" style={{ opacity: 0.9 }}>
          {/* Tree branch (green) */}
          <path
            d="M 50 0 L 0 300 L 20 300 L -20 600 L 10 600 L -30 900 L 0 900 L 0 1000 L 50 1000 Z"
            fill="#2d5016"
            opacity="0.95"
          />
          {/* Lighter green layer */}
          <path
            d="M 40 50 L 0 320 L 15 320 L -15 620 L 5 620 L -25 920 L 0 920 L 0 1000 L 40 1000 Z"
            fill="#3d7028"
            opacity="0.8"
          />
        </svg>

        {/* Ornaments hanging from right tree */}
        <div className="ornament" style={{ position: 'absolute', left: '38px', top: '180px' }}>
          <div style={{ width: '2px', height: '32px', background: '#8B4513' }} />
          <div
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              background: 'radial-gradient(circle at 30% 30%, #51cf66, #2f9e44)',
              boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
              marginTop: '-2px',
            }}
          />
        </div>

        <div className="ornament" style={{ position: 'absolute', left: '30px', top: '320px' }}>
          <div style={{ width: '2px', height: '38px', background: '#8B4513' }} />
          <div
            style={{
              width: '26px',
              height: '26px',
              borderRadius: '50%',
              background: 'radial-gradient(circle at 30% 30%, #ff6b6b, #c92a2a)',
              boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
              marginTop: '-2px',
            }}
          />
        </div>

        <div className="ornament" style={{ position: 'absolute', left: '35px', top: '500px' }}>
          <div style={{ width: '2px', height: '42px', background: '#8B4513' }} />
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: 'radial-gradient(circle at 30% 30%, #51cf66, #2f9e44)',
              boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
              marginTop: '-2px',
            }}
          />
        </div>

        <div className="ornament" style={{ position: 'absolute', left: '32px', top: '680px' }}>
          <div style={{ width: '2px', height: '36px', background: '#8B4513' }} />
          <div
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              background: 'radial-gradient(circle at 30% 30%, #ff6b6b, #c92a2a)',
              boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
              marginTop: '-2px',
            }}
          />
        </div>
      </div>
    </>
  );
};

export default ChristmasDecor;
