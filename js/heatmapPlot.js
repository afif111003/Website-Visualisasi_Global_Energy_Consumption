// Global vars khusus heatmap plot
let heatmapSvg;
let heatmapXScale, heatmapYScale;
let heatmapWidth, heatmapHeight;
let selectedHeatmapYear;
let selectedHeatmapRegion = "All Regions";

const heatmapColorScale = d3.scaleSequential()
    .domain([-1, 1])
    .interpolator(d3.interpolateCool);

function initHeatmapPlot() {
    const margin = { top: 60, right: 30, bottom: 70, left: 70 };
    heatmapWidth = 700 - margin.left - margin.right;
    heatmapHeight = 600 - margin.top - margin.bottom;

    heatmapSvg = d3.select('#heatmapPlot')
        .append('svg')
        .attr('width', heatmapWidth + margin.left + margin.right)
        .attr('height', heatmapHeight + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    heatmapXScale = d3.scaleBand()
        .range([0, heatmapWidth])
        .padding(0.05);

    heatmapYScale = d3.scaleBand()
        .range([heatmapHeight, 0])
        .padding(0.05);

    heatmapSvg.append('g').attr('class', 'x-axis');
    heatmapSvg.append('g').attr('class', 'y-axis');

    // Default: tahun terbaru
    selectedHeatmapYear = latestYear;
    d3.select('#heatmapYearSelect').property('value', selectedHeatmapYear);
    d3.select('#selectedHeatmapYear').text(selectedHeatmapYear);

    // Listener: tahun
    d3.select('#heatmapYearSelect').on('input', function() {
        selectedHeatmapYear = +this.value;
        d3.select('#selectedHeatmapYear').text(selectedHeatmapYear);
        updateHeatmapPlot();
    });

    // Listener: region
    d3.select('#regionSelect').on('change', function() {
        selectedHeatmapRegion = this.value;
        updateHeatmapPlot();
    });

    updateHeatmapPlot();
}

function updateHeatmapPlot() {
    const selectedYear = +d3.select('#heatmapYearSelect').property('value');
    d3.select('#selectedHeatmapYear').text(selectedYear);

    let yearData = originalData.filter(d => d.Year === selectedYear);

    if (selectedHeatmapRegion !== "All Regions") {
        yearData = yearData.filter(d => d.Region === selectedHeatmapRegion);
    }

    const cols = [
        'Per Capita Energy Use (kWh)',
        'Total Energy Consumption (TWh)',
        'Carbon Emissions (Million Tons)',
        'Renewable Energy Share (%)',
        'Fossil Fuel Dependency (%)'
    ];

    const labelMapping = {
        'Per Capita Energy Use (kWh)': 'Per Capita',
        'Total Energy Consumption (TWh)': 'Total Cons.',
        'Carbon Emissions (Million Tons)': 'CO₂ Emission',
        'Renewable Energy Share (%)': 'Renew. Share',
        'Fossil Fuel Dependency (%)': 'Fossil Dep.'
    };

    const matrixData = [];

    for (let i = 0; i < cols.length; i++) {
        for (let j = 0; j < cols.length; j++) {
            const x = cols[i];
            const y = cols[j];

            const validPairs = yearData.filter(d => !isNaN(d[x]) && !isNaN(d[y]));
            const valuesX = validPairs.map(d => d[x]);
            const valuesY = validPairs.map(d => d[y]);

            const corr = (valuesX.length > 1 && valuesY.length > 1) ? d3.correlation(valuesX, valuesY) : 0;

            matrixData.push({ x, y, value: corr });
        }
    }

    // Update scales
    heatmapXScale.domain(cols);
    heatmapYScale.domain(cols);

    heatmapSvg.select('.x-axis')
        .attr('transform', `translate(0,${heatmapHeight})`)
        .transition().duration(750)
        .call(d3.axisBottom(heatmapXScale).tickFormat(d => labelMapping[d] || d).tickSize(0))
        .selectAll('text')
        .attr('transform', 'rotate(-45)')
        .style('text-anchor', 'end');


    heatmapSvg.select('.y-axis')
        .transition().duration(750)
        .call(d3.axisLeft(heatmapYScale).tickFormat(d => labelMapping[d] || d).tickSize(0));

    // Data join untuk kotak heatmap
    const squares = heatmapSvg.selectAll('rect')
        .data(matrixData, d => d.x + '-' + d.y);

    squares.enter()
        .append('rect')
        .attr('x', d => heatmapXScale(d.x))
        .attr('y', d => heatmapYScale(d.y))
        .attr('width', heatmapXScale.bandwidth())
        .attr('height', heatmapYScale.bandwidth())
        .style('fill', d => heatmapColorScale(d.value))
        .style('stroke', 'white')
        .style('stroke-width', 1)
        .merge(squares)
        .transition().duration(750)
        .style('fill', d => heatmapColorScale(d.value));

    squares.exit().remove();

    // Update title
    heatmapSvg.selectAll('.heatmap-title').remove();
    heatmapSvg.append('text')
        .attr('class', 'heatmap-title')
        .attr('x', heatmapWidth / 2)
        .attr('y', -30)
        .attr('text-anchor', 'middle')
        .style('font-size', '18px')
        .style('font-weight', 'bold')
        .text(`Korelasi Indikator Energi Tahun ${selectedYear}`);

    // Data join untuk angka korelasi
    const texts = heatmapSvg.selectAll('.heatmap-text')
        .data(matrixData, d => d.x + '-' + d.y);

    texts.enter()
        .append('text')
        .attr('class', 'heatmap-text')
        .attr('x', d => heatmapXScale(d.x) + heatmapXScale.bandwidth() / 2)
        .attr('y', d => heatmapYScale(d.y) + heatmapYScale.bandwidth() / 2)
        .attr('dy', '0.35em')
        .attr('text-anchor', 'middle')
        .style('font-size', '10px')
        .style('fill', 'black')
        .text(d => d.value.toFixed(2))
        .merge(texts)
        .transition()
        .duration(750)
        .attr('x', d => heatmapXScale(d.x) + heatmapXScale.bandwidth() / 2)
        .attr('y', d => heatmapYScale(d.y) + heatmapYScale.bandwidth() / 2)
        .text(d => d.value.toFixed(2));

        texts.exit().remove();
}
