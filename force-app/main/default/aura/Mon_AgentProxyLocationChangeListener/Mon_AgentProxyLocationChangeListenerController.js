({ // NOSONAR
	doInit : function(component, event, helper) {

    },
    onRender : function(component, event, helper) {
        component.addEventHandler("aura:locationChange", component.getReference("c.handleLocationChange"));
        console.log("*** Mon: hooked aura:locationChange events and will relay to monAgentProxyLocationChanger LWC");
    },
    handleLocationChange : function (component, event, helper) {
        // Comes here on a console location change - which occurs after a primary or secondary console tab or list view is opened or given focus
        helper.handleLocationChangeHelper(component, helper, window.location.href); 
    }
})
