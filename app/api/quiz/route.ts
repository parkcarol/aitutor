import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { messages, context } = await request.json();
    console.log("Quiz API called with messages:", messages?.length);

    // If no chat history, return sample questions
    if (!messages?.length) {
      console.log("No chat history, returning sample questions");
      return NextResponse.json({
        questions: [
          {
            question: "What is the primary focus of our physics discussion?",
            options: [
              "A) Motion and Force",
              "B) Thermodynamics",
              "C) Electricity",
              "D) Magnetism"
            ],
            correctAnswer: "A",
            explanation: "We are focusing on Motion and Force, particularly in the context of space and vacuum environments."
          },
          {
            question: "In a vacuum environment, what happens to an object in motion?",
            options: [
              "A) It stops immediately",
              "B) It continues at constant speed unless acted upon",
              "C) It accelerates continuously",
              "D) It moves in circles"
            ],
            correctAnswer: "B",
            explanation: "In a vacuum, there is no air resistance or friction, so objects follow Newton's First Law of Motion."
          },
          {
            question: "How does motion in space differ from motion on Earth?",
            options: [
              "A) There is no difference",
              "B) Objects move faster in space",
              "C) No atmospheric resistance in space",
              "D) Objects cannot move in space"
            ],
            correctAnswer: "C",
            explanation: "The main difference is the absence of atmospheric resistance in space, which affects how objects move."
          }
        ]
      });
    }

    // Create a prompt for generating quiz questions
    const systemPrompt = `You are a quiz generator for a tutoring system. Based on the chat history and context provided, generate 3 multiple-choice questions that test the student's understanding of the concepts discussed. Each question should:
    1. Be relevant to the topics discussed in the chat
    2. Have 4 options (A, B, C, D)
    3. Include the correct answer
    4. Include a brief explanation of why the answer is correct

    Format the response as a JSON object with a "questions" array containing objects with:
    {
      "question": "The question text",
      "options": ["A) option1", "B) option2", "C) option3", "D) option4"],
      "correctAnswer": "A", // Just the letter
      "explanation": "Why this is the correct answer"
    }`;

    console.log("Calling OpenAI API");
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: JSON.stringify({
          context,
          messages: messages.map(msg => ({
            role: msg.role,
            content: msg.content
          }))
        })}
      ],
      temperature: 0.7,
    });

    console.log("OpenAI API response received");
    try {
      const quizData = JSON.parse(response.choices[0].message.content);
      console.log("Quiz data parsed:", quizData);
      return NextResponse.json(quizData);
    } catch (error) {
      console.error("Failed to parse quiz data:", error);
      return NextResponse.json(
        { 
          error: "Failed to parse quiz data",
          details: "The AI response was not in the expected format",
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error("Error in quiz API:", error);
    return NextResponse.json(
      { 
        error: "Failed to generate quiz",
        details: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
} 