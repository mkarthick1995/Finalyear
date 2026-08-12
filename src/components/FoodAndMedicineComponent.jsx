import React, { useEffect, useState } from 'react';
import {
  UtensilsCrossed,
  Pill,
  AlertTriangle,
  CheckCircle,
  Loader,
  Trash2,
  Plus,
  Info,
  Utensils,
  Apple,
  Stethoscope,
} from 'lucide-react';
import {
  logMeal,
  getDailyMealSummary,
  getMedicines,
  addMedicine,
  removeMedicine,
} from '../api';
import { MEDICINE_CATALOG } from '../catalogs';

// Food catalog with general dietary oxalate guidance (low / medium / high).
// Icon shows an emoji "photo" of each food.
// Includes everyday Indian dishes alongside the regular items.
const FOOD_CATALOG = {
  breakfast: [
    { icon: '🍳', name: 'Eggs', oxalate: 'low' },
    { icon: '🍞', name: 'Toast / White Bread', oxalate: 'low' },
    { icon: '🥣', name: 'Oats / Porridge', oxalate: 'medium' },
    { icon: '🥛', name: 'Milk', oxalate: 'low' },
    { icon: '🫙', name: 'Yogurt / Curd', oxalate: 'low' },
    { icon: '🍌', name: 'Banana', oxalate: 'low' },
    { icon: '🍎', name: 'Apple', oxalate: 'low' },
    { icon: '🧃', name: 'Orange Juice', oxalate: 'medium' },
    { icon: '🥐', name: 'Croissant / Pastry', oxalate: 'low' },
    { icon: '🧀', name: 'Cheese', oxalate: 'low' },
    { icon: '🍥', name: 'Idli', oxalate: 'low' },
    { icon: '🥞', name: 'Dosa', oxalate: 'medium' },
    { icon: '🫓', name: 'Paratha / Roti', oxalate: 'low' },
    { icon: '🍚', name: 'Poha', oxalate: 'medium' },
    { icon: '🥣', name: 'Upma (Sooji)', oxalate: 'medium' },
    { icon: '🧀', name: 'Paneer Bhurji', oxalate: 'low' },
    { icon: '🍲', name: 'Sambar with Idli/Dosa', oxalate: 'medium' },
    { icon: '🥛', name: 'Buttermilk (Chaas)', oxalate: 'low' },
    { icon: '🍵', name: 'Chai / Tea', oxalate: 'high' },
  ],
  lunch: [
    { icon: '🍗', name: 'Grilled Chicken', oxalate: 'low' },
    { icon: '🐟', name: 'Fish', oxalate: 'low' },
    { icon: '🍚', name: 'Rice', oxalate: 'low' },
    { icon: '🍝', name: 'Pasta', oxalate: 'low' },
    { icon: '🫘', name: 'Beans / Lentils', oxalate: 'medium' },
    { icon: '🥗', name: 'Leafy Salad', oxalate: 'low' },
    { icon: '🥒', name: 'Cucumber', oxalate: 'low' },
    { icon: '🍅', name: 'Tomato', oxalate: 'low' },
    { icon: '🥕', name: 'Carrots', oxalate: 'medium' },
    { icon: '🥦', name: 'Broccoli', oxalate: 'medium' },
    { icon: '🥔', name: 'Potato', oxalate: 'medium' },
    { icon: '🍠', name: 'Sweet Potato', oxalate: 'high' },
    { icon: '🥬', name: 'Spinach / Palak', oxalate: 'high' },
    { icon: '🍲', name: 'Dal (Lentil Stew)', oxalate: 'medium' },
    { icon: '🫓', name: 'Chapati / Roti', oxalate: 'low' },
    { icon: '🫘', name: 'Rajma (Kidney Bean Curry)', oxalate: 'medium' },
    { icon: '🧆', name: 'Chole (Chickpea Curry)', oxalate: 'medium' },
    { icon: '🧀', name: 'Paneer Curry', oxalate: 'low' },
    { icon: '🍗', name: 'Chicken Curry', oxalate: 'low' },
    { icon: '🐟', name: 'Fish Curry', oxalate: 'low' },
    { icon: '🍛', name: 'Biryani', oxalate: 'medium' },
    { icon: '🍲', name: 'Sambar', oxalate: 'medium' },
    { icon: '🍲', name: 'Rasam', oxalate: 'low' },
    { icon: '🍚', name: 'Khichdi', oxalate: 'medium' },
    { icon: '🫙', name: 'Curd Rice', oxalate: 'low' },
  ],
  snack: [
    { icon: '🍎', name: 'Apple', oxalate: 'low' },
    { icon: '🍌', name: 'Banana', oxalate: 'low' },
    { icon: '🍊', name: 'Orange', oxalate: 'low' },
    { icon: '🍓', name: 'Strawberries', oxalate: 'medium' },
    { icon: '🫙', name: 'Yogurt', oxalate: 'low' },
    { icon: '🧀', name: 'Cheese', oxalate: 'low' },
    { icon: '🥜', name: 'Peanuts', oxalate: 'medium' },
    { icon: '🌰', name: 'Almonds / Nuts', oxalate: 'high' },
    { icon: '🍫', name: 'Chocolate', oxalate: 'high' },
    { icon: '🍇', name: 'Grapes', oxalate: 'low' },
    { icon: '🥟', name: 'Samosa', oxalate: 'medium' },
    { icon: '🍩', name: 'Vada', oxalate: 'medium' },
    { icon: '🍤', name: 'Pakora', oxalate: 'medium' },
    { icon: '🌽', name: 'Bhutta (Roasted Corn)', oxalate: 'medium' },
    { icon: '🫛', name: 'Roasted Chana', oxalate: 'medium' },
    { icon: '🥥', name: 'Coconut Water', oxalate: 'low' },
    { icon: '🍋', name: 'Nimbu Pani (Lime Water)', oxalate: 'low' },
    { icon: '🍉', name: 'Watermelon', oxalate: 'low' },
    { icon: '🍵', name: 'Chai / Tea', oxalate: 'high' },
  ],
  dinner: [
    { icon: '🍗', name: 'Chicken', oxalate: 'low' },
    { icon: '🐟', name: 'Fish', oxalate: 'low' },
    { icon: '🍳', name: 'Eggs', oxalate: 'low' },
    { icon: '🍚', name: 'Rice', oxalate: 'low' },
    { icon: '🍝', name: 'Pasta', oxalate: 'low' },
    { icon: '🍛', name: 'Vegetable Curry', oxalate: 'medium' },
    { icon: '🫘', name: 'Lentils', oxalate: 'medium' },
    { icon: '🥦', name: 'Broccoli', oxalate: 'medium' },
    { icon: '🥗', name: 'Salad', oxalate: 'low' },
    { icon: '🍠', name: 'Sweet Potato', oxalate: 'high' },
    { icon: '🥬', name: 'Spinach / Palak', oxalate: 'high' },
    { icon: '🥛', name: 'Milk', oxalate: 'low' },
    { icon: '🍲', name: 'Dal (Lentil Stew)', oxalate: 'medium' },
    { icon: '🫓', name: 'Chapati / Roti', oxalate: 'low' },
    { icon: '🧀', name: 'Paneer Bhurji', oxalate: 'low' },
    { icon: '🍗', name: 'Chicken Curry', oxalate: 'low' },
    { icon: '🐟', name: 'Fish Curry', oxalate: 'low' },
    { icon: '🍚', name: 'Veg Pulao', oxalate: 'medium' },
    { icon: '🍲', name: 'Sambar', oxalate: 'medium' },
    { icon: '🫙', name: 'Curd / Yogurt', oxalate: 'low' },
    { icon: '🥬', name: 'Palak Paneer', oxalate: 'high' },
  ],
};

