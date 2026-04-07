import { useState, useMemo, useEffect } from "react";
import { MessageSquare, ArrowLeft } from "lucide-react";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import AppLayout from "@/components/AppLayout";
import MensajesHeader, { ViewMode } from "@/components/mensajes/MensajesHeader";
import MensajesResumen from "@/components/mensajes/MensajesResumen";
import MensajesSidebar from "@/components/mensajes/MensajesSidebar";
import MensajesConversationList from "@/components/mensajes/MensajesConversationList";
import MensajesChat from "@/components/mensajes/MensajesChat";
import MensajesKanban from "@/components/mensajes/MensajesKanban";
import ContactInfoPanel from "@/components/mensajes/ContactInfoPanel";
import DeletedConversationsPanel from "@/components/mensajes/DeletedConversationsPanel";
import { useConversationsByPipeline, PipelineConversation, PipelineFilter } from "@/hooks/useConversationsByPipeline";
import { usePipelineStats, TimeFilter } from "@/hooks/usePipelineStats";
import { useChannelStats } from "@/hooks/useChannelStats";
import { useTagStats } from "@/hooks/useTagStats";
import { useClinicPipelineTabs } from "@/hooks/useClinicPipelineTabs";
import { Period, periodToDateRange, dayOfWeekToDateRange } from "@/components/mensajes/PeriodSelector";
import { TimeSlot, getTimeSlotHours } from "@/components/mensajes/TimeSlotSelector";
import { useIsMobile } from "@/hooks/use-mobile";
import { useClinic } from "@/hooks/useClinic";
import { Button } from "@/components/ui/button";
import { DateRange } from "react-day-picker";
import { startOfDay, endOfDay } from "date-fns";

const VIEW_MODE_KEY = "mensajes-view-mode";

