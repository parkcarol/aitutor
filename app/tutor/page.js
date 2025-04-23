'use client'

import { useState, useEffect, useRef } from 'react'

export default function TutorChat({ onSaveNote }) {
  const [question, setQuestion] = useState('')
  const [chat, setChat] = useState([])
  const chatEndRef = useRef(null)
  const [isSummarizing, setIsSummarizing] = useState(false)

  const updateChat = async (e) => {
    e.preventDefault()

    if (!question.trim()) return

    const res = await fetch(`/api/tutor?q=${encodeURIComponent(question)}`)
    const data = await res.json()

    setChat((prev) => [...prev, { question, answer: data.answer }])
    setQuestion('')
  }

  const handleSaveNote = async (currentNote) => {
    try {
      setIsSummarizing(true)
      
      // Convert chat messages to the format expected by summary API
      const messages = chat.map((msg, index) => ({
        id: index.toString(),
        role: index % 2 === 0 ? 'user' : 'assistant',
        content: index % 2 === 0 ? msg.question : msg.answer,
        timestamp: Date.now() - (chat.length - index) * 1000 // Approximate timestamps
      }))

      console.log('Sending messages to summary API:', messages);

      const response = await fetch("/api/summary", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chatId: 'tutor-chat',
          messages: messages
        }),
      });

      if (!response.ok) throw new Error('Failed to generate summary');

      const data = await response.json();
      console.log('Summary API Response:', {
        summary: data.summary,
        bulletPoints: data.summary.bulletPoints,
        recommendedSection: data.summary.recommendedSectionId,
        note: data.note
      });
      
      onSaveNote(data.note);
    } catch (error) {
      console.error("Error saving note:", error);
    } finally {
      setIsSummarizing(false);
    }
  }

  // Scroll to the bottom of the chat smoothly
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chat])

  return (
    <div className="d-flex flex-column justify-content-between h-100">

      {/* History of user's question and tutor's answer */}
      <div className="overflow-auto" style={{ maxHeight: '80vh' }}>
        {chat.map((note, index) => (
          <div key={index} className="card mb-3">
            <div className="card-body">
              <p className="mb-1"><strong>You:</strong> {note.question}</p>
              <p className="mb-2"><strong>Tutor:</strong> {note.answer}</p>
              <button
                className="btn btn-sm btn-outline-secondary"
                onClick={() => handleSaveNote(note)}
                disabled={isSummarizing}
              >
                {isSummarizing ? "Summarizing..." : "Save to Notes"}
              </button>
            </div>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      {/* User input for asking questions */}
      <form onSubmit={updateChat} className='p-3'>
        <div className="input-group">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="form-control"
            placeholder="Ask the tutor..."
          />
          <button type="submit" className="btn btn-primary">Ask</button>
        </div>
      </form>

    </div>
  )
}
