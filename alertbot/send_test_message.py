import telebot
import sys # Для отримання аргументів командного рядка

# Ваші дані (ті ж, що і в основному скрипті)
TELEGRAM_TOKEN = "7854359194:AAHivxbi_D42V2NIEp8hlz5W1bmF0M_vbuw"
CHANNEL_ID = -1002661759364 # ID вашого каналу

bot = telebot.TeleBot(TELEGRAM_TOKEN)

def send_test_message(message_text):
    """Відправляє тестове повідомлення у Telegram-канал."""
    try:
        bot.send_message(CHANNEL_ID, message_text)
        print(f"Успішно відправлено тестове повідомлення: '{message_text}'")
    except Exception as e:
        print(f"Помилка відправки тестового повідомлення: {e}")
        print("Переконайтеся, що:")
        print("1. Токен бота правильний.")
        print("2. ID каналу правильний (для приватних каналів починається з -100).")
        print("3. Бот доданий як адміністратор каналу з правами на надсилання повідомлень.")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        # Якщо передано аргумент командного рядка, використовуємо його як повідомлення
        test_message = " ".join(sys.argv[1:])
    else:
        # Інакше, використовуємо повідомлення за замовчуванням
        test_message = "Це тестове повідомлення з Raspberry Pi!"

    send_test_message(test_message)