import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { generateWithLlama } from "@/lib/llm";

export interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

// Enhanced conversation context tracking
interface ConversationContext {
  currentOrderId: string | null;
  currentRiderId: string | null;
  currentCustomerName: string | null;
  lastIntent: string | null;
  conversationStage: 'initial' | 'awaiting_order_info' | 'awaiting_rider_info' | 'order_found' | 'rider_found';
  recentSearches: Array<{type: 'order' | 'rider', term: string, timestamp: Date}>;
}

// Helper functions for database queries
const searchOrder = async (searchTerm: string) => {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .or(`order_id.ilike.%${searchTerm}%,awb.ilike.%${searchTerm}%`)
    .single();
    
  if (error && error.code !== 'PGRST116') {
    console.error('Error searching order:', error);
    return null;
  }
  
  return data as any | null;
};

const searchOrderByNameOrPhone = async (term: string) => {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .or(`customer.ilike.%${term}%,phone.ilike.%${term}%`)
    .limit(5);

  if (error) {
    console.error('Error searching order by name/phone:', error);
    return [] as any[];
  }
  return (data ?? []) as any[];
};

const searchRider = async (riderId: string) => {
  const { data, error } = await supabase
    .from('riders')
    .select('*')
    .eq('rider_id', riderId)
    .single();
    
  if (error && error.code !== 'PGRST116') {
    console.error('Error searching rider:', error);
    return null;
  }
  
  return data as any | null;
};

const faqs = [
  {
    question: "What are your delivery timings?",
    answer: "We deliver from 9 AM to 8 PM, Monday to Saturday. Sunday deliveries are available in select cities for express orders."
  },
  {
    question: "How can I track my order?",
    answer: "You can track your order using your Order ID or AWB number. Simply provide it to me and I'll get you the latest status."
  },
  {
    question: "What is the SLA for deliveries?",
    answer: "Standard deliveries: 3-5 business days within city, 5-7 days intercity. Express deliveries: Same day within city, next day intercity."
  }
];

const maskPhoneNumber = (phone: string): string => {
  if (phone.length >= 10) {
    const masked = phone.slice(0, -4).replace(/\d/g, 'X') + phone.slice(-4);
    return masked;
  }
  return phone;
};

const structuredOrderText = (order: any) => {
  const maskedPhone = maskPhoneNumber(order.phone);
  console.log('Order data for structured text:', order); // Debug log
  console.log('Assigned rider ID:', order.assigned_rider_id); // Debug log
  
  return `📦 Order Status for ${order.order_id}:

Customer: ${order.customer}
AWB: ${order.awb}
Status: ${order.status}
Route: ${order.pickup_hub} → ${order.destination_hub}
${order.assigned_rider_id ? `Assigned Rider: ${order.assigned_rider_id}` : 'No rider assigned yet'}
Contact: ${maskedPhone}

${order.status === 'delivered' ? '✅ Package delivered successfully!' : '🚛 Your package is on the way!'}`;
};

