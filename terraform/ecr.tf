#-- ECR Repositories ---
resource "aws_ecr_repository" "backend_repo" {
  name                 = "${lower(var.project_name)}-backend"
  image_tag_mutability = "MUTABLE"
  image_scanning_configuration {
    scan_on_push = true
  }
}

resource "aws_ecr_repository" "frontend_repo" {
  name                 = "${lower(var.project_name)}-frontend"
  image_tag_mutability = "MUTABLE"
  image_scanning_configuration {
    scan_on_push = true
  }
}
