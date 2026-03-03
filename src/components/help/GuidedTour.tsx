import Joyride, { CallBackProps, STATUS, Step } from "react-joyride";

interface GuidedTourProps {
  run: boolean;
  onFinish: () => void;
}

const steps: Step[] = [
  {
    target: "body",
    placement: "center",
    disableBeacon: true,
    title: "🎓 ¡Tour completo de A3syst!",
    content: "Te voy a mostrar toda la app en 2 minutos. Puedes saltar en cualquier momento.",
  },
  {
    target: "nav",
    placement: "right",
    title: "📌 Navegación",
    content: "Desde aquí navegas a todo. Los AUTOPILOTOS trabajan solos, GESTIÓN es tu administración.",
  },
  {
    target: "[data-tour='command-center']",
    placement: "bottom",
    title: "🏠 Command Center",
    content: "Tu pantalla principal. Revísala 3 veces al día: mañana, mediodía y tarde.",
  },
  {
    target: "[data-tour='approvals']",
    placement: "bottom",
    title: "✅ Aprobaciones",
    content: "Aquí la IA te pide permiso. Aprueba o rechaza con un click.",
  },
  {
    target: "[data-tour='kpis']",
    placement: "top",
    title: "📊 KPIs del día",
    content: "Tus métricas del día en un vistazo. Haz click en cualquiera para más detalle.",
  },
  {
    target: "body",
    placement: "center",
    title: "🤖 Tus 8 Autopilotos",
    content:
      "• Mensajes — IA responde 24/7\n• Agenda — confirma citas\n• CRM — mueve leads\n• Marketing — genera contenido\n• Contenido — crea posts\n• Ads — lanza campañas\n• Ventas — registra ingresos\n• Psycho-Matrix — estrategia con psicología",
  },
  {
    target: "body",
    placement: "center",
    title: "⏰ Tu rutina diaria",
    content:
      "8AM → 20 min: revisa Command Center y aprueba.\n1PM → 10 min: revisa mensajes escalados.\n6PM → 10 min: revisa KPIs del día.\n\n= 40 minutos total para gestionar tu negocio.",
  },
  {
    target: "body",
    placement: "center",
    title: "🚀 5 pasos para empezar",
    content:
      "1. Agrega tus Pacientes\n2. Configura tu Agenda\n3. Genera Contenido con IA\n4. Crea estrategias en Psycho-Matrix\n5. Lanza tu primer Ad con $2/día",
  },
  {
    target: "body",
    placement: "center",
    title: "🎉 ¡Listo!",
    content: "Ya conoces toda la app. Haz click en el botón (?) en cualquier módulo cuando tengas dudas. ¡Éxito!",
  },
];

const tourStyles = {
  options: {
    zIndex: 10000,
    arrowColor: "rgba(13,13,26,0.95)",
    backgroundColor: "rgba(13,13,26,0.95)",
    overlayColor: "rgba(0,0,0,0.7)",
    textColor: "rgba(255,255,255,0.85)",
    primaryColor: "#8B5CF6",
  },
  tooltipContainer: {
    textAlign: "left" as const,
  },
  tooltipTitle: {
    fontSize: "1.1rem",
    fontWeight: 700,
    color: "#fff",
    marginBottom: 4,
  },
  tooltipContent: {
    fontSize: "0.875rem",
    lineHeight: 1.6,
    whiteSpace: "pre-line" as const,
  },
  buttonNext: {
    backgroundColor: "#8B5CF6",
    borderRadius: 8,
    fontSize: "0.85rem",
    padding: "8px 18px",
  },
  buttonBack: {
    color: "rgba(255,255,255,0.5)",
    fontSize: "0.85rem",
  },
  buttonSkip: {
    color: "rgba(255,255,255,0.4)",
    fontSize: "0.8rem",
  },
  spotlight: {
    borderRadius: 12,
    boxShadow: "0 0 0 4px rgba(139,92,246,0.4), 0 0 30px rgba(139,92,246,0.2)",
  },
  tooltip: {
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.1)",
    backdropFilter: "blur(20px)",
  },
};

const GuidedTour = ({ run, onFinish }: GuidedTourProps) => {
  const handleCallback = (data: CallBackProps) => {
    const { status } = data;
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      onFinish();
    }
  };

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      showSkipButton
      showProgress
      scrollToFirstStep
      disableOverlayClose
      callback={handleCallback}
      styles={tourStyles}
      locale={{
        back: "Anterior",
        close: "Cerrar",
        last: "¡Finalizar!",
        next: "Siguiente",
        skip: "Saltar",
      }}
    />
  );
};

export default GuidedTour;
