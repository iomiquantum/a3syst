import { useState, useMemo, useEffect } from "react";
import { MessageSquare, ArrowLeft, PanelRightOpen } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import MensajesHeader, { ViewMode } from "@/components/mensajes/MensajesHeader";
import MensajesResumen from "@/components/mensajes/MensajesResumen";
import MensajesPipelineTabs from "@/components/mensajes/MensajesPipelineTabs";
import MensajesSidebar from "@/components/mensajes/MensajesSidebar";
import MensajesConversationList from "@/components/mensajes/MensajesConversationList";
import MensajesChat from "@/components/mensajes/MensajesChat";
import MensajesKanban from "@/components/mensajes/MensajesKanban";
import ContactInfoPanel from "@/components/mensajes/ContactInfoPanel";
import { useConversationsByPipeline, PipelineConversation, PipelineFilter } from "@/hooks/useConversationsByPipeline";
import { usePipelineStats, TimeFilter } from "@/hooks/usePipelineStats";
import { useChannelStats } from "@/hooks/useChannelStats";
import { useTagStats } from "@/hooks/useTagStats";
import { useClinicPipelineTabs } from "@/hooks/useClinicPipelineTabs";
import { Period, periodToDateRange } from "@/components/mensajes/PeriodSelector";
import { TimeSlot, getTimeSlotHours } from "@/components/mensajes/TimeSlotSelector";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { DateRange } from "react-day-picker";
import { startOfDay, endOfDay } from "date-fns";

const VIEW_MODE_KEY = "mensajes-view-mode";