// Enhanced context extraction from conversation history
const extractContextFromHistory = (history: Message[]): ConversationContext => {
  const context: ConversationContext = {
    currentOrderId: null,
    currentRiderId: null,
    currentCustomerName: null,
    lastIntent: null,
    conversationStage: 'initial',
    recentSearches: []
  };

  // Look for recent order information
  const recentOrderMsg = history.slice().reverse().find(msg => 
    !msg.isUser && msg.text.includes('Order Status for')
  );
  
  if (recentOrderMsg) {
    const orderIdMatch = recentOrderMsg.text.match(/Order Status for\s+([a-zA-Z0-9-]+)/);
    if (orderIdMatch) {
      context.currentOrderId = orderIdMatch[1];
      context.conversationStage = 'order_found';
    }
    
    // Extract rider ID from order message
    const riderMatch = recentOrderMsg.text.match(/Assigned Rider:\s*([A-Z]\d+)/);
    if (riderMatch) {
      context.currentRiderId = riderMatch[1];
    }
  }

  // Look for recent rider information
  const recentRiderMsg = history.slice().reverse().find(msg => 
    !msg.isUser && msg.text.includes('Rider Information for')
  );
  
  if (recentRiderMsg) {
    const riderIdMatch = recentRiderMsg.text.match(/Rider Information for\s+([A-Z]\d+)/);
    if (riderIdMatch) {
      context.currentRiderId = riderIdMatch[1];
      context.conversationStage = 'rider_found';
    }
  }

  // Look for recent customer name/phone that was provided
  const recentCustomerMsg = history.slice().reverse().find(msg => 
    msg.isUser && 
    !msg.text.toLowerCase().includes('track') && 
    !msg.text.toLowerCase().includes('order') && 
    !msg.text.toLowerCase().includes('status') &&
    !msg.text.toLowerCase().includes('rider') &&
    !msg.text.toLowerCase().includes('hi') &&
    !msg.text.toLowerCase().includes('hello') &&
    !msg.text.toLowerCase().includes('hey') &&
    !msg.text.toLowerCase().includes('yo') &&
    !msg.text.toLowerCase().includes('good morning') &&
    !msg.text.toLowerCase().includes('good afternoon') &&
    !msg.text.toLowerCase().includes('good evening') &&
    msg.text.trim().length > 1 &&
    !/^[a-z]{1,3}$/i.test(msg.text.trim()) // Exclude very short words
  );
  
  if (recentCustomerMsg) {
    context.currentCustomerName = recentCustomerMsg.text.trim();
  }

  // Determine last intent from recent messages
  const recentUserMsg = history.slice().reverse().find(msg => msg.isUser);
  if (recentUserMsg) {
    const msg = recentUserMsg.text.toLowerCase();
    if (msg.includes('track') || msg.includes('order')) {
      context.lastIntent = 'track_order';
    } else if (msg.includes('rider') || msg.includes('delivery person')) {
      context.lastIntent = 'rider_info';
    } else if (msg.includes('status')) {
      context.lastIntent = 'order_status';
    } else if (msg.includes('faq') || msg.includes('help')) {
      context.lastIntent = 'faq';
    }
  }

  return context;
};

