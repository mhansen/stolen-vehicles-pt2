var DaysGraph, RegionChooser, RegionTitle, WeekGraph, abbreviatedMonthName, cellPadding, cellSize, dayOfWeek, weekDayName, weekOfYear;

dayOfWeek = d3.time.format("%w");

weekDayName = d3.time.format("%A");

weekOfYear = d3.time.format("%U");

abbreviatedMonthName = d3.time.format("%b");

cellSize = 50;

cellPadding = 5;

$(document).ready(function() {
  return d3.text("/stolen-vehicles-pt2/stolenvehicles2.csv", function(text) {
    var graph, regionChooser, regionModel, regionTitle, stolenCarsModel, vehicles, weekGraph;
    vehicles = d3.csv.parseRows(text, function(d) {
      var vehicle;
      vehicle = {
        plate: d[0],
        color: d[1],
        make: d[2],
        model: d[3],
        year: parseInt(d[4]),
        type: d[5],
        dateString: d[6],
        region: d[7]
      };
      vehicle.date = d3.time.day.utc(new Date(vehicle.dateString));
      vehicle.weekOfYear = weekOfYear(vehicle.date);
      vehicle.dayOfWeek = dayOfWeek(vehicle.date);
      return vehicle;
    });
    stolenCarsModel = new Backbone.Model;
    graph = new DaysGraph({
      el: "#daysGraph",
      model: stolenCarsModel
    });
    weekGraph = new WeekGraph({
      el: "#weekGraph",
      model: stolenCarsModel
    });
    regionChooser = new RegionChooser({
      el: "#regionChooser",
      model: stolenCarsModel
    });
    regionModel = new Backbone.Model;
    regionChooser.bind("change:region", function(view, region) {
      return regionModel.set({
        region: region
      });
    });
    regionTitle = new RegionTitle({
      el: "#regionTitle",
      model: regionModel
    });
    regionModel.bind("change:region", function(model, region) {
      if (region === "All Regions") {
        return stolenCarsModel.set({
          selectedVehicles: vehicles
        });
      } else {
        return stolenCarsModel.set({
          selectedVehicles: _.filter(vehicles, function(v) {
            return v.region === region;
          })
        });
      }
    });
    stolenCarsModel.set({
      allVehicles: vehicles,
      minDate: (_.min(vehicles, function(v) {
        return v.date;
      })).date,
      maxDate: (_.max(vehicles, function(v) {
        return v.date;
      })).date
    });
    return regionModel.set({
      region: "All Regions"
    });
  });
});

WeekGraph = Backbone.View.extend({
  height: 150,
  width: 420,
  initialize: function() {
    var _this = this;
    return this.model.bind("change:selectedVehicles", function() {
      return _this.render();
    });
  },
  render: function() {
    var bars, color, height, maxPerWeek, weekDays, x,
      _this = this;
    weekDays = d3.nest().key(function(d) {
      return d.dayOfWeek;
    }).entries(this.model.get("selectedVehicles"));
    x = d3.scale.linear().domain([0, 6]).range([0, 6 * (cellPadding + cellSize)]);
    maxPerWeek = _.max(weekDays, function(d) {
      return d.values.length;
    }).values.length;
    color = d3.scale.linear().domain([0, maxPerWeek]).range(["white", "darkblue"]);
    height = d3.scale.linear().domain([0, maxPerWeek]).range([0, this.height]);
    bars = d3.select(this.el).attr("width", 420).attr("height", this.height).selectAll("rect.weekDay").data(weekDays);
    bars.transition().duration(1000).attr("x", function(d, i) {
      return x(i);
    }).attr("y", function(d, i) {
      return _this.height - height(d.values.length);
    }).attr("height", function(d, i) {
      return height(d.values.length);
    }).attr("fill", function(d) {
      return color(d.values.length);
    });
    bars.enter().append("svg:rect").attr("x", function(d, i) {
      return x(i);
    }).attr("y", function(d, i) {
      return _this.height - height(d.values.length);
    }).attr("height", function(d, i) {
      return height(d.values.length);
    }).attr("width", cellSize).attr("class", "weekDay").attr("fill", function(d) {
      return color(d.values.length);
    });
    bars.exit().remove();
    return this.$("rect.weekDay").twipsy({
      title: function() {
        return weekDayName(this.__data__.values[0].date) + "<br>" + this.__data__.values.length + " Reports";
      },
      html: true,
      placement: "above"
    });
  }
});

RegionTitle = Backbone.View.extend({
  initialize: function() {
    var _this = this;
    return this.model.bind("change:region", function() {
      return _this.render();
    });
  },
  render: function() {
    return $(this.el).text("" + (this.model.get('region')) + " Stolen Vehicles");
  }
});

RegionChooser = Backbone.View.extend({
  initialize: function() {
    var _this = this;
    return this.model.bind("change:allVehicles", function() {
      return _this.render();
    });
  },
  region: function() {
    return this.$("input:radio[name=region]:checked").val();
  },
  render: function() {
    var color, divs, form, maxPerRegion, regions,
      _this = this;
    regions = d3.nest().key(function(d) {
      return d.region;
    }).entries(this.model.get("allVehicles"));
    regions.unshift({
      key: "All Regions",
      values: []
    });
    maxPerRegion = _.max(regions, function(d) {
      return d.values.length;
    }).values.length;
    color = d3.scale.linear().domain([0, maxPerRegion]).range(["white", "darkblue"]);
    form = d3.select(this.el).append("form");
    divs = form.selectAll("input[name=region]").data(regions).enter().append("div").html(function(d) {
      return "<input name='region' type='radio'\n     id='" + d.key + "' value='" + d.key + "'/>\n<label for='" + d.key + "' style='cursor:pointer'>\n<div class='regionBox' \n     style='width: " + (d.values.length / 4) + "px;\n     background-color:" + (color(d.values.length)) + "'>\n</div>\n" + d.key + "\n</label>";
    });
    $(this.el).on("change", "input[name=region]", function() {
      return _this.trigger("change:region", _this, _this.region());
    });
    return this.$("input[value='All Regions']").attr("checked", "true");
  }
});

