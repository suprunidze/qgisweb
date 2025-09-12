const apiEndpoint = 'https://suprunserhiy.pythonanywhere.com/api/page-views';
const pageLoadTime = new Date();
const sendPageView = (timeSpent) => {
    fetch(apiEndpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            page: window.location.href,
            time_spent: timeSpent
        })
    })
    .then(response => {
        if (!response.ok) {
            console.error('Failed to send page view data.');
        }
    })
    .catch(error => {
        console.error('Error sending page view data:', error);
    });
};
// Надсилання першого запиту без часу
document.addEventListener('DOMContentLoaded', () => {
    sendPageView(0);
});
// Надсилання оновлень кожні 30 секунд
setInterval(() => {
    const timeSpent = (new Date() - pageLoadTime) / 1000;
    sendPageView(timeSpent);
}, 15000); // 15 секунд у мілісекундах
