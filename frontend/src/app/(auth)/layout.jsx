export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen bg-zinc-950 flex">
      {/* Left panel */}
      <div className="hidden lg:flex w-1/2 bg-zinc-900 border-r border-zinc-800 flex-col justify-between p-12 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -left-40 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-violet-800/20 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-violet-500/10 rounded-full blur-2xl" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
              <span className="text-white font-display font-bold">T</span>
            </div>
            <span className="font-display font-bold text-xl text-white">Team Hub</span>
          </div>
        </div>

        <div className="relative z-10 space-y-6">
          <h1 className="font-display text-4xl font-bold text-white leading-tight">
            Align your team.<br />
            <span className="text-violet-400">Ship faster.</span>
          </h1>
          <p className="text-zinc-400 text-lg leading-relaxed max-w-sm">
            Manage shared goals, track milestones, and coordinate action items — all in one workspace.
          </p>

          <div className="grid grid-cols-2 gap-4 mt-8">
            {[
              { label: 'Goals tracked', value: '12,400+' },
              { label: 'Teams using', value: '2,800+' },
              { label: 'Tasks completed', value: '98,000+' },
              { label: 'Uptime', value: '99.9%' },
            ].map((s) => (
              <div key={s.label} className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-4">
                <div className="font-display text-2xl font-bold text-white">{s.value}</div>
                <div className="text-zinc-500 text-sm mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 text-zinc-600 text-sm">
          © {new Date().getFullYear()} Team Hub. Built for teams.
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md animate-slide-up">{children}</div>
      </div>
    </div>
  );
}