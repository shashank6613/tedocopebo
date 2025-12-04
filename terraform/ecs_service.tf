# --- 1. Frontend Service (Runs the React app) ---
resource "aws_ecs_service" "frontend_service" {
  name            = "${var.project_name}-frontend-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.frontend_task.arn # Frontend task definition (defined below)
  desired_count   = 2 # Run 2 tasks for High Availability (HA)
  launch_type     = "FARGATE"
  
  network_configuration {
    security_groups = [aws_security_group.backend_sg.id] # Use the backend SG for now (same network egress needs)
    subnets         = aws_subnet.public[*].id
    assign_public_ip = true
  }
  
  # Connect the service to the Application Load Balancer
  load_balancer {
    target_group_arn = aws_lb_target_group.frontend_tg.arn
    container_name   = "frontend" # Must match the container name in the frontend task definition
    container_port   = 80 # The port the container exposes (e.g., Nginx serving React build)
  }

  lifecycle {
    ignore_changes = [desired_count] # Prevents Terraform from reverting autoscaling changes
  }
}

# --- 2. Backend Service (Runs the Node.js API) ---
resource "aws_ecs_service" "backend_service" {
  name            = "${var.project_name}-backend-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.backend_task.arn
  desired_count   = 2 # Run 2 tasks for HA
  launch_type     = "FARGATE"
  
  network_configuration {
    security_groups = [aws_security_group.backend_sg.id]
    subnets         = aws_subnet.public[*].id
    assign_public_ip = true
  }

  # NOTE: The backend service is not directly connected to the ALB in this setup. 
  # It is designed to be called by the frontend service on port 5000 internally or via the public IP (less secure).
  # For production, we would typically set up an API Gateway or a separate ALB listener for the backend.
  # For now, the frontend will communicate with the backend via its IP/Port within the VPC.

  lifecycle {
    ignore_changes = [desired_count]
  }
}
