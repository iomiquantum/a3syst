import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import Dashboard from "./pages/Dashboard";
import PacientesPage from "./pages/PacientesPage";
import AgendaPage from "./pages/AgendaPage";
import VentasPage from "./pages/VentasPage";
import SucursalesPage from "./pages/SucursalesPage";
import TratamientosPage from "./pages/TratamientosPage";
import ProfesionalesPage from "./pages/ProfesionalesPage";
import UsuariosPage from "./pages/UsuariosPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/pacientes" element={<PacientesPage />} />
          <Route path="/agenda" element={<AgendaPage />} />
          <Route path="/ventas" element={<VentasPage />} />
          <Route path="/mensajes" element={<Dashboard />} />
          <Route path="/configuracion/sucursales" element={<SucursalesPage />} />
          <Route path="/configuracion/tratamientos" element={<TratamientosPage />} />
          <Route path="/configuracion/profesionales" element={<ProfesionalesPage />} />
          <Route path="/configuracion/usuarios" element={<UsuariosPage />} />
          <Route path="/configuracion/ajustes" element={<Dashboard />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
