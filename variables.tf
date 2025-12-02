variable "region" {
  description = "The AWS region to deploy to"
  default     = "us-west-2"
}

variable "project_name" {
  default = "personal-book"
}

variable "ec2_instance_type" {
  description = "The size of the EC2 instance."
  type        = string
  default     = "t3.medium"
}

variable "my_ip" {
  description = "Your local public IP address for SSH access (CIDR format, e.g., 100.100.100.100/32)."
  type        = string
}

variable "sender_email_address" {
  description = "Sender email configured in AWS SES"
  type        = string
  sensitive   = true
}
