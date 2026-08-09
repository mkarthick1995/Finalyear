import React, { useState, useEffect } from 'react';
import { Upload, X, AlertCircle, CheckCircle, Loader, Info } from 'lucide-react';
import { uploadScan, getVisionMetrics } from '../api';

const STORAGE_KEY = 'renalcare_last_scan_result';

export default function ImageUploadComponent({ patientId, onNavigate }) {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [visionMetrics, setVisionMetrics] = useState(null);

  useEffect(() => {
    getVisionMetrics()
      .then((data) => setVisionMetrics(data.metrics || null))
      .catch(() => setVisionMetrics(null));
  }, []);

  // Restore the last scan result so it stays visible until a new scan replaces it
  useEffect(() => {
    if (!patientId) return;
    let timer = null;
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (saved && saved.patientId === patientId && saved.result?.prediction) {
        timer = setTimeout(() => setResult(saved.result), 0);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [patientId]);

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
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type.startsWith('image/')) {
      setFile(droppedFile);
      setError(null);
    } else {
      setError('Please drop an image file');
    }
  };

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type.startsWith('image/')) {
      setFile(selectedFile);
      setError(null);
    } else {
      setError('Please select an image file');
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file first');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await uploadScan(file, patientId, 'unknown');

      if (response && response.prediction) {
        setResult(response);
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ patientId, result: response })
        );
      } else {
        throw new Error('Invalid response format from server');
      }
    } catch (err) {
      console.error('Upload error:', err);
      setError(err.message || 'Failed to upload scan. Make sure backend is running on port 8001');
    } finally {
      setLoading(false);
    }
  };

  const removeFile = () => {
    setFile(null);
    setResult(null);
    setError(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-6 bg-white rounded-2xl shadow-lg border border-slate-200">
      <div className="flex items-center gap-3 mb-6">
        <Upload className="w-6 h-6 text-blue-600" />
        <h2 className="text-2xl font-bold text-slate-800">Kidney Stone Scan Analysis</h2>
      </div>

      {/* Upload Area */}
      {!result && (
        <>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-all cursor-pointer ${
              isDragging
                ? 'border-blue-500 bg-blue-50'
                : 'border-slate-300 bg-slate-50 hover:bg-slate-100'
            }`}
          >
            <input
              type="file"
              id="fileInput"
              accept="image/*"
              onChange={handleFileSelect}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <label htmlFor="fileInput" className="absolute inset-0 w-full h-full flex flex-col items-center justify-center cursor-pointer">
              <div className="flex flex-col items-center gap-2">
                <Upload className={`w-12 h-12 ${isDragging ? 'text-blue-600' : 'text-slate-400'}`} />
                <p className="text-lg font-semibold text-slate-700">
                  {isDragging ? 'Drop your scan here' : 'Drag & drop your kidney scan'}
                </p>
                <p className="text-sm text-slate-500">or click to select a file</p>
                <p className="text-xs text-slate-400 mt-2">
                  Supported: JPG, PNG, DICOM (up to 10MB)
                </p>
              </div>
            </label>
          </div>

          {/* File Preview */}
          {file && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img
                    src={URL.createObjectURL(file)}
                    alt="preview"
                    className="w-16 h-16 object-cover rounded-lg"
                  />
                  <div>
                    <p className="font-semibold text-slate-800">{file.name}</p>
                    <p className="text-sm text-slate-600">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <button
                  onClick={removeFile}
                  className="p-2 hover:bg-blue-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-slate-600" />
                </button>
              </div>

              {/* Upload Button */}
              <button
                onClick={handleUpload}
                disabled={loading}
                className={`w-full mt-4 py-3 px-4 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
                  loading
                    ? 'bg-slate-400 text-white cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700 cursor-pointer'
                }`}
              >
                {loading ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  'Analyze Scan'
                )}
              </button>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </>
      )}

      {/* Results */}
      {result && (
        <div className="mt-6 space-y-4">
          <div className={`p-6 bg-gradient-to-r border-2 rounded-xl ${
            result.prediction === 'stone'
              ? 'from-amber-50 to-orange-50 border-amber-200'
              : 'from-green-50 to-emerald-50 border-green-200'
          }`}>
            <div className="flex items-start gap-3">
              <CheckCircle className={`w-8 h-8 flex-shrink-0 mt-1 ${
                result.prediction === 'stone' ? 'text-amber-600' : 'text-green-600'
              }`} />
              <div className="flex-1">
                <h3 className="font-bold text-lg text-slate-900 mb-1">
                  {result.prediction === 'stone' ? 'Stone pattern detected' : 'No stone pattern detected'}
                </h3>
                {result.created_at && (
                  <p className="text-xs text-slate-500 mb-3">
                    Analyzed on {new Date(result.created_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                  </p>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white rounded-lg p-4 border border-slate-100">
                    <p className="text-sm text-slate-600 font-medium">Prediction</p>
                    <p className="text-xl font-bold text-slate-900 mt-2 uppercase">
                      {result.prediction}
                    </p>
                  </div>

                  <div className="bg-white rounded-lg p-4 border border-slate-100">
                    <p className="text-sm text-slate-600 font-medium">Confidence</p>
                    <p className="text-xl font-bold text-slate-900 mt-2">
                      {((result.confidence || 0) * 100).toFixed(1)}%
                    </p>
                  </div>

                  <div className="bg-white rounded-lg p-4 border border-slate-100">
                    <p className="text-sm text-slate-600 font-medium">Stone size (estimated)</p>
                    <p className="text-xl font-bold text-slate-900 mt-2">
                      {result.stone_size_mm > 0 ? `${result.stone_size_mm.toFixed(2)} mm` : 'Not estimated'}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {result.size_estimated
                        ? 'Approximate, from the model\'s attention region'
                        : 'No DICOM metadata to calibrate'}
                    </p>
                  </div>

                  <div className="bg-white rounded-lg p-4 border border-slate-100">
                    <p className="text-sm text-slate-600 font-medium">Model version</p>
                    <p className="text-sm font-bold text-slate-800 mt-2 break-words">
                      {result.model_version || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {result.size_estimation_note && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
              <Info className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-800 leading-relaxed">{result.size_estimation_note}</p>
            </div>
          )}

          {visionMetrics && visionMetrics.accuracy !== undefined && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-blue-800 leading-relaxed">
                Model quality (held-out test set): accuracy{' '}
                {((visionMetrics.accuracy || 0) * 100).toFixed(1)}%, precision{' '}
                {((visionMetrics.precision || 0) * 100).toFixed(1)}%, recall{' '}
                {((visionMetrics.recall || 0) * 100).toFixed(1)}%. This is a
                research/demo system and does not provide medical diagnosis.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={removeFile}
              className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Analyze Another Scan
            </button>
            {onNavigate && (
              <button
                onClick={() => {
                  setResult(null);
                  onNavigate('hydration');
                }}
                className="flex-1 py-3 px-4 bg-slate-200 text-slate-800 rounded-lg font-semibold hover:bg-slate-300 transition-colors"
              >
                Continue to Hydration
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
