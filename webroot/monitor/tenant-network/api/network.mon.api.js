/*
 * Copyright (c) 2014 Juniper Networks, Inc. All rights reserved.
 */

var cacheApi = require(process.mainModule.exports["corePath"] + '/src/serverroot/web/core/cache.api'),
    global   = require(process.mainModule.exports["corePath"] + '/src/serverroot/common/global'),
    messages = require(process.mainModule.exports["corePath"] + '/src/serverroot/common/messages'),
    commonUtils = require(process.mainModule.exports["corePath"] + '/src/serverroot/utils/common.utils'),
    tenantapi = require('./tenant.api'),
    config = process.mainModule.exports["config"],
    rest = require(process.mainModule.exports["corePath"] + '/src/serverroot/common/rest.api'),
    async = require('async'),
    jsonPath = require('JSONPath').eval,
    opApiServer = require(process.mainModule.exports["corePath"] + '/src/serverroot/common/opServer.api'),
    configApiServer = require(process.mainModule.exports["corePath"] + '/src/serverroot/common/configServer.api'),
    infraCmn = require('../../../common/api/infra.common.api'),
    logutils = require(process.mainModule.exports["corePath"] + '/src/serverroot/utils/log.utils'),
    nwMonUtils = require('../../../common/api/nwMon.utils'),
    ctrlGlobal = require('../../../common/api/global'),
    nwMonJobs = require('../jobs/network.mon.jobs.js'),
    appErrors = require(process.mainModule.exports["corePath"] + '/src/serverroot/errors/app.errors');
    authApi = require(process.mainModule.exports["corePath"] + '/src/serverroot/common/auth.api'),

nwMonApi = module.exports;
opServer = rest.getAPIServer({apiName: global.label.OPS_API_SERVER, 
                              server: config.analytics.server_ip, 
                              port: config.analytics.server_port });
var instanceDetailsMap = {
        vcenter:getInstancesDetailsForUser
}

var virtualNetworkDetailsMap = {
        vcenter:getVirtualNetworksForUser
}

function getTopNetworkDetailsByDomain (req, res)
{
    /* First get all the network details in this domain */
    var urlLists = [], j = 0;
    var domain = req.param('fqName');
    var reqUrl = '/projects?domain=' + domain;
    /* First get the project details in this domain */
    var minsSince       = req.query['minsSince'];
    var limit           = req.query['limit'] ||
        global.NW_MON_TOP_DISPLAY_COUNT_DFLT_VAL; 
    var reqType         = req.query['type'];
    var urlKey;
    var appData = {
        minsSince: minsSince,
        limit: limit,
        domain: domain
    };

    if (reqType == 'network') {
        urlKey = global.STR_GET_TOP_NW_BY_DOMAIN;
    } else if (reqType == 'project') {
        urlKey = global.STR_GET_TOP_PROJECT_BY_DOMAIN;
    } else if (reqType == 'port') {
        urlKey = global.STR_GET_TOP_PORT_BY_DOMAIN;
    } else if (reqType == 'peer') {
        urlKey = global.STR_GET_TOP_PEER_BY_DOMAIN;
    } else if (reqType == 'flow') {
        urlKey = global.STR_GET_TOP_FLOWS_BY_DOMAIN;
    } else {
        var err = 
            appErrors.RESTServerError(messages.error.monitoring.invalid_type_provided, 
                                      reqType);
            commonUtils.handleJSONResponse(err, res, null);
            return;
    }
    
    cacheApi.queueDataFromCacheOrSendRequest(req, res, global.STR_JOB_TYPE_CACHE,
                                             urlKey, reqUrl,
                                             0, 1, 0, -1, true, appData);
}

function getTopNetworkDetailsByProject (req, res) 
{
    var project         = req.param('fqName');
    var minsSince       = req.query['minsSince'];
    var limit           = req.query['limit'] || global.NW_MON_TOP_DISPLAY_COUNT_DFLT_VAL;
    var reqType         = req.query['type'];
    var protocol        = req.query['protocol'];
    var startTime       = req.query['startTime'];
    var endTime         = req.query['endTime'];
    var urlKey;
    var appData = {
        minsSince: minsSince,
        limit: limit,
        project: project,
        protocol: protocol,
        startTime: startTime,
        endTime: endTime
    };
    if (reqType == 'network') {
        urlKey = global.STR_GET_TOP_NW_BY_PROJECT;
    } else if (reqType == 'port') {
        urlKey = global.STR_GET_TOP_PORT_BY_PROJECT;
        if (req.query['portRange']) {
            appData['portRange'] = req.query['portRange'];
        }
    } else if (reqType == 'peer') {
        urlKey = global.STR_GET_TOP_PEER_BY_PROJECT;
    } else if (reqType == 'flow') {
        urlKey = global.STR_GET_TOP_FLOWS_BY_PROJECT;
    } else {
        var err = 
            appErrors.RESTServerError(messages.error.monitoring.invalid_type_provided, 
                                      reqType);
            commonUtils.handleJSONResponse(err, res, null);
            return;
    }

    var reqUrl = "/virtual-networks?parent_type=project&parent_fq_name_str=" + project;
    cacheApi.queueDataFromCacheOrSendRequest(req, res, global.STR_JOB_TYPE_CACHE,
                                             urlKey, reqUrl,
                                             0, 1, 0, -1, true, appData);
}

function getFlowSeriesByVN (req, res) 
{
    var minsSince       = req.query['minsSince'];
    var vnName          = req.query['srcVN'];
    var sampleCnt       = req.query['sampleCnt'];
    var dstVN           = req.query['destVN'];
    var srcVN           = req.query['srcVN'];
    var fqName          = req.query['fqName'];
    var startTime       = req.query['startTime'];
    var endTime         = req.query['endTime'];
    var relStartTime    = req.query['relStartTime'];
    var relEndTime      = req.query['relEndTime'];
    var timeGran        = req.query['timeGran'];
    var minsAlign       = req.query['minsAlign'];
    var serverTime      = req.query['useServerTime'];
    var vrouter         = req.query['vrouter'];
    var reqKey;
    
    if (null == dstVN) {
        dstVN = "";
        srcVN = fqName;
        reqKey = global.GET_FLOW_SERIES_BY_VN;
    } else {
        reqKey = global.GET_FLOW_SERIES_BY_VNS;
    }
    
    var appData = {
        minsSince: minsSince,
        minsAlign: minsAlign,
        srcVN: srcVN,
        dstVN: dstVN,
        sampleCnt: sampleCnt,
        startTime: startTime,
        endTime: endTime,
        relStartTime: relStartTime,
        relEndTime: relEndTime,
        timeGran: timeGran,
        serverTime: serverTime,
        vrouter: vrouter,
        minsAlign: minsAlign
    };

    var reqUrl = "/flow_series/VN=";
    cacheApi.queueDataFromCacheOrSendRequest(req, res, global.STR_JOB_TYPE_CACHE,
                                             reqKey, reqUrl,
                                             0, 1, 0, -1, true, appData);
}

function getFlowSeriesByInstance (req, res) 
{
    var vmUUID      = req.query['vmUUID'];
    var srcVN       = req.query['srcVN'];
    var minsSince   = req.query['minsSince'];
    var sampleCnt   = req.query['sampleCnt'];
    var startTime   = req.query['startTime'];
    var endTime     = req.query['endTime'];
    var relStartTime   = req.query['relStartTime'];
    var relEndTime     = req.query['relEndTime'];
    var timeGran    = req.query['timeGran'];
    var minsAlign   = req.query['minsAlign'];

    var appData = {
        minsSince: minsSince,
        minsAlign: minsAlign,
        srcVN: srcVN,
        sampleCnt: sampleCnt,
        startTime: startTime,
        endTime: endTime,
        relStartTime: relStartTime,
        relEndTime: relEndTime,
        timeGran: timeGran,
        minsAlign: minsAlign
        
    };
    
    var reqUrl = "/flow_series/VM=";
    cacheApi.queueDataFromCacheOrSendRequest(req, res, global.STR_JOB_TYPE_CACHE,
                                             global.STR_FLOW_SERIES_BY_VM, reqUrl,
                                             0, 1, 0, -1, true, appData);
}

function getProjectSummary (req, res, appData) 
{
    var urlLists = [];
    var project = req.param('fqName');
    url = "/virtual-networks?parent_type=project&parent_fq_name_str=" + project;
    tenantapi.getProjectData({url: url, appData:appData}, function(err, results) {
        if (err || (null == results)) {
            commonUtils.handleJSONResponse(err, res, null);
        } else {
            commonUtils.handleJSONResponse(null, res, results['virtual-networks']);
        }
    });
}

function getNetworkTopology (req, res) 
{
  var url, domain = req.param('domain');
  url = "/projects?domain=" + domain;
  var includeDomain = req.param('includeDomain');
  var forceRefresh = req.param('forceRefresh');
  var reqUrl = url;
  var isIncludeDomain = true;

  if (null == includeDomain) {
    isIncludeDomain = false;   
  }
  if (null == forceRefresh) {
      forceRefresh = false;
  } else {
      forceRefresh = true;
  }
  var appData = {
     includeDomain: isIncludeDomain
  }
  cacheApi.queueDataFromCacheOrSendRequest(req, res, global.STR_JOB_TYPE_CACHE,
                                           global.STR_GET_NETWORK_TOPOLOGY, reqUrl,
                                           /* Update the tree cache every 1 min
                                            * */
                                           0, 0, 0, 1 * 60 * 1000, forceRefresh, appData);
}

function getNetworStats (req, res) 
{
    var fqName          = req.query['fqName'];
    var type            = req.query['type'];
    var limit           = req.query['limit'];
    var minsSince       = req.query['minsSince'];
    var protocol        = req.query['protocol'];
    var startTime       = req.query['startTime'];
    var endTime         = req.query['endTime'];
    var serverTime      = req.query['useServerTime'];
    var reqKey;
 
    var appData = {
        minsSince: minsSince,
        fqName: fqName,
        limit: limit,
        startTime: startTime,
        endTime: endTime,
        serverTime: serverTime,
        protocol: protocol
    };
    if (type == 'port') {
        reqKey = global.STR_GET_TOP_PORT_BY_NW;
        if (req.query['portRange']) {
            appData['portRange'] = req.query['portRange'];
        }
    } else if (type == 'peer') {
        reqKey = global.STR_GET_TOP_PEER_BY_NW;
    } else if (type == 'flow') {
        reqKey = global.STR_GET_TOP_FLOWS_BY_NW;
    } else {
        var err = 
            appErrors.RESTServerError(messages.error.monitoring.invalid_type_provided, 
                                      reqKey);
            commonUtils.handleJSONResponse(err, res, null);
            return;
    }
    
    var url = '/virtual-network/stats';
    cacheApi.queueDataFromCacheOrSendRequest(req, res, global.STR_JOB_TYPE_CACHE,
                                             reqKey, url,
                                             0, 1, 0, -1, true, appData);
}

function getVNVMData (vmJSON, vmName)
{
    var resultJSON = {};
    resultJSON['ipList'] = [];
    resultJSON['fipList'] = [];
    var ipData = jsonPath(vmJSON, "$..interface_list");
    try {
        var len = ipData[0].length;
        for (var i = 0; i < len; i++) {
            var item = ipData[0][i];
            var ipv4Obj = {};
            ipv4Obj['ip_address'] = item['ip_address'];
            ipv4Obj['virtual_network'] = item['virtual_network'];
            ipv4Obj['vm_vn_name'] = item['name'];
            resultJSON['ipList'].push(ipv4Obj);
            if(item['ip6_active'] == true) {
                var ipv6Obj = {};
                ipv6Obj['ip_address'] = item['ip6_address'];
                ipv6Obj['virtual_network'] = item['virtual_network'];
                ipv6Obj['vm_vn_name'] = item['name'];
                resultJSON['ipList'].push(ipv6Obj);
            }
        }
    } catch(e) {
        console.log("In getVNVMData(): IP List JSON Parse error:" + e);
    }
    try {
        var fipData = jsonPath(vmJSON, "$..fip_stats_list");
        if (fipData[0].length == 0) {
            return resultJSON;
        }
        len = fipData[0].length;
        for (i = 0; i < len; i++) {
            resultJSON['fipList'][i] = {};
            resultJSON['fipList'][i]['ip_address'] =
                fipData[0][i]['ip_address'];
            resultJSON['fipList'][i]['virtual_network'] =
                fipData[0][i]['virtual_network'];
            resultJSON['fipList'][i]['vm_vn_name'] = 
                fipData[0][i]['iface_name'];
        }
    } catch(e) {
        console.log("In getVNVMData(): Floating IP List JSON Parse error:" + e);
    }
    return resultJSON;
}

function getVMFloatingIPList (req, res) 
{
    var vmName = req.param('vmName');
    var url = '/analytics/virtual-machine/' + vmName + '?flat';
    opServer.authorize(function () {
        opServer.api.get(url, function (error, vmJSON) {
            if(!error && (vmJSON)) {
                var resultJSON = getVNVMData(vmJSON, vmName);
                commonUtils.handleJSONResponse(null, res, resultJSON);
            } else {
                commonUtils.handleJSONResponse(error, res, null);
            }
        });
    });                                
}

