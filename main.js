(function ($) {
$(document).ready(function () {

var $svgPathDef = $('#svg-path-def');
var $renderedSvg = $('#rendered-svg');
var $renderedSvgPath = $('#rendered-svg-path');
var $renderedCanvas = $('#rendered-canvas');

var pathStrokeStyle = '#000';
var pathStrokeWidth = 2;
var boxPadding = 20;

var defaultWidth = 400;
var defaultHeight = 320;
var defaultSvgPathDef = 'm46 71c-12.2 0-22-9.8-22-22 0-12.2 9.8-22 22-22 12.2 0 22 9.8 22 22 0 12.2-9.8 22-22 22z m103.5 159c-20.2 0-36.5-16.3-36.5-36.5 0-20.2 16.3-36.5 36.5-36.5 20.2 0 36.5 16.3 36.5 36.5 0 20.2-16.3 36.5-36.5 36.5z';
var loadedSvgPathDef = localStorage.getItem('svg-path-def') || defaultSvgPathDef;

/* The core of the path conversion algotithm */

var svgPathFunctions = {
	L: function (x, y) {
		return {
			type: 'line',
			x2: x, y2: y
		};
	},
	Q: function (cx1, cy1, x2, y2) {
		return {
			type: 'quadratic',
			cx1: cx1, cy1: cy1,
			x2: x2, y2: y2
		};
	},
	C: function (cx1, cy1, cx2, cy2, x2, y2) {
		return {
			type: 'bezier',
			cx1: cx1, cy1: cy1,
			cx2: cx2, cy2: cy2,
			x2: x2, y2: y2
		};
	}
};

function convertSvgPathDefToJcanvasPath(svgPathDef) {
	var parts = svgPathDef.split(/,\s*|\s+/);
	var pathObject = {};
	var currentSubpathObject = {};
	var subpathCount = 0;
	for (var i = 0; i < parts.length; i += 1) {
		var part = parts[i];
		if (part === 'M') {
			// The jCanvas API doesn't really have a equivalent to the Move (M)
			// command, so we must handle it separately
			currentSubpathObject.x1 = Number(parts[i + 1]);
			currentSubpathObject.y1 = Number(parts[i + 2]);
		} else if (part === 'Z') {
			pathObject.closed = true;
		} else if (svgPathFunctions[part]) {
			currentSubpathObject = Object.assign(
				currentSubpathObject,
				svgPathFunctions[part].apply(this, parts.slice(i + 1).map(Number))
			);
			subpathCount += 1;
			pathObject['p' + subpathCount] = currentSubpathObject;
			currentSubpathObject = {};
		}
	}
	return pathObject;
}

/* End algorithm */

function getViewBoxFromSvgPathDef(svgPathDef) {
	var coords = (svgPathDef.match(/\-?\d+(?:\.\d+)?/g) || []).map(Number);
	var xCoords = coords.filter(function (coord, i) {
		return i % 2 === 0;
	});
	var yCoords = coords.filter(function (coord, i) {
		return i % 2 === 1;
	});

	if (!xCoords || !yCoords) {
		return {
			x: 0,
			y: 0,
			width: defaultWidth,
			height: defaultHeight
		};
	}

	var minXValue1 = Math.min(...xCoords) || 0;
	var minXValue2 = Math.min(...xCoords.filter((x) => x !== minXValue1)) || 0;

	var minYValue1 = Math.min(...yCoords) || 0;
	var minYValue2 = Math.min(...yCoords.filter((y) => y !== minYValue1)) || 0;

	var maxXValue1 = Math.max(...xCoords) || 0;
	var maxXValue2 = Math.max(...xCoords.filter((x) => x !== maxXValue1)) || 0;

	var maxYValue1 = Math.max(...yCoords) || 0;
	var maxYValue2 = Math.max(...yCoords.filter((y) => y !== maxYValue1)) || 0;

	var viewBox = {
		x: minXValue1 - minYValue2 - boxPadding,
		y: minYValue1 - minYValue2 - boxPadding,
		width: maxXValue1 - minXValue1 + maxXValue2 + (boxPadding * 2),
		height: maxYValue1 - minYValue1 + maxYValue2 + (boxPadding * 2)
	};
	return viewBox;
}

function drawSvg(viewBox, svgPathDef) {
	$renderedSvg.attr({
		viewBox: [viewBox.x, viewBox.y, viewBox.width, viewBox.height].join(' '),
		width: viewBox.width,
		height: viewBox.height
	});
	$renderedSvgPath.attr('fill', 'none');
	$renderedSvgPath.attr('stroke', pathStrokeStyle);
	$renderedSvgPath.attr('stroke-width', pathStrokeWidth);
	$renderedSvgPath.attr('d', svgPathDef);
}

// A custom jCanvas method you can use to render an SVG path onto a canvas
$.jCanvas.extend({
  name: 'drawSvgPath',
  type: 'svgPath',
  props: {},
  fn: function (ctx, params) {
    // Just to keep our lines short
    var p = params;
    // Enable layer transformations like scale and rotate
    $.jCanvas.transformShape(this, ctx, p);
    // Draw heart
    ctx.beginPath();
    ctx.moveTo(p.x, p.y + p.radius);
    // Draw SVG path
	var path = new Path2D(p.d);
    // Call the detectEvents() function to enable jCanvas events
    // Be sure to pass it these arguments, too!
    $.jCanvas.detectEvents(this, ctx, p);
	// Close newly-created path manually (jCanvas doesn't support closing a
	// Path2D object)
    ctx.fill(path);
	// Prevent extra shadow created by stroke (but only when fill is present)
	if (p.fillStyle !== 'transparent') {
		ctx.shadowColor = 'transparent';
	}
	if (p.strokeWidth !== 0) {
		// Only stroke if the stroke is not 0
		ctx.stroke(path);
	}
	// If shape has been transformed by jCanvas
	if (params._transformed) {
		// Restore canvas context
		ctx.restore();
	}
	if (params.mask) {
		var data = $.data(this, 'jCanvas');
		// If jCanvas autosave is enabled
		if (params.autosave) {
			ctx.save();
			var transforms = $.extend({}, data.transforms);
			// Clone the object's masks array
			transforms.masks = transforms.masks.slice(0);
			data.savedTransforms.push(transforms);
		}
		// Clip the current path
		ctx.clip(path);
		// Keep track of current masks
		data.transforms.masks.push(params._args);
	}
  }
});

function drawCanvas(viewBox, svgPathDef) {
	// Optimize canvas for high-density displays; normally, we would use
	// detectPixelRatio(), but that can be finicky when working with layers, and
	// it's pretty straightforward to perform the upscaling manually
	var pixelRatio = 2;
	$renderedCanvas.attr({
		width: viewBox.width * pixelRatio,
		height: viewBox.height * pixelRatio
	});
	$renderedCanvas.css({
		width: viewBox.width,
		height: viewBox.height
	});
	$renderedCanvas.removeLayers();
	$renderedCanvas.scaleCanvas({
		layer: true,
		scale: pixelRatio
	});
	$renderedCanvas.translateCanvas({
		layer: true,
		translateX: -viewBox.x,
		translateY: -viewBox.y
	});
	$renderedCanvas.drawSvgPath({
		layer: true,
		strokeStyle: '#000',
		strokeWidth: 2,
		d: 'm46 71c-12.2 0-22-9.8-22-22 0-12.2 9.8-22 22-22 12.2 0 22 9.8 22 22 0 12.2-9.8 22-22 22z m103.5 159c-20.2 0-36.5-16.3-36.5-36.5 0-20.2 16.3-36.5 36.5-36.5 20.2 0 36.5 16.3 36.5 36.5 0 20.2-16.3 36.5-36.5 36.5z'
	});
	$renderedCanvas.restoreCanvas({
		layer: true,
		count: 2
	});
}

function draw() {
	var currentSvgPathDef = $svgPathDef.val();
	var viewBox = getViewBoxFromSvgPathDef(currentSvgPathDef);
	drawSvg(viewBox, currentSvgPathDef);
	drawCanvas(viewBox, currentSvgPathDef);
}

$svgPathDef.on('input', function (event) {
	localStorage.setItem('svg-path-def', event.currentTarget.value);
	draw();
});

$svgPathDef.val(loadedSvgPathDef);
draw();

});
}(jQuery));
