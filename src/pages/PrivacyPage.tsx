import LegalPageLayout from "@/components/legal/LegalPageLayout";

const DATE = "3 de marzo de 2026";
const EMAIL = "soporte@a3syst.com";
const ADDR = "Quito, Ecuador";

const toc = [
  { id: "intro", label: "1. Introducción" },
  { id: "info", label: "2. Información que recopilamos" },
  { id: "uso", label: "3. Cómo usamos tu información" },
  { id: "meta", label: "4. Integración con Meta" },
  { id: "seguridad", label: "5. Almacenamiento y seguridad" },
  { id: "comparticion", label: "6. Compartición de datos" },
  { id: "derechos", label: "7. Tus derechos" },
  { id: "retencion", label: "8. Retención de datos" },
  { id: "menores", label: "9. Menores de edad" },
  { id: "cambios", label: "10. Cambios a esta política" },
  { id: "contacto", label: "11. Contacto" },
  { id: "ley", label: "12. Ley aplicable" },
];

const PrivacyPage = () => (
  <LegalPageLayout title="Política de Privacidad de A3syst" lastUpdated={DATE} toc={toc}>
    <section id="intro">
      <h2>1. Introducción</h2>
      <p>a3syst ("nosotros", "nuestro" o "la Plataforma") es un servicio de software (SaaS) que proporciona herramientas de gestión, automatización y marketing digital para negocios de bienestar incluyendo clínicas, spas, salones y consultorios. Esta Política de Privacidad describe cómo recopilamos, usamos, almacenamos y protegemos tu información personal.</p>
      <p>Operamos bajo las leyes de la República del Ecuador, incluyendo la Ley Orgánica de Protección de Datos Personales (LOPDP).</p>
    </section>

    <hr />

    <section id="info">
      <h2>2. Información que Recopilamos</h2>
      <h3>2.1 Información que nos proporcionas directamente:</h3>
      <ul>
        <li>Datos de registro: nombre, email, teléfono, nombre del negocio</li>
        <li>Datos del negocio: dirección, tipo de servicio, horarios de atención</li>
        <li>Datos de pacientes/clientes que tú ingresas en la plataforma</li>
        <li>Contenido que creas: publicaciones, imágenes, textos de marketing</li>
      </ul>
      <h3>2.2 Información de plataformas conectadas:</h3>
      <ul>
        <li>Al conectar Facebook: Page ID, Page Access Token, nombre de la página</li>
        <li>Al conectar Instagram: Instagram Business Account ID, nombre de la cuenta</li>
        <li><strong>NO</strong> almacenamos tu contraseña de Facebook ni de Instagram</li>
        <li><strong>NO</strong> accedemos a tus mensajes privados de Facebook ni Instagram</li>
        <li><strong>NO</strong> accedemos a los datos personales de tus seguidores</li>
      </ul>
      <h3>2.3 Información recopilada automáticamente:</h3>
      <ul>
        <li>Dirección IP y ubicación aproximada</li>
        <li>Tipo de navegador y dispositivo</li>
        <li>Páginas visitadas dentro de a3syst y tiempo de uso</li>
        <li>Cookies técnicas necesarias para el funcionamiento</li>
      </ul>
    </section>

    <hr />

    <section id="uso">
      <h2>3. Cómo Usamos tu Información</h2>
      <p>Usamos tu información exclusivamente para:</p>
      <ul>
        <li>Proporcionar y mantener el servicio de a3syst</li>
        <li>Publicar contenido en tus redes sociales cuando TÚ lo solicitas</li>
        <li>Generar recomendaciones de marketing personalizadas con IA</li>
        <li>Enviar notificaciones sobre el estado de tu cuenta y servicio</li>
        <li>Mejorar la plataforma y corregir errores</li>
        <li>Cumplir con obligaciones legales</li>
      </ul>
      <p><strong>NUNCA</strong> usamos tu información para:</p>
      <ul>
        <li>Vender a terceros</li>
        <li>Publicidad dirigida hacia ti o tus clientes</li>
        <li>Compartir con otras empresas sin tu consentimiento</li>
        <li>Propósitos que no estén directamente relacionados con el servicio</li>
      </ul>
    </section>

    <hr />

    <section id="meta">
      <h2>4. Integración con Meta (Facebook e Instagram)</h2>
      <h3>4.1 Datos que obtenemos de Meta:</h3>
      <ul>
        <li>ID de tu Página de Facebook y/o cuenta de Instagram Business</li>
        <li>Token de acceso para publicar en tu nombre (encriptado en nuestra base de datos)</li>
        <li>Métricas públicas de tus publicaciones (likes, comentarios, alcance)</li>
      </ul>
      <h3>4.2 Cómo usamos los datos de Meta:</h3>
      <ul>
        <li>Publicar contenido que TÚ apruebas en tu Página/cuenta</li>
        <li>Mostrar métricas de rendimiento de tus publicaciones</li>
        <li>Programar publicaciones para fechas futuras que TÚ defines</li>
      </ul>
      <h3>4.3 Datos que NO recopilamos de Meta:</h3>
      <ul>
        <li>Información personal de tus seguidores o fans</li>
        <li>Mensajes privados (Messenger o Instagram Direct)</li>
        <li>Lista de amigos de tu perfil personal</li>
        <li>Información de grupos de Facebook</li>
        <li>Datos de pago o financieros de tu cuenta de Meta</li>
      </ul>
      <h3>4.4 Almacenamiento de tokens de Meta:</h3>
      <ul>
        <li>Los tokens de acceso se almacenan encriptados en nuestra base de datos</li>
        <li>Solo se usan para las acciones que tú autorizas</li>
        <li>Puedes revocar el acceso en cualquier momento desde tu configuración</li>
      </ul>
    </section>

    <hr />

    <section id="seguridad">
      <h2>5. Almacenamiento y Seguridad</h2>
      <ul>
        <li>Tus datos se almacenan en servidores seguros con infraestructura de Amazon Web Services</li>
        <li>Utilizamos encriptación en tránsito (TLS/SSL) y en reposo</li>
        <li>Los tokens de acceso de redes sociales se almacenan encriptados</li>
        <li>Implementamos Row Level Security (RLS) para que ningún negocio pueda acceder a datos de otro negocio</li>
        <li>Realizamos respaldos automáticos periódicos</li>
      </ul>
    </section>

    <hr />

    <section id="comparticion">
      <h2>6. Compartición de Datos</h2>
      <p><strong>NO</strong> compartimos tus datos personales con terceros excepto:</p>
      <ul>
        <li>Proveedores de infraestructura necesarios para operar el servicio</li>
        <li>Meta/Facebook para publicaciones cuando tú lo autorizas</li>
        <li>Cuando sea requerido por ley o autoridad competente ecuatoriana</li>
        <li>Con tu consentimiento explícito</li>
      </ul>
    </section>

    <hr />

    <section id="derechos">
      <h2>7. Tus Derechos (Según LOPDP de Ecuador)</h2>
      <p>Tienes derecho a:</p>
      <ul>
        <li>Acceder a tus datos personales almacenados</li>
        <li>Rectificar datos incorrectos o desactualizados</li>
        <li>Eliminar tus datos (ver <a href="/data-deletion">Política de Eliminación de Datos</a>)</li>
        <li>Oponerte al tratamiento de tus datos</li>
        <li>Portabilidad: solicitar tus datos en formato legible</li>
        <li>Revocar tu consentimiento en cualquier momento</li>
      </ul>
      <p>Para ejercer estos derechos, contacta: <a href={`mailto:${EMAIL}`}>{EMAIL}</a></p>
    </section>

    <hr />

    <section id="retencion">
      <h2>8. Retención de Datos</h2>
      <ul>
        <li>Datos de cuenta: mientras tu cuenta esté activa</li>
        <li>Datos de publicaciones: mientras estén en la plataforma</li>
        <li>Tokens de Meta: hasta que los revoques o desconectes</li>
        <li>Logs de actividad: máximo 12 meses</li>
        <li>Después de eliminar tu cuenta: eliminamos todos tus datos en un plazo máximo de 30 días</li>
      </ul>
    </section>

    <hr />

    <section id="menores">
      <h2>9. Menores de Edad</h2>
      <p>a3syst es un servicio para negocios (B2B). No está diseñado para ser usado por menores de 18 años. No recopilamos intencionalmente datos de menores.</p>
    </section>

    <hr />

    <section id="cambios">
      <h2>10. Cambios a esta Política</h2>
      <p>Nos reservamos el derecho de actualizar esta política. Te notificaremos por email y/o dentro de la plataforma sobre cambios significativos con al menos 15 días de anticipación.</p>
    </section>

    <hr />

    <section id="contacto">
      <h2>11. Contacto</h2>
      <p>Para preguntas sobre esta política:</p>
      <ul>
        <li>Email: <a href={`mailto:${EMAIL}`}>{EMAIL}</a></li>
        <li>Dirección: {ADDR}</li>
      </ul>
    </section>

    <hr />

    <section id="ley">
      <h2>12. Ley Aplicable</h2>
      <p>Esta política se rige por las leyes de la República del Ecuador, especialmente la Ley Orgánica de Protección de Datos Personales (LOPDP).</p>
    </section>
  </LegalPageLayout>
);

export default PrivacyPage;