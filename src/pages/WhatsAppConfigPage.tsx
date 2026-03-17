import AppLayout from "@/components/AppLayout";
import WhatsAppWizard from "@/components/whatsapp/WhatsAppWizard";

const WhatsAppConfigPage = () => {
  return (
    <AppLayout>
      <div className="py-4">
        <WhatsAppWizard />
      </div>
    </AppLayout>
  );
};

export default WhatsAppConfigPage;
