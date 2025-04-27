let hBarChartSvg;
let hBarXScale, hBarYScale, hBarColorScale;
let hBarWidth, hBarHeight;

function initDotChart() {
    // Set up dimensions
    const margin = { top: 30, right: 120, bottom: 30, left: 150 };
    hBarWidth = 800 - margin.left - margin.right;
    hBarHeight = 400 - margin.top - margin.bottom;

    // Create SVG container
    hBarChartSvg = d3.select('#dotChart')
        .append('svg')
        .attr('width', hBarWidth + margin.left + margin.right)
        .attr('height', hBarHeight + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    // Create scales
    hBarXScale = d3.scaleLinear().range([0, hBarWidth]);
    hBarYScale = d3.scaleBand().range([0, hBarHeight]).padding(0.2);

    // Color scale
    hBarColorScale = d3.scaleSequential().interpolator(d3.interpolatePlasma);

    // Create axes
    hBarChartSvg.append('g')
        .attr('class', 'x-axis')
        .attr('transform', `translate(0,${hBarHeight})`);

    hBarChartSvg.append('g')
        .attr('class', 'y-axis');

    // Add group for average line and label
    hBarChartSvg.append('g')
        .attr('class', 'average-line');

    // Add tooltip container if not already created
    if (d3.select('.tooltip').empty()) {
        d3.select('body')
            .append('div')
            .attr('class', 'tooltip')
            .style('opacity', 0);
    }

    // Country search (update opacity of dots + labels)
    d3.select('#countrySearch').on('input', function () {
        const searchTerm = this.value.toLowerCase();

        // Highlight matching countries (dots & labels)
        hBarChartSvg.selectAll('.dot')
            .style('opacity', d => 
                d.Country.toLowerCase().includes(searchTerm) ? 1 : 0.3);

        hBarChartSvg.selectAll('.value-label')
            .style('opacity', d =>
                d.Country.toLowerCase().includes(searchTerm) ? 1 : 0.3);
    });

    // Clean leftover elements from bar mode (just in case)
    hBarChartSvg.selectAll('.bar, .ratio-label').remove();

    // Initial draw
    updateDotChart();
}


function updateDotChart() {
    // Filter tertinggi per negara
    const latestFiltered = data.filter(d => d.Year === latestYear && !isNaN(d['Per Capita Energy Use (kWh)']));

    // Ambil entri tertinggi per negara
    const uniquePerCountry = new Map();
    latestFiltered.forEach(d => {
        if (!uniquePerCountry.has(d.Country) || d['Per Capita Energy Use (kWh)'] > uniquePerCountry.get(d.Country)['Per Capita Energy Use (kWh)']) {
            uniquePerCountry.set(d.Country, d);
        }
    });

    // Ambil 10 tertinggi, urutan penting untuk yScale!
    const filteredData = Array.from(uniquePerCountry.values())
        .sort((a, b) => b['Per Capita Energy Use (kWh)'] - a['Per Capita Energy Use (kWh)'])
        .slice(0, 10);

    // FIXED: skala Y **wajib berdasarkan hasil sort terbaru**
    hBarYScale.domain(filteredData.map(d => d.Country));

    const globalAvg = d3.mean(Array.from(uniquePerCountry.values()), d => d['Per Capita Energy Use (kWh)']);

    hBarXScale.domain([0, d3.max(filteredData, d => +d['Per Capita Energy Use (kWh)']) * 1.1]);
    hBarYScale.domain(filteredData.map(d => d.Country));
    hBarColorScale.domain([0, filteredData.length - 1]);

    hBarChartSvg.select('.x-axis')
        .transition().duration(1000)
        .call(d3.axisBottom(hBarXScale).ticks(5).tickFormat(d => d3.format(',')(d)));

    hBarChartSvg.select('.y-axis')
        .transition().duration(1000)
        .call(d3.axisLeft(hBarYScale));

    // Garis horizontal (hlines)
    const lines = hBarChartSvg.selectAll('.dot-line')
        .data(filteredData, d => d.Country);

    lines.enter()
        .append('line')
        .attr('class', 'dot-line')
        .attr('y1', d => hBarYScale(d.Country) + hBarYScale.bandwidth() / 2)
        .attr('y2', d => hBarYScale(d.Country) + hBarYScale.bandwidth() / 2)
        .attr('x1', 0)
        .attr('x2', d => hBarXScale(d['Per Capita Energy Use (kWh)']))
        .attr('stroke', '#ccc')
        .attr('stroke-dasharray', '4,3')
        .merge(lines)
        .transition()
        .duration(1000)
        .attr('x2', d => hBarXScale(d['Per Capita Energy Use (kWh)']))
        .attr('y1', d => hBarYScale(d.Country) + hBarYScale.bandwidth() / 2)
        .attr('y2', d => hBarYScale(d.Country) + hBarYScale.bandwidth() / 2);

    lines.exit().remove();

    // Titik utama (circle)
    const circles = hBarChartSvg.selectAll('.dot')
        .data(filteredData, d => d.Country);

    circles.enter()
        .append('circle')
        .attr('class', 'dot')
        .attr('cy', d => hBarYScale(d.Country) + hBarYScale.bandwidth() / 2)
        .attr('cx', 0)
        .attr('r', 6)
        .attr('fill', (d, i) => hBarColorScale(i))
        .attr('opacity', 0.8)
        .on('mouseover', function(event, d) {
            tooltip.transition().duration(200).style('opacity', .9);
            const ratio = d['Per Capita Energy Use (kWh)'] / globalAvg;
            tooltip.html(`
                <strong>${d.Country}</strong><br/>
                Per Capita: ${d3.format(',')(Math.round(d['Per Capita Energy Use (kWh)']))} kWh<br/>
                ${ratio.toFixed(1)}x rata-rata global
            `)
                .style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY - 28) + 'px');
        })
        .on('mouseout', function() {
            tooltip.transition().duration(500).style('opacity', 0);
        })
        .merge(circles)
        .transition()
        .duration(1000)
        .attr('cx', d => hBarXScale(d['Per Capita Energy Use (kWh)']))
        .attr('cy', d => hBarYScale(d.Country) + hBarYScale.bandwidth() / 2);

    circles.exit().remove();

    // Label angka di kanan titik
    const valueLabels = hBarChartSvg.selectAll('.value-label')
        .data(filteredData, d => d.Country);

    valueLabels.enter()
        .append('text')
        .attr('class', 'value-label')
        .attr('y', d => hBarYScale(d.Country) + hBarYScale.bandwidth() / 2)
        .attr('x', d => hBarXScale(d['Per Capita Energy Use (kWh)']) + 8)
        .attr('dy', '.35em')
        .style('font-size', '11px')
        .text(d => {
            const val = d3.format(',')(Math.round(d['Per Capita Energy Use (kWh)']));
            const ratio = (d['Per Capita Energy Use (kWh)'] / globalAvg).toFixed(1);
            return `${val} kWh (${ratio}x)`;
        })
        .merge(valueLabels)
        .transition()
        .duration(1000)
        .attr('y', d => hBarYScale(d.Country) + hBarYScale.bandwidth() / 2)
        .attr('x', d => hBarXScale(d['Per Capita Energy Use (kWh)']) + 8)
        .tween("text", function(d) {
            const that = d3.select(this);
            const i = d3.interpolateNumber(
                parseFloat((that.text() || "0").replace(/[^\d.]/g, '')),
                d['Per Capita Energy Use (kWh)']
            );
            return function(t) {
                const val = d3.format(',')(Math.round(i(t)));
                const ratio = (d['Per Capita Energy Use (kWh)'] / globalAvg).toFixed(1);
                that.text(`${val} kWh (${ratio}x)`);
            };
        });

    valueLabels.exit().remove();

    // Global average line
    const avgLine = hBarChartSvg.select('.average-line');

    avgLine.selectAll('.avg-line')
        .data([globalAvg])
        .join(
            enter => enter.append('line')
                .attr('class', 'avg-line')
                .attr('x1', d => hBarXScale(d))
                .attr('x2', d => hBarXScale(d))
                .attr('y1', 0)
                .attr('y2', hBarHeight)
                .attr('stroke', 'orangered')
                .attr('stroke-width', 2)
                .attr('stroke-dasharray', '5,5')
                .attr('opacity', 0)
                .transition()
                .duration(1000)
                .attr('opacity', 1),
            update => update.transition().duration(1000)
                .attr('x1', d => hBarXScale(d))
                .attr('x2', d => hBarXScale(d)),
            exit => exit.remove()
        );

    avgLine.selectAll('.avg-label')
        .data([globalAvg])
        .join(
            enter => enter.append('text')
                .attr('class', 'avg-label')
                .attr('x', d => hBarXScale(d) + 5)
                .attr('y', -10)
                .attr('fill', 'orangered')
                .style('font-size', '12px')
                .text(d => `Rata-rata Global: ${d3.format(',')(Math.round(d))} kWh`)
                .attr('opacity', 0)
                .transition().duration(1000).attr('opacity', 1),
            update => update.transition().duration(1000)
                .attr('x', d => hBarXScale(d) + 5)
                .text(d => `Rata-rata Global: ${d3.format(',')(Math.round(d))} kWh`),
            exit => exit.remove()
        );
}
