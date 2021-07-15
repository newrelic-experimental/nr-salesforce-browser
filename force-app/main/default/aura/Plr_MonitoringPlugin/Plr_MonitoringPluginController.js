({ //NOSONAR
	doInit : function(component, event, helper) {
        helper.hookNetworkEvents(component, helper);
        helper.hookClickEvents(component, helper);
        console.log('*** Plr: PLR plugin loaded');
    },
	doInteractionEnd : function(component, event, helper) {
        let params = event.getParam('arguments');
        let theInteraction = null;
        if (params) {
            theInteraction = JSON.parse(params.interaction);
        }
        let uiLogResults = helper.doGetUIDetails(theInteraction); // Scrape the page for PII
        if (uiLogResults && uiLogResults.length > 0) {
            let uiLog = helper.getUILogHeader(component, helper, theInteraction); // Create a header record for PLR
            uiLog.uiLogRows = uiLogResults; // Add the PLR rows (one row per PII field)
            helper.publishUILog(component, helper, uiLog);
        } else {
            console.log('*** Plr: no PII on this page');
        }
    }
})