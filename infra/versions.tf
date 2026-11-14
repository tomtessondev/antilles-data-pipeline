terraform {
  required_version = ">= 1.10"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }

  # Bucket name in backend.hcl (see backend.hcl.example), created by bootstrap/.
  # use_lockfile: native S3 state locking, no DynamoDB table needed.
  backend "s3" {
    key          = "antilles/terraform.tfstate"
    region       = "us-east-2"
    encrypt      = true
    use_lockfile = true
  }
}

provider "aws" {
  region = var.region
  default_tags {
    tags = {
      Project   = "antilles-data-pipeline"
      ManagedBy = "terraform"
    }
  }
}

data "aws_caller_identity" "current" {}
