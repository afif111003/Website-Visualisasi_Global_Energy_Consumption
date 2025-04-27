let histogramSvg;
let histogramXScale, histogramYScale, histogramColorScale;
let histogramWidth, histogramHeight;

function initHistogram() {
  // Ukuran chart
  const margin = { top: 40, right: 20, bottom: 80, left: 60 };
  histogramWidth = 800 - margin.left - margin.right;
  histogramHeight = 400 - margin.top - margin.bottom;

  // Buat SVG container
  histogramSvg = d3
    .select("#histogram")
    .append("svg")
    .attr("width", histogramWidth + margin.left + margin.right)
    .attr("height", histogramHeight + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // Skala
  histogramXScale = d3.scaleLinear().range([0, histogramWidth]);
  histogramYScale = d3.scaleLinear().range([histogramHeight, 0]);

  // Skala warna untuk bar
  histogramColorScale = d3.scaleSequential().interpolator(d3.interpolateBlues);

  // Axis
  histogramSvg.append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0,${histogramHeight})`);

  histogramSvg.append("g")
    .attr("class", "y-axis");

  // Label axis
  histogramSvg.append("text")
    .attr("class", "x-label")
    .attr("text-anchor", "middle")
    .attr("x", histogramWidth / 2)
    .attr("y", histogramHeight + 60)
    .text("Fossil Fuel Dependency (%)");

  histogramSvg.append("text")
    .attr("class", "y-label")
    .attr("text-anchor", "middle")
    .attr("transform", "rotate(-90)")
    .attr("x", -histogramHeight / 2)
    .attr("y", -40)
    .text("Jumlah Negara");

  // Update pertama kali
  updateHistogram();
}

function updateHistogram() {
  const year = +d3.select("#histogramYearSelect").property("value"); // 🔥 ambil dari slider
  d3.select("#histogramSelectedYear").text(`Selected Year: ${year}`);

  const fossilFuelDependency = data
    .filter((d) => d.Year === year)
    .map((d) => d["Fossil Fuel Dependency (%)"])
    .filter((d) => !isNaN(d));

  if (fossilFuelDependency.length === 0) {
    console.log("No data available for the selected year.");
    return;
  }

  histogramXScale.domain(d3.extent(fossilFuelDependency));
  const histogramBins = d3.histogram()
    .domain(histogramXScale.domain())
    .thresholds(histogramXScale.ticks(20))(fossilFuelDependency);

  histogramYScale.domain([0, d3.max(histogramBins, d => d.length)]);

  histogramSvg.selectAll(".bar").remove();
  histogramSvg.selectAll(".average-line").remove();
  histogramSvg.selectAll(".average-text").remove();

  histogramSvg.select(".x-axis")
    .transition()
    .duration(1000)
    .call(d3.axisBottom(histogramXScale));

  histogramSvg.select(".y-axis")
    .transition()
    .duration(1000)
    .call(
      d3.axisLeft(histogramYScale)
        .ticks(5)
        .tickFormat(d3.format(","))
    );

  const meanValue = d3.mean(fossilFuelDependency);

  const bars = histogramSvg.selectAll(".bar")
    .data(histogramBins);

  bars.enter()
    .append("rect")
    .attr("class", "bar")
    .attr("x", d => histogramXScale(d.x0))
    .attr("width", d => Math.max(0, histogramXScale(d.x1) - histogramXScale(d.x0) - 1))
    .attr("y", histogramHeight)
    .attr("height", 0)
    .attr("fill", (d, i) => histogramColorScale(i / (histogramBins.length - 1)))
    .attr("opacity", 0.7)
    .transition()
    .duration(1000)
    .attr("y", d => histogramYScale(d.length))
    .attr("height", d => histogramHeight - histogramYScale(d.length));

  bars.transition()
    .duration(1000)
    .attr("x", d => histogramXScale(d.x0))
    .attr("width", d => Math.max(0, histogramXScale(d.x1) - histogramXScale(d.x0) - 1))
    .attr("y", d => histogramYScale(d.length))
    .attr("height", d => histogramHeight - histogramYScale(d.length))
    .attr("fill", (d, i) => histogramColorScale(i / (histogramBins.length - 1)));

  bars.exit()
    .transition()
    .duration(500)
    .attr("height", 0)
    .attr("y", histogramHeight)
    .remove();

  histogramSvg.append("line")
    .attr("class", "average-line")
    .attr("x1", histogramXScale(meanValue))
    .attr("x2", histogramXScale(meanValue))
    .attr("y1", 0)
    .attr("y2", histogramHeight)
    .attr("stroke", "red")
    .attr("stroke-dasharray", "5,5")
    .attr("stroke-width", 2);

  histogramSvg.append("text")
    .attr("class", "average-text")
    .attr("x", histogramXScale(meanValue) + 5)
    .attr("y", histogramHeight * 0.9)
    .attr("fill", "red")
    .attr("font-weight", "bold")
    .text(`Rata-rata: ${meanValue.toFixed(1)}%`);
}
