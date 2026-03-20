-- Fix conversations stuck in old 'seguimiento_c1' nomenclature
UPDATE conversations 
SET pipeline_tab = 'seguimiento_s1',
    seguimiento_next_s = 1,
    seguimiento_contact_number = 1
WHERE pipeline_tab LIKE 'seguimiento_c%';

-- Also update the pipeline_execution_log column name from old nomenclature
-- (the column itself stays, we just note it for consistency)
COMMENT ON COLUMN pipeline_execution_log.moved_to_c1 IS 'Legacy name - represents moved_to_seguimiento count';