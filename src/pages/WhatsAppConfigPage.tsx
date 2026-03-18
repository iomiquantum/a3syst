import AppLayout from "@/components/AppLayout";
import WhatsAppSettings from "@/components/whatsapp/WhatsAppSettings";

const WhatsAppConfigPage = () => {
  return (
    <AppLayout>
      <div className="p-4 max-w-4xl mx-auto">
        <WhatsAppSettings />
      </div>
    </AppLayout>
  );
};

export default WhatsAppConfigPage;
