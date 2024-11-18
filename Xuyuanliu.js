// Load Data
let ratingsData = [];

// Tooltip for bar chart
const barTooltip = d3
  .select("#bar-chart-container") // Attach to the bar chart container
  .append("div")
  .attr("class", "bar-tooltip")
  .style("position", "absolute")
  .style("display", "none");

// Populate Dropdown Filter
function updateCountryOptions(data) {
  const countries = Array.from(new Set(data.map((d) => d.country))).sort(); // Get unique countries and sort alphabetically
  const dropdown = d3.select("#country-filter");

  countries.forEach((country) => {
    dropdown.append("option").text(country).attr("value", country);
  });
}

// Initialize the Chart
d3.csv("Cleaned_Noodles_Ratings_Data.csv").then((data) => {
  ratingsData = data.map((d) => ({
    country: d.Country,
    brand: d.Brand,
    rating: +d.Stars, // Rating data available, no consumption needed
  }));

  updateCountryOptions(ratingsData);

  // Set a default country for the initial bar chart
  const firstCountry = d3.select("#country-filter").property("value"); // Get the first country in the dropdown
  updateBarChart(firstCountry);

  // Event listener for country dropdown change
  d3.select("#country-filter").on("change", function () {
    const selectedCountry = d3.select(this).property("value");
    updateBarChart(selectedCountry);
  });
});

// Bar Chart Drawing Function
const MAX_BARS = 20;

function updateBarChart(country) {
  const svg = d3.select("#bar-chart");
  svg.selectAll("*").remove(); // Clear previous bars

  const margin = { top: 0, right: 5, bottom: 60, left: 60 };
  const width = +svg.attr("width") - margin.left - margin.right;
  const height = +svg.attr("height") - margin.top - margin.bottom;

  const chartArea = svg
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // Filter data by the selected country
  let filteredData = ratingsData.filter((d) => d.country === country);

  // Group by brand and calculate average ratings
  const brandData = Array.from(
    d3.group(filteredData, (d) => d.brand),
    ([brand, values]) => ({
      brand,
      rating: d3.mean(values, (v) => v.rating),
    })
  )
    .sort((a, b) => b.rating - a.rating)
    .slice(0, MAX_BARS); // Limit to top N brands

  // Define scales
  const xScale = d3.scaleLinear().domain([0, 5]).range([0, width]);

  const yScale = d3
    .scaleBand()
    .domain(brandData.map((d) => d.brand))
    .range([0, height])
    .padding(0.1);

  // Color scale based on rating
  const colorScale = d3
    .scaleSequential()
    .domain([0, 5])
    .interpolator(d3.interpolateBlues);

  // Draw bars with interaction
  chartArea
    .selectAll(".bar")
    .data(brandData)
    .join("rect")
    .attr("class", "bar")
    .attr("y", (d) => yScale(d.brand))
    .attr("width", (d) => xScale(d.rating))
    .attr("height", yScale.bandwidth())
    .attr("fill", (d) => colorScale(d.rating)) // Color based on rating
    .on("mouseover", (event, d) => {
      barTooltip
        .style("display", "block")
        .html(
          `<strong>Brand:</strong> ${
            d.brand
          }<br><strong>Rating:</strong> ${d.rating.toFixed(1)}`
        );
    })
    .on("mousemove", (event) => {
      barTooltip
        .style("left", `${event.pageX + 15}px`)
        .style("top", `${event.pageY - 30}px`);
    })
    .on("mouseout", () => barTooltip.style("display", "none"))
    .on("click", (event, d) => {
      showSidePanel(d.brand, country);
    });

  // Draw x-axis
  chartArea
    .append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(xScale).ticks(5));

  // Draw y-axis
  chartArea.append("g").attr("class", "y-axis").call(d3.axisLeft(yScale));
}

// Listen for the "highlightCountry" event from world map
document.addEventListener("highlightCountry", (e) => {
  const country = e.detail.country.toLowerCase().replace(/\s+/g, "");

  // Find the dropdown option that matches the selected country
  const dropdown = d3.select("#country-filter");
  const options = dropdown.selectAll("option");

  // Loop through options to find the matching country
  options.each(function () {
    if (this.value.toLowerCase().replace(/\s+/g, "") === country) {
      dropdown.property("value", this.value); // Update the dropdown to match the country
      updateBarChart(this.value); // Update the bar chart with the new country
    }
  });
});

// Side Panel for Brand Details
function showSidePanel(brand, country) {
  const brandData = ratingsData.filter((d) => d.brand === brand);
  const countryData = brandData.filter((d) => d.country === country);

  d3.select("#side-panel-title").text(`${brand} in ${country}`);
  d3.select("#side-panel-content").html(`
    <p><strong>Average Rating:</strong> ${d3
      .mean(countryData, (d) => d.rating)
      .toFixed(1)}</p>
  `);
  d3.select("#side-panel").style("display", "block");
}
