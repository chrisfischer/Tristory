'use strict'

var _results = []

function search(term, startingNode) {
	resetResults()
	_searchHelper(term, _results, startingNode)
	return _results
}

function _searchHelper(term, results, startingNode) {
	// assume term is lowercased
	if (_isResult(term, startingNode)) {
		results.push(startingNode);
	}
	if (startingNode.children) {
		startingNode.children.forEach(function(d) {
			_searchHelper(term, results, d);
		});
	}

}

function _isResult(term, doc) {
	return (Boolean(doc.fullTitle) && doc.fullTitle.toLowerCase().includes(term)) || (Boolean(doc.url) && doc.url.toLowerCase().includes(term));
}

function querySearchResults(uid) {
	for (var i = 0; i < _results.length; i++) {
		if (_results[i].uid == uid) {
			return true
		}
	}
	return false
}

function resetResults() {
	_results = []
}
