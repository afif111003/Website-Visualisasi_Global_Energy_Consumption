// Global vars khusus boxplot
let boxPlotSvg;
let boxPlotXScale, boxPlotYScale;
let boxPlotWidth, boxPlotHeight;

function initBoxPlot() {
    const margin = { top: 40, right: 30, bottom: 70, left: 80 };
    boxPlotWidth = 900 - margin.left - margin.right;
    boxPlotHeight = 500 - margin.top - margin.bottom;

    boxPlotSvg = d3.select('#boxPlot')
        .append('svg')
        .attr('width', boxPlotWidth + margin.left + margin.right)
        .attr('height', boxPlotHeight + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    boxPlotXScale = d3.scaleBand().range([0, boxPlotWidth]).paddingInner(0.3).paddingOuter(0.2);
    boxPlotYScale = d3.scaleLinear().range([boxPlotHeight, 0]);

    boxPlotSvg.append('g').attr('class', 'x-axis').attr('transform', `translate(0,${boxPlotHeight})`);
    boxPlotSvg.append('g').attr('class', 'y-axis');

    updateBoxPlot();
}

function updateBoxPlot() {
    let selectedCountry = d3.select('#boxplotCountrySearch').property('value') || 'China';

    const filteredData = data.filter(d => d.Country === selectedCountry && !isNaN(d['Carbon Emissions (Million Tons)']));

    const yearGrouped = d3.groups(filteredData, d => d.Year);

    const boxData = yearGrouped.map(([year, values]) => {
        const emissions = values.map(d => d['Carbon Emissions (Million Tons)']).sort(d3.ascending);
        const q1 = d3.quantile(emissions, 0.25);
        const median = d3.quantile(emissions, 0.5);
        const q3 = d3.quantile(emissions, 0.75);
        const iqr = q3 - q1;
        const min = d3.max([d3.min(emissions), q1 - 1.5 * iqr]);
        const max = d3.min([d3.max(emissions), q3 + 1.5 * iqr]);
        const outliers = emissions.filter(v => v < min || v > max);

        return { year: +year, q1, median, q3, min, max, outliers };
    }).sort((a, b) => a.year - b.year);

    boxPlotXScale.domain(boxData.map(d => d.year));
    boxPlotYScale.domain([0, d3.max(boxData, d => d.max) * 1.1]);

    boxPlotSvg.select('.x-axis')
        .transition().duration(1000)
        .call(d3.axisBottom(boxPlotXScale).tickFormat(d3.format('d')))
        .selectAll('text')
        .attr('transform', 'rotate(45)')
        .style('text-anchor', 'start');

    boxPlotSvg.select('.y-axis')
        .transition().duration(1000)
        .call(d3.axisLeft(boxPlotYScale).ticks(8));

    const boxGroups = boxPlotSvg.selectAll('.box-group')
        .data(boxData, d => d.year);

    const boxGroupsEnter = boxGroups.enter()
        .append('g')
        .attr('class', 'box-group');

    boxGroupsEnter.append('line') // Whiskers
        .attr('class', 'whisker')
        .attr('x1', d => boxPlotXScale(d.year) + boxPlotXScale.bandwidth() / 2)
        .attr('x2', d => boxPlotXScale(d.year) + boxPlotXScale.bandwidth() / 2)
        .attr('y1', d => boxPlotYScale(d.min))
        .attr('y2', d => boxPlotYScale(d.max))
        .attr('stroke', 'black')
        .attr('stroke-width', 1.5);

    boxGroupsEnter.append('rect') // Box Q1-Q3
        .attr('x', d => boxPlotXScale(d.year))
        .attr('width', boxPlotXScale.bandwidth())
        .attr('y', d => boxPlotYScale(d.q3))
        .attr('height', d => Math.max(1, boxPlotYScale(d.q1) - boxPlotYScale(d.q3)))
        .attr('fill', colors.accent)
        .attr('opacity', 0.6);

    boxGroupsEnter.append('line') // Median line
        .attr('x1', d => boxPlotXScale(d.year))
        .attr('x2', d => boxPlotXScale(d.year) + boxPlotXScale.bandwidth())
        .attr('y1', d => boxPlotYScale(d.median))
        .attr('y2', d => boxPlotYScale(d.median))
        .attr('stroke', 'white')
        .attr('stroke-width', 2);

    boxGroups.merge(boxGroupsEnter);

    boxGroups.exit().remove();

    const outliers = boxPlotSvg.selectAll('.outlier')
        .data(boxData.flatMap(d => d.outliers.map(v => ({ year: d.year, value: v }))), d => `${d.year}-${d.value}`);

    outliers.enter()
        .append('circle')
        .attr('class', 'outlier')
        .attr('cx', d => boxPlotXScale(d.year) + boxPlotXScale.bandwidth() / 2)
        .attr('cy', d => boxPlotYScale(d.value))
        .attr('r', 3)
        .attr('fill', colors.main)
        .attr('opacity', 0.8);

    outliers.exit().remove();

    // Title update
    boxPlotSvg.selectAll('.boxplot-title').remove();
    boxPlotSvg.append('text')
        .attr('class', 'boxplot-title')
        .attr('x', boxPlotWidth / 2)
        .attr('y', -20)
        .attr('text-anchor', 'middle')
        .style('font-size', '18px')
        .style('font-weight', 'bold')
        .text(`Distribusi Emisi Karbon ${selectedCountry} (2000–2024)`);

    // --- Membuat kesimpulan grafik ---
    const countryEmissions = filteredData.sort((a, b) => d3.ascending(a.Year, b.Year));

    const medians = [];
    for (let year = 2000; year <= 2024; year++) {
        const yearData = countryEmissions.filter(d => d.Year === year);
        if (yearData.length > 0) {
            const median = d3.median(yearData, d => d['Carbon Emissions (Million Tons)']);
            medians.push({ year, median });
        }
    }

    let trend = 0;
    for (let i = 1; i < medians.length; i++) {
        trend += (medians[i].median - medians[i - 1].median);
    }

    let conclusion = '';
    if (trend > 200) {
        conclusion = "Distribusi emisi karbon menunjukkan tren kenaikan.";
    } else if (trend < -200) {
        conclusion = "Distribusi emisi karbon menunjukkan tren penurunan.";
    } else {
        let fluctuation = 0;
        for (let i = 1; i < medians.length; i++) {
            fluctuation += Math.abs(medians[i].median - medians[i - 1].median);
        }
        if (fluctuation > 3000) {
            conclusion = "Distribusi emisi karbon sangat fluktuatif.";
        } else {
            conclusion = "Distribusi emisi karbon relatif stabil.";
        }
    }

    // Tampilkan kesimpulan
    d3.select('#boxplot-insight').html(`
        <h5 class="mt-3">Selected Country: ${selectedCountry}</h5>
        <p>${conclusion}</p>
    `);

    boxPlotSvg.selectAll('.box-group rect')
        .attr('fill', colors.accent)
        .attr('opacity', 0.6);

    // Highlight box di tahun yang aktif (latestYear)
    boxPlotSvg.selectAll('.box-group')
        .filter(d => d.year === latestYear)
        .select('rect')
        .transition()
        .duration(500)
        .attr('fill', colors.green)
        .attr('opacity', 1);
}

