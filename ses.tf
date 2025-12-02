# Verify the email address for sending
resource "aws_ses_email_identity" "sender_identity" {
  email = var.sender_email_address
}

output "ses_verification_instructions" {
  description = "You must click the verification link sent to this email address before SES can be used."
  value       = "Check the inbox for ${var.sender_email_address} to verify the email address with AWS SES."
  sensitive   = true
}
