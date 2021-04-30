const app = require('./app.js')
const jQuery = require("jquery")
const id = require('./identicon.js')
const addr = require('./address.js')
const utils = require('./utils.js')
const dagreD3 = require("dagre-d3")
const d3 = require("d3")
const graphlibDot = require("graphlib-dot")

var viz = ""

const start = async (address) => {
    jQuery("#status").html("status: reading data...")
    let a = addr.ss58Decode(address)
    if (!a) {
	jQuery("#status").html("status: address error")
    } else {
	jQuery("#addr_icon").empty();
	jQuery("#addr_icon").append(id.identicon(a, false, 50));
	viz = await app.vizAddress(-1,0,address);
	draw(viz);
	jQuery("#status").html("status: ready")
    }
}

const startAddr = async () => {
    start(jQuery("#address").val())
}

jQuery("#address").change(startAddr);

var svg = d3.select("#mapsvg"),
    inner = d3.select("#mapsvg g"),
    zoom = d3.zoom().on("zoom", function() {
	inner.attr("transform", d3.event.transform);
    });
svg.call(zoom);

var render = dagreD3.render();

var g;
function draw(viz) {
    try {
	g = graphlibDot.read("digraph {"+viz+"}");
    } catch (e) {
	throw e;
    }
    if (!g.graph().hasOwnProperty("marginx") &&
        !g.graph().hasOwnProperty("marginy")) {
	g.graph().marginx = 20;
	g.graph().marginy = 20;
    }

    g.graph().rankdir = "LR";
    
    g.graph().transition = function(selection) {
	return selection.transition().duration(500);
    };
    
    d3.select("#mapsvg g").call(render, g);

    
    const { width, height } = d3.select("svg g").node().getBBox()
    console.log([width,height])
    if (width && height) {
	let svgn=d3.select("#mapsvg").node()
	const scale = Math.min(svgn.clientWidth / width, svgn.clientHeight / height) * 0.95
	zoom.scaleTo(svg, scale)
	zoom.translateTo(svg, width / 2, height / 2)
    }
    
/*
    // Zoom to fit
    let width=600
    let height=800
    let initialScale=0.5
    var padding = 20,
	bBox = inner.node().getBBox(),
	hRatio = height / (bBox.height + padding),
	wRatio = width / (bBox.width + padding);
    
    zoom.translate([(width - bBox.width * initialScale) / 2, padding / 2])
	.scale(hRatio < wRatio ? hRatio : wRatio)
	.event(svg);
*/
}



const urlParams = new URLSearchParams(window.location.search);
const address = urlParams.get('address')
if (address) {
    jQuery("#address").val(address)
    start(address);
}
