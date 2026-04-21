# 🚀 EC2 Sandbox Quick Reference

## The Issue You Experienced

**Problem:** CloudFormation's `AWS::EC2::KeyPair` resource has a deletion bug that causes stacks to fail during rollback/deletion.

**Symptom:** 
- KeyPair creates successfully
- Stack fails and tries to rollback
- KeyPair deletion fails with "InternalFailure"
- Stack gets stuck in DELETE_FAILED or ROLLBACK_FAILED state

**Root Cause:** CloudFormation fails to properly delete the AWS Systems Manager Parameter Store entry where the private key is stored.

---

## ✅ The Fix (Choose One)

### Option 1: Reliable Approach (RECOMMENDED) ⭐

**Create KeyPair manually + Security Group via CloudFormation**

```bash
cd deployment/cloudformation
./setup-sandbox-reliable.sh
```

**What it does:**
- ✅ Creates KeyPair via AWS CLI (no CloudFormation involvement)
- ✅ Creates Security Group via CloudFormation  
- ✅ Saves private key to `sandbox-ec2-key.pem`
- ✅ No deletion issues ever

**Resources created:**
- Key Pair: `sandbox-ec2-key`
- Security Group: `WebServer-SG`
- CloudFormation Stack: `ec2-sandbox`

---

### Option 2: All-CloudFormation with Retain Policy

**Both resources via CloudFormation, KeyPair won't auto-delete**

```bash
cd deployment/cloudformation
./setup-with-keypair-retain.sh
```

**What it does:**
- ✅ Creates both via CloudFormation
- ✅ KeyPair has `DeletionPolicy: Retain` (won't be deleted with stack)
- ✅ Saves private key to `sandbox-key.pem`
- ✅ No deletion issues

**Resources created:**
- Key Pair: `sandbox-key`
- Security Group: `WebServer-SG`
- CloudFormation Stack: `ec2-sandbox-keypair`

⚠️ **Note:** You must manually delete the KeyPair when you delete the stack

---

## 📋 Files Overview

| File | Purpose |
|------|---------|
| `ec2-sandbox-sg-only.yaml` | Template for Option 1 (SG only) |
| `setup-sandbox-reliable.sh` | Script for Option 1 |
| `ec2-sandbox-with-keypair.yaml` | Template for Option 2 (with Retain) |
| `setup-with-keypair-retain.sh` | Script for Option 2 |
| `SOLUTION-EXPLANATION.md` | Detailed explanation of the issue |
| `cleanup-stuck-stack.sh` | Helper to clean up failed stacks |

---

## 🎯 Recommended Workflow

### 1. Setup (One-time)
```bash
cd deployment/cloudformation
./setup-sandbox-reliable.sh
```

### 2. Launch an Instance
```bash
# Get Security Group ID
SG_ID=$(aws cloudformation describe-stacks \
  --stack-name ec2-sandbox \
  --query 'Stacks[0].Outputs[?OutputKey==`SecurityGroupId`].OutputValue' \
  --output text)

# Launch EC2 instance
aws ec2 run-instances \
  --image-id ami-0c55b159cbfafe1f0 \
  --instance-type t2.micro \
  --key-name sandbox-ec2-key \
  --security-group-ids $SG_ID \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=MyWebServer}]'
```

### 3. Connect to Instance
```bash
# Get instance IP
INSTANCE_IP=$(aws ec2 describe-instances \
  --filters "Name=tag:Name,Values=MyWebServer" "Name=instance-state-name,Values=running" \
  --query 'Reservations[0].Instances[0].PublicIpAddress' \
  --output text)

# SSH connect
ssh -i sandbox-ec2-key.pem ec2-user@$INSTANCE_IP
```

### 4. Cleanup
```bash
# Terminate instances first
aws ec2 terminate-instances --instance-ids <instance-id>

# Delete CloudFormation stack
aws cloudformation delete-stack --stack-name ec2-sandbox

# Delete key pair
aws ec2 delete-key-pair --key-name sandbox-ec2-key
rm sandbox-ec2-key.pem
```

---

## 🔧 Troubleshooting

### Stuck Stack?
```bash
./cleanup-stuck-stack.sh ec2-sandbox-setup
```

Or delete via AWS Console:
1. Go to CloudFormation Console
2. Select the stuck stack
3. Click Delete
4. Confirm deletion

### Key Pair Already Exists?
```bash
aws ec2 delete-key-pair --key-name sandbox-ec2-key
```

### Want to Use a Different Name?
Edit the script and change:
```bash
KEY_NAME="your-custom-name"
SG_NAME="your-custom-sg-name"
```

---

## 📚 Additional Resources

- Full explanation: [SOLUTION-EXPLANATION.md](SOLUTION-EXPLANATION.md)
- Detailed docs: [README.md](README.md)
- Stuck stack help: [TROUBLESHOOTING-STUCK-STACK.md](TROUBLESHOOTING-STUCK-STACK.md)

---

## 💡 Key Takeaways

1. **CloudFormation KeyPair deletion is buggy** - this is a known AWS issue
2. **Solution 1 is most reliable** - separate KeyPair management from CloudFormation
3. **Always check for existing resources** before creating stacks
4. **Use unique names** for different environments/projects
5. **DeletionPolicy: Retain** is the workaround if you want all-CloudFormation

---

**Happy AWS Learning! 🎓**
