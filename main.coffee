dayOfWeek = d3.time.format("%w")
weekDayName = d3.time.format("%A")
weekOfYear = d3.time.format("%U")
abbreviatedMonthName = d3.time.format("%b")

cellSize = 50
cellPadding = 5

$(document).ready ->
  d3.text "/stolen-vehicles-pt2/stolenvehicles2.csv", (text) ->
    vehicles = d3.csv.parseRows text, (d) ->
      vehicle =
        plate: d[0]
        color: d[1]
        make: d[2]
        model: d[3]
        year: parseInt d[4]
        type: d[5]
        dateString: d[6]
        region: d[7]
      vehicle.date = d3.time.day.utc(new Date(vehicle.dateString))
      vehicle.weekOfYear = weekOfYear(vehicle.date)
      vehicle.dayOfWeek = dayOfWeek(vehicle.date)
      return vehicle

    stolenCarsModel = new Backbone.Model
    graph = new DaysGraph(el: "#daysGraph", model: stolenCarsModel)
    weekGraph = new WeekGraph(el: "#weekGraph", model: stolenCarsModel)
    regionChooser = new RegionChooser(el: "#regionChooser", model: stolenCarsModel)

    regionModel = new Backbone.Model
    regionChooser.bind "change:region", (view, region) ->
      regionModel.set region: region
    regionTitle = new RegionTitle(el: "#regionTitle", model: regionModel)

    regionModel.bind "change:region", (model, region) ->
      if region is "All Regions"
        stolenCarsModel.set
          selectedVehicles: vehicles
      else
        stolenCarsModel.set selectedVehicles:
          _.filter(vehicles, (v) -> v.region is region)

    stolenCarsModel.set
      allVehicles: vehicles
      minDate: (_.min(vehicles, (v) -> v.date)).date
      maxDate: (_.max(vehicles, (v) -> v.date)).date

    regionModel.set region: "All Regions"

WeekGraph = Backbone.View.extend
  height: 150
  width: 420
  initialize: ->
    @model.bind "change:selectedVehicles", => @render()
  render: ->
    weekDays = d3.nest()
      .key((d) -> d.dayOfWeek)
      .entries(@model.get "selectedVehicles")
    
    x = d3.scale.linear()
      .domain([0, 6]) # weekdays
      .range([0, 6 * (cellPadding + cellSize)])

    maxPerWeek = _.max(weekDays, (d) -> d.values.length).values.length

    color = d3.scale.linear()
      .domain([0, maxPerWeek])
      .range(["white", "darkblue"])

    height = d3.scale.linear()
      .domain([0, maxPerWeek])
      .range([0, @height])

    bars = d3.select(@el)
      .attr("width", 420)
      .attr("height", @height)
      .selectAll("rect.weekDay")
      .data(weekDays)

    bars
      .transition()
      .duration(1000)
      .attr("x", (d, i) -> x(i))
      .attr("y", (d, i) => @height - height(d.values.length))
      .attr("height", (d, i) -> height(d.values.length))
      .attr("fill", (d) -> color(d.values.length))

    bars.enter()
      .append("svg:rect")
      .attr("x", (d, i) -> x(i))
      .attr("y", (d, i) => @height - height(d.values.length))
      .attr("height", (d, i) -> height(d.values.length))
      .attr("width", cellSize)
      .attr("class", "weekDay")
      .attr("fill", (d) -> color(d.values.length))

    bars.exit()
      .remove()

    @$("rect.weekDay").twipsy
      title: ->
        weekDayName(@__data__.values[0].date) + "<br>" +
        @__data__.values.length + " Reports"
      html: true
      placement: "above"

RegionTitle = Backbone.View.extend
  initialize: ->
    @model.bind "change:region", => @render()
  render: ->
    $(@el).text("#{@model.get 'region'} Stolen Vehicles")

RegionChooser = Backbone.View.extend
  initialize: ->
    @model.bind "change:allVehicles", => @render()
  region: ->
    @$("input:radio[name=region]:checked").val()
  render: ->
    regions = d3.nest()
      .key((d) -> d.region)
      .entries(@model.get "allVehicles")

    # Add a special catch-all region radiobox to the start.
    regions.unshift { key: "All Regions", values: [] }

    maxPerRegion = _.max(regions, (d) -> d.values.length).values.length

    color = d3.scale.linear()
      .domain([0, maxPerRegion])
      .range(["white", "darkblue"])

    form = d3.select(@el).append("form")
    divs = form.selectAll("input[name=region]")
      .data(regions)
      .enter()
      .append("div")
      .html((d) -> """
        <input name='region' type='radio'
             id='#{d.key}' value='#{d.key}'/>
        <label for='#{d.key}' style='cursor:pointer'>
        <div class='regionBox' 
             style='width: #{d.values.length/4}px;
             background-color:#{color(d.values.length)}'>
        </div>
        #{d.key}
        </label>""")
    $(@el).on "change", "input[name=region]", =>
      @trigger "change:region", this, @region()
    @$("input[value='All Regions']").attr "checked", "true"

