'use client'

import { useState, useEffect, useRef } from 'react'

export default function TutorChat({ onSaveNote }) {
  const [question, setQuestion] = useState('')
  const [chat, setChat] = useState([])
  const chatEndRef = useRef(null)

  const updateChat = async (e) => {
    e.preventDefault()

    if (!question.trim()) return

    const res = await fetch(`/api/tutor?q=${encodeURIComponent(question)}`)
    const data = await res.json()

    setChat((prev) => [...prev, { question, answer: data.answer }])
    setQuestion('')
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
                onClick={() => onSaveNote(note)}
              >
                Save to Notes
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
