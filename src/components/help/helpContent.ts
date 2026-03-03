export interface HelpModule {
  emoji: string;
  title: string;
  description: string;
  steps: string[];
  tips: string[];
}

export const helpContentByRoute: Record<string, HelpModule> = {
  "/dashboard": {
    emoji: "🏠",
    title: "Command Center",
    description: "Es tu pantalla principal. La IA te muestra todo lo que pasó y lo que necesita tu aprobación.",
    steps: [
      "Revisa las tarjetas rojas de arriba — son cosas que necesitan tu aprobación",
      "Haz click en ✅ para aprobar o ❌ para rechazar",
      "Los números de abajo son tus métricas del día — haz click en cualquiera para ir al detalle",
      "Revísalo 3 veces al día: mañana, mediodía y tarde",
    ],
    tips: [
      "Si todo dice '✅ Todo al día', significa que la IA tiene todo bajo control. ¡Disfruta tu tiempo!",
    ],
  },
  "/pacientes": {
    emoji: "👥",
    title: "Pacientes",
    description: "Aquí están todos tus pacientes con su historial de citas y ventas.",
    steps: [
      "Haz click en '+ Nuevo paciente' para agregar uno",
      "Usa la barra de búsqueda para encontrar un paciente por nombre",
      "Haz click en un paciente para ver su historial completo",
      "Los badges de color te dicen si es Activo (verde), Irregular (amarillo) o Inactivo (rojo)",
    ],
    tips: [
      "Los pacientes inactivos son oportunidad de venta. La IA puede enviarles una oferta de reactivación.",
    ],
  },
  "/agenda": {
    emoji: "📅",
    title: "Autopilot de Agenda",
    description: "Tu calendario de citas. La IA confirma y recuerda automáticamente.",
    steps: [
      "Las tarjetas de arriba son citas pendientes — confirma o cancela con un click",
      "Haz click en un espacio vacío del calendario para crear una cita nueva",
      "Cuando una cita se completa, te ofrece registrar la venta automáticamente",
      "Usa los filtros para ver por profesional o por día/semana/mes",
    ],
    tips: [
      "Cuando completas una cita, siempre registra la venta — así tus métricas de ingresos se actualizan en tiempo real.",
    ],
  },
  "/ventas": {
    emoji: "💰",
    title: "Autopilot de Ventas",
    description: "Aquí ves todos tus ingresos, ventas pendientes y métricas de facturación.",
    steps: [
      "Los 4 números de arriba son tus KPIs: ingresos del mes, ventas hoy, pendientes y ticket promedio",
      "Haz click en '+ Nueva venta' para registrar una manualmente",
      "Al seleccionar un tratamiento, el precio se llena automáticamente",
      "Filtra por fecha, status o método de pago para encontrar ventas específicas",
    ],
    tips: [
      "La forma más rápida de registrar ventas es desde la Agenda: completa la cita y la venta se registra en un solo paso.",
    ],
  },
  "/mensajes": {
    emoji: "🤖",
    title: "Autopilot de Mensajes",
    description: "La IA responde mensajes de WhatsApp e Instagram 24/7. Aquí ves todas las conversaciones.",
    steps: [
      "A la izquierda están todas las conversaciones — haz click en una para abrirla",
      "Las burbujas violetas son respuestas de la IA (🤖), las azules son tuyas (👤)",
      "Si quieres responder tú mismo, escribe abajo y envía",
      "Usa el toggle de Autopilot ON/OFF para activar o desactivar la IA por conversación",
    ],
    tips: [
      "La pestaña 'Escalados' muestra conversaciones donde la IA no supo qué responder y necesitan tu atención humana.",
    ],
  },
  "/crm": {
    emoji: "📊",
    title: "Autopilot de CRM",
    description: "Tu pipeline de leads. Organiza contactos desde que llegan hasta que se convierten en pacientes.",
    steps: [
      "Cada columna es una etapa: Nuevo → Contactado → Interesado → Cita → Convertido",
      "ARRASTRA las tarjetas de una columna a otra para mover el lead de etapa",
      "Haz click en un contacto para ver su detalle y acciones",
      "Usa el botón 'Convertir a paciente' cuando un lead agenda y paga",
    ],
    tips: [
      "La IA mueve leads automáticamente basándose en sus interacciones. Si un lead no responde en 14 días, se marca como 'Perdido'.",
    ],
  },
  "/marketing": {
    emoji: "🎨",
    title: "Autopilot de Contenido",
    description: "La IA genera posts completos para tus redes sociales. Tú solo apruebas.",
    steps: [
      "Haz click en '✨ Crear contenido con IA'",
      "Elige: plataforma → tipo de contenido → personaliza → la IA genera todo",
      "Edita si quieres, o aprueba directo con ✅",
      "Usa '📅 Generar para la semana' para crear 7 posts de una vez",
    ],
    tips: [
      "Los posts aprobados también aparecen en el Command Center. Puedes aprobar desde ahí sin entrar a este módulo.",
    ],
  },
  "/contenido": {
    emoji: "🎨",
    title: "Autopilot de Contenido",
    description: "La IA genera posts completos para tus redes sociales. Tú solo apruebas.",
    steps: [
      "Haz click en '✨ Crear contenido con IA'",
      "Elige: plataforma → tipo de contenido → personaliza → la IA genera todo",
      "Edita si quieres, o aprueba directo con ✅",
      "Usa '📅 Generar para la semana' para crear 7 posts de una vez",
    ],
    tips: [
      "Los posts aprobados también aparecen en el Command Center. Puedes aprobar desde ahí sin entrar a este módulo.",
    ],
  },
  "/ads": {
    emoji: "🚀",
    title: "Motor Cuántico de Ads",
    description: "Crea campañas de publicidad pagada en paralelo. La IA prueba varias y encuentra la ganadora.",
    steps: [
      "Haz click en '🚀 Lanzar Motor Cuántico' para crear tu primera campaña",
      "Solo 3 pasos: elige objetivo → elige presupuesto ($2/día mínimo) → la IA crea 3 campañas",
      "Los carriles de colores muestran qué campaña va ganando (verde = mejor)",
      "Aprueba las sugerencias de la IA para optimizar automáticamente",
    ],
    tips: [
      "Con solo $2/día ($60/mes) tienes publicidad profesional 24/7. La IA encuentra la mejor estrategia probando en paralelo.",
    ],
  },
  "/psycho-matrix": {
    emoji: "🧠",
    title: "Psycho-Matrix",
    description: "Analiza tus servicios con psicología de persuasión y genera estrategias de marketing únicas.",
    steps: [
      "Elige un servicio/tratamiento de la lista",
      "Haz click en 'Generar análisis' — la IA analiza con psicología de persuasión",
      "Te genera estrategias con arquetipos de cliente (Explorador, Gobernante, Cuidador...)",
      "Haz click en 'Crear contenido con esta estrategia' para generar un post basado en ella",
    ],
    tips: [
      "Cada estrategia usa un trigger diferente (escasez, prueba social, aspiración). Prueba varias y ve cuál conecta más con tu audiencia.",
    ],
  },
  "/analytics": {
    emoji: "📈",
    title: "Analytics Inteligente",
    description: "No solo gráficos — la IA te da INSIGHTS y recomendaciones en texto claro.",
    steps: [
      "Lee los insights de arriba — la IA te dice qué está pasando en tu negocio",
      "Los gráficos muestran tendencias de ingresos, citas, leads y pipeline",
      "Abajo ves el rendimiento de cada autopiloto",
    ],
    tips: [
      "Revisa Analytics una vez por semana para entender qué funciona y qué ajustar.",
    ],
  },
  "/configuracion/agente-ia": {
    emoji: "⚙️",
    title: "Configuración del Agente IA",
    description: "Personaliza cómo se comportan tus autopilotos.",
    steps: [
      "Cambia el nombre y tono de tu agente de IA (cómo se presenta a los pacientes)",
      "Edita el saludo inicial que envía a nuevos contactos",
      "Activa o desactiva cada autopiloto individualmente",
      "Guarda los cambios al final de cada sección",
    ],
    tips: [
      "El tono 'Amigable' funciona mejor para la mayoría de negocios de bienestar.",
    ],
  },
  "/configuracion/tratamientos": {
    emoji: "💊",
    title: "Tratamientos",
    description: "Administra los servicios que ofrece tu negocio.",
    steps: [
      "Haz click en '+ Nuevo tratamiento' para agregar un servicio",
      "Llena nombre, duración y precio",
      "Usa '✨ Generar con IA' para que sugiera servicios según tu tipo de negocio",
      "Edita o elimina los que ya no ofrezcas",
    ],
    tips: [
      "Estos tratamientos aparecen en Agenda (al crear cita), Ventas (al registrar venta) y Contenido (al crear posts de promoción). Mantenlos actualizados.",
    ],
  },
  "/configuracion/profesionales": {
    emoji: "👨‍⚕️",
    title: "Profesionales",
    description: "Tu equipo de trabajo.",
    steps: [
      "Agrega cada profesional con nombre, email y especialidad",
      "Activa o desactiva según estén disponibles",
      "Los profesionales aparecen como opción al crear citas en la Agenda",
    ],
    tips: [],
  },
  "/configuracion/sucursales": {
    emoji: "🏢",
    title: "Sucursales",
    description: "Si tienes más de una ubicación, adminístralas aquí.",
    steps: [
      "Agrega cada sucursal con nombre, dirección y teléfono",
      "La sucursal principal se configura en el onboarding",
    ],
    tips: [],
  },
  "/mi-cuenta": {
    emoji: "👤",
    title: "Mi Cuenta",
    description: "Administra tu perfil personal y contraseña.",
    steps: [
      "Actualiza tu nombre completo",
      "Cambia tu contraseña si lo necesitas",
      "Los cambios se guardan al hacer click en 'Guardar'",
    ],
    tips: [],
  },
};

export function getHelpForRoute(pathname: string): HelpModule | null {
  // Exact match first
  if (helpContentByRoute[pathname]) return helpContentByRoute[pathname];
  // Try prefix match for nested routes
  const keys = Object.keys(helpContentByRoute).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    if (pathname.startsWith(key)) return helpContentByRoute[key];
  }
  return null;
}
