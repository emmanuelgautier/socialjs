chrome.runtime.getBackgroundPage(function( opener ){
    opener.social.setAuthUrl( window.location.href );
    
    setTimeout(function(){
        window.open('','_self');
        window.close();
    }, 500);
});