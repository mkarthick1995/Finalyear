import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Droplet, ShieldCheck, TrendingUp, CalendarDays, Stethoscope } from 'lucide-react';
import { getRiskInsights } from '../api';

export default function RiskInsightsComponent({ patientId = 'patient_demo_001' }) {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadInsights = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await getRiskInsights(patientId, 30);
        setInsights(data);
      } catch (err) {
        setError(err.message || 'Unable to load risk insights right now.');
      } finally {
        setLoading(false);
      }
    };

    loadInsights();
  }, [patientId]);

  const riskTone = useMemo(() => {
    if (!insights) return 'bg-slate-100 text-slate-700';
    const level = insights.risk_level?.toLowerCase();
    if (level === 'high') return 'bg-red-100 text-red-800';
    if (level === 'moderate') return 'bg-amber-100 text-amber-800';
    return 'bg-emerald-100 text-emerald-800';
  }, [insights]);

  const recoveryPercent = insights?.recovery_percentage ?? 0;
  const riskPercent = insights?.risk_percentage ?? 0;
  const compliancePercent = insights?.hydration_compliance ?? 0;

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6 bg-white rounded-2xl shadow-lg border border-slate-200">
        <p className="text-slate-600">Loading risk insights...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto p-6 bg-white rounded-2xl shadow-lg border border-slate-200">
        <div className="flex items-center gap-3 text-red-700">
          <AlertTriangle className="w-5 h-5" />
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">Risk Insights</p>
            <h2 className="text-2xl font-bold text-slate-900 mt-2">Recovery roadmap based on scan and hydration data</h2>
            <p className="text-slate-600 mt-2">Your latest scan and hydration history are combined into a month-by-month recovery plan.</p>
          </div>
          <div className={`px-4 py-2 rounded-full text-sm font-semibold ${riskTone}`}>
            {insights?.risk_level || 'Low'} risk
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4 mt-6">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-slate-600">
              <ShieldCheck className="w-4 h-4" />
              <span className="text-sm font-medium">Recovery outlook</span>
            </div>
            <p className="text-3xl font-bold text-slate-900 mt-3">{recoveryPercent}%</p>
            <p className="text-sm text-slate-500 mt-1">Estimated recovery progress</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-slate-600">
              <TrendingUp className="w-4 h-4" />
              <span className="text-sm font-medium">Current risk</span>
            </div>
            <p className="text-3xl font-bold text-slate-900 mt-3">{riskPercent}%</p>
            <p className="text-sm text-slate-500 mt-1">Overall risk score</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-slate-600">
              <Droplet className="w-4 h-4" />
              <span className="text-sm font-medium">Hydration compliance</span>
            </div>
            <p className="text-3xl font-bold text-slate-900 mt-3">{compliancePercent}%</p>
            <p className="text-sm text-slate-500 mt-1">Average daily target hit</p>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center justify-between text-sm text-slate-600">
            <span>Recovery meter</span>
            <span className="font-semibold text-slate-900">{recoveryPercent}%</span>
          </div>
          <div className="h-3 rounded-full bg-slate-200 overflow-hidden mt-3">
            <div className={`h-full rounded-full ${recoveryPercent > 70 ? 'bg-emerald-500' : recoveryPercent > 40 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${Math.max(6, recoveryPercent)}%` }} />
          </div>
          <div className="mt-3 flex justify-between text-xs text-slate-500">
            <span>High risk</span>
            <span>Improving</span>
            <span>Recovered</span>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-6">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <CalendarDays className="w-5 h-5 text-blue-600" />
            <h3 className="text-xl font-bold text-slate-900">Month-wise recovery roadmap</h3>
          </div>
          <div className="space-y-4">
            {insights?.roadmap?.map((step) => (
              <div key={step.month} className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{step.title}</p>
                    <p className="text-sm text-slate-600 mt-1">{step.goal}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${step.status === 'On track' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {step.status}
                  </span>
                </div>
                <p className="text-sm text-slate-600 mt-3">Focus: {step.focus}</p>
                <ul className="mt-3 space-y-2 text-sm text-slate-600">
                  {step.actions.map((action) => (
                    <li key={action} className="flex gap-2">
                      <span className="text-blue-600">•</span>
                      <span>{action}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Stethoscope className="w-5 h-5 text-emerald-600" />
              <h3 className="text-xl font-bold text-slate-900">Latest scan snapshot</h3>
            </div>
            <div className="space-y-3 text-sm text-slate-600">
              <div className="flex justify-between"><span>Stone size</span><span className="font-semibold text-slate-900">{insights?.latest_scan?.stone_size_mm ?? 0} mm</span></div>
              <div className="flex justify-between"><span>Severity</span><span className="font-semibold text-slate-900">{insights?.latest_scan?.severity ?? 'none'}</span></div>
              <div className="flex justify-between"><span>Location</span><span className="font-semibold text-slate-900">{insights?.latest_scan?.location ?? 'N/A'}</span></div>
              <div className="flex justify-between"><span>Type</span><span className="font-semibold text-slate-900">{insights?.latest_scan?.stone_type ?? 'unknown'}</span></div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <h3 className="text-xl font-bold text-slate-900">Danger if ignored</h3>
            </div>
            <div className="space-y-3">
              {insights?.danger_if_ignored?.map((item) => (
                <div key={item.period} className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <p className="text-sm font-semibold text-amber-800">{item.period}</p>
                  <p className="text-sm text-amber-700 mt-1">{item.impact}</p>
                  <p className="text-xs text-amber-700/80 mt-1">{item.message}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
            <h3 className="text-xl font-bold text-slate-900 mb-4">Important guidelines</h3>
            <ul className="space-y-3 text-sm text-slate-600">
              {insights?.guidelines?.map((guideline) => (
                <li key={guideline} className="flex gap-2">
                  <span className="text-emerald-500">✓</span>
                  <span>{guideline}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
