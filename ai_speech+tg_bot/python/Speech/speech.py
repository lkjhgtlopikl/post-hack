import sys
from synthesisModule.NeuralSpeaker import NeuralSpeaker

if __name__ == '__main__':
    input_text = ' '.join(sys.argv[2:])  # Получаем текст из аргументов командной строки
    audio_data = NeuralSpeaker().speak(input_text, speaker=sys.argv[1])  # Получаем байты аудио
    
    if audio_data:
        sys.stdout.buffer.write(audio_data)  # Пишем байты в stdout
    else:
        print("Ошибка при создании аудио")
