"use client"
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { post } from '@/lib/api'
import { useAnalysisStore } from '@/lib/store'
import toast from 'react-hot-toast'
import Link from 'next/link'

type Step = 1 | 2 | 3 | 4

interface IdeaForm {
  product_name: string
  problem: string
  target_customer: string
  solution: string
  price_point: string
  openai_api_key: string
}

export default function OnboardingPage() {
  const router = useRouter()
  const { setAnalysisId, setProgress } = useAnalysisStore()
  const wsRef = useRef<WebSocket | null>(null)

  const [step, setStep] = useState<Step>(1)
  const [form, setForm] = useState<IdeaForm>({
    product_name: '',
    problem: '',
    target_customer: '',
    solution: '',
    price_point: '',
    openai_api_key: '',
  })
  const [loading, setLoading] = useState(false)
  const [terminalLines, setTerminalLines] = useState<string[]>([])
  const terminalRef = useRef<HTMLDivElement>(null)

  // AUTH DISABLED FOR TESTING
  // useEffect(() => {
  //   supabase.auth.getSession().then(({ data: { session } }) => {
  //     if (!session) router.push('/auth/login')
  //   })
  // }, [router])

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [terminalLines])

  function addLine(line: string) {
    setTerminalLines(prev => [...prev, line])
  }

  function update(field: keyof IdeaForm, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleLaunch() {
    setLoading(true)
    setStep(4)
    addLine('> Initializing MCPulse analysis engine...')

    try {
      // AUTH DISABLED FOR TESTING — use empty token
      const { data: { session } } = await supabase.auth.getSession()
      const accessToken = session?.access_token || 'test-mode'

      addLine('> Connecting...')

      const response = await post('/api/analyses/', {
        idea: form,
      }, accessToken)

      const id = response.analysis_id
      setAnalysisId(id)

      addLine(`> Analysis ID: ${id}`)
      addLine('> Connecting to analysis engine...')

      const wsUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000')
        .replace('http', 'ws')
        .replace('https', 'wss')

      const ws = new WebSocket(`${wsUrl}/ws/analysis/${id}`)
      wsRef.current = ws

      ws.onopen = () => {
        addLine('> WebSocket connected. Starting analysis...')
      }

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data)

        if (data.type === 'progress') {
          addLine(data.message)
          setProgress({ stage: data.stage, step: data.step, total: data.total })
        } else if (data.type === 'complete') {
          addLine('')
          addLine('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
          addLine('  ANALYSIS COMPLETE. Redirecting to dashboard...')
          addLine('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
          ws.close()
          setTimeout(() => router.push(`/dashboard?analysis=${id}`), 1500)
        } else if (data.type === 'error') {
          addLine(`> ERROR: ${data.message}`)
          toast.error(data.message)
          setLoading(false)
        }
      }

      ws.onerror = () => {
        addLine('> WebSocket error. Analysis may still be running.')
        toast.error('Connection error. Check your console.')
        setLoading(false)
      }

      ws.onclose = () => {
        addLine('> Connection closed.')
      }

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      addLine(`> FATAL: ${msg}`)
      toast.error(msg)
      setLoading(false)
      setStep(3)
    }
  }

  return (
    <div className="min-h-screen bg-background p-4">
      {/* Nav */}
      <nav className="flex justify-between items-center max-w-2xl mx-auto mb-12 pt-4">
        <Link href="/landing" className="text-accent-green font-mono text-xl font-bold">MCPulse</Link>
        <span className="text-gray-500 font-mono text-sm">
          {step < 4 ? `STEP ${step}/3` : 'RUNNING'}
        </span>
      </nav>

      <div className="max-w-2xl mx-auto">

        {/* STEP 1: IDEA */}
        {step === 1 && (
          <div>
            <p className="text-accent-green font-mono text-sm mb-2">// STEP 1 OF 3</p>
            <h1 className="text-white font-mono text-2xl font-bold mb-8">DESCRIBE YOUR IDEA</h1>

            <div className="space-y-6">
              <Field label="PRODUCT NAME">
                <input
                  value={form.product_name}
                  onChange={e => update('product_name', e.target.value)}
                  className={inputClass}
                  placeholder="What are you building?"
                />
              </Field>

              <Field label="WHAT PROBLEM DOES IT SOLVE?">
                <textarea
                  value={form.problem}
                  onChange={e => update('problem', e.target.value)}
                  rows={3}
                  className={inputClass}
                  placeholder="Describe the pain point your product addresses..."
                />
              </Field>

              <Field label="WHO IS YOUR TARGET CUSTOMER?">
                <textarea
                  value={form.target_customer}
                  onChange={e => update('target_customer', e.target.value)}
                  rows={2}
                  className={inputClass}
                  placeholder="e.g. Solo founders at pre-seed stage, aged 25-40..."
                />
              </Field>

              <Field label="WHAT IS YOUR SOLUTION?">
                <textarea
                  value={form.solution}
                  onChange={e => update('solution', e.target.value)}
                  rows={3}
                  className={inputClass}
                  placeholder="How does your product solve the problem?"
                />
              </Field>

              <Field label="PRICE POINT">
                <input
                  value={form.price_point}
                  onChange={e => update('price_point', e.target.value)}
                  className={inputClass}
                  placeholder="e.g. €29/month, €199 one-time, Freemium + €49/mo"
                />
              </Field>

              <button
                onClick={() => {
                  if (!form.product_name || !form.problem || !form.solution) {
                    toast.error('Please fill in all fields')
                    return
                  }
                  setStep(2)
                }}
                className="w-full bg-accent-green text-black font-mono font-bold py-3 rounded hover:shadow-glow-green transition-all"
              >
                Next: Add API key →
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: API KEY */}
        {step === 2 && (
          <div>
            <p className="text-accent-green font-mono text-sm mb-2">// STEP 2 OF 3</p>
            <h1 className="text-white font-mono text-2xl font-bold mb-8">YOUR OPENAI API KEY</h1>

            <div className="card-glow rounded-lg p-6 bg-[#0f0f0f] mb-6">
              <div className="flex items-start gap-3 mb-4">
                <span className="text-accent-green font-mono text-lg">i</span>
                <div>
                  <p className="text-white font-mono text-sm font-bold mb-1">HOW WE USE YOUR KEY</p>
                  <p className="text-gray-400 text-sm leading-relaxed">
                    Your key is encrypted with AES-256 before storage and never logged or transmitted in plain text.
                    We use it only to run your analysis. You pay OpenAI directly — roughly{' '}
                    <span className="text-accent-green font-mono">$0.50 per analysis</span> using gpt-4o-mini.
                  </p>
                </div>
              </div>
              <p className="text-gray-500 text-xs">
                Get your key at{' '}
                <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-accent-green hover:underline">
                  platform.openai.com/api-keys →
                </a>
              </p>
            </div>

            <div className="space-y-6">
              <Field label="OPENAI API KEY">
                <input
                  type="password"
                  value={form.openai_api_key}
                  onChange={e => update('openai_api_key', e.target.value)}
                  className={inputClass}
                  placeholder="sk-..."
                />
              </Field>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 border border-gray-700 text-gray-400 font-mono py-3 rounded hover:border-gray-500 transition-all"
                >
                  ← Back
                </button>
                <button
                  onClick={() => {
                    if (!form.openai_api_key.startsWith('sk-')) {
                      toast.error('API key should start with sk-')
                      return
                    }
                    setStep(3)
                  }}
                  className="flex-1 bg-accent-green text-black font-mono font-bold py-3 rounded hover:shadow-glow-green transition-all"
                >
                  Next: Review →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: CONFIRM */}
        {step === 3 && (
          <div>
            <p className="text-accent-green font-mono text-sm mb-2">// STEP 3 OF 3</p>
            <h1 className="text-white font-mono text-2xl font-bold mb-8">READY TO LAUNCH</h1>

            <div className="card-glow rounded-lg p-6 bg-[#0f0f0f] mb-6 space-y-4">
              <SummaryRow label="PRODUCT" value={form.product_name} />
              <SummaryRow label="PRICE" value={form.price_point} />
              <div>
                <p className="text-gray-500 font-mono text-xs mb-1">PROBLEM</p>
                <p className="text-white text-sm">{form.problem}</p>
              </div>
              <div>
                <p className="text-gray-500 font-mono text-xs mb-1">TARGET CUSTOMER</p>
                <p className="text-white text-sm">{form.target_customer}</p>
              </div>
              <SummaryRow label="API KEY" value={`sk-...${form.openai_api_key.slice(-4)}`} />
            </div>

            <div className="bg-[#111] border border-gray-800 rounded p-4 mb-6 font-mono text-xs text-gray-500">
              <p>{'>'} Will generate 50 synthetic personas</p>
              <p>{'>'} Survey each with 5 targeted questions</p>
              <p>{'>'} Analyse patterns and produce validation report</p>
              <p>{'>'} Estimated time: 45-90 seconds</p>
              <p>{'>'} Estimated cost: ~$0.50 from your OpenAI account</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(2)}
                className="flex-1 border border-gray-700 text-gray-400 font-mono py-3 rounded hover:border-gray-500 transition-all"
              >
                ← Back
              </button>
              <button
                onClick={handleLaunch}
                disabled={loading}
                className="flex-1 bg-accent-green text-black font-mono font-bold py-3 rounded hover:shadow-glow-green transition-all disabled:opacity-50"
              >
                Launch analysis →
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: TERMINAL PROGRESS */}
        {step === 4 && (
          <div>
            <p className="text-accent-green font-mono text-sm mb-2">// RUNNING ANALYSIS</p>
            <h1 className="text-white font-mono text-2xl font-bold mb-6">ANALYSING MARKET...</h1>

            <div
              ref={terminalRef}
              className="bg-[#0a0a0a] border border-accent-green/30 rounded-lg p-6 font-mono text-sm h-80 overflow-y-auto shadow-glow-green"
            >
              <div className="text-accent-green text-xs mb-4">MCPulse v0.1.0 — Market Validation Engine</div>
              {terminalLines.map((line, i) => (
                <div
                  key={i}
                  className={`mb-1 ${
                    line.startsWith('> ERROR')
                      ? 'text-red-400'
                      : line.startsWith('━')
                      ? 'text-accent-green font-bold'
                      : line.startsWith('  ANALYSIS')
                      ? 'text-accent-green font-bold'
                      : 'text-gray-300'
                  }`}
                >
                  {line}
                </div>
              ))}
              {loading && (
                <span className="text-accent-green animate-pulse">█</span>
              )}
            </div>

            <p className="text-gray-500 text-sm mt-4 text-center font-mono">
              Do not close this window. Analysis takes 45-90 seconds.
            </p>
          </div>
        )}

      </div>
    </div>
  )
}

const inputClass = "w-full bg-[#1a1a1a] border border-gray-700 text-white font-mono px-4 py-3 rounded focus:outline-none focus:border-accent-green transition-all resize-none"

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-gray-400 font-mono text-xs mb-2 uppercase tracking-wider">{label}</label>
      {children}
    </div>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-gray-500 font-mono text-xs">{label}</span>
      <span className="text-white font-mono text-sm">{value}</span>
    </div>
  )
}
