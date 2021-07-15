({ // NOSONAR
    hookNetworkEvents : function(component, helper) {
        var origOpen = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function() {
            try {
                // Create a unique Id for every request, so we can match the associated response
                this.myRequestGuid = Date.now() + '-' + (Math.floor(Math.random() * Math.floor(100))).toString().padStart(2, "0");
                helper.fireNetworkEvent(component, helper, {"type" : "EVT_NETWORK_REQUEST", "id" : this.myRequestGuid });
                // Comes here on a network response
                this.addEventListener('load', function() {
                    // **** START PLR PoC ****
                    /*
                    // 	Detect events which require page to be scraped
                    if (this.responseURL.search('&ui-search-components-forcesearch-topresultsdataprovider.TopResultsDataProvider.getItems=1') != -1) {
                        console.log('*** Plr: Global Search detected!!');
                        helper.firePseudoLocationChange(component, helper, 'search');
                    } else if (this.responseText.search ('force:recordPreviewTemplate') != -1) {
                        console.log('*** Plr: Hover detected!!');
                        helper.firePseudoLocationChange(component, helper, 'hover');
                    }
                    else {
                        console.log('*** Plr: Nothing of interest');
                    }
                    */
                    // **** END PLR PoC ****
                    helper.fireNetworkEvent(component, helper, {"type" : "EVT_NETWORK_RESPONSE", "id" : this.myRequestGuid, "recordIds" : "dummy" });
                });
            } catch (e) {       
                console.error("*** Mon: error handling network requests and responses:" + e);
            }
            origOpen.apply(this, arguments);
        };
    },
    hookErrorEvents : function(component, helper) {
        window.onerror = function(error, url, line) {
            console.log("*** Mon: page error detected: "+ error+ ' URL:'+url+' L:'+line);
        };
    },
    hookClickEvents : function(component, helper) {
        document.addEventListener('click', function (event) {
            // Did the user click on a region containing UI Tabs?
            // console.log(event.target);
            if (event.target.tagName === 'ONE-RECORD-HOME-FLEXIPAGE2'){
                // ...if so, go and find any active UI Tab menu items
                let activeUItabs = event.target.getElementsByClassName("slds-tabs_default__item slds-is-active");
                if (activeUItabs.length > 0) {
                    // ...if we find tab items, then find the coordinates of the mouse click relative to the viewport
                    let mouseX = event.clientX;
                    let mouseY = event.clientY;
                    // ...and see if the click was on one of the active UI Tab menu elements
                    for (let i = 0; i < activeUItabs.length; i++) {
                        if (helper.isBoundedBy(component, helper, activeUItabs[i], mouseX, mouseY)) {
                            // Yes!
                            let aPath = helper.toCamelCase(activeUItabs[i].title)
                            console.log('*** Mon: You clicked ' + aPath);
                            helper.firePseudoLocationChange(component, helper, aPath);
                        }
                    } 
                }
            }
        }, false);
    },
    isBoundedBy : function(component, helper, element, x, y) {
        let retval = null;
        let top = element.getBoundingClientRect().top;
        let bottom = element.getBoundingClientRect().bottom;
        let left = element.getBoundingClientRect().left;
        let right = element.getBoundingClientRect().right;

        if (x > right || x < left || y < top || y > bottom) {
            retval = false;
        } else {
            retval = true;
        }
        return retval;
    },  
    toCamelCase : function (sentenceCase) {
        var out = "";
        sentenceCase.split(" ").forEach(function (el, idx) {
            var add = el.toLowerCase();
            out += (idx === 0 ? add : add[0].toUpperCase() + add.slice(1));
        });
        return out;
    },  
    fireNetworkEvent : function(component, helper, msg) {
        try {
            let consoleDomain = window.location.origin;
            if (consoleDomain.search('.lightning.force.com') === -1) { // not a console URL
                if (consoleDomain.search('--c.') != -1) { // is a Visualforce URL
                    consoleDomain = consoleDomain.split('--c')[0] + '.lightning.force.com'; 
                }    
            }
            parent.postMessage(msg,consoleDomain);
        } catch (e) {       
            console.error("*** Mon: error sending network event:" + e);
        }
    },
    firePseudoLocationChange : function(component, helper, aPath) {
        console.log('*** Mon : about to fire network inspection initiated location change');
        try {
            let msg={newPath : aPath}; 
            console.log('*** Mon : custom path set to: ' + msg.newPath);
            let consoleDomain = window.location.origin;
            if (consoleDomain.search('.lightning.force.com') === -1) { // not a console URL
                if (consoleDomain.search('--c.') != -1) { // is a Visualforce URL
                    consoleDomain = consoleDomain.split('--c')[0] + '.lightning.force.com'; 
                }    
            }
            parent.postMessage(msg,consoleDomain);
            console.log(`*** Mon: sent psuedo location change event to ${consoleDomain}`);
        } catch (e) {       
            console.error("*** Mon: error sending custom locationChange event:" + e);
        }
    }
})
