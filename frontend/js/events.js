/* ===== MiniTodo Events ===== */

// ===== Add Todo =====
async function addTodo() {
    const $inputTitle = document.getElementById('input-title');
    const $inputDue = document.getElementById('input-due');
    const title = $inputTitle.value.trim();
    if (!title) return;
    const due = $inputDue.value || null;
    await callApi('add', { title, due_date: due, priority: AppState.inputPriority });
    $inputTitle.value = '';
    $inputDue.value = '';
    AppState.inputPriority = 'normal';
    updatePriorityBtn();
    $inputTitle.focus();
    await loadTodos();
}

function updatePriorityBtn() {
    const $btn = document.getElementById('btn-priority');
    if (AppState.inputPriority === 'important') {
        $btn.classList.add('active');
    } else {
        $btn.classList.remove('active');
    }
}

// ===== Toggle Todo =====
async function toggleTodo(id) {
    await callApi('toggle', { id });
    await loadTodos();
}

// ===== Delete Todo =====
async function deleteTodo(id) {
    if (!await showConfirm()) return;
    await callApi('delete', { id });
    await loadTodos();
}

// ===== Load =====
async function loadTodos() {
    if (AppState.currentTab === 'notes') {
        document.getElementById('todo-list').innerHTML = '';
        await loadNote();
        return;
    }
    if (AppState.currentTab === 'pending') {
        AppState.todos = await callApi('get_pending');
        const todayStr = getTodayStr();
        if (AppState.currentFilter === 'today') {
            // 今日：截止日期为今天 或 没有设置截止日期的待办
            AppState.todos = AppState.todos.filter(t => !t.due_date || t.due_date === todayStr);
        } else if (AppState.currentFilter === 'important') {
            AppState.todos = AppState.todos.filter(t => t.priority === 'important');
        } else if (AppState.currentFilter === 'overdue') {
            AppState.todos = AppState.todos.filter(t => t.due_date && new Date(t.due_date + 'T23:59:59') < new Date());
        }
    } else if (AppState.currentTab === 'history') {
        AppState.todos = await callApi('get_all');
        if (AppState.historyStatusFilter === 'pending') {
            AppState.todos = AppState.todos.filter(t => t.status === 'pending');
        } else if (AppState.historyStatusFilter === 'done') {
            AppState.todos = AppState.todos.filter(t => t.status === 'done');
        }
        AppState.todos.sort((a, b) => {
            const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
            const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
            return tb - ta;
        });
        const totalPages = Math.ceil(AppState.todos.length / AppState.HISTORY_PAGE_SIZE) || 1;
        if (AppState.historyPage > totalPages) AppState.historyPage = totalPages;
        const start = (AppState.historyPage - 1) * AppState.HISTORY_PAGE_SIZE;
        const paged = AppState.todos.slice(start, start + AppState.HISTORY_PAGE_SIZE);
        renderList(paged);
        renderPagination(totalPages);
        return;
    }
    renderList(AppState.todos);
}

// ===== Tab Switch =====
async function switchTab(tab) {
    AppState.currentTab = tab;
    document.getElementById('tab-pending').classList.toggle('active', tab === 'pending' || tab === 'history');
    document.getElementById('tab-notes').classList.toggle('active', tab === 'notes');
    const isPending = tab === 'pending';
    const isHistory = tab === 'history';
    const isNotes = tab === 'notes';
    document.getElementById('add-bar').style.display = isPending ? 'flex' : 'none';
    document.getElementById('filter-tags').style.display = (isPending || isHistory) ? 'flex' : 'none';
    document.querySelectorAll('#filter-tags > button[data-filter]').forEach(b => b.style.display = isHistory ? 'none' : '');
    document.querySelector('#filter-tags .filter-sep').style.display = isHistory ? 'none' : '';
    document.getElementById('btn-history-entry').style.display = isHistory ? 'none' : '';
    document.getElementById('notes-area').style.display = isNotes ? 'flex' : 'none';
    document.getElementById('todo-list').style.display = isNotes ? 'none' : 'block';
    document.getElementById('history-header').style.display = isHistory ? 'flex' : 'none';
    document.getElementById('todo-list').classList.toggle('history-view', isHistory);
    document.getElementById('pagination-bar').style.display = 'none';
    AppState.historyPage = 1;
    await loadTodos();
}

// ===== Context Menu =====
function hideCtx() {
    document.getElementById('context-menu').style.display = 'none';
    AppState.ctxTargetId = null;
}

