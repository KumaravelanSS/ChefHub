-- ==============================================================================
-- ChefHub Database Security: Enable Row Level Security (RLS) on all public tables
-- Run this in your Supabase SQL Editor to resolve all 7 Security Advisor errors.
-- ==============================================================================

-- 1. Enable RLS on all 8 tables in the public schema
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dish_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dishes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outbox_events ENABLE ROW LEVEL SECURITY;

-- Note:
-- Your Node.js backend connects using the `postgres` superuser role (via DATABASE_URL),
-- which has BYPASSRLS privilege by default and will continue functioning normally.
-- Enabling RLS prevents unauthorized direct access via the public Supabase PostgREST API.
