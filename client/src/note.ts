import { type Note } from "./types";

const STORAGE_KEY = "notes";

export let notes: Note[] = loadNotes();

export function loadNotes(): Note[] {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    return JSON.parse(data);
}

export function saveNotes() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

export function addNote(note: Note) {
    notes.push(note);
    saveNotes();
}

export function deleteNote(id: number) {
    notes = notes.filter(note => note.id !== id);
    saveNotes();
}

export function updateNote(updated: Note) {
    notes = notes.map(note => note.id === updated.id ? updated : note);
    saveNotes();
}
