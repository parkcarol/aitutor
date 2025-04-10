import { chatSessions } from "../../../lib/store";
import { v4 as uuidv4 } from "uuid";
import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const { chatId, message } = body;
    
    if (!chatId || !message) {
      return NextResponse.json(
        { error: "Missing required fields: chatId and message" },
        { status: 400 }
      );
    }

    if (!chatSessions[chatId]) chatSessions[chatId] = [];

    const userMsg = { id: uuidv4(), role: "user" as const, content: message };
    chatSessions[chatId].push(userMsg);

    // Create a stream from OpenAI
    const stream = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: "You are a helpful AI assistant." },
        ...chatSessions[chatId].map(msg => ({ role: msg.role, content: msg.content }))
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
        const botMsg = {
          id: uuidv4(),
          role: "assistant" as const,
          content: fullMessage,
        };
        chatSessions[chatId].push(botMsg);

        // Send the final message with the complete chat history
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
          done: true, 
          fullMessage,
          history: chatSessions[chatId]
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
  } catch (error) {
    console.error("Error in chat API:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
} 