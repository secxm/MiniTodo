/* ===== MiniTodo Modals ===== */

// ===== Confirm Modal =====
let modalResolve = null;

function initConfirmModal() {
    const $confirmModal = document.getElementById('confirm-modal');
    document.getElementById('modal-cancel').addEventListener('click', () => {
        $confirmModal.classList.remove('show');
        if (modalResolve) modalResolve(false);
        modalResolve = null;
    });
    document.getElementById('modal-confirm').addEventListener('click', () => {
        $confirmModal.classList.remove('show');
        if (modalResolve) modalResolve(true);
        modalResolve = null;
    });
}

function showConfirm() {
    document.getElementById('confirm-modal').classList.add('show');
    return new Promise(resolve => { modalResolve = resolve; });
}

// ===== Edit Modal =====
function initEditModal() {
    const $editModal = document.getElementById('edit-modal');

    document.getElementById('em-cancel').addEventListener('click', () => {
        $editModal.classList.remove('show');
        AppState.editTargetId = null;
    });

    document.getElementById('em-save').addEventListener('click', async () => {
        const title = document.getElementById('em-title').value.trim();
        if (!title) return;
        const dueDate = document.getElementById('em-due').value || null;
        const createdAt = document.getElementById('em-created').value || null;
        const doneAt = document.getElementById('em-done').value || null;
        await callApi('update', {
            id: AppState.editTargetId,
            title,
            due_date: dueDate,
            priority: AppState.editPriority,
            created_at: createdAt,
            done_at: doneAt
        });
        $editModal.classList.remove('show');
        AppState.editTargetId = null;
        await loadTodos();
    });

    // Priority buttons
    document.querySelectorAll('#em-priority-group button').forEach(btn => {
        btn.addEventListener('click', () => {
            AppState.editPriority = btn.dataset.priority;
            updateEditPriorityBtns();
        });
    });
}

function startEdit(id) {
    const todo = AppState.todos.find(t => t.id === id);
    if (!todo) return;
    const isDone = todo.status === 'done';
    AppState.editTargetId = id;
    AppState.editPriority = todo.priority || 'normal';
    document.getElementById('em-title').value = todo.title;
    document.getElementById('em-due').value = todo.due_date || '';
    document.getElementById('em-created').value = todo.created_at ? todo.created_at.slice(0, 10) : '';
    document.getElementById('em-done').value = todo.done_at ? todo.done_at.slice(0, 10) : '';
    document.getElementById('em-field-created').style.display = isDone ? 'block' : 'none';
    document.getElementById('em-field-done').style.display = isDone ? 'block' : 'none';
    document.querySelector('.em-title').textContent = isDone ? '编辑已完成' : '编辑待办';
    updateEditPriorityBtns();
    document.getElementById('edit-modal').classList.add('show');
    setTimeout(() => document.getElementById('em-title').focus(), 100);
}

function updateEditPriorityBtns() {
    document.querySelectorAll('#em-priority-group button').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.priority === AppState.editPriority);
    });
}
