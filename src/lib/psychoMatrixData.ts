// ── Psycho-Matrix AI - Base de Conocimiento ──

export interface MatrixOption {
  id: string;
  label: string;
  description: string;
}

export const arquetiposDigitales: MatrixOption[] = [
  { id: "aspiracional", label: "El Aspiracional", description: "Motivado por estatus y transformación personal. Busca verse y sentirse mejor que los demás." },
  { id: "esceptico", label: "El Escéptico", description: "Necesita lógica, datos y pruebas. No confía en promesas vacías, quiere evidencia." },
  { id: "buscador_atajos", label: "El Buscador de Atajos", description: "Busca eficiencia y resultados rápidos. Quiere la solución más directa posible." },
  { id: "polemico", label: "El Polémico / Debatidor", description: "Se activa con el conflicto y la polémica. Responde a contenido provocador." },
  { id: "intelectual", label: "El Intelectual", description: "Valora el conocimiento profundo. Quiere entender el 'por qué' detrás de todo." },
  { id: "empatico", label: "El Empático", description: "Conecta emocionalmente. Toma decisiones basadas en sentimientos y conexión humana." },
];

export const arquetiposMarca: MatrixOption[] = [
  { id: "creador", label: "Creador", description: "Innovador, visionario. Crea cosas nuevas y únicas." },
  { id: "cuidador", label: "Cuidador", description: "Protector, compasivo. Cuida y nutre a los demás." },
  { id: "gobernante", label: "Gobernante", description: "Líder, autoritario. Proyecta control y exclusividad." },
  { id: "amante", label: "Amante", description: "Pasional, sensorial. Apela a la belleza y el placer." },
  { id: "bufon", label: "Bufón", description: "Divertido, irreverente. Usa el humor para conectar." },
  { id: "ciudadano", label: "Ciudadano", description: "Accesible, igualitario. Pertenencia y comunidad." },
  { id: "heroe", label: "Héroe", description: "Valiente, determinado. Supera obstáculos y desafíos." },
  { id: "rebelde", label: "Rebelde", description: "Disruptivo, rompe reglas. Desafía el status quo." },
  { id: "mago", label: "Mago", description: "Transformador, misterioso. Convierte sueños en realidad." },
  { id: "inocente", label: "Inocente", description: "Puro, optimista. Promete simplicidad y felicidad." },
  { id: "explorador", label: "Explorador", description: "Aventurero, libre. Busca descubrir y experimentar." },
  { id: "sabio", label: "Sabio", description: "Experto, conocedor. Comparte conocimiento y verdad." },
];

export const disparadoresPersuasion: MatrixOption[] = [
  { id: "escasez", label: "Escasez / Urgencia", description: "Crea presión temporal. 'Solo quedan 3 cupos' o 'Oferta termina hoy'." },
  { id: "autoridad", label: "Autoridad", description: "Posiciona al experto. Credenciales, certificaciones, años de experiencia." },
  { id: "prueba_social", label: "Prueba Social", description: "Testimonios, casos de éxito, números de clientes satisfechos." },
  { id: "reciprocidad", label: "Reciprocidad", description: "Da valor primero. Contenido gratuito que genera obligación de devolver." },
  { id: "enemigo_comun", label: "Enemigo Común", description: "'Nosotros vs Ellos'. Crea un enemigo común (industria, ignorancia, etc.)." },
  { id: "zeigarnik", label: "Efecto Zeigarnik", description: "Bucles abiertos. Deja historias incompletas que obligan a seguir leyendo." },
];

export const codigosGeneracionales: MatrixOption[] = [
  { id: "boomers", label: "Boomers", description: "Valoran seguridad, estatus y tradición. Responden a autoridad y estabilidad." },
  { id: "gen_x", label: "Generación X", description: "Independientes y lógicos. Escépticos pero leales cuando confían." },
  { id: "millennials", label: "Millennials", description: "Buscan experiencias y propósito. Valoran autenticidad y causas sociales." },
  { id: "gen_z", label: "Generación Z", description: "Autenticidad radical y caos creativo. Rechazan lo corporativo y tradicional." },
];

export const psicologiaAvanzada: MatrixOption[] = [
  { id: "reencuadre", label: "Gaslighting / Reencuadre", description: "Reformula la realidad del prospecto. Cambia su percepción del problema." },
  { id: "comandos_embebidos", label: "Comandos Embebidos (PNL)", description: "Comandos ocultos en el texto que el subconsciente procesa como instrucciones." },
  { id: "deseo_mimetico", label: "Deseo Mimético", description: "Deseo por imitación. 'Si ellos lo tienen, yo también lo quiero'." },
  { id: "efecto_barnum", label: "Efecto Barnum", description: "Afirmaciones vagas que parecen personalizadas. 'Sé que has sentido esto...'." },
  { id: "modelo_bite", label: "Modelo BITE (Dinámicas de Culto)", description: "Control de Conducta, Información, Pensamiento, Emoción. Crea pertenencia extrema." },
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
