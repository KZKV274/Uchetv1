// --- ИНИЦИАЛИЗАЦИЯ И СОСТОЯНИЕ ---
let entries = JSON.parse(localStorage.getItem('wh_entries')) || [];
let settings = JSON.parse(localStorage.getItem('wh_settings')) || {
  employees: ['Иван', 'Анна'],
  models: ['Футболка Base', 'Худи Oversize'],
  colors: ['Чёрный', 'Белый', 'Красный'],
  sizes: ['S', 'M', 'L', 'XL', '42', '44', '46']
};

const DOM = {
  navBtns: document.querySelectorAll('.nav-btn'),
  tabs: document.querySelectorAll('.tab-content'),
  subTabs: document.querySelectorAll('.sub-tab')
};

// --- УНИВЕРСАЛЬНАЯ ФУНКЦИЯ ПОДСЧЕТА (groupSum) ---
function groupSum(list, keyFn) {
  return list.reduce((acc, item) => {
    const key = keyFn(item);
    acc[key] = (acc[key] || 0) + Number(item.quantity);
    return acc;
  }, {});
}

// Нормализация размера (удаление пробелов по краям, перевод в нижний регистр)
const normalizeSize = (size) => size.toString().trim().toLowerCase();

// --- НАВИГАЦИЯ ---
DOM.navBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    DOM.navBtns.forEach(b => b.classList.remove('active'));
    DOM.tabs.forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.target).classList.add('active');
    if (btn.dataset.target === 'tab-history') renderHistory();
    if (btn.dataset.target === 'tab-stats') renderStats();
  });
});

// --- ВКЛАДКА: ДОБАВИТЬ ---
function updateFormOptions() {
  const empSelect = document.getElementById('input-employee');
  const modSelect = document.getElementById('input-model');
  const qcContainer = document.getElementById('quick-colors');
  const qsContainer = document.getElementById('quick-sizes');

  empSelect.innerHTML = settings.employees.map(e => `<option value="${e}">${e}</option>`).join('');
  modSelect.innerHTML = settings.models.map(m => `<option value="${m}">${m}</option>`).join('');
  
  qcContainer.innerHTML = settings.colors.map(c => `<button type="button" class="q-btn" onclick="document.getElementById('input-color').value='${c}'">${c}</button>`).join('');
  qsContainer.innerHTML = settings.sizes.map(s => `<button type="button" class="q-btn" onclick="document.getElementById('input-size').value='${s}'">${s}</button>`).join('');
}

document.getElementById('add-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const entry = {
    id: Date.now(),
    createdAt: new Date().toISOString(),
    employee: document.getElementById('input-employee').value,
    model: document.getElementById('input-model').value,
    color: document.getElementById('input-color').value,
    size: document.getElementById('input-size').value, // Сохраняем как есть, нормализуем при расчетах
    quantity: parseInt(document.getElementById('input-qty').value, 10),
    note: document.getElementById('input-note').value
  };

  entries.push(entry);
  localStorage.setItem('wh_entries', JSON.stringify(entries));
  alert('Сохранено!');
  e.target.reset();
});

document.getElementById('btn-clear').addEventListener('click', () => {
  document.getElementById('add-form').reset();
});