function getVNStatsSummary (req, res) 
{
    var vnName = req.param('fqName');
    var url = '/analytics/virtual-network/' + vnName;
    var json = {};
    opServer.authorize(function () {
        opServer.api.get(url, function (error, vnJSON) {
            var resultJSON = {};
            if(!error && (vnJSON)) {
                var resultJSON = {};
                resultJSON['virtual-networks'] = [];
                resultJSON['virtual-networks'][0] = {};
                resultJSON['virtual-networks'][0]['fq_name'] = vnName.split(':');
                tenantapi.populateInOutTraffic(resultJSON, vnJSON, 0);
                try {
	                json = resultJSON['virtual-networks'][0];
	            } catch (e) {
	                console.log("In getVNStatsSummary(), JSON parse error: " + e);
	                json = {};
	            }
	            commonUtils.handleJSONResponse(null, res, json);
            } else {
                commonUtils.handleJSONResponse(error, res, json);
            }
        });
    });                                
}

function getTopNwDetailsByVM (req, res) 
{
    var fqName          = req.query['fqName'];
    var type            = req.query['type'];
    var limit           = req.query['limit'];
    var minsSince       = req.query['minsSince'];
    var ip              = req.query['ip'];
    var reqKey;
    
    var appData = {
        minsSince: minsSince,
        fqName: fqName,
        ip: ip,
        limit: limit
    };
    if (type == 'port') {
        reqKey = global.STR_GET_TOP_PORT_BY_VM;
    } else if (type == 'peer') {
        reqKey = global.STR_GET_TOP_PEER_BY_VM;
    } else if (type == 'flow') {
        reqKey = global.STR_GET_TOP_FLOWS_BY_VM;
    } else {
        var err = 
            appErrors.RESTServerError(messages.error.monitoring.invalid_type_provided, 
                                      reqType);
            commonUtils.handleJSONResponse(err, res, null);
            return;
    }
    
    var url = '/virtual-machine/stats';
    cacheApi.queueDataFromCacheOrSendRequest(req, res, global.STR_JOB_TYPE_CACHE,
                                             reqKey, url,
                                             0, 1, 0, -1, true, appData);
}

function getFlowSeriesByVM (req, res) 
{
    var vnName          = req.query['fqName'];
    var sampleCnt       = req.query['sampleCnt'];
    var minsSince       = req.query['minsSince'];
    var ip              = req.query['ip'];
    var startTime       = req.query['startTime'];
    var endTime         = req.query['endTime'];
    var relStartTime       = req.query['relStartTime'];
    var relEndTime         = req.query['relEndTime'];
    var timeGran        = req.query['timeGran'];
    var minsAlign       = req.query['minsAlign'];
    var serverTime      = req.query['useServerTime'];
    var vmName          = req.query['vmName'];
    var vmVnName        = req.query['vmVnName'];
    var fip             = req.query['fip'];
    var appData = {
        ip: ip,
        vnName: vnName,
        vmName: vmName,
        vmVnName : vmVnName,
        fip : fip,
        sampleCnt: sampleCnt,
        minsSince: minsSince,
        minsAlign: minsAlign,
        startTime: startTime,
        endTime: endTime,
        relStartTime: relStartTime,
        relEndTime: relEndTime,
        timeGran: timeGran,
        serverTime: serverTime,
        minsAlign: minsAlign
    };
    var reqUrl = "/flow_series/VM=";
    cacheApi.queueDataFromCacheOrSendRequest(req, res, global.STR_JOB_TYPE_CACHE,
                                             global.GET_FLOW_SERIES_BY_VM, reqUrl,
                                             0, 1, 0, -1, true, appData);
}

function getVMStatByInterface (vmStat, vmVnName)
{
    var resultJSON = {};
    var data;
    try {
        var len = vmStat.length;
        for (var i = 0; i < len; i++) {
            try {
                data = vmStat[i];
                if (data['name']['#text'] == vmVnName) {
                    break;
                }
            } catch(e) {
                console.log("In getVMStatByInterface(): Data JSON Parse error:"+ e);
                continue;
            }
        }
        if (i == len) {
            return resultJSON;
        }
        resultJSON = commonUtils.createJSONByUVEResponse(resultJSON, data);
    } catch(e) {
        console.log("In getVMStatByInterface(): JSON Parse error:" + e);
    }
    return resultJSON;
}

function initVmStatResultData (resultJSON, vmName)
{
    resultJSON['name'] = vmName;
    resultJSON['in_pkts'] = 0;
    resultJSON['in_bytes'] = 0;
    resultJSON['out_pkts'] = 0;
    resultJSON['out_bytes'] = 0;
}

function getVMStatsSummary (req, res) 
{
    var url;
    var vmVnName        = req.query['vmVnName'];
    var resultJSON      = {};

    try {
        var vmName = vmVnName.split(':')[0];
    } catch(e) {
        commonUtils.handleJSONResponse(null, res, {});
        return;
    }

    initVmStatResultData(resultJSON, vmVnName);
    url = '/analytics/virtual-machine/' + vmName;

    opServer.authorize(function () {
        opServer.api.get(url, function (err, data) {
            var statData = jsonPath(data, "$..VmInterfaceAgentStats");
            if (statData.length > 0) {
                var data = getVMStatByInterface(statData[0], vmVnName);
                commonUtils.handleJSONResponse(null, res, data);
            } else {
                commonUtils.handleJSONResponse(null, res, resultJSON);
            }
        });
    });
}

function getConnectedNWsStatsSummary (req, res) 
{
    var srcVN   = req.query['srcVN'];
    var destVN  = req.query['destVN'];

    var appData = {
        srcVN: srcVN,
        destVN: destVN
    };

    var reqKey = "/stat_summary/connected_nw/";
    cacheApi.queueDataFromCacheOrSendRequest(req, res,
                                             global.STR_JOB_TYPE_CACHE,
                                             global.GET_STAT_SUMMARY_BY_CONN_NWS,
                                             reqKey, 0, 1, 0, -1, true,
                                             appData);
}

function getConnectedNWsStatsByType (req, res) 
{
    var srcVN       = req.query['srcVN'];
    var destVN      = req.query['destVN'];
    var type        = req.query['type'];
    var limit       = req.query['limit'];
    var minsSince   = req.query['minsSince'];
    var startTime   = req.query['startTime'];
    var endTime     = req.query['endTime'];
    var reqKey;

    var appData = {
        srcVN: srcVN,
        destVN: destVN,
        minsSince: minsSince,
        startTime: startTime,
        endTime: endTime,
        limit: limit
    };
    if (type == 'port') {
        reqKey = global.STR_GET_TOP_PORT_BY_CONN_NW;
    } else if (type == 'peer') {
        reqKey = global.STR_GET_TOP_PEER_BY_CONN_NW;
    } else if (type == 'flow') {
        reqKey = global.STR_GET_TOP_FLOWS_BY_CONN_NW;
    } else {
        var err =
            appErrors.RESTServerError(messages.error.monitoring.invalid_type_provided,
                                      reqType);
            commonUtils.handleJSONResponse(err, res, null);
            return;
    }
    var reqUrl = "/stat_summary/connected_nw/";
    cacheApi.queueDataFromCacheOrSendRequest(req, res,
                                             global.STR_JOB_TYPE_CACHE,
                                             reqKey, reqUrl,
                                             0, 1, 0, -1, true,
                                             appData);
}

function getFlowEntriesByFlowTuple (req, res) 
{
    var srcVN = req.query['sourcevn'];
    var destVN = req.query['destvn'];
    var srcIP = req.query['sourceip'];
    var destIP = req.query['destip'];
    var sport = req.query['sport'];
    var dport = req.query['dport'];
    var proto = req.query['protocol'];
    var type  = req.query['type'];
    var minsSince = req.query['minsSince'];
    var limit     = req.query['limit'];

    var appData = {
        srcVN: srcVN,
        destVN: destVN,
        srcIP: srcIP,
        destIP: destIP,
        sport: sport,
        dport: dport,
        proto: proto,
        type: type,
        minsSince: minsSince,
        limit: limit
    };

    var reqUrl = "/stat_detail/top/";
    cacheApi.queueDataFromCacheOrSendRequest(req, res,
                                             global.STR_JOB_TYPE_CACHE,
                                             global.STR_GET_FLOW_DETAILS_BY_FLOW_TUPLE,
                                             reqUrl, 0, 1, 0, -1, true,
                                             appData);
}


function getNetworkTopStatsDetails (req, res) 
{
    var type        = req.query['type'];
    var limit       = req.query['limit'];
    var port        = req.query['port'];
    var ip          = req.query['ip'];
    var minsSince   = req.query['minsSince'];
    var fqName      = req.query['fqName'];
    var srcVN       = req.query['srcVN'];
    var destVN      = req.query['destVN'];

    if (type == 'port') {
        reqType = global.STR_GET_TOP_PORT_DETAILS_BY_PEER;
    } else if (type == 'peer') {
        reqType = global.STR_GET_TOP_PEER_DETAILS_BY_PORT;
    } else {
        var err =
            appErrors.RESTServerError(messages.error.monitoring.invalid_type_provided,
                                      reqType);
            commonUtils.handleJSONResponse(err, res, null);
            return;
    }
    var appData = {
        srcVN: srcVN,
        destVN: destVN,
        minsSince: minsSince,
        limit: limit,
        fqName: fqName,
        ip: ip,
        port: port,
        reqType: reqType
    };
    var reqUrl = "/stat_detail/top/";
    cacheApi.queueDataFromCacheOrSendRequest(req, res,
                                             global.STR_JOB_TYPE_CACHE,
                                             reqType, reqUrl,
                                             0, 1, 0, -1, true,
                                             appData);
}

function getTrafficInEgrStat (resultJSON, srcVN, destVN,type) 
{
    var results = {};
    results['srcVN'] = srcVN;
    results['destVN'] = destVN;
    results['inBytes'] = 0;
    results['inPkts'] = 0;
    results['outBytes'] = 0;
    results['outPkts'] = 0;
    if(type != global.FlOW_SERIES_STAT_TYPE) {
        var inStat = resultJSON['in_stats'];
        var outStat = resultJSON['out_stats'];
        var inStatLen = inStat.length;
        var outStatLen = outStat.length;
        for (var i = 0; i < inStatLen; i++) {
            if (destVN == inStat[i]['other_vn']) {
                results['inBytes'] = inStat[i]['bytes'];
                results['inPkts'] = inStat[i]['tpkts'];
                break;
            }
        }
        for (var i = 0; i < outStatLen; i++) {
            if (destVN == outStat[i]['other_vn']) {
                results['outBytes'] = outStat[i]['bytes'];
                results['outPkts'] = outStat[i]['tpkts'];
                break;
            }
        }
        return results;
    } else {
        if(resultJSON['vn_stats'] != null && resultJSON['vn_stats'][0]['StatTable.UveVirtualNetworkAgent.vn_stats'] != null) {
            var stats = resultJSON['vn_stats'][0]['StatTable.UveVirtualNetworkAgent.vn_stats'];
            for(var i = 0; i < stats.length; i++){
                if(stats[i]['vn_stats.other_vn'] == destVN) {
                    results['inBytes'] = stats[i]['SUM(vn_stats.in_bytes)'] != null ? stats[i]['SUM(vn_stats.in_bytes)'] : 0;
                    results['outBytes'] = stats[i]['SUM(vn_stats.out_bytes)'] != null ? stats[i]['SUM(vn_stats.out_bytes)'] : 0;
                    results['inPkts'] = stats[i]['SUM(vn_stats.in_tpkts)'] != null ? stats[i]['SUM(vn_stats.in_tpkts)'] : 0;
                    results['outPkts'] = stats[i]['SUM(vn_stats.out_tpkts)'] != null ? stats[i]['SUM(vn_stats.out_tpkts)'] : 0;
                    break;
                }
            }
        }
        return results;
    }
}

function getVNStatsJSONSummary (resultJSON, results) 
{
    var len = results.length;
    var VNAgentData;
    var inStat;
    var outStat;
    for (var i = 0; i < len; i++) {
        resultJSON[i] = {};
        try {
            resultJSON[i]['vn_stats'] = results[i]['UveVirtualNetworkAgent']['vn_stats']; 
        }catch(e) {
            resultJSON[i]['vn_stats'] = [];
        }
        try  {
            inStat =
                results[i]['UveVirtualNetworkAgent']['in_stats']['list']['UveInterVnStats'];
            inStatCnt = inStat.length;
            resultJSON[i]['in_stats'] = [];
            resultJSON[i]['out_stats'] = [];
            for (var j = 0; j < inStatCnt; j++) {
                resultJSON[i]['in_stats'][j] = {};
                resultJSON[i]['in_stats'][j]['other_vn'] = 
                    inStat[j]['other_vn']['#text'];
                resultJSON[i]['in_stats'][j]['bytes'] = 
                    inStat[j]['bytes']['#text'];
                resultJSON[i]['in_stats'][j]['tpkts'] = 
                    inStat[j]['tpkts']['#text'];
            }
        } catch(e) {
            resultJSON[i]['in_stats'] = [];
        }
        try {
            outStat =
                results[i]['UveVirtualNetworkAgent']['out_stats']['list']['UveInterVnStats'];
            outStatCnt = outStat.length;
            for (j = 0; j < outStatCnt; j++) {
                resultJSON[i]['out_stats'][j] = {};
                resultJSON[i]['out_stats'][j]['other_vn'] =
                    outStat[j]['other_vn']['#text'];
                resultJSON[i]['out_stats'][j]['bytes'] = 
                    outStat[j]['bytes']['#text'];
                resultJSON[i]['out_stats'][j]['tpkts'] = 
                    outStat[j]['tpkts']['#text'];
            }
        } catch(e) {
            resultJSON[i]['out_stats'] = [];
        }
    }
}

