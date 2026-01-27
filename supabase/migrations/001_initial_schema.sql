-- Student Vault Database Schema Migration
-- This migration creates all tables, triggers, and RLS policies

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. PROFILES TABLE (Extends auth.users)
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    email TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. WALLETS TABLE (Source of Fund / "Akun")
-- ============================================
CREATE TABLE IF NOT EXISTS wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    balance NUMERIC(15, 2) DEFAULT 0 CHECK (balance >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. CATEGORIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    icon TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 4. TRANSACTIONS TABLE (Core Ledger)
-- ============================================
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    date DATE DEFAULT CURRENT_DATE,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 5. BUDGETS TABLE (Planning)
-- ============================================
CREATE TABLE IF NOT EXISTS budgets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    amount_limit NUMERIC(15, 2) NOT NULL CHECK (amount_limit > 0),
    period_month INTEGER NOT NULL CHECK (period_month >= 1 AND period_month <= 12),
    period_year INTEGER NOT NULL CHECK (period_year >= 2020),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, category_id, period_month, period_year)
);

-- ============================================
-- 6. GOALS TABLE (Savings Targets)
-- ============================================
CREATE TABLE IF NOT EXISTS goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    target_amount NUMERIC(15, 2) NOT NULL CHECK (target_amount > 0),
    current_amount NUMERIC(15, 2) DEFAULT 0 CHECK (current_amount >= 0),
    deadline DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_type ON categories(type);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_wallet_id ON transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_transactions_category_id ON transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_budgets_category_id ON budgets(category_id);
CREATE INDEX IF NOT EXISTS idx_budgets_period ON budgets(period_year, period_month);
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals(user_id);

-- ============================================
-- TRIGGER FUNCTION: handle_transaction_balance
-- Automatically updates wallet balance on transaction changes
-- ============================================
CREATE OR REPLACE FUNCTION handle_transaction_balance()
RETURNS TRIGGER AS $$
BEGIN
    -- Handle INSERT
    IF TG_OP = 'INSERT' THEN
        IF NEW.type = 'income' THEN
            UPDATE wallets 
            SET balance = balance + NEW.amount 
            WHERE id = NEW.wallet_id;
        ELSIF NEW.type = 'expense' THEN
            UPDATE wallets 
            SET balance = balance - NEW.amount 
            WHERE id = NEW.wallet_id;
        END IF;
        RETURN NEW;
    END IF;

    -- Handle DELETE
    IF TG_OP = 'DELETE' THEN
        IF OLD.type = 'income' THEN
            UPDATE wallets 
            SET balance = balance - OLD.amount 
            WHERE id = OLD.wallet_id;
        ELSIF OLD.type = 'expense' THEN
            UPDATE wallets 
            SET balance = balance + OLD.amount 
            WHERE id = OLD.wallet_id;
        END IF;
        RETURN OLD;
    END IF;

    -- Handle UPDATE
    IF TG_OP = 'UPDATE' THEN
        -- Reverse the old transaction
        IF OLD.type = 'income' THEN
            UPDATE wallets 
            SET balance = balance - OLD.amount 
            WHERE id = OLD.wallet_id;
        ELSIF OLD.type = 'expense' THEN
            UPDATE wallets 
            SET balance = balance + OLD.amount 
            WHERE id = OLD.wallet_id;
        END IF;

        -- Apply the new transaction
        IF NEW.type = 'income' THEN
            UPDATE wallets 
            SET balance = balance + NEW.amount 
            WHERE id = NEW.wallet_id;
        ELSIF NEW.type = 'expense' THEN
            UPDATE wallets 
            SET balance = balance - NEW.amount 
            WHERE id = NEW.wallet_id;
        END IF;
        RETURN NEW;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_handle_transaction_balance_insert ON transactions;
CREATE TRIGGER trigger_handle_transaction_balance_insert
    AFTER INSERT ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION handle_transaction_balance();

DROP TRIGGER IF EXISTS trigger_handle_transaction_balance_delete ON transactions;
CREATE TRIGGER trigger_handle_transaction_balance_delete
    AFTER DELETE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION handle_transaction_balance();