// --- ВКЛАДКА: ИСТОРИЯ ---
function renderHistory() {
  const fSearch = document.getElementById('filter-search').value.toLowerCase();
  const fEmp = document.getElementById('filter-employee').value;
  const fMod = document.getElementById('filter-model').value;
  const fSize = normalizeSize(document.getElementById('filter-size').value);
  const fStart = document.getElementById('filter-date-start').value;
  const fEnd = document.getElementById('filter-date-end').value;

  // Обновляем селекты фильтров
  const filterEmp = document.getElementById('filter-employee');
  const filterMod = document.getElementById('filter-model');
  if(filterEmp.options.length === 1) filterEmp.innerHTML += settings.employees.map(e => `<option value="${e}">${e}</option>`).join('');
  if(filterMod.options.length === 1) filterMod.innerHTML += settings.models.map(m => `<option value="${m}">${m}</option>`).join('');

  let filtered = entries.filter(e => {
    const dateStr = e.createdAt.split('T')[0];
    const matchSearch = e.model.toLowerCase().includes(fSearch) || e.color.toLowerCase().includes(fSearch) || e.note.toLowerCase().includes(fSearch);
    const matchEmp = !fEmp || e.employee === fEmp;
    const matchMod = !fMod || e.model === fMod;
    const matchSize = !fSize || normalizeSize(e.size) === fSize;
    const matchDate = (!fStart || dateStr >= fStart) && (!fEnd || dateStr <= fEnd);
    return matchSearch && matchEmp && matchMod && matchSize && matchDate;
  });

  filtered.sort((a, b) => b.id - a.id); // Новые сверху

  const totalQty = filtered.reduce((sum, e) => sum + e.quantity, 0);
  const uEmp = new Set(filtered.map(e => e.employee)).size;
  const uMod = new Set(filtered.map(e => e.model)).size;
  const uSize = new Set(filtered.map(e => normalizeSize(e.size))).size;

  document.getElementById('history-summary').innerText = `Записей: ${filtered.length} | Единиц: ${totalQty} | Сотр: ${uEmp} | Мод: ${uMod} | Разм: ${uSize}`;

  const listContainer = document.getElementById('history-list');
  listContainer.innerHTML = filtered.map(e => `
    <div class="entry-card">
      <div class="entry-info">
        <h4>${e.model} (${e.color}, ${e.size})</h4>
        <p>${e.employee} | ${new Date(e.createdAt).toLocaleString('ru-RU', {day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit'})}</p>
        ${e.note ? `<p><i>${e.note}</i></p>` : ''}
      </div>
      <div style="text-align: right;">
        <div class="entry-qty">${e.quantity} шт</div>
        <button class="btn-danger" onclick="deleteEntry(${e.id})" style="margin-top:5px; border:none; border-radius:4px; cursor:pointer;">Удалить</button>
      </div>
    </div>
  `).join('');
}

window.deleteEntry = (id) => {
  if (confirm('Удалить запись?')) {
    entries = entries.filter(e => e.id !== id);
    localStorage.setItem('wh_entries', JSON.stringify(entries));
    renderHistory();
  }
};

['filter-search', 'filter-employee', 'filter-model', 'filter-size', 'filter-date-start', 'filter-date-end'].forEach(id => {
  document.getElementById(id).addEventListener('input', renderHistory);
});

// --- ВКЛАДКА: СТАТИСТИКА ---
let currentPeriod = 'today';

DOM.subTabs.forEach(btn => {
  btn.addEventListener('click', () => {
    DOM.subTabs.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentPeriod = btn.dataset.period;
    renderStats();
  });
});

function getPeriodEntries() {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const dayMs = 86400000;

  return entries.filter(e => {
    const time = new Date(e.createdAt).getTime();
    if (currentPeriod === 'today') return time >= startOfDay;
    if (currentPeriod === 'week') return time >= (startOfDay - dayMs * 6);
    if (currentPeriod === 'month') return time >= (startOfDay - dayMs * 29);
    return true; // 'all'
  });
}

function renderStats() {
  const data = getPeriodEntries();
  
  // 1. Общая информация
  const totalQty = data.reduce((sum, e) => sum + e.quantity, 0);
  const uEmp = new Set(data.map(e => e.employee)).size;
  const uMod = new Set(data.map(e => e.model)).size;
  const uSize = new Set(data.map(e => normalizeSize(e.size))).size;

  document.getElementById('stats-general').innerHTML = `
    <div class="stat-card"><span>${totalQty}</span>Всего единиц</div>
    <div class="stat-card"><span>${data.length}</span>Записей</div>
    <div class="stat-card"><span>${uSize}</span>Уникальных размеров</div>
    <div class="stat-card"><span>${uEmp}</span>Сотрудников</div>
  `;

  // Рендер ТОП-ов (вспомогательная функция)
  const renderTop = (containerId, keyFn, labelSuffix = 'шт') => {
    const grouped = groupSum(data, keyFn);
    const sorted = Object.entries(grouped).sort((a, b) => b[1] - a[1]);
    document.getElementById(containerId).innerHTML = sorted.map(item => `
      <div class="top-item">
        <strong>${item[0] || 'Не указано'}</strong>
        <span>${item[1]} ${labelSuffix}</span>
      </div>
    `).join('') || '<p style="color:gray">Нет данных</p>';
  };

  // 2 и 3. Топы
  renderTop('stats-top-sizes', e => normalizeSize(e.size)); // 🔥 КЛЮЧЕВОЕ - нормализованный размер
  renderTop('stats-top-models', e => e.model);
  renderTop('stats-top-employees', e => e.employee);

  // 4. Динамика (График)
  renderChart();
}

