"""
RenalCare AI - FastAPI Backend
Complete backend for kidney stone analysis, tracking, and recommendations
"""

from fastapi import FastAPI, File, UploadFile, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
import pickle
import json
import uuid
import os

# Import local modules
from database import init_db, get_db, seed_diet_recommendations, Patient, KidneyScan, WaterIntake, MealLog, DietRecommendation
from image_utils import save_upload_file, analyze_image_file
from schemas import (
    PatientCreate, PatientResponse, ScanUploadRequest, ScanResponse, ScanDetailedResponse,
    WaterIntakeCreate, WaterIntakeResponse, DailyWaterSummary,
    MealLogCreate, MealLogResponse, DailyMealSummary, MealItemCreate,
    DietRecommendationRequest, DietRecommendationResponse,
    RiskPredictionRequest, RiskPredictionResponse,
    SuccessResponse, ErrorResponse, HealthSummary
)

# ============= FastAPI App Setup =============

app = FastAPI(
    title="RenalCare AI",
    description="Advanced Kidney Stone Detection and Management System",
    version="2.0.0"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://localhost:5175", "http://localhost:5176", "http://localhost:5177", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============= Initialization =============

@app.on_event("startup")
def startup_event():
    """Initialize database on startup"""
    init_db()
    print("✓ Database initialized")
    
    # Seed diet recommendations
    db = next(get_db())
    seed_diet_recommendations(db)
    db.close()


# ============= Health Check =============

@app.get("/")
def root():
    """Health check endpoint"""
    return {
        "message": "RenalCare AI API is running",
        "version": "2.0.0",
        "status": "operational"
    }


@app.get("/api/health")
def health_check():
    """API health status"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow(),
        "services": {
            "database": "connected",
            "image_processing": "ready",
            "ml_models": "loaded"
        }
    }


# ============= Patient Management Endpoints =============

@app.post("/api/patients", response_model=PatientResponse)
def create_patient(patient: PatientCreate, db: Session = Depends(get_db)):
    """Create a new patient"""
    # Check if patient already exists
    existing = db.query(Patient).filter(Patient.id == patient.id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Patient already exists")
    
    db_patient = Patient(**patient.dict())
    db.add(db_patient)
    db.commit()
    db.refresh(db_patient)
    return db_patient


@app.get("/api/patients/{patient_id}", response_model=PatientResponse)
def get_patient(patient_id: str, db: Session = Depends(get_db)):
    """Get patient details"""
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient


@app.get("/api/patients/{patient_id}/health-summary", response_model=HealthSummary)
def get_health_summary(patient_id: str, db: Session = Depends(get_db)):
    """Get patient's comprehensive health summary"""
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    # Get latest scan
    latest_scan = db.query(KidneyScan).filter(
        KidneyScan.patient_id == patient_id
    ).order_by(KidneyScan.created_at.desc()).first()
    
    # Get today's water intake
    today = datetime.utcnow().date()
    today_intakes = db.query(WaterIntake).filter(
        WaterIntake.patient_id == patient_id,
        func.date(WaterIntake.date) == today
    ).all()
    total_water = sum(intake.amount_ml for intake in today_intakes)
    
    # Get today's meals
    today_meals = db.query(MealLog).filter(
        MealLog.patient_id == patient_id,
        func.date(MealLog.date) == today
    ).all()
    
    # Calculate risk (mock for now - integrate real model later)
    risk_score = calculate_patient_risk(patient, db)
    
    return HealthSummary(
        patient_id=patient.id,
        name=patient.name,
        latest_scan=latest_scan,
        today_water_intake_ml=total_water,
        water_goal_ml=3000,
        today_meals_count=len(today_meals),
        risk_score=risk_score,
        risk_level=get_risk_level(risk_score),
        recommendations=get_health_recommendations(patient, latest_scan, total_water)
    )


# ============= Image Upload & Analysis Endpoints =============

@app.post("/api/analyze-scan", response_model=ScanResponse)
async def analyze_scan(
    patient_id: str,
    stone_type: str = "calcium_oxalate",
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Upload and analyze kidney stone scan
    Returns: stone size, location, severity, confidence
    """
    # Verify patient exists
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    try:
        # Save uploaded file
        file_content = await file.read()
        filename = f"{patient_id}_{uuid.uuid4()}.png"
        file_path = save_upload_file(file_content, filename)
        
        # Analyze image
        analysis = analyze_image_file(file_path)
        
        if not analysis["success"]:
            raise HTTPException(status_code=400, detail=f"Analysis failed: {analysis['error']}")
        
        stone_data = analysis["analysis"]
        
        # Save scan result to database
        scan_id = f"scan_{uuid.uuid4()}"
        db_scan = KidneyScan(
            id=scan_id,
            patient_id=patient_id,
            image_path=file_path,
            stone_size_mm=stone_data["stone_size_mm"],
            stone_location=stone_data["location"],
            severity=stone_data["severity"],
            confidence=stone_data["confidence"],
            stone_type=stone_type,
            analysis_results=json.dumps(stone_data)
        )
        
        db.add(db_scan)
        db.commit()
        db.refresh(db_scan)
        
        return db_scan
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing scan: {str(e)}")


@app.get("/api/scans/{patient_id}", response_model=list[ScanResponse])
def get_patient_scans(patient_id: str, db: Session = Depends(get_db)):
    """Get all scans for a patient"""
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    scans = db.query(KidneyScan).filter(
        KidneyScan.patient_id == patient_id
    ).order_by(KidneyScan.created_at.desc()).all()
    
    return scans


@app.get("/api/scans/detail/{scan_id}", response_model=ScanDetailedResponse)
def get_scan_detail(scan_id: str, db: Session = Depends(get_db)):
    """Get detailed scan information"""
    scan = db.query(KidneyScan).filter(KidneyScan.id == scan_id).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    return scan


@app.get("/api/risk-insights/{patient_id}")
def get_risk_insights(patient_id: str, days: int = 30, db: Session = Depends(get_db)):
    """Combine latest scan data with hydration history to create a recovery roadmap."""
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    latest_scan = db.query(KidneyScan).filter(
        KidneyScan.patient_id == patient_id
    ).order_by(KidneyScan.created_at.desc()).first()

    scan_count = db.query(func.count(KidneyScan.id)).filter(
        KidneyScan.patient_id == patient_id
    ).scalar() or 0

    start_date = datetime.utcnow() - timedelta(days=days)
    hydration_entries = db.query(WaterIntake).filter(
        WaterIntake.patient_id == patient_id,
        WaterIntake.date >= start_date
    ).order_by(WaterIntake.date.asc()).all()

    daily_totals = {}
    for entry in hydration_entries:
        day_key = entry.date.date().isoformat()
        daily_totals[day_key] = daily_totals.get(day_key, 0) + float(entry.amount_ml)

    daily_percentages = []
    for day_key in sorted(daily_totals):
        percentage = min(100.0, round((daily_totals[day_key] / 2500.0) * 100, 1))
        daily_percentages.append(percentage)

    average_compliance = round(sum(daily_percentages) / len(daily_percentages), 1) if daily_percentages else 0.0
    consistency = round(sum(1 for p in daily_percentages if p >= 80) / len(daily_percentages) * 100, 1) if daily_percentages else 0.0

    severity_weight = {
        "none": 8,
        "mild": 25,
        "moderate": 48,
        "severe": 72,
    }.get((latest_scan.severity or "none").lower(), 20)

    size_penalty = min(18.0, (latest_scan.stone_size_mm or 0) / 10.0 * 8.0) if latest_scan else 0.0
    hydration_penalty = max(0.0, (100.0 - average_compliance) / 100.0 * 35.0)
    recurrence_penalty = min(10.0, scan_count * 3.0)

    risk_percentage = round(min(100.0, severity_weight + size_penalty + hydration_penalty + recurrence_penalty), 1)
    recovery_percentage = round(max(0.0, 100.0 - risk_percentage), 1)
    risk_level = "High" if risk_percentage >= 70 else "Moderate" if risk_percentage >= 40 else "Low"

    warnings = []
    if average_compliance < 70:
        warnings.append("Hydration is below the recommended target and is increasing recurrence risk.")
    if latest_scan and latest_scan.severity in ("moderate", "severe"):
        warnings.append("The latest scan shows a moderate or severe stone pattern that needs close follow-up.")
    if latest_scan and (latest_scan.stone_size_mm or 0) >= 8:
        warnings.append("The stone size is large enough to warrant frequent monitoring and specialist review.")
    if scan_count > 1:
        warnings.append("Repeated stone findings suggest a higher recurrence risk.")
    if not latest_scan:
        warnings.append("No recent scan data is available yet. Upload a fresh scan to improve the insights.")

    roadmap = []
    if average_compliance >= 80:
        month_1_status = "On track"
        month_2_status = "On track"
        month_3_status = "On track"
    else:
        month_1_status = "Needs focus"
        month_2_status = "Needs focus"
        month_3_status = "Needs focus"

    roadmap.append({
        "month": 1,
        "title": "Month 1 – Build the hydration baseline",
        "goal": "Reach at least 80% of your daily hydration goal for most days",
        "focus": "Drink water every 2–3 hours and log each intake immediately",
        "status": month_1_status,
        "actions": [
            "Aim for 2500–3000 ml daily depending on your stone type",
            "Carry a bottle and set reminders every 2 hours",
            "Log hydration after every main meal"
        ]
    })
    roadmap.append({
        "month": 2,
        "title": "Month 2 – Stabilize diet and reduce recurrence triggers",
        "goal": "Stay consistent with hydration and lower high-oxalate triggers",
        "focus": "Follow the stone-specific nutrition guidance and limit sodium",
        "status": month_2_status,
        "actions": [
            "Avoid processed foods and excess salt",
            "Use the stone-specific diet list from the scan insights",
            "Review your hydration log weekly and correct low days"
        ]
    })
    roadmap.append({
        "month": 3,
        "title": "Month 3 – Consolidate recovery and monitor progress",
        "goal": "Maintain compliance and improve recovery outlook",
        "focus": "Repeat the scan and review the trend with your care team",
        "status": month_3_status,
        "actions": [
            "Continue daily hydration tracking",
            "Recheck symptoms and stone indicators every 2 weeks",
            "Schedule a follow-up scan if symptoms return"
        ]
    })

    guidelines = []
    if latest_scan and latest_scan.stone_type == "calcium_oxalate":
        guidelines.extend([
            "Limit oxalate-rich foods like spinach, beets, nuts, and chocolate",
            "Keep sodium intake low and maintain regular hydration"
        ])
    elif latest_scan and latest_scan.stone_type == "uric_acid":
        guidelines.extend([
            "Reduce purine-rich foods such as red meat and seafood",
            "Avoid alcohol and sugary drinks"
        ])
    else:
        guidelines.extend([
            "Follow the recommended diet guidance for your stone type",
            "Stay hydrated and keep a daily log"
        ])

    guidelines.append("Seek urgent medical help if you develop severe pain, fever, or vomiting")

    danger_if_ignored = []
    if average_compliance < 80:
        danger_if_ignored.append({
            "period": "Within 1 week",
            "impact": "Hydration shortfall may push recurrence risk higher",
            "message": "Missing daily hydration targets can quickly increase stone recurrence risk."
        })
    if latest_scan and latest_scan.severity in ("moderate", "severe"):
        danger_if_ignored.append({
            "period": "Within 2 weeks",
            "impact": "Stone symptoms may worsen without follow-up",
            "message": "A moderate or severe stone pattern needs closer monitoring and care-team follow-up."
        })
    if recovery_percentage < 50:
        danger_if_ignored.append({
            "period": "Within 1 month",
            "impact": "Recovery may slow and recurrence risk may stay high",
            "message": "Ignoring the recovery plan can keep the risk percentage high for several weeks."
        })
    if not danger_if_ignored:
        danger_if_ignored.append({
            "period": "Stay consistent",
            "impact": "Progress is steady but still needs maintenance",
            "message": "Keep the current hydration and diet routine to preserve recovery progress."
        })

    return {
        "patient_id": patient_id,
        "patient_name": patient.name,
        "risk_percentage": risk_percentage,
        "risk_level": risk_level,
        "recovery_percentage": recovery_percentage,
        "hydration_compliance": average_compliance,
        "hydration_consistency": consistency,
        "latest_scan": {
            "stone_size_mm": round(latest_scan.stone_size_mm, 2) if latest_scan else 0,
            "severity": latest_scan.severity if latest_scan else "none",
            "location": latest_scan.stone_location if latest_scan else "Not available",
            "stone_type": latest_scan.stone_type if latest_scan else "unknown"
        },
        "warnings": warnings,
        "roadmap": roadmap,
        "guidelines": guidelines,
        "danger_if_ignored": danger_if_ignored,
        "analysis_window_days": days
    }


# ============= Water Intake Tracking Endpoints =============

@app.post("/api/water-intake", response_model=WaterIntakeResponse)
def log_water_intake(intake: WaterIntakeCreate, db: Session = Depends(get_db)):
    """Log daily water intake"""
    patient = db.query(Patient).filter(Patient.id == intake.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    intake_id = f"water_{uuid.uuid4()}"
    current_time = intake.time or datetime.utcnow().strftime("%H:%M")
    
    db_intake = WaterIntake(
        id=intake_id,
        patient_id=intake.patient_id,
        amount_ml=intake.amount_ml,
        time=current_time,
        notes=intake.notes,
        date=datetime.utcnow()
    )
    
    db.add(db_intake)
    db.commit()
    db.refresh(db_intake)
    
    return db_intake


@app.get("/api/water-intake/{patient_id}/daily", response_model=DailyWaterSummary)
def get_daily_water_summary(
    patient_id: str,
    date: str = None,
    db: Session = Depends(get_db)
):
    """Get daily water intake summary"""
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    # Parse date
    if date:
        target_date = datetime.strptime(date, "%Y-%m-%d").date()
    else:
        target_date = datetime.utcnow().date()
    
    # Query intakes for the day
    intakes = db.query(WaterIntake).filter(
        WaterIntake.patient_id == patient_id,
        func.date(WaterIntake.date) == target_date
    ).all()
    
    total_intake = sum(intake.amount_ml for intake in intakes)
    goal = 3000  # Default 3L per day
    percentage = (total_intake / goal) * 100 if goal > 0 else 0
    
    return DailyWaterSummary(
        date=target_date.isoformat(),
        total_intake_ml=total_intake,
        goal_ml=goal,
        percentage=min(percentage, 100),
        intakes=intakes
    )


@app.get("/api/water-intake/{patient_id}/history")
def get_water_history(
    patient_id: str,
    days: int = 7,
    db: Session = Depends(get_db)
):
    """Get water intake history (last N days)"""
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    start_date = datetime.utcnow() - timedelta(days=days)
    
    intakes = db.query(WaterIntake).filter(
        WaterIntake.patient_id == patient_id,
        WaterIntake.date >= start_date
    ).order_by(WaterIntake.date.desc()).all()
    
    # Group by date
    history = {}
    for intake in intakes:
        date_key = intake.date.date().isoformat()
        if date_key not in history:
            history[date_key] = {"total_ml": 0, "intakes": []}
        history[date_key]["total_ml"] += intake.amount_ml
        history[date_key]["intakes"].append(intake)
    
    return {
        "patient_id": patient_id,
        "days": days,
        "data": history
    }


@app.delete("/api/water-intake/{patient_id}/reset")
def reset_water_intake(
    patient_id: str,
    date: str = None,
    db: Session = Depends(get_db)
):
    """Reset/delete all water intake entries for a specific date"""
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    # Parse date
    if date:
        target_date = datetime.strptime(date, "%Y-%m-%d").date()
    else:
        target_date = datetime.utcnow().date()
    
    # Delete all entries for this date
    deleted_count = db.query(WaterIntake).filter(
        WaterIntake.patient_id == patient_id,
        func.date(WaterIntake.date) == target_date
    ).delete()
    
    db.commit()
    
    return {
        "success": True,
        "message": f"Deleted {deleted_count} water intake entries for {target_date.isoformat()}",
        "deleted_count": deleted_count
    }


# ============= Meal Logging Endpoints =============

@app.post("/api/meals", response_model=MealLogResponse)
def log_meal(meal: MealLogCreate, db: Session = Depends(get_db)):
    """Log a meal"""
    patient = db.query(Patient).filter(Patient.id == meal.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    # Calculate oxalate level and sodium
    oxalate_levels = [item.oxalate_level for item in meal.food_items]
    if "high" in oxalate_levels:
        final_oxalate = "high"
    elif "medium" in oxalate_levels:
        final_oxalate = "medium"
    else:
        final_oxalate = "low"
    
    # Mock sodium calculation (in real scenario, use nutritional database)
    base_sodium = {"breakfast": 800, "lunch": 1200, "dinner": 1200, "snack": 400}
    sodium_mg = base_sodium.get(meal.meal_type, 500)
    
    meal_id = f"meal_{uuid.uuid4()}"
    
    db_meal = MealLog(
        id=meal_id,
        patient_id=meal.patient_id,
        date=datetime.utcnow(),
        meal_type=meal.meal_type,
        food_items=json.dumps([item.dict() for item in meal.food_items]),
        oxalate_level=final_oxalate,
        sodium_mg=sodium_mg,
        notes=meal.notes
    )
    
    db.add(db_meal)
    db.commit()
    db.refresh(db_meal)
    
    return db_meal


@app.get("/api/meals/{patient_id}/daily", response_model=DailyMealSummary)
def get_daily_meals(
    patient_id: str,
    date: str = None,
    db: Session = Depends(get_db)
):
    """Get daily meal summary"""
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    # Parse date
    if date:
        target_date = datetime.strptime(date, "%Y-%m-%d").date()
    else:
        target_date = datetime.utcnow().date()
    
    # Query meals for the day
    meals = db.query(MealLog).filter(
        MealLog.patient_id == patient_id,
        func.date(MealLog.date) == target_date
    ).all()
    
    # Calculate totals
    total_sodium = sum(meal.sodium_mg for meal in meals)
    high_oxalate_items = []
    
    for meal in meals:
        if meal.oxalate_level == "high":
            food_items = json.loads(meal.food_items)
            high_oxalate_items.extend([item["name"] for item in food_items if item.get("oxalate_level") == "high"])
    
    # Get recommendations based on latest scan
    recommendations = get_meal_recommendations(patient_id, db)
    
    return DailyMealSummary(
        date=target_date.isoformat(),
        meals=meals,
        total_sodium_mg=total_sodium,
        high_oxalate_items=list(set(high_oxalate_items)),
        recommendations=recommendations
    )


@app.get("/api/meals/{patient_id}/history")
def get_meal_history(
    patient_id: str,
    days: int = 7,
    db: Session = Depends(get_db)
):
    """Get meal history (last N days)"""
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    start_date = datetime.utcnow() - timedelta(days=days)
    
    meals = db.query(MealLog).filter(
        MealLog.patient_id == patient_id,
        MealLog.date >= start_date
    ).order_by(MealLog.date.desc()).all()
    
    return {
        "patient_id": patient_id,
        "days": days,
        "total_meals": len(meals),
        "meals": meals
    }


# ============= Diet Recommendations Endpoints =============

@app.get("/api/diet-recommendations/{stone_type}", response_model=DietRecommendationResponse)
def get_diet_recommendations(stone_type: str, db: Session = Depends(get_db)):
    """Get diet recommendations based on stone type"""
    rec = db.query(DietRecommendation).filter(
        DietRecommendation.stone_type == stone_type
    ).first()
    
    if not rec:
        raise HTTPException(status_code=404, detail="Stone type not found")
    
    return DietRecommendationResponse(
        stone_type=rec.stone_type,
        restricted_foods=json.loads(rec.restricted_foods),
        recommended_foods=json.loads(rec.recommended_foods),
        daily_fluid_intake_ml=rec.daily_fluid_intake_ml,
        daily_sodium_limit_mg=rec.daily_sodium_limit_mg,
        tips=json.loads(rec.tips)
    )


@app.get("/api/diet-recommendations")
def get_all_diet_recommendations(db: Session = Depends(get_db)):
    """Get all available diet recommendations"""
    recs = db.query(DietRecommendation).all()
    
    result = []
    for rec in recs:
        result.append({
            "stone_type": rec.stone_type,
            "restricted_foods": json.loads(rec.restricted_foods),
            "recommended_foods": json.loads(rec.recommended_foods),
            "daily_fluid_intake_ml": rec.daily_fluid_intake_ml,
            "daily_sodium_limit_mg": rec.daily_sodium_limit_mg,
            "tips": json.loads(rec.tips)
        })
    
    return result


@app.post("/api/diet-recommendations/{patient_id}")
def update_patient_diet(
    patient_id: str,
    stone_type: str,
    db: Session = Depends(get_db)
):
    """Update patient's diet recommendations based on latest scan"""
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    rec = db.query(DietRecommendation).filter(
        DietRecommendation.stone_type == stone_type
    ).first()
    
    if not rec:
        raise HTTPException(status_code=404, detail="Stone type not found")
    
    return {
        "patient_id": patient_id,
        "stone_type": stone_type,
        "diet_recommendations": {
            "restricted_foods": json.loads(rec.restricted_foods),
            "recommended_foods": json.loads(rec.recommended_foods),
            "daily_fluid_intake_ml": rec.daily_fluid_intake_ml,
            "daily_sodium_limit_mg": rec.daily_sodium_limit_mg,
            "tips": json.loads(rec.tips)
        }
    }


# ============= Risk Prediction Endpoints =============

@app.post("/api/predict-risk", response_model=RiskPredictionResponse)
def predict_risk(request: RiskPredictionRequest, db: Session = Depends(get_db)):
    """Predict kidney stone recurrence risk"""
    patient = db.query(Patient).filter(Patient.id == request.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    # Simple risk calculation (integrate XGBoost model here)
    risk_score = calculate_risk_score(
        age=request.age,
        family_history=request.family_history,
        previous_stones=request.previous_stones,
        compliance=request.treatment_compliance
    )
    
    risk_level = get_risk_level(risk_score)
    
    return RiskPredictionResponse(
        patient_id=request.patient_id,
        risk_score=risk_score,
        risk_level=risk_level,
        recommendations=get_risk_recommendations(risk_score),
        last_updated=datetime.utcnow()
    )


@app.get("/api/patients/{patient_id}/risk-score")
def get_patient_risk_score(patient_id: str, db: Session = Depends(get_db)):
    """Get current risk score for a patient"""
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    risk_score = calculate_patient_risk(patient, db)
    
    return {
        "patient_id": patient_id,
        "risk_score": risk_score,
        "risk_level": get_risk_level(risk_score),
        "timestamp": datetime.utcnow()
    }


# ============= Helper Functions =============

def calculate_risk_score(age: int, family_history: bool, previous_stones: int, compliance: float) -> float:
    """Calculate risk score based on patient factors"""
    score = 0.0
    
    # Age factor
    if age > 60:
        score += 0.15
    elif age > 40:
        score += 0.10
    
    # Family history
    if family_history:
        score += 0.20
    
    # Previous stones
    score += (previous_stones / 10) * 0.30
    
    # Treatment compliance
    score += (1 - compliance / 100) * 0.25
    
    # Add baseline risk
    score += 0.10
    
    return min(score, 1.0)


def calculate_patient_risk(patient: Patient, db: Session) -> float:
    """Calculate overall risk for a patient"""
    # Get latest scan
    latest_scan = db.query(KidneyScan).filter(
        KidneyScan.patient_id == patient.id
    ).order_by(KidneyScan.created_at.desc()).first()
    
    stone_count = db.query(func.count(KidneyScan.id)).filter(
        KidneyScan.patient_id == patient.id
    ).scalar()
    
    risk = calculate_risk_score(
        age=patient.age,
        family_history=patient.family_history,
        previous_stones=int(stone_count),
        compliance=75.0  # Default compliance
    )
    
    return risk


def get_risk_level(risk_score: float) -> str:
    """Get risk level label"""
    if risk_score < 0.33:
        return "Low"
    elif risk_score < 0.66:
        return "Moderate"
    else:
        return "High"


def get_risk_recommendations(risk_score: float) -> list:
    """Get recommendations based on risk score"""
    recommendations = [
        "Maintain daily hydration of 2.5-3 liters",
        "Follow recommended diet for your stone type",
        "Reduce sodium intake below 2000mg per day",
    ]
    
    if risk_score > 0.66:
        recommendations.extend([
            "Schedule monthly urologist follow-ups",
            "Consider preventive medication consultation",
            "Monitor for stone symptoms closely"
        ])
    elif risk_score > 0.33:
        recommendations.extend([
            "Schedule quarterly urologist check-ups",
            "Maintain detailed meal and water intake logs"
        ])
    else:
        recommendations.extend([
            "Continue regular annual check-ups",
            "Maintain current healthy lifestyle"
        ])
    
    return recommendations


def get_health_recommendations(patient: Patient, latest_scan, total_water: float) -> list:
    """Get personalized health recommendations"""
    recommendations = []
    
    if latest_scan:
        if latest_scan.severity == "severe":
            recommendations.append("⚠️ Severe stone detected - consult urologist immediately")
        elif latest_scan.severity == "moderate":
            recommendations.append("Consider medical intervention for stone management")
    
    if total_water < 2500:
        recommendations.append("💧 Increase water intake - aim for 3 liters per day")
    
    recommendations.append("🥗 Follow your personalized diet recommendations")
    recommendations.append("📊 Track your meals and water intake daily")
    
    return recommendations


def get_meal_recommendations(patient_id: str, db: Session) -> list:
    """Get meal recommendations based on patient's stone type"""
    latest_scan = db.query(KidneyScan).filter(
        KidneyScan.patient_id == patient_id
    ).order_by(KidneyScan.created_at.desc()).first()
    
    recommendations = [
        "Stay hydrated with 3+ liters of water daily",
        "Monitor sodium intake - keep below 2000mg",
        "Avoid processed foods"
    ]
    
    if latest_scan:
        if latest_scan.stone_type == "calcium_oxalate":
            recommendations.extend([
                "Limit oxalate-rich foods like spinach and nuts",
                "Maintain adequate calcium intake"
            ])
        elif latest_scan.stone_type == "uric_acid":
            recommendations.extend([
                "Reduce purine-rich foods (red meat, seafood)",
                "Avoid alcohol and sugary drinks"
            ])
    
    return recommendations


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
