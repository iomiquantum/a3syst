import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUp, Menu, X } from "lucide-react";

interface TOCItem {
  id: string;
  label: string;
}

interface Props {
  title: string;
  lastUpdated: string;
  toc: TOCItem[];
  children: React.ReactNode;
}

const legalLinks = [
  { to: "/privacy", label: "Política de Privacidad" },
  { to: "/terms", label: "Términos y Condiciones" },
  { to: "/cookies", label: "Política de Cookies" },
  { to: "/acceptable-use", label: "Uso Aceptable" },
  { to: "/data-deletion", label: "Eliminación de Datos" },
  { to: "/security", label: "Seguridad" },
];

const LegalPageLayout = ({ title, lastUpdated, toc, children }: Props) => {
  const [tocOpen, setTocOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white text-gray-800">
      {/* Nav */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 py-3">
          <Link to="/" className="text-xl font-bold">
            <span className="bg-gradient-to-r from-indigo-600 to-violet-500 bg-clip-text text-transparent">A3</span>
            <span className="text-gray-900">syst</span>
          </Link>
          <Link to="/" className="text-sm text-indigo-600 hover:underline">← Volver al inicio</Link>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-12 lg:py-16 flex gap-10">
        {/* TOC - Desktop sidebar */}
        <aside className="hidden lg:block w-64 shrink-0">
          <nav className="sticky top-24 space-y-1">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Contenido</p>
            {toc.map(item => (
              <a key={item.id} href={`#${item.id}`} className="block text-sm text-gray-500 hover:text-indigo-600 py-1 transition-colors">
                {item.label}
              </a>
            ))}
          </nav>
        </aside>

        {/* TOC - Mobile toggle */}
        <div className="lg:hidden fixed bottom-20 right-4 z-40">
          <button onClick={() => setTocOpen(!tocOpen)} className="w-11 h-11 rounded-full bg-indigo-600 text-white shadow-lg flex items-center justify-center">
            {tocOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          {tocOpen && (
            <div className="absolute bottom-14 right-0 w-64 bg-white rounded-xl shadow-xl border border-gray-100 p-4 space-y-1 max-h-80 overflow-y-auto">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Contenido</p>
              {toc.map(item => (
                <a key={item.id} href={`#${item.id}`} onClick={() => setTocOpen(false)} className="block text-sm text-gray-500 hover:text-indigo-600 py-1">
                  {item.label}
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Content */}
        <main className="flex-1 max-w-[800px]">
          <h1 className="text-3xl lg:text-4xl font-extrabold text-gray-900 mb-2">{title}</h1>
          <p className="text-sm text-gray-400 mb-10">Última actualización: {lastUpdated}</p>
          <div className="prose prose-gray max-w-none prose-headings:text-gray-900 prose-headings:font-bold prose-a:text-indigo-600 prose-a:no-underline hover:prose-a:underline prose-li:text-gray-600 prose-p:text-gray-600 prose-strong:text-gray-800">
            {children}
          </div>
        </main>
      </div>

      {/* Back to top */}
      <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="fixed bottom-4 right-4 z-40 w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center shadow transition-colors" aria-label="Volver arriba">
        <ArrowUp className="w-4 h-4" />
      </button>

      {/* Legal Footer */}
      <footer className="border-t border-gray-100 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Producto</p>
              <div className="space-y-2">
                <Link to="/" className="block text-sm text-gray-500 hover:text-indigo-600">Funcionalidades</Link>
                <Link to="/" className="block text-sm text-gray-500 hover:text-indigo-600">Precios</Link>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Legal</p>
              <div className="space-y-2">
                {legalLinks.map(l => (
                  <Link key={l.to} to={l.to} className="block text-sm text-gray-500 hover:text-indigo-600">{l.label}</Link>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Soporte</p>
              <div className="space-y-2">
                <a href="mailto:soporte@a3syst.com" className="block text-sm text-gray-500 hover:text-indigo-600">Contacto</a>
              </div>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-gray-200 text-center">
            <p className="text-xs text-gray-400">a3syst © {new Date().getFullYear()} — Todos los derechos reservados</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LegalPageLayout;