// Variables to store chart instances
let cpuGauge = null;
let memoryGauge = null;
let stockCharts = {}; // Object to store individual stock charts by symbol
let stockData = {}; // Object to store stock data by symbol
let systemMetricsTable = null; // DataTable instance for system metrics
let metricsRunning = true; // Track if metrics collection is running

// API configuration
// Set to empty string to use relative URLs (current domain)
// Set to full URL (e.g., "https://yourusername.pythonanywhere.com") to force a specific domain
const API_BASE_URL = "https://AndrewJaffray.pythonanywhere.com";  // Empty = use current domain

// Define time periods for stock charts
const timePeriods = [
    { id: '1', label: '1D', days: 1 },
    { id: '7', label: '1W', days: 7 },
    { id: '30', label: '1M', days: 30 },
    { id: '90', label: '3M', days: 90 },
    { id: '365', label: '1Y', days: 365 },
    { id: 'all', label: 'ALL', days: 9999 }
];

// Called when page is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('Page loaded, fetching initial metrics');
    // Initialize empty gauges
    initGauges();
    
    // Initialize system metrics DataTable
    initSystemMetricsTable();
    
    // Immediately fetch historical data to show charts
    fetchHistoricalStockMetrics();
    
    // Then fetch all metrics (including real-time data)
    fetchAllMetrics();
    
    // Set up refresh button for system metrics table
    document.getElementById('refresh-system-table').addEventListener('click', function() {
        fetchSystemMetricsForTable();
    });
    
    // Set up toggle button for metrics collection
    document.getElementById('toggle-metrics').addEventListener('click', function() {
        toggleMetricsCollection();
    });
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
    fetch(`${API_BASE_URL}/api/metrics`)
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
    fetch(`${API_BASE_URL}/api/stock_metrics`)
        .then(response => response.json())
        .then(data => {
            console.log('Stock Metrics:', data);
            
            // Update the stock metrics list
            const stockMetricsList = document.getElementById('stock-metrics');
            stockMetricsList.innerHTML = '';
            
            // Get and sort the latest data
            const latestData = {}; // Store latest data by symbol
            
            // First pass to get latest data for each symbol
            data.forEach(item => {
                const symbol = item.symbol;
                if (!latestData[symbol] || new Date(item.timestamp) > new Date(latestData[symbol].timestamp)) {
                    latestData[symbol] = item;
                }
            });
            
            // Sort symbols for consistent display order
            const sortedSymbols = Object.keys(latestData).sort();
            
            // Add each stock to the list
            sortedSymbols.forEach(symbol => {
                const item = latestData[symbol];
                const stockItem = document.createElement('li');
                stockItem.className = 'list-group-item d-flex justify-content-between align-items-center';
                
                const changeClass = item.change_percent >= 0 ? 'badge-success' : 'badge-danger';
                const changeSign = item.change_percent >= 0 ? '+' : '';
                
                // Add a tooltip explaining the percentage
                stockItem.innerHTML = `
                    <strong>${symbol}</strong>
                    <div class="d-flex align-items-center">
                        <span class="stock-price-display">$${item.price.toFixed(2)}</span>
                        <span class="badge ${changeClass} stock-change-display" 
                              title="Daily percentage change compared to previous close">
                            ${changeSign}${item.change_percent}%
                        </span>
                        </div>
                `;
                
                stockMetricsList.appendChild(stockItem);
                
                // Make sure we create/update the chart for this symbol
                createOrUpdateStockChart(symbol, data.filter(d => d.symbol === symbol));
            });
            
            // Update the last updated timestamp
            if (data.length > 0) {
                // Find the most recent timestamp across all data
                let mostRecent = new Date(data[0].timestamp);
                for (let i = 1; i < data.length; i++) {
                    const current = new Date(data[i].timestamp);
                    if (current > mostRecent) {
                        mostRecent = current;
                    }
                }
                
                const formattedDate = mostRecent.toLocaleDateString();
                const formattedTime = mostRecent.toLocaleTimeString();
                document.getElementById('stock-last-updated').textContent = `Last stock update: ${formattedDate}, ${formattedTime}`;
            }
            
            // Flash the update indicator
            const indicator = document.getElementById('update-indicator');
            indicator.classList.add('active');
            setTimeout(() => {
                indicator.classList.remove('active');
            }, 1000);
        })
        .catch(error => {
            console.error('Error fetching stock metrics:', error);
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
    console.log('Fetching historical stock metrics...');
    fetch(`${API_BASE_URL}/api/historical/stock_metrics`)
        .then(response => {
            console.log('Historical stock metrics response status:', response.status);
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Historical stock metrics data received:', data);
            
            if (!data || !Array.isArray(data) || data.length === 0) {
                console.warn('No historical stock metrics data available or invalid format');
                return;
            }
            
            // Validate data format
            const validData = data.filter(item => {
                if (!item || typeof item !== 'object') return false;
                if (!item.symbol || !item.price || !item.timestamp) return false;
                return true;
            });
            
            if (validData.length === 0) {
                console.warn('No valid data points found in historical stock metrics');
                return;
            }
            
            console.log(`Found ${validData.length} valid data points out of ${data.length} total`);
            
            // Store the data for each stock symbol
            const stockSymbols = [...new Set(validData.map(item => item.symbol))];
            console.log('Unique stock symbols found:', stockSymbols);
            
            stockSymbols.forEach(symbol => {
                // Filter data for this specific stock
                const symbolData = validData.filter(item => item.symbol === symbol);
                console.log(`Data for ${symbol}: ${symbolData.length} points`);
                
                if (symbolData.length === 0) {
                    console.warn(`No valid data points for ${symbol}`);
                    return;
                }
                
                // Ensure price is a number
                const processedData = symbolData.map(item => ({
                    ...item,
                    price: typeof item.price === 'number' ? item.price : parseFloat(item.price),
                    change_percent: typeof item.change_percent === 'number' ? item.change_percent : parseFloat(item.change_percent || '0')
                }));
                
                // Ensure we have at least 2 different timestamps
                const uniqueTimestamps = [...new Set(processedData.map(item => item.timestamp))];
                if (uniqueTimestamps.length < 2) {
                    console.log(`Only ${uniqueTimestamps.length} unique timestamps for ${symbol}, adding simulated data`);
                    
                    // Add several data points with slight variations to ensure the chart displays properly
                    const existingPoint = processedData[0];
                    const existingTime = new Date(existingPoint.timestamp);
                    
                    // Add points at different times
                    for (let i = 1; i <= 5; i++) {
                        const newTime = new Date(existingTime);
                        newTime.setHours(newTime.getHours() - i);
                        
                        // Add a small random variation to the price
                        const randomFactor = 0.005; // 0.5% variation
                        const randomVariation = (Math.random() * 2 - 1) * existingPoint.price * randomFactor;
                        
                        processedData.push({
                            ...existingPoint,
                            timestamp: newTime.toISOString(),
                            price: existingPoint.price * (1 + (i * 0.001) + randomVariation) // Small increasing trend with randomness
                        });
                        
                        console.log(`Added simulated data point at ${newTime.toISOString()}`);
                    }
                }
                
                // Sort data by timestamp to ensure proper chart display
                const sortedData = processedData.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
                
                // Store the data for this symbol
                stockData[symbol] = sortedData;
                
                // Create or update chart for this stock
                createOrUpdateStockChart(symbol, sortedData);
            });
            
            // Remove charts for stocks that no longer exist in the data
            Object.keys(stockCharts).forEach(symbol => {
                if (!stockSymbols.includes(symbol)) {
                    console.log(`Removing chart for ${symbol} as it no longer exists in the data`);
                    // Destroy chart
                    if (stockCharts[symbol]) {
                        stockCharts[symbol].destroy();
                        delete stockCharts[symbol];
                    }
                    
                    // Remove chart container
                    const container = document.getElementById(`stock-chart-container-${symbol}`);
                    if (container) {
                        container.remove();
                    }
                }
            });
            
            // Add more detailed debugging
            console.log(`Received ${data.length} total data points:`, data);
            data.forEach(item => {
                const date = new Date(item.timestamp);
                console.log(`${item.symbol}: $${item.price} at ${date.toLocaleString()}`);
            });
        })
        .catch(error => {
            console.error('Error fetching historical stock metrics:', error);
        });
}

// Function to calculate price change for a given time period
function calculatePriceChange(data, days) {
    console.log(`Calculating price change for time period of ${days} days with ${data.length} data points`);
    
    if (!data || data.length === 0) {
        console.warn('No data available for price change calculation');
        return { price: 0, change: 0, changePercent: 0 };
    }
    
    // Sort data by timestamp (newest first)
    const sortedData = [...data].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    console.log('Sorted data for price change calculation (newest first):', sortedData.slice(0, 3));
    
    // Get current price (most recent data point)
    const currentPrice = sortedData[0].price;
    console.log(`Current price: $${currentPrice.toFixed(2)}`);
    
    // Calculate cutoff date for the selected time period
    const now = new Date(sortedData[0].timestamp);
    const cutoffDate = new Date(now);
    cutoffDate.setDate(cutoffDate.getDate() - days);
    console.log(`Cutoff date for price change: ${cutoffDate.toLocaleString()}`);
    
    // Find the closest data point to the cutoff date
    let previousPrice = currentPrice;
    let previousPriceDate = now;
    for (let i = 0; i < sortedData.length; i++) {
        const dataDate = new Date(sortedData[i].timestamp);
        if (dataDate <= cutoffDate) {
            previousPrice = sortedData[i].price;
            previousPriceDate = dataDate;
            console.log(`Found previous price: $${previousPrice.toFixed(2)} from ${previousPriceDate.toLocaleString()}`);
            break;
        }
    }
    
    // If we didn't find a price before the cutoff date, use the oldest available price
    if (previousPriceDate >= cutoffDate && sortedData.length > 1) {
        previousPrice = sortedData[sortedData.length - 1].price;
        previousPriceDate = new Date(sortedData[sortedData.length - 1].timestamp);
        console.log(`Using oldest available price: $${previousPrice.toFixed(2)} from ${previousPriceDate.toLocaleString()}`);
    }
    
    // Calculate change and percent change
    const change = currentPrice - previousPrice;
    const changePercent = (change / previousPrice) * 100;
    
    console.log(`Price change: $${change.toFixed(2)} (${changePercent.toFixed(2)}%)`);
    
    return {
        price: currentPrice,
        change: change,
        changePercent: changePercent
    };
}

// Function to update chart for a selected time period
function updateChartForTimePeriod(symbol, days) {
    console.log(`Updating chart for ${symbol} with time period of ${days} days`);
    
    // Get the data for this symbol
    let data = stockData[symbol];
    if (!data || data.length === 0) {
        console.error(`No data available for ${symbol}`);
        return;
    }
    
    // Log the date range in the data for debugging
    const dates = data.map(item => new Date(item.timestamp));
    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));
    console.log(`Data range for ${symbol}: ${minDate.toLocaleString()} to ${maxDate.toLocaleString()} (${data.length} points)`);
    
    // Sort data by timestamp (oldest first)
    const sortedData = [...data].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    // Calculate cutoff date for the selected time period
    let cutoffDate;
    
    // Use the actual timestamps from the data, not current time
    const latestDataTime = new Date(sortedData[sortedData.length - 1].timestamp);
    
    if (days === 'all') {
        // For "all" view, don't filter any data
        cutoffDate = new Date(0); // Beginning of time
    } else if (days === '1') {
        // For 1D view, look back exactly 24 hours
        cutoffDate = new Date(latestDataTime);
        cutoffDate.setHours(cutoffDate.getHours() - 24);
        console.log(`1D view cutoff: ${cutoffDate.toLocaleString()}`);
    } else {
        // For other views, use days
        cutoffDate = new Date(latestDataTime);
        cutoffDate.setDate(cutoffDate.getDate() - parseInt(days, 10));
    }
    
    // Apply the filter
    const filteredData = sortedData.filter(item => new Date(item.timestamp) >= cutoffDate);
    console.log(`Filtered to ${filteredData.length} points for ${days} day(s) view`);
    
    // If we have very few points, add interpolated points for visual clarity
    let enhancedData = filteredData;
    if (filteredData.length > 0 && filteredData.length < 5) {
        console.log(`Adding interpolated points for better visualization`);
        enhancedData = addInterpolatedPoints(filteredData);
    }
    
    // Create sorted chart data in the format Chart.js expects
    const chartData = enhancedData.map(item => ({
        x: new Date(item.timestamp),
        y: item.price
    })).sort((a, b) => a.x - b.x);
    
    // Determine line color based on price trend (green for up, red for down)
    let lineColor = 'rgba(40, 167, 69, 1)'; // Default green
    let fillColor = 'rgba(40, 167, 69, 0.1)';
    
    if (chartData.length > 1) {
        const firstPrice = chartData[0].y;
        const lastPrice = chartData[chartData.length - 1].y;
        
        if (lastPrice < firstPrice) {
            lineColor = 'rgba(220, 53, 69, 1)'; // Red for downward trend
            fillColor = 'rgba(220, 53, 69, 0.1)';
        }
    }
    
    // Update chart data
    stockCharts[symbol].data.datasets[0].data = chartData;
    stockCharts[symbol].data.datasets[0].borderColor = lineColor;
    stockCharts[symbol].data.datasets[0].backgroundColor = fillColor;
    
    // Update time unit based on selected period
    let timeUnit = 'hour';
    if (days === '1') timeUnit = 'hour';
    else if (days === '7') timeUnit = 'day';
    else if (days === '30') timeUnit = 'day';
    else if (days === '90') timeUnit = 'week';
    else if (days === '365' || days === 'all') timeUnit = 'month';
    
    stockCharts[symbol].options.scales.x.time.unit = timeUnit;
    
    // Set y-axis min and max properly to avoid extreme scaling
    if (chartData.length > 0) {
        const prices = chartData.map(point => point.y);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice;
    
        // Determine appropriate padding based on price range
        // Use at least 0.5% padding to make single points visible
        const paddingPercent = Math.max(0.5, days === '1' ? 0.5 : 5); // 0.5% for 1D, 5% for others
        const padding = Math.max(priceRange * paddingPercent / 100, minPrice * 0.005); // Ensure some minimum padding
        
        stockCharts[symbol].options.scales.y.min = Math.max(0, minPrice - padding);
        stockCharts[symbol].options.scales.y.max = maxPrice + padding;
    }
    
    // Calculate price change for the period
    let changePercent = 0;
    if (chartData.length > 1) {
        const firstPrice = chartData[0].y;
        const lastPrice = chartData[chartData.length - 1].y;
        changePercent = ((lastPrice - firstPrice) / firstPrice) * 100;
    }
    
    // Update price change display
    const priceElement = document.getElementById(`price-${symbol}`);
    const changeElement = document.getElementById(`change-${symbol}`);
    
    if (priceElement && changeElement && chartData.length > 0) {
        const currentPrice = chartData[chartData.length - 1].y;
        priceElement.textContent = `$${currentPrice.toFixed(2)}`;
        
        const changeSign = changePercent >= 0 ? '+' : '';
        const timePeriodLabel = days === '1' ? '24h' : 
                               days === '7' ? '1W' : 
                               days === '30' ? '1M' : 
                               days === '90' ? '3M' : 
                               days === '365' ? '1Y' : 'All';
        
        changeElement.textContent = `${changeSign}${changePercent.toFixed(2)}% (${timePeriodLabel})`;
        changeElement.className = `stock-change ml-2 ${changePercent >= 0 ? 'text-success' : 'text-danger'}`;
    }
    
    // Update the chart
    stockCharts[symbol].update();
}

