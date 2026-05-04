'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { analyticsApi } from '@/lib/api1';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts';
import toast from 'react-hot-toast';

const STAT_CONFIGS = [
  { key: 'totalGoals', label: 'Total Goals', icon: '◎', color: 'text-violet-400' },
  { key: 'completionRate', label: 'Completion Rate', icon: '%', color: 'text-emerald-400', suffix: '%' },
  { key: 'completedThisWeek', label: 'Done This Week', icon: '✓', color: 'text-blue-400' },
  { key: 'overdueItems', label: 'Overdue Tasks', icon: '⚠', color: 'text-red-400' },
  { key: 'atRiskGoals', label: 'At Risk Goals', icon: '!', color: 'text-amber-400' },
  { key: 'memberCount', label: 'Team Members', icon: '◈', color: 'text-cyan-400' },
];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="card px-3 py-2 text-xs shadow-xl">
      <p className="text-zinc-400 mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color }} className="font-medium">
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
};

export default function AnalyticsPage() {
  const { workspaceId } = useParams();
  const [stats, setStats] = useState(null);
  const [chart, setChart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    Promise.all([
      analyticsApi.stats(workspaceId),
      analyticsApi.goalChart(workspaceId, { months: 6 }),
    ]).then(([sRes, cRes]) => {
      setStats(sRes.data.stats);
      setChart(cRes.data.chart);
    }).finally(() => setLoading(false));
  }, [workspaceId]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const { data } = await analyticsApi.export(workspaceId);
      const url = URL.createObjectURL(new Blob([data], { type: 'text/csv' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `workspace-export.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Export downloaded');
    } catch {
      toast.error('Export failed');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-40 bg-zinc-800 rounded shimmer" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => <div key={i} className="card p-5 h-28 shimmer" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="page-header">Analytics</h1>
          <p className="text-zinc-500 text-sm mt-1">Workspace performance insights</p>
        </div>
        <button onClick={handleExport} disabled={exporting} className="btn-secondary">
          {exporting ? 'Exporting…' : '↓ Export CSV'}
        </button>
      </div>

      {/* Stat cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {STAT_CONFIGS.map((cfg) => (
            <div key={cfg.key} className="stat-card">
              <div className="flex items-center justify-between">
                <span className={`font-display text-3xl font-bold ${cfg.color}`}>
                  {stats[cfg.key]}{cfg.suffix || ''}
                </span>
                <span className={`text-2xl opacity-20 font-display font-bold ${cfg.color}`}>{cfg.icon}</span>
              </div>
              <div className="text-zinc-400 text-sm font-medium">{cfg.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Goals over time */}
        <div className="card p-6">
          <h2 className="section-title mb-6">Goals Over Time</h2>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={chart} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="created" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="completed" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="month" stroke="#52525b" tick={{ fill: '#71717a', fontSize: 11 }} />
              <YAxis stroke="#52525b" tick={{ fill: '#71717a', fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, color: '#71717a' }} />
              <Area type="monotone" dataKey="created" name="Created" stroke="#8b5cf6" strokeWidth={2} fill="url(#created)" />
              <Area type="monotone" dataKey="completed" name="Completed" stroke="#10b981" strokeWidth={2} fill="url(#completed)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Bar chart */}
        <div className="card p-6">
          <h2 className="section-title mb-6">Monthly Breakdown</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chart} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="month" stroke="#52525b" tick={{ fill: '#71717a', fontSize: 11 }} />
              <YAxis stroke="#52525b" tick={{ fill: '#71717a', fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, color: '#71717a' }} />
              <Bar dataKey="created" name="Created" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="completed" name="Completed" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="inProgress" name="In Progress" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Summary callout */}
      {stats && (
        <div className="card p-5 border-violet-800/30 bg-violet-900/10">
          <div className="flex items-start gap-4">
            <div className="text-2xl">◈</div>
            <div>
              <h3 className="font-display font-semibold text-white mb-1">Summary</h3>
              <p className="text-zinc-400 text-sm">
                Your team has completed <span className="text-emerald-400 font-semibold">{stats.completedGoals}</span> of{' '}
                <span className="text-white font-semibold">{stats.totalGoals}</span> goals
                ({stats.completionRate}% completion rate).{' '}
                {stats.overdueItems > 0 && (
                  <span className="text-amber-400">
                    {stats.overdueItems} task{stats.overdueItems > 1 ? 's' : ''} overdue — review the kanban board.
                  </span>
                )}
                {stats.overdueItems === 0 && <span className="text-emerald-400">No overdue tasks! 🎉</span>}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}