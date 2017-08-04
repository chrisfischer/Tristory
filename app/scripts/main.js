'use strict'

var background = chrome.extension.getBackgroundPage();

var root;
var settings;

// for opening new tabs from tree
var IS_ALT_PRESSED = false;
function checkKeyPressed(e) {
	if (e.keyCode == 18) {
		IS_ALT_PRESSED = true;
	}
}
function checkKeyUp(e) {
	if (e.keyCode == 18) {
		IS_ALT_PRESSED = false;
	}
}
document.onkeydown = checkKeyPressed;
document.onkeyup = checkKeyUp;

// scroll all the way left on refresh
$(document).ready(function() {
	$(this).scrollLeft(0);

	// get alive and dead trees
	var [alive, dead] = background.getTrees();

	setUpTrees(alive, dead);

	// search stuff
	// get search box ready
	var searchBox = document.getElementById('searchInput');
	var searchBtn = document.getElementById('searchBtn');
	var clearBtn = document.getElementById('clearBtn');

	var openTabsRadio = document.getElementById('option1');
	var closedTabsRadio = document.getElementById('option2');

	searchBox.addEventListener('input', function (evt) {
		if (!this.value) {
			clearBtn.style.visibility = 'hidden';

			// if the search box is emptied then clear results
			resetResults(window.root)
			update(window.root)
		} else {
			clearBtn.style.visibility = 'visible';
		}
	});

	clearBtn.addEventListener('click', function() {
		resetSearchBar();
		searchBox.focus();
		update(window.root)
	});

	searchBtn.addEventListener('click', function() {
		parseAndSearch(window.root) 
	});
	searchBox.addEventListener('keydown', function (e) {
		if (e.keyCode == 13) { parseAndSearch(window.root) } // enter button
	});

	// expand all button
	document.getElementById('expandAll').addEventListener('click', function() {
		expandCollapseAll(this, window.root);
	});

	
	// switch from alive to dead trees
	closedTabsRadio.addEventListener('click', function() {
		window.root = dead;
		resetSearchBar(); // reset search
		update(window.root);
	})
	openTabsRadio.addEventListener('click', function() {
		window.root = alive;
		resetSearchBar(); // reset search
		update(window.root);
	})

	function resetSearchBar() {
		searchBox.value = '';
		clearBtn.style.visibility = 'hidden';
		resetResults(window.root);
	}
	
});

function setUpTrees(aliveTree, deadTree) {

	var margin = {top: 40, right: 120, bottom: 20, left: 120};
	var width = 2500 - margin.right - margin.left;
	var height = 850 - margin.top - margin.bottom;

	var tree = d3.layout.tree()
			.size([height, width]);

	var i = 0; // for counter
	var duration = 750; // duration of animations

	var diagonal = d3.svg.diagonal()
			.projection(function(d) { return [d.y, d.x]; });

	var svg = d3.select("body").select("tree").append("svg")
			.attr("width", width + margin.right + margin.left)
			.attr("height", height + margin.top + margin.bottom)
			.append("g")
			.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

	window.settings = [margin, width, height, tree, i, duration, diagonal, svg];

	window.root = aliveTree;
	window.root.x0 = height / 2;
	window.root.y0 = 0;

	deadTree.x0 = height / 2;
	deadTree.y0 = 0;

	window.root.children.forEach(toggleAll); // collapse all but entry node

	if (background.docToLightUp) {
		expandToSelected(background.docToLightUp, window.root);
	}

	update(window.root);

	console.log(window.root);

	d3.select(self.frameElement).style("height", "800px");

}

