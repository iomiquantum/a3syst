import { useWhatsApp } from "@/hooks/useWhatsApp";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";
import { useMemo } from "react";

const WhatsAppDashboardCard = () => {
  const { isConnected, connections, messages, connectWhatsApp } = useWhatsApp();
  const navigate = useNavigate();

  const todayCount = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    return messages.filter(m => new Date(m.created_at) >= todayStart).length;
  }, [messages]);

  const activeConn = connections.find(c => c.status === "active");

  if (!isConnected) {
    return (
      <Card className="border-[#25d366]/20 bg-white/[0.03] backdrop-blur-sm hover:border-[#25d366]/40 transition-colors">
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <div className="relative w-12 h-12 shrink-0">
              <div className="absolute inset-0 rounded-xl bg-[#25d366]/20 animate-pulse" />
              <div className="relative w-12 h-12 rounded-xl bg-[#25d366]/10 flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-6 h-6 text-[#25d366] fill-current">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-foreground">WhatsApp Business</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Conecta tu número para recibir mensajes</p>
              <Button
                onClick={connectWhatsApp}
                size="sm"
                className="mt-3 bg-[#25d366] hover:bg-[#25d366]/90 text-white text-xs"
              >
                Conectar ahora
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-[#25d366]/20 bg-white/[0.03] backdrop-blur-sm hover:border-[#25d366]/40 transition-colors cursor-pointer" onClick={() => navigate("/mensajes/whatsapp")}>
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#25d366]/10 flex items-center justify-center shrink-0">
            <MessageSquare className="w-6 h-6 text-[#25d366]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-foreground">WhatsApp</h3>
              <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-[#25d366]/15 text-[#25d366] px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-[#25d366]" /> Activo
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {activeConn?.phone_number || activeConn?.display_name || "Conectado"}
            </p>
            <p className="text-xs text-muted-foreground">
              {todayCount} mensaje{todayCount !== 1 ? "s" : ""} hoy
            </p>
            <Button
              size="sm"
              variant="outline"
              className="mt-2 text-xs border-white/10"
              onClick={(e) => { e.stopPropagation(); navigate("/mensajes/whatsapp"); }}
            >
              Ver mensajes
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default WhatsAppDashboardCard;
