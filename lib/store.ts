type Message = {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
  };
  
  type Section = {
    id: string;
    title: string;
    timestamp: number;
  };
  
  type Note = {
    id: string;
    content: string;
    messageId?: string; // Optional - only for notes created from messages
    sectionId?: string; // Optional - notes can be organized into sections
    timestamp: number;
    type: 'message' | 'manual'; // Indicates if note came from chat or was manually created
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
    createdAt: number;
    updatedAt: number;
  }
  
  const chatSessions: Record<string, ChatSession> = {};
  const notesStore: {
    notes: Record<string, Note>,
    sections: Record<string, Section>
  } = {
    notes: {},
    sections: {}
  };
  
  export { chatSessions, notesStore, type ChatSession, type Context, type Message, type Note, type Section };