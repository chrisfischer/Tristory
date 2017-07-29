var background = chrome.extension.getBackgroundPage(); //do this in global scope for popup.js

document.addEventListener('DOMContentLoaded', function() {
  chrome.tabs.create({url: chrome.extension.getURL('main.html')});

  //background.updateView()
});