// ===== Bind All Events =====
function bindAllEvents() {
    // Priority toggle in add bar
    document.getElementById('btn-priority').addEventListener('click', () => {
        AppState.inputPriority = AppState.inputPriority === 'important' ? 'normal' : 'important';
        updatePriorityBtn();
    });

    // Add todo
    document.getElementById('btn-add').addEventListener('click', addTodo);
    document.getElementById('input-title').addEventListener('keydown', e => {
        if (e.key === 'Enter') addTodo();
    });

    // Window controls
    document.getElementById('btn-minimize').addEventListener('click', () => callApi('minimize'));
    document.getElementById('btn-close').addEventListener('click', () => callApi('close_to_tray'));

    // Tabs
    document.getElementById('tab-pending').addEventListener('click', () => switchTab('pending'));
    document.getElementById('tab-notes').addEventListener('click', () => switchTab('notes'));

    // History entry / back
    document.getElementById('btn-history-entry').addEventListener('click', () => switchTab('history'));
    document.getElementById('btn-history-back').addEventListener('click', () => switchTab('pending'));

    // Date picker bindings
    const $inputDue = document.getElementById('input-due');
    const $emDue = document.getElementById('em-due');
    const $emCreated = document.getElementById('em-created');
    const $emDone = document.getElementById('em-done');
    $inputDue.addEventListener('click', () => openDatePickerFor($inputDue));
    $emDue.addEventListener('click', () => openDatePickerFor($emDue));
    $emCreated.addEventListener('click', () => openDatePickerFor($emCreated));
    $emDone.addEventListener('click', () => openDatePickerFor($emDone));

    // List click events
    document.getElementById('todo-list').addEventListener('click', async e => {
        const item = e.target.closest('[data-id]');
        if (!item) return;
        const id = parseInt(item.dataset.id, 10);
        if (e.target.closest('.todo-check')) {
            await toggleTodo(id);
        } else if (e.target.closest('.btn-edit')) {
            if (AppState.currentTab === 'history') startEdit(id);
        } else if (e.target.closest('.btn-del')) {
            if (AppState.currentTab === 'history') await deleteTodo(id);
        } else if (AppState.currentTab === 'history' && e.target.closest('.ht-title')) {
            startEdit(id);
        }
    });

    // Context menu
    const $ctxMenu = document.getElementById('context-menu');
    document.addEventListener('contextmenu', e => {
        const item = e.target.closest('[data-id]');
        if (!item) { hideCtx(); return; }
        e.preventDefault();
        AppState.ctxTargetId = parseInt(item.dataset.id);
        const todo = AppState.todos.find(t => t.id === AppState.ctxTargetId);
        const isDone = todo && todo.status === 'done';
        const isHistory = AppState.currentTab === 'history';
        document.getElementById('ctx-toggle').textContent = isDone ? '标记未完成' : '标记完成';
        document.getElementById('ctx-edit').style.display = isHistory ? 'flex' : 'none';
        document.querySelector('.ctx-divider').style.display = isHistory ? 'block' : 'none';
        document.getElementById('ctx-delete').style.display = isHistory ? 'flex' : 'none';
        $ctxMenu.style.display = 'block';
        $ctxMenu.style.left = Math.min(e.clientX, window.innerWidth - 160) + 'px';
        $ctxMenu.style.top = Math.min(e.clientY, window.innerHeight - 140) + 'px';
    });
    document.addEventListener('click', e => {
        if (!e.target.closest('.context-menu')) hideCtx();
    });

    document.getElementById('ctx-edit').addEventListener('click', () => {
        if (AppState.ctxTargetId) startEdit(AppState.ctxTargetId);
        hideCtx();
    });
    document.getElementById('ctx-toggle').addEventListener('click', async () => {
        if (AppState.ctxTargetId) await toggleTodo(AppState.ctxTargetId);
        hideCtx();
    });
    document.getElementById('ctx-delete').addEventListener('click', async () => {
        if (AppState.ctxTargetId) await deleteTodo(AppState.ctxTargetId);
        hideCtx();
    });

    // Filter tags
    document.querySelectorAll('#filter-tags button[data-filter]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#filter-tags button[data-filter]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            AppState.currentFilter = btn.dataset.filter;
            loadTodos();
        });
    });

    // History status filter
    document.querySelectorAll('#history-status-filter button').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#history-status-filter button').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            AppState.historyStatusFilter = btn.dataset.status;
            AppState.historyPage = 1;
            loadTodos();
        });
    });

    // Pagination
    document.getElementById('pagination-btns').addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn || btn.disabled) return;
        const action = btn.dataset.page;
        if (action === 'first') AppState.historyPage = 1;
        else if (action === 'prev') AppState.historyPage = Math.max(1, AppState.historyPage - 1);
        else if (action === 'next') AppState.historyPage = Math.min(Math.ceil(AppState.todos.length / AppState.HISTORY_PAGE_SIZE), AppState.historyPage + 1);
        else if (action === 'last') AppState.historyPage = Math.ceil(AppState.todos.length / AppState.HISTORY_PAGE_SIZE);
        else AppState.historyPage = parseInt(action);
        loadTodos();
    });

    // Window drag
    let isDragging = false;
    let dragStartX = 0, dragStartY = 0;
    const titleBar = document.querySelector('.title-bar');
    titleBar.addEventListener('mousedown', (e) => {
        if (e.target.closest('button')) return;
        isDragging = true;
        dragStartX = e.screenX;
        dragStartY = e.screenY;
        titleBar.style.cursor = 'grabbing';
    });
    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const dx = e.screenX - dragStartX;
        const dy = e.screenY - dragStartY;
        dragStartX = e.screenX;
        dragStartY = e.screenY;
        callApi('move_window', { dx, dy });
    });
    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            titleBar.style.cursor = '';
        }
    });
}
