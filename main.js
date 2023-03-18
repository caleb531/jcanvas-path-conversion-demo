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

function convertSvgPathDefToJcanvasPath(svgPathDef) {
	var parts = svgPathDef.split(/(,?\s*)|(\s+)/);
	return {
		p1: {
			type: 'bezier',
			x1: 130, y1: 110,
			cx1: 120, cy1: 140,
			cx2: 180, cy2: 140,
			x2: 170, y2: 110
		}
	};
}

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
	console.log('viewBox', viewBox);
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
	$renderedCanvas.scaleCanvas({
		scale: pixelRatio
	});
	$renderedCanvas.translateCanvas({
		layer: true,
		translateX: -viewBox.x,
		translateY: -viewBox.y
	});
	$renderedCanvas.removeLayers();
	$renderedCanvas.drawPath(Object.assign({
		layer: true,
		strokeStyle: pathStrokeStyle,
		strokeWidth: pathStrokeWidth
	}, convertSvgPathDefToJcanvasPath(svgPathDef)));
	$renderedCanvas.restoreCanvas({
		layer: true
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
