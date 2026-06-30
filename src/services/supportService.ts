const API_BASE = 'https://production.datambit.com/api/v2/auth';

export interface TicketFile {
  attachment_id?: string;
  file_url: string;
  file_name?: string;
}

export interface SupportTicket {
  ticket_id: string;
  subject: string;
  reason: string;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
  files: TicketFile[];
}

export interface TicketMessage {
  message_id: string;
  author_type: 'user' | 'support';
  message: string;
  created_at: string;
}

export interface Notification {
  notification_id: string;
  type: string;
  is_read: boolean;
  created_at: string;
  ticket_id: string;
}

const getToken = () =>
  localStorage.getItem('jwtToken') || sessionStorage.getItem('jwtToken');

const getHeaders = () => ({
  Authorization: `Bearer ${getToken()}`,
});

export const supportService = {
  createTicket: async (subject: string, reason: string, files: File[]) => {
    const formData = new FormData();
    formData.append('subject', subject);
    formData.append('reason', reason);
    files.forEach((file) => formData.append('files', file));

    const response = await fetch(`${API_BASE}/support`, {
      method: 'POST',
      headers: getHeaders(),
      body: formData,
    });
    return response.json();
  },

  getTickets: async (
    limit = 50,
    offset = 0,
  ): Promise<{ code: string; message: SupportTicket[] }> => {
    const response = await fetch(
      `${API_BASE}/me/support-tickets?limit=${limit}&offset=${offset}`,
      { headers: getHeaders() },
    );
    return response.json();
  },

  getTicketDetail: async (
    ticketId: string,
  ): Promise<{
    code: string;
    message: SupportTicket & { messages: TicketMessage[] };
  }> => {
    const response = await fetch(`${API_BASE}/support/${ticketId}`, {
      headers: getHeaders(),
    });
    return response.json();
  },

  addReply: async (ticketId: string, message: string) => {
    const response = await fetch(`${API_BASE}/support/${ticketId}/reply`, {
      method: 'POST',
      headers: { ...getHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    });
    return response.json();
  },

  getNotifications: async (
    limit = 50,
    offset = 0,
  ): Promise<{ code: string; message: Notification[] }> => {
    const response = await fetch(
      `${API_BASE}/me/notifications?limit=${limit}&offset=${offset}`,
      { headers: getHeaders() },
    );
    return response.json();
  },

  markNotificationRead: async (notificationId: string) => {
    const response = await fetch(
      `${API_BASE}/notifications/${notificationId}/read`,
      { method: 'PUT', headers: getHeaders() },
    );
    return response.json();
  },
};
