const express = require('express');
const fs = require('fs');
const path = require('path');
const parseSchedule = require('../parser/parseSchedule');

const app = express();
const PORT = 3000;

app.use(express.static(path.join(__dirname, '..', 'public')));

// API: получение расписания
app.get('/api/rasp', async (req, res) => {
  const groupId = req.query.groupId;
  const staffId = req.query.staffId;
  const selectedWeek = req.query.selectedWeek || null;
  
  const type = groupId ? 'groupId' : staffId ? 'staffId' : null;
  const id = groupId || staffId;
  
  if (!type || !id) {
      return res.status(400).json({ error: 'Не указан параметр groupId или staffId' });
  }

  try {
    // Парсим данные
    const result = await parseSchedule(type, id, selectedWeek);

    if (!result) {
      return res.status(500).json({ error: 'Ошибка при парсинге группы' });
    }

    // Сохраняем результат по имени группы
    // const outputPath = path.join(__dirname, '..', 'data', `${result.group.name}.json`);

    const entity = result[type === 'groupId' ? 'group' : 'staff'];
const filename = `${entity.name.replace(/[\\/:*?"<>|]/g, '_')}.json`;
const outputPath = path.join(__dirname, '..', 'data', filename);
fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf-8');

    console.log("4")
    console.log(outputPath)
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf-8');

    // Обновляем индекс groupName → groupId
    if (type === 'groupId') {
      const indexPath = path.join(__dirname, '..', 'data', 'groupIndex.json');
      let index = {};
      if (fs.existsSync(indexPath)) {
        index = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
      }
      index[result.group.groupName] = result.group.groupId;
      fs.writeFileSync(indexPath, JSON.stringify(index, null, 2), 'utf-8');
      console.log('Обновлён groupIndex.json');
    } else if (type === 'staffId') {
      const indexPath = path.join(__dirname, '..', 'data', 'staffIndex.json');
      let index = {};
      if (fs.existsSync(indexPath)) {
        index = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
      }
      index[result.staff.name] = result.staff.id;
      fs.writeFileSync(indexPath, JSON.stringify(index, null, 2), 'utf-8');
      console.log('Обновлён staffIndex.json');
    }

    return res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// API: получение списка известных групп
app.get('/api/group-index', (req, res) => {
  const indexPath = path.join(__dirname, '..', 'data', 'groupIndex.json');
  if (fs.existsSync(indexPath)) {
    const json = fs.readFileSync(indexPath, 'utf-8');
    return res.json(JSON.parse(json));
  }
  res.json({});
});

app.get('/api/staff-index', (req, res) => {
  const indexPath = path.join(__dirname, '..', 'data', 'staffIndex.json');
  if (fs.existsSync(indexPath)) {
    const json = fs.readFileSync(indexPath, 'utf-8');
    return res.json(JSON.parse(json));
  }
  res.json({});
});


app.listen(PORT, () => {
  console.log(`Сервер запущен: http://localhost:${PORT}`);
});
