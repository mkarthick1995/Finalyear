import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, AlertTriangle, CheckCircle, Clock, Heart, Droplet, Pill, AlertCircle, Save, X } from 'lucide-react';
import { getRiskInsights, createAppointment, saveRecommendations } from '../api';

export default function AppointmentsComponent({ patientId = 'patient_demo_001' }) {
  const [insights, setInsights] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [showRecommendationForm, setShowRecommendationForm] = useState(false);
  const [newRecommendations, setNewRecommendations] = useState({
    hydrationAdjustment: '',
    dietaryChanges: '',
    medicationChanges: '',
    monitoringSchedule: '',
    followUpDate: '',
  });
  const [savingRecommendations, setSavingRecommendations] = useState(false);
  const [recommendationSuccess, setRecommendationSuccess] = useState('');

  // Load patient insights
  useEffect(() => {
    const loadInsights = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await getRiskInsights(patientId, 30);
        setInsights(data);
        generateAppointmentRecommendations(data);
      } catch (err) {
        setError(err.message || 'Unable to load insights');
      } finally {
        setLoading(false);
      }
    };

    loadInsights();
  }, [patientId]);

  // Generate appointment recommendations based on risk state
  const generateAppointmentRecommendations = (insightsData) => {
    if (!insightsData) return;

    const recommendations = [];
    const today = new Date();
    
    const riskPercent = insightsData.risk_percentage || 0;
    const recoveryPercent = insightsData.recovery_percentage || 0;
    const compliancePercent = insightsData.hydration_compliance || 0;
    const latestScan = insightsData.latest_scan || {};

    // CRITICAL STATE: Risk > 80%
    if (riskPercent > 80) {
      const urgentDate = new Date(today);
      urgentDate.setDate(urgentDate.getDate() + 3); // 3 days from now
      
      recommendations.push({
        id: 1,
        type: 'URGENT',
        title: 'Critical Consultation - Immediate Care Required',
        reason: `CRITICAL CONDITION: Risk at ${riskPercent.toFixed(1)}% - Hydration compliance at ${compliancePercent.toFixed(1)}%`,
        suggestedDate: urgentDate.toISOString().split('T')[0],
        urgency: 'red',
        description: `Your kidney health requires immediate professional evaluation. High risk combined with poor hydration compliance needs urgent intervention.`,
        details: [
          `Risk Score: ${riskPercent.toFixed(1)}%`,
          `Recovery Outlook: ${recoveryPercent.toFixed(1)}%`,
          `Hydration Compliance: ${compliancePercent.toFixed(1)}%`,
          `Stone Size: ${latestScan.stone_size_mm?.toFixed(2) || 'N/A'} mm`,
          `Severity: ${latestScan.severity?.toUpperCase() || 'UNKNOWN'}`,
        ],
        doctorType: 'Nephrologist (Urinary Specialist)',
        estimatedDuration: '45-60 minutes',
        actions: [
          'Review latest scan in detail',
          'Assess medication adjustments',
          'Create aggressive hydration protocol',
          'Consider emergency procedures if needed',
        ],
      });

      // Add follow-up appointment
      const followUpDate = new Date(today);
      followUpDate.setDate(followUpDate.getDate() + 10); // 10 days later
      
      recommendations.push({
        id: 2,
        type: 'FOLLOW_UP',
        title: 'Critical Condition Follow-up',
        reason: 'Post-urgent consultation review',
        suggestedDate: followUpDate.toISOString().split('T')[0],
        urgency: 'orange',
        description: 'Review progress after urgent intervention and adjust treatment plan.',
        details: [
          'Expected: Some improvement in compliance',
          'Review: New medication effectiveness',
          'Assess: Hydration progress',
        ],
        doctorType: 'Nephrologist',
        estimatedDuration: '30-40 minutes',
        actions: [
          'Review compliance metrics',
          'Adjust medications if needed',
          'Plan next steps',
        ],
      });

    }
    // HIGH RISK: 60-80%
    else if (riskPercent > 60) {
      const standardDate = new Date(today);
      standardDate.setDate(standardDate.getDate() + 7); // 1 week from now
      
      recommendations.push({
        id: 1,
        type: 'HIGH_RISK',
        title: 'High-Risk Consultation',
        reason: `HIGH RISK: Risk at ${riskPercent.toFixed(1)}% - Requires professional review`,
        suggestedDate: standardDate.toISOString().split('T')[0],
        urgency: 'orange',
        description: `Your current health metrics indicate elevated risk that requires professional medical evaluation within the next week.`,
        details: [
          `Risk Score: ${riskPercent.toFixed(1)}%`,
          `Recovery Outlook: ${recoveryPercent.toFixed(1)}%`,
          `Hydration Compliance: ${compliancePercent.toFixed(1)}%`,
          `Stone Size: ${latestScan.stone_size_mm?.toFixed(2) || 'N/A'} mm`,
          `Severity: ${latestScan.severity?.toUpperCase() || 'UNKNOWN'}`,
        ],
        doctorType: 'Nephrologist or Urologist',
        estimatedDuration: '30-45 minutes',
        actions: [
          'Discuss risk factors',
          'Review hydration and diet',
          'Adjust treatment if needed',
          'Schedule next checkup',
        ],
      });

      // Add routine follow-up
      const followUpDate = new Date(today);
      followUpDate.setDate(followUpDate.getDate() + 28); // 4 weeks later
      
      recommendations.push({
        id: 2,
        type: 'ROUTINE',
        title: 'Routine Progress Check',
        reason: 'Monthly follow-up to monitor improvement',
        suggestedDate: followUpDate.toISOString().split('T')[0],
        urgency: 'yellow',
        description: 'Regular check-in to assess treatment effectiveness and adjust plan as needed.',
        details: [
          'Check: Compliance metrics',
          'Review: Hydration logs',
          'Assess: Pain or symptoms',
        ],
        doctorType: 'Nephrologist',
        estimatedDuration: '20-30 minutes',
        actions: [
          'Review monthly metrics',
          'Discuss any issues',
          'Plan ongoing management',
        ],
      });
    }
    // MODERATE RISK: 40-60%
    else if (riskPercent > 40) {
      const moderateDate = new Date(today);
      moderateDate.setDate(moderateDate.getDate() + 14); // 2 weeks from now
      
      recommendations.push({
        id: 1,
        type: 'MODERATE',
        title: 'Moderate-Risk Follow-up',
        reason: `MODERATE RISK: Risk at ${riskPercent.toFixed(1)}% - Regular monitoring needed`,
        suggestedDate: moderateDate.toISOString().split('T')[0],
        urgency: 'yellow',
        description: `Your condition requires regular professional monitoring. Schedule this appointment within the next 2 weeks to review your progress.`,
        details: [
          `Risk Score: ${riskPercent.toFixed(1)}%`,
          `Recovery Outlook: ${recoveryPercent.toFixed(1)}%`,
          `Hydration Compliance: ${compliancePercent.toFixed(1)}%`,
          `Stone Size: ${latestScan.stone_size_mm?.toFixed(2) || 'N/A'} mm`,
        ],
        doctorType: 'Nephrologist or General Practitioner',
        estimatedDuration: '20-30 minutes',
        actions: [
          'Review compliance progress',
          'Assess hydration improvements',
          'Discuss lifestyle modifications',
          'Plan 3-month check-in',
        ],
      });

      // Optional routine appointment
      const routineDate = new Date(today);
      routineDate.setDate(routineDate.getDate() + 42); // 6 weeks later
      
      recommendations.push({
        id: 2,
        type: 'ROUTINE',
        title: 'Routine Wellness Check',
        reason: 'Optional - Schedule if recommended by primary doctor',
        suggestedDate: routineDate.toISOString().split('T')[0],
        urgency: 'green',
        description: 'Routine check-in only if advised by your primary care physician. Good progress overall.',
        details: [
          'Status: On moderate track',
          'Next: Possible scan if symptoms persist',
        ],
        doctorType: 'General Practitioner',
        estimatedDuration: '15-20 minutes',
        actions: [
          'General wellness check',
          'Discuss any concerns',
        ],
      });
    }
    // LOW RISK: < 40%
    else {
      const lowRiskDate = new Date(today);
      lowRiskDate.setDate(lowRiskDate.getDate() + 30); // 1 month from now
      
      recommendations.push({
        id: 1,
        type: 'ROUTINE',
        title: 'Routine Monthly Check-in',
        reason: `LOW RISK: Risk at ${riskPercent.toFixed(1)}% - Maintenance mode`,
        suggestedDate: lowRiskDate.toISOString().split('T')[0],
        urgency: 'green',
        description: `Your health metrics are in good condition. Schedule a routine check-in if needed to maintain your recovery progress.`,
        details: [
          `Risk Score: ${riskPercent.toFixed(1)}%`,
          `Recovery Outlook: ${recoveryPercent.toFixed(1)}%`,
          `Hydration Compliance: ${compliancePercent.toFixed(1)}%`,
          `Stone Size: ${latestScan.stone_size_mm?.toFixed(2) || 'N/A'} mm`,
        ],
        doctorType: 'General Practitioner or Optional',
        estimatedDuration: '15-20 minutes',
        actions: [
          'Congratulate on progress',
          'Discuss maintenance strategies',
          'Plan next check-in',
        ],
      });

      // Optional follow-up
      const optionalDate = new Date(today);
      optionalDate.setDate(optionalDate.getDate() + 60); // 2 months later
      
      recommendations.push({
        id: 2,
        type: 'OPTIONAL',
        title: 'Optional 3-Month Scan Review',
        reason: 'Optional - Only if symptoms return or per doctor recommendation',
        suggestedDate: optionalDate.toISOString().split('T')[0],
        urgency: 'blue',
        description: 'Optional follow-up scan to confirm sustained improvement.',
        details: [
          'Status: Excellent progress',
          'Recommendation: Maintain current habits',
        ],
        doctorType: 'Radiologist (for scan)',
        estimatedDuration: '10-15 minutes (scan review)',
        actions: [
          'Perform follow-up scan if symptoms occur',
        ],
      });
    }

    setAppointments(recommendations);
  };

  const getUrgencyColor = (urgency) => {
    switch (urgency) {
      case 'red': return 'bg-red-50 border-red-200 text-red-900';
      case 'orange': return 'bg-orange-50 border-orange-200 text-orange-900';
      case 'yellow': return 'bg-yellow-50 border-yellow-200 text-yellow-900';
      case 'green': return 'bg-emerald-50 border-emerald-200 text-emerald-900';
      case 'blue': return 'bg-blue-50 border-blue-200 text-blue-900';
      default: return 'bg-slate-50 border-slate-200 text-slate-900';
    }
  };

  const getUrgencyBadgeColor = (urgency) => {
    switch (urgency) {
      case 'red': return 'bg-red-100 text-red-800';
      case 'orange': return 'bg-orange-100 text-orange-800';
      case 'yellow': return 'bg-yellow-100 text-yellow-800';
      case 'green': return 'bg-emerald-100 text-emerald-800';
      case 'blue': return 'bg-blue-100 text-blue-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  const handleSaveRecommendations = async (appointmentId) => {
    if (!newRecommendations.followUpDate) {
      alert('Please specify a follow-up date');
      return;
    }

    setSavingRecommendations(true);
    try {
      const response = await saveRecommendations(patientId, appointmentId, {
        ...newRecommendations,
        appointmentDate: appointments.find(a => a.id === appointmentId)?.suggestedDate,
      });

      setRecommendationSuccess(`Recommendations saved! Follow-up scheduled for ${newRecommendations.followUpDate}`);
      setShowRecommendationForm(false);
      setNewRecommendations({
        hydrationAdjustment: '',
        dietaryChanges: '',
        medicationChanges: '',
        monitoringSchedule: '',
        followUpDate: '',
      });

      setTimeout(() => setRecommendationSuccess(''), 5000);
    } catch (err) {
      alert('Error saving recommendations: ' + err.message);
    } finally {
      setSavingRecommendations(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-8 bg-white rounded-2xl shadow-lg border border-slate-200">
        <p className="text-slate-600 text-center">Loading appointment recommendations...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto p-8 bg-white rounded-2xl shadow-lg border border-slate-200">
        <div className="flex items-center gap-3 text-red-700">
          <AlertTriangle className="w-5 h-5" />
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="w-8 h-8 text-blue-600" />
              <h2 className="text-3xl font-bold text-slate-900">Appointment Manager</h2>
            </div>
            <p className="text-slate-600">
              Personalized appointment recommendations based on your current health status
            </p>
          </div>
          {insights && (
            <div className={`px-4 py-2 rounded-lg font-semibold ${getUrgencyBadgeColor(
              insights.risk_percentage > 80 ? 'red' : insights.risk_percentage > 60 ? 'orange' : insights.risk_percentage > 40 ? 'yellow' : 'green'
            )}`}>
              {insights.risk_percentage > 80 ? 'CRITICAL - URGENT' : insights.risk_percentage > 60 ? 'HIGH RISK' : insights.risk_percentage > 40 ? 'MODERATE RISK' : 'LOW RISK'}
            </div>
          )}
        </div>

        {/* Patient Status Summary */}
        {insights && (
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="text-sm text-slate-600 mb-1">Current Risk</div>
              <div className="text-2xl font-bold text-red-700">{insights.risk_percentage.toFixed(1)}%</div>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
              <div className="text-sm text-slate-600 mb-1">Recovery Outlook</div>
              <div className="text-2xl font-bold text-emerald-700">{insights.recovery_percentage.toFixed(1)}%</div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="text-sm text-slate-600 mb-1">Hydration Compliance</div>
              <div className="text-2xl font-bold text-blue-700">{insights.hydration_compliance?.toFixed(1) || '0'}%</div>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="text-sm text-slate-600 mb-1">Stone Size</div>
              <div className="text-2xl font-bold text-purple-700">{insights.latest_scan?.stone_size_mm?.toFixed(2) || 'N/A'} mm</div>
            </div>
          </div>
        )}
      </div>

      {/* Appointment Recommendations */}
      <div className="space-y-4">
        {appointments.map((appointment) => (
          <div key={appointment.id} className={`rounded-2xl border-2 shadow-lg p-6 transition-all ${getUrgencyColor(appointment.urgency)}`}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  {appointment.urgency === 'red' && <AlertTriangle className="w-6 h-6 text-red-600" />}
                  {appointment.urgency === 'orange' && <AlertCircle className="w-6 h-6 text-orange-600" />}
                  {appointment.urgency === 'yellow' && <Clock className="w-6 h-6 text-yellow-600" />}
                  {appointment.urgency === 'green' && <CheckCircle className="w-6 h-6 text-emerald-600" />}
                  {appointment.urgency === 'blue' && <Heart className="w-6 h-6 text-blue-600" />}
                  
                  <h3 className="text-xl font-bold">{appointment.title}</h3>
                </div>
                
                <div className="ml-9 space-y-2">
                  <p className="text-sm font-semibold text-slate-700">{appointment.reason}</p>
                  <p className="text-sm leading-relaxed">{appointment.description}</p>
                </div>
              </div>

              <span className={`px-3 py-1 rounded-full text-sm font-semibold whitespace-nowrap ${getUrgencyBadgeColor(appointment.urgency)}`}>
                {appointment.type === 'URGENT' ? 'URGENT' : appointment.type === 'HIGH_RISK' ? 'HIGH RISK' : appointment.type === 'MODERATE' ? 'MODERATE' : appointment.type === 'ROUTINE' ? 'ROUTINE' : 'OPTIONAL'}
              </span>
            </div>

            {/* Appointment Details */}
            <div className="grid grid-cols-2 gap-4 mb-4 ml-9">
              <div>
                <div className="text-xs font-semibold text-slate-600 mb-1">SUGGESTED DATE</div>
                <div className="text-lg font-bold">{new Date(appointment.suggestedDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</div>
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-600 mb-1">DOCTOR TYPE</div>
                <div className="text-lg font-bold">{appointment.doctorType}</div>
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-600 mb-1">ESTIMATED DURATION</div>
                <div className="text-lg font-bold">{appointment.estimatedDuration}</div>
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-600 mb-1">APPOINTMENT TYPE</div>
                <div className="text-lg font-bold">{appointment.type}</div>
              </div>
            </div>

            {/* Details List */}
            <div className="bg-white/40 rounded-lg p-4 mb-4 ml-9">
              <div className="text-sm font-semibold text-slate-700 mb-2">Current Metrics:</div>
              <ul className="space-y-1">
                {appointment.details.map((detail, idx) => (
                  <li key={idx} className="text-sm text-slate-700">• {detail}</li>
                ))}
              </ul>
            </div>

            {/* Actions During Appointment */}
            <div className="bg-white/40 rounded-lg p-4 ml-9">
              <div className="text-sm font-semibold text-slate-700 mb-2">What Will Be Discussed:</div>
              <ul className="space-y-1">
                {appointment.actions.map((action, idx) => (
                  <li key={idx} className="text-sm text-slate-700">✓ {action}</li>
                ))}
              </ul>
            </div>

            {/* Actions */}
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setSelectedAppointment(selectedAppointment === appointment.id ? null : appointment.id)}
                className="px-4 py-2 bg-white text-slate-700 rounded-lg font-semibold hover:bg-slate-100 transition-all border border-slate-300"
              >
                {selectedAppointment === appointment.id ? 'Hide Details' : 'Book Now'}
              </button>
              
              {selectedAppointment === appointment.id && (
                <button
                  onClick={() => setShowRecommendationForm(appointment.id)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all"
                >
                  Add Doctor Notes
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Doctor Recommendations Form */}
      {showRecommendationForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-cyan-600 text-white p-6 flex items-center justify-between">
              <h3 className="text-2xl font-bold">Doctor's Consultation Notes</h3>
              <button
                onClick={() => setShowRecommendationForm(null)}
                className="p-2 hover:bg-white/20 rounded-lg transition-all"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-slate-600">
                After your appointment, the doctor can update your treatment plan here. These changes will be applied to your ongoing care.
              </p>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  <Droplet className="w-4 h-4 inline mr-2 text-blue-600" />
                  Hydration Adjustment
                </label>
                <textarea
                  value={newRecommendations.hydrationAdjustment}
                  onChange={(e) => setNewRecommendations({ ...newRecommendations, hydrationAdjustment: e.target.value })}
                  placeholder="E.g., Increase to 3000ml daily, drink before meals, set hourly reminders"
                  className="w-full p-3 border border-slate-300 rounded-lg focus:border-blue-600 focus:ring-2 focus:ring-blue-200"
                  rows="3"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  <AlertCircle className="w-4 h-4 inline mr-2 text-orange-600" />
                  Dietary Changes
                </label>
                <textarea
                  value={newRecommendations.dietaryChanges}
                  onChange={(e) => setNewRecommendations({ ...newRecommendations, dietaryChanges: e.target.value })}
                  placeholder="E.g., Avoid high-oxalate foods, limit sodium to 2000mg/day, increase citrus"
                  className="w-full p-3 border border-slate-300 rounded-lg focus:border-blue-600 focus:ring-2 focus:ring-blue-200"
                  rows="3"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  <Pill className="w-4 h-4 inline mr-2 text-purple-600" />
                  Medication Changes
                </label>
                <textarea
                  value={newRecommendations.medicationChanges}
                  onChange={(e) => setNewRecommendations({ ...newRecommendations, medicationChanges: e.target.value })}
                  placeholder="E.g., Start medication X at Y dose, stop medication Z, review in 2 weeks"
                  className="w-full p-3 border border-slate-300 rounded-lg focus:border-blue-600 focus:ring-2 focus:ring-blue-200"
                  rows="3"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  <Clock className="w-4 h-4 inline mr-2 text-slate-600" />
                  Monitoring Schedule
                </label>
                <textarea
                  value={newRecommendations.monitoringSchedule}
                  onChange={(e) => setNewRecommendations({ ...newRecommendations, monitoringSchedule: e.target.value })}
                  placeholder="E.g., Daily hydration logs, weekly weight checks, blood tests in 2 weeks"
                  className="w-full p-3 border border-slate-300 rounded-lg focus:border-blue-600 focus:ring-2 focus:ring-blue-200"
                  rows="3"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  <Calendar className="w-4 h-4 inline mr-2 text-blue-600" />
                  Follow-up Date
                </label>
                <input
                  type="date"
                  value={newRecommendations.followUpDate}
                  onChange={(e) => setNewRecommendations({ ...newRecommendations, followUpDate: e.target.value })}
                  className="w-full p-3 border border-slate-300 rounded-lg focus:border-blue-600 focus:ring-2 focus:ring-blue-200"
                />
              </div>

              {recommendationSuccess && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-lg flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  {recommendationSuccess}
                </div>
              )}

              <div className="flex gap-2 justify-end pt-4">
                <button
                  onClick={() => setShowRecommendationForm(null)}
                  className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg font-semibold hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleSaveRecommendations(showRecommendationForm)}
                  disabled={savingRecommendations}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all disabled:bg-slate-400 flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {savingRecommendations ? 'Saving...' : 'Save Recommendations'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
