# --- DynamoDB Table for Terraform State Locking ---
resource "aws_dynamodb_table" "terraform_locks" {
  name             = "terraform-state-locks-${var.environment}"
  billing_mode     = "PAY_PER_REQUEST" # Minimal cost (On-Demand)
  read_capacity    = 0                 # Required to set to 0 if using PAY_PER_REQUEST
  write_capacity   = 0                 # Required to set to 0 if using PAY_PER_REQUEST

  # Terraform requires a Hash Key named 'LockID' with a String type
  hash_key = "LockID"

  attribute {
    name = "LockID"
    type = "S" # String
  }

  tags = {
    Name = "${var.project_name}-TF-Lock-${var.environment}"
  }
}

# --- Output the table name for use in the backend config ---
output "dynamodb_table_name" {
  value = aws_dynamodb_table.terraform_locks.name
}
