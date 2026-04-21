# CloudFormation Templates for AWS Sandbox

This directory contains reusable CloudFormation templates for quickly setting up your AWS sandbox environment.

## 🚀 Quick Start (Easiest Method)

**Use the automated script for a hassle-free setup:**

```bash
cd deployment/cloudformation
./create-fresh-stack.sh
```

This script will:
- Check for existing resources
- Create the CloudFormation stack
- Download your private key
- Set correct permissions

---

## ⚠️ Troubleshooting

If you encounter issues with stuck stacks or resource conflicts:
- See [TROUBLESHOOTING-STUCK-STACK.md](TROUBLESHOOTING-STUCK-STACK.md) for detailed solutions
- Run `./cleanup-stuck-stack.sh` to clean up failed stacks

---

## EC2 Sandbox Setup Template

**File**: `ec2-sandbox-setup.yaml`

### What It Creates

1. **EC2 Key Pair** (`myec2key`)
   - Name: myec2key
   - Type: RSA
   - Format: .pem
   - Automatically stored in AWS Systems Manager Parameter Store

2. **Security Group** (`WebServer-SG`)
   - Name: WebServer-SG
   - Inbound Rules:
     - SSH (port 22) - allowed from 0.0.0.0/0 (all IPv4)
     - HTTP (port 80) - allowed from 0.0.0.0/0 (all IPv4)

---

## Quick Start Guide

### Prerequisites
- AWS CLI installed and configured
- AWS account credentials with appropriate permissions
- Appropriate IAM permissions for CloudFormation, EC2, and SSM

### Step 1: Deploy the Stack

#### Using AWS CLI
```bash
# Navigate to the cloudformation directory
cd deployment/cloudformation

# Create the stack
aws cloudformation create-stack \
  --stack-name ec2-sandbox-setup \
  --template-body file://ec2-sandbox-setup.yaml \
  --parameters ParameterKey=Environment,ParameterValue=sandbox

# Wait for stack creation to complete
aws cloudformation wait stack-create-complete \
  --stack-name ec2-sandbox-setup
```

#### Using AWS Console
1. Go to AWS CloudFormation Console
2. Click "Create stack" → "With new resources"
3. Choose "Upload a template file"
4. Upload `ec2-sandbox-setup.yaml`
5. Stack name: `ec2-sandbox-setup`
6. Environment: `sandbox`
7. Click through to create

### Step 2: Retrieve Your Private Key

After the stack is created, retrieve the private key:

```bash
# Get the Key Pair ID from stack outputs
KEY_PAIR_ID=$(aws cloudformation describe-stacks \
  --stack-name ec2-sandbox-setup \
  --query 'Stacks[0].Outputs[?OutputKey==`KeyPairId`].OutputValue' \
  --output text)

# Download the private key
aws ssm get-parameter \
  --name /ec2/keypair/${KEY_PAIR_ID} \
  --with-decryption \
  --query Parameter.Value \
  --output text > myec2key.pem

# Set correct permissions
chmod 400 myec2key.pem

# Verify the key
ls -l myec2key.pem
```

### Step 3: Verify Resources

```bash
# Check stack status
aws cloudformation describe-stacks \
  --stack-name ec2-sandbox-setup

# List stack outputs
aws cloudformation describe-stacks \
  --stack-name ec2-sandbox-setup \
  --query 'Stacks[0].Outputs'

# Verify key pair
aws ec2 describe-key-pairs --key-names myec2key

# Verify security group
aws ec2 describe-security-groups --group-names WebServer-SG
```

---

## Using the Resources

### Launch an EC2 Instance with These Resources

```bash
# Get the Security Group ID
SG_ID=$(aws cloudformation describe-stacks \
  --stack-name ec2-sandbox-setup \
  --query 'Stacks[0].Outputs[?OutputKey==`SecurityGroupId`].OutputValue' \
  --output text)

# Launch an EC2 instance (example with Amazon Linux 2023)
aws ec2 run-instances \
  --image-id ami-0c55b159cbfafe1f0 \
  --instance-type t2.micro \
  --key-name myec2key \
  --security-group-ids ${SG_ID} \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=WebServer-Test}]'
```

