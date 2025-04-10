'use client'

import Chat from "./tutor/page";
import MotionPage from "./motion/page";
import { useState } from 'react'
import Image from "next/image";
import Dropdown from "react-bootstrap/Dropdown";

export default function Home() {
  const [notes, setNotes] = useState([])

  const addNote = (note) => {
    setNotes((prev) => [...prev, note])
  }

  const deleteNote = (index) => {
    setNotes((prev) =>
      prev.filter((_, i) => i !== index))
  }

  return (

    <div>

      {/* Navbar */}
      <nav className="navbar navbar-expand-lg bg-body-tertiary">
        <div className="container-fluid">

          <a className="navbar-brand" href="#">AITutor</a>
          <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNavDropdown" aria-controls="navbarNavDropdown" aria-expanded="false" aria-label="Toggle navigation">
            <span className="navbar-toggler-icon"></span>
          </button>

          {/* To do: user authentication */}
          {/* <div className="col-md-3 text-end">
            <button type="button" className="btn btn-outline-primary me-2">Login</button>
            <button type="button" className="btn btn-primary">Sign-up</button>
          </div> */}

          <Dropdown>
            <Dropdown.Toggle variant="" id="dropdown-basic">
              <Image src="/user.png" alt="mdo" width="32" height="32" className="rounded-circle" />
            </Dropdown.Toggle>
            <Dropdown.Menu>
              <Dropdown.Item href="#/action-1">Profile</Dropdown.Item>
              <Dropdown.Item href="#/action-2">Settings</Dropdown.Item>
              <Dropdown.Item href="#/action-3">Sign out</Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>

        </div>
      </nav>

      {/* Main content */}
      <div className="container-fluid">
        <div style={{ gridTemplateColumns: '1fr 1fr' }} className="d-flex flex-row gap-2">

          {/* Left Section */}
          <div style={{ height: '92vh' }} className="d-flex flex-column w-50 mt-2 p-2 border rounded shadow">
            <h4 className="pb-2 border-bottom">Chat</h4>
            <Chat onSaveNote={addNote} />
          </div>

          {/* Right Section */}
          <div className="d-flex flex-column w-50 mt-2 p-2 border rounded shadow">
            <h4 className="pb-2 border-bottom">Motion Notes</h4>
            <MotionPage notes={notes} deleteNote={deleteNote} />
          </div>

        </div>
      </div>

    </div>

  );
}
