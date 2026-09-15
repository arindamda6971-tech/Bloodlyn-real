export type TicketStatus = "Open" | "In Progress" | "Waiting for User" | "Resolved" | "Closed";
export type TicketPriority = "Critical" | "High" | "Normal" | "Low";

export interface SupportTicket {
  id: string; // e.g. BL-TKT-20260915-00124
  userId: string;
  userName: string;
  userPhone?: string;
  categoryId: string;
  categoryName: string;
  subCategoryName?: string;
  specificIssue: string;
  
  // Context
  orderId?: string;
  bookingId?: string;
  testOrService?: string;
  diagnosticCenter?: string;
  
  // Manual entry
  description?: string;
  attachments?: string[];
  
  // Metadata
  createdAt: string; // ISO date string
  priority: TicketPriority;
  status: TicketStatus;
  resolution?: string;
  lastUpdated: string;
}

// Tree types for the guided flow
export interface IssueNode {
  id: string;
  label: string;
  priority?: TicketPriority; // If this is a leaf node, what priority should it be?
  children?: IssueNode[];
}

export interface SupportCategory {
  id: string;
  title: string;
  subtitle: string;
  icon: any; // Lucide icon component
  requiresOrderContext?: boolean; // If true, prompt for order selection before proceeding
  issues?: IssueNode[];
}
