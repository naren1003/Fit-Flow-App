# FitFlow — Setup Guide
## From zero to running app in ~20 minutes

---

## Step 1 — Install Node.js (one-time)
If you don't have it already:

1. Go to **https://nodejs.org**
2. Download the **LTS** version (big green button)
3. Install it — just click Next through the installer

To verify, open Terminal (Mac) or Command Prompt (Windows) and type:
```
node --version
```
You should see something like `v20.x.x`. Good to go.

---

## Step 2 — Download the project files
Copy the `fitflow` folder to wherever you keep your projects (e.g. Desktop or Documents).

---

## Step 3 — Create a free Supabase account (your database)

1. Go to **https://supabase.com** → click **Start your project**
2. Sign up with GitHub or email
3. Click **New project**
   - Name it `fitflow`
   - Set a strong database password (save it somewhere)
   - Pick the region closest to you (e.g. South Asia for India)
4. Wait ~1 minute for it to set up

---

## Step 4 — Create the database tables

1. In Supabase, go to **SQL Editor** (left sidebar)
2. Click **New query**
3. Open the file `supabase_schema.sql` from this folder
4. Copy ALL the content and paste it into the Supabase SQL Editor
5. Click **Run** (green button)
6. You should see "Success" — your database is ready!

---

## Step 5 — Get your Supabase keys

1. In Supabase, go to **Settings → API** (left sidebar)
2. You'll see two things you need:
   - **Project URL** — looks like `https://abcdefgh.supabase.co`
   - **anon public** key — a long string starting with `eyJ...`

---

## Step 6 — Create your .env.local file

1. In the `fitflow` folder, find the file called `.env.example`
2. Make a copy of it and rename the copy to `.env.local`
3. Open `.env.local` in any text editor (Notepad works)
4. Fill in your two Supabase values:

```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJyour-long-key-here
```

Save and close.

---

## Step 7 — Install and run the app

Open Terminal / Command Prompt, then:

```bash
# Go into the project folder
cd path/to/fitflow

# Install all dependencies (only needed once)
npm install

# Start the app
npm run dev
```

You'll see something like:
```
  VITE v5.x.x  ready in 300ms
  ➜  Local:   http://localhost:5173/
```

Open **http://localhost:5173** in your browser — the app is running!

---

## Step 8 — Create your first accounts

You need to create accounts in Supabase directly (to set roles properly):

### Create a Staff/Trainer account:

1. In Supabase, go to **Authentication → Users**
2. Click **Add user → Create new user**
3. Enter email and password for the trainer
4. After creating, go to **Table Editor → profiles**
5. Find that user's row and set `role = staff`

### Create a Member account:

1. Same — create user in Authentication
2. In the `profiles` table, set their `role = member`
3. Set `assigned_trainer_id` to the trainer's user ID
4. Fill in `membership_plan`, `membership_expiry`, etc.

> **Tip:** Once you've done this once, you can add members from inside the staff panel of the app itself.

---

## Step 9 — Deploy to the internet (free)

So anyone can access it from their phone or laptop:

1. Go to **https://vercel.com** → sign up free
2. Install Vercel CLI:
   ```
   npm install -g vercel
   ```
3. In your project folder, run:
   ```
   vercel
   ```
4. Follow the prompts (hit Enter for defaults)
5. When it asks for environment variables, add your two Supabase values
6. Done — you'll get a live URL like `https://fitflow-xyz.vercel.app`

---

## What each page does

### Member portal
| Page | What it does |
|------|-------------|
| Dashboard | Shows today's workout, streak, notifications |
| Timetable | Full week schedule set by trainer, calendar |
| Workout | Start workout, log sets + reps + weight, rest timer |
| Progress | Weight trend, strength tracking, attendance stats |
| Membership | Plan details, payment history |

### Staff portal
| Page | What it does |
|------|-------------|
| Dashboard | All assigned members + today's notes |
| Members | View, add, search members |
| Plans | Create workout plans (per day, per exercise), assign to members |
| Attendance | Check members in, view daily log |

---

## Need help?

Ask Claude! Paste any error message you see and I'll fix it for you.

Common issues:
- **"Missing Supabase environment variables"** → `.env.local` file not set up correctly (Step 6)
- **"Cannot find module"** → Run `npm install` first (Step 7)
- **White screen** → Open browser console (F12 → Console tab) and paste the error to Claude
