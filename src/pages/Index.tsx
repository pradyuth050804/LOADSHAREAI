import { useRef, useEffect } from "react";
import { ChatMessage } from "@/components/ChatMessage";
import { ChatInput } from "@/components/ChatInput";
import { TypingIndicator } from "@/components/TypingIndicator";
import { QuickActions } from "@/components/QuickActions";
import { ChatHeader } from "@/components/ChatHeader";
import { useChatbot } from "@/hooks/useChatbot";
import { ScrollArea } from "@/components/ui/scroll-area";

const Index = () => {
  const { messages, sendMessage, isLoading } = useChatbot();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages, isLoading]);

  return (
    <div className="min-h-screen bg-chat-background">
      <div className="max-w-6xl mx-auto flex h-screen">
        {/* Sidebar with Quick Actions */}
        <div className="w-80 bg-card border-r p-4 hidden lg:block">
          <QuickActions onActionClick={sendMessage} />
        </div>

        {/* Main Chat Interface */}
        <div className="flex-1 flex flex-col">
          <ChatHeader />
          
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4 max-w-4xl mx-auto">
              {messages.map((message) => (
                <ChatMessage
                  key={message.id}
                  message={message.text}
                  isUser={message.isUser}
                  timestamp={message.timestamp}
                />
              ))}
              {isLoading && <TypingIndicator />}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          <div className="max-w-4xl mx-auto w-full">
            <ChatInput onSendMessage={sendMessage} isLoading={isLoading} />
          </div>

          {/* Mobile Quick Actions */}
          <div className="lg:hidden p-4 bg-card border-t">
            <QuickActions onActionClick={sendMessage} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
