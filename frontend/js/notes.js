/* ===== MiniTodo Notes ===== */

let noteSaveTimer = null;
const $notesArea = document.getElementById('notes-area');
const $noteEditor = document.getElementById('note-editor');
const $noteSaveStatus = document.getElementById('note-save-status');

async function loadNote() {
    const result = await callApi('get_note');
    $noteEditor.value = result.content || '';
    $noteSaveStatus.textContent = '已保存';
}

async function saveNote() {
    const content = $noteEditor.value;
    $noteSaveStatus.textContent = '保存中...';
    await callApi('save_note', { content });
    $noteSaveStatus.textContent = '已保存';
}

$noteEditor.addEventListener('input', () => {
    $noteSaveStatus.textContent = '编辑中...';
    if (noteSaveTimer) clearTimeout(noteSaveTimer);
    noteSaveTimer = setTimeout(saveNote, 600);
});
