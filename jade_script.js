d3.csv("merged_scatterplot_data.csv", d3.autoType).then((data) => {
  const svg = d3.select("#jade-svg");
  const width = svg.attr("width");
  const height = svg.attr("height");
  const margin = { top: 0, right: 5, bottom: 60, left: 60 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;

  let annotations = svg.append("g").attr("id", "annotations");
  let chartArea = svg
    .append("g")
    .attr("id", "chartArea")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const xScale = d3
    .scaleLinear()
    .domain(d3.extent(data, (d) => d["happiness_score"]))
    .range([10, chartWidth - 10]);

  const yScale = d3
    .scaleLog()
    .domain(d3.extent(data, (d) => d["2022_consumption"]))
    .range([chartHeight - 10, 10]);

  const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

  // Axes & Gridlines
  let xAxis = d3.axisBottom(xScale);
  let xGridlines = d3.axisBottom(xScale).tickSize(-chartHeight).tickFormat("");
  annotations
    .append("g")
    .attr("class", "x axis")
    .attr("transform", `translate(${margin.left},${chartHeight + margin.top})`)
    .call(xAxis);
  annotations
    .append("g")
    .attr("class", "x gridlines")
    .attr("transform", `translate(${margin.left},${chartHeight + margin.top})`)
    .call(xGridlines);
  svg
    .append("text")
    .attr("x", margin.left + chartWidth / 2)
    .attr("y", chartHeight + 50)
    .attr("text-anchor", "middle")
    .style("font-weight", "bold")
    .style("font-size", "13px")
    .text("Happiness Score");

  let yAxis = d3.axisLeft(yScale);
  let yGridlines = d3.axisLeft(yScale).tickSize(-chartWidth).tickFormat("");
  annotations
    .append("g")
    .attr("class", "y axis")
    .attr("transform", `translate(${margin.left},${margin.top})`)
    .call(yAxis);
  annotations
    .append("g")
    .attr("class", "y gridlines")
    .attr("transform", `translate(${margin.left},${margin.top})`)
    .call(yGridlines);

  svg
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -margin.top - chartHeight / 2)
    .attr("y", margin.left / 2 - 10)
    .attr("text-anchor", "middle")
    .style("font-weight", "bold")
    .style("font-size", "13px")
    .text("Instant Noodle Consumption in millions of dollars (Log Scale)");

  // Tooltip
  const tooltip = d3
    .select("#jade-div")
    .append("div")
    .attr("class", "tooltip-jade")
    .style("opacity", 0);

  // Draw the trend line
  // Function to perform linear regression on the dataset
  function linearRegression(data) {
    const meanHappiness = d3.mean(data, (d) => d["happiness_score"]);
    const meanLogConsumption = d3.mean(data, (d) =>
      Math.log(d["2022_consumption"])
    );

    // Calculate the slope of the trend line
    const slope =
      d3.sum(
        data,
        (d) =>
          (d["happiness_score"] - meanHappiness) *
          (Math.log(d["2022_consumption"]) - meanLogConsumption)
      ) /
      d3.sum(data, (d) => Math.pow(d["happiness_score"] - meanHappiness, 2));

    const intercept = meanLogConsumption - slope * meanHappiness;

    return { slope, intercept };
  }

  const { slope, intercept } = linearRegression(data);

  // Draw the trend line on the chart
  const trendLine = chartArea
    .append("line")
    .attr("stroke", "grey")
    .attr("stroke-width", 2)
    .attr("stroke-dasharray", "5,5");

  function updateTrendLine(xScale, yScale) {
    const startHappiness = d3.min(data, (d) => d["happiness_score"]);
    const endHappiness = d3.max(data, (d) => d["happiness_score"]);

    const startConsumption = Math.exp(intercept + slope * startHappiness);
    const endConsumption = Math.exp(intercept + slope * endHappiness);

    trendLine
      .attr("x1", xScale(startHappiness))
      .attr("y1", yScale(startConsumption))
      .attr("x2", xScale(endHappiness))
      .attr("y2", yScale(endConsumption));
  }

  updateTrendLine(xScale, yScale);

  const trendBtn = d3.select("#show-trend");

  trendBtn.on("click", () => {
    // Get the current opacity as a number
    const trendLineOpacity = parseFloat(trendLine.style("opacity"));

    trendLine.style("opacity", trendLineOpacity === 0 ? 1 : 0);

    trendBtn.text(
      // if trendLineOpacity was 1, now it should be 0, so we display show trend line
      trendLineOpacity === 1 ? "Show Trend Line" : "Hide Trend Line"
    );
  });

  // Function to compute the correlation coefficient
  function correlationCoefficient(data) {
    const meanHappiness = d3.mean(data, (d) => d["happiness_score"]);
    const meanLogConsumption = d3.mean(data, (d) =>
      Math.log(d["2022_consumption"])
    ); // Calculate mean of log consumption

    const numerator = d3.sum(
      data,
      (d) =>
        (d["happiness_score"] - meanHappiness) *
        (Math.log(d["2022_consumption"]) - meanLogConsumption)
    );

    const denominator = Math.sqrt(
      d3.sum(data, (d) => Math.pow(d["happiness_score"] - meanHappiness, 2)) *
        d3.sum(data, (d) =>
          Math.pow(Math.log(d["2022_consumption"]) - meanLogConsumption, 2)
        )
    );

    return numerator / denominator; // Return the calculated correlation coefficient
  }

  const r = correlationCoefficient(data);

  const corrBigDiv = d3.select(".correlation-coefficient");
  const corrDiv = d3.select(".correlation-div");

  corrDiv
    .append("p")
    .text(
      `Correlation Coefficient: ${r.toFixed(
        2
      )} (based on log-transformed Y values).`
    );
  console.log("corrDiv:", corrDiv);

  corrBigDiv
    .append("p")
    .text(
      `This indicates a weak negative relationship between happiness scores and instant noodle consumption.`
    );

  // Handle Zooming
  var chartZoom = d3.zoom().scaleExtent([0.5, 5]).on("zoom", chartZoomed);
  svg.call(chartZoom);
  function chartZoomed(event) {
    viewport.attr("transform", event.transform);

    const new_xScale = event.transform.rescaleX(xScale);
    const new_yScale = event.transform.rescaleY(yScale);

    xAxis.scale(new_xScale);
    yAxis.scale(new_yScale);
    xGridlines.scale(new_xScale);
    yGridlines.scale(new_yScale);

    d3.select("g.x.axis").call(xAxis);
    d3.select("g.y.axis").call(yAxis);
    d3.select("g.x.gridlines").call(xGridlines);
    d3.select("g.y.gridlines").call(yGridlines);

    viewport.selectAll("circle").attr("r", 6 / event.transform.k);

    // Update the trend line with the new scales
    updateTrendLine(new_xScale, new_yScale);
  }

  function resetZoom() {
    svg.transition().call(chartZoom.transform, d3.zoomIdentity);
  }

  document.getElementById("reset-view").addEventListener("click", resetZoom);

  svg
    .append("defs")
    .append("clipPath")
    .attr("id", "clip")
    .append("rect")
    .attr("width", chartWidth)
    .attr("height", chartHeight)
    .attr("x", 0)
    .attr("y", 0);

  chartArea.attr("clip-path", "url(#clip)");

  let selectedContinent = null;
  let selectedCountry = null;

  // Legend Buttons
  const uniqueContinents = Array.from(new Set(data.map((d) => d.Continent)));
  const buttonContainer = d3
    .select("#jade-div")
    .append("div")
    .attr("class", "legend-button-container");

  buttonContainer
    .selectAll(".legend-button")
    .data(uniqueContinents)
    .join("button")
    .attr("class", "legend-button")
    .style("border", (d) => `2px solid ${colorScale(d)}`)
    .style("color", (d) => colorScale(d))
    .text((d) => d)
    .on("click", function (event, continent) {
      const currentZoomScale = d3.zoomTransform(
        d3.select("#jade-svg").node()
      ).k;
      // Reset the selected country when a continent filter is clicked
      selectedCountry = null;
      selectedContinent = continent;
      d3.selectAll(".point")
        .transition()
        .duration(200)
        .attr("r", 6 / currentZoomScale)
        .attr("opacity", (d) => (d.Continent === continent ? 0.6 : 0.07));
    });

  // Reset filter with "Show All" button
  buttonContainer
    .append("button")
    .attr("class", "legend-button")
    .style("border", "2px solid black")
    .style("color", "black")
    .text("Show All")
    .on("click", () => {
      selectedCountry = null;
      selectedContinent = null;
      const currentZoomScale = d3.zoomTransform(
        d3.select("#jade-svg").node()
      ).k;
      d3.selectAll(".point")
        .transition()
        .duration(300)
        .attr("opacity", 0.6)
        .attr("r", 6 / currentZoomScale);
    });

  // Plot data points
  let viewport = chartArea.append("g");

  function computeOpacity(d) {
    if (selectedCountry) {
      return d.Country.toLowerCase().replace(/\s+/g, "") === selectedCountry
        ? 1
        : 0.07;
    } else if (selectedContinent) {
      return d.Continent === selectedContinent ? 0.6 : 0.07;
    } else {
      return 0.6;
    }
  }

  viewport
    .selectAll("circle")
    .data(data)
    .join("circle")
    .attr("class", "point")
    .attr("cx", (d) => xScale(d["happiness_score"]))
    .attr("cy", (d) => yScale(d["2022_consumption"]))
    .attr("r", 6)
    .attr("opacity", 0.6)
    .style("fill", (d) => colorScale(d.Continent))
    .on("mouseover", (event, d) => {
      d3.select(event.currentTarget)
        .transition()
        .duration(200)
        .attr("opacity", 1);
      tooltip.transition().duration(300).style("opacity", 0.9);
      tooltip
        .html(
          `<b>Country:</b> ${d.Country}  <br> <b>Instant Noodle Consumption:</b> $${d["2022_consumption"]} million <br> <b>Happiness Score:</b> ${d["happiness_score"]}`
        )
        .style("left", event.pageX + 20 + "px")
        .style("top", event.pageY - 28 + "px");
    })
    .on("mouseout", (event, d) => {
      d3.select(event.currentTarget)
        .transition()
        .duration(300)
        .attr("opacity", computeOpacity(d));
      tooltip.transition().duration(500).style("opacity", 0);
    });

  document.addEventListener("highlightCountry", (e) => {
    const country = e.detail.country.toLowerCase().replace(/\s+/g, "");
    selectedCountry = country;

    const currentZoomScale = d3.zoomTransform(d3.select("#jade-svg").node()).k;

    d3.selectAll(".point")
      .transition()
      .duration(300)
      .attr("opacity", (d) => computeOpacity(d))
      .attr("r", (d) =>
        d.Country.toLowerCase().replace(/\s+/g, "") === selectedCountry
          ? 10 / currentZoomScale
          : 6 / currentZoomScale
      );
  });
});
