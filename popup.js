/*chrome.runtime.getBackgroundPage(function(opener) {
    opener.social.setAuthUrl(window.location.href);

    setTimeout(function() {
        window.open('', '_self');
        window.close();
    }, 500);
});*/

var view = document.createElement('webview');
    view.style.width = "100%";
    view.style.height = "100%";
    view.src = document.location.href.match(/\?u=(.*)/)[1];

document.body.appendChild(view);
view.addEventListener('loadcommit', function(view){
    if(!/https:\/\/(www\.google\.com\/robots\.txt#|www\.facebook\.com\/connect\/login_success\.html)(.*)/.test(view.url)){
        return false;
    }

    chrome.runtime.getBackgroundPage(function(background){
        background.social.windowResponse({
            url: view.url,
            content: null
        });
        window.close();
    });

    /*view.executeScript({code: 'document.body.innerHTML'}, function(content){
        chrome.runtime.getBackgroundPage(function(background){
            background.social.windowResponse({
                url: view.url,
                content: content
            });
            window.close();
        });
    });*/
});
