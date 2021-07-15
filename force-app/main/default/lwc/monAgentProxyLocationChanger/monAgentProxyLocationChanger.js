import { LightningElement, api, wire } from 'lwc';
// Import message service features required for subscribing and the message channel
import {
    subscribe,
    unsubscribe,
    APPLICATION_SCOPE,
    MessageContext
  } from "lightning/messageService";
import locationChanged from '@salesforce/messageChannel/Mon_AgentProxyLocationEvent__c';

export default class MonAgentProxyLocationChanger extends LightningElement {

    componentLocation = null;
    currentLocation = null;
    locationChangeSubscription = null;
    spinnerGuid = Date.now() + '-' + (Math.floor(Math.random() * Math.floor(100))).toString().padStart(2, "0");

    @wire(MessageContext)
    messageContext;

    @api type = '__none__'; // flow, page, console or embedded
    @api location = '__none__'; // this is the value if none set in the component design-time property
    @api buttonVisible = false; // if true, display the component button, otherwise the component will be invisible

    @api
    locationChange(aPath, idleTimer = 0) {
        try {
            let msg={newPath : aPath.replace(/\s+/g, '-').toLowerCase(), idleTimer : idleTimer}; // // replace spaces with dashes and convert to lowercase
            console.log('*** Mon : custom path set to: ' + msg.newPath);
            let consoleDomain = window.location.origin;
            if (consoleDomain.search('.lightning.force.com') === -1) { // not a console URL
                if (consoleDomain.search('--c.') != -1) { // is a Visualforce URL
                    consoleDomain = consoleDomain.split('--c')[0] + '.lightning.force.com'; 
                }    
            }
            parent.postMessage(msg,consoleDomain);
            console.log(`*** Mon: sent custom location change event to ${consoleDomain}`);
        } catch (e) {       
            console.error("*** Mon: error sending custom locationChange event:" + e);
        }
    }

    @api
    spinnerStart(idleTimer) {
        try {
            let msg = {"type" : "EVT_SPINNER_START", "id" : this.spinnerGuid, "idleTimer" : idleTimer };
            let consoleDomain = window.location.origin;
            if (consoleDomain.search('.lightning.force.com') === -1) { // not a console URL
                if (consoleDomain.search('--c.') != -1) { // is a Visualforce URL
                    consoleDomain = consoleDomain.split('--c')[0] + '.lightning.force.com'; 
                }    
            }
            // Delay sending spinner event by 100ms to allow time for interaction to actually start
            setTimeout(() => { parent.postMessage(msg,consoleDomain); }, 100); 
            
        } catch (e) {       
            console.error("*** Mon: error sending spinner start event:" + e);
        }
    }

    @api
    spinnerEnd() {
        try {
            let msg = {"type" : "EVT_SPINNER_END", "id" : this.spinnerGuid};
            let consoleDomain = window.location.origin;
            if (consoleDomain.search('.lightning.force.com') === -1) { // not a console URL
                if (consoleDomain.search('--c.') != -1) { // is a Visualforce URL
                    consoleDomain = consoleDomain.split('--c')[0] + '.lightning.force.com'; 
                }    
            }
            parent.postMessage(msg,consoleDomain);
        } catch (e) {       
            console.error("*** Mon: error sending spinner end event:" + e);
        }
    }

    // Called when component is rendered
    connectedCallback() {
        
        var theType = this.type.toLowerCase();
        
        // Set component URL, but delay a second or two 
        // as it seems the href at the time this component is rendered 
        // can actually be the previous href??
        setTimeout(() => { this.setComponentLocation() }, 2000);

        // on render, auto fire a location change, 
        // but only if the component is not 'embedded' as a child within a parent component
        // otherwise the locationChange() method has to be invoked explicitly by the parent component
        if (theType != 'embedded') {
            this.locationChange(this.location);
        }

        // If the location changer is type console,
        // the subscribe to aura:locationChange events relayed by Mon_AgentProxyLocationChangeListener
        // We use these events to trigger a location change when the tab comes into focus
        // Otherwise the component will only fire a location change the first time it is rendered
        if (theType === 'console') {
            if (!this.locationChangeSubscription) {
                console.log("*** Mon: locationChanger component subscribed to aura:locationChange events relayed from utility bar component");
                this.locationChangeSubscription = subscribe(
                    this.messageContext,
                    locationChanged,
                    (message) => this.handleLocationChange(message),
                    { scope: APPLICATION_SCOPE }
                );
            }
        }
    }

    handleFireEventClick(){
        this.locationChange(this.location);
    }

    handleLocationChange(message){
        this.currentLocation = message.windowLocation;
        if (this.currentLocation === this.componentLocation) {
            console.log("*** Mon: custom locationChanger component received focus:" + message.windowLocation);
            this.locationChange(this.location);
        } else {
            // console.log("*** Mon: console locationChanger component got location change event:" + this.currentLocation +", but not in focus:" + this.componentLocation);
        }
    }

    setComponentLocation() {
        this.componentLocation = window.location.href;    
        console.log(`*** Mon: custom location change component bound to: ${this.componentLocation}`);
    }
}