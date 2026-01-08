/**
 * Messages context for simulation terminal output.
 * Provides a way to log messages from anywhere in the app.
 */
import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

export type MessageType = 'info' | 'warning' | 'error';

export interface Message {
  id: number;
  type: MessageType;
  text: string;
  timestamp: Date;
}

interface MessagesContextValue {
  messages: Message[];
  addMessage: (text: string, type?: MessageType) => void;
  clearMessages: () => void;
}

const MessagesContext = createContext<MessagesContextValue | null>(null);

let messageIdCounter = 0;

export function MessagesProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<Message[]>([]);

  const addMessage = useCallback((text: string, type: MessageType = 'info') => {
    const newMessage: Message = {
      id: messageIdCounter++,
      type,
      text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, newMessage]);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return (
    <MessagesContext.Provider value={{ messages, addMessage, clearMessages }}>
      {children}
    </MessagesContext.Provider>
  );
}

export function useMessages() {
  const context = useContext(MessagesContext);
  if (!context) {
    throw new Error('useMessages must be used within a MessagesProvider');
  }
  return context;
}
