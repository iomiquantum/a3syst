import { useState, useMemo } from "react";
import { MessageSquare, ArrowLeft, Bot, Zap, CheckCircle2, AlertCircle } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import InboxSidebar from "@/components/messaging/InboxSidebar";
import ChatView from "@/components/messaging/ChatView";
import ContactPanel from "@/components/messaging/ContactPanel";
import { useMessaging } from "@/hooks/useMessaging";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type Tab = "escalados" | "resueltos";

const MensajesPage = () => {
  const {
    conversations,
    allConversations,
    messages,
    selectedConversation,
    loading,
    sendingMessage,
    funnelFilter,
    channelFilter,
    setFunnelFilter,
    setChannelFilter,
    selectConversation,
    sendMessage,
    updateContactStage,
    updateContact,
    toggleChatbot,
  } = useMessaging();

  const isMobile = useIsMobile();
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");
  const [activeTab, setActiveTab] = useState<Tab>("escalados");
  const [globalAutopilot, setGlobalAutopilot] = useState(true);

  const handleSelectConversation = (conv: any) => {
    selectConversation(conv);
    if (isMobile) setMobileView("chat");
  };

  const handleBack = () => setMobileView("list");

  // Metrics
  const todayMessages = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    return messages.filter(m => m.created_at?.startsWith(today));
  }, [messages]);

  const botMessages = allConversations.filter(c => c.chatbot_active);
  const escalated = allConversations.filter(c => !c.chatbot_active && c.unread_count > 0);
  const activeConvs = allConversations.filter(c => c.status === "open" || c.unread_count > 0);

  // Filtered conversations based on tab
  const tabConversations = useMemo(() => {
    if (activeTab === "escalados") {
      return conversations.filter(c => !c.chatbot_active || c.unread_count > 0);
    }
    return conversations.filter(c => c.chatbot_active && c.unread_count === 0);
  }, [conversations, activeTab]);

  const stats = [
    { label: "Respondidos hoy", value: todayMessages.length, icon: MessageSquare, color: "from-[#8B5CF6] to-[#6D28D9]" },
    { label: "Escalados", value: escalated.length, icon: AlertCircle, color: "from-yellow-500 to-yellow-700" },
    { label: "Activas", value: activeConvs.length, icon: Zap, color: "from-emerald-500 to-emerald-700" },
  ];

  // Mobile layout
  if (isMobile) {
    return (
      <AppLayout>
        <div className="h-[calc(100vh-4rem)] -m-6 flex flex-col border border-border rounded-lg overflow-hidden bg-card">
          {mobileView === "list" ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Mobile header */}
              <div className="px-4 py-3 border-b border-border shrink-0 space-y-3">
                <div className="flex items-center justify-between">
                  <h1 className="text-lg font-bold text-foreground">💬 Mensajes</h1>
                  <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[10px] font-medium text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Autopilot
                  </span>
                </div>
                {/* Tabs */}
                <div className="flex border border-border rounded-lg overflow-hidden">
                  <button onClick={() => setActiveTab("escalados")}
                    className={cn("flex-1 py-2 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors",
                      activeTab === "escalados" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}>
                    <Zap className="w-3 h-3" /> Escalados
                    {escalated.length > 0 && <span className="w-4 h-4 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center">{escalated.length}</span>}
                  </button>
                  <button onClick={() => setActiveTab("resueltos")}
                    className={cn("flex-1 py-2 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors",
                      activeTab === "resueltos" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}>
                    <Bot className="w-3 h-3" /> Resueltos IA
                  </button>
                </div>
              </div>
              {loading ? (
                <div className="flex-1 flex items-center justify-center"><p className="text-sm text-muted-foreground">Cargando...</p></div>
              ) : (
                <InboxSidebar
                  conversations={tabConversations}
                  allConversations={allConversations}
                  selected={selectedConversation}
                  funnelFilter={funnelFilter}
                  channelFilter={channelFilter}
                  onSelect={handleSelectConversation}
                  onFilterChange={setFunnelFilter}
                  onChannelFilterChange={setChannelFilter}
                />
              )}
            </div>
          ) : selectedConversation ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="h-12 px-2 border-b border-border flex items-center gap-2 bg-card shrink-0">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleBack}>
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm font-medium truncate">{selectedConversation.contact?.name || "Chat"}</span>
              </div>
              <div className="flex-1 overflow-hidden">
                <ChatView conversation={selectedConversation} messages={messages} sending={sendingMessage} onSend={sendMessage} onToggleChatbot={toggleChatbot} />
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
              <MessageSquare className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm">Selecciona una conversación</p>
            </div>
          )}
        </div>
      </AppLayout>
    );
  }

  // Desktop layout
  return (
    <AppLayout>
      <div className="h-[calc(100vh-7rem)] -m-6 flex flex-col border border-border rounded-lg overflow-hidden bg-card">
        {/* ═══ TOP BAR ═══ */}
        <div className="px-4 py-3 border-b border-border shrink-0">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-4">
              <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
                💬 Mensajes
              </h1>
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                🤖 Autopilot de Mensajes: Activo
              </span>
            </div>
            <div className="flex items-center gap-4">
              {/* Stats */}
              {stats.map(s => (
                <div key={s.label} className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-md bg-gradient-to-br ${s.color} flex items-center justify-center`}>
                    <s.icon className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground leading-none">{loading ? "—" : s.value}</p>
                    <p className="text-[9px] text-muted-foreground">{s.label}</p>
                  </div>
                </div>
              ))}
              {/* Global toggle */}
              <div className="flex items-center gap-2 pl-3 border-l border-border">
                <span className="text-xs text-muted-foreground">Autopilot</span>
                <Switch checked={globalAutopilot} onCheckedChange={setGlobalAutopilot} />
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-3">
            <button onClick={() => setActiveTab("escalados")}
              className={cn("px-4 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors",
                activeTab === "escalados" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}>
              <Zap className="w-3.5 h-3.5" /> Escalados
              {escalated.length > 0 && (
                <span className="ml-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">{escalated.length}</span>
              )}
            </button>
            <button onClick={() => setActiveTab("resueltos")}
              className={cn("px-4 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors",
                activeTab === "resueltos" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}>
              <Bot className="w-3.5 h-3.5" /> Resueltos por IA
              <span className="ml-1 w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold flex items-center justify-center">{botMessages.length}</span>
            </button>
          </div>
        </div>

        {/* ═══ MAIN AREA ═══ */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <ResizablePanelGroup direction="horizontal" className="h-full">
            <ResizablePanel defaultSize={30} minSize={20} maxSize={45}>
              <div className="h-full flex border-r border-border">
                {loading ? (
                  <div className="flex-1 p-4 space-y-3">
                    {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16 bg-muted" />)}
                  </div>
                ) : (
                  <InboxSidebar
                    conversations={tabConversations}
                    allConversations={allConversations}
                    selected={selectedConversation}
                    funnelFilter={funnelFilter}
                    channelFilter={channelFilter}
                    onSelect={selectConversation}
                    onFilterChange={setFunnelFilter}
                    onChannelFilterChange={setChannelFilter}
                  />
                )}
              </div>
            </ResizablePanel>

            <ResizableHandle withHandle />

            <ResizablePanel defaultSize={45} minSize={30}>
              <div className="h-full flex flex-col min-w-0">
                {selectedConversation ? (
                  <ChatView
                    conversation={selectedConversation}
                    messages={messages}
                    sending={sendingMessage}
                    onSend={sendMessage}
                    onToggleChatbot={toggleChatbot}
                  />
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                    <MessageSquare className="w-12 h-12 mb-3 opacity-30" />
                    <p className="text-sm font-medium">Selecciona una conversación</p>
                    <p className="text-xs mt-1 max-w-xs text-center">
                      {tabConversations.length === 0
                        ? "Aún no hay conversaciones. Los leads empezarán a llegar cuando actives tus campañas o configures el widget de chat."
                        : "Elige un contacto de la lista para ver sus mensajes"}
                    </p>
                  </div>
                )}
              </div>
            </ResizablePanel>

            {selectedConversation && (
              <>
                <ResizableHandle withHandle />
                <ResizablePanel defaultSize={25} minSize={15} maxSize={35}>
                  <div className="h-full border-l border-border overflow-y-auto">
                    <ContactPanel
                      conversation={selectedConversation}
                      onUpdateStage={updateContactStage}
                      onUpdateContact={updateContact}
                      onToggleChatbot={toggleChatbot}
                    />
                  </div>
                </ResizablePanel>
              </>
            )}
          </ResizablePanelGroup>
        </div>
      </div>
    </AppLayout>
  );
};

export default MensajesPage;
