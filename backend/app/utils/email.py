import asyncio
import logging
import smtplib
from email.message import EmailMessage
from typing import Optional

from app.config import settings

logger = logging.getLogger(__name__)


class EmailService:
    def _validate_email_config(self) -> None:
        if not settings.SMTP_SERVER or not settings.SMTP_PORT:
            raise RuntimeError("SMTP server is not configured.")
        if not settings.EMAIL_USER or not settings.EMAIL_PASSWORD:
            raise RuntimeError("Email credentials are missing. Set EMAIL_USER and EMAIL_PASSWORD.")

    def _send_email_sync(self, recipient_email: str, subject: str, body: str, html_body: Optional[str] = None) -> None:
        self._validate_email_config()

        message = EmailMessage()
        message["Subject"] = subject
        message["From"] = settings.EMAIL_FROM or settings.EMAIL_USER
        message["To"] = recipient_email
        message.set_content(body)
        if html_body:
            message.add_alternative(html_body, subtype="html")

        password = settings.EMAIL_PASSWORD.strip()

        if int(settings.SMTP_PORT) == 465:
            with smtplib.SMTP_SSL(settings.SMTP_SERVER, settings.SMTP_PORT, timeout=20) as server:
                server.login(settings.EMAIL_USER, password)
                server.send_message(message)
            return

        with smtplib.SMTP(settings.SMTP_SERVER, settings.SMTP_PORT, timeout=20) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(settings.EMAIL_USER, password)
            server.send_message(message)

    def _check_smtp_sync(self) -> None:
        self._validate_email_config()
        password = settings.EMAIL_PASSWORD.strip()

        if int(settings.SMTP_PORT) == 465:
            with smtplib.SMTP_SSL(settings.SMTP_SERVER, settings.SMTP_PORT, timeout=20) as server:
                server.login(settings.EMAIL_USER, password)
            return

        with smtplib.SMTP(settings.SMTP_SERVER, settings.SMTP_PORT, timeout=20) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(settings.EMAIL_USER, password)

    async def check_smtp_connection(self):
        await asyncio.to_thread(self._check_smtp_sync)
        return True

    def _brand(self) -> str:
        return settings.APP_NAME or "CropGear"

    def _format_currency(self, amount: float, currency: str = "USD") -> str:
        try:
            return f"{float(amount):,.2f} {currency.upper()}"
        except Exception:
            return f"{amount} {currency.upper()}"

    async def send_booking_confirmation(self, booking: dict, recipient_email: str):
        equipment_name = booking.get("equipment_name", "your equipment")
        booking_id = booking.get("id", "N/A")
        start_date = booking.get("start_date", "N/A")
        end_date = booking.get("end_date", "N/A")
        total_amount = self._format_currency(booking.get("total_amount", 0))
        subject = f"{self._brand()} Booking Confirmed"
        body = (
            f"Your booking is confirmed.\n\n"
            f"Booking ID: {booking_id}\n"
            f"Equipment: {equipment_name}\n"
            f"Dates: {start_date} to {end_date}\n"
            f"Total: {total_amount}\n\n"
            f"Thank you for using {self._brand()}."
        )
        html = (
            f"<h2>{self._brand()} Booking Confirmed</h2>"
            f"<p>Your booking is confirmed.</p>"
            f"<ul>"
            f"<li><strong>Booking ID:</strong> {booking_id}</li>"
            f"<li><strong>Equipment:</strong> {equipment_name}</li>"
            f"<li><strong>Dates:</strong> {start_date} to {end_date}</li>"
            f"<li><strong>Total:</strong> {total_amount}</li>"
            f"</ul>"
            f"<p>Thank you for using {self._brand()}.</p>"
        )
        await asyncio.to_thread(self._send_email_sync, recipient_email, subject, body, html)
        return True

    async def send_booking_request(self, booking: dict, recipient_email: str):
        equipment_name = booking.get("equipment_name", "your equipment")
        booking_id = booking.get("id", "N/A")
        start_date = booking.get("start_date", "N/A")
        end_date = booking.get("end_date", "N/A")
        farmer_name = booking.get("farmer_name", "Farmer")
        total_amount = self._format_currency(booking.get("total_amount", 0))
        subject = f"{self._brand()} New Booking Request"
        body = (
            f"You have a new booking request.\n\n"
            f"Booking ID: {booking_id}\n"
            f"Equipment: {equipment_name}\n"
            f"Farmer: {farmer_name}\n"
            f"Dates: {start_date} to {end_date}\n"
            f"Total: {total_amount}\n\n"
            f"Please review the request in your dashboard."
        )
        html = (
            f"<h2>{self._brand()} New Booking Request</h2>"
            f"<p>You have a new booking request.</p>"
            f"<ul>"
            f"<li><strong>Booking ID:</strong> {booking_id}</li>"
            f"<li><strong>Equipment:</strong> {equipment_name}</li>"
            f"<li><strong>Farmer:</strong> {farmer_name}</li>"
            f"<li><strong>Dates:</strong> {start_date} to {end_date}</li>"
            f"<li><strong>Total:</strong> {total_amount}</li>"
            f"</ul>"
            f"<p>Please review the request in your dashboard.</p>"
        )
        await asyncio.to_thread(self._send_email_sync, recipient_email, subject, body, html)
        return True

    async def send_booking_rejected(self, booking: dict, recipient_email: str):
        equipment_name = booking.get("equipment_name", "your equipment")
        booking_id = booking.get("id", "N/A")
        subject = f"{self._brand()} Booking Rejected"
        body = (
            f"Your booking request was rejected.\n\n"
            f"Booking ID: {booking_id}\n"
            f"Equipment: {equipment_name}\n\n"
            f"You can submit another request or contact support for help."
        )
        html = (
            f"<h2>{self._brand()} Booking Rejected</h2>"
            f"<p>Your booking request was rejected.</p>"
            f"<ul>"
            f"<li><strong>Booking ID:</strong> {booking_id}</li>"
            f"<li><strong>Equipment:</strong> {equipment_name}</li>"
            f"</ul>"
            f"<p>You can submit another request or contact support for help.</p>"
        )
        await asyncio.to_thread(self._send_email_sync, recipient_email, subject, body, html)
        return True

    async def send_payment_receipt(self, booking: dict, recipient_email: str, amount: float, currency: str = "USD"):
        equipment_name = booking.get("equipment_name", "your equipment")
        booking_id = booking.get("id", "N/A")
        formatted_amount = self._format_currency(amount, currency)
        subject = f"{self._brand()} Payment Receipt"
        body = (
            f"We received your payment.\n\n"
            f"Booking ID: {booking_id}\n"
            f"Equipment: {equipment_name}\n"
            f"Amount: {formatted_amount}\n\n"
            f"Thank you for using {self._brand()}."
        )
        html = (
            f"<h2>{self._brand()} Payment Receipt</h2>"
            f"<p>We received your payment.</p>"
            f"<ul>"
            f"<li><strong>Booking ID:</strong> {booking_id}</li>"
            f"<li><strong>Equipment:</strong> {equipment_name}</li>"
            f"<li><strong>Amount:</strong> {formatted_amount}</li>"
            f"</ul>"
            f"<p>Thank you for using {self._brand()}.</p>"
        )
        await asyncio.to_thread(self._send_email_sync, recipient_email, subject, body, html)
        return True

    async def send_account_approval(self, user: dict, recipient_email: str):
        full_name = user.get("full_name", "User")
        role = user.get("role", "user")
        subject = f"{self._brand()} Account Approved"
        body = (
            f"Hi {full_name},\n\n"
            f"Your {self._brand()} account has been approved.\n"
            f"Role: {role}\n\n"
            f"You can now log in and start using the platform."
        )
        html = (
            f"<h2>{self._brand()} Account Approved</h2>"
            f"<p>Hi {full_name},</p>"
            f"<p>Your account has been approved.</p>"
            f"<p><strong>Role:</strong> {role}</p>"
            f"<p>You can now log in and start using the platform.</p>"
        )
        await asyncio.to_thread(self._send_email_sync, recipient_email, subject, body, html)
        return True

    async def send_account_rejection(self, user: dict, recipient_email: str):
        full_name = user.get("full_name", "User")
        subject = f"{self._brand()} Account Update"
        body = (
            f"Hi {full_name},\n\n"
            f"Your account request was not approved at this time.\n"
            f"If you believe this is an error, please contact support."
        )
        html = (
            f"<h2>{self._brand()} Account Update</h2>"
            f"<p>Hi {full_name},</p>"
            f"<p>Your account request was not approved at this time.</p>"
            f"<p>If you believe this is an error, please contact support.</p>"
        )
        await asyncio.to_thread(self._send_email_sync, recipient_email, subject, body, html)
        return True

    async def send_owner_verification_status(self, user: dict, recipient_email: str, status: str):
        full_name = user.get("name") or user.get("full_name", "Owner")
        subject = f"{self._brand()} Owner Verification Update"
        body = (
            f"Hi {full_name},\n\n"
            f"Your owner verification status is now: {status}.\n"
            f"If you have questions, contact support."
        )
        html = (
            f"<h2>{self._brand()} Owner Verification Update</h2>"
            f"<p>Hi {full_name},</p>"
            f"<p>Your owner verification status is now: <strong>{status}</strong>.</p>"
            f"<p>If you have questions, contact support.</p>"
        )
        await asyncio.to_thread(self._send_email_sync, recipient_email, subject, body, html)
        return True

    async def send_newsletter_welcome(self, recipient_email: str):
        subject = f"Welcome to {self._brand()} Updates"
        body = (
            f"Thanks for subscribing to {self._brand()} updates.\n\n"
            f"We'll keep you posted with new listings and platform updates."
        )
        html = (
            f"<h2>Welcome to {self._brand()} Updates</h2>"
            f"<p>Thanks for subscribing.</p>"
            f"<p>We'll keep you posted with new listings and platform updates.</p>"
        )
        await asyncio.to_thread(self._send_email_sync, recipient_email, subject, body, html)
        return True

    async def send_registration_received(self, recipient_email: str, full_name: str = "User"):
        subject = f"{self._brand()} Registration Received"
        body = (
            f"Hi {full_name},\n\n"
            f"Thanks for registering with {self._brand()}.\n"
            f"Your account is pending admin approval. We'll notify you once it's approved."
        )
        html = (
            f"<h2>{self._brand()} Registration Received</h2>"
            f"<p>Hi {full_name},</p>"
            f"<p>Thanks for registering with {self._brand()}.</p>"
            f"<p>Your account is pending admin approval. We'll notify you once it's approved.</p>"
        )
        await asyncio.to_thread(self._send_email_sync, recipient_email, subject, body, html)
        return True

    async def send_password_reset(
        self,
        recipient_email: str,
        token: str,
        reset_url: Optional[str] = None,
        full_name: str = "User",
        expires_in_minutes: int = 30,
    ):
        subject = f"{self._brand()} Password Reset"
        intro = (
            f"Hi {full_name},\n\n"
            f"We received a request to reset your {self._brand()} password.\n"
        )
        if reset_url:
            body = (
                f"{intro}"
                f"Reset link: {reset_url}\n"
                f"Reset code: {token}\n"
                f"This link expires in {expires_in_minutes} minutes.\n\n"
                "If you did not request this, you can safely ignore this email."
            )
            html = (
                f"<h2>{self._brand()} Password Reset</h2>"
                f"<p>Hi {full_name},</p>"
                f"<p>We received a request to reset your password.</p>"
                f"<p><a href=\"{reset_url}\">Reset your password</a></p>"
                f"<p>Or use this reset code:</p>"
                f"<p style=\"font-size:18px;\"><strong>{token}</strong></p>"
                f"<p>This link expires in {expires_in_minutes} minutes.</p>"
                f"<p>If you did not request this, you can safely ignore this email.</p>"
            )
        else:
            body = (
                f"{intro}"
                f"Reset code: {token}\n"
                f"This code expires in {expires_in_minutes} minutes.\n\n"
                "If you did not request this, you can safely ignore this email."
            )
            html = (
                f"<h2>{self._brand()} Password Reset</h2>"
                f"<p>Hi {full_name},</p>"
                f"<p>We received a request to reset your password.</p>"
                f"<p>Use this reset code:</p>"
                f"<p style=\"font-size:18px;\"><strong>{token}</strong></p>"
                f"<p>This code expires in {expires_in_minutes} minutes.</p>"
                f"<p>If you did not request this, you can safely ignore this email.</p>"
            )
        await asyncio.to_thread(self._send_email_sync, recipient_email, subject, body, html)
        return True

    async def send_password_reset_confirmation(self, recipient_email: str, full_name: str = "User"):
        subject = f"{self._brand()} Password Updated"
        body = (
            f"Hi {full_name},\n\n"
            f"Your {self._brand()} password was just updated.\n"
            "If you did not make this change, contact support immediately."
        )
        html = (
            f"<h2>{self._brand()} Password Updated</h2>"
            f"<p>Hi {full_name},</p>"
            f"<p>Your password was just updated.</p>"
            f"<p>If you did not make this change, contact support immediately.</p>"
        )
        await asyncio.to_thread(self._send_email_sync, recipient_email, subject, body, html)
        return True

    async def send_registration_otp(self, recipient_email: str, otp_code: str):
        body = (
            f"Your {self._brand()} verification code is below.\n\n"
            f"OTP: {otp_code}\n\n"
            "This code expires in 10 minutes. If you did not request this, ignore this email."
        )
        html = (
            f"<h2>{self._brand()} Verification Code</h2>"
            f"<p>Your one-time verification code is:</p>"
            f"<p style=\"font-size:20px;\"><strong>{otp_code}</strong></p>"
            f"<p>This code expires in 10 minutes. If you did not request this, ignore this email.</p>"
        )
        await asyncio.to_thread(
            self._send_email_sync,
            recipient_email,
            f"{self._brand()} OTP Verification Code",
            body,
            html,
        )
        return True
