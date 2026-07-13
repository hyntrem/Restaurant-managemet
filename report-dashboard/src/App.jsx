import { useState, useEffect, useCallback } from 'react'
import 'chart.js/auto'
import { Bar } from 'react-chartjs-2'

// ── Config ──────────────────────────────────────────────────────
const API = 'http://localhost:8080'

const fmt    = (n) => Number(n || 0).toLocaleString('vi-VN')
const fmtVND = (n) => `${fmt(n)} ₫`

async function apiFetch(path) {
  const res = await fetch(`${API}${path}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}
// ══════════════════════════════════════════════════════════════════
// SECTION 2 — Doanh thu theo giờ
// ══════════════════════════════════════════════════════════════════
function HourlyChart({ data, loading }) {
  if (loading) return <div className="loading-row">⏳ Đang tải biểu đồ...</div>
  if (!data?.length) return <div className="empty-row">Chưa có dữ liệu doanh thu theo giờ</div>

  const labels = data.map(r => r.hour)
  const values = data.map(r => Number(r.sales))
  const maxVal = Math.max(...values)

  const chartData = {
    labels,
    datasets: [
      {
        type: 'bar',
        label: 'Doanh thu (₫)',
        data: values,
        backgroundColor: values.map(v =>
          v === maxVal ? 'rgba(22,59,109,0.85)' : 'rgba(22,59,109,0.28)'
        ),
        borderRadius: 6,
      },
      {
        type: 'line',
        label: 'Xu hướng',
        data: values,
        borderColor: '#d9b54a',
        borderWidth: 2,
        pointBackgroundColor: '#d9b54a',
        pointRadius: 4,
        tension: 0.4,
        fill: false,
      },
    ],
  }

  const options = {
    responsive: true,
    plugins: {
      legend: { position: 'top', labels: { font: { family: 'Be Vietnam Pro' } } },
      tooltip: { callbacks: { label: ctx => ` ${fmt(ctx.raw)} ₫` } }
    },
    scales: {
      y: {
        ticks: {
          callback: v => `${(v / 1_000_000).toFixed(1)}M`,
          font: { family: 'Be Vietnam Pro', size: 11 },
        },
        grid: { color: '#f1ede4' },
      },
      x: {
        ticks: { font: { family: 'Be Vietnam Pro', size: 11 } },
        grid: { display: false },
      }
    }
  }

  return <Bar data={chartData} options={options} />
}

// ══════════════════════════════════════════════════════════════════
// SECTION 3 — Top 5 món bán chạy
// ══════════════════════════════════════════════════════════════════
function TopProductsChart({ data, loading }) {
  if (loading) return <div className="loading-row">⏳ Đang tải top sản phẩm...</div>
  if (!data?.length) return <div className="empty-row">Chưa có dữ liệu top sản phẩm</div>

  const rankClass = (i) => i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : ''

  const chartData = {
    labels: data.map(r => r.name),
    datasets: [{
      label: 'Số lượng bán',
      data: data.map(r => r.quantity),
      backgroundColor: [
        'rgba(217,181,74,0.85)',
        'rgba(22,59,109,0.75)',
        'rgba(22,59,109,0.55)',
        'rgba(22,59,109,0.38)',
        'rgba(22,59,109,0.22)',
      ],
      borderRadius: 6,
    }]
  }

  const options = {
    indexAxis: 'y',
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: ctx => ` ${ctx.raw} phần` } }
    },
    scales: {
      x: { grid: { color: '#f1ede4' }, ticks: { font: { family: 'Be Vietnam Pro', size: 11 } } },
      y: { grid: { display: false }, ticks: { font: { family: 'Be Vietnam Pro', size: 12 } } }
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <Bar data={chartData} options={options} />

      <table className="data-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Món</th>
            <th style={{ textAlign: 'right' }}>Số lượng</th>
            <th style={{ textAlign: 'right' }}>Doanh thu</th>
          </tr>
        </thead>
        <tbody>
          {data.map((r, i) => (
            <tr key={i}>
              <td><span className={`rank ${rankClass(i)}`}>{i + 1}</span></td>
              <td style={{ fontWeight: 600 }}>{r.name}</td>
              <td style={{ textAlign: 'right' }}>{r.quantity} phần</td>
              <td style={{ textAlign: 'right', color: 'var(--success)', fontWeight: 600 }}>
                {fmtVND(r.revenue)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
// SECTION 4 — Hiệu suất chi nhánh (Component Mới)
// ══════════════════════════════════════════════════════════════════
function BranchPerformanceTable({ data, loading }) {
  if (loading) return <div className="loading-row">⏳ Đang tải hiệu suất...</div>
  if (!data?.length) return <div className="empty-row">Chưa có dữ liệu chi nhánh</div>

  return (
    <table className="data-table">
      <thead>
        <tr>
          <th>Chi nhánh</th>
          <th style={{ textAlign: 'right' }}>Tổng Đơn</th>
          <th style={{ textAlign: 'right' }}>Doanh thu</th>
        </tr>
      </thead>
      <tbody>
        {data.map((r, i) => (
          <tr key={i}>
            <td style={{ fontWeight: 600, color: 'var(--marine)' }}>{r.branch}</td>
            <td style={{ textAlign: 'right' }}>{r.orders}</td>
            <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--success)' }}>
              {fmtVND(r.revenue)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// ══════════════════════════════════════════════════════════════════
// SECTION 5 — Market Basket (Cập nhật Key Data)
// ══════════════════════════════════════════════════════════════════
function MarketBasketTable({ data, loading }) {
  if (loading) return <div className="loading-row">⏳ Đang phân tích cặp món...</div>
  if (!data?.length) return (
    <div className="empty-row">
      Chưa đủ dữ liệu phân tích<br />
      <span style={{ fontSize: 12 }}>(Cần ít nhất 5 đơn hàng có 2+ món)</span>
    </div>
  )

  const maxLift = Math.max(...data.map(r => r.lift))
  const liftColor = (lift) => lift >= 2 ? 'var(--success)' : lift >= 1.5 ? 'var(--gold)' : 'var(--info)'

  return (
    <table className="data-table">
      <thead>
        <tr>
          <th>Món A</th>
          <th>Món B</th>
          <th style={{ textAlign: 'right' }}>Cùng mua</th>
          <th>Chỉ số Lift</th>
        </tr>
      </thead>
      <tbody>
        {data.map((r, i) => (
          <tr key={i}>
            <td style={{ fontWeight: 600 }}>{r.itemA}</td>
            <td style={{ fontWeight: 600 }}>{r.itemB}</td>
            <td style={{ textAlign: 'right' }}>{r.confidence} lần</td>
            <td style={{ minWidth: 120 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontWeight: 700, color: liftColor(r.lift), fontSize: 13 }}>
                  {Number(r.lift).toFixed(2)}x
                </span>
                <div className="lift-bar" style={{ flex: 1 }}>
                  <div
                    className="lift-fill"
                    style={{
                      width: `${(r.lift / maxLift) * 100}%`,
                      background: liftColor(r.lift)
                    }}
                  />
                </div>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// ══════════════════════════════════════════════════════════════════
// SECTION 6 — Dự báo nguyên liệu (Cập nhật Key Data)
// ══════════════════════════════════════════════════════════════════
function ForecastTable({ data, loading }) {
  if (loading) return <div className="loading-row">⏳ Đang tải dự báo...</div>
  if (!data?.length) return (
    <div className="empty-row">
      Chưa có dự báo<br />
      <span style={{ fontSize: 12 }}>(Cần ít nhất 7 ngày dữ liệu xuất kho)</span>
    </div>
  )

  return (
    <table className="data-table">
      <thead>
        <tr>
          <th>Nguyên liệu</th>
          <th style={{ textAlign: 'right' }}>Dự báo cần</th>
          <th>Đơn vị</th>
        </tr>
      </thead>
      <tbody>
        {data.map((r, i) => (
          <tr key={i}>
            <td style={{ fontWeight: 600 }}>{r.name}</td>
            <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--marine)' }}>
              {Number(r.quantity).toFixed(1)}
            </td>
            <td><span className="badge blue">{r.unit}</span></td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// ══════════════════════════════════════════════════════════════════
// ROOT APP - ĐÃ FIX GỌI 1 API DUY NHẤT
// ══════════════════════════════════════════════════════════════════
export default function App() {
  const [hourly,      setHourly]      = useState([])
  const [topProducts, setTopProducts] = useState([])
  const [basket,      setBasket]      = useState([])
  const [forecast,    setForecast]    = useState([])
  const [branches,    setBranches]    = useState([]) // Khai báo state mới cho nhánh
  const [lastUpdate,  setLastUpdate]  = useState('')

  const [loadingDashboard, setLoadingDashboard] = useState(true)

  const fetchAll = useCallback(async () => {
    setLoadingDashboard(true)
    
    // GỌI 1 API DUY NHẤT BAO GỒM TOÀN BỘ DATA
    apiFetch('/api/reports/dashboard-aggregate')
      .then(res => {
        const d = res.data || {}
        
        // Phân bổ dữ liệu về các state
        setHourly(d.hourly_sales || [])
        setTopProducts(d.top_products || [])
        setBranches(d.branch_performance || [])
        setForecast(d.forecast || [])
        setBasket(d.ai_pairs || [])
        
        setLoadingDashboard(false)
        setLastUpdate(new Date().toLocaleTimeString('vi-VN'))
      })
      .catch(err => {
        console.error('Lỗi Dashboard API:', err)
        setLoadingDashboard(false)
      })
  }, [])

  useEffect(() => {
    fetchAll()
    const timer = setInterval(fetchAll, 5 * 60 * 1000)
    return () => clearInterval(timer)
  }, [fetchAll])

  return (
    <div className="page">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="top-bar">
        <div className="page-header">
          <h2>🧠 Khai Thác Dữ Liệu — Pizza 4P's</h2>
          <p>Phân tích từ kho dữ liệu OLAP · Cập nhật lúc {lastUpdate || '...'}</p>
        </div>
        <button className="refresh-btn" onClick={fetchAll}>🔄 Làm mới</button>
      </div>

      {/* ── 2. Lưới 2 cột cho các Panel Biểu Đồ ────────────────── */}
      <div className="card-grid-2" style={{ marginTop: '24px' }}>
        
        {/* CỘT TRÁI */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="panel">
            <h3>Doanh Thu Theo Khung Giờ</h3>
            <p className="sub">Phân bố doanh thu trong ngày — xác định giờ cao điểm</p>
            <HourlyChart data={hourly} loading={loadingDashboard} />
          </div>

          <div className="panel">
            <h3>Hiệu Suất Chi Nhánh</h3>
            <p className="sub">So sánh doanh thu và lượng đơn theo chi nhánh</p>
            <BranchPerformanceTable data={branches} loading={loadingDashboard} />
          </div>

          <div className="panel">
            <h3>Cặp Món Hay Mua Cùng Nhau</h3>
            <p className="sub">Thuật toán Apriori · Lift &gt; 1.0 = có xu hướng mua kèm</p>
            <MarketBasketTable data={basket} loading={loadingDashboard} />
          </div>
        </div>

        {/* CỘT PHẢI */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="panel">
            <h3>Top 5 Món Bán Chạy Nhất</h3>
            <p className="sub">Xếp hạng theo số lượng bán · Cập nhật mỗi 30 phút</p>
            <TopProductsChart data={topProducts} loading={loadingDashboard} />
          </div>

          <div className="panel">
            <h3>Dự Báo Nhu Cầu Nguyên Liệu</h3>
            <p className="sub">Dự báo dựa trên dữ liệu lịch sử xuất kho</p>
            <ForecastTable data={forecast} loading={loadingDashboard} />
          </div>
        </div>

      </div>

    </div>
  )
}