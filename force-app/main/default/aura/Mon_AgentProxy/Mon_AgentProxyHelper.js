({ // NOSONAR
    // Main event loop
    handleEvent : function(component, helper, myEvent) {
        
        let interactionState = component.get("v.interactionState");
        let eventType = myEvent.type;
        let eventData = myEvent.data;

        switch (interactionState) {
            // Time just expired, ignore events until transition to next state complete
            case 'TIMER_EXPIRED' : 
                break;
            // Waiting for interaction constants to be initialised. e.g. User Location
            case 'WAITING_COMPONENT_INITIALISATION' : 
                switch (eventType) { // NOSONAR
                    case "EVT_COMPONENT_INITIALISED" :
                        helper.doInitialiseInteractionConstants(component, helper, eventData);
                        helper.setInteractionState (component, helper, 'WAITING_INTERACTION_START');
                        helper.handleLocationChangeHelper(component, helper, 'firstload'); // Pseudo location change on startup
                        break;
                    default:
                        break;
                }
                break;
            case 'WAITING_INTERACTION_START' : 
                switch (eventType) { // NOSONAR
                    case "EVT_LOCATION_CHANGE" :
                        helper.doInteractionStart(component, helper, eventData);
                        helper.setInteractionState (component, helper, 'NETWORK_IDLE');
                        break;
                    default:
                        break;
                }
                break;
            case 'INTERACTION_COMPLETE' : 
                switch (eventType) { // NOSONAR
                    case "EVT_FINALISE_INTERACTION" :
                        helper.doInteractionEnd(component, helper, eventData);
                        helper.setInteractionState (component, helper, 'WAITING_INTERACTION_START');
                        break;
                    default:
                        break;
                }
                break;
            case 'NETWORK_IDLE' : 
                switch (eventType) {
                    case "EVT_LOCATION_CHANGE" :
                        helper.doInteractionStart(component, helper, eventData);
                        break;
                    case "EVT_SPINNER_START" :
                        helper.doSpinnerActivityStart(component, helper, eventData);
                        helper.setInteractionState (component, helper, 'NETWORK_ACTIVE');
                        break;
                    case "EVT_NETWORK_REQUEST" :
                        helper.doNetworkActivityStart(component, helper, eventData);
                        helper.setInteractionState (component, helper, 'NETWORK_ACTIVE');
                        break;
                    case "EVT_RENDER" :
                        helper.doRenderEvent(component, helper, eventData);
                        break;
                    case "EVT_INTERACTION_IDLE_TIMER_EXPIRED" :
                        helper.setInteractionState (component, helper, 'INTERACTION_COMPLETE');
                        break;
                    default:
                        break;
                }
                break;
            case 'NETWORK_ACTIVE' : 
            switch (eventType) {
                case "EVT_LOCATION_CHANGE" :
                    helper.doInteractionStart(component, helper, eventData);
                    helper.setInteractionState (component, helper, 'NETWORK_IDLE');
                    break;
                case "EVT_SPINNER_START" :
                    helper.doSpinnerStart(component, helper, eventData);
                    break;
                case "EVT_NETWORK_REQUEST" :
                    helper.doNetworkRequest(component, helper, eventData);
                    break;
                case "EVT_SPINNER_END" :
                    helper.doSpinnerEnd(component, helper, eventData);
                    if (helper.getNetworkRequestsInProgress(component) === 0) {  // is this the last network response in series? 
                        helper.doNetworkActivityComplete (component, helper, eventData);
                        helper.setInteractionState (component, helper, 'NETWORK_IDLE');
                    } else {
                        // stay in same state
                    }
                    break;
                case "EVT_NETWORK_RESPONSE" :
                    helper.doNetworkResponse(component, helper, eventData);
                    if (helper.getNetworkRequestsInProgress(component) === 0) {  // is this the last network response in series? 
                        helper.doNetworkActivityComplete (component, helper, eventData);
                        helper.setInteractionState (component, helper, 'NETWORK_IDLE');
                    } else {
                        // stay in same state
                    }
                    break;
                case "EVT_NETWORK_ACTIVITY_TIMER_EXPIRED" :
                    helper.doNetworkActivityComplete (component, helper, eventData);
                    helper.setInteractionState (component, helper, 'NETWORK_IDLE');
                    break;
                default:
                    break;
            }
                break;
            default:
                break;
            }
    },
    // Custom monitoring plugin components pased in as 'plugins' are loaded by this function.
    // The uses $A.createComponent)to create these plugin components as children
    // Each custom monitoreing components must expose a method called 'doInteractionEnd' 
    // which will be invoked every time an EVT_FINALISE_INTERACTION event is handled 
    // (i.e. at the end of an interaction)
    loadMonitoringPlugins : function(component, helper, plugins) {
        
        // Load plugin components
        for (let i = 0; i< plugins.length; i++) {
            $A.createComponent(
                "c:" + plugins[i],
                {
                    "aura:id" :plugins[i]
                },
                function(cmp, status, errorMessage){
                    if (status === "SUCCESS") {
                        helper.addPluginAuraId(component, plugins[i]);
                        console.log("*** Mon: Succesfully loaded " + plugins[i]);
                    }
                    else if (status === "INCOMPLETE") {
                        // **EH - FATAL
                        helper.showError(component, "Failed to load " + plugins[i]);
                    }
                    else if (status === "ERROR") {
                        // **EH - FATAL
                        helper.showError(component, "Failed to load " + plugins[i] + ":" + errorMessage);
                    }
                }
            );
        }
        
        helper.logIt(component, '*** Mon: monitoring plugins loaded');
    },
    addPluginAuraId : function (component, auraId) {
        var theSet = component.get("v.monitoringPluginIds") || new Set();
        theSet.add(auraId);
        component.set("v.monitoringPluginIds", theSet);
    },
    // Setup interaction constants
    doInitialiseInteractionConstants : function(component, helper, eventData) {
        component.set("v.interactionUserId", eventData.interactionUserId);
        component.set("v.interactionFederationId", eventData.interactionFederationId);
        component.set("v.interactionProfileName", eventData.interactionProfileName);
        component.set("v.interactionPermissionSets", eventData.interactionPermissionSets);
        component.set("v.interactionIpAddress", eventData.interactionIpAddress);
        component.set("v.interactionUserLocation", eventData.interactionUserLocation);
        component.set("v.interactionHost", eventData.interactionHost);
        helper.logIt(component, '*** Mon: component constants initialised, waiting for first interaction = ' + JSON.stringify(eventData));
    },
    // Start of interaction
    doInteractionStart : function(component, helper, eventData) {
        component.set("v.interactionInProgress", true);
        helper.logIt(component,`*** Mon: interaction started: time = ${eventData.time},route = ${eventData.route}, standardised route = ${eventData.routeStandardised}`);
        helper.initInteractionVars(component, helper, eventData.route, eventData.routeStandardised, eventData.time);
        helper.measureNetworkResponseTime(component, helper);
        helper.resetInteractionIdleTimer(component, helper);
        helper.stopNetworkActivityTimer(component, helper);
    },
    // Render event received
    doRenderEvent : function(component, helper, eventData) {
        helper.logIt(component,'*** Mon: render event received, current state is:' +  component.get("v.interactionState"));
        component.set("v.interactionEndTime", eventData.time); // update end time to that of last interaction activity 
        component.set("v.interactionRenders", component.get("v.interactionRenders") + 1); // update end time to that of last interaction activity 
        helper.resetInteractionIdleTimer(component, helper); // restart the idle timer
        helper.stopNetworkActivityTimer(component, helper); // probably not necessary, but no harm
    },
    // Spinner activity started
    doSpinnerActivityStart : function(component, helper, eventData) {
        // Override network timer until EVT_SPINNER_END received
        helper.logIt(component, '*** Mon: EVT_SPINNER_START:' + eventData.idleTimer);
        component.set("v.timerNetworkActivityMsCurrent", eventData.idleTimer); // Override network idle timer
        helper.doNetworkActivityStart(component, helper, eventData);
    },
    // Network activity started
    doNetworkActivityStart : function(component, helper, eventData) {
        helper.resetNetworkRequestsInProgress(component);
        component.set("v.interactionNetworkActivityStartTime", eventData.time); // Time stamp first request in the series
        helper.doNetworkRequest(component, helper, eventData);
    },
    // Network activity completed
    doNetworkActivityComplete : function(component, helper, eventData) {
        helper.stopNetworkActivityTimer(component, helper); 
        helper.resetNetworkRequestsInProgress(component);
        // Calculate duration of this series of network activities and add to total
        let interactionNetworkActivityDuration = component.get("v.interactionNetworkActivityLastActivityTime") - component.get("v.interactionNetworkActivityStartTime"); // Duration of current series of network activities
        component.set("v.interactionDurationNetwork", component.get("v.interactionDurationNetwork") + interactionNetworkActivityDuration); // update cummulative network time (raw)
        helper.resetInteractionIdleTimer(component, helper); 
        helper.logIt(component,'*** Mon: network activity complete, duration ' + interactionNetworkActivityDuration + 'ms');
    },
    // Spinner event received
    doSpinnerStart : function(component, helper, eventData) {
        // Override network timer until EVT_SPINNER_END received
        helper.logIt(component, '*** Mon: EVT_SPINNER_START:' + eventData.idleTimer);
        component.set("v.timerNetworkActivityMsCurrent", eventData.idleTimer); // Override network idle timer
        helper.doNetworkRequest(component, helper, eventData);
    },
    // Network request sent
    doNetworkRequest : function(component, helper, eventData) {
        component.set("v.interactionEndTime", eventData.time); // update end time to that of last interaction activity 
        component.set("v.interactionNetworkActivityLastActivityTime", eventData.time); // record time of most recent network activity 
        helper.stopInteractionIdleTimer(component, helper); 
        helper.resetNetworkActivityTimer(component, helper); 
        helper.addNetworkRequest (component, eventData.id);
        helper.logIt(component,'*** Mon: network request sent, id = ' + eventData.id + ", requests in progress = " + helper.getNetworkRequestsInProgress(component));
    },
    // Spinner end received
    doSpinnerEnd : function(component, helper, eventData) {
        // Restore network timer to default
        helper.logIt(component, '*** Mon: EVT_SPINNER_END');
        component.set("v.timerNetworkActivityMsCurrent", component.get("v.timerNetworkActivityMs")); // Restore network idle timer
        helper.doNetworkResponse(component, helper, eventData);
    },
    // Network response received
    doNetworkResponse : function(component, helper, eventData) {
        component.set("v.interactionEndTime", eventData.time); // update end time to that of last interaction activity 
        component.set("v.interactionNetworkActivityLastActivityTime", eventData.time); // record time of most recent network activity 
        helper.stopInteractionIdleTimer(component, helper); 
        helper.resetNetworkActivityTimer(component, helper); 
        helper.deleteNetworkRequest (component, eventData.id);
        helper.logIt(component,'*** Mon: network response received, id = ' + eventData.id+ ", requests in progress = " + helper.getNetworkRequestsInProgress(component));
        // helper.addRecordIds(component, eventData.recordIds);
    },
    // End of interaction
    doInteractionEnd : function(component, helper, eventData) {
        component.set("v.interactionInProgress", false);
        helper.finaliseInteractionVars(component, helper);
        
        // Post to VF monitoring container
        helper.publishInteractionEventToContainer(component, helper, helper.interactionToJson(component));

        // Call the 'interactionEnd()' method of all custom monitoring pluhins. e.g. PLR
        let theSet = component.get("v.monitoringPluginIds")  || new Set();
        let theInteraction = JSON.stringify(helper.interactionToJson(component));
        console.log('*** Mon: the Interaction to be sent to plugins is :' + theInteraction);
        theSet.forEach(function(pluginName) {
            var monCmp = component.find(pluginName);
            console.log('*** Mon: executing ' + pluginName + '.interactionEnd()');
            try {
                monCmp.interactionEnd(theInteraction);
            } catch (e) {  
                // **EH - FATAL
                helper.showError(component, "Error calling plugin.interactionEnd():" + e);     
            }

        });

        helper.logIt(component,'*** Mon: interaction ended');
        helper.logIt(component,"*** Mon: interaction vars " + JSON.stringify(helper.interactionToJson(component)));
    },
    // Initialise interaction variables
    initInteractionVars : function(component, helper, route, routeStandardised, time) {
        component.set("v.timerNetworkActivityMsCurrent", component.get("v.timerNetworkActivityMs")); // Restore network idle timer
        component.set("v.interactionGuid", helper.createGuid());
        component.set("v.interactionRoute", route);
        component.set("v.interactionRouteStandardised", routeStandardised);
        component.set("v.interactionDurationTotal", 0);
        component.set("v.interactionDurationBrowser", 0);
        component.set("v.interactionDurationNetwork", 0);
        component.set("v.interactionDurationServer", 0);
        component.set("v.interactionStartTime", time);
        component.set("v.interactionEndTime", time);
        component.set("v.interactionRenders", 0);
        component.set("v.interactionNetworkRoundTrips", 0);
        component.set("v.interactionNetworkLatencyMs", 0);
        // **** PLR PoC
        // helper.resetRecordIds(component);
    },
    // Finalise interaction variables
    finaliseInteractionVars : function(component, helper) {
        
        let endTime = component.get("v.interactionEndTime");
        let startTime = component.get("v.interactionStartTime");
        let durationTotal = endTime - startTime;
        let networkLatency = component.get("v.lastNetworkLatencyMs");   // grab most most recent network latency measurement
        let networkRoundTrips = component.get("v.interactionNetworkRoundTrips");   // number of completed network req/rsp
        let networkOverhead = networkLatency * networkRoundTrips;
        let durationNetwork = component.get("v.interactionDurationNetwork"); // get the current cummulative network duration total
        let durationBrowser = 0; // We need to derice this value from total duration and network time
        let durationServer = 0; // We need to derive this value from all of the above

 
        durationTotal = durationTotal <= 0 ? component.get("v.timerInteractionIdleMs") : durationTotal; // Total duration can't be less than or equal to zero
        durationNetwork = durationNetwork > (durationTotal * 0.8) ? Math.round((durationTotal * 0.8)) : durationNetwork; // Network duration can never be more than 80% total
        networkLatency = networkLatency > (durationNetwork * 0.4) ? Math.round((durationNetwork * 0.4)) : networkLatency; // Latency of the network can never be more than 40% of total network time
        durationServer = durationNetwork - networkLatency;
        durationNetwork = networkLatency;
        networkOverhead = networkOverhead > (durationNetwork * 0.5) ? Math.round((durationNetwork * 0.5)) : networkOverhead;
        durationServer = durationServer - networkOverhead;
        durationNetwork = durationNetwork + networkOverhead;
        durationBrowser = durationTotal - (durationServer + durationNetwork);

        component.set("v.interactionDurationTotal", durationTotal);
        component.set("v.interactionDurationBrowser", durationBrowser);
        component.set("v.interactionDurationNetwork", durationNetwork);
        component.set("v.interactionDurationServer", durationServer);
        component.set("v.interactionNetworkLatencyMs", component.get("v.lastNetworkLatencyMs")); // store unadjusted latency for reference
    },
    // Return interaction variables as Json
    interactionToJson : function(component) {
        let json = {
            "interactionUserId" : component.get("v.interactionUserId"),
            "interactionFederationId" : component.get("v.interactionFederationId"),
            "interactionUserLocation" : component.get("v.interactionUserLocation"),
            "interactionHost" : component.get("v.interactionHost"),
            "interactionGuid" : component.get("v.interactionGuid"),
            "interactionCorrelationId" : component.get("v.interactionCorrelationId"),
            "interactionRoute" :  component.get("v.interactionRoute"),
            "interactionRouteStandardised" : component.get("v.interactionRouteStandardised"),
            "interactionDurationTotal" : component.get("v.interactionDurationTotal"),
            "interactionDurationBrowser" : component.get("v.interactionDurationBrowser"),
            "interactionDurationNetwork" : component.get("v.interactionDurationNetwork"),
            "interactionDurationServer" : component.get("v.interactionDurationServer"),
            "interactionStartTime" : component.get("v.interactionStartTime"),
            "interactionEndTime" : component.get("v.interactionEndTime"),
            "interactionRenders" : component.get("v.interactionRenders"),
            "interactionNetworkRoundTrips" : component.get("v.interactionNetworkRoundTrips"),
            "interactionNetworkLatencyMs" : component.get("v.interactionNetworkLatencyMs")
        }
        return json;
    },
    createGuid: function() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });        
    },
    measureNetworkResponseTime: function(component, helper) {
        let url="/img/msg_icons/confirm16.png?" + Math.random() + '=' + new Date;   
        let ajaxReq = new XMLHttpRequest();
        ajaxReq.open('GET', url, true);
        ajaxReq.onload = function(e) {
            window.performance.clearMarks('mark_end_ajax_call');   
            window.performance.clearMeasures('measure_ajax_call');  
            window.performance.mark('mark_end_ajax_call'); 
            window.performance.measure('measure_ajax_call', 'mark_start_ajax_call', 'mark_end_ajax_call'); 
            if (window.performance.getEntries) {
                let timer = window.performance.getEntriesByName('measure_ajax_call', 'measure');
                let loadTime = timer[0]['duration'].toFixed(0);    
                loadTime = Math.round(loadTime * 0.6); // take image fetch overheads into account to derive a more accurate 'ping' time
                component.set("v.lastNetworkLatencyMs",  Math.round(loadTime * 0.6));
            }
            else {
                // **EH - WARNING
                helper.logIt(component,"window.performance.getEntriesByName not available");
            }
        } 
        window.performance.clearMarks('mark_start_ajax_call');         
        window.performance.mark('mark_start_ajax_call'); 
        ajaxReq.send();
    },
    // Set interaction state
    setInteractionState : function(component, helper, state) {
        component.set("v.interactionState", state);
    },
    // Start interaction idle timer
    startInteractionIdleTimer : function(component, helper) {
        let timerId = component.get("v.timerInteractionIdleId"); 
        if (timerId === 0) { // only start a new timer if one is not currently running
            let timer = component.get("v.timerInteractionIdleMs")
            let t = setTimeout(function() {
                helper.logIt(component,'*** Mon: interaction idle timer of ' + timer + 'ms went off, timer id : ' + t);
                let myEvent = { "type" : "EVT_INTERACTION_IDLE_TIMER_EXPIRED", "data" : {"id" : t}};
                helper.handleEvent(component, helper, myEvent);      
                myEvent = { "type" : "EVT_FINALISE_INTERACTION", "data" : {"id" : t}};
                helper.handleEvent(component, helper, myEvent);       
            }, timer);
            component.set("v.timerInteractionIdleId", t);
            helper.logIt(component,'*** Mon: started interaction idle timer of ' + timer + 'ms at ' + Date.now() + ', id: ' + t );
        }
    },   
    // Stop interaction idle timer
    stopInteractionIdleTimer : function(component, helper) {
        let timerId = component.get("v.timerInteractionIdleId"); 
        if (timerId != 0) {
            clearTimeout(timerId);   
            component.set("v.timerInteractionIdleId", 0); 
            helper.logIt(component,'*** Mon: stopped render timer id: ' + Date.now() + ' ' + timerId);
        }
    },   
    // Reset interaction idle timer
    resetInteractionIdleTimer : function(component, helper) {
        helper.stopInteractionIdleTimer(component, helper);
        helper.startInteractionIdleTimer(component, helper);
    },  
    // Start network activity timer
    startNetworkActivityTimer : function(component, helper) {
        let timerId = component.get("v.timerNetworkActivityId"); 
        if (timerId === 0) { // only start a new timer if one is not currently running
            let timer = component.get("v.timerNetworkActivityMsCurrent");
            let t = setTimeout(function() {
                component.set("v.timerNetworkActivityId", 0); 
                helper.logIt(component,'*** Mon: network activity timer of ' + timer + 'ms went off, timer id : ' + t);
                let myEvent = { "type" : "EVT_NETWORK_ACTIVITY_TIMER_EXPIRED", "data" : {"id" : t}};
                helper.handleEvent(component, helper, myEvent);          
            }, timer);
            component.set("v.timerNetworkActivityId", t);
            helper.logIt(component,'*** Mon: started network activity timer of ' + timer + 'ms at ' + Date.now() + ', id: ' + t );
        }
    },   
    // Stop network activity timer
    stopNetworkActivityTimer : function(component, helper) {
        let timerId = component.get("v.timerNetworkActivityId"); 
        if (timerId != 0) {
            clearTimeout(timerId);   
            component.set("v.timerNetworkActivityId", 0); 
            helper.logIt(component,'*** Mon: stopped network activity timer at ' + Date.now() +  ", timer id is: " + timerId);
        }
    },   
    // Reset network activity timer
    resetNetworkActivityTimer : function(component, helper) {
        helper.stopNetworkActivityTimer(component, helper);
        helper.startNetworkActivityTimer(component, helper);
    }, 
    // Keep track of network requests in progress    
    resetNetworkRequestsInProgress : function (component) {
        var theSet = component.get("v.interactionNetworkRequestsInProgress")  || new Set();
        theSet.clear();
        component.set("v.interactionNetworkRequestsInProgress", theSet);
        // component.set("v.interactionFirstNetworkRequestTime", 0);
    },
    getNetworkRequestsInProgress : function (component) {
        var theSet = component.get("v.interactionNetworkRequestsInProgress")  || new Set();
        return theSet.size;
    },
    addNetworkRequest : function (component, requestId) {
        var theSet = component.get("v.interactionNetworkRequestsInProgress") || new Set();
        theSet.add(requestId);
        component.set("v.interactionNetworkRequestsInProgress", theSet);
    },
    deleteNetworkRequest : function (component, requestId) {
        var theSet = component.get("v.interactionNetworkRequestsInProgress")  || new Set();
        let wasAlreadyInSet = theSet.delete(requestId);
        if (wasAlreadyInSet === true) {
            component.set("v.interactionNetworkRoundTrips", component.get("v.interactionNetworkRoundTrips") + 1);
        }
    },
    // **** PLR PoC ****
    // Accumulate record ids retrieved by the interaction    
    resetRecordIds : function (component) {
        var theSet = component.get("v.interactionRecordIds")  || new Set();
        theSet.clear();
        component.set("v.interactionRecordIds", theSet);
    },
    getRecordIds : function (component) {
        var theSet = component.get("v.interactionRecordIds")  || new Set();
        return theSet;
    },
    addRecordIds : function (component, recordIds) {
        var theSet = component.get("v.interactionRecordIds") || new Set();
        for(let item of recordIds) {
            theSet.add(item);
        }
        component.set("v.interactionRecordIds", theSet);
    },
    // **** PLR PoC ****
    // Handle location changes, get the ball rolling on a new interaction
    handleLocationChangeHelper : function(component, helper, customPath) {

        // Variables and constants
        let baseUrl = window.location.protocol + '//' + window.location.hostname;
        let tabRoute = window.location.pathname + window.location.search;
        let tabRouteStandardised = '';
        let tabUrl = '';
        let pathToAppend = customPath;
        if (pathToAppend === '__none__') {
            pathToAppend = undefined;
        }

        let workspaceAPI = component.find("workspace"); // console API component
        
        setTimeout(() => { 
            // Get route and other details of infocus console Tab, if available
            workspaceAPI.getFocusedTabInfo().then(function(response) {
                let tabDetails = response;
                console.log('*** Mon: workspace URL:' + tabDetails.url);
                console.log('*** Mon: browser URL:' + baseUrl + tabRoute);
                tabUrl = tabDetails.url ? tabDetails.url : baseUrl + tabRoute; 
                tabRoute = tabUrl.toString().replace(baseUrl, ''); // remove base URL from route
                tabRouteStandardised = helper.createStandardisedRoute(component, helper, tabRoute, tabDetails);
                let myEvent = pathToAppend ? 
                    { "type" : "EVT_LOCATION_CHANGE", "data" : {"route" : tabRoute, "routeStandardised" : tabRouteStandardised + '/' + customPath, "time" : Date.now()}} : 
                    { "type" : "EVT_LOCATION_CHANGE", "data" : {"route" : tabRoute, "routeStandardised" : tabRouteStandardised, "time" : Date.now()}} ;
                helper.handleEvent(component, helper, myEvent);
            })
            .catch(function(error) {
                // **EH - WARNING
                helper.showError(component, "Error getting tab info: " + error);
            });
        }, 50);
    },     
    createStandardisedRoute : function (component, helper, tabRoute, tabDetails) {
        let routeStandardised = helper.standardiseRoute(component, tabRoute); 
        if (routeStandardised === '/one/one.app' && tabDetails) {
            helper.logIt(component,'*** Mon: Route = /one/one.app, lets look deeper into Tab attributes to find actual route');
            let oneAppRoute = helper.getOneAppRoute(component, helper, tabDetails);
            routeStandardised = oneAppRoute ? oneAppRoute : routeStandardised;
        }
        return routeStandardised;    		
    },
    standardiseRoute  : function (component, route) {
        let standardisedRoute = route;
        // remove query string
        standardisedRoute = standardisedRoute.split('?')[0];
        // remove # string
        standardisedRoute = standardisedRoute.split('#')[0];
        // Remove record Id from detail pages
        standardisedRoute = standardisedRoute.replace(/\/(?=[a-zA-Z0-9]*[a-zA-Z])(?=[a-zA-Z0-9]*[0-9])[a-zA-Z0-9]{18}\/view/g, "");
        // Remove record Id from related list pages
        standardisedRoute = standardisedRoute.replace(/\/(?=[a-zA-Z0-9]*[a-zA-Z])(?=[a-zA-Z0-9]*[0-9])[a-zA-Z0-9]{18}\/related/g, "");
        //Remove /view from end of path if present
        var lastFive = standardisedRoute.substr(standardisedRoute.length - 5); 
        if (lastFive === '/view') {
            standardisedRoute = standardisedRoute.split('/view')[0];
        }

        return standardisedRoute;
    },
    // See if we can find the route for a /one/one.app URL
    // in the console tab metadata
    getOneAppRoute: function(component, helper, tabinfo) {
        
        const globalSearchPageName = 'forceSearch:searchPageDesktop';
        const globalSearchPath = '/' + globalSearchPageName.split(':')[0] + '/' + globalSearchPageName.split(':')[1];

        let oneAppRoute = null; 
        helper.logIt(component,'*** Mon: tabinfo = ' + JSON.stringify(tabinfo));
        let tabUrl = tabinfo.pageReference.attributes.attributes.url || 
            tabinfo.pageReference.attributes.attributes.address || 
            (tabinfo.pageReference.attributes.name === globalSearchPageName ? window.location.hostname + globalSearchPath : null);
        if (tabUrl) {
            helper.logIt(component,'*** Mon: one.app route found, raw url = ' + tabUrl);
            let theUrl = new URL(tabUrl, 'https://www.salesforce.com');
            if (theUrl.pathname.includes('apex/vlocity_cmt')) {
                let hash = theUrl.hash;
                let queryString = theUrl.search;
                let params = new URLSearchParams(queryString);
                if (hash != "" && hash.includes('OmniScriptType') && hash.includes('OmniScriptSubType')) {
                    let hashSegments = hash.split('/');
                    let omniScriptType = 'unknown';
                    let omniScriptSubType = 'unknown';
                    for (let i = 0; i < hashSegments.length; i++) {
                        if (hashSegments[i] === 'OmniScriptType') {
                            omniScriptType = hashSegments[i+1];
                            i++;
                        } else if (hashSegments[i] === 'OmniScriptSubType') {
                            omniScriptSubType = hashSegments[i+1];
                            i++;
                        }
                    }
                    oneAppRoute = '/omniscript/' + omniScriptType + '/' + omniScriptSubType;
                    helper.logIt(component,'*** Mon: one.app route appears to be an omniscript using hash: ' + oneAppRoute);
                } else if (params.has('OmniScriptType') && params.has('OmniScriptSubType')) {
                    oneAppRoute = '/omniscript/' + params.get('OmniScriptType') + '/' + params.get('OmniScriptSubType');
                    helper.logIt(component,'*** Mon: one.app route appears to be an omniscript using query params: ' + oneAppRoute);
                } else if (params.has('layout')) {
                    oneAppRoute = '/card/' + params.get('layout');
                    helper.logIt(component,'*** Mon: one.app route appears to be a vlocity card: ' + oneAppRoute);
                }
            } else if (theUrl.pathname.includes('apex/')) {
                // VF page
                oneAppRoute = '/vf/' + theUrl.pathname.substring(theUrl.pathname.lastIndexOf('/') + 1);
                helper.logIt(component,'*** Mon: one.app route appears to be a visualforce page: ' + oneAppRoute);
            } else if (theUrl.pathname.includes('flow/')) {
                oneAppRoute = '/flow/' + theUrl.pathname.substring(theUrl.pathname.lastIndexOf('/') + 1);
                helper.logIt(component,'*** Mon: one.app route appears to be a flow: ' + oneAppRoute);
            } else if (theUrl.pathname.includes(globalSearchPageName.split(':')[0])) {
                oneAppRoute = globalSearchPath;
                helper.logIt(component,'*** Mon: one.app route appears to be a global search results page: ' + oneAppRoute);
            }
        }
        return oneAppRoute;
    },
    publishInteractionEventToContainer : function(component, helper, message) {
        
        // Todo add error handling here, check for null element
        var vfWindow = component.find("vfFrame").getElement().contentWindow;
        if (vfWindow) {
            try {
                let vfOriginNew = component.get("v.vfHostNewFormat");
                let vfOriginOld = component.get("v.vfHostOldFormat");
                vfWindow.postMessage(message, vfOriginNew);
                helper.logIt(component, "*** Mon: published event message to VF container new format:" + vfOriginNew);
                vfWindow.postMessage(message, vfOriginOld);
                helper.logIt(component, "*** Mon: published event message to VF container old format:" + vfOriginOld);
            } catch (e) {  
                // **EH - FATAL
                helper.showError(component, "error sending message to container:" + e);     
            }
        } else {
            // **EH - FATAL
            helper.showError(component, "could not find VF container for monitoring agent on the page");
        }
    },
    logIt: function(component, message) {
        let isDebugOn = component.get("v.debugOn");
        if (isDebugOn === true) {
            console.log(message);
        }
    },
    showError: function(component, message) {
        console.error("*** Mon: ERROR: " + message);
        component.set("v.errorMessage", "*** Mon: " + message);
        component.set("v.displayError", true);
    },
    hideError: function(component) {
        component.set("v.displayError", false);
    },
    /**
     * Sanitize and encode all HTML in a user-submitted string
     * @param  {String} str  The user-submitted string
     * @return {String} str  The sanitized string
     */
    sanitizeHTML: function (str) {
        return str.replace(/[^\w. ]/gi, function (c) {
            return '&#' + c.charCodeAt(0) + ';';
        });
    },
    handleNetworkEvent : function(component, event, helper) {
        let type = event.type;
        let id = event.id;
        let recordIds = null;
        if (type === "EVT_NETWORK_RESPONSE") {
            recordIds = event.recordIds;
        }
        let myEvent = { "type" : type, "data" : { "id" : id, "time" : Date.now(), "recordIds" : recordIds}};
        helper.handleEvent(component, helper, myEvent);
    },
    handleSpinnerEvent : function(component, event, helper) {
        let type = event.type;
        let id = event.id;
        let idleTimer = event.idleTimer;
        let myEvent = { "type" : type, "data" : { "id" : id, "time" : Date.now(), "idleTimer" : idleTimer}};
        helper.handleEvent(component, helper, myEvent);
    }
})
