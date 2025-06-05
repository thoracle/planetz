# StarF*ckers: Complete Deployment Guide 🚀

This guide provides comprehensive deployment instructions for all platforms and hosting environments.

---

## 📋 **Quick Deployment Reference**

| Platform | Method | Complexity | Recommended For |
|----------|--------|-------------|-----------------|
| **Local Development** | Flask Dev Server | Easy | Development & Testing |
| **Static Hosting** | Frontend Only | Easy | Most Production Deployments |
| **Bluehost Shared** | Static Files | Medium | Web Portfolio |
| **Full Stack** | Flask + Frontend | Advanced | API Requirements |

---

## 🚀 **Recommended: Static Hosting Deployment**

The game works perfectly as a **frontend-only static site** with all features intact.

### **Quick Static Deployment**

1. **Copy Frontend Files**:
```bash
# Copy the entire frontend directory to your web server
cp -r frontend/static/* /your/web/server/path/
```

2. **Access Game**: Navigate to `yoursite.com/index.html`

### **What Works in Static Mode**
- ✅ **3D World**: Complete Three.js rendering
- ✅ **Ship Systems**: All 5 ship classes and management
- ✅ **Card Collection**: NFT-style card system with persistence
- ✅ **Combat**: All 8 weapon types with effects
- ✅ **Exploration**: Procedural universe generation
- ✅ **Persistence**: Local storage for game state

### **Static Hosting Providers**
- **GitHub Pages**: Free, easy setup
- **Netlify**: Free tier with custom domains
- **Vercel**: Free deployment with git integration
- **Bluehost**: Shared hosting (see Bluehost section below)

---

## 🏠 **Local Development Setup**

### **Prerequisites**
- Python 3.x
- Modern web browser with WebGL support
- Git (for cloning)

### **Setup Steps**

1. **Clone and Setup Environment**:
```bash
git clone <repository>
cd starfckers
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
```

2. **Install Dependencies**:
```bash
pip install -r requirements.txt
```

3. **Start Development Server**:
```bash
python run.py
```

4. **Access Game**: Open `http://localhost:5001`

### **Development Features**
- Hot reload for development
- Debug console access
- Development tools integration
- Full API endpoint access

---

## 🌐 **Bluehost Deployment (Shared Hosting)**

Optimized deployment for Bluehost shared hosting environments.

### **Bluehost Quick Setup**

1. **Download Deployment Package**:
   - Use `planetz-bluehost-deployment-STANDALONE-OPTIMIZED.zip`
   - Contains optimized frontend-only version

2. **Upload to Bluehost**:
   - Extract to `/public_html/starfckers/` (or desired subdirectory)
   - Ensure proper file permissions (644 for files, 755 for directories)

3. **Access Game**: 
   - Navigate to `yourdomain.com/starfckers/frontend/`

### **Bluehost-Specific Optimizations**

#### **File Structure for Bluehost**:
```
/public_html/starfckers/
├── frontend/
│   ├── index.html          (Main game entry point)
│   ├── static/
│   │   ├── js/             (All JavaScript modules)
│   │   ├── css/            (Stylesheets)
│   │   ├── audio/          (Sound effects)
│   │   ├── models/         (3D models)
│   │   └── images/         (Textures and UI images)
│   └── tests/              (Testing framework)
└── README.md               (Deployment notes)
```

#### **Common Bluehost Issues & Solutions**

**Issue 1: Chunk Worker Errors** ✅ **FIXED**
- **Problem**: WebAssembly worker loading failures
- **Solution**: Removed chunk dependencies, uses inline generation
- **Result**: No more "Failed to load chunk" errors

**Issue 2: Audio Autoplay Blocked** ✅ **FIXED**
- **Problem**: Safari/browser autoplay policies
- **Solution**: User-triggered audio initialization
- **Result**: Audio works on first user interaction

**Issue 3: MIME Type Issues** ✅ **PREVENTED**
- **Problem**: JavaScript modules not loading
- **Solution**: Proper file extensions and imports
- **Result**: All ES6 modules load correctly

### **Bluehost Performance Optimization**

1. **File Compression**: All assets pre-compressed
2. **Module Loading**: Optimized import chains
3. **Asset Management**: Efficient Three.js resource loading
4. **Memory Management**: Proper cleanup and garbage collection

---

## 🔧 **Full Stack Deployment (Advanced)**

For deployments requiring backend API functionality.

### **Production Flask Setup**

1. **Production Server Configuration**:
```python
# wsgi.py
from backend import create_app

app = create_app('production')

if __name__ == "__main__":
    app.run()
```

