type Message = {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
  };
  
  type Note = {
    id: string;
    messageId: string;
    content: string;
    timestamp: number;
  };

  type Context = {
    id: string; 
    topic: string; 
    chapter: string; 
    subject?: string;
    gradeLevel?: string;
    learningObjectives?: string[];
    createdAt: number;
    updatedAt: number;
  }
  
  type ChatSession = {
    id: string;
    userId: string;  // For future user authentication
    context: Context;
    messages: Message[];
    notes: Note[];
    createdAt: number;
    updatedAt: number;
  }
  
  const chatSessions: Record<string, ChatSession> = {};
  const notesStore: Record<string, Note[]> = {};
  
  export { chatSessions, notesStore, type ChatSession, type Context, type Message, type Note };