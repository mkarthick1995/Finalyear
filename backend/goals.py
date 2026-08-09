"""
RenalCare AI - Health Goals
Generates daily personalized health goals.

- When ENABLE_LLM_GOALS=true and a valid NVIDIA_API_KEY is present, goals are
  generated via NVIDIA's NIM chat-completions API (OpenAI-compatible).
- Otherwise (flag off, missing key, or any API failure) a rule-based fallback
  derived from the patient's real tracked data is served instead.
- Results are cached per patient per day to keep API volume low.
"""

import json
import os
import uuid
from datetime import datetime, timedelta

import requests

from sqlalchemy.orm import Session
from database import Patient, HealthGoal, KidneyScan, WaterIntake, MealLog
from sqlalchemy import func

DISCLAIMER = (
    "These goals are informational and are not medical advice. "
    "Consult a physician before making changes to your treatment plan."
)

NVIDIA_BASE_URL = os.getenv("NVIDIA_BASE_URL", "https://integrate.api.nvidia.com/v1")
NVIDIA_API_KEY = os.getenv("NVIDIA_API_KEY", "").strip()
NVIDIA_GOALS_MODEL = os.getenv("NVIDIA_GOALS_MODEL", "meta/llama-3.3-70b-instruct")
ENABLE_LLM_GOALS = os.getenv("ENABLE_LLM_GOALS", "false").lower() == "true"

GOAL_DATE_FORMAT = "%Y-%m-%d"
NVIDIA_TIMEOUT_SECONDS = 25


def _build_context(patient: Patient, db: Session) -> dict:
    """Gather real, tracked data about the patient for goal generation."""
    today = datetime.utcnow().date()

    latest_scan = db.query(KidneyScan).filter(
        KidneyScan.patient_id == patient.id
    ).order_by(KidneyScan.created_at.desc()).first()

    today_water = db.query(func.coalesce(func.sum(WaterIntake.amount_ml), 0.0)).filter(
        WaterIntake.patient_id == patient.id,
        func.date(WaterIntake.date) == today
    ).scalar() or 0.0

    start_7d = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=7)
    entries_7d = db.query(WaterIntake).filter(
        WaterIntake.patient_id == patient.id,
        WaterIntake.date >= start_7d
    ).all()

    per_day = {}
    for entry in entries_7d:
        key = entry.date.date().isoformat()
        per_day[key] = per_day.get(key, 0) + float(entry.amount_ml)

    compliance_days = [min(100.0, (per_day[k] / 2500.0) * 100) for k in sorted(per_day)]
    avg_compliance = round(sum(compliance_days) / len(compliance_days), 1) if compliance_days else 0.0

    meals_today = db.query(func.count(MealLog.id)).filter(
        MealLog.patient_id == patient.id,
        func.date(MealLog.date) == today
    ).scalar() or 0

    return {
        "name": patient.name,
        "age": patient.age,
        "gender": patient.gender,
        "family_history": patient.family_history,
        "latest_scan_prediction": latest_scan.prediction if latest_scan else None,
        "latest_scan_confidence": latest_scan.confidence if latest_scan else None,
        "water_today_ml": int(today_water),
        "water_goal_ml": 3000,
        "avg_hydration_compliance_7d_pct": avg_compliance,
        "meals_logged_today": meals_today,
    }


def _nvidia_goals(context: dict) -> dict:
    """Call the NVIDIA NIM chat-completions API and return a structured goals list."""
    system_prompt = (
        "You are a supportive renal-care assistant generating daily health goals. "
        "Reply with ONLY a JSON array, no markdown, no prose. Each element is an object with "
        "keys: category (one of hydration, diet, activity, monitoring, or general), "
        "goal (a short imperative sentence), tip (one actionable sentence), and target (a concrete number/unit string). "
        "Generate exactly 5 goals. Keep language calm and non-alarming. "
        "Never claim to diagnose, and never mention stone size/location/severity/composition."
    )
    user_prompt = (
        "Generate 5 personalized daily health goals for a kidney-stone prevention app user "
        "based on this real tracked data (JSON):\n"
        f"{json.dumps(context)}\n"
        "Return only the JSON array."
    )

    response = requests.post(
        f"{NVIDIA_BASE_URL}/chat/completions",
        headers={
            "Authorization": f"Bearer {NVIDIA_API_KEY}",
            "Content-Type": "application/json",
        },
        json={
            "model": NVIDIA_GOALS_MODEL,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": 0.4,
            "max_tokens": 900,
        },
        timeout=NVIDIA_TIMEOUT_SECONDS,
    )
    response.raise_for_status()

    content = response.json()["choices"][0]["message"]["content"].strip()
    content = content.strip("`").strip()
    if content.startswith("json"):
        content = content[4:].strip()
    goals = json.loads(content)
    if not isinstance(goals, list) or len(goals) == 0:
        raise ValueError("LLM returned an unexpected shape")

    return {"source": "nvidia_nim", "goals": goals}


