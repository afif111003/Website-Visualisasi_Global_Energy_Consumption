// Global variables
let data;
let originalData;
let latestYear;
let selectedCountry = null;
let selectedBoxPlotCountry = 'China'; 
let selectedRegion = 'All Regions';
let regions = {
    'Asia': ['China', 'India', 'Japan', 'South Korea', 'Indonesia', 'Saudi Arabia', 'Iran', 'Thailand', 'Malaysia'],
    'Europe': ['Germany', 'UK', 'France', 'Italy', 'Spain', 'Poland', 'Netherlands', 'Belgium', 'Sweden'],
    'North America': ['United States', 'Canada', 'Mexico'],
    'South America': ['Brazil', 'Argentina', 'Colombia', 'Chile', 'Peru', 'Venezuela'],
    'Africa': ['South Africa', 'Egypt', 'Nigeria', 'Algeria', 'Morocco'],
    'Oceania': ['Australia', 'New Zealand']
};

// Colors
const colors = {
    main: '#1976D2',
    accent: '#FF5722',
    green: '#4CAF50',
    text: '#333333',
    background: '#f9f9f9'
};

// D3 helper for correlation
d3.correlation = function(x, y) {
    let n = x.length;
    if (n !== y.length) {
        throw new Error('Input arrays must have the same length');
    }
    
    let sum_x = 0, sum_y = 0, sum_xy = 0, sum_x2 = 0, sum_y2 = 0;
    
    for (let i = 0; i < n; i++) {
        sum_x += x[i];
        sum_y += y[i];
        sum_xy += x[i] * y[i];
        sum_x2 += x[i] * x[i];
        sum_y2 += y[i] * y[i];
    }
    
    return (n * sum_xy - sum_x * sum_y) / 
           Math.sqrt((n * sum_x2 - sum_x * sum_x) * (n * sum_y2 - sum_y * sum_y));
};

// Load data and initialize visualizations
async function init() {
    try {
        showLoading();
        
        // Load the data
        data = await d3.csv('datasets/clean_energy_consumption.csv');
        originalData = [...data]; // Keep original copy
        
        // Process the data
        data.forEach(d => {
            d.Year = +d.Year;
            d['Total Energy Consumption (TWh)'] = +d['Total Energy Consumption (TWh)'];
            d['Per Capita Energy Use (kWh)'] = +d['Per Capita Energy Use (kWh)'];
            d['Renewable Energy Share (%)'] = +d['Renewable Energy Share (%)'];
            d['Fossil Fuel Dependency (%)'] = +d['Fossil Fuel Dependency (%)'];
            d['Carbon Emissions (Million Tons)'] = +d['Carbon Emissions (Million Tons)'];
            d.GlobalRenewableShare =d['Renewable Energy Share (%)'];
            
            // Add region
            d.Region = 'Other';
            for (let [region, countries] of Object.entries(regions)) {
                if (countries.includes(d.Country)) {
                    d.Region = region;
                    break;
                }
            }
        });
        
        // Get latest year
        latestYear = d3.max(data, d => d.Year);
        
        // Create info panel
        createInfoPanel();
        
        // Initialize timeline controls
        createTimelineAnimation();
        
        // Initialize all visualizations
        initBubbleChart();
        initBarChart();
        initPieChart();
        initDotChart();
        initScatterPlot();
        initLineChart();
        initBoxPlot();
        initHeatmapPlot();
        initHistogram();
        initPairPlot();
        
        d3.select('#lineYearSelect').on('input', updateLineChart);

        d3.select('#boxplotCountrySearch').on('input', function() {
            const input = this.value.trim();
            selectedBoxPlotCountry = input === '' ? 'China' : input;
            updateBoxPlot();
        });

        d3.select('#heatmapYearSelect').on('input', updateHeatmapPlot);
        d3.select('#heatmapRegionSelect').on('change', function() {
            selectedRegion = d3.select(this).property('value'); // <= perbaiki ambil value
            updateHeatmapPlot();
        });

        d3.select('#histogramYearSelect').on('input', updateHistogram);

        d3.select('#pairplotYearSelect').on('input', updatePairPlot);
        d3.select('#pairplotRegionSelect').on('change', function() {
            selectedRegion = d3.select(this).property('value');
            updatePairPlot();
        });

        // Add story annotations
        addStoryAnnotations();
        
        // Update year slider
        const yearSelect = document.getElementById('yearSelect');
        yearSelect.max = latestYear;
        yearSelect.value = latestYear;
        document.getElementById('selectedYear').textContent = latestYear;
        
        hideLoading();
        
    } catch (error) {
        console.error('Error loading the data:', error);
        handleError(error);
    }
}

