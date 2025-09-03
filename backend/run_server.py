#!/usr/bin/env python3
"""
Server startup script with WebSocket support
Use this instead of 'python manage.py runserver' for development
"""

import os
import sys
import django
from pathlib import Path

# Add the project directory to Python path
BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))

# Set Django settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'videocall_app.settings')

# Setup Django
django.setup()

def check_daphne_installed():
    """Check if Daphne is installed"""
    try:
        import daphne
        return True
    except ImportError:
        return False

def run_with_daphne():
    """Run server with Daphne (supports WebSocket)"""
    print("🚀 Starting server with Daphne (WebSocket support enabled)")
    print("   Backend: http://localhost:8000")
    print("   WebSocket: ws://localhost:8000/ws/")
    print("   Press Ctrl+C to stop")
    print()

    os.system('daphne -b 0.0.0.0 -p 8000 videocall_app.asgi:application')

def run_with_runserver():
    """Run server with standard runserver (no WebSocket support)"""
    print("⚠️  Running with standard Django runserver")
    print("   WebSocket connections will NOT work!")
    print("   Install Daphne for WebSocket support: pip install daphne")
    print("   Backend: http://localhost:8000")
    print("   Press Ctrl+C to stop")
    print()

    os.system('python manage.py runserver')

def main():
    """Main function"""
    print("🔌 Video Call Application Server")
    print("=" * 40)

    if check_daphne_installed():
        run_with_daphne()
    else:
        print("❌ Daphne not found - WebSocket support disabled")
        print("   Install it with: pip install daphne")
        print("   Or install from requirements: pip install -r requirements.txt")
        print()

        response = input("Continue with standard runserver? (y/N): ")
        if response.lower() == 'y':
            run_with_runserver()
        else:
            print("Please install Daphne and try again.")
            sys.exit(1)

if __name__ == "__main__":
    main()
