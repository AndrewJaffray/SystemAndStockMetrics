<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Metrics Dashboard</title>
    <!-- Include Bootstrap CSS -->
    <link href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css" rel="stylesheet">
    <!-- Include Google Charts -->
    <script type="text/javascript" src="https://www.gstatic.com/charts/loader.js"></script>
    <!-- Custom styles -->
    <style>
        body {
            margin-top: 20px;
        }
        .update-indicator {
            display: inline-block;
            width: 10px;
            height: 10px;
            border-radius: 50%;
            background-color: #28a745;
            margin-left: 10px;
            opacity: 0;
            transition: opacity 0.5s;
        }
        .update-indicator.active {
            opacity: 1;
        }
        .card {
            margin-bottom: 20px;
        }
        .chart-container {
            position: relative;
            height: 300px;
            width: 100%;
            margin-top: 20px;
        }
    </style>
</head>
<body>
    <nav class="navbar navbar-expand-lg navbar-dark bg-dark">
        <a class="navbar-brand" href="#">Metrics Dashboard</a>
    </nav>
    
    <div class="container">
        <div class="row mt-4">
            <div class="col-md-12">
                <div class="alert alert-info">
                    <div class="d-flex justify-content-between align-items-center">
                        <span><strong>Dashboard Status:</strong> Live</span>
                        <div>
                            <small id="last-update" class="text-dark">Last update: Never</small>
                            <span id="update-indicator" class="update-indicator"></span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- System Metrics Card -->
        <div class="row mb-4">
            <div class="col-md-12">
                <div class="card">
                    <div class="card-header bg-primary text-white">
                        <i class="fas fa-laptop"></i> System Metrics
                    </div>
                    <div class="card-body">
                        <div class="row justify-content-around">
                            <div class="col-md-5 text-center">
                                <div id="cpuGauge"></div>
                            </div>
                            <div class="col-md-5 text-center">
                                <div id="memoryGauge"></div>
                            </div>
                        </div>
                        <ul id="system-metrics" class="list-group mt-3">
                            <!-- Timestamp will be added here -->
                        </ul>
                    </div>
                </div>
            </div>
        </div>
            
        <!-- Stock Metrics Card -->
        <div class="row">
            <div class="col-md-12">
                <div class="card">
                    <div class="card-header bg-success text-white">
                        <i class="fas fa-chart-line"></i> Stock Metrics
                    </div>
                    <div class="card-body">
                        <ul id="stock-metrics" class="list-group">
                            <!-- Dynamically populated through JavaScript -->
                        </ul>
                        <div class="chart-container">
                            <div id="stockMetricsChart"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Include Bootstrap JS and dependencies -->
    <script src="https://code.jquery.com/jquery-3.5.1.slim.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/@popperjs/core@2.9.3/dist/umd/popper.min.js"></script>
    <script src="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.min.js"></script>
    <!-- Include Font Awesome for icons -->
    <script src="https://kit.fontawesome.com/a076d05399.js" crossorigin="anonymous"></script>
    <!-- Include your custom JavaScript file -->
    <script src="{{ url_for('static', filename='scripts/metrics.js') }}"></script>
</body>
</html> 