# core/urls.py

from django.urls import path
from django.views.generic import RedirectView

from . import views
from . import views_admin_org_users as orgu

urlpatterns = [
    # ────────────────────────────────────────────────
    # Authentication & Registration
    # ────────────────────────────────────────────────
    path("login/", views.login_view, name="login"),
    path("logout/", views.logout_view, name="logout"),
    path("accounts/logout/", views.custom_logout, name="account_logout"),
    path("register/", views.registration_form, name="registration_form"),
    # ────────────────────────────────────────────────
    # Main Dashboards & Profile
    # ────────────────────────────────────────────────
    path("", views.dashboard, name="dashboard"),
    path("dashboard/select/<str:dashboard_key>/", views.select_dashboard, name="select_dashboard"),
    path("my-profile/", views.my_profile, name="my_profile"),
    path("user-dashboard/", views.user_dashboard, name="user_dashboard"),
    # Redirect old notifications URL to the new CDL-specific notifications page
    path("notifications/", RedirectView.as_view(pattern_name="cdl_notifications", permanent=True)),
    path("cdl/notifications/", views.cdl_notifications_page, name="cdl_notifications"),
    path("event/<int:proposal_id>/details/", views.student_event_details, name="student_event_details"),
    # ────────────────────────────────────────────────
    # CDL (Creative & Design Lab) Dashboards & Workflows
    # ────────────────────────────────────────────────
    path("cdl/", views.cdl_event_user_view, name="cdl_dashboard"),
    path("cdl/user-view/", views.cdl_event_user_view, name="cdl_event_user_view"),
    path("cdl/head/", views.cdl_head_dashboard, name="cdl_head_dashboard"),
    path("cdl/work/", views.cdl_work_dashboard, name="cdl_work_dashboard"),
    path("cdl/member/", views.cdl_member_dashboard, name="cdl_member_dashboard"),
    path("cdl/support/", views.cdl_support_detail_page, name="cdl_support_detail_page"),
    path("cdl/communication/", views.cdl_communication_page, name="cdl_communication_page"),
    path("cdl/review/", views.faculty_review_page, name="faculty_review_page"),
    path("cdl/support/<int:proposal_id>/assign/", views.cdl_assign_tasks_page, name="cdl_assign_tasks_page"),
    path("cdl/analysis/", views.cdl_analysis_page, name="cdl_analysis_page"),
    path("cdl/availability/new/", views.cdl_create_availability, name="create_availability"),
    path("cdl/resources/brand-kit/", views.cdl_brand_kit, name="brand_kit"),
    path("cdl/resources/templates/posters/", views.cdl_templates_posters, name="templates_posters"),
    path("cdl/resources/templates/certificates/", views.cdl_templates_certificates, name="templates_certificates"),
    path("cdl/resources/media-guide/", views.cdl_media_guide, name="media_guide"),
    path("proposal/<int:proposal_id>/cdl/", views.submit_proposal_cdl, name="submit_proposal_cdl"),
    path("proposal/<int:proposal_id>/cdl/thread/", views.cdl_thread, name="cdl_thread"),
    path("proposal/<int:proposal_id>/proofread/", views.proofread_thread, name="proofread_thread"),
    # ────────────────────────────────────────────────
    # General Event Proposal Views
    # ────────────────────────────────────────────────
    path("propose-event/", views.propose_event, name="propose_event"),
    path("proposal-status/<int:pk>/", views.proposal_status, name="proposal_status"),
    path("proposal/<int:proposal_id>/detail/", views.proposal_detail, name="proposal_detail"),
    # ────────────────────────────────────────────────
    # Admin - Main Dashboards & Settings
    # ────────────────────────────────────────────────
    path("core-admin/dashboard/", views.admin_dashboard, name="admin_dashboard"),
    path("core-admin/settings/", views.admin_settings_dashboard, name="admin_settings"),
    path("core-admin/master-data-dashboard/", views.master_data_dashboard, name="master_data_dashboard"),
    path("core-admin/master-data/", views.admin_master_data, name="admin_master_data"),
    path("core-admin/settings/<str:model_name>/add/", views.admin_master_data_add, name="admin_settings_add"),
    path("core-admin/settings/<str:model_name>/<int:pk>/edit/", views.admin_master_data_edit, name="admin_settings_edit"),
    path("core-admin/settings/<str:model_name>/<int:pk>/delete/", views.admin_master_data_delete, name="admin_settings_delete"),
    path("core-admin/academic-years/", views.admin_academic_year_settings, name="admin_academic_year_settings"),
    path("core-admin/academic-years/<int:pk>/archive/", views.academic_year_archive, name="academic_year_archive"),
    path("core-admin/academic-years/<int:pk>/restore/", views.academic_year_restore, name="academic_year_restore"),
    # ────────────────────────────────────────────────
    # Admin - User & Role Management
    # ────────────────────────────────────────────────
    path("core-admin/user-management/", views.admin_user_panel, name="admin_user_panel"),
    path("core-admin/users/", views.admin_user_management, name="admin_user_management"),
    path("core-admin/users/<int:user_id>/edit/", views.admin_user_edit, name="admin_user_edit"),
    path("core-admin/users/<int:user_id>/deactivate/", views.admin_user_deactivate, name="admin_user_deactivate"),
    path("core-admin/users/<int:user_id>/activate/", views.admin_user_activate, name="admin_user_activate"),
    path("core-admin/impersonate/<int:user_id>/", views.admin_impersonate_user, name="admin_impersonate_user"),
    path("core-admin/stop-impersonation/", views.stop_impersonation, name="stop_impersonation"),
    path("core-admin/user-roles/", views.admin_role_management, name="admin_role_management"),
    path("core-admin/user-roles/<int:organization_id>/", views.admin_role_management, name="admin_role_management_org"),
    path("core-admin/user-roles/<int:organization_id>/add/", views.add_org_role, name="add_org_role"),
    path("core-admin/user-roles/add/", views.add_role, name="add_role"),
    path("core-admin/user-roles/role/<int:role_id>/update/", views.update_org_role, name="update_org_role"),
    path("core-admin/user-roles/role/<int:role_id>/toggle/", views.toggle_org_role, name="toggle_org_role"),
    path("core-admin/user-roles/role/<int:role_id>/delete/", views.delete_org_role, name="delete_org_role"),
    path("core-admin/user-roles/role/<int:role_id>/restore/", views.restore_org_role, name="restore_org_role"),
    # ────────────────────────────────────────────────
    # Admin - Event, Report & History Management
    # ────────────────────────────────────────────────
    path("core-admin/event-proposals/", views.admin_event_proposals, name="admin_event_proposals"),
    path("core-admin/event-proposal/<int:proposal_id>/json/", views.event_proposal_json, name="event_proposal_json"),
    path("core-admin/event-proposal/<int:proposal_id>/action/", views.event_proposal_action, name="event_proposal_action"),
    path("core-admin/proposal/<int:proposal_id>/detail/", views.admin_proposal_detail, name="admin_proposal_detail"),
    path("core-admin/reports/", views.admin_reports_view, name="admin_reports"),
    path("core-admin/api/reports/", views.admin_reports_api, name="admin_reports_api"),
    path("core-admin/reports/<int:report_id>/approve/", views.admin_reports_approve, name="admin_reports_approve"),
    path("core-admin/reports/<int:report_id>/reject/", views.admin_reports_reject, name="admin_reports_reject"),
    path("core-admin/history/", views.admin_history, name="admin_history"),
    path("core-admin/history/<int:pk>/", views.admin_history_detail, name="admin_history_detail"),
    # ────────────────────────────────────────────────
    # Admin - Approval & Outcome Management
    # ────────────────────────────────────────────────
    path("core-admin/approval/", views.admin_approval_dashboard, name="admin_approval_dashboard"),
    path("core-admin/approval-flow/", views.admin_approval_flow, name="admin_approval_flow"),
    path("core-admin/approval-flow/<int:org_id>/", views.admin_approval_flow_manage, name="admin_approval_flow_manage"),
    path("core-admin/approval-flow/<int:org_id>/get/", views.get_approval_flow, name="get_approval_flow"),
    path("core-admin/approval-flow/<int:org_id>/save/", views.save_approval_flow, name="save_approval_flow"),
    path("core-admin/approval-flow/<int:org_id>/delete/", views.delete_approval_flow, name="delete_approval_flow"),
    path("core-admin/pso-po/", views.admin_pso_po_management, name="admin_pso_po_management"),
    path("core-admin/pso-po/org/<int:org_id>/", views.admin_outcomes_for_org, name="admin_outcomes_for_org"),
    path("core-admin/pso-po/data/<str:org_type>/<int:org_id>/", views.get_pso_po_data, name="get_pso_po_data"),
    path("core-admin/pso-po/add/<str:outcome_type>/", views.add_outcome, name="add_outcome"),
    path("core-admin/pso-po/delete/<str:outcome_type>/<int:outcome_id>/", views.delete_outcome, name="delete_outcome"),
    # ────────────────────────────────────────────────
    # Admin - Organization User Management (Newer Views)
    # ────────────────────────────────────────────────
    path("core-admin/org-users/", orgu.entrypoint, name="admin_org_users_entry"),
    path("core-admin/org-users/<int:org_id>/", orgu.select_role, name="admin_org_users_select_role"),
    path("core-admin/org-users/<int:org_id>/students/", orgu.student_flow, name="admin_org_users_students"),
    path("core-admin/org-users/<int:org_id>/faculty/", orgu.faculty_flow, name="admin_org_users_faculty"),
    path("core-admin/org-users/<int:org_id>/faculty/<int:member_id>/", orgu.faculty_detail, name="admin_org_users_faculty_detail"),
    path("core-admin/org-users/<int:org_id>/faculty/<int:member_id>/toggle/", orgu.faculty_toggle_active, name="admin_org_users_faculty_toggle"),
    path("core-admin/org-users/<int:org_id>/create-class/", orgu.create_class, name="admin_org_create_class"),
    path("core-admin/org-users/<int:org_id>/upload-csv/", orgu.upload_csv, name="admin_org_users_upload_csv"),
    path("core-admin/org-users/<int:org_id>/class/<int:class_id>/", orgu.class_detail, name="admin_org_users_class_detail"),
    path("core-admin/org-users/<int:org_id>/class/<int:class_id>/remove/<int:student_id>/", orgu.class_remove_student, name="admin_org_users_class_remove_student"),
    path("core-admin/org-users/<int:org_id>/class/<int:class_id>/toggle/", orgu.class_toggle_active, name="admin_org_users_class_toggle"),
    path("core-admin/org-users/<int:org_id>/csv-template/", orgu.csv_template, name="admin_org_users_csv_template"),
    path("core-admin/org-users/fetch/children/<int:org_id>/", orgu.fetch_children, name="admin_org_fetch_children"),
    path("core-admin/org-users/fetch/by-type/<int:type_id>/", orgu.fetch_by_type, name="admin_org_fetch_by_type"),
    path("core-admin/org-users/<int:org_id>/classes/", views.class_rosters, name="class_rosters"),
    path("core-admin/org-users/<int:org_id>/classes/<str:class_name>/", views.class_roster_detail, name="class_roster_detail"),
    # ────────────────────────────────────────────────
    # Admin - Permissions
    # ────────────────────────────────────────────────
    path("core-admin/sidebar-permissions/", views.admin_sidebar_permissions, name="admin_sidebar_permissions"),
    path("core-admin/enhanced-permissions/", views.enhanced_permissions_management, name="enhanced_permissions_management"),
    path("core-admin/api/dashboard-assignments/", views.api_get_dashboard_assignments, name="api_get_dashboard_assignments"),
    path("core-admin/api/sidebar-permissions/", views.api_get_sidebar_permissions, name="api_get_sidebar_permissions"),
    path("core-admin/api/save-dashboard-assignments/", views.api_save_dashboard_assignments, name="api_save_dashboard_assignments"),
    path("core-admin/api/save-sidebar-permissions/", views.api_save_sidebar_permissions, name="api_save_sidebar_permissions"),
    path("core-admin/api/my-sidebar/", views.api_my_sidebar, name="api_my_sidebar"),
    # ────────────────────────────────────────────────
    # Admin - Data Export
    # ────────────────────────────────────────────────
    path("data-export-filter/", views.data_export_filter_view, name="data_export_filter"),
    path("api/search/", views.api_search, name="api_search"),
    path("api/export/csv/", views.api_export_csv, name="api_export_csv"),
    path("api/export/excel/", views.api_export_excel, name="api_export_excel"),
    path("api/summary/quick/", views.api_quick_summary, name="api_quick_summary"),
    path("api/org-types/", views.api_org_types, name="api_org_types"),
    path("api/orgs/", views.api_orgs_by_type, name="api_orgs_by_type"),
    path("api/filter-meta/<str:category>/", views.api_filter_meta, name="api_filter_meta"),
    # ────────────────────────────────────────────────
    # API Endpoints
    # ────────────────────────────────────────────────
    # --- General APIs ---
    path("api/organizations/", views.api_organizations, name="api_organizations"),
    path("api/roles/", views.api_roles, name="api_roles"),
    path("api/auth/me", views.api_auth_me, name="frontend_api_auth_me"),
    path("api/student/achievements/", views.api_student_achievements, name="api_student_achievements"),
    path(
        "api/student/achievements/<int:achievement_id>/",
        views.api_student_achievement_detail,
        name="api_student_achievement_detail",
    ),
    path(
        "api/student/update-personal-info/",
        views.api_update_student_personal,
        name="api_update_student_personal",
    ),
    path(
        "api/student/update-academic-info/",
        views.api_update_student_academic,
        name="api_update_student_academic",
    ),
    path(
        "api/student/organization-types/",
        views.api_student_organization_types,
        name="api_student_organization_types",
    ),
    path(
        "api/student/organizations/",
        views.api_student_organizations,
        name="api_student_organizations",
    ),
    path(
        "api/student/join-organization/",
        views.api_student_join_organization,
        name="api_student_join_organization",
    ),
    path(
        "api/student/leave-organization/<int:org_id>/",
        views.api_student_leave_organization,
        name="api_student_leave_organization",
    ),
    # --- Dashboard data APIs (used by dashboards JS) ---
    path("api/student/performance-data/", views.api_student_performance_data, name="api_student_performance_data"),
    path("api/user/events-data/", views.api_user_events_data, name="api_user_events_data"),
    path("api/student/contributions/", views.api_student_contributions, name="api_student_contributions"),
    path("api/user/proposals/", views.api_user_proposals, name="api_user_proposals"),
    path("api/cdl/head-dashboard/", views.api_cdl_head_dashboard, name="api_cdl_head_dashboard"),
    path("api/cdl/member/work/", views.api_cdl_member_work, name="api_cdl_member_work"),
    path("api/cdl/members/", views.api_cdl_members, name="api_cdl_members"),
    path("api/cdl/users/", views.api_cdl_users, name="api_cdl_users"),
    path("api/cdl/member/data/", views.api_cdl_member_data, name="api_cdl_member_data"),
    path("api/cdl/member/accept/", views.api_cdl_member_accept, name="api_cdl_member_accept"),
    # Unified CDL Event APIs for user view
    path("api/cdl/event/<int:proposal_id>/details/", views.api_cdl_event_details, name="api_cdl_event_details"),
    path("api/cdl/event/<int:proposal_id>/content/", views.api_cdl_event_content, name="api_cdl_event_content"),
    path("api/cdl/event/<int:proposal_id>/assignments/", views.api_cdl_event_assignments, name="api_cdl_event_assignments"),
    path("api/cdl/event/<int:proposal_id>/process/", views.api_cdl_event_process, name="api_cdl_event_process"),
    path("api/cdl/event/<int:proposal_id>/documents/", views.api_cdl_event_documents, name="api_cdl_event_documents"),
    path("api/cdl/events/my-support/", views.api_cdl_events_my_support, name="api_cdl_events_my_support"),
    path("api/cdl/support/<int:proposal_id>/", views.api_cdl_support_detail, name="api_cdl_support_detail"),
    path("api/cdl/communication/", views.api_cdl_communication, name="api_cdl_communication"),
    path("api/cdl/support/<int:proposal_id>/assign/", views.api_cdl_support_assign, name="api_cdl_support_assign"),
    path("api/cdl/support/<int:proposal_id>/complete/", views.api_cdl_support_complete, name="api_cdl_support_complete"),
    # Proof-reading APIs
    path("api/cdl/proofread/submit/", views.api_proofread_submit, name="api_proofread_submit"),
    path("api/cdl/proofread/list/", views.api_proofread_list, name="api_proofread_list"),
    path("api/cdl/proofread/review/", views.api_proofread_review, name="api_proofread_review"),
    path("api/cdl/proofread/reviewers/", views.api_proofread_reviewers, name="api_proofread_reviewers"),
    # Per-resource assignment APIs
    path("api/cdl/support/<int:proposal_id>/resources/", views.api_cdl_support_resources, name="api_cdl_support_resources"),
    path("api/cdl/support/<int:proposal_id>/task-assignments/", views.api_cdl_save_task_assignments, name="api_cdl_save_task_assignments"),
    path("api/cdl/support/<int:proposal_id>/tasks/", views.api_cdl_tasks_crud, name="api_cdl_tasks_crud"),
    # Analysis
    path("api/cdl/analysis/", views.api_cdl_analysis, name="api_cdl_analysis"),
    # --- Calendar (Unified) ---
    path("api/calendar/", views.api_calendar_events, name="api_calendar_events"),
    path("api/calendar/faculty/create/", views.api_create_faculty_meeting, name="api_create_faculty_meeting"),
    # --- Admin APIs ---
    path("admin-dashboard-api/", views.admin_dashboard_api, name="admin_dashboard_api"),
    path("core-admin/api/search-users/", views.api_admin_search_users, name="api_admin_search_users"),
    path("core-admin/api/search/", views.api_global_search, name="api_global_search"),
    path("core-admin/api/org-type/<int:org_type_id>/organizations/", views.api_org_type_organizations, name="api_org_type_organizations"),
    path("core-admin/api/org-type/<int:org_type_id>/roles/", views.api_org_type_roles, name="api_org_type_roles"),
    path("core-admin/api/organization/<int:org_id>/roles/", views.api_organization_roles, name="api_organization_roles"),
    path("core-admin/api/filter/organizations/", views.api_filter_organizations, name="api_filter_organizations"),
    path("core-admin/api/filter/roles/", views.api_filter_roles, name="api_filter_roles"),
    path("core-admin/api/search/org-types/", views.api_search_org_types, name="api_search_org_types"),
    path("core-admin/api/org-users/<int:org_id>/", views.organization_users, name="organization_users"),
    # --- PSO/PO APIs ---
    path("core/api/programs/<int:org_id>/", views.api_organization_programs, name="api_organization_programs"),
    path("core/api/create-program/", views.create_program_for_organization, name="create_program_for_organization"),
    path("core/api/program-outcomes/<int:program_id>/", views.api_program_outcomes, name="api_program_outcomes"),
    path("core/api/manage-program-outcomes/", views.manage_program_outcomes, name="manage_program_outcomes"),
]
