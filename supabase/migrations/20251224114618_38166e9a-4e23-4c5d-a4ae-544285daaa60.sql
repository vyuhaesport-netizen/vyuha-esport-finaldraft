-- =====================================================
-- MAINTENANCE MODE SETTING
-- Add maintenance mode setting to platform_settings
-- =====================================================

-- Insert maintenance mode setting (disabled by default)
INSERT INTO public.platform_settings (setting_key, setting_value, description)
VALUES (
  'maintenance_mode',
  'false',
  'When enabled, blocks all user access and shows maintenance page'
)
ON CONFLICT (setting_key) DO NOTHING;

-- Insert maintenance message setting
INSERT INTO public.platform_settings (setting_key, setting_value, description)
VALUES (
  'maintenance_message',
  'We are currently performing scheduled maintenance. Please check back soon!',
  'Message shown to users during maintenance mode'
)
ON CONFLICT (setting_key) DO NOTHING;

-- Insert maintenance estimated end time
INSERT INTO public.platform_settings (setting_key, setting_value, description)
VALUES (
  'maintenance_end_time',
  '',
  'Estimated time when maintenance will end (ISO timestamp)'
)
ON CONFLICT (setting_key) DO NOTHING;