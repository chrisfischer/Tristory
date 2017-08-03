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
	if (fullTitle.length > 20) {
		title = fullTitle.substring(0,20) + '...';
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
				'uid': _getUID()
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
				'uid': _getUID()
		};
		addChild(doc);

		var re = /#[\w|\W|\d|\D]+\/[\w|\W|\d|\D]+/ig // for parsing newUrl
		var re2 = /(?:(?!#).)*/i 					 // for parsing parent url

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

function onActivate(highlightInfo) {
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
}

chrome.tabs.onActivated.addListener(onActivate);
chrome.tabs.onCreated.addListener(function (tab) {
	console.log('onCreated begin', FLAG_CREATED, tab);

	// if we didn't just switch tabs or go to our extension
	if (tab.url.substring(0,9) != 'chrome://' && tab.url.substring(0,16) != 'chrome-extension') {
		FLAG_CREATED = true;		
	}
	console.log('onCreated end', FLAG_CREATED);
})
chrome.tabs.onRemoved.addListener(function (tabId, info) {
	// info has windowId and isWindowClosing
	console.log("onClosed", tabId)
	
	
})



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
