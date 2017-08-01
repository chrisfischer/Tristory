var background = chrome.extension.getBackgroundPage(); 

document.addEventListener('DOMContentLoaded', function() {
  chrome.tabs.create({url: chrome.extension.getURL('main.html')});

});