(function ($) {
$(document).ready(function () {

var $svgPathDef = $('#svg-path-def');
var $renderedSvg = $('#rendered-svg');
var $renderedSvgPath = $('#rendered-svg-path');
var $renderedCanvas = $('#rendered-canvas');

var pathStrokeStyle = '#000';
var pathStrokeWidth = 2;
var boxPadding = 20;

var defaultSvgPathDef = 'M 10 10 C 20 20, 40 20, 50 10';
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
	var minXValue = Math.min.apply(Math, xCoords);
	var minYValue = Math.min.apply(Math, yCoords);
	var maxXValue = Math.max.apply(Math, xCoords);
	var maxYValue = Math.max.apply(Math, yCoords);
	var viewBox = {
		x: minXValue - boxPadding,
		y: minYValue - boxPadding,
		width: maxXValue - minXValue + (boxPadding * 2),
		height: maxYValue - minYValue + (boxPadding * 2)
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
	$renderedCanvas.drawPath(Object.assign({
		layer: true,
		strokeStyle: pathStrokeStyle,
		strokeWidth: pathStrokeWidth
	}, convertSvgPathDefToJcanvasPath(svgPathDef)));
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
