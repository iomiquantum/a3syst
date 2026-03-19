export type PipelineTab =
  | "resueltos_ia"
  | "seguimiento_c1"
  | "seguimiento_c2"
  | "seguimiento_c3"
  | "no_responden"
  | "no_interesado"
  | "escalados"
  | "clientes";

export interface MockConversation {
  id: string;
  contactName: string;
  contactPhone: string;
  channel: "whatsapp" | "web" | "instagram" | "facebook";
  pipelineTab: PipelineTab;
  lastMessage: string;
  lastMessageAt: string;
  tags: string[];
  seguimientoContactNumber: number;
  seguimientoIsRecurrente: boolean;
  seguimientoRecurrenteCount: number;
  autopilotActive: boolean;
}

const now = Date.now();
const min = (m: number) => new Date(now - m * 60 * 1000).toISOString();
const hr = (h: number) => new Date(now - h * 3600 * 1000).toISOString();
const day = (d: number) => new Date(now - d * 86400 * 1000).toISOString();

export const MOCK_CONVERSATIONS: MockConversation[] = [
  // 5 resueltos_ia
  { id: "mc-1", contactName: "María López", contactPhone: "+593 98 765 4321", channel: "whatsapp", pipelineTab: "resueltos_ia", lastMessage: "Gracias por la información, voy a revisar los horarios.", lastMessageAt: min(5), tags: ["Medicina general", "Primera vez"], seguimientoContactNumber: 0, seguimientoIsRecurrente: false, seguimientoRecurrenteCount: 0, autopilotActive: true },
  { id: "mc-2", contactName: "Carlos Medina", contactPhone: "+593 99 111 2233", channel: "whatsapp", pipelineTab: "resueltos_ia", lastMessage: "Perfecto, ya tengo la dirección. Gracias!", lastMessageAt: min(22), tags: ["Odontología"], seguimientoContactNumber: 0, seguimientoIsRecurrente: false, seguimientoRecurrenteCount: 0, autopilotActive: true },
  { id: "mc-3", contactName: "Ana Suárez", contactPhone: "+593 96 444 5566", channel: "web", pipelineTab: "resueltos_ia", lastMessage: "Ok entendido, voy a agendar por la web.", lastMessageAt: hr(1), tags: ["Dermatología", "VIP"], seguimientoContactNumber: 0, seguimientoIsRecurrente: false, seguimientoRecurrenteCount: 0, autopilotActive: true },
  { id: "mc-4", contactName: "Pedro Gómez", contactPhone: "+593 97 222 3344", channel: "whatsapp", pipelineTab: "resueltos_ia", lastMessage: "Listo, ya me quedó claro el precio del tratamiento.", lastMessageAt: hr(3), tags: ["Nutrición"], seguimientoContactNumber: 0, seguimientoIsRecurrente: false, seguimientoRecurrenteCount: 0, autopilotActive: true },
  { id: "mc-5", contactName: "Lucía Fernández", contactPhone: "+593 98 333 4455", channel: "whatsapp", pipelineTab: "resueltos_ia", lastMessage: "Muchas gracias! Quedo atenta.", lastMessageAt: hr(5), tags: ["Medicina general", "Recurrente"], seguimientoContactNumber: 0, seguimientoIsRecurrente: false, seguimientoRecurrenteCount: 0, autopilotActive: true },

  // 3 seguimiento_c1
  { id: "mc-6", contactName: "Roberto Díaz", contactPhone: "+593 99 555 6677", channel: "whatsapp", pipelineTab: "seguimiento_c1", lastMessage: "Hola, quería saber los precios de limpieza dental", lastMessageAt: hr(8), tags: ["Odontología", "Primera vez"], seguimientoContactNumber: 1, seguimientoIsRecurrente: false, seguimientoRecurrenteCount: 0, autopilotActive: true },
  { id: "mc-7", contactName: "Diana Torres", contactPhone: "+593 96 777 8899", channel: "whatsapp", pipelineTab: "seguimiento_c1", lastMessage: "Me interesa la consulta de nutrición", lastMessageAt: hr(12), tags: ["Nutrición"], seguimientoContactNumber: 1, seguimientoIsRecurrente: false, seguimientoRecurrenteCount: 0, autopilotActive: true },
  { id: "mc-8", contactName: "Fernando Ruiz", contactPhone: "+593 98 999 0011", channel: "web", pipelineTab: "seguimiento_c1", lastMessage: "Quisiera agendar una cita para esta semana", lastMessageAt: hr(18), tags: ["Dermatología"], seguimientoContactNumber: 1, seguimientoIsRecurrente: false, seguimientoRecurrenteCount: 0, autopilotActive: true },

  // 2 seguimiento_c2
  { id: "mc-9", contactName: "Gabriela Ponce", contactPhone: "+593 97 123 4567", channel: "whatsapp", pipelineTab: "seguimiento_c2", lastMessage: "Todavía estoy pensando, gracias", lastMessageAt: day(1), tags: ["Medicina general"], seguimientoContactNumber: 2, seguimientoIsRecurrente: false, seguimientoRecurrenteCount: 0, autopilotActive: true },
  { id: "mc-10", contactName: "Andrés Villacís", contactPhone: "+593 99 234 5678", channel: "whatsapp", pipelineTab: "seguimiento_c2", lastMessage: "Déjeme revisar mi agenda y le confirmo", lastMessageAt: day(1.5), tags: ["Odontología", "VIP"], seguimientoContactNumber: 2, seguimientoIsRecurrente: false, seguimientoRecurrenteCount: 0, autopilotActive: true },

  // 1 seguimiento_c3
  { id: "mc-11", contactName: "Sofía Morales", contactPhone: "+593 96 345 6789", channel: "whatsapp", pipelineTab: "seguimiento_c3", lastMessage: "Sí sí, esta semana le confirmo", lastMessageAt: day(3), tags: ["Nutrición", "Recurrente"], seguimientoContactNumber: 3, seguimientoIsRecurrente: false, seguimientoRecurrenteCount: 0, autopilotActive: true },

  // 2 no_responden (1 recurrente)
  { id: "mc-12", contactName: "Miguel Ángel Paredes", contactPhone: "+593 98 456 7890", channel: "whatsapp", pipelineTab: "no_responden", lastMessage: "Hola! Le escribimos de la clínica...", lastMessageAt: day(5), tags: ["Dermatología"], seguimientoContactNumber: 3, seguimientoIsRecurrente: true, seguimientoRecurrenteCount: 2, autopilotActive: false },
  { id: "mc-13", contactName: "Valeria Cárdenas", contactPhone: "+593 97 567 8901", channel: "whatsapp", pipelineTab: "no_responden", lastMessage: "Buenos días, queríamos confirmar su cita...", lastMessageAt: day(4), tags: ["Medicina general", "Primera vez"], seguimientoContactNumber: 3, seguimientoIsRecurrente: false, seguimientoRecurrenteCount: 0, autopilotActive: false },

  // 2 no_interesado
  { id: "mc-14", contactName: "Jorge Salazar", contactPhone: "+593 99 678 9012", channel: "web", pipelineTab: "no_interesado", lastMessage: "No gracias, ya encontré otro lugar.", lastMessageAt: day(2), tags: ["Odontología"], seguimientoContactNumber: 0, seguimientoIsRecurrente: false, seguimientoRecurrenteCount: 0, autopilotActive: false },
  { id: "mc-15", contactName: "Patricia Herrera", contactPhone: "+593 96 789 0123", channel: "whatsapp", pipelineTab: "no_interesado", lastMessage: "Por ahora no me interesa, gracias.", lastMessageAt: day(3), tags: ["Nutrición"], seguimientoContactNumber: 0, seguimientoIsRecurrente: false, seguimientoRecurrenteCount: 0, autopilotActive: false },

  // 1 escalados
  { id: "mc-16", contactName: "Ricardo Espinoza", contactPhone: "+593 98 890 1234", channel: "whatsapp", pipelineTab: "escalados", lastMessage: "Necesito hablar con alguien urgente sobre mi tratamiento", lastMessageAt: min(15), tags: ["Dermatología", "VIP"], seguimientoContactNumber: 0, seguimientoIsRecurrente: false, seguimientoRecurrenteCount: 0, autopilotActive: false },

  // 3 clientes
  { id: "mc-17", contactName: "Carmen Aguirre", contactPhone: "+593 97 901 2345", channel: "whatsapp", pipelineTab: "clientes", lastMessage: "Excelente atención, muchas gracias!", lastMessageAt: hr(2), tags: ["Medicina general", "Recurrente", "VIP"], seguimientoContactNumber: 0, seguimientoIsRecurrente: false, seguimientoRecurrenteCount: 0, autopilotActive: true },
  { id: "mc-18", contactName: "Luis Mendoza", contactPhone: "+593 99 012 3456", channel: "whatsapp", pipelineTab: "clientes", lastMessage: "Ya agendé mi próxima cita, gracias.", lastMessageAt: day(1), tags: ["Odontología", "Recurrente"], seguimientoContactNumber: 0, seguimientoIsRecurrente: false, seguimientoRecurrenteCount: 0, autopilotActive: true },
  { id: "mc-19", contactName: "Elena Bustamante", contactPhone: "+593 96 123 4568", channel: "web", pipelineTab: "clientes", lastMessage: "Todo perfecto con mi tratamiento.", lastMessageAt: day(2), tags: ["Nutrición"], seguimientoContactNumber: 0, seguimientoIsRecurrente: false, seguimientoRecurrenteCount: 0, autopilotActive: true },
];