/*
	root - whole tree
	settings - other params of the tree
	source - what's being updated
*/
function update(source) {
	/*
	if (!source) {
		source = root
	}
	*/

	var [margin, width, height, tree, i, duration, diagonal, svg] = window.settings;

	// Compute the new tree layout.
	var nodes = tree.nodes(window.root).reverse(),
			links = tree.links(nodes);

	// Normalize for fixed-depth.
	nodes.forEach(function(d) { d.y = d.depth * 180; });

	// Update the nodes…
	var node = svg.selectAll("g.node")
			.data(nodes, function(d) { return d.id || (d.id = ++i); });

	// Enter any new nodes at the parent's previous position.
	var nodeEnter = node.enter().append("g")
			.attr("class", "node")
			.attr("id", function(d) { return "u" + d.uid})
			.attr("transform", function(d) { return "translate(" + source.y0 + "," + source.x0 + ")"; })
			.on("click", click)
			.on("mouseover", hoverOn)
			.on("mouseout", hoverOff);

	nodeEnter.append("circle")
			.attr("r", 1e-6)
			.style("fill", function(d) { return d._children ? "lightsteelblue" : "#fff"; })
			.style("stroke", function(d) {
				if (d.isResult) { 
					return 'red' 
				} else {
					return 'steelblue'
				}

			})
			.style("stroke-width", function(d) {
				if (d.isResult) { 
					return 3 
				} else {
					return 1.5
				}
			})

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
				if (!d.isAlive) {
					return 'lightgray'
				}
				if (d.uid && d.uid == background.docToLightUp.uid) { 
					return 'steelblue' 
				}
				
			})
			.style("font-weight", function(d) {
				if (d.uid && d.uid == background.docToLightUp.uid) { return 'bold' }
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
			})
			.attr("id", function(d) {
				return "l" + d.target.uid
			})
			.style("stroke", function(d) {
				if (d.target.expandToSelected) {
					return "steelblue"
				}
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

	window.settings = [margin, width, height, tree, i, duration, diagonal, svg]; // save changes
}

function parseAndSearch(entryNode) {
	var term = document.getElementById('searchInput').value.toLowerCase();

	if (!term) { return }

	entryNode.children.forEach(toggleAll)

	search(term, entryNode);

	update(entryNode)
}

// Toggle children on click.
function click(d) {
	if (IS_ALT_PRESSED) {
		// Open that url and set location in tree to match
		IS_ALT_PRESSED = false; // dont want it to be considered pressed anymore
		background.currentTabDoc = background.findDoc(background.urlDocs, null, null, d.uid);

		// reset to active
		//background.currentTabDoc.isAlive = true
		//d.isAlive = true

		chrome.tabs.create({url: d.url});
		return;
	}
	toggle(d);

	update(d);
}

function hoverOn(d) {
	var divFullTitle = document.getElementById('fullTitle');
	var divFullUrl = document.getElementById('fullUrl');
	if (d.fullTitle) {
		divFullTitle.textContent = d.fullTitle;
	}
	if (d.url) { 
		divFullUrl.textContent = d.url;
	}
}

function hoverOff(d) {
	document.getElementById('fullTitle').textContent = '';
	document.getElementById('fullUrl').textContent = '';
}

function toggleAll(d) {
	if (d.children) {
	  d.children.forEach(toggleAll);
	  toggle(d);
	}
}

// Toggle children.
function toggle(d, saveParent=false) {
	if (d.children) {
		d._children = d.children;
		if (saveParent) {
			d._children.forEach(function(d1) { d1.parent = d });
		}
		d.children = null;
	} else {
		d.children = d._children;
		d._children = null;
	}
}

// expand/collapse all utils

function expandCollapseAll(btn, entryNode) {

	if (btn.textContent == 'Expand All') {
		btn.textContent = 'Collapse All';
		// expand all nodes
		expandAll(entryNode);
	} else {
		btn.textContent = 'Expand All';
		// collapse all but the first node
		entryNode.children.forEach(toggleAll);					// collapse everything
		expandToSelected(background.docToLightUp, entryNode); 	// still show the last used doc
		
		$('body, hmtl').animate({ scrollLeft: 0}, 500); // scroll all the way left
		
		document.getElementById('searchInput').value = ''
		document.getElementById('clearBtn').style.visibility = 'hidden' // clear the search
		resetResults(entryNode);
	}
	update(entryNode);
}

function expandAll(d) {   
	if (d._children) {        
		d.children = d._children;
		d._children = null;       
	}
	var children = (d.children)?d.children:d._children;
	if (children) {
		children.forEach(expandAll);
	}
}

function expandOne(d) {
	if (d._children) {        
		d.children = d._children;
		d._children = null;       
	}
}

function expandToSelected(targetDocWParents, entryNode) {
	var steps = []
	function followParents(d) {
		steps.push(d.uid);
		if (d.parent) {
			followParents(d.parent);
		}
	}

	followParents(targetDocWParents); // get steps

	var lastUsedDoc = entryNode;
	for (var i = 0; i < steps.length; i++) {
		var step = steps[steps.length - 1 - i]; // they are in reverse order
		for (var c = 0; c < lastUsedDoc.children.length; c++) {
			var d = lastUsedDoc.children[c];

			if (d.uid == step) {
				if (i == steps.length - 1) { // last step
					d.expandToSelected = true; // set the path to be red
					return;
				}
				lastUsedDoc = d;
				d.expandToSelected = true;
				expandOne(lastUsedDoc);
				break;
			}
		}
	}
}
