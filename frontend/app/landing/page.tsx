import Link from 'next/link'
import TypingHeadline from '@/components/TypingHeadline'
import PricingCard from '@/components/PricingCard'

const HOW_IT_WORKS = [
  {
    step: '01',
    label: 'DESCRIBE YOUR IDEA',
    description:
      "Tell us what you're building, who it's for, and your price point. Add your OpenAI API key.",
  },
  {
    step: '02',
    label: 'WE SURVEY THE MARKET',
    description:
      'We generate 1000 synthetic personas and survey each one with 5 targeted questions about your product.',
  },
  {
    step: '03',
    label: 'READ YOUR REPORT',
    description:
      'Get a validation score, your ICP, top objections, and what features would make people buy.',
  },
]

const FEATURES = [
  {
    title: 'VALIDATION SCORE',
    description: 'A 0–100 score telling you exactly how strong your market signal is.',
  },
  {
    title: 'IDEAL CUSTOMER',
    description: 'Plain-English description of the exact customer most likely to buy.',
  },
  {
    title: 'TOP OBJECTIONS',
    description: 'The 3 most common reasons your synthetic customers said no.',
  },
  {
    title: 'NEXT STEPS',
    description: 'Concrete actions based on your validation results.',
  },
]

const PRICING = [
  {
    tier: 'Free',
    price: '€0',
    volume: '1 analysis',
    features: ['1000 synthetic personas', 'Full validation report', 'Shareable link'],
    cta: 'Start free',
    href: '/auth/signup',
    highlighted: false,
  },
  {
    tier: 'Starter',
    price: '€29',
    period: '/mo',
    volume: '5 analyses/month',
    features: ['Everything in Free', 'Priority processing', 'PDF export'],
    cta: 'Get started',
    href: '/auth/signup',
    highlighted: true,
    badge: 'MOST POPULAR',
  },
  {
    tier: 'Growth',
    price: '€99',
    period: '/mo',
    volume: 'Unlimited analyses',
    features: [
      'Everything in Starter',
      'API access (coming soon)',
      'Team sharing (coming soon)',
    ],
    cta: 'Go unlimited',
    href: '/auth/signup',
    highlighted: false,
  },
]

export default function LandingPage() {
  return (
    <div className="bg-background text-white min-h-screen">
      {/* ── HERO ── */}
      <section className="relative overflow-hidden scanline-overlay min-h-screen flex flex-col">
        {/* Nav */}
        <nav className="relative z-10 flex items-center justify-between px-6 py-5 max-w-6xl mx-auto w-full">
          <span className="font-mono font-bold text-accent-green text-xl tracking-widest text-glow-green">
            MCPulse
          </span>
          <Link
            href="/dashboard"
            className="font-mono text-sm text-[#999] hover:text-accent-green transition-colors"
          >
            Login
          </Link>
        </nav>

        {/* Hero content */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-6 py-20 max-w-4xl mx-auto w-full">
          {/* Tag */}
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-accent-green mb-6">
            [ MARKET VALIDATION ENGINE ]
          </p>

          {/* Typing headline */}
          <div className="mb-6 w-full">
            <TypingHeadline />
          </div>

          {/* Subheadline */}
          <p className="text-base md:text-lg text-[#666] max-w-2xl mx-auto mb-10 leading-relaxed font-sans">
            MCPulse generates realistic customer personas, surveys each one with AI, and tells you
            exactly who will buy your product — before you write a single line of code.
          </p>

          {/* CTA */}
          <Link
            href="/onboarding"
            className="inline-block bg-accent-green text-black font-mono font-bold px-8 py-4 rounded shadow-glow-green hover:shadow-[0_0_35px_rgba(0,255,148,0.5)] hover:scale-[1.02] transition-all duration-200 text-base"
          >
            Run the analysis →
          </Link>

          <p className="mt-4 text-xs text-[#555] font-mono">
            Powered by your OpenAI key. ~$0.50 per analysis.
          </p>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="px-6 py-24 max-w-6xl mx-auto">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-accent-green mb-2 text-center">
          How it works
        </p>
        <h2 className="text-2xl md:text-3xl font-mono font-bold text-white text-center mb-16">
          Three steps to market clarity
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {HOW_IT_WORKS.map(({ step, label, description }) => (
            <div key={step} className="card-glow rounded-lg p-8 bg-[#111111]">
              <span className="block font-mono font-bold text-6xl text-accent-green text-glow-green mb-4 leading-none">
                {step}
              </span>
              <p className="font-mono text-xs uppercase tracking-widest text-accent-green mb-3">
                {label}
              </p>
              <p className="text-[#999] text-sm leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── WHAT YOU GET ── */}
      <section className="px-6 py-24 bg-[#0D0D0D]">
        <div className="max-w-6xl mx-auto">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-accent-green mb-2 text-center">
            What you get
          </p>
          <h2 className="text-2xl md:text-3xl font-mono font-bold text-white text-center mb-16">
            Everything you need to decide fast
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map(({ title, description }) => (
              <div key={title} className="card-glow rounded-lg p-6 bg-[#111111]">
                <p className="font-mono text-xs uppercase tracking-widest text-accent-green mb-3">
                  {title}
                </p>
                <p className="text-[#999] text-sm leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section className="px-6 py-24 max-w-6xl mx-auto">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-accent-green mb-2 text-center">
          Pricing
        </p>
        <h2 className="text-2xl md:text-3xl font-mono font-bold text-white text-center mb-16">
          Simple, transparent pricing
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          {PRICING.map((plan) => (
            <PricingCard key={plan.tier} {...plan} />
          ))}
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-[#1a1a1a] px-6 py-10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-[#555]">
          <span className="font-mono font-bold text-accent-green text-base tracking-widest">
            MCPulse
          </span>
          <p className="font-sans text-center">
            © 2024 MCPulse. Built by founders, for founders.
          </p>
          <div className="flex gap-6 font-mono">
            <Link href="/privacy" className="hover:text-accent-green transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-accent-green transition-colors">
              Terms
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
