import { type Note } from "./types";
import { addNote, notes, deleteNote, updateNote, replaceNotes } from "./note";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { marked } from "marked";

const titleInput = document.querySelector("#title") as HTMLInputElement;
const descriptionInput = document.querySelector("#description") as HTMLInputElement;
const addBtn =  document.querySelector("#addBtn") as HTMLButtonElement;
const notesContainer = document.querySelector("#notes") as HTMLDivElement;
const searchInput = document.querySelector("#search") as HTMLInputElement;
const categoryInput = document.querySelector("#category") as HTMLSelectElement;
const colorInput = document.querySelector("#color") as HTMLInputElement;
const themeBtn = document.querySelector("#themeBtn") as HTMLButtonElement;
const exportBtn = document.querySelector("#exportBtn") as HTMLButtonElement;
const importBtn = document.querySelector("#importBtn") as HTMLButtonElement;
const fileInput = document.querySelector("#fileInput") as HTMLInputElement;
const toast = document.querySelector("#toast") as HTMLDivElement;
const pdfBtn = document.querySelector("#pdfBtn") as HTMLButtonElement;
const pngBtn = document.querySelector("#pngBtn") as HTMLButtonElement;
const previewBtn = document.querySelector("#previewBtn") as HTMLButtonElement;
const preview = document.querySelector("#preview") as HTMLDivElement;
const stats = document.querySelector("#stats") as HTMLDivElement;

let editingId: number | null = null;

