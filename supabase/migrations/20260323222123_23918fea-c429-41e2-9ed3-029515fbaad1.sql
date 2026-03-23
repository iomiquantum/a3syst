-- Actualizar estrategias de seguimiento para priorizar VALOR sobre VENTA
-- S1: Responder la duda pendiente + dar valor educativo
UPDATE seguimiento_strategies SET
  strategy_name = 'Respuesta de valor',
  strategy_description = 'Responder directamente la última duda del cliente con información educativa de calidad. Darle lo que vino a buscar.',
  psychological_principle = 'Reciprocidad + Autoridad — dar valor primero genera confianza y posiciona al negocio como experto genuino',
  barrier_it_solves = 'Tiene una duda sin resolver o necesita más información para decidir',
  prompt_instruction = 'Analiza el historial del chat e identifica la ÚLTIMA duda o tema de interés del cliente. Responde esa duda con información educativa REAL basada en los servicios y tratamientos del negocio. Comparte un dato útil, un beneficio poco conocido, o explica cómo funciona el proceso. Al final, de forma natural y NO forzada, menciona que puede agendar cuando quiera. NUNCA presiones para agendar. El objetivo es que el cliente piense: "esta clínica sabe de lo que habla y me quiere ayudar".',
  rules = 'Responder la duda real del cliente. Dar información educativa basada SOLO en los servicios reales. Máximo 3 oraciones. La sugerencia de agendar debe ser sutil al final, tipo "cuando quieras, aquí estamos". NUNCA inventar datos.'
WHERE contact_number = 1;

-- S2: Dato educativo nuevo que no se mencionó
UPDATE seguimiento_strategies SET
  strategy_name = 'Conocimiento que enamora',
  strategy_description = 'Compartir un dato educativo, científico o práctico sobre el tema de interés del cliente que NO se haya mencionado antes. Posicionar al negocio como fuente de conocimiento.',
  psychological_principle = 'Autoridad + Reciprocidad — compartir conocimiento gratuito genera deuda emocional positiva y confianza profunda',
  barrier_it_solves = 'No tiene suficiente información o contexto para valorar el servicio',
  prompt_instruction = 'Basándote en lo que el cliente preguntó, comparte un dato educativo, científico o práctico que NO se haya mencionado antes en la conversación. Algo que le haga pensar "no sabía eso, qué interesante". Puede ser sobre cómo funciona el tratamiento, qué resultados esperar, o un consejo de salud/bienestar relacionado. NO menciones agendar. Solo da valor puro. Termina con una pregunta abierta para que el cliente quiera saber más.',
  rules = 'El dato DEBE ser real y basado en los servicios del negocio. NUNCA inventar estudios ni estadísticas. NO mencionar agendar ni precios. Solo valor educativo. Máximo 3 oraciones. Terminar con pregunta abierta tipo "¿Te gustaría saber más sobre...?"'
WHERE contact_number = 2;

-- S3: Contextualizar el beneficio personal
UPDATE seguimiento_strategies SET
  strategy_name = 'Tu caso en particular',
  strategy_description = 'Conectar el servicio directamente con la situación específica del cliente. Hacerle sentir que la información es personalizada para él/ella.',
  psychological_principle = 'Personalización + Empatía — el cliente siente que le hablan a él, no a un número más',
  barrier_it_solves = 'Ve el servicio como algo genérico, no conectado a su necesidad real',
  prompt_instruction = 'Basándote en el contexto del chat (qué preguntó, qué síntomas o necesidades mencionó), explica cómo el servicio o tratamiento aplica ESPECÍFICAMENTE a su caso. Usa frases como "en tu caso...", "por lo que me comentas...". Hazle sentir que estás pensando en su situación particular. Al final, pregunta si tiene alguna otra duda. La idea de agendar puede mencionarse SOLO si fluye naturalmente, nunca forzada.',
  rules = 'Personalizar basándose en lo que el cliente dijo. NUNCA asumir síntomas ni diagnósticos que no haya mencionado. Máximo 3 oraciones. Si mencionas agendar, que sea tipo "si en algún momento quieres una valoración, con gusto te ayudamos".'
WHERE contact_number = 3;

