
-- Fix S4: Don't mention "llamada" when communicating via messages
UPDATE seguimiento_strategies 
SET prompt_instruction = 'Ofrece encargarte de todo si solo dice "sí". Hazlo sonar tan fácil que decir "sí" sea más fácil que ignorar. NUNCA menciones "agendar una llamada" — el canal de comunicación es por mensajes, ofrece agendar una CITA o resolver dudas por este mismo medio.',
    rules = 'La acción que pides debe ser de UNA sola palabra. "Solo dime sí y yo me encargo de todo." NUNCA sugieras llamadas telefónicas ni videollamadas — todo se maneja por mensajes o citas presenciales.'
WHERE contact_number = 4;

-- Fix S5: Only mention days, not specific times
UPDATE seguimiento_strategies 
SET prompt_instruction = 'Menciona que quedan pocos cupos disponibles esta semana. Ofrece opciones de DÍAS (ej. "lunes o miércoles") pero NUNCA menciones horarios específicos. Si el cliente muestra interés, ahí sí se le puede preguntar qué horario le conviene.',
    rules = 'NUNCA inventar número exacto de cupos (no decir "quedan 2 cupos"). Decir "pocos cupos" o "espacios limitados". Ofrecer solo DÍAS disponibles, NUNCA horarios específicos. No inventar escasez falsa.'
WHERE contact_number = 5;
