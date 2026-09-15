import { useState, useEffect } from 'react';
import { SupportTicket } from '@/types/support';

const TICKETS_STORAGE_KEY = 'bloodlyn_support_tickets';

export const useSupportTickets = () => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);

  useEffect(() => {
    const storedTickets = localStorage.getItem(TICKETS_STORAGE_KEY);
    if (storedTickets) {
      try {
        setTickets(JSON.parse(storedTickets));
      } catch (e) {
        console.error("Failed to parse tickets", e);
      }
    }
  }, []);

  const saveTickets = (newTickets: SupportTicket[]) => {
    setTickets(newTickets);
    localStorage.setItem(TICKETS_STORAGE_KEY, JSON.stringify(newTickets));
  };

  const createTicket = (ticketData: Omit<SupportTicket, 'id' | 'createdAt' | 'status' | 'lastUpdated'>) => {
    // Generate ID like BL-TKT-20260915-00124
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomNum = Math.floor(10000 + Math.random() * 90000);
    const newId = `BL-TKT-${dateStr}-${randomNum}`;
    
    const now = new Date().toISOString();

    const newTicket: SupportTicket = {
      ...ticketData,
      id: newId,
      createdAt: now,
      lastUpdated: now,
      status: 'Open'
    };

    saveTickets([newTicket, ...tickets]);
    return newTicket;
  };

  const getTicketById = (id: string) => {
    return tickets.find(t => t.id === id);
  };

  return {
    tickets,
    createTicket,
    getTicketById
  };
};
