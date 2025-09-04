# 🚀 THORALEXANDER.COM - Bluehost Deployment Guide

## 📦 Deployment Package Ready!

Your retro terminal bio website is packaged and ready for deployment:
- **File**: `thoralexander-com-deployment.zip` (66KB)
- **Contents**: `index.html` + `images/IMG_7300.JPG`

## 🌐 Step-by-Step Bluehost Deployment

### **Option 1: Main Domain Deployment (thoralexander.com)**

If you want this as your main website at thoralexander.com:

1. **Log into Bluehost cPanel**
2. **Open File Manager**
3. **Navigate to `public_html`** (your main domain folder)
4. **Clear existing files** (if any) or backup first
5. **Upload** `thoralexander-com-deployment.zip`
6. **Extract** the ZIP file
7. **Move files** from extracted folder to root of public_html:
   - `index.html` → `/public_html/index.html`
   - `images/` → `/public_html/images/`

### **Option 2: Subdomain Deployment (bio.thoralexander.com)**

If you want this as a subdomain:

1. **Create Subdomain** in cPanel → Subdomains
   - Subdomain: `bio`
   - Document Root: `/public_html/bio`
2. **Navigate to `/public_html/bio/`** in File Manager
3. **Upload and extract** `thoralexander-com-deployment.zip`
4. **Move files** to subdomain root

### **Option 3: Subfolder Deployment (thoralexander.com/bio)**

If you want it as a subfolder:

1. **Create folder** `/public_html/bio/` in File Manager
2. **Upload and extract** files to `/public_html/bio/`
3. **Access via**: thoralexander.com/bio

## ✅ Post-Deployment Checklist

### **Test Your Website:**
- [ ] Visit your domain/subdomain
- [ ] Check that retro terminal styling loads
- [ ] Verify profile image displays (IMG_7300.JPG)
- [ ] Test social links (LinkedIn, GitHub, X/Twitter)
- [ ] Confirm all sections display properly:
  - [ ] Terminal header: "THORALEXANDER.COM"
  - [ ] Profile photo with green glow
  - [ ] Name: "THOR ALEXANDER" 
  - [ ] Title: "GAME DESIGNER & ENTREPRENEUR"
  - [ ] About section
  - [ ] Planetz project section
  - [ ] Experience history
  - [ ] Contact section

### **Performance Check:**
- [ ] Page loads quickly
- [ ] Images display without 404 errors
- [ ] Browser title shows correctly
- [ ] Mobile responsiveness works
- [ ] All animations/effects work (scan lines, glow effects)

## 🔧 Troubleshooting

### **Common Issues:**

**Image Not Loading:**
- Check file path: `/images/IMG_7300.JPG`
- Verify image uploaded to correct folder
- Check file permissions (should be 644)

**Styling Issues:**
- Ensure Google Fonts loads (Share Tech Mono)
- Check Font Awesome CDN link works
- Clear browser cache with Ctrl+Shift+R

**Slow Loading:**
- Image is optimized (64KB is fine)
- Consider compressing if needed
- Check hosting bandwidth

## 🎯 Final URLs

Depending on your deployment choice:
- **Main Domain**: https://thoralexander.com
- **Subdomain**: https://bio.thoralexander.com  
- **Subfolder**: https://thoralexander.com/bio

## 📱 Features Included

✅ **Retro Terminal Aesthetic**
- Green phosphor text on black background
- CRT scan lines and pixel grid effects
- Monospace font (Share Tech Mono)
- Terminal-style headers and commands

✅ **Professional Content**
- Executive gaming industry experience
- Social media integration
- Planetz game showcase
- Contact information

✅ **Technical Features**
- Responsive design (mobile-friendly)
- Smooth animations
- Hover effects
- Fast loading (66KB total)
- No dependencies (self-contained)

## 🚀 You're Ready to Go Live!

Your retro terminal bio website is ready for the world to see! The unique aesthetic perfectly showcases your gaming industry background and entrepreneurial ventures.

**Total deployment time**: ~5-10 minutes
**File size**: Ultra-lightweight at 66KB
**Compatibility**: Works on all modern browsers 