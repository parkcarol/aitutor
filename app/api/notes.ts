import { notesStore, chatSessions } from "@/lib/store";
import { v4 as uuidv4 } from "uuid";

export default function handler(req, res) {
  const { method } = req;

  if (method === "POST") {
    const { chatId, messageId } = req.body;

    const message = chatSessions[chatId]?.find((m) => m.id === messageId);
    if (!message) return res.status(404).json({ error: "Message not found" });

    const note = {
      id: uuidv4(),
      messageId,
      content: message.content,
    };

    if (!notesStore[chatId]) notesStore[chatId] = [];
    notesStore[chatId].push(note);

    return res.status(200).json({ note });
  }

  if (method === "DELETE") {
    const { chatId, noteId } = req.body;
    notesStore[chatId] = notesStore[chatId]?.filter((n) => n.id !== noteId);
    return res.status(200).json({ success: true });
  }

  if (method === "GET") {
    const { chatId } = req.query;
    return res.status(200).json({ notes: notesStore[chatId] || [] });
  }
}
