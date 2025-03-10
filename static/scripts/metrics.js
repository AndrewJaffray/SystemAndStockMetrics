// Variables to store chart instances
let cpuGauge = null;
let memoryGauge = null;
let stockCharts = {}; // Object to store individual stock charts by symbol

// Called when page is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('Page loaded, fetching initial metrics');
    // Initialize empty gauges
    initGauges();
    fetchAllMetrics();
});

// Initialize the gauge charts with default values
function initGauges() {
    // Initialize CPU gauge
    const cpuCtx = document.getElementById('cpuGauge').getContext('2d');
    cpuGauge = createGaugeChart(cpuCtx, 0, '#6f9654');
    
    // Initialize Memory gauge
    const memoryCtx = document.getElementById('memoryGauge').getContext('2d');
    memoryGauge = createGaugeChart(memoryCtx, 0, '#1c91c0');
    
    // Add value displays
    const cpuContainer = document.getElementById('cpuGauge').parentNode;
    let cpuValue = cpuContainer.querySelector('.gauge-value');
    if (!cpuValue) {
        cpuValue = document.createElement('div');
        cpuValue.className = 'gauge-value';
        cpuValue.id = 'cpu-value';
        cpuValue.textContent = '0%';
        cpuContainer.appendChild(cpuValue);
    }
    
    const memoryContainer = document.getElementById('memoryGauge').parentNode;
    let memoryValue = memoryContainer.querySelector('.gauge-value');
    if (!memoryValue) {
        memoryValue = document.createElement('div');
        memoryValue.className = 'gauge-value';
        memoryValue.id = 'memory-value';
        memoryValue.textContent = '0%';
        memoryContainer.appendChild(memoryValue);
    }
    
    console.log('Gauge charts initialized');
}

// Helper function to create a gauge chart
function createGaugeChart(ctx, value, color) {
    // Create gradient
    const gradientSegment = ctx.createLinearGradient(0, 0, 0, 200);
    gradientSegment.addColorStop(0, color);
    gradientSegment.addColorStop(1, `${color}80`); // 50% opacity
    
    return new Chart(ctx, {
        type: 'doughnut',
        data: {
            datasets: [{
                data: [value, 100 - value],
                backgroundColor: [gradientSegment, '#f0f0f0'],
                borderWidth: 0
            }]
        },
        options: {
            circumference: 180,
            rotation: -90,
            cutout: '75%',
            plugins: {
                tooltip: {
                    enabled: false
                },
                legend: {
                    display: false
                }
            },
            animation: {
                animateRotate: true,
                animateScale: false,
                duration: 1000
            },
            responsive: true,
            maintainAspectRatio: false
        }
    });
}

