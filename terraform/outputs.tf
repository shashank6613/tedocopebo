output "alb_dns_name" {
  description = "The DNS name of the Application Load Balancer"
  value       = aws_lb.main.dns_name
}

output "ecs_cluster_name" {
  description = "The name of the ECS cluster"
  value       = aws_ecs_cluster.main.name
}

output "backend_ecr_url" {
  description = "URL of the backend ECR repository"
  value       = aws_ecr_repository.backend_repo.repository_url
}

output "frontend_ecr_url" {
  description = "URL of the frontend ECR repository"
  value       = aws_ecr_repository.frontend_repo.repository_url
}

output "rds_endpoint" {
  description = "The private DNS endpoint for the PostgreSQL database"
  value       = aws_db_instance.postgres_db.address 
}

output "vpc_id" {
  description = "The ID of the main VPC"
  value       = aws_vpc.main.id
}

output "postgres_uri_secret_arn" {
  description = "The ARN of the AWS Secrets Manager secret holding the PostgreSQL connection URI."
  value       = aws_secretsmanager_secret.postgres_uri_secret.arn
}

output "jwt_secret_arn" {
  description = "The ARN of the AWS Secrets Manager secret holding the JWT signing key."
  value       = aws_secretsmanager_secret.jwt_secret.arn
}
