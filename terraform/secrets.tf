
# ------------------------------------------------------------------
# --- 1. Generate the JWT Secret Value (Random String) ---
# ------------------------------------------------------------------
resource "random_string" "jwt_secret_value" {
  length  = 64 # Use a strong length
  special = true
  upper   = true
  lower   = true
  numeric  = true
}

# ------------------------------------------------------------------
# --- 2. AWS Secrets Manager for JWT Secret ---
# ------------------------------------------------------------------
resource "aws_secretsmanager_secret" "jwt_secret" {
  name        = "${var.project_name}-jwt-secret-${var.environment}"
  description = "Secure secret key for JWT signing."
}

resource "aws_secretsmanager_secret_version" "jwt_secret_version" {
  secret_id     = aws_secretsmanager_secret.jwt_secret.id
  # Store the actual random string generated above
  secret_string = random_string.jwt_secret_value.result
}

#------------------------------------------------------------------
#--- 3. For AWS RDS POSTGRES DB Secret creation ---
#------------------------------------------------------------------

# A. Create the new secret for the PostgreSQL connection URI
# This uses the private RDS endpoint address, eliminating public IP issues.
resource "aws_secretsmanager_secret" "postgres_uri_secret" {
  name = "${var.project_name}-postgres-uri-${var.environment}"
  description = "PostgreSQL connection URI for the backend service"
}

# B. Store the actual URI value
resource "aws_secretsmanager_secret_version" "postgres_uri_version" {
  secret_id = aws_secretsmanager_secret.postgres_uri_secret.id

  # Dynamically construct the secure, private connection URI
  secret_string = "postgresql://${var.rds_db_username}:${var.rds_db_password}@${aws_db_instance.postgres_db.address}:${var.rds_db_port}/${var.rds_db_name}"
}
