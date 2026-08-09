"""
RenalCare AI - Database Initialization Script
Run this script to initialize the database with a demo account.
"""

from database import SessionLocal, init_db, seed_diet_recommendations, Patient
from auth import hash_password
from datetime import datetime


def init_sample_data():
    """Initialize database with a demo account and seed data."""
    init_db()

    db = SessionLocal()

    try:
        seed_diet_recommendations(db)

        existing = db.query(Patient).filter(Patient.email == "demo@renalcare.ai").first()
        if not existing:
            sample_patient = Patient(
                id="patient_demo_001",
                name="John Doe",
                email="demo@renalcare.ai",
                password_hash=hash_password("demo1234"),
                age=45,
                gender="Male",
                bmi=27.5,
                family_history=True,
                created_at=datetime.utcnow(),
            )
            db.add(sample_patient)
            db.commit()
            print("✓ Demo account created: demo@renalcare.ai / demo1234")
        else:
            print("✓ Demo account already exists")

        print("✓ Database initialized with sample data")
        print("✓ Diet recommendations seeded")

    except Exception as e:
        print(f"Error initializing database: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    init_sample_data()
