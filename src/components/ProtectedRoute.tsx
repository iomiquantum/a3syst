import { ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useBusiness } from "@/hooks/useBusiness";
import { Navigate, useLocation } from "react-router-dom";

const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const { businessId, loading: businessLoading, needsOnboarding } = useBusiness();
  const location = useLocation();

  if (authLoading || businessLoading) {
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

  // If user needs onboarding and isn't already on that page
  if (needsOnboarding && location.pathname !== "/onboarding") {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
