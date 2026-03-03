import LegalPageLayout from "@/components/legal/LegalPageLayout";

const DATE = "3 de marzo de 2026";
const EMAIL = "soporte@a3syst.com";

const toc = [
  { id: "permitidos", label: "Usos permitidos" },
  { id: "prohibidos", label: "Usos prohibidos" },
  { id: "consecuencias", label: "Consecuencias" },
  { id: "reportar", label: "Reportar" },
];

const AcceptableUsePage = () => (
  <LegalPageLayout title="Política de Uso Aceptable de A3syst" lastUpdated={DATE} toc={toc}>
    <p>Esta política describe lo que está y no está permitido al usar a3syst.</p>

    <section id="permitidos">
      <h2>Usos Permitidos</h2>
      <ul>
        <li>✅ Gestionar tu negocio de bienestar legítimo</li>
        <li>✅ Publicar contenido profesional y relevante en tus redes sociales</li>
        <li>✅ Almacenar datos de tus clientes con su consentimiento</li>
        <li>✅ Usar las herramientas de IA para generar sugerencias de contenido</li>
        <li>✅ Programar publicaciones dentro de límites razonables</li>
        <li>✅ Crear campañas de marketing para tu negocio</li>
      </ul>
    </section>

    <hr />

    <section id="prohibidos">
      <h2>Usos Prohibidos</h2>
      <ul>
        <li>❌ Spam: publicar contenido repetitivo o no solicitado masivamente</li>
        <li>❌ Contenido ilegal, difamatorio, discriminatorio o engañoso</li>
        <li>❌ Intentar acceder a datos de otros negocios en la plataforma</li>
        <li>❌ Usar la plataforma para actividades fraudulentas</li>
        <li>❌ Publicar contenido que viole derechos de autor de terceros</li>
        <li>❌ Realizar scraping o extracción masiva de datos</li>
        <li>❌ Intentar vulnerar la seguridad de la plataforma</li>
        <li>❌ Compartir credenciales de acceso con personas no autorizadas</li>
        <li>❌ Usar bots o automatizaciones externas no autorizadas</li>
        <li>❌ Revender el servicio sin autorización</li>
        <li>❌ Publicar contenido médico falso o peligroso</li>
        <li>❌ Almacenar datos de clientes sin su consentimiento</li>
      </ul>
    </section>

    <hr />

    <section id="consecuencias">
      <h2>Consecuencias</h2>
      <ul>
        <li><strong>Primera violación:</strong> Advertencia por email</li>
        <li><strong>Segunda violación:</strong> Suspensión temporal de la cuenta (72 horas)</li>
        <li><strong>Violaciones graves o repetidas:</strong> Terminación permanente de la cuenta</li>
      </ul>
    </section>

    <hr />

    <section id="reportar">
      <h2>Reportar un Uso Indebido</h2>
      <p>Para reportar un uso indebido: <a href={`mailto:${EMAIL}`}>{EMAIL}</a></p>
    </section>
  </LegalPageLayout>
);

export default AcceptableUsePage;