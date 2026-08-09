import React, { useState, useEffect } from 'react';
import { Upload, Droplet, TrendingDown, Activity, AlertCircle, Calendar, Award, LogOut, UtensilsCrossed } from 'lucide-react';
import ImageUploadComponent from './components/ImageUploadComponent';
import WaterIntakeComponent from './components/WaterIntakeComponent';
import RiskInsightsComponent from './components/RiskInsightsComponent';
import AppointmentsComponent from './components/AppointmentsComponent';
import GoalsComponent from './components/GoalsComponent';
import FoodAndMedicineComponent from './components/FoodAndMedicineComponent';
import AuthComponent from './components/AuthComponent';
import {
  getDailyWaterSummary,
  getRiskInsights,
  getPatientScans,
  getVisionMetrics,
  logout,
} from './api';

export default function App() {
  const [patient, setPatient] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('renalcare_patient') || 'null');
    } catch {
      return null;
    }
  });
  const [patientId, setPatientId] = useState(() => localStorage.getItem('renalcare_patient_id') || '');
  const [activeTab, setActiveTab] = useState('dashboard');

  // Live dashboard data
  const [hydSummary, setHydSummary] = useState(null);
  const [risk, setRisk] = useState(null);
  const [latestScan, setLatestScan] = useState(null);
  const [visionMetrics, setVisionMetrics] = useState(null);

  const loadDashboard = async () => {
    if (!patientId) return;
    try {
      const [hyd, riskData, scans, metrics] = await Promise.all([
        getDailyWaterSummary(patientId).catch(() => null),
        getRiskInsights(patientId, 30).catch(() => null),
        getPatientScans(patientId).catch(() => null),
        getVisionMetrics().catch(() => null),
      ]);
      setHydSummary(hyd);
      setRisk(riskData);
      setLatestScan(Array.isArray(scans) && scans.length ? scans[0] : null);
      setVisionMetrics(metrics?.metrics || null);
    } catch {
      // dashboard loads gracefully when some endpoints fail
    }
  };

  useEffect(() => {
    if (!patientId) return;
    let active = true;
    Promise.all([
      getDailyWaterSummary(patientId).catch(() => null),
      getRiskInsights(patientId, 30).catch(() => null),
      getPatientScans(patientId).catch(() => null),
      getVisionMetrics().catch(() => null),
    ])
      .then(([hyd, riskData, scans, metrics]) => {
        if (!active) return;
        setHydSummary(hyd);
        setRisk(riskData);
        setLatestScan(Array.isArray(scans) && scans.length ? scans[0] : null);
        setVisionMetrics(metrics?.metrics || null);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [patientId]);

  const handleAuthenticated = (p) => {
    setPatient(p);
    setPatientId(p.id);
    setActiveTab('dashboard');
    loadDashboard();
  };

  const handleLogout = async () => {
    await logout().catch(() => {});
    setPatient(null);
    setPatientId('');
    setActiveTab('dashboard');
  };

  if (!patient || !patientId) {
    return <AuthComponent onAuthenticated={handleAuthenticated} />;
  }

  const hydPct = hydSummary
    ? Math.min(Math.round((hydSummary.total_intake_ml / hydSummary.goal_ml) * 100), 100)
    : 0;
  const riskPct = risk?.risk_percentage ?? null;
  const riskLevel = (risk?.risk_level || 'low').toLowerCase();

  const navItems = [
    { id: 'dashboard', icon: Activity, label: 'Dashboard' },
    { id: 'scan', icon: Upload, label: 'AI Scan Analysis' },
    { id: 'hydration', icon: Droplet, label: 'Hydration Tracker' },
    { id: 'food-medicine', icon: UtensilsCrossed, label: 'Food & Medicine' },
    { id: 'risk', icon: TrendingDown, label: 'Risk Insights' },
    { id: 'appointments', icon: Calendar, label: 'Appointments' },
    { id: 'goals', icon: Award, label: 'Health Goals' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-screen w-72 bg-white border-r border-slate-200/60 shadow-xl shadow-slate-200/50 z-50 flex flex-col">
        <div className="p-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200">
              <Droplet className="w-6 h-6 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "'Outfit', sans-serif" }}>
                RenalCare <span className="text-blue-600">AI</span>
              </h1>
              <p className="text-xs text-slate-500 tracking-wide">Advanced Kidney Care</p>
            </div>
          </div>

          <div className="mb-6 p-4 bg-slate-50 rounded-2xl border border-slate-200">
            <p className="text-xs font-semibold text-slate-500 mb-1">Signed in as</p>
            <p className="font-semibold text-slate-900 truncate">{patient.name}</p>
            <p className="text-xs text-slate-500 truncate">{patient.email}</p>
          </div>

          <nav className="space-y-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all ${
                  activeTab === item.id
                    ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-200'
                    : 'text-slate-600 hover:text-blue-600 hover:bg-blue-50/50'
                }`}
              >
                <item.icon className="w-5 h-5" strokeWidth={2} />
                <span className="font-medium text-sm" style={{ fontFamily: "'Inter', sans-serif" }}>
                  {item.label}
                </span>
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-auto p-8">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-100 text-slate-700 font-medium hover:bg-red-50 hover:text-red-700 transition-all"
          >
            <LogOut className="w-4 h-4" />
            Log Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="ml-72 p-12">
        <div className="max-w-7xl mx-auto space-y-8">
          {activeTab === 'scan' && (
            <ImageUploadComponent patientId={patientId} onNavigate={setActiveTab} />
          )}
          {activeTab === 'hydration' && <WaterIntakeComponent patientId={patientId} />}
          {activeTab === 'food-medicine' && <FoodAndMedicineComponent patientId={patientId} />}
          {activeTab === 'risk' && <RiskInsightsComponent patientId={patientId} />}
          {activeTab === 'appointments' && <AppointmentsComponent patientId={patientId} />}
          {activeTab === 'goals' && <GoalsComponent patientId={patientId} />}

          {/* MAIN DASHBOARD */}
          {activeTab === 'dashboard' && (
            <>
              <div className="mb-10">
                <h2
                  className="text-4xl font-bold mb-3 bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 bg-clip-text text-transparent"
                  style={{ fontFamily: "'Outfit', sans-serif" }}
                >
                  Welcome back, {patient.name.split(' ')[0]}
                </h2>
                <p className="text-slate-600 text-lg max-w-2xl leading-relaxed" style={{ fontFamily: "'Inter', sans-serif" }}>
                  Your live kidney stone prevention dashboard. Everything below is read from your
                  real tracked data.
                </p>
              </div>

              {/* Status Cards */}
              <div className="grid grid-cols-3 gap-6">
                <div className="bg-white rounded-2xl p-6 border border-slate-200/60 shadow-lg shadow-slate-200/50">
                  <p className="text-slate-500 text-sm font-medium mb-2">Today's Hydration</p>
                  <p className="text-3xl font-bold text-slate-900 mb-1" style={{ fontFamily: "'Outfit', sans-serif" }}>
                    {hydPct}%
                  </p>
                  <p className="text-blue-600 text-sm font-medium">
                    {hydSummary ? `${Math.round(hydSummary.total_intake_ml)} / ${Math.round(hydSummary.goal_ml)} ml` : 'No water logged yet'}
                  </p>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-slate-200/60 shadow-lg shadow-slate-200/50">
                  <p className="text-slate-500 text-sm font-medium mb-2">Risk Score</p>
                  {riskPct !== null ? (
                    <>
                      <p className="text-3xl font-bold text-slate-900 mb-1" style={{ fontFamily: "'Outfit', sans-serif" }}>
                        {Math.round(riskPct)}%
                      </p>
                      <p className={`text-sm font-medium capitalize ${riskLevel === 'high' ? 'text-red-600' : riskLevel === 'moderate' ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {riskLevel} risk
                      </p>
                    </>
                  ) : (
                    <p className="text-lg font-semibold text-slate-400 mt-2">Log data to compute</p>
                  )}
                </div>

                <div className="bg-white rounded-2xl p-6 border border-slate-200/60 shadow-lg shadow-slate-200/50">
                  <p className="text-slate-500 text-sm font-medium mb-2">Latest Scan</p>
                  {latestScan ? (
                    <>
                      <p className="text-3xl font-bold text-slate-900 mb-1 uppercase" style={{ fontFamily: "'Outfit', sans-serif" }}>
                        {latestScan.prediction}
                      </p>
                      <p className="text-blue-600 text-sm font-medium">
                        {((latestScan.confidence || 0) * 100).toFixed(1)}% confidence
                      </p>
                    </>
                  ) : (
                    <p className="text-lg font-semibold text-slate-400 mt-2">No scan yet</p>
                  )}
                </div>
              </div>

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
                    onClick={() => setActiveTab(action.id)}
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