const MensajesPage = () => {
  const isMobile = useIsMobile();
  const { userRole, isSuperAdmin } = useClinic();
  const isAdmin = isSuperAdmin || userRole === "admin" || userRole === "manager";
  const [viewMode, setViewMode] = useState<ViewMode>(() => (localStorage.getItem(VIEW_MODE_KEY) as ViewMode) || "buzon");
  const [resumenPeriod, setResumenPeriod] = useState<Period>("hoy");
  const [resumenRange, setResumenRange] = useState<DateRange | undefined>();
  const [selectedDayOfWeek, setSelectedDayOfWeek] = useState<number>(0);
  const [timeSlot, setTimeSlot] = useState<TimeSlot>("all");
  const [customTimeStart, setCustomTimeStart] = useState("00:00");
  const [customTimeEnd, setCustomTimeEnd] = useState("23:59");
  const [activeTab, setActiveTab] = useState<PipelineFilter>("todos");
  const [selectedChannel, setSelectedChannel] = useState("todos");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedConv, setSelectedConv] = useState<PipelineConversation | null>(null);
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");
  const [showArchived, setShowArchived] = useState(false);
  const [showDeleted, setShowDeleted] = useState(false);
  const [showContactPanel, setShowContactPanel] = useState(false);

  useEffect(() => {
    localStorage.setItem(VIEW_MODE_KEY, viewMode);
  }, [viewMode]);

  // Unified date range used for BOTH stats and conversation list
  const unifiedDates = useMemo(() => {
    if (resumenPeriod === "rango" && resumenRange?.from) {
      return {
        from: startOfDay(resumenRange.from).toISOString(),
        to: resumenRange.to ? endOfDay(resumenRange.to).toISOString() : endOfDay(resumenRange.from).toISOString(),
      };
    }
    if (resumenPeriod === "dia") {
      return dayOfWeekToDateRange(selectedDayOfWeek);
    }
    return periodToDateRange(resumenPeriod);
  }, [resumenPeriod, resumenRange, selectedDayOfWeek]);

  const resumenTimeFilter = useMemo<TimeFilter | undefined>(() => {
    if (!unifiedDates.from) return undefined;

    const fromDate = new Date(unifiedDates.from);
    const toDate = unifiedDates.to ? new Date(unifiedDates.to) : new Date();
    const { startHour, startMin, endHour, endMin } = getTimeSlotHours(timeSlot, customTimeStart, customTimeEnd);

    if (timeSlot !== "all") {
      fromDate.setHours(startHour, startMin, 0, 0);
      toDate.setHours(endHour, endMin, 59, 999);
    }

    return { startDate: fromDate.toISOString(), endDate: toDate.toISOString() };
  }, [unifiedDates, timeSlot, customTimeStart, customTimeEnd]);

  // Conversation list date filter (also applies time slot)
  const convDates = useMemo(() => {
    if (!unifiedDates.from) return { from: undefined, to: undefined };

    const fromDate = new Date(unifiedDates.from);
    const toDate = unifiedDates.to ? new Date(unifiedDates.to) : new Date();
    const { startHour, startMin, endHour, endMin } = getTimeSlotHours(timeSlot, customTimeStart, customTimeEnd);

    if (timeSlot !== "all") {
      fromDate.setHours(startHour, startMin, 0, 0);
      toDate.setHours(endHour, endMin, 59, 999);
    }

    return { from: fromDate.toISOString(), to: toDate.toISOString() };
  }, [unifiedDates, timeSlot, customTimeStart, customTimeEnd]);

  const { resumenStats, loading: statsLoading, refetch: refetchStats } = usePipelineStats(resumenTimeFilter);
  const { counts: channelCounts, total: channelTotal } = useChannelStats();
  const { tags: tagStats } = useTagStats();
  const { tabs: pipelineTabs, refetch: refetchTabs } = useClinicPipelineTabs();

  const { conversations, loading: convsLoading, refetch: refetchConvs } = useConversationsByPipeline({
    pipelineTab: activeTab,
    channel: selectedChannel,
    tags: selectedTags,
    searchQuery,
    periodStart: convDates.from,
    periodEnd: convDates.to,
    showArchived,
  });

  useEffect(() => {
    if (!selectedConv) return;

    const refreshedConversation = conversations.find((conversation) => conversation.id === selectedConv.id);

    if (!refreshedConversation) {
      setSelectedConv(null);
      setShowContactPanel(false);
      if (isMobile) setMobileView("list");
      return;
    }

    if (refreshedConversation !== selectedConv) {
      setSelectedConv(refreshedConversation);
    }
  }, [conversations, selectedConv, isMobile]);

  const handleActionComplete = () => {
    refetchConvs();
    refetchStats();
    refetchTabs();
  };

  const activeFilters = useMemo(() => {
    const chips: { key: string; label: string; color?: string }[] = [];
    if (selectedChannel !== "todos") {
      chips.push({ key: `channel:${selectedChannel}`, label: selectedChannel === "whatsapp" ? "WhatsApp" : selectedChannel, color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300" });
    }
    selectedTags.forEach(t => {
      chips.push({ key: `tag:${t}`, label: t, color: "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300" });
    });
    return chips;
  }, [selectedChannel, selectedTags]);

  const handleRemoveFilter = (key: string) => {
    if (key.startsWith("channel:")) setSelectedChannel("todos");
    if (key.startsWith("tag:")) setSelectedTags(prev => prev.filter(t => `tag:${t}` !== key));
  };

  const handleSelectConv = (c: PipelineConversation) => {
    setSelectedConv(c);
    if (isMobile) setMobileView("chat");
  };

  // Mobile chat view
  if (isMobile && mobileView === "chat" && selectedConv) {
    return (
      <AppLayout>
        <div className="h-[calc(100vh-4rem)] -m-6 flex flex-col border border-border rounded-lg overflow-hidden bg-card">
          <div className="h-12 px-2 border-b border-border flex items-center gap-2 bg-card shrink-0">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setMobileView("list")}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm font-medium truncate">{selectedConv.contactName}</span>
          </div>
          <div className="flex-1 overflow-hidden">
            <MensajesChat conversation={selectedConv} onActionComplete={handleActionComplete} />
          </div>
        </div>
      </AppLayout>
    );
  }

  // Mobile list view
  if (isMobile) {
    return (
      <AppLayout>
        <div className="h-[calc(100vh-4rem)] -m-6 flex flex-col border border-border rounded-lg overflow-hidden bg-card">
          <div className="px-3 py-2 border-b border-border shrink-0 space-y-2">
            <MensajesHeader viewMode={viewMode} onViewModeChange={setViewMode} selectedChannel={selectedChannel} />
          </div>
          <div className="flex-1 min-h-0 overflow-hidden">
            {viewMode === "pipeline" ? (
              <MensajesKanban conversations={conversations} onActionComplete={handleActionComplete} />
            ) : (
              <MensajesConversationList
                conversations={conversations}
                selectedId={selectedConv?.id || null}
                onSelect={handleSelectConv}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                activeFilters={activeFilters}
                onRemoveFilter={handleRemoveFilter}
                loading={convsLoading}
                onBulkActionComplete={handleActionComplete}
              />
            )}
          </div>
        </div>
      </AppLayout>
    );
  }

  // Desktop layout
  return (
    <AppLayout>
      <div className="h-[calc(100vh-7rem)] -m-6 flex flex-col border border-border rounded-lg overflow-hidden bg-card">
        <div className="px-4 py-3 border-b border-border shrink-0">
          <MensajesHeader viewMode={viewMode} onViewModeChange={setViewMode} selectedChannel={selectedChannel} />
        </div>

        <div className="px-4 py-2.5 border-b border-border shrink-0">
          <MensajesResumen
            stats={resumenStats}
            loading={statsLoading}
            period={resumenPeriod} onPeriodChange={setResumenPeriod}
            dateRange={resumenRange} onDateRangeChange={setResumenRange}
            timeSlot={timeSlot} onTimeSlotChange={setTimeSlot}
            customStart={customTimeStart} customEnd={customTimeEnd}
            onCustomTimeChange={(s, e) => { setCustomTimeStart(s); setCustomTimeEnd(e); }}
            selectedDayOfWeek={selectedDayOfWeek} onDayOfWeekChange={setSelectedDayOfWeek}
          />
        </div>

        <div className="flex-1 min-h-0 overflow-hidden flex">
          <div className="w-[220px] border-r border-border shrink-0 overflow-hidden hidden md:block">
            <MensajesSidebar
              channelCounts={channelCounts}
              totalConversations={channelTotal}
              tagStats={tagStats}
              selectedChannel={selectedChannel}
              onChannelChange={setSelectedChannel}
              selectedTags={selectedTags}
              onTagsChange={setSelectedTags}
              showArchived={showArchived}
              onShowArchivedChange={setShowArchived}
              showDeleted={showDeleted}
              onShowDeletedChange={setShowDeleted}
              isAdmin={isAdmin}
              embudoTabs={pipelineTabs}
              activeEmbudoKey={activeTab}
              onEmbudoChange={(key) => setActiveTab(key as PipelineFilter)}
            />
          </div>

          {showDeleted ? (
            <div className="flex-1 min-w-0 overflow-hidden">
              <DeletedConversationsPanel onRestore={handleActionComplete} />
            </div>
          ) : viewMode === "pipeline" ? (
            <div className="flex-1 min-w-0 overflow-hidden">
              <MensajesKanban conversations={conversations} onActionComplete={handleActionComplete} />
            </div>
          ) : (
            <ResizablePanelGroup direction="horizontal" className="flex-1 min-w-0">
              <ResizablePanel defaultSize={25} minSize={18} maxSize={45} className="overflow-hidden">
                <MensajesConversationList
                  conversations={conversations}
                  selectedId={selectedConv?.id || null}
                  onSelect={handleSelectConv}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  activeFilters={activeFilters}
                  onRemoveFilter={handleRemoveFilter}
                  loading={convsLoading}
                  onBulkActionComplete={handleActionComplete}
                />
              </ResizablePanel>

              <ResizableHandle withHandle />

              <ResizablePanel defaultSize={75} minSize={40} className="overflow-hidden relative flex">
                {selectedConv ? (
                  <>
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <MensajesChat
                        conversation={selectedConv}
                        onActionComplete={handleActionComplete}
                        showContactPanel={showContactPanel}
                        onToggleContactPanel={() => setShowContactPanel(p => !p)}
                      />
                    </div>
                    {showContactPanel && (
                      <div className="w-[300px] shrink-0 border-l border-border bg-card hidden md:block overflow-y-auto">
                        <ContactInfoPanel
                          conversation={selectedConv}
                          onActionComplete={handleActionComplete}
                          onClose={() => setShowContactPanel(false)}
                        />
                      </div>
                    )}
                  </>
                ) : (
                  <div className="h-full w-full flex flex-col items-center justify-center text-muted-foreground">
                    <MessageSquare className="w-12 h-12 mb-3 opacity-30" />
                    <p className="text-sm font-medium">Selecciona una conversación</p>
                    <p className="text-xs mt-1 max-w-xs text-center">
                      Elige un contacto de la lista para ver sus mensajes
                    </p>
                  </div>
                )}
              </ResizablePanel>
            </ResizablePanelGroup>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default MensajesPage;
