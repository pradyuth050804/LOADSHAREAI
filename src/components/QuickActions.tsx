import { 
  Package, 
  Users, 
  MapPin, 
  HelpCircle
} from "lucide-react";

interface QuickActionsProps {
  onActionClick: (message: string) => void;
}

export function QuickActions({ onActionClick }: QuickActionsProps) {
  const actions = [
    {
      title: "Track Order",
      description: "Check order status",
      icon: Package,
      action: "I want to track an order. Please ask me for my Order ID, AWB, or customer name/phone."
    },
    {
      title: "Rider Info",
      description: "Get rider details",
      icon: Users,
      action: "I want rider details"
    },
    {
      title: "Order Status",
      description: "Check delivery progress",
      icon: MapPin,
      action: "order status"
    },
    {
      title: "FAQs",
      description: "Common questions",
      icon: HelpCircle,
      action: "I have a question. What would you like to know about our services?"
    }
  ];

  return (
    <div>
      {actions.map((action, index) => {
        const IconComponent = action.icon;
        return (
          <button
            key={index}
            onClick={() => onActionClick(action.action)}
            className="quick-action-button"
          >
            <IconComponent className="quick-action-icon" />
            <div className="quick-action-text">
              <div className="quick-action-title">{action.title}</div>
              <div className="quick-action-description">{action.description}</div>
            </div>
          </button>
        );
      })}
    </div>
  );
}