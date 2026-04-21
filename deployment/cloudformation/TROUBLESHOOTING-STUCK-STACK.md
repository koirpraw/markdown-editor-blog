# Troubleshooting: Stuck CloudFormation Stack

## Current Situation

The `ec2-sandbox-setup` stack is stuck in `DELETE_FAILED` state. This happened because:

1. A key pair `myec2key` already existed when CloudFormation tried to create it
2. The stack creation failed and tried to rollback
3. During rollback, CloudFormation couldn't delete the key pair (AWS internal error)
4. The stack is now stuck in DELETE_FAILED state

## Good News

The actual AWS resources (key pair and security group) have been successfully cleaned up:
- ✅ Key pair `myec2key`: DELETED
- ✅ Security group `WebServer-SG`: DELETED
- ⚠️  CloudFormation stack: STUCK in DELETE_FAILED state

## Solution Options

### Option 1: Delete the Stuck Stack via AWS Console (Recommended - Easiest)

1. Open [AWS CloudFormation Console](https://console.aws.amazon.com/cloudformation)
2. Find the stack named `ec2-sandbox-setup`
3. Select it and click **Delete**
4. If prompted, select **Delete stack**
5. The stack should delete within a few seconds

### Option 2: Use AWS CLI with Force Delete

```bash
cd deployment/cloudformation

# List all resources in the stuck stack
aws cloudformation list-stack-resources --stack-name ec2-sandbox-setup

# Delete with retention of all resources
aws cloudformation delete-stack \
  --stack-name ec2-sandbox-setup \
  --retain-resources MyEC2KeyPair WebServerSecurityGroup
```

### Option 3: Create New Stack with Different Name (Quickest)

Since all resources are cleaned up, you can simply create a new stack with a different name:

```bash
cd deployment/cloudformation

# Create with a new stack name
aws cloudformation create-stack \
  --stack-name my-ec2-sandbox \
  --template-body file://ec2-sandbox-setup.yaml \
  --parameters ParameterKey=Environment,ParameterValue=sandbox

# Wait for completion
aws cloudformation wait stack-create-complete --stack-name my-ec2-sandbox

# Get the key pair ID
KEY_PAIR_ID=$(aws cloudformation describe-stacks \
  --stack-name my-ec2-sandbox \
  --query 'Stacks[0].Outputs[?OutputKey==`KeyPairId`].OutputValue' \
  --output text)

# Download your private key
aws ssm get-parameter \
  --name /ec2/keypair/${KEY_PAIR_ID} \
  --with-decryption \
  --query Parameter.Value \
  --output text > myec2key.pem

chmod 400 myec2key.pem
```

## Why This Happened

CloudFormation's `AWS::EC2::KeyPair` resource has a known issue where:
1. It fails during deletion in certain AWS regions or under specific conditions
2. The deletion failure causes the stack to enter DELETE_FAILED state
3. Even though the actual key pair is deleted, CloudFormation gets stuck

## Prevention for Future

To avoid this issue in the future:

1. **Always check for existing resources before creating a stack:**
   ```bash
   aws ec2 describe-key-pairs --key-names myec2key
   aws ec2 describe-security-groups --group-names WebServer-SG
   ```

2. **Delete any existing resources manually first:**
   ```bash
   aws ec2 delete-key-pair --key-name myec2key
   aws ec2 delete-security-group --group-name WebServer-SG
   ```

3. **Use unique stack names** for different environments:
   - `ec2-sandbox-dev`
   - `ec2-sandbox-test`
   - `ec2-sandbox-prod`

## Next Steps

**Recommended Action:** Use **Option 3** above to create a new stack with the name `my-ec2-sandbox`. This avoids the stuck stack entirely and gets you up and running immediately.

The old stuck stack can be cleaned up later via the AWS Console when convenient.