DaysGraph = Backbone.View.extend
  height: 1510
  width: 420
  topPadding: 30
  initialize: ->
    @model.bind "change:selectedVehicles", => @render()
  render: ->
    days = d3.nest()
      .key((d) -> d.dateString)
      .entries(@model.get "selectedVehicles")

    days = _(days).sortBy (v) -> v.key

    svg = d3.select(@el)
      .attr("width", @width)
      .attr("height", @height)
      .attr("preserveAspectRatio", "none")
      .attr("transform", "translate(0,#{@topPadding})")

    worstDay = _(days).max (day) -> day.values.length
    color = d3.scale.linear()
      .domain([0, worstDay.values.length])
      .range(["white", "darkblue"])

    minWeek = weekOfYear(@model.get "minDate")
    
    x = d3.scale.linear()
      .domain([0, 6]) # weekdays
      .range([0, 6 * (cellPadding + cellSize)])
    y = (w) =>
      @topPadding + (w - minWeek) * (cellSize + cellPadding)

    days = svg.selectAll("rect.day")
      .data(days, (d) -> d.key)

    days.transition()
      .duration(1000)
      .delay(-> Math.random() * 1000)
      .attr("fill", (d) -> color(d.values.length))

    days.enter()
      .append("svg:rect")
      .attr("class", "day")
      .attr("width", cellSize)
      .attr("height", cellSize)
      .attr("title", (d) -> d.key + ": " + d.values.length)
      .attr("y", (d) -> y(d.values[0].weekOfYear))
      .attr("x", (d) -> x(d.values[0].dayOfWeek))
      .attr("fill", "white")
      .attr("stroke", "white")
      .on("mouseover.highlight", ->
        d3.select(this).classed("highlight", true))
      .on("mouseout.highlight", (d) ->
        d3.select(this).classed("highlight", false))
      .transition()
      .duration(1000)
      .delay(-> Math.random() * 1000)
      .attr("fill", (d) -> color(d.values.length))

    days.exit()
      .transition()
      .duration(1000)
      .delay(-> Math.random() * 1000)
      .attr("fill", "white")
      .remove()

    months = d3.time.months(@model.get("minDate"), @model.get("maxDate"))

    monthLabels = svg.selectAll("text.monthLabel")
      .data(months)
    monthLabels.enter()
      .append("svg:text")
      .attr("class", "monthLabel")
      .text(abbreviatedMonthName)
      .attr("x", x(7))
      .attr("y", (d) -> y(weekOfYear(d)))
      .attr("dy", (cellSize+cellPadding)*(3/2))
      .attr("dominant-baseline", "central")
      .attr("fill", "white")
      .transition()
      .duration(3000)
      .attr("fill", "black")
    monthLabels.exit()
      .remove()

    monthBoundaries = svg.selectAll("path.monthBoundary")
      .data(months)

    monthBoundaries.enter()
      .append("path")
      .attr("class", "monthBoundary")
      .attr("stroke", "black")
      .attr("stroke-width", "1")
      .attr("fill", "none")
      .attr("transform", "translate(#{-cellPadding/2},#{-cellPadding/2})")
      .attr "d", (t0) =>
        t1 = new Date(t0.getUTCFullYear(), t0.getUTCMonth() + 1, 0)
        d0 = +dayOfWeek(t0) # 5
        w0 = +weekOfYear(t0) # 26
        d1 = +dayOfWeek(t1) # 4
        w1 = +weekOfYear(t1) # 26

        return "M #{x(7)}, #{y(w0)}" + # start at top right
        "H #{x(d0)}" + # draw left
        "V #{y(w0+1)}" + # draw down
        "H #{x(0)}" # all the way to the left edge
      monthBoundaries.exit()
        .remove()

    dayLabels = svg.selectAll("text.dayLabel")
      .data(["S","M","T","W","T","F","S"])
    dayLabels.enter()
      .append("text")
      .attr("class", "dayLabel")
      .text((d) -> d)
      .attr("fill", "black")
      .attr("x", (d, i) => x(i) + 0.5*cellSize)
      .attr("text-anchor", "middle")
      .attr("y",15)
    dayLabels.exit()
      .remove()

    @$("rect.day").popover
      title: -> "#{@__data__.key}"
      content: ->
        carBox = (color) ->
          "<div class='carBox' style='background-color: #{color};'></div>"
        content = """#{@__data__.values.length} 
        Stolen Vehicle Report#{if @__data__.values.length > 1 then "s" else ""}.<br>"""
        for v in @__data__.values
          content += carBox(v.color)
        content + "<br><em>colors shown are the vehicle colors</em>"
      html: true
      placement: "right"
