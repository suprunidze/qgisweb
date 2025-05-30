import requests
import telebot
import time
import json

# Ваші дані
TELEGRAM_TOKEN = "7854359194:AAHivxbi_D42V2NIEp8hlz5W1bmF0M_vbuw"
CHANNEL_ID = -1002661759364
API_URL = "https://ubilling.net.ua/aerialalerts/"
REGION = "Черкаська область"

bot = telebot.TeleBot(TELEGRAM_TOKEN)

# Зберігаємо попередній стан, щоб надсилати сповіщення лише при зміні
last_alert_status = None

def get_alert_status():
    """Отримує поточний статус повітряної тривоги для Черкаської області."""
    try:
        response = requests.get(API_URL)
        response.raise_for_status()  # Перевірка на помилки HTTP
        data = response.json()
        
        # Перевіряємо, чи є ключ 'states' та потрібна область
        if "states" in data and REGION in data["states"]:
            return data["states"][REGION]["alertnow"]
        else:
            print(f"Помилка: Не знайдено дані для {REGION} в API відповіді.")
            return None
    except requests.exceptions.RequestException as e:
        print(f"Помилка під час запиту до API: {e}")
        return None
    except json.JSONDecodeError as e:
        print(f"Помилка декодування JSON: {e}")
        return None

def send_telegram_message(message):
    """Відправляє повідомлення у Telegram-канал."""
    try:
        bot.send_message(CHANNEL_ID, message)
        print(f"Повідомлення відправлено: {message}")
    except Exception as e:
        print(f"Помилка відправки повідомлення в Telegram: {e}")

def main():
    global last_alert_status
    print("Скрипт моніторингу повітряної тривоги запущено...")

    while True:
        current_alert_status = get_alert_status()

        if current_alert_status is not None:
            if last_alert_status is None:
                # Перший запуск, встановлюємо початковий статус без сповіщення
                last_alert_status = current_alert_status
                print(f"Початковий статус для {REGION}: {'Тривога!' if current_alert_status else 'Відбій'}")
            elif current_alert_status != last_alert_status:
                # Статус змінився, надсилаємо сповіщення
                if current_alert_status:
                    message = f"🚨 **ПОВІТРЯНА ТРИВОГА** у Черкаській області! 🚨"
                else:
                    message = f"🟢 **ВІДБІЙ ПОВІТРЯНОЇ ТРИВОГИ** у Черкаській області! 🟢"
                send_telegram_message(message)
                last_alert_status = current_alert_status
        else:
            print("Не вдалося отримати актуальний статус тривоги. Спроба через деякий час...")

        # Затримка перед наступною перевіркою (наприклад, кожні 30 секунд)
        time.sleep(30)

if __name__ == "__main__":
    main()