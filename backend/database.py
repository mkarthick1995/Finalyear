"""
RenalCare AI - Database Models
SQLAlchemy models for patients, scans, meals, and water intake
"""

from sqlalchemy import create_engine, Column, String, Float, Integer, DateTime, Boolean, ForeignKey, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
import os

# Database setup
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./renal_care.db")
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


# ============= Database Models =============

class Patient(Base):
    """Patient/User model"""
    __tablename__ = "patients"
    
    id = Column(String, primary_key=True, index=True)
    name = Column(String, index=True)
    age = Column(Integer)
    gender = Column(String)
    bmi = Column(Float)
    family_history = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    scans = relationship("KidneyScan", back_populates="patient", cascade="all, delete-orphan")
    water_intakes = relationship("WaterIntake", back_populates="patient", cascade="all, delete-orphan")
    appointments = relationship("Appointment", back_populates="patient", cascade="all, delete-orphan")
    recommendations = relationship("DoctorRecommendation", back_populates="patient", cascade="all, delete-orphan")
    meals = relationship("MealLog", back_populates="patient", cascade="all, delete-orphan")


class KidneyScan(Base):
    """Kidney stone scan analysis results"""
    __tablename__ = "kidney_scans"
    
    id = Column(String, primary_key=True, index=True)
    patient_id = Column(String, ForeignKey("patients.id"), index=True)
    image_path = Column(String)
    stone_size_mm = Column(Float)
    stone_location = Column(String)  # e.g., "left_kidney", "right_ureter", etc.
    severity = Column(String)  # "mild", "moderate", "severe"
    confidence = Column(Float)  # 0-1
    stone_type = Column(String)  # "calcium_oxalate", "uric_acid", etc.
    analysis_results = Column(Text)  # JSON string with detailed results
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    patient = relationship("Patient", back_populates="scans")


class WaterIntake(Base):
    """Daily water intake tracking"""
    __tablename__ = "water_intakes"
    
    id = Column(String, primary_key=True, index=True)
    patient_id = Column(String, ForeignKey("patients.id"), index=True)
    date = Column(DateTime, index=True)
    amount_ml = Column(Float)  # Amount of water in milliliters
    time = Column(String)  # Time of intake (e.g., "08:30")
    notes = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    patient = relationship("Patient", back_populates="water_intakes")


class MealLog(Base):
    """User's meal log"""
    __tablename__ = "meal_logs"
    
    id = Column(String, primary_key=True, index=True)
    patient_id = Column(String, ForeignKey("patients.id"), index=True)
    date = Column(DateTime, index=True)
    meal_type = Column(String)  # "breakfast", "lunch", "dinner", "snack"
    food_items = Column(Text)  # JSON string with food items
    oxalate_level = Column(String)  # "low", "medium", "high"
    sodium_mg = Column(Float)
    notes = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    patient = relationship("Patient", back_populates="meals")



class Appointment(Base):
    """Appointment tracking for patient"""
    __tablename__ = "appointments"
    
    id = Column(String, primary_key=True, index=True)
    patient_id = Column(String, ForeignKey("patients.id"), index=True)
    appointment_date = Column(DateTime, index=True)
    appointment_type = Column(String)  # "URGENT", "HIGH_RISK", "MODERATE", "ROUTINE", "OPTIONAL"
    doctor_type = Column(String)
    title = Column(String)
    reason = Column(String)
    description = Column(Text)
    status = Column(String, default="scheduled")  # "scheduled", "completed", "cancelled"
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    patient = relationship("Patient", back_populates="appointments")


class DoctorRecommendation(Base):
    """Doctor recommendations after consultation"""
    __tablename__ = "doctor_recommendations"
    
    id = Column(String, primary_key=True, index=True)
    patient_id = Column(String, ForeignKey("patients.id"), index=True)
    appointment_id = Column(String, index=True)
    hydration_adjustment = Column(Text, nullable=True)
    dietary_changes = Column(Text, nullable=True)
    medication_changes = Column(Text, nullable=True)
    monitoring_schedule = Column(Text, nullable=True)
    follow_up_date = Column(DateTime, nullable=True)
    appointment_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    patient = relationship("Patient", back_populates="recommendations")

