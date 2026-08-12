import React, { useEffect, useRef, useState } from 'react';
import {
  Upload, Droplet, TrendingDown, Calendar, Award, UtensilsCrossed,
  AlertCircle, RefreshCw, FileDown, Printer, Loader, Activity,
} from 'lucide-react';
import { getDashboardSummary, getVisionMetrics } from '../api';
import { downloadReport, printReport } from '../report';

const SECTION_ICONS = {
  hydration: Droplet,
  scan: Upload,
  diet: UtensilsCrossed,
  risk: TrendingDown,
  appointments: Calendar,
  goals: Award,
};

const SECTION_TABS = {
  hydration: 'hydration',
  scan: 'scan',
  diet: 'food-medicine',
  risk: 'risk',
  appointments: 'appointments',
  goals: 'goals',
};

const STATUS_STYLES = {
  good: { pill: 'bg-emerald-100 text-emerald-700', bar: 'bg-emerald-500', label: 'Good' },
  attention: { pill: 'bg-amber-100 text-amber-700', bar: 'bg-amber-500', label: 'Needs attention' },
  critical: { pill: 'bg-red-100 text-red-700', bar: 'bg-red-500', label: 'Critical' },
  info: { pill: 'bg-blue-100 text-blue-700', bar: 'bg-blue-400', label: 'Info' },
};

const POLL_MS = 15000;

