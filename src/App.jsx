import React, { useState, useEffect } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { Upload, Droplet, TrendingDown, Activity, AlertCircle, Check, Calendar, Award } from 'lucide-react';
import ImageUploadComponent from './components/ImageUploadComponent';
import WaterIntakeComponent from './components/WaterIntakeComponent';
import RiskInsightsComponent from './components/RiskInsightsComponent';

export default function App() {
  const [hydration, setHydration] = useState(0);
  const [riskScore, setRiskScore] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [stoneComposition, setStoneComposition] = useState('calcium-oxalate');
  const [activeTab, setActiveTab] = useState('dashboard'); // NEW: Tab navigation

  // Animate hydration on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setHydration(80);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  // Animate risk score on mount
  useEffect(() => {
    const duration = 2000;
    const steps = 60;
    const increment = 24 / steps;
    let current = 0;
    
    const timer = setInterval(() => {
      current += increment;
      if (current >= 24) {
        setRiskScore(24);
        clearInterval(timer);
      } else {
        setRiskScore(Math.floor(current));
      }
    }, duration / steps);
    
    return () => clearInterval(timer);
  }, []);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    setUploadedFile('ct-scan-sample.dcm');
  };

  const lowOxalateFoods = [
    { name: 'Cauliflower', oxalate: 'Very Low', icon: '🥦', color: 'from-emerald-50 to-teal-50' },
    { name: 'Cucumber', oxalate: 'Low', icon: '🥒', color: 'from-green-50 to-emerald-50' },
    { name: 'White Rice', oxalate: 'Low', icon: '🍚', color: 'from-blue-50 to-cyan-50' },
    { name: 'Chicken Breast', oxalate: 'Very Low', icon: '🍗', color: 'from-slate-50 to-blue-50' },
    { name: 'Apple', oxalate: 'Low', icon: '🍎', color: 'from-red-50 to-pink-50' },
    { name: 'White Bread', oxalate: 'Low', icon: '🍞', color: 'from-amber-50 to-yellow-50' },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100">
      {/* Sidebar */}
      <motion.aside 
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="fixed left-0 top-0 h-screen w-72 bg-white border-r border-slate-200/60 shadow-xl shadow-slate-200/50 z-50"
      >
        <div className="p-8">
          <div className="flex items-center gap-3 mb-12">
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

          <nav className="space-y-2">
            {[
              { id: 'dashboard', icon: Activity, label: 'Dashboard', active: true },
              { id: 'scan', icon: Upload, label: 'AI Scan Analysis' },
              { id: 'hydration', icon: Droplet, label: 'Hydration Tracker' },
              { id: 'risk', icon: TrendingDown, label: 'Risk Insights' },
              { id: 'appointments', icon: Calendar, label: 'Appointments' },
              { id: 'goals', icon: Award, label: 'Health Goals' },
            ].map((item, idx) => (
              <motion.button
                key={idx}
                whileHover={{ x: 4, backgroundColor: 'rgba(59, 130, 246, 0.05)' }}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all ${
                  activeTab === item.id
                    ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-200' 
                    : 'text-slate-600 hover:text-blue-600'
                }`}
              >
                <item.icon className="w-5 h-5" strokeWidth={2} />
                <span className="font-medium text-sm" style={{ fontFamily: "'Inter', sans-serif" }}>
                  {item.label}
                </span>
              </motion.button>
            ))}
          </nav>

          <div className="absolute bottom-8 left-8 right-8">
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <Check className="w-5 h-5 text-emerald-600" strokeWidth={2.5} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-emerald-900 mb-1">Low Risk Status</p>
                  <p className="text-xs text-emerald-700 leading-relaxed">Your kidney health is excellent. Keep up the great work!</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.aside>

      {/* Main Content */}
      <div className="ml-72 p-12">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="max-w-7xl mx-auto space-y-8"
        >
          {/* CONDITIONAL: Show based on active tab */}
          {activeTab !== 'dashboard' && (
            <motion.div variants={itemVariants}>
              {activeTab === 'scan' && <ImageUploadComponent patientId="patient_demo_001" />}
              {activeTab === 'hydration' && <WaterIntakeComponent patientId="patient_demo_001" />}
              {activeTab === 'risk' && <RiskInsightsComponent patientId="patient_demo_001" />}
              {activeTab === 'appointments' && <div className="text-center text-slate-600 py-12"><p>Appointments coming soon</p></div>}
              {activeTab === 'goals' && <div className="text-center text-slate-600 py-12"><p>Health Goals coming soon</p></div>}
            </motion.div>
          )}

          {/* MAIN DASHBOARD */}
          {activeTab === 'dashboard' && (
            <>
          {/* Header/Hero Section */}
          <motion.div variants={itemVariants} className="mb-12">
            <motion.h2 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="text-5xl font-bold mb-4 bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 bg-clip-text text-transparent"
              style={{ fontFamily: "'Outfit', sans-serif" }}
            >
              Welcome to RenalCare AI
            </motion.h2>
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className="text-slate-600 text-lg max-w-2xl leading-relaxed"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              Your personalized kidney stone prevention system. Track your health metrics, analyze scans, and reduce recurrence risk with AI-powered insights.
            </motion.p>

            {/* Health Status Cards */}
            <div className="grid grid-cols-3 gap-6 mt-8">
              {[
                { label: 'Days Stone-Free', value: '127', trend: '+12%', color: 'emerald' },
                { label: 'Hydration Goal', value: '80%', trend: 'On Track', color: 'blue' },
                { label: 'Risk Score', value: '24%', trend: 'Low', color: 'green' },
              ].map((stat, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + idx * 0.1, duration: 0.6 }}
                  whileHover={{ y: -4, boxShadow: '0 20px 40px -12px rgba(0,0,0,0.1)' }}
                  className="bg-white rounded-2xl p-6 border border-slate-200/60 shadow-lg shadow-slate-200/50"
                >
                  <p className="text-slate-500 text-sm font-medium mb-2">{stat.label}</p>
                  <p className="text-3xl font-bold text-slate-900 mb-1" style={{ fontFamily: "'Outfit', sans-serif" }}>
                    {stat.value}
                  </p>
                  <p className={`text-${stat.color}-600 text-sm font-medium`}>↑ {stat.trend}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* AI Scan Upload Section */}
          <motion.div variants={itemVariants}>
            <h3 className="text-2xl font-bold text-slate-900 mb-6" style={{ fontFamily: "'Outfit', sans-serif" }}>
              AI Scan Analysis
            </h3>
            <div className="grid grid-cols-2 gap-6">
              {/* Upload Zone */}
              <motion.div
                whileHover={{ scale: 1.01 }}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`bg-white rounded-2xl border-2 border-dashed p-12 flex flex-col items-center justify-center cursor-pointer transition-all ${
                  isDragging 
                    ? 'border-blue-500 bg-blue-50/50 shadow-xl shadow-blue-200/50' 
                    : 'border-slate-300 hover:border-blue-400 hover:bg-blue-50/30'
                }`}
                style={{
                  animation: isDragging ? 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' : 'none'
                }}
              >
                <motion.div
                  animate={isDragging ? { scale: [1, 1.1, 1] } : { scale: 1 }}
                  transition={{ duration: 1, repeat: isDragging ? Infinity : 0 }}
                  className="w-20 h-20 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-2xl flex items-center justify-center mb-6"
                >
                  <Upload className="w-10 h-10 text-blue-600" strokeWidth={2} />
                </motion.div>
                <h4 className="text-lg font-semibold text-slate-900 mb-2">
                  {uploadedFile ? 'Scan Uploaded!' : 'Upload CT Scan'}
                </h4>
                <p className="text-slate-500 text-sm text-center mb-4">
                  {uploadedFile ? uploadedFile : 'Drag and drop your DICOM file or click to browse'}
                </p>
                <button className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-blue-200 transition-all">
                  Browse Files
                </button>
              </motion.div>

              {/* Scan Results */}
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: uploadedFile ? 1 : 0.5, x: 0 }}
                transition={{ duration: 0.6 }}
                className="bg-white rounded-2xl p-8 border border-slate-200/60 shadow-lg shadow-slate-200/50"
              >
                <h4 className="text-lg font-semibold text-slate-900 mb-6 flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  Scan Analysis Results
                </h4>
                
                {/* Mock CT Scan with Bounding Box */}
                <div className="relative bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl overflow-hidden mb-6 aspect-square">
                  <div className="absolute inset-0 opacity-40" style={{
                    backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(100, 116, 139, 0.3), transparent)',
                  }}></div>
                  {/* Simulated kidney outline */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-40 border-2 border-slate-500 rounded-full opacity-30"></div>
                  
                  {/* Bounding Box for Stone */}
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={uploadedFile ? { scale: 1, opacity: 1 } : {}}
                    transition={{ delay: 0.5, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute top-1/3 right-1/3 w-16 h-16 border-2 border-red-500 bg-red-500/10"
                  >
                    <div className="absolute -top-6 left-0 bg-red-500 text-white text-xs px-2 py-1 rounded">
                      Stone Detected
                    </div>
                  </motion.div>
                  
                  {/* Scan overlay text */}
                  <div className="absolute bottom-4 left-4 text-green-400 text-xs font-mono">
                    SCAN_2024_04_17.dcm
                  </div>
                </div>

                {/* Metrics */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-4 bg-slate-50 rounded-xl">
                    <span className="text-slate-600 font-medium text-sm">Estimated Size</span>
                    <span className="text-slate-900 font-bold text-lg">6.5 mm</span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-slate-50 rounded-xl">
                    <span className="text-slate-600 font-medium text-sm">Location</span>
                    <span className="text-slate-900 font-bold">Right Kidney</span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                    <span className="text-emerald-700 font-medium text-sm">Confidence</span>
                    <span className="text-emerald-900 font-bold">94.3%</span>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>

          {/* Dietary & Hydration Engine */}
          <motion.div variants={itemVariants}>
            <h3 className="text-2xl font-bold text-slate-900 mb-6" style={{ fontFamily: "'Outfit', sans-serif" }}>
              Dietary & Hydration Engine
            </h3>
            
            <div className="grid grid-cols-3 gap-6">
              {/* Stone Composition Selector */}
              <div className="col-span-2 space-y-6">
                <div className="bg-white rounded-2xl p-6 border border-slate-200/60 shadow-lg shadow-slate-200/50">
                  <label className="block text-sm font-semibold text-slate-700 mb-3">
                    Stone Composition Type
                  </label>
                  <select
                    value={stoneComposition}
                    onChange={(e) => setStoneComposition(e.target.value)}
                    className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  >
                    <option value="calcium-oxalate">Calcium Oxalate</option>
                    <option value="uric-acid">Uric Acid</option>
                    <option value="struvite">Struvite</option>
                    <option value="cystine">Cystine</option>
                  </select>
                </div>

                {/* Meal Cards Grid */}
                <div>
                  <h4 className="text-lg font-semibold text-slate-900 mb-4">Recommended Low-Oxalate Foods</h4>
                  <div className="grid grid-cols-3 gap-4">
                    {lowOxalateFoods.map((food, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.8 + idx * 0.1, duration: 0.4 }}
                        whileHover={{ y: -6, boxShadow: '0 20px 40px -12px rgba(0,0,0,0.15)' }}
                        className={`bg-gradient-to-br ${food.color} rounded-2xl p-6 border border-slate-200/40 cursor-pointer`}
                      >
                        <div className="text-4xl mb-3">{food.icon}</div>
                        <h5 className="font-bold text-slate-900 mb-1">{food.name}</h5>
                        <p className="text-xs text-slate-600 font-medium">{food.oxalate} Oxalate</p>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Hydration Tracker */}
              <div className="bg-white rounded-2xl p-8 border border-slate-200/60 shadow-lg shadow-slate-200/50 flex flex-col items-center">
                <h4 className="text-lg font-semibold text-slate-900 mb-6 self-start">Daily Hydration</h4>
                
                {/* Water Bottle Visualization */}
                <div className="relative w-24 h-72 bg-slate-100 rounded-t-3xl rounded-b-2xl border-4 border-slate-300 overflow-hidden mb-6">
                  {/* Water fill */}
                  <motion.div
                    initial={{ height: '0%' }}
                    animate={{ height: `${hydration}%` }}
                    transition={{ duration: 2, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-cyan-400 to-blue-400 opacity-80"
                  >
                    {/* Water wave effect */}
                    <div className="absolute top-0 left-0 right-0 h-3 bg-blue-300 opacity-50 rounded-full" 
                         style={{ animation: 'wave 3s ease-in-out infinite' }}></div>
                  </motion.div>
                  
                  {/* Bottle cap */}
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-12 h-6 bg-blue-600 rounded-t-lg border-4 border-slate-300"></div>
                  
                  {/* Measurement lines */}
                  {[25, 50, 75].map((mark) => (
                    <div key={mark} className="absolute left-0 right-0 flex items-center" style={{ bottom: `${mark}%` }}>
                      <div className="h-px bg-slate-300 flex-1"></div>
                      <span className="text-xs text-slate-400 ml-2">{mark}%</span>
                    </div>
                  ))}
                </div>

                <div className="text-center">
                  <p className="text-4xl font-bold text-blue-600 mb-2" style={{ fontFamily: "'Outfit', sans-serif" }}>
                    {hydration}%
                  </p>
                  <p className="text-sm text-slate-600 mb-4">2.4L / 3.0L Goal</p>
                  <button className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-medium text-sm hover:shadow-lg hover:shadow-blue-200 transition-all">
                    Log Water Intake
                  </button>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Predictive Risk Dashboard */}
          <motion.div variants={itemVariants}>
            <h3 className="text-2xl font-bold text-slate-900 mb-6" style={{ fontFamily: "'Outfit', sans-serif" }}>
              Predictive Risk Dashboard
            </h3>
            
            <div className="grid grid-cols-2 gap-6">
              {/* Circular Risk Gauge */}
              <div className="bg-white rounded-2xl p-10 border border-slate-200/60 shadow-lg shadow-slate-200/50 flex flex-col items-center justify-center">
                <h4 className="text-lg font-semibold text-slate-900 mb-8">Recurrence Risk Score</h4>
                
                {/* SVG Circular Progress */}
                <div className="relative w-64 h-64">
                  <svg className="transform -rotate-90 w-full h-full">
                    {/* Background circle */}
                    <circle
                      cx="128"
                      cy="128"
                      r="110"
                      stroke="#e2e8f0"
                      strokeWidth="16"
                      fill="none"
                    />
                    {/* Progress circle */}
                    <motion.circle
                      cx="128"
                      cy="128"
                      r="110"
                      stroke="url(#greenGradient)"
                      strokeWidth="16"
                      fill="none"
                      strokeLinecap="round"
                      initial={{ strokeDasharray: "691.15 691.15", strokeDashoffset: 691.15 }}
                      animate={{ strokeDashoffset: 691.15 - (691.15 * riskScore / 100) }}
                      transition={{ duration: 2, ease: [0.22, 1, 0.36, 1] }}
                    />
                    <defs>
                      <linearGradient id="greenGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#10b981" />
                        <stop offset="100%" stopColor="#14b8a6" />
                      </linearGradient>
                    </defs>
                  </svg>
                  
                  {/* Center text */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <motion.p 
                      className="text-6xl font-bold text-emerald-600 mb-2"
                      style={{ fontFamily: "'Outfit', sans-serif" }}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 1, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                    >
                      {riskScore}%
                    </motion.p>
                    <p className="text-sm text-slate-600 font-medium">Low Risk</p>
                  </div>
                </div>

                <p className="text-slate-500 text-sm text-center mt-6 max-w-xs">
                  Based on your hydration, diet compliance, and medical history
                </p>
              </div>

              {/* Risk Trend Chart */}
              <div className="bg-white rounded-2xl p-8 border border-slate-200/60 shadow-lg shadow-slate-200/50">
                <h4 className="text-lg font-semibold text-slate-900 mb-6 flex items-center gap-2">
                  Risk Trend
                  <TrendingDown className="w-5 h-5 text-emerald-600" />
                </h4>

                {/* Simple CSS Chart Placeholder */}
                <div className="relative h-64 flex items-end justify-between gap-2 px-4">
                  {[68, 54, 45, 38, 29, 24].map((value, idx) => (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${(100 - value)}%` }}
                        transition={{ delay: 0.5 + idx * 0.15, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                        className="w-full bg-gradient-to-t from-emerald-400 to-teal-400 rounded-t-xl relative"
                        style={{ maxHeight: '100%' }}
                      >
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-sm font-bold text-slate-700">
                          {value}%
                        </div>
                      </motion.div>
                      <span className="text-xs text-slate-500 font-medium">
                        {['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'][idx]}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-8 p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                  <p className="text-sm text-emerald-800">
                    <span className="font-bold">↓ 44% reduction</span> in recurrence risk over 6 months. Excellent progress!
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Footer Info */}
          <motion.div 
            variants={itemVariants}
            className="bg-gradient-to-r from-slate-900 to-blue-900 rounded-2xl p-8 text-white"
          >
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xl font-bold mb-2" style={{ fontFamily: "'Outfit', sans-serif" }}>
                  Need Medical Advice?
                </h4>
                <p className="text-blue-200 text-sm">
                  Schedule a consultation with our kidney specialists for personalized care.
                </p>
              </div>
              <button className="px-8 py-3.5 bg-white text-blue-900 rounded-xl font-semibold hover:shadow-2xl hover:shadow-white/20 transition-all">
                Book Appointment
              </button>
            </div>
          </motion.div>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}