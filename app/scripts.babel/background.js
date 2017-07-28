url_docs = [];
current_tab_doc = null; // if null means new tab

function add_new_starting_node(doc) {
    if (doc) {
        url_docs.push(doc);
    }
}

function add_child(child) {
    if (child) {
        current_tab_doc['children'].push(child);
    }
}

chrome.tabs.onUpdated.addListener(function(updated_tab_id, changeInfo, tab) {
    
    new_url = changeInfo.url
    if (!new_url || new_url == 'chrome://newtab/') {
        return
    }
    if (current_tab_doc && current_tab_doc['parent']) {
        parent_referenced = find_doc_in_branch(updated_tab_id, new_url, current_tab_doc['parent'])
        if (parent_referenced) {
            current_tab_doc = parent_referenced
            return // its not null, there was a parent that we went back to, no need to add a new document
        }
    }

    // parent id 
    // is the parent new
    if (!current_tab_doc) {
        // create new document to store
        doc = {
            'id': updated_tab_id,
            'url': new_url,
            'children': [],
            'parent': null,
            'title': tab.title
        }
        add_new_starting_node(doc)
        current_tab_doc = doc
    } else {
        // update appropriate document
        doc = {
            'id': updated_tab_id,
            'url': new_url,
            'children': [],
            'parent': current_tab_doc,
            'title': tab.title
        }
        add_child(doc)
        current_tab_doc = doc
    }
    console.log(url_docs, current_tab_doc)
}); 

function find_doc_in_branch(target_id, target_url, base_doc) {
    console.log('find one in branch called')
    if (base_doc['id'] == target_id && base_doc['url'] == target_url) {
        return base_doc
    } else if (base_doc['parent']) {
        return find_doc_in_branch(target_id, target_url, base_doc['parent'])
    } else {
        return null
    }
}

function find_doc(target_id, target_url, arr_of_docs) {
    console.log('find one called')
    for (i = 0; i < arr_of_docs.length; i++) {
        curr_doc = arr_of_docs[i]
        if (curr_doc['id'] == target_id && curr_doc['url'] == target_url) {
            return curr_doc
        } else if (curr_doc['children'].length == 0) {
            continue
        } else {
            return find_doc(target_id, curr_doc['children'])
        }
    }
    return null
}

function on_activate_or_create(highlight_info) {

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

        if (url == 'chrome://newtab/') {
            current_tab_doc = null
        } else {
            current_tab_doc = find_doc(id, url, url_docs)
            if (!current_tab_doc) {
                // is null, error
            }
        }
        console.log(url_docs, current_tab_doc)
    });
}

chrome.tabs.onActivated.addListener(on_activate_or_create)
chrome.tabs.onCreated.addListener(on_activate_or_create)


