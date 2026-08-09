"""
RenalCare AI - Quick Start Script
One-command setup for the entire backend
"""

import subprocess
import os
import sys

def run_command(cmd, description):
    """Run a command and print status"""
    print(f"\n📦 {description}...")
    result = subprocess.run(cmd, shell=True)
    if result.returncode == 0:
        print(f"✓ {description} complete")
        return True
    else:
        print(f"✗ {description} failed")
        return False

def main():
    print("\n" + "="*60)
    print("RenalCare AI - Backend Quick Start")
    print("="*60)
    
    # Check Python version
    if sys.version_info < (3, 8):
        print("❌ Python 3.8+ required")
        sys.exit(1)
    
    # Install dependencies
    if not run_command("pip install -r requirements.txt", "Installing dependencies"):
        sys.exit(1)
    
    # Initialize database
    if not run_command("python init_db.py", "Initializing database"):
        sys.exit(1)
    
    print("\n" + "="*60)
    print("✓ Backend setup complete!")
    print("="*60)
    print("\n📝 Next steps:")
    print("  1. Start the backend: python -m uvicorn main:app --port 8001")
    print("  2. API docs: http://localhost:8001/docs")
    print("  3. Optional: Train the scan model")
    print("     - python prepare_dataset.py")
    print("     - python train_vision_model.py")
    print("\n")

if __name__ == "__main__":
    main()
