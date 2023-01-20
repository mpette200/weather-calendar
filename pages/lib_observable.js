// library of pre-built functions from the Observable https://observablehq.com/
// notebooks collection.

import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

// Copyright 2021 Observable, Inc.
// Released under the ISC license.
// https://observablehq.com/@d3/histogram
function Histogram(data, {
    value = d => d, // convenience alias for x
    domain, // convenience alias for xDomain
    label, // convenience alias for xLabel
    format, // convenience alias for xFormat
    type = d3.scaleLinear, // convenience alias for xType
    x = value, // given d in data, returns the (quantitative) x-value
    y = () => 1, // given d in data, returns the (quantitative) weight
    thresholds = 40, // approximate number of bins to generate, or threshold function
    normalize, // whether to normalize values to a total of 100%
    marginTop = 20, // top margin, in pixels
    marginRight = 30, // right margin, in pixels
    marginBottom = 30, // bottom margin, in pixels
    marginLeft = 40, // left margin, in pixels
    width = 640, // outer width of chart, in pixels
    height = 400, // outer height of chart, in pixels
    insetLeft = 0.5, // inset left edge of bar
    insetRight = 0.5, // inset right edge of bar
    xType = type, // type of x-scale
    xDomain = domain, // [xmin, xmax]
    xRange = [marginLeft, width - marginRight], // [left, right]
    xLabel = label, // a label for the x-axis
    xFormat = format, // a format specifier string for the x-axis
    yType = d3.scaleLinear, // type of y-scale
    yDomain, // [ymin, ymax]
    yRange = [height - marginBottom, marginTop], // [bottom, top]
    yLabel = "↑ Frequency", // a label for the y-axis
    yFormat = normalize ? "%" : undefined, // a format specifier string for the y-axis
    color = "currentColor" // bar fill color
  } = {}) {
    // Compute values.
    const X = d3.map(data, x);
    const Y0 = d3.map(data, y);
    const I = d3.range(X.length);
  
    // Compute bins.
    const bins = d3.bin().thresholds(thresholds).value(i => X[i])(I);
    const Y = Array.from(bins, I => d3.sum(I, i => Y0[i]));
    if (normalize) {
      const total = d3.sum(Y);
      for (let i = 0; i < Y.length; ++i) Y[i] /= total;
    }
  
    // Compute default domains.
    if (xDomain === undefined) xDomain = [bins[0].x0, bins[bins.length - 1].x1];
    if (yDomain === undefined) yDomain = [0, d3.max(Y)];
  
    // Construct scales and axes.
    const xScale = xType(xDomain, xRange);
    const yScale = yType(yDomain, yRange);
    const xAxis = d3.axisBottom(xScale).ticks(width / 80, xFormat).tickSizeOuter(0);
    const yAxis = d3.axisLeft(yScale).ticks(height / 40, yFormat);
    yFormat = yScale.tickFormat(100, yFormat);
  
    const svg = d3.create("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", [0, 0, width, height])
        .attr("style", "max-width: 100%; height: auto; height: intrinsic;");
  
    svg.append("g")
        .attr("transform", `translate(${marginLeft},0)`)
        .call(yAxis)
        .call(g => g.select(".domain").remove())
        .call(g => g.selectAll(".tick line").clone()
            .attr("x2", width - marginLeft - marginRight)
            .attr("stroke-opacity", 0.1))
        .call(g => g.append("text")
            .attr("x", -marginLeft)
            .attr("y", 10)
            .attr("fill", "currentColor")
            .attr("text-anchor", "start")
            .text(yLabel));
  
    svg.append("g")
        .attr("fill", color)
      .selectAll("rect")
      .data(bins)
      .join("rect")
        .attr("x", d => xScale(d.x0) + insetLeft)
        .attr("width", d => Math.max(0, xScale(d.x1) - xScale(d.x0) - insetLeft - insetRight))
        .attr("y", (d, i) => yScale(Y[i]))
        .attr("height", (d, i) => yScale(0) - yScale(Y[i]))
      .append("title")
        .text((d, i) => [`${d.x0} ≤ x < ${d.x1}`, yFormat(Y[i])].join("\n"));
  
    svg.append("g")
        .attr("transform", `translate(0,${height - marginBottom})`)
        .call(xAxis)
        .call(g => g.append("text")
            .attr("x", width - marginRight)
            .attr("y", 27)
            .attr("fill", "currentColor")
            .attr("text-anchor", "end")
            .text(xLabel));
  
    return svg.node();
}

// modified from
// https://observablehq.com/@mbostock/scrubber
function Scrubber(
    values, {
        format = value => value,
        initial = 0,
        delay = null,
        autoplay = true,
        loop = true,
        loopDelay = null,
        alternate = false
    } = {}
    ) {
    values = Array.from(values);
    const div = document.createElement("div");
    div.innerHTML = 
    `<form style="font: 12px var(--sans-serif); font-variant-numeric: tabular-nums; display: flex; height: 33px; align-items: center;">
        <button name=b type=button style="margin-right: 0.4em; width: 5em;"></button>
        <label style="display: flex; align-items: center; width: 100%; max-width: 800px">
            <input name=i type=range min=0 max=${values.length - 1} value=${initial} step=1 style="width: 70%;">
            <output name=o style="margin-left: 0.4em;"></output>
        </label>
    </form>`;
    const form = div.firstChild;
    let frame = null;
    let timer = null;
    let interval = null;
    let direction = 1;
    function start() {
      form.b.textContent = "Pause";
      if (delay === null) frame = requestAnimationFrame(tick);
      else interval = setInterval(tick, delay);
    }
    function stop() {
      form.b.textContent = "Play";
      if (frame !== null) cancelAnimationFrame(frame), frame = null;
      if (timer !== null) clearTimeout(timer), timer = null;
      if (interval !== null) clearInterval(interval), interval = null;
    }
    function running() {
      return frame !== null || timer !== null || interval !== null;
    }
    function tick() {
      if (form.i.valueAsNumber === (direction > 0 ? values.length - 1 : direction < 0 ? 0 : NaN)) {
        if (!loop) return stop();
        if (alternate) direction = -direction;
        if (loopDelay !== null) {
          if (frame !== null) cancelAnimationFrame(frame), frame = null;
          if (interval !== null) clearInterval(interval), interval = null;
          timer = setTimeout(() => (step(), start()), loopDelay);
          return;
        }
      }
      if (delay === null) frame = requestAnimationFrame(tick);
      step();
    }
    function step() {
      form.i.valueAsNumber = (form.i.valueAsNumber + direction + values.length) % values.length;
      form.i.dispatchEvent(new Event("input", {bubbles: true}));
    }
    form.i.oninput = event => {
      if (event && event.isTrusted && running()) stop();
      form.value = values[form.i.valueAsNumber];
      form.o.value = format(form.value, form.i.valueAsNumber, values);
    };
    form.b.onclick = () => {
      if (running()) return stop();
      direction = alternate && form.i.valueAsNumber === values.length - 1 ? -1 : 1;
      form.i.valueAsNumber = (form.i.valueAsNumber + direction) % values.length;
      form.i.dispatchEvent(new Event("input", {bubbles: true}));
      start();
    };
    form.i.oninput();
    if (autoplay) start();
    else stop();
    // unknown object from https://observablehq.com/@mbostock/scrubber
    // Inputs.disposal(form).then(stop);
    return form;
}

  export { Histogram, Scrubber };