DROP TRIGGER IF EXISTS trigger_handle_transaction_balance_update ON transactions;
CREATE TRIGGER trigger_handle_transaction_balance_update
    AFTER UPDATE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION handle_transaction_balance();

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PROFILES POLICIES
-- ============================================
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can delete own profile" ON profiles;
CREATE POLICY "Users can delete own profile" ON profiles
    FOR DELETE USING (auth.uid() = id);

-- ============================================
-- WALLETS POLICIES
-- ============================================
DROP POLICY IF EXISTS "Users can view own wallets" ON wallets;
CREATE POLICY "Users can view own wallets" ON wallets
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own wallets" ON wallets;
CREATE POLICY "Users can insert own wallets" ON wallets
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own wallets" ON wallets;
CREATE POLICY "Users can update own wallets" ON wallets
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own wallets" ON wallets;
CREATE POLICY "Users can delete own wallets" ON wallets
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- CATEGORIES POLICIES
-- ============================================
-- Allow users to view system categories (user_id IS NULL) and their own categories
DROP POLICY IF EXISTS "Users can view categories" ON categories;
CREATE POLICY "Users can view categories" ON categories
    FOR SELECT USING (user_id IS NULL OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own categories" ON categories;
CREATE POLICY "Users can insert own categories" ON categories
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own categories" ON categories;
CREATE POLICY "Users can update own categories" ON categories
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own categories" ON categories;
CREATE POLICY "Users can delete own categories" ON categories
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- TRANSACTIONS POLICIES
-- ============================================
DROP POLICY IF EXISTS "Users can view own transactions" ON transactions;
CREATE POLICY "Users can view own transactions" ON transactions
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own transactions" ON transactions;
CREATE POLICY "Users can insert own transactions" ON transactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own transactions" ON transactions;
CREATE POLICY "Users can update own transactions" ON transactions
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own transactions" ON transactions;
CREATE POLICY "Users can delete own transactions" ON transactions
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- BUDGETS POLICIES
-- ============================================
DROP POLICY IF EXISTS "Users can view own budgets" ON budgets;
CREATE POLICY "Users can view own budgets" ON budgets
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own budgets" ON budgets;
CREATE POLICY "Users can insert own budgets" ON budgets
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own budgets" ON budgets;
CREATE POLICY "Users can update own budgets" ON budgets
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own budgets" ON budgets;
CREATE POLICY "Users can delete own budgets" ON budgets
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- GOALS POLICIES
-- ============================================
DROP POLICY IF EXISTS "Users can view own goals" ON goals;
CREATE POLICY "Users can view own goals" ON goals
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own goals" ON goals;
CREATE POLICY "Users can insert own goals" ON goals
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own goals" ON goals;
CREATE POLICY "Users can update own goals" ON goals
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own goals" ON goals;
CREATE POLICY "Users can delete own goals" ON goals
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- HELPER FUNCTION: Create default categories for new users
-- ============================================
CREATE OR REPLACE FUNCTION create_default_categories()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert default income categories
    INSERT INTO categories (user_id, name, type, icon) VALUES
        (NEW.id, 'Allowance', 'income', '💰'),
        (NEW.id, 'Part-time Job', 'income', '💼'),
        (NEW.id, 'Gift', 'income', '🎁'),
        (NEW.id, 'Other Income', 'income', '💵');
    
    -- Insert default expense categories
    INSERT INTO categories (user_id, name, type, icon) VALUES
        (NEW.id, 'Food & Drinks', 'expense', '🍔'),
        (NEW.id, 'Transport', 'expense', '🚗'),
        (NEW.id, 'Entertainment', 'expense', '🎮'),
        (NEW.id, 'Shopping', 'expense', '🛍️'),
        (NEW.id, 'Education', 'expense', '📚'),
        (NEW.id, 'Savings', 'expense', '💾'),
        (NEW.id, 'Other Expense', 'expense', '📝');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create default categories when a profile is created
DROP TRIGGER IF EXISTS trigger_create_default_categories ON profiles;
CREATE TRIGGER trigger_create_default_categories
    AFTER INSERT ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION create_default_categories();

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
-- This migration creates:
-- ✅ All 6 tables with proper constraints
-- ✅ Foreign key relationships
-- ✅ Automatic balance update trigger
-- ✅ Row Level Security policies
-- ✅ Default categories for new users
-- ✅ Performance indexes

