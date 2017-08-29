'use strict';

var urlDocs = [];
var docLimbo = []; // list of documents that have no title
var currentTabDoc = null; // if null means new tab
											// currentTabDoc is the document that we would want to add a child to at anytime

var activeTabId = -1 // tab id of the current tab, ALWAYS up to date
var docToLightUp = null // doc to mark as current on d3 tree

var FLAG_CREATED = false; // turns true if a tab was just created

function addNewStartingNode(doc) {
	if (doc) {
		urlDocs.push(doc);
	}
}

function addChild(child) {
	if (child) {
		if (currentTabDoc.children) {
			currentTabDoc.children.push(child);
		} else {
			currentTabDoc.children = [child];
		}
	}
}

function addTitleToLimbo(tabId, url, fullTitle) {
	var title = '';
	if (fullTitle.length > 25) {
		title = fullTitle.substring(0,25) + '...';
	} else {
		title = fullTitle;
	}

	for (var i = 0; i < docLimbo.length; i++) {
		var currDoc = docLimbo[i];
		if (currDoc.tabId == tabId && currDoc.url == url) {
			currDoc.title = title;
			currDoc.fullTitle = fullTitle;
			docLimbo.splice(i, 1);
		}
	}
}

var _counter = -1
function _getUID() {
	_counter++;
	return _counter;
}

