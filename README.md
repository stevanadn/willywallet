# Student Vault

An educational financial management application designed to help high school students manage their finances, improve financial literacy, and track income/expenses effectively.

## Tech Stack

- **Frontend:** React (Vite), Tailwind CSS, Lucide React, Recharts, React Router DOM
- **Backend/DB:** Supabase (PostgreSQL, Auth, Row Level Security)
- **AI Engine:** Google Gemini API (for Financial Advisor)
- **State Management:** TanStack Query (React Query)

## Setup Instructions

### 1. Database Setup (Supabase)

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Go to SQL Editor
3. Run the migration files in order:
   - First: `supabase/migrations/001_initial_schema.sql`
   - Second: `supabase/migrations/002_auto_create_profile.sql`
   - Third: `supabase/migrations/003_fix_profile_rls.sql` (optional but recommended)
   - Fourth: `supabase/migrations/004_backfill_profiles.sql` (only if you have existing users)
4. Copy your Supabase URL and anon key

**Important:** 
- The first two migrations are required for the app to work correctly
- The second migration fixes the signup issue by automatically creating user profiles
- The third migration improves RLS policies
- The fourth migration backfills profiles for any existing users who signed up before the trigger was added

### 2. Environment Variables

Create a `.env` file in the root directory:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GEMINI_API_KEY=your_gemini_api_key
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Run Development Server

```bash
npm run dev
```

## Features

- 📊 **Dashboard:** Overview of balance, income, expenses with visual charts
- 💰 **Transaction Management:** Full CRUD operations for income and expenses
- 📈 **Smart Budgeting:** Track spending against monthly budgets with visual warnings
- 🎯 **Goals & Savings:** Set and track financial goals
- 🤖 **AI Financial Advisor:** Get personalized financial advice powered by Google Gemini

## Project Structure

```
├── src/
│   ├── components/     # Reusable UI components
│   ├── features/       # Feature-specific components
│   ├── lib/           # Utilities and configurations
│   ├── hooks/         # Custom React hooks
│   ├── pages/         # Page components
│   └── App.jsx        # Main app component
├── supabase/
│   └── migrations/    # Database migration files
└── public/            # Static assets
```

