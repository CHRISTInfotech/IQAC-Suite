from django.contrib.auth.models import User
from django.contrib.messages import get_messages
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import Client, TestCase
from django.urls import reverse
from django.utils import timezone

from core.models import (Organization, OrganizationMembership,
                         OrganizationRole, OrganizationType, RoleAssignment)


class BulkUserUploadTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_superuser("admin", "admin@example.com", "pass")
        org_type = OrganizationType.objects.create(name="Dept")
        self.org = Organization.objects.create(name="Science", org_type=org_type)

    def _upload(self):
        csv_content = (
            "register_no,name,email,role\n" "001,John Doe,john@example.com,student\n"
        )
        file = SimpleUploadedFile(
            "users.csv", csv_content.encode("utf-8"), content_type="text/csv"
        )
        url = reverse("admin_org_users_upload_csv", args=[self.org.id])
        data = {
            "class_name": "A",
            "academic_year": "2024-2025",
            "csv_file": file,
        }
        referer = f"http://testserver/core-admin/org-users/{self.org.id}/students/"
        return self.client.post(url, data, follow=True, HTTP_REFERER=referer)

    def _upload_with_invalid(self):
        csv_content = (
            "register_no,name,email,role\n"
            "001,John Doe,john@example.com,student\n"
            "002,Jane Doe,jane@example.com,ghost\n"
        )
        file = SimpleUploadedFile(
            "users.csv", csv_content.encode("utf-8"), content_type="text/csv"
        )
        url = reverse("admin_org_users_upload_csv", args=[self.org.id])
        data = {
            "class_name": "A",
            "academic_year": "2024-2025",
            "csv_file": file,
        }
        referer = f"http://testserver/core-admin/org-users/{self.org.id}/students/"
        return self.client.post(url, data, follow=True, HTTP_REFERER=referer)

    def test_upload_and_login_flow(self):
        self.client.force_login(self.admin)
        response = self._upload()

        errors = [
            m.message
            for m in get_messages(response.wsgi_request)
            if m.level_tag == "error"
        ]
        self.assertFalse(errors)

        user = User.objects.get(username="john@example.com")
        self.assertFalse(user.is_active)
        ra = RoleAssignment.objects.get(user=user, organization=self.org)
        self.assertEqual(ra.role.name.lower(), "student")

        # simulate first login
        user.set_password("pass")
        user.save(update_fields=["password"])

        user_client = Client()
        session = user_client.session
        session["org_id"] = self.org.id
        session.save()

        self.assertTrue(user_client.login(username="john@example.com", password="pass"))
        user.refresh_from_db()
        self.assertTrue(user.is_active)
        self.assertEqual(user.profile.role.lower(), "student")
        # Check the role in the logged-in user's session (not the admin client)
        session_role = user_client.session["role"]
        if session_role.startswith("orgrole:"):
            self.assertTrue(session_role.startswith("orgrole:"))
        else:
            self.assertEqual(session_role, "student")

    def test_upload_with_unknown_role_errors(self):
        self.client.force_login(self.admin)
        response = self._upload_with_invalid()

        errors = [
            m.message
            for m in get_messages(response.wsgi_request)
            if m.level_tag == "error"
        ]
        self.assertTrue(any("role" in msg.lower() for msg in errors))
        self.assertFalse(User.objects.filter(username="john@example.com").exists())

    def test_existing_user_not_duplicated(self):
        """Existing users matched by email should not be duplicated on upload."""
        existing = User.objects.create_user("john", "john@example.com", "pass")

        self.client.force_login(self.admin)

        csv_content = (
            "register_no,name,email,role\n" "001,John Doe,john@example.com,student\n"
        )
        file = SimpleUploadedFile(
            "users.csv", csv_content.encode("utf-8"), content_type="text/csv"
        )
        url = reverse("admin_org_users_upload_csv", args=[self.org.id])
        data = {
            "class_name": "A",
            "academic_year": "2024-2025",
            "csv_file": file,
        }
        referer = f"http://testserver/core-admin/org-users/{self.org.id}/students/"
        self.client.post(url, data, follow=True, HTTP_REFERER=referer)

        self.assertEqual(User.objects.filter(email="john@example.com").count(), 1)
        self.assertFalse(User.objects.filter(username="john@example.com").exists())
        mems = OrganizationMembership.objects.filter(
            user=existing, organization=self.org
        )
        self.assertEqual(mems.count(), 1)
        ra = RoleAssignment.objects.get(user=existing, organization=self.org)
        self.assertEqual(ra.role.name.lower(), "student")

    def test_bulk_upload_overrides_existing_role(self):
        user = User.objects.create_user("john", "john@example.com", "pass")
        faculty_role = OrganizationRole.objects.create(
            organization=self.org, name="faculty"
        )
        OrganizationMembership.objects.create(
            user=user,
            organization=self.org,
            academic_year="2024-2025",
            role="faculty",
            is_primary=True,
            is_active=True,
        )
        RoleAssignment.objects.create(
            user=user,
            organization=self.org,
            role=faculty_role,
            academic_year="2024-2025",
        )

        self.client.force_login(self.admin)
        self._upload()

        ras = RoleAssignment.objects.filter(user=user, organization=self.org)
        self.assertEqual(ras.count(), 1)
        self.assertEqual(ras.first().role.name.lower(), "student")

    def test_bulk_upload_moves_user_between_orgs(self):
        """Uploading the same user to a new organization should replace old membership."""
        self.client.force_login(self.admin)

        # Initial upload to first organization
        self._upload()

        org2 = Organization.objects.create(name="Commerce", org_type=self.org.org_type)

        csv_content = (
            "register_no,name,email,role\n" "001,John Doe,john@example.com,student\n"
        )
        file = SimpleUploadedFile(
            "users.csv", csv_content.encode("utf-8"), content_type="text/csv"
        )
        url = reverse("admin_org_users_upload_csv", args=[org2.id])
        data = {
            "class_name": "B",
            "academic_year": "2024-2025",
            "csv_file": file,
        }
        referer = f"http://testserver/core-admin/org-users/{org2.id}/students/"
        self.client.post(url, data, follow=True, HTTP_REFERER=referer)

        user = User.objects.get(email="john@example.com")
        self.assertEqual(OrganizationMembership.objects.filter(user=user).count(), 1)
        mem = OrganizationMembership.objects.get(user=user)
        self.assertEqual(mem.organization, org2)
        self.assertEqual(mem.role, "student")
        ra = RoleAssignment.objects.get(user=user)
        self.assertEqual(ra.organization, org2)
        self.assertEqual(ra.role.name.lower(), "student")


class BulkFacultyUploadTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_superuser("admin", "admin@example.com", "pass")
        org_type = OrganizationType.objects.create(name="Dept")
        self.org = Organization.objects.create(name="Science", org_type=org_type)
        self.faculty_role = OrganizationRole.objects.create(
            organization=self.org, name="faculty"
        )

    def _upload(self):
        csv_content = (
            "emp_id,name,email,role\n" "EMP1,Prof One,prof1@example.com,faculty\n"
        )
        file = SimpleUploadedFile(
            "faculty.csv", csv_content.encode("utf-8"), content_type="text/csv"
        )
        url = reverse("admin_org_users_upload_csv", args=[self.org.id])
        data = {
            "csv_file": file,
        }
        referer = f"http://testserver/core-admin/org-users/{self.org.id}/faculty/"
        return self.client.post(url, data, follow=True, HTTP_REFERER=referer)

    def test_upload_and_archive_flow(self):
        self.client.force_login(self.admin)
        self._upload()

        user = User.objects.get(username="prof1@example.com")
        mem = user.org_memberships.get(organization=self.org)
        self.assertTrue(mem.is_active)
        now = timezone.now()
        start_year = now.year if now.month >= 6 else now.year - 1
        expected_year = f"{start_year}-{start_year + 1}"
        self.assertEqual(mem.academic_year, expected_year)

        # Toggle archive
        toggle_url = reverse(
            "admin_org_users_faculty_toggle", args=[self.org.id, mem.id]
        )
        self.client.post(toggle_url)
        mem.refresh_from_db()
        self.assertFalse(mem.is_active)

        # Ensure in archived list
        resp = self.client.get(
            reverse("admin_org_users_faculty", args=[self.org.id]) + "?archived=1"
        )
        self.assertContains(resp, "Prof One")

    def test_existing_faculty_not_duplicated(self):
        existing = User.objects.create_user("prof1", "prof1@example.com", "pass")

        self.client.force_login(self.admin)
        self._upload()

        self.assertEqual(User.objects.filter(email="prof1@example.com").count(), 1)
        self.assertFalse(User.objects.filter(username="prof1@example.com").exists())
        mems = OrganizationMembership.objects.filter(
            user=existing, organization=self.org
        )
        self.assertEqual(mems.count(), 1)
        ra = RoleAssignment.objects.get(user=existing, organization=self.org)
        self.assertEqual(ra.role, self.faculty_role)

    def test_upload_faculty_without_faculty_in_referer(self):
        self.client.force_login(self.admin)

        csv_content = (
            "emp_id,name,email,role\n" "EMP2,Prof Two,prof2@example.com,faculty\n"
        )
        file = SimpleUploadedFile(
            "faculty2.csv", csv_content.encode("utf-8"), content_type="text/csv"
        )
        url = reverse("admin_org_users_upload_csv", args=[self.org.id])
        data = {
            "csv_file": file,
            "upload_type": "faculty",
        }
        referer = f"http://testserver/core-admin/org-users/{self.org.id}/"
        response = self.client.post(url, data, follow=True, HTTP_REFERER=referer)

        errors = [
            m.message
            for m in get_messages(response.wsgi_request)
            if m.level_tag == "error"
        ]
        self.assertFalse(errors)

        user = User.objects.get(username="prof2@example.com")
        membership = OrganizationMembership.objects.get(
            user=user, organization=self.org
        )
        self.assertEqual(membership.role, "faculty")
        now = timezone.now()
        start_year = now.year if now.month >= 6 else now.year - 1
        expected_year = f"{start_year}-{start_year + 1}"
        self.assertEqual(membership.academic_year, expected_year)