// Update gauge chart with new value
function updateGauge(gauge, valueElement, value) {
    if (gauge) {
        gauge.data.datasets[0].data = [value, 100 - value];
        gauge.update();
        
        // Update the value display
        if (valueElement) {
            valueElement.textContent = `${value.toFixed(1)}%`;
            
            // Change color based on value
            if (value < 50) {
                valueElement.style.color = '#28a745'; // Green for low usage
            } else if (value < 80) {
                valueElement.style.color = '#ffc107'; // Yellow for medium usage
            } else {
                valueElement.style.color = '#dc3545'; // Red for high usage
            }
        }
    }
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
                // Update gauge charts
                updateGauge(cpuGauge, document.getElementById('cpu-value'), data.cpu_usage);
                updateGauge(memoryGauge, document.getElementById('memory-value'), data.memory_usage);
                
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
                const lastUpdated = new Date(stocks[0].last_updated).toLocaleString();
                document.getElementById('stock-last-updated').textContent = `Last stock update: ${lastUpdated}`;
                
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

// Function to fetch historical system metrics - no longer needed for gauge display
function fetchHistoricalSystemMetrics() {
    // We don't need historical data for gauges, but we'll keep the function
    // to maintain compatibility with fetchAllMetrics
    console.log('Historical system metrics not needed for gauges');
}

// Function to fetch historical stock metrics and update individual charts
function fetchHistoricalStockMetrics() {
    fetch('/api/historical/stock_metrics')
        .then(response => response.json())
        .then(data => {
            if (data && data.length > 0) {
                // Get unique stock symbols
                const stockSymbols = [...new Set(data.map(item => item.symbol))];
                
                // Create or update individual charts for each stock
                stockSymbols.forEach(symbol => {
                    // Filter data for this specific stock
                    const stockData = data.filter(item => item.symbol === symbol);
                    
                    // Create or update chart for this stock
                    createOrUpdateStockChart(symbol, stockData);
                });
                
                // Remove charts for stocks that no longer exist in the data
                Object.keys(stockCharts).forEach(symbol => {
                    if (!stockSymbols.includes(symbol)) {
                        // Destroy chart
                        if (stockCharts[symbol]) {
                            stockCharts[symbol].destroy();
                            delete stockCharts[symbol];
                        }
                        
                        // Remove chart container
                        const chartContainer = document.getElementById(`stock-chart-container-${symbol}`);
                        if (chartContainer) {
                            chartContainer.remove();
                        }
                    }
                });
                
                console.log('Historical stock metrics updated for individual charts');
            } else {
                console.log('No historical stock metrics data available');
            }
        })
        .catch(error => {
            console.error('Error fetching historical stock metrics:', error);
        });
}

// Function to create or update an individual stock chart
function createOrUpdateStockChart(symbol, data) {
    // Define colors for different stocks
    const colors = {
        'AAPL': '#4CAF50',  // Green for Apple
        'GOOGL': '#2196F3', // Blue for Google
        'MSFT': '#F44336',  // Red for Microsoft
        'AMZN': '#FF9800',  // Orange for Amazon
        'META': '#9C27B0',  // Purple for Meta
        'TSLA': '#00BCD4',  // Cyan for Tesla
        'default': '#607D8B' // Default gray
    };
    
    // Get color for this stock
    const color = colors[symbol] || colors.default;
    
    // Get the most recent timestamp for this stock
    const latestData = data.length > 0 ? data.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0] : null;
    const lastUpdated = latestData ? new Date(latestData.timestamp).toLocaleString() : 'No data available';
    
    // Check if container exists, if not create it
    let chartContainer = document.getElementById(`stock-chart-container-${symbol}`);
    
    if (!chartContainer) {
        // Create a new column for this stock chart - now full width
        const column = document.createElement('div');
        column.className = 'col-md-12 mb-4'; // Changed from col-md-6 to col-md-12 for full width
        column.id = `stock-chart-container-${symbol}`;
        
        // Create card for the chart
        column.innerHTML = `
            <div class="card">
                <div class="card-header" style="background-color: ${color}20; border-color: ${color}">
                    <div class="d-flex justify-content-between align-items-center">
                        <strong>${symbol}</strong> Stock Price
                        <small class="text-muted stock-last-updated" id="last-updated-${symbol}">Last update: ${lastUpdated}</small>
                    </div>
                </div>
                <div class="card-body">
                    <canvas id="stock-chart-${symbol}"></canvas>
                </div>
            </div>
        `;
        
        // Add to the container
        document.getElementById('stock-charts-container').appendChild(column);
        
        // Update reference to the container
        chartContainer = column;
    } else {
        // Update the last updated timestamp
        const lastUpdatedElement = document.getElementById(`last-updated-${symbol}`);
        if (lastUpdatedElement) {
            lastUpdatedElement.textContent = `Last update: ${lastUpdated}`;
        }
    }
    
    // Get canvas context
    const ctx = document.getElementById(`stock-chart-${symbol}`).getContext('2d');
    
    // Prepare data for Chart.js
    const timestamps = data.map(item => new Date(item.timestamp));
    const prices = data.map(item => item.price);
    
    // Destroy previous chart if it exists
    if (stockCharts[symbol]) {
        stockCharts[symbol].destroy();
    }
    
    // Create new chart with increased height for better visibility
    stockCharts[symbol] = new Chart(ctx, {
        type: 'line',
        data: {
            labels: timestamps,
            datasets: [
                {
                    label: `${symbol} Price ($)`,
                    data: prices,
                    borderColor: color,
                    backgroundColor: `${color}20`,
                    borderWidth: 2,
                    tension: 0.4,
                    pointRadius: 3,
                    pointHoverRadius: 5,
                    fill: false
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false // Hide legend since we have the symbol in the card header
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `$${context.raw.toFixed(2)}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'minute',
                        displayFormats: {
                            minute: 'HH:mm'
                        }
                    },
                    title: {
                        display: true,
                        text: 'Time'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Price ($)'
                    }
                }
            }
        }
    });
    
    console.log(`Chart for ${symbol} created/updated`);
}

// Fetch all metrics
function fetchAllMetrics() {
    fetchSystemMetrics();
    fetchStockMetrics();
    // We still call this for compatibility, but it doesn't do anything now
    fetchHistoricalSystemMetrics();
    fetchHistoricalStockMetrics();
}

// Fetch metrics every 10 seconds instead of 30
const intervalId = setInterval(fetchAllMetrics, 10000);
console.log('Metrics update interval set:', intervalId);