/* ===== MiniTodo App - Main Entry ===== */

(async () => {
    // Initialize modals
    initConfirmModal();
    initEditModal();

    // Bind all UI events
    bindAllEvents();

    // Initial data load
    await loadTodos();
})();
