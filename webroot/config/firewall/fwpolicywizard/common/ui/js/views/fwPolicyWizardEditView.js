/*
 * Copyright (c) 2017 Juniper Networks, Inc. All rights reserved.
 */

define([
    'underscore',
    'contrail-view',
    'knockback'
], function (_, ContrailView, Knockback) {
    var gridElId = '#' + ctwc.APPLICATION_POLICY_SET_GRID_ID,
        prefixId = ctwc.APPLICATION_POLICY_SET_PREFIX_ID,
        modalId = 'configure-' + prefixId,
        formId = '#' + modalId + '-form';
    var fwPolicyWizardEditView = ContrailView.extend({
        renderFwWizard: function(options) {
            var editTemplate = contrail.getTemplate4Id(ctwl.TMPL_APPLICATION_POLICY_SET),
                editLayout = editTemplate({prefixId: prefixId, modalId: modalId}),
                self = this;
            cowu.createModal({'modalId': modalId, 'className': 'modal-1120',
                             'title': options['title'], 'body': editLayout});

            self.renderView4Config($("#" + modalId).find('#aps-button-container'),
                                   this.model,
                                   getApplicationPolicyViewConfig(), "",
                                   null, null, function() {
                    $("#" + modalId).find('.modal-footer').hide();
                    $("#review_address_groups").on('click', function() {
                        self.renderObject(options, 'address_groups');
                    });
                    $("#review_service_groups").on('click', function() {
                        self.renderObject(options, 'service_groups');
                    });
                    $("#review_visible_tag_for_project").on('click', function() {
                        self.renderObject(options, 'tag');
                    });
                    $("#aps-plus-icon").on('click', function(){
                        self.renderObject(options, 'addIcon');
                    })
                    $("#aps-back-button").on('click', function(){
                        $('#modal-landing-container').show();
                        $("#aps-gird-container").empty();
                        $('#aps-landing-container').hide();
                    });
            },null,false);
        },
        renderObject: function(options, objName){
            $('#modal-landing-container').hide();
            $('#aps-save-button').hide();
            $('#aps-landing-container').show();
            var placeHolder = $('#aps-gird-container');
            var viewConfig = options['viewConfig'];
            if(objName === 'address_groups'){
                this.renderView4Config(placeHolder, null, getAddressGroup(viewConfig));
            }else if(objName === 'service_groups'){
                this.renderView4Config(placeHolder, null, getServiceGroup(viewConfig));
            }else if(objName === 'tag'){
                this.renderView4Config(placeHolder, null, getTag(viewConfig));
            }else if(objName === 'addIcon'){
                $('#aps-overlay-container').hide();
                $('#aps-main-container').css('background', "white !important");
                this.renderView4Config($('#aps-main-container'), this.model, getAddPolicyViewConfig(viewConfig));
            }
         }
    });
    var createPolicyViewConfig = [{
        elementId: cowu.formatElementId([prefixId, ctwl.TITLE_DETAILS]),
        title: ctwl.TITLE_POLICY_INFO,
        view: "SectionView",
        viewConfig: {
            rows: [
                {
                    columns: [
                        {
                            elementId: "policy-name",
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
                                  elementId: "policy-description",
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
    },
    {
        elementId: "security_permissions",
        view: 'SectionView',
        title:"Permissions",
        viewConfig: {
            rows: [
                {
                    columns: [
                        {
                            elementId: 'owner_access_security',
                            view: 'FormMultiselectView',
                            viewConfig: {
                                label: "Owner Permissions",
                                path: 'perms2.owner_access',
                                dataBindValue: 'perms2().owner_access',
                                class: 'col-xs-6',
                                elementConfig: {
                                    dataTextField: "text",
                                    dataValueField: "value",
                                    placeholder:
                                        "Select Permissions",
                                    data: cowc.RBAC_ACCESS_TYPE_LIST
                                }
                            }
                        }
                    ]
                },
                {
                    columns: [
                        {
                            elementId: 'global_access_secuirty',
                            view: 'FormMultiselectView',
                            viewConfig: {
                                label: "Global Share Permissions",
                                path: 'perms2.global_access',
                                dataBindValue: 'perms2().global_access',
                                class: 'col-xs-6',
                                elementConfig: {
                                    dataTextField: "text",
                                    dataValueField: "value",
                                    placeholder:
                                        "Select Permissions",
                                    data: cowc.RBAC_ACCESS_TYPE_LIST
                                }
                            }
                        }
                    ]
                },
                {
                    columns:[{
                        elementId: "security_share_accordion_create",
                        view: "AccordianView",
                        viewConfig:[{
                           elementId: "security_share_accordion_create",
                           view:  "SectionView",
                           title: "Share List",
                           viewConfig:{
                               rows: [{
                                   columns:
                                      shareViewConfig()
                                }]
                            }
                        }]
                    }]
                 }

            ]
        }
    }];
    function shareViewConfig() {
        return  [{
            elementId: 'share_list',
            view: "FormEditableGridView",
            viewConfig: {
                path : 'share_list',
                class: 'col-xs-12',
                validation:
               'rbacPermsShareValidations',
               templateId: cowc.TMP_EDITABLE_GRID_ACTION_VIEW,
                collection:
                    'share_list',
                columns: [
                    {
                        elementId: "tenant",
                        name: "Project",
                        view: 'FormComboboxView',
                        viewConfig: {
                            path : "tenant",
                            width: 250,
                            dataBindValue : "tenant()",
                            templateId:
                                cowc.TMPL_EDITABLE_GRID_COMBOBOX_VIEW,
                            elementConfig: {
                                dataTextField: "text",
                                dataValueField: "value",
                                placeholder: "Enter or Select Project",
                                dataSource: {
                                    type: "remote",
                                    url:
                                     "/api/tenants/config/all-projects/",
                                    requestType: "GET",
                                    parse: function(result){
                                        var dataSource = [],
                                           projects =
                                           getValueByJsonPath(result,
                                               "projects", []);
                                        _.each(projects, function(project){
                                            var projName =
                                                getValueByJsonPath(project,
                                                "fq_name;1", "", false),
                                                projId =
                                                getValueByJsonPath(project,
                                                "uuid", "", false  );
                                            if(projId && projName &&
                                                projName !==
                                                    "default-project") {
                                                dataSource.push({
                                                    text: projName + " (" + projId + ")",
                                                    value: projId
                                                });
                                            }
                                        });
                                        return dataSource
                                    }
                                }
                            }
                       }
                    },
                    {
                        elementId: "tenant_access",
                        name: 'Permissions',
                        view: "FormMultiselectView",
                        viewConfig: {
                            templateId: cowc.
                                TMPL_EDITABLE_GRID_MULTISELECT_VIEW,
                            width: 250,
                            path: "tenant_access",
                            dataBindValue: "tenant_access()",
                            elementConfig:{
                                dataTextField: "text",
                                dataValueField: "value",
                                placeholder: "Select Permissions",
                                data: cowc.RBAC_ACCESS_TYPE_LIST
                            }
                        }
                    }
                 ],
                rowActions: [
                    {onClick: "function() {" +
                        "$root.addShareByIndex($data, this);" +
                        "}",
                     iconClass: 'fa fa-plus'},
                    {onClick: "function() {" +
                        "$root.deleteShare($data, this);" +
                       "}",
                     iconClass: 'fa fa-minus'}
                ],
                gridActions: [
                    {onClick: "function() {" +
                        "addShare();" +
                        "}",
                     buttonTitle: ""}
                ]
            }
        }];
    }
    function getNewFirewallPolicyViewConfig() {
        var gridPrefix = "add-firewall-policy",
            addNewFwPolicyViewConfig = {
            elementId:  cowu.formatElementId([prefixId, "add-new-firewall-policy"]),
            view: "WizardView",
            viewConfig: {
                steps: [
                    {
                        elementId:  cowu.formatElementId([prefixId, "add-new-firewall-policy"]),
                        title: "Name Policy",
                        view: "AccordianView",
                        viewConfig: createPolicyViewConfig,
                        stepType: "step",
                        onInitRender: true,
                        buttons: {
                            previous: {
                                visible: true
                            }
                        },
                        onNext: function(params) {
                            return true;
                        }
                    }
                ]
            }
        };
        return addNewFwPolicyViewConfig;
    }
    function getAddRulesViewConfig() {
        var gridPrefix = "add-rules",
        addRulesViewConfig = {
            elementId:  cowu.formatElementId([prefixId, ctwl.TITLE_CREATE_FW_RULES]),
            view: "WizardView",
            viewConfig: {
                steps: [
                    {
                        elementId:  cowu.formatElementId([prefixId, ctwl.TITLE_CREATE_FW_RULES]),
                        title: "Create Rules",
                        view: "SectionView",
                        viewConfig: {},
                        stepType: "step",
                        onInitRender: true,
                        buttons: {
                            previous: {
                                visible: true
                            }
                        },
                        onNext: function(params) {
                            return true;
                        }
                    }
                ]
            }
        };
        return addRulesViewConfig;
    }
    function getAddPolicyViewConfig(viewConfig) {
        var addPolicyViewConfig = {
            elementId: cowu.formatElementId([prefixId, 'policy_wizard']),
            view: "WizardView",
            viewConfig: {
                steps: []
            }
        }
    steps = [];
    createStepViewConfig = null;
    addnewFwPolicyStepViewConfig = null;
    addRulesStepViewConfig = null;
    createStepViewConfig = {
            elementId: cowu.formatElementId([ctwc.NEW_APPLICATION_POLICY_SET_SECTION_ID]),
            view: "SectionView",
            viewConfig: {
                rows: [
                    {
                        columns: [
                            {
                                elementId:
                                    cowu.formatElementId([ctwc.NEW_APPLICATION_POLICY_SET_LIST_VIEW_ID]),
                                view: "fwPolicyWizardListView",
                                app: cowc.APP_CONTRAIL_CONTROLLER,
                                viewPathPrefix: "config/firewall/fwpolicywizard/project/ui/js/views/",
                                viewConfig: $.extend(true, {}, viewConfig,
                                                     {projectSelectedValueData: viewConfig.projectSelectedValueData})
                            }
                        ]
                    }
                ]
            },
            title: "Select set",
            stepType: "step",
            onInitRender: true,
            onNext: function (options) {
                return true;
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
    steps = steps.concat(createStepViewConfig);
    addnewFwPolicyStepViewConfig = $.extend(true, {}, getNewFirewallPolicyViewConfig().viewConfig).steps;
    addRulesStepViewConfig = $.extend(true, {}, getAddRulesViewConfig().viewConfig).steps;
    steps = steps.concat(addnewFwPolicyStepViewConfig);
    steps = steps.concat(addRulesStepViewConfig);
    addPolicyViewConfig.viewConfig.steps = steps;
    return addPolicyViewConfig;
  }
    function getAddressGroup(viewConfig){
        return {
            elementId:
                cowu.formatElementId([ctwc.SECURITY_POLICY_TAG_LIST_VIEW_ID]),
            view: "addressGroupProjectListView",
            app: cowc.APP_CONTRAIL_CONTROLLER,
            viewPathPrefix: "config/firewall/project/addressgroup/ui/js/views/",
            viewConfig: $.extend(true, {}, viewConfig,
                                 {projectSelectedValueData: viewConfig.projectSelectedValueData})
        }
    }
    function getServiceGroup(viewConfig){
        return {
            elementId:
                cowu.formatElementId([ctwc.SECURITY_POLICY_TAG_LIST_VIEW_ID]),
            view: "serviceGroupProjectListView",
            app: cowc.APP_CONTRAIL_CONTROLLER,
            viewPathPrefix: "config/firewall/project/servicegroup/ui/js/views/",
            viewConfig: $.extend(true, {}, viewConfig,
                                 {projectSelectedValueData: viewConfig.projectSelectedValueData})
        }
    }
    function getTag(viewConfig){
        return {
            elementId:
                cowu.formatElementId([ctwc.SECURITY_POLICY_TAG_LIST_VIEW_ID]),
            view: "tagProjectListView",
            app: cowc.APP_CONTRAIL_CONTROLLER,
            viewPathPrefix: "config/firewall/project/tag/ui/js/views/",
            viewConfig: $.extend(true, {}, viewConfig,
                                 {projectSelectedValueData: viewConfig.projectSelectedValueData})
        }
    }
    var getApplicationPolicyViewConfig = function () {
        return {
            elementId: ctwc.APPLICATION_POLICY_SET_PREFIX_ID,
            view: 'SectionView',
            title: "Application Policy Set",
           // active:false,
            viewConfig: {
                rows: [{
                        columns: [
                            {
                                elementId: 'review_address_groups',
                                view: "FormButtonView",
                                label: "Review Address Groups",
                                width:300,
                                viewConfig: {
                                    class: 'display-inline-block'
                                }
                            }
                         ]
                      },
                      {
                          columns: [
                              {
                                  elementId: 'review_service_groups',
                                  view: "FormButtonView",
                                  label: "Review Service Groups",
                                  width:300,
                                  viewConfig: {
                                      class: 'display-inline-block'
                                  }
                              }
                           ]
                        },{
                            columns: [
                                {
                                    elementId: 'review_visible_tag_for_project',
                                    view: "FormButtonView",
                                    label: "Review Visible Tag For Project",
                                    width:300,
                                    viewConfig: {
                                        class: 'display-inline-block'
                                    }
                                }
                             ]
                          }
                    ]
               }
          }
     };

    return fwPolicyWizardEditView;
});