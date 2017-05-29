/*
 * Copyright (c) 2017 Juniper Networks, Inc. All rights reserved.
 */

define([
    'underscore',
    'moment',
    'contrail-view',
    'config/firewall/common/applicationpolicy/ui/js/models/applicationPolicyModel',
    'config/firewall/common/applicationpolicy/ui/js/views/applicationPolicyEditView'
], function (_, moment, ContrailView, ApplicationPolicyModel, ApplicationPolicyEditView) {
    var applicationPolicyEditView = new ApplicationPolicyEditView(),
        gridElId = "#" + ctwc.FIREWALL_APPLICATION_POLICY_GRID_ID;

    var applicationPolicyGridView = ContrailView.extend({
        el: $(contentContainer),
        render: function () {
            var self = this,
                viewConfig = this.attributes.viewConfig,
                pagerOptions = viewConfig['pagerOptions'];
            self.renderView4Config(self.$el, self.model,
                                   getApplicationPolicyGridViewConfig(viewConfig));
        }
    });

    var getApplicationPolicyGridViewConfig = function (viewConfig) {
        return {
            elementId: cowu.formatElementId([ctwc.FIREWALL_APPLICATION_POLICY_LIST_VIEW_ID]),
            view: "SectionView",
            viewConfig: {
                rows: [
                    {
                        columns: [
                            {
                                elementId: ctwc.FIREWALL_APPLICATION_POLICY_GRID_ID,
                                title: ctwl.TITLE_FIREWALL_APPLICATION_POLICY,
                                view: "GridView",
                                viewConfig: {
                                    elementConfig: getConfiguration(viewConfig)
                                }
                            }
                        ]
                    }
                ]
            }
        };
    };
    var getConfiguration = function (viewConfig) {
        var gridElementConfig = {
            header: {
                title: {
                    text: ctwl.TITLE_FIREWALL_APPLICATION_POLICY
                },
                advanceControls: getHeaderActionConfig(viewConfig),
            },
            body: {
                options: {
                    checkboxSelectable: {
                        onNothingChecked: function(e){
                            $('#btnDeleteAppPolicy').addClass('disabled-link');
                        },
                        onSomethingChecked: function(e){
                            $('#btnDeleteAppPolicy').removeClass('disabled-link');
                        }
                    },
                    actionCell: getRowActionConfig(viewConfig),
                    detail: {
                        template: cowu.generateDetailTemplateHTML(
                                       getApplicationPolicyDetailsTemplateConfig(),
                                       cowc.APP_CONTRAIL_CONTROLLER)
                    }
                },
                dataSource: {},
                statusMessages: {
                    loading: {
                        text: 'Loading Application Policy Sets..'
                    },
                    empty: {
                        text: 'No Application Policy Set Found.'
                    }
                }
            },
            columnHeader: {
                columns: [
                        {
                             field: 'name',
                             name: 'Policy Set Name',
                             id: 'name'
                        },
                        {
                            id: "description",
                            field: "description",
                            name: "Description",
                            formatter: descriptionFormatter,
                            sortable: {
                                sortBy: 'formattedValue'
                            }
                        },
                        {
                            id: "noofpolicies",
                            field: "noofpolicies",
                            name: "No. of Policies",
                            formatter: noOfPoliciesFormatter,
                            sortable: {
                                sortBy: 'formattedValue'
                            }
                        },
                        {
                            id: "lastupdated",
                            field: "lastupdated",
                            name: "Last Updated",
                            formatter: lastUpdateFormatter,
                            sortable: {
                                sortBy: 'formattedValue'
                            }
                        }
                ]
            },
        };
        return gridElementConfig;
    };
    function getRowActionConfig(viewConfig) {
        var rowActionConfig = [
            ctwgc.getEditConfig('Edit', function(rowIndex) {
                dataView = $('#' + ctwc.FIREWALL_APPLICATION_POLICY_GRID_ID).data("contrailGrid")._dataView;
                applicationPolicyEditView.model = new ApplicationPolicyModel(dataView.getItem(rowIndex));
                applicationPolicyEditView.renderAddEditApplicationPolicy({
                                      "title": 'Edit Application Policy Set',
                                      'mode':'edit',
                                      'isGlobal': viewConfig.isGlobal,
                                       callback: function () {
                                          dataView.refreshData();
                }});
            }),
            ctwgc.getDeleteConfig('Delete', function(rowIndex) {
               var dataItem = $('#' + ctwc.FIREWALL_APPLICATION_POLICY_GRID_ID).data('contrailGrid')._dataView.getItem(rowIndex);
               applicationPolicyEditView.model = new ApplicationPolicyModel(dataItem);
               applicationPolicyEditView.renderDeleteApplicationPolicy ({
                                      "title": 'Delete Application Policy Set',
                                      selectedGridData: [dataItem],
                                      callback: function () {
                                          var dataView = $('#' + ctwc.FIREWALL_APPLICATION_POLICY_GRID_ID).data("contrailGrid")._dataView;
                                          dataView.refreshData();
                }});
            })
        ];
        return rowActionConfig;
    }
    function getHeaderActionConfig(viewConfig) {
    	var headerActionConfig = [
    		{
                "type" : "link",
                "title" : ctwl.TITLE_TAG_MULTI_DELETE,
                "iconClass": 'fa fa-trash',
                "linkElementId": 'btnDeleteAppPolicy',
                "onClick" : function() {
                    var applicationPolicyModel = new ApplicationPolicyModel();
                    var checkedRows = $('#' + ctwc.FIREWALL_APPLICATION_POLICY_GRID_ID).data("contrailGrid").getCheckedRows();
                    if(checkedRows && checkedRows.length > 0) {
                    	applicationPolicyEditView.model = applicationPolicyModel;
                    	applicationPolicyEditView.renderDeleteApplicationPolicy(
                            {"title": 'Delete Application Policy Set',
                            	selectedGridData: checkedRows,
                                callback: function () {
                                    var dataView =
                                        $('#' + ctwc.FIREWALL_APPLICATION_POLICY_GRID_ID).
                                        data("contrailGrid")._dataView;
                                    dataView.refreshData();
                                }
                            }
                        );
                    }
                }

            },
            {
                "type": "link",
                "title": ctwc.SEC_POL_SEC_GRP_TITLE_CREATE,
                "iconClass": "fa fa-plus",
                "onClick": function () {
                	applicationPolicyEditView.model = new ApplicationPolicyModel();
                	applicationPolicyEditView.renderAddEditApplicationPolicy({
                                              "title": 'Create Application Policy Set',
                                              'mode': 'add',
                                              'isGlobal': viewConfig.isGlobal,
                                              callback: function () {
                       $('#' + ctwc.FIREWALL_APPLICATION_POLICY_GRID_ID).data("contrailGrid")._dataView.refreshData();
                    }});
                }
            }

        ];
        return headerActionConfig;
    }
    function getApplicationPolicyDetailsTemplateConfig() {
        return {
            templateGenerator: 'RowSectionTemplateGenerator',
            templateGeneratorConfig: {
                rows: [
                       {
                        templateGenerator: 'ColumnSectionTemplateGenerator',
                        templateGeneratorConfig: {
                            columns: [
                                {
                                    class: 'col-xs-12',
                                    rows: [
                                        {
                                            title: ctwl.CFG_VN_TITLE_DETAILS,
                                            templateGenerator: 'BlockListTemplateGenerator',
                                            templateGeneratorConfig: [
                                                {
                                                    label: 'Set Name',
                                                    key: 'name',
                                                    keyClass:'col-xs-3',
                                                    templateGenerator: 'TextGenerator'
                                                },
                                                {
                                                    label: 'Set Display Name',
                                                    key: 'display_name',
                                                    keyClass:'col-xs-3',
                                                    templateGenerator: 'TextGenerator'
                                                },
                                                {
                                                    label: 'UUID',
                                                    key: 'uuid',
                                                    keyClass:'col-xs-3',
                                                    templateGenerator: 'TextGenerator'
                                                },
                                                /*{
                                                    key: 'id_perms',
                                                    templateGenerator: 'TextGenerator',
                                                    label: 'Description',
                                                    keyClass:'col-xs-3',
                                                    templateGeneratorConfig: {
                                                        formatter: 'setDescriptionFormatter'
                                                    }
                                                },*/
                                                {
                                                    key: 'firewall_policy_refs',
                                                    templateGenerator: 'TextGenerator',
                                                    label: 'No. of Policies',
                                                    keyClass:'col-xs-3',
                                                    templateGeneratorConfig: {
                                                        formatter: 'setNoOfPoliciesFormatter'
                                                    }
                                                },
                                                {
                                                    key: 'id_perms',
                                                    templateGenerator: 'TextGenerator',
                                                    label: 'Last Updated',
                                                    keyClass:'col-xs-3',
                                                    templateGeneratorConfig: {
                                                        formatter: 'setLastUpdateFormatter'
                                                    }
                                                }
                                                
                                            ]
                                        }
                                    ]
                                }
                            ]
                        }
                    }
                ]
            }
        };
    };
    this.setDescriptionFormatter = function(value, dc) {
        return descriptionFormatter(null, null, null, value, dc, true);
    };
    this.setNoOfPoliciesFormatter = function(value, dc) {
        return noOfPoliciesFormatter(null, null, null, value, dc, true);
    };
    this.setLastUpdateFormatter = function(value, dc) {
        return lastUpdateFormatter(null, null, null, value, dc, true);
    };
    function descriptionFormatter(r, c, v, cd, dc, showAll){
    	var description = getValueByJsonPath(dc, 'id_perms;description','-');
        return  description;
    }
    function noOfPoliciesFormatter(r, c, v, cd, dc, showAll){
    	var policyRefs = getValueByJsonPath(dc, 'firewall_policy_refs',[]);
    	var noOfRefs = policyRefs.length
        return  noOfRefs;
    }
    function lastUpdateFormatter(r, c, v, cd, dc, showAll){
        var lastUpdated = getValueByJsonPath(dc, "id_perms;last_modified", '', false);
        if(lastUpdated) {
            lastUpdated = moment(lastUpdated, '').format('DD MMM YYYY');
        } else {
            lastUpdated = '-';
        }
        return lastUpdated;
    }
   return applicationPolicyGridView;
});
