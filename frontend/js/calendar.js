/* ===== MiniTodo Calendar Picker ===== */

let dpYear, dpMonth, dpSelectedDate;
let dpActiveInput = null;

const $dpOverlay = document.getElementById('dp-overlay');
const $dpPopup = document.getElementById('dp-popup');
const $dpMonthYear = document.getElementById('dp-month-year');
const $dpDays = document.getElementById('dp-days');

function positionDatePicker(inputEl) {
    const rect = inputEl.getBoundingClientRect();
    const popupWidth = 246;
    const popupHeight = 310;
    const margin = 8;
    let left = rect.left;
    let top = rect.bottom + 6;

    if (left + popupWidth > window.innerWidth - margin) {
        left = rect.right - popupWidth;
    }
    if (left < margin) left = margin;

    if (top + popupHeight > window.innerHeight - margin) {
        top = rect.top - popupHeight - 6;
    }
    if (top < margin) top = margin;

    $dpPopup.style.display = 'block';
    $dpOverlay.style.display = 'block';
    $dpPopup.style.left = left + 'px';
    $dpPopup.style.top = top + 'px';
}

function openDatePickerFor(inputEl) {
    dpActiveInput = inputEl;
    positionDatePicker(inputEl);

    const parts = (inputEl.value || '').split('-');
    if (parts.length === 3) {
        dpYear = parseInt(parts[0]);
        dpMonth = parseInt(parts[1]) - 1;
        dpSelectedDate = inputEl.value;
    } else {
        const today = new Date();
        dpYear = today.getFullYear();
        dpMonth = today.getMonth();
        dpSelectedDate = null;
    }
    renderCalendar();
}

function closeDatePicker() {
    $dpPopup.style.display = 'none';
    $dpOverlay.style.display = 'none';
}

function renderCalendar() {
    const months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
    $dpMonthYear.textContent = `${dpYear}年 ${months[dpMonth]}`;

    const firstDay = new Date(dpYear, dpMonth, 1).getDay();
    const daysInMonth = new Date(dpYear, dpMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(dpYear, dpMonth, 0).getDate();

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    let html = '';
    for (let i = firstDay - 1; i >= 0; i--) {
        html += `<button class="btn other-month">${daysInPrevMonth - i}</button>`;
    }
    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${dpYear}-${String(dpMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        let cls = '';
        if (dateStr === dpSelectedDate) cls += ' selected';
        if (dateStr === todayStr) cls += ' today';
        html += `<button class="btn ${cls}" data-date="${dateStr}">${d}</button>`;
    }
    const totalCells = firstDay + daysInMonth;
    const remaining = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
    for (let d = 1; d <= remaining; d++) {
        html += `<button class="btn other-month">${d}</button>`;
    }

    $dpDays.innerHTML = html;
    $dpDays.querySelectorAll('button:not(.other-month)').forEach(btn => {
        btn.addEventListener('click', () => {
            dpSelectedDate = btn.dataset.date;
            if (dpActiveInput) dpActiveInput.value = dpSelectedDate;
            closeDatePicker();
        });
    });
}

// ---- Init Calendar Events ----
document.getElementById('dp-prev').addEventListener('click', () => {
    dpMonth--;
    if (dpMonth < 0) { dpMonth = 11; dpYear--; }
    renderCalendar();
});
document.getElementById('dp-next').addEventListener('click', () => {
    dpMonth++;
    if (dpMonth > 11) { dpMonth = 0; dpYear++; }
    renderCalendar();
});
document.getElementById('dp-clear').addEventListener('click', () => {
    if (dpActiveInput) dpActiveInput.value = '';
    dpSelectedDate = null;
    closeDatePicker();
});
document.getElementById('dp-today').addEventListener('click', () => {
    const today = new Date();
    dpSelectedDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    if (dpActiveInput) dpActiveInput.value = dpSelectedDate;
    closeDatePicker();
});
$dpOverlay.addEventListener('click', closeDatePicker);
