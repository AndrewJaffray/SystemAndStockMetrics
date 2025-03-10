// Load Google Charts
google.charts.load('current', {'packages':['corechart', 'line']});
google.charts.setOnLoadCallback(onGoogleChartsLoaded);

// Variables to store chart instances
let systemMetricsChart = null;
let stockMetricsChart = null;

// Called when Google Charts is loaded
function onGoogleChartsLoaded() {
    console.log('Google Charts loaded successfully');
    fetchAllMetrics();
}

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

            if (data && data.cpu_usage !== undefined) {
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

// Function to fetch historical system metrics and update chart
function fetchHistoricalSystemMetrics() {
    fetch('/api/historical/system_metrics')
        .then(response => response.json())
        .then(data => {
            if (data && data.length > 0) {
                updateSystemMetricsChart(data);
                console.log('Historical system metrics updated:', data);
            } else {
                console.log('No historical system metrics data available');
            }
        })
        .catch(error => {
            console.error('Error fetching historical system metrics:', error);
        });
}

// Function to fetch historical stock metrics and update chart
function fetchHistoricalStockMetrics() {
    fetch('/api/historical/stock_metrics')
        .then(response => response.json())
        .then(data => {
            if (data && data.length > 0) {
                updateStockMetricsChart(data);
                console.log('Historical stock metrics updated:', data);
            } else {
                console.log('No historical stock metrics data available');
            }
        })
        .catch(error => {
            console.error('Error fetching historical stock metrics:', error);
        });
}

// Function to update the system metrics chart using Google Charts
function updateSystemMetricsChart(data) {
    try {
        // Prepare data for Google Charts
        const chartData = new google.visualization.DataTable();
        chartData.addColumn('datetime', 'Time');
        chartData.addColumn('number', 'CPU Usage (%)');
        chartData.addColumn('number', 'Memory Usage (%)');
        
        // Add rows to the data table
        const rows = data.map(item => [
            new Date(item.timestamp),
            item.cpu_usage,
            item.memory_usage
        ]);
        
        chartData.addRows(rows);
        
        // Set chart options
        const options = {
            title: 'System Metrics Over Time',
            curveType: 'function',
            legend: { position: 'bottom' },
            hAxis: {
                title: 'Time',
                format: 'HH:mm',
                gridlines: { count: 5 }
            },
            vAxis: {
                title: 'Percentage (%)',
                minValue: 0,
                maxValue: 100
            },
            colors: ['#6f9654', '#1c91c0'],
            height: 300
        };
        
        // Instantiate and draw the chart
        const chart = new google.visualization.LineChart(document.getElementById('systemMetricsChart'));
        chart.draw(chartData, options);
        
        console.log('System metrics chart updated successfully');
    } catch (error) {
        console.error('Error updating system metrics chart:', error);
    }
}

// Function to update the stock metrics chart using Google Charts
function updateStockMetricsChart(data) {
    try {
        // Group data by stock symbol
        const stockSymbols = [...new Set(data.map(item => item.symbol))];
        
        // Prepare data for Google Charts
        const chartData = new google.visualization.DataTable();
        chartData.addColumn('datetime', 'Time');
        
        // Add a column for each stock symbol
        stockSymbols.forEach(symbol => {
            chartData.addColumn('number', `${symbol} Price ($)`);
        });
        
        // Get unique timestamps and sort them
        const timestamps = [...new Set(data.map(item => item.timestamp))].sort();
        
        // Create rows with data for each timestamp
        const rows = timestamps.map(timestamp => {
            const row = [new Date(timestamp)];
            
            // Add price for each stock symbol
            stockSymbols.forEach(symbol => {
                const stockData = data.find(item => item.symbol === symbol && item.timestamp === timestamp);
                row.push(stockData ? stockData.price : null);
            });
            
            return row;
        });
        
        chartData.addRows(rows);
        
        // Define a set of distinct colors for the lines
        const colors = ['#2196F3', '#4CAF50', '#F44336', '#FFC107', '#9C27B0', '#00BCD4'];
        
        // Set chart options
        const options = {
            title: 'Stock Prices Over Time',
            curveType: 'function',
            legend: { position: 'bottom' },
            hAxis: {
                title: 'Time',
                format: 'HH:mm:ss',
                gridlines: { count: 8 },
                minTextSpacing: 50
            },
            vAxis: {
                title: 'Price ($)'
            },
            height: 300,
            chartArea: {
                width: '85%',
                height: '70%'
            },
            interpolateNulls: true,
            lineWidth: 3,
            pointSize: 4,
            series: stockSymbols.reduce((acc, symbol, index) => {
                acc[index] = {
                    color: colors[index % colors.length],
                    lineDashStyle: [1, 0],  // Solid line
                    pointShape: 'circle'
                };
                return acc;
            }, {}),
            animation: {
                duration: 500,
                easing: 'out',
                startup: true
            }
        };
        
        // Instantiate and draw the chart
        const chart = new google.visualization.LineChart(document.getElementById('stockMetricsChart'));
        chart.draw(chartData, options);
        
        console.log('Stock metrics chart updated successfully');
    } catch (error) {
        console.error('Error updating stock metrics chart:', error);
    }
}

// Fetch all metrics
function fetchAllMetrics() {
    fetchSystemMetrics();
    fetchStockMetrics();
    fetchHistoricalSystemMetrics();
    fetchHistoricalStockMetrics();
}

// Fetch metrics every 10 seconds instead of 30
const intervalId = setInterval(fetchAllMetrics, 10000);
console.log('Metrics update interval set:', intervalId);

// Fetch metrics on page load
window.onload = function() {
    console.log('Page loaded, fetching initial metrics');
    fetchAllMetrics();
};