-- S4: Facilitar el siguiente paso sin presión
UPDATE seguimiento_strategies SET
  strategy_name = 'La puerta abierta',
  strategy_description = 'Ofrecer ayuda directa sin presión. Hacer que dar el siguiente paso sea fácil y natural, no una decisión pesada.',
  psychological_principle = 'Ley del mínimo esfuerzo + Compromiso gradual — pequeños pasos llevan a decisiones grandes',
  barrier_it_solves = 'Quiere avanzar pero siente que es complicado o que lo van a presionar',
  prompt_instruction = 'Transmite que estás ahí para ayudar, no para vender. Ofrece resolver cualquier duda pendiente. Si el cliente ya recibió suficiente información, menciona que cuando se sienta listo puede agendar y tú te encargas de todo. El tono debe ser de servicio genuino: "solo quiero asegurarme de que tengas toda la información que necesitas". NUNCA menciones llamadas telefónicas — todo es por mensajes o citas presenciales.',
  rules = 'Tono de servicio, no de venta. Máximo 2 oraciones. Si el cliente ya tiene toda la info, una sugerencia suave de agendar. Si aún tiene dudas, ofrecer resolverlas. NUNCA presionar.'
WHERE contact_number = 4;

-- S5: Empatía pura (manual/humano)
UPDATE seguimiento_strategies SET
  strategy_name = 'Empatía genuina',
  strategy_description = 'Mensaje de empatía pura sin pedir nada. Reconocer que está ocupado/a y dejar claro que la información sigue disponible cuando quiera.',
  psychological_principle = 'Reciprocidad emocional + Respeto — dejar espacio genera confianza y elimina la sensación de acoso',
  barrier_it_solves = 'Se siente presionado por los mensajes anteriores',
  prompt_instruction = 'Muestra comprensión genuina sin hacer ninguna pregunta ni pedir acción. Reconoce que probablemente está ocupado/a. Solo deja saber que la información sigue disponible y que estás ahí cuando lo necesite. Tono cálido y humano.',
  rules = 'NO hacer pregunta. NO pedir acción. NO mencionar agendar. Solo empatía pura. Máximo 2 oraciones cortas.'
WHERE contact_number = 5;

-- S6: Cambio de ángulo (manual/humano)
UPDATE seguimiento_strategies SET
  strategy_name = 'Perspectiva nueva',
  strategy_description = 'Sugerir un ángulo diferente: otro servicio relacionado, un enfoque distinto, o información que pueda cambiar la perspectiva del cliente.',
  psychological_principle = 'Reencuadre cognitivo — si cambias el ángulo, cambias la decisión',
  barrier_it_solves = 'El servicio original no encajó o el cliente necesita ver otras opciones',
  prompt_instruction = 'Basándote en lo que preguntó, sugiere un enfoque diferente: otro servicio relacionado, una alternativa más accesible, o una valoración inicial. Presenta como "quizás también te pueda interesar..." o "otra opción que tenemos...". El objetivo es abrir una puerta nueva, no cerrar una venta.',
  rules = 'Solo sugerir servicios que el negocio ofrezca realmente. Tono de sugerencia amable. Máximo 2-3 oraciones.'
WHERE contact_number = 6;

-- S7 y S8: Mantener como están (recordatorio empático y cierre respetuoso)
UPDATE seguimiento_strategies SET
  strategy_name = 'Recordatorio cálido',
  strategy_description = 'Último mensaje amable recordando que estás disponible. Sin presión, con respeto por su tiempo.',
  prompt_instruction = 'Transmite que le diste seguimiento porque genuinamente quieres ayudar, pero que si ahora no es el momento, aquí estarás siempre. Tono cálido y respetuoso. Sin revelar que es un mensaje automatizado.',
  rules = 'Máximo 2 oraciones. Tono de despedida amable. NO presionar. Si quiere volver, será bienvenido/a.'
WHERE contact_number = 7;

UPDATE seguimiento_strategies SET
  strategy_name = 'Despedida con valor',
  strategy_description = 'Cierre final dejando un último consejo o dato útil. El cliente se va con buen sabor de boca.',
  prompt_instruction = 'Deja un último consejo práctico o dato útil relacionado con lo que preguntó. Despídete con calidez dejando la puerta abierta. El cliente debe irse pensando "qué buena atención, algún día vuelvo".',
  rules = 'Máximo 2 oraciones. Incluir un consejo útil real. Despedida cálida sin presión.'
WHERE contact_number = 8;