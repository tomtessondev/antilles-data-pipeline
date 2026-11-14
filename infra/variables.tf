variable "region" {
  description = "Region of the lake. Free-plan accounts are locked to the region they were created in."
  type        = string
  default     = "us-east-2"
}

variable "github_repository" {
  description = "owner/name of the repository whose daily workflow writes to the lake."
  type        = string
  default     = "tomtessondev/antilles-data-pipeline"
}

variable "ci_auth" {
  description = <<-EOT
    How the GitHub workflow gets AWS credentials:
    - "oidc": short-lived credentials from an IAM role trusted through GitHub OIDC (preferred);
    - "iam_user": a dedicated IAM user whose access key is stored as a GitHub secret. Used
      here because free-plan accounts deny iam:CreateOpenIDConnectProvider.
  EOT
  type        = string
  default     = "iam_user"

  validation {
    condition     = contains(["oidc", "iam_user"], var.ci_auth)
    error_message = "ci_auth must be \"oidc\" or \"iam_user\"."
  }
}

variable "budget_email" {
  description = "Where the monthly budget alerts go; null to skip the budget."
  type        = string
  default     = null
}

variable "budget_limit_usd" {
  type    = string
  default = "1"
}
