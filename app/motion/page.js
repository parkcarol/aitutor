export default function MotionPage({ notes, deleteNote }) {
  return (
    <div>
      {
        notes.length === 0 ? (
          <p className="text-muted">No notes saved yet.</p>
        ) : (

          // Added notes will be displayed here
          <div className="row">
            {notes.map((note, index) => (
              <div key={index} className="mb-3">
                <div className="card">
                  <div className="card-body">
                    <p className="mb-1"><strong>Q:</strong> {note.question}</p>
                    <p className="mb-2"><strong>A:</strong> {note.answer}</p>
                    <button
                      style={{ color: 'white', backgroundColor: '#69C8EC', borderRadius: '10px' }}
                      className="btn btn-sm"
                      onClick={() => deleteNote(index)}
                    >
                      Delete Note
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

        )
      }
    </div>

  )

}
