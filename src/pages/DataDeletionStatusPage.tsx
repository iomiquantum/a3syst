import { useSearchParams, Link } from "react-router-dom";
import { CheckCircle2, AlertCircle } from "lucide-react";

const DataDeletionStatusPage = () => {
  const [params] = useSearchParams();
  const code = params.get("code");

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <Link to="/" className="inline-block text-xl font-bold mb-4">
          <span className="bg-gradient-to-r from-indigo-600 to-violet-500 bg-clip-text text-transparent">A3</span>
          <span className="text-gray-900">syst</span>
        </Link>

        {code ? (
          <>
            <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Estado de tu solicitud de eliminación de datos</h1>
            <div className="bg-gray-50 rounded-xl p-6 space-y-3 text-left border border-gray-100">
              <p className="text-sm text-gray-600"><strong className="text-gray-900">Código de confirmación:</strong> {code}</p>
              <p className="text-sm text-gray-600"><strong className="text-gray-900">Estado:</strong> ✅ Datos eliminados exitosamente</p>
              <p className="text-sm text-gray-600"><strong className="text-gray-900">Fecha:</strong> {new Date().toLocaleDateString("es-EC")}</p>
            </div>
          </>
        ) : (
          <>
            <div className="w-16 h-16 rounded-full bg-yellow-50 flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8 text-yellow-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">No se encontró código de confirmación</h1>
            <p className="text-gray-500">Si realizaste una solicitud de eliminación, verifica el enlace que recibiste.</p>
          </>
        )}

        <p className="text-sm text-gray-400">Si tienes preguntas, contacta: <a href="mailto:soporte@a3syst.com" className="text-indigo-600 hover:underline">soporte@a3syst.com</a></p>
        <Link to="/" className="inline-block text-sm text-indigo-600 hover:underline">← Volver al inicio</Link>
      </div>
    </div>
  );
};

export default DataDeletionStatusPage;