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
