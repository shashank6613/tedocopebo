# --- CloudWatch Log Group for Frontend ---
resource "aws_cloudwatch_log_group" "frontend_log_group" {
  name              = "/ecs/${var.project_name}-frontend"
  retention_in_days = 7
}

# --- Frontend Task Definition (Fargate) ---
resource "aws_ecs_task_definition" "frontend_task" {
  family                   = "${var.project_name}-frontend"
  cpu                      = "256"
  memory                   = "512"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn
  task_role_arn            = aws_iam_role.ecs_task_execution_role.arn

  container_definitions = jsonencode([
    {
      name      = "frontend"
      image     = "${aws_ecr_repository.frontend_repo.repository_url}:latest" # Placeholder
      essential = true
      portMappings = [{
        containerPort = 80 # Frontend container (Nginx) listens on port 80
        protocol      = "tcp"
      }]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.frontend_log_group.name
          "awslogs-region"        = var.region
          "awslogs-stream-prefix" = "ecs"
        }
      }
    }
  ])
}
