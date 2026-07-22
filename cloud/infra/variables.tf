variable "project" {
  type    = string
  default = "weatherapplication"
}

variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "spa_origin" {
  description = "Public URL of the SPA, used for the API CORS allow-list."
  type        = string
  default     = "http://localhost:5173"
}

variable "mongodb_uri" {
  description = "MongoDB connection string (e.g. MongoDB Atlas). Empty -> the API uses its bundled in-memory country seed."
  type        = string
  default     = ""
  sensitive   = true
}

variable "domain_name" {
  description = "Optional custom domain for the SPA (leave empty to use the CloudFront domain)."
  type        = string
  default     = ""
}

variable "hosted_zone_id" {
  description = "Route 53 hosted zone id (required only when domain_name is set)."
  type        = string
  default     = ""
}

variable "api_cpu" {
  type    = string
  default = "1024" # 1 vCPU
}

variable "api_memory" {
  type    = string
  default = "2048" # 2 GB
}

variable "alarm_email" {
  description = "Optional email for CloudWatch alarm notifications (leave empty to skip)."
  type        = string
  default     = ""
}

variable "latency_p95_threshold_ms" {
  description = "Alarm when App Runner p95 request latency exceeds this (ms)."
  type        = number
  default     = 1500
}
