-- The hosted project includes a platform event trigger that enables RLS on
-- new public tables. It is not part of the application API.
revoke all on function public.rls_auto_enable() from public, anon, authenticated;
