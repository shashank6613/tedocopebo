
# -------------------------------------------------------------
# --- 1. AWS RDS PostgreSQL Instance ---
# -------------------------------------------------------------
resource "aws_db_instance" "postgres_db" {
  identifier           = "${lower(var.project_name)}-${lower(var.environment)}-postgres"
  allocated_storage    = 20
  storage_type         = "gp2"
  engine               = "postgres"
  engine_version       = "17.4" # Use the latest stable version
  instance_class       = "db.t3.micro"
  db_name              = var.rds_db_name
  username             = var.rds_db_username
  password             = var.rds_db_password
  port                 = var.rds_db_port
  multi_az             = true # Recommended for production high availability
  db_subnet_group_name = aws_db_subnet_group.rds_subnet_group.name # From network.tf
  vpc_security_group_ids = [aws_security_group.rds_sg.id] # From security.tf
  skip_final_snapshot  = true
  publicly_accessible  = false # CRITICAL: Keep inside the VPC

  # Backup retention and maintenance settings
  backup_retention_period = 7
  allow_major_version_upgrade = true
  auto_minor_version_upgrade = true

  tags = {
    Name = "${var.project_name}-PostgreSQL-DB"
  }
}