def _rule_based_goals(context: dict) -> dict:
    """Deterministic fallback goals built entirely from tracked data."""
    goals = []
    water_remaining = max(0, context["water_goal_ml"] - context["water_today_ml"])

    goals.append({
        "category": "hydration",
        "goal": f"Drink {water_remaining} more ml of water today",
        "tip": "Sip water every 2-3 hours and log each intake right away",
        "target": f"{water_remaining} ml",
    })

    if context["avg_hydration_compliance_7d_pct"] < 80:
        goals.append({
            "category": "hydration",
            "goal": "Hit at least 80% of your daily hydration target this week",
            "tip": "Carry a bottle and set hourly reminders",
            "target": "80%",
        })
    else:
        goals.append({
            "category": "hydration",
            "goal": "Maintain your strong hydration streak",
            "tip": "Keep logging each glass so the trend stays visible",
            "target": "100%",
        })

    goals.append({
        "category": "diet",
        "goal": "Keep sodium under 2000 mg and avoid high-oxalate foods",
        "tip": "Prefer fresh meals over packaged snacks",
        "target": "< 2000 mg",
    })

    if context["latest_scan_prediction"] == "stone":
        goals.append({
            "category": "monitoring",
            "goal": "Schedule a urologist follow-up for your recent scan",
            "tip": "The scan flagged a stone pattern; get a full clinical evaluation",
            "target": "This week",
        })
    else:
        goals.append({
            "category": "monitoring",
            "goal": "Keep monitoring symptoms and stay on your care plan",
            "tip": "Note any pain, fever, or changes and report them to your doctor",
            "target": "Daily",
        })

    goals.append({
        "category": "general",
        "goal": "Track one healthy habit for the day",
        "tip": "Log your meals and water consistently to keep insights accurate",
        "target": "1 day",
    })

    return {"source": "rule_based", "goals": goals}


def _cache_result(db: Session, patient_id: str, goal_date: str, result: dict) -> None:
    existing = db.query(HealthGoal).filter(
        HealthGoal.patient_id == patient_id,
        HealthGoal.goal_date == goal_date,
    ).first()
    content = json.dumps(result["goals"])
    if existing:
        existing.content = content
        existing.source = result["source"]
        existing.created_at = datetime.utcnow()
    else:
        db.add(HealthGoal(
            id=f"goal_{uuid.uuid4().hex[:12]}",
            patient_id=patient_id,
            goal_date=goal_date,
            content=content,
            source=result["source"],
        ))
    db.commit()


def get_health_goals(patient: Patient, db: Session) -> dict:
    """Return today's health goals for a patient (cached, LLM-backed or rule-based)."""
    goal_date = datetime.utcnow().strftime(GOAL_DATE_FORMAT)

    cached = db.query(HealthGoal).filter(
        HealthGoal.patient_id == patient.id,
        HealthGoal.goal_date == goal_date,
    ).first()
    if cached:
        return {
            "patient_id": patient.id,
            "date": goal_date,
            "source": cached.source,
            "goals": json.loads(cached.content),
            "disclaimer": DISCLAIMER,
        }

    context = _build_context(patient, db)

    result = None
    if ENABLE_LLM_GOALS and NVIDIA_API_KEY:
        try:
            result = _nvidia_goals(context)
        except Exception as e:  # noqa: BLE001 - degrade gracefully on any failure
            print(f"[goals] NVIDIA call failed, falling back to rule-based: {e}")
            result = None

    if result is None:
        result = _rule_based_goals(context)

    _cache_result(db, patient.id, goal_date, result)

    return {
        "patient_id": patient.id,
        "date": goal_date,
        "source": result["source"],
        "goals": result["goals"],
        "disclaimer": DISCLAIMER,
    }
