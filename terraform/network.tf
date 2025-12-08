# --- 1. VPC ---
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true
  tags = {
    Name = "${var.project_name}-${var.environment}-VPC"
  }
}

# --- 2. Internet Gateway (for Public Access) ---
resource "aws_internet_gateway" "gw" {
  vpc_id = aws_vpc.main.id
  tags = {
    Name = "${var.project_name}-${var.environment}-IGW"
  }
}

# --- 3. Public Subnets (2 zones for HA) ---
resource "aws_subnet" "public" {
  count                   = 2
  vpc_id                  = aws_vpc.main.id
  cidr_block              = cidrsubnet(aws_vpc.main.cidr_block, 8, count.index) # 10.0.0.0/24, 10.0.1.0/24
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true # Required for Fargate public endpoint

  tags = {
    Name = "${var.project_name}-Public-${count.index + 1}"
  }
}

# --- 4. Route Table for Public Subnets ---
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.gw.id
  }
  tags = {
    Name = "${var.project_name}-Public-RT"
  }
}

# --- 5. Associate Route Table to Public Subnets ---
resource "aws_route_table_association" "public" {
  count          = 2
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

# --- 6. Elastic IP for NAT Gateway ---
resource "aws_eip" "nat_gw_eip" {
  domain = "vpc"
  tags = { Name = "${var.project_name}-NAT-EIP" }
}

# --- 7. NAT Gateway (Sits in a Public Subnet) ---
resource "aws_nat_gateway" "gw" {
  allocation_id = aws_eip.nat_gw_eip.id
  subnet_id     = aws_subnet.public[0].id # Choose one public subnet
  tags          = { Name = "${var.project_name}-NAT-GW" }
}

# --- 8. Private Subnets (2 zones for HA) ---
resource "aws_subnet" "private" {
  count                   = 2
  vpc_id                  = aws_vpc.main.id
  # 10.0.2.0/24, 10.0.3.0/24
  cidr_block              = cidrsubnet(aws_vpc.main.cidr_block, 8, count.index + 2) 
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = false # Must be false for private subnets

  tags = {
    Name = "${var.project_name}-Private-${count.index + 1}"
  }
}

# --- 9. Route Table for Private Subnets ---
resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id
  route {
    cidr_block = "0.0.0.0/0"
    # Route all outbound traffic through the NAT Gateway
    nat_gateway_id = aws_nat_gateway.gw.id
  }
  tags = {
    Name = "${var.project_name}-Private-RT"
  }
}

# --- 10. Associate Route Table to Private Subnets ---
resource "aws_route_table_association" "private" {
  count          = 2
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private.id
}

# --- 11. RDS DB Subnet Group
resource "aws_db_subnet_group" "rds_subnet_group" {
  subnet_ids = aws_subnet.private[*].id # Use your existing private subnets
  tags = {
    Name = "${var.project_name}-${var.environment}-RDS-Subnet-Group"
  }
}
