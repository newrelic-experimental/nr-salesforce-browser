/* 
 * @author Peter Sewell
 * @date 11/23/2020
 * 
 * @description Used by Monitoring Utility bar component to check custom permission of running user
 * @group Tech Enablers
 */
public without sharing class Mon_AgentProxyCtrl {

	@AuraEnabled
	/*
	 * @author Peter Sewell
	 * @date 11/23/2020
	 * @description Returns true if custom permission 'cp' is enabled for running user.
	 * @param cp the custom permission to check
     * @return isEnabled
	 */
	public static Boolean hasCustomPermission(String cp) {
		Boolean isEnabled = false;
		try{
			isEnabled = FeatureManagement.checkPermission(cp);
		}catch(Exception e){
			throw new AuraHandledException(e.getMessage());
		}
		return isEnabled;
	}

	@AuraEnabled 
	/*
	 * @author Peter Sewell
	 * @date 11/23/2020
	 * @description Returns user record details
     * @return user record details
	 */
    public static user fetchRunningUserRecord(){
		User oUser = new User();
		try{
			// Make sure we can update the database before even trying
			if (!Schema.sObjectType.User.fields.Name.isAccessible()) {
				system.debug('*** Mon : deliberately overiding user access to User object');
			}
			// oUser = [select id, Profile.Name, FederationIdentifier, Department, Primary_Premise_Name__c FROM User Where id =: userInfo.getUserId()]; // NOSONAR
			oUser = [select id, Profile.Name, FederationIdentifier, Department FROM User Where id =: userInfo.getUserId()]; // NOSONAR
		}catch(Exception e){
			throw new AuraHandledException(e.getMessage());
		}
    	return oUser;
	}
	
	@AuraEnabled 
	/*
	 * @description return user details
	 * @author Peter Sewell
	 * @date 01/15/2021
	 * @param  permissions the list of permissions to check for
     * @return Mon_AgentProxyCtrlUserDetails
	 */
    public static Mon_AgentProxyUserDetails getUserDetails(List<String> permissions) {
		Mon_AgentProxyUserDetails theUserDetails = new Mon_AgentProxyUserDetails();
		try {
			theUserDetails.details = fetchRunningUserRecord();
			for (String p : permissions) {
				theUserDetails.permissions.put(p, hasCustomPermission(p));
			}
			theUserDetails.permissionSets = getPermissionSets();
			theUserDetails.ipAddress = getExternalIp();
			system.debug('*** Mon *** IP:' + theUserDetails.ipAddress);
			theUserDetails.vfhost = getVFBaseURL();
		} catch(Exception e){
			throw new AuraHandledException(e.getMessage());
		}
		return theUserDetails;
	}
	/*
	 * @author Peter Sewell
	 * @date 1/15/2021
	 * @description Returns vf host names
     * @return vf host names in old and new formats
	 */	
	public static List<String> getVFBaseURL() {
        String hostname = Url.getSalesforceBaseUrl().getHost(); 
        // will support prod and sandboxes
        // e.g. https://mydomain--sandbox.lightning.force.com
        // and https://mydomain.lightning.force.com
        String myDomain = hostname.split('\\.')[0];
        String namespace = getNamespacePrefix();
        String pod = [SELECT InstanceName FROM Organization].InstanceName.toLowerCase();
        return new List<String>{
                'https://' + myDomain + '--' + namespace + '.visualforce.com',
                'https://' + myDomain + '--' + namespace + '.' + pod + '.visual.force.com'
        };
	}

	/*
	 * @author Peter Sewell
	 * @date 1/15/2021
	 * @description Returns namespace to enable formatting of vf domain
     * @return namespace
	 */	
	public static String getNamespacePrefix() {
		String namespacePrefix;
		String[] classNameParts = String.valueOf(Mon_AgentProxyCtrl.class).split('\\.', 2);
		if (classNameParts.size() > 1) {
			Type classType = Type.forName(classNameParts[0], classNameParts[1]);
			if (classType == Mon_AgentProxyCtrl.class) {
				namespacePrefix = classNameParts[0];
			} else {
				namespacePrefix = '';
			}
		} else {
			//If there is only one part, the class has no namespace
			namespacePrefix = 'c';
		}
		return namespacePrefix; 
	}

	/*
	 * @author Peter Sewell
	 * @date 3/15/2021
	 * @description Returns users permission sets as comma separated string of PS API names
     * @return profile API names as comma sep string
	 */	
	public static String getPermissionSets() {
		String permissionSets = '';
		Id userId = userInfo.getUserId();
		List<PermissionSetAssignment> psas = new List<PermissionSetAssignment>();
		try {
			// Make sure we can update the database before even trying
			if (!Schema.sObjectType.PermissionSetAssignment.fields.Id.isAccessible()) {
				system.debug('*** Mon : deliberately overiding user access to PermissionSetAssignment object');
			}
			psas = [SELECT Id, PermissionSetId, PermissionSet.Name, PermissionSet.ProfileId, PermissionSet.Profile.Name, AssigneeId, Assignee.Name FROM PermissionSetAssignment WHERE AssigneeId = :userId];
			for (PermissionSetAssignment psa : psas) {
				String psName = psa.PermissionSet.Name;
				if (!psName.startsWith('X00')) {
					if (permissionSets.length() > 0) {
						permissionSets += ',';
					}
					permissionSets += psName;
				}			
			}
		} catch(Exception e){
			throw new AuraHandledException(e.getMessage());
		}
		system.debug('*** Mon *** PS:' + permissionSets);
		return permissionSets; 
	}

	/*
	 * @author Peter Sewell
	 * @date 3/15/2021
	 * @description Returns users external ip address (not necessarily machine IP)
     * @return ip address
	 */	
	public static String getExternalIp() {
		Map<String,String> currentSessionAttributes = Auth.SessionManagement.getCurrentSession();
		return currentSessionAttributes.get('SourceIp');
	}

	@AuraEnabled
	/*
	 * @author Peter Sewell
	 * @date 3/15/2021
	 * @description Posts UI log to custom object
	 * @param aLog the log payload
     * @return true
	 */
	public static Boolean doPostToUILog(String aLog) {
		Boolean retval = true;
		String userId; 
		String profileName; 
		String permissionSets; 
		String guid; 
		String route; 
		String routeStandardised; 
		String ipAddress; 
		Long timeStamp; 
		String component;
		String linkLabel; 
		String recordId;

		List<PLR_UI_Log__c> logFile = new List<PLR_UI_Log__c>();

		try{
			// system.debug(aLog);
			Map<String,Object> logParsed = (Map<String,Object> ) JSON.deserializeUntyped(aLog);
			route = (String) logParsed.get('route');
			// Dont log the UI log!
			if (route.contains('PLR_UI_Log__c')) {
				return retval;
			}
			guid = (String) logParsed.get('guid');
			userId = (String) logParsed.get('userId');
			profileName = (String) logParsed.get('profileName');
			permissionSets = (String) logParsed.get('permissionSets');
			routeStandardised = (String) logParsed.get('routeStandardised');
			ipAddress = (String) logParsed.get('ipAddress');
			timeStamp = (Long) logParsed.get('timeStamp');

			System.debug('guid = ' + guid);
			System.debug('userId = ' + userId);
			System.debug('profileName = ' + profileName);
			System.debug('permissionSets = ' + permissionSets);
			System.debug('route = ' + route);
			System.debug('routeStandardised = ' + routeStandardised);
			System.debug('ipAddress = ' + ipAddress);
			System.debug('timeStamp = ' + timeStamp);
			System.debug('---------------------------------------------');

			List<Object> logRows = (List<Object>) logParsed.get('uiLogRows');
			for(Object logRow : logRows){
				Map<String,Object> row = (Map<String,Object>)logRow;
				component = (String) row.get('component');
				linkLabel = (String) row.get('linkLabel');
				recordId = (String) row.get('recordId');

				// Add record to log object
				PLR_UI_Log__c logRecord = new PLR_UI_Log__c();
				logRecord.Component__c = component;
				logRecord.Guid__c = guid;
				logRecord.IP_Address__c = ipAddress;
				logRecord.Link_Label__c = linkLabel;
				logRecord.Permission_Sets__c = permissionSets;
				logRecord.Profile_Name__c = profileName;
				logRecord.Record_Id__c = recordId;
				Id r = recordId;
				logRecord.Object__c = r.getSObjectType().getDescribe().getName();
				logRecord.Route__c = route;
				logRecord.Route_Standardised__c = routeStandardised;
				logRecord.Time_Stamp__c = timeStamp;
				logRecord.User_Id__c = userId;
				logFile.add(logRecord);

				System.debug('component = ' + component);
				System.debug('linkLabel = ' + linkLabel);
				System.debug('recordId = ' + recordId);
				System.debug('---------------------------------------------');
			}
			if (!logFile.isEmpty()) {
				insert logFile;
			}
		}catch(Exception e){
			throw new AuraHandledException(e.getMessage());
		}
		return retval;
	}
}