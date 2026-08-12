import React, { useState } from 'react';
import { Upload, Droplet, TrendingDown, Activity, AlertCircle, Calendar, Award, LogOut, UtensilsCrossed } from 'lucide-react';
import ImageUploadComponent from './components/ImageUploadComponent';
import WaterIntakeComponent from './components/WaterIntakeComponent';
import RiskInsightsComponent from './components/RiskInsightsComponent';
import AppointmentsComponent from './components/AppointmentsComponent';
import GoalsComponent from './components/GoalsComponent';
import FoodAndMedicineComponent from './components/FoodAndMedicineComponent';
import AuthComponent from './components/AuthComponent';
import DashboardComponent from './components/DashboardComponent';
import { logout } from './api';

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

  const handleAuthenticated = (p) => {
    setPatient(p);
    setPatientId(p.id);
    setActiveTab('dashboard');
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

          {activeTab === 'dashboard' && (
            <DashboardComponent patient={patient} patientId={patientId} onNavigate={setActiveTab} />
          )}
        </div>
      </div>
    </div>
  );
}
