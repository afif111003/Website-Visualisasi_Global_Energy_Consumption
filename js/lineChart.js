let lineChartSvg;
let lineChartXScale, lineChartYScale;
let lineChartWidth, lineChartHeight;

// Initialize Line Chart
function initLineChart() {
    // Set up dimensions
    const margin = { top: 40, right: 100, bottom: 50, left: 70 };
    lineChartWidth = 800 - margin.left - margin.right;
    lineChartHeight = 400 - margin.top - margin.bottom;

    // Create SVG container
    lineChartSvg = d3.select('#lineChart')
        .append('svg')
        .attr('width', lineChartWidth + margin.left + margin.right)
        .attr('height', lineChartHeight + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    // Create scales
    lineChartXScale = d3.scaleLinear().range([0, lineChartWidth]);
    lineChartYScale = d3.scaleLinear().range([lineChartHeight, 0]);

    // Create axes groups
    lineChartSvg.append('g')
        .attr('class', 'x-axis')
        .attr('transform', `translate(0,${lineChartHeight})`);

    lineChartSvg.append('g')
        .attr('class', 'y-axis');

    // Initial update
    updateLineChart();
}

// Update Line Chart
function updateLineChart() {
    // Prepare global renewable share data
    const yearlyData = d3.rollups(
        data,
        v => d3.mean(v, d => d['Renewable Energy Share (%)']),
        d => d.Year
    ).map(([year, avg]) => ({ Year: +year, AvgRenewable: avg }));

    yearlyData.sort((a, b) => a.Year - b.Year);

    // Update scales
    lineChartXScale.domain(d3.extent(yearlyData, d => d.Year));
    lineChartYScale.domain([0, d3.max(yearlyData, d => d.AvgRenewable) * 1.1]);

    // Update axes
    lineChartSvg.select('.x-axis')
        .transition().duration(1000)
        .call(d3.axisBottom(lineChartXScale).tickFormat(d3.format('d')));

    lineChartSvg.select('.y-axis')
        .transition().duration(1000)
        .call(d3.axisLeft(lineChartYScale).ticks(6).tickFormat(d => d + "%"));

    // Line generator
    const line = d3.line()
        .x(d => lineChartXScale(d.Year))
        .y(d => lineChartYScale(d.AvgRenewable))
        .curve(d3.curveMonotoneX);

    // Draw the line
    const path = lineChartSvg.selectAll('.line-path')
        .data([yearlyData]);

    path.enter()
        .append('path')
        .attr('class', 'line-path')
        .merge(path)
        .transition()
        .duration(1000)
        .attr('d', line)
        .attr('fill', 'none')
        .attr('stroke', 'seagreen')
        .attr('stroke-width', 2.5);

    path.exit().remove();

    // Clear old highlights and texts
    lineChartSvg.selectAll('.highlight-dot').remove();
    lineChartSvg.selectAll('.highlight-label').remove();
    lineChartSvg.selectAll('.comparison-text').remove();
    lineChartSvg.selectAll('.line-title').remove();

    // Add title
    lineChartSvg.append('text')
        .attr('class', 'line-title')
        .attr('y', -20)
        .attr('x', lineChartWidth / 2)
        .attr('text-anchor', 'middle')
        .style('font-size', '16px')
        .style('font-weight', 'bold')
        .text(`Global Renewable Energy Trend (up to ${latestYear})`);

    // Highlight selected year
    const selectedYear = +d3.select('#lineYearSelect').property('value');
    const thisYearData = yearlyData.find(d => d.Year === selectedYear);
    const fiveYearsAgoData = yearlyData.find(d => d.Year === selectedYear - 5);

    if (thisYearData) {
        // Add dot
        lineChartSvg.append('circle')
            .attr('class', 'highlight-dot')
            .attr('cx', lineChartXScale(thisYearData.Year))
            .attr('cy', lineChartYScale(thisYearData.AvgRenewable))
            .attr('r', 5)
            .attr('fill', 'orangered');

        // Add label
        lineChartSvg.append('text')
            .attr('class', 'highlight-label')
            .attr('x', lineChartXScale(thisYearData.Year) + 8)
            .attr('y', lineChartYScale(thisYearData.AvgRenewable))
            .attr('fill', 'orangered')
            .style('font-weight', 'bold')
            .style('font-size', '12px')
            .text(`${thisYearData.AvgRenewable.toFixed(1)}%`);
    }

    // Add trend comparison below chart
    const infoContainer = d3.select('#lineTrendInfo');

    if (thisYearData && fiveYearsAgoData) {
        const diff = thisYearData.AvgRenewable - fiveYearsAgoData.AvgRenewable;
        const trend = diff >= 0 ? 'increased' : 'decreased';
        const diffFormatted = Math.abs(diff).toFixed(1);

        infoContainer.html(`
            <strong>Selected Year: ${selectedYear}</strong><br/>
            Renewable Share: ${thisYearData.AvgRenewable.toFixed(1)}%<br/>
            Change over last 5 years: ${trend} by ${diffFormatted}%
        `);
    } else {
        infoContainer.html(`
            <strong>Selected Year: ${selectedYear}</strong><br/>
            No complete data for comparison.
        `);
    }
}