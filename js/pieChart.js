let pieChartSvg;
let pieWidth, pieHeight, pieRadius;
let pieGenerator, arcGenerator, labelArcGenerator;

function initPieChart() {
  // Set up dimensions
  pieWidth = 500;
  pieHeight = 500;
  pieRadius = Math.min(pieWidth, pieHeight) / 2;

  // Create SVG container
  pieChartSvg = d3
    .select("#pieChart")
    .append("svg")
    .attr("width", 700)
    .attr("height", 500)
    .append("g")
    .attr("transform", `translate(${pieWidth / 2},${pieHeight / 2})`);

  // Create color scale
  const colorScale = d3
    .scaleOrdinal()
    .domain(["Renewable", "Fossil", "Other"])
    .range([colors.green, colors.accent, colors.main]);

  // Create pie layout
  pieGenerator = d3
    .pie()
    .value((d) => d.value)
    .sort(null);

  // Create arc generators
  arcGenerator = d3
    .arc()
    .innerRadius(0)
    .outerRadius(pieRadius * 0.8);

  // Create exploded arc for renewable
  const explodedArc = d3
    .arc()
    .innerRadius(0)
    .outerRadius(pieRadius * 0.8)
    .startAngle((d) => d.startAngle)
    .endAngle((d) => d.endAngle)
    .centroid((d) => {
      const midAngle = d.startAngle + (d.endAngle - d.startAngle) / 2;
      const x = Math.sin(midAngle) * (d.data.type === "Renewable" ? 30 : 0);
      const y = -Math.cos(midAngle) * (d.data.type === "Renewable" ? 30 : 0);
      return [x, y];
    });

  // Create arc generator for labels
  labelArcGenerator = d3
    .arc()
    .innerRadius(pieRadius * 0.9)
    .outerRadius(pieRadius * 0.9);

  // Initial update
  updatePieChart();

  // Add event listener for year change
  d3.select("#yearSelect").on("input", function () {
    latestYear = +this.value;
    document.getElementById("selectedYear").textContent = latestYear;
    updatePieChart();
  });
}

