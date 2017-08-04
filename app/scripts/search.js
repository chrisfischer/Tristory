'use strict'

function search(term, root) {
	resetResults(root)
	_searchHelper(term, root);
}

function _searchHelper(term, startingNode) {
	// assume term is lowercased
	if (_isResult(term, startingNode)) {
		startingNode.isResult = true;
		d3.select("#u" + startingNode.uid).select("circle").style({"stroke": "red", "stroke-width": 3});
		// if there's a parent, expand it
		if (startingNode.parent) {
			_expand(startingNode.parent);
		}
	} /*else {
		startingNode.isResult = false;
		d3.select("g.node", "u" + startingNode.uid).select("circle").style({"stroke": "steelblue", "stroke-width": 1.5});
	}*/

	var children = (startingNode.children)?startingNode.children:startingNode._children;
	if (children) {
		children.forEach(function(d) { _searchHelper(term, d); });
	}

}

function _isResult(term, doc) {
	return (Boolean(doc.fullTitle) && doc.fullTitle.toLowerCase().includes(term)) || (Boolean(doc.url) && doc.url.toLowerCase().includes(term));
}

function resetResults(root) {

	d3.selectAll('g.node').each(function(d) {
    	d3.select(this).select("circle").style({"stroke": "steelblue", "stroke-width": 1.5})
	})

	resetRecursive(root);

	function resetRecursive(root) {
		root.isResult = false;
		// reset either children or _children
		var children = (root.children)?root.children:root._children;
		if (children) {
			children.forEach(resetResults);
		}
	}
}

function _expand(d) {
	/*
	Expands from a child upwards
	*/ 

	if (d._children) {        
		d.children = d._children;
		d._children = null;       
	}

	if (d.parent) {
		_expand(d.parent);
	}
}


