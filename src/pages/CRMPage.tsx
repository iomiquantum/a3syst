import { useState } from "react";
import { Phone, Users } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import ContactList from "@/components/crm/ContactList";
import ContactDetail from "@/components/crm/ContactDetail";
import NewContactDialog from "@/components/crm/NewContactDialog";
import { useCRM } from "@/hooks/useCRM";

const CRMPage = () => {
  const {
    contacts, callLogs, loading, selectedContact, stageFilter, searchQuery,
    setSelectedContact, setStageFilter, setSearchQuery,
    createContact, updateContact, logCall, convertToPatient,
  } = useCRM();
  const [newContactOpen, setNewContactOpen] = useState(false);

  return (
    <AppLayout>
      <div className="h-[calc(100vh-7rem)] -m-6 flex border border-border rounded-lg overflow-hidden bg-card">
        {/* Left: Contact list */}
        <div className="w-[380px] border-r border-border flex flex-col shrink-0">
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-sm text-muted-foreground">Cargando contactos...</p>
            </div>
          ) : (
            <ContactList
              contacts={contacts}
              selected={selectedContact}
              stageFilter={stageFilter}
              searchQuery={searchQuery}
              onSelect={setSelectedContact}
              onFilterChange={setStageFilter}
              onSearchChange={setSearchQuery}
              onNewContact={() => setNewContactOpen(true)}
            />
          )}
        </div>

        {/* Right: Contact detail */}
        <div className="flex-1 min-w-0">
          {selectedContact ? (
            <ContactDetail
              contact={selectedContact}
              callLogs={callLogs}
              onUpdate={updateContact}
              onLogCall={logCall}
              onConvert={convertToPatient}
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
              <Users className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm">Selecciona un contacto</p>
              <p className="text-xs mt-1">Elige un contacto de la lista para ver su información</p>
            </div>
          )}
        </div>
      </div>

      <NewContactDialog open={newContactOpen} onOpenChange={setNewContactOpen} onCreate={createContact} />
    </AppLayout>
  );
};

export default CRMPage;
