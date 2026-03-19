-- FASE 6: Insert "Clínicas y consultorios médicos" template
INSERT INTO pipeline_templates (
  name, slug, description, industry_type, 
  base_tabs, extra_labels, seguimiento_config, automation_rules, 
  is_active
) VALUES (
  'Clínicas y consultorios médicos',
  'clinicas',
  'Pipeline completo para clínicas: seguimiento C1-C5 (C4-C5 manuales), agendamiento, show/no-show, pacientes con calificación y próxima cita, reconversión de show sin venta, y gestión de perdidos.',
  'salud',
  '[
    {"key": "seguimiento_c4", "label": "C4", "icon": "Phone", "color": "amber", "description": "Contacto manual 4", "position_after": "seguimiento_c3", "is_manual": true},
    {"key": "seguimiento_c5", "label": "C5", "icon": "PhoneOff", "color": "amber", "description": "Contacto manual 5: último intento", "position_after": "seguimiento_c4", "is_manual": true},
    {"key": "seguimiento_venta", "label": "Seg. para venta", "icon": "ShoppingCart", "color": "green", "description": "El cliente agendó una cita. Seguimiento hasta que asista.", "sub_states": ["show", "no_show"], "position_after": "seguimiento"},
    {"key": "pacientes", "label": "Pacientes", "icon": "HeartPulse", "color": "teal", "description": "Show + venta confirmada. Paciente del negocio.", "sub_states": ["calificacion", "proxima_cita", "historial"], "position_after": "seguimiento_venta", "replaces": "clientes"},
    {"key": "show_sin_venta", "label": "Show sin venta", "icon": "UserX", "color": "coral", "description": "Asistió pero no compró.", "sub_states": ["encuesta", "alternativas", "reingreso"], "position_after": "pacientes"},
    {"key": "perdidos", "label": "Perdidos", "icon": "Archive", "color": "pink", "description": "Agotaron C5 sin respuesta o múltiples no-shows.", "position_after": "show_sin_venta"}
  ]'::JSONB,
  '[
    {"name": "Pidió info", "color": "teal", "group": "afirmacion"},
    {"name": "Interesado", "color": "teal", "group": "afirmacion"},
    {"name": "Por agendar", "color": "green", "group": "afirmacion"},
    {"name": "Por comprar", "color": "green", "group": "afirmacion"},
    {"name": "No responden", "color": "red", "group": "negacion"},
    {"name": "No interesado", "color": "red", "group": "negacion"},
    {"name": "Perdido", "color": "red", "group": "negacion"}
  ]'::JSONB,
  '{"extends_contacts_to": 5, "c4": {"delay_minutes": null, "is_manual": true, "message_template": null, "description": "Agente humano revisa el caso"}, "c5": {"delay_minutes": null, "is_manual": true, "message_template": null, "description": "Último intento del agente humano"}, "on_c5_exhausted": "perdidos"}'::JSONB,
  '{"rules": [
    {"name": "show_con_venta", "when": {"pipeline_tab": "seguimiento_venta"}, "then": {"move_to": "pacientes"}, "trigger": "manual"},
    {"name": "show_sin_venta", "when": {"pipeline_tab": "seguimiento_venta"}, "then": {"move_to": "show_sin_venta"}, "trigger": "manual"},
    {"name": "no_show_reagendar", "when": {"pipeline_tab": "seguimiento_venta"}, "then": {"move_to": "seguimiento_c1"}, "trigger": "manual"},
    {"name": "c5_agotado_a_perdidos", "when": {"pipeline_tab": "seguimiento_c5"}, "then": {"move_to": "perdidos"}, "trigger": "automatic"},
    {"name": "reactivacion_perdidos", "when": {"pipeline_tab": "perdidos"}, "then": {"move_to": "resueltos_ia"}, "trigger": "automatic"}
  ]}'::JSONB,
  true
);

-- Assign template to Vital Farme Ecuador (if exists)
INSERT INTO clinic_pipeline_config (clinic_id, pipeline_template_id, loaded_by)
SELECT 
  c.id,
  pt.id,
  c.owner_id
FROM clinics c, pipeline_templates pt
WHERE c.name ILIKE '%vital farme%'
AND pt.slug = 'clinicas'
ON CONFLICT (clinic_id) DO UPDATE SET pipeline_template_id = EXCLUDED.pipeline_template_id, loaded_at = now();

-- Insert C4 and C5 manual message templates for Vital Farme
INSERT INTO seguimiento_auto_messages (clinic_id, contact_number, message_template, delay_minutes, is_active, is_automatic)
SELECT c.id, 4, 
  'Hola {{nombre}}, soy un agente de Vital Farme Ecuador. Vi que estuviste consultando sobre nuestros servicios. ¿Puedo ayudarte con algo más? Tenemos disponibilidad esta semana.',
  0, true, false
FROM clinics c WHERE c.name ILIKE '%vital farme%'
ON CONFLICT (clinic_id, contact_number) DO NOTHING;

INSERT INTO seguimiento_auto_messages (clinic_id, contact_number, message_template, delay_minutes, is_active, is_automatic)
SELECT c.id, 5,
  'Hola {{nombre}}, este es nuestro último intento de contacto. Queremos que sepas que nuestras puertas siempre están abiertas para ti. Si en algún momento necesitas atención médica, estamos aquí. ¡Te deseamos lo mejor! 🙌',
  0, true, false
FROM clinics c WHERE c.name ILIKE '%vital farme%'
ON CONFLICT (clinic_id, contact_number) DO NOTHING;