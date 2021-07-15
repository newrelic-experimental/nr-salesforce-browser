({ // NOSONAR
    handleLocationChangeHelper: function(component, helper, location) {
        const payload = {
          windowLocation: location
        };
        try {
            component.find("agentProxyLocationEventChannel").publish(payload);
        } catch (e) {  
          // **EH - FATAL     
            console.error("*** Mon: error sending aura:locationChange event message via MLS channel agentProxyLocationEventChannel:" + e);
        }
      }
})
