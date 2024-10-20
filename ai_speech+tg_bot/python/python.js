const { spawn } = require('child_process');
const path = require('path');
const EventEmitter = require('events');
const fs = require('fs');

// Функция для генерации речи
const getSpeech = async (text, speaker) => {
   return new Promise((resolve, reject) => {
      const pythonPath = path.join(__dirname, 'Speech', '.venv', 'Scripts', 'python.exe');
      const scriptPath = path.join(__dirname, 'Speech', 'speech.py');

      const pythonProcess = spawn(pythonPath, [scriptPath, speaker, text + " ."], { stdio: 'pipe' });

      let audioData = [];

      pythonProcess.stdout.on('data', data => audioData.push(data));
      pythonProcess.stdout.on('end', () => resolve(Buffer.concat(audioData)));
      pythonProcess.stderr.on('data', data => reject(new Error(`Ошибка: ${data}`)));
   });
}

// Очередь
class Queue {
   constructor() {
      this.items = [];
   }
   enqueue(item) {
      this.items.push(item);
   }
   dequeue() {
      return this.items.shift();
   }
   isEmpty() {
      return this.items.length === 0;
   }
   length() {
      return this.items.length;
   }
   peek() {
      return this.isEmpty() ? null : this.items[0];
   }
}

class SpeechManager extends EventEmitter {
   constructor(textDatabase) {
      super();
      this.queue = new Queue();
      this.textDatabase = textDatabase;
      this.config = {};
      this.loadConfig();
      for (let i = 0; i < 2; i++)
         this.processQueue();
   }

   loadConfig() {
      try {
         const configData = fs.readFileSync(path.join(__dirname, 'config.cfg'), 'utf-8');
         this.config = JSON.parse(configData);
         console.log("Конфигурация загружена:", this.config);
      } catch (error) {
         console.error("Ошибка загрузки конфигурации:", error);
      }
   }

   async processQueue() {
      if (this.queue.length() < 2 && this.textDatabase.length > 0) {
         const textToAdd = this.textDatabase.shift();
         console.log(`Обработка текста: ${textToAdd}`);
         try {
            const audio = await getSpeech(textToAdd, this.config.audioSpeaker);
            this.queue.enqueue(audio);
            console.log("Аудио добавлено в очередь.");
            this.emit('audioReady', audio); // Уведомляем о новом аудио
         } catch (error) {
            console.error("Ошибка генерации аудио:", error);
         }
      }
   }

   removeCurrentAudio() {
      if (!this.queue.isEmpty()) {
         const removedAudio = this.queue.dequeue();
         console.log("Текущая озвучка удалена из очереди.");
         this.emit('audioRemoved', removedAudio); // Уведомляем об удалении
         this.processQueue(); // Немедленно пытаемся обработать следующий текст
      }
   }

   getCurrentAudio() {
      return this.queue.peek();
   }

   addTextToDatabase(newText) {
      this.textDatabase.push(newText);
      console.log(`Текст добавлен в базу данных: ${newText}`);
      this.processQueue(); // Немедленно пытаемся обработать новый текст
   }
}

class MultiSpeechManager {
   constructor(textDatabases) {
      this.managers = {};
      this.initManagers(textDatabases);
   }

   initManagers(textDatabases) {
      textDatabases.forEach((textDatabase, key) => {
         const manager = new SpeechManager(textDatabase);
         this.managers[key] = manager;
         this.setupEventListeners(manager, key);
      });
   }

   getAudioReady(key) {
      if (this.managers[key]) {
         return {
            on: this.managers[key].on.bind(this.managers[key], 'audioReady'),
            off: this.managers[key].off.bind(this.managers[key], 'audioReady'),
         };
      } else {
         console.error(`Менеджер с ключом ${key} не найден.`);
         return null;
      }
   }

   getAudioRemoved(key) {
      if (this.managers[key]) {
         return {
            on: this.managers[key].on.bind(this.managers[key], 'audioRemoved'),
            off: this.managers[key].off.bind(this.managers[key], 'audioRemoved'),
         };
      } else {
         console.error(`Менеджер с ключом ${key} не найден.`);
         return null;
      }
   }

   addTextToManager(key, newText) {
      if (this.managers[key]) {
         this.managers[key].addTextToDatabase(newText);
      } else {
         console.error(`Менеджер с ключом ${key} не найден.`);
      }
   }

   getCurrent(key) {
      if (this.managers[key]) {
         return this.managers[key].getCurrentAudio();
      } else {
         console.error(`Менеджер с ключом ${key} не найден.`);
         return null;
      }
   }

   removeCurrent(key) {
      if (this.managers[key]) {
         this.managers[key].removeCurrentAudio();
      } else {
         console.error(`Менеджер с ключом ${key} не найден.`);
      }
   }
}

module.exports = { SpeechManager, MultiSpeechManager };
