# --- 1. CloudWatch Log Group ---
resource "aws_cloudwatch_log_group" "backend_log_group" {
  name              = "/ecs/${var.project_name}-backend"
  retention_in_days = 7
}

# --- 2. ECS Task Execution Role (Pulls images, Writes logs, Accesses Secrets) ---
resource "aws_iam_role" "ecs_task_execution_role" {
  name = "${var.project_name}-${var.environment}-ecs-exec-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = {
        Service = "ecs-tasks.amazonaws.com"
      }
    }]
  })
}

# Policy for ECR Read, Secrets Manager Read, and CloudWatch Write
resource "aws_iam_role_policy" "ecs_execution_policy" {
  name = "${var.project_name}-${var.environment}-ecs-exec-policy"
  role = aws_iam_role.ecs_task_execution_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      { # Required for pulling images from ECR
        Effect   = "Allow"
        Action   = [
          "ecr:GetAuthorizationToken",
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage"
        ]
        Resource = "*"
      },
      { # Required for writing logs to CloudWatch
        Effect   = "Allow"
        Action   = [
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = [
          "${aws_cloudwatch_log_group.backend_log_group.arn}:*", 
          "${aws_cloudwatch_log_group.frontend_log_group.arn}:*" 
        ]
      },
      { # Required for accessing Secrets Manager or Parameter Store
        Effect   = "Allow"
        Action   = [
          "secretsmanager:GetSecretValue",
          "ssm:GetParameters" # If you use Parameter Store too
        ]
        # 🚨 Resource must be updated to the ARN of your actual secret!
        Resource = [
          "arn:aws:secretsmanager:us-west-2:799344209838:secret:mongo-atlas-uri-prod-ltRwhe",
          "arn:aws:secretsmanager:us-west-2:799344209838:secret:app-jwt-secret-prod-e8JWoO"
        ]
      }
    ]
  })
}

# --- 3. Security Group for the Backend Service (Allows traffic from Load Balancer) ---
resource "aws_security_group" "backend_sg" {
  vpc_id = aws_vpc.main.id
  name   = "${var.project_name}-${var.environment}-backend-sg"

  # Allow egress to the internet (necessary for talking to MongoDB Atlas)
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-Backend-SG"
  }
}
