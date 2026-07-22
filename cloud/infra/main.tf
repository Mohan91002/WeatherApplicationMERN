terraform {
  required_version = ">= 1.6"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# CloudFront ACM certificates must live in us-east-1.
provider "aws" {
  alias  = "use1"
  region = "us-east-1"
}

locals {
  spa_bucket = "${var.project}-spa"
}

# ---------------------------------------------------------------------------
# API: ECR + App Runner
# ---------------------------------------------------------------------------
resource "aws_ecr_repository" "api" {
  name                 = "${var.project}-api"
  image_tag_mutability = "MUTABLE"
  image_scanning_configuration { scan_on_push = true }
}

# Role App Runner uses to pull from ECR.
resource "aws_iam_role" "apprunner_ecr" {
  name = "${var.project}-apprunner-ecr"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "build.apprunner.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "apprunner_ecr" {
  role       = aws_iam_role.apprunner_ecr.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSAppRunnerServicePolicyForECRAccess"
}

resource "aws_apprunner_service" "api" {
  service_name = "${var.project}-api"

  source_configuration {
    authentication_configuration {
      access_role_arn = aws_iam_role.apprunner_ecr.arn
    }
    image_repository {
      image_identifier      = "${aws_ecr_repository.api.repository_url}:latest"
      image_repository_type = "ECR"
      image_configuration {
        port = "8080"
        runtime_environment_variables = {
          NODE_ENV             = "production"
          PORT                 = "8080"
          CORS_ALLOWED_ORIGINS = var.spa_origin
          # MongoDB connection string (e.g. MongoDB Atlas). Empty -> the API runs
          # on its bundled in-memory country seed.
          MONGODB_URI = var.mongodb_uri
        }
      }
    }
    auto_deployments_enabled = false # CI triggers deploys explicitly
  }

  instance_configuration {
    cpu    = var.api_cpu
    memory = var.api_memory
  }

  health_check_configuration {
    protocol = "HTTP"
    path     = "/health"
    interval = 10
    timeout  = 5
  }

  # Let CI update the image tag without Terraform reporting drift.
  lifecycle {
    ignore_changes = [source_configuration[0].image_repository[0].image_identifier]
  }
}

# ---------------------------------------------------------------------------
# SPA: S3 (private) + CloudFront (OAC)
# ---------------------------------------------------------------------------
resource "aws_s3_bucket" "spa" {
  bucket = local.spa_bucket
}

resource "aws_s3_bucket_public_access_block" "spa" {
  bucket                  = aws_s3_bucket.spa.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_cloudfront_origin_access_control" "spa" {
  name                              = "${var.project}-oac"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# Optional custom-domain certificate (us-east-1).
resource "aws_acm_certificate" "spa" {
  count             = var.domain_name == "" ? 0 : 1
  provider          = aws.use1
  domain_name       = var.domain_name
  validation_method = "DNS"
  lifecycle { create_before_destroy = true }
}

resource "aws_cloudfront_distribution" "spa" {
  enabled             = true
  default_root_object = "index.html"
  aliases             = var.domain_name == "" ? [] : [var.domain_name]

  origin {
    domain_name              = aws_s3_bucket.spa.bucket_regional_domain_name
    origin_id                = "spa-s3"
    origin_access_control_id = aws_cloudfront_origin_access_control.spa.id
  }

  default_cache_behavior {
    target_origin_id       = "spa-s3"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    # AWS managed "CachingOptimized" policy.
    cache_policy_id = "658327ea-f89d-4fab-a63d-7e88639e58f6"
  }

  # SPA routing: send 403/404 to index.html so client-side routes resolve.
  custom_error_response {
    error_code         = 403
    response_code      = 200
    response_page_path = "/index.html"
  }
  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"
  }

  restrictions {
    geo_restriction { restriction_type = "none" }
  }

  viewer_certificate {
    cloudfront_default_certificate = var.domain_name == "" ? true : false
    acm_certificate_arn            = var.domain_name == "" ? null : aws_acm_certificate.spa[0].arn
    ssl_support_method             = var.domain_name == "" ? null : "sni-only"
    minimum_protocol_version       = var.domain_name == "" ? "TLSv1" : "TLSv1.2_2021"
  }
}

# Allow only this CloudFront distribution to read the bucket.
resource "aws_s3_bucket_policy" "spa" {
  bucket = aws_s3_bucket.spa.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "cloudfront.amazonaws.com" }
      Action    = "s3:GetObject"
      Resource  = "${aws_s3_bucket.spa.arn}/*"
      Condition = {
        StringEquals = { "AWS:SourceArn" = aws_cloudfront_distribution.spa.arn }
      }
    }]
  })
}

# Optional DNS record for the custom domain.
resource "aws_route53_record" "spa" {
  count   = var.domain_name == "" ? 0 : 1
  zone_id = var.hosted_zone_id
  name    = var.domain_name
  type    = "A"
  alias {
    name                   = aws_cloudfront_distribution.spa.domain_name
    zone_id                = aws_cloudfront_distribution.spa.hosted_zone_id
    evaluate_target_health = false
  }
}

# ---------------------------------------------------------------------------
# Observability
# ---------------------------------------------------------------------------
resource "aws_cloudwatch_log_group" "api" {
  name              = "/aws/apprunner/${var.project}-api"
  retention_in_days = 30
}

# ---------------------------------------------------------------------------
# Outputs
# ---------------------------------------------------------------------------
output "ecr_repository_url" { value = aws_ecr_repository.api.repository_url }
output "api_url" { value = "https://${aws_apprunner_service.api.service_url}" }
output "spa_bucket" { value = aws_s3_bucket.spa.bucket }
output "cloudfront_domain" { value = aws_cloudfront_distribution.spa.domain_name }
output "cloudfront_id" { value = aws_cloudfront_distribution.spa.id }
