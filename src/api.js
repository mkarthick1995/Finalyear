/**
 * RenalCare AI - Frontend API Integration
 * Helper functions and utilities for frontend to communicate with backend
 */

const API_BASE_URL = "http://localhost:8001/api";

// ============= Patient Management =============

export const createPatient = async (patientData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/patients`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patientData),
    });
    return await response.json();
  } catch (error) {
    console.error("Error creating patient:", error);
    throw error;
  }
};

export const getPatient = async (patientId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/patients/${patientId}`);
    return await response.json();
  } catch (error) {
    console.error("Error fetching patient:", error);
    throw error;
  }
};

export const getHealthSummary = async (patientId) => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/patients/${patientId}/health-summary`
    );
    return await response.json();
  } catch (error) {
    console.error("Error fetching health summary:", error);
    throw error;
  }
};

// ============= Image Analysis =============

export const uploadScan = async (fileOrPatientId, maybePatientId, maybeStoneType) => {
  // Supports two calling patterns used in the components:
  // 1) uploadScan(file, patientId="patient_demo_001", stoneType)
  // 2) uploadScan(patientId, stoneType, file)
  try {
    let file = null;
    let patientId = 'patient_demo_001';
    let stoneType = 'unknown';

    // detect pattern
    if (fileOrPatientId && typeof fileOrPatientId === 'object' && ('name' in fileOrPatientId || 'size' in fileOrPatientId)) {
      // first arg is file
      file = fileOrPatientId;
      if (maybePatientId) patientId = maybePatientId;
      if (maybeStoneType) stoneType = maybeStoneType;
    } else {
      // assume (patientId, stoneType, file)
      patientId = fileOrPatientId || patientId;
      stoneType = maybePatientId || stoneType;
      file = maybeStoneType || null;
    }

    if (!file) throw new Error('No file provided to uploadScan');

    const formData = new FormData();
    formData.append('file', file);

    // Build URL with query parameters
    const url = new URL(`${API_BASE_URL}/analyze-scan`);
    url.searchParams.append('patient_id', patientId);
    url.searchParams.append('stone_type', stoneType);

    const response = await fetch(url.toString(), {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status} - ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error uploading scan:', error);
    throw error;
  }
};

export const getPatientScans = async (patientId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/scans/${patientId}`);
    return await response.json();
  } catch (error) {
    console.error("Error fetching scans:", error);
    throw error;
  }
};

export const getScanDetail = async (scanId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/scans/detail/${scanId}`);
    return await response.json();
  } catch (error) {
    console.error("Error fetching scan detail:", error);
    throw error;
  }
};

// ============= Water Intake =============

export const logWaterIntake = async (...args) => {
  // Supports two calling patterns:
  // 1) logWaterIntake({ patient_id, amount_ml, time, notes })
  // 2) logWaterIntake(patientId, amountMl, time, notes)
  try {
    let payload = null;
    if (args.length === 1 && typeof args[0] === 'object') {
      payload = args[0];
    } else {
      const [patientId, amountMl, time, notes] = args;
      payload = {
        patient_id: patientId,
        amount_ml: amountMl,
        time,
        notes,
      };
    }

    const response = await fetch(`${API_BASE_URL}/water-intake`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await response.json();
  } catch (error) {
    console.error('Error logging water intake:', error);
    throw error;
  }
};

export const getDailyWaterSummary = async (patientId, date = null) => {
  try {
    let url = `${API_BASE_URL}/water-intake/${patientId}/daily`;
    if (date) {
      url += `?date=${date}`;
    }
    const response = await fetch(url);
    
    if (!response.ok) {
      console.warn(`Water summary endpoint returned ${response.status}`);
      // Return mock data if endpoint unavailable
      return {
        patient_id: patientId,
        date: new Date().toISOString().split('T')[0],
        total_intake_ml: 0,
        goal_ml: 2500,
        intakes: []
      };
    }
    
    return await response.json();
  } catch (error) {
    console.error("Error fetching water summary:", error);
    // Return mock data on error
    return {
      patient_id: patientId,
      date: new Date().toISOString().split('T')[0],
      total_intake_ml: 0,
      goal_ml: 2500,
      intakes: []
    };
  }
};

export const getWaterHistory = async (patientId, days = 7) => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/water-intake/${patientId}/history?days=${days}`
    );
    return await response.json();
  } catch (error) {
    console.error("Error fetching water history:", error);
    throw error;
  }
};

