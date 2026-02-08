import { Megaphone } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MarketingKPIs from "@/components/marketing/MarketingKPIs";
import DifusionesTab from "@/components/marketing/DifusionesTab";
import AudienciasTab from "@/components/marketing/AudienciasTab";
import MarketingContactsTab from "@/components/marketing/MarketingContactsTab";
import TokenAPIsTab from "@/components/marketing/TokenAPIsTab";

const MarketingPage = () => (
  <AppLayout>
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
          <Megaphone className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Marketing</h1>
          <p className="text-sm text-muted-foreground">Gestiona campañas, audiencias y canales de comunicación</p>
        </div>
      </div>

      <Tabs defaultValue="indices" className="w-full">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="indices">Índices</TabsTrigger>
          <TabsTrigger value="difusiones">Difusiones</TabsTrigger>
          <TabsTrigger value="audiencias">Audiencias</TabsTrigger>
          <TabsTrigger value="contactos">Contactos</TabsTrigger>
          <TabsTrigger value="tokens">Token APIs</TabsTrigger>
        </TabsList>

        <TabsContent value="indices"><MarketingKPIs /></TabsContent>
        <TabsContent value="difusiones"><DifusionesTab /></TabsContent>
        <TabsContent value="audiencias"><AudienciasTab /></TabsContent>
        <TabsContent value="contactos"><MarketingContactsTab /></TabsContent>
        <TabsContent value="tokens"><TokenAPIsTab /></TabsContent>
      </Tabs>
    </div>
  </AppLayout>
);

export default MarketingPage;
