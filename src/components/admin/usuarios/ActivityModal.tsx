import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ActivityTimeline from "./ActivityTimeline";
import { UsuarioCompleto } from "@/hooks/useUsuariosAdmin";

interface ActivityModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  user: UsuarioCompleto | null;
}

const ActivityModal = ({ open, onOpenChange, user }: ActivityModalProps) => {
  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Historial de Actividad — {user.full_name}</DialogTitle>
        </DialogHeader>
        <div className="pt-2">
          <ActivityTimeline userId={user.user_id} />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ActivityModal;
