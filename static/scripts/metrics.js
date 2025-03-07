function fetchSystemMetrics() {
    fetch('/api/metrics')
        .then(response => response.json())
        .then(data => {
            const metricsDiv = document.getElementById('system-metrics');
            metricsDiv.innerHTML = '';

            // Update the last update timestamp
            const lastUpdateElement = document.getElementById('last-update');
            const now = new Date();
            lastUpdateElement.textContent = `Last update: ${now.toLocaleTimeString()}`;
            
            // Flash the update indicator
            const updateIndicator = document.getElementById('update-indicator');
            updateIndicator.classList.add('active');
            setTimeout(() => {
                updateIndicator.classList.remove('active');
            }, 1000);

            if (data && data.cpu_temp !== undefined) {
                // CPU Temperature
                const cpuTempElement = document.createElement('li');
                cpuTempElement.classList.add('list-group-item', 'd-flex', 'justify-content-between', 'align-items-center');
                cpuTempElement.style.transition = 'background-color 1s';
                cpuTempElement.style.backgroundColor = '#e6f7ff';
                cpuTempElement.innerHTML = `
                    CPU Temperature: <span class="badge badge-primary badge-pill">${data.cpu_temp}°C</span>
                `;
                metricsDiv.appendChild(cpuTempElement);
                
                // CPU Usage
                if (data.cpu_usage !== undefined && data.cpu_usage !== null) {
                    const cpuUsageElement = document.createElement('li');
                    cpuUsageElement.classList.add('list-group-item', 'd-flex', 'justify-content-between', 'align-items-center');
                    cpuUsageElement.style.transition = 'background-color 1s';
                    cpuUsageElement.style.backgroundColor = '#e6f7ff';
                    cpuUsageElement.innerHTML = `
                        CPU Usage: <span class="badge badge-info badge-pill">${data.cpu_usage.toFixed(1)}%</span>
                    `;
                    metricsDiv.appendChild(cpuUsageElement);
                }
                
                // Memory Usage
                if (data.memory_usage !== undefined && data.memory_usage !== null) {
                    const memoryUsageElement = document.createElement('li');
                    memoryUsageElement.classList.add('list-group-item', 'd-flex', 'justify-content-between', 'align-items-center');
                    memoryUsageElement.style.transition = 'background-color 1s';
                    memoryUsageElement.style.backgroundColor = '#e6f7ff';
                    memoryUsageElement.innerHTML = `
                        Memory Usage: <span class="badge badge-warning badge-pill">${data.memory_usage.toFixed(1)}%</span>
                    `;
                    metricsDiv.appendChild(memoryUsageElement);
                }
                
                // Last Updated Timestamp
                const timestampElement = document.createElement('li');
                timestampElement.classList.add('list-group-item', 'text-muted', 'small');
                timestampElement.innerHTML = `Last data update: ${new Date(data.last_updated).toLocaleString()}`;
                metricsDiv.appendChild(timestampElement);
                
                // Reset background color after a short delay for visual feedback
                setTimeout(() => {
                    const elements = metricsDiv.querySelectorAll('.list-group-item');
                    elements.forEach(el => {
                        if (el.style) el.style.backgroundColor = '';
                    });
                }, 1000);
                
                console.log('System metrics updated:', data);
            } else {
                const errorElement = document.createElement('li');
                errorElement.classList.add('list-group-item', 'text-danger');
                errorElement.textContent = 'No system data available.';
                metricsDiv.appendChild(errorElement);
                console.log('No system metrics data available');
            }
        })
        .catch(error => {
            console.error('Error fetching system metrics:', error);
            const metricsDiv = document.getElementById('system-metrics');
            metricsDiv.innerHTML = '<li class="list-group-item text-danger">Error fetching system metrics. Check console for details.</li>';
        });
}

function fetchStockMetrics() {
    fetch('/api/stock_metrics')
        .then(response => response.json())
        .then(stocks => {
            const stocksDiv = document.getElementById('stock-metrics');
            stocksDiv.innerHTML = '';

            if (stocks && stocks.length > 0) {
                stocks.forEach(stock => {
                    const stockElement = document.createElement('li');
                    stockElement.classList.add('list-group-item', 'd-flex', 'justify-content-between', 'align-items-center');
                    stockElement.style.transition = 'background-color 1s';
                    stockElement.style.backgroundColor = '#f0f7ff';
                    
                    // Determine if stock is up or down for styling
                    const changeClass = stock.change_percent >= 0 ? 'badge-success' : 'badge-danger';
                    const changeSign = stock.change_percent >= 0 ? '+' : '';
                    
                    stockElement.innerHTML = `
                        <div>
                            <strong>${stock.symbol}</strong>
                            <span class="ml-3">$${stock.price.toFixed(2)}</span>
                        </div>
                        <span class="badge ${changeClass} badge-pill">${changeSign}${stock.change_percent.toFixed(2)}%</span>
                    `;
                    stocksDiv.appendChild(stockElement);
                });
                
                // Last Updated Timestamp
                const timestampElement = document.createElement('li');
                timestampElement.classList.add('list-group-item', 'text-muted', 'small');
                timestampElement.innerHTML = `Last stock update: ${new Date(stocks[0].last_updated).toLocaleString()}`;
                stocksDiv.appendChild(timestampElement);
                
                // Reset background color after a short delay
                setTimeout(() => {
                    const elements = stocksDiv.querySelectorAll('.list-group-item');
                    elements.forEach(el => {
                        if (el.style) el.style.backgroundColor = '';
                    });
                }, 1000);
                
                console.log('Stock metrics updated:', stocks);
            } else {
                const errorElement = document.createElement('li');
                errorElement.classList.add('list-group-item', 'text-warning');
                errorElement.textContent = 'No stock data available yet. Please wait for the first update.';
                stocksDiv.appendChild(errorElement);
                console.log('No stock metrics data available');
            }
        })
        .catch(error => {
            console.error('Error fetching stock metrics:', error);
            const stocksDiv = document.getElementById('stock-metrics');
            stocksDiv.innerHTML = '<li class="list-group-item text-danger">Error fetching stock data. Check console for details.</li>';
        });
}

// Fetch all metrics
function fetchAllMetrics() {
    fetchSystemMetrics();
    fetchStockMetrics();
}

// Fetch metrics every 5 seconds
const intervalId = setInterval(fetchAllMetrics, 5000);
console.log('Metrics update interval set:', intervalId);

// Fetch metrics on page load
window.onload = function() {
    console.log('Page loaded, fetching initial metrics');
    fetchAllMetrics();
};