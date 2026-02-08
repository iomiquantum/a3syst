import { MessageSquare } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import InboxSidebar from "@/components/messaging/InboxSidebar";
import ChatView from "@/components/messaging/ChatView";
import ContactPanel from "@/components/messaging/ContactPanel";
import { useMessaging } from "@/hooks/useMessaging";

const MensajesPage = () => {
  const {
    conversations,
    allConversations,
    messages,
    selectedConversation,
    loading,
    sendingMessage,
    funnelFilter,
    setFunnelFilter,
    selectConversation,
    sendMessage,
    updateContactStage,
  } = useMessaging();

  return (
    <AppLayout>
      <div className="h-[calc(100vh-7rem)] -m-6 flex border border-border rounded-lg overflow-hidden bg-card">
        {/* Left: Funnel + Conversation list */}
        <div className="w-[480px] border-r border-border flex shrink-0">
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
              onSelect={selectConversation}
              onFilterChange={setFunnelFilter}
            />
          )}
        </div>

        {/* Center: Chat */}
        <div className="flex-1 flex flex-col min-w-0">
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

        {/* Right: Contact info */}
        {selectedConversation && (
          <div className="w-[300px] border-l border-border shrink-0">
            <ContactPanel
              conversation={selectedConversation}
              onUpdateStage={updateContactStage}
            />
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default MensajesPage;
