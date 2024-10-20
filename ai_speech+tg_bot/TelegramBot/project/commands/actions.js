const { bot } = require('../bot');
const { MessageMenu } = require('../utils/menu');

const createServiceMenu = (chatId, messageId) => {
    const serviceMenu = new MessageMenu(3, 2); // 3 строки, 2 столбца

    const services = [
        'Отправить письмо',
        'Получить письмо',
        'Отправить посылку',
        'Получить посылку',
        'Отправить бандероль',
        'Получить бандероль',
        'Получить товар из интернет-магазина',
        'Оплатить коммунальные услуги',
        'Купить товар',
    ];

    // Создаем клавиатуру
    const buttons = [];

    // Первые три строки по две кнопки
    for (let i = 0; i < 3; i++) {
        const row = [];
        row.push({ text: services[i * 2], callback_data: `service_${i * 2}` });
        if (i * 2 + 1 < services.length) {
            row.push({ text: services[i * 2 + 1], callback_data: `service_${i * 2 + 1}` });
        }
        buttons.push(row);
    }

    // Остальные три строки по одной кнопке
    for (let i = 6; i < 9; i++) {
        buttons.push([{ text: services[i], callback_data: `service_${i}` }]);
    }

    // Добавляем обработчики для кнопок
    buttons.forEach(row => {
        row.forEach(button => {
            serviceMenu.addButton(button.text, button.callback_data, (ctx) => {
                ctx.answerCbQuery();
                selectDay(ctx);
            });
        });
    });

    serviceMenu.currentChatId = chatId;
    serviceMenu.currentMessageId = messageId;
    return serviceMenu;
};

// Меню выбора дня
const selectDay = (ctx) => {
    const daysOfWeek = ['Сегодня', 'Завтра', 'Послезавтра'];
    const newButtons = daysOfWeek.map((day, index) => ({
        label: day,
        callbackData: `day_${index}`,
        action: (ctx) => {
            ctx.answerCbQuery();
            selectTime(ctx, day);
        }
    }));

    createServiceMenu(ctx.chat.id, ctx.callbackQuery.message.message_id).updateMenu('Выберите день:', newButtons);
};

const generateTicket = () => {
    const letters = 'АБВГДЕЁЖЗИКЛМНОПРСТУФХЦЧШЩ';
    const randomLetter = () => letters[Math.floor(Math.random() * letters.length)];
    const randomDigits = () => String(Math.floor(Math.random() * 1000)).padStart(3, '0');

    return `${randomLetter()}${randomLetter()}${randomDigits()}`; // Формат XX000
};

// Меню выбора времени
const selectTime = (ctx, selectedDay) => {
    const timeSlots = Array.from({ length: 20 }, (_, hour) =>
        Array.from({ length: 2 }, (_, half) =>
            `${String(hour + 8).padStart(2, '0')}:${String(half * 30).padStart(2, '0')}`
        )
    ).flat();

    const newButtons = timeSlots.map((time) => ({
        label: time,
        callbackData: `time_${selectedDay}_${time}`,
        action: (ctx) => {
            const ticket = generateTicket(); // Генерация талона
            ctx.reply(`Вы выбрали талон на ${selectedDay} в ${time}. Ваш талон: ${ticket}`);
            ctx.editMessageReplyMarkup({ reply_markup: { inline_keyboard: [] } });
        }
    }));

    createServiceMenu(ctx.chat.id, ctx.callbackQuery.message.message_id).updateMenu(`Выберите время для ${selectedDay}:`, newButtons);
};

// Функция для отправки меню услуг
const send = (ctx) => {
    createServiceMenu(ctx.chat.id, null).sendMessage(ctx, 'Перечень услуг. Выберите действие:');
};


module.exports = { sendActionsMessage: send };