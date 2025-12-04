# --- 1. Security Group for the Load Balancer (Allows public access on HTTP/HTTPS) ---
resource "aws_security_group" "alb_sg" {
  vpc_id = aws_vpc.main.id
  name   = "${var.project_name}-${var.environment}-alb-sg"

  # Ingress rule: Allow all incoming HTTP traffic
  ingress {
    protocol    = "tcp"
    from_port   = 80
    to_port     = 80
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Ingress rule: Allow all incoming HTTPS traffic (Recommended for production)
  ingress {
    protocol    = "tcp"
    from_port   = 443
    to_port     = 443
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Egress rule: Allow outbound traffic to the internet
  egress {
    protocol    = "-1"
    from_port   = 0
    to_port     = 0
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# --- 2. Application Load Balancer (ALB) ---
resource "aws_lb" "main" {
  name               = "${var.project_name}-${var.environment}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb_sg.id]
  subnets            = aws_subnet.public[*].id # Attach to public subnets
}

# --- 3. Target Group for Frontend (React app) ---
# Fargate services typically listen on port 3000 (React default)
resource "aws_lb_target_group" "frontend_tg" {
  name        = "${var.project_name}-${var.environment}-frontend-tg"
  port        = 80
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "ip" # Required for Fargate

  health_check {
    path = "/"
    port = "traffic-port" # Check on the port the ALB is using
    protocol = "HTTP"
  }
}

# --- 4. ALB Listener (Listens on port 80 and routes to the frontend) ---
resource "aws_lb_listener" "http_frontend" {
  load_balancer_arn = aws_lb.main.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.frontend_tg.arn
  }
}

# --- 5. Update Backend Security Group Ingress Rule ---
# Allow traffic to the backend (Port 5000) ONLY from the Load Balancer's Security Group
resource "aws_security_group_rule" "backend_ingress_from_alb" {
  type                     = "ingress"
  from_port                = 5000
  to_port                  = 5000
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.alb_sg.id # Source is the ALB
  security_group_id        = aws_security_group.backend_sg.id
}
