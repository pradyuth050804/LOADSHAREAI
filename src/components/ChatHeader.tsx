import { Truck, MessageCircle } from "lucide-react";

export function ChatHeader() {
  return (
    <div className="chat-header">
      <div className="chat-header-content">
        <div className="chat-header-left">
          <div className="chat-header-icon">
            <Truck className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="chat-header-title">Loadshare Networks</h1>
            <div className="chat-header-status">
              <MessageCircle className="h-3 w-3" />
              <span>GRID BUDDY • Online</span>
            </div>
          </div>
        </div>
        
        <div className="chat-header-right">
          <div className="chat-header-support">24/7 Support</div>
          <div className="chat-header-powered">Powered by Llama AI</div>
        </div>
      </div>
    </div>
  );
}