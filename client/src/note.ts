import { type Note } from "./types";

const STORAGE_KEY = "notes";

export let notes: Note[] = loadNotes();

export function loadNotes(): Note[] {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];

    try {
        const parsed: unknown = JSON.parse(data);
        if (!Array.isArray(parsed)) throw new Error("Saved notes must be an array");

        return parsed
            .filter((item: any) =>
                item &&
                typeof item === "object" &&
                Number.isSafeInteger(Number(item.id)) &&
                typeof item.title === "string" &&
                typeof item.description === "string"
            )
            .map((item: any) => ({
                id: Number(item.id),
                title: item.title,
                description: item.description,
                createdAt: typeof item.createdAt === "string" ? item.createdAt : "",
                pinned: item.pinned === true,
                category: typeof item.category === "string" ? item.category : "Personal",
                color: /^#[0-9a-fA-F]{6}$/.test(String(item.color ?? "")) ? item.color : "#fff59d"
            }));
    } catch {
        localStorage.removeItem(STORAGE_KEY);
        return [];
    }
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

export function replaceNotes(updatedNotes: Note[]) {
    notes = updatedNotes;
    saveNotes();
}
