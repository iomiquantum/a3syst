import { MessageSquare, ArrowLeft } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import InboxSidebar from "@/components/messaging/InboxSidebar";
import ChatView from "@/components/messaging/ChatView";
import ContactPanel from "@/components/messaging/ContactPanel";
import { useMessaging } from "@/hooks/useMessaging";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState } from "react";
import { Button } from "@/components/ui/button";

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

  const handleSelectConversation = (conv: any) => {
    selectConversation(conv);
    if (isMobile) setMobileView("chat");
  };

  const handleBack = () => {
    setMobileView("list");
  };

  // Mobile layout
  if (isMobile) {
    return (
      <AppLayout>
        <div className="h-[calc(100vh-4rem)] -m-6 flex flex-col border border-border rounded-lg overflow-hidden bg-card">
          {mobileView === "list" ? (
            <div className="flex-1 flex overflow-hidden">
              {loading ? (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-sm text-muted-foreground">Cargando...</p>
                </div>
              ) : (
                <InboxSidebar
                  conversations={conversations}
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
              {/* Mobile back header */}
              <div className="h-12 px-2 border-b border-border flex items-center gap-2 bg-card shrink-0">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleBack}>
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm font-medium truncate">{selectedConversation.contact?.name || "Chat"}</span>
              </div>
              <div className="flex-1 overflow-hidden">
                <ChatView
                  conversation={selectedConversation}
                  messages={messages}
                  sending={sendingMessage}
                  onSend={sendMessage}
                />
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

  // Desktop layout with resizable panels
  return (
    <AppLayout>
      <div className="h-[calc(100vh-7rem)] -m-6 flex border border-border rounded-lg overflow-hidden bg-card">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          <ResizablePanel defaultSize={30} minSize={20} maxSize={45}>
            <div className="h-full flex border-r border-border">
              {loading ? (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-sm text-muted-foreground">Cargando...</p>
                </div>
              ) : (
                <InboxSidebar
                  conversations={conversations}
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
                />
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                  <MessageSquare className="w-12 h-12 mb-3 opacity-30" />
                  <p className="text-sm">Selecciona una conversación</p>
                  <p className="text-xs mt-1">Elige un contacto de la lista para ver sus mensajes</p>
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
    </AppLayout>
  );
};

export default MensajesPage;