### SSH into Your Instance

```bash
# Get your instance public IP
INSTANCE_IP=$(aws ec2 describe-instances \
  --filters "Name=tag:Name,Values=WebServer-Test" "Name=instance-state-name,Values=running" \
  --query 'Reservations[0].Instances[0].PublicIpAddress' \
  --output text)

# Connect via SSH
ssh -i myec2key.pem ec2-user@${INSTANCE_IP}
```

---

## Cleanup

### Delete Individual Resources
```bash
# Terminate any EC2 instances using the key pair and security group first!

# Delete the stack
aws cloudformation delete-stack --stack-name ec2-sandbox-setup

# Wait for deletion to complete
aws cloudformation wait stack-delete-complete --stack-name ec2-sandbox-setup
```

### Important Notes on Cleanup
⚠️ **Before deleting the stack:**
1. Terminate all EC2 instances using the key pair
2. Remove the security group from any network interfaces
3. The private key in Parameter Store will be automatically deleted
4. Save a backup of your private key if needed

---

## Reusing the Template

### For Different Environments

```bash
# Create a dev environment stack
aws cloudformation create-stack \
  --stack-name ec2-dev-setup \
  --template-body file://ec2-sandbox-setup.yaml \
  --parameters ParameterKey=Environment,ParameterValue=dev
```

### Updating the Stack

```bash
# Update existing stack with template changes
aws cloudformation update-stack \
  --stack-name ec2-sandbox-setup \
  --template-body file://ec2-sandbox-setup.yaml
```

---

## Security Best Practices

### ⚠️ Important Security Considerations

1. **Key Pair Storage**
   - Keep your `.pem` file secure and never commit it to version control
   - Set permissions to 400: `chmod 400 myec2key.pem`
   - Store backup in a secure location (password manager, encrypted storage)

2. **Security Group Rules**
   - The template allows SSH and HTTP from anywhere (0.0.0.0/0)
   - **For production**: Restrict to specific IP ranges
   - Consider adding HTTPS (port 443) if needed

3. **Production Modifications**
   - For production environments, modify the security group to restrict access:
   ```yaml
   CidrIp: YOUR_IP_ADDRESS/32  # Replace with your specific IP
   ```

4. **AWS Parameter Store**
   - Private keys are automatically stored in AWS Systems Manager Parameter Store
   - They are encrypted at rest
   - Access is logged in CloudTrail

---

## Customization Options

### Adding More Security Group Rules

Add to the `SecurityGroupIngress` section:

```yaml
# HTTPS access
- IpProtocol: tcp
  FromPort: 443
  ToPort: 443
  CidrIp: 0.0.0.0/0
  Description: HTTPS access from anywhere

# Custom application port
- IpProtocol: tcp
  FromPort: 8080
  ToPort: 8080
  CidrIp: 0.0.0.0/0
  Description: Custom app port
```

### Adding Outbound Rules

```yaml
SecurityGroupEgress:
  - IpProtocol: -1
    CidrIp: 0.0.0.0/0
    Description: Allow all outbound traffic
```

---

## Troubleshooting

### Key Pair Already Exists
```bash
# Delete existing key pair first
aws ec2 delete-key-pair --key-name myec2key

# Then recreate the stack
```

### Security Group Already Exists
```bash
# Delete existing security group
aws ec2 delete-security-group --group-name WebServer-SG

# Then recreate the stack
```

### Cannot Retrieve Private Key
```bash
# Verify the parameter exists
aws ssm get-parameter --name /ec2/keypair/KEY_PAIR_ID

# Check IAM permissions for SSM
```

### Stack Rollback
```bash
# Check stack events for errors
aws cloudformation describe-stack-events \
  --stack-name ec2-sandbox-setup \
  --max-items 10
```

---

## Additional Resources

- [AWS CloudFormation Documentation](https://docs.aws.amazon.com/cloudformation/)
- [EC2 Key Pairs](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-key-pairs.html)
- [EC2 Security Groups](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-security-groups.html)
- [AWS Systems Manager Parameter Store](https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-parameter-store.html)

---

## Template Version History

- **v1.0** - Initial template with EC2 Key Pair and Security Group