// Loading and error handling functions
function showLoading() {
    d3.selectAll('.chart-container')
        .append('div')
        .attr('class', 'loading-container')
        .html('<div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div>');
}

function hideLoading() {
    d3.selectAll('.loading-container').remove();
}

function handleError(error) {
    hideLoading();
    d3.selectAll('.chart-container')
        .append('div')
        .attr('class', 'error-message')
        .html(`
            <div class="alert alert-danger" role="alert">
                <h4>Error Loading Data</h4>
                <p>An error occurred while loading the visualization.</p>
                <small>${error.message}</small>
            </div>
        `);
}

// Cross-Chart Interaction
function highlightCountry(country) {
    selectedCountry = country;
    
    // Highlight in bubble chart
    d3.select('#bubbleChart').selectAll('circle')
        .style('opacity', d => d.Country === country ? 1 : 0.3)
        .style('stroke-width', d => d.Country === country ? 3 : 1);
        
    // Highlight in bar chart
    d3.select('#barChart').selectAll('.bar')
        .style('opacity', d => d.Country === country ? 1 : 0.3);
        
    // Highlight in dot chart
    d3.select('#dotChart').selectAll('.bar')
        .style('opacity', d => d.Country === country ? 1 : 0.3);
        
    // Highlight in scatter plot
    d3.select('#scatterPlot').selectAll('.point')
        .style('opacity', d => d.Country === country ? 1 : 0.3)
        .style('stroke-width', d => d.Country === country ? 3 : 1);

    // Update info panel
    updateInfoPanel(country);
}

function resetHighlight() {
    selectedCountry = null;
    
    // Reset all highlights
    d3.selectAll('circle, .bar, .point')
        .style('opacity', 0.7)
        .style('stroke-width', 1);
        
    // Reset info panel
    hideInfoPanel();
}

// Info Panel functions
function createInfoPanel() {
    d3.select('body')
        .append('div')
        .attr('id', 'info-panel')
        .attr('class', 'info-panel')
        .style('opacity', 0);
}

