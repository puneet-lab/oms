variable "aws_profile" {
  type        = string
  default     = "personal"
  description = "AWS CLI profile to use"
}

variable "aws_region" {
  type        = string
  default     = "ap-southeast-1"
  description = "AWS region to deploy resources in"
}

variable "cluster_name" {
  type        = string
  default     = "oms-cluster"
  description = "Name of the EKS cluster"
}

variable "ecr_repo_name" {
  type        = string
  default     = "oms-app"
  description = "Name of the ECR repository"
}

variable "node_instance_type" {
  type        = string
  default     = "t3.medium"
  description = "EC2 instance type for EKS worker nodes"
}

variable "node_desired_size" {
  type        = number
  default     = 1
}

variable "node_max_size" {
  type        = number
  default     = 2
}

variable "node_min_size" {
  type        = number
  default     = 1
}
