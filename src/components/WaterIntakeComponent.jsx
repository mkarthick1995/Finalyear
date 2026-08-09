import React, { useState, useEffect, useCallback } from 'react';
import { Droplet, Plus, Minus, CheckCircle, AlertCircle, Loader, RefreshCw, Calendar, Trash2 } from 'lucide-react';
import { logWaterIntake, getDailyWaterSummary, resetWaterIntakeForDay } from '../api';

export default function WaterIntakeComponent({ patientId = 'patient_demo_001' }) {
  const [amount, setAmount] = useState(250);
  const [time, setTime] = useState('12:00');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [dailySummary, setDailySummary] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // Daily goal is 2-3 liters (2500ml recommended for kidney stone prevention)
  const DAILY_GOAL = 2500;

  const fetchDailySummary = useCallback(() => {
    getDailyWaterSummary(patientId, selectedDate)
      .then((summary) => setDailySummary(summary))
      .catch((err) => {
        console.error('Failed to fetch water summary:', err);
      });
  }, [patientId, selectedDate]);

  // Fetch daily summary on mount and when date changes
  useEffect(() => {
    fetchDailySummary();
    const interval = setInterval(fetchDailySummary, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [fetchDailySummary]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchDailySummary();
    } finally {
      setRefreshing(false);
    }
  };

  const handleReset = async () => {
    setResetting(true);
    setError(null);
    try {
      console.log('Resetting water intake for:', selectedDate);
      await resetWaterIntakeForDay(patientId, selectedDate);
      
      setError(null);
      setSuccess(true);
      setShowResetConfirm(false);
      
      // Refresh summary after reset
      await fetchDailySummary();
      
      // Hide success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Reset error:', err);
      setError(err.message || 'Failed to reset water intake for this day');
    } finally {
      setResetting(false);
    }
  };

  const handleAddWater = async () => {
    if (amount <= 0) {
      setError('Please enter a valid amount (greater than 0)');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      console.log('Logging water intake:', { patientId, amount, time, notes });
      const result = await logWaterIntake(patientId, amount, time, notes);
      console.log('Water intake logged:', result);
      
      setSuccess(true);
      setAmount(250);
      setNotes('');
      setTime(new Date().toTimeString().slice(0, 5));
      
      // Refresh summary
      await fetchDailySummary();
      
      // Hide success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Water intake error:', err);
      setError(err.message || 'Failed to log water intake. Make sure backend is running on port 8001');
    } finally {
      setLoading(false);
    }
  };

  const quickAmounts = [250, 500, 750, 1000];
  const currentIntake = dailySummary?.total_intake_ml || 0;
  const percentage = Math.min((currentIntake / DAILY_GOAL) * 100, 100);
  const remaining = Math.max(DAILY_GOAL - currentIntake, 0);

  return (
    <div className="w-full max-w-2xl mx-auto p-6 bg-white rounded-2xl shadow-lg border border-slate-200" id="hydration">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Droplet className="w-6 h-6 text-cyan-600" />
          <h2 className="text-2xl font-bold text-slate-800">Hydration Tracker</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className={`p-2 rounded-lg transition-all ${
              refreshing
                ? 'bg-slate-200 text-slate-600 cursor-not-allowed'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 cursor-pointer'
            }`}
            title="Refresh water intake data"
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowResetConfirm(true)}
            disabled={resetting || selectedDate !== new Date().toISOString().split('T')[0]}
            className={`p-2 rounded-lg transition-all flex items-center gap-1 text-sm font-semibold ${
              resetting || selectedDate !== new Date().toISOString().split('T')[0]
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : 'bg-red-50 text-red-600 hover:bg-red-100 cursor-pointer'
            }`}
            title={selectedDate !== new Date().toISOString().split('T')[0] ? 'Only today\'s data can be reset' : 'Reset all water intake for today'}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Date Selector */}
      <div className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
        <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          Select Date
        </label>
        <div className="flex gap-3">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="flex-1 px-4 py-2 border border-slate-300 rounded-lg font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Today
          </button>
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="mb-6 p-4 bg-red-50 border-2 border-red-300 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-bold text-red-900 mb-2">Reset All Water Intake?</h3>
              <p className="text-sm text-red-800 mb-4">
                This will delete all water intake entries for {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} and reset the counter to zero. This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleReset}
                  disabled={resetting}
                  className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                    resetting
                      ? 'bg-red-300 text-red-700 cursor-not-allowed'
                      : 'bg-red-600 text-white hover:bg-red-700 cursor-pointer'
                  }`}
                >
                  {resetting ? 'Resetting...' : 'Yes, Reset'}
                </button>
                <button
                  onClick={() => setShowResetConfirm(false)}
                  disabled={resetting}
                  className="px-4 py-2 bg-slate-300 text-slate-800 rounded-lg font-semibold hover:bg-slate-400 transition-colors disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="mb-8 p-6 bg-gradient-to-r from-cyan-50 to-blue-50 rounded-xl border border-cyan-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm text-slate-600 font-medium">
              {selectedDate === new Date().toISOString().split('T')[0] ? "Today's Hydration" : `Hydration - ${new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`}
            </p>
            <p className="text-3xl font-bold text-blue-600 mt-1">
              {currentIntake} <span className="text-lg text-slate-600">ml</span>
            </p>
            <p className="text-sm text-slate-500 mt-2">
              Goal: {DAILY_GOAL}ml | Remaining: {remaining}ml
            </p>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold text-cyan-600">{Math.round(percentage)}%</div>
            <p className="text-sm text-slate-600 mt-1">of daily goal</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500 rounded-full"
            style={{ width: `${percentage}%` }}
          />
        </div>

        {/* Status Message */}
        <div className="mt-4 flex items-center gap-2">
          {percentage >= 100 ? (
            <>
              <CheckCircle className="w-5 h-5 text-green-600" />
              <p className="text-sm font-semibold text-green-700">
                ✓ Daily goal achieved! Great job staying hydrated!
              </p>
            </>
          ) : percentage >= 75 ? (
            <>
              <Droplet className="w-5 h-5 text-blue-600" />
              <p className="text-sm font-semibold text-blue-700">
                Almost there! {remaining}ml more to reach your goal.
              </p>
            </>
          ) : (
            <>
              <AlertCircle className="w-5 h-5 text-yellow-600" />
              <p className="text-sm font-semibold text-yellow-700">
                Keep drinking! {remaining}ml remaining.
              </p>
            </>
          )}
        </div>
      </div>

      {/* Quick Add Buttons - Only show for today */}
      {selectedDate === new Date().toISOString().split('T')[0] && (
        <>
          <div className="mb-8">
            <p className="text-sm font-semibold text-slate-700 mb-3">Quick Add</p>
            <div className="grid grid-cols-4 gap-3">
              {quickAmounts.map((amt) => (
                <button
                  key={amt}
                  onClick={() => setAmount(amt)}
                  className={`py-3 px-2 rounded-lg font-bold transition-all ${
                    amount === amt
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {amt} <span className="text-xs block mt-1">ml</span>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Input */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {/* Amount */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Amount (ml)
              </label>
              <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-2">
                <button
                  onClick={() => setAmount(Math.max(50, amount - 50))}
                  className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  <Minus className="w-5 h-5 text-slate-600" />
                </button>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(Math.max(0, parseInt(e.target.value) || 0))}
                  className="flex-1 bg-transparent text-center font-bold text-lg outline-none"
                  min="0"
                />
                <button
                  onClick={() => setAmount(amount + 50)}
                  className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  <Plus className="w-5 h-5 text-slate-600" />
                </button>
              </div>
            </div>

            {/* Time */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Time
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Notes (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., With meal, after exercise"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-green-700">Water intake logged successfully! 💧</p>
            </div>
          )}

          {/* Log Button */}
          <button
            onClick={handleAddWater}
            disabled={loading}
            className={`w-full py-3 px-4 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 mb-6 ${
              loading
                ? 'bg-slate-400 text-white cursor-not-allowed'
                : 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-700 hover:to-blue-700 cursor-pointer'
            }`}
          >
            {loading ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                Logging...
              </>
            ) : (
              <>
                <Droplet className="w-5 h-5" />
                Log Water Intake
              </>
            )}
          </button>
        </>
      )}

      {/* View Only Message for Past Dates */}
      {selectedDate !== new Date().toISOString().split('T')[0] && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-blue-700">You can only log water intake for today. Select today's date to add entries.</p>
        </div>
      )}

      {/* History Log */}
      {dailySummary?.intakes && dailySummary.intakes.length > 0 && (
        <div className="border-t border-slate-200 pt-6">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="text-sm font-semibold text-blue-600 hover:text-blue-700 mb-3 flex items-center gap-1"
          >
            {showHistory ? '▼ Hide' : '▶ Show'} {selectedDate === new Date().toISOString().split('T')[0] ? "Today's" : "This Day's"} Log ({dailySummary.intakes.length})
          </button>

          {showHistory && (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {dailySummary.intakes.map((intake, idx) => (
                <div
                  key={idx}
                  className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border border-blue-200 flex items-start justify-between"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-slate-800">
                        {intake.amount_ml} ml
                      </p>
                      <span className="text-xs text-slate-500 bg-white px-2 py-1 rounded">
                        {intake.time}
                      </span>
                    </div>
                    {intake.notes && (
                      <p className="text-xs text-slate-600 mt-2 italic bg-white px-3 py-2 rounded border-l-2 border-blue-400">
                        📝 {intake.notes}
                      </p>
                    )}
                  </div>
                  <Droplet className="w-5 h-5 text-cyan-600 flex-shrink-0 mt-1" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Hydration Tips */}
      <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-sm font-semibold text-blue-900 mb-2">💡 Hydration Tips</p>
        <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
          <li>Drink water consistently throughout the day</li>
          <li>2.5-3 liters daily helps prevent kidney stones</li>
          <li>More water if you exercise or live in hot climate</li>
          <li>Monitor your urine color (pale = well hydrated)</li>
        </ul>
      </div>
    </div>
  );
}