chrome.tabs.onUpdated.addListener(function(updatedTabId, changeInfo, tab) {

	// for when updated gets called afterwards with the title
	if (changeInfo.title) {
		addTitleToLimbo(tab.id, tab.url, changeInfo.title);
		return;
	}

	var newUrl = changeInfo.url;

	// we don't want to account for new tabs or our extension being opened
	if (!newUrl || newUrl.substring(0,9) == 'chrome://' || newUrl.substring(0,16) == 'chrome-extension') {
			return;
	}

	// FOR THE BACK BUTTON, want to travel back up the tree
	if (currentTabDoc && currentTabDoc.parent) {
		var parentReferenced = findDocInParents(newUrl, currentTabDoc.parent)
		if (parentReferenced) {
			currentTabDoc = parentReferenced;
			return; // its not null, there was a parent that we went back to, no need to add a new document
		}
	}

	// FOR THE FORWARD BUTTON, want to travel down the tree
	if (currentTabDoc && currentTabDoc.children) {
		var childReferenced = findDoc(currentTabDoc.children, null, newUrl, null)
		if (childReferenced) {
			currentTabDoc = childReferenced;
			return; // its not null, there was a child that we went foward to, no need to add a new document
		}
	}

	// TODO refractor this

	// if a tab was created, or if not, we want to reset FLAG_CREATED
	FLAG_CREATED = false;

	// is the parent tab a 'chrome://newtab'
	if (!currentTabDoc) {
		// create new document to store
		var doc = {
				'tabId': updatedTabId,
				'url': newUrl,
				'children': null,
				'parent': null,
				'title': null,
				'fullTitle': null,
				'isAlive': true,
				'uid': _getUID(),
				'time': Date.now()
		};
		addNewStartingNode(doc);

		// the parent was 'chrome://newtab' so we dont know the title yet
		docLimbo.push(doc);

		// this new tab was created from 'chrome://newtab' to its automatocally set
		currentTabDoc = doc;
	} else {
		// update appropriate parent document to have child
		var doc = {
				'tabId': updatedTabId,
				'url': newUrl,
				'children': null,
				'parent': currentTabDoc,
				'title': null,
				'fullTitle': null,
				'isAlive': true,
				'uid': _getUID(),
				'time': Date.now()
		};
		addChild(doc);

		var re = /#[\w|\W|\d|\D]+\/[\w|\W|\d|\D]+/ig 	// for parsing newUrl
		var re2 = /(?:(?!#).)*/i 					 	// for parsing parent url

		if (newUrl.includes("#") && !re.test(newUrl) && newUrl.includes(re2.exec(currentTabDoc.url))) {
			// possibly a change of section in the path using #
			doc.title = currentTabDoc.title;
			doc.fullTitle = currentTabDoc.fullTitle;
		} else {
			// we don't know the title yet so add to limbo
			docLimbo.push(doc);
		}

		if (updatedTabId == activeTabId) {
			// only update the current tab doc if we are now using this new tab
			currentTabDoc = doc;
		}
	}
	console.log('onUpdated', urlDocs, currentTabDoc);
}); 

function findDocInParents(targetUrl, baseDoc) {
	/*
	Search upwards to find matching parent
	*/
	console.log('find one in branch called', targetUrl, baseDoc);
	if (baseDoc.url == targetUrl) {
		return baseDoc;
	} else if (baseDoc.parent) {
		return findDocInParents(targetUrl, baseDoc.parent);
	} else {
		return null;
	}
}

function findDoc(arrOfDocs, targetTabId, targetUrl, targetUID) {
	/*
	Depth first search to find arbitrary doc
	*/

	// TODO refractor this logic mess

	// if all search targets are null, return
	if (targetTabId == null && targetUrl == null && targetUID == null) { return null }

	if (!arrOfDocs) { return null }

	for (var i = 0; i < arrOfDocs.length; i++) {
		var currDoc = arrOfDocs[i];
		if (targetTabId && targetUrl && !targetUID && currDoc.tabId == targetTabId && currDoc.url == targetUrl) {
			// searching by targetTabId and target url
			return currDoc;
		} else if (!targetTabId && targetUrl && !targetUID && targetUrl == currDoc.url) {
			// searching by target url
			return currDoc;
		} else if (!targetTabId && !targetUrl && targetUID && targetUID == currDoc.uid) {
			// searching by targetUID
			return currDoc;
		} else if (!currDoc.children) {
			// reached the bottom of the tree
			continue;
		} else {
			var doc_return = findDoc(currDoc.children, targetTabId, targetUrl, targetUID);
			if (!doc_return) {
				continue;
			} else {
				return doc_return;
			}
			
		}
	}
	return null;
}

chrome.tabs.onActivated.addListener(function(highlightInfo) {
	var queryInfo = {
		active: true,
		currentWindow: true
	};

	chrome.tabs.query(queryInfo, function(tabs) {
		var tab = tabs[0];
		var id = tab.id;
		var url = tab.url;
		if (!id || !url) {
			return;
		}
		console.log('onSwitch begin', urlDocs, currentTabDoc, FLAG_CREATED);

		if (url.substring(0,9) == 'chrome://') {
			currentTabDoc = null;
		} else if (url.substring(0,16) == 'chrome-extension') {
			if (currentTabDoc) {
				docToLightUp = currentTabDoc;
				currentTabDoc = null;
			}
			// TODO maybe set to null??
		} else if (FLAG_CREATED) {
			// new tab was just created and we switched to it automatically
			// still want the currentTabDoc to be the parent for onUpdated
			FLAG_CREATED = false;
		}	else {
			currentTabDoc = findDoc(urlDocs, id, url, null);
			if (currentTabDoc) {
				// idk maybe set title
				//addTitleToLimbo(id, url, tab.titleh)
			}
		}
		activeTabId = id;
		console.log('onSwitch end', urlDocs, currentTabDoc, FLAG_CREATED);
	});
});
chrome.tabs.onCreated.addListener(function (tab) {
	console.log('onCreated begin', FLAG_CREATED, tab);

	// if we didn't just switch tabs or go to our extension
	if (tab.url.substring(0,9) != 'chrome://' && tab.url.substring(0,16) != 'chrome-extension') {
		FLAG_CREATED = true;		
	}
	console.log('onCreated end', FLAG_CREATED);
});
chrome.tabs.onRemoved.addListener(function (tabId, info) {
	// info has windowId and isWindowClosing
	function markRemoved(d) {
		if (d.tabId == tabId) {
			d.isAlive = false;
		}
		if (d.children) {
			d.children.forEach(markRemoved);
		}
	}
	urlDocs.forEach(markRemoved);
	
	
});

function getTrees() {
	if (urlDocs.length == 0) {
		return null
	}

	var docs = JSON.parse(JSON.stringify(urlDocs, ['url', 'title', 'fullTitle', 'children', 'uid', 'isAlive', 'time']));

	var alive = []
	var dead = []

	for (var i = 0; i < docs.length; i++) {
		var isBranchAlive = false;
		var branch = docs[i];
		if (_checkBrachForAlive(branch)) {
			alive.push(branch)
		} else {
			dead.push(branch)
		}
	}

	var deadGrouped = _chunkify(dead, 6, false)
	var deadTrees = []
	
	for (var i = 0; i < deadGrouped.length; i++) {
		var group = deadGrouped[i]
		var [count, maxTime] = _countNodesInGroup(group)
		deadTrees.push({
			'children': ((group.length != 0) ? group : null),
			'title': 'New Tab',
			'fullTitle': 'New Tab',
			'url': 'chrome://newtab',
			'isAlive': false,
			'tabCount': count,
			'maxTime': maxTime
		})
	}

	var [count, maxTime] = _countNodesInGroup(alive)
	return [{
				'children': ((alive.length != 0) ? alive : null),
				'title': 'New Tab',
				'fullTitle': 'New Tab',
				'url': 'chrome://newtab',
				'isAlive': true,
				'tabCount': count,
				'maxTime': maxTime
		   },
		   deadTrees];
}

function _chunkify(a, size) {
    
    if (a.length <= size)
        return [a];

    var out = []
    var i = 0

    if (a.length % size === 0) {
        while (i < a.length) {
            out.push(a.slice(i, i += size));
        }
    }
    else {
        while (i < a.length) {
            out.push(a.slice(i, i += size));
        }
    }

    return out;
}

function _checkBrachForAlive(startingNode) {
	if (startingNode.isAlive) { return true }

	if (startingNode.children) {
		for (var i = 0; i < startingNode.children.length; i++) {
			if (_checkBrachForAlive(startingNode.children[i])) {
				return true
			}
		}
		
	}
	return false
}

function _countNodesInGroup(startingNodes) {
	var count = 1;

	var maxTime = 0;

	if (startingNodes) {
		count += startingNodes.length; // for the first layer

		function countHelper(node) {

			if (maxTime < node.time) { maxTime = node.time }

			if (!node.children) { return }
			count += node.children.length;
			node.children.forEach(countHelper);
		}

		startingNodes.forEach(countHelper);
	}

	return [count, maxTime];
}



/*
Orderings for clicking links:
	-Open link in current tab:
		1. onUpdated

	-Open link in new background tab:
		1. onCreated
		2. onUpdated

	-Open link in new tab, ie: target='_blank'
		1. onCreated
		2. onActivated
		3. onUpdated








*/
