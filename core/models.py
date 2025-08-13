from django.db import models
from django.contrib.auth.models import User
from django.conf import settings
from django.utils import timezone
from django.db.models import Q

# Predefined Sustainable Development Goals
SDG_GOALS = [
    "No Poverty",
    "Zero Hunger",
    "Good Health and Well-Being",
    "Quality Education",
    "Gender Equality",
    "Clean Water and Sanitation",
    "Affordable and Clean Energy",
    "Decent Work and Economic Growth",
    "Industry, Innovation and Infrastructure",
    "Reduced Inequalities",
    "Sustainable Cities and Communities",
    "Responsible Consumption and Production",
    "Climate Action",
    "Life Below Water",
    "Life on Land",
    "Peace, Justice and Strong Institutions",
    "Partnerships for the Goals",
]
# ───────────────────────────────
#  New Generic Organization Models
# ───────────────────────────────

class OrganizationType(models.Model):
    name = models.CharField(max_length=100, unique=True)
    is_active = models.BooleanField(default=True)
    can_have_parent = models.BooleanField(default=False)
    parent_type = models.ForeignKey('self', null=True, blank=True, on_delete=models.SET_NULL, related_name='child_types')
    def __str__(self):
        return self.name

class Organization(models.Model):
    """
    Represents a single organization entry (e.g., Commerce Dept, Chess Club, Infotech Society)
    """
    name = models.CharField(max_length=100)
    org_type = models.ForeignKey(OrganizationType, on_delete=models.CASCADE, related_name="organizations")
    is_active = models.BooleanField(default=True)
    parent = models.ForeignKey(
        'self', null=True, blank=True, on_delete=models.CASCADE, related_name='children'
    )
    code = models.CharField(max_length=64, unique=True, null=True, blank=True)
    meta = models.JSONField(default=dict, blank=True)

    class Meta:
        unique_together = ("name", "org_type")
        ordering = ["org_type__name", "name"]

    def __str__(self):
        return f"{self.name} ({self.org_type.name})"

class OrganizationRole(models.Model):
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE)
    name = models.CharField(max_length=100)
    is_active = models.BooleanField(default=True)
    description = models.TextField(blank=True, null=True)  # <-- Add this line

    class Meta:
        unique_together = ("organization", "name")
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} ({self.organization.name})"

# ───────────────────────────────
#  User Role Assignment (now generic)
# ───────────────────────────────

class RoleAssignment(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='role_assignments')
    role = models.ForeignKey('OrganizationRole', on_delete=models.CASCADE, null=True)
    organization = models.ForeignKey(Organization, null=True, blank=True, on_delete=models.SET_NULL, related_name='role_assignments')
    academic_year = models.CharField(max_length=9, null=True, blank=True, db_index=True)
    class_name = models.CharField(max_length=64, null=True, blank=True, db_index=True)

    class Meta:
        unique_together = ("user", "role", "organization")
        constraints = [
            models.UniqueConstraint(
                fields=["user", "role"],
                condition=Q(organization__isnull=True),
                name="unique_user_role_global",
            )
        ]
        indexes = [
            models.Index(
                fields=["organization", "academic_year", "class_name"],
                name="core_ra_org_year_class_idx",
            )
        ]

    def __str__(self):
        parts = [self.role.name]  # Use the OrganizationRole name
        if self.organization:
                parts.append(f"of {self.organization}")
        return f"{self.user.username} – {' '.join(parts)}"

    def get_contribution_percentage(self):
        """Calculate user's contribution percentage in this organization"""
        from django.db.models import Q
        from emt.models import EventProposal
        
        # Get total events in organization
        total_events = EventProposal.objects.filter(
            organization=self.organization
        ).count()
        
        if total_events == 0:
            return 0
            
        # Get user's events - count events where user is:
        # 1. The proposer (submitted_by)
        # 2. A faculty in-charge
        # 3. A participant (through Student profile)
        user_events_query = Q(organization=self.organization) & (
            Q(submitted_by=self.user) |  # User is the proposer
            Q(faculty_incharges=self.user) |  # User is faculty in-charge
            Q(participants__user=self.user)  # User is a participant through Student profile
        )
        
        user_events = EventProposal.objects.filter(user_events_query).distinct().count()
        
        return round((user_events / total_events) * 100, 1)


class OrganizationMembership(models.Model):
    ROLE_CHOICES = (("student", "Student"), ("faculty", "Faculty"), ("tutor", "Tutor"))

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="org_memberships")
    organization = models.ForeignKey(
        Organization, on_delete=models.CASCADE, related_name="memberships"
    )
    academic_year = models.CharField(max_length=9)  # e.g., "2025-2026"
    role = models.CharField(max_length=32, choices=ROLE_CHOICES, default="student")
    is_primary = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "organization", "academic_year")
        indexes = [models.Index(fields=["organization", "academic_year", "role"])]