function escapeHTML(value: unknown): string {
    return String(value ?? "").replace(/[&<>"']/g, (character) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character] as string);
}

function safeColor(value: unknown): string {
    const color = String(value ?? "");
    return /^#[0-9a-fA-F]{6}$/.test(color) ? color : "#fff59d";
}

function sanitizePreviewHTML(html: string): string {
    const documentFragment = new DOMParser().parseFromString(html, "text/html");
    const allowedTags = new Set([
        "P", "BR", "STRONG", "EM", "B", "I", "H1", "H2", "H3", "H4",
        "UL", "OL", "LI", "BLOCKQUOTE", "CODE", "PRE", "A", "HR", "DEL"
    ]);

    documentFragment.body.querySelectorAll("*").forEach((element) => {
        if (!allowedTags.has(element.tagName)) {
            element.replaceWith(...Array.from(element.childNodes));
            return;
        }

        const href = element.tagName === "A" ? element.getAttribute("href") : null;
        Array.from(element.attributes).forEach((attribute) => element.removeAttribute(attribute.name));

        if (element.tagName === "A" && href && (
            /^https?:\/\//i.test(href) ||
            /^mailto:/i.test(href) ||
            href.startsWith("#") ||
            (href.startsWith("/") && !href.startsWith("//"))
        )) {
            element.setAttribute("href", href);
            element.setAttribute("rel", "noopener noreferrer");
        }
    });

    return documentFragment.body.innerHTML;
}

declare global {
    function removeNote(id: number): void;
    function editNote(id: number): void;
    function pinNote(id: number): void;
}

addBtn.addEventListener("click", () => {
    const title = titleInput.value.trim();
    const description = descriptionInput.value.trim();

    if(title==="" || description===""){
        alert("Please fill in both title and description.");
        return;
    }

    if (editingId === null) {
        const note: Note = {
            id: Date.now(),
            title,
            description,
            createdAt: new Date().toLocaleString(),
            pinned: false,
            category: categoryInput.value || "Personal",
            color: colorInput.value || "white"
        };
        addNote(note);
    } else {
        const existingNote = notes.find(note => note.id === editingId);
        if (existingNote) {
            updateNote({
                ...existingNote,
                title,
                description,
                category: categoryInput.value || existingNote.category || "Personal",
                color: safeColor(colorInput.value || existingNote.color)
            });
        }
        editingId = null;
        addBtn.textContent = "Add Note";
    }

    clearInput();
    renderNotes();
    updateStats();
});

function renderNotes() {
    const keyword = searchInput.value.toLowerCase();
    notesContainer.innerHTML = "";
    const sorted = [...notes].sort((a, b) => Number(b.pinned) - Number(a.pinned))
        .filter(note => note.title.toLowerCase().includes(keyword) || note.description.toLowerCase().includes(keyword));

    sorted.forEach(note => {
        notesContainer.innerHTML += `
            <div class="card" style="background:${safeColor(note.color)};">
                <h2>${note.pinned ? "📌 " : ""}${escapeHTML(note.title)}</h2>
                <p>${escapeHTML(note.description)}</p>
                <br>
                <small>${escapeHTML(note.category)}</small>
                <div class="actions">
                    <button onclick="editNote(${Number(note.id)})">Edit</button>
                    <button onclick="pinNote(${Number(note.id)})">${note.pinned ? "Unpin" : "Pin"}</button>
                    <button class="delete" onclick="removeNote(${Number(note.id)})">Delete</button>
                </div>
            </div>
        `;
    });
}

function clearInput() {
    titleInput.value = "";
    descriptionInput.value = "";
}

function setGlobal(name: string, fn: Function) {
    if (typeof globalThis !== "undefined") (globalThis as any)[name] = fn;
    else if (typeof window !== "undefined") (window as any)[name] = fn;
}

(setGlobal as any)('removeNote', function(id: number) {
    deleteNote(id);
    renderNotes();
    updateStats();
});

(setGlobal as any)('editNote', function(id: number) {
    const note = notes.find(n => n.id === id);

    if (!note) return;

    titleInput.value = note.title;
    descriptionInput.value = note.description;
    editingId = id;
    addBtn.textContent = "Update Note";
});

(setGlobal as any)('pinNote', function(id: number) {
    const note = notes.find(n=>n.id===id);
    if(!note) return;
    note.pinned = !note.pinned;
    localStorage.setItem("notes", JSON.stringify(notes));
    renderNotes();
    updateStats();
});

searchInput.addEventListener("input", renderNotes);

const savedTheme = localStorage.getItem("theme");
if(savedTheme==="dark"){
    document.body.classList.add("dark");
    themeBtn.textContent = "☀️";
}
themeBtn.onclick = () => {
    document.body.classList.toggle("dark");
    const dark = document.body.classList.contains("dark");
    themeBtn.textContent = dark ? "☀️" : "🌙";
    localStorage.setItem("theme", dark ? "dark" : "light");
};

function showToast(message: string) {
    toast.textContent = message;
    toast.classList.add("show");
    setTimeout(() => {
        toast.classList.remove("show");
    }, 2000);
}

exportBtn.onclick = () => {
    const blob = new Blob(
        [JSON.stringify(notes, null, 2)],
        {type:"application/json"}
    );
    const url= URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "notes.json";
    a.click();
    URL.revokeObjectURL(url);
    showToast("Notes exported successfully!");
};

importBtn.onclick = () => {
    fileInput.click();
};

fileInput.onchange = () => {
    const file= fileInput.files?.[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = (_e) => {
        try {
            const imported: unknown = JSON.parse(reader.result as string);
            if (!Array.isArray(imported) || !imported.every((item: any) =>
                item && typeof item === "object" &&
                Number.isSafeInteger(Number(item.id)) &&
                typeof item.title === "string" &&
                typeof item.description === "string"
            )) {
                throw new Error("Invalid notes file");
            }

            const safeImported = imported.map((item: any) => ({
                id: Number(item.id),
                title: item.title,
                description: item.description,
                createdAt: typeof item.createdAt === "string" ? item.createdAt : new Date().toISOString(),
                pinned: item.pinned === true,
                category: typeof item.category === "string" ? item.category : "Personal",
                color: safeColor(item.color)
            }));
            replaceNotes(safeImported);
            renderNotes();
            updateStats();
            showToast("Notes imported successfully!");
            fileInput.value = "";
        }
        catch (error) {
            showToast("Error importing notes.");
        }
    };

    reader.readAsText(file);
};

function updateStats() {
    stats.innerHTML = `
        <strong>
        Total Notes: 
        ${notes.length}
        </strong>`;
}

previewBtn.onclick = () => {
    const markdownHTML = marked.parse(descriptionInput.value) as string;
    preview.innerHTML = sanitizePreviewHTML(markdownHTML);
};

pdfBtn.onclick = () => {
    const pdf = new jsPDF();
    pdf.text(
        "my Notes",
        10,
        10
    );
    let y = 20;
    notes.forEach(note => {
        pdf.text(note.title, 10, y);
        y+=8;
        pdf.text(note.description, 10, y);
        y+=15;
    });
    pdf.save("notes.pdf");
};

pngBtn.onclick =  async() => {
    const canvas = await html2canvas(notesContainer);
    const link = document.createElement("a");
    link.download = "notes.png";
    link.href = canvas.toDataURL();
    link.click();
};

document.addEventListener("keydown", (e) => {
    if(e.ctrlKey  && e.key === "s"){
        e.preventDefault();
        addBtn.click();
    }
});

