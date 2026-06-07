"use client"
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

interface ReportResult {
  validation_score: number
  signal_level: string
  icp_description: string
  market_response: { yes: number; no: number; maybe: number }
  willingness_to_pay: Record<string, number>
  top_objections: string[]
  top_features: string[]
  next_steps: string[]
  personas_count: number
}

interface ReportData {
  product_name: string
  status: string
  result?: ReportResult
}

export default function ReportPage() {
  const searchParams = useSearchParams()
  const shareToken = searchParams.get('token')
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!shareToken) { setError(true); setLoading(false); return }
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
    fetch(`${apiUrl}/api/analyses/share/${shareToken}`)
      .then(res => { if (!res.ok) throw new Error(); return res.json() })
      .then(d => { setData(d); setLoading(false) })
      .catch(() => { setError(true); setLoading(false) })
  }, [shareToken])

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <p className="text-accent-green font-mono animate-pulse">LOADING REPORT...</p>
    </div>
  )

  if (error || !data || data.status !== 'completed' || !data.result) return (
    <div className="min-h-screen bg-background flex items-center justify-center flex-col gap-4">
      <p className="text-red-400 font-mono">REPORT NOT FOUND</p>
      <Link href="/landing" className="text-accent-green font-mono text-sm hover:underline">← Back to MCPulse</Link>
    </div>
  )

  const r: ReportResult = data.result
  const scoreColor = r.signal_level === 'STRONG' ? '#00FF94' : r.signal_level === 'MODERATE' ? '#FFB800' : '#FF3B3B'
  const total = r.market_response.yes + r.market_response.no + r.market_response.maybe || 1

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white">
      <div className="bg-[#0a0a0a] border-b border-gray-800 px-8 py-6">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div>
            <Link href="/landing" className="text-accent-green font-mono text-sm">MCPulse</Link>
            <h1 className="text-2xl font-bold font-mono mt-1">{data.product_name}</h1>
            <p className="text-gray-500 text-sm mt-1 font-mono">
              Market Validation Report · {r.personas_count} synthetic customers surveyed
            </p>
          </div>
          <div className="text-center">
            <div className="text-6xl font-mono font-bold" style={{ color: scoreColor }}>{r.validation_score}</div>
            <div className="font-mono text-xs mt-1" style={{ color: scoreColor }}>{r.signal_level} SIGNAL</div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-8 py-8 space-y-8">
        <section>
          <h2 className="font-mono text-xs text-gray-500 uppercase tracking-widest mb-3">Ideal Customer Profile</h2>
          <p className="text-white text-lg leading-relaxed bg-[#111] rounded-xl p-6 border border-gray-800">{r.icp_description}</p>
        </section>

        <section>
          <h2 className="font-mono text-xs text-gray-500 uppercase tracking-widest mb-3">Market Response</h2>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Would Buy', count: r.market_response.yes, color: '#00FF94' },
              { label: 'Maybe', count: r.market_response.maybe, color: '#FFB800' },
              { label: 'No', count: r.market_response.no, color: '#FF3B3B' },
            ].map(item => (
              <div key={item.label} className="bg-[#111] rounded-xl p-6 border border-gray-800 text-center">
                <div className="text-4xl font-mono font-bold" style={{ color: item.color }}>{item.count}</div>
                <div className="text-gray-400 text-sm mt-2">{item.label}</div>
                <div className="text-gray-600 font-mono text-xs">{Math.round(item.count / total * 100)}%</div>
              </div>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <section>
            <h2 className="font-mono text-xs text-gray-500 uppercase tracking-widest mb-3">Top Objections</h2>
            <div className="bg-[#111] rounded-xl p-6 border border-gray-800 space-y-4">
              {r.top_objections.map((obj, i) => (
                <div key={i} className="flex gap-3">
                  <span className="text-[#FF3B3B] font-mono font-bold text-sm shrink-0">0{i+1}</span>
                  <p className="text-gray-300 text-sm">{obj}</p>
                </div>
              ))}
            </div>
          </section>
          <section>
            <h2 className="font-mono text-xs text-gray-500 uppercase tracking-widest mb-3">Most Requested Features</h2>
            <div className="bg-[#111] rounded-xl p-6 border border-gray-800 space-y-4">
              {r.top_features.map((feat, i) => (
                <div key={i} className="flex gap-3">
                  <span className="text-accent-green font-mono font-bold text-sm shrink-0">0{i+1}</span>
                  <p className="text-gray-300 text-sm">{feat}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <section>
          <h2 className="font-mono text-xs text-gray-500 uppercase tracking-widest mb-3">Recommended Next Steps</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {r.next_steps.map((step, i) => (
              <div key={i} className="bg-[#111] rounded-xl p-6 border border-gray-800">
                <span className="text-accent-green font-mono text-xs font-bold">{String(i+1).padStart(2,'0')}</span>
                <p className="text-white text-sm mt-3 leading-relaxed">{step}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="font-mono text-xs text-gray-500 uppercase tracking-widest mb-3">Willingness to Pay</h2>
          <div className="bg-[#111] rounded-xl p-6 border border-gray-800">
            {Object.entries(r.willingness_to_pay)
              .sort((a, b) => ['€0','€1-10','€10-30','€30-100','€100+'].indexOf(a[0]) - ['€0','€1-10','€10-30','€30-100','€100+'].indexOf(b[0]))
              .map(([tier, count]) => (
                <div key={tier} className="flex items-center gap-4 mb-3">
                  <span className="text-gray-400 font-mono text-xs w-16 shrink-0">{tier}</span>
                  <div className="flex-1 bg-gray-800 rounded-full h-3">
                    <div className="bg-accent-green h-3 rounded-full" style={{ width: `${Math.round((count as number) / total * 100)}%` }} />
                  </div>
                  <span className="text-gray-500 font-mono text-xs w-8 text-right">{count as number}</span>
                </div>
              ))}
          </div>
        </section>

        <footer className="text-center text-gray-600 font-mono text-xs pt-4 border-t border-gray-800">
          Generated by MCPulse · market validation powered by synthetic AI personas
        </footer>
      </div>
    </div>
  )
}
