({ //NOSONAR
    hookNetworkEvents : function(component, helper) {
        var origOpen = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function() {
            try {
                this.addEventListener('load', function() {
                    // 	Detect markup in the response which should trigger a new interaction (i.e. pseudo location change)
                    if (this.responseURL.search('&ui-search-components-forcesearch-topresultsdataprovider.TopResultsDataProvider.getItems=1') != -1) {
                        console.log('*** Plr: Global Search detected!!');
                        helper.firePseudoLocationChange(component, helper, 'search');
                    } else if (this.responseText.search ('force:recordPreviewTemplate') != -1) {
                        console.log('*** Plr: Hover detected!!');
                        helper.firePseudoLocationChange(component, helper, 'hover');
                    }
                    else {
                        // console.log('*** Plr: Nothing of interest here');
                    }
                    // **** END PLR PoC ****
                 });
            } catch (e) {       
                console.error("*** Plr: error handling network requests and responses:" + e);
            }
            origOpen.apply(this, arguments);
        };
    },
    hookClickEvents : function(component, helper) {
        document.addEventListener('click', function (event) {
            // Did the user click on a region containing UI Tabs?
            let activeUItabs = [];
            if (event.target.tagName === 'ONE-RECORD-HOME-FLEXIPAGE2' || event.target.tagName === 'SPAN'){
                // ...if so, go and find any active UI Tab menu items
                // This is for record pages
                activeUItabs = event.target.getElementsByClassName("slds-tabs_default__item slds-is-active");
                // This is for home pages which render a bit differently
                if (activeUItabs === null || activeUItabs.length === 0) {
                    activeUItabs = [];
                    let anActiveTab = event.target.closest(".tabs__item.active");
                    if (anActiveTab) {
                        activeUItabs.push(anActiveTab);
                    }
                }
                if (activeUItabs.length > 0) {
                    // ...if we find tab items, then find the coordinates of the mouse click relative to the viewport
                    let mouseX = event.clientX;
                    let mouseY = event.clientY;
                    // ...and see if the click was on one of the active UI Tab menu elements
                    for (let i = 0; i < activeUItabs.length; i++) {
                        if (helper.isBoundedBy(component, helper, activeUItabs[i], mouseX, mouseY)) {
                            // Yes!
                            let aPath = 'tab';
                            if (event.target.tagName === 'ONE-RECORD-HOME-FLEXIPAGE2') {
                                aPath = helper.toCamelCase(activeUItabs[i].title)
                            } else {
                                aPath = helper.toCamelCase(activeUItabs[i].getElementsByClassName("tabHeader")[0].title);
                            }
                            console.log('*** Plr: Detected tab click location change: ' + aPath);
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

        // console.log('tab top,bottom,left,right:' + top + ',' + bottom + ',' + left + ',' + right);
        // console.log('click x,y:' + x + ',' + y );

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
    firePseudoLocationChange : function(component, helper, aPath) {
        console.log('*** Plr : about to pseudo location change');
        try {
            let msg={newPath : aPath}; 
            console.log('*** Plr : custom path set to: ' + msg.newPath);
            let consoleDomain = window.location.origin;
            if (consoleDomain.search('.lightning.force.com') === -1) { // not a console URL
                if (consoleDomain.search('--c.') != -1) { // is a Visualforce URL
                    consoleDomain = consoleDomain.split('--c')[0] + '.lightning.force.com'; 
                }    
            }
            parent.postMessage(msg,consoleDomain);
            console.log(`*** Plr: sent pseudo location change event to ${consoleDomain}`);
        } catch (e) {       
            console.error("*** Plr: error sending pseudo location change event:" + e);
        }
    },
	doGetUIDetails : function(theInteraction) {
        let isHover = false;
        let hoverElement = null;
        let standardisedRoute = theInteraction.interactionRouteStandardised
        if (standardisedRoute && standardisedRoute.search('/hover') != -1) {
            isHover = true;
            console.log("*** Plr: scraping hover component only");
        }
        let uiRecord = [];
        let docCopy = document.getElementsByTagName('*')[0];
        if (isHover) {
            hoverElement = docCopy.getElementsByClassName("previewContainer")[0];
        }
        console.log(docCopy);
        let aTags = docCopy.getElementsByTagName('a');
        // console.log(aTags);
        for (let i = 0 ; i < aTags.length ; i++) {
            // ignore hidden elements
            let style = window.getComputedStyle(aTags[i]);
            if (!(style.display === 'none' || aTags[i].offsetParent === null)) {
                let href = aTags[i].href;
                // ignore uninteresting hrefs 
                if(href!= undefined && !href.includes('javascript:void')) {
                    if (isHover && hoverElement) {
                        if (!aTags[i].closest('.previewContainer')) {
                            console.log("*** Plr: ignored <a> element outside hover component");
                            continue;
                        } else {
                            console.log("*** Plr: found <a> element inside hover component");
                        }
                    }
                    let cmpContainer = aTags[i].closest('flexipage-component2');
                    let cmpName = cmpContainer ? cmpContainer.dataset.componentId : null;
                    // If the 'a' tag was not enclosed by a 'flexipage-component2' it may have been a list view
                    if (!cmpName) {
                        if (aTags[i].closest('.listViewContent')) {
                            cmpName = 'listViewContent';
                        } else if (aTags[i].closest('.forceSearchSearchPageDesktop')) {
                            cmpName = 'forceSearch:searchPageDesktop';
                        } else if (isHover) {
                            cmpName = 'forceHover';
                        }
                    }
                    let recordId = href.match(/\b[a-z0-9]\w{4}0\w{12}|[a-z0-9]\w{4}0\w{9}\b/g);
                    /* 
                    if (!recordId) {
                        // Maybe not a SF record Id
                        if (href.search('mailto:') != -1) {
                            recordId = 'email address';
                        } else if (href.search('tel:') != -1) {
                            recordId = 'phone number';
                        }
                    }
                    */
                    let linkName = aTags[i].text;
                    if (cmpName && recordId) {
                        uiRecord.push({'component' : cmpName, 'linkLabel' : linkName, 'recordId' : recordId[recordId.length - 1]}); 
                    }  
                }
            } else {
                // console.log('*** Mon hidden element ignored ' + aTags[i].href);
            }
        }
        return uiRecord;
    },    
    // Create a UI log header object
    getUILogHeader : function(component, helper, theInteraction) {
        let uiLogHeader = {
            userId : theInteraction.interactionUserId,
            profileName : theInteraction.interactionProfileName,
            permissionSets : theInteraction.interactionPermissionSets,
            guid : theInteraction.interactionGuid,
            route : theInteraction.interactionRoute,
            routeStandardised : theInteraction.interactionRouteStandardised,
            ipAddress : theInteraction.interactionIpAddress,
            timeStamp : theInteraction.interactionEndTime
        }
        return uiLogHeader;
    },
    publishUILog : function(component, helper, theLog) {
        // Here is where we populate interaction constants including details pulled  
        // from the running user's record e.g. physical office location
        var action = component.get("c.doPostToUILog");
        let logPayload = JSON.stringify(theLog)
        action.setParams({ 
            aLog : logPayload
        });
        action.setCallback(this, function(response) {
            var state = response.getState();
            if (state === "SUCCESS") {
                console.log('*** Plr: *** published UI log  ');
            } else if (state === "INCOMPLETE") {
                // do something
            } else if (state === "ERROR") {
                var errors = response.getError();
                if (errors) {
                    if (errors[0] && errors[0].message) {
                        // **EH - FATAL
                        console.error('*** Plr: Failed to publish UI log: ' + errors[0].message);
                    }
                } else {
                    // **EH - FATAL
                    console.error('*** Plr: Failed to publish UI log');
                }
            }
        });
        $A.enqueueAction(action);
    }
})