const MensajesPage = () => {
  const isMobile = useIsMobile();
  const [viewMode, setViewMode] = useState<ViewMode>(() => (localStorage.getItem(VIEW_MODE_KEY) as ViewMode) || "buzon");
  const [resumenPeriod, setResumenPeriod] = useState<Period>("hoy");
  const [resumenRange, setResumenRange] = useState<DateRange | undefined>();
  const [timeSlot, setTimeSlot] = useState<TimeSlot>("all");
  const [customTimeStart, setCustomTimeStart] = useState("00:00");
  const [customTimeEnd, setCustomTimeEnd] = useState("23:59");
  const [pipelinePeriod, setPipelinePeriod] = useState<Period>("max");
  const [pipelineRange, setPipelineRange] = useState<DateRange | undefined>();
  const [activeTab, setActiveTab] = useState<PipelineFilter>("todos");
  const [subFilter, setSubFilter] = useState("todos");
  const [selectedChannel, setSelectedChannel] = useState("todos");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedConv, setSelectedConv] = useState<PipelineConversation | null>(null);
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");
  const [showArchived, setShowArchived] = useState(false);
  const [showContactPanel, setShowContactPanel] = useState(false);

  useEffect(() => {
    localStorage.setItem(VIEW_MODE_KEY, viewMode);
  }, [viewMode]);

  const pipelineDates = useMemo(() => {
    if (pipelinePeriod === "rango" && pipelineRange?.from) {
      return { from: pipelineRange.from.toISOString(), to: pipelineRange.to ? pipelineRange.to.toISOString() : undefined };
    }
    return periodToDateRange(pipelinePeriod);
  }, [pipelinePeriod, pipelineRange]);

  // Compute resumen time filter combining period + time slot
  const resumenTimeFilter = useMemo<TimeFilter | undefined>(() => {
    let baseDates: { from?: string; to?: string };
    if (resumenPeriod === "rango" && resumenRange?.from) {
      baseDates = { from: startOfDay(resumenRange.from).toISOString(), to: resumenRange.to ? endOfDay(resumenRange.to).toISOString() : endOfDay(resumenRange.from).toISOString() };
    } else {
      baseDates = periodToDateRange(resumenPeriod);
    }
    if (!baseDates.from) return undefined;

    const fromDate = new Date(baseDates.from);
    const toDate = baseDates.to ? new Date(baseDates.to) : new Date();
    const { startHour, startMin, endHour, endMin } = getTimeSlotHours(timeSlot, customTimeStart, customTimeEnd);

    if (timeSlot !== "all") {
      fromDate.setHours(startHour, startMin, 0, 0);
      toDate.setHours(endHour, endMin, 59, 999);
    }

    return { startDate: fromDate.toISOString(), endDate: toDate.toISOString() };
  }, [resumenPeriod, resumenRange, timeSlot, customTimeStart, customTimeEnd]);

  const { tabCounts, resumenStats, loading: statsLoading, refetch: refetchStats } = usePipelineStats(resumenTimeFilter);

  const { conversations, loading: convsLoading, refetch: refetchConvs } = useConversationsByPipeline({
    pipelineTab: activeTab,
    channel: selectedChannel,
    tags: selectedTags,
    searchQuery,
    periodStart: pipelineDates.from,
    periodEnd: pipelineDates.to,
    showArchived,
    subFilter: (activeTab === "seguimiento_s1" || activeTab === "agendados") ? subFilter : undefined,
  });

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
          <div className="px-3 py-2 border-b border-border shrink-0">
            <MensajesPipelineTabs
              activeTab={activeTab} onTabChange={setActiveTab}
              tabs={pipelineTabs}
              period={pipelinePeriod} onPeriodChange={setPipelinePeriod}
              dateRange={pipelineRange} onDateRangeChange={setPipelineRange}
              subFilter={subFilter} onSubFilterChange={setSubFilter}
              subFilterCounts={subFilterCounts}
            />
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
          />
        </div>

        <div className="px-4 py-2.5 border-b border-border shrink-0">
          <MensajesPipelineTabs
            activeTab={activeTab} onTabChange={setActiveTab}
            tabs={pipelineTabs}
            period={pipelinePeriod} onPeriodChange={setPipelinePeriod}
            dateRange={pipelineRange} onDateRangeChange={setPipelineRange}
            subFilter={subFilter} onSubFilterChange={setSubFilter}
            subFilterCounts={subFilterCounts}
          />
        </div>

        <div className="flex-1 min-h-0 overflow-hidden flex">
          <div className="w-[200px] border-r border-border shrink-0 overflow-hidden hidden md:block">
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
            />
          </div>

          {viewMode === "pipeline" ? (
            <div className="flex-1 min-w-0 overflow-hidden">
              <MensajesKanban conversations={conversations} onActionComplete={handleActionComplete} />
            </div>
          ) : (
            <>
              <div className="w-[280px] border-r border-border shrink-0 overflow-hidden">
                <MensajesConversationList
                  conversations={conversations}
                  selectedId={selectedConv?.id || null}
                  onSelect={handleSelectConv}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  activeFilters={activeFilters}
                  onRemoveFilter={handleRemoveFilter}
                  loading={convsLoading}
                />
              </div>

              <div className="flex-1 min-w-0 overflow-hidden relative">
                {selectedConv ? (
                  <>
                    <MensajesChat
                      conversation={selectedConv}
                      onActionComplete={handleActionComplete}
                      showContactPanel={showContactPanel}
                      onToggleContactPanel={() => setShowContactPanel(p => !p)}
                    />
                    {showContactPanel && (
                      <div className="absolute inset-y-0 right-0 w-[300px] border-l border-border bg-card shadow-lg z-20 hidden md:block">
                        <ContactInfoPanel
                          conversation={selectedConv}
                          onActionComplete={handleActionComplete}
                          onClose={() => setShowContactPanel(false)}
                        />
                      </div>
                    )}
                  </>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                    <MessageSquare className="w-12 h-12 mb-3 opacity-30" />
                    <p className="text-sm font-medium">Selecciona una conversación</p>
                    <p className="text-xs mt-1 max-w-xs text-center">
                      Elige un contacto de la lista para ver sus mensajes
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default MensajesPage;
