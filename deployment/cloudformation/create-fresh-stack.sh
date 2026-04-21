#!/bin/bash
# Quick script to create a fresh EC2 sandbox environment
# This avoids the stuck stack by using a different name

set -e  # Exit on error

STACK_NAME="my-ec2-sandbox"
TEMPLATE_FILE="ec2-sandbox-setup.yaml"

echo "╔════════════════════════════════════════════════╗"
echo "║   EC2 Sandbox Setup - Fresh Stack Creation    ║"
echo "╚════════════════════════════════════════════════╝"
echo ""

# Check if template exists
if [ ! -f "$TEMPLATE_FILE" ]; then
    echo "❌ Error: Template file '$TEMPLATE_FILE' not found!"
    echo "   Please run this script from the cloudformation directory."
    exit 1
fi

# Check for existing resources
echo "1️⃣  Checking for existing resources..."
if aws ec2 describe-key-pairs --key-names myec2key &>/dev/null; then
    echo "⚠️   Key pair 'myec2key' already exists!"
    read -p "   Delete it and continue? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        aws ec2 delete-key-pair --key-name myec2key
        echo "   ✓ Deleted existing key pair"
    else
        echo "   ⛔ Aborted. Please delete the key pair manually first."
        exit 1
    fi
else
    echo "   ✓ No conflicting key pair found"
fi

if aws ec2 describe-security-groups --group-names WebServer-SG &>/dev/null; then
    echo "⚠️   Security group 'WebServer-SG' already exists!"
    SG_ID=$(aws ec2 describe-security-groups --group-names WebServer-SG --query 'SecurityGroups[0].GroupId' --output text)
    echo "   Group ID: $SG_ID"
    read -p "   Delete it and continue? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        aws ec2 delete-security-group --group-id $SG_ID
        echo "   ✓ Deleted existing security group"
    else
        echo "   ⛔ Aborted. Please delete the security group manually first."
        exit 1
    fi
else
    echo "   ✓ No conflicting security group found"
fi

# Create the stack
echo ""
echo "2️⃣  Creating CloudFormation stack '$STACK_NAME'..."
aws cloudformation create-stack \
  --stack-name $STACK_NAME \
  --template-body file://$TEMPLATE_FILE \
  --parameters ParameterKey=Environment,ParameterValue=sandbox

echo "   ✓ Stack creation initiated"

# Wait for completion
echo ""
echo "3️⃣  Waiting for stack creation to complete (this may take 1-2 minutes)..."
aws cloudformation wait stack-create-complete --stack-name $STACK_NAME

echo "   ✅ Stack created successfully!"

# Get outputs
echo ""
echo "4️⃣  Retrieving stack outputs..."
KEY_PAIR_ID=$(aws cloudformation describe-stacks \
  --stack-name $STACK_NAME \
  --query 'Stacks[0].Outputs[?OutputKey==`KeyPairId`].OutputValue' \
  --output text)

SG_ID=$(aws cloudformation describe-stacks \
  --stack-name $STACK_NAME \
  --query 'Stacks[0].Outputs[?OutputKey==`SecurityGroupId`].OutputValue' \
  --output text)

echo "   Key Pair ID: $KEY_PAIR_ID"
echo "   Security Group ID: $SG_ID"

# Download private key
echo ""
echo "5️⃣  Downloading private key..."
aws ssm get-parameter \
  --name /ec2/keypair/${KEY_PAIR_ID} \
  --with-decryption \
  --query Parameter.Value \
  --output text > myec2key.pem

chmod 400 myec2key.pem

echo "   ✓ Private key saved to: myec2key.pem"
echo "   ✓ Permissions set to 400"

# Success summary
echo ""
echo "╔════════════════════════════════════════════════╗"
echo "║              🎉  SUCCESS!  🎉                  ║"
echo "╚════════════════════════════════════════════════╝"
echo ""
echo "Your EC2 sandbox environment is ready!"
echo ""
echo "Resources created:"
echo "  • Stack Name: $STACK_NAME"
echo "  • Key Pair: myec2key (myec2key.pem)"
echo "  • Security Group: WebServer-SG (ID: $SG_ID)"
echo ""
echo "Next steps:"
echo "  1. Launch an EC2 instance using these resources"
echo "  2. Use 'myec2key.pem' to SSH into your instances"
echo ""
echo "To view all stack outputs:"
echo "  aws cloudformation describe-stacks --stack-name $STACK_NAME --query 'Stacks[0].Outputs'"
echo ""
