import { ExternalLink, Copy, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const DOMAIN = "https://a3syst.lovable.app";

const urls = [
  { label: "Privacy Policy", url: `${DOMAIN}/privacy` },
  { label: "Terms of Service", url: `${DOMAIN}/terms` },
  { label: "Data Deletion Instructions", url: `${DOMAIN}/data-deletion` },
  { label: "Data Deletion Callback", url: `${DOMAIN}/functions/v1/meta-data-deletion` },
];

const AdminMetaURLs = () => {
  const copy = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success("URL copiada");
  };

  return (
    <Card className="border-border/50">
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#1877F2]/10 flex items-center justify-center">
            <ExternalLink className="w-5 h-5 text-[#1877F2]" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">URLs para Meta Developers</h3>
            <p className="text-xs text-muted-foreground">Estas URLs deben estar configuradas en developers.facebook.com para la app de Meta</p>
          </div>
        </div>

        <div className="space-y-2">
          {urls.map(u => (
            <div key={u.label} className="flex items-center justify-between bg-muted/30 rounded-xl p-3 border border-border/50">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">{u.label}</p>
                <p className="text-xs text-muted-foreground truncate">{u.url}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => copy(u.url)} className="shrink-0 ml-2">
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>

        <div className="bg-primary/5 rounded-xl p-3 border border-primary/10 text-xs text-muted-foreground">
          <p className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" /> Configura estas URLs en: Meta for Developers → Tu App → Configuración → Básica</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminMetaURLs;