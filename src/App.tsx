import { useState } from "react";
import { ChatHeader } from "./components/ChatHeader";
import { ChatInput } from "./components/ChatInput";
import { ChatMessage } from "./components/ChatMessage";
import { QuickActions } from "./components/QuickActions";
import { TypingIndicator } from "./components/TypingIndicator";
import { useChatbot } from "./hooks/useChatbot";
import "./App.css";

export default function App() {
  const { messages, sendMessage, isLoading } = useChatbot();

  return (
    <div className="app-container">
      {/* Left Sidebar - Quick Actions */}
      <div className="sidebar">
        <div className="sidebar-content">
          <div className="sidebar-header">
            <h2 className="sidebar-title">Quick Actions</h2>
            <p className="sidebar-subtitle">Get instant help with common queries</p>
          </div>
          <QuickActions onActionClick={sendMessage} />
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="chat-area">
        {/* Chat Header */}
        <ChatHeader />

        {/* Messages Container */}
        <div className="messages-container">
          {messages.map((message, index) => (
            <ChatMessage key={index} message={message} />
          ))}
          {isLoading && <TypingIndicator />}
        </div>

        {/* Chat Input */}
        <div className="input-container">
          <ChatInput onSendMessage={sendMessage} isLoading={isLoading} />
        </div>
      </div>
    </div>
  );
}
