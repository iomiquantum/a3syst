
-- Remove the orphan admin roles on the auto-created clinics
DELETE FROM public.user_roles
WHERE clinic_id IN (
  '8777ea61-80fd-4225-9a42-1e52f9384cac',
  '56faeda3-8789-43f8-b96b-63deff4a0f03',
  'e099634f-c348-4a4c-85b4-722a52a39c2d',
  '63ab7f71-fc07-4d38-9d66-08b14f5d0fdf'
);

-- Remove payment methods from orphan clinics
DELETE FROM public.payment_methods
WHERE clinic_id IN (
  '8777ea61-80fd-4225-9a42-1e52f9384cac',
  '56faeda3-8789-43f8-b96b-63deff4a0f03',
  'e099634f-c348-4a4c-85b4-722a52a39c2d',
  '63ab7f71-fc07-4d38-9d66-08b14f5d0fdf'
);

-- Delete the orphan clinics
DELETE FROM public.clinics
WHERE id IN (
  '8777ea61-80fd-4225-9a42-1e52f9384cac',
  '56faeda3-8789-43f8-b96b-63deff4a0f03',
  'e099634f-c348-4a4c-85b4-722a52a39c2d',
  '63ab7f71-fc07-4d38-9d66-08b14f5d0fdf'
);
