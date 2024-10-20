import os
import torch
import numpy as np
import simpleaudio as sa
from transliterate import translit
from num2words import num2words
import re
import io
import scipy.io.wavfile as wav

class NeuralSpeaker:
    def __init__(self):
        # Проверяем доступность CUDA
        if torch.cuda.is_available():
            device = torch.device('cuda')  # Используем GPU
            print('CUDA доступна')
        else:
            device = torch.device('cpu')    # Используем CPU
            num_cores = os.cpu_count()       # Получаем количество доступных ядер
            try:
                if num_cores <= 0:
                    raise ValueError("Количество ядер должно быть больше 0.")
                torch.set_num_threads(num_cores)  # Устанавливаем количество потоков
                print(f'Используем CPU с {num_cores} ядрами')
            except Exception as e:
                print(f'Ошибка при установке количества потоков: {e}. Устанавливаем 1 ядро.')
                torch.set_num_threads(1)

        local_file = 'model.pt'
        if not os.path.isfile(local_file):
            torch.hub.download_url_to_file('https://models.silero.ai/models/tts/ru/v3_1_ru.pt', local_file)
        self.__model = torch.package.PackageImporter(local_file).load_pickle("tts_models", "model")
        self.__model.to(device)

        # Словарь для замены одиночных букв
        self.replacement_dict = {
            'Б': 'бэ',
            'Н': 'эн',
            'Д': 'дэ',
            'К': 'ка',
        }

    @staticmethod
    def __num2words_ru(match):
        clean_number = match.group().replace(',', '.')
        return num2words(clean_number, lang='ru')

    def replace_single_letters(self, text):
        # Заменяем одиночные буквы в скобках согласно словарю
        return re.sub(r'\((\w)\)', lambda m: f"({self.replacement_dict.get(m.group(1), m.group(1))})", text)

    def speak(self, words, speaker='ksenia', save_file=False, sample_rate=48000):
        words = translit(words, 'ru')
        words = re.sub(r'-?[0-9][0-9,._]*', self.__num2words_ru, words)

        # Заменяем одиночные буквы в скобках
        words = self.replace_single_letters(words)

        if len(words) > 3:
            possible_speaker = words[0:2]
        else:
            return None  # Возвращаем None, если текст слишком короткий
        
        match possible_speaker:
            case '!1':
                speaker = 'aidar'
            case '!2':
                speaker = 'baya'
            case '!3':
                speaker = 'ksenia'
            case '!4':
                speaker = 'xenia'
            case '!5':
                speaker = 'eugene'
            case '!0':
                speaker = 'random'

        example_text = f'{words}'
        if sample_rate not in [48000, 24000, 8000]:
            sample_rate = 48000
        if speaker not in ['aidar', 'baya', 'kseniya', 'xenia', 'eugene', 'random']:
            speaker = 'xenia'

        try:
            audio = self.__model.apply_tts(text=example_text, speaker=speaker, sample_rate=sample_rate)
        except ValueError:
            print('Bad input')
            return None  # Возвращаем None в случае ошибки

        # Преобразование в формат WAV
        audio = audio.numpy()
        audio *= 32767 / np.max(np.abs(audio))
        audio = audio.astype(np.int16)

        # Записываем в буфер
        buf = io.BytesIO()
        wav.write(buf, sample_rate, audio)
        buf.seek(0)

        return buf.getvalue()  # Возвращаем аудио данные в виде байтов
