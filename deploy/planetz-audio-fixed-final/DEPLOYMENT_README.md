# Planetz Game - Bluehost Deployment Guide

## Quick Deployment Steps

### 1. Upload Files
1. Log into your Bluehost cPanel
2. Open File Manager
3. Navigate to `public_html` (or your domain's folder)
4. Upload and extract all files from this deployment package

### 2. Set Up Python Environment
1. In cPanel, enable Python for your domain
2. Set Python version to 3.8 or higher
3. Install dependencies by running in Terminal:
   ```bash
   pip install -r requirements.txt
   ```

### 3. Configure Application
1. Make sure `app.py` is in your domain's root directory
2. Set up the `.htaccess` file (included) for proper routing
3. Ensure file permissions are correct:
   - Python files: 755
   - Static files: 644

### 4. Test Your Deployment
- Visit your domain: `https://yourdomain.com`
- The game should load with the spaceship interface
- Check that all controls work (F, A, G keys, etc.)

## File Structure After Upload
```
public_html/
├── app.py                 # Main application entry point
├── .htaccess             # Web server configuration
├── requirements.txt      # Python dependencies
├── backend/              # Flask backend code
├── frontend/             # Three.js game client
└── logs/                 # Application logs (auto-created)
```

## Troubleshooting

### Python Not Working
- Ensure Python is enabled in cPanel
- Check that mod_wsgi is available
- Verify file permissions

### Static Files Not Loading
- Check that frontend/static/ directory is accessible
- Verify .htaccess is configured correctly
- Test direct access to static files

### Game Not Loading
- Check browser console for JavaScript errors
- Verify Three.js CDN links are accessible
- Test API endpoints: `/api/v1/health`

## Important Notes
- This is a production build with debug mode disabled
- Logs are stored in the `logs/` directory
- No test files or development dependencies included
- Static assets are served directly by Apache

## Contact Support
If you encounter issues, check:
1. Browser developer console for errors
2. Application logs in logs/planetz.log
3. Bluehost error logs in cPanel 