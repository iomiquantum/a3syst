import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { useActividadUsuarios } from "@/hooks/useUsuariosAdmin";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, UserCog, Shield, UserPlus, Trash2, Building2 } from "lucide-react";

const iconMap: Record<string, any> = {
  usuario_creado: UserPlus,
  rol_cambiado: Shield,
  estado_cambiado: UserCog,
  asignado_empresa: Building2,
  rol_eliminado: Trash2,
};

const ActivityTimeline = ({ userId }: { userId: string }) => {
  const { data: actividad = [], isLoading } = useActividadUsuarios(userId);

  if (isLoading) return <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>;

  if (actividad.length === 0) return <p className="text-sm text-muted-foreground py-4 text-center">Sin actividad registrada</p>;

  return (
    <div className="space-y-3 max-h-[300px] overflow-y-auto">
      {actividad.map((act: any) => {
        const Icon = iconMap[act.accion] || Clock;
        return (
          <div key={act.id} className="flex gap-3 items-start">
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
              <Icon className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground capitalize">{act.accion.replace(/_/g, " ")}</p>
              {act.detalle && Object.keys(act.detalle).length > 0 && (
                <p className="text-xs text-muted-foreground truncate">
                  {JSON.stringify(act.detalle).substring(0, 100)}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-0.5">
                {formatDistanceToNow(new Date(act.created_at), { addSuffix: true, locale: es })}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ActivityTimeline;