// Helper function to add interpolated points for sparse data
function addInterpolatedPoints(data) {
    if (data.length <= 1) return data;
    
    const result = [...data];
    
    // Add a point every hour between min and max date
    const timestamps = data.map(item => new Date(item.timestamp).getTime());
    const minTime = Math.min(...timestamps);
    const maxTime = Math.max(...timestamps);
    
    // Get the first and last prices for linear interpolation
    const firstPrice = data.find(item => new Date(item.timestamp).getTime() === minTime).price;
    const lastPrice = data.find(item => new Date(item.timestamp).getTime() === maxTime).price;
    
    // Add a point every hour
    const hourMs = 60 * 60 * 1000;
    for (let time = minTime + hourMs; time < maxTime; time += hourMs) {
        // Simple linear interpolation
        const progress = (time - minTime) / (maxTime - minTime);
        const interpolatedPrice = firstPrice + (lastPrice - firstPrice) * progress;
        
        result.push({
            symbol: data[0].symbol,
            price: interpolatedPrice,
            change_percent: 0, // Can't interpolate this meaningfully
            timestamp: new Date(time).toISOString(),
            interpolated: true // Mark as interpolated
        });
    }
    
    return result.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
}

// Function to create or update an individual stock chart
function createOrUpdateStockChart(symbol, data) {
    // Chart container ID
    const chartContainerId = `stock-chart-${symbol}`;
    
    // Create the container if it doesn't exist
    let chartContainer = document.getElementById(chartContainerId);
    
    if (!chartContainer) {
        // Create a new card for this stock
        const cardHtml = `
            <div class="col-md-12 mb-4">
                <div class="card">
                    <div class="card-header d-flex justify-content-between align-items-center">
                        <h5 class="mb-0">${symbol} Stock Price</h5>
                        <span class="stock-last-updated small"></span>
                    </div>
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-center mb-3">
                            <div class="stock-info">
                                <span class="stock-price" id="price-${symbol}"></span>
                                <span class="stock-change ml-2" id="change-${symbol}"></span>
                            </div>
                            <div class="time-period-selector">
                                <div class="btn-group" role="group" aria-label="Time Period">
                                    <button type="button" class="btn btn-sm btn-outline-secondary active" data-days="1" data-symbol="${symbol}">1D</button>
                                    <button type="button" class="btn btn-sm btn-outline-secondary" data-days="7" data-symbol="${symbol}">1W</button>
                                    <button type="button" class="btn btn-sm btn-outline-secondary" data-days="30" data-symbol="${symbol}">1M</button>
                                    <button type="button" class="btn btn-sm btn-outline-secondary" data-days="90" data-symbol="${symbol}">3M</button>
                                    <button type="button" class="btn btn-sm btn-outline-secondary" data-days="365" data-symbol="${symbol}">1Y</button>
                                    <button type="button" class="btn btn-sm btn-outline-secondary" data-days="all" data-symbol="${symbol}">ALL</button>
                                </div>
                            </div>
                        </div>
                        <div class="stock-chart-container">
                            <canvas id="${chartContainerId}"></canvas>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Add to the DOM
        document.getElementById('stock-charts-container').insertAdjacentHTML('beforeend', cardHtml);
        
        // Get the newly created canvas
        chartContainer = document.getElementById(chartContainerId);
    }
    
    // Ensure we're not artificially restricting the data
    stockData[symbol] = data; // Store all the data
    
    // Make sure we're handling sparse data properly
    if (data.length < 2) {
        console.log(`Not enough data points for ${symbol}, need at least 2`);
        // Handle this case - perhaps add placeholder data or show a message
    }
    
    // Get latest price for initial display
    const latestData = [...data].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
    
    // Create or update initial price display
    const priceElement = document.getElementById(`price-${symbol}`);
    if (priceElement && latestData) {
        priceElement.textContent = `$${latestData.price.toFixed(2)}`;
    }
    
    // Initialize chart with empty data
    if (!stockCharts[symbol]) {
        const ctx = chartContainer.getContext('2d');
    stockCharts[symbol] = new Chart(ctx, {
        type: 'line',
        data: {
                datasets: [{
                    label: `${symbol} Price`,
                    data: [],
                    borderColor: 'rgba(40, 167, 69, 1)',
                    backgroundColor: 'rgba(40, 167, 69, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    pointRadius: 6,  // Larger points for better visibility with sparse data
                    pointHoverRadius: 9,  // Larger hover points
                    pointBackgroundColor: 'rgba(40, 167, 69, 1)',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    tension: 0.1,  // Slight curve for better visual
                    spanGaps: true  // Connect points even with gaps in data
                }]
        },
        options: {
                animation: {
                    duration: 1000
                },
            responsive: true,
            maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false
            },
            plugins: {
                tooltip: {
                        usePointStyle: true,
                    callbacks: {
                            title: function(tooltipItems) {
                                const date = new Date(tooltipItems[0].parsed.x);
                                return date.toLocaleString();
                            },
                        label: function(context) {
                                return `${symbol}: $${context.parsed.y.toFixed(2)}`;
                        }
                    }
                    },
                    legend: {
                        display: false
                }
            },
            scales: {
                x: {
                    type: 'time',
                    time: {
                            unit: 'hour',
                            tooltipFormat: 'PPpp',
                        displayFormats: {
                            minute: 'HH:mm',
                            hour: 'HH:mm',
                            day: 'MMM d',
                            week: 'MMM d',
                                month: 'MMM yyyy'
                            }
                        },
                        grid: {
                        display: true,
                            color: 'rgba(0, 0, 0, 0.05)'
                    },
                    ticks: {
                            maxRotation: 0,
                            autoSkip: true,
                            padding: 10
                    }
                },
                y: {
                        display: true,
                        position: 'right',
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                    },
                    ticks: {
                        callback: function(value) {
                            return '$' + value.toFixed(2);
                        },
                            padding: 10
                        },
                        beginAtZero: false,
                        grace: '5%'
                    }
                },
                hover: {
                    mode: 'nearest',
                    intersect: false
                },
                elements: {
                    line: {
                        borderJoinStyle: 'round'  // Smoother line joining
                    },
                    point: {
                        hitRadius: 10  // Larger hit area for interaction
                    }
                }
            }
        });
    }
        
        // Add event listeners to time period buttons
    const buttons = document.querySelectorAll(`button[data-symbol="${symbol}"]`);
                buttons.forEach(button => {
                    button.addEventListener('click', function() {
                        // Remove active class from all buttons
                        buttons.forEach(btn => btn.classList.remove('active'));
                        // Add active class to clicked button
                        this.classList.add('active');
                        
            // Update chart for selected time period
            updateChartForTimePeriod(symbol, this.getAttribute('data-days'));
                    });
                });
    
    // Update with 1-day view by default
    updateChartForTimePeriod(symbol, '1');
}

// Fetch all metrics
function fetchAllMetrics() {
    console.log('Fetching all metrics...');
    fetchSystemMetrics();
    fetchStockMetrics();
    // We still call this for compatibility, but it doesn't do anything now
    fetchHistoricalSystemMetrics();
    fetchHistoricalStockMetrics();
    
    // Refresh the system metrics table every 5 cycles (50 seconds)
    const currentTime = new Date().getTime();
    if (!window.lastTableRefresh || (currentTime - window.lastTableRefresh) > 50000) {
        console.log('Refreshing system metrics table...');
        fetchSystemMetricsForTable();
        window.lastTableRefresh = currentTime;
    }
    
    // Force a check of the stock charts
    setTimeout(() => {
        const stockChartsContainer = document.getElementById('stock-charts-container');
        if (stockChartsContainer && stockChartsContainer.children.length === 0) {
            console.log('No stock charts found, forcing a refresh of historical stock metrics');
            fetchHistoricalStockMetrics();
        }
    }, 1000);
}

// Fetch metrics every 10 seconds instead of 30
const intervalId = setInterval(fetchAllMetrics, 10000);
console.log('Metrics update interval set:', intervalId);

// Function to initialize the system metrics DataTable
function initSystemMetricsTable() {
    systemMetricsTable = $('#system-metrics-table').DataTable({
        columns: [
            { data: 'timestamp', title: 'Timestamp' },
            { data: 'computer_id', title: 'Computer ID' },
            { 
                data: 'cpu_usage', 
                title: 'CPU Usage (%)',
                render: function(data) {
                    return data.toFixed(1) + '%';
                }
            },
            { 
                data: 'memory_usage', 
                title: 'Memory Usage (%)',
                render: function(data) {
                    return data.toFixed(1) + '%';
                }
            }
        ],
        order: [[0, 'desc']], // Sort by timestamp descending
        pageLength: 10,
        lengthMenu: [[10, 25, 50, 100, -1], [10, 25, 50, 100, "All"]],
        responsive: true,
        language: {
            emptyTable: "No system metrics data available"
        }
    });
    
    // Initial data fetch
    fetchSystemMetricsForTable();
}

// Function to fetch system metrics data for the DataTable
function fetchSystemMetricsForTable() {
    console.log('Fetching system metrics for table...');
    
    // Show loading indicator
    $('#refresh-system-table').html('<i class="fas fa-spinner fa-spin"></i> Loading...');
    $('#refresh-system-table').prop('disabled', true);
    
    fetch(`${API_BASE_URL}/api/system_metrics/table`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log(`Retrieved ${data.length} system metrics records for table`);
            
            // Format timestamps for better readability
            data.forEach(item => {
                if (item.timestamp) {
                    const date = new Date(item.timestamp);
                    item.timestamp = date.toLocaleString();
                }
            });
            
            // Clear existing data and add new data
            systemMetricsTable.clear();
            systemMetricsTable.rows.add(data);
            systemMetricsTable.draw();
            
            // Reset refresh button
            $('#refresh-system-table').html('<i class="fas fa-sync-alt"></i> Refresh Data');
            $('#refresh-system-table').prop('disabled', false);
        })
        .catch(error => {
            console.error('Error fetching system metrics for table:', error);
            
            // Reset refresh button
            $('#refresh-system-table').html('<i class="fas fa-sync-alt"></i> Refresh Data');
            $('#refresh-system-table').prop('disabled', false);
        });
}

// Function to toggle metrics collection
function toggleMetricsCollection() {
    const button = document.getElementById('toggle-metrics');
    const statusElement = document.getElementById('metrics-status');
    
    if (metricsRunning) {
        // Send stop command
        fetch(`${API_BASE_URL}/api/metrics/stop`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
                if (data.status === 'success') {
                    button.classList.remove('btn-danger');
                    button.classList.add('btn-success');
                    button.innerHTML = '<i class="fas fa-play-circle"></i> Start Metrics Collection';
                    
                    statusElement.classList.remove('badge-success');
                    statusElement.classList.add('badge-danger');
                    statusElement.textContent = 'Stopped';
            
            metricsRunning = false;
                }
    })
    .catch(error => {
        console.error('Error toggling metrics collection:', error);
        alert('Error toggling metrics collection. Please try again.');
    });
    } else {
        // We can't remotely start the metrics collection, so just update the UI
        button.classList.remove('btn-success');
        button.classList.add('btn-danger');
        button.innerHTML = '<i class="fas fa-stop-circle"></i> Stop Metrics Collection';
        
        statusElement.classList.remove('badge-danger');
        statusElement.classList.add('badge-success');
        statusElement.textContent = 'Running';
        
        metricsRunning = true;
        
        // Show a notification that manual restart is required
        alert('Please note: You need to manually restart the metrics collection script on your local machine.');
    }
}