2. **Environment Configuration**:
```bash
export FLASK_ENV=production
export FLASK_APP=wsgi.py
export SECRET_KEY=your-secret-key
```

3. **Production Dependencies**:
```bash
pip install gunicorn  # WSGI server
pip install nginx     # Reverse proxy (if needed)
```

4. **Start Production Server**:
```bash
gunicorn --bind 0.0.0.0:5000 wsgi:app
```

### **Docker Deployment**

```dockerfile
FROM python:3.9-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

EXPOSE 5000
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "wsgi:app"]
```

---

## 🛠 **Platform-Specific Configurations**

### **GitHub Pages**
```yaml
# .github/workflows/deploy.yml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    - name: Deploy to GitHub Pages
      uses: peaceiris/actions-gh-pages@v3
      with:
        github_token: ${{ secrets.GITHUB_TOKEN }}
        publish_dir: ./frontend/static
```

### **Netlify**
```toml
# netlify.toml
[build]
  publish = "frontend/static"

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-XSS-Protection = "1; mode=block"
```

### **Vercel**
```json
{
  "version": 2,
  "builds": [
    {
      "src": "frontend/static/**",
      "use": "@vercel/static"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/frontend/static/$1"
    }
  ]
}
```

---

## 🔍 **Deployment Verification**

### **Post-Deployment Checklist**

1. **Core Functionality**:
   - [ ] Game loads without JavaScript errors
   - [ ] 3D scene renders properly
   - [ ] Ship controls respond to input
   - [ ] Audio plays after user interaction

2. **System Features**:
   - [ ] Card inventory system functional
   - [ ] Ship switching works
   - [ ] Weapon systems operational
   - [ ] Docking interface accessible

3. **Performance**:
   - [ ] Frame rate stable (>30 FPS minimum)
   - [ ] Memory usage reasonable
   - [ ] No console errors
   - [ ] Responsive on target devices

### **Common Deployment Issues**

**JavaScript Module Errors**
```bash
# Check browser console for:
- "Failed to load module"
- "CORS policy" errors
- "Module not found" errors
```

**3D Rendering Issues**
```bash
# Verify WebGL support:
- Hardware acceleration enabled
- WebGL context creation successful
- Three.js compatibility
```

**Audio Problems**
```bash
# Test audio functionality:
- Audio context activation
- User interaction requirement
- File loading success
```

---

## 📊 **Performance Monitoring**

### **Key Metrics to Monitor**

| Metric | Target | Monitoring Method |
|--------|--------|------------------|
| **Frame Rate** | >30 FPS | In-game FPS counter (Ctrl+D) |
| **Load Time** | <5 seconds | Browser DevTools Network tab |
| **Memory Usage** | <500MB | Browser DevTools Memory tab |
| **JavaScript Errors** | Zero | Browser DevTools Console |

### **Performance Optimization Tips**

1. **Asset Optimization**:
   - Compress textures and models
   - Minimize JavaScript bundles
   - Use efficient Three.js geometry

2. **Browser Compatibility**:
   - Test on Chrome, Firefox, Safari, Edge
   - Verify WebGL support
   - Check ES6 module compatibility

3. **Network Optimization**:
   - Enable gzip compression
   - Use CDN for Three.js if possible
   - Optimize asset loading order

---

## 🚀 **Production Deployment Checklist**

### **Pre-Deployment**
- [ ] All features tested and working
- [ ] Documentation updated
- [ ] Performance optimized
- [ ] Security considerations addressed
- [ ] Backup procedures in place

### **Deployment Process**
- [ ] Choose appropriate deployment method
- [ ] Upload files to hosting platform
- [ ] Configure server settings (if applicable)
- [ ] Set up custom domain (if desired)
- [ ] Test all functionality

### **Post-Deployment**
- [ ] Verify all features work in production
- [ ] Monitor performance metrics
- [ ] Set up analytics (if desired)
- [ ] Plan maintenance procedures
- [ ] Document deployment process

---

## 📞 **Support & Troubleshooting**

For deployment issues, refer to:
- **[Troubleshooting Guide](../TROUBLESHOOTING.md)**: Common issues and solutions
- **[Complete Guide](COMPLETE_GUIDE.md)**: Comprehensive game documentation
- **[Development Guide](DEVELOPMENT.md)**: Technical architecture details

---

**Status**: ✅ **Production Ready** - All deployment methods tested and verified

*Last Updated: December 2024 | All platforms tested and optimized*