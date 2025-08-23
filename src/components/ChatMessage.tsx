import { User, Bot } from "lucide-react";

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (message.isUser) {
    return (
      <div className="message message-user">
        <div className="message-content">
          <div className="message-bubble message-bubble-user">
            {message.text}
          </div>
          <div className="message-timestamp message-timestamp-user">
            {formatTime(message.timestamp)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="message message-bot">
      <div className="message-content">
        <div className="message-bubble message-bubble-bot">
          {message.text}
        </div>
        <div className="message-timestamp">
          {formatTime(message.timestamp)}
        </div>
      </div>
    </div>
  );
}