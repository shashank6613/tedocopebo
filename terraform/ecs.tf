# --- 1. ECS Cluster ---
resource "aws_ecs_cluster" "main" {
  name = "${var.project_name}-Cluster-${var.environment}"
}

# --- 2. Backend Task Definition (Fargate) ---
resource "aws_ecs_task_definition" "backend_task" {
  family                   = "${var.project_name}-backend"
  cpu                      = "512" # 0.5 vCPU
  memory                   = "1024" # 1GB RAM
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn
  # This task role allows the container itself to interact with other AWS services (if needed)
  task_role_arn            = aws_iam_role.ecs_task_execution_role.arn 

  container_definitions = jsonencode([
    {
      name      = "backend"
      # This image path will be rendered by the CI/CD pipeline
      image     = "${aws_ecr_repository.backend_repo.repository_url}:latest" 
      essential = true
      portMappings = [{
        containerPort = 5000
        protocol      = "tcp"
      }]
      
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.backend_log_group.name
          "awslogs-region"        = var.region
          "awslogs-stream-prefix" = "ecs"
        }
      }
      
      # 🚨 HOW TO PULL SECRETS FROM AWS SECRETS MANAGER 🚨
      secrets = [
        {
          name      = "MONGO_URI"
          # ⚠️ REPLACE 'SECRET_ARN_HERE' with the ARN of your MongoDB Atlas secret in Secrets Manager
          valueFrom = "arn:aws:secretsmanager:${var.region}:${data.aws_caller_identity.current.account_id}:secret:mongo-atlas-uri-prod-ltRwhe::MONGO_URI" 
        },
        {
          name      = "JWT_SECRET"
          # ⚠️ REPLACE 'JWT_SECRET_ARN_HERE' with the ARN of your JWT secret
          valueFrom = "arn:aws:secretsmanager:${var.region}:${data.aws_caller_identity.current.account_id}:secret:app-jwt-secret-prod-e8JWoO" 
        }
      ]
    }
  ])
}

# Helper data source to get the current AWS account ID for the secret ARN
data "aws_caller_identity" "current" {}
