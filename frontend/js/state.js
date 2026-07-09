/* ===== MiniTodo State ===== */
const AppState = {
    currentTab: 'pending',
    currentFilter: 'today',
    todos: [],
    ctxTargetId: null,
    inputPriority: 'normal',
    historyStatusFilter: 'all',
    editPriority: 'normal',
    historyPage: 1,
    HISTORY_PAGE_SIZE: 10
};

// 获取本地日期字符串（YYYY-MM-DD），避免 toISOString() 使用 UTC 导致时区偏差
function getTodayStr() {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}
