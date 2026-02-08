// ── Psycho-Matrix AI Knowledge Base ──

export interface MatrixOption {
  id: string;
  label: string;
  description: string;
  icon?: string;
}

export const digitalArchetypes: MatrixOption[] = [
  { id: "aspirational", label: "The Aspirational", description: "Motivado por estatus y transformación personal. Busca verse y sentirse mejor que los demás." },
  { id: "skeptic", label: "The Skeptic", description: "Necesita lógica, datos y pruebas. No confía en promesas vacías, quiere evidencia." },
  { id: "shortcut_seeker", label: "The Shortcut Seeker", description: "Busca eficiencia y resultados rápidos. Quiere la solución más directa posible." },
  { id: "hater_debater", label: "The Hater/Debater", description: "Se activa con el conflicto y la polémica. Responde a contenido provocador." },
  { id: "intellectual", label: "The Intellectual", description: "Valora el conocimiento profundo. Quiere entender el 'por qué' detrás de todo." },
  { id: "empath", label: "The Empath", description: "Conecta emocionalmente. Toma decisiones basadas en sentimientos y conexión humana." },
];

export const brandArchetypes: MatrixOption[] = [
  { id: "creator", label: "Creator", description: "Innovador, visionario. Crea cosas nuevas y únicas." },
  { id: "caregiver", label: "Caregiver", description: "Protector, compasivo. Cuida y nutre a los demás." },
  { id: "ruler", label: "Ruler", description: "Líder, autoritario. Proyecta control y exclusividad." },
  { id: "lover", label: "Lover", description: "Pasional, sensorial. Apela a la belleza y el placer." },
  { id: "jester", label: "Jester", description: "Divertido, irreverente. Usa el humor para conectar." },
  { id: "citizen", label: "Citizen", description: "Accesible, igualitario. Pertenencia y comunidad." },
  { id: "hero", label: "Hero", description: "Valiente, determinado. Supera obstáculos y desafíos." },
  { id: "rebel", label: "Rebel", description: "Disruptivo, rompe reglas. Desafía el status quo." },
  { id: "magician", label: "Magician", description: "Transformador, misterioso. Convierte sueños en realidad." },
  { id: "innocent", label: "Innocent", description: "Puro, optimista. Promete simplicidad y felicidad." },
  { id: "explorer", label: "Explorer", description: "Aventurero, libre. Busca descubrir y experimentar." },
  { id: "sage", label: "Sage", description: "Sabio, experto. Comparte conocimiento y verdad." },
];

export const persuasionTriggers: MatrixOption[] = [
  { id: "scarcity", label: "Scarcity / Urgency", description: "Crea presión temporal. 'Solo quedan 3 cupos' o 'Oferta termina hoy'." },
  { id: "authority", label: "Authority", description: "Posiciona al experto. Credenciales, certificaciones, años de experiencia." },
  { id: "social_proof", label: "Social Proof", description: "Testimonios, casos de éxito, números de clientes satisfechos." },
  { id: "reciprocity", label: "Reciprocity", description: "Da valor primero. Contenido gratuito que genera obligación de devolver." },
  { id: "enemy_commonality", label: "Enemy Commonality", description: "'Nosotros vs Ellos'. Crea un enemigo común (industria, ignorancia, etc.)." },
  { id: "zeigarnik", label: "Zeigarnik Effect", description: "Open loops. Deja historias incompletas que obligan a seguir leyendo." },
];

export const generationalCodes: MatrixOption[] = [
  { id: "boomers", label: "Boomers", description: "Valoran seguridad, estatus y tradición. Responden a autoridad y estabilidad." },
  { id: "gen_x", label: "Gen X", description: "Independientes y lógicos. Escépticos pero leales cuando confían." },
  { id: "millennials", label: "Millennials", description: "Buscan experiencias y propósito. Valoran autenticidad y causas sociales." },
  { id: "gen_z", label: "Gen Z", description: "Autenticidad radical y caos creativo. Rechazan lo corporativo y tradicional." },
];

export const advancedPsychology: MatrixOption[] = [
  { id: "reframing", label: "Gaslighting / Reframing", description: "Reformula la realidad del prospecto. Cambia su percepción del problema." },
  { id: "embedded_commands", label: "Embedded Commands (NLP)", description: "Comandos ocultos en el texto que el subconsciente procesa como instrucciones." },
  { id: "mimetic_desire", label: "Mimetic Desire", description: "Deseo por imitación. 'Si ellos lo tienen, yo también lo quiero'." },
  { id: "barnum_effect", label: "Barnum Effect", description: "Afirmaciones vagas que parecen personalizadas. 'Sé que has sentido esto...'." },
  { id: "bite_model", label: "BITE Model (Cult Dynamics)", description: "Control de Behavior, Information, Thought, Emotion. Crea pertenencia extrema." },
];

export function buildPrompt(
  service: { name: string; core_benefit: string },
  archetype: string,
  brandVoice: string,
  trigger: string,
  generation: string,
  advancedTech?: string
): string {
  const base = `Act as a world-class copywriter using the "${brandVoice}" archetype. Sell "${service.name}" to a ${generation} audience who behaves like "${archetype}". Use the "${trigger}" persuasion technique to convince them. The core benefit is: "${service.core_benefit}".`;
  if (advancedTech) {
    return `${base} Apply the "${advancedTech}" advanced psychological technique in the closing.`;
  }
  return base;
}
