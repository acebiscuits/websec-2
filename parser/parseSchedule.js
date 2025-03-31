const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

async function parseSchedule(type, id, selectedWeek = null) {
    let url = `https://ssau.ru/rasp?${type}=${id}`;

    if (selectedWeek) url += `&selectedWeek=${selectedWeek}`;
    // console.log(`Парсинг расписания для группы ${groupId}`);

    try {
        const { data: html } = await axios.get(url);
        const $ = cheerio.load(html);

        // info about group
        const entityName = $('h1').text().trim().replace(/^Расписание,\s*/, '');
        let entityTitle = null;
        let formOfEducation = null;
        if (type === 'groupId') {
            entityTitle = $('.body-text.info-block__description > div').first().text().trim();
            formOfEducation = $('.body-text.info-block__description > div').last().text().trim();
        }



        //info about week
        const weekNumber = parseInt($('.week-nav-current_week').text().trim());
        //const weekNumber = parseInt(weekText);
        //const weekStartDate = $('.week-nav-current_date').text().trim();
        const weekPrevHref = $('.week-nav-prev').attr('href');
        const weekNextHref = $('.week-nav-next').attr('href');

        const extractWeek = (href) => {
            const match = href && href.match(/selectedWeek=(\d+)/);
            return match ? parseInt(match[1]) : null;
        };

        const weekPrev = extractWeek(weekPrevHref);
        const weekNext = extractWeek(weekNextHref);  

        //info about lesson

        // const timeSlots = [];
        // $('.schedule__time-item').each((i, el) => {
        //     const time = $(el).text().trim();
        //     if (time) timeSlots.push(time);
        // });

        const timePairs = [];
        const timeItems = $('.schedule__time-item').toArray();

        for (let i = 0; i < timeItems.length; i += 2) {
            const t1 = $(timeItems[i]).text().trim();
            const t2 = timeItems[i + 1] ? $(timeItems[i + 1]).text().trim() : '';
            timePairs.push(`${t1}  ${t2}`);
        }
        console.log(timePairs)

        console.log(timePairs)

        const weekdays = [];
        $('.schedule__item.schedule__head').each((i, el) => {
            const dayName = $(el).find('.schedule__head-weekday').text().trim();
            const date = $(el).find('.schedule__head-date').text().trim();
        
            if (dayName && date) {
                weekdays.push({ dayName, date });
            }
        });

        const scheduleItems = $('.schedule__item').not('.schedule__head').toArray();

        const schedule = [];

        const groupIndex = {};
        const staffIndex = {};

        for (let timeIndex = 0; timeIndex < timeItems.length; timeIndex++) {
            for (let dayIndex = 0; dayIndex < weekdays.length; dayIndex++) {
                const cellIndex = timeIndex * weekdays.length + dayIndex;
                const cell = scheduleItems[cellIndex];
                const $cell = $(cell);
            
                const lessons = $cell.find('.schedule__lesson');
            
                lessons.each((j, lesson) => {
                const $lesson = $(lesson);

            
                const subject = $lesson.find('.schedule__discipline').text().trim();
                const type = $lesson.find('.schedule__lesson-type').text().trim();
                const teacher = $lesson.find('.schedule__teacher a').text().trim() ||   $lesson.find('.schedule__teacher').text().trim();
                const teacherHref = $lesson.find('.schedule__teacher a').attr('href');
                const teacherName = teacher;

                if (teacherName && teacherHref) {
                    const match = teacherHref.match(/staffId=(\d+)/);
                    if (match) {
                        staffIndex[teacherName] = match[1];
                    }
                }
                const room = $lesson.find('.schedule__place').text().trim();
                
                // const groupElems = $lesson.find('a.schedule__group');
                // const groups = groupElems.map((i, el) => $(el).text().trim()).get();
                const groups = [];
                $lesson.find('a.schedule__group').each((i, el) => {
                    const name = $(el).text().trim();
                    const href = $(el).attr('href');
                    const match = href && href.match(/groupId=(\d+)/);
                    if (name && match) {
                        groups.push(name);
                        groupIndex[name] = match[1]; // сохраняем соответствие в индекс
                    }
                });
        
                const rawText = $lesson.text();
                const subgroupMatch = rawText.match(/Подгруппы:\s*(\d+)/i);
                const subgroup = subgroupMatch ? subgroupMatch[1] : null;
            
                schedule.push({dayOfWeek: weekdays[dayIndex].dayName, date: weekdays[dayIndex].date, time: timePairs[timeIndex],
                subject, type, teacher, room, groups, subgroup});
            });
        }
        }
        
        
        if (Object.keys(groupIndex).length > 0) {
            const indexPath = path.join(__dirname, '..', 'data', 'groupIndex.json');
            let index = {};
            if (fs.existsSync(indexPath)) {
                index = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
            }
            Object.assign(index, groupIndex);
            console.log("1")
            console.log(indexPath)
            fs.writeFileSync(indexPath, JSON.stringify(index, null, 2), 'utf-8');
            console.log('Обновлен groupIndex.json');
        }

        if (Object.keys(staffIndex).length > 0) {
            const staffPath = path.join(__dirname, '..', 'data', 'staffIndex.json');
            let staffMap = {};
            if (fs.existsSync(staffPath)) {
                staffMap = JSON.parse(fs.readFileSync(staffPath, 'utf-8'));
            }
            Object.assign(staffMap, staffIndex);
            console.log("2")
            console.log(staffPath)
            fs.writeFileSync(staffPath, JSON.stringify(staffMap, null, 2), 'utf-8');
            console.log('Обновлен staffIndex.json');
        }

        const entity = {
            id,
            name: entityName,
            title: entityTitle,
            formOfEducation
        };
        
        const resultWeek = {weekNumber, weekPrev, weekNext};
        console.log(weekdays)
        const result = { [type === 'groupId' ? 'group' : 'staff']: entity, week: resultWeek, weekdays, schedule };

        // const outputPath = path.join(__dirname, '..', 'data', `${groupName}.json`);
        const filename = `${entityName.replace(/[\\/:*?"<>|]/g, '_')}_week${weekNumber}.json`;
        const outputPath = path.join(__dirname, '..', 'data', filename);
        console.log("3")
        console.log(outputPath)
        fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf-8');

        console.log(`Сохранено: ${outputPath}`);
        
        return result;
    } catch (error) {
        console.error(`Ошибка при парсинге группы ${groupId}:`, error.message);
        return null;
    }
}

module.exports = parseSchedule;

if (require.main === module) {
    const type = process.argv[2]; // groupId или staffId
    const id = process.argv[3];
    const week = process.argv[4] || null;

    if (!['groupId', 'staffId'].includes(type) || !id) {
        console.error('Использование: node parseSchedule.js groupId 123456789 [selectedWeek]');
        process.exit(1);
    }

    parseSchedule(type, id, week);
}