function getNetworkInGressEgressTrafficStat (srcVN, destVN, callback) 
{
    var urlLists = []; 
    var resultJSON = []; 

    var url = '/analytics/virtual-network/' + srcVN + '?flat';
    urlLists[0] = [url];
    url = '/analytics/virtual-network/' + destVN + '?flat';
    urlLists[1] = [url];

    async.map(urlLists, commonUtils.getJsonViaInternalApi(opServer.api, true),
              function(err, results) {
        if ((null == err) && results) {
            getVNStatsJSONSummary(resultJSON, results);
            /* Now get the data */
            var jsonData = []; 
            jsonData[0] = getTrafficInEgrStat(resultJSON[0], srcVN, destVN);
            jsonData[1] = getTrafficInEgrStat(resultJSON[1], destVN, srcVN);
            callback(null, jsonData);
        } else {
            callback(err, results);
        }
    });            
}

function formatNetworkStatsSummary (data) 
{
    var results = {};
    results['fromNW'] = {};
    try {
        results['fromNW']['inBytes'] = data[0]['inBytes'];
    } catch(e) {
        results['fromNW']['inBytes'] = 0;
    }
    try {
        results['fromNW']['inPkts'] = data[0]['inPkts'];
    } catch(e) {
        results['fromNW']['inPkts'] = 0;
    }
    try {
        results['fromNW']['outBytes'] = data[0]['outBytes'];
    } catch(e) {
        results['fromNW']['outBytes'] = 0;
    }
    try {
        results['fromNW']['outPkts'] = data[0]['outPkts'];
    } catch(e) {
        results['fromNW']['outPkts'] = 0;
    }
    results['toNW'] = {};
    try {
        results['toNW']['inBytes'] = data[1]['inBytes'];
    } catch(e) {
        results['toNW']['inBytes'] = 0;
    }
    try {
        results['toNW']['inPkts'] = data[1]['inPkts'];
    } catch(e) {
        results['toNW']['inPkts'] = 0;
    }
    try {
        results['toNW']['outBytes'] = data[1]['outBytes'];
    } catch(e) {
        results['toNW']['outBytes'] = 0;
    }
    try {
        results['toNW']['outPkts'] = data[1]['outPkts'];
    } catch(e) {
        results['toNW']['outPkts'] = 0;
    }
    return results;
}

function swapInEgressData (statData) 
{
    var resultJSON = {};
    resultJSON['fromNW'] = {};
    resultJSON['toNW'] = {};
    resultJSON['fromNW'] = statData['fromNW'];
    resultJSON['toNW']['inBytes'] = statData['toNW']['outBytes'];
    resultJSON['toNW']['inPkts'] = statData['toNW']['outPkts'];
    resultJSON['toNW']['outBytes'] = statData['toNW']['inBytes'];
    resultJSON['toNW']['outPkts'] = statData['toNW']['inPkts'];
    return resultJSON;
}

function getNetworkStatsSummary (req, res) 
{
    var srcVN = req.query['srcVN'];
    var destVN = req.query['destVN'];
    var urlLists = [];
    var resultJSON = [];

    getNetworkInGressEgressTrafficStat(srcVN, destVN, function(err, data) {
        if ((null == err) && (data)) {
            var results = formatNetworkStatsSummary(data);
            /* Swap IN/Out Data */
            var resultJSON = swapInEgressData(results);
            commonUtils.handleJSONResponse(null, res, resultJSON);
        } else {
            commonUtils.handleJSONResponse(err, res, null);
        }
    });
}

function getVNAllStatsJSONSummary (srcVN, inputJSON, callback) 
{
    var index = 0;
    var urlLists = [];
    var otherVNList = [];
    var inStat = inputJSON['in_stats'];
    var outStat = inputJSON['out_stats'];
    var inStatCnt = inStat.length;
    var outStatCnt = outStat.length;
    var statData;
    var statCnt = 0;
    if (inStatCnt > outStatCnt) {
        statData = inStat;
        statCnt = inStatCnt;
    } else {
        statData = outStat;
        statCnt = outStatCnt;
    }
    for (var i = 0; i < statCnt; i++) {
        url = '/analytics/virtual-network/' + srcVN;
        urlLists[index++] = [url];
        url = '/analytics/virtual-network/' + statData[i]['other_vn'];
        otherVNList[i] = statData[i]['other_vn'];
        urlLists[index++] = [url];
    }
    async.map(urlLists, commonUtils.getJsonViaInternalApi(opServer.api, true),
              function(err, results) {
        if ((null == err) && results) {
            callback(null, otherVNList, results);
        } else {
            callback(err, otherVNList, results);
        }
    });
}

function parseVNAllStatSummary (resultJSON, srcVN, otherVNList, data) 
{
    var index       = 0;
    var resultJSON  = [];
    var len = data.length;
    var tempResults = [];

    for (var i = 0; i < len; i++) {
        tempResults[0] = data[i];
        tempResults[1] = data[i + 1];
        resultJSON[index] =[];
        getVNStatsJSONSummary(resultJSON[index],
                              commonUtils.cloneObj(tempResults));
        resultJSON[index][0] = getTrafficInEgrStat(resultJSON[index][0], srcVN,
                                                   otherVNList[i/2]); 
        resultJSON[index][1] = getTrafficInEgrStat(resultJSON[index][1],
                                                   otherVNList[i/2], srcVN); 
        index++;
        i++;
    }
    return resultJSON;
}

function getAllConnNetStatDetails (req, res) 
{
    var fqName = req.query['fqName'];
    var url = '/analytics/virtual-network/' + fqName;
    var resultJSON = [];

    opServer.api.get(url, function(err, data) {
        if (err || (null == data)) {
            commonUtils.handleJSONResponse(err, res, null);
            return;
        }
        results = [data];
        getVNStatsJSONSummary(resultJSON, results);
        getVNAllStatsJSONSummary(fqName, resultJSON[0],
                                 function(err, otherVNList, data) {
            resultJSON = parseVNAllStatSummary(resultJSON, fqName, otherVNList, data);
            commonUtils.handleJSONResponse(null, res, resultJSON);
        });
    });
}

function getPortLevelFlowSeries (req, res) 
{
    var ip          = req.query['ip'];
    var port        = req.query['port'];
    var fqName      = req.query['fqName'];
    var protocol    = req.query['protocol']; 
    var minsSince   = req.query['minsSince'];
    var sampleCnt   = req.query['sampleCnt'];
    var srcVN       = req.query['srcVN'];
    var destVN      = req.query['destVN'];
    var startTime   = req.query['startTime'];
    var endTime     = req.query['endTime'];
    var relStartTime   = req.query['relStartTime'];
    var relEndTime     = req.query['relEndTime'];
    var timeGran    = req.query['timeGran'];
    var minsAlign   = req.query['minsAlign'];

    var url = '/flow_series/port';

    var appData = {
        ip: ip,
        port: port,
        srcVN: srcVN,
        destVN: destVN,
        fqName: fqName,
        protocol: protocol,
        minsSince: minsSince,
        minsAlign: minsAlign,
        sampleCnt: sampleCnt,
        startTime: startTime,
        endTime: endTime,
        relStartTime: relStartTime,
        relEndTime: relEndTime,
        timeGran: timeGran
    };
    cacheApi.queueDataFromCacheOrSendRequest(req, res,
                                             global.STR_JOB_TYPE_CACHE,
                                             global.STR_GET_PORT_LEVEL_FLOW_SERIES, 
                                             url, 0, 1, 0, -1, true,
                                             appData);
}

function getFlowSeriesByCPU (req, res) 
{
    var source    = req.query['source'];
    var sampleCnt = req.query['sampleCnt'];
    var minsSince = req.query['minsSince'];
    var moduleId  = req.query['moduleId'];
    var minsAlign = req.query['minsAlign'];
    var endTime = req.query['endTime'];

    var appData = {
        source: source,
        sampleCnt: sampleCnt,
        minsSince: minsSince,
        minsAlign: minsAlign,
        moduleId: moduleId,
        endTime: endTime
    };

    var url = '/flow_series/cpu';
    var key = null;
    switch (moduleId) {
    case 'contrail-control':
        key = ctrlGlobal.STR_GET_CONTROL_NODE_CPU_FLOW_SERIES;
        break;
    case 'contrail-vrouter-agent':
        key = ctrlGlobal.STR_GET_VROUTER_NODE_CPU_FLOW_SERIES;
        break;
    case 'contrail-collector':
        key = ctrlGlobal.STR_GET_COLLECTOR_CPU_FLOW_SERIES;
        break;
    case 'contrail-query-engine':
        key = ctrlGlobal.STR_GET_QE_CPU_FLOW_SERIES;
        break;
    case 'contrail-analytics-api':
        key = ctrlGlobal.STR_GET_OPS_CPU_FLOW_SERIES;
        break;
    case 'contrail-api':
        key = ctrlGlobal.STR_GET_API_SERVER_CPU_FLOW_SERIES;
        break;
    case 'contrail-svc-monitor':
        key = ctrlGlobal.STR_GET_SVC_MON_CPU_FLOW_SERIES;
        break;
    case 'contrail-schema':
        key = ctrlGlobal.STR_GET_SCHEMA_FLOW_SERIES;
        break;
    default:
        logutils.logger.error("Invalid moduleId specified: " + moduleId);
        assert(0);
    }
    cacheApi.queueDataFromCacheOrSendRequest(req, res,
                                             global.STR_JOB_TYPE_CACHE, key,
                                             url, 0, 1, 0, -1, true, appData);
}

function sendOpServerResponseByURL(url, req, res, appData)
{
    opServer.api.get(url, function(err, data) {
        if (err || (null == data)) {
            commonUtils.handleJSONResponse(err, res, null);
        } else {
            commonUtils.handleJSONResponse(null, res, data);
        }
    });
}

function getVNSummary (fqName, data)
{
    var resultJSON = [];
    try {
        uveData = data['value'];
        var vnCnt = uveData.length;
    } catch(e) {
        if ((fqName.split(':')).length == 3) {
            var tempData = {};
            tempData['value'] = [];
            tempData['value'][0] = {};
            tempData['value'][0]['name'] = fqName;
            tempData['value'][0]['value'] = data;
            return tempData;
        }
        return data;
    }
    for (var i = 0, j = 0; i < vnCnt; i++) {
        try {
            if (false == isServiceVN(uveData[i]['name'])) {
                resultJSON[j++] = uveData[i];
            }
        } catch(e) {
        }
    }
    return {'value' : resultJSON};
}

function getVirtualNetworksSummary (req, res, appData)
{
    var fqNameRegExp = req.query['fqNameRegExp'];
    var url = '/analytics/virtual-network/';
    var fqn = fqNameRegExp;
    
    var fqNameArr = fqNameRegExp.split(':');
    if (fqNameArr) {
        var len = fqNameArr.length;
        if (len == 3) {
            /* Exact VN */
            if (true == isServiceVN(fqNameRegExp)) {
                commonUtils.handleJSONResponse(null, res, {});
                return;
            }
        }
        if ((fqNameArr[len - 1] != '*') &&
            (len < 3)) {
            fqn = fqNameRegExp + ':*';
        }
    }
    
    url += fqn + '?flat';
    opServer.api.get(url, function(err, data) {
        if (err || (null == data)) {
            commonUtils.handleJSONResponse(err, res, {});
        } else {
            var resultJSON = getVNSummary(fqNameRegExp, data);
            commonUtils.handleJSONResponse(null, res, resultJSON);
        }
    });
}

function getVirtualMachinesSummary (req, res, appData)
{
    var fqNameRegExp = req.query['fqNameRegExp'];
    var url = '/analytics/virtual-machine/' + fqNameRegExp;
    sendOpServerResponseByURL(url, req, res, appData);
}

function vnLinkListed (srcVN, dstVN, dir, vnNodeList)
{
    var cnt = vnNodeList.length;
    for (var i = 0; i < cnt; i++) {
        if (((vnNodeList[i]['src'] == srcVN) && 
            (vnNodeList[i]['dst'] == dstVN)) ||
            ((vnNodeList[i]['src'] == dstVN) && 
            (vnNodeList[i]['dst'] == srcVN))) {
            if (dir != vnNodeList[i]['dir']) {
                vnNodeList[i]['error'] = 
                    'Other link marked as ' + dir +
                    'directional, attach policy';
            }
            return i;
        }
    }
    return -1;
}

function vnNameListed (vnName, nodes, fqName)
{
    var cnt = nodes.length;
    for (var i = 0; i < cnt; i++) {
        if (vnName == nodes[i]['name']) {
            return true;
        }
    }
    return false;
}

function ifLinkStatExists (srcVN, dstVN, stats, resultJSON)
{
    var cnt = stats.length;
    for (var i = 0; i < cnt; i++) {
        if ((srcVN == stats[i]['src']) && 
            (dstVN == stats[i]['dst'])) {
            resultJSON['error'] =
                    'Other link marked as ' +
                    'unidirectional, attach policy';
            return true;
        }
    }
    return false;
}