// Enhanced intent recognition with context awareness
const recognizeIntent = (userMessage: string, context: ConversationContext): string => {
  const message = userMessage.toLowerCase().trim();
  
  // Check for explicit identifiers first
  if (userMessage.match(/(?:\bLS\s*\d+[\d-]*\b)|(?:\bAWB\s*\d+[\d-]*\b)|\b[A-Z]{2,3}\d{4,8}\b|\b\d{6,12}\b/i)) {
    return 'explicit_order_search';
  }
  
  if (userMessage.match(/\bR\d{2,6}\b/i)) {
    return 'explicit_rider_search';
  }
  
  // Check for follow-up questions with context
  if (context.currentOrderId && (message.includes('rider') || message.includes('delivery person') || message.includes('who is delivering'))) {
    return 'rider_info_for_current_order';
  }
  
  if (context.currentOrderId && (message.includes('status') || message.includes('update'))) {
    return 'order_status_update';
  }
  
  if (context.currentRiderId && (message.includes('location') || message.includes('where') || message.includes('contact'))) {
    return 'rider_details_request';
  }
  
  // Enhanced tracking intent recognition with multiple phrases and keyword detection
  const trackKeywords = ['track', 'tracking', 'find', 'check', 'locate', 'search', 'show', 'where', 'package', 'delivery', 'order'];
  const hasTrackKeywords = trackKeywords.some(keyword => message.includes(keyword));
  
  const trackOrderPhrases = [
    'track', 'tracking', 'track order', 'track my order', 'track package', 'track delivery',
    'where is my order', 'where is my package', 'where is my delivery',
    'find my order', 'find my package', 'find my delivery',
    'check my order', 'check my package', 'check my delivery',
    'my order status', 'order status', 'package status', 'delivery status',
    'i want to track', 'i wanna track', 'i need to track', 'i would like to track',
    'can you track', 'can you find', 'can you check', 'can you locate',
    'help me track', 'help me find', 'help me check',
    'show me my order', 'show me my package', 'show me my delivery',
    'what about my order', 'what about my package', 'what about my delivery',
    'order tracking', 'package tracking', 'delivery tracking',
    'locate my order', 'locate my package', 'locate my delivery',
    'search my order', 'search my package', 'search my delivery'
  ];
  
  // Check for specific patterns first
  if (message.includes('i wanna track') || message.includes('i want to track') || 
      message.includes('i need to track') || message.includes('i would like to track') ||
      message.includes('can you track') || message.includes('help me track') ||
      message.includes('show me my order') || message.includes('where is my order')) {
    return 'track_order';
  }
  
  if (trackOrderPhrases.some(phrase => message.includes(phrase)) || 
      (hasTrackKeywords && (message.includes('order') || message.includes('package') || message.includes('delivery')))) {
    return 'track_order';
  }
  
  // Enhanced rider info intent recognition with multiple phrases and keyword detection
  const riderKeywords = ['rider', 'delivery person', 'delivery guy', 'delivery man', 'driver', 'courier', 'delivery agent', 'who', 'delivering', 'bring'];
  const hasRiderKeywords = riderKeywords.some(keyword => message.includes(keyword));
  
  const riderInfoPhrases = [
    'rider', 'rider info', 'rider information', 'delivery person', 'delivery guy', 'delivery man',
    'who is delivering', 'who is my delivery person', 'who is my rider',
    'delivery driver', 'driver', 'courier', 'delivery agent',
    'rider details', 'delivery person details', 'driver details',
    'who will deliver', 'who will bring', 'who is bringing',
    'delivery contact', 'rider contact', 'driver contact',
    'i want rider info', 'i wanna rider info', 'i need rider info',
    'can you tell me about the rider', 'can you tell me about the delivery person',
    'show me rider info', 'show me delivery person info',
    'rider phone', 'delivery person phone', 'driver phone',
    'rider location', 'delivery person location', 'driver location',
    'where is the rider', 'where is the delivery person', 'where is the driver',
    'rider status', 'delivery person status', 'driver status',
    'my rider', 'my delivery person', 'my driver'
  ];
  
  if (riderInfoPhrases.some(phrase => message.includes(phrase)) || hasRiderKeywords) {
    return 'rider_info';
  }
  
  // Enhanced order status intent recognition with multiple phrases and keyword detection
  const statusKeywords = ['status', 'update', 'progress', 'latest', 'current', 'present', 'how is', 'when will', 'arrive', 'delivered', 'complete', 'timeline', 'details', 'information'];
  const hasStatusKeywords = statusKeywords.some(keyword => message.includes(keyword));
  
  const orderStatusPhrases = [
    'status', 'order status', 'package status', 'delivery status',
    'what is the status', 'what\'s the status', 'what is my status',
    'update', 'order update', 'package update', 'delivery update',
    'latest status', 'current status', 'present status',
    'how is my order', 'how is my package', 'how is my delivery',
    'is my order delivered', 'is my package delivered', 'is my delivery complete',
    'order progress', 'package progress', 'delivery progress',
    'when will it arrive', 'when will it be delivered', 'when will it come',
    'delivery time', 'arrival time', 'estimated delivery',
    'order timeline', 'package timeline', 'delivery timeline',
    'order details', 'package details', 'delivery details',
    'order information', 'package information', 'delivery information'
  ];
  
  if (orderStatusPhrases.some(phrase => message.includes(phrase)) || 
      (hasStatusKeywords && (message.includes('order') || message.includes('package') || message.includes('delivery')))) {
    return 'order_status';
  }
  
  // Enhanced FAQ intent recognition with multiple phrases and keyword detection
  const faqKeywords = ['faq', 'help', 'question', 'ask', 'what', 'how', 'policy', 'support', 'service', 'assistance', 'information', 'details'];
  const hasFaqKeywords = faqKeywords.some(keyword => message.includes(keyword));
  
  const faqPhrases = [
    'faq', 'faqs', 'frequently asked', 'common questions', 'help',
    'question', 'questions', 'ask', 'asking',
    'what are', 'what is', 'how do', 'how can', 'how to',
    'delivery time', 'delivery timing', 'delivery schedule',
    'delivery policy', 'delivery rules', 'delivery terms',
    'shipping time', 'shipping policy', 'shipping rules',
    'return policy', 'refund policy', 'cancellation policy',
    'contact support', 'customer service', 'customer support',
    'help desk', 'support desk', 'service desk',
    'i need help', 'i want help', 'i need assistance',
    'can you help', 'could you help', 'would you help',
    'information', 'details', 'more info', 'more details'
  ];
  
  if (faqPhrases.some(phrase => message.includes(phrase)) || hasFaqKeywords) {
    return 'faq';
  }
  
  // Check for greetings and general inquiries
  const greetingPhrases = [
    'hi', 'hello', 'hey', 'yo', 'good morning', 'good afternoon', 'good evening',
    'greetings', 'howdy', 'what\'s up', 'sup', 'morning', 'afternoon', 'evening'
  ];
  
  if (greetingPhrases.some(phrase => message === phrase || message.startsWith(phrase + ' '))) {
    return 'greeting';
  }
  
  // Check for conversation ending phrases
  const endingPhrases = [
    'thank you', 'thanks', 'thankyou', 'thx', 'ty',
    'bye', 'goodbye', 'good bye', 'see you', 'see ya', 'cya',
    'exit', 'quit', 'end', 'stop', 'done', 'finished',
    'that\'s all', 'thats all', 'that is all',
    'no more questions', 'no more help needed',
    'i\'m done', 'im done', 'i am done',
    'that\'s it', 'thats it', 'that is it',
    'good day', 'have a good day', 'have a great day',
    'take care', 'take care now', 'farewell'
  ];
  
  if (endingPhrases.some(phrase => message.includes(phrase))) {
    return 'conversation_end';
  }
  
  // Check if it looks like a name/phone search (more flexible)
  const looksLikeName = userMessage.match(/^[A-Za-z\s]+$/);
  const isCommand = trackOrderPhrases.some(phrase => message.includes(phrase)) || 
                   riderInfoPhrases.some(phrase => message.includes(phrase)) || 
                   orderStatusPhrases.some(phrase => message.includes(phrase)) || 
                   faqPhrases.some(phrase => message.includes(phrase)) ||
                   greetingPhrases.some(phrase => message.includes(phrase)) ||
                   endingPhrases.some(phrase => message.includes(phrase)) ||
                   hasTrackKeywords || hasRiderKeywords || hasStatusKeywords || hasFaqKeywords;
  const isShortWord = userMessage.trim().split(' ').length === 1 && userMessage.trim().length <= 3;
  
  if (looksLikeName && !isCommand && !isShortWord) {
    return 'name_phone_search';
  }
  
  return 'general_inquiry';
};

