function renderStatus(statusText) {
  document.getElementById('status').textContent = statusText;
}


document.addEventListener('DOMContentLoaded', function() {
  div_id = document.getElementById('id');
  chrome.storage.sync.get('current_tab', function(items) {
    id = items['current_tab']['id'];
    if (!id) {
      return
    }
    div_id.textContent = id;
  });

  div_url = document.getElementById('urls');
  chrome.storage.sync.get('urls', function(items) {
    if (items['urls'] == null) {
      return;
    } 

    for (i = 0; i < items['urls'].length; i++) {
      var innerDiv = document.createElement('div')
      div_url.appendChild(innerDiv);
      innerDiv.innerHTML = items['urls'][i];
    }
  });
});

/*
document.addEventListener('DOMContentLoaded', function() {
  console.log("started")
  getCurrentTabUrl(function(url) {
    console.log(url)
    saveChanges(url, function(items) {
      console.log(items)
      // display items
      div = document.getElementById('urls');
      for (i = 0; i < items.length; i++) {
        var innerDiv = document.createElement('div');

        div.appendChild(innerDiv);
        innerDiv.innerHTML = items[i];
      }
    });

    
  });
});
*/