function getLinkStats (resultJSON, vnUVENode, vn, result)
{
    var j = 0;
    var inStats = jsonPath(vnUVENode, "$..in_stats");

    if (inStats.length > 0) {
        if (null == resultJSON['in_stats']) {
            resultJSON['in_stats'] = [];
            j = 0;
        } else {
            j = resultJSON['in_stats'].length;
        }
        var len = inStats[0].length;
        for (var i = 0; i < len; i++) {
            if (ifLinkStatExists(vnUVENode['name'], vn, 
                                 resultJSON['in_stats'], result)) {
                continue;
            }
            if (inStats[0][i]['other_vn'] == vn) {
                resultJSON['in_stats'][j] = {};
                resultJSON['in_stats'][j]['src'] = vnUVENode['name'];
                resultJSON['in_stats'][j]['dst'] = vn;
                resultJSON['in_stats'][j]['pkts'] = inStats[0][i]['tpkts'];
                resultJSON['in_stats'][j]['bytes'] = inStats[0][i]['bytes'];
                j++;
                break;
            }
        }
    }
    j = 0;
    var outStats = jsonPath(vnUVENode, "$..out_stats");
    if (outStats.length > 0) {
        if (null == resultJSON['out_stats']) {
            resultJSON['out_stats'] = [];
            j = 0;
        } else {
            j = resultJSON['out_stats'].length;
        }
        len = outStats[0].length;
        for (i = 0; i < len; i++) {
            if (ifLinkStatExists(vnUVENode['name'], vn, 
                                 resultJSON['out_stats'], result)) {
                continue;
            }
            if (outStats[0][i]['other_vn'] == vn) {
                resultJSON['out_stats'][j] = {};
                resultJSON['out_stats'][j]['src'] = vnUVENode['name'];
                resultJSON['out_stats'][j]['dst'] = vn;
                resultJSON['out_stats'][j]['pkts'] = outStats[0][i]['tpkts'];
                resultJSON['out_stats'][j]['bytes'] = outStats[0][i]['bytes'];
                j++;
                break;
            }
        }
    }
    return resultJSON;
}

function getVirtualNetworkNode (fqName, resultJSON, vnUVENode)
{
    var i = 0, j = 0;

    var nodeCnt = resultJSON['nodes'].length;
    var linkCnt = resultJSON['links'].length;

    resultJSON['nodes'][nodeCnt] = {};
    resultJSON['nodes'][nodeCnt]['name'] = vnUVENode['name'];
    resultJSON['nodes'][nodeCnt]['more_attr'] = {};
    try {
        var inBytes = jsonPath(vnUVENode, "$..in_bytes");
        if (inBytes.length > 0) {
            inBytes = inBytes[0];
        } else {
            inBytes = 0;
        }
        resultJSON['nodes'][nodeCnt]['more_attr']['in_bytes'] = inBytes;
    } catch(e) {
        resultJSON['nodes'][nodeCnt]['more_attr']['in_bytes'] = 0;
    }
    try {
        var inPkts = jsonPath(vnUVENode, "$..in_tpkts");
        if (inPkts.length > 0) {
            inPkts = inPkts[0];
        } else {
            inPkts = 0;
        }
        resultJSON['nodes'][nodeCnt]['more_attr']['in_tpkts'] = inPkts;
    } catch(e) {
        resultJSON['nodes'][nodeCnt]['more_attr']['in_tpkts'] = 0;
    }
    try {
        var outBytes = jsonPath(vnUVENode, "$..out_bytes");
        if (outBytes.length > 0) {
            outBytes = outBytes[0];
        } else {
            outBytes = 0;
        }
        resultJSON['nodes'][nodeCnt]['more_attr']['out_bytes'] = outBytes;
    } catch(e) {
        resultJSON['nodes'][nodeCnt]['more_attr']['out_bytes'] = 0;
    }
    try {
        var outPkts = jsonPath(vnUVENode, "$..out_tpkts");
        if (outPkts.length > 0) {
            outPkts = outPkts[0];
        } else {
            outPkts = 0;
        }
        resultJSON['nodes'][nodeCnt]['more_attr']['out_tpkts'] = outPkts;
    } catch(e) {
        resultJSON['nodes'][nodeCnt]['more_attr']['out_tpkts'] = 0;
    }
    try {
        var vmList = jsonPath(vnUVENode, "$..virtualmachine_list");
        if (vmList.length > 0) {
            vmCnt = vmList[0].length;
            resultJSON['nodes'][nodeCnt]['more_attr']['virtualmachine_list'] = vmList[0];
        } else {
            vmCnt = 0;
        }
        resultJSON['nodes'][nodeCnt]['more_attr']['vm_cnt'] = vmCnt;
    } catch(e) {
        resultJSON['nodes'][nodeCnt]['more_attr']['vm_cnt'] = 0;
        resultJSON['nodes'][nodeCnt]['more_attr']['virtualmachine_list'] = [];
    }
    try {
        var interfaceList = jsonPath(vnUVENode, "$..interface_list");
        if (interfaceList.length > 0) {
            resultJSON['nodes'][nodeCnt]['more_attr']['interface_list'] = interfaceList[0];
        }
    } catch(e) {
        resultJSON['nodes'][nodeCnt]['more_attr']['interface_list'] = [];
    }
    try {
        var attachedPolicies = jsonPath(vnUVENode, "$..attached_policies");
        if(attachedPolicies.length > 0) {
            resultJSON['nodes'][nodeCnt]['more_attr']['attached_policies'] = attachedPolicies[0];
        }
    } catch(e) {
        resultJSON['nodes'][nodeCnt]['more_attr']['attached_policies'] = [];
    }
    try {
        var fipCnt = jsonPath(vnUVENode, "$..associated_fip_count");
        if (fipCnt.length > 0) {
            fipCnt = fipCnt[0];
        } else {
            fipCnt = 0;
        }
        resultJSON['nodes'][nodeCnt]['more_attr']['fip_cnt'] = fipCnt;
    } catch(e) {
        resultJSON['nodes'][nodeCnt]['more_attr']['fip_cnt'] = 0;
    }

    var partConnNws = jsonPath(vnUVENode, "$..partially_connected_networks");
    if (partConnNws.length > 0) {
        var len = partConnNws[0].length;
        var k = 0;
        for (var i = 0; i < len; i++) {
            if (((-1 == (vnUVENode['name']).indexOf(fqName)) && 
                (-1 == (partConnNws[0][i]).indexOf(fqName))) || 
                (true == isServiceVN(vnUVENode['name'])) ||
                (true == isServiceVN(partConnNws[0][i]))) {
                continue;
            }
            var index = vnLinkListed(vnUVENode['name'], partConnNws[0][i],
                                     'uni', resultJSON['links']);
            if (-1 != index) {
                getLinkStats(resultJSON['links'][index]['more_attributes'],
                             vnUVENode, partConnNws[0][i],
                             resultJSON['links'][index]);
                continue;
            }
            index = linkCnt + j;
            resultJSON['links'][index] = {};
            resultJSON['links'][index]['src'] = vnUVENode['name'];
            resultJSON['links'][index]['dst'] = partConnNws[0][i];
            resultJSON['links'][index]['dir'] = 'uni';
            resultJSON['links'][index]['more_attributes'] = {};
            getLinkStats(resultJSON['links'][index]['more_attributes'],
                         vnUVENode, partConnNws[0][i],
                         resultJSON['links'][index]);
            resultJSON['links'][index]['error'] = 'Other link marked as ' +
                'unidirectional, attach policy';
            j++;
        }
    }
    var linkCnt = resultJSON['links'].length;
    var connNws = jsonPath(vnUVENode, "$..connected_networks");
    if (connNws.length > 0) {
        var len = connNws[0].length;
        j = 0, k = 0;
        resultJSON['nodes'][nodeCnt]['more_attr']['connected_networks'] = connNws;
        for (var i = 0; i < len; i++) {
            if ((-1 == (vnUVENode['name']).indexOf(fqName)) || (true == isServiceVN(vnUVENode['name'])) || (true == isServiceVN(connNws[0][i]))) {
                continue;
            }
            var index = vnLinkListed(vnUVENode['name'], connNws[0][i], 'bi', resultJSON['links']);
            if (-1 != index) {
                getLinkStats(resultJSON['links'][index]['more_attributes'], vnUVENode, connNws[0][i], resultJSON['links'][index]);
                continue;
            }
            resultJSON['links'][linkCnt + j] = {};
            resultJSON['links'][linkCnt + j]['src'] = vnUVENode['name'];
            resultJSON['links'][linkCnt + j]['dst'] = connNws[0][i];
            resultJSON['links'][linkCnt + j]['dir'] = 'bi';
            resultJSON['links'][linkCnt + j]['more_attributes'] = {};
            getLinkStats(resultJSON['links'][linkCnt + j]['more_attributes'], vnUVENode, connNws[0][i], resultJSON['links'][index]);
            j++;
        }
    }
    var nodeCnt = resultJSON['nodes'].length;
    for (i = 0; i < nodeCnt; i++) {
        resultJSON['nodes'][i]['node_type'] =
            global.STR_NODE_TYPE_VIRTUAL_NETWORK;
    }
    return resultJSON;
}

function getVNPolicyRuleDirection (dir)
{
    if (dir == '<>') {
        return 'bi';
    } else {
        return 'uni';
    }
}

function getServiceChainNode (fqName, resultJSON, scUVENode)
{
    var nodeCnt = resultJSON['nodes'].length,
        linkCnt = resultJSON['links'].length,
        j = 0;

    var srcVN = scUVENode['value']['UveServiceChainData']['source_virtual_network'],
        destVN =  scUVENode['value']['UveServiceChainData']['destination_virtual_network'];

    if ((false == isAllowedVN(fqName, srcVN)) && (false == isAllowedVN(fqName, destVN))) {
        return resultJSON;
    }

    var found = vnNameListed(srcVN, resultJSON['nodes']);
    if (false == found) {
        if (true == isServiceVN(srcVN)) {
            return;
        }
        resultJSON['nodes'][nodeCnt + j] = {};
        resultJSON['nodes'][nodeCnt + j]['name'] = srcVN;
        resultJSON['nodes'][nodeCnt + j]['node_type'] = global.STR_NODE_TYPE_VIRTUAL_NETWORK;
        j++;
    }
    var found = vnNameListed(destVN, resultJSON['nodes']);
    if (false == found) {
        if (true == isServiceVN(destVN)) {
            return;
        }
        resultJSON['nodes'][nodeCnt + j] = {};
        resultJSON['nodes'][nodeCnt + j]['name'] = destVN;
        resultJSON['nodes'][nodeCnt + j]['node_type'] = global.STR_NODE_TYPE_VIRTUAL_NETWORK;
        j++;
    }

    var services = jsonPath(scUVENode, "$..services");
    services = services[0];
    var svcCnt = services.length;
    var nodeCnt = resultJSON['nodes'].length;

    j = 0;
    resultJSON['links'][linkCnt] = {};
    resultJSON['links'][linkCnt]['src'] = srcVN;
    resultJSON['links'][linkCnt]['dst'] = destVN;
    resultJSON['links'][linkCnt]['more_attributes'] = {};
    resultJSON['links'][linkCnt]['service_inst'] = services;
    resultJSON['links'][linkCnt]['dir'] = getVNPolicyRuleDirection(scUVENode['value']['UveServiceChainData']['direction']);

    for (var i = 0; i < svcCnt; i++) {
        /*
        if (i == 0) {
            resultJSON['links'][linkCnt] = {};
            resultJSON['links'][linkCnt]['src'] = srcVN;
            resultJSON['links'][linkCnt]['dst'] = services[i];
            resultJSON['links'][linkCnt]['more_attributes'] = {};
        } else {
            resultJSON['links'][linkCnt + i] = {};
            resultJSON['links'][linkCnt + i]['src'] = services[i - 1];
            resultJSON['links'][linkCnt + i]['dst'] = services[i];
            resultJSON['links'][linkCnt + i]['more_attributes'] = {};
        }
        */
        found = vnNameListed(services[i], resultJSON['nodes']);
        if (false == found) {
            resultJSON['nodes'][nodeCnt + j] = {};
            resultJSON['nodes'][nodeCnt + j]['name'] = services[i];
            resultJSON['nodes'][nodeCnt + j]['node_type'] = global.STR_NODE_TYPE_SERVICE_CHAIN;
            j++;
        }
        /*
        resultJSON['links'][linkCnt + i]['dir'] =
            getVNPolicyRuleDirection(scUVENode['value']['UveServiceChainData']['direction']);

        var found = vnNameListed(services[i], resultJSON['nodes']);
        if (false == found) {
            resultJSON['nodes'][nodeCnt + j] = {};
            resultJSON['nodes'][nodeCnt + j]['name'] = destVN;
            resultJSON['nodes'][nodeCnt + j]['node_type'] = global.STR_NODE_TYPE_VIRTUAL_NETWORK;
            j++;
        }
        */
    }
    /*
    resultJSON['links'][linkCnt + i] = {};
    resultJSON['links'][linkCnt + i]['src'] = services[i - 1];
    resultJSON['links'][linkCnt + i]['dst'] = destVN;
    resultJSON['links'][linkCnt + i]['dir'] = 
        resultJSON['links'][linkCnt + i - 1]['dir'];
    resultJSON['links'][linkCnt + i]['more_attributes'] = {};
    */
    return resultJSON;
}

