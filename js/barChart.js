let barChartSvg;
let barChartXScale, barChartYScale, barChartColorScale;
let barChartWidth, barChartHeight;

function initBarChart() {
    // Ukuran chart
    const margin = {top: 40, right: 20, bottom: 80, left: 60};
    barChartWidth = 800 - margin.left - margin.right;
    barChartHeight = 400 - margin.top - margin.bottom;

    // Buat SVG container
    barChartSvg = d3.select('#barChart')
        .append('svg')
        .attr('width', barChartWidth + margin.left + margin.right)
        .attr('height', barChartHeight + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    // Skala
    barChartXScale = d3.scaleBand()
        .range([0, barChartWidth])
        .padding(0.1);

    barChartYScale = d3.scaleLinear()
        .range([barChartHeight, 0]);

    barChartColorScale = d3.scaleSequential()
        .interpolator(d3.interpolateViridis);

    // Axis
    barChartSvg.append('g')
        .attr('class', 'x-axis')
        .attr('transform', `translate(0,${barChartHeight})`);

    barChartSvg.append('g')
        .attr('class', 'y-axis');

    // Label axis
    barChartSvg.append('text')
        .attr('class', 'x-label')
        .attr('text-anchor', 'middle')
        .attr('x', barChartWidth/2)
        .attr('y', barChartHeight + 60)
        .text('Negara');

    barChartSvg.append('text')
        .attr('class', 'y-label')
        .attr('text-anchor', 'middle')
        .attr('transform', 'rotate(-90)')
        .attr('x', -barChartHeight/2)
        .attr('y', -40)
        .text('Total Konsumsi Energi (TWh)');

    // Tooltip
    const tooltip = d3.select('body')
        .append('div')
        .attr('class', 'tooltip')
        .style('opacity', 0);

    // Pertama kali update chart
    updateBarChart();

    // Ganti metrik
    d3.select('#metricSelect').on('change', updateBarChart);
}

function updateBarChart() {
    const metric = d3.select('#metricSelect').property('value');
    let fieldName, labelText;

    switch(metric) {
        case 'capita':
            fieldName = 'Per Capita Energy Use (kWh)';
            labelText = 'Konsumsi Energi Per Kapita (kWh)';
            break;
        case 'renewable':
            fieldName = 'Renewable Energy Share (%)';
            labelText = 'Persentase Energi Terbarukan (%)';
            break;
        default:
            fieldName = 'Total Energy Consumption (TWh)';
            labelText = 'Total Konsumsi Energi (TWh)';
    }

    barChartSvg.select('.y-label').text(labelText);

    const latestDataMap = new Map();
    data.filter(d => d.Year === latestYear).forEach(d => {
        if (!latestDataMap.has(d.Country) || d[fieldName] > latestDataMap.get(d.Country)[fieldName]) {
            latestDataMap.set(d.Country, d);
        }
    });

    const latestData = Array.from(latestDataMap.values())
        .sort((a, b) => b[fieldName] - a[fieldName])
        .slice(0, 5);

    const total = d3.sum(latestData, d => d[fieldName]);

    barChartXScale.domain(latestData.map(d => d.Country));
    barChartYScale.domain([0, d3.max(latestData, d => d[fieldName]) * 1.1]);
    barChartColorScale.domain([0, latestData.length - 1]);

    barChartSvg.select('.x-axis')
        .transition()
        .duration(1000)
        .call(d3.axisBottom(barChartXScale))
        .selectAll('text')
        .attr('transform', 'rotate(-45)')
        .style('text-anchor', 'end');

    barChartSvg.select('.y-axis')
        .transition()
        .duration(1000)
        .call(d3.axisLeft(barChartYScale).ticks(5).tickFormat(d => d3.format(",")(d)));

    const tooltip = d3.select('.tooltip');

    const mouseover = function(event, d) {
        d3.select(this)
            .transition()
            .duration(200)
            .attr('opacity', 1);

        tooltip.transition()
            .duration(200)
            .style('opacity', .9);

        tooltip.html(`
            <strong>${d.Country}</strong><br/>
            ${labelText}: ${d3.format(',')(Math.round(d[fieldName]))}${metric === 'renewable' ? '%' : ''}<br/>
            Persentase dari total: ${((d[fieldName] / total) * 100).toFixed(1)}%
        `)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 28) + 'px');
    };

    const mouseout = function() {
        d3.select(this)
            .transition()
            .duration(200)
            .attr('opacity', 0.7);

        tooltip.transition()
            .duration(500)
            .style('opacity', 0);
    };

    const click = function(event, d) {
        event.stopPropagation();
        highlightCountry(d.Country);
    };

    d3.select('#barChart').on('click', function() {
        resetHighlight();
    });

    const bars = barChartSvg.selectAll('.bar')
        .data(latestData, d => d.Country);

    const barsEnter = bars.enter()
        .append('rect')
        .attr('class', 'bar')
        .attr('x', d => barChartXScale(d.Country))
        .attr('width', barChartXScale.bandwidth())
        .attr('y', barChartHeight)
        .attr('height', 0)
        .attr('fill', (d, i) => d3.interpolateViridis(i / (latestData.length - 1)))
        .attr('opacity', 0.7)
        .on('mouseover', mouseover)
        .on('mouseout', mouseout)
        .on('click', click);

    barsEnter.merge(bars)
        .transition()
        .duration(1000)
        .attr('x', d => barChartXScale(d.Country))
        .attr('width', barChartXScale.bandwidth())
        .attr('y', d => barChartYScale(d[fieldName]))
        .attr('height', d => barChartHeight - barChartYScale(d[fieldName]))
        .attr('fill', (d, i) => d3.interpolateViridis(i / (latestData.length - 1)));

    bars.exit()
        .transition()
        .duration(500)
        .attr('height', 0)
        .attr('y', barChartHeight)
        .remove();

    // Hapus label lama
    barChartSvg.selectAll('.value-label').remove();
    barChartSvg.selectAll('.percent-label').remove();

    // Label nilai (di atas bar)
    barChartSvg.selectAll('.value-label')
        .data(latestData, d => d.Country)
        .enter()
        .append('text')
        .attr('class', 'value-label')
        .attr('text-anchor', 'middle')
        .attr('x', d => barChartXScale(d.Country) + barChartXScale.bandwidth() / 2)
        .attr('y', d => barChartYScale(d[fieldName]) - 10)
        .text(d => {
            const val = d3.format(',')(Math.round(d[fieldName]));
            return `${val}${metric === 'renewable' ? '%' : ' TWh'}`;
        })
        .attr('fill', '#333')
        .attr('font-weight', 'bold')
        .style('font-size', '11px');

    // Label persen (di dalam bar)
    barChartSvg.selectAll('.percent-label')
        .data(latestData, d => d.Country)
        .enter()
        .append('text')
        .attr('class', 'percent-label')
        .attr('text-anchor', 'middle')
        .attr('x', d => barChartXScale(d.Country) + barChartXScale.bandwidth() / 2)
        .attr('y', d => barChartYScale(d[fieldName] * 0.5))
        .text(d => `${((d[fieldName] / total) * 100).toFixed(1)}%`)
        .attr('fill', 'white')
        .attr('font-weight', 'bold')
        .style('font-size', '11px');
}
