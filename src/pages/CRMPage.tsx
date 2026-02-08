import { useState } from "react";
import { Phone, Users, LayoutList, Columns3, Plus, BarChart3 } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import ContactList from "@/components/crm/ContactList";
import ContactDetail from "@/components/crm/ContactDetail";
import KanbanBoard from "@/components/crm/KanbanBoard";
import NewContactDialog from "@/components/crm/NewContactDialog";
import CRMFilters from "@/components/crm/CRMFilters";
import CallCenterDashboard from "@/components/crm/CallCenterDashboard";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCRM } from "@/hooks/useCRM";

type ViewMode = "list" | "kanban" | "dashboard";

const CRMPage = () => {
  const {
    contacts, callLogs, loading, selectedContact, stageFilter, searchQuery,
    datePreset, dateRange, agentFilter, agents, isAdmin,
    setSelectedContact, setStageFilter, setSearchQuery,
    setDatePreset, setDateRange, setAgentFilter,
    createContact, updateContact, logCall, convertToPatient,
  } = useCRM();
  const [newContactOpen, setNewContactOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");

  const handleMoveStage = (contactId: string, newStage: string) => {
    updateContact(contactId, { funnel_stage: newStage });
  };

  return (
    <AppLayout>
      <div className="h-[calc(100vh-7rem)] -m-6 flex flex-col border border-border rounded-lg overflow-hidden bg-card">
        {/* Top bar with view toggle */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-border shrink-0">
          <h1 className="font-semibold text-foreground flex items-center gap-2">
            <Phone className="w-4 h-4" /> Call Center / CRM
          </h1>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setNewContactOpen(true)}>
              <Plus className="w-4 h-4 mr-1" /> Nuevo contacto
            </Button>
            <div className="flex border border-border rounded-md overflow-hidden">
              <button
                onClick={() => setViewMode("list")}
                className={cn("px-2.5 py-1.5 text-xs flex items-center gap-1 transition-colors", viewMode === "list" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted")}
              >
                <LayoutList className="w-3.5 h-3.5" /> Lista
              </button>
              <button
                onClick={() => setViewMode("kanban")}
                className={cn("px-2.5 py-1.5 text-xs flex items-center gap-1 transition-colors", viewMode === "kanban" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted")}
              >
                <Columns3 className="w-3.5 h-3.5" /> Pipeline
              </button>
              <button
                onClick={() => setViewMode("dashboard")}
                className={cn("px-2.5 py-1.5 text-xs flex items-center gap-1 transition-colors", viewMode === "dashboard" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted")}
              >
                <BarChart3 className="w-3.5 h-3.5" /> Métricas
              </button>
            </div>
          </div>
        </div>

        {/* Date & Agent filters */}
        <div className="px-4 py-2 border-b border-border shrink-0">
          <CRMFilters
            datePreset={datePreset}
            dateRange={dateRange}
            agentFilter={agentFilter}
            agents={agents}
            showAgentFilter={isAdmin}
            onDatePresetChange={setDatePreset}
            onDateRangeChange={setDateRange}
            onAgentChange={setAgentFilter}
          />
        </div>
        {/* Content */}
        <div className="flex-1 flex min-h-0">
          {loading && viewMode !== "dashboard" ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-sm text-muted-foreground">Cargando contactos...</p>
            </div>
          ) : viewMode === "dashboard" ? (
            <div className="flex-1 overflow-hidden">
              <CallCenterDashboard />
            </div>
          ) : viewMode === "list" ? (
            <>
              <div className="w-[380px] border-r border-border flex flex-col shrink-0">
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
              </div>
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
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="flex-1 min-w-0 overflow-hidden">
                <KanbanBoard
                  contacts={contacts}
                  selected={selectedContact}
                  onSelect={setSelectedContact}
                  onMoveStage={handleMoveStage}
                />
              </div>
              {selectedContact && (
                <div className="w-[340px] border-l border-border shrink-0">
                  <ContactDetail
                    contact={selectedContact}
                    callLogs={callLogs}
                    onUpdate={updateContact}
                    onLogCall={logCall}
                    onConvert={convertToPatient}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <NewContactDialog open={newContactOpen} onOpenChange={setNewContactOpen} onCreate={createContact} />
    </AppLayout>
  );
};

export default CRMPage;