function parseServiceChainUVE (fqName, resultJSON, scUVE)
{
    var cnt = scUVE.length;
    for (var i = 0; i < cnt; i++) {
        resultJSON = getServiceChainNode(fqName, resultJSON, scUVE[i]);
    }
    return resultJSON;
}

function parseVirtualNetworkUVE (fqName, vnUVE)
{
    var resultJSON = {};
    resultJSON['nodes'] = [];
    resultJSON['links'] = [];

    var vnCnt = vnUVE.length;
    for (var i = 0; i < vnCnt; i++) {
        resultJSON = getVirtualNetworkNode(fqName, resultJSON, vnUVE[i]);
    }
    return resultJSON;
}

function getVNUVEByVNName (vnUVEs, vnName)
{
    var uve = {};
    uve['name'] = vnName;
    uve['value'] = {};
    var cnt = vnUVEs.length;
    for (var i = 0; i < cnt; i++) {
        if (vnUVEs[i]['name'] == vnName) {
            return vnUVEs[i];
        }
    }
    return uve;
}

function isServiceVN (vnName)
{
    if (null == isServiceVN) {
        return false;
    }
    var vnNameArr = vnName.split(':');
    var vnNameLen = vnNameArr.length;
     
    if (3 != vnNameLen) {
        return false;
    }
    if ((-1 == vnNameArr[2].indexOf('svc-vn-right')) &&
        (-1 == vnNameArr[2].indexOf('svc-vn-left')) &&
        (-1 == vnNameArr[2].indexOf('svc-vn-mgmt'))) {
        return false;
    }
    return true;
}

function isAllowedVN (fqName, vnName)
{
    if ((null == vnName) || (null == fqName)) {
        return false;
    }

    if (true == isServiceVN(vnName)) {
        return false;
    }

    var vnNameArr = vnName.split(':');
    var fqNameArr = fqName.split(':');
    var fqLen = fqNameArr.length;
    if (3 == fqLen) {
        /* VN */
        if (fqName == vnName) {
            return true;
        }
    } else if (2 == fqLen) {
        /* Project */
        if ((vnNameArr[0] == fqNameArr[0]) && (vnNameArr[1] == fqNameArr[1])) {
            return true;
        }
    } else if (1 == fqLen) {
        if ('*' == fqNameArr[0]) {
            return true;
        }
        if (vnNameArr[0] == fqNameArr[0]) {
            return true;
        }
    }
    return false;
}

function updateVNConnectedList (resultJSON, vnName, vnUVEs, otherVN)
{
    var addNew = false;
    var uve = {};
    uve['name'] = vnName;
    uve['value'] = {};
    try {
        var cnt = vnUVEs.length;
    } catch(e) {
        return addNew;
    }
    for (var i = 0; i < cnt; i++) {
        if (vnUVEs[i]['name'] == vnName) {
            break;
        }
    }
    if (i == cnt) {
        return addNew;
    }
    try {
        var connNws =
            vnUVEs[i]['value']['UveVirtualNetworkConfig']['connected_networks'];
        var connNwsCnt = connNws.length;
    } catch(e) {
        connNws = null;
        connNwsCnt = 0;
    }
    try {
        var partNws =
            vnUVEs[i]['value']['UveVirtualNetworkConfig']['partially_connected_networks'];
    } catch(e) {
        partNws = null;
    }
    if ((null != connNws) && (null != partNws)) {
        concatArr = connNws.concat(partNws);
    } else if (null != connNws) {
        concatArr = connNws;
    } else if (null != partNws) {
        concatArr = partNws;
    } else {
        concatArr = [];
    }
    var arrLen = concatArr.length;
    for (var j = 0; j < arrLen; j++) {
        if (otherVN == concatArr[j]) {
            return addNew;
        }
    }
    try {
        if (null ==
            vnUVEs[i]['value']['UveVirtualNetworkConfig']['connected_networks']) {
            vnUVEs[i]['value']['UveVirtualNetworkConfig']['connected_networks'] = [];
        }
    } catch(e) {
        return false;
    }
    vnUVEs[i]['value']['UveVirtualNetworkConfig']['connected_networks'][connNwsCnt]
        = otherVN;

    var resCnt = resultJSON.length;
    for (var k = 0; k < resCnt; k++) {
        if (resultJSON[k]['name'] == otherVN) {
            break;
        }
    }
    if (k == resCnt) {
        resultJSON[resCnt] = getVNUVEByVNName(vnUVEs, otherVN);
        addNew = true;
    }
    for (var j = 0; j < resCnt; j++) {
        if (resultJSON[j]['name'] == vnName) {
            break;
        }
    }
    if (j == resCnt) {
        /* We must not come here */
        logutils.logger.error("VN UVE is missing for VN:", vnName);
        return addNew;
    }
    resultJSON[j] = vnUVEs[i];
    return addNew;
}

function getNetworkTopoMissingVNsURL (arrIndex, url, vn)
{
    if (!arrIndex) {
        /* First element in kfilt */
        url += vn;
    } else {
        url += ',' + vn;
    }
    return url;
}

function parseAndGetMissingVNsUVEs (fqName, vnUVE, callback)
{
    var resultJSON = [];
    var insertedVNObjs = {};
    var urlList = []; 
    var index = 0;
    var vnCnt = vnUVE.length;
    var addNew = false;
    var dataObjArr = [];
    var arrIndex = 0;
    var url = '/analytics/uves/virtual-network/*?kfilt=';

    for (var i = 0; i < vnCnt; i++) {
        vnName = vnUVE[i]['name'];
        if (false == isAllowedVN(fqName, vnName)) {
            continue;
        }
        pos = vnName.indexOf(fqName);
        if (pos != -1) {
            if (insertedVNObjs[vnName] == null) {
                insertedVNObjs[vnName] = vnName;
                resultJSON[index++] = vnUVE[i];
            }
            var partConnNws = jsonPath(vnUVE[i],
                                       "$..partially_connected_networks");
            if (partConnNws.length > 0) {
                var len = partConnNws[0].length;
                for (var j = 0; j < len; j++) {
                    partConnVN = partConnNws[0][j];
                    if ((insertedVNObjs[partConnVN] == null) && 
                        (false == isServiceVN(partConnVN))) {
                        insertedVNObjs[partConnVN] = partConnVN;
                        if (false == isAllowedVN(fqName, partConnVN)) {
                            url = getNetworkTopoMissingVNsURL(arrIndex, url,
                                partConnVN);
                            arrIndex++;
                        } else {
                            resultJSON[index++] = getVNUVEByVNName(vnUVE,
                                partConnVN);
                        }
                    }
                }
            }
            var connNws = jsonPath(vnUVE[i], "$..connected_networks");
            if (connNws.length > 0) {
                len = connNws[0].length;
                for (j = 0; j < len; j++) {
                    connVN = connNws[0][j];
                    if ((insertedVNObjs[connVN] == null) &&
                        (false == isServiceVN(connVN))) {
                        insertedVNObjs[connVN] = connVN;
                        if (false == isAllowedVN(fqName, connVN)) {
                            url = getNetworkTopoMissingVNsURL(arrIndex, url, connVN);
                            arrIndex++;
                        } else {
                            resultJSON[index++] = getVNUVEByVNName(vnUVE, connVN);
                        }
                    }
                }
            }
            /*
            var inStats = jsonPath(vnUVE[i], "$..in_stats");
            if (inStats.length > 0) {
                len = inStats[0].length;
                for (j = 0; j < len; j++) {
                    if (inStats[0][j]['other_vn'] == vnName) {
                        continue;
                    }
                    addNew = 
                        updateVNConnectedList(resultJSON, vnName, vnUVE,
                                              inStats[0][j]['other_vn']);
                    if (addNew == true) {
                        index++;
                    }
                    insertedVNObjs[inStats[0][j]['other_vn']] =
                        inStats[0][j]['other_vn'];
                }
            }
            var outStats = jsonPath(vnUVE[i], "$..out_stats");
            if (outStats.length > 0) {
                len = outStats[0].length;
                for (j = 0; j < len; j++) {
                        if (outStats[0][j]['other_vn'] == vnName) {
                        continue;
                    }
                    addNew = 
                        updateVNConnectedList(resultJSON, vnName, vnUVE,
                                              outStats[0][j]['other_vn']);
                    if (true == addNew) {
                        index++;
                    }
                    insertedVNObjs[outStats[0][j]['other_vn']] =
                        outStats[0][j]['other_vn'];
                }
            }
            */
        }
    }
    if (!arrIndex) {
        /* All VNs are included */
        callback(null, resultJSON);
        return;
    }
    var postData = {};
    var kfiltArr = url.split('/*?kfilt=');
    url = kfiltArr[0];
    if (kfiltArr[1]) {
        postData['kfilt'] = kfiltArr[1].split(',');
    }
    opServer.api.post(url, postData, function(err, data) {
        if (err || (null == data)) {
            logutils.logger.error('In Network Topology: we did not get data ' +
                                  'for: ' + url);
            callback(null, resultJSON);
            return;
        }
        var len = resultJSON.length;
        data = data['value'];
        var newCnt = data.length;
        for (var i = 0; i < newCnt; i++) {
            resultJSON[len + i] = data[i];
        }
        callback(null, resultJSON);
    });
}

function vnOrSIConfigExist (fqName, configData)
{
    try {
        var configDataCnt = configData.length;
    } catch(e) {
        return false;
    }
    for (var i = 0; i < configDataCnt; i++) {
        try {
            var configNode = configData[i]['fq_name'].join(':');
            if (configNode == fqName) {
                break;
            }
        } catch(e) {
        }
    }
    if (i == configDataCnt) {
        return false;
    }
    return true;
}

function updateVNNodeStatus (result, configVN, configSI, fqName)
{
    var nodes = result['nodes'];
    var nodeCnt = nodes.length;
    var found = false;

    for (var i = 0; i < nodeCnt; i++) {
        var node = result['nodes'][i]['name'];
        var nodeType = result['nodes'][i]['node_type'];
        if (global.STR_NODE_TYPE_VIRTUAL_NETWORK == nodeType) {
            found = vnOrSIConfigExist(node, configVN);
        } else {
            found = vnOrSIConfigExist(node, configSI);
        }
        if (found == false) {
            result['nodes'][i]['status'] = 'Deleted';
        } else {
            result['nodes'][i]['status'] = 'Active';
        }
    }
    var links = result['links'];
    var linkCnt = links.length;
    for (var i = 0; i < linkCnt; i++) {
        if ((false == isAllowedVN(fqName, links[i]['src'])) &&
            (false == isAllowedVN(fqName, links[i]['dst']))) {
            result['links'].splice(i, 1);
            i = -1;
            linkCnt--;
        }
        if ((links[i]['more_attributes']['in_stats']) &&
            (links[i]['more_attributes']['out_stats'])) {
            result['links'][i]['dir'] = 'bi';
        } else {
            result['links'][i]['dir'] = 'uni';
        }
    }
}

function getVNStats (links, vnUVE, jsonP, src, dest)
{
    var stats = jsonPath(vnUVE, "$.." + jsonP);
    if (stats.length > 0) {
        stats = stats[0];
        statsCnt = stats.length
        for (var i = 0; i < statsCnt; i++) {
            if (stats[i]['other_vn'] == dest) {
                if (null == links['more_attributes'][jsonP]) {
                    links['more_attributes'][jsonP] = [];
                    cnt = 0;
                } else {
                    cnt = links['more_attributes'][jsonP].length;
                }
                links['more_attributes'][jsonP][cnt] = {};
                links['more_attributes'][jsonP][cnt]['src'] = src;
                links['more_attributes'][jsonP][cnt]['dst'] = dest;
                links['more_attributes'][jsonP][cnt]['pkts'] =
                    stats[i]['tpkts'];
                links['more_attributes'][jsonP][cnt]['bytes'] =
                    stats[i]['bytes'];
                break;
            }
        }
    }
}

function getVNStatsBySIData (links, scResultJSON, vnUVE)
{
    var src = links['src'];
    var dst = links['dst'];
    var dir = links['dir'];

    try {
        var scLinks = scResultJSON['links'];
        var linksCnt = scLinks.length;

        for (var i = 0; i < linksCnt; i++) {
            try {
                if (null == scLinks[i]['service_inst']) {
                    if (((scResultJSON['links'][i]['src'] == links['src']) &&
                         (scResultJSON['links'][i]['dst'] == links['dst'])) ||
                        ((scResultJSON['links'][i]['src'] == links['dst']) &&
                         (scResultJSON['links'][i]['dst'] == links['src']))) {
                        links['more_attributes'] =
                            scResultJSON['links'][i]['more_attributes'];
                        scResultJSON['links'].splice(i, 1);
                        return 1;
                    }
                }
            } catch(e) {
                continue;
            }
        }
    } catch(e) {
    }
    /* Now check if we have any stat in UVE */
    var srcVNUVE = getVNUVEByVNName(vnUVE, links['src']);
    var destVNUVE = getVNUVEByVNName(vnUVE, links['dst']);

    links['more_attributes'] = {};
    getVNStats(links, srcVNUVE, "in_stats", links['src'], links['dst']);
    getVNStats(links, srcVNUVE, "out_stats", links['src'], links['dst']);
    getVNStats(links, destVNUVE, "in_stats", links['dst'], links['src']);
    getVNStats(links, destVNUVE, "out_stats", links['dst'], links['src']);
    return 0;
}