const rewriteWithLlama = async (text: string, history: Message[]) => {
  try {
    const response = await generateWithLlama([
      {
        role: 'system',
        content:
          'You are a style assistant. Rewrite the provided message to be clearer and more concise.\n' +
          'STRICT RULES: Do not add, assume, infer, or fabricate any details.\n' +
          'Do not change factual content. If the input is unclear, return it unchanged.'
      },
      ...history.slice(-4).map(m => ({ 
        role: (m.isUser ? 'user' : 'assistant') as 'user' | 'assistant', 
        content: m.text 
      })),
      { role: 'user', content: `Rewrite this exactly without adding facts:\n\n${text}` }
    ], { temperature: 0.2, maxTokens: 300 });
    return (response || text).trim();
  } catch {
    return text;
  }
};

// Helper function to detect out-of-scope questions
const isOutOfScopeQuestion = (message: string): boolean => {
  const lowerMessage = message.toLowerCase();
  
  // Common out-of-scope topics
  const outOfScopePatterns = [
    /earth|planet|round|flat/i,
    /sky|blue|color|weather|temperature|climate/i,
    /politics|election|government/i,
    /sports|football|cricket|basketball/i,
    /movies|music|entertainment/i,
    /science|chemistry|physics|biology/i,
    /history|ancient|world war/i,
    /math|algebra|calculus/i,
    /cooking|recipe|food/i,
    /travel|vacation|tourism/i,
    /ai model|gpt|llama|openai|anthropic/i,
    /what ai|which ai|how ai/i,
    /philosophy|meaning of life|existence/i,
    /religion|god|spiritual/i,
    /art|painting|sculpture/i,
    /technology|computer|software/i
  ];
  
  return outOfScopePatterns.some(pattern => pattern.test(lowerMessage));
};

