 # Vyuha Esports - Self-Hosting Deployment Guide
 
 This guide covers deploying Vyuha Esports to your own Supabase account and Vercel.
 
 ---
 
 ## 📋 Prerequisites
 
 - GitHub account with this repository forked/cloned
 - Supabase account (free tier works)
 - Vercel account (free tier works)
 - VS Code with GitHub Codespaces (for tablet users)
 
 ---
 
 ## 🗄️ Step 1: Supabase Project Setup
 
 ### 1.1 Create Supabase Project
 
 1. Go to [supabase.com](https://supabase.com) and sign in
 2. Click "New Project"
 3. Choose organization, enter project name (e.g., "vyuha-esports")
 4. Set a strong database password (save this!)
 5. Select region closest to your users
 6. Click "Create new project" and wait ~2 minutes
 
 ### 1.2 Get Your Supabase Credentials
 
 After project creation, go to **Settings → API**:
 
 | Credential | Where to Find | Used For |
 |------------|---------------|----------|
 | `SUPABASE_URL` | Project URL | API calls |
 | `SUPABASE_ANON_KEY` | anon/public key | Frontend auth |
 | `SUPABASE_SERVICE_ROLE_KEY` | service_role key | Edge functions (KEEP SECRET!) |
 
 ### 1.3 Run Database Migrations
 
 **Option A: Using Supabase Dashboard (Recommended for Tablet)**
 
 1. Go to **SQL Editor** in Supabase Dashboard
 2. Open each file in `supabase/migrations/` folder (in order by filename)
 3. Copy-paste and run each migration
 
 **Option B: Using Supabase CLI (VS Code/Terminal)**
 
 ```bash
 # Install Supabase CLI
 npm install -g supabase
 
 # Login to Supabase
 supabase login
 
 # Link to your project
 supabase link --project-ref YOUR_PROJECT_ID
 
 # Push migrations
 supabase db push
 ```
 
 ---
 
 ## 🔐 Step 2: Configure Secrets in Supabase
 
 Go to **Settings → Edge Functions → Secrets** in Supabase Dashboard.
 
 ### Required Secrets
 
 | Secret Name | Where to Get | Purpose |
 |-------------|--------------|---------|
 | `DEEPSEEK_API_KEY` | [platform.deepseek.com](https://platform.deepseek.com) | AI Chat functionality |
 | `ONESIGNAL_APP_ID` | [onesignal.com](https://onesignal.com) | Push notifications |
 | `ONESIGNAL_REST_API_KEY` | OneSignal Dashboard → Settings → Keys | Push notifications |
 
 ### ZapUPI Payment Gateway
 
 ZapUPI credentials are stored in **database**, not secrets:
 
 1. Go to SQL Editor and run:
 ```sql
 INSERT INTO payment_gateway_config (gateway_name, display_name, api_key_id, api_key_secret, is_enabled)
 VALUES ('zapupi', 'ZapUPI', 'YOUR_ZAPUPI_TOKEN', 'YOUR_ZAPUPI_SECRET', true)
 ON CONFLICT (gateway_name) 
 DO UPDATE SET api_key_id = EXCLUDED.api_key_id, api_key_secret = EXCLUDED.api_key_secret;
 ```
 
 2. Get ZapUPI credentials from [zapupi.com](https://zapupi.com) dashboard
 
 ### Adding Secrets via CLI
 
 ```bash
 supabase secrets set DEEPSEEK_API_KEY=sk-xxxxx
 supabase secrets set ONESIGNAL_APP_ID=xxxxx
 supabase secrets set ONESIGNAL_REST_API_KEY=xxxxx
 ```
 
 ---
 
 ## ⚡ Step 3: Deploy Edge Functions
 
 ### Option A: Using GitHub Actions (Automatic)
 
 Create `.github/workflows/deploy-functions.yml`:
 
 ```yaml
 name: Deploy Edge Functions
 
 on:
   push:
     branches: [main]
     paths:
       - 'supabase/functions/**'
 
 jobs:
   deploy:
     runs-on: ubuntu-latest
     steps:
       - uses: actions/checkout@v4
       
       - uses: supabase/setup-cli@v1
         with:
           version: latest
       
       - run: supabase functions deploy --project-ref ${{ secrets.SUPABASE_PROJECT_ID }}
         env:
           SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
 ```
 
 Add these GitHub Secrets:
 - `SUPABASE_PROJECT_ID`: Your project reference ID
 - `SUPABASE_ACCESS_TOKEN`: From [supabase.com/dashboard/account/tokens](https://supabase.com/dashboard/account/tokens)
 
 ### Option B: Manual Deploy via CLI
 
 ```bash
 # Deploy all functions
 supabase functions deploy --project-ref YOUR_PROJECT_ID
 
 # Or deploy specific function
 supabase functions deploy zapupi-create-order --project-ref YOUR_PROJECT_ID
 supabase functions deploy ai-chat --project-ref YOUR_PROJECT_ID
 ```
 
 ### Option C: Using npx (No Global Install)
 
 ```bash
 npx supabase login
 npx supabase link --project-ref YOUR_PROJECT_ID
 npx supabase functions deploy
 ```
 
 ---
 
 ## 🌐 Step 4: Deploy to Vercel
 
 ### 4.1 Connect GitHub Repository
 
 1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
 2. Click "Add New Project"
 3. Import your forked/cloned repository
 4. Configure build settings:
    - Framework: Vite
    - Build Command: `npm run build`
    - Output Directory: `dist`
 
 ### 4.2 Add Environment Variables in Vercel
 
 Go to Project Settings → Environment Variables:
 
 | Variable | Value |
 |----------|-------|
 | `VITE_SUPABASE_URL` | Your Supabase project URL |
 | `VITE_SUPABASE_PUBLISHABLE_KEY` | Your Supabase anon key |
 | `VITE_SUPABASE_PROJECT_ID` | Your Supabase project ID |
 | `VITE_ONESIGNAL_APP_ID` | Your OneSignal App ID |
 
 ### 4.3 Deploy
 
 Click "Deploy" - Vercel will build and deploy automatically.
 
 ---
 
 ## 🔗 Step 5: Configure Webhooks
 
 ### ZapUPI Webhook
 
 1. Webhook URL: `https://YOUR_PROJECT_ID.supabase.co/functions/v1/zapupi-webhook`
 2. Go to ZapUPI Dashboard → Settings → Webhooks
 3. Add the webhook URL and save
 
 ---
 
 ## ✅ Step 6: Verify Everything Works
 
 After deployment, go to `/admin/backend-status` in your app to check all integrations.
 
 ### Manual Verification
 
 | Integration | How to Test |
 |-------------|-------------|
 | Database | Sign up/login works |
 | ZapUPI | Try adding money to wallet |
 | DeepSeek AI | Use AI chat feature |
 | Push Notifications | Send test notification |
 
 ---
 
 ## 🛠️ Troubleshooting
 
 ### Edge Functions Not Working
 - Check logs: Supabase Dashboard → Edge Functions → Logs
 - Verify secrets are set
 - Redeploy: `npx supabase functions deploy`
 
 ### ZapUPI "Unauthorized" Error
 - Check credentials in `payment_gateway_config` table
 - Verify IP whitelist in ZapUPI dashboard
 
 ### Database Connection Failed
 - Verify env vars in Vercel
 - Check if database is paused (free tier)
 
 ---
 
 ## 📱 Tablet Development
 
 ### GitHub Codespaces
 1. Go to your GitHub repository
 2. Click "Code" → "Codespaces" tab
 3. Click "Create codespace on main"
 4. VS Code opens in browser!
 
 ### Gitpod
 Prefix URL: `gitpod.io/#https://github.com/yourusername/vyuha-esports`