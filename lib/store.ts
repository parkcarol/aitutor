type Message = {
    id: string;
    role: 'user' | 'assistant';
    content: string;
  };
  
  type Note = {
    id: string;
    messageId: string;
    content: string;
  };
  
  const chatSessions: Record<string, Message[]> = {};
  const notesStore: Record<string, Note[]> = {};
  
  export { chatSessions, notesStore };