import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Cookie } from "lucide-react";
import { Button } from "@/components/ui/button";

const CookieBanner = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("a3syst_cookie_consent");
    if (!consent) setVisible(true);
  }, []);

  const accept = (type: "necessary" | "all") => {
    localStorage.setItem("a3syst_cookie_consent", JSON.stringify({ type, date: new Date().toISOString() }));
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] p-4">
      <div className="max-w-2xl mx-auto bg-card border border-border rounded-2xl shadow-xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex items-start gap-3 flex-1">
          <Cookie className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <p className="text-sm text-muted-foreground">
            Usamos cookies para que a3syst funcione correctamente.{" "}
            <Link to="/cookies" className="text-primary hover:underline">Política de Cookies</Link>
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={() => accept("necessary")}>Solo necesarias</Button>
          <Button size="sm" onClick={() => accept("all")}>Aceptar todas</Button>
        </div>
      </div>
    </div>
  );
};

export default CookieBanner;