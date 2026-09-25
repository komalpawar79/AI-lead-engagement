export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface Configuration {
  id: string;
  projectId: string;
  type: string;
  carpetAreaSqft: number;
  builtUpAreaSqft?: number;
  startingPrice: number;
  maxPrice?: number;
  priceDisplay: string;
  pricePerSqft?: number;
  bathrooms: number;
  balconies: number;
  parkingSpaces?: string;
  facing?: string;
  floorRange?: string;
  availabilityStatus: string;
  floorPlanUrl?: string;
  isActive: boolean;
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  developer: string;
  location: string;
  fullAddress?: string;
  googleMapsUrl?: string;
  reraNumber?: string;
  description?: string;
  propertyType: string;
  configurations?: string;
  priceMin?: number;
  priceMax?: number;
  amenities?: string;
  possession?: string;
  coverImageUrl?: string;
  status: string;
  createdAt: string;
  inventory?: Configuration[];
  _count?: {
    leads: number;
    campaigns: number;
    knowledge: number;
    inventory?: number;
  };
  knowledge?: ProjectKnowledge[];
}

export interface ProjectKnowledge {
  id: string;
  projectId: string;
  category: string;
  question: string;
  answer: string;
  isActive: boolean;
  createdAt: string;
}

export interface Lead {
  id: string;
  name: string;
  phone: string;
  email?: string;
  projectName: string;
  projectId: string;
  campaignName?: string;
  status: string;
  interestLevel: string;
  followUpRequired: boolean;
  followUpReason?: string;
  configuration?: string;
  budget?: number;
  lastReply?: string;
  lastMessageSender?: string;
  lastInteractionAt: string;
  createdAt: string;
}

export interface Campaign {
  id: string;
  name: string;
  projectId: string;
  project?: {
    id: string;
    name: string;
    location: string;
  };
  status: 'DRAFT' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'FAILED';
  totalLeads: number;
  messagesSent: number;
  responses: number;
  interestedLeads: number;
  followUpLeads: number;
  notInterested: number;
  noResponse: number;
  startedAt?: string;
  createdAt: string;
}

export interface FollowUpItem {
  id: string;
  leadId: string;
  conversationId: string;
  leadName: string;
  phone: string;
  email?: string;
  projectName: string;
  projectId: string;
  requirement?: string;
  configuration?: string;
  budget?: number;
  interestLevel: string;
  reason: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'PENDING' | 'EXPORTED' | 'COMPLETED';
  callbackRequested?: boolean;
  siteVisitRequested?: boolean;
  summary?: string;
  identifiedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderType: 'AI' | 'CUSTOMER' | 'SYSTEM';
  messageText: string;
  messageType: string;
  deliveryStatus: 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';
  sentAt: string;
}

export interface AIAnalysis {
  id: string;
  conversationId: string;
  leadId: string;
  intent: string;
  interestLevel: string;
  followUpRequired: boolean;
  followUpReason?: string;
  configuration?: string;
  budget?: number;
  callbackRequested: boolean;
  siteVisitRequested: boolean;
  summary: string;
  confidenceScore: number;
  model: string;
  promptVersion: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  leadId: string;
  channel: 'WHATSAPP' | 'TEST';
  status: string;
  startedAt: string;
  lastMessageAt: string;
  messages: Message[];
  analyses: AIAnalysis[];
  lead?: Lead;
}

export interface DashboardSummary {
  metrics: {
    totalLeads: number;
    messagesSent: number;
    responses: number;
    interestedLeads: number;
    followUpLeads: number;
    notInterested: number;
    noResponse: number;
    conversionRate: string;
    responseRate: string;
  };
  intentDistribution: Array<{
    intent: string;
    count: number;
  }>;
  followUpPreview: FollowUpItem[];
  insights: Array<{
    id: string;
    title: string;
    description: string;
    type: string;
  }>;
}

export interface DashboardActivity {
  id: string;
  leadName: string;
  projectName: string;
  senderType: 'AI' | 'CUSTOMER' | 'SYSTEM';
  messageText: string;
  timestamp: string;
  deliveryStatus: string;
}

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