export const getRiskInsights = async (patientId, days = 30) => {
  try {
    const response = await fetch(`${API_BASE_URL}/risk-insights/${patientId}?days=${days}`);
    if (!response.ok) {
      throw new Error(`API Error: ${response.status} - ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching risk insights:", error);
    throw error;
  }
};

export const resetWaterIntakeForDay = async (patientId, date = null) => {
  try {
    let url = `${API_BASE_URL}/water-intake/${patientId}/reset`;
    if (date) {
      url += `?date=${date}`;
    }
    const response = await fetch(url, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) {
      throw new Error(`API Error: ${response.status} - ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error resetting water intake:', error);
    throw error;
  }
};

// ============= Meals =============

export const logMeal = async (mealData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/meals`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(mealData),
    });
    return await response.json();
  } catch (error) {
    console.error("Error logging meal:", error);
    throw error;
  }
};

export const getDailyMealSummary = async (patientId, date = null) => {
  try {
    const url = date
      ? `${API_BASE_URL}/meals/${patientId}/daily?date=${date}`
      : `${API_BASE_URL}/meals/${patientId}/daily`;
    const response = await fetch(url);
    return await response.json();
  } catch (error) {
    console.error("Error fetching meal summary:", error);
    throw error;
  }
};

export const getMealHistory = async (patientId, days = 7) => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/meals/${patientId}/history?days=${days}`
    );
    return await response.json();
  } catch (error) {
    console.error("Error fetching meal history:", error);
    throw error;
  }
};

// ============= Diet Recommendations =============

export const getDietRecommendations = async (stoneType) => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/diet-recommendations/${stoneType}`
    );
    return await response.json();
  } catch (error) {
    console.error("Error fetching diet recommendations:", error);
    throw error;
  }
};

export const getAllDietRecommendations = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/diet-recommendations`);
    return await response.json();
  } catch (error) {
    console.error("Error fetching all recommendations:", error);
    throw error;
  }
};

export const updatePatientDiet = async (patientId, stoneType) => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/diet-recommendations/${patientId}?stone_type=${stoneType}`,
      { method: "POST" }
    );
    return await response.json();
  } catch (error) {
    console.error("Error updating diet:", error);
    throw error;
  }
};

// ============= Risk Prediction =============

export const predictRisk = async (riskData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/predict-risk`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(riskData),
    });
    return await response.json();
  } catch (error) {
    console.error("Error predicting risk:", error);
    throw error;
  }
};

export const getPatientRiskScore = async (patientId) => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/patients/${patientId}/risk-score`
    );
    return await response.json();
  } catch (error) {
    console.error("Error fetching risk score:", error);
    throw error;
  }
};

// ============= Health Check =============

export const checkApiHealth = async () => {
  try {
    const response = await fetch(`${API_BASE_URL.replace("/api", "")}/health`);
    return await response.json();
  } catch (error) {
    console.error("Error checking API health:", error);
    return { status: "unavailable" };
  }
};

// ============= Appointments =============

export const createAppointment = async (patientId, appointmentData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/appointments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patient_id: patientId,
        ...appointmentData,
      }),
    });
    return await response.json();
  } catch (error) {
    console.error("Error creating appointment:", error);
    throw error;
  }
};

export const saveRecommendations = async (patientId, appointmentId, recommendations) => {
  try {
    const response = await fetch(`${API_BASE_URL}/recommendations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patient_id: patientId,
        appointment_id: appointmentId,
        hydration_adjustment: recommendations.hydrationAdjustment,
        dietary_changes: recommendations.dietaryChanges,
        medication_changes: recommendations.medicationChanges,
        monitoring_schedule: recommendations.monitoringSchedule,
        follow_up_date: recommendations.followUpDate,
        appointment_date: recommendations.appointmentDate,
      }),
    });
    return await response.json();
  } catch (error) {
    console.error("Error saving recommendations:", error);
    throw error;
  }
};

export const getAppointments = async (patientId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/appointments/${patientId}`);
    return await response.json();
  } catch (error) {
    console.error("Error fetching appointments:", error);
    throw error;
  }
};

export const getRecommendations = async (patientId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/recommendations/${patientId}`);
    return await response.json();
  } catch (error) {
    console.error("Error fetching recommendations:", error);
    throw error;
  }
};
