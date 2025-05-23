import { chatSessions } from "../../../lib/store";
import { v4 as uuidv4 } from "uuid";
import { NextResponse } from "next/server";
import OpenAI from "openai";

type MessageRole = "user" | "assistant";

interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { chatId, message, context } = await request.json();
    const now = Date.now();

    // Initialize or update chat session
    if (!chatSessions[chatId]) {
      console.log("Initializing new chat session:", chatId);
      chatSessions[chatId] = {
        id: chatId,
        userId: "default-user",
        context: {
          id: uuidv4(),
          topic: "Motion and Force",
          chapter: "Motion in the context of a vacuum",
          subject: "Physics",
          gradeLevel: "Grade 9",
          learningObjectives: ["Basic definitions of motion, force", "Motion in the context of space", "Definitions of force", "relationship between force and motion"],
          createdAt: now,
          updatedAt: now
        },
        messages: [],
        createdAt: now,
        updatedAt: now
      };
    }

    // Update context if provided
    if (context && typeof context === 'object') {
      console.log("Updating chat context for session:", chatId);
      chatSessions[chatId].context = {
        ...chatSessions[chatId].context,
        ...context,
        updatedAt: now
      };
    }

    // Only process message if it's not empty (skip for initialization)
    if (message.trim()) {
      // Add user message
      const userMsg: Message = {
        id: uuidv4(),
        role: "user",
        content: message,
        timestamp: now
      };
      chatSessions[chatId].messages.push(userMsg);
      chatSessions[chatId].updatedAt = now;

      console.log("Current Chat History:", chatSessions[chatId].messages);

      // Create system prompt with context
      const systemPrompt = `You are a tutor for a high school student. Make sure you guide the student and keep your content consise. Challenge the student by asking them questions to get them to the right answer, and give hints if they seem confused or frustrated. Never give them information without prompting them with a follow up question to test their knowledge of the concept. When you want to add a line break, use '<br />' (with spaces) instead of just '<br>'.
          ${chatSessions[chatId].context.subject ? `Subject: ${chatSessions[chatId].context.subject}` : ''}
          ${chatSessions[chatId].context.topic ? `Topic: ${chatSessions[chatId].context.topic}` : ''}
          ${chatSessions[chatId].context.chapter ? `Chapter: ${chatSessions[chatId].context.chapter}` : ''}
          ${chatSessions[chatId].context.gradeLevel ? `Grade Level: ${chatSessions[chatId].context.gradeLevel}` : ''}
          ${chatSessions[chatId].context.learningObjectives?.length ? `Learning Objectives: ${chatSessions[chatId].context.learningObjectives.join(', ')}` : ''}`;

      // Create a stream from OpenAI
      const stream = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          { role: "system", content: systemPrompt },
          ...chatSessions[chatId].messages.map(msg => ({ role: msg.role, content: msg.content }))
        ],
        stream: true,
      });

      // Create a TransformStream to handle the streaming response
      const encoder = new TextEncoder();
      const streamResponse = new ReadableStream({
        async start(controller) {
          let fullMessage = "";
          
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || "";
            fullMessage += content;
            
            // Send each chunk to the client
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
          }

          // Add the complete message to chat history
          const botMsg: Message = {
            id: uuidv4(),
            role: "assistant",
            content: fullMessage,
            timestamp: Date.now()
          };
          chatSessions[chatId].messages.push(botMsg);
          chatSessions[chatId].updatedAt = Date.now();

          // Send the final message with the complete chat history
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
            done: true, 
            fullMessage,
            history: chatSessions[chatId].messages,
            context: chatSessions[chatId].context
          })}\n\n`));
          
          controller.close();
        },
      });

      return new Response(streamResponse, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
      });
    } else {
      // For initialization requests, just return the current session state
      return NextResponse.json({
        history: chatSessions[chatId].messages,
        context: chatSessions[chatId].context
      });
    }
  } catch (error) {
    console.error("Error in chat API:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
} 