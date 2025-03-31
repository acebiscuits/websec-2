import React, { useState, useEffect } from 'react';
import './index.css';

function getUrlParams() {
  const params = new URLSearchParams(window.location.search);
  const groupId = params.get('groupId');
  const staffId = params.get('staffId');
  const selectedWeek = params.get('selectedWeek');

  return {
    groupId,
    staffId,
    selectedWeek,
  };
}

function App() {
  const [data, setData] = useState(null);
  const [groupIndex, setGroupIndex] = useState({});
  const [staffIndex, setStaffIndex] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { groupId, staffId, selectedWeek } = getUrlParams();

    const type = groupId ? 'groupId' : staffId ? 'staffId' : null;
    let id = groupId || staffId;

    if (!type || !id) return;

    Promise.all([
      fetch('/api/group-index').then((r) => r.json()),
      fetch('/api/staff-index').then((r) => r.json()),
    ])
      .then(([groupMap, staffMap]) => {
        setGroupIndex(groupMap);
        setStaffIndex(staffMap);

        const map = type === 'groupId' ? groupMap : staffMap;
        if (!/^\d+$/.test(id) && map[id]) {
          id = map[id];
          const url = new URL(window.location.href);
          url.searchParams.set(type, id);
          if (selectedWeek) url.searchParams.set('selectedWeek', selectedWeek);
          window.history.replaceState({}, '', url);
        }

        let apiUrl = `/api/rasp?${type}=${id}`;
        if (selectedWeek) apiUrl += `&selectedWeek=${selectedWeek}`;

        return fetch(apiUrl).then((r) => r.json());
      })
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Ошибка загрузки:', err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="wrapper">
      <header>
        <h1>
          Расписание занятий
          <img src="/img/owl-cream_small.svg" style={{ width: '100px' }} alt="logo" />
        </h1>

        <div className="group-info">
          {data?.group && (
            <>
              <span>Группа: {data.group.name}</span>
              <div>{data.group.title}</div>
              <div>{data.group.formOfEducation}</div>
            </>
          )}
          {data?.staff && (
            <>
              <span>Преподаватель: {data.staff.name}</span>
              <div>{data.staff.title}</div>
              <div>{data.staff.formOfEducation}</div>
            </>
          )}
        </div>

        <nav className="week-navigation">
          {data && (
            <>
              <a href={`?${data.group ? 'groupId' : 'staffId'}=${data[data.group ? 'group' : 'staff'].id}&selectedWeek=${data.week.weekPrev}`}>← Предыдущая неделя</a>
              <span>Неделя {data.week.weekNumber}</span>
              <a href={`?${data.group ? 'groupId' : 'staffId'}=${data[data.group ? 'group' : 'staff'].id}&selectedWeek=${data.week.weekNext}`}>Следующая неделя →</a>
            </>
          )}
        </nav>
      </header>

      <main>
  <table className="schedule">
    <thead>
      <tr>
        <th>Время</th>
        {data?.weekdays.map((day, idx) => (
          <th key={idx}>
            {day.dayName}<br />
            <span className="date">{day.date}</span>
          </th>
        ))}
      </tr>
    </thead>
    <tbody>
  {data && (() => {
    const times = [...new Set(data.schedule.map(item => item.time))];
    const days = data.weekdays.map(d => d.dayName);

    return times.map((time, i) => {
      return (
        <tr key={i}>
          <td>{time}</td>
          {days.map((day, j) => {
            const lessons = data.schedule.filter(
              l => l.time === time && l.dayOfWeek === day
            );
            return (
              <td key={j}>
                {lessons.map((lesson, k) => {
                  const teacherName = staffIndex[lesson.teacher]
                    ? <a href={`?staffId=${staffIndex[lesson.teacher]}`}>{lesson.teacher}</a>
                    : lesson.teacher;

                  return (
                    <div className="lesson-block" key={k}>
                      <strong>{lesson.subject}</strong><br />
                      {lesson.type}<br/>
                      {teacherName}<br/>
                      {lesson.room}<br/>
                      {lesson.groups?.map((g, i) => {
                        const gid = groupIndex[g];
                        return (
                          <div key={i}>
                            {gid ? <a href={`?groupId=${gid}`}>{g}</a> : g}
                          </div>
                        );
                      })}
                      {lesson.subgroup && (
                        <div><small>Подгруппа: {lesson.subgroup}</small></div>
                      )}
                    </div>
                  );
                })}
              </td>
            );
          })}
        </tr>
      );
    });
  })()}
</tbody>

  </table>
</main>

      <footer>
        <p>&copy; Nothing to see here</p>
      </footer>
    </div>
  );
}

export default App;