function updateVNStatsBySIData (scResultJSON, vnUVE)
{
    try {
        var links = scResultJSON['links'];
        var linksCnt = links.length;
    } catch(e) {
        return scResultJSON;
    }

    for (var i = 0; i < linksCnt; i++) {
        if (null == links[i]['service_inst']) {
            continue;
        }
        if (getVNStatsBySIData(scResultJSON['links'][i], scResultJSON, vnUVE)) {
            i = -1;
            linksCnt--;
        }
    }
    return scResultJSON;
}

function updateServiceInstanceConfigData (scResultJSON, siConfig, appData, callback)
{
    var reqUrl = null;
    var dataObjArr = [];

    try {
        var links = scResultJSON['links'];
        var linkCnt = links.length;
        var siConfigCnt = siConfig.length;
    } catch(e) {
        callback(scResultJSON);
        return;
    }
    var urlLists = [];
    var storedSIList = {};

    for (var i = 0, l = 0; i < linkCnt; i++) {
        try {
            var svcCnt = links[i]['service_inst'].length;
        } catch(e) {
            continue;
        }
        for (var j = 0; j < svcCnt; j++) {
            if (null != storedSIList[links[i]['service_inst'][j]]) {
                /* Already taken */
                continue;
            }
            for (var k = 0; k < siConfigCnt; k++) {
                var fqn = siConfig[k]['fq_name'].join(':');
                if (fqn == links[i]['service_inst'][j]) {
                    storedSIList[fqn] = fqn;
                    reqUrl = '/service-instance/' +
                        siConfig[k]['uuid'];
                    commonUtils.createReqObj(dataObjArr, reqUrl,
                                             global.HTTP_REQUEST_GET, 
                                             null, null, null,
                                             appData);
                }
            }
        }
    }
    async.map(dataObjArr, 
              commonUtils.getServerResponseByRestApi(configApiServer, false),
              function(err, data) {
        scResultJSON['configData']['service-instances'] = data;
        callback(scResultJSON);
    });
}


function updatePolicyConfigData (scResultJSON, appData, callback)
{
    var reqUrl = null, dataObjArr = [],
        policys, policyCount;

    try {
        policys = scResultJSON['configData']['network-policys'];
        policyCount = policys.length;
        for (var i = 0; i < policyCount; i++) {
            reqUrl = '/network-policy/' + policys[i]['uuid'];
            commonUtils.createReqObj(dataObjArr, reqUrl, global.HTTP_REQUEST_GET, null, null, null, appData);
        }
    } catch(e) {
        callback(scResultJSON);
        return;
    }

    async.map(dataObjArr, commonUtils.getServerResponseByRestApi(configApiServer, false), function(err, data) {
        for(var j = 0; j < data.length; j++) {
            try {
                var npEntries = data[j]['network-policy']['network_policy_entries'];
                policys[j]['network_policy_entries'] = npEntries;
            } catch (error) {
                policys[j]['network_policy_entries'] = {'policy_rule': []};
            }
        }
        callback(scResultJSON);
    });
}

function processProjectTopology (fqName, uve, appData, callback)
{
    var resultJSON = [],
        vnFound = true;

    var configVN = uve[2]['virtual-networks'],
        configSI = uve[3]['service-instances'],
        configNP = uve[4]['network-policys'],
        configSG = uve[5]['security-groups'],
        configIPAM = uve[6]['network-ipams'];

    try {
        var vnUVE = uve[0]['value'];
        var scUVE = uve[1]['value'];
        if ((null == vnUVE) && (null == scUVE)) {
            vnFound = false;
        }
    } catch(e) {
        vnFound = false;
    }
    if (false == vnFound) {
        callback(null, resultJSON);
        return;
    }

    parseAndGetMissingVNsUVEs(fqName, vnUVE, function(err, vnUVE) {
        var vnResultJSON = parseVirtualNetworkUVE(fqName, vnUVE);
        var scResultJSON = parseServiceChainUVE(fqName, vnResultJSON, scUVE);
        scResultJSON = updateVNStatsBySIData(scResultJSON, vnUVE);
        updateVNNodeStatus(scResultJSON, configVN, configSI, fqName);
        scResultJSON['configData'] = {'network-policys': configNP, 'security-groups': configSG, 'network-ipams': configIPAM, "service-instances": configSI};
        updatePolicyConfigData(scResultJSON, appData, function (scResultJSON) {
            callback(null, scResultJSON);
        });
        /*
        updateServiceInstanceConfigData(scResultJSON, configSI, appData, function (scResultJSON) {
            callback(null, scResultJSON)
        });
        */
    });
}

function processNetworkTopology (fqName, uve, appData, callback)
{
    var resultJSON = [],
        vnFound = true;

    var configVN = uve[2]['virtual-networks'],
        configSI = uve[3]['service-instances'];

    try {
        var vnUVE = uve[0]['value'];
        var scUVE = uve[1]['value'];
        if ((null == vnUVE) && (null == scUVE)) {
            vnFound = false;
        }
    } catch(e) {
        vnFound = false;
    }
    if (false == vnFound) {
        callback(null, resultJSON);
        return;
    }

    parseAndGetMissingVNsUVEs(fqName, vnUVE, function(err, vnUVE) {
        var vnResultJSON = parseVirtualNetworkUVE(fqName, vnUVE);
        var scResultJSON = parseServiceChainUVE(fqName, vnResultJSON, scUVE);
        scResultJSON = updateVNStatsBySIData(scResultJSON, vnUVE);
        updateVNNodeStatus(scResultJSON, configVN, configSI, fqName);
        scResultJSON['configData'] = {"service-instances": configSI};
        setAssociatedPolicys4Network(fqName, scResultJSON);
        callback(null, scResultJSON);
        /*
         updatePolicyConfigData(scResultJSON, appData, function (scResultJSON) {
            callback(null, scResultJSON);
         });
        updateServiceInstanceConfigData(scResultJSON, configSI, appData, function (scResultJSON) {
            callback(null, scResultJSON)
        });
        */
    });
}

function setAssociatedPolicys4Network (fqName, scResultJSON)
{
    var nodes = scResultJSON['nodes'],
        node, i, attachedPolicies, networkPolicys = [];
    for(i = 0; i < nodes.length; i++) {
        node = nodes[i];
        if(node['name'] == fqName && node['node_type'] == global.STR_NODE_TYPE_VIRTUAL_NETWORK) {
            attachedPolicies = node['more_attr']['attached_policies'];
            for (var j = 0; attachedPolicies!=null && j < attachedPolicies.length; j++) {
                networkPolicys.push({"fq_name": (attachedPolicies[j]['vnp_name']).split(":")});
            }
            scResultJSON['configData']['network-policys'] = networkPolicys;
        }
    }
}

function makeBulkDataByFqn (fqName, data)
{
    var tempArr = fqName.split(':');
    if (tempArr.length == 3) {
        /* Exact VN, now change the data format */
        tempData = {};
        tempData['value'] = [];
        tempData['value'][0] = {};
        tempData['value'][0]['name'] = fqName;
        tempData['value'][0]['value'] = commonUtils.cloneObj(data);
        data = tempData;
    }
    return data;
}

function createNWTopoVNNode (vnName, status)
{
    var node = {};
    node['name'] = vnName;
    node['more_attr'] = {};
    node['node_type'] = global.STR_NODE_TYPE_VIRTUAL_NETWORK;
    node['status'] = status;
    return node;
}

function updateMissingVNsByConfig (fqName, nwTopoData, configData)
{
    var nwList = {};
    try {
        var vnConfig = configData['virtual-networks'];
        var vnConfigCnt = vnConfig.length;
    } catch(e) {
        return nwTopoData;
    }
    try {
        var nodesCnt = nwTopoData['nodes'].length;
    } catch(e) {
        nwTopoData = {};
        nwTopoData['nodes'] = [];
        nodesCnt = 0;
    }
    try {
        var linkCnt = nwTopoData['links'].length;
    } catch(e) {
        nwTopoData['links'] = [];
    }

    for (var i = 0; i < nodesCnt; i++) {
        var vn = nwTopoData['nodes'][i]['name'];
        if (vn) {
            nwList[vn] = vn;
        }
    }
    for (i = 0; i < vnConfigCnt; i++) {
        try {
            var vn = vnConfig[i]['fq_name'].join(':');
            if ((nwList[vn] == null) &&
                (true == isAllowedVN(fqName, vn))) {
                nwTopoData['nodes'][nodesCnt++] = createNWTopoVNNode(vn, "Active");
            }
        } catch(e) {
            continue;
        }
    }
    return nwTopoData;
}

function getNetworkTreeTopology (req, res, appData)
{
    var fqName = req.query['fqName'],
        dataObjArr = [], reqUrl;

    var cFilters = [
        'UveVirtualNetworkAgent:out_bytes',
        'UveVirtualNetworkAgent:in_bytes',
        'UveVirtualNetworkAgent:out_tpkts',
        'UveVirtualNetworkAgent:out_tpkts',
        'UveVirtualNetworkAgent:in_tpkts',
        'UveVirtualNetworkAgent:in_stats',
        'UveVirtualNetworkAgent:virtualmachine_list',
        'UveVirtualNetworkAgent:interface_list',
        'UveVirtualNetworkAgent:associated_fip_count',
        'UveVirtualNetworkAgent:out_stats',
        'UveVirtualNetworkConfig'
    ];

    reqUrl = '/analytics/virtual-network/' + fqName + '?cfilt=' + cFilters.join(',');

    commonUtils.createReqObj(dataObjArr, reqUrl, global.HTTP_REQUEST_GET, null, opApiServer, null, appData);

    reqUrl = '/analytics/service-chain/*';
    commonUtils.createReqObj(dataObjArr, reqUrl, global.HTTP_REQUEST_GET, null, opApiServer, null, appData);

    reqUrl = '/virtual-networks';
    commonUtils.createReqObj(dataObjArr, reqUrl, global.HTTP_REQUEST_GET, null, configApiServer, null, appData);

    reqUrl = '/service-instances';
    commonUtils.createReqObj(dataObjArr, reqUrl, global.HTTP_REQUEST_GET, null, configApiServer, null, appData);

    async.map(dataObjArr, commonUtils.getServerResponseByRestApi(configApiServer, false), function(err, data) {
        data[0] = makeBulkDataByFqn(fqName, data[0]);
        processNetworkTopology(fqName, data, appData, function(err, result) {
            result = updateMissingVNsByConfig(fqName, result, data[2]);
            commonUtils.handleJSONResponse(null, res, result);
        });
    });
}

function getProjectTreeTopology (req, res, appData)
{
    var fqName = req.query['fqName'],
        dataObjArr = [], reqUrl;

    var cFilters = [
        'UveVirtualNetworkAgent:out_bytes',
        'UveVirtualNetworkAgent:in_bytes',
        'UveVirtualNetworkAgent:out_tpkts',
        'UveVirtualNetworkAgent:out_tpkts',
        'UveVirtualNetworkAgent:in_tpkts',
        'UveVirtualNetworkAgent:in_stats',
        'UveVirtualNetworkAgent:virtualmachine_list',
        'UveVirtualNetworkAgent:interface_list',
        'UveVirtualNetworkAgent:associated_fip_count',
        'UveVirtualNetworkAgent:out_stats',
        'UveVirtualNetworkConfig'
    ];

    reqUrl = '/analytics/virtual-network/' + fqName + ':*?cfilt=' + cFilters.join(',');

    commonUtils.createReqObj(dataObjArr, reqUrl, global.HTTP_REQUEST_GET, null, opApiServer, null, appData);

    reqUrl = '/analytics/service-chain/*';
    commonUtils.createReqObj(dataObjArr, reqUrl, global.HTTP_REQUEST_GET, null, opApiServer, null, appData);

    reqUrl = '/virtual-networks';
    commonUtils.createReqObj(dataObjArr, reqUrl, global.HTTP_REQUEST_GET, null, configApiServer, null, appData);

    reqUrl = '/service-instances';
    commonUtils.createReqObj(dataObjArr, reqUrl, global.HTTP_REQUEST_GET, null, configApiServer, null, appData);

    reqUrl = '/network-policys?parent_type=project&parent_fq_name_str=' + fqName;
    commonUtils.createReqObj(dataObjArr, reqUrl, global.HTTP_REQUEST_GET, null, configApiServer, null, appData);

    reqUrl = '/security-groups?parent_type=project&parent_fq_name_str=' + fqName;
    commonUtils.createReqObj(dataObjArr, reqUrl, global.HTTP_REQUEST_GET, null, configApiServer, null, appData);

    reqUrl = '/network-ipams?parent_type=project&parent_fq_name_str=' + fqName;
    commonUtils.createReqObj(dataObjArr, reqUrl, global.HTTP_REQUEST_GET, null, configApiServer, null, appData);

    async.map(dataObjArr, commonUtils.getServerResponseByRestApi(configApiServer, false), function(err, data) {
        data[0] = makeBulkDataByFqn(fqName, data[0]);
        processProjectTopology(fqName, data, appData, function(err, result) {
            result = updateMissingVNsByConfig(fqName, result, data[2]);
            commonUtils.handleJSONResponse(null, res, result);
        });
    });
}