class DietRecommendation(Base):
    """Diet recommendations based on stone type"""
    __tablename__ = "diet_recommendations"
    
    id = Column(String, primary_key=True, index=True)
    stone_type = Column(String, unique=True, index=True)
    restricted_foods = Column(Text)  # JSON string
    recommended_foods = Column(Text)  # JSON string
    daily_fluid_intake_ml = Column(Integer)
    daily_sodium_limit_mg = Column(Integer)
    tips = Column(Text)  # JSON string


# ============= Database Initialization =============

def init_db():
    """Initialize database and create tables"""
    Base.metadata.create_all(bind=engine)
    print("✓ Database initialized successfully")


def get_db():
    """Dependency for FastAPI to get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def seed_diet_recommendations(db):
    """Seed diet recommendations into database"""
    import json
    
    recommendations = [
        {
            "id": "rec_calcium_oxalate",
            "stone_type": "calcium_oxalate",
            "restricted_foods": json.dumps(["spinach", "beets", "nuts", "chocolate", "tea", "coffee", "rhubarb", "sweet potato"]),
            "recommended_foods": json.dumps(["white bread", "pasta", "apples", "bananas", "chicken", "fish", "rice", "cucumber"]),
            "daily_fluid_intake_ml": 3000,
            "daily_sodium_limit_mg": 2000,
            "tips": json.dumps([
                "Drink plenty of water throughout the day",
                "Limit oxalate-rich foods",
                "Avoid excess sodium",
                "Moderate calcium intake",
                "Avoid vitamin C supplements"
            ])
        },
        {
            "id": "rec_uric_acid",
            "stone_type": "uric_acid",
            "restricted_foods": json.dumps(["red meat", "organ meats", "seafood", "alcohol", "high-fructose drinks", "anchovies", "sardines"]),
            "recommended_foods": json.dumps(["vegetables", "whole grains", "dairy", "eggs", "beans", "fruits", "pasta", "rice"]),
            "daily_fluid_intake_ml": 2500,
            "daily_sodium_limit_mg": 2000,
            "tips": json.dumps([
                "Limit purine-rich foods",
                "Maintain healthy body weight",
                "Limit alcohol consumption",
                "Stay well hydrated",
                "Avoid high-fructose foods"
            ])
        },
        {
            "id": "rec_struvite",
            "stone_type": "struvite",
            "restricted_foods": json.dumps(["high sodium foods", "cured meats", "aged cheeses", "processed foods", "soy sauce"]),
            "recommended_foods": json.dumps(["fresh vegetables", "fruits", "lean meats", "low-fat dairy", "whole grains", "legumes"]),
            "daily_fluid_intake_ml": 2800,
            "daily_sodium_limit_mg": 1500,
            "tips": json.dumps([
                "Maintain acidic urine pH",
                "Limit sodium intake strictly",
                "Stay hydrated",
                "Avoid urinary tract infections",
                "Regular monitoring recommended"
            ])
        },
        {
            "id": "rec_cystine",
            "stone_type": "cystine",
            "restricted_foods": json.dumps(["eggs", "meat", "fish", "chicken", "high protein foods", "mushrooms"]),
            "recommended_foods": json.dumps(["vegetables", "fruits", "grains", "pasta", "bread", "rice", "low-protein dairy"]),
            "daily_fluid_intake_ml": 4000,
            "daily_sodium_limit_mg": 2000,
            "tips": json.dumps([
                "Very high fluid intake (4-5 liters)",
                "Low protein diet essential",
                "Maintain alkaline urine",
                "Avoid salt",
                "Regular monitoring critical"
            ])
        }
    ]
    
    for rec in recommendations:
        existing = db.query(DietRecommendation).filter_by(stone_type=rec["stone_type"]).first()
        if not existing:
            db.add(DietRecommendation(**rec))
    
    db.commit()
    print("✓ Diet recommendations seeded")
