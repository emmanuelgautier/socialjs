var url = window.location.href;
var params = '?';
var index = url.indexOf(params);
if (index > -1) {
  params = url.substring(index);
}

params += '&from=' + encodeURIComponent(url);

var redirect = chrome.extension.getURL('popup.html');
window.location = redirect + params;
