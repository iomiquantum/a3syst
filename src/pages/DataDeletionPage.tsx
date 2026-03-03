import LegalPageLayout from "@/components/legal/LegalPageLayout";

const DATE = "3 de marzo de 2026";
const EMAIL = "soporte@a3syst.com";

const toc = [
  { id: "opciones", label: "Opciones de eliminación" },
  { id: "que-se-elimina", label: "Qué datos se eliminan" },
  { id: "que-no", label: "Qué datos no podemos eliminar" },
  { id: "plazo", label: "Plazo de eliminación" },
  { id: "confirmacion", label: "Confirmación" },
];

const DataDeletionPage = () => (
  <LegalPageLayout title="Instrucciones de Eliminación de Datos" lastUpdated={DATE} toc={toc}>
    <p className="text-lg font-medium text-gray-900">A3syst respeta tu derecho a eliminar tus datos.</p>
    <p>Si deseas eliminar los datos que a3syst tiene sobre ti o tu negocio, tienes varias opciones:</p>

    <section id="opciones">
      <h2>Opciones de Eliminación</h2>

      <h3>Opción 1: Desde la Plataforma (Recomendado)</h3>
      <ol>
        <li>Inicia sesión en tu cuenta de a3syst</li>
        <li>Ve a Configuración → Mi Cuenta</li>
        <li>Click en "Desconectar Redes Sociales" para eliminar tokens y datos de conexión</li>
        <li>Para eliminar tu cuenta completa: Click en "Eliminar mi cuenta"</li>
        <li>Confirma la eliminación</li>
      </ol>

      <h3>Opción 2: Desde Facebook</h3>
      <ol>
        <li>Ve a tu Facebook → Configuración y Privacidad → Configuración</li>
        <li>Ve a "Apps y sitios web"</li>
        <li>Busca "a3syst" y click en "Eliminar"</li>
        <li>Esto revoca nuestro acceso y nos notifica para eliminar tus datos</li>
      </ol>

      <h3>Opción 3: Por Email</h3>
      <p>Envía un email a <a href={`mailto:${EMAIL}`}>{EMAIL}</a> con:</p>
      <ul>
        <li>Asunto: "Solicitud de Eliminación de Datos"</li>
        <li>Tu nombre y email de la cuenta</li>
        <li>Nombre del negocio registrado</li>
      </ul>
      <p>Procesaremos tu solicitud en un máximo de 15 días hábiles.</p>
    </section>

    <hr />

    <section id="que-se-elimina">
      <h2>¿Qué Datos se Eliminan?</h2>
      <ul>
        <li>Información de tu cuenta (nombre, email, teléfono)</li>
        <li>Datos de tu negocio</li>
        <li>Tokens de acceso de redes sociales</li>
        <li>Historial de publicaciones realizadas desde a3syst</li>
        <li>Datos de pacientes/clientes que hayas ingresado</li>
        <li>Configuraciones y preferencias</li>
      </ul>
    </section>

    <hr />

    <section id="que-no">
      <h2>¿Qué Datos NO Podemos Eliminar?</h2>
      <ul>
        <li>Publicaciones que ya fueron publicadas en Facebook/Instagram (esas viven en las plataformas de Meta, debes eliminarlas directamente ahí)</li>
        <li>Logs de seguridad requeridos por ley (se eliminan automáticamente después de 12 meses)</li>
      </ul>
    </section>

    <hr />

    <section id="plazo">
      <h2>Plazo de Eliminación</h2>
      <ul>
        <li>Datos de conexión de redes sociales: <strong>inmediato</strong></li>
        <li>Datos de cuenta: <strong>máximo 48 horas</strong></li>
        <li>Datos completos del negocio: <strong>máximo 30 días</strong></li>
        <li>Respaldos: se purgan en el siguiente ciclo de respaldo (<strong>máximo 30 días</strong>)</li>
      </ul>
    </section>

    <hr />

    <section id="confirmacion">
      <h2>Confirmación</h2>
      <p>Te enviaremos un email confirmando la eliminación completa de tus datos.</p>
      <p>Para preguntas: <a href={`mailto:${EMAIL}`}>{EMAIL}</a></p>
    </section>
  </LegalPageLayout>
);

export default DataDeletionPage;