const { bot } = require('../bot');
const { Markup } = require('telegraf');
const { authMiddleware } = require('../middleware/auth');

class MenuButton {
   constructor(name, position, method, requiresAuth = false, triggers = [], command = null) {
      this.name = name;           // Отображаемое название
      this.position = position;   // Позиция на клавиатуре
      this.method = method;       // Метод, который будет вызываться
      this.requiresAuth = requiresAuth; // Требует ли авторизации
      this.triggers = triggers;   // Список триггеров (команды и текстовые варианты)
      this.command = command;     // Команда, которая будет вызвана
   }

   registerTriggers(bot) {
      this.triggers.forEach(trigger => {
         if (this.requiresAuth) {
            bot.hears(trigger, authMiddleware, ctx => this.method(ctx));
         } else {
            bot.hears(trigger, ctx => this.method(ctx));
         }
      });
   }

   registerCommand(bot) {
      if (this.command) {
         bot.command(this.command, ctx => {
            if (this.requiresAuth)
               return authMiddleware(ctx, () => this.method(ctx));
            return this.method(ctx);
         });
      }
   }
}

class Menu {
   constructor() {
      this.buttons = [];
   }

   addButton(name, position, method, requiresAuth = false, triggers = [], command = null) {
      triggers.push(name);
      const button = new MenuButton(name, position, method, requiresAuth, triggers, command);
      this.buttons.push(button);
   }
   addButton(name, position, method, requiresAuth = false, command = null) {
      const triggers = [name];
      const button = new MenuButton(name, position, method, requiresAuth, triggers, command);
      this.buttons.push(button);
   }

   // построение клавиатуры
   buildKeyboard() {
      const keyboard = [];
      this.buttons.forEach(button => {
         const { position, name } = button;
         while (keyboard.length <= position[0])
            keyboard.push([]);
         keyboard[position[0]][position[1]] = button.name;
      });
      return keyboard;
   }

   async drawMenu(ctx) {
      const keyboard = this.buildKeyboard();
      await ctx.reply('Вот, что я могу сделать:', {
         reply_markup: {
            keyboard: keyboard,
            resize_keyboard: true,
            one_time_keyboard: false,
         },
      });
   }

   registerTriggers(bot) {
      this.buttons.forEach(button => {
         if (button.method instanceof Function) {
            button.registerCommand(bot);
            button.registerTriggers(bot);
         }
      });
   }
}

class MessageKeyboard {
   constructor() {
      this.buttons = [];
   }

   addButton(label, callbackData) {
      console.log(`Добавление кнопки: ${label} с callbackData: ${callbackData}`);
      this.buttons.push(Markup.button.callback(label, callbackData));
   }

   createGrid() {
      console.log('Создание клавиатуры');
      return Markup.inlineKeyboard(this.buttons);
   }
}

class MessageMenu {
   constructor(rows, columns) {
      this.keyboard = new MessageKeyboard();
      this.currentMessageId = null;
      this.currentChatId = null;
      this.rows = rows; // Количество строк
      this.columns = columns; // Количество столбцов
   }

   addButton(label, callbackData, action) {
      this.keyboard.addButton(label, callbackData);
      bot.action(callbackData, (ctx) => {
         console.log(`Кнопка нажата: ${callbackData}`);
         action(ctx);
         this.currentChatId = ctx.chat.id;
         this.currentMessageId = ctx.callbackQuery.message.message_id;
         console.log('Обновлены значения: currentChatId:', this.currentChatId, 'currentMessageId:', this.currentMessageId);
      });
   }

   async editMessage(text) {
      if (!this.currentChatId || !this.currentMessageId) {
         console.error('Chat ID или Message ID отсутствуют:', this.currentChatId, this.currentMessageId);
         return;
      }

      if (typeof text !== 'string' || text.trim() === '') {
         console.error('Неверный текст для редактирования:', text);
         return;
      }

      const keyboard = this.keyboard.createGrid();
      console.log('Редактирование сообщения с текстом:', text);
      await bot.telegram.editMessageText(
         this.currentChatId,
         this.currentMessageId,
         undefined,
         text,
         { reply_markup: keyboard.reply_markup }
      ).catch(err => {
         console.error('Ошибка при редактировании сообщения:', err);
      });
   }

   updateMenu(text, newButtons) {
      console.log('Обновление меню с текстом:', text);
      this.keyboard = new MessageKeyboard();
      newButtons.forEach(({ label, callbackData, action }) => {
         this.addButton(label, callbackData, action);
      });
      this.editMessage(text);
   }

   clearKeyboard(ctx) {
      ctx.editMessageReplyMarkup({ inline_keyboard: [] }).catch(err => {
         console.error('Ошибка при очистке клавиатуры:', err);
      });
   }

   sendMessage(ctx, text) {
      const keyboard = this.keyboard.createGrid();
      console.log(`Отправка сообщения: ${text}`);
      ctx.reply(text, { reply_markup: keyboard.reply_markup })
         .then((message) => {
            this.currentMessageId = message.message_id;
            this.currentChatId = ctx.chat.id;
            console.log('Сообщение отправлено. Current chat ID:', this.currentChatId, 'Current message ID:', this.currentMessageId);
         })
         .catch((error) => {
            console.error('Ошибка при отправке сообщения:', error);
         });
   }

   // Новый метод для выбора строк и столбцов
   createGridSelection(rows, columns, callback) {
      const buttons = Array.from({ length: rows }, (_, rowIndex) => 
         Array.from({ length: columns }, (_, colIndex) => ({
            label: `Row ${rowIndex + 1} Col ${colIndex + 1}`,
            callbackData: `row_${rowIndex}_col_${colIndex}`,
            action: callback
         }))
      );

      buttons.forEach(row => {
         this.keyboard.addRow(row.map(button => ({
            text: button.label,
            callback_data: button.callbackData,
         })));
      });

      buttons.forEach(row => {
         row.forEach(button => {
            this.addButton(button.label, button.callbackData, (ctx) => {
               button.action(ctx); // Вызов действия
            });
         });
      });
   }
}

module.exports = { MenuButton, Menu, MessageMenu }