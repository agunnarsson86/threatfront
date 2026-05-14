export function FilterBar() {
  return (
    <div className="panel">
      <div className="panel-title">Filters</div>
      <div className="space-y-3">
        <div>
          <label className="text-[10px] text-white/30 uppercase tracking-wider block mb-1.5">Severity</label>
          <div className="flex gap-1">
            {['all', 'critical', 'high', 'medium', 'low'].map((s) => (
              <button
                key={s}
                className="text-[10px] px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-white/50 hover:text-white/80 transition-colors uppercase tracking-wider"
              >
                {s === 'all' ? 'All' : s.slice(0, 2)}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-[10px] text-white/30 uppercase tracking-wider block mb-1.5">Attack Type</label>
          <select className="w-full text-[11px] bg-white/5 border border-white/10 rounded px-2 py-1.5 text-white/70 outline-none focus:border-accent-cyan/50">
            <option>All</option>
            <option>SSH Brute Force</option>
            <option>Port Scan</option>
            <option>Web Exploit</option>
            <option>DDoS</option>
            <option>SQL Injection</option>
            <option>Malware</option>
          </select>
        </div>
        <div>
          <label className="text-[10px] text-white/30 uppercase tracking-wider block mb-1.5">Source Country</label>
          <select className="w-full text-[11px] bg-white/5 border border-white/10 rounded px-2 py-1.5 text-white/70 outline-none focus:border-accent-cyan/50">
            <option>All</option>
          </select>
        </div>
      </div>
    </div>
  )
}
