# Summary: CloudFormation Template Setup for AWS EC2 Sandbox

## What Was Created

I've created a complete CloudFormation setup for your AWS sandbox environment with the following files:

### 📁 Files Created

1. **`ec2-sandbox-setup.yaml`** - Main CloudFormation template
   - Creates EC2 Key Pair (myec2key, RSA, .pem format)
   - Creates Security Group (WebServer-SG) with SSH and HTTP access
   - Stores private key in AWS Systems Manager Parameter Store
   - Includes parameterized environment support

2. **`README.md`** - Complete usage documentation
   - Quick start guide
   - AWS CLI and Console instructions
   - Examples for launching EC2 instances
   - Cleanup procedures
   - Security best practices

3. **`create-fresh-stack.sh`** - Automated setup script ⭐ **RECOMMENDED**
   - Interactive script that handles the entire setup
   - Checks for existing resources
   - Creates the stack
   - Downloads your private key automatically
   - Sets correct permissions

4. **`cleanup-stuck-stack.sh`** - Troubleshooting helper
   - Cleans up stuck CloudFormation stacks
   - Useful for DELETE_FAILED or ROLLBACK_FAILED states

5. **`TROUBLESHOOTING-STUCK-STACK.md`** - Troubleshooting guide
   - Detailed explanation of common issues
   - Multiple solution options
   - Prevention tips

6. **`.gitignore`** - Protection for sensitive files
   - Prevents accidental commit of private keys
   - Ignores temporary files

---

## 🎯 How to Use (Recommended Path)

### Option 1: Use the Automated Script (Easiest)

```bash
cd /Users/prawegko/code-space/nextjsProjects/markdown-editor-blog/deployment/cloudformation
./create-fresh-stack.sh
```

This will:
1. ✓ Check for conflicting resources
2. ✓ Create the CloudFormation stack
3. ✓ Wait for completion
4. ✓ Download your private key (`myec2key.pem`)
5. ✓ Set permissions to 400

### Option 2: Manual AWS CLI Commands

```bash
cd deployment/cloudformation

# Create the stack
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

# Download private key
aws ssm get-parameter \
  --name /ec2/keypair/${KEY_PAIR_ID} \
  --with-decryption \
  --query Parameter.Value \
  --output text > myec2key.pem

chmod 400 myec2key.pem
```

---

## 🔧 About the Initial Error

You encountered an error because:
1. A key pair named `myec2key` already existed in your AWS account
2. CloudFormation couldn't create a duplicate and the stack failed
3. During rollback, the stack got stuck in a failed state

This is a known issue with CloudFormation's EC2 KeyPair resource.

**Current Status:**
- ❌ Old stack: `ec2-sandbox-setup` is stuck in DELETE_FAILED state
- ✅ Resources: All cleaned up (key pair and security group deleted)
- ✅ Solution: Use the script above to create a fresh stack with a different name

---

## 📖 Next Steps After Stack Creation

### 1. Launch an EC2 Instance

```bash
# Get your security group ID
SG_ID=$(aws cloudformation describe-stacks \
  --stack-name my-ec2-sandbox \
  --query 'Stacks[0].Outputs[?OutputKey==`SecurityGroupId`].OutputValue' \
  --output text)

# Launch an instance (Amazon Linux 2023 example)
aws ec2 run-instances \
  --image-id ami-0c55b159cbfafe1f0 \
  --instance-type t2.micro \
  --key-name myec2key \
  --security-group-ids ${SG_ID} \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=MyWebServer}]'
```

### 2. SSH into Your Instance

```bash
# Get instance public IP
INSTANCE_IP=$(aws ec2 describe-instances \
  --filters "Name=tag:Name,Values=MyWebServer" "Name=instance-state-name,Values=running" \
  --query 'Reservations[0].Instances[0].PublicIpAddress' \
  --output text)

# Connect
ssh -i myec2key.pem ec2-user@${INSTANCE_IP}
```

### 3. Clean Up When Done

```bash
# Terminate instances first
aws ec2 terminate-instances --instance-ids i-xxxxx

# Delete the stack
aws cloudformation delete-stack --stack-name my-ec2-sandbox
```

---

## 🔒 Security Notes

**Important:** The template currently allows SSH and HTTP from anywhere (0.0.0.0/0):
- ✅ Perfect for learning and sandbox environments
- ⚠️  **NOT recommended for production**

For production, modify the security group to restrict access:
```yaml
CidrIp: YOUR_IP_ADDRESS/32  # Replace with your specific IP
```

---

## 🎓 Learning & Training Benefits

This setup is ideal for AWS training because:

1. **Reusable**: Run the script anytime to recreate your environment
2. **Fast**: Complete setup in under 2 minutes
3. **Clean**: Easy to tear down and start fresh
4. **Safe**: Sandboxed environment for experimentation
5. **Best Practices**: Uses CloudFormation infrastructure-as-code
6. **Cost-Effective**: Can delete everything with one command

---

## 📚 Additional Resources

- [AWS CloudFormation Documentation](https://docs.aws.amazon.com/cloudformation/)
- [EC2 Key Pairs](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-key-pairs.html)
- [EC2 Security Groups](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-security-groups.html)
- [AWS Free Tier](https://aws.amazon.com/free/) - Use t2.micro for free tier eligibility

---

## ❓ Need Help?

If you encounter any issues:
1. Check [TROUBLESHOOTING-STUCK-STACK.md](TROUBLESHOOTING-STUCK-STACK.md)
2. Run `./cleanup-stuck-stack.sh` for stuck stacks
3. Verify AWS CLI credentials: `aws sts get-caller-identity`
4. Check your AWS region: `aws configure get region`

---

**Happy Learning! 🚀**
