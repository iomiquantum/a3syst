
CREATE TABLE IF NOT EXISTS seguimiento_strategies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_number INTEGER NOT NULL UNIQUE,
  strategy_name TEXT NOT NULL,
  strategy_description TEXT NOT NULL,
  psychological_principle TEXT NOT NULL,
  barrier_it_solves TEXT NOT NULL,
  prompt_instruction TEXT NOT NULL,
  rules TEXT NOT NULL
);

ALTER TABLE seguimiento_strategies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read strategies"
  ON seguimiento_strategies FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Super admin can manage strategies"
  ON seguimiento_strategies FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

INSERT INTO seguimiento_strategies (contact_number, strategy_name, strategy_description, psychological_principle, barrier_it_solves, prompt_instruction, rules) VALUES
(1, 'El toque invisible',
'Retomar el hilo exacto donde quedó la conversación con una pregunta natural',
'Efecto Zeigarnik — la mente quiere cerrar tareas incompletas',
'Se olvidó o se distrajo',
'Genera un mensaje que retome lo ÚLTIMO que se discutió. Haz una pregunta fácil de responder (opción A/B, o sí/no). Preséntate brevemente como {nombre_agente} de {negocio} SOLO en este primer contacto.',
'Siempre terminar con pregunta fácil. Máximo 2 oraciones. Presentarse solo en S1.'),

(2, 'El dato extra de valor',
'Ofrecer información nueva que NO se mencionó antes sobre el servicio que preguntó',
'Reciprocidad + Autoridad — dar valor primero, demostrar expertise',
'No tiene suficiente información para decidir',
'Comparte un beneficio o dato que NO se haya mencionado en la conversación. Algo que haga pensar ah eso no lo sabía. Termina con pregunta.',
'El dato debe ser REAL sobre el servicio. Nunca inventar beneficios. No repetir nada ya dicho.'),

(3, 'La prueba social sutil',
'Mencionar que otros pacientes ya tomaron la misma decisión',
'Prueba social + Unidad — otros como yo lo hacen, pertenezco al grupo',
'No sabe si es normal hacer esto',
'Menciona de forma natural que muchos pacientes agendan o consultan sobre lo mismo. Normaliza la acción. Termina con pregunta suave.',
'Decir muchos de nuestros pacientes NO mucha gente como tú. Nunca inventar números ni testimonios.'),

(4, 'La facilidad extrema',
'Eliminar toda fricción. Hacer que responder sea lo más fácil posible',
'Ley del mínimo esfuerzo + Compromiso — ya dio pasos previos',
'Le da pereza o el proceso le parece complicado',
'Ofrece encargarte de todo si solo dice sí. Hazlo sonar tan fácil que decir sí sea más fácil que ignorar.',
'La acción que pides debe ser de UNA sola palabra. Solo dime sí y yo me encargo de todo.'),

(5, 'La escasez honesta',
'Mencionar disponibilidad real de agenda',
'Escasez + Urgencia temporal — los espacios se llenan',
'No sabe cuándo ir o lo deja para después',
'Si tienes acceso a disponibilidad, menciona días y horarios concretos. Si no, pregunta qué día le funciona. Ofrece 2 opciones específicas.',
'Solo mencionar disponibilidad REAL. Nunca inventar escasez falsa.'),

(6, 'El cambio de ángulo',
'Sugerir un servicio diferente al que preguntó originalmente',
'Reencuadre — si cambias el ángulo, cambia la decisión',
'El servicio original no era el correcto para él/ella',
'Basándote en lo que preguntó, sugiere una alternativa: otro servicio, paquete, o valoración diferente. Abre una puerta nueva.',
'Solo sugerir servicios que el negocio ofrezca. Presentarlo como quizás esto también te sirve.'),

(7, 'El recordatorio empático',
'Reconocer que probablemente está ocupado/a. Empatía genuina sin pedir nada',
'Reciprocidad + Empatía — si soy amable, se inclina a responder',
'Se siente presionado por los mensajes anteriores',
'Muestra comprensión sin hacer ninguna pregunta ni pedir acción. Solo deja saber que la información sigue disponible.',
'NO hacer pregunta. NO pedir acción. Solo empatía pura. Máximo 2 oraciones cortas.'),

(8, 'La puerta siempre abierta',
'Cerrar el ciclo automático con dignidad. Devolver el control al paciente',
'Reactancia — devolver control genera más respuestas que presionar',
'Siente que perdió el control de la conversación',
'Transmite que le das seguimiento a todas las consultas pero que si ahora no es el momento aquí estarás siempre. Tono cálido sin revelar que es automatizado.',
'NUNCA decir mensaje automático ni bot ni sistema. Decir algo como le damos seguimiento a todas las consultas o aquí estaremos siempre. NO hacer pregunta.'),

(9, 'El toque humano',
'Mensaje de un agente real que se presenta como compañero/a del agente IA',
'Simpatía + Conexión humana — un humano real marca la diferencia',
'Necesita sentir que hay una persona real detrás',
'El agente se presenta con su nombre real y menciona al agente IA como compañero: Soy [nombre], mi compañera {nombre_agente} me compartió tu consulta sobre [servicio]. Ofrece ayuda personalizada.',
'El agente DEBE presentarse con su nombre. Debe mencionar al agente IA como compañera. Puede ofrecer llamada como alternativa al chat.'),

(10, 'La puerta abierta final',
'Cierre definitivo con algo de valor gratuito como regalo',
'Reciprocidad a largo plazo — la última impresión es la que queda',
'Se fue pero puede volver en el futuro',
'Respeta su tiempo. Ofrece algo de valor sin pedir nada: un tip de salud, un enlace útil, un recurso gratuito. Cierra con calidez.',
'NUNCA cerrar con culpa. Siempre cerrar DANDO algo. La última impresión define si vuelve en 6 meses.')

ON CONFLICT (contact_number) DO UPDATE SET 
  strategy_name = EXCLUDED.strategy_name,
  strategy_description = EXCLUDED.strategy_description,
  psychological_principle = EXCLUDED.psychological_principle,
  barrier_it_solves = EXCLUDED.barrier_it_solves,
  prompt_instruction = EXCLUDED.prompt_instruction,
  rules = EXCLUDED.rules;
