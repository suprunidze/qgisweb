        const apiEndpoint = 'http://e9yh7t2uanm.tplinkdns.com:8080/api/page-views';
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

        document.addEventListener('DOMContentLoaded', () => {
            sendPageView(0);
        });

        setInterval(() => {
            const timeSpent = (new Date() - pageLoadTime) / 1000;
            sendPageView(timeSpent);
        }, 15000);