function renderChart() {
  const chartContainer = document.getElementById('chart-container');
  const now = new Date();
  const days = [];
  
  // Генерируем последние 14 дней
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    days.push(d.toISOString().split('T')[0]);
  }

  // Группируем ВСЕ записи по дате
  const dailySums = groupSum(entries, e => e.createdAt.split('T')[0]);
  
  const chartData = days.map(d => dailySums[d] || 0);
  const maxVal = Math.max(...chartData, 1); // Чтобы избежать деления на 0

  chartContainer.innerHTML = days.map((dateStr, i) => {
    const val = chartData[i];
    const heightPct = (val / maxVal) * 100;
    const label = dateStr.slice(8, 10) + '.' + dateStr.slice(5, 7); // DD.MM
    return `
      <div class="chart-bar-wrap">
        <span style="font-size:10px; color:var(--text-main)">${val > 0 ? val : ''}</span>
        <div class="chart-bar" style="height: ${heightPct}%"></div>
        <div class="chart-label">${label}</div>
      </div>
    `;
  }).join('');
}

// --- ВКЛАДКА: НАСТРОЙКИ ---
function renderSettings() {
  document.getElementById('set-employees').value = settings.employees.join(', ');
  document.getElementById('set-models').value = settings.models.join(', ');
  document.getElementById('set-colors').value = settings.colors.join(', ');
  document.getElementById('set-sizes').value = settings.sizes.join(', ');
}

document.getElementById('btn-save-settings').addEventListener('click', () => {
  const parseArea = (id) => document.getElementById(id).value.split(',').map(s => s.trim()).filter(s => s);
  settings.employees = parseArea('set-employees');
  settings.models = parseArea('set-models');
  settings.colors = parseArea('set-colors');
  settings.sizes = parseArea('set-sizes');
  
  localStorage.setItem('wh_settings', JSON.stringify(settings));
  updateFormOptions();
  alert('Настройки сохранены!');
});

// Экспорт CSV
document.getElementById('btn-export-csv').addEventListener('click', () => {
  if(!entries.length) return alert('Нет данных для экспорта');
  const headers = ['ID', 'Дата', 'Сотрудник', 'Модель', 'Цвет', 'Размер', 'Количество', 'Комментарий'];
  const rows = entries.map(e => [
    e.id, e.createdAt, `"${e.employee}"`, `"${e.model}"`, `"${e.color}"`, `"${e.size}"`, e.quantity, `"${e.note || ''}"`
  ].join(','));
  
  const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(','), ...rows].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `warehouse_${new Date().toISOString().slice(0,10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
});

// Экспорт JSON
document.getElementById('btn-export-json').addEventListener('click', () => {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(entries));
  const link = document.createElement("a");
  link.setAttribute("href", dataStr);
  link.setAttribute("download", `backup_${new Date().toISOString().slice(0,10)}.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
});

// Импорт JSON
document.getElementById('file-import-json').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const imported = JSON.parse(ev.target.result);
      if (Array.isArray(imported)) {
        entries = imported;
        localStorage.setItem('wh_entries', JSON.stringify(entries));
        alert('Данные успешно загружены!');
        renderHistory();
      }
    } catch (err) {
      alert('Ошибка чтения файла!');
    }
  };
  reader.readAsText(file);
});

// Запуск приложения
updateFormOptions();
renderSettings();

// Регистрация Service Worker для PWA
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js')
    .then(() => console.log('Service Worker Registered'))
    .catch(err => console.error('SW Registration failed', err));
}
