import { NextResponse } from "next/server";
import OpenAI from "openai";
import { chatSessions } from "../../../lib/store";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { chatId, messages } = await request.json();
    const chatSession = chatSessions[chatId];
    
    if (!chatSession) {
      return NextResponse.json({ error: "Chat session not found" }, { status: 404 });
    }

    // Get the first and last message IDs for context jumping
    const firstMessageId = messages[0]?.id;
    const lastMessageId = messages[messages.length - 1]?.id;

    // Create a system prompt for summarization that includes context
    const systemPrompt = `You are an AI tutor assistant tasked with summarizing a learning conversation. 
    The context of this conversation is:
    Subject: ${chatSession.context.subject || 'Not specified'}
    Topic: ${chatSession.context.topic || 'Not specified'}
    Chapter: ${chatSession.context.chapter || 'Not specified'}
    Grade Level: ${chatSession.context.gradeLevel || 'Not specified'}
    
    You have the full context of the conversation, but the user has just requested a summary so focus on the last 20 messages 
    Format the summary in a clear, paragraph style that will be helpful for future review, and assume that it will be one part of a larger note the user is creating so be too the point
    Keep the note concise but comprehensive.
    Use a tone which is appropriate to a textbook`;

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: "Please summarize this tutoring conversation:" },
        ...messages.map(msg => ({ role: msg.role, content: msg.content }))
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const summary = response.choices[0]?.message?.content || "No summary generated";

    // Create a note in the notesStore with message IDs for context
    const note = {
      id: Date.now().toString(),
      content: summary,
      sectionId: 'default',
      type: 'summary',
      timestamp: Date.now(),
      chatId,
      contextRange: {
        firstMessageId,
        lastMessageId,
        messageCount: messages.length
      }
    };

    return NextResponse.json({ summary, note });
  } catch (error) {
    console.error("Error in summary API:", error);
    return NextResponse.json(
      { error: "Failed to generate summary" },
      { status: 500 }
    );
  }
} 