# ───────────────────────────────
#  User Profile (unchanged)
# ───────────────────────────────

class Profile(models.Model):
    ROLE_CHOICES = [
        ("student", "Student"),
        ("faculty", "Faculty"),
        ("hod", "HOD"),
        ("admin", "Admin"),
        ("club_convenor", "Club Convenor"),
        ("event_coordinator", "Event Coordinator"),
        ("committee_member", "Committee Member"),
        ("iqac_member", "IQAC Member"),
    ]
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    register_no = models.CharField(max_length=64, blank=True, null=True, db_index=True)
    role = models.CharField(max_length=32, choices=ROLE_CHOICES, default="student")
    activated_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.user.username} ({self.role})"

# ───────────────────────────────
#  Reports
# ───────────────────────────────

class Report(models.Model):
    REPORT_TYPE_CHOICES = [
        ("annual", "Annual"),
        ("event", "Event"),
        ("iqac", "IQAC"),
        ("custom", "Custom"),
    ]
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    organization = models.ForeignKey(
        Organization, on_delete=models.SET_NULL, null=True, blank=True
    )
    submitted_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="submitted_reports",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    report_type = models.CharField(max_length=30, choices=REPORT_TYPE_CHOICES)
    file = models.FileField(upload_to="reports/", blank=True, null=True)

    STATUS_CHOICES = [
        ("draft", "Draft"),
        ("submitted", "Submitted"),
        ("approved", "Approved"),
        ("rejected", "Rejected"),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="draft")
    feedback = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"{self.title} – {self.get_report_type_display()} ({self.get_status_display()})"

# ───────────────────────────────
#  Programs & Outcomes
# ───────────────────────────────

class Program(models.Model):
    name = models.CharField(max_length=150, unique=True)
    organization = models.ForeignKey(Organization, on_delete=models.SET_NULL, null=True, blank=True)
    def __str__(self):
        return self.name

class ProgramOutcome(models.Model):
    program = models.ForeignKey(Program, on_delete=models.CASCADE, related_name="pos")
    description = models.TextField()
    def __str__(self):
        return f"PO - {self.program.name}"

class ProgramSpecificOutcome(models.Model):
    program = models.ForeignKey(Program, on_delete=models.CASCADE, related_name="psos")
    description = models.TextField()
    def __str__(self):
        return f"PSO - {self.program.name}"

# ───────────────────────────────
#  PO/PSO Assignment Model
# ───────────────────────────────

class POPSOAssignment(models.Model):
    """
    Model to track which users are assigned to manage PO/PSO for specific organizations
    """
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name="popso_assignments")
    assigned_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="popso_assignments")
    assigned_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name="made_assignments")
    assigned_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        unique_together = ("organization", "assigned_user")
        ordering = ["-assigned_at"]
    
    def __str__(self):
        return f"{self.assigned_user.get_full_name()} assigned to {self.organization.name}"

# ───────────────────────────────
#  PO/PSO Change Notification Model
# ───────────────────────────────

class POPSOChangeNotification(models.Model):
    """
    Model to track notifications for PO/PSO changes made by assigned users
    """
    ACTION_CHOICES = [
        ('CREATE', 'Created'),
        ('UPDATE', 'Updated'), 
        ('DELETE', 'Deleted'),
    ]
    
    TYPE_CHOICES = [
        ('PO', 'Program Outcome'),
        ('PSO', 'Program Specific Outcome'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="popso_notifications_made")
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE)
    action = models.CharField(max_length=10, choices=ACTION_CHOICES)
    outcome_type = models.CharField(max_length=3, choices=TYPE_CHOICES)
    outcome_description = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)
    
    class Meta:
        ordering = ["-created_at"]
    
    def __str__(self):
        return f"{self.user.get_full_name()} {self.action.lower()}d {self.outcome_type} for {self.organization.name}"


class SDGGoal(models.Model):
    name = models.CharField(max_length=255, unique=True)

    def __str__(self):
        return self.name

# ───────────────────────────────
#  Approval Flow Templates & Config
# ───────────────────────────────

