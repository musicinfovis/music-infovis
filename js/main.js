(function (d3, w) {
    'use strict';

    var repo = w.repository('data/everything.csv');
    var overview = createOverview(500, 300);
    var detail = createDetail(1000, 1000);

    repo.averagePopularityByYear().then(p(updateOverview, overview));
    repo.tracksOfYear(2000).then(p(updateDetail, detail));

    d3.selectAll('.year').on('mouseenter', function () {
        var year = this.getAttribute('value');
        repo.tracksOfYear(year).then(p(updateDetail, detail));
    });

    function createOverview(width, height) {
        // Dimensions of the chart.
        var margin = {top: 20, right: 50, bottom: 30, left: 20};
        width -= (margin.left + margin.right);
        height -= (margin.top + margin.bottom);

        var svg = d3.select('#overview').append('svg')
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
        ;

        var grid = svg
            .append("g")
            .attr('class', 'grid')
        ;

        // Adds the x-axis
        grid.append("g")
            .attr('class', 'x-axis')
            .attr('transform', 'translate(0,' + height + ')')
        ;

        // Adds the y-axis.
        grid.append("g")
            .attr('class', 'y-axis')
            .attr('transform', 'translate(' + width + ', 0)')
        ;

        return {
            svg: svg,
            x: d3.scaleLinear().range([0, width]),
            y: d3.scaleLinear().range([height, 0])
        };
    }

    function updateOverview(chart, pairs) {
        // Scale the range of the data
        chart.x.domain(d3.extent(pairs, function(d) { return d.year; }));
        chart.y.domain([
            d3.min(pairs, function(d) { return d.popularity - 2; }),
            d3.max(pairs, function(d) { return d.popularity + 2; })
        ]);

        // define the line
        var valueLine = d3.line()
            .x(function(d) { return chart.x(d.year); })
            .y(function(d) { return chart.y(d.popularity); })
        ;

        chart
          .svg
          .selectAll('.grid')
          .append('path')
          .datum(pairs)
          .attr('class', 'line')
          .attr('d', valueLine)
        ;

        // Update x-axis and y-axis.
        chart.svg.selectAll('.x-axis').call(d3.axisBottom(chart.x));
        chart.svg.selectAll('.y-axis').call(d3.axisRight(chart.y).ticks(5));
    }

    function createDetail(width, height) {
        var svg = d3.select('#detail').append('svg')
            .attr("width", width)
            .attr("height", height)
        ;

        svg
            .append('g')
            .attr('class', 'detail-container')
        ;
        var path = d3.path();
        path.arc(
            0.5 * width,
            0.5 * height,
            0.35 * width,
            (10 / 180) * Math.PI - 0.5 * Math.PI,
            (350 / 180) * Math.PI - 0.5 * Math.PI
        );

        svg
            .append('path')
            .attr('id', 'rank-path')
            .attr('class', 'rank-path')
            .attr('d', path.toString())
        ;

        // 0.34 * width - 60 is the maximal width of a singe track line
        // (please see, where createArc is called out).
        createPopularitySlider(svg, 0.34 * width - 60)
            .attr('transform', translate(0.5 * width, 0.5 * height - (0.34 * width - 10)))
        ;

        return {
            svg: svg
        };
    }

    function createPopularitySlider(parent, length) {
        var slider = parent
            .append('g')
            .attr('class', 'pop-slider')
        ;

        var handle = slider.append('g');

        var x = d3.scaleLinear()
            .domain([0, 100])
            .range([0, length])
            .clamp(true)
        ;

        var min = x.range()[0];
        var max = x.range()[1];
        var mid = 0.5 * (max - min);

        var knobScale = d3.scaleLinear()
            .domain([8, 12])
            .range([0, length])
        ;

        slider
            .append('line')
            .attr('class', 'pop-slider-track')
            .attr('y1', min)
            .attr('y2', max)
        ;

        slider.append('circle').attr('class', 'pop-slider-max').attr('r', 8).attr('cy', min);
        slider.append('circle').attr('class', 'pop-slider-mid').attr('r', 10).attr('cy', mid);
        slider.append('circle').attr('class', 'pop-slider-min').attr('r', 12).attr('cy', max);

        slider.append('text').attr('class', 'pop-slider-txt').attr('y', min + 3).attr('text-anchor', 'middle').text(0);
        slider.append('text').attr('class', 'pop-slider-txt').attr('y', mid + 3).attr('text-anchor', 'middle').text(50);
        slider.append('text').attr('class', 'pop-slider-txt').attr('y', max + 3).attr('text-anchor', 'middle').text(100);

        var knob = slider
            .append('circle')
            .attr('class', 'pop-slider-knob')
            .attr('r', 5)
        ;

        var knobText = slider
            .append('text')
            .attr('class', 'pop-slider-knob-text')
        ;

        adjustPopularityKnob(knob, knobText, x, 0);

        slider
            .append('line')
            .attr('class', 'pop-slider-overlay')
            .attr('y1', min)
            .attr('y2', max)
            .call(d3.drag()
                .on('start.interrupt', function() { slider.interrupt(); })
                .on('start drag', function () { adjustPopularityKnob(knob, knobText, x, d3.event.y); })
            )
        ;

        return slider;
    }

    function adjustPopularityKnob(knob, text, scale, y) {
        var popularity = scale.invert(y);
        var t = popularity * 0.01;
        var radius = (1 - t) * 8 + t * 12;

        knob.attr('cy', scale(popularity));
        knob.attr('r', radius);
        text.text(Math.round(popularity));
        text.attr('y', scale(popularity) + 5)
        text.attr('x', radius + 5);
    }

    function translate(x, y) {
        return 'translate(' + x + ', ' + y + ')';
    }

    function color(track) {
        // Linear interpolation between 2 values.
        var l = function l(a, b, t) { return Math.round((1 - t) * a + t * b); };

        var h = [85, 230, 230]; // Happy
        var n = [255, 255, 255]; // Neutral
        var s = [251, 96, 160]; // Sad

        var t = track.valence;
        var r = t < 0.5 ? l(s[0], n[0], t / 0.5) : l(n[0], h[0], (t - 0.5) / 0.5);
        var g = t < 0.5 ? l(s[1], n[1], t / 0.5) : l(n[1], h[1], (t - 0.5) / 0.5);
        var b = t < 0.5 ? l(s[2], n[2], t / 0.5) : l(n[2], h[2], (t - 0.5) / 0.5);

        return 'rgb(' + r + ', ' + g + ', ' + b + ')';
    }

    function updateDetail(chart, tracks) {
        var ds = (20 / 180) * Math.PI;
        var da = (2 * Math.PI - ds) / tracks.length;
        var width = parseInt(chart.svg.style('width'), 10);
        var height = parseInt(chart.svg.style('height'), 10);

        var container = chart.svg.select('.detail-container');

        var cx = 0.5 * width;
        var cy = 0.5 * height;

        var rFn = function (track) { return Math.pow(track.energy, 2) * 20; };
        var xFn = function (track, i) { return cx + 0.4 * width * Math.cos(angle(da, ds, i) - 0.5 * Math.PI); };
        var yFn = function (track, i) { return cy + 0.4 * width * Math.sin(angle(da, ds, i) - 0.5 * Math.PI); };

        var itemsOld = container.selectAll('.detail-item').data(tracks);
        var itemsDel = itemsOld.exit();
        var itemsNew = itemsOld.enter();

        itemsNew = itemsNew.append('g').attr('class', 'detail-item');
        itemsNew.append('circle').attr('class', 'circle');
        itemsNew.append('path').attr('class', 'popularity');
        itemsNew.append('text').append('textPath').attr('class', 'rank').attr('xlink:href', '#rank-path');

        var itemsAll = itemsOld.merge(itemsNew);

        itemsAll
            .select('.circle')
            .attr('r', rFn)
            .attr('cx', xFn)
            .attr('cy', yFn)
        ;

        itemsAll
            .select('.popularity')
            .attr('d', p(createArc, da, ds, 0.34 * width, 50, 10))
            .attr('transform', translate(cx, cy))
            .attr('fill', p(color))
        ;

        itemsAll
            .select('.rank')
            .attr('startOffset', function (track, i) {
                return (100 * angle(da, 0, i) / (2 * Math.PI - ds)) + '%';
            })
            .text(function (track) { return track.rank; })
        ;

        itemsDel.remove();
    }

    /**
     * @param {Float}   da    Angle (in radians) to use per track
     * @param {Float}   ds    Space above for the slider (???)
     * @param {Integer} r     Radius (in pixels) of the maximum
     * @param {Fkoat}   r1    Radius of the inner clear area (in pixels)
     * @param {Float}   r2    Radius of the outer clear area (in pixels)
     * @param {Object}  track
     * @param {Integer} i
     *
     * @return {[type]}
     */
    function createArc(da, ds, r, ri, ro, track, i) {
        var s = 0;
        var a = i * da;
        var w = 0.2;

        var lmin = ((r - ri - ro) / r);
        var lmax = (r - ro) / r;

        var arc = d3.arc()
            .innerRadius(r * (lmax - lmin * 0.01 * track.popularity))
            .outerRadius(r)
            .startAngle(angle(da, ds, i) - 0.5 * w * da)
            .endAngle(angle(da, ds, i) + 0.5 * w * da)
        ;

        return arc();
    }

    function angle(da, ds, i) {
        return i * da + 0.5 * (ds + da);
    }


})(d3, window);