-- Migration: Add description field to budgets table
-- This adds an optional description field to help users add notes to their budgets

ALTER TABLE budgets 
ADD COLUMN IF NOT EXISTS description TEXT;
