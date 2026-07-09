/* ===== MiniTodo Render ===== */

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ===== Pending Cards =====
function renderPendingCards(items) {
    const $list = document.getElementById('todo-list');
    $list.innerHTML = items.map(t => {
        const todayStr = getTodayStr();
        const isOverdue = t.due_date && new Date(t.due_date + 'T23:59:59') < new Date();
        const isDueToday = t.due_date && t.due_date === todayStr && !isOverdue;
        const isImportant = t.priority === 'important';

        let cls = '';
        if (isOverdue) cls = 'overdue';
        else if (isDueToday && isImportant) cls = 'important';
        else if (isImportant) cls = 'important';

        let countdownHtml = '';
        if (t.due_date) {
            const todayStart = new Date(todayStr + 'T00:00:00').getTime();
            const dueStart = new Date(t.due_date + 'T00:00:00').getTime();
            const diff = Math.ceil((dueStart - todayStart) / 86400000);
            countdownHtml = `<div class="todo-countdown ${diff < 0 ? 'overdue' : diff === 0 ? 'today' : ''}">${diff}</div>`;
        } else {
            countdownHtml = `<div class="todo-countdown empty"></div>`;
        }

        return `
            <div class="todo-item ${cls}" data-id="${t.id}">
                <div class="todo-check"></div>
                <div class="todo-info">
                    <div class="todo-title">${escapeHtml(t.title)}</div>
                </div>
                ${countdownHtml}
            </div>
        `;
    }).join('');
}

// ===== History Table =====
function renderHistoryTable(items) {
    const $list = document.getElementById('todo-list');
    $list.innerHTML = `
        <div class="history-table">
            <div class="history-table-header">
                <div class="ht-col ht-col-title">名称</div>
                <div class="ht-col ht-col-priority">优先级</div>
                <div class="ht-col ht-col-created">创建时间</div>
                <div class="ht-col ht-col-status-text">状态</div>
            </div>
            <div class="history-table-body">
                ${items.map(t => {
                    const isDone = t.status === 'done';
                    const isImportant = t.priority === 'important';
                    const created = t.created_at ? t.created_at.slice(0, 10) : '-';

                    return `
                    <div class="history-table-row" data-id="${t.id}">
                        <div class="ht-col ht-col-title">
                            <span class="ht-title ${isDone ? 'done' : ''}">${escapeHtml(t.title)}</span>
                        </div>
                        <div class="ht-col ht-col-priority">
                            ${isImportant ? '<span class="ht-tag important">重要</span>' : '<span class="ht-tag">一般</span>'}
                        </div>
                        <div class="ht-col ht-col-created">${created}</div>
                        <div class="ht-col ht-col-status-text">
                            <span class="ht-status ${isDone ? 'done' : 'pending'}">${isDone ? '已完成' : '未完成'}</span>
                        </div>
                    </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
}

// ===== Empty State =====
function renderEmpty(isHistory) {
    const $list = document.getElementById('todo-list');
    const msg = isHistory ? '暂无事项' : '暂无待办事项';
    const sub = '点击上方输入框添加新任务吧';
    $list.innerHTML = `<div class="empty"><div class="icon">${svgIcon(ICONS.box, 40)}</div><p>${msg}</p><p class="sub">${sub}</p></div>`;
}

// ===== List Router =====
function renderList(items) {
    const isHistory = AppState.currentTab === 'history';
    if (!items.length) {
        renderEmpty(isHistory);
        return;
    }
    if (isHistory) {
        renderHistoryTable(items);
    } else {
        renderPendingCards(items);
    }
}

// ===== Pagination =====
function renderPagination(totalPages) {
    const bar = document.getElementById('pagination-bar');
    const container = document.getElementById('pagination-btns');
    const info = document.getElementById('pagination-info');
    bar.style.display = 'flex';
    info.textContent = totalPages > 1
        ? `共 ${AppState.todos.length} 条记录，第 ${AppState.historyPage}/${totalPages} 页`
        : `共 ${AppState.todos.length} 条记录`;
    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }
    let html = '';
    html += `<button class="btn" data-page="first" ${AppState.historyPage === 1 ? 'disabled' : ''}>«</button>`;
    html += `<button class="btn" data-page="prev" ${AppState.historyPage === 1 ? 'disabled' : ''}>‹</button>`;
    for (let i = 1; i <= totalPages; i++) {
        if (i === AppState.historyPage) {
            html += `<button class="btn active" data-page="${i}">${i}</button>`;
        } else {
            html += `<button class="btn" data-page="${i}">${i}</button>`;
        }
    }
    html += `<button class="btn" data-page="next" ${AppState.historyPage === totalPages ? 'disabled' : ''}>›</button>`;
    html += `<button class="btn" data-page="last" ${AppState.historyPage === totalPages ? 'disabled' : ''}>»</button>`;
    container.innerHTML = html;
}
