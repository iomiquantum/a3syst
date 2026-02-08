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
  { id: "gobernante", label: "Gobernante", description: "Líder, autoritario. Proyecta control y exclusividad.", example: "\"La clínica #1 elegida por ejecutivos\"" },
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
  { id: "enemigo_comun", label: "Enemigo Común", description: "'Nosotros vs Ellos'. Crea un enemigo común (industria, ignorancia, etc.).", example: "\"Las clínicas low-cost no te dicen esto...\"" },
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

export function construirPrompt(
  servicio: { name: string; core_benefit: string },
  arquetipo: string,
  vozMarca: string,
  disparador: string,
  generacion: string,
  tecAvanzada?: string
): string {
  const base = `Actúa como un copywriter de clase mundial usando el arquetipo de marca "${vozMarca}". Vende "${servicio.name}" a una audiencia ${generacion} que se comporta como "${arquetipo}". Usa la técnica de persuasión "${disparador}" para convencerlos. El beneficio principal es: "${servicio.core_benefit}".`;
  if (tecAvanzada) {
    return `${base} Aplica la técnica psicológica avanzada "${tecAvanzada}" en el cierre.`;
  }
  return base;
}
