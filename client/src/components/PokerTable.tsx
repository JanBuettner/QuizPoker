interface PokerTableProps {
  children: React.ReactNode;
}

export default function PokerTable({ children }: PokerTableProps) {
  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* Outer wood frame */}
      <div
        style={{
          background: 'linear-gradient(160deg, #6b4423, #4a2e14, #3d2510, #5c3a1e)',
          borderRadius: '50%',
          padding: '16px',
          boxShadow: '0 0 40px rgba(0,0,0,0.5), inset 0 2px 4px rgba(139,90,43,0.3), inset 0 -2px 4px rgba(0,0,0,0.4)',
          border: '3px solid rgba(90,60,25,0.6)',
          aspectRatio: '2.2 / 1',
        }}
      >
        {/* Inner green felt */}
        <div
          style={{
            background: 'radial-gradient(ellipse at 50% 40%, #2d8a4e, #1a6b35, #14532d)',
            borderRadius: '50%',
            width: '100%',
            height: '100%',
            boxShadow: 'inset 0 0 40px rgba(0,0,0,0.4), inset 0 0 80px rgba(0,0,0,0.2)',
            border: '2px solid rgba(0,0,0,0.3)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '8% 12%',
            gap: '6px',
            overflow: 'hidden',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