function processVMDetailsUVE (fqName, vmUVE)
{
    var resultJSON = [];
    var pos = -1, k = 0;

    try {
        var data = vmUVE['value'];
        var len = data.length;

        for (var i = 0; i < len; i++) {
            var itfList = jsonPath(data[i], "$..interface_list");
            if (itfList.length == 0) {
                continue;
            }
            var itfCnt = itfList[0].length;
            for (var j = 0; j < itfCnt; j++) {
                try {
                    pos = itfList[0][j]['virtual_network'].indexOf(fqName);
                    if (pos == 0) {
                        resultJSON[k++] = data[i];
                        break;
                    }
                } catch(e) {
                    continue;
                }
            }
        }
    } catch(e) {
        logutils.logger.debug("In processVMDetailsUVE(), JSON Parse error:" +
                              e);
    }
    return resultJSON;
}

function getVMListByVMIList (vmiList, appData, callback)
{
    var insertedVMList = {};
    var insertedVMIList = {};
    var vmiListObjArr = [];
    var vmiUUID = null;
    var vmList = [];
    var vmiReqUrl = null;

    if (null == vmiList) {
        callback(null, null);
        return;
    }
    var vmiCnt = vmiList.length;
    for (var i = 0; i < vmiCnt; i++) {
        vmiUUID = vmiList[i]['uuid'];
        if (null == insertedVMIList[vmiUUID]) {
            vmiReqUrl = '/virtual-machine-interface/' + vmiUUID;
            commonUtils.createReqObj(vmiListObjArr, vmiReqUrl,
                                     global.HTTP_REQUEST_GET, null, null,
                                     null, appData);
            insertedVMIList[vmiUUID] = vmiUUID;
        }
    }
    async.map(vmiListObjArr,
              commonUtils.getServerResponseByRestApi(configApiServer,
                                                     true),
              function(err, data) {
        if (null != data) {
            var vmiRespCnt = data.length;
            for (var i = 0; i < vmiRespCnt; i++) {
                if (data[i] && data[i]['virtual-machine-interface'] &&
                    data[i]['virtual-machine-interface']['virtual_machine_refs']){
                    vmRefs =
                        data[i]['virtual-machine-interface']['virtual_machine_refs'];
                    var vmRefsCnt = vmRefs.length;
                    for (var j = 0; j < vmRefsCnt; j++) {
                        var vmUUID = vmRefs[j]['uuid'];
                        if (null == insertedVMList[vmUUID]) {
                            vmList.push(vmUUID);
                            insertedVMList[vmUUID] = vmUUID;
                        }
                    }
                }
            }
        }
        callback(null, vmList);
    });
}

function getVMListByType (type, configData, appData, callback)
{
    var emptyList = [];

    if (type == 'vn') {
        /*
        if (isServiceVN((configData['virtual-network']['fq_name']).join(':'))) {
            callback(null, null);
            return;
        }
        */
        if ((null == configData['virtual-network']) ||
            (null ==
             configData['virtual-network']['virtual_machine_interface_back_refs'])) {
            callback(null, emptyList);
            return;
        }

        var vmiBackRefsList =
            configData['virtual-network']['virtual_machine_interface_back_refs'];
        getVMListByVMIList(vmiBackRefsList, appData, function(err, vmList) {
            if (vmList && vmList.length > 1) {
                vmList.sort();
            }
            callback(err, vmList);
        });
    } else if (type == 'project') {
        if ((null == configData['project']) || 
            (null == configData['project']['virtual_machine_interfaces'])) {
            callback(null, emptyList);
            return;
        }

        var vmiList = configData['project']['virtual_machine_interfaces'];
        getVMListByVMIList(vmiList, appData, function(err, vmList) {
            if (vmList && vmList.length > 1) {
                vmList.sort();
            }
            callback(null, vmList);
        });
    }
}

function getVMDetails (req, res, appData)
{
    var resultJSON = [];
    var fqnUUID = req.query['fqnUUID'];
    var type    = req.query['type'];
    var url = null;
    if (type == 'vn') {
        url = '/virtual-network/' + fqnUUID;
    } else if (type == 'project') {
        url = '/project/' + fqnUUID;
    }

    if (null == type) {
        err = new 
            appErrors.RESTServerError('type is required');
        commonUtils.handleJSONResponse(err, res, null);
        return;
    }

    var opServerUrl = '/analytics/uves/virtual-machine';
    configApiServer.apiGet(url, appData, function(err, data) {
        if (err || (null == data)) {
            commonUtils.handleJSONResponse(err, res, resultJSON);
            return;
        }
        getVMListByType(type, data, appData, function(err, vmOpList) {
            if (err || (null == vmOpList) || (!vmOpList.length)) { 
                commonUtils.handleJSONResponse(err, res, resultJSON);
                return;
            }
            var postData = {};
            postData['kfilt'] = vmOpList;
            opApiServer.apiPost(opServerUrl, postData, appData, function(err, data) {
                if (err || (null == data)) {
                    commonUtils.handleJSONResponse(err, res, resultJSON);
                    return;
                }
                commonUtils.handleJSONResponse(null, res, data);
            });
        });
    });
}

function processInstanceReqByLastUUID (lastUUID, count, fromConfigList, 
                                       VMList, filtUrl, callback)
{
    getOpServerPagedResponseByLastKey(lastUUID, count, fromConfigList, VMList, 
                                      'virtual-machine', filtUrl, null,
                                      function(err, data) {
        if (data && data['data'] && (-1 == count)) {
            data = data['data'];
        }
        callback(err, data);
    });
}

function processVirtualNetworksReqByLastUUID (lastUUID, count, fromConfigList,
                                              vnList, filtUrl,tenantList, callback)
{
    getOpServerPagedResponseByLastKey(lastUUID, count, fromConfigList, vnList, 
                                      'virtual-network', filtUrl, tenantList,
                                      function(err, data) {
        callback(err, data);
    });
}

function getOpServerPagedResponseByLastKey (lastKey, count, isFromConfig,
                                            list, type, filtUrl, tenantList, callback)
{
    var found = false;
    var retLastUUID = null;
    var resultJSON = {};
    var typeStr = type + 's';
    var url = '/analytics/uves/' + type + '/*?kfilt=';

    resultJSON['data'] = [];
    resultJSON['lastKey'] = null;
    resultJSON['more'] = false;
    if (true == isFromConfig) {
        list = list[typeStr];
        matchStr = 'uuid';
    } else {
        matchStr = 'name';
    }
    var index = nwMonUtils.getnThIndexByLastKey (lastKey, list, matchStr);
    if (index == -2) {
        callback(null, resultJSON);
        return;
    }
    try {
        var cnt = list.length;
    } catch(e) {
        callback(null, resultJSON);
        return;
    }
    if (cnt == index) {
        /* We are already at end */
        callback(null, resultJSON);
        return;
    }
    if (-1 == count) {
        totCnt = cnt;
    } else {
        totCnt = index + 1 + count;
    }
    if (totCnt < cnt) {
        retLastUUID = list[totCnt - 1][matchStr];
    }
    for (var i = index + 1; i < totCnt; i++) {
        if (list[i]) {
            if (i != index + 1) {
                url += ',';
            }
            url += list[i][matchStr];
            found = true;
        }
    }
    if (false == found) {
        callback(null, resultJSON);
        return;
    }
    /* filtURL already contains the url, /analytics/uves, so remove this and
     * then append to our url
     */
    var kfiltUrlKey = '/*?kfilt=';
    var splArr = url.split(kfiltUrlKey);
    var postData = {};
    if (splArr.length == 2) {
        postData['kfilt'] = splArr[1].split(',');
        url = splArr[0];
    }
     
    if (filtUrl) {
        var cfiltArr = filtUrl.split('cfilt=');
        if (cfiltArr.length == 2) {
            postData['cfilt'] = cfiltArr[1].split(',');
        }
    }
    opServer.api.post(url, postData, function(err, data) {
        if (data && data['value']) {
            var resCnt = data['value'].length;
            if (resCnt < count) {
                /* We have got less number of elements compared to whatever we
                 * sent to opSrever in kfilt, so these entries may be existing
                 * in API Server, but not in opServer, so add these in the
                 * response 
                 */
                var tempResData = {};
                for (i = 0; i < resCnt; i++) {
                    if (null == data['value'][i]) {
                        continue;
                    }
                    vnName = data['value'][i]['name'];
                    tempResData[vnName] = vnName;
                }
                var kFiltLen = postData['kfilt'].length;
                for (i = 0; i < kFiltLen; i++) {
                    vnName = postData['kfilt'][i];
                    if (null == tempResData[vnName]) {
                        tempResData[vnName] = vnName;
                        data['value'].push({'name': vnName, 'value': {}});
                    }
                }
            }
        }
        resultJSON['data'] = data;
        resultJSON['lastKey'] = retLastUUID;
        if (null == retLastUUID) {
            resultJSON['more'] = false;
        } else {
            resultJSON['more'] = true;
        } 
        callback(err, resultJSON);
    });
}

function createEmptyPaginatedData ()
{
    var resultJSON = {};
    resultJSON['data'] = {};
    resultJSON['data']['value'] = [];
    resultJSON['more'] = false;
    resultJSON['lastKey'] = null;
    return resultJSON;
}

function getInstanceDetailsByFqn (req, appData, callback)
{
    var fqnUUID = req.query['fqnUUID'];
    var lastUUID = req.query['lastKey'];
    var count = req.query['count'];
    var type    = req.query['type'];
    var url = null;
    var filtUrl = null;

    var resultJSON = createEmptyPaginatedData();

    if (type == 'vn') {
        url = '/virtual-network/' + fqnUUID;
    } else if (type == 'project') {
        url = '/project/' + fqnUUID;
    }

    var filtData = nwMonUtils.buildBulkUVEUrls(req.body, appData);
    if (filtData && filtData[0]) {
        filtUrl = filtData[0]['reqUrl'];
    }
    configApiServer.apiGet(url, appData, function(err, data) {
        if (err || (null == data)) {
            callback(err, resultJSON);
            return;
        }
        getVMListByType(type, data, appData, function(err, vmOpList) {
            if (err || (null == vmOpList) || (!vmOpList.length)) { 
                callback(err, resultJSON);
                return;
            }
            var data = nwMonUtils.makeUVEList(vmOpList);
            processInstanceReqByLastUUID(lastUUID, count, false, data, 
                                         filtUrl, function(err, data) {
                callback(err, data);
            });
        });
    });
}

function getVNListByProject (projectFqn, appData, callback)
{
    aggConfigVNList(projectFqn, appData, function(err, vnList) {
        callback(err, vnList);
    });
}

function getVirtualNetworksDetailsByFqn (fqn, lastUUID, count, res, appData)
{
    var fqn = res.req.query['fqn'];
    var filtUrl = null;

    var filtData = nwMonUtils.buildBulkUVEUrls(res.req.body, appData);
    if (filtData && filtData[0]) {
        filtUrl = filtData[0]['reqUrl'];
    }
    var fqnArr = fqn.split(':');
    var len = fqnArr.length;
    var resultJSON = createEmptyPaginatedData();
    
    if (2 == len) {
        /* Project */
        getVNListByProject(fqn, appData, function(err, vnList, tenantList) {
            if (err || (null == vnList) || (!vnList.length)) {
                commonUtils.handleJSONResponse(err, res, resultJSON);
                return;
            }

            processVirtualNetworksReqByLastUUID(lastUUID, count, false, vnList,
                                                filtUrl, tenantList, function(err, data) {
                commonUtils.handleJSONResponse(err, res, data);
            });
        });
    }
}

function aggConfigVNList (fqn, appData, callback)
{
    var vnList     = [],dataObjArr = [],req = appData.authObj.req;
    var configURL = null;
    if (null != fqn) {
        configURL = '/virtual-networks?parent_type=project&parent_fq_name_str=' +
            fqn;
        getVNConfigList(configURL,appData,callback);
    } else {
        var getVNCB = virtualNetworkDetailsMap[req.session.loggedInOrchestrationMode];
        if(null != getVNCB) {
            getVNCB(appData,callback);
            return;
        } 
        if(req.session.userRole.indexOf(global.STR_ROLE_ADMIN) == -1) {
            getVirtualNetworksForUser(appData,callback)
        } else {
            configURL = '/virtual-networks';
            getVNConfigList(configURL,appData,callback);
        }
    }
}
/*
 * This function just calls the config server to get the virtual networks
 */
function getVNConfigList(configURL,appData,callback)
{
    configApiServer.apiGet(configURL, appData, function(err, configVNData) {
        if (err || (null == configVNData)) {
            callback(err, null);
            return;
        }
        if ((null != configVNData) && 
            (null != configVNData['virtual-networks'])) {
            vnList = getFqNameList(configVNData['virtual-networks']);
        }
        if (0 != vnList.length) {
            vnList.sort(infraCmn.sortUVEList);
        }
        callback(err, vnList, null);
    });
}
/*
 * This function is to get the virtual networks based on the user name
 */
