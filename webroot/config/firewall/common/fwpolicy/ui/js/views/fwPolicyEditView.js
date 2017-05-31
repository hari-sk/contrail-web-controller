/*
 * Copyright (c) 2017 Juniper Networks, Inc. All rights reserved.
 */

define([
    'underscore',
    'contrail-view',
    'knockback',
    'config/networking/policy/ui/js/views/policyFormatters'
], function (_, ContrailView, Knockback, PolicyFormatters) {
    var prefixId = ctwc.FW_POLICY_PREFIX_ID;
    var modalId = 'configure-' + prefixId;
    var self;
    var fwPolicyEditEditView = ContrailView.extend({
        renderAddEditFWPolicy: function (options) {
            var editTemplate =
                contrail.getTemplate4Id(cowc.TMPL_EDIT_FORM);
            var editLayout = editTemplate({prefixId: prefixId}),
                self = this;

            cowu.createWizardModal({"modalId": modalId, "className": "modal-980",
                "title": options.title, "body": editLayout,
                "onSave": function () {
                var wizardId = cowu.formatElementId([prefixId, ctwl.TITLE_CREATE_FW_POLICY]),
                    wizardDataContrailWizard = $("#" + wizardId).data("contrailWizard"),
                    currentStepIndex = wizardDataContrailWizard.getCurrentIndex(),
                    stepsLength = wizardDataContrailWizard.getStepsLength();

                if(currentStepIndex == (stepsLength - 1)) {
                    wizardDataContrailWizard.finish();
                } else {
                    wizardDataContrailWizard.next();
                }
            }, "onCancel": function () {
                Knockback.release(self.model, document.getElementById(modalId));
                kbValidation.unbind(self);
                $("#" + modalId).find(".contrailWizard").data("contrailWizard").destroy();
                $("#" + modalId).modal("hide");
            }});

            self.fetchAllData(self, function(allData){
                self.renderView4Config($("#" + modalId).find("#" + prefixId + "-form"),
                        self.model, getAddPolicyViewConfig(self.model, options, allData),
                        'addValidation', null, null,
                        function() {
                    if (!contrail.checkIfKnockoutBindingExist(modalId)) {
                        /*self.model.showErrorAttr(cowu.formatElementId([prefixId,
                            ctwl.TITLE_CREATE_FW_POLICY]) + cowc.FORM_SUFFIX_ID, false);*/
                        self.model.showErrorAttr(cowu.formatElementId([prefixId,
                                         ctwl.TITLE_CREATE_FW_RULES, ctwl.TITLE_CREATE_FW_POLICY]) + cowc.FORM_SUFFIX_ID, false);
                        /*self.model.showErrorAttr(cowu.formatElementId([prefixId, smwl.TITLE_ASSIGN_ROLES, smwl.TITLE_SELECT_SERVERS]) + smwc.FORM_SUFFIX_ID, false);
                        self.model.showErrorAttr(cowu.formatElementId([prefixId, smwl.TITLE_EDIT_CONFIG]) + cowc.FORM_SUFFIX_ID, false);*/
                        Knockback.applyBindings(self.model, document.getElementById(modalId));
                        kbValidation.bind(self);
                    }
                });
            });
        },

        renderDeleteFWPolicies: function(options) {
            var delTemplate =
                contrail.getTemplate4Id('core-generic-delete-form-template');
            var self = this;

            var delLayout = delTemplate({prefixId: prefixId});
            cowu.createModal({'modalId': modalId, 'className': 'modal-480',
                             'title': options['title'], 'btnName': 'Confirm',
                             'body': delLayout,
               'onSave': function () {
                self.model.deleteFWPolicies(options['checkedRows'], {
                    init: function () {
                        cowu.enableModalLoading(modalId);
                    },
                    success: function () {
                        options['callback']();
                        $("#" + modalId).modal('hide');
                    },
                    error: function (error) {
                        cowu.disableModalLoading(modalId, function () {
                            self.model.showErrorAttr(prefixId +
                                                     cowc.FORM_SUFFIX_ID,
                                                     error.responseText);
                        });
                    }
                });
            }, 'onCancel': function () {
                Knockback.release(self.model, document.getElementById(modalId));
                kbValidation.unbind(self);
                $("#" + modalId).modal('hide');
            }});
            self.model.showErrorAttr(prefixId + cowc.FORM_SUFFIX_ID, false);
            Knockback.applyBindings(self.model, document.getElementById(modalId));
            kbValidation.bind(self);
        },

        fetchAllData : function(self, callback) {
            var getAjaxs = [];
            var selectedDomain = contrail.getCookie(cowc.COOKIE_DOMAIN_DISPLAY_NAME);
            var selectedProject = contrail.getCookie(cowc.COOKIE_PROJECT_DISPLAY_NAME);
            getAjaxs[0] = $.ajax({
                url:"/api/tenants/config/virtual-networks",
                type:"GET"
            });
            //get tags
            getAjaxs[1] = $.ajax({
                url:"/api/tenants/config/get-config-details",
                type:"POST",
                dataType: "json",
                contentType: "application/json; charset=utf-8",
                data:JSON.stringify(
                        {data: [{type: 'tags'}]}),
            });

            //get address groups
            getAjaxs[2] = $.ajax({
                url:"/api/tenants/config/get-config-details",
                type:"POST",
                dataType: "json",
                contentType: "application/json; charset=utf-8",
                data: JSON.stringify(
                        {data: [{type: 'address-groups'}]})
            });
            
           //get service groups
            getAjaxs[3] = $.ajax({
                url:"/api/tenants/config/get-config-details",
                type:"POST",
                dataType: "json",
                contentType: "application/json; charset=utf-8",
                data: JSON.stringify(
                        {data: [{type: 'service-groups'}]})
            });
            $.when.apply($, getAjaxs).then(
                function () {
                    //all success
                    var returnArr = []
                    var results = arguments;
                    var vns = results[0][0]["virtual-networks"];
                    returnArr["virtual-networks"] = [];
                    var allVns = [{text:'Enter or Select a Network',
                                   value:"dummy" + cowc.DROPDOWN_VALUE_SEPARATOR + "virtual_network",
                                   id:"dummy" + cowc.DROPDOWN_VALUE_SEPARATOR + "virtual_network",
                                   //value:"dummy",
                                   //id:"dummy",
                                   disabled : true }/*,
                                 {text:"ANY (All Networks in Current Project)",
                                   value:"any" + cowc.DROPDOWN_VALUE_SEPARATOR + "virtual_network",
                                   id:"any" + cowc.DROPDOWN_VALUE_SEPARATOR + "virtual_network",
                                   //"value":"any",
                                   //"id":"any",
                                   "parent": "virtual_network"},
                                 {text:"LOCAL (All Networks to which this policy is associated)",
                                 value:"local" + cowc.DROPDOWN_VALUE_SEPARATOR + "virtual_network",
                                 id:"local" + cowc.DROPDOWN_VALUE_SEPARATOR + "virtual_network",
                                 //"value":"local",
                                 //"id":"local",
                                 "parent": "virtual_network"}*/];

                    if (null !== vns && typeof vns === "object" &&
                                     vns.length > 0) {
                        for (var i = 0; i < vns.length; i++) {
                            var vn = vns[i];
                            var virtualNetwork = vn["fq_name"];
                            var domain = virtualNetwork[0];
                            var project = virtualNetwork[1];
                            if(domain === selectedDomain &&
                               project === selectedProject) {
                                if(vn["fq_name"][2].toLowerCase() === "any" ||
                                   vn["fq_name"][2].toLowerCase() === "local"){
                                    var fqNameTxt = vn["fq_name"][2]; /*+' (' +
                                                    domain + ':' +
                                                    project +')';*/
                                    var fqNameValue = vn["fq_name"].join(":");
                                    allVns.push({text : fqNameTxt,
                                         value : fqNameValue + cowc.DROPDOWN_VALUE_SEPARATOR + "virtual_network",
                                         id : fqNameValue + cowc.DROPDOWN_VALUE_SEPARATOR + "virtual_network",
                                         //value : fqNameValue,
                                         //id : fqNameValue,
                                         parent : "virtual_network" });
                                } else {
                                    allVns.push({text : vn["fq_name"][2],
                                                 value:(vn["fq_name"]).join(":")
                                                       + cowc.DROPDOWN_VALUE_SEPARATOR + "virtual_network",
                                                 id : (vn["fq_name"]).join(":")
                                                       + cowc.DROPDOWN_VALUE_SEPARATOR + "virtual_network",
                                                 //value:(vn["fq_name"]).join(":"),
                                                 //id : (vn["fq_name"]).join(":"),
                                                       parent : "virtual_network" });
                                }
                            } else {
                                var fqNameTxt = vn["fq_name"][2] +' (' +
                                                domain + ':' +
                                                project +')';
                                var fqNameValue = vn["fq_name"].join(":");
                                allVns.push({text : fqNameTxt,
                                     value : fqNameValue + cowc.DROPDOWN_VALUE_SEPARATOR + "virtual_network",
                                     id : fqNameValue + cowc.DROPDOWN_VALUE_SEPARATOR + "virtual_network",
                                     //value : fqNameValue,
                                     //id : fqNameValue,
                                     parent : "virtual_network" });
                            }
                        }
                    }
                    //tags
                    var tags = getValueByJsonPath(results, '1;0;0;tags', [], false);
                    var addrFields = [];
                    //application
                    var tagGroupData = parseTags(tags);
                    addrFields.push({text: 'Application', value: 'Application',
                        children: tagGroupData.applicationMap['Application']
                    });

                    //Deployment
                    addrFields.push({text: 'Deployment', value: 'Deployment',
                        children: tagGroupData.deploymentMap['Deployment']
                    });

                    //Site
                    addrFields.push({text: 'Site', value: 'Site',
                        children: tagGroupData.siteMap['Site']
                    });

                    //Tier
                    addrFields.push({text: 'Tier', value: 'Tier',
                        children: tagGroupData.tierMap['Tier']
                    });
                    var addressGrpChild = [{text:'Select a Address Group',
                        value:"dummy" + cowc.DROPDOWN_VALUE_SEPARATOR + "address_group",
                        id:"dummy" + cowc.DROPDOWN_VALUE_SEPARATOR + "address_group",
                        disabled : true }];
                    var addressGroups = getValueByJsonPath(results, '2;0;0;address-groups', [], false); 
                    if(addressGroups.length > 0){
                        for(var k = 0; k < addressGroups.length; k++){
                            var address = addressGroups[k]['address-group'];
                            var fqNameTxt = address["fq_name"][address["fq_name"].length - 1];
                            var fqNameValue = address["fq_name"].join(":");                            
                            addressGrpChild.push({text : address.name,
                                value : fqNameValue + cowc.DROPDOWN_VALUE_SEPARATOR + "address_group",
                                id : fqNameValue + cowc.DROPDOWN_VALUE_SEPARATOR + "address_group",
                                parent : "address_group" });
                        }
                        addrFields.push({text : 'Address Group', value : 'address_group', children : addressGrpChild});
                    }

                    addrFields.push({text : 'Network', value : 'virtual_network',
                                   children : allVns});
                    var anyList = [{text:'Select a Any',
                        value:"dummy" + cowc.DROPDOWN_VALUE_SEPARATOR + "any_workload",
                        id:"dummy" + cowc.DROPDOWN_VALUE_SEPARATOR + "any_workload",
                        disabled : true }];
                        anyList.push({text : 'ANY',
                        value : 'any' + cowc.DROPDOWN_VALUE_SEPARATOR + "any_workload",
                        id : 'any' + cowc.DROPDOWN_VALUE_SEPARATOR + "any_workload",
                        parent : "any_workload" });
                    addrFields.push({text : 'Any Workload', value : 'any_workload', children : anyList});
                    returnArr["addrFields"] = addrFields;
                    callback(returnArr);
                }
            )
        }

    });

    function parseTags(tags) {
        var tagGroupData = {},
            applicationMap = { Application: [{ text: "Select Application",
                value: "dummy" +
                cowc.DROPDOWN_VALUE_SEPARATOR +
                "Application",
             disabled: true}]}, siteMap = {Site: [{ text: "Select Site",
                 value: "dummy" +
                 cowc.DROPDOWN_VALUE_SEPARATOR +
                 "Site",
              disabled: true}]},
            deploymentMap = {Deployment: [{ text: "Select Deployment",
                value: "dummy" +
                cowc.DROPDOWN_VALUE_SEPARATOR +
                "Deployment",
             disabled: true}]}, tierMap = {Tier:[{ text: "Select Tier",
                 value: "dummy" +
                 cowc.DROPDOWN_VALUE_SEPARATOR +
                 "Tier",
              disabled: true}]};
         _.each(tags, function(tagData){
             if('tag' in tagData) {
                 var data = tagData['tag'];
                 var val = data.fq_name.length === 1 ?
                         'global:' + data.name : data.name;
                 if(data.tag_type === ctwc.APPLICATION_TAG_TYPE) {
                     applicationMap['Application'].push({
                         text: data.tag_value,
                         value: val + cowc.DROPDOWN_VALUE_SEPARATOR + "Application",
                         id: val + cowc.DROPDOWN_VALUE_SEPARATOR + "Application",
                         parent: 'Application'});
                 } else if(data.tag_type === ctwc.TIER_TAG_TYPE) {
                     tierMap['Tier'].push({
                         text: data.tag_value,
                         value: val + cowc.DROPDOWN_VALUE_SEPARATOR + "Tier",
                         id: val + cowc.DROPDOWN_VALUE_SEPARATOR + "Tier",
                         parent: 'Tier'});

                 } else if(data.tag_type === ctwc.DEPLOYMENT_TAG_TYPE) {
                     deploymentMap['Deployment'].push({
                         text: data.tag_value,
                         value: val + cowc.DROPDOWN_VALUE_SEPARATOR + "Deployment",
                         id: val + cowc.DROPDOWN_VALUE_SEPARATOR + "Deployment",
                         parent: 'Deployment'});

                 } else if(data.tag_type === ctwc.SITE_TAG_TYPE) {
                     siteMap['Site'].push({
                         text: data.tag_value,
                         value: val + cowc.DROPDOWN_VALUE_SEPARATOR + "Site",
                         id: val + cowc.DROPDOWN_VALUE_SEPARATOR + "Site",
                         parent: 'Site'});
                 }
             }
         });
         tagGroupData.applicationMap = applicationMap;
         tagGroupData.siteMap = siteMap;
         tagGroupData.deploymentMap = deploymentMap;
         tagGroupData.tierMap = tierMap;
         return tagGroupData;
    }
    var fqnameDisplayFormat = function(fqname, selectedDomain, selectedProject) {
        var returnText = "";
        returnText = getValueByJsonPath(fqname, "2", "");
        if(returnText != "" && (
           fqname[0] != selectedDomain ||
           fqname[1] != selectedProject)) {
            returnText += "("+ fqname[0] + ":" + fqname[1] +")";
        }
        return returnText;
    };
    var createPolicyViewConfig = [{
        elementId: cowu.formatElementId([prefixId, ctwl.TITLE_DETAILS]),
            title: ctwl.TITLE_DETAILS,
        view: "SectionView",
        viewConfig: {
            rows: [
                {
                    columns: [
                        {
                            elementId: "name",
                            view: "FormInputView",
                            viewConfig: {
                                path: "name",
                                dataBindValue: "name",
                                class: "col-xs-6"
                            }
                        }
                    ]
                }, {
                    columns: [
                              {
                                  elementId: "description",
                                  view: "FormInputView",
                                  viewConfig: {
                                      path: "id_perms.description",
                                      dataBindValue: "id_perms().description",
                                      class: "col-xs-12"
                                  }
                              }
                          ]
                  }
            ]
        }
    }];

    var getRulesViewConfig = function(allData) {
        return {
            rows: [{
                    columns: [{
                        elementId: 'firewall_rules',
                        view: "FormCollectionView",
                        //view: "FormEditableGridView",
                        viewConfig: {
                            label:"",
                            path: "firewall_rules",
                            class: 'col-xs-12',
                            validation: 'ruleValidation',
                            templateId: cowc.TMPL_COLLECTION_HEADING_VIEW,
                            collection: "firewall_rules",
                            rows:[{
                               rowActions: [
                                   {onClick: "function() { $root.addRuleByIndex($data, this); }",
                                   iconClass: 'fa fa-plus'},
                                   {onClick:
                                   "function() { $root.deleteRules($data, this); }",
                                    iconClass: 'fa fa-minus'}
                               ],
                            columns: [
                               /* {
                                    elementId: 'sequence',
                                    name: 'Order',
                                    view: "FormInputView",
                                    class: "",
                                    width: 60,
                                    viewConfig: {
                                       templateId: cowc.TMPL_EDITABLE_GRID_INPUT_VIEW,
                                       path: 'sequence',
                                       dataBindValue: 'sequence()'
                                       }
                                },*/
                                {
                                    elementId: 'status',
                                    name: 'Status',
                                    view: "FormCheckboxView",
                                    class: "",
                                    width: 60,
                                    viewConfig: {
                                       templateId: cowc.TMPL_EDITABLE_GRID_CHECKBOX_VIEW,
                                       path: 'status',
                                       dataBindValue: 'status()'
                                       }
                                },
                                {
                                 elementId: 'simple_action',
                                 name: 'Action',
                                 view: "FormDropdownView",
                                 class: "",
                                 width: 60,
                                 viewConfig: {
                                     templateId: cowc.TMPL_EDITABLE_GRID_DROPDOWN_VIEW,
                                     path: "simple_action",
                                     disabled: "showService()",
                                     dataBindValue: "simple_action()",
                                     elementConfig:{
                                         data:['pass','deny']
                                    }}
                                },
                                {
                                    elementId: 'user_created_service',
                                    name: 'Service (Portocol:Port)',
                                    view: "FormInputView",
                                    class: "",
                                    width: 180,
                                    viewConfig: {
                                        placeholder: 'Protocol:Port',
                                        templateId: cowc.TMPL_EDITABLE_GRID_INPUT_VIEW,
                                        path: "user_created_service",
                                        dataBindValue: "user_created_service()"
                                        //disabled: "mirror_to_check()",
                                       }
                                },
                                {
                                    elementId: 'endpoint_1',
                                    view:
                                        "FormHierarchicalDropdownView",
                                    name: 'End Point 1',
                                    class: "",
                                    width: 200,
                                    viewConfig: {
                                        templateId: cowc.TMPL_EDITABLE_GRID_DROPDOWN_VIEW,
                                        width: 200,
                                        path: 'endpoint_1',
                                        dataBindValue: 'endpoint_1()',
                                        elementConfig: {
                                            //defaultValueId : 1,
                                            minimumResultsForSearch : 1,
                                            dataTextField: "text",
                                            dataValueField: "value",
                                            data: allData.addrFields,
                                            queryMap: [
                                            {
                                                name : 'Application',
                                                value : 'Application',
                                                iconClass:
                                                'fa fa-list-alt'
                                            },
                                            {
                                                name : 'Deployment',
                                                value : 'Deployment',
                                                iconClass:
                                                'fa fa-database'
                                            },
                                            {
                                                name : 'Site',
                                                value : 'Site',
                                                iconClass:
                                                'fa fa-life-ring'
                                            },
                                            {
                                                name : 'Tier',
                                                value : 'Tier',
                                                iconClass:
                                                'fa fa-clone'
                                            },
                                            {
                                                name : 'Network',
                                                value : 'virtual_network',
                                                iconClass:
                                                'icon-contrail-virtual-network'
                                            },
                                            {
                                                name : 'Address Group',
                                                value : 'address_group',
                                                iconClass:
                                                'icon-contrail-network-ipam'
                                            },
                                            { 
                                            	name : 'Any Workload',  
                                            	value : 'any_workload', 
                                            	iconClass:'fa fa-globe'
                                            }
                                           ]
                                        }
                                    }
                                },
                                {
                                 elementId: 'direction',
                                 name: 'Dir',
                                 view: "FormDropdownView",
                                 class: "",
                                 width: 60,
                                 viewConfig: {
                                     templateId: cowc.TMPL_EDITABLE_GRID_DROPDOWN_VIEW,
                                     path: "direction",
                                     dataBindValue: "direction()",
                                     disabled: "showService()",
                                     elementConfig:{
                                         data:['<>', '>']
                                     }}
                                },
                                {
                                    elementId: 'endpoint_2',
                                    view:
                                        "FormHierarchicalDropdownView",
                                    name: 'End Point 2',
                                    class: "col-xs-2",
                                    width: 200,
                                    viewConfig: {
                                        templateId: cowc.TMPL_EDITABLE_GRID_DROPDOWN_VIEW,
                                        width: 200,
                                        path: 'endpoint_2',
                                        dataBindValue: 'endpoint_2()',
                                        elementConfig: {
                                            //defaultValueId : 1,
                                            minimumResultsForSearch : 1,
                                            dataTextField: "text",
                                            dataValueField: "value",
                                            data: allData.addrFields,
                                            queryMap: [
                                            {
                                                name : 'Application',
                                                value : 'Application',
                                                iconClass:
                                                'fa fa-list-alt'
                                            },
                                            {
                                                name : 'Deployment',
                                                value : 'Deployment',
                                                iconClass:
                                                'fa fa-database'
                                            },
                                            {
                                                name : 'Site',
                                                value : 'Site',
                                                iconClass:
                                                'fa fa-life-ring'
                                            },
                                            {
                                                name : 'Tier',
                                                value : 'Tier',
                                                iconClass:
                                                'fa fa-clone'
                                            },
                                            {
                                                name : 'Network',
                                                value : 'virtual_network',
                                                iconClass:
                                                'icon-contrail-virtual-network'
                                            },
                                            {
                                                name : 'Address Group',
                                                value : 'address_group',
                                                iconClass:
                                                'icon-contrail-network-ipam'
                                            },
                                            { 
                                            	name : 'Any Workload',  
                                            	value : 'any_workload', 
                                            	iconClass:'fa fa-globe'
                                            }]
                                        }
                                    }
                                }, {
                                    elementId: 'match_tags',
                                    name: 'Match Tags',
                                    view: "FormMultiselectView",
                                    viewConfig:
                                      {
                                       class: "",
                                       width: 100,
                                       path: "match_tags",
                                       templateId:
                                           cowc.TMPL_EDITABLE_GRID_MULTISELECT_VIEW,
                                       dataBindValue:
                                           'match_tags()',
                                       elementConfig: {
                                           placeholder: "Select Tag Type",
                                           dataValueField: "value",
                                           dataTextField: "text",
                                           data: ctwc.RULE_MATCH_TAGS
                                       }
                                      }
                                }/*,
                                {
                                 elementId: 'log_checked',
                                 name: 'Log',
                                 view: "FormCheckboxView",
                                 class: "",
                                 width: 25,
                                 viewConfig: {
                                    templateId: cowc.TMPL_EDITABLE_GRID_CHECKBOX_VIEW,
                                    path: 'log_checked',
                                    dataBindValue: 'log_checked()'
                                    }
                                },
                                {
                                 elementId: 'apply_service_check',
                                 name: 'Services',
                                 view: "FormCheckboxView",
                                 class: "",
                                 width: 60,
                                 viewConfig: {
                                    templateId: cowc.TMPL_EDITABLE_GRID_CHECKBOX_VIEW,
                                    path: 'apply_service_check',
                                    dataBindValue: 'apply_service_check()'
                                    }
                                },
                                {
                                 elementId: 'mirror_to_check',
                                 name: 'Mirror',
                                 view: "FormCheckboxView",
                                 class: "",
                                 width: 60,
                                 viewConfig: {
                                     templateId: cowc.TMPL_EDITABLE_GRID_CHECKBOX_VIEW,
                                     path: 'mirror_to_check',
                                     dataBindValue: 'mirror_to_check()'
                                    }
                                },
                                {
                                    elementId: 'qos_action_check',
                                    name: 'QoS',
                                    view: "FormCheckboxView",
                                    class: "",
                                    width: 40,
                                    viewConfig: {
                                        templateId:
                                         cowc.TMPL_EDITABLE_GRID_CHECKBOX_VIEW,
                                        path: 'qos_action_check',
                                        dataBindValue: 'qos_action_check()'
                                       }
                                }*/]
                            }/*,{
                            columns: [
                                {
                                     elementId: 'service_instances',
                                     name: 'Services',
                                     view: "FormMultiselectView",
                                     width: 100,
                                     viewConfig: {
                                         colSpan: "10",
                                         class: "col-xs-10",
                                         placeholder:"Select a service to apply...",
                                         //visible: "$root.showService",
                                         visible: "apply_service_check()",
                                         templateId: cowc.TMPL_EDITABLE_GRID_MULTISELECT_LEFT_LABEL_VIEW,
                                         path: "service_instance",
                                         dataBindValue: "service_instance()",
                                         elementConfig:{
                                             dataTextField: "text",
                                             dataValueField: "value",
                                             separator: cowc.DROPDOWN_VALUE_SEPARATOR,
                                             data:allData.service_instances
                                         }
                                     }
                                }
                            ]
                            },getMirroringViewConfig(isDisable, allData),
                            {
                            columns: [
                                {
                                    elementId: 'QoS',
                                    name: 'QoS',
                                    //width: 100,
                                    view: "FormDropdownView",
                                    viewConfig: {
                                        placeholder: 'Select QoS',
                                        visible: "qos_action_check()",
                                        templateId:
                                            cowc.TMPL_EDITABLE_GRID_DROPDOWN_LEFT_LABEL_VIEW,
                                        path : 'qos',
                                        colSpan: "5",
                                        dataBindValue :
                                            'qos()',
                                        elementConfig : {
                                            placeholder: 'Select QoS',
                                            dataTextField : "text",
                                            dataValueField : "id",
                                            dataSource : {
                                                type: 'remote',
                                                requestType: 'POST',
                                                postData: JSON.stringify({data:
                                                    [{type: "qos-configs"}]}),
                                                url:
                                                    ctwc.URL_GET_CONFIG_DETAILS,
                                                parse:
                                                  policyFormatters.
                                                  qosDropDownFormatter
                                            }
                                        }
                                    }
                                }]
                            }*/],
                            gridActions: [
                                {onClick: "function() { addRule(); }",
                                 buttonTitle: ""}
                            ]
                    }
                    }]
                }]
            };

    }

    var getMirroringViewConfig = function(isDisable, allData) {
        var routingInstance = {};
        routingInstance.data = [];
        routingInstance.data[0] = {'type':'routing-instances', 'fields':''};
        return {
            columns: [{
                    elementId: 'mirroringOptions',
                    view: "SectionView",
                    viewConfig : {
                        colSpan: "10",
                        visible: "mirror_to_check()",
                        rows: [{
                            columns: [{
                                elementId: 'user_created_mirroring_optns',
                                view: 'FormRadioButtonView',
                                viewConfig: {
                                    templateId: cowc.TMPL_EDITABLE_GRID_RADIO_BUTTON_VIEW,
                                    label: '',
                                    path: 'user_created_mirroring_optns',
                                    dataBindValue:
                                        'user_created_mirroring_optns()',
                                    class: 'col-xs-12 radio-optns-grp',
                                    elementConfig: {
                                        dataObj: [
                                            {'label': 'Analyzer Instance',
                                             'value': 'analyzer_instance'},
                                            {'label': 'NIC Assisted',
                                             'value': 'nic_assisted'},
                                             {'label': 'Analyzer IP',
                                                 'value': 'analyzer_ip'}
                                        ]
                                    }
                                }
                            }]
                        }, {
                            columns: [{
                                elementId: 'analyzer_name',
                                view: "FormDropdownView",
                                viewConfig: {
                                    templateId: cowc.TMPL_EDITABLE_GRID_DROPDOWN_LEFT_LABEL_VIEW,
                                    class: "col-xs-6 cust-mirroring",
                                    path: 'action_list.mirror_to.analyzer_name',
                                    dataBindValue: 'action_list()().mirror_to.analyzer_name',
                                    placeholder: 'Enter Analyzer Name',
                                    label: 'Analyzer Name',
                                    visible : "user_created_mirroring_optns()() === 'analyzer_instance'",
                                    elementConfig: {
                                        placeholder: 'Select SI Analyzer',
                                        dataTextField: "text",
                                        dataValueField: "value",
                                        dataSource: {
                                            type: 'local',
                                            data: allData.analyzerInsts
                                        }
                                    }
                                }
                            }, {
                                elementId: 'user_created_analyzer_name',
                                view: "FormInputView",
                                viewConfig: {
                                    templateId: cowc.TMPL_EDITABLE_GRID_INPUT_LEFT_LABEL_VIEW,
                                    class: "col-xs-6 cust-mirroring",
                                    path: 'user_created_analyzer_name',
                                    dataBindValue: 'user_created_analyzer_name()',
                                    placeholder: 'Enter Analyzer Name',
                                    label: 'Analyzer Name',
                                    visible : "user_created_mirroring_optns()() !== 'analyzer_instance'",
                                }
                            }, {
                                elementId: 'nic_assisted_mirroring_vlan',
                                view: "FormInputView",
                                viewConfig: {
                                    visible: "user_created_mirroring_optns()() === 'nic_assisted'",
                                    templateId: cowc.TMPL_EDITABLE_GRID_INPUT_LEFT_LABEL_VIEW,
                                    class: "col-xs-6 cust-mirroring",
                                    path: 'action_list.mirror_to.nic_assisted_mirroring_vlan',
                                    dataBindValue: 'action_list()().mirror_to.nic_assisted_mirroring_vlan',
                                    placeholder: 'Enter NIC Assisted VLAN',
                                    label: 'NIC Assisted VLAN'
                                }
                            }]
                        }, {
                            columns: [{
                                elementId: 'analyzer_ip_address',
                                view: "FormInputView",
                                viewConfig: {
                                    visible: "user_created_mirroring_optns()() == 'analyzer_ip'",
                                    templateId: cowc.TMPL_EDITABLE_GRID_INPUT_LEFT_LABEL_VIEW,
                                    class: "col-xs-6",
                                    path: 'action_list.mirror_to.analyzer_ip_address',
                                    placeholder: 'xxx.xxx.xxx.xxx',
                                    dataBindValue: 'action_list()().mirror_to.analyzer_ip_address',
                                    label: 'Analyzer IP'
                                }
                            },{
                                elementId: 'analyzer_mac_address',
                                view: "FormInputView",
                                viewConfig: {
                                    visible: "user_created_mirroring_optns()() == 'analyzer_ip'",
                                    templateId: cowc.TMPL_EDITABLE_GRID_INPUT_LEFT_LABEL_VIEW,
                                    class: "col-xs-6 cust-mirroring",
                                    path: 'action_list.mirror_to.analyzer_mac_address',
                                    dataBindValue: 'action_list()().mirror_to.analyzer_mac_address',
                                    placeholder: 'Enter Analyzer MAC',
                                    label: 'Analyzer MAC'
                                }
                            }]
                        }, {
                            columns: [{
                                elementId: 'udp_port',
                                name: "UDP Port",
                                view: "FormInputView",
                                viewConfig: {
                                    visible: "user_created_mirroring_optns()() == 'analyzer_ip'",
                                    templateId: cowc.TMPL_EDITABLE_GRID_INPUT_LEFT_LABEL_VIEW,
                                    class: "col-xs-6 cust-mirroring",
                                    path: 'action_list.mirror_to.udp_port',
                                    placeholder: '1 to 65535',
                                    dataBindValue: 'action_list()().mirror_to.udp_port',
                                    label: 'UDP Port'
                                }
                            }]
                        }, {
                            columns:[{
                                elementId: 'user_created_juniper_header',
                                view: "FormDropdownView",
                                viewConfig: {
                                    visible: "user_created_mirroring_optns()() == 'analyzer_ip'",
                                    templateId: cowc.TMPL_EDITABLE_GRID_DROPDOWN_LEFT_LABEL_VIEW,
                                    class: "col-xs-6 cust-mirroring",
                                    path: 'user_created_juniper_header',
                                    dataBindValue: 'user_created_juniper_header()',
                                    label: 'Juniper Header',
                                    elementConfig: {
                                        dataTextField: "text",
                                        dataValueField: "value",
                                        data : [
                                            {'text':'Enabled', 'value':'enabled'},
                                            {'text':'Disabled', 'value':'disabled'}]
                                    }
                                }
                            }, {
                                elementId: 'mirrorToRoutingInstance',
                                view: "FormDropdownView",
                                viewConfig: {
                                    visible: "user_created_mirroring_optns()() == 'analyzer_ip'" +
                                        "&& user_created_juniper_header()() === 'disabled'" ,
                                    templateId: cowc.TMPL_EDITABLE_GRID_DROPDOWN_LEFT_LABEL_VIEW,
                                    class: "col-xs-6 cust-mirroring",
                                    path: 'mirrorToRoutingInstance',
                                    dataBindValue: 'mirrorToRoutingInstance()',
                                    label: 'Routing Instance',
                                    elementConfig: {
                                        placeholder: 'Select Routing Instance',
                                        dataTextField: "text",
                                        dataValueField: "value",
                                        dropdownAutoWidth : false,
                                        dataSource : {
                                            type: 'remote',
                                            requestType: 'post',
                                            postData: JSON.stringify(routingInstance),
                                            url:'/api/tenants/config/get-config-list',
                                            parse: function(result) {
                                                return policyFormatters.routingInstDDFormatter(result);
                                            }
                                        }
                                    }
                                }
                            }]
                        }, {
                            columns: [{
                            elementId: 'mirrorToNHMode',
                            view: "FormDropdownView",
                            viewConfig: {
                                visible: "user_created_mirroring_optns()() == 'analyzer_ip'",
                                templateId: cowc.TMPL_EDITABLE_GRID_DROPDOWN_LEFT_LABEL_VIEW,
                                class: "col-xs-6 cust-mirroring",
                                path: 'mirrorToNHMode',
                                dataBindValue: 'mirrorToNHMode()',
                                placeholder: 'Enter Next Hop Mode',
                                label: 'Nexthop Mode',
                                elementConfig: {
                                    placeholder: "Select Direction",
                                    dataTextField: "text",
                                    dataValueField: "value",
                                    data : [
                                        {'text':'Static', 'value':'static'},
                                        {'text':'Dynamic', 'value':'dynamic'}]
                                }
                            }
                        }]
                     },{
                         columns:[{
                             elementId: 'staticNHHeaderSection',
                             view: "SectionView",
                             viewConfig: {
                                 visible: "(user_created_mirroring_optns()() == 'analyzer_ip') && (mirrorToNHMode()() == 'static')",
                                 rows: [{
                                     columns:[{
                                         elementId: 'vtep_dst_ip_address',
                                         view: "FormInputView",
                                         viewConfig: {
                                             templateId: cowc.TMPL_EDITABLE_GRID_INPUT_LEFT_LABEL_VIEW,
                                             class: "col-xs-6 cust-mirroring",
                                             path: 'action_list.mirror_to.static_nh_header.vtep_dst_ip_address',
                                             placeholder: 'Enter IP Address',
                                             dataBindValue: 'action_list()().mirror_to.static_nh_header.vtep_dst_ip_address',
                                             label: 'VTEP Dest IP'
                                         }
                                     }, {
                                         elementId: 'vtep_dst_mac_address',
                                         view: "FormInputView",
                                         viewConfig: {
                                             templateId: cowc.TMPL_EDITABLE_GRID_INPUT_LEFT_LABEL_VIEW,
                                             class: "col-xs-6 cust-mirroring",
                                             path: 'action_list.mirror_to.static_nh_header.vtep_dst_mac_address',
                                             placeholder: 'Enter MAC Address',
                                             dataBindValue: 'action_list()().mirror_to.static_nh_header.vtep_dst_mac_address',
                                             label: 'VTEP Dest MAC'
                                         }
                                     }]
                                 },{
                                     columns:[{
                                         elementId: 'vni',
                                         view: "FormInputView",
                                         viewConfig: {
                                             templateId: cowc.TMPL_EDITABLE_GRID_INPUT_LEFT_LABEL_VIEW,
                                             class: "col-xs-6 cust-mirroring",
                                             path: 'action_list.mirror_to.static_nh_header.vni',
                                             placeholder: 'Enter VxLAN ID',
                                             dataBindValue: 'action_list()().mirror_to.static_nh_header.vni',
                                             label: 'VxLAN ID'
                                         }
                                     }]
                                 }]
                             }
                         }]
                     }]
                }
            }]
        };
    };

    function getAddRulesViewConfig(policyModel, modalHideFlag, options, allData) {
        var gridPrefix = "add-rules",
            addRulesViewConfig = {
            elementId:  cowu.formatElementId([prefixId, ctwl.TITLE_CREATE_FW_RULES]),
            view: "WizardView",
            viewConfig: {
                steps: [
                    {
                        elementId:  cowu.formatElementId([prefixId, ctwl.TITLE_CREATE_FW_RULES]),
                        title: ctwl.TITLE_CREATE_FW_RULES,
                        view: "SectionView",
                        viewConfig: getRulesViewConfig(allData),
                        stepType: "step",
                        onInitRender: true,
                        buttons: {
                            previous: {
                                visible: false
                            }
                        },
                        onNext: function(params) {
                            var callbackObj = {
                                init: function () {
                                    policyModel.showErrorAttr(cowu.formatElementId([prefixId, ctwl.TITLE_CREATE_FW_RULES]) + cowc.FORM_SUFFIX_ID, false);
                                    cowu.enableModalLoading(modalId);
                                },
                                success: function () {
                                    cowu.disableModalLoading(modalId, function () {
                                        options.callback();
                                        if (modalHideFlag) {
                                            $("#" + modalId).modal("hide");
                                        }
                                    });
                                },
                                error: function (error) {
                                    cowu.disableModalLoading(modalId, function () {
                                        policyModel.showErrorAttr(cowu.formatElementId([prefixId, ctwl.TITLE_CREATE_FW_RULES]) + cowc.FORM_SUFFIX_ID, error.responseText);
                                    });
                                }
                            };
                            return params.model.configFWRule(callbackObj, options);
                        }
                    }
                ]
            }
        };
        return addRulesViewConfig;
    }

    function getAddPolicyViewConfig(policyModel, options, allData) {
        var addPolicyViewConfig = {
                elementId: cowu.formatElementId([prefixId, 'policy_wizard']),
                view: "WizardView",
                viewConfig: {
                    steps: []
                }
            },
            steps = [],
            createStepViewConfig = null,
            addRulesStepViewConfig = null;

        createStepViewConfig = {
            elementId: cowu.formatElementId([prefixId, 'policy_step']),
            view: "AccordianView",
            viewConfig: createPolicyViewConfig,
            title: ctwl.TITLE_CREATE_FW_POLICY,
            stepType: "step",
            onInitRender: true,
            onNext: function (params) {
                return params.model.configFWPolicy({
                    init: function () {
                        policyModel.showErrorAttr(
                                cowu.formatElementId([prefixId,
                                    ctwl.TITLE_CREATE_FW_RULES]) + cowc.FORM_SUFFIX_ID, false);
                        cowu.enableModalLoading(modalId);
                    },
                    success: function () {
                        cowu.disableModalLoading(modalId, function () {
                            options.callback();
                        });
                    },
                    error: function (error) {
                        cowu.disableModalLoading(modalId, function () {
                            policyModel.showErrorAttr(cowu.formatElementId([prefixId, 'policy_step']) + cowc.FORM_SUFFIX_ID, error.responseText);
                        });
                    }
                }, options);
            },
            buttons: {
                next: {
                    label: ctwl.TITLE_SAVE_NEXT
                },
                previous: {
                    visible: false
                }
            }
        };
        createStepViewConfig.viewConfig[0].viewConfig.rows[0].columns[0].viewConfig.disabled = false;
        steps = steps.concat(createStepViewConfig);

        /*
            Appending Add Rules Steps
         */
        addRulesStepViewConfig = $.extend(true, {}, getAddRulesViewConfig(policyModel, true, options, allData).viewConfig).steps;

        addRulesStepViewConfig[0].title = ctwl.TITLE_CREATE_FW_RULES;
        addRulesStepViewConfig[0].onPrevious = function() {
            return false;
        };
        addRulesStepViewConfig[0].buttons = {
            next: {
                label: ctwl.TITLE_SAVE_NEXT
            },
            previous: {
                visible: false
            }
        };

        /*addRulesStepViewConfig[1].stepType = "sub-step";
        addRulesStepViewConfig[1].buttons = {
            next: {
                label: smwl.TITLE_SAVE_NEXT
            }
        };*/
        steps = steps.concat(addRulesStepViewConfig);

        addPolicyViewConfig.viewConfig.steps = steps;

        return addPolicyViewConfig;
    }

    return fwPolicyEditEditView;
});

