function getUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const groupId = params.get('groupId');
    const staffId = params.get('staffId');

    // Если ничего не задано — подставим дефолтный groupId
    if (!groupId && !staffId) {
        return {
            groupId: '1213641978', // дефолтная группа
            staffId: null,
            selectedWeek: params.get('selectedWeek') || null
        };
    }

    return {
        groupId,
        staffId,
        selectedWeek: params.get('selectedWeek') || null
    };
}

function setupNavigation(id, weekPrev, weekNext, type) {
    const prevLink = document.getElementById('prev-week');
    const nextLink = document.getElementById('next-week');

    prevLink.href = `?${type}=${id}&selectedWeek=${weekPrev}`;
    nextLink.href = `?${type}=${id}&selectedWeek=${weekNext}`;
}
document.addEventListener('DOMContentLoaded', async function () {
    const { groupId, staffId, selectedWeek } = getUrlParams();

    let entityId = groupId || staffId;
    const type = groupId ? 'groupId' : staffId ? 'staffId' : null;

    if (!type || !entityId) {
        console.error('Не указан groupId или staffId');
        return;
    }

    let groupIndex = {};
    let staffIndex = {};

    try {
        const res = await fetch('/api/group-index');
        groupIndex = await res.json();
        const res2 = await fetch('/api/staff-index');
        staffIndex = await res2.json();
    } catch (e) {
        console.warn('Ошибка при загрузке индексов');
    }

    const map = type === 'groupId' ? groupIndex : staffIndex;
    if (!/^\d+$/.test(entityId)) {
        if (map[entityId]) {
            entityId = map[entityId];
            history.replaceState(null, '', `?${type}=${entityId}${selectedWeek ? `&selectedWeek=${selectedWeek}` : ''}`);
        } else {
            console.error('Не удалось найти соответствие для:', entityId);
            return;
        }
    }

    let apiUrl = `/api/rasp?${type}=${entityId}`;
    if (selectedWeek) {
        apiUrl += `&selectedWeek=${selectedWeek}`;
    }
    fetch(apiUrl).then(response => response.json()).then(data => {
    console.log("test");
    const entity = data.group || data.staff;
const entityType = data.group ? 'groupId' : 'staffId';
setupNavigation(entity.id, data.week.weekPrev, data.week.weekNext, entityType);
  
      // заголовок
      if (data.group) {
        document.getElementById('group-name').textContent = `Группа: ${data.group.name}`;
        document.getElementById('group-title').textContent = data.group.groupTitle;
        document.getElementById('education-form').textContent = data.group.formOfEducation;
    } else if (data.staff) {
        document.getElementById('group-name').textContent = `Преподаватель: ${data.staff.name}`;
        document.getElementById('group-title').textContent = data.staff.title || '';
        document.getElementById('education-form').textContent = data.staff.formOfEducation || '';
    }
    document.getElementById('current-week').textContent = `Неделя ${data.week.weekNumber}`;

      // генерация thead
    const theadRow = document.querySelector('.schedule thead tr');
    theadRow.innerHTML = `<th>Время</th>` + data.weekdays.map(d =>
    `<th>${d.dayName}<br><span class="date">${d.date}</span></th>`
    ).join('');

    // генерация расписания (tbody)
    const times = [...new Set(data.schedule.map(item => item.time))];
    const days = data.weekdays.map(d => d.dayName.toLowerCase());

    const tbody = document.querySelector('.schedule tbody');
    tbody.innerHTML = '';

    times.forEach(time => {
    const row = document.createElement('tr');
    const timeCell = document.createElement('td');
    timeCell.textContent = time;
    row.appendChild(timeCell);

    days.forEach(day => {
        const cell = document.createElement('td');

        const lessons = data.schedule.filter(l =>
        l.time === time && l.dayOfWeek.toLowerCase() === day
        );

        lessons.forEach(lesson => {
        const div = document.createElement('div');
        div.classList.add('lesson-block');
        let groupLinks = '';
                    if (lesson.groups && lesson.groups.length) {
                        groupLinks = lesson.groups.map(g => {
                            const id = groupIndex[g]; // ищем соответствие
                            const href = id ? `?groupId=${id}` : `#`;
                            return `<div><a href="${href}">${g}</a></div>`;
                        }).join('');
                    }
        let teacherHtml = lesson.teacher;
        if (lesson.teacher && !/воен/i.test(lesson.teacher)) {
            const staffId = staffIndex[lesson.teacher];
            if (staffId) {
                teacherHtml = `<a href="?staffId=${staffId}">${lesson.teacher}</a>`;
            }
        }
        div.innerHTML = `
                        <strong>${lesson.subject}</strong><br>
                        ${lesson.type}<br>
                        ${teacherHtml}<br>
                        ${lesson.room}<br>
                        ${groupLinks}
                        ${lesson.subgroup ? `<small>Подгруппа: ${lesson.subgroup}</small>` : ''}
                    `;
        cell.appendChild(div);
        });
        

        row.appendChild(cell);
    });

    tbody.appendChild(row);
    });
})
    .catch(err => console.error('Ошибка загрузки:', err));
})  