DaysGraph = Backbone.View.extend({
  height: 1510,
  width: 420,
  topPadding: 30,
  initialize: function() {
    var _this = this;
    return this.model.bind("change:selectedVehicles", function() {
      return _this.render();
    });
  },
  render: function() {
    var color, dayLabels, days, minWeek, monthBoundaries, monthLabels, months, svg, worstDay, x, y,
      _this = this;
    days = d3.nest().key(function(d) {
      return d.dateString;
    }).entries(this.model.get("selectedVehicles"));
    days = _(days).sortBy(function(v) {
      return v.key;
    });
    svg = d3.select(this.el).attr("width", this.width).attr("height", this.height).attr("preserveAspectRatio", "none").attr("transform", "translate(0," + this.topPadding + ")");
    worstDay = _(days).max(function(day) {
      return day.values.length;
    });
    color = d3.scale.linear().domain([0, worstDay.values.length]).range(["white", "darkblue"]);
    minWeek = weekOfYear(this.model.get("minDate"));
    x = d3.scale.linear().domain([0, 6]).range([0, 6 * (cellPadding + cellSize)]);
    y = function(w) {
      return _this.topPadding + (w - minWeek) * (cellSize + cellPadding);
    };
    days = svg.selectAll("rect.day").data(days, function(d) {
      return d.key;
    });
    days.transition().duration(1000).delay(function() {
      return Math.random() * 1000;
    }).attr("fill", function(d) {
      return color(d.values.length);
    });
    days.enter().append("svg:rect").attr("class", "day").attr("width", cellSize).attr("height", cellSize).attr("title", function(d) {
      return d.key + ": " + d.values.length;
    }).attr("y", function(d) {
      return y(d.values[0].weekOfYear);
    }).attr("x", function(d) {
      return x(d.values[0].dayOfWeek);
    }).attr("fill", "white").attr("stroke", "white").on("mouseover.highlight", function() {
      return d3.select(this).classed("highlight", true);
    }).on("mouseout.highlight", function(d) {
      return d3.select(this).classed("highlight", false);
    }).transition().duration(1000).delay(function() {
      return Math.random() * 1000;
    }).attr("fill", function(d) {
      return color(d.values.length);
    });
    days.exit().transition().duration(1000).delay(function() {
      return Math.random() * 1000;
    }).attr("fill", "white").remove();
    months = d3.time.months(this.model.get("minDate"), this.model.get("maxDate"));
    monthLabels = svg.selectAll("text.monthLabel").data(months);
    monthLabels.enter().append("svg:text").attr("class", "monthLabel").text(abbreviatedMonthName).attr("x", x(7)).attr("y", function(d) {
      return y(weekOfYear(d));
    }).attr("dy", (cellSize + cellPadding) * (3 / 2)).attr("dominant-baseline", "central").attr("fill", "white").transition().duration(3000).attr("fill", "black");
    monthLabels.exit().remove();
    monthBoundaries = svg.selectAll("path.monthBoundary").data(months);
    monthBoundaries.enter().append("path").attr("class", "monthBoundary").attr("stroke", "black").attr("stroke-width", "1").attr("fill", "none").attr("transform", "translate(" + (-cellPadding / 2) + "," + (-cellPadding / 2) + ")").attr("d", function(t0) {
      var d0, d1, t1, w0, w1;
      t1 = new Date(t0.getUTCFullYear(), t0.getUTCMonth() + 1, 0);
      d0 = +dayOfWeek(t0);
      w0 = +weekOfYear(t0);
      d1 = +dayOfWeek(t1);
      w1 = +weekOfYear(t1);
      return ("M " + (x(7)) + ", " + (y(w0))) + ("H " + (x(d0))) + ("V " + (y(w0 + 1))) + ("H " + (x(0)));
    });
    monthBoundaries.exit().remove();
    dayLabels = svg.selectAll("text.dayLabel").data(["S", "M", "T", "W", "T", "F", "S"]);
    dayLabels.enter().append("text").attr("class", "dayLabel").text(function(d) {
      return d;
    }).attr("fill", "black").attr("x", function(d, i) {
      return x(i) + 0.5 * cellSize;
    }).attr("text-anchor", "middle").attr("y", 15);
    dayLabels.exit().remove();
    return this.$("rect.day").popover({
      title: function() {
        return "" + this.__data__.key;
      },
      content: function() {
        var carBox, content, v, _i, _len, _ref;
        carBox = function(color) {
          return "<div class='carBox' style='background-color: " + color + ";'></div>";
        };
        content = "" + this.__data__.values.length + " \nStolen Vehicle Report" + (this.__data__.values.length > 1 ? "s" : "") + ".<br>";
        _ref = this.__data__.values;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          v = _ref[_i];
          content += carBox(v.color);
        }
        return content + "<br><em>colors shown are the vehicle colors</em>";
      },
      html: true,
      placement: "right"
    });
  }
});
