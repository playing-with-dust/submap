const app = require('./app.js')
const jQuery = require("jquery")
const id = require('./identicon.js')
const addr = require('./address.js')
const utils = require('./utils.js')
const dagreD3 = require("dagre-d3")
const d3 = require("d3")
const graphlibDot = require("graphlib-dot")

var start_address = ""
var viz = ""

const startAddr = async () => {
    start_address = jQuery("#address").val()
    console.log(start_address)
    jQuery("#status").html("status: doing stuff")
    let a = addr.ss58Decode(start_address)	
    if (!a) {
	jQuery("#status").html("status: address error")
    } else {
	jQuery("#addr_icon").empty();
	jQuery("#addr_icon").append(id.identicon(a, false, 50));
	viz = await app.vizAddress(-1,0,start_address);
	draw(viz);
	jQuery("#status").html("status: ready")
    }
}

jQuery("#address").change(startAddr);

var svg = d3.select("svg"),
    inner = d3.select("svg g"),
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
    
    d3.select("svg g").call(render, g);
}



const urlParams = new URLSearchParams(window.location.search);
const address = urlParams.get('address')
if (address) {
 
}
