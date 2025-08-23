@echo off
echo Creating Loadshare Chatbot Deployment ZIP...
echo.

REM Create deployment folder
if exist "deployment" rmdir /s /q "deployment"
mkdir "deployment"

REM Copy essential files and folders
echo Copying source files...
xcopy "src" "deployment\src" /E /I /Y
xcopy "public" "deployment\public" /E /I /Y

echo Copying configuration files...
copy "package.json" "deployment\"
copy "package-lock.json" "deployment\"
copy "vite.config.ts" "deployment\"
copy "vercel.json" "deployment\"
copy ".npmrc" "deployment\"
copy ".vercelignore" "deployment\"
copy "tailwind.config.ts" "deployment\"
copy "tsconfig.json" "deployment\"
copy "tsconfig.app.json" "deployment\"
copy "tsconfig.node.json" "deployment\"
copy "index.html" "deployment\"
copy "README.md" "deployment\"
copy "DEPLOYMENT_GUIDE.md" "deployment\"
copy "postcss.config.js" "deployment\"
copy "eslint.config.js" "deployment\"
copy "components.json" "deployment\"

REM Copy supabase folder if it exists
if exist "supabase" xcopy "supabase" "deployment\supabase" /E /I /Y

REM Create ZIP file
echo Creating ZIP file...
powershell -command "Compress-Archive -Path 'deployment\*' -DestinationPath 'loadshare-chatbot-deployment.zip' -Force"

REM Clean up
rmdir /s /q "deployment"

echo.
echo ✅ Deployment ZIP created successfully!
echo 📦 File: loadshare-chatbot-deployment.zip
echo.
echo 🚀 Ready to deploy to Vercel!
echo 📋 Check DEPLOYMENT_GUIDE.md for instructions
echo.
pause

