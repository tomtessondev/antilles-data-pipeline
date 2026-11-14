# Infrastructure

Terraform for the AWS side of the pipeline, in `us-east-2`.

| Resource | Why |
| --- | --- |
| `antilles-tfstate-<account>` (bootstrap/) | Terraform state: versioned, encrypted, private; locked with S3 native lock files |
| `antilles-lake-<account>` | The raw landing zone written by `lake.py`: private, SSE-S3, TLS only, incomplete multipart uploads aborted after a day |
| `antilles-pipeline-ci` | Identity of the daily GitHub workflow: `s3:ListBucket` on the lake, `GetObject`/`PutObject`/`AbortMultipartUpload` on its objects, nothing else (no delete) |
| `antilles-monthly` budget | E-mail at 80 % of 1 USD actual spend, or when the forecast exceeds it |

## CI authentication

`ci_auth = "oidc"` creates the GitHub OIDC provider and a role that only workflows on
`main` of this repository can assume: no stored keys. The account used here is on the AWS
free plan, whose organisation denies `iam:CreateOpenIDConnectProvider`, so the default is
`ci_auth = "iam_user"`: a dedicated IAM user with the same bucket-only policy. Its access
key is created with the CLI, piped straight into the GitHub secrets, and never stored in
the Terraform state.

## First setup

```bash
export AWS_PROFILE=antilles                       # aws login --profile antilles

cd infra/bootstrap && terraform init && terraform apply    # state bucket, local state
cd .. && cp backend.hcl.example backend.hcl                # put the bucket name in it
cp terraform.tfvars.example terraform.tfvars               # budget e-mail
terraform init -backend-config=backend.hcl && terraform plan && terraform apply

# CI access key, never printed:
aws iam create-access-key --user-name antilles-pipeline-ci \
  --query 'AccessKey.[AccessKeyId,SecretAccessKey]' --output text |
  (read -r id secret; gh secret set AWS_ACCESS_KEY_ID --body "$id";
   gh secret set AWS_SECRET_ACCESS_KEY --body "$secret")
gh variable set AWS_AUTH --body iam_user
gh variable set AWS_REGION --body us-east-2
gh variable set LAKE_S3_URL --body "$(terraform output -raw lake_url)"
```

To rotate the key: create a second one the same way (the secrets are overwritten), check
that the daily run passes, then delete the old key with `aws iam delete-access-key`.

`backend.hcl` and `terraform.tfvars` are git-ignored: they hold the account-specific bucket
name and the alert e-mail.
