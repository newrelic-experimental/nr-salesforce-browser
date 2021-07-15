({  // NOSONAR
	doInit : function(component, event, helper) {

        // Populate variables needed to load VF container in iFrame
        // The VF container loads the monitoring agent snippet static resource passed to it as query param
        var hostname = window.location.hostname;
        var pagename = window.location.pathname;
        
        component.set("v.vfHostVal", hostname);
        component.set("v.vfPageVal", pagename);
        component.set("v.vfHost", hostname);
        component.set("v.primarySnippet", helper.sanitizeHTML(component.get("v.primarySnippet")));
        component.set("v.secondarySnippet", helper.sanitizeHTML(component.get("v.secondarySnippet")));
        
        // Here is where we populate interaction constants including details pulled  
        // from the running user's record e.g. physical office location
        var action = component.get("c.getUserDetails");

        action.setParams({ 
            permissions : [
                component.get("v.customPermissionDebugOn"), 
                component.get("v.customPermissionAgentEnabled"),
                component.get("v.customPermissionUseSecondaryAgent")
            ]
        });
        action.setCallback(this, function(response) {
            var state = response.getState();
            if (state === "SUCCESS") {
                console.log('*** Mon: user details received :' + JSON.stringify(response.getReturnValue()));
                // Set flags based on Custom Permissions
                let thePerms = response.getReturnValue().permissions;
                component.set("v.debugOn", thePerms[component.get("v.customPermissionDebugOn")]);
        
                // Figure out which static resource (monitoring snippet) to load
                component.set("v.useSecondaryAgent", thePerms[component.get("v.customPermissionUseSecondaryAgent")]);       
                let staticResource = component.get("v.useSecondaryAgent") ? component.get("v.secondarySnippet") : component.get("v.primarySnippet");
                component.set("v.vfSnippetResourceVal", staticResource);  // NOSONAR
                component.set("v.vfSnippetResourceVal", helper.sanitizeHTML(component.get("v.vfSnippetResourceVal")));

                // Create iFrame URL - the iFrame holds the monitoring agent
                const vfUrl = 'https://' +
                component.get("v.vfHost") +
                component.get("v.iframeUrl") +
                component.get("v.vfPageAtr") +
                component.get("v.vfPageVal") +
                component.get("v.vfHostAtr") +
                component.get("v.vfHostVal") + 
                component.get("v.vfSnippetResourceAtr") +
                component.get("v.vfSnippetResourceVal");

                // Validate URL
                try {
                    const checkedUrl = new URL(vfUrl);
                    const checkedProtocol = checkedUrl.protocol;
                    const checkedHostname = checkedUrl.hostname;
                    if (checkedProtocol === 'https:' && checkedHostname === hostname) {
                        component.set("v.vfUrl", encodeURI(vfUrl));
                        component.set("v.agentEnabled", thePerms[component.get("v.customPermissionAgentEnabled")]);  
                    } else {
                        // **EH - FATAL
                        helper.showError(component, "Visualforce iframe URL is invalid: " + vfUrl + " :bad protocol or hostname");
                    }
                }
                catch (err) {
                    // **EH - FATAL
                    helper.showError(component, "Visualforce iframe URL is invalid: " + vfUrl + " :" + err);
                }

                helper.logIt(component,'*** Mon: user config: ' +
                    'monitoring enabled = ' + component.get("v.agentEnabled") + ', ' +
                    'vf url = ' + component.get("v.vfUrl") + ', ' +
                    'debug enabled = ' + component.get("v.debugOn") + ', ' +
                    'secondary agent enabled = ' + component.get("v.useSecondaryAgent") + ', ' +
                    'network idle timer = ' + component.get("v.timerNetworkActivityMs") + ', ' +
                    'render idle timer = ' + component.get("v.timerInteractionIdleMs"));
                
                const footerMessage = 
                    component.get("v.version") + " \u25C6 " +
                    (component.get("v.debugOn") ? "debug=ON" : "debug=OFF") + " \u25C6 " + 'auto-detect location change=' +
                    (component.get("v.disableAutoLocationChangeDetection") ? "OFF" : "ON");
                component.set("v.footer", footerMessage);

                // Only keep going if agent is enabled for this user
                if (component.get("v.agentEnabled") === true) {
                    
                    // Store away VF URL details
                    component.set("v.vfHostNewFormat", response.getReturnValue().vfhost[0]);
                    component.set("v.vfHostOldFormat", response.getReturnValue().vfhost[1]);    

                    // Get User Record details
                    let userRecord = response.getReturnValue().details;
                    let permSetNames = response.getReturnValue().permissionSets;
                    let ipAdr = response.getReturnValue().ipAddress;

                    // Set user's location depending on what location related fields are populated on the user record
                    let location = 'unknown'; // default
                    if (userRecord.Department && userRecord.Department.length) {
                        location = userRecord.Department; // Use Department if available
                    } 
                    /*
                    else if (userRecord.Primary_Premise_Name__c && userRecord.Primary_Premise_Name__c.length) {
                        location = userRecord.Primary_Premise_Name__c; // Or Primary_Premise_Name__c if available
                    }*/

                    // Set user's federation id
                    let federationId = 'unknown';
                    if (userRecord.FederationIdentifier && userRecord.FederationIdentifier.length) {
                        federationId = userRecord.FederationIdentifier; // Use FederationId if available
                    }

                    // Set user's profile name
                    let profileName = 'unknown';
                    if (userRecord.Profile.Name && userRecord.Profile.Name.length) {
                        profileName = userRecord.Profile.Name; // Use Profile Name if available
                    }

                    // Set user's permission sets
                    let permissionSets = 'unknown';
                    if (permSetNames.length > 0) {
                        permissionSets = permSetNames;
                    }

                    // Set user's ip address
                    let ipAddress = 'unknown';
                    if (ipAdr.length > 0) {
                        ipAddress = ipAdr;
                    }

                    // Instantiate network event listener component
                    $A.createComponent(
                        "c:Mon_AgentProxyNetworkActivityListener",
                        {
                            "aura:id" : "Mon_AgentProxyNetworkActivityListener"
                        },
                        function(netListener, status, errorMessage){
                            if (status === "SUCCESS") {
                                console.log("*** Mon: network event listener wired OK");
                                // Now wire up console event handlers - detecting location changes and render events
                                component.addEventHandler("aura:doneRendering", component.getReference("c.handleDoneRendering"));
                                // Auto detect location changes only if disableAutoLocationChangeDetection is false
                                if (!component.get("v.disableAutoLocationChangeDetection")) {
                                    component.addEventHandler("aura:locationChange", component.getReference("c.handleLocationChange"));
                                    console.log("*** Mon: auto detection of location changes (aura:locationChange) are wired and ENABLED");
                                    try {
                                        // component.addEventHandler("force:updateHoverPanelPosition", component.getReference("c.handleHover"));
                                        // console.log("*** Mon: registered handler for force:updateHoverPanelPosition events");
                                    }
                                    catch (err) {
                                        // **EH - FATAL
                                        helper.showError(component, "Could not register handler for hover: " + err);
                                    }

                                } else {
                                    console.log("*** Mon: auto detection of URL location changes has been DISABLED by component properties");
                                }

                                // 
                                // Finally, wire up custom location change, network event and spinner handlers and enable aura:locationChange listener
                                window.addEventListener("message", (event)=>{
                                    if (event.data.newPath != undefined) {
                                        helper.logIt(component,'*** Mon: got custom location change event, path is: ' + event.data.newPath +  ', idleTimer is ' + event.data.idleTimer + ' from... ' + event.origin);
                                        helper.handleLocationChangeHelper(component, helper, event.data.newPath);
                                    }
                                    if (event.data.type != undefined && (event.data.type === 'EVT_NETWORK_REQUEST' || event.data.type === 'EVT_NETWORK_RESPONSE')) {
                                        helper.logIt(component,'*** Mon: got network event via POST: ' + event.data.type + ' from... ' + event.origin);
                                        helper.handleNetworkEvent(component, event.data, helper);
                                    }
                                    if (event.data.type != undefined && (event.data.type === 'EVT_SPINNER_START' || event.data.type === 'EVT_SPINNER_END')) {
                                        helper.logIt(component,'*** Mon: got spinner event via POST: ' + event.data.type + ' from... ' + event.origin);
                                        helper.handleSpinnerEvent(component, event.data, helper);
                                    }
                                });

                                console.log("*** Mon: custom location change, network and spinner event handlers wired OK");

                                // Use the below function to register any custom monitoring plugin components. e.g. For PLR
                                // The below function will load ($A.createComponent)these components as children
                                // Custom monitoring plugin components must expose a method called 'doInteractionEnd' 
                                // which will be invoked every time an EVT_FINALISE_INTERACTION event is handled 
                                // (i.e. at the end of an interaction)
                                helper.loadMonitoringPlugins(
                                    component, helper, 
                                    ['Plr_MonitoringPlugin']);

                                // Initialisation complete. Let everyone know we're good to go!
                                let myEvent = { "type" : "EVT_COMPONENT_INITIALISED", "data" : {
                                    "interactionUserId" : $A.get("$SObjectType.CurrentUser.Id"), 
                                    "interactionFederationId" : federationId,
                                    "interactionProfileName" : profileName,
                                    "interactionPermissionSets" : permissionSets,
                                    "interactionIpAddress" : ipAddress,
                                    "interactionUserLocation" : location,
                                    "interactionHost" : window.location.hostname}};
                                helper.handleEvent(component, helper, myEvent);
                            }
                            else if (status === "INCOMPLETE") {
                                // **EH - FATAL
                                helper.showError(component, "Failed to instantiate network listener component");
                            }
                            else if (status === "ERROR") {
                                // **EH - FATAL
                                helper.showError(component, "Failed to instantiate network listener component: " + errorMessage);
                            }
                        }
                    );
                }
            } else if (state === "INCOMPLETE") {
                // do something
            } else if (state === "ERROR") {
                var errors = response.getError();
                if (errors) {
                    if (errors[0] && errors[0].message) {
                        // **EH - FATAL
                        helper.showError(component, "Failed to load user details from org: " + errors[0].message);
                    }
                } else {
                    // **EH - FATAL
                    helper.showError(component, "Failed to load user details from org");
                }
            }
        });
        $A.enqueueAction(action);
    },
    handleLocationChange : function (component, event, helper) {
        // Comes here on a console location change - which occurs after a primary or secondary console tab or list view is opened or given focus
        // console.log("*** Mon *** : handleLocationChange"); 
        helper.handleLocationChangeHelper(component, helper, undefined); 
    },
    handleHover : function (component, event, helper) {
        // Comes here on a hover
        console.log("*** Mon *** : someone hovered, transcendental baby"); 
    },
    handleDoneRendering : function(component, event, helper) {
        let myEvent = { "type" : "EVT_RENDER", "data" : {"time" : Date.now()}};
        helper.handleEvent(component, helper, myEvent);
    }
})