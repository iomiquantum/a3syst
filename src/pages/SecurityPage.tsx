import LegalPageLayout from "@/components/legal/LegalPageLayout";

const DATE = "3 de marzo de 2026";
const EMAIL = "soporte@a3syst.com";

const toc = [
  { id: "encriptacion", label: "Encriptación" },
  { id: "infraestructura", label: "Infraestructura" },
  { id: "aislamiento", label: "Aislamiento de datos" },
  { id: "autenticacion", label: "Autenticación" },
  { id: "cumplimiento", label: "Cumplimiento" },
  { id: "vulnerabilidades", label: "Reportar vulnerabilidades" },
];

const SecurityPage = () => (
  <LegalPageLayout title="Seguridad y Protección de Datos en A3syst" lastUpdated={DATE} toc={toc}>
    <p className="text-lg font-medium text-gray-900">Tu seguridad y la de tus datos es nuestra prioridad.</p>

    <section id="encriptacion">
      <h2>🔒 Encriptación</h2>
      <ul>
        <li>Todas las comunicaciones usan TLS/SSL (HTTPS)</li>
        <li>Tokens de acceso de redes sociales almacenados con encriptación</li>
        <li>Contraseñas hasheadas con algoritmos seguros (bcrypt)</li>
      </ul>
    </section><hr />

    <section id="infraestructura">
      <h2>🏗️ Infraestructura</h2>
      <ul>
        <li>Base de datos alojada en infraestructura AWS</li>
        <li>Respaldos automáticos diarios</li>
        <li>Monitoreo continuo de la plataforma</li>
      </ul>
    </section><hr />

    <section id="aislamiento">
      <h2>🔐 Aislamiento de Datos</h2>
      <ul>
        <li>Row Level Security (RLS): cada negocio solo ve sus propios datos</li>
        <li>Tokens y credenciales aislados por negocio</li>
        <li>Ningún negocio puede acceder a datos de otro</li>
      </ul>
    </section><hr />

    <section id="autenticacion">
      <h2>👤 Autenticación</h2>
      <ul>
        <li>Sistema de autenticación seguro</li>
        <li>Sesiones con expiración automática</li>
        <li>Soporte para recuperación segura de contraseña</li>
      </ul>
    </section><hr />

    <section id="cumplimiento">
      <h2>📋 Cumplimiento</h2>
      <ul>
        <li>Ley Orgánica de Protección de Datos Personales (LOPDP) de Ecuador</li>
        <li>Políticas de Plataforma de Meta (Facebook/Instagram)</li>
        <li>Mejores prácticas de seguridad OWASP</li>
      </ul>
    </section><hr />

    <section id="vulnerabilidades">
      <h2>🔔 Reportar Vulnerabilidades</h2>
      <p>Si descubres una vulnerabilidad de seguridad, por favor reporta responsablemente a: <a href={`mailto:${EMAIL}`}>{EMAIL}</a></p>
      <p>No publicar vulnerabilidades sin antes contactarnos.</p>
    </section>
  </LegalPageLayout>
);

export default SecurityPage;