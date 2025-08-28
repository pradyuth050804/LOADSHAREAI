# 🚀 Netlify Deployment Guide for GRID BUDDY

## 📦 Quick Deployment Steps

### **Option 1: Drag & Drop Deployment**
1. **Build the project locally:**
   ```bash
   npm install
   npm run build
   ```

2. **Deploy to Netlify:**
   - Go to [netlify.com](https://netlify.com)
   - Drag and drop the `dist` folder to the deployment area
   - Your site will be live instantly!

### **Option 2: Git Repository Deployment**
1. **Push to GitHub/GitLab:**
   - Create a new repository
   - Push your code to the repository

2. **Connect to Netlify:**
   - Go to [netlify.com](https://netlify.com)
   - Click "New site from Git"
   - Connect your repository
   - Netlify will auto-detect the build settings

## 🔧 Environment Variables Setup

After deployment, set these environment variables in Netlify:

1. **Go to Site Settings > Environment Variables**
2. **Add the following variables:**

```
VITE_SUPABASE_URL=https://xffjmgpjmpyhqwltuhsh.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmZmptZ3BqbXB5aHF3bHR1aHNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4NDk5MTQsImV4cCI6MjA3MTQyNTkxNH0.p0-O0LfwrZ9-Cj0w3gVDyzjyto4i_GtjfLQSPsR5oWI

# Choose ONE of these LLM providers:
VITE_GROQ_API_KEY=your_groq_api_key_here
# OR
VITE_OPENROUTER_API_KEY=your_openrouter_api_key_here
```

## 🎯 Build Settings (Auto-detected)

Netlify will automatically detect these settings:
- **Build command:** `npm run build`
- **Publish directory:** `dist`
- **Node version:** 18

## 📋 Pre-Deployment Checklist

- [ ] All source files included
- [ ] `package.json` has all dependencies
- [ ] `netlify.toml` configuration file present
- [ ] Environment variables ready
- [ ] Tested locally with `npm run build`
- [ ] Supabase database accessible

## 🔍 Troubleshooting

### **Build Fails:**
- Check if all dependencies are in `package.json`
- Verify Node.js version compatibility
- Check build logs for specific errors

### **Environment Variables Missing:**
- Ensure all required env vars are set in Netlify dashboard
- Variables must start with `VITE_` for Vite projects

### **API Errors:**
- Verify Supabase URL and keys are correct
- Check if LLM API keys are valid
- Ensure CORS is properly configured

## 🌟 Success Indicators

✅ Build completes without errors  
✅ Chatbot loads correctly  
✅ Database queries work  
✅ LLM responses generate  
✅ All features functional  
✅ Mobile responsive  

---

**Need help?** Check the Netlify build logs for specific error messages.