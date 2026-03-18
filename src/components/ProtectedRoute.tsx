import { ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useClinic } from "@/hooks/useClinic";
import { Navigate, useLocation } from "react-router-dom";

const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const { clinicId, loading: clinicLoading, needsOnboarding } = useClinic();
  const location = useLocation();

  if (authLoading || clinicLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#060611]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#8B5CF6] to-[#6D28D9] flex items-center justify-center animate-pulse">
            <span className="text-white font-bold text-xs">A3</span>
          </div>
          <span className="text-sm text-white/40">Cargando...</span>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  // Only redirect to onboarding if user is the clinic OWNER and hasn't completed it
  // Admin-created users and role-assigned users should never be forced to onboarding

  return <>{children}</>;
};

export default ProtectedRoute;
