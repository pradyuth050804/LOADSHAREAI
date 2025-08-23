import { Bot } from "lucide-react";

export function TypingIndicator() {
  return (
    <div className="typing-indicator">
      <div className="typing-bubble">
        <div className="typing-dots">
          <div className="typing-dot"></div>
          <div className="typing-dot"></div>
          <div className="typing-dot"></div>
        </div>
        <span className="typing-text">GRID BUDDY is typing...</span>
      </div>
    </div>
  );
}