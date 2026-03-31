import { createContext, useContext, useState, ReactNode } from "react";

export interface CopilotMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isVoice?: boolean;
}

interface CopilotContextType {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  messages: CopilotMessage[];
  setMessages: React.Dispatch<React.SetStateAction<CopilotMessage[]>>;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  clearMessages: () => void;
}

const CopilotContext = createContext<CopilotContextType | undefined>(undefined);

export const CopilotProvider = ({ children }: { children: ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<CopilotMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const clearMessages = () => setMessages([]);

  return (
    <CopilotContext.Provider value={{ isOpen, setIsOpen, messages, setMessages, isLoading, setIsLoading, clearMessages }}>
      {children}
    </CopilotContext.Provider>
  );
};

export const useCopilotContext = () => {
  const context = useContext(CopilotContext);
  if (!context) throw new Error("useCopilotContext must be used within CopilotProvider");
  return context;
};
