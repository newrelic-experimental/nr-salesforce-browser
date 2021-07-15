import { LightningElement, track, api} from 'lwc';
 
export default class LWCWizard extends LightningElement {
 
    @api isLoading = false;
    @track currentStep = '1';
 
    handleOnStepClick(event) {
        this.currentStep = event.target.value;
    }
 
    get isStepOne() {
        return this.currentStep === "1";
    }
 
    get isStepTwo() {
        return this.currentStep === "2";
    }
 
    get isStepThree() {
        return this.currentStep === "3";
    }
 
    get isEnableNext() {
        return this.currentStep != "3";
    }
 
    get isEnablePrev() {
        return this.currentStep != "1";
    }
 
    get isEnableFinish() {
        return this.currentStep === "3";
    }

    connectedCallback() {
        setTimeout(() => { 
            this.template.querySelector('c-mon-agent-proxy-location-changer').locationChange('wizard-step1'); 
        }, 100);
        
    }
 
    handleNext() {
        if(this.currentStep == "1"){
            this.template.querySelector('c-mon-agent-proxy-location-changer').locationChange('wizard-step2');
            // Send a spinner start event
            this.template.querySelector('c-mon-agent-proxy-location-changer').spinnerStart(10000);
            this.isLoading = true
            setTimeout(() => { 
                // Send a spinner end event
                this.template.querySelector('c-mon-agent-proxy-location-changer').spinnerEnd();
                this.isLoading = false; 
            }, 5000);
            this.currentStep = "2";
        }
        else if(this.currentStep = "2"){
            this.template.querySelector('c-mon-agent-proxy-location-changer').locationChange('wizard-step3');
            this.currentStep = "3";
        }
    }
 
    handlePrev(){
        if(this.currentStep == "3"){
            this.template.querySelector('c-mon-agent-proxy-location-changer').locationChange('wizard-step2');
            this.currentStep = "2";
        }
        else if(this.currentStep = "2"){
            this.template.querySelector('c-mon-agent-proxy-location-changer').locationChange('wizard-step1');
            this.currentStep = "1";
        }
    }
 
    handleFinish(){
 
    }
}