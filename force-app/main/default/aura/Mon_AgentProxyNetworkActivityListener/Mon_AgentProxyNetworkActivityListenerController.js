({ // NOSONAR
	doInit : function(component, event, helper) {
        helper.hookNetworkEvents(component, helper);
        // helper.hookErrorEvents(component, helper);
        // helper.hookClickEvents(component, helper);
    },
    // **** START PLR PoC ****
	doGetUIDetails : function(component, event, helper) {
        // setTimeout(function() {
            var params = event.getParam('arguments');
            var standardisedRoute = null;
            let isHover = false;
            let hoverElement = null;
            if (params) {
                standardisedRoute = params.standardisedRoute;
                // add your code here
            }
            console.log("*** Plr: getting UI components and record ids, route is:" + standardisedRoute);
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
            // console.log('*** Mon UI scraper:')
            // console.dir(uiRecord);
        // }, 5000);
        return uiRecord;
    }
    // **** END PLR PoC ****
})
