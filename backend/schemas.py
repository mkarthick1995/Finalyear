"""
RenalCare AI - Pydantic Schemas
Request and response models for API validation
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
import json


# ============= Auth Schemas =============

class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str = Field(..., min_length=8)
    age: int = Field(..., ge=1, le=120)
    gender: str
    bmi: Optional[float] = None
    family_history: bool = False


class LoginRequest(BaseModel):
    email: str
    password: str


# ============= Patient Schemas =============

class PatientCreate(BaseModel):
    id: str
    name: str
    age: int
    gender: str
    bmi: Optional[float] = None
    family_history: bool = False


class PatientResponse(BaseModel):
    id: str
    name: str
    email: Optional[str] = None
    age: int
    gender: str
    bmi: Optional[float]
    family_history: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


class AuthResponse(BaseModel):
    token: str
    patient: PatientResponse


# ============= Scan Schemas =============

class ScanAnalysisResult(BaseModel):
    stone_size_mm: float
    location: str
    severity: str  # "mild", "moderate", "severe", "none"
    confidence: float
    num_stones: int = 0


class ScanUploadRequest(BaseModel):
    patient_id: str
    stone_type: str = "calcium_oxalate"


class ScanResponse(BaseModel):
    id: str
    patient_id: str
    stone_size_mm: float = 0.0
    stone_location: str = "Not estimated"
    severity: str
    confidence: float
    prediction: Optional[str] = None
    model_version: Optional[str] = None
    stone_type: Optional[str] = None
    size_estimated: Optional[bool] = False
    size_estimation_note: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


class ScanDetailedResponse(ScanResponse):
    image_path: str
    analysis_results: dict


# ============= Water Intake Schemas =============

class WaterIntakeCreate(BaseModel):
    patient_id: str
    amount_ml: float = Field(..., gt=0)
    time: Optional[str] = None
    notes: Optional[str] = None


class WaterIntakeResponse(BaseModel):
    id: str
    patient_id: str
    amount_ml: float
    time: Optional[str]
    notes: Optional[str] = None
    date: datetime
    created_at: datetime
    
    class Config:
        from_attributes = True


class DailyWaterSummary(BaseModel):
    date: str
    total_intake_ml: float
    goal_ml: float
    percentage: float
    intakes: List[WaterIntakeResponse]


# ============= Meal Schemas =============

class MealItemCreate(BaseModel):
    name: str
    quantity: str
    oxalate_level: str = "medium"  # "low", "medium", "high"


class MealLogCreate(BaseModel):
    patient_id: str
    meal_type: str  # "breakfast", "lunch", "dinner", "snack"
    food_items: List[MealItemCreate]
    notes: Optional[str] = None


class MealLogResponse(BaseModel):
    id: str
    patient_id: str
    date: datetime
    meal_type: str
    oxalate_level: str
    sodium_mg: float
    notes: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True


class DailyMealSummary(BaseModel):
    date: str
    meals: List[MealLogResponse]
    total_sodium_mg: float
    high_oxalate_items: List[str]
    recommendations: List[str]


# ============= Diet Recommendation Schemas =============

class DietRecommendationResponse(BaseModel):
    stone_type: str
    restricted_foods: List[str]
    recommended_foods: List[str]
    daily_fluid_intake_ml: int
    daily_sodium_limit_mg: int
    tips: List[str]


class DietRecommendationRequest(BaseModel):
    stone_type: str


# ============= Risk Prediction Schemas =============

class RiskPredictionRequest(BaseModel):
    patient_id: str
    age: int
    gender: str
    family_history: bool
    previous_stones: int = 0
    treatment_compliance: float = 75.0


class RiskPredictionResponse(BaseModel):
    patient_id: str
    risk_score: float
    risk_level: str  # "Low", "Moderate", "High"
    recommendations: List[str]
    last_updated: datetime


# ============= Health Summary Schemas =============

class HealthSummary(BaseModel):
    patient_id: str
    name: str
    latest_scan: Optional[ScanResponse]
    today_water_intake_ml: float
    water_goal_ml: float
    today_meals_count: int
    risk_score: float
    risk_level: str
    recommendations: List[str]


# ============= Generic Response Schemas =============

class SuccessResponse(BaseModel):
    success: bool
    message: str
    data: Optional[dict] = None


class ErrorResponse(BaseModel):
    success: bool = False
    error: str
    details: Optional[dict] = None


# ============= Doctor Schemas =============

class DoctorCreate(BaseModel):
    patient_id: str
    name: str
    hospital: Optional[str] = None
    phone: Optional[str] = None
    phone_additional: Optional[str] = None
    open_time: Optional[str] = None
    close_time: Optional[str] = None


class DoctorResponse(BaseModel):
    id: str
    patient_id: str
    name: str
    hospital: Optional[str] = None
    phone: Optional[str] = None
    phone_additional: Optional[str] = None
    open_time: Optional[str] = None
    close_time: Optional[str] = None
    active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ============= Appointment Schemas =============

class AppointmentCreate(BaseModel):
    patient_id: str
    appointment_date: str  # ISO datetime
    appointment_type: str
    doctor_type: str
    title: str
    reason: str
    description: str = ""
    doctor_id: Optional[str] = None  # saved doctor profile to book with


class RecommendationCreate(BaseModel):
    patient_id: str
    appointment_id: str
    hydration_adjustment: Optional[str] = None
    dietary_changes: Optional[str] = None
    medication_changes: Optional[str] = None
    monitoring_schedule: Optional[str] = None
    follow_up_date: Optional[str] = None
    appointment_date: Optional[str] = None


# ============= Medicine Schemas =============

class MedicineCreate(BaseModel):
    patient_id: str
    name: str
    dose: Optional[str] = None
    frequency: Optional[str] = None
    notes: Optional[str] = None


class MedicineResponse(BaseModel):
    id: str
    patient_id: str
    name: str
    dose: Optional[str] = None
    frequency: Optional[str] = None
    notes: Optional[str] = None
    prescribed_by: str  # "patient" | "doctor"
    active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class PrescriptionItem(BaseModel):
    name: str
    dose: Optional[str] = None
    frequency: Optional[str] = None
    notes: Optional[str] = None


class PrescriptionCreate(BaseModel):
    patient_id: str
    appointment_id: Optional[str] = None
    medicines: List[PrescriptionItem]


# ============= Health Goal Schemas =============

class HealthGoalResponse(BaseModel):
    model_config = {"protected_namespaces": ()}

    patient_id: str
    date: str
    source: str  # "nvidia_nim" or "rule_based"
    goals: List[dict]
    disclaimer: str
    model_metrics: Optional[dict] = None
