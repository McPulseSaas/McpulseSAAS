"use client"
import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { get } from '@/lib/api'
import toast from 'react-hot-toast'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

interface AnalysisResult {
  validation_score: number
  signal_level: 'LOW' | 'MODERATE' | 'STRONG'
  icp_description: string
  market_response: { yes: number; no: number; maybe: number }
  willingness_to_pay: Record<string, number>
  top_objections: string[]
  top_features: string[]
  next_steps: string[]
  personas_count: number
}

interface Analysis {
  id: string
  product_name: string
  status: string
  created_at: string
  result?: AnalysisResult
  share_token?: string
  validation_score?: number
}

function DashboardContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [analyses, setAnalyses] = useState<Analysis[]>([])
  const [selected, setSelected] = useState<Analysis | null>(null)
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      // AUTH DISABLED FOR TESTING
      // if (!session) { router.push('/auth/login'); return }
      setToken(session?.access_token || 'test-mode')
      try {
        const data = await get('/api/analyses/', session.access_token)
        setAnalyses(data)
        // Auto-select from URL param or first completed
        const paramId = searchParams.get('analysis')
        if (paramId) {
          const found = data.find((a: Analysis) => a.id === paramId)
          if (found?.status === 'completed') {
            const full = await get(`/api/analyses/${paramId}`, session.access_token)
            setSelected(full)
          }
        } else {
          const first = data.find((a: Analysis) => a.status === 'completed')
          if (first) {
            const full = await get(`/api/analyses/${first.id}`, session.access_token)
            setSelected(full)
          }
        }
      } catch (e: unknown) {
        toast.error('Failed to load analyses')
      } finally {
        setLoading(false)
      }
    })
  }, [router, searchParams])

  async function selectAnalysis(a: Analysis) {
    if (!token) return
    const full = await get(`/api/analyses/${a.id}`, token)
    setSelected(full)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-accent-green font-mono animate-pulse">LOADING TERMINAL...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top Bar */}
      <header className="border-b border-gray-800 px-6 py-4 flex justify-between items-center">
        <span className="text-accent-green font-mono text-xl font-bold tracking-wider">MCPulse</span>
        <div className="flex items-center gap-4">
          <Link href="/onboarding" className="bg-accent-green text-black font-mono text-sm font-bold px-4 py-2 rounded hover:shadow-glow-green transition-all">
            + New Analysis
          </Link>
          <button
            onClick={() => supabase.auth.signOut().then(() => router.push('/auth/login'))}
            className="text-gray-500 font-mono text-sm hover:text-white transition-colors"
          >
            Logout
          </button>
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-65px)]">
        {/* Sidebar: analysis list */}
        <aside className="w-64 border-r border-gray-800 p-4 shrink-0">
          <p className="text-gray-500 font-mono text-xs uppercase tracking-wider mb-3">ANALYSES</p>
          {analyses.length === 0 ? (
            <div className="text-center mt-8">
              <p className="text-gray-600 font-mono text-xs mb-3">No analyses yet</p>
              <Link href="/onboarding" className="text-accent-green font-mono text-xs hover:underline">
                Run your first →
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {analyses.map(a => (
                <button
                  key={a.id}
                  onClick={() => selectAnalysis(a)}
                  className={`w-full text-left p-3 rounded border transition-all ${
                    selected?.id === a.id
                      ? 'border-accent-green bg-accent-green/5'
                      : 'border-gray-800 hover:border-gray-600'
                  }`}
                >
                  <p className="text-white font-mono text-xs font-bold truncate">{a.product_name}</p>
                  <p className={`font-mono text-xs mt-1 ${
                    a.status === 'completed' ? 'text-accent-green' :
                    a.status === 'failed' ? 'text-red-400' : 'text-yellow-400'
                  }`}>{a.status.toUpperCase()}</p>
                  {a.validation_score != null && (
                    <p className="text-gray-500 font-mono text-xs">{a.validation_score}/100</p>
                  )}
                </button>
              ))}
            </div>
          )}
        </aside>

        {/* Main content */}
        <main className="flex-1 p-6 overflow-auto">
          {!selected ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <p className="text-gray-600 font-mono text-sm mb-2">// NO ANALYSIS SELECTED</p>
              <p className="text-gray-400 font-mono text-lg mb-6">Ready to validate your idea?</p>
              <Link href="/onboarding" className="bg-accent-green text-black font-mono font-bold px-6 py-3 rounded hover:shadow-glow-green transition-all">
                Run the analysis →
              </Link>
            </div>
          ) : selected.result ? (
            <AnalysisReport analysis={selected} />
          ) : (
            <div className="text-center mt-20">
              <p className="text-yellow-400 font-mono">ANALYSIS STATUS: {selected.status.toUpperCase()}</p>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

function ScoreDisplay({ score, signal }: { score: number; signal: string }) {
  const color = signal === 'STRONG' ? '#00FF94' : signal === 'MODERATE' ? '#FFB800' : '#FF3B3B'
  const label = signal === 'STRONG' ? 'STRONG SIGNAL' : signal === 'MODERATE' ? 'MODERATE SIGNAL' : 'LOW SIGNAL'
  const glowClass = signal === 'STRONG' ? 'shadow-glow-green' : signal === 'MODERATE' ? 'shadow-[0_0_30px_rgba(255,184,0,0.4)]' : 'shadow-[0_0_30px_rgba(255,59,59,0.4)]'

  return (
    <div className={`text-center p-8 rounded-xl border bg-[#0f0f0f] ${glowClass}`} style={{ borderColor: color + '40' }}>
      <p className="font-mono text-xs text-gray-500 mb-2">VALIDATION SCORE</p>
      <div className="text-9xl font-mono font-bold" style={{ color, textShadow: `0 0 30px ${color}` }}>
        {score}
      </div>
      <div className="font-mono text-sm font-bold mt-2" style={{ color }}>
        {label}
      </div>
    </div>
  )
}

function AnalysisReport({ analysis }: { analysis: Analysis }) {
  const r = analysis.result!
  const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/McpulseSAAS/report/?token=${analysis.share_token}`

  const pieData = [
    { name: 'Yes', value: r.market_response.yes, color: '#00FF94' },
    { name: 'Maybe', value: r.market_response.maybe, color: '#FFB800' },
    { name: 'No', value: r.market_response.no, color: '#FF3B3B' },
  ]

  const wtpData = Object.entries(r.willingness_to_pay)
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => {
      const order = ['€0', '€1-10', '€10-30', '€30-100', '€100+']
      return order.indexOf(a.label) - order.indexOf(b.label)
    })

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <p className="text-accent-green font-mono text-xs mb-1">// ANALYSIS COMPLETE</p>
          <h1 className="text-white font-mono text-2xl font-bold">{analysis.product_name}</h1>
          <p className="text-gray-500 font-mono text-xs mt-1">
            {r.personas_count} personas surveyed · {new Date(analysis.created_at).toLocaleDateString()}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { navigator.clipboard.writeText(shareUrl); toast.success('Share link copied!') }}
            className="border border-gray-700 text-gray-400 font-mono text-xs px-3 py-2 rounded hover:border-accent-green hover:text-accent-green transition-all"
          >
            Share →
          </button>
          <Link
            href={`/report/?token=${analysis.share_token}`}
            className="border border-accent-green text-accent-green font-mono text-xs px-3 py-2 rounded hover:bg-accent-green hover:text-black transition-all"
          >
            Full Report →
          </Link>
        </div>
      </div>

      {/* Score + ICP row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ScoreDisplay score={r.validation_score} signal={r.signal_level} />
        <div className="card-glow rounded-xl p-6 bg-[#0f0f0f]">
          <p className="text-accent-green font-mono text-xs mb-3">YOUR IDEAL CUSTOMER</p>
          <p className="text-white text-sm leading-relaxed">{r.icp_description}</p>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Pie chart */}
        <div className="card-glow rounded-xl p-6 bg-[#0f0f0f]">
          <p className="text-accent-green font-mono text-xs mb-4">MARKET RESPONSE</p>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #333', color: '#fff', fontFamily: 'monospace' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Bar chart WTP */}
        <div className="card-glow rounded-xl p-6 bg-[#0f0f0f]">
          <p className="text-accent-green font-mono text-xs mb-4">WILLINGNESS TO PAY</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={wtpData}>
              <XAxis dataKey="label" tick={{ fill: '#666', fontSize: 11, fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#666', fontSize: 11, fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #333', color: '#fff', fontFamily: 'monospace' }} />
              <Bar dataKey="count" fill="#00FF94" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Objections + Features row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card-glow rounded-xl p-6 bg-[#0f0f0f]">
          <p className="text-accent-green font-mono text-xs mb-4">TOP OBJECTIONS</p>
          <ol className="space-y-3">
            {r.top_objections.map((obj, i) => (
              <li key={i} className="flex gap-3">
                <span className="text-[#FF3B3B] font-mono text-sm font-bold shrink-0">0{i + 1}</span>
                <span className="text-gray-300 text-sm">{obj}</span>
              </li>
            ))}
          </ol>
        </div>
        <div className="card-glow rounded-xl p-6 bg-[#0f0f0f]">
          <p className="text-accent-green font-mono text-xs mb-4">MOST REQUESTED FEATURES</p>
          <ol className="space-y-3">
            {r.top_features.map((feat, i) => (
              <li key={i} className="flex gap-3">
                <span className="text-accent-green font-mono text-sm font-bold shrink-0">0{i + 1}</span>
                <span className="text-gray-300 text-sm">{feat}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* Next Steps */}
      <div className="card-glow rounded-xl p-6 bg-[#0f0f0f]">
        <p className="text-accent-green font-mono text-xs mb-4">RECOMMENDED NEXT STEPS</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {r.next_steps.map((step, i) => (
            <div key={i} className="bg-[#1a1a1a] rounded-lg p-4">
              <span className="text-accent-green font-mono text-xs">{String(i + 1).padStart(2, '0')}</span>
              <p className="text-white text-sm mt-2">{step}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><p className="text-accent-green font-mono animate-pulse">LOADING TERMINAL...</p></div>}>
      <DashboardContent />
    </Suspense>
  )
}
