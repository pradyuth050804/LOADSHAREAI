# 🚀 Loadshare Chatbot - Deployment Guide

## 📦 Deploying from Another PC

### **Step 1: Prepare the Files**
1. **Zip the entire project folder** (excluding unnecessary files)
2. **Include these essential files:**
   - ✅ All source code (`src/` folder)
   - ✅ `package.json` (with all dependencies)
   - ✅ `vite.config.ts`
   - ✅ `vercel.json`
   - ✅ `.npmrc`
   - ✅ `.vercelignore`
   - ✅ `tailwind.config.ts`
   - ✅ `tsconfig.json`
   - ✅ `index.html`
   - ✅ `README.md`

### **Step 2: Files to EXCLUDE from ZIP**
- ❌ `node_modules/` (will be installed on Vercel)
- ❌ `dist/` (will be built on Vercel)
- ❌ `.env` files (use Vercel environment variables)
- ❌ `start-dev.bat` and `start-dev.ps1` (local development only)
- ❌ `.git/` folder (if present)

### **Step 3: Deploy to Vercel**

#### **Option A: Using Vercel Dashboard**
1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Choose "Upload" option
4. Upload your ZIP file
5. Vercel will automatically detect it's a Vite project
6. Click "Deploy"

#### **Option B: Using Vercel CLI**
1. Install Vercel CLI: `npm i -g vercel`
2. Extract your ZIP file
3. Run: `vercel --prod`

### **Step 4: Environment Variables**
Set these in Vercel dashboard:
- `VITE_GROQ_API_KEY` - Your Groq API key
- `VITE_OPENROUTER_API_KEY` - Your OpenRouter API key
- `VITE_SUPABASE_URL` - Your Supabase URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anonymous key

### **Step 5: Verify Deployment**
- Check build logs for any errors
- Test the chatbot functionality
- Verify all features work correctly

## 🔧 Troubleshooting

### **Common Issues:**
1. **Build fails** - Check if all dependencies are in `package.json`
2. **Environment variables missing** - Set them in Vercel dashboard
3. **API errors** - Verify API keys are correct

### **Quick Fix Commands:**
```bash
# If you need to rebuild locally first
npm install
npm run build

# Check if build works locally
npm run preview
```

## 📋 Pre-Deployment Checklist

- [ ] All source files included
- [ ] `package.json` has all dependencies
- [ ] `vercel.json` is present
- [ ] `.npmrc` is present
- [ ] Environment variables ready
- [ ] ZIP file created (excluding node_modules)
- [ ] Tested locally with `npm run build`

## 🎯 Success Indicators

✅ Build completes without errors  
✅ Chatbot loads correctly  
✅ API calls work  
✅ All features functional  
✅ Mobile responsive  

---

**Need help?** Check the Vercel build logs for specific error messages.
