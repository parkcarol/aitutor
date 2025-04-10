import { notesStore, chatSessions } from "@/lib/store";
import { v4 as uuidv4 } from "uuid";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { chatId, messageId } = await request.json();

    const message = chatSessions[chatId]?.messages.find((m) => m.id === messageId);
    if (!message) return NextResponse.json({ error: "Message not found" }, { status: 404 });

    const note = {
      id: uuidv4(),
      messageId,
      content: message.content,
      timestamp: Date.now()
    };

    if (!notesStore[chatId]) notesStore[chatId] = [];
    notesStore[chatId].push(note);

    return NextResponse.json({ note });
  } catch (error) {
    console.error("Error in notes API:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { chatId, noteId } = await request.json();
    notesStore[chatId] = notesStore[chatId]?.filter((n) => n.id !== noteId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in notes API:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const chatId = searchParams.get('chatId');
    return NextResponse.json({ notes: notesStore[chatId || ''] || [] });
  } catch (error) {
    console.error("Error in notes API:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
} 