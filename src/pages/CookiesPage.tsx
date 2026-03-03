import LegalPageLayout from "@/components/legal/LegalPageLayout";

const DATE = "3 de marzo de 2026";
const EMAIL = "soporte@a3syst.com";

const toc = [
  { id: "que-son", label: "1. ¿Qué son las cookies?" },
  { id: "que-usamos", label: "2. Cookies que usamos" },
  { id: "control", label: "3. Cómo controlar las cookies" },
  { id: "contacto", label: "4. Contacto" },
];

const CookiesPage = () => (
  <LegalPageLayout title="Política de Cookies de A3syst" lastUpdated={DATE} toc={toc}>
    <section id="que-son">
      <h2>1. ¿Qué Son las Cookies?</h2>
      <p>Las cookies son pequeños archivos de texto que se almacenan en tu navegador cuando visitas un sitio web.</p>
    </section><hr />
    <section id="que-usamos">
      <h2>2. Cookies que Usamos</h2>
      <h3>2.1 Cookies Estrictamente Necesarias (no requieren consentimiento):</h3>
      <ul>
        <li>Cookies de sesión: para mantener tu sesión iniciada</li>
        <li>Cookies de seguridad: para proteger contra CSRF</li>
        <li>Cookies de preferencias: idioma, tema oscuro/claro</li>
      </ul>
      <h3>2.2 Cookies Analíticas (opcionales):</h3>
      <ul>
        <li>Para entender cómo se usa la plataforma</li>
        <li>Para detectar y corregir errores</li>
        <li>No se comparten con terceros</li>
      </ul>
      <p><strong>NO</strong> usamos:</p>
      <ul>
        <li>Cookies de publicidad</li>
        <li>Cookies de seguimiento entre sitios</li>
        <li>Cookies de terceros para publicidad dirigida</li>
      </ul>
    </section><hr />
    <section id="control">
      <h2>3. Cómo Controlar las Cookies</h2>
      <ul>
        <li>Puedes configurar tu navegador para rechazar cookies</li>
        <li>Ten en cuenta que sin cookies necesarias, la plataforma no funcionará correctamente</li>
        <li>En tu configuración de a3syst puedes gestionar las cookies analíticas</li>
      </ul>
    </section><hr />
    <section id="contacto">
      <h2>4. Contacto</h2>
      <p>Para preguntas: <a href={`mailto:${EMAIL}`}>{EMAIL}</a></p>
    </section>
  </LegalPageLayout>
);

export default CookiesPage;