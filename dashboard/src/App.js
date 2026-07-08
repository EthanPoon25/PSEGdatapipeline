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

