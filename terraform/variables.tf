variable "environment" {
  description = "The environment name (e.g., prod, dev)"
  type        = string
  default     = "prod"
}

variable "region" {
  description = "The AWS region to deploy to"
  type        = string
  default     = "us-west-2"
}

variable "project_name" {
  description = "The name of the project"
  type        = string
  default     = "PersonalBook"
}

variable "rds_db_name" {
  description = "The name of the PostgreSQL database instance"
  type        = string
  default     = "personalbookdb" # Example default name
}

variable "rds_db_username" {
  description = "The master username for the PostgreSQL database"
  type        = string
  default     = "dbadmin" # AWS/PostgreSQL best practice
}

variable "rds_db_password" {
  description = "The master password for the PostgreSQL database"
  type        = string
  sensitive   = true # CRITICAL: Masks the value in Terraform output
}

variable "rds_db_port" {
  description = "The port for the PostgreSQL database"
  type        = number
  default     = 5432 # Standard PostgreSQL port
}
