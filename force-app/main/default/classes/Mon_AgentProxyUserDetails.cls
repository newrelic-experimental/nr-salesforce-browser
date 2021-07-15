public with sharing class Mon_AgentProxyUserDetails {

    @AuraEnabled public user details  { get; set; }
    @AuraEnabled public Map<String, Boolean> permissions { get; set; }
    @AuraEnabled public List<String> vfhost { get; set; }
    @AuraEnabled public String profile { get; set; }
    @AuraEnabled public String permissionSets { get; set; }
    @AuraEnabled public String ipAddress { get; set; }
        
    public Mon_AgentProxyUserDetails() {
        details = new User();
        permissions = new Map<String, Boolean>();
        vfhost = new List<String>();
        permissionSets = '';
        ipAddress = '';
    }
}
