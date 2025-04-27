let scatterPlotSvg;
let scatterXScale, scatterYScale, scatterRadiusScale, scatterColorScale;
let scatterWidth, scatterHeight;

function initScatterPlot() {
    // Set up dimensions
    const margin = {top: 40, right: 90, bottom: 60, left: 60};
    scatterWidth = 800 - margin.left - margin.right;
    scatterHeight = 600 - margin.top - margin.bottom;
    
    // Create SVG container
    scatterPlotSvg = d3.select('#scatterPlot')
        .append('svg')
        .attr('width', scatterWidth + margin.left + margin.right)
        .attr('height', scatterHeight + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
        
    // Create scales
    scatterXScale = d3.scaleLinear()
        .range([0, scatterWidth])
        .domain([-5, 105]);
        
    scatterYScale = d3.scaleLinear()
        .range([scatterHeight, 0])
        .domain([-5, 105]);
        
    scatterRadiusScale = d3.scaleSqrt()
        .range([4, 40]);
        
    scatterColorScale = d3.scaleSequential()
        .interpolator(d3.interpolateViridis)
        .domain([0, 100]);
        
    // Create axes
    const xAxis = d3.axisBottom(scatterXScale);
    const yAxis = d3.axisLeft(scatterYScale);
    
    // Add axes
    scatterPlotSvg.append('g')
        .attr('class', 'x-axis')
        .attr('transform', `translate(0,${scatterHeight})`)
        .call(xAxis);
        
    scatterPlotSvg.append('g')
        .attr('class', 'y-axis')
        .call(yAxis);
        
    // Add axes labels
    scatterPlotSvg.append('text')
        .attr('class', 'x-label')
        .attr('text-anchor', 'middle')
        .attr('x', scatterWidth/2)
        .attr('y', scatterHeight + 40)
        .text('Persentase Energi Terbarukan (%)');
        
    scatterPlotSvg.append('text')
        .attr('class', 'y-label')
        .attr('text-anchor', 'middle')
        .attr('transform', 'rotate(-90)')
        .attr('x', -scatterHeight/2)
        .attr('y', -40)
        .text('Ketergantungan Bahan Bakar Fosil (%)');
        
    // Add quadrant lines
    scatterPlotSvg.append('line')
        .attr('class', 'quadrant-line')
        .attr('x1', scatterXScale(50))
        .attr('x2', scatterXScale(50))
        .attr('y1', 0)
        .attr('y2', scatterHeight)
        .attr('stroke', 'gray')
        .attr('stroke-dasharray', '5,5')
        .attr('opacity', 0.5);
        
    scatterPlotSvg.append('line')
        .attr('class', 'quadrant-line')
        .attr('x1', 0)
        .attr('x2', scatterWidth)
        .attr('y1', scatterYScale(50))
        .attr('y2', scatterYScale(50))
        .attr('stroke', 'gray')
        .attr('stroke-dasharray', '5,5')
        .attr('opacity', 0.5);
        
    // Add quadrant labels
    const quadrantLabels = [
        {text: 'ANOMALI', x: 75, y: 75},
        {text: 'DOMINASI TERBARUKAN', x: 75, y: 25},
        {text: 'DOMINASI FOSIL', x: 25, y: 75},
        {text: 'ENERGI CAMPURAN', x: 25, y: 25}
    ];
    
    scatterPlotSvg.selectAll('.quadrant-label')
        .data(quadrantLabels)
        .enter()
        .append('text')
        .attr('class', 'quadrant-label')
        .attr('x', d => scatterXScale(d.x))
        .attr('y', d => scatterYScale(d.y))
        .attr('text-anchor', 'middle')
        .attr('dy', '.35em')
        .text(d => d.text)
        .attr('fill', '#666')
        .style('font-size', '11px')
        .style('font-weight', 'bold');
        
    // Add color legend
    const legendWidth = 20;
    const legendHeight = 150;
    
    const legendScale = d3.scaleLinear()
        .domain([0, 100])
        .range([legendHeight, 0]);
    
    const legendAxis = d3.axisRight(legendScale)
        .ticks(5);
    
    const legend = scatterPlotSvg.append('g')
        .attr('class', 'legend')
        .attr('transform', `translate(${scatterWidth + 20}, 20)`);
    
    // Create gradient for legend
    const defs = scatterPlotSvg.append('defs');
    
    const linearGradient = defs.append('linearGradient')
        .attr('id', 'scatter-gradient')
        .attr('x1', '0%')
        .attr('y1', '100%')
        .attr('x2', '0%')
        .attr('y2', '0%');
    
    linearGradient.selectAll('stop')
        .data([
            {offset: '0%', color: scatterColorScale(0)},
            {offset: '25%', color: scatterColorScale(25)},
            {offset: '50%', color: scatterColorScale(50)},
            {offset: '75%', color: scatterColorScale(75)},
            {offset: '100%', color: scatterColorScale(100)}
        ])
        .enter().append('stop')
        .attr('offset', d => d.offset)
        .attr('stop-color', d => d.color);
    
    legend.append('rect')
        .attr('width', legendWidth)
        .attr('height', legendHeight)
        .style('fill', 'url(#scatter-gradient)');
    
    legend.append('g')
        .attr('transform', `translate(${legendWidth}, 0)`)
        .call(legendAxis);
    
    legend.append('text')
        .attr('x', legendWidth / 2)
        .attr('y', -10)
        .attr('text-anchor', 'middle')
        .style('font-size', '11px')
        .text('Energi Terbarukan (%)');
        
    // Create tooltip
    const tooltip = d3.select('body')
        .append('div')
        .attr('class', 'tooltip')
        .style('opacity', 0);
        
    // Add event listener
    d3.select('#bubbleSize').on('change', updateScatterPlot);
    
    // Initial update
    updateScatterPlot();
}

function updateScatterPlot() {
    // Get latest year data
    const latestData = data.filter(d => d.Year === latestYear);
    
    // Get bubble size metric
    const sizeMetric = d3.select('#bubbleSize').property('value');
    const sizeField = sizeMetric === 'consumption' ? 
        'Total Energy Consumption (TWh)' : 'Carbon Emissions (Million Tons)';
    
    // Calculate correlation
    const correlation = d3.correlation(
        latestData.map(d => d['Renewable Energy Share (%)']),
        latestData.map(d => d['Fossil Fuel Dependency (%)'])
    );
    
    // Update radius scale
    scatterRadiusScale.domain([0, d3.max(latestData, d => d[sizeField])]);
    
    // Define tooltip behavior
    const tooltip = d3.select('.tooltip');
    
    const mouseover = function(event, d) {
        d3.select(this)
            .transition()
            .duration(200)
            .attr('stroke-width', 3)
            .attr('opacity', 1);
            
        tooltip.transition()
            .duration(200)
            .style('opacity', .9);
            
        tooltip.html(`
            <strong>${d.Country}</strong><br/>
            Region: ${d.Region}<br/>
            Renewable: ${d['Renewable Energy Share (%)'].toFixed(1)}%<br/>
            Fossil: ${d['Fossil Fuel Dependency (%)'].toFixed(1)}%<br/>
            ${sizeMetric === 'consumption' ? 'Total Energy' : 'Carbon Emissions'}: 
            ${d3.format(',')(Math.round(d[sizeField]))} ${sizeMetric === 'consumption' ? 'TWh' : 'Million Tons'}
        `)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 28) + 'px');
    };
    
    const mouseout = function() {
        if (!selectedCountry || selectedCountry !== d3.select(this).datum().Country) {
            d3.select(this)
                .transition()
                .duration(200)
                .attr('stroke-width', 1)
                .attr('opacity', 0.7);
        }
            
        tooltip.transition()
            .duration(500)
            .style('opacity', 0);
    };
    
    const click = function(event, d) {
        event.stopPropagation(); // Prevent bubbling
        highlightCountry(d.Country);
    };
    
    // Background click to reset
    d3.select('#scatterPlot').on('click', function() {
        resetHighlight();
    });
    
    // Update points
    const points = scatterPlotSvg.selectAll('.point')
        .data(latestData, d => d.Country);
        
    // Enter new points
    points.enter()
        .append('circle')
        .attr('class', 'point')
        .attr('cx', d => scatterXScale(d['Renewable Energy Share (%)']))
        .attr('cy', d => scatterYScale(d['Fossil Fuel Dependency (%)']))
        .attr('r', 0)
        .attr('fill', d => scatterColorScale(d['Renewable Energy Share (%)']))
        .attr('stroke', 'white')
        .attr('stroke-width', 1)
        .attr('opacity', 0.7)
        .on('mouseover', mouseover)
        .on('mouseout', mouseout)
        .on('click', click)
        .transition()
        .duration(1000)
        .attr('r', d => scatterRadiusScale(d[sizeField]));
        
    // Update points
    points.transition()
        .duration(1000)
        .attr('cx', d => scatterXScale(d['Renewable Energy Share (%)']))
        .attr('cy', d => scatterYScale(d['Fossil Fuel Dependency (%)']))
        .attr('r', d => scatterRadiusScale(d[sizeField]))
        .attr('fill', d => scatterColorScale(d['Renewable Energy Share (%)']));
        
    // Exit points
    points.exit()
        .transition()
        .duration(500)
        .attr('r', 0)
        .remove();
        
    // Add correlation line
    // Calculate line based on correlation
    const slope = correlation;
    const intercept = 100 - slope * 100; // Intercept at 100% fosil when 0% renewables
    
    const lineData = [
        {x: 0, y: intercept},
        {x: 100, y: intercept + slope * 100}
    ];
    
    const line = d3.line()
        .x(d => scatterXScale(d.x))
        .y(d => scatterYScale(d.y));
        
    // Update correlation line
    scatterPlotSvg.selectAll('.correlation-line')
        .data([lineData])
        .join('path')
        .attr('class', 'correlation-line')
        .attr('d', line)
        .attr('stroke', colors.accent)
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '5,5')
        .attr('fill', 'none');
        
    // Update correlation text
    scatterPlotSvg.selectAll('.correlation-text')
        .data([correlation])
        .join('text')
        .attr('class', 'correlation-text')
        .attr('x', scatterWidth - 10)
        .attr('y', 20)
        .attr('text-anchor', 'end')
        .style('font-size', '12px')
        .text(d => `Korelasi: ${d.toFixed(2)}`);
        
    // Add annotations for top consumers
    const topCountries = latestData
        .sort((a, b) => b[sizeField] - a[sizeField])
        .slice(0, 3);
        
    const countryLabels = scatterPlotSvg.selectAll('.country-label')
        .data(topCountries, d => d.Country);
        
    // Enter country labels
    countryLabels.enter()
        .append('text')
        .attr('class', 'country-label')
        .attr('x', d => scatterXScale(d['Renewable Energy Share (%)']) + 5)
        .attr('y', d => scatterYScale(d['Fossil Fuel Dependency (%)']))
        .attr('dy', '-0.5em')
        .style('font-size', '11px')
        .style('font-weight', 'bold')
        .attr('opacity', 0)
        .text(d => d.Country)
        .transition()
        .duration(1000)
        .attr('opacity', 1);
        
    // Update country labels
    countryLabels.transition()
        .duration(1000)
        .attr('x', d => scatterXScale(d['Renewable Energy Share (%)']) + 5)
        .attr('y', d => scatterYScale(d['Fossil Fuel Dependency (%)']))
        .text(d => d.Country);
        
    // Exit country labels
    countryLabels.exit()
        .transition()
        .duration(500)
        .attr('opacity', 0)
        .remove();
}