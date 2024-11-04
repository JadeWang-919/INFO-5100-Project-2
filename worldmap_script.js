// Global storage for data
const consumptionData = {};
const topRamenByCountry = {};
const happinessByCountry = {};

// Standardize and convert country names for matching all 3 datasets
function standardizeCountryName(name) {
  return name
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z]/g, "");
}

// Set up SVG and projection
const svg = d3.select("#worldMap");
const width = svg.attr("width");
const height = svg.attr("height");
const mapGroup = svg.append("g"); // Group to handle zoom/pan transforms

const projection = d3
  .geoNaturalEarth1()
  .scale(220)
  .translate([width / 2.25, height / 1.8]);

const path = d3.geoPath().projection(projection);

// Set up tooltip
const tooltip = d3.select("#tooltip");

// Set up pan & zoom
const zoom = d3
  .zoom()
  .scaleExtent([1, 8]) // Zoom range
  .on("zoom", (event) => {
    mapGroup.attr("transform", event.transform);
    mapGroup.attr("stroke-width", 1 / event.transform.k); // Maintain stroke width on zoom
  });

svg.call(zoom); // Apply zoom behavior to the SVG

// Load noodle consumption data and store it
d3.csv("noodles_consumptions.csv").then((noodleData) => {
  noodleData.forEach((d) => {
    const standardizedCountry = standardizeCountryName(d["Country/Region"]);
    consumptionData[standardizedCountry] = d["2022"] * 1;
  });

  // Load noodle ratinbgs data and store it
  d3.csv("noodles_ratings.csv").then((ratingData) => {
    ratingData.forEach((d) => {
      const standardizedCountry = standardizeCountryName(d.Country);
      const rating = parseFloat(d.Stars);
      const brand = d.Brand;

      // Track top-rated brand per country
      if (
        !topRamenByCountry[standardizedCountry] ||
        rating > topRamenByCountry[standardizedCountry].rating
      ) {
        topRamenByCountry[standardizedCountry] = { brand, rating };
      }
    });

    // Load country happiness data and store it
    d3.csv("world_happiness.csv").then((happinessData) => {
      happinessData.forEach((d) => {
        const standardizedCountry = standardizeCountryName(d.Country);
        happinessByCountry[standardizedCountry] = d["Happiness score"] * 1;
      });

      // Load the world map
      // reference: https://unpkg.com/browse/world-atlas@2.0.2/
      d3.json("https://unpkg.com/world-atlas@2.0.2/countries-110m.json").then(
        (worldData) => {
          const countries = topojson.feature(
            worldData,
            worldData.objects.countries
          ).features;

          // Render country paths
          mapGroup
            .selectAll("path")
            .data(countries)
            .join("path")
            .attr("d", path)
            .attr("fill", "#d3d3d3")
            .attr("stroke", "white");

          // Bubble scale control based on noodle consumption
          // In order to get the max value easier from the data storage, we learned Object.values() from MDN
          // reference: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/values
          var maxConsumption = d3.max(Object.values(consumptionData));
          var bubbleScale = d3
            .scaleSqrt()
            .domain([0, maxConsumption])
            .range([0, 60]);

          // Color scale range for happiness score
          // same reference: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/values
          const happinessScores = Object.values(happinessByCountry);
          const colorScale = d3
            .scaleQuantile()
            .domain(happinessScores)
            .range(["#F9F65A", "#EC7014", "#BC4A9C", "#7A1A9B", "#2B0054"]);

          // on hover
          function showTooltip(event, countryData) {
            const country = standardizeCountryName(countryData.properties.name);
            let tooltipContent = `<strong>Country:</strong> ${countryData.properties.name}<br>`;

            // Check if each piece of data exists and add it to the tooltip content if it does
            if (consumptionData[country]) {
              const consumption = `$${consumptionData[country]} million`;
              tooltipContent += `<strong>Instant Noodle Consumption:</strong> ${consumption}<br>`;
            }

            if (happinessByCountry[country]) {
              tooltipContent += `<strong>Happiness Score:</strong> ${happinessByCountry[country]}<br>`;
            }

            if (topRamenByCountry[country]) {
              tooltipContent += `<strong>Top Instant Noodle Brand:</strong> ${topRamenByCountry[country].brand}`;
            }

            tooltip
              .style("display", "block")
              .html(tooltipContent)
              .style("left", event.pageX + 20 + "px")
              .style("top", event.pageY - 28 + "px")
              .transition() // Start transition
              .duration(500) // Transition duration in ms
              .style("opacity", 1); // Fade-in effect

            // Dispatch an event to highlight the country in the scatter plot
            document.dispatchEvent(
              new CustomEvent("highlightCountry", { detail: { country } })
            );
          }
          function hideTooltip() {
            tooltip
              .transition() // Start transition
              .duration(500) // Transition duration in ms
              .style("opacity", 0) // Fade-out effect
              .on("end", () => tooltip.style("display", "none")); // Hide after fade-out
            // Dispatch event to reset scatter plot highlights
            document.dispatchEvent(new CustomEvent("resetHighlight"));
          }

          // Assign consumption bubble to countries
          mapGroup
            .selectAll("circle")
            .data(countries)
            .join("circle")
            // get x coordinate (not showing the circle if returns null)
            .attr("cx", (d) => {
              let country = standardizeCountryName(d.properties.name);
              return consumptionData[country]
                ? projection(d3.geoCentroid(d))[0]
                : null;
            })
            // get y coordinate (not showing the circle if returns null)
            .attr("cy", (d) => {
              let country = standardizeCountryName(d.properties.name);
              return consumptionData[country]
                ? projection(d3.geoCentroid(d))[1]
                : null;
            })
            // set scale according to consumption rate
            .attr("r", (d) => {
              let country = standardizeCountryName(d.properties.name);
              return bubbleScale(consumptionData[country] || 0);
            })
            // set color according to happiness value
            .attr("fill", (d) => {
              let country = standardizeCountryName(d.properties.name);
              return colorScale(happinessByCountry[country] || 0);
            })
            .attr("opacity", 0.65)

            // Set interactions
            .on("mouseover", (event, d) => showTooltip(event, d))
            .on("mouseout", hideTooltip);

          // Zoom controls
          d3.select("#zoomIn").on("click", () =>
            svg.transition().call(zoom.scaleBy, 1.5)
          );
          d3.select("#zoomOut").on("click", () =>
            svg.transition().call(zoom.scaleBy, 0.67)
          );
          d3.select("#reset").on("click", () =>
            svg.transition().call(zoom.transform, d3.zoomIdentity)
          );
        }
      );
    });
  });
});