export default function DashboardComponent({ patient, patientId, onNavigate }) {
  const [summary, setSummary] = useState(null);
  const [visionMetrics, setVisionMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState('');
  const mountedRef = useRef(true);

  const load = async () => {
    if (!patientId) return;
    try {
      const [sum, metrics] = await Promise.all([
        getDashboardSummary(patientId),
        getVisionMetrics().catch(() => null),
      ]);
      if (!mountedRef.current) return;
      setSummary(sum);
      setVisionMetrics(metrics?.metrics || null);
      setLastUpdated(new Date());
      setError('');
    } catch (err) {
      if (mountedRef.current) setError(err.message || 'Failed to load dashboard summary');
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    const initial = setTimeout(() => load(), 0);
    const timer = setInterval(() => load(), POLL_MS);
    const onFocus = () => load();
    window.addEventListener('focus', onFocus);
    return () => {
      mountedRef.current = false;
      clearTimeout(initial);
      clearInterval(timer);
      window.removeEventListener('focus', onFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  const handleRefresh = () => {
    setLoading(true);
    setRefreshing(true);
    load();
  };

  const sections = summary?.sections || [];
  const overall = summary?.overall || {};
  const hydSection = sections.find((s) => s.key === 'hydration');
  const scanSection = sections.find((s) => s.key === 'scan');
  const riskSection = sections.find((s) => s.key === 'risk');

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2
            className="text-4xl font-bold mb-3 bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 bg-clip-text text-transparent"
            style={{ fontFamily: "'Outfit', sans-serif" }}
          >
            Welcome back, {patient.name.split(' ')[0]}
          </h2>
          <p className="text-slate-600 max-w-2xl leading-relaxed" style={{ fontFamily: "'Inter', sans-serif" }}>
            Live outcome of every tracked section. The dashboard refreshes automatically, so changes
            made inside any section appear here within seconds.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-slate-400">
              Updated {lastUpdated.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          )}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => downloadReport(summary, patient)}
            disabled={!summary}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-all disabled:opacity-40"
          >
            <FileDown className="w-4 h-4" />
            Download Report
          </button>
          <button
            onClick={() => printReport(summary, patient)}
            disabled={!summary}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-all disabled:opacity-40"
          >
            <Printer className="w-4 h-4" />
            Print / PDF
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {loading && !summary ? (
        <div className="bg-white rounded-2xl p-10 flex items-center justify-center gap-3 shadow-lg shadow-slate-200/50">
          <Loader className="w-5 h-5 animate-spin text-blue-600" />
          <p className="text-slate-600">Computing your outcomes from tracked data...</p>
        </div>
      ) : (
        <>
          {/* Top Status Cards */}
          <div className="grid grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl p-6 border border-slate-200/60 shadow-lg shadow-slate-200/50">
              <p className="text-slate-500 text-sm font-medium mb-2">Today's Hydration</p>
              <p className="text-3xl font-bold text-slate-900 mb-1" style={{ fontFamily: "'Outfit', sans-serif" }}>
                {hydSection ? hydSection.metrics[1].value : '—'}
              </p>
              <p className="text-blue-600 text-sm font-medium">
                {hydSection ? hydSection.metrics[0].value : 'No water logged yet'}
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-200/60 shadow-lg shadow-slate-200/50">
              <p className="text-slate-500 text-sm font-medium mb-2">Risk Score</p>
              {riskSection ? (
                <>
                  <p className="text-3xl font-bold text-slate-900 mb-1" style={{ fontFamily: "'Outfit', sans-serif" }}>
                    {riskSection.metrics[0].value}
                  </p>
                  <p className={`text-sm font-medium ${riskSection.status === 'critical' ? 'text-red-600' : riskSection.status === 'attention' ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {String(riskSection.metrics[1].value || '').toLowerCase()} risk
                  </p>
                </>
              ) : (
                <p className="text-lg font-semibold text-slate-400 mt-2">Log data to compute</p>
              )}
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-200/60 shadow-lg shadow-slate-200/50">
              <p className="text-slate-500 text-sm font-medium mb-2">Latest Scan</p>
              {scanSection && scanSection.latest_scan ? (
                <>
                  <p className="text-3xl font-bold text-slate-900 mb-1 uppercase" style={{ fontFamily: "'Outfit', sans-serif" }}>
                    {scanSection.latest_scan.prediction}
                  </p>
                  <p className="text-blue-600 text-sm font-medium">
                    {(scanSection.latest_scan.confidence * 100).toFixed(1)}% confidence
                    {scanSection.latest_scan.stone_size_mm ? ` · ${scanSection.latest_scan.stone_size_mm} mm` : ''}
                  </p>
                </>
              ) : (
                <p className="text-lg font-semibold text-slate-400 mt-2">No scan yet</p>
              )}
            </div>
          </div>

          {/* Per-section outcomes */}
          <div>
            <h3 className="text-xl font-bold text-slate-900 mb-4" style={{ fontFamily: "'Outfit', sans-serif" }}>
              Section Outcomes
            </h3>
            <div className="grid grid-cols-2 gap-6">
              {sections.map((s) => {
                const Icon = SECTION_ICONS[s.key] || Activity;
                const style = STATUS_STYLES[s.status] || STATUS_STYLES.info;
                return (
                  <div key={s.key} className="bg-white rounded-2xl p-6 border border-slate-200/60 shadow-lg shadow-slate-200/50 flex flex-col">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                          <Icon className="w-5 h-5 text-blue-600" />
                        </div>
                        <h4 className="font-bold text-slate-900">{s.title}</h4>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${style.pill}`}>
                        {style.label}
                      </span>
                    </div>

                    {s.score !== null && s.score !== undefined && (
                      <div className="mb-3">
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${style.bar} transition-all duration-700`}
                            style={{ width: `${Math.min(100, s.score)}%` }}
                          />
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">Score {Math.round(s.score)}/100</p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2 mb-3">
                      {(s.metrics || []).map((m, i) => (
                        <div key={i} className="bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
                          <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">{m.label}</p>
                          <p className="text-sm font-bold text-slate-900 truncate">{m.value}</p>
                        </div>
                      ))}
                    </div>

                    <p className="text-sm text-slate-600 leading-relaxed flex-1">{s.conclusion}</p>

                    <button
                      onClick={() => onNavigate(SECTION_TABS[s.key])}
                      className="mt-3 text-sm font-semibold text-blue-600 hover:text-blue-800 self-start"
                    >
                      Open {s.title} →
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Overall Conclusion */}
          {overall.score !== undefined && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border-2 border-blue-200 shadow-lg shadow-blue-100/50">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <h3 className="text-lg font-bold text-slate-900" style={{ fontFamily: "'Outfit', sans-serif" }}>
                  Overall Conclusion
                </h3>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-3xl font-black text-blue-900 leading-none">
                      {overall.score === null || overall.score === undefined ? '—' : Math.round(overall.score)}
                      <span className="text-sm text-blue-700">/100</span>
                    </p>
                    <p className="text-xs font-semibold text-blue-700">Overall health score</p>
                  </div>
                  <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${(STATUS_STYLES[overall.status] || STATUS_STYLES.info).pill}`}>
                    {(STATUS_STYLES[overall.status] || STATUS_STYLES.info).label}
                  </span>
                </div>
              </div>

              <p className="text-slate-700 leading-relaxed mb-4">{overall.conclusion}</p>

              <div className="grid grid-cols-2 gap-6">
                <div className="bg-white/70 rounded-xl p-4">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Section scores</p>
                  <div className="space-y-2">
                    {sections.map((s) => (
                      <div key={s.key} className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-600 w-36 truncate">{s.title}</span>
                        <div className="flex-1 h-2.5 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${(STATUS_STYLES[s.status] || STATUS_STYLES.info).bar} transition-all duration-700`}
                            style={{ width: `${s.score === null || s.score === undefined ? 0 : Math.min(100, s.score)}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-slate-700 w-8 text-right">
                          {s.score === null || s.score === undefined ? '—' : Math.round(s.score)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white/70 rounded-xl p-4">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Key notes</p>
                  <ul className="space-y-2">
                    {(overall.highlights || []).map((h, i) => (
                      <li
                        key={i}
                        className={`text-sm leading-relaxed ${
                          h.level === 'critical' ? 'text-red-700' : h.level === 'attention' ? 'text-amber-700' : 'text-emerald-700'
                        }`}
                      >
                        • {h.text}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Hydration 7-day mini chart */}
          {summary?.water_history && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200/60 shadow-lg shadow-slate-200/50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-900" style={{ fontFamily: "'Outfit', sans-serif" }}>
                  Hydration — last 7 days
                </h3>
                <span className="text-xs text-slate-400">Goal: {summary.water_history.goal_ml} ml/day</span>
              </div>
              <div className="flex items-end gap-3">
                {summary.water_history.days.map((d, i) => {
                  const v = summary.water_history.ml[i] || 0;
                  const maxV = Math.max(...summary.water_history.ml, summary.water_history.goal_ml, 1);
                  const h = Math.max(4, Math.round((v / maxV) * 100));
                  const met = v >= summary.water_history.goal_ml;
                  return (
                    <div key={d} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-[10px] font-semibold text-slate-600">{v}ml</span>
                      <div
                        className={`w-full max-w-9 rounded-t-lg ${met ? 'bg-emerald-500' : 'bg-blue-500'}`}
                        style={{ height: `${h}px` }}
                      />
                      <span className="text-[10px] text-slate-400">{d.slice(5)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Vision Model Disclaimer */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/60 shadow-lg shadow-slate-200/50">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-slate-900 mb-1">About the AI scan model</h3>
                {visionMetrics ? (
                  <p className="text-sm text-slate-600">
                    The scan classifier is a MobileNetV2 model trained on public kidney CT data
                    (normal vs. stone). On a held-out test set it reached{' '}
                    <span className="font-semibold">{(visionMetrics.accuracy * 100).toFixed(1)}% accuracy</span>{' '}
                    (precision {(visionMetrics.precision * 100).toFixed(1)}%, recall{' '}
                    {(visionMetrics.recall * 100).toFixed(1)}%, evaluated on{' '}
                    {visionMetrics.n_test} test images, model version{' '}
                    {visionMetrics.model_version}). This is a research/demo system and does not
                    provide medical diagnosis — always consult a urologist.
                  </p>
                ) : (
                  <p className="text-sm text-slate-600">
                    This is a research/demo system and does not provide medical diagnosis —
                    always consult a urologist.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-3 gap-6">
            {[
              { id: 'scan', icon: Upload, title: 'Analyze a Scan', desc: 'Upload a kidney CT image for AI classification.' },
              { id: 'hydration', icon: Droplet, title: 'Log Water', desc: 'Record your intake to hit your daily goal.' },
              { id: 'appointments', icon: Calendar, title: 'Book a Visit', desc: 'Get scheduling recommendations from your risk.' },
            ].map((action) => (
              <button
                key={action.id}
                onClick={() => onNavigate(action.id)}
                className="bg-white rounded-2xl p-6 border border-slate-200/60 shadow-lg shadow-slate-200/50 text-left hover:-translate-y-1 hover:shadow-2xl transition-all"
              >
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center mb-3">
                  <action.icon className="w-5 h-5 text-blue-600" />
                </div>
                <p className="font-semibold text-slate-900 mb-1">{action.title}</p>
                <p className="text-sm text-slate-500">{action.desc}</p>
              </button>
            ))}
          </div>

          {/* APPEND_POINT */}
        </>
      )}
    </div>
  );
}