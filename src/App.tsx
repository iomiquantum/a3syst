import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useSessionHeartbeat } from "@/hooks/useSessionHeartbeat";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ClinicProvider } from "@/hooks/useClinic";
import { BusinessLabelsProvider } from "@/hooks/useBusinessLabels";
import ProtectedRoute from "@/components/ProtectedRoute";
import LoginPage from "./pages/LoginPage";
import WhatsAppConfigPage from "./pages/WhatsAppConfigPage";
import WhatsAppMessagesPage from "./pages/WhatsAppMessagesPage";
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
import AdminUsuariosPage from "./pages/AdminUsuariosPage";
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
import RankingPage from "./pages/RankingPage";
import OnboardingPage from "./pages/OnboardingPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import MiCuentaPage from "./pages/MiCuentaPage";
import BusinessLandingPage from "./pages/BusinessLandingPage";
import MiNegocioPage from "./pages/MiNegocioPage";
import PrivacyPage from "./pages/PrivacyPage";
import TermsPage from "./pages/TermsPage";
import DataDeletionPage from "./pages/DataDeletionPage";
import DataDeletionStatusPage from "./pages/DataDeletionStatusPage";
import CookiesPage from "./pages/CookiesPage";
import AcceptableUsePage from "./pages/AcceptableUsePage";
import SecurityPage from "./pages/SecurityPage";
import CookieBanner from "./components/legal/CookieBanner";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppContent = () => {
  useSessionHeartbeat();
  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <CookieBanner />
        <AppContent />
        <AuthProvider>
            <ClinicProvider>
              <BusinessLabelsProvider>
            <Routes>
              <Route path="/" element={<PreLaunchPage />} />
              <Route path="/landing" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/registro" element={<RegisterPage />} />
              <Route path="/lanzamiento" element={<PreLaunchPage />} />
              <Route path="/ranking" element={<RankingPage />} />
              <Route path="/negocio/:slug" element={<BusinessLandingPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/data-deletion" element={<DataDeletionPage />} />
              <Route path="/data-deletion-status" element={<DataDeletionStatusPage />} />
              <Route path="/cookies" element={<CookiesPage />} />
              <Route path="/acceptable-use" element={<AcceptableUsePage />} />
              <Route path="/security" element={<SecurityPage />} />
              <Route path="/onboarding" element={<ProtectedRoute><OnboardingPage /></ProtectedRoute>} />
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
               <Route path="/configuracion/whatsapp" element={<ProtectedRoute><WhatsAppConfigPage /></ProtectedRoute>} />
               <Route path="/mensajes/whatsapp" element={<ProtectedRoute><WhatsAppMessagesPage /></ProtectedRoute>} />
              <Route path="/admin/usuarios" element={<ProtectedRoute><AdminUsuariosPage /></ProtectedRoute>} />
              <Route path="/ads" element={<ProtectedRoute><AdsPage /></ProtectedRoute>} />
              <Route path="/contenido" element={<ProtectedRoute><ContentPage /></ProtectedRoute>} />
              <Route path="/psycho-matrix" element={<ProtectedRoute><PsychoMatrixPage /></ProtectedRoute>} />
              <Route path="/planificacion" element={<ProtectedRoute><PlanificacionPage /></ProtectedRoute>} />
              <Route path="/reuniones" element={<ProtectedRoute><ReunionesPage /></ProtectedRoute>} />
              <Route path="/analytics" element={<ProtectedRoute><AnalyticsPage /></ProtectedRoute>} />
              <Route path="/mi-cuenta" element={<ProtectedRoute><MiCuentaPage /></ProtectedRoute>} />
              
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
