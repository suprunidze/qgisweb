// --- Налаштування ---
// Замініть на адресу вашого API на Render
const apiEndpoint = 'https://statcounter.onrender.com/api/page-views';

let startTime = Date.now();
let timeSpent = 0;

// Функція для відправки даних
const sendPageView = async () => {
    try {
        const data = {
            page: window.location.pathname,
            time_spent: timeSpent
        };

        const response = await fetch(apiEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            console.error('Помилка при відправці даних про відвідування:', response.statusText);
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        console.log('Дані про відвідування успішно відправлено.');

    } catch (error) {
        console.error('Помилка при відправці даних про відвідування:', error);
    }
};

// Відправка даних при закритті або перезавантаженні сторінки
window.addEventListener('beforeunload', () => {
    timeSpent = Math.floor((Date.now() - startTime) / 1000);
    // Відправляємо дані асинхронно, щоб не блокувати закриття сторінки
    navigator.sendBeacon(apiEndpoint, JSON.stringify({
        page: window.location.pathname,
        time_spent: timeSpent
    }));
});

// Відправка даних при першому завантаженні сторінки
document.addEventListener('DOMContentLoaded', () => {
    sendPageView();
});
