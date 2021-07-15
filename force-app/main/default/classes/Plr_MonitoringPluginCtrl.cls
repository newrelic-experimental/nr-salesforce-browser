/* 
 * @author Peter Sewell
 * @date 03/05/2021
 * 
 * @description Used by PLR Utility bar plugin to log PLR data to Object
 * @group Tech Enablers
 */
public without sharing class Plr_MonitoringPluginCtrl {
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
