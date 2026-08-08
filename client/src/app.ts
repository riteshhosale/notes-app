import { type Note } from "./types";
import { addNote, notes, deleteNote, updateNote } from "./note";
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
        updateNote({
            id: editingId,
            title,
            description,
            createdAt: new Date().toLocaleString(),
            pinned: false,
            category: categoryInput.value || "Personal",
            color: colorInput.value || "white"
        });
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
    const sorted = [...notes].sort((a,b) => Number(b.pinned)-Number(a.pinned))
    .filter(note => note.title.toLowerCase().includes(keyword) || note.description.toLowerCase().includes(keyword));
    sorted.forEach(note => {
        notesContainer.innerHTML += `
            <div class="card" style="background:${note.color};">
            <h2>
            ${note.pinned ? "📌 " : ""}
            ${note.title}
            </h2>
            <p>${note.description}</p>
            <br>
            <small>${note.category} </small>
            <div class="actions">
                <button onclick="pinNote(${note.id})">Pin</button>
                <button class="delete" onclick="removeNote(${note.id})">Delete</button>
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
            const imported = JSON.parse(reader.result as string);
            localStorage.setItem("notes", JSON.stringify(imported));
            location.reload();
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
    preview.innerHTML = marked(descriptionInput.value) as string;
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

