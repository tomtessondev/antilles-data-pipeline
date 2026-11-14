# What the daily GitHub workflow may do: list the lake, read and add Parquet files. No
# delete, no other bucket, nothing outside S3.

data "aws_iam_policy_document" "lake_read_write" {
  statement {
    sid       = "ListLake"
    actions   = ["s3:ListBucket"]
    resources = [aws_s3_bucket.lake.arn]
  }
  statement {
    sid = "ReadAndAppendLakeFiles"
    actions = [
      "s3:GetObject",
      "s3:PutObject",
      "s3:AbortMultipartUpload",
    ]
    resources = ["${aws_s3_bucket.lake.arn}/*"]
  }
}

# --- ci_auth = "iam_user" -------------------------------------------------------------
# The access key is created outside Terraform (see README.md) so the secret never lands
# in the state file.

resource "aws_iam_user" "ci" {
  count = var.ci_auth == "iam_user" ? 1 : 0
  name  = "antilles-pipeline-ci"
  path  = "/ci/"
}

resource "aws_iam_user_policy" "ci_lake" {
  count  = var.ci_auth == "iam_user" ? 1 : 0
  name   = "lake-read-write"
  user   = aws_iam_user.ci[0].name
  policy = data.aws_iam_policy_document.lake_read_write.json
}

# --- ci_auth = "oidc" ------------------------------------------------------------------

resource "aws_iam_openid_connect_provider" "github" {
  count          = var.ci_auth == "oidc" ? 1 : 0
  url            = "https://token.actions.githubusercontent.com"
  client_id_list = ["sts.amazonaws.com"]
}

data "aws_iam_policy_document" "github_trust" {
  count = var.ci_auth == "oidc" ? 1 : 0
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]
    principals {
      type        = "Federated"
      identifiers = [aws_iam_openid_connect_provider.github[0].arn]
    }
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }
    # Only workflows running on main of this repository: a pull request or another
    # branch cannot assume the role.
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:sub"
      values   = ["repo:${var.github_repository}:ref:refs/heads/main"]
    }
  }
}

resource "aws_iam_role" "ci" {
  count              = var.ci_auth == "oidc" ? 1 : 0
  name               = "antilles-pipeline-ci"
  assume_role_policy = data.aws_iam_policy_document.github_trust[0].json
}

resource "aws_iam_role_policy" "ci_lake" {
  count  = var.ci_auth == "oidc" ? 1 : 0
  name   = "lake-read-write"
  role   = aws_iam_role.ci[0].id
  policy = data.aws_iam_policy_document.lake_read_write.json
}
