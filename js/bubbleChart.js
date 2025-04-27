let bubbleChartSvg;
let bubbleChartXScale, bubbleChartYScale, bubbleChartRadiusScale, bubbleChartColorScale;
let bubbleChartXAxis, bubbleChartYAxis;
let bubbleChartWidth, bubbleChartHeight;

function initBubbleChart() {
    // Set up dimensions
    const margin = {top: 40, right: 40, bottom: 60, left: 60};
    bubbleChartWidth = 800 - margin.left - margin.right;
    bubbleChartHeight = 600 - margin.top - margin.bottom;
    
    // Create SVG container
    bubbleChartSvg = d3.select('#bubbleChart')
        .append('svg')
        .attr('width', bubbleChartWidth + margin.left + margin.right)
        .attr('height', bubbleChartHeight + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
        
    // Create scales
    bubbleChartXScale = d3.scaleLinear()
        .range([0, bubbleChartWidth]);
        
    bubbleChartYScale = d3.scaleLog()
        .range([bubbleChartHeight, 0]);
        
    bubbleChartRadiusScale = d3.scaleSqrt()
        .range([4, 40]);
        
    bubbleChartColorScale = d3.scaleOrdinal()
        .domain(Object.keys(regions))
        .range([colors.accent, colors.green, colors.main, '#9C27B0', '#FFC107', '#00BCD4', '#9E9E9E']);
        
    // Create axes
    bubbleChartXAxis = d3.axisBottom(bubbleChartXScale)
        .ticks(5)
        .tickFormat(d => d3.format(",")(d));
        
    bubbleChartYAxis = d3.axisLeft(bubbleChartYScale)
        .ticks(5)
        .tickFormat(d => d3.format(",")(d));
    
    // Add axes to SVG
    bubbleChartSvg.append('g')
        .attr('class', 'x-axis')
        .attr('transform', `translate(0,${bubbleChartHeight})`);
        
    bubbleChartSvg.append('g')
        .attr('class', 'y-axis');
        
    // Add labels
    bubbleChartSvg.append('text')
        .attr('class', 'x-label')
        .attr('text-anchor', 'middle')
        .attr('x', bubbleChartWidth/2)
        .attr('y', bubbleChartHeight + 40)
        .text('Konsumsi Energi Per Kapita (kWh)');
        
    bubbleChartSvg.append('text')
        .attr('class', 'y-label')
        .attr('text-anchor', 'middle')
        .attr('transform', 'rotate(-90)')
        .attr('x', -bubbleChartHeight/2)
        .attr('y', -40)
        .text('Total Konsumsi Energi (TWh)');
        
    // Create tooltip
    const tooltip = d3.select('body')
        .append('div')
        .attr('class', 'tooltip')
        .style('opacity', 0);
        
    // Add legend
    const legend = bubbleChartSvg.append('g')
        .attr('class', 'legend')
        .attr('transform', `translate(${bubbleChartWidth - 150}, 20)`);
        
    const legendItems = legend.selectAll('.legend-item')
        .data(Object.keys(regions))
        .enter()
        .append('g')
        .attr('class', 'legend-item')
        .attr('transform', (d, i) => `translate(0, ${i * 20})`);
        
    legendItems.append('rect')
        .attr('width', 15)
        .attr('height', 15)
        .attr('fill', d => bubbleChartColorScale(d));
        
    legendItems.append('text')
        .attr('x', 20)
        .attr('y', 12)
        .text(d => d)
        .style('font-size', '12px');
        
    // Initial update
    updateBubbleChart();
    
    // Add event listeners
    d3.select('#regionFilter').on('change', function() {
        const selectedRegion = this.value;
        filterByRegion(selectedRegion);
        updateBubbleChart();
    });
    
    d3.select('#sizeMetric').on('change', updateBubbleChart);
}

function filterByRegion(region) {
    if (region === 'all') {
        data = [...originalData]; // Reset to original data
    } else {
        data = originalData.filter(d => d.Region === region);
    }
}

function updateBubbleChart() {
    // Filter data for latest year
    const latestData = data.filter(d => d.Year === latestYear);
    
    // Get size metric
    const sizeMetric = d3.select('#sizeMetric').property('value');
    const sizeField = sizeMetric === 'total' ? 
        'Total Energy Consumption (TWh)' : 'Per Capita Energy Use (kWh)';
    
    // Update scales
    bubbleChartXScale.domain([0, d3.max(latestData, d => d['Per Capita Energy Use (kWh)'])]);
    bubbleChartYScale.domain([100, d3.max(latestData, d => d['Total Energy Consumption (TWh)'])]);
    bubbleChartRadiusScale.domain([0, d3.max(latestData, d => d[sizeField])]);
    
    // Update axes
    bubbleChartSvg.select('.x-axis')
        .transition()
        .duration(1000)
        .call(bubbleChartXAxis);
        
    bubbleChartSvg.select('.y-axis')
        .transition()
        .duration(1000)
        .call(bubbleChartYAxis);
    
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
            Per Capita: ${d3.format(',')(Math.round(d['Per Capita Energy Use (kWh)']))} kWh<br/>
            Total: ${d3.format(',')(Math.round(d['Total Energy Consumption (TWh)']))} TWh
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
    d3.select('#bubbleChart').on('click', function() {
        resetHighlight();
    });
    
    // Data join for circles
    const circles = bubbleChartSvg.selectAll('circle')
        .data(latestData, d => d.Country);
    
    // Enter
    circles.enter()
        .append('circle')
        .attr('r', 0)
        .attr('cx', d => bubbleChartXScale(d['Per Capita Energy Use (kWh)']))
        .attr('cy', d => bubbleChartYScale(d['Total Energy Consumption (TWh)']))
        .attr('fill', d => bubbleChartColorScale(d.Region))
        .attr('stroke', 'white')
        .attr('stroke-width', 1)
        .attr('opacity', 0.7)
        .on('mouseover', mouseover)
        .on('mouseout', mouseout)
        .on('click', click)
        .transition()
        .duration(1000)
        .attr('r', d => bubbleChartRadiusScale(d[sizeField]));
    
    // Update
    circles.transition()
        .duration(1000)
        .attr('cx', d => bubbleChartXScale(d['Per Capita Energy Use (kWh)']))
        .attr('cy', d => bubbleChartYScale(d['Total Energy Consumption (TWh)']))
        .attr('r', d => bubbleChartRadiusScale(d[sizeField]));
    
    // Exit
    circles.exit()
        .transition()
        .duration(500)
        .attr('r', 0)
        .remove();
        
    // Label top 10 countries
    const labels = bubbleChartSvg.selectAll('.country-label')
        .data(latestData.sort((a, b) => b['Total Energy Consumption (TWh)'] - a['Total Energy Consumption (TWh)']).slice(0, 10), 
              d => d.Country);
    
    // Enter labels
    labels.enter()
        .append('text')
        .attr('class', 'country-label')
        .attr('x', d => bubbleChartXScale(d['Per Capita Energy Use (kWh)']) + 5)
        .attr('y', d => bubbleChartYScale(d['Total Energy Consumption (TWh)']))
        .attr('dy', '.35em')
        .style('font-size', '10px')
        .style('font-weight', 'bold')
        .text(d => d.Country)
        .style('opacity', 0)
        .transition()
        .duration(1000)
        .style('opacity', 1);
    
    // Update labels
    labels.transition()
        .duration(1000)
        .attr('x', d => bubbleChartXScale(d['Per Capita Energy Use (kWh)']) + 5)
        .attr('y', d => bubbleChartYScale(d['Total Energy Consumption (TWh)']));
    
    // Exit labels
    labels.exit()
        .transition()
        .duration(500)
        .style('opacity', 0)
        .remove();
    
    // Update top 5 percentage annotation
    const top5Countries = latestData
        .sort((a, b) => b['Total Energy Consumption (TWh)'] - a['Total Energy Consumption (TWh)'])
        .slice(0, 5);
        
    const top5Consumption = d3.sum(top5Countries, d => d['Total Energy Consumption (TWh)']);
    const totalConsumption = d3.sum(latestData, d => d['Total Energy Consumption (TWh)']);
    const top5Percentage = (top5Consumption / totalConsumption) * 100;
    
    // Remove old annotation
    bubbleChartSvg.selectAll('.top5-annotation').remove();
    
    // Add new annotation
    bubbleChartSvg.append('text')
        .attr('class', 'top5-annotation')
        .attr('x', bubbleChartWidth / 2)
        .attr('y', bubbleChartHeight - 10)
        .attr('text-anchor', 'middle')
        .style('font-size', '12px')
        .style('fill', '#666')
        .text(`5 negara teratas menyumbang ${top5Percentage.toFixed(1)}% dari total konsumsi energi global (${latestYear})`);
}