function updateInfoPanel(country) {
    if (country === 'Global') {
        // Jika country = 'Global', tampilkan info global Renewable Share (khusus LineChart)
        const latestGlobalRenewable = d3.mean(
            data.filter(d => d.Year === latestYear),
            d => d['Renewable Energy Share (%)']
        );

        const panel = d3.select('#info-panel');

        panel.html(`
            <h3>Global Renewable Energy</h3>
            <p><strong>Year:</strong> ${latestYear}</p>
            <div class="info-grid">
                <div class="info-item">
                    <div class="info-value">${latestGlobalRenewable.toFixed(1)}%</div>
                    <div class="info-label">Avg Renewable Share</div>
                </div>
            </div>
            <p><button id="reset-highlight" class="btn btn-sm btn-outline-secondary">Reset Selection</button></p>
        `)
        .style('opacity', 1);

        d3.select('#reset-highlight').on('click', resetHighlight);
        return; // <-- penting: selesai di sini kalau 'Global'
    }
   
    const countryData = data.filter(d => d.Country === country && d.Year === latestYear)[0];
    
    if (!countryData) return;
    
    const panel = d3.select('#info-panel');
    
    panel.html(`
        <h3>${countryData.Country}</h3>
        <p><strong>Region:</strong> ${countryData.Region}</p>
        <div class="info-grid">
            <div class="info-item">
                <div class="info-value">${d3.format(',')(Math.round(countryData['Total Energy Consumption (TWh)']))}</div>
                <div class="info-label">Total Consumption (TWh)</div>
            </div>
            <div class="info-item">
                <div class="info-value">${d3.format(',')(Math.round(countryData['Per Capita Energy Use (kWh)']))}</div>
                <div class="info-label">Per Capita (kWh)</div>
            </div>
            <div class="info-item">
                <div class="info-value">${countryData['Renewable Energy Share (%)'].toFixed(1)}%</div>
                <div class="info-label">Renewable Share</div>
            </div>
            <div class="info-item">
                <div class="info-value">${countryData['Fossil Fuel Dependency (%)'].toFixed(1)}%</div>
                <div class="info-label">Fossil Fuel</div>
            </div>
            <div class="info-item">
                <div class="info-value">${d3.format(',')(Math.round(countryData['Carbon Emissions (Million Tons)']))}</div>
                <div class="info-label">Carbon Emissions (Juta Ton)</div>
            </div>
        </div>
        <p><button id="reset-highlight" class="btn btn-sm btn-outline-secondary">Reset Selection</button></p>
    `)
    .style('opacity', 1);
    
    d3.select('#reset-highlight').on('click', resetHighlight);
}

function hideInfoPanel() {
    d3.select('#info-panel')
        .style('opacity', 0);
}

// Timeline Animation functions
function createTimelineAnimation() {
    // Create timeline controls
    const timelineControls = d3.select('#timelineControls');
    
    // Get year range from data
    const years = [...new Set(data.map(d => d.Year))].sort();
    const minYear = years[0];
    const maxYear = years[years.length - 1];
    
    // Create timeline slider
    timelineControls.html(`
        <div class="timeline-container">
            <button id="play-btn" class="btn btn-primary btn-sm me-2">
                <i class="bi bi-play-fill"></i> Play
            </button>
            <input type="range" class="form-range" id="timelineSlider"
                min="${minYear}" max="${maxYear}" value="${maxYear}" step="1">
            <span id="currentYear">${maxYear}</span>
        </div>
    `);
    
    // Event for slider
    d3.select('#timelineSlider').on('input', function() {
        const year = +this.value;
        updateTimelineYear(year);
    });
    
    // Play/pause animation
    let isPlaying = false;
    let animationInterval;
    
    d3.select('#play-btn').on('click', function() {
        if (isPlaying) {
            // Pause
            clearInterval(animationInterval);
            d3.select(this).html('<i class="bi bi-play-fill"></i> Play');
        } else {
            // Play
            let currentYear = +d3.select('#timelineSlider').property('value');
            d3.select(this).html('<i class="bi bi-pause-fill"></i> Pause');
            
            animationInterval = setInterval(() => {
                currentYear++;
                if (currentYear > maxYear) {
                    currentYear = minYear;
                }
                
                d3.select('#timelineSlider').property('value', currentYear);
                updateTimelineYear(currentYear);
            }, 1500); // Change year every 1.5 seconds
        }
        
        isPlaying = !isPlaying;
    });
}

function updateTimelineYear(year) {
    // Update displayed year
    d3.select('#currentYear').text(year);
    
    // Update latestYear global variable
    latestYear = year;

    d3.select('#lineYearSelect').property('value', year);
    d3.select('#heatmapYearSelect').property('value', year); // <<< BARU
    d3.select('#selectedHeatmapYear').text(year);
    d3.select('#histogramYearSelect').property('value', year);
    d3.select('#pairplotYearSelect').property('value', year);
    d3.select('#selectedPairplotYear').text(year); 
     
    // Update all visualizations
    updateBubbleChart();
    updateBarChart();
    updatePieChart();
    updateDotChart();
    updateScatterPlot();
    updateLineChart();
    updateBoxPlot();
    updateHeatmapPlot();
    updateHistogram();
    updatePairPlot();
    
    // Add year annotation
    addYearAnnotation(year);
}

