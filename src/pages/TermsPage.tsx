import LegalPageLayout from "@/components/legal/LegalPageLayout";

const DATE = "3 de marzo de 2026";
const EMAIL = "soporte@a3syst.com";
const ADDR = "Quito, Ecuador";

const toc = [
  { id: "aceptacion", label: "1. Aceptación" },
  { id: "descripcion", label: "2. Descripción del servicio" },
  { id: "registro", label: "3. Registro y cuenta" },
  { id: "uso", label: "4. Uso aceptable" },
  { id: "redes", label: "5. Integración con redes sociales" },
  { id: "ia", label: "6. Contenido generado por IA" },
  { id: "propiedad", label: "7. Propiedad intelectual" },
  { id: "datos-pacientes", label: "8. Datos de pacientes/clientes" },
  { id: "disponibilidad", label: "9. Disponibilidad" },
  { id: "facturacion", label: "10. Facturación y pagos" },
  { id: "limitacion", label: "11. Limitación de responsabilidad" },
  { id: "terminacion", label: "12. Terminación" },
  { id: "modificaciones", label: "13. Modificaciones" },
  { id: "ley", label: "14. Ley aplicable" },
  { id: "contacto", label: "15. Contacto" },
];

const TermsPage = () => (
  <LegalPageLayout title="Términos y Condiciones de Servicio" lastUpdated={DATE} toc={toc}>
    <section id="aceptacion"><h2>1. Aceptación de los Términos</h2><p>Al registrarte y usar a3syst, aceptas estos Términos y Condiciones. Si no estás de acuerdo, no uses el servicio.</p></section><hr />
    <section id="descripcion"><h2>2. Descripción del Servicio</h2><p>a3syst es una plataforma SaaS (Software como Servicio) que proporciona:</p><ul><li>Gestión de agenda y citas para negocios de bienestar</li><li>CRM (gestión de relaciones con clientes)</li><li>Herramientas de marketing digital con inteligencia artificial</li><li>Publicación automatizada en redes sociales (Facebook, Instagram)</li><li>Gestión de ventas y facturación</li><li>Análisis y reportes de rendimiento</li></ul></section><hr />
    <section id="registro"><h2>3. Registro y Cuenta</h2><ul><li>Debes proporcionar información veraz y actualizada</li><li>Eres responsable de mantener la confidencialidad de tu contraseña</li><li>Una cuenta por negocio (pueden existir múltiples usuarios por negocio)</li><li>Debes ser mayor de 18 años</li><li>Debes ser el propietario o tener autorización del negocio que registras</li></ul></section><hr />
    <section id="uso"><h2>4. Uso Aceptable</h2><p>Te comprometes a:</p><ul><li>Usar la plataforma solo para gestionar tu negocio de bienestar legítimo</li><li>No publicar contenido ilegal, difamatorio, o engañoso a través de nuestras herramientas</li><li>No intentar acceder a datos de otros negocios</li><li>No usar la plataforma para spam o publicaciones masivas no solicitadas</li><li>No intentar vulnerar la seguridad de la plataforma</li><li>Cumplir con las políticas de Meta (Facebook/Instagram) al usar nuestras herramientas de publicación</li><li>No compartir tus credenciales de acceso con personas no autorizadas</li></ul></section><hr />
    <section id="redes"><h2>5. Integración con Redes Sociales</h2><ul><li>Al conectar Facebook/Instagram, autorizas a a3syst a publicar contenido en tu nombre SOLO cuando tú lo solicites o apruebes</li><li>Eres responsable del contenido que publicas a través de a3syst</li><li>a3syst no es responsable por cambios en las políticas de Meta que afecten la funcionalidad de publicación</li><li>Puedes desconectar tus redes sociales en cualquier momento</li></ul></section><hr />
    <section id="ia"><h2>6. Contenido Generado por IA</h2><ul><li>a3syst utiliza inteligencia artificial para sugerir contenido de marketing</li><li>El contenido generado por IA son SUGERENCIAS que tú debes revisar y aprobar</li><li>Eres responsable de verificar la exactitud del contenido antes de publicar</li><li>a3syst no garantiza que el contenido generado por IA sea perfecto o libre de errores</li></ul></section><hr />
    <section id="propiedad"><h2>7. Propiedad Intelectual</h2><ul><li>a3syst y su código, diseño, logos y marca son propiedad de Impulsar Solutions</li><li>El contenido que tú creas dentro de la plataforma es tuyo</li><li>Nos concedes una licencia limitada para almacenar y procesar tu contenido dentro de la plataforma</li><li>Al eliminar tu cuenta, eliminaremos tu contenido según nuestra Política de Retención de Datos</li></ul></section><hr />
    <section id="datos-pacientes"><h2>8. Datos de Pacientes/Clientes</h2><ul><li>Si ingresas datos de tus pacientes/clientes en a3syst, eres responsable de tener su consentimiento para almacenar sus datos</li><li>a3syst actúa como "encargado del tratamiento" de estos datos</li><li>Implementamos medidas de seguridad para proteger estos datos</li><li>No accedemos ni usamos datos de tus pacientes/clientes para nuestros propios fines</li></ul></section><hr />
    <section id="disponibilidad"><h2>9. Disponibilidad del Servicio</h2><ul><li>Nos esforzamos por mantener el servicio disponible 24/7</li><li>Pueden ocurrir interrupciones por mantenimiento (te notificaremos)</li><li>No garantizamos disponibilidad del 100%</li><li>Factores externos (Meta, proveedores de hosting) pueden afectar algunas funcionalidades</li></ul></section><hr />
    <section id="facturacion"><h2>10. Facturación y Pagos</h2><ul><li>Los precios se publican en nuestra página de planes</li><li>La facturación es mensual o anual según el plan elegido</li><li>Puedes cancelar tu suscripción en cualquier momento</li><li>No se realizan reembolsos por períodos parciales</li><li>Nos reservamos el derecho de modificar precios con 30 días de aviso</li></ul></section><hr />
    <section id="limitacion"><h2>11. Limitación de Responsabilidad</h2><ul><li>a3syst se proporciona "tal como está" (as is)</li><li>No somos responsables por pérdidas indirectas, incidentales o consecuentes</li><li>Nuestra responsabilidad máxima se limita al monto pagado por el servicio en los últimos 12 meses</li><li>No somos responsables por acciones de Meta que afecten tus cuentas de redes sociales</li></ul></section><hr />
    <section id="terminacion"><h2>12. Terminación</h2><ul><li>Puedes cancelar tu cuenta en cualquier momento</li><li>Nos reservamos el derecho de suspender o terminar cuentas que violen estos términos</li><li>Al terminar, tus datos se eliminan según nuestra Política de Retención</li></ul></section><hr />
    <section id="modificaciones"><h2>13. Modificaciones a los Términos</h2><ul><li>Podemos modificar estos términos con 30 días de aviso</li><li>Te notificaremos por email y dentro de la plataforma</li><li>El uso continuado después de los cambios implica aceptación</li></ul></section><hr />
    <section id="ley"><h2>14. Ley Aplicable y Jurisdicción</h2><p>Estos términos se rigen por las leyes de la República del Ecuador. Cualquier disputa se resolverá en los tribunales competentes de Quito, Ecuador.</p></section><hr />
    <section id="contacto"><h2>15. Contacto</h2><p>Email: <a href={`mailto:${EMAIL}`}>{EMAIL}</a></p><p>Dirección: {ADDR}</p></section>
  </LegalPageLayout>
);

export default TermsPage;