const S = {
  bar: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0 24px', height: 60,
    background: 'rgba(7,7,22,0.92)',
    backdropFilter: 'blur(24px)',
    borderBottom: '1px solid rgba(244,247,255,0.1)',
    flexShrink: 0,
    position: 'relative', zIndex: 100,
  },
  logo: {
    display: 'flex', alignItems: 'center', gap: 10,
    fontFamily: 'var(--font-display)', fontWeight: 700,
    fontSize: 17, letterSpacing: '-0.03em', color: 'var(--text)',
    userSelect: 'none',
  },
  logoIcon: {
    width: 32, height: 32, borderRadius: 9,
    background: 'linear-gradient(135deg, #8B7CFF, #00E5A8)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 16,
  },
  nav: { display: 'flex', gap: 4 },
  navBtn: (active) => ({
    padding: '7px 16px', borderRadius: 10,
    fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 500,
    color: active ? 'var(--text)' : 'var(--muted)',
    background: active ? 'var(--glass)' : 'transparent',
    border: active ? '1px solid var(--line)' : '1px solid transparent',
    cursor: 'pointer', transition: 'all .15s',
    letterSpacing: '0.01em',
  }),
  right: { display: 'flex', alignItems: 'center', gap: 16 },
  routeLabel: {
    display: 'flex', alignItems: 'center', gap: 8,
    fontFamily: 'var(--font-mono)', fontSize: 13,
    color: 'var(--muted)',
  },
  routeIcao: {
    color: 'var(--text)', fontWeight: 500,
  },
  arrow: { color: 'var(--violet)', fontSize: 16 },
  statusDot: (state) => ({
    width: 8, height: 8, borderRadius: '50%',
    background: state === 'ready' ? 'var(--mint)' : state === 'loading' ? 'var(--amber)' : 'var(--dim)',
    boxShadow: state === 'ready' ? '0 0 10px var(--mint)' : state === 'loading' ? '0 0 10px var(--amber)' : 'none',
    animation: state === 'loading' ? 'pulse 1s ease-in-out infinite' : 'none',
  }),
  statusLabel: {
    fontSize: 12, color: 'var(--muted)', letterSpacing: '0.05em', textTransform: 'uppercase',
  },
  divider: {
    width: 1, height: 20, background: 'var(--line)',
  },
}

export default function TopBar({ screen, onNavigate, departure, arrival, selectedSID, selectedSTAR, routeState }) {
  const tabs = [
    { id: 'plan', label: 'Flight Plan' },
    { id: 'sid',  label: 'SID' + (selectedSID  ? ` · ${selectedSID.name}`  : '') },
    { id: 'star', label: 'STAR' + (selectedSTAR ? ` · ${selectedSTAR.name}` : '') },
  ]

  const statusMap = { idle: 'No Route', loading: 'Calculating…', ready: 'Route Ready' }

  return (
    <header style={S.bar}>
      {/* Logo */}
      <div style={S.logo}>
        <div style={S.logoIcon}>✦</div>
        FlightPlanner
      </div>

      {/* Nav tabs */}
      <nav style={S.nav}>
        {tabs.map(t => (
          <button key={t.id} style={S.navBtn(screen === t.id)} onClick={() => onNavigate(t.id)}>
            {t.label}
          </button>
        ))}
      </nav>

      {/* Right: route + status */}
      <div style={S.right}>
        {departure && arrival && (
          <div style={S.routeLabel}>
            <span style={S.routeIcao}>{departure.icao}</span>
            <span style={S.arrow}>→</span>
            <span style={S.routeIcao}>{arrival.icao}</span>
          </div>
        )}

        {departure && arrival && <div style={S.divider} />}

        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <div style={S.statusDot(routeState)} />
          <span style={S.statusLabel}>{statusMap[routeState] ?? 'Ready'}</span>
        </div>
      </div>
    </header>
  )
}
