from django.test import TestCase, Client
from django.urls import reverse
from django.contrib.auth import get_user_model
from .models import Report, EventProposal, Organization

class AdminViewReportTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.admin_user = get_user_model().objects.create_superuser(
            username='admin',
            email='admin@example.com',
            password='adminpass123'
        )
        self.regular_user = get_user_model().objects.create_user(
            username='user',
            password='userpass123'
        )
        
        # Create test data
        self.organization = Organization.objects.create(
            name='Test Organization'
        )
        self.report = Report.objects.create(
            title='Test Report',
            organization=self.organization,
            submitted_by=self.admin_user,
            status='submitted'
        )

    def test_view_report_admin_access(self):
        """Test that admins can access the report view"""
        self.client.login(username='admin', password='adminpass123')
        response = self.client.get(
            reverse('admin_view_report', args=[self.report.id])
        )
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'core/admin_view_report.html')

    def test_view_report_unauthorized_access(self):
        """Test that regular users cannot access the report view"""
        self.client.login(username='user', password='userpass123')
        response = self.client.get(
            reverse('admin_view_report', args=[self.report.id])
        )
        self.assertEqual(response.status_code, 403)

    def test_view_report_not_found(self):
        """Test 404 response for non-existent report"""
        self.client.login(username='admin', password='adminpass123')
        response = self.client.get(
            reverse('admin_view_report', args=[99999])
        )
        self.assertEqual(response.status_code, 404)