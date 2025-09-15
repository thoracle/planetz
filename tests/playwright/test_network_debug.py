"""
Debug network requests to see what's failing with ES6 module loading.
"""
import pytest
from playwright.sync_api import Page, expect

class TestNetworkDebug:
    """Debug network requests during game initialization"""
    
    def test_capture_network_requests(self, page: Page, game_server):
        """Capture all network requests to see what's failing"""
        
        # Collect network requests
        requests = []
        responses = []
        failed_requests = []
        
        def handle_request(request):
            requests.append({
                'url': request.url,
                'method': request.method,
                'resource_type': request.resource_type
            })
            print(f"📤 Request: {request.method} {request.url} ({request.resource_type})")
        
        def handle_response(response):
            responses.append({
                'url': response.url,
                'status': response.status,
                'content_type': response.headers.get('content-type', 'unknown'),
                'ok': response.ok
            })
            status_emoji = "✅" if response.ok else "❌"
            print(f"📥 {status_emoji} Response: {response.status} {response.url} ({response.headers.get('content-type', 'unknown')})")
        
        def handle_request_failed(request):
            failed_requests.append({
                'url': request.url,
                'failure': request.failure,
                'method': request.method
            })
            print(f"💥 Failed: {request.method} {request.url} - {request.failure}")
        
        page.on("request", handle_request)
        page.on("response", handle_response)
        page.on("requestfailed", handle_request_failed)
        
        # Navigate to the game
        print("🌐 Navigating to game and monitoring network...")
        page.goto(game_server)
        
        # Wait for initial loading
        page.wait_for_selector("#scene-container", timeout=30000, state="attached")
        
        # Wait a bit more for all requests to complete
        page.wait_for_timeout(5000)
        
        # Analyze the results
        print(f"\n📊 Network Analysis:")
        print(f"  Total Requests: {len(requests)}")
        print(f"  Total Responses: {len(responses)}")
        print(f"  Failed Requests: {len(failed_requests)}")
        
        # Check for JavaScript files specifically
        js_requests = [r for r in requests if r['url'].endswith('.js')]
        js_responses = [r for r in responses if r['url'].endswith('.js')]
        
        print(f"\n📜 JavaScript Files:")
        print(f"  JS Requests: {len(js_requests)}")
        print(f"  JS Responses: {len(js_responses)}")
        
        for js_req in js_requests:
            matching_resp = next((r for r in js_responses if r['url'] == js_req['url']), None)
            if matching_resp:
                status_emoji = "✅" if matching_resp['ok'] else "❌"
                print(f"  {status_emoji} {js_req['url']} - {matching_resp['status']} ({matching_resp['content_type']})")
            else:
                print(f"  ❓ {js_req['url']} - No response found")
        
        # Check for failed requests
        if failed_requests:
            print(f"\n💥 Failed Requests:")
            for failed in failed_requests:
                print(f"  {failed['method']} {failed['url']} - {failed['failure']}")
        
        # Check for non-200 responses
        error_responses = [r for r in responses if not r['ok']]
        if error_responses:
            print(f"\n❌ Error Responses:")
            for error in error_responses:
                print(f"  {error['status']} {error['url']} ({error['content_type']})")
        
        # Check for HTML responses to JS requests (wrong MIME type)
        html_js_responses = [r for r in responses if r['url'].endswith('.js') and 'text/html' in r['content_type']]
        if html_js_responses:
            print(f"\n🚨 JavaScript files served as HTML:")
            for resp in html_js_responses:
                print(f"  {resp['url']} - {resp['content_type']}")
        
        # Test module loading specifically
        print(f"\n🔬 Testing ES6 Module Loading...")
        module_test = page.evaluate("""() => {
            // Try to dynamically import a module
            return new Promise((resolve) => {
                import('./static/js/views/ViewManager.js')
                    .then(module => {
                        resolve({
                            success: true,
                            hasViewManager: typeof module.ViewManager !== 'undefined',
                            moduleKeys: Object.keys(module)
                        });
                    })
                    .catch(error => {
                        resolve({
                            success: false,
                            error: error.message,
                            errorType: error.constructor.name
                        });
                    });
            });
        }""")
        
        print(f"Module Test Result: {module_test}")
        
        # The test helps us understand network-level issues
        assert len(requests) > 0, "Should have made some network requests"

    def test_check_import_statements(self, page: Page, game_server):
        """Check what import statements are in the main app.js file"""
        
        page.goto(game_server)
        page.wait_for_selector("#scene-container", timeout=30000, state="attached")
        
        # Get the content of app.js and analyze imports
        app_js_analysis = page.evaluate("""() => {
            return fetch('/static/js/app.js')
                .then(response => response.text())
                .then(content => {
                    // Extract import statements
                    const importRegex = /import\\s+.*?from\\s+['"`]([^'"`]+)['"`]/g;
                    const imports = [];
                    let match;
                    
                    while ((match = importRegex.exec(content)) !== null) {
                        imports.push(match[1]);
                    }
                    
                    return {
                        success: true,
                        totalLines: content.split('\\n').length,
                        totalSize: content.length,
                        imports: imports,
                        firstFewLines: content.split('\\n').slice(0, 10)
                    };
                })
                .catch(error => ({
                    success: false,
                    error: error.message
                }));
        }""")
        
        print(f"📜 App.js Analysis: {app_js_analysis}")
        
        if app_js_analysis.get('success'):
            imports = app_js_analysis.get('imports', [])
            print(f"\n📦 Import Statements Found ({len(imports)}):")
            for i, imp in enumerate(imports, 1):
                print(f"  {i}. {imp}")
        
        # Test if we can resolve these imports
        if app_js_analysis.get('success') and app_js_analysis.get('imports'):
            first_import = app_js_analysis['imports'][0]
            print(f"\n🧪 Testing first import: {first_import}")
            
            import_test = page.evaluate(f"""() => {{
                return fetch('/static/js/{first_import}')
                    .then(response => ({{
                        ok: response.ok,
                        status: response.status,
                        contentType: response.headers.get('content-type'),
                        url: response.url
                    }}))
                    .catch(error => ({{
                        error: error.message
                    }}));
            }}""")
            
            print(f"Import Test Result: {import_test}")
        
        assert True, "Import analysis completed"
