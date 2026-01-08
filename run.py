"""Main application entry point."""
import os
import sys
import argparse
import webbrowser
import threading

# Add the current directory to Python path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from backend import create_app

app = create_app('development')

def open_browser(url, delay=1.5):
    """Open browser after a short delay to allow server to start."""
    def delayed_open():
        import time
        time.sleep(delay)
        webbrowser.open(url)
    thread = threading.Thread(target=delayed_open)
    thread.daemon = True
    thread.start()

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Run PlanetZ development server')
    parser.add_argument('--testing', '-t', action='store_true',
                        help='Start in testing mode (no persistence)')
    parser.add_argument('--open', '-o', action='store_true',
                        help='Automatically open browser')
    parser.add_argument('--port', '-p', type=int, default=5001,
                        help='Port to run on (default: 5001)')
    parser.add_argument('--host', default='127.0.0.1',
                        help='Host to bind to (default: 127.0.0.1)')

    args = parser.parse_args()

    base_url = f"http://{args.host}:{args.port}"
    url = f"{base_url}?testing=true" if args.testing else base_url

    print("\n" + "="*50)
    print("  PlanetZ Development Server")
    print("="*50)
    if args.testing:
        print("  MODE: TESTING (persistence disabled)")
    else:
        print("  MODE: NORMAL (persistence enabled)")
    print(f"  URL:  {url}")
    print("="*50 + "\n")

    if args.open:
        open_browser(url)

    app.run(debug=True, host=args.host, port=args.port) 