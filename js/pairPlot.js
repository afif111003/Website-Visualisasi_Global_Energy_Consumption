// Global vars khusus pairplot
let pairPlotSvg;
let pairPlotWidth, pairPlotHeight;
let selectedPairplotYear;
let selectedPairplotRegion;

function initPairPlot() {
    const margin = { top: 50, right: 30, bottom: 70, left: 60 };
    pairPlotWidth = 700 - margin.left - margin.right;
    pairPlotHeight = 600 - margin.top - margin.bottom;

    pairPlotSvg = d3.select('#pairPlot')
        .append('svg')
        .attr('width', pairPlotWidth + margin.left + margin.right)
        .attr('height', pairPlotHeight + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    selectedPairplotYear = latestYear;
    selectedPairplotRegion = 'All Regions';

    d3.select('#pairplotYearSelect').property('value', selectedPairplotYear);
    d3.select('#pairplotRegionSelect').property('value', selectedPairplotRegion);

    d3.select('#pairplotYearSelect').on('input', function () {
        selectedPairplotYear = +this.value;
        updatePairPlot();
    });

    d3.select('#pairplotRegionSelect').on('change', function () {
        selectedPairplotRegion = this.value;
        updatePairPlot();
    });

    updatePairPlot();
}

function updatePairPlot() {
    selectedPairplotYear = +d3.select('#pairplotYearSelect').property('value');
    selectedPairplotRegion = d3.select('#pairplotRegionSelect').property('value');

    d3.select('#selectedPairplotYear').text(selectedPairplotYear);

    let filteredData = originalData.filter(d => d.Year === selectedPairplotYear);
    if (selectedPairplotRegion !== 'All Regions') {
        filteredData = filteredData.filter(d => d.Region === selectedPairplotRegion);
    }

    const cols = [
        'Per Capita Energy Use (kWh)',
        'Total Energy Consumption (TWh)',
        'Carbon Emissions (Million Tons)',
        'Renewable Energy Share (%)',
        'Fossil Fuel Dependency (%)'
    ];

    const colsDisplayName = {
        'Per Capita Energy Use (kWh)': 'Energy Use (kWh)',
        'Total Energy Consumption (TWh)': 'Total Consumption (TWh)',
        'Carbon Emissions (Million Tons)': 'Carbon Emissions (Mt)',
        'Renewable Energy Share (%)': 'Renewable Share (%)',
        'Fossil Fuel Dependency (%)': 'Fossil Fuel (%)'
    };

    filteredData = filteredData.filter(d => cols.every(c => !isNaN(d[c])));

    if (filteredData.length < 5) {
        d3.select('#pairPlotContainer').style('display', 'none');
        d3.select('#pairPlotWarning').style('display', 'block');
        return;
    } else {
        d3.select('#pairPlotContainer').style('display', 'block');
        d3.select('#pairPlotWarning').style('display', 'none');
    }

    drawPairPlot(filteredData, cols, colsDisplayName);
}

function drawPairPlot(data, cols, colsDisplayName) {
    d3.select('#pairPlot').html(''); // Bukan container! Tapi ID pairPlot

    const margin = { top: 1, right: 100, bottom: 1, left: 100 };
    const containerWidth = document.getElementById('pairPlotContainer').clientWidth;
    const plotArea = containerWidth - margin.left - margin.right;
    const size = plotArea / cols.length;

    const svg = d3.select('#pairPlot')
        .append('svg')
        .attr('width', containerWidth)
        .attr('height', containerWidth)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    const scales = {};
    cols.forEach(col => {
        scales[col] = d3.scaleLinear()
            .domain(d3.extent(data, d => +d[col]))
            .range([0, size]);
    });

    for (let i = 0; i < cols.length; i++) {
        for (let j = 0; j <= i; j++) {
            const g = svg.append('g')
                .attr('transform', `translate(${j * size},${i * size})`);

            if (i === j) {
                const x = scales[cols[i]];
                const histogram = d3.histogram()
                    .domain(x.domain())
                    .thresholds(x.ticks(10))
                    (data.map(d => +d[cols[i]]));

                const y = d3.scaleLinear()
                    .domain([0, d3.max(histogram, d => d.length)])
                    .range([size, 0]);

                g.selectAll('rect')
                    .data(histogram)
                    .enter()
                    .append('rect')
                    .attr('x', d => x(d.x0))
                    .attr('y', d => y(d.length))
                    .attr('width', d => Math.max(0, x(d.x1) - x(d.x0) - 1))
                    .attr('height', d => size - y(d.length))
                    .attr('fill', colors.main)
                    .attr('opacity', 0.7);
            } else {
                g.selectAll('circle')
                    .data(data)
                    .enter()
                    .append('circle')
                    .attr('cx', d => scales[cols[j]](d[cols[j]]))
                    .attr('cy', d => scales[cols[i]](d[cols[i]]))
                    .attr('r', 2)
                    .attr('fill', colors.accent)
                    .attr('opacity', 0.5);
            }

            // Label X bawah
            if (i === cols.length - 1) {
                g.append('text')
                    .attr('x', size / 2)
                    .attr('y', size + 12)
                    .attr('text-anchor', 'middle')
                    .style('font-size', '10px')
                    .text(colsDisplayName[cols[j]]);
            }

            // Label Y kiri
            if (j === 0) {
                g.append('text')
                    .attr('x', -8)
                    .attr('y', size / 2)
                    .attr('text-anchor', 'end')
                    .attr('alignment-baseline', 'middle')
                    .style('font-size', '10px')
                    .text(colsDisplayName[cols[i]]);
            }
        }
    }
}

