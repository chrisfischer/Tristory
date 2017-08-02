'use strict'

var results = []

function search(term, startingNode) {
	results = []
	searchHelper(term, startingNode)
}

function searchHelper(term, startingNode) {
	// assume term is lowercased
	console.log(startingNode, term, isResult(term, startingNode));
	if (isResult(term, startingNode)) {
		results.push(startingNode);
	}
	if (startingNode.children) {
		startingNode.children.forEach(function(d) {
			searchHelper(term, d);
		});
	}

}

function isResult(term, doc) {
	return (Boolean(doc.fullTitle) && doc.fullTitle.toLowerCase().includes(term)) || (Boolean(doc.url) && doc.url.toLowerCase().includes(term));
}