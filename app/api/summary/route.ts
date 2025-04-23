import { NextResponse } from "next/server";
import OpenAI from "openai";
import { chatSessions, notesStore } from "../../../lib/store";
import { v4 as uuidv4 } from "uuid";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('Summary API received request:', body);
    
    const { chatId, messages } = body;
    let chatSession = chatSessions[chatId];
    
    // Initialize chat session if it doesn't exist
    if (!chatSession) {
      const now = Date.now();
      chatSession = chatSessions[chatId] = {
        id: chatId,
        userId: "default-user",
        context: {
          id: uuidv4(),
          topic: "force and motion",
          chapter: "motion in space",
          subject: "physics",
          gradeLevel: "Grade 9",
          learningObjectives: ["motion in the context"],
          createdAt: now,
          updatedAt: now
        },
        messages: messages, // Use the provided messages
        createdAt: now,
        updatedAt: now
      };
    }
    
    console.log('Chat session:', {
      chatId,
      hasSession: !!chatSession,
      sessionContext: chatSession.context,
      messageCount: messages?.length
    });

    // Get available sections
    const availableSections = Object.values(notesStore.sections).map(section => ({
      id: section.id,
      title: section.title
    }));

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
    
    Available sections for organizing notes:
    ${JSON.stringify(availableSections, null, 2)}

    You have the full context of the conversation, but the user has just requested a summary.
    Please provide a response in the following JSON format:
    {
      "bulletPoints": [
        "First key point from the discussion",
        "Second key point from the discussion",
        "Third key point from the discussion"
      ],
      "recommendedSectionId": "section-id" // Choose from available sections based on content relevance
    }

    Keep the bullet points concise but comprehensive.
    Put a newline indicator after each bullet point
    Use a tone which is appropriate to a textbook.
    Choose the most appropriate section for these notes based on the content and available sections.
    If no specific section seems appropriate, use "default".`;

    console.log('Calling OpenAI with:', {
      messageCount: messages.length,
      systemPromptLength: systemPrompt.length
    });

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: "Please summarize this tutoring conversation for my running study notes:" },
        ...messages.map(msg => ({ role: msg.role, content: msg.content }))
      ],
      temperature: 0.7,
      max_tokens: 500,
      response_format: { type: "json_object" }
    });

    const summaryJson = JSON.parse(response.choices[0]?.message?.content || "{}");
    console.log('OpenAI response:', summaryJson);
    
    // Create a note in the notesStore with message IDs for context
    const note = {
      id: Date.now().toString(),
      content: summaryJson.bulletPoints.join('<br>• '), // Use HTML line break instead of \n
      sectionId: summaryJson.recommendedSectionId || 'default',
      type: 'summary',
      timestamp: Date.now(),
      chatId,
      contextRange: {
        firstMessageId,
        lastMessageId,
        messageCount: messages.length
      }
    };

    return NextResponse.json({ summary: summaryJson, note });
  } catch (error) {
    console.error("Error in summary API:", error);
    // Log more details about the error
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
    }
    return NextResponse.json(
      { error: "Failed to generate summary", details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 