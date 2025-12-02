output "ec2_instance_id" {
  description = "The ID of the provisioned EC2 instance for use with SSM."
  value       = aws_instance.app_host.id
}
