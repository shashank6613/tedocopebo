output "alb_dns_name" {
  description = "The DNS name of the Application Load Balancer"
  value       = aws_lb.main.dns_name
}

output "ecs_cluster_name" {
  description = "The name of the ECS cluster"
  value       = aws_ecs_cluster.main.name
}

output "nat_gateway_public_ip" {
  description = "The public Elastic IP address of the NAT Gateway, needed for whitelisting in MongoDB Atlas."
  value       = aws_eip.nat_gw_eip.public_ip
}

output "backend_ecr_url" {
  description = "URL of the backend ECR repository"
  value       = aws_ecr_repository.backend_repo.repository_url
}

output "frontend_ecr_url" {
  description = "URL of the frontend ECR repository"
  value       = aws_ecr_repository.frontend_repo.repository_url
}