function updatePieChart() {
  // Get latest year data
  const yearData = data.filter((d) => d.Year === latestYear);

  // Calculate averages
  const avgRenewable = d3.mean(
    yearData,
    (d) => d["Renewable Energy Share (%)"]
  );
  const avgFossil = d3.mean(yearData, (d) => d["Fossil Fuel Dependency (%)"]);
  const otherEnergy = Math.max(0, 100 - (avgRenewable + avgFossil));

  // Prepare data for pie chart
  const pieData = [
    { type: "Renewable", value: avgRenewable },
    { type: "Fossil", value: avgFossil },
    { type: "Other", value: otherEnergy },
  ];

  // Create color scale
  const colorScale = d3
    .scaleOrdinal()
    .domain(["Renewable", "Fossil", "Other"])
    .range([colors.green, colors.accent, colors.main]);

  // Calculate explode positions
  const calculateExplode = (d) => {
    const midAngle = d.startAngle + (d.endAngle - d.startAngle) / 2;
    const x =
      Math.sin(midAngle) *
      (d.data.type === "Renewable" ? 10 : d.data.type === "Fossil" ? 10 : 0);
    const y =
      -Math.cos(midAngle) *
      (d.data.type === "Renewable" ? 10 : d.data.type === "Fossil" ? 10 : 0);
    return `translate(${x}, ${y})`;
  };

  // Data join for pie slices
  const arcs = pieChartSvg
    .selectAll(".arc")
    .data(pieGenerator(pieData), (d) => d.data.type);

  // Enter new arcs
  const arcsEnter = arcs
    .enter()
    .append("g")
    .attr("class", "arc")
    .attr("transform", calculateExplode);

  arcsEnter
    .append("path")
    .attr("fill", (d) => colorScale(d.data.type))
    .attr("d", arcGenerator)
    .attr("stroke", "white")
    .attr("stroke-width", 2)
    .each(function (d) {
      this._current = d;
    });

  // Update existing arcs with animation
  arcs.transition().duration(1000).attr("transform", calculateExplode);

  arcs
    .select("path")
    .transition()
    .duration(1000)
    .attrTween("d", function (d) {
      const interpolate = d3.interpolate(this._current, d);
      this._current = interpolate(0);
      return function (t) {
        return arcGenerator(interpolate(t));
      };
    })
    .attr("fill", (d) => colorScale(d.data.type));

  // Add percentage labels
  const percentageLabels = pieChartSvg
    .selectAll(".percentage-label")
    .data(pieGenerator(pieData), (d) => d.data.type);

  // Enter percentage labels
  percentageLabels
    .enter()
    .append("text")
    .attr("class", "percentage-label")
    .attr("transform", (d) => {
      const pos = arcGenerator.centroid(d);
      const midAngle = d.startAngle + (d.endAngle - d.startAngle) / 2;
      const x = Math.sin(midAngle) * (d.data.type === "Renewable" ? 30 : 0);
      const y = -Math.cos(midAngle) * (d.data.type === "Renewable" ? 30 : 0);
      return `translate(${pos[0] + x}, ${pos[1] + y})`;
    })
    .attr("text-anchor", "middle")
    .attr("dy", ".35em")
    .style("font-weight", "bold")
    .style("fill", "white")
    .style("font-size", "14px")
    .text((d) => `${d.data.value.toFixed(1)}%`);

  // Update percentage labels
  percentageLabels
    .transition()
    .duration(1000)
    .attr("transform", (d) => {
      const pos = arcGenerator.centroid(d);
      const midAngle = d.startAngle + (d.endAngle - d.startAngle) / 2;
      const x = Math.sin(midAngle) * (d.data.type === "Renewable" ? 30 : 0);
      const y = -Math.cos(midAngle) * (d.data.type === "Renewable" ? 30 : 0);
      return `translate(${pos[0] + x}, ${pos[1] + y})`;
    })
    .text((d) => `${d.data.value.toFixed(1)}%`);

  // Exit percentage labels
  percentageLabels
    .exit()
    .transition()
    .duration(500)
    .attr("opacity", 0)
    .remove();

  // Add legend
  const legend = pieChartSvg
    .selectAll(".legend")
    .data(["Renewable", "Fossil", "Other"])
    .enter()
    .append("g")
    .attr("class", "legend")
    // .attr(
    //   "transform",
    //   (d, i) =>
    //     `translate(${
    //       arcGenerator.centroid(pieGenerator(pieData)[i])[0] + 20
    //     }, ${arcGenerator.centroid(pieGenerator(pieData)[i])[1]})`
    // );
    .attr("transform", (d, i) => `translate(250, ${i * 20 - 50})`);

  legend
    .append("rect")
    .attr("width", 18)
    .attr("height", 18)
    .attr("fill", (d) => colorScale(d));

  legend
    .append("text")
    .attr("x", 24)
    .attr("y", 9)
    .attr("dy", ".35em")
    .style("font-size", "16px")
    .style("font-weight", "bold")
    // .style("fill", "black")
    .text((d) => d);

  // Add 5-year comparison if available
  pieChartSvg.selectAll(".comparison-text").remove();

  if (latestYear > 2005) {
    const previousYear = latestYear - 5;
    const previousData = data.filter((d) => d.Year === previousYear);

    if (previousData.length > 0) {
      const prevRenewable = d3.mean(
        previousData,
        (d) => d["Renewable Energy Share (%)"]
      );
      const prevFossil = d3.mean(
        previousData,
        (d) => d["Fossil Fuel Dependency (%)"]
      );

      const renewableChange = avgRenewable - prevRenewable;
      const fossilChange = avgFossil - prevFossil;

      // Add change indicators
      pieChartSvg
        .append("text")
        .attr("class", "comparison-text")
        .attr("y", pieRadius - 20)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .text(`Perubahan 5 tahun terakhir (${previousYear}-${latestYear}):`);

      pieChartSvg
        .append("text")
        .attr("class", "comparison-text")
        .attr("y", pieRadius)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .text(
          `Energi Terbarukan: ${
            renewableChange > 0 ? "+" : ""
          }${renewableChange.toFixed(1)}%`
        );

      pieChartSvg
        .append("text")
        .attr("class", "comparison-text")
        .attr("y", pieRadius + 20)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .text(
          `Bahan Bakar Fosil: ${
            fossilChange > 0 ? "+" : ""
          }${fossilChange.toFixed(1)}%`
        );
    }
  }

  // Add title
  pieChartSvg.selectAll(".pie-title").remove();

  pieChartSvg
    .append("text")
    .attr("class", "pie-title")
    .attr("y", -pieRadius - 20)
    .attr("text-anchor", "middle")
    .style("font-size", "16px")
    .style("font-weight", "bold")
    .text(`Bauran Energi Global ${latestYear}`);
}
