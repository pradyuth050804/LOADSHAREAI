README - Grid Buddy

=================================================
Project: Grid Buddy
=================================================

This project is a hybrid AI-powered chatbot for logistics,
built with:
- Frontend: React (Vite + TailwindCSS), Node.js
- Backend: Python (FastAPI with LLaMA integration), Type Script, Node.js

-------------------------------------------------
PREREQUISITES
-------------------------------------------------
1. Install Node.js (>=18)
   https://nodejs.org

2. Install Python (>=3.10)
   https://www.python.org/downloads/

3. Install Git (for cloning and version control)
   https://git-scm.com/downloads


-------------------------------------------------
SETUP INSTRUCTIONS
-------------------------------------------------

1. Clone the repository
   
   git clone <https://github.com/pradyuth050804/LOADSHAREAI>
   
   cd loadshare-llama-assist-main

3. Install frontend dependencies
   npm install
   

4. Install backend dependencies (Python)
   python -m venv .venv
   source .venv/bin/activate   # Linux/Mac
   .venv\Scripts\activate    # Windows
   pip install -r requirements.txt

5. Create a .env file in the root directory and configure:
   - API keys (e.g., OpenAI/LLaMA or HuggingFace)
   - Database credentials (if using Mongo/Postgres)
   - Any other environment variables

-------------------------------------------------
RUNNING LOCALLY
-------------------------------------------------

Frontend (React + Vite):
   npm run dev
  

Backend (Python):
   uvicorn main:app --reload

The frontend will typically run on:
   http://localhost:5173

The backend API will typically run on:
   http://localhost:8000

-------------------------------------------------
DEPLOYMENT
-------------------------------------------------

1. Vercel Deployment (Recommended)
   - Install Vercel CLI: npm install -g vercel
   - Run: vercel
   - Follow the prompts to deploy

2. Manual Deployment (Alternative)
   - Host frontend on Netlify/Vercel/Static server
   - Host backend on Render, Railway, or any Python hosting
   - Configure environment variables on the hosting platform

-------------------------------------------------
TROUBLESHOOTING
-------------------------------------------------

- If you get dependency errors, delete node_modules and run:
  npm install

- If Python packages fail, upgrade pip:
  python -m pip install --upgrade pip

- Ensure environment variables are set correctly in .env


------------------------------------------------
SCOPE FOR IMPROVEMENT
------------------------------------------------
- Multi language support

=================================================
END OF README
=================================================