class ApprovalFlowTemplate(models.Model):
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name="approval_flow_templates")
    step_order = models.PositiveIntegerField()
    role_required = models.CharField(max_length=50)  # e.g., "faculty", "hod"
    user = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL)  # Optional: Fix to a specific user
    optional = models.BooleanField(default=False)

    class Meta:
        unique_together = ('organization', 'step_order')
        ordering = ['organization', 'step_order']

    def get_role_required_display(self):
        """Return a human friendly version of ``role_required``.

        If an :class:`OrganizationRole` exists for this template's organization
        with a name matching ``role_required`` (case-insensitive), use that
        name. Otherwise, return ``role_required`` converted to title case with
        underscores replaced by spaces.
        """

        role = OrganizationRole.objects.filter(
            organization=self.organization,
            name__iexact=self.role_required,
        ).first()
        if role:
            return role.name
        return self.role_required.replace("_", " ").title()

class ApprovalFlowConfig(models.Model):
    """
    Configuration flags for a department's approval flow, e.g. faculty-in-charge first.
    """
    organization = models.OneToOneField(
        Organization,
        on_delete=models.CASCADE,
        related_name="approval_flow_config",
    )
    require_faculty_incharge_first = models.BooleanField(default=False)

    def __str__(self):
        return f"Config for {self.organization.name}"

# ───────────────────────────────
#  Event Approval Box Visibility (Role & User)
# ───────────────────────────────

class RoleEventApprovalVisibility(models.Model):
    """
    Visibility preference for the dashboard event approvals box by role.
    """
    role = models.OneToOneField(
        OrganizationRole,
        on_delete=models.CASCADE,
        related_name="approval_visibility",
    )
    can_view = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.role} – {'Visible' if self.can_view else 'Hidden'}"

class UserEventApprovalVisibility(models.Model):
    """
    Per-user override for the approvals dashboard box.
    """
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="approval_box_overrides",
    )
    role = models.ForeignKey(OrganizationRole, on_delete=models.CASCADE)
    can_view = models.BooleanField(default=True)

    class Meta:
        unique_together = ("user", "role")

    def __str__(self):
        return (
            f"{self.user.username} – {self.role} – {'Visible' if self.can_view else 'Hidden'}"
        )

# ───────────────────────────────
#  Class & Student Models
# ───────────────────────────────

class Class(models.Model):
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=20)
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="classes",
        null=True,
        blank=True,
    )
    academic_year = models.CharField(max_length=9, null=True, blank=True)
    teacher = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='classes')
    students = models.ManyToManyField('emt.Student', blank=True, related_name='classes')
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.code} - {self.name}"
    
class PrivateCalendarEvent(models.Model):
    """Personal calendar events for faculty members"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='private_calendar_events')
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    event_date = models.DateField()
    event_time = models.TimeField(null=True, blank=True)
    is_all_day = models.BooleanField(default=False)
    location = models.CharField(max_length=200, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['event_date', 'event_time']
        
    def __str__(self):
        return f"{self.title} - {self.event_date}"

class AnnouncementEvent(models.Model):
    """Department-level announcement events for teachers"""
    EVENT_TYPES = [
        ('meeting', 'Faculty Meeting'),
        ('workshop', 'Workshop'),
        ('training', 'Training'),
        ('seminar', 'Seminar'),
        ('deadline', 'Deadline'),
        ('other', 'Other'),
    ]
    
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    event_date = models.DateField()
    event_time = models.TimeField(null=True, blank=True)
    is_all_day = models.BooleanField(default=False)
    location = models.CharField(max_length=200, blank=True)
    event_type = models.CharField(max_length=20, choices=EVENT_TYPES, default='other')
    
    # Organization and department targeting
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_announcements')
    
    # Notification settings
    notify_participants = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['event_date', 'event_time']
        
    def __str__(self):
        return f"{self.title} - {self.organization.name} - {self.event_date}"

class ImpersonationLog(models.Model):
    """Track user impersonation history"""
    original_user = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='impersonations_made'
    )
    impersonated_user = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='impersonations_received'
    )
    started_at = models.DateTimeField(auto_now_add=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(null=True, blank=True)
    
    class Meta:
        ordering = ['-started_at']
        
    def __str__(self):
        return f"{self.original_user} -> {self.impersonated_user} at {self.started_at}"

# Enhanced views with logging
def log_impersonation_start(request, target_user):
    """Log when impersonation starts"""
    ImpersonationLog.objects.create(
        original_user=request.user,
        impersonated_user=target_user,
        ip_address=request.META.get('REMOTE_ADDR'),
        user_agent=request.META.get('HTTP_USER_AGENT', '')
    )

def log_impersonation_end(request):
    """Log when impersonation ends"""
    if 'impersonate_user_id' in request.session:
        try:
            log_entry = ImpersonationLog.objects.filter(
                original_user_id=request.session.get('original_user_id'),
                impersonated_user_id=request.session['impersonate_user_id'],
                ended_at__isnull=True
            ).first()
            
            if log_entry:
                log_entry.ended_at = timezone.now()
                log_entry.save()
        except Exception:
            pass  # Handle gracefully