export const MOCK_MESSAGES: Record<string, { id: string; direction: "inbound" | "outbound"; content: string; sender: "contact" | "ai" | "human"; time: string }[]> = {
  "mc-1": [
    { id: "mm-1-1", direction: "inbound", content: "Hola, quisiera saber los horarios de atención", sender: "contact", time: min(30) },
    { id: "mm-1-2", direction: "outbound", content: "¡Hola María! 👋 Nuestro horario de atención es de lunes a viernes de 9:00 a 18:00. ¿Te gustaría agendar una cita?", sender: "ai", time: min(29) },
    { id: "mm-1-3", direction: "inbound", content: "Gracias por la información, voy a revisar los horarios.", sender: "contact", time: min(5) },
  ],
  "mc-16": [
    { id: "mm-16-1", direction: "inbound", content: "Hola buenas tardes", sender: "contact", time: min(25) },
    { id: "mm-16-2", direction: "outbound", content: "¡Hola Ricardo! ¿En qué puedo ayudarte?", sender: "ai", time: min(24) },
    { id: "mm-16-3", direction: "inbound", content: "Necesito hablar con alguien urgente sobre mi tratamiento", sender: "contact", time: min(15) },
    { id: "mm-16-4", direction: "outbound", content: "Entiendo tu preocupación. Permíteme conectarte con un asesor humano de inmediato.", sender: "ai", time: min(14) },
  ],
};

export const ALL_TAGS = ["Medicina general", "Nutrición", "Dermatología", "Odontología", "Primera vez", "Recurrente", "VIP"];
