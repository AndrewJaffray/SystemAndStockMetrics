function fetchMetrics() {
    fetch('/api/metrics')
        .then(response => response.json())
        .then(data => {
            const metricsDiv = document.getElementById('metrics');
            metricsDiv.innerHTML = '';

            if (data && data.cpu_temp !== undefined) {
                const metricElement = document.createElement('li');
                metricElement.classList.add('list-group-item', 'd-flex', 'justify-content-between', 'align-items-center');
                metricElement.innerHTML = `
                    CPU Temp: <span class="badge badge-primary badge-pill">${data.cpu_temp}°C</span>
                    <small class="text-muted">Last updated: ${new Date(data.last_updated).toLocaleString()}</small>
                `;
                metricsDiv.appendChild(metricElement);
            } else {
                const errorElement = document.createElement('li');
                errorElement.classList.add('list-group-item', 'text-danger');
                errorElement.textContent = 'No data available.';
                metricsDiv.appendChild(errorElement);
            }
        })
        .catch(error => console.error('Error fetching metrics:', error));
}

// Fetch metrics every 5 seconds
setInterval(fetchMetrics, 5000);

// Fetch metrics on page load
window.onload = fetchMetrics;