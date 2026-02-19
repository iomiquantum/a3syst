import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ClinicProvider } from "@/hooks/useClinic";
import { BusinessLabelsProvider } from "@/hooks/useBusinessLabels";
import ProtectedRoute from "@/components/ProtectedRoute";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import Dashboard from "./pages/Dashboard";
import PacientesPage from "./pages/PacientesPage";
import AgendaPage from "./pages/AgendaPage";
import VentasPage from "./pages/VentasPage";
import SucursalesPage from "./pages/SucursalesPage";
import TratamientosPage from "./pages/TratamientosPage";
import ProfesionalesPage from "./pages/ProfesionalesPage";
import UsuariosPage from "./pages/UsuariosPage";
import AdminPage from "./pages/AdminPage";
import MensajesPage from "./pages/MensajesPage";
import WidgetConfigPage from "./pages/WidgetConfigPage";
import CRMPage from "./pages/CRMPage";
import MarketingPage from "./pages/MarketingPage";
import AIAgentConfigPage from "./pages/AIAgentConfigPage";
import AdsPage from "./pages/AdsPage";
import ContentPage from "./pages/ContentPage";
import PsychoMatrixPage from "./pages/PsychoMatrixPage";
import PlanificacionPage from "./pages/PlanificacionPage";
import ReunionesPage from "./pages/ReunionesPage";
import LandingPage from "./pages/LandingPage";
import PreLaunchPage from "./pages/PreLaunchPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <ClinicProvider>
          <BusinessLabelsProvider>
            <Routes>
              <Route path="/" element={<PreLaunchPage />} />
              <Route path="/landing" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/registro" element={<RegisterPage />} />
              <Route path="/lanzamiento" element={<PreLaunchPage />} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/pacientes" element={<ProtectedRoute><PacientesPage /></ProtectedRoute>} />
              <Route path="/agenda" element={<ProtectedRoute><AgendaPage /></ProtectedRoute>} />
              <Route path="/ventas" element={<ProtectedRoute><VentasPage /></ProtectedRoute>} />
              <Route path="/mensajes" element={<ProtectedRoute><MensajesPage /></ProtectedRoute>} />
              <Route path="/crm" element={<ProtectedRoute><CRMPage /></ProtectedRoute>} />
              <Route path="/marketing" element={<ProtectedRoute><MarketingPage /></ProtectedRoute>} />
              <Route path="/configuracion/agente-ia" element={<ProtectedRoute><AIAgentConfigPage /></ProtectedRoute>} />
              <Route path="/configuracion/widget" element={<ProtectedRoute><WidgetConfigPage /></ProtectedRoute>} />
              <Route path="/configuracion/sucursales" element={<ProtectedRoute><SucursalesPage /></ProtectedRoute>} />
              <Route path="/configuracion/tratamientos" element={<ProtectedRoute><TratamientosPage /></ProtectedRoute>} />
              <Route path="/configuracion/profesionales" element={<ProtectedRoute><ProfesionalesPage /></ProtectedRoute>} />
              <Route path="/configuracion/usuarios" element={<ProtectedRoute><UsuariosPage /></ProtectedRoute>} />
              <Route path="/configuracion/ajustes" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/admin" element={<ProtectedRoute><AdminPage /></ProtectedRoute>} />
              <Route path="/ads" element={<ProtectedRoute><AdsPage /></ProtectedRoute>} />
              <Route path="/contenido" element={<ProtectedRoute><ContentPage /></ProtectedRoute>} />
              <Route path="/psycho-matrix" element={<ProtectedRoute><PsychoMatrixPage /></ProtectedRoute>} />
              <Route path="/planificacion" element={<ProtectedRoute><PlanificacionPage /></ProtectedRoute>} />
              <Route path="/reuniones" element={<ProtectedRoute><ReunionesPage /></ProtectedRoute>} />
              
              <Route path="*" element={<NotFound />} />
           </Routes>
          </BusinessLabelsProvider>
          </ClinicProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