function addYearAnnotation(year) {
    // Remove previous annotations
    d3.selectAll('.year-annotation').remove();
    
    // Add annotation with animation
    d3.selectAll('.visualization-section')
        .append('div')
        .attr('class', 'year-annotation')
        .style('opacity', 0)
        .html(`<div class="badge bg-primary year-badge">${year}</div>`)
        .transition()
        .duration(500)
        .style('opacity', 1)
        .transition()
        .delay(1000)
        .duration(500)
        .style('opacity', 0)
        .remove();
}

// Story Annotations
function addStoryAnnotations() {
    // Data insights for annotations
    const insights = [
        {
            title: "Ketimpangan Konsumsi Energi",
            content: "5 negara teratas mengkonsumsi lebih dari 50% energi dunia, menunjukkan ketimpangan distribusi sumber daya energi global.",
            target: "#bubbleChart",
            position: "top-right"
        },
        {
            title: "Korelasi Negatif",
            content: "Semakin tinggi penggunaan energi terbarukan, semakin rendah ketergantungan terhadap bahan bakar fosil - menunjukkan pola transisi energi global.",
            target: "#scatterPlot",
            position: "bottom-left"
        },
        {
            title: "Disparitas Per Kapita",
            content: "Negara-negara kecil dengan standar hidup tinggi memiliki konsumsi per kapita jauh di atas rata-rata global, menunjukkan tantangan efisiensi energi.",
            target: "#dotChart",
            position: "middle-right" 
        }
    ];
    
    // Add annotations to visualizations
    insights.forEach((insight, i) => {
        d3.select(insight.target)
            .append('div')
            .attr('class', `story-annotation annotation-${insight.position}`)
            .html(`
                <div class="annotation-card">
                    <h5>${insight.title}</h5>
                    <p>${insight.content}</p>
                    <div class="annotation-dot"></div>
                    <div class="annotation-line"></div>
                </div>
            `);
    });
    
    // Add button to show/hide annotations
    d3.select('.header')
        .append('div')
        .attr('class', 'narrative-controls mt-3')
        .html(`
            <button id="toggle-annotations" class="btn btn-outline-primary">
                <i class="bi bi-lightbulb"></i> Toggle Insights
            </button>
        `);
        
    // Event for toggle
    d3.select('#toggle-annotations').on('click', function() {
        const annotations = d3.selectAll('.story-annotation');
        const isVisible = annotations.style('display') !== 'none';
        
        annotations.style('display', isVisible ? 'none' : 'block');
    });
}

// Responsive design
function handleResize() {
    // Get current window dimensions
    const width = window.innerWidth;
    
    // Update each visualization if needed
    if (typeof updateBubbleChart === 'function') updateBubbleChart();
    if (typeof updateBarChart === 'function') updateBarChart();
    if (typeof updatePieChart === 'function') updatePieChart();
    if (typeof updateDotChart === 'function') updateDotChart();
    if (typeof updateScatterPlot === 'function') updateScatterPlot();
    if (typeof updateLinechart === 'function') updateLineChart();
    if (typeof updateBoxPlot === 'function') updateBoxPlot();
    if (typeof updateHeatmapPlot === 'function') updateHeatmapPlot();
    if (typeof updateHistogram === "function") updateHistogram();
    if (typeof updatePairPlot === 'function') updatePairPlot();
}

// Add event listener for resize
window.addEventListener('resize', handleResize);

// Initialize the application
document.addEventListener('DOMContentLoaded', init);