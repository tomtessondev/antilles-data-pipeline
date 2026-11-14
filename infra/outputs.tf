output "lake_url" {
  description = "Value for the ANTILLES_LAKE_URL repository variable."
  value       = "s3://${aws_s3_bucket.lake.bucket}"
}

output "ci_user_name" {
  description = "IAM user whose access key goes into the GitHub secrets (ci_auth = iam_user)."
  value       = one(aws_iam_user.ci[*].name)
}

output "ci_role_arn" {
  description = "Value for the AWS_ROLE_ARN repository variable (ci_auth = oidc)."
  value       = one(aws_iam_role.ci[*].arn)
}
