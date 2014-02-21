var url = window.location.href;
var params = '?';
var index = url.indexOf(params);
if (index > -1) {
    params = url.substring(index);
}

params += '&from=' + encodeURIComponent(url);

var redirect = chrome.extension.getURL('socialjs/popup.html');

window.location.href = redirect + params;