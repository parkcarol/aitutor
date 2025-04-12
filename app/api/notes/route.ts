import { notesStore, chatSessions } from "../../../lib/store";
import { v4 as uuidv4 } from "uuid";
import { NextResponse } from "next/server";

// Create a note from a chat message
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type } = body;

    // Handle message-tied notes
    if (type === 'message') {
      const { messageId, chatId } = body;
      const message = chatSessions[chatId]?.messages.find((m) => m.id === messageId);
      if (!message) return NextResponse.json({ error: "Message not found" }, { status: 404 });

      const note = {
        id: uuidv4(),
        messageId,
        content: message.content,
        timestamp: Date.now(),
        type: 'message' as const
      };

      notesStore.notes[note.id] = note;
      return NextResponse.json({ note });
    }

    // Handle manual notes
    if (type === 'manual') {
      const { content, sectionId } = body;
      const note = {
        id: uuidv4(),
        content,
        sectionId,
        timestamp: Date.now(),
        type: 'manual' as const
      };

      notesStore.notes[note.id] = note;
      return NextResponse.json({ note });
    }

    // Handle section creation
    if (type === 'section') {
      const { title } = body;
      const section = {
        id: uuidv4(),
        title,
        timestamp: Date.now()
      };

      notesStore.sections[section.id] = section;
      return NextResponse.json({ section });
    }

    return NextResponse.json({ error: "Invalid request type" }, { status: 400 });
  } catch (error) {
    console.error("Error in notes API:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// Update a note or section
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { type, id } = body;

    if (type === 'note') {
      const note = notesStore.notes[id];
      if (!note) return NextResponse.json({ error: "Note not found" }, { status: 404 });

      const updatedNote = {
        ...note,
        ...body.updates,
        timestamp: Date.now()
      };

      notesStore.notes[id] = updatedNote;
      return NextResponse.json({ note: updatedNote });
    }

    if (type === 'section') {
      const section = notesStore.sections[id];
      if (!section) return NextResponse.json({ error: "Section not found" }, { status: 404 });

      const updatedSection = {
        ...section,
        ...body.updates,
        timestamp: Date.now()
      };

      notesStore.sections[id] = updatedSection;
      return NextResponse.json({ section: updatedSection });
    }

    return NextResponse.json({ error: "Invalid update type" }, { status: 400 });
  } catch (error) {
    console.error("Error in notes API:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// Delete a note or section
export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { type, id } = body;

    if (type === 'note') {
      delete notesStore.notes[id];
      return NextResponse.json({ success: true });
    }

    if (type === 'section') {
      // Remove the section and update any notes that were in this section
      delete notesStore.sections[id];
      Object.values(notesStore.notes).forEach(note => {
        if (note.sectionId === id) {
          note.sectionId = undefined;
        }
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid delete type" }, { status: 400 });
  } catch (error) {
    console.error("Error in notes API:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// Get all notes and sections
export async function GET(request: Request) {
  try {
    return NextResponse.json({ 
      notes: notesStore.notes,
      sections: notesStore.sections
    });
  } catch (error) {
    console.error("Error in notes API:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
} 