const MEAL_SLOTS = [
  { id: 'breakfast', label: 'Breakfast', icon: '🍳' },
  { id: 'lunch', label: 'Mid-Day Meal', icon: '🥗' },
  { id: 'snack', label: 'Snacks', icon: '🍎' },
  { id: 'dinner', label: 'Dinner', icon: '🍽️' },
];

// Common medicines used in kidney stone management.
// Shared with the doctor prescription flow in AppointmentsComponent.

const OXB = {
  low: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  medium: 'bg-amber-50 text-amber-700 border-amber-200',
  high: 'bg-red-50 text-red-700 border-red-200',
};
const OXB_LABEL = { low: 'Low oxalate', medium: 'Medium oxalate', high: 'High oxalate' };

export default function FoodAndMedicineComponent({ patientId }) {
  const [tab, setTab] = useState('food');
  const [activeMeal, setActiveMeal] = useState('breakfast');
  const [selectedFoods, setSelectedFoods] = useState({});
  const [mealSummary, setMealSummary] = useState(null);
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingMeal, setSavingMeal] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Medicine form state
  const [medForm, setMedForm] = useState({ name: '', dose: '', frequency: 'once daily' });
  const [addingMed, setAddingMed] = useState(false);
  const [removingMed, setRemovingMed] = useState(null);

  useEffect(() => {
    if (!patientId) return;
    let active = true;
    Promise.all([
      getDailyMealSummary(patientId).catch(() => null),
      getMedicines(patientId).catch(() => []),
    ])
      .then(([meals, meds]) => {
        if (!active) return;
        setMealSummary(meals);
        setMedicines(Array.isArray(meds) ? meds : []);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [patientId]);

  const toggleFood = (meal, food) => {
    setSelectedFoods((prev) => {
      const current = prev[meal] || [];
      const exists = current.some((f) => f.name === food.name);
      return {
        ...prev,
        [meal]: exists ? current.filter((f) => f.name !== food.name) : [...current, food],
      };
    });
  };

  const handleSaveMeal = async () => {
    const items = selectedFoods[activeMeal] || [];
    if (items.length === 0) {
      setError('Select at least one food first.');
      return;
    }
    setSavingMeal(true);
    setError('');
    setMessage('');
    try {
      await logMeal({
        patient_id: patientId,
        meal_type: activeMeal,
        food_items: items.map((f) => ({
          name: f.name,
          quantity: '1 serving',
          oxalate_level: f.oxalate,
        })),
        notes: '',
      });
      setMessage(`${MEAL_SLOTS.find((m) => m.id === activeMeal)?.label} saved.`);
      setSelectedFoods((prev) => ({ ...prev, [activeMeal]: [] }));
      const meals = await getDailyMealSummary(patientId).catch(() => null);
      setMealSummary(meals);
      setTimeout(() => setMessage(''), 5000);
    } catch (err) {
      setError(err.message || 'Failed to save meal.');
    } finally {
      setSavingMeal(false);
    }
  };

  const handleAddMedicine = async () => {
    if (!medForm.name) {
      setError('Select a medicine.');
      return;
    }
    setAddingMed(true);
    setError('');
    try {
      const med = await addMedicine({
        patient_id: patientId,
        name: medForm.name,
        dose: medForm.dose || null,
        frequency: medForm.frequency || null,
      });
      setMedicines((prev) => [med, ...prev]);
      setMedForm({ name: '', dose: '', frequency: 'once daily' });
      setMessage(`${med.name} added to your daily list.`);
      setTimeout(() => setMessage(''), 5000);
    } catch (err) {
      setError(err.message || 'Failed to add medicine.');
    } finally {
      setAddingMed(false);
    }
  };

  const handleRemoveMedicine = async (med) => {
    setRemovingMed(med.id);
    setError('');
    try {
      await removeMedicine(med.id);
      setMedicines((prev) => prev.filter((m) => m.id !== med.id));
      setMessage(`${med.name} removed.`);
      setTimeout(() => setMessage(''), 5000);
    } catch (err) {
      setError(err.message || 'Failed to remove medicine.');
    } finally {
      setRemovingMed(null);
    }
  };

  const oxalateBadge = (level) => `px-2 py-0.5 rounded-full text-[11px] font-semibold border ${OXB[level]}`;

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-8 bg-white rounded-2xl shadow-lg border border-slate-200">
        <p className="text-slate-600 text-center">Loading your food & medicine tracker...</p>
      </div>
    );
  }

  const loggedMealTypes = (mealSummary?.meals || []).map((m) => m.meal_type);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <UtensilsCrossed className="w-8 h-8 text-blue-600" />
              <h2 className="text-3xl font-bold text-slate-900">Food & Medicine</h2>
            </div>
            <p className="text-slate-600">
              Log your daily meals and keep track of the medicines you take.
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 bg-slate-100 p-1.5 rounded-xl w-fit">
          <button
            onClick={() => setTab('food')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold transition-all ${
              tab === 'food' ? 'bg-blue-600 text-white shadow' : 'text-slate-600 hover:bg-white'
            }`}
          >
            <Utensils className="w-4 h-4" />
            Daily Food Log
          </button>
          <button
            onClick={() => setTab('medicine')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold transition-all ${
              tab === 'medicine' ? 'bg-blue-600 text-white shadow' : 'text-slate-600 hover:bg-white'
            }`}
          >
            <Pill className="w-4 h-4" />
            Daily Medicines
          </button>
        </div>
      </div>

      {message && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <p className="text-sm text-emerald-800 font-medium">{message}</p>
        </div>
      )}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* ============ FOOD TAB ============ */}
      {tab === 'food' && (
        <>
          {/* Today's summary */}
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
            <h3 className="text-xl font-bold text-slate-900 mb-4">Today's Meals</h3>
            <div className="grid grid-cols-4 gap-4 mb-4">
              {MEAL_SLOTS.map((slot) => {
                const logged = loggedMealTypes.includes(slot.id);
                const hasSelection = (selectedFoods[slot.id] || []).length > 0;
                return (
                  <button
                    key={slot.id}
                    onClick={() => setActiveMeal(slot.id)}
                    className={`rounded-xl border-2 p-4 text-center transition-all ${
                      activeMeal === slot.id
                        ? 'border-blue-600 bg-blue-50'
                        : logged
                          ? 'border-emerald-300 bg-emerald-50/50'
                          : 'border-slate-200 bg-white hover:border-blue-300'
                    }`}
                  >
                    <div className="text-3xl mb-1">{slot.icon}</div>
                    <p className="font-semibold text-slate-800 text-sm">{slot.label}</p>
                    <p className={`text-xs mt-1 font-medium ${logged ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {logged ? 'Logged' : hasSelection ? 'Ready to save' : 'Not logged'}
                    </p>
                  </button>
                );
              })}
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
                <p className="text-sm text-slate-600">Meals logged</p>
                <p className="text-2xl font-bold text-blue-700">{mealSummary?.meals?.length || 0}/4</p>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
                <p className="text-sm text-slate-600">Sodium so far</p>
                <p className="text-2xl font-bold text-amber-700">
                  {mealSummary ? Math.round(mealSummary.total_sodium_mg) : 0} mg
                </p>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                <p className="text-sm text-slate-600">High-oxalate items</p>
                <p className="text-2xl font-bold text-red-700">
                  {mealSummary?.high_oxalate_items?.length || 0}
                </p>
              </div>
            </div>

            {mealSummary?.high_oxalate_items?.length > 0 && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-red-800 mb-1">
                    High-oxalate foods detected today
                  </p>
                  <p className="text-sm text-red-700">
                    {mealSummary.high_oxalate_items.join(', ')} — consider limiting these if you have
                    calcium-oxalate stones.
                  </p>
                </div>
              </div>
            )}

            {mealSummary?.recommendations?.length > 0 && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <ul className="space-y-1">
                  {mealSummary.recommendations.map((rec, i) => (
                    <li key={i} className="text-sm text-blue-800">• {rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Food picker */}
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-slate-900">
                Add to {MEAL_SLOTS.find((m) => m.id === activeMeal)?.label}
              </h3>
              <div className="flex items-center gap-2">
                {(['low', 'medium', 'high']).map((lvl) => (
                  <span key={lvl} className={oxalateBadge(lvl)}>{OXB_LABEL[lvl]}</span>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-5 gap-3">
              {FOOD_CATALOG[activeMeal].map((food) => {
                const selected = (selectedFoods[activeMeal] || []).some((f) => f.name === food.name);
                return (
                  <button
                    key={food.name}
                    onClick={() => toggleFood(activeMeal, food)}
                    className={`rounded-xl border-2 p-4 text-center transition-all ${
                      selected
                        ? 'border-blue-600 bg-blue-50 shadow'
                        : 'border-slate-200 hover:border-blue-300'
                    }`}
                  >
                    <div className="text-4xl mb-2">{food.icon}</div>
                    <p className="text-sm font-semibold text-slate-800 leading-tight">{food.name}</p>
                    <span className={`inline-block mt-2 ${oxalateBadge(food.oxalate)}`}>
                      {food.oxalate}
                    </span>
                    {selected && (
                      <p className="text-xs text-blue-600 font-semibold mt-1">✓ Selected</p>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Selected items + save */}
            <div className="mt-5 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-sm font-semibold text-slate-700 mb-2">
                Selected for this meal:
              </p>
              {selectedFoods[activeMeal]?.length ? (
                <div className="flex flex-wrap gap-2 mb-3">
                  {selectedFoods[activeMeal].map((f) => (
                    <button
                      key={f.name}
                      onClick={() => toggleFood(activeMeal, f)}
                      className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-300 rounded-full text-sm hover:border-red-400 hover:text-red-600"
                    >
                      <span>{f.icon}</span>
                      {f.name}
                      <span className={oxalateBadge(f.oxalate)}>{f.oxalate}</span>
                      <span className="text-slate-400 text-xs">✕</span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400 mb-3">Nothing selected yet. Tap the foods above.</p>
              )}
              <button
                onClick={handleSaveMeal}
                disabled={savingMeal}
                className={`px-6 py-2.5 rounded-lg font-semibold flex items-center gap-2 ${
                  savingMeal
                    ? 'bg-slate-400 text-white cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {savingMeal ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" /> Log Meal
                  </>
                )}
              </button>
            </div>

            <p className="text-xs text-slate-400 mt-3">
              Oxalate labels are general dietary guidance for kidney stone prevention, not a
              medical diagnosis.
            </p>
          </div>
        </>
      )}

      {/* ============ MEDICINE TAB ============ */}
      {tab === 'medicine' && (
        <>
          {/* Active medicines */}
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Pill className="w-5 h-5 text-purple-600" />
              <h3 className="text-xl font-bold text-slate-900">Your Daily Medicines</h3>
            </div>

            {medicines.length === 0 ? (
              <p className="text-slate-500">No medicines tracked yet. Add the ones you take daily below.</p>
            ) : (
              <div className="space-y-3">
                {medicines.map((med) => (
                  <div key={med.id} className="flex items-center justify-between rounded-xl border border-slate-200 p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
                        <Pill className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{med.name}</p>
                        <p className="text-sm text-slate-600">
                          {[med.dose, med.frequency].filter(Boolean).join(' · ') || 'No dose info'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        med.prescribed_by === 'doctor'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {med.prescribed_by === 'doctor' ? (
                          <span className="flex items-center gap-1"><Stethoscope className="w-3 h-3" /> Prescribed by doctor</span>
                        ) : (
                          'Self-tracked'
                        )}
                      </span>
                      <button
                        onClick={() => handleRemoveMedicine(med)}
                        disabled={removingMed === med.id}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        title="Stop taking"
                      >
                        {removingMed === med.id ? (
                          <Loader className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <p className="text-xs text-slate-400 mt-3 flex items-start gap-1">
              <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              When your doctor updates your prescription during an appointment, your medicine list
              is updated to match the new prescription. Never stop a prescribed medicine without
              consulting your doctor.
            </p>
          </div>

          {/* Add medicine */}
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Plus className="w-5 h-5 text-blue-600" />
              <h3 className="text-xl font-bold text-slate-900">Add a Medicine You Take</h3>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Medicine</label>
                <select
                  value={medForm.name}
                  onChange={(e) => setMedForm({ ...medForm, name: e.target.value })}
                  className="w-full p-3 border border-slate-300 rounded-lg focus:border-blue-600 focus:ring-2 focus:ring-blue-200 bg-white"
                >
                  <option value="">Select a medicine...</option>
                  {MEDICINE_CATALOG.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Dose</label>
                <input
                  type="text"
                  value={medForm.dose}
                  onChange={(e) => setMedForm({ ...medForm, dose: e.target.value })}
                  placeholder="e.g. 10 mEq"
                  className="w-full p-3 border border-slate-300 rounded-lg focus:border-blue-600 focus:ring-2 focus:ring-blue-200"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Frequency</label>
                <select
                  value={medForm.frequency}
                  onChange={(e) => setMedForm({ ...medForm, frequency: e.target.value })}
                  className="w-full p-3 border border-slate-300 rounded-lg focus:border-blue-600 focus:ring-2 focus:ring-blue-200 bg-white"
                >
                  <option value="once daily">Once daily</option>
                  <option value="twice daily">Twice daily</option>
                  <option value="three times daily">Three times daily</option>
                  <option value="with meals">With meals</option>
                  <option value="at bedtime">At bedtime</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleAddMedicine}
              disabled={addingMed}
              className={`mt-4 px-6 py-2.5 rounded-lg font-semibold flex items-center gap-2 ${
                addingMed
                  ? 'bg-slate-400 text-white cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {addingMed ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" /> Adding...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" /> Add to Daily List
                </>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
