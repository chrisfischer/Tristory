urlDocs = [];
docLimbo = []; // list of documents that have no title
currentTabDoc = null; // if null means new tab

activeTabId = -1

FLAG_CREATED = false; // turns true if a tab was just created

function addNewStartingNode(doc) {
	if (doc) {
		urlDocs.push(doc);
	}
}

function addChild(child) {
	if (child) {
		currentTabDoc['children'].push(child);
	}
}

function addTitleToLimbo(tabId, url, fullTitle) {
	if (fullTitle.length > 20) {
		title = fullTitle.substring(0,20) + '...';
	} else {
		title = fullTitle
	}

	for (i = 0; i < docLimbo.length; i++) {
		currDoc = docLimbo[i];
		if (currDoc.tabId == tabId && currDoc.url == url) {
			currDoc.title = title;
			currDoc.fullTitle = fullTitle
			docLimbo.splice(i, 1);
		}
	}
}

chrome.tabs.onUpdated.addListener(function(updatedTabId, changeInfo, tab) {

	if (changeInfo.title) {
		addTitleToLimbo(tab.id, tab.url, changeInfo.title);
		return;
	}

	newUrl = changeInfo.url;
	if (!newUrl || newUrl == 'chrome://newtab/' || newUrl.substring(0,16) == 'chrome-extension') {
			return;
	}
	if (currentTabDoc && currentTabDoc['parent']) {
		parentReferenced = findDocInBranch(newUrl, currentTabDoc['parent'])
		if (parentReferenced) {
				currentTabDoc = parentReferenced;
				return; // its not null, there was a parent that we went back to, no need to add a new document
		}
	}

	// TODO refractor this

	// parent id 
	// is the parent new
	if (!currentTabDoc) {
		// create new document to store
		doc = {
				'tabId': updatedTabId,
				'url': newUrl,
				'children': [],
				'parent': null,
				'title': null,
				'fullTitle': null
		}
		addNewStartingNode(doc);
		docLimbo.push(doc);
		currentTabDoc = doc;
	} else {
		// update appropriate document
		doc = {
				'tabId': updatedTabId,
				'url': newUrl,
				'children': [],
				'parent': currentTabDoc,
				'title': null,
				'fullTitle': null
		}
		addChild(doc);
		docLimbo.push(doc);
		if (updatedTabId == activeTabId) { //currentTabDoc.tabId
			currentTabDoc = doc;
		}
	}
	console.log('onUpdated', urlDocs, currentTabDoc);
}); 

function findDocInBranch(targetUrl, baseDoc) {
	console.log('find one in branch called', targetUrl, baseDoc);
	if (baseDoc['url'] == targetUrl) {
		return baseDoc;
	} else if (baseDoc['parent']) {
		return findDocInBranch(targetUrl, baseDoc['parent']);
	} else {
		return null;
	}
}

function findDoc(targetId, targetUrl, arrOfDocs) {
	console.log('find doc', targetUrl, arrOfDocs)
	for (i = 0; i < arrOfDocs.length; i++) {
		currDoc = arrOfDocs[i];
		if (currDoc['tabId'] == targetId && currDoc['url'] == targetUrl) {
				return currDoc;
		} else if (currDoc['children'].length == 0) {
				continue;
		} else {
				return findDoc(targetId, targetUrl, currDoc['children']);
		}
	}
	return null;
}

function onActivateOrCreate(highlightInfo) {
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

		if (url == 'chrome://newtab/') {
			currentTabDoc = null;
		} else if (url.substring(0,16) == 'chrome-extension') {
			//return;
		} else if (FLAG_CREATED) {
			// new tab was just created
			FLAG_CREATED = false;
			//return;
		}	else {
			currentTabDoc = findDoc(id, url, urlDocs);
			if (currentTabDoc) {
				// idk maybe set title
			}
		}
		activeTabId = id
		console.log('onSwitch end', urlDocs, currentTabDoc, FLAG_CREATED);
	});
}

chrome.tabs.onActivated.addListener(onActivateOrCreate);
chrome.tabs.onCreated.addListener(function (tab) {
	console.log('onCreated begin', FLAG_CREATED, tab);
	if (tab.url != 'chrome://newtab/' && tab.url.substring(0,16) != 'chrome-extension') {
		FLAG_CREATED = true;		
	}
	
	console.log('onCreated end', FLAG_CREATED)
})
