terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # THIS BLOCK MUST BE INSIDE THE TERRAFORM BLOCK
  backend "s3" {
    bucket         = "shank-personal-book-tf-state" # ⬅️ Your existing S3 Bucket name
    key            = "prod/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-state-locks-prod" # ⬅️ Correctly using the DynamoDB table for locking
  }
}

# --- Provider and Data Sources go AFTER the main terraform block ---
provider "aws" {
  region = var.region
}

# Data source for availability zones
data "aws_availability_zones" "available" {
  state = "available"
}
