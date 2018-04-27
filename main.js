(async () => {
  const req = await fetch('sentiment.json');
  const data = await req.json();

  render_chart("#michael", "Michael Scott", data, "Michael", false, false, true);
  render_chart("#stanley", "Stanley Hudson", data, "Stanley", false, false, false);
  render_chart("#dwight", "Dwight Schrute", data, "Dwight", false, false, false);
  // render_chart("#jim", "Jim Halpert", data, "Jim", false, false);
  render_chart("#pam", "Pam Beesley", data, "Pam", false, false, true);
  // render_chart("#andy", "Andy Bernard", data, "Andy", false, false);
  render_chart("#angela", "Angela Martin", data, "Angela", false, false, false);
  render_chart("#toby", "Toby Flenderson", data, "Toby", false, false, false);
  // render_chart("#packer", "Todd Packer", data, "Todd Packer", false,
})();

function smooth (data) {
  const win = 5;

  return data.map((d, i, all) => {
    const sample = all.slice(Math.max(0, i - win / 2 - 1), i + win / 2);
    const val = sample.reduce((a, cur) => a + cur.positivity, 0) / sample.length;

    return Object.assign(d, {
      positivity: val
    });
  });
}

function render_chart (sel, title, data, field, strokes, sorted, yLabel) {
  const stack = d3.layout.stack();
  let dataset = {
    categories: [...Array(9).keys()].map(x => `S${x + 1}`),
    "series": [field],
    "colors": ["#3498db"],
    "layers": [
      [
      ]
    ]
  };

  for (let i = 1; i <= 9; i++) {
    let d = {};
    d.season = `S${i}`;
    d.data = data[field][i] || [];
    d.y = d3.min(d.data, val => val.pos) || 0;
    d.y0 = d3.max(d.data, val => val.pos) || 0;

    dataset.layers[0].push(d);
  }

  dataset.layers[0].forEach(season => {
    season.data = smooth(season.data);
  });

  const n = dataset["series"].length; // Number of Layers
  const m = dataset["layers"].length; // Number of Samples in 1 layer

  const yGroupMax = d3.max(dataset["layers"], function(layer) { return d3.max(layer, function(d) { return d.y0; }); });
  const yGroupMin = d3.min(dataset["layers"], function(layer) { return d3.min(layer, function(d) { return d.y; }); });

  var margin = {top: 50, right: 25, bottom: 25, left: 25},
    width = 700 - margin.left - margin.right,
    height = 500 - margin.top - margin.bottom;

  var x = d3.scale.ordinal()
    .domain(dataset["categories"])
    .rangeRoundBands([0, width], .08);

  var y = d3.scale.linear()
    .domain([yGroupMin, yGroupMax])
    .range([height, 0]);

  var yColor = d3.scale.linear()
    .domain([-1, 1])
    .range(['red', 'blue']);

  var xAxis = d3.svg.axis()
    .scale(x)
    .tickSize(5)
    .tickPadding(6)
    .orient("bottom");

  var yAxis = d3.svg.axis()
    .scale(y)
    .tickValues([])
    .orient("left");

  var svg = d3.select(sel).append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  var layer = svg.selectAll(".layer")
    .data(dataset["layers"]);
    layer.enter().append("g")
    .attr("class", "layer");

  var rect = layer.selectAll("rect")
    .data(function(d,i){d.map(function(b){b.colorIndex=i;return b;});return d;})
    .enter().append("rect")
    .style('pointer-events', 'none');

  rect.attr("x", function(d, i, j) { return x(d.season) + x.rangeBand() / n * j; })
    .style('opacity', 0);

  let barData = [];
  rect.selectAll('line')
    .data((d, i) => {
      let data = d.data.filter(d => true);
      data = data.map(x => {
        x.season = d.season;
        x.total = data.length;
        return x;
      })

      if (sorted) {
        data.sort((x, y) => x.positivity - y.positivity);
      }

      barData.push(data);

      return data;
    });

  var bargroups = layer.selectAll('g')
    .data(barData)
    .enter()
    .append('g');

  const duration = 1000;

  let lines = bargroups.selectAll('line')
    .data((d, i) => d)
    .enter()
    .append('line')
    .attr('x1', (d, i, j) => {
      let val;
      if (strokes) {
        val = x(d.season);
      } else {
        val = x(d.season) + 0.5 * x.rangeBand() / n;
      }
      return val;
    })
    .attr('y1', (d, i) => {
      let val;
      if (strokes) {
        val = y(d.positivity);
      } else {
        val = y(i / d.total) - 0.5 * height / d.total;
      }
      return val;
    })
    .attr('x2', function () {
      return d3.select(this)
        .attr('x1');
    })
    .attr('y2', function () {
      return d3.select(this)
        .attr('y1');
    })
    .style('stroke-width', d => height / d.total)
    .classed('bar', true)
    .transition()
    .delay((d, i, j) => j * 250 + i / d.total * duration)
    .duration(duration)
    .attr('x2', function (d, i, j) {
      let val;
      if (strokes) {
        val = x(d.season) + x.rangeBand() / n;
      } else {
        val = +d3.select(this).attr('x1') + 1.5 * d.positivity * 0.5 * x.rangeBand() / n;
      }
      return val;
    })
    .style('stroke', d => yColor(d.positivity));

  if (strokes) {
    lines.style('opacity', 0.05);
  }

  svg.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + height + ")")
    .call(xAxis);

  svg.select("g")
    .attr("class", "y axis")
    .call(yAxis);

  svg.append("text")
    .attr("x", width/3)
    .attr("y", 0)
    .attr("dx", ".71em")
    .attr("dy", "-.71em")
    .style('font-size', '18pt')
    .text(title);

  if (yLabel) {
    svg.append('text')
      .attr('transform', `translate(-12,${height / 2})rotate(-90)`)
      .text('Time');
  }

  var tooltip = d3.select("body")
    .append('div')
    .attr('class', 'tooltip');

  tooltip.append('div')
    .attr('class', 'month');
  tooltip.append('div')
    .attr('class', 'tempRange');

  svg.selectAll("line")
    .on('mouseover', function(d) {
      if(!d.season)return null;

      // tooltip.select('.month').html("<b>" + d.season + "</b>");
      tooltip.select('.month').html(`<b>Season ${d.season}, Episode ${d.episode}</b><br><i>${d.line_text}</i><br>Positivity: ${d.positivity.toFixed(2)}`);

      tooltip.style('display', 'block');
      tooltip.style('opacity',2);

    })
    .on('mousemove', function(d) {

      if(!d.season)return null;

      tooltip.style('top', (d3.event.layerY + 10) + 'px')
        .style('left', (d3.event.layerX - 25) + 'px');
    })
    .on('mouseout', function() {
      tooltip.style('display', 'none');
      tooltip.style('opacity',0);
    });
}
