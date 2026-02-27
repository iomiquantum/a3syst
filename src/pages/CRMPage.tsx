import { useState, useMemo } from "react";
import { Phone, Users, LayoutList, Columns3, Plus, BarChart3, Search, Bot, TrendingUp, UserPlus } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import ContactList from "@/components/crm/ContactList";
import ContactDetail from "@/components/crm/ContactDetail";
import KanbanBoard from "@/components/crm/KanbanBoard";
import NewContactDialog from "@/components/crm/NewContactDialog";
import CRMFilters from "@/components/crm/CRMFilters";
import CallCenterDashboard from "@/components/crm/CallCenterDashboard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useCRM, FUNNEL_STAGES } from "@/hooks/useCRM";

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
  const [quickSearch, setQuickSearch] = useState("");

  const filteredContacts = quickSearch.trim()
    ? contacts.filter(c =>
        c.name.toLowerCase().includes(quickSearch.toLowerCase()) ||
        c.phone.toLowerCase().includes(quickSearch.toLowerCase())
      )
    : contacts;

  const handleMoveStage = (contactId: string, newStage: string) => {
    updateContact(contactId, { funnel_stage: newStage });
  };

  // Metrics
  const todayStr = new Date().toISOString().split("T")[0];
  const totalLeads = contacts.length;
  const newToday = contacts.filter(c => c.created_at?.startsWith(todayStr)).length;
  const converted = contacts.filter(c => c.funnel_stage === "convertido").length;
  const conversionRate = totalLeads > 0 ? Math.round((converted / totalLeads) * 100) : 0;

  const kpis = [
    { label: "Pipeline", value: totalLeads, icon: Users, color: "from-[#8B5CF6] to-[#6D28D9]" },
    { label: "Nuevos hoy", value: newToday, icon: UserPlus, color: "from-blue-500 to-blue-700" },
    { label: "Convertidos", value: converted, icon: TrendingUp, color: "from-emerald-500 to-emerald-700" },
    { label: "Conversión", value: `${conversionRate}%`, icon: BarChart3, color: "from-yellow-500 to-yellow-700" },
  ];

  return (
    <AppLayout>
      <div className="h-[calc(100vh-7rem)] -m-6 flex flex-col border border-border rounded-lg overflow-hidden bg-card">
        {/* ═══ TOP BAR ═══ */}
        <div className="px-4 py-3 border-b border-border shrink-0">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
                📊 CRM
              </h1>
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-400">
                <Bot className="w-3 h-3" /> Autopilot activo
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" className="text-xs border-white/10" onClick={() => setNewContactOpen(true)}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Nuevo contacto
              </Button>
            </div>
          </div>

          {/* KPIs + View Toggle + Search */}
          <div className="flex items-center justify-between mt-3 gap-4 flex-wrap">
            {/* KPIs */}
            <div className="flex items-center gap-4">
              {kpis.map(s => (
                <div key={s.label} className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-md bg-gradient-to-br ${s.color} flex items-center justify-center`}>
                    <s.icon className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div>
                    {loading ? <Skeleton className="h-4 w-8 bg-muted" /> : <p className="text-sm font-bold text-foreground leading-none">{s.value}</p>}
                    <p className="text-[9px] text-muted-foreground">{s.label}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2">
              {/* Quick Search */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  placeholder="Buscar..."
                  value={quickSearch}
                  onChange={e => setQuickSearch(e.target.value)}
                  className="h-8 text-xs pl-8 w-48"
                />
              </div>

              {/* View Toggle */}
              <div className="flex border border-border rounded-md overflow-hidden">
                <button onClick={() => setViewMode("kanban")}
                  className={cn("px-3 py-1.5 text-xs flex items-center gap-1 transition-colors", viewMode === "kanban" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}>
                  <Columns3 className="w-3.5 h-3.5" /> Pipeline
                </button>
                <button onClick={() => setViewMode("list")}
                  className={cn("px-3 py-1.5 text-xs flex items-center gap-1 transition-colors", viewMode === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}>
                  <LayoutList className="w-3.5 h-3.5" /> Lista
                </button>
                <button onClick={() => setViewMode("dashboard")}
                  className={cn("px-3 py-1.5 text-xs flex items-center gap-1 transition-colors", viewMode === "dashboard" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}>
                  <BarChart3 className="w-3.5 h-3.5" /> Métricas
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ═══ MAIN CONTENT ═══ */}
        <div className="flex-1 min-h-0 overflow-hidden flex">
          {/* Content area */}
          <div className="flex-1 min-w-0 overflow-hidden">
            {loading && viewMode !== "dashboard" ? (
              <div className="flex-1 h-full flex items-center justify-center">
                <p className="text-sm text-muted-foreground">Cargando contactos...</p>
              </div>
            ) : viewMode === "dashboard" ? (
              <CallCenterDashboard />
            ) : viewMode === "kanban" ? (
              filteredContacts.length === 0 && !quickSearch ? (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground px-4">
                  <Users className="w-14 h-14 mb-4 opacity-30" />
                  <p className="text-lg font-semibold text-foreground">Tu pipeline está vacío</p>
                  <p className="text-sm mt-1 text-center max-w-md">
                    Agrega tu primer lead o activa el Autopilot de Ads para que lleguen automáticamente.
                  </p>
                  <Button onClick={() => setNewContactOpen(true)} className="mt-4 bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] text-white">
                    <Plus className="w-4 h-4 mr-2" /> Agregar primer lead
                  </Button>
                </div>
              ) : (
                <KanbanBoard
                  contacts={filteredContacts}
                  selected={selectedContact}
                  onSelect={setSelectedContact}
                  onMoveStage={handleMoveStage}
                />
              )
            ) : (
              <div className="h-full flex">
                <div className="w-[340px] border-r border-border shrink-0 overflow-hidden">
                  <ContactList
                    contacts={filteredContacts}
                    selected={selectedContact}
                    stageFilter={stageFilter}
                    searchQuery={searchQuery}
                    onSelect={setSelectedContact}
                    onFilterChange={setStageFilter}
                    onSearchChange={setSearchQuery}
                    onNewContact={() => setNewContactOpen(true)}
                  />
                </div>
                <div className="flex-1 min-w-0 overflow-hidden">
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
                      <p className="text-sm">Selecciona un contacto de la lista</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right panel: Contact detail (kanban + dashboard modes) */}
          {viewMode !== "list" && selectedContact && (
            <div className="w-[340px] border-l border-border shrink-0 overflow-hidden">
              <ContactDetail
                contact={selectedContact}
                callLogs={callLogs}
                onUpdate={updateContact}
                onLogCall={logCall}
                onConvert={convertToPatient}
              />
            </div>
          )}
        </div>

        {/* Date filters footer */}
        {viewMode !== "dashboard" && (
          <div className="px-3 py-2 border-t border-border shrink-0">
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
        )}
      </div>

      <NewContactDialog open={newContactOpen} onOpenChange={setNewContactOpen} onCreate={createContact} />
    </AppLayout>
  );
};

export default CRMPage;
