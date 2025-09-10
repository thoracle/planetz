// Force cache clear by adding timestamp to all JSON file requests
console.log("🔧 FORCE CACHE CLEAR - Reloading with fresh data...");

// Clear localStorage
localStorage.clear();
delete localStorage["starCharts_discovered"];
delete localStorage["planetz_discovery_state"];
delete localStorage["navigation_state"];

// Force reload the page with cache-busting parameters
const cacheBustParam = '?nocache=' + Date.now();
const newUrl = window.location.origin + window.location.pathname + cacheBustParam + window.location.hash;

// Add cache-busting to all future fetch requests
const originalFetch = window.fetch;
window.fetch = function(url, options) {
    if (typeof url === 'string' && url.includes('.json')) {
        url += (url.includes('?') ? '&' : '?') + 'nocache=' + Date.now();
    }
    return originalFetch.call(this, url, options);
};

// Reload the page
console.log("✅ Reloading page with cache-busting...");
window.location.href = newUrl;
