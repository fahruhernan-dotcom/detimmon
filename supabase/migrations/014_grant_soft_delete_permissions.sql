-- ==============================================================================
-- DIGNITY ADMIN COMMAND CENTER - MIGRATION 014: GRANT SOFT DELETE PERMISSIONS
-- LPK Indonesia Dignity (Hybrid Architecture: Google Workspace + Supabase)
-- ==============================================================================

-- Berikan hak eksekusi ke anon & authenticated agar staf yang login dengan
-- Passkey Operator (maupun Supabase Auth) dapat melakukan soft delete & restore.
GRANT EXECUTE ON FUNCTION public.soft_delete_registration(UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.restore_registration(UUID) TO anon, authenticated, service_role;
