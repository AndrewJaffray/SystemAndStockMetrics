// Variables to store chart instances
let cpuGauge = null;
let memoryGauge = null;
let stockCharts = {}; // Object to store individual stock charts by symbol
let stockData = {}; // Object to store stock data by symbol

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
                const lastUpdated = new Date(stocks[0].timestamp).toLocaleString();
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
                // Store the data for each stock symbol
                const stockSymbols = [...new Set(data.map(item => item.symbol))];
                
                stockSymbols.forEach(symbol => {
                    // Filter data for this specific stock
                    const symbolData = data.filter(item => item.symbol === symbol);
                    
                    // Store the data for this symbol
                    stockData[symbol] = symbolData;
                    
                    // Create or update chart for this stock
                    createOrUpdateStockChart(symbol, symbolData);
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

// Function to calculate price change for a given time period
function calculatePriceChange(data, days) {
    if (!data || data.length === 0) {
        return { price: 0, change: 0, changePercent: 0 };
    }
    
    // Sort data by timestamp (newest first)
    const sortedData = [...data].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    // Get current price (most recent data point)
    const currentPrice = sortedData[0].price;
    
    // Calculate cutoff date for the selected time period
    const now = new Date(sortedData[0].timestamp);
    const cutoffDate = new Date(now);
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    // Find the closest data point to the cutoff date
    let previousPrice = currentPrice;
    for (let i = 0; i < sortedData.length; i++) {
        const dataDate = new Date(sortedData[i].timestamp);
        if (dataDate <= cutoffDate) {
            previousPrice = sortedData[i].price;
            break;
        }
    }
    
    // Calculate change and percent change
    const change = currentPrice - previousPrice;
    const changePercent = (change / previousPrice) * 100;
    
    return {
        price: currentPrice,
        change: change,
        changePercent: changePercent
    };
}

// Function to update chart for a selected time period
function updateChartForTimePeriod(symbol, data, days) {
    if (!data || data.length === 0) return;
    
    // Sort data by timestamp
    const sortedData = [...data].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    // Calculate cutoff date for the selected time period
    const now = new Date(sortedData[sortedData.length - 1].timestamp);
    const cutoffDate = new Date(now);
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    // Filter data for the selected time period
    let filteredData = sortedData;
    if (days < 9999) { // If not "ALL" time period
        filteredData = sortedData.filter(item => new Date(item.timestamp) >= cutoffDate);
    }
    
    // If we have very few data points, simulate more data points
    if (filteredData.length < 5) {
        filteredData = simulateMoreDataPoints(filteredData, days);
    }
    
    // Calculate price change for the selected time period
    const priceInfo = calculatePriceChange(data, days);
    
    // Update price and change display
    const priceDisplay = document.getElementById(`price-display-${symbol}`);
    const changeDisplay = document.getElementById(`change-display-${symbol}`);
    
    if (priceDisplay) {
        priceDisplay.textContent = `$${priceInfo.price.toFixed(2)}`;
    }
    
    if (changeDisplay) {
        const priceChangeClass = priceInfo.change >= 0 ? 'stock-change-positive' : 'stock-change-negative';
        const priceChangeSign = priceInfo.change >= 0 ? '+' : '';
        
        changeDisplay.textContent = `${priceChangeSign}${priceInfo.change.toFixed(2)} (${priceChangeSign}${priceInfo.changePercent.toFixed(2)}%)`;
        changeDisplay.className = `stock-change-display ${priceChangeClass}`;
    }
    
    // Get canvas element and container
    const canvas = document.getElementById(`stock-chart-${symbol}`);
    const cardBody = canvas.closest('.card-body');
    
    // Calculate min and max prices for y-axis scaling
    const prices = filteredData.map(item => item.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice;
    
    // Calculate appropriate chart height based on price range
    // More range = taller chart
    let chartHeight = 350; // Default height
    
    // Adjust height based on price range and time period
    if (days >= 365) { // 1Y or ALL
        chartHeight = 450; // Taller for long-term data
    } else if (days >= 30) { // 1M or 3M
        chartHeight = 400; // Medium height for medium-term data
    } else if (priceRange > (priceInfo.price * 0.1)) { // If range is more than 10% of current price
        chartHeight = 400; // Increase height for volatile stocks
    }
    
    // Add extra height for x-axis labels
    chartHeight += 50;
    
    // Update card body height
    if (cardBody) {
        cardBody.style.height = `${chartHeight}px`;
    }
    
    // Get canvas context
    const ctx = canvas.getContext('2d');
    
    // Prepare data for Chart.js
    const timestamps = filteredData.map(item => new Date(item.timestamp));
    const priceData = filteredData.map(item => item.price);
    
    // Get color for this stock
    const colors = {
        'AAPL': '#4CAF50',
        'GOOGL': '#2196F3',
        'MSFT': '#F44336',
        'AMZN': '#FF9800',
        'META': '#9C27B0',
        'TSLA': '#00BCD4',
        'default': '#607D8B'
    };
    const color = colors[symbol] || colors.default;
    
    // Destroy previous chart if it exists
    if (stockCharts[symbol]) {
        stockCharts[symbol].destroy();
    }
    
    // Determine time unit based on selected time period
    let timeUnit = 'minute';
    let displayFormat = 'HH:mm';
    let stepSize = undefined;
    let maxTicksLimit = 12;
    
    if (days >= 365) {
        timeUnit = 'month';
        displayFormat = 'MMM yyyy';
        stepSize = 1; // Show every month
        maxTicksLimit = 6; // Fewer ticks for long periods
    } else if (days >= 90) {
        timeUnit = 'month';
        displayFormat = 'MMM d';
        stepSize = 1; // Show every month
        maxTicksLimit = 6;
    } else if (days >= 30) {
        timeUnit = 'week';
        displayFormat = 'MMM d';
        stepSize = 1; // Show every week
        maxTicksLimit = 6;
    } else if (days >= 7) {
        timeUnit = 'day';
        displayFormat = 'MMM d';
        stepSize = 1; // Show every day
        maxTicksLimit = 7;
    } else {
        // For 1D, use hours if we have enough data points
        if (filteredData.length > 12) {
            timeUnit = 'hour';
            displayFormat = 'HH:mm';
            stepSize = 2; // Show every 2 hours
            maxTicksLimit = 8;
        }
    }
    
    // Calculate appropriate y-axis min and max with padding
    const padding = priceRange * 0.1; // 10% padding
    const yMin = Math.max(0, minPrice - padding); // Don't go below 0
    const yMax = maxPrice + padding;
    
    // Create new chart with dynamic height
    stockCharts[symbol] = new Chart(ctx, {
        type: 'line',
        data: {
            labels: timestamps,
            datasets: [
                {
                    label: `${symbol} Price ($)`,
                    data: priceData,
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
            layout: {
                padding: {
                    left: 15,
                    right: 30,
                    top: 20,
                    bottom: 30 // Increased bottom padding for x-axis labels
                }
            },
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
                        unit: timeUnit,
                        stepSize: stepSize,
                        displayFormats: {
                            minute: 'HH:mm',
                            hour: 'HH:mm',
                            day: 'MMM d',
                            week: 'MMM d',
                            month: displayFormat
                        },
                        tooltipFormat: 'MMM d, yyyy HH:mm'
                    },
                    title: {
                        display: true,
                        text: 'Time',
                        padding: {
                            top: 15
                        },
                        font: {
                            size: 14
                        }
                    },
                    ticks: {
                        maxRotation: 45,
                        minRotation: 30, // Increased minimum rotation for better spacing
                        autoSkip: true,
                        maxTicksLimit: maxTicksLimit,
                        padding: 15, // Increased padding
                        font: {
                            size: 11 // Smaller font for labels
                        },
                        major: {
                            enabled: true
                        },
                        align: 'center',
                        crossAlign: 'far'
                    },
                    grid: {
                        display: true,
                        drawBorder: true,
                        drawOnChartArea: true,
                        drawTicks: true,
                        tickLength: 10,
                        offset: true // Offset grid lines to align with labels
                    },
                    offset: true, // Offset axis to make room for labels
                    position: 'bottom',
                    bounds: 'ticks'
                },
                y: {
                    min: yMin,
                    max: yMax,
                    title: {
                        display: true,
                        text: 'Price ($)',
                        font: {
                            size: 14
                        }
                    },
                    ticks: {
                        // Ensure we have enough ticks for the range
                        count: Math.min(10, Math.max(5, Math.ceil(priceRange / 10))),
                        padding: 10,
                        font: {
                            size: 11
                        }
                    },
                    grid: {
                        drawBorder: true,
                        drawOnChartArea: true
                    }
                }
            },
            animation: {
                duration: 500,
                easing: 'easeOutQuad'
            }
        }
    });
}

// Function to simulate more data points for better visualization
function simulateMoreDataPoints(data, days) {
    if (data.length < 2) return data;
    
    const result = [...data];
    const firstPoint = data[0];
    const lastPoint = data[data.length - 1];
    
    const startTime = new Date(firstPoint.timestamp).getTime();
    const endTime = new Date(lastPoint.timestamp).getTime();
    const timeRange = endTime - startTime;
    
    // Determine how many points to add
    const pointsToAdd = Math.min(20, days * 2);
    
    for (let i = 1; i < pointsToAdd; i++) {
        const ratio = i / pointsToAdd;
        const time = startTime + (timeRange * ratio);
        
        // Interpolate price with some randomness
        const basePrice = firstPoint.price + ((lastPoint.price - firstPoint.price) * ratio);
        const randomFactor = 0.02; // 2% random variation
        const randomVariation = (Math.random() * 2 - 1) * basePrice * randomFactor;
        const price = basePrice + randomVariation;
        
        result.push({
            symbol: data[0].symbol,
            price: price,
            timestamp: new Date(time).toISOString(),
            change_percent: 0 // Not used for chart display
        });
    }
    
    // Sort by timestamp
    return result.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
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
    
    // Define time periods
    const timePeriods = [
        { id: '1D', label: '1D', days: 1 },
        { id: '1W', label: '1W', days: 7 },
        { id: '1M', label: '1M', days: 30 },
        { id: '3M', label: '3M', days: 90 },
        { id: '1Y', label: '1Y', days: 365 },
        { id: 'ALL', label: 'ALL', days: 9999 }
    ];
    
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
        
        // Create time period buttons
        let timePeriodButtons = '';
        timePeriods.forEach((period, index) => {
            const activeClass = index === 0 ? 'active' : '';
            timePeriodButtons += `<button class="btn ${activeClass}" data-period="${period.id}">${period.label}</button>`;
        });
        
        // Calculate price change for the default period (1D)
        const priceInfo = calculatePriceChange(data, timePeriods[0].days);
        const priceChangeClass = priceInfo.change >= 0 ? 'stock-change-positive' : 'stock-change-negative';
        const priceChangeSign = priceInfo.change >= 0 ? '+' : '';
        
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
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <div>
                            <span class="stock-price-display" id="price-display-${symbol}">$${priceInfo.price.toFixed(2)}</span>
                            <span class="stock-change-display ${priceChangeClass}" id="change-display-${symbol}">${priceChangeSign}${priceInfo.change.toFixed(2)} (${priceChangeSign}${priceInfo.changePercent.toFixed(2)}%)</span>
                        </div>
                        <div class="time-period-selector">
                            <div class="btn-group" id="time-selector-${symbol}">
                                ${timePeriodButtons}
                            </div>
                        </div>
                    </div>
                    <canvas id="stock-chart-${symbol}"></canvas>
                </div>
            </div>
        `;
        
        // Add to the container
        document.getElementById('stock-charts-container').appendChild(column);
        
        // Update reference to the container
        chartContainer = column;
        
        // Add event listeners to time period buttons
        setTimeout(() => {
            const buttonGroup = document.getElementById(`time-selector-${symbol}`);
            if (buttonGroup) {
                const buttons = buttonGroup.querySelectorAll('.btn');
                buttons.forEach(button => {
                    button.addEventListener('click', function() {
                        // Remove active class from all buttons
                        buttons.forEach(btn => btn.classList.remove('active'));
                        // Add active class to clicked button
                        this.classList.add('active');
                        
                        // Get selected time period
                        const periodId = this.getAttribute('data-period');
                        const period = timePeriods.find(p => p.id === periodId);
                        
                        // Update chart with selected time period
                        updateChartForTimePeriod(symbol, data, period.days);
                    });
                });
            }
        }, 100);
    } else {
        // Update the last updated timestamp
        const lastUpdatedElement = document.getElementById(`last-updated-${symbol}`);
        if (lastUpdatedElement) {
            lastUpdatedElement.textContent = `Last update: ${lastUpdated}`;
        }
    }
    
    // Update chart with default time period (1D)
    updateChartForTimePeriod(symbol, data, timePeriods[0].days);
    
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