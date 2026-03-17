// ── Psycho-Matrix AI - Base de Conocimiento ──

export interface MatrixOption {
  id: string;
  label: string;
  description: string;
  example: string;
}

export const arquetiposDigitales: MatrixOption[] = [
  { id: "aspiracional", label: "El Aspiracional", description: "Motivado por estatus y transformación personal. Busca verse y sentirse mejor que los demás.", example: "\"Quiero el tratamiento que usan las famosas\"" },
  { id: "esceptico", label: "El Escéptico", description: "Necesita lógica, datos y pruebas. No confía en promesas vacías, quiere evidencia.", example: "\"¿Tienen estudios clínicos que respalden esto?\"" },
  { id: "buscador_atajos", label: "El Buscador de Atajos", description: "Busca eficiencia y resultados rápidos. Quiere la solución más directa posible.", example: "\"¿Cuál es el tratamiento más rápido y efectivo?\"" },
  { id: "polemico", label: "El Polémico / Debatidor", description: "Se activa con el conflicto y la polémica. Responde a contenido provocador.", example: "\"Todos los dentistas cobran de más por lo mismo\"" },
  { id: "intelectual", label: "El Intelectual", description: "Valora el conocimiento profundo. Quiere entender el 'por qué' detrás de todo.", example: "\"Explícame la ciencia detrás del procedimiento\"" },
  { id: "empatico", label: "El Empático", description: "Conecta emocionalmente. Toma decisiones basadas en sentimientos y conexión humana.", example: "\"Vi el testimonio de María y me conmovió su historia\"" },
];

export const arquetiposMarca: MatrixOption[] = [
  { id: "creador", label: "Creador", description: "Innovador, visionario. Crea cosas nuevas y únicas.", example: "\"Somos pioneros en esta técnica exclusiva\"" },
  { id: "cuidador", label: "Cuidador", description: "Protector, compasivo. Cuida y nutre a los demás.", example: "\"Tu bienestar es nuestra prioridad número uno\"" },
  { id: "gobernante", label: "Gobernante", description: "Líder, autoritario. Proyecta control y exclusividad.", example: "\"La negocio #1 elegida por ejecutivos\"" },
  { id: "amante", label: "Amante", description: "Pasional, sensorial. Apela a la belleza y el placer.", example: "\"Redescubre la versión más bella de ti\"" },
  { id: "bufon", label: "Bufón", description: "Divertido, irreverente. Usa el humor para conectar.", example: "\"Tu sonrisa perfecta sin drama 😄\"" },
  { id: "ciudadano", label: "Ciudadano", description: "Accesible, igualitario. Pertenencia y comunidad.", example: "\"Salud dental de calidad para todas las familias\"" },
  { id: "heroe", label: "Héroe", description: "Valiente, determinado. Supera obstáculos y desafíos.", example: "\"Supera tu miedo al dentista de una vez\"" },
  { id: "rebelde", label: "Rebelde", description: "Disruptivo, rompe reglas. Desafía el status quo.", example: "\"Olvida todo lo que te dijeron sobre ortodoncia\"" },
  { id: "mago", label: "Mago", description: "Transformador, misterioso. Convierte sueños en realidad.", example: "\"Transformamos sonrisas en solo 1 sesión\"" },
  { id: "inocente", label: "Inocente", description: "Puro, optimista. Promete simplicidad y felicidad.", example: "\"Sonreír nunca fue tan fácil y natural\"" },
  { id: "explorador", label: "Explorador", description: "Aventurero, libre. Busca descubrir y experimentar.", example: "\"Descubre lo último en estética dental\"" },
  { id: "sabio", label: "Sabio", description: "Experto, conocedor. Comparte conocimiento y verdad.", example: "\"Lo que la ciencia dice sobre los implantes\"" },
];

export const disparadoresPersuasion: MatrixOption[] = [
  { id: "escasez", label: "Escasez / Urgencia", description: "Crea presión temporal. 'Solo quedan 3 cupos' o 'Oferta termina hoy'.", example: "\"Últimos 5 cupos con precio especial este mes\"" },
  { id: "autoridad", label: "Autoridad", description: "Posiciona al experto. Credenciales, certificaciones, años de experiencia.", example: "\"15 años de experiencia y +3,000 casos exitosos\"" },
  { id: "prueba_social", label: "Prueba Social", description: "Testimonios, casos de éxito, números de clientes satisfechos.", example: "\"Mira el antes/después de Ana – caso real\"" },
  { id: "reciprocidad", label: "Reciprocidad", description: "Da valor primero. Contenido gratuito que genera obligación de devolver.", example: "\"Descarga gratis nuestra guía de cuidado dental\"" },
  { id: "enemigo_comun", label: "Enemigo Común", description: "'Nosotros vs Ellos'. Crea un enemigo común (industria, ignorancia, etc.).", example: "\"Las negocios low-cost no te dicen esto...\"" },
  { id: "zeigarnik", label: "Efecto Zeigarnik", description: "Bucles abiertos. Deja historias incompletas que obligan a seguir leyendo.", example: "\"Lo que pasó después de su tratamiento te sorprenderá...\"" },
];

export const codigosGeneracionales: MatrixOption[] = [
  { id: "boomers", label: "Boomers", description: "Valoran seguridad, estatus y tradición. Responden a autoridad y estabilidad.", example: "\"Confíe en 30 años de trayectoria profesional\"" },
  { id: "gen_x", label: "Generación X", description: "Independientes y lógicos. Escépticos pero leales cuando confían.", example: "\"Sin letra chica. Precios claros, resultados reales\"" },
  { id: "millennials", label: "Millennials", description: "Buscan experiencias y propósito. Valoran autenticidad y causas sociales.", example: "\"Tu tratamiento incluye una donación a fundación dental\"" },
  { id: "gen_z", label: "Generación Z", description: "Autenticidad radical y caos creativo. Rechazan lo corporativo y tradicional.", example: "\"POV: cuando tu dentista es más cool que tu influencer favorito 💀\"" },
];

export const psicologiaAvanzada: MatrixOption[] = [
  { id: "reencuadre", label: "Gaslighting / Reencuadre", description: "Reformula la realidad del prospecto. Cambia su percepción del problema.", example: "\"No es caro, caro es vivir con dolor cada día\"" },
  { id: "comandos_embebidos", label: "Comandos Embebidos (PNL)", description: "Comandos ocultos en el texto que el subconsciente procesa como instrucciones.", example: "\"Imagina cómo te SENTIRÁS cuando veas tu nueva sonrisa\"" },
  { id: "deseo_mimetico", label: "Deseo Mimético", description: "Deseo por imitación. 'Si ellos lo tienen, yo también lo quiero'.", example: "\"El tratamiento favorito de nuestras pacientes VIP\"" },
  { id: "efecto_barnum", label: "Efecto Barnum", description: "Afirmaciones vagas que parecen personalizadas. 'Sé que has sentido esto...'.", example: "\"Sé que llevas tiempo pensando en mejorar tu sonrisa...\"" },
  { id: "modelo_bite", label: "Modelo BITE (Dinámicas de Culto)", description: "Control de Conducta, Información, Pensamiento, Emoción. Crea pertenencia extrema.", example: "\"Únete a nuestra comunidad exclusiva de sonrisas perfectas\"" },
];

// ── PNL: Canales de Representación Sensorial (VAK) ──
export interface VAKOption {
  id: string;
  label: string;
  channels: string[];
  description: string;
  languagePatterns: string;
  example: string;
}

export const canalsPNL: VAKOption[] = [
  // Canales puros
  {
    id: "visual",
    label: "👁️ Visual",
    channels: ["visual"],
    description: "Persona que procesa el mundo a través de imágenes. Usa palabras como 'ver', 'brillante', 'claro', 'enfoque', 'perspectiva'. Responde mejor a contenido con colores vivos, antes/después, infografías.",
    languagePatterns: "Ver, mirar, brillante, claro, oscuro, iluminar, enfocar, perspectiva, imagen, panorama, a primera vista, punto de vista",
    example: "\"¿Ves la diferencia? MIRA cómo tu sonrisa BRILLARÁ con un tono más claro y luminoso\"",
  },
  {
    id: "auditivo",
    label: "👂 Auditivo",
    channels: ["auditivo"],
    description: "Persona que procesa a través de sonidos y palabras. Usa términos como 'escuchar', 'suena bien', 'armonía', 'resonar', 'diálogo'. Responde a testimonios hablados, podcasts, explicaciones detalladas.",
    languagePatterns: "Escuchar, sonar, decir, hablar, armonía, resonar, silencio, ritmo, tono, sintonizar, me suena, hacer eco",
    example: "\"ESCUCHA lo que dicen nuestros pacientes. ¿Te SUENA familiar esa molestia? Te CONTAMOS cómo resolverla\"",
  },
  {
    id: "kinestesico",
    label: "✋ Kinestésico",
    channels: ["kinestésico"],
    description: "Persona que procesa a través de sensaciones y emociones. Usa palabras como 'sentir', 'tocar', 'cálido', 'presión', 'suave'. Responde a experiencias táctiles, emociones, confort.",
    languagePatterns: "Sentir, tocar, cálido, frío, suave, presión, agarrar, abrazar, pesado, ligero, me late, caer en cuenta",
    example: "\"SIENTE la suavidad de tu nueva piel. Esa CALIDEZ que te abraza cuando te miras al espejo\"",
  },
  // Combinaciones duales
  {
    id: "visual_auditivo",
    label: "👁️👂 Visual + Auditivo",
    channels: ["visual", "auditivo"],
    description: "Persona que combina imágenes con palabras. Necesita VER y ESCUCHAR para convencerse. Ideal para videos con narración, carousels con copy explicativo, webinars visuales.",
    languagePatterns: "Mira lo que te digo, ¿ves lo que quiero decir?, escucha y observa, suena claro, perspectiva sonora",
    example: "\"MIRA los resultados y ESCUCHA lo que dice Ana sobre su experiencia. ¿Ves la diferencia? Te CONTAMOS el secreto\"",
  },
  {
    id: "visual_kinestesico",
    label: "👁️✋ Visual + Kinestésico",
    channels: ["visual", "kinestésico"],
    description: "Persona que necesita VER la transformación y SENTIR la emoción. Responde a antes/después emocionales, experiencias inmersivas, imágenes que evocan sensaciones.",
    languagePatterns: "Mira cómo se siente, ¿ves esa sensación?, imagen cálida, vista que abraza, perspectiva tangible",
    example: "\"MIRA tu reflejo y SIENTE la confianza de una sonrisa perfecta. ¿VES esa CALIDEZ en tu mirada?\"",
  },
  {
    id: "auditivo_kinestesico",
    label: "👂✋ Auditivo + Kinestésico",
    channels: ["auditivo", "kinestésico"],
    description: "Persona que necesita ESCUCHAR testimonios y SENTIR la conexión emocional. Responde a historias narradas con carga emocional, podcasts emotivos, voicenotes personales.",
    languagePatterns: "Escucha lo que sientes, ¿te suena esa sensación?, tono cálido, resonancia emocional, ritmo suave",
    example: "\"ESCUCHA cómo María describe la SENSACIÓN de volver a sonreír sin dolor. ¿SIENTES esa tranquilidad?\"",
  },
  {
    id: "auditivo_visual",
    label: "👂👁️ Auditivo + Visual",
    channels: ["auditivo", "visual"],
    description: "Persona que primero ESCUCHA y luego necesita VER la prueba. El audio abre la puerta y la imagen cierra. Ideal para reels con voz en off + resultado visual.",
    languagePatterns: "Te cuento lo que vas a ver, escucha y mira, suena brillante, diálogo claro, armonía visual",
    example: "\"Te CUENTO algo: cuando VEAS los resultados, vas a entender por qué todos HABLAN de este tratamiento\"",
  },
  {
    id: "kinestesico_visual",
    label: "✋👁️ Kinestésico + Visual",
    channels: ["kinestésico", "visual"],
    description: "Persona que primero SIENTE y luego busca VER la evidencia. La emoción abre y la imagen confirma. Ideal para storytelling emocional con cierre visual impactante.",
    languagePatterns: "Siente y mira, toca y observa, esa sensación brillante, calidez que se ve, abrazo visual",
    example: "\"SIENTE esa emoción cuando te MIRAS al espejo y VES la versión más radiante de ti\"",
  },
  {
    id: "kinestesico_auditivo",
    label: "✋👂 Kinestésico + Auditivo",
    channels: ["kinestésico", "auditivo"],
    description: "Persona que primero SIENTE y luego necesita ESCUCHAR validación. La emoción conecta y el testimonio hablado confirma. Ideal para historias con narración emotiva.",
    languagePatterns: "Siente lo que dicen, toca esa armonía, sensación que resuena, calidez en el tono, emoción hablada",
    example: "\"SIENTE esa emoción y ESCUCHA las palabras de quienes ya vivieron esta transformación\"",
  },
  // Triple combinación
  {
    id: "vak_completo",
    label: "👁️👂✋ VAK Completo",
    channels: ["visual", "auditivo", "kinestésico"],
    description: "Estrategia que ataca los 3 canales sensoriales simultáneamente. Máximo impacto pero requiere contenido multimedia rico: video con narración + imágenes + carga emocional.",
    languagePatterns: "Mira, escucha y siente. Ve lo que digo y siente la diferencia. Imagen, palabra y emoción fusionadas",
    example: "\"MIRA los resultados, ESCUCHA los testimonios y SIENTE la transformación en tu propia piel\"",
  },
];

export function construirPrompt(
  servicio: { name: string; core_benefit: string; price?: number; observations?: string },
  arquetipo: string,
  vozMarca: string,
  disparador: string,
  generacion: string,
  tecAvanzada?: string,
  customNotes?: string,
  canalPNL?: string
): string {
  // If only custom notes (no categories selected), use them as the full prompt
  if (customNotes && !arquetipo && !vozMarca && !disparador && !generacion) {
    return `Estrategia personalizada para "${servicio.name}" (beneficio: "${servicio.core_benefit}"):\n\n${customNotes}`;
  }

  let base = `Actúa como un copywriter de clase mundial usando el arquetipo de marca "${vozMarca}". Vende "${servicio.name}" a una audiencia ${generacion} que se comporta como "${arquetipo}". Usa la técnica de persuasión "${disparador}" para convencerlos. El beneficio principal es: "${servicio.core_benefit}".`;
  
  if (servicio.price && servicio.price > 0) {
    base += ` El precio del servicio es $${servicio.price}.`;
  }
  if (servicio.observations) {
    base += ` Observaciones del servicio: "${servicio.observations}".`;
  }
  if (canalPNL) {
    const vakOption = canalsPNL.find(c => c.id === canalPNL);
    if (vakOption) {
      base += `\n\nCANAL SENSORIAL PNL (${vakOption.label}): ${vakOption.description}\nPatrones lingüísticos a usar: ${vakOption.languagePatterns}\nEjemplo de aplicación: ${vakOption.example}\nIMPORTANTE: Todo el copy debe estar escrito usando predominantemente predicados y lenguaje del canal ${vakOption.channels.join(" + ")} para conectar con el sistema representacional del prospecto.`;
    }
  }
  if (tecAvanzada) {
    base += ` Aplica la técnica psicológica avanzada "${tecAvanzada}" en el cierre.`;
  }
  if (customNotes) {
    base += `\n\nINSTRUCCIONES PERSONALIZADAS ADICIONALES: ${customNotes}`;
  }
  return base;
}
