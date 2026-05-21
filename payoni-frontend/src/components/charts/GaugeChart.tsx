interface Props {
  value: number   // 0-100
  size?: number
}

export function GaugeChart({ value, size = 200 }: Props) {
  const v = Math.max(0, Math.min(100, value))
  const cx = size / 2
  const cy = Math.round(size * 0.54)
  const R  = Math.round(size * 0.40)
  const sw = Math.round(size * 0.095)

  const color = v >= 80 ? '#22c55e' : v >= 60 ? '#f59e0b' : '#ef4444'
  const bgColor = v >= 80 ? '#dcfce7' : v >= 60 ? '#fef9c3' : '#fee2e2'

  // Full half-circle: left → top → right, sweep=1 (clockwise on screen → upper arc)
  const fullArc = `M ${cx - R} ${cy} A ${R} ${R} 0 0 1 ${cx + R} ${cy}`

  // Stroke-dasharray fills from the arc start (left) proportionally
  const circ   = Math.PI * R
  const filled = (v / 100) * circ

  // Zone markers (thin ticks at 0, 60, 80, 100)
  const tick = (pct: number) => {
    const a  = Math.PI * (1 - pct / 100)
    const r1 = R - sw / 2 - 3
    const r2 = R + sw / 2 + 3
    return {
      x1: (cx + r1 * Math.cos(a)).toFixed(2),
      y1: (cy - r1 * Math.sin(a)).toFixed(2),
      x2: (cx + r2 * Math.cos(a)).toFixed(2),
      y2: (cy - r2 * Math.sin(a)).toFixed(2),
    }
  }

  // Needle
  const na   = Math.PI * (1 - v / 100)
  const nLen = R - Math.ceil(sw * 0.55)
  const nx   = (cx + nLen * Math.cos(na)).toFixed(2)
  const ny   = (cy - nLen * Math.sin(na)).toFixed(2)

  // Label positions (outside arc)
  const labelR = R + sw / 2 + 14
  const lLeft  = { x: cx - labelR, y: cy + 4 }
  const lMid   = { x: cx,          y: cy - labelR - 4 }
  const lRight = { x: cx + labelR, y: cy + 4 }

  const svgH = cy + Math.ceil(sw / 2) + 18

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={svgH} style={{ overflow: 'visible' }}>
        {/* Colored background track */}
        <path d={fullArc} fill="none" stroke={bgColor} strokeWidth={sw} strokeLinecap="round" />
        {/* Gray track overlay for unfilled portion */}
        <path
          d={fullArc}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={sw}
          strokeLinecap="round"
          strokeDasharray={`0 ${filled.toFixed(2)} ${(circ - filled).toFixed(2)}`}
          strokeDashoffset="0"
        />
        {/* Value fill */}
        {v > 0 && (
          <path
            d={fullArc}
            fill="none"
            stroke={color}
            strokeWidth={sw}
            strokeLinecap="round"
            strokeDasharray={`${filled.toFixed(2)} ${circ.toFixed(2)}`}
          />
        )}

        {/* Zone tick marks */}
        {[0, 60, 80, 100].map((pct) => {
          const t = tick(pct)
          return (
            <line key={pct} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
              stroke="#cbd5e1" strokeWidth={1.5} />
          )
        })}

        {/* Scale labels */}
        <text x={lLeft.x}  y={lLeft.y}  textAnchor="middle" fontSize={Math.round(size * 0.055)} fill="#94a3b8">0</text>
        <text x={lMid.x}   y={lMid.y}   textAnchor="middle" fontSize={Math.round(size * 0.055)} fill="#94a3b8">50</text>
        <text x={lRight.x} y={lRight.y} textAnchor="middle" fontSize={Math.round(size * 0.055)} fill="#94a3b8">100</text>

        {/* Needle */}
        <line x1={cx} y1={cy} x2={nx} y2={ny}
          stroke="#1e293b" strokeWidth={Math.max(2, size * 0.012)} strokeLinecap="round" />
        <circle cx={cx} cy={cy} r={sw * 0.44} fill="#1e293b" />
        <circle cx={cx} cy={cy} r={sw * 0.20} fill="white" />
      </svg>

      <div className="text-center -mt-1">
        <p className="font-bold text-gray-900" style={{ fontSize: size * 0.16 }}>
          %{v.toFixed(1)}
        </p>
      </div>
    </div>
  )
}
