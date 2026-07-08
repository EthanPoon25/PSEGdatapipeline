import { useState, useEffect } from 'react'
import axios from 'axios'
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine
} from 'recharts'
import './App.css'

const ENDPOINT = 'http://localhost:8080/data'
const TURB_THRESHOLD = 5.0

function fmt(n, d = 2) {
  return Number(n).toFixed(d)
}

function fmtTime(ts) {
  try {
    return new Date(ts).toLocaleTimeString([], {
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    })
  } catch {
    return ts
  }
}

function toF(c) {
  return (parseFloat(c) * 9) / 5 + 32
}

const CustomTooltip = ({ active, payload, label, unit }) => {
  if (active && payload && payload.length) {
    return (
      <div className="tooltip">
        <p className="tooltip-time">{label}</p>
        <p className="tooltip-val">{fmt(payload[0].value)} <span>{unit}</span></p>
      </div>
    )
  }
  return null
}

export default function App() {
  const [readings, setReadings] = useState([])
  const [isSpiking, setIsSpiking] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    const poll = () => {
      axios.get(ENDPOINT)
        .then(res => {
          const data = res.data || []
          const sorted = [...data].sort(
            (a, b) => new Date(a.timestamp || a.time) - new Date(b.timestamp || b.time)
          )
          setReadings(sorted)
          setIsSpiking(sorted.some(r => parseFloat(r.turbidity) > TURB_THRESHOLD))
          setLastUpdated(new Date())
          setConnected(true)
        })
        .catch(() => setConnected(false))
    }
    poll()
    const id = setInterval(poll, 2000)
    return () => clearInterval(id)
  }, [])

  const latest = readings[readings.length - 1]
  const chartData = readings.map(r => ({
    time: fmtTime(r.timestamp || r.time),
    turbidity: parseFloat(fmt(r.turbidity)),
    temperature: parseFloat(fmt(toF(r.temperature))),
    atp: parseFloat(fmt(r.atp, 0)),
  }))

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-mark">HG</div>
          <div>
            <div className="logo-title">HarvestGuard</div>
            <div className="logo-sub">OS v1.0</div>
          </div>
        </div>
        <nav className="nav">
          <div className="nav-item active">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
            Dashboard
          </div>
          <div className="nav-item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            Telemetry
          </div>
          <div className="nav-item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            Reports
          </div>
          <div className="nav-item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>
            Alerts
          </div>
        </nav>

        <div className="sidebar-footer">
          <div className={`connection-dot ${connected ? 'ok' : 'error'}`} />
          <span>{connected ? 'Live stream' : 'Reconnecting...'}</span>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <h1 className="page-title">Water quality monitor</h1>
            <p className="page-sub">
              Unit: <strong>trailer_01</strong>
              {lastUpdated && ` · Updated ${fmtTime(lastUpdated)}`}
            </p>
          </div>
          <div className={`status-pill ${isSpiking ? 'danger' : 'ok'}`}>
            <div className="pill-dot" />
            {isSpiking ? 'Alert active' : 'All systems normal'}
          </div>
        </header>

        {isSpiking && (
          <div className="alert-banner">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            <div>
              <strong>High turbidity detected</strong>
              <span>UV effectiveness is reduced — chlorine injection recommended via Venturi injector.</span>
            </div>
          </div>
        )}

        <div className="metric-grid">
          {[
            {
              label: 'Turbidity',
              value: latest ? fmt(latest.turbidity) : '—',
              unit: 'NTU',
              status: latest
                ? parseFloat(latest.turbidity) > TURB_THRESHOLD ? 'danger'
                : parseFloat(latest.turbidity) > 3 ? 'warn' : 'ok'
                : 'ok',
              statusLabel: latest
                ? parseFloat(latest.turbidity) > TURB_THRESHOLD ? 'High — alert'
                : parseFloat(latest.turbidity) > 3 ? 'Elevated' : 'Normal'
                : '—',
              icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>
              )
            },
            {
              label: 'Temperature',
              value: latest ? fmt(toF(latest.temperature)) : '—',
              unit: '°F',
              status: latest
                ? toF(latest.temperature) > 100 ? 'danger'
                : toF(latest.temperature) > 90 ? 'warn' : 'ok'
                : 'ok',
              statusLabel: latest
                ? toF(latest.temperature) > 100 ? 'High' : 'Normal'
                : '—',
              icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/></svg>
              )
            },
            {
              label: 'ATP',
              value: latest ? fmt(latest.atp, 0) : '—',
              unit: 'RLU',
              status: latest
                ? parseFloat(latest.atp) > 200 ? 'danger'
                : parseFloat(latest.atp) > 100 ? 'warn' : 'ok'
                : 'ok',
              statusLabel: latest
                ? parseFloat(latest.atp) > 200 ? 'High — bacteria risk' : 'Normal'
                : '—',
              icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              )
            },
            {
              label: 'Readings',
              value: readings.length,
              unit: 'total',
              status: 'ok',
              statusLabel: 'Last 50 stored',
              icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
              )
            }
          ].map(m => (
            <div key={m.label} className="metric-card">
              <div className="metric-top">
                <span className="metric-label">{m.label}</span>
                <div className={`metric-icon icon-${m.status}`}>{m.icon}</div>
              </div>
              <div className="metric-value">
                {m.value}<span className="metric-unit">{m.unit}</span>
              </div>
              <div className={`metric-badge badge-${m.status}`}>{m.statusLabel}</div>
            </div>
          ))}
        </div>

        <div className="chart-grid">
          <div className="chart-card">
            <div className="chart-head">
              <div>
                <div className="chart-title">Turbidity</div>
                <div className="chart-sub">NTU — alert threshold at 5.0</div>
              </div>
              <div className="chart-legend">
                <span className="legend-dot" style={{ background: '#e24b4a' }} />
                <span>NTU</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#888' }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10, fill: '#888' }} />
                <Tooltip content={<CustomTooltip unit="NTU" />} />
                <ReferenceLine y={TURB_THRESHOLD} stroke="#e24b4a" strokeDasharray="4 3" strokeOpacity={0.5} />
                <Line type="monotone" dataKey="turbidity" stroke="#e24b4a" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-card">
            <div className="chart-head">
              <div>
                <div className="chart-title">Temperature</div>
                <div className="chart-sub">°F — safe range 34–45°F</div>
              </div>
              <div className="chart-legend">
                <span className="legend-dot" style={{ background: '#1d9e75' }} />
                <span>°F</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#888' }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10, fill: '#888' }} />
                <Tooltip content={<CustomTooltip unit="°F" />} />
                <Line type="monotone" dataKey="temperature" stroke="#1d9e75" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="table-card">
          <div className="table-head">
            <div className="chart-title">Recent readings</div>
            <div className={`live-tag ${connected ? 'ok' : ''}`}>
              <div className="live-dot" />
              live
            </div>
          </div>
          <table className="readings-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Unit</th>
                <th>Turbidity (NTU)</th>
                <th>Temp (°F)</th>
                <th>ATP (RLU)</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {[...readings].reverse().slice(0, 10).map((r, i) => {
                const t = parseFloat(r.turbidity)
                const isHigh = t > TURB_THRESHOLD
                return (
                  <tr key={i} className={isHigh ? 'row-danger' : ''}>
                    <td>{fmtTime(r.timestamp || r.time)}</td>
                    <td>{r.unitid || r.unit_id || '—'}</td>
                    <td className={isHigh ? 'val-danger' : 'val-ok'}>{fmt(t)}</td>
                    <td>{fmt(toF(r.temperature))}</td>
                    <td>{fmt(r.atp, 0)}</td>
                    <td>
                      <span className={`row-badge ${isHigh ? 'badge-danger' : 'badge-ok'}`}>
                        {isHigh ? 'Alert' : 'Normal'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  )
}