function getVirtualNetworksForUser(appData,callback)
{
    var vnList     = [],dataObjArr = [];
    var configURL = null;
    authApi.getTenantList(appData.authObj.req, appData,
       function(error, tenantList) {
            var tenantListLen = (tenantList['tenants'] != null) ? (tenantList['tenants'].length) : 0;
            for(var i = 0; i < tenantListLen; i++) {
                configURL = '/virtual-networks?parent_type=project&parent_fq_name_str=default-domain:'+
                            tenantList['tenants'][i]['name'];
                commonUtils.createReqObj(dataObjArr, configURL,
                            global.HTTP_REQUEST_GET, null, null, null,
                            appData);
            }
            async.map(dataObjArr,commonUtils.getAPIServerResponse(configApiServer.apiGet, false),
                function(err,configVNData) {
                    if (err || (null == configVNData)) {
                        callback(err, vnList);
                        return;
                    }
                    var vnArray = [],configVNDataLen = configVNData.length;
                    for(var i = 0; i < configVNDataLen; i++){
                        vnArray = vnArray.concat(configVNData[i]['virtual-networks']);
                    }
                    configVNData['virtual-networks'] = vnArray;
                    vnList = getFqNameList(configVNData['virtual-networks']);
                    if (0 != vnList.length) {
                        vnList.sort(infraCmn.sortUVEList);
                    }
                    callback(err, vnList,tenantList);
               });
      });
}
/*
 * This function takes the data, parses it and checks for fqName
 * and constructs the fqName array
 */
function getFqNameList(data){
    var vnList = [],vnNmae = null,dataLen = (data != null) ? (data.length) : 0;
    if (null != data) {
        for (var i = 0; i < dataLen; i++) {
            try {
                vnName =
                    data[i]['fq_name'].join(':');
            } catch(e) {
                continue;
            }
            vnList.push({'name': vnName});
        }
    }
    return vnList;
}
function getVirtualNetworksDetails (req, res, appData)
{
    var fqn = req.query['fqn'];
    var lastUUID = req.query['lastKey'];
    var count = req.query['count'];
    var filtUrl = null;
    var vnList = [];
    var dataObjArr = [];

    var resultJSON = createEmptyPaginatedData();
    var filtData = nwMonUtils.buildBulkUVEUrls(res.req.body, appData);
    if (filtData && filtData[0]) {
        filtUrl = filtData[0]['reqUrl'];
    }
    if (null == count) {
        count = -1;
    } else {
        count = parseInt(count);
    }
    if (null != fqn) {
        getVirtualNetworksDetailsByFqn(fqn, lastUUID, count, res, appData);
        return;
    }
    aggConfigVNList(null, appData, function(err, vnList, tenantList) {
        if (0 == vnList.length) {
            commonUtils.handleJSONResponse(err, res, resultJSON);
            return;
        }
        processVirtualNetworksReqByLastUUID(lastUUID, count, false, vnList, 
                                            filtUrl, tenantList, function(err, data) {
            commonUtils.handleJSONResponse(err, res, data);
        });
    });
}

function getInstanceDetails (req, res, appData)
{
    var getVMCB = instanceDetailsMap[req.session.loggedInOrchestrationMode];
    if(null != getVMCB) {
        getVMCB(req, appData, function(err, instDetails) {
            commonUtils.handleJSONResponse(err, res, instDetails);
            return;
        });
    }
    if(req.session.userRole.indexOf(global.STR_ROLE_ADMIN) > -1) {
        getInstanceDetailsForAdmin(req,appData,function(err, instDetails) {
            commonUtils.handleJSONResponse(err, res, instDetails);
            return;
        })
    } else {
        getInstancesDetailsForUser(req, appData, function(err, instDetails) {
            commonUtils.handleJSONResponse(err, res, instDetails);
            return;
        });
    }
}
/*
 * This function fetch the virtual machines for the Admin role
 */
function getInstanceDetailsForAdmin(req,appData,callback) {
    var fqnUUID = req.query['fqnUUID'];
    var lastUUID = req.query['lastKey'];
    var count = req.query['count'];
    var type = req.query['type'];
    var url = '/analytics/virtual-machines';
    var filtUrl = null;
    var resultJSON = createEmptyPaginatedData();
    var filtData = nwMonUtils.buildBulkUVEUrls(req.body, appData);
    if (filtData && filtData[0]) {
        filtUrl = filtData[0]['reqUrl'];
    }
    if (null == count) {
        count = -1;
    } else {
        count = parseInt(count);
    }
    if (null != fqnUUID) {
        if (null == type) {
            err = new
                appErrors.RESTServerError('type is required');
            callback(err,resultJSON);
            return;
        }
        return getInstanceDetailsByFqn(req, appData, callback);
    }
    opApiServer.apiGet(url, appData, function(err, data) {
        if (err || (null == data)) {
            callback(err,resultJSON);
            return;
        }
        data.sort(infraCmn.sortUVEList);
        processInstanceReqByLastUUID(lastUUID, count, false, data, 
                                     filtUrl, callback);
    });
}
/*
 * This function fetch the virtual machines for the User role
 */
function getInstancesDetailsForUser(req, appData, callback) 
{
    var fqnUUID = req.query['fqnUUID'];
    var lastUUID = req.query['lastKey'];
    var count = req.query['count'];
    var type = req.query['type'];
    var dataObjArr = [];
    var filtUrl = null;
    var filtData = nwMonUtils.buildBulkUVEUrls(req.body, appData);
    if (filtData && filtData[0]) {
        filtUrl = filtData[0]['reqUrl'];
    }
    if (null != fqnUUID) {
        if (null == type) {
            err = new 
                appErrors.RESTServerError('type is required');
            callback(err, null)
            return;
        }
        getInstanceDetailsByFqn(req, appData, callback);
        return;
    }
    authApi.getTenantList(req,appData,function(err,tenantList) {
        var projectsLen = (tenantList['tenants'] != null) ? (tenantList['tenants'].length) : 0;
        for(var i = 0; i < projectsLen; i++) {
            configURL = '/project/' + commonUtils.convertUUIDToString(tenantList['tenants'][i]['id']);
            commonUtils.createReqObj(dataObjArr, configURL,
                global.HTTP_REQUEST_GET, null, null, null,
                appData);
        }
        async.map(dataObjArr,
                  commonUtils.getAPIServerResponse(configApiServer.apiGet, false),
                  function(err,projectData) {
                      if (err || (null == projectData)){
                          callback(err,null);
                          return;
                      }
                      var vmiUrl = null,reqArr = [],projectDataLen = projectData.length;
                      for(var i = 0; i < projectDataLen; i++) {
                          var itemData = projectData[i]['project'];
                          var vmiLen = (itemData['virtual_machine_interfaces'] != null) ? 
                                       (itemData['virtual_machine_interfaces'].length) : 0;
                          for(var j = 0; j < vmiLen; j++) {
                              vmiUrl = '/virtual-machine-interface/'+
                              itemData['virtual_machine_interfaces'][j]['uuid'];
                              commonUtils.createReqObj(reqArr, vmiUrl,
                                global.HTTP_REQUEST_GET, null, null, null,
                                appData);
                          }
                      }
                      if (0 == reqArr.length) {
                          var emptyData = {
                                              "data":[],
                                              "lastKey":null,
                                              "more":false
                                          };
                          callback(null,emptyData);
                          return;
                      }
                      async.map(reqArr,
                              commonUtils.getAPIServerResponse(configApiServer.apiGet, false),
                              function(error, vmiData) {
                                  if (error || (null == vmiData)) {
                                      callback(error,null);
                                      return;
                                  }
                                  var vmuuidObjArr = [],vmuuidArr = [],vmiDataLen = vmiData.length;
                                  for(var k = 0; k < vmiDataLen; k++) {
                                      var itemData = (vmiData[k]['virtual-machine-interface'] != null) ? 
                                                     (vmiData[k]['virtual-machine-interface']): {};
                                      var vmiRefsLen = (itemData['virtual_machine_refs'] != null) ? 
                                                       (itemData['virtual_machine_refs'].length) : 0;
                                      if (itemData['virtual_machine_refs'] != null) {
                                          for(var l = 0; l < vmiRefsLen; l++) {
                                              if (-1 == vmuuidArr.indexOf(itemData['virtual_machine_refs'][l]['uuid'])) {
                                                  vmuuidArr.push(itemData['virtual_machine_refs'][l]['uuid']);
                                                  vmuuidObjArr.push({name:itemData['virtual_machine_refs'][l]['uuid']});
                                              }
                                          }
                                      }
                                  }
                                  vmuuidObjArr.sort(infraCmn.sortUVEList);
                                  processInstanceReqByLastUUID(lastUUID, count, false, vmuuidObjArr, 
                                          filtUrl, function(err, vmdata) {
                                                callback(err, vmdata);
                                          });
                      });
               });
     });
    
} 

function getStats(req, res) {

    var reqParams = req.body['data']
    var type = reqParams['type'];
    var uuids = reqParams['uuids'];
    var minSince = reqParams['minSince'];
    var useServerTime = reqParams['userServerTime'];
    var whereClause = [],table,context;
    var timeObj = nwMonJobs.createTimeQueryJsonObjByServerTimeFlag (minSince,
            useServerTime);
    if (uuids.indexOf(',') > -1) {
        uuids = uuids.split(',');
        var uuidsLen = uuids.length;
        for (var i = 0; i < uuidsLen; i++) {
            whereClause.push({name:uuids[i]});
        }
    } else {
        whereClause.push({name:uuids});
    }
    if ('virtual-machine' == type) {
        table = 'StatTable_VirtualMachineStats_if_stats';
        context = 'vm';
    } else if ('virtual-network' == type) {
        table = 'StatTable_UveVirtualNetworkAgent_vn_stats';
        context = 'vn';
    }
    var props = global.STATS_PROP[context];
    var selectArr = [props['inBytes'], props['outBytes'],props['inPkts'],
                     props['outPkts'], 'name'];
    var queryJSON = nwMonJobs.formatQueryString(table, whereClause,
            selectArr, timeObj, true, null);
    //Removing the flow_count select field from query as not required for the OracleStats 
    var flowCountIdx = queryJSON['select_fields'].indexOf('flow_count');
    if (flowCountIdx > -1)
        queryJSON['select_fields'].splice(flowCountIdx,1);
    //logutils.logger.debug("Query json is "+JSON.stringify(queryJSON));
    /*{"table":"StatTable.VirtualMachineStats.if_stats","start_time":1410335210823000,"end_time":1410535210823000,
        "select_fields":["SUM(if_stats.out_bytes)","SUM(if_stats.in_bytes)","SUM(if_stats.out_pkts)","SUM(if_stats.in_pkts)","name"],
        "where":[[{"name":"name","value":"94e7640f-de61-4499-ac61-cfa54ce904f0","op":1}],
                 [{"name":"name","value":"e2d54418-a40c-48d8-968f-2769abbd25e2","op":1}]],"dir":1}*/

    nwMonUtils.getStatDataByQueryJSON(queryJSON,null,function(err, data) {
       logutils.logger.debug(JSON.stringify(data)); 
       commonUtils.handleJSONResponse(err, res, data);
    });
}

function getvnStatsPerVrouter (req, res, appData)
{
    var reqUrl = '/analytics/uves/vrouter';
    var urlKey = ctrlGlobal.STR_GET_VN_STATS_PER_VROUTER;
    cacheApi.queueDataFromCacheOrSendRequest(req, res, global.STR_JOB_TYPE_CACHE,
                                             urlKey, reqUrl,
                                             0, 1, 0, -1, true, req.query);
}

/* List all public functions */
exports.getTopNetworkDetailsByDomain = getTopNetworkDetailsByDomain;
exports.getTopNetworkDetailsByProject = getTopNetworkDetailsByProject;
exports.getFlowSeriesByVN = getFlowSeriesByVN;
exports.getFlowSeriesByInstance = getFlowSeriesByInstance;
exports.getProjectSummary = getProjectSummary;
exports.getNetworkTopology = getNetworkTopology;
exports.getNetworStats = getNetworStats;
exports.getVMFloatingIPList = getVMFloatingIPList;
exports.getVNStatsSummary = getVNStatsSummary;
exports.getTopNwDetailsByVM = getTopNwDetailsByVM;
exports.getFlowSeriesByVM = getFlowSeriesByVM;
exports.getVMStatsSummary = getVMStatsSummary;
exports.getConnectedNWsStatsSummary = getConnectedNWsStatsSummary;
exports.getConnectedNWsStatsByType = getConnectedNWsStatsByType;
exports.getFlowEntriesByFlowTuple = getFlowEntriesByFlowTuple;
exports.getNetworkTopStatsDetails = getNetworkTopStatsDetails;
exports.getNetworkStatsSummary = getNetworkStatsSummary;
exports.getAllConnNetStatDetails = getAllConnNetStatDetails;
exports.getPortLevelFlowSeries = getPortLevelFlowSeries;
exports.getFlowSeriesByCPU = getFlowSeriesByCPU;
exports.getVirtualNetworksSummary = getVirtualNetworksSummary;
exports.getVirtualMachinesSummary = getVirtualMachinesSummary;
exports.getNetworkTreeTopology = getNetworkTreeTopology;
exports.getProjectTreeTopology = getProjectTreeTopology;
exports.getVMDetails = getVMDetails;
exports.getInstanceDetails = getInstanceDetails;
exports.getVirtualNetworksDetails = getVirtualNetworksDetails;
exports.isAllowedVN = isAllowedVN;
exports.getVNListByProject = getVNListByProject;
exports.getOpServerPagedResponseByLastKey = getOpServerPagedResponseByLastKey;
exports.getStats = getStats;
exports.getvnStatsPerVrouter = getvnStatsPerVrouter;