const generateResponse = async (userMessage: string, history: Message[]): Promise<string> => {
  const message = userMessage.toLowerCase().trim();
  
  // Extract conversation context
  const context = extractContextFromHistory(history);
  
  // First, check if this is an out-of-scope question that should be redirected
  if (isOutOfScopeQuestion(userMessage)) {
    return `🚚 I'm a specialized Logistics AI Assistant, not a general knowledge bot. I can help you with:

📦 **Order Management:**
• Track orders by ID, AWB, or customer details
• Check order status and delivery progress
• View order routes and pickup/delivery hubs

🏍️ **Rider Information:**
• Get delivery person details
• Check rider status and location
• View assigned rider for your order

📋 **Logistics Support:**
• Answer delivery and shipping questions
• Provide order and delivery information
• Help with logistics policies

💡 **Quick Actions Available:**
• Track Order - Find your package
• Order Status - Check delivery progress  
• Rider Info - Get delivery person details
• FAQs - Common logistics questions

How can I help with your logistics needs today?`;
  }

  // Recognize intent with context awareness FIRST
  const intent = recognizeIntent(userMessage, context);
  
  // Handle explicit order/awb tokens first
  if (intent === 'explicit_order_search') {
    const explicitOrderMatch = userMessage.match(/(?:\bLS\s*\d+[\d-]*\b)|(?:\bAWB\s*\d+[\d-]*\b)|\b[A-Z]{2,3}\d{4,8}\b|\b\d{6,12}\b/i);
    if (explicitOrderMatch) {
      const orderId = explicitOrderMatch[0];
      const order = await searchOrder(orderId);
      if (order) {
        const text = structuredOrderText(order);
        return await rewriteWithLlama(text, history);
      } else {
        return `I couldn't find an order with ID/AWB "${orderId}". Please check the number or try providing the customer name/phone.`;
      }
    }
  }

  // Handle explicit rider ID
  if (intent === 'explicit_rider_search') {
    const explicitRiderMatch = userMessage.match(/\bR\d{2,6}\b/i);
    if (explicitRiderMatch) {
      const riderId = explicitRiderMatch[0].toUpperCase();
      const rider = await searchRider(riderId);
      if (rider) {
        const maskedPhone = maskPhoneNumber(rider.phone);
        const locationInfo = rider.location ? 
          `Current Location: ${typeof rider.location === 'object' && rider.location && 
            'coordinates' in rider.location && 
            Array.isArray((rider.location as any).coordinates) ? 
            `Lat: ${((rider.location as any).coordinates[1] as number)?.toFixed(4)}, Lng: ${((rider.location as any).coordinates[0] as number)?.toFixed(4)}` : 
            'Location data available'}` : 'Location not available';
        const lastSeenInfo = rider.last_seen ? 
          `Last Seen: ${new Date(rider.last_seen).toLocaleString()}` : 'Last seen time not available';
        const base = `🏍️ Rider Information for ${rider.rider_id}:

Name: ${rider.name}
Hub: ${rider.hub}
Status: ${rider.status}
${locationInfo}
Vehicle: ${rider.vehicle}
Contact: ${maskedPhone}
${lastSeenInfo}`;
        return await rewriteWithLlama(base, history);
      } else {
        return `❌ Sorry, I couldn't find any rider with ID: "${riderId}". Please check the rider ID and try again.`;
      }
    }
  }

  // Handle greetings FIRST
  if (intent === 'greeting') {
    return `👋 Hello! I'm GRID BUDDY, your logistics assistant. I can help you with:

📦 **Order Management:**
• Track orders by ID, AWB, or customer details
• Check order status and delivery progress
• View order routes and pickup/delivery hubs

🏍️ **Rider Information:**
• Get delivery person details
• Check rider status and location
• View assigned rider for your order

📋 **Logistics Support:**
• Answer delivery and shipping questions
• Provide order and delivery information
• Help with logistics policies

💡 **Quick Actions Available:**
• Track Order - Find your package
• Order Status - Check delivery progress  
• Rider Info - Get delivery person details
• FAQs - Common logistics questions

How can I help with your logistics needs today?`;
  }

  // Handle conversation ending
  if (intent === 'conversation_end') {
    const goodbyeMessages = [
      "You're very welcome! Have a great day! 🚚✨",
      "Happy to help! Have a wonderful day ahead! 📦😊",
      "You're welcome! Hope I was able to assist you well. Have a great day! 🏍️🌟",
      "Thank you for using GRID BUDDY! Have an amazing day! 📋💫",
      "You're welcome! Wishing you a fantastic day! 🚛✨",
      "Glad I could help! Have a wonderful day ahead! 📦😊",
      "You're very welcome! Take care and have a great day! 🏍️🌟",
      "Thank you for choosing GRID BUDDY! Have a splendid day! 📋💫"
    ];
    
    // Randomly select a goodbye message
    const randomIndex = Math.floor(Math.random() * goodbyeMessages.length);
    return goodbyeMessages[randomIndex];
  }

  // Handle order tracking requests FIRST
  if (intent === 'track_order') {
    // If it's just "track order" or similar, ask for details
    if (message === 'track order' || message === 'track' || message === 'order' || 
        message.includes('track order') || message === 'i want to track' || message === 'i wanna track') {
      return "I'd be happy to help you track your order! To get started, could you please provide:\n\n• Your Order ID (e.g., LS001234)\n• AWB number (e.g., AWB789456)\n• Customer name or phone number\n\nWhich one would you like to share?";
    }
    
    // Check if the message contains intent keywords that should not be treated as names
    const intentKeywords = ['track', 'tracking', 'find', 'check', 'locate', 'search', 'show', 'where', 'want', 'wanna', 'need', 'would like', 'can you', 'help me', 'show me', 'what about'];
    const hasIntentKeywords = intentKeywords.some(keyword => message.includes(keyword));
    
    // Only search for names if there are no intent keywords
    if (!hasIntentKeywords) {
      // RAG-ish: search by customer name or phone mentioned in freeform
      const nameOrPhone = userMessage.match(/\+?\d{6,}|[A-Za-z][A-Za-z\s]{1,}/g)?.[0];
      if (nameOrPhone) {
        const candidates = await searchOrderByNameOrPhone(nameOrPhone.trim());
        if (candidates.length === 1) {
          const text = structuredOrderText(candidates[0]);
          return await rewriteWithLlama(text, history);
        }
        if (candidates.length > 1) {
          const list = candidates.slice(0, 5).map(o => `• ${o.order_id} (${o.customer}) - ${o.status}`).join('\n');
          return `I found multiple possible matches. Could you please choose an Order ID or share the AWB?\n${list}`;
        }
        if (candidates.length === 0) {
          return `I couldn't find any orders for "${nameOrPhone.trim()}". Please:\n\n• Double-check the spelling of the name\n• Try providing the Order ID instead\n• Or share a different customer name/phone number`;
        }
      }
    }

    return "I'd be happy to help you track your order! To get started, could you please provide:\n\n• Your Order ID (e.g., LS001234)\n• AWB number (e.g., AWB789456)\n• Customer name or phone number\n\nWhich one would you like to share?";
  }

  // Handle order status requests FIRST
  if (intent === 'order_status') {
    // If we have context from a recent order, use it
    if (context.currentOrderId) {
      const order = await searchOrder(context.currentOrderId);
      if (order) {
        const text = structuredOrderText(order);
        return await rewriteWithLlama(text, history);
      }
    }
    
    // If we have a customer name from context, try searching
    if (context.currentCustomerName) {
      const candidates = await searchOrderByNameOrPhone(context.currentCustomerName);
      if (candidates.length === 1) {
        const text = structuredOrderText(candidates[0]);
        return await rewriteWithLlama(text, history);
      }
      if (candidates.length > 1) {
        const list = candidates.slice(0, 5).map(o => `• ${o.order_id} (${o.customer}) - ${o.status}`).join('\n');
        return `I found multiple possible matches for "${context.currentCustomerName}". Please choose one Order ID or provide the AWB:\n${list}`;
      }
    }

    return "To check your order status, could you please provide:\n\n• Your Order ID (e.g., LS001234)\n• AWB number (e.g., AWB789456)\n• Customer name or phone number\n\nI'll then show you the complete order details and status.";
  }

  // Handle rider info requests FIRST
  if (intent === 'rider_info') {
    // Check if there's a recent order context
    if (context.currentOrderId) {
      const order = await searchOrder(context.currentOrderId);
      if (order && order.assigned_rider_id) {
        const rider = await searchRider(order.assigned_rider_id);
        if (rider) {
          const maskedPhone = maskPhoneNumber(rider.phone);
          const locationInfo = rider.location ? 
            `Current Location: ${typeof rider.location === 'object' && rider.location && 
              'coordinates' in rider.location && 
              Array.isArray((rider.location as any).coordinates) ? 
              `Lat: ${((rider.location as any).coordinates[1] as number)?.toFixed(4)}, Lng: ${((rider.location as any).coordinates[0] as number)?.toFixed(4)}` : 
              'Location data available'}` : 'Location not available';
          const lastSeenInfo = rider.last_seen ? 
            `Last Seen: ${new Date(rider.last_seen).toLocaleString()}` : 'Last seen time not available';
          
          const base = `🏍️ Your delivery person for order ${context.currentOrderId} is ${rider.name} (${rider.rider_id}):

Hub: ${rider.hub}
Status: ${rider.status}
${locationInfo}
Vehicle: ${rider.vehicle}
Contact: ${maskedPhone}
${lastSeenInfo}`;
          return await rewriteWithLlama(base, history);
        } else {
          return `I can see your order ${context.currentOrderId} has an assigned rider (${order.assigned_rider_id}), but I'm unable to retrieve their current information. Please contact support for assistance.`;
        }
      } else if (order) {
        return `I can see your order ${context.currentOrderId}, but no rider has been assigned yet. The order is currently being processed.`;
      }
    }
    
    // If no context, ask for order information
    return "To get rider information, I'll need to find your order first. Could you please provide:\n\n• Your Order ID (e.g., LS001234)\n• AWB number (e.g., AWB789456)\n• Customer name or phone number\n\nOnce I find your order, I can show you the assigned rider's details.";
  }

  // Handle rider info for current order (context-aware)
  if (intent === 'rider_info_for_current_order' && context.currentOrderId) {
    const order = await searchOrder(context.currentOrderId);
    if (order && order.assigned_rider_id) {
      const rider = await searchRider(order.assigned_rider_id);
      if (rider) {
        const maskedPhone = maskPhoneNumber(rider.phone);
        const locationInfo = rider.location ? 
          `Current Location: ${typeof rider.location === 'object' && rider.location && 
            'coordinates' in rider.location && 
            Array.isArray((rider.location as any).coordinates) ? 
            `Lat: ${((rider.location as any).coordinates[1] as number)?.toFixed(4)}, Lng: ${((rider.location as any).coordinates[0] as number)?.toFixed(4)}` : 
            'Location data available'}` : 'Location not available';
        const lastSeenInfo = rider.last_seen ? 
          `Last Seen: ${new Date(rider.last_seen).toLocaleString()}` : 'Last seen time not available';
        
        const base = `🏍️ Your delivery person for order ${context.currentOrderId} is ${rider.name} (${rider.rider_id}):

Hub: ${rider.hub}
Status: ${rider.status}
${locationInfo}
Vehicle: ${rider.vehicle}
Contact: ${maskedPhone}
${lastSeenInfo}`;
        return await rewriteWithLlama(base, history);
      } else {
        return `I can see your order ${context.currentOrderId} has an assigned rider (${order.assigned_rider_id}), but I'm unable to retrieve their current information. Please contact support for assistance.`;
      }
    } else if (order) {
      return `I can see your order ${context.currentOrderId}, but no rider has been assigned yet. The order is currently being processed.`;
    }
  }

  // Handle order status update for current order (context-aware)
  if (intent === 'order_status_update' && context.currentOrderId) {
    const order = await searchOrder(context.currentOrderId);
    if (order) {
      const text = structuredOrderText(order);
      return await rewriteWithLlama(text, history);
    }
  }

  // Handle general FAQ queries without specific matches
  if (intent === 'faq') {
    return "I can help with common questions about:\n• Delivery timings and policies\n• Order tracking methods\n• Rider information\n• General logistics support\n\nWhat specific question do you have?";
  }

  // Handle name/phone search LAST (only if no other intent was matched)
  if (intent === 'name_phone_search') {
    const candidates = await searchOrderByNameOrPhone(userMessage.trim());
    if (candidates.length === 1) {
      const text = structuredOrderText(candidates[0]);
      return await rewriteWithLlama(text, history);
    }
    if (candidates.length > 1) {
      const list = candidates.slice(0, 5).map(o => `• ${o.order_id} (${o.customer}) - ${o.status}`).join('\n');
      return `I found multiple possible matches for "${userMessage.trim()}". Please choose one Order ID or provide the AWB:\n${list}`;
    }
    if (candidates.length === 0) {
      return `I couldn't find any orders for "${userMessage.trim()}". Please:\n\n• Double-check the spelling of the name\n• Try providing the Order ID instead (e.g., LS001234)\n• Or share a different customer name/phone number`;
    }
  }

  // FAQ search
  const faqMatch = faqs.find(faq => 
    faq.question.toLowerCase().includes(message) || 
    message.includes(faq.question.toLowerCase().split(' ').slice(0, 2).join(' '))
  );
  if (faqMatch) {
    const base = `❓ ${faqMatch.question}\n\n${faqMatch.answer}`;
    return await rewriteWithLlama(base, history);
  }

  // Handle quick action intents
  if (message.includes('i want to track') || message.includes('i want to check')) {
    return "Great! To track your order, I'll need some information. Could you please provide:\n\n• Your Order ID (e.g., LS001234)\n• AWB number (e.g., AWB789456)\n• Customer name or phone number\n\nWhich one would you like to share?";
  }

  if (message.includes('i want rider')) {
    return "To get rider information, I'll need to find your order first. Could you please provide:\n\n• Your Order ID (e.g., LS001234)\n• AWB number (e.g., AWB789456)\n• Customer name or phone number\n\nOnce I find your order, I can show you the assigned rider's details.";
  }

  // If we get here, show the intro message for any unclear requests
  return `🚚 I'm a specialized Logistics AI Assistant, not a general knowledge bot. I can help you with:

📦 **Order Management:**
• Track orders by ID, AWB, or customer details
• Check order status and delivery progress
• View order routes and pickup/delivery hubs

🏍️ **Rider Information:**
• Get delivery person details
• Check rider status and location
• View assigned rider for your order

📋 **Logistics Support:**
• Answer delivery and shipping questions
• Provide order and delivery information
• Help with logistics policies

💡 **Quick Actions Available:**
• Track Order - Find your package
• Order Status - Check delivery progress  
• Rider Info - Get delivery person details
• FAQs - Common logistics questions

How can I help with your logistics needs today?`;
};

export const useChatbot = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      text: "Hello! I'm GRID BUDDY, your logistics assistant. I can help you with orders, riders, and logistics policies.",
      isUser: false,
      timestamp: new Date()
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = useCallback(async (userMessage: string) => {
    const userMsg: Message = {
      id: Date.now().toString(),
      text: userMessage,
      isUser: true,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      // slight delay for better UX
      await new Promise(resolve => setTimeout(resolve, 400));
      
      const response = await generateResponse(userMessage, [...messages, userMsg]);
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: response,
        isUser: false,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (error) {
      console.error('Error generating response:', error);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: "Sorry, I encountered an error while processing your request. Please try again.",
        isUser: false,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  }, [messages]);

  return { messages, sendMessage, isLoading };
};