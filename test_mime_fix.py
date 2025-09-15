#!/usr/bin/env python3
"""
Test script to verify MIME type fix for JavaScript files.
"""
import requests
import sys

def test_mime_types():
    """Test that JavaScript files are served with correct MIME type."""
    base_url = "http://localhost:8000"
    
    # Test files to check
    test_files = [
        "/static/js/app.js",
        "/static/js/views/ViewManager.js", 
        "/static/js/views/StarfieldManager.js",
        "/static/js/views/NavigationSystemManager.js"
    ]
    
    print("🧪 Testing MIME types for JavaScript files...")
    
    for file_path in test_files:
        try:
            url = f"{base_url}{file_path}"
            print(f"\n📁 Testing: {url}")
            
            response = requests.get(url, timeout=5)
            
            print(f"  Status: {response.status_code}")
            print(f"  Content-Type: {response.headers.get('Content-Type', 'NOT SET')}")
            print(f"  Content-Length: {len(response.content)} bytes")
            
            # Check if it's actually JavaScript content
            content_preview = response.text[:100].replace('\n', ' ')
            print(f"  Content Preview: {content_preview}...")
            
            # Check for correct MIME type
            content_type = response.headers.get('Content-Type', '')
            if 'application/javascript' in content_type:
                print(f"  ✅ Correct MIME type")
            elif 'text/javascript' in content_type:
                print(f"  ⚠️  Old MIME type (might work)")
            elif 'text/html' in content_type:
                print(f"  ❌ Wrong MIME type - serving HTML instead of JS!")
            else:
                print(f"  ❓ Unknown MIME type: {content_type}")
                
        except requests.exceptions.RequestException as e:
            print(f"  ❌ Request failed: {e}")
        except Exception as e:
            print(f"  ❌ Error: {e}")
    
    print(f"\n🏁 MIME type test completed")

if __name__ == "__main__":
    test_mime_types()
