import { useState, useMemo, useEffect } from "react";
import { MessageSquare, ArrowLeft } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import MensajesHeader, { ViewMode } from "@/components/mensajes/MensajesHeader";
import MensajesResumen from "@/components/mensajes/MensajesResumen";
import MensajesPipelineTabs from "@/components/mensajes/MensajesPipelineTabs";
import MensajesSidebar from "@/components/mensajes/MensajesSidebar";
import MensajesConversationList from "@/components/mensajes/MensajesConversationList";
import MensajesChat from "@/components/mensajes/MensajesChat";
import MensajesKanban from "@/components/mensajes/MensajesKanban";
import { useConversationsByPipeline, PipelineConversation, PipelineFilter } from "@/hooks/useConversationsByPipeline";
import { usePipelineStats } from "@/hooks/usePipelineStats";
import { useChannelStats } from "@/hooks/useChannelStats";
import { useTagStats } from "@/hooks/useTagStats";
import { useClinicPipelineTabs } from "@/hooks/useClinicPipelineTabs";
import { Period } from "@/components/mensajes/PeriodSelector";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { DateRange } from "react-day-picker";

const VIEW_MODE_KEY = "mensajes-view-mode";

const MensajesPage = () => {
  const isMobile = useIsMobile();
  const [viewMode, setViewMode] = useState<ViewMode>(() => (localStorage.getItem(VIEW_MODE_KEY) as ViewMode) || "buzon");
  const [resumenPeriod, setResumenPeriod] = useState<Period>("hoy");
  const [resumenRange, setResumenRange] = useState<DateRange | undefined>();
  const [pipelinePeriod, setPipelinePeriod] = useState<Period>("semana");
  const [pipelineRange, setPipelineRange] = useState<DateRange | undefined>();
  const [activeTab, setActiveTab] = useState<PipelineFilter>("todos");
  const [selectedChannel, setSelectedChannel] = useState("todos");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedConv, setSelectedConv] = useState<PipelineConversation | null>(null);
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");

  useEffect(() => {
    localStorage.setItem(VIEW_MODE_KEY, viewMode);
  }, [viewMode]);

  // Real data hooks
  const { tabCounts, resumenStats, loading: statsLoading, refetch: refetchStats } = usePipelineStats();
  const { counts: channelCounts, total: channelTotal } = useChannelStats();
  const { tags: tagStats } = useTagStats();
  const { tabs: pipelineTabs, refetch: refetchTabs } = useClinicPipelineTabs();

  const { conversations, loading: convsLoading, refetch: refetchConvs } = useConversationsByPipeline({
    pipelineTab: activeTab,
    channel: selectedChannel,
    tags: selectedTags,
    searchQuery,
  });

  const handleActionComplete = () => {
    refetchConvs();
    refetchStats();
    refetchTabs();
  };

  // Active filter chips
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
            <MensajesHeader viewMode={viewMode} onViewModeChange={setViewMode} />
          </div>
          <div className="px-3 py-2 border-b border-border shrink-0">
            <MensajesPipelineTabs
              activeTab={activeTab} onTabChange={setActiveTab}
              tabs={pipelineTabs}
              period={pipelinePeriod} onPeriodChange={setPipelinePeriod}
              dateRange={pipelineRange} onDateRangeChange={setPipelineRange}
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
        {/* NIVEL 1 — Header */}
        <div className="px-4 py-3 border-b border-border shrink-0">
          <MensajesHeader viewMode={viewMode} onViewModeChange={setViewMode} />
        </div>

        {/* NIVEL 2 — Resumen ejecutivo */}
        <div className="px-4 py-2.5 border-b border-border shrink-0">
          <MensajesResumen
            stats={resumenStats}
            loading={statsLoading}
            period={resumenPeriod} onPeriodChange={setResumenPeriod}
            dateRange={resumenRange} onDateRangeChange={setResumenRange}
          />
        </div>

        {/* NIVEL 3 — Pipeline tabs */}
        <div className="px-4 py-2.5 border-b border-border shrink-0">
          <MensajesPipelineTabs
            activeTab={activeTab} onTabChange={setActiveTab}
            tabs={pipelineTabs}
            period={pipelinePeriod} onPeriodChange={setPipelinePeriod}
            dateRange={pipelineRange} onDateRangeChange={setPipelineRange}
          />
        </div>

        {/* NIVEL 4 — 3 paneles */}
        <div className="flex-1 min-h-0 overflow-hidden flex">
          {/* Sidebar filtros */}
          <div className="w-[200px] border-r border-border shrink-0 overflow-hidden hidden md:block">
            <MensajesSidebar
              channelCounts={channelCounts}
              totalConversations={channelTotal}
              tagStats={tagStats}
              selectedChannel={selectedChannel}
              onChannelChange={setSelectedChannel}
              selectedTags={selectedTags}
              onTagsChange={setSelectedTags}
            />
          </div>

          {viewMode === "pipeline" ? (
            <div className="flex-1 min-w-0 overflow-hidden">
              <MensajesKanban conversations={conversations} onActionComplete={handleActionComplete} />
            </div>
          ) : (
            <>
              {/* Lista de conversaciones */}
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

              {/* Chat activo */}
              <div className="flex-1 min-w-0 overflow-hidden">
                {selectedConv ? (
                  <MensajesChat conversation={selectedConv} onActionComplete={handleActionComplete} />
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
