var background = chrome.extension.getBackgroundPage();

IS_ALT_PRESSED = false;
function checkKeyPressed(e) {
	// shift
	if (e.keyCode == 18) {
		IS_ALT_PRESSED = true;
	}
	console.log(e, IS_ALT_PRESSED);
}

function checkKeyUp(e) {
	// shift
	if (e.keyCode == 18) {
		IS_ALT_PRESSED = false;
	}
	
	console.log(e, IS_ALT_PRESSED);
}
document.onkeydown = checkKeyPressed;
document.onkeyup = checkKeyUp;

$(document).ready(function(){
    $(this).scrollLeft(0);
});

document.addEventListener('DOMContentLoaded', function() {
	console.log('loaded')
	renderTree();
});

function renderTree() {

	var margin = {top: 20, right: 120, bottom: 20, left: 120},
			width = 2000 //960 - margin.right - margin.left,
			height = 850 - margin.top - margin.bottom;

	var i = 0,
			duration = 750,
			root;

	var tree = d3.layout.tree()
			.size([height, width]);

	var diagonal = d3.svg.diagonal()
			.projection(function(d) { return [d.y, d.x]; });

	var svg = d3.select("body").select("tree").append("svg")
			.attr("width", width + margin.right + margin.left)
			.attr("height", height + margin.top + margin.bottom)
			.append("g")
			.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

	if (background.urlDocs.length == 0) { return }

	root = JSON.parse(JSON.stringify(
		{
			'children': background.urlDocs,
		  'title': 'New Tab',
		  'fullTitle': 'New Tab',
		  'url': 'chrome://newtab'
		}, 
		['url', 'title', 'fullTitle', 'children', 'uid']
	));

	root.x0 = height / 2;
	root.y0 = 0;

	function collapse(d) {
		if (d.children) {
			d._children = d.children;
			d._children.forEach(collapse);
			d.children = null;
		}
	}

	root.children.forEach(collapse);
	update(root);

	d3.select(self.frameElement).style("height", "800px");

	function update(source) {

		// Compute the new tree layout.
		var nodes = tree.nodes(root).reverse(),
				links = tree.links(nodes);

		// Normalize for fixed-depth.
		nodes.forEach(function(d) { d.y = d.depth * 180; });

		// Update the nodes…
		var node = svg.selectAll("g.node")
				.data(nodes, function(d) { return d.id || (d.id = ++i); });

		// Enter any new nodes at the parent's previous position.
		var nodeEnter = node.enter().append("g")
				.attr("class", "node")
				.attr("id", function(d) { return d.uid})
				.attr("transform", function(d) { return "translate(" + source.y0 + "," + source.x0 + ")"; })
				.on("click", click)
				.on("mouseover", hoverOn)
				.on("mouseout", hoverOff);

		nodeEnter.append("circle")
				.attr("r", 1e-6)
				.style("fill", function(d) { return d._children ? "lightsteelblue" : "#fff"; });

		nodeEnter.append("text")
				.attr("x", function(d) { return d.children || d._children ? -10 : 10; })
				.attr("dy", ".35em")
				.attr("text-anchor", function(d) { return d.children || d._children ? "end" : "start"; })
				.text(function(d) { 
					if (d.title) {
						return d.title; 
					} else {
						return d.url.substring(0,20) + '...'
					}
				})
				.style("fill-opacity", 1e-6)
				.style("fill", function(d) {
					if (d.uid == background.uidToLightUp) { return 'red' }
				})

		// Transition nodes to their new position.
		var nodeUpdate = node.transition()
				.duration(duration)
				.attr("transform", function(d) { return "translate(" + d.y + "," + d.x + ")"; });

		nodeUpdate.select("circle")
				.attr("r", 4.5)
				.style("fill", function(d) { return d._children ? "lightsteelblue" : "#fff"; });

		nodeUpdate.select("text")
				.style("fill-opacity", 1);

		// Transition exiting nodes to the parent's new position.
		var nodeExit = node.exit().transition()
				.duration(duration)
				.attr("transform", function(d) { return "translate(" + source.y + "," + source.x + ")"; })
				.remove();

		nodeExit.select("circle")
				.attr("r", 1e-6);

		nodeExit.select("text")
				.style("fill-opacity", 1e-6);

		// Update the links…
		var link = svg.selectAll("path.link")
				.data(links, function(d) { return d.target.id; });

		// Enter any new links at the parent's previous position.
		link.enter().insert("path", "g")
				.attr("class", "link")
				.attr("d", function(d) {
					var o = {x: source.x0, y: source.y0};
					return diagonal({source: o, target: o});
				});

		// Transition links to their new position.
		link.transition()
				.duration(duration)
				.attr("d", diagonal);

		// Transition exiting nodes to the parent's new position.
		link.exit().transition()
				.duration(duration)
				.attr("d", function(d) {
					var o = {x: source.x, y: source.y};
					return diagonal({source: o, target: o});
				})
				.remove();

		// Stash the old positions for transition.
		nodes.forEach(function(d) {
			d.x0 = d.x;
			d.y0 = d.y;
		});
	}

	// Toggle children on click.
	function click(d) {
		if (IS_ALT_PRESSED) {
			// Open that url and set location in tree to match
			IS_ALT_PRESSED = false // dont want it to be considered pressed anymore
			background.currentTabDoc = background.findDoc(background.urlDocs, uid=d.uid)
			chrome.tabs.create({url: d.url});
			return;
		}
		if (d.children) {
			d._children = d.children;
			d.children = null;
		} else {
			d.children = d._children;
			d._children = null;
		}
		update(d);
	}

	function hoverOn(d) {
		divFullTitle = document.getElementById('fullTitle');
		divFullUrl = document.getElementById('fullUrl');
		if (d.fullTitle) {
			divFullTitle.textContent = d.fullTitle;
		}
		if (d.url) { 
			divFullUrl.textContent = d.url;
		}
	}

	function hoverOff(d) {
		divFullTitle = document.getElementById('fullTitle');
		divFullTitle.textContent = ''; //'\u00A0';

		divFullUrl = document.getElementById('fullUrl');
		divFullUrl.textContent = ''; //'\u00A0';
	}

	// expand/collapse all utils

	btn = document.getElementById('expandAll')
	btn.addEventListener('click', function() {
		toggleExpand(btn)
	});

	function toggleExpand(btn) {
		if (btn.textContent == 'Expand All') {
			expandAll();
			btn.textContent = 'Collapse All';
		} else {
			collapseAll();
			btn.textContent = 'Expand All';
		}
	}

	function expand(d){   
    var children = (d.children)?d.children:d._children;
    if (d._children) {        
        d.children = d._children;
        d._children = null;       
    }
    if(children)
      children.forEach(expand);
	}

	function expandAll(){
	  expand(root); 
	  update(root);
	}

	function collapseAll(){
	  root.children.forEach(collapse);
	  //collapse(root);
	  update(root);
	  $('body, hmtl').animate({ scrollLeft: 0}, 500); // scroll all the way left
	}

}
