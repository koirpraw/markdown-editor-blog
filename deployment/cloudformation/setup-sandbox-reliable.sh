#!/bin/bash
# Complete EC2 Sandbox Setup - Creates Key Pair Manually + Security Group via CloudFormation
# This approach avoids CloudFormation KeyPair deletion issues

set -e

STACK_NAME="ec2-sandbox"
KEY_NAME="sandbox-ec2-key"
SG_NAME="WebServer-SG"
TEMPLATE_FILE="ec2-sandbox-sg-only.yaml"

echo "╔════════════════════════════════════════════════╗"
echo "║   EC2 Sandbox Complete Setup (Reliable)       ║"
echo "╚════════════════════════════════════════════════╝"
echo ""

# Check if template exists
if [ ! -f "$TEMPLATE_FILE" ]; then
    echo "❌ Error: Template file '$TEMPLATE_FILE' not found!"
    exit 1
fi

# Step 1: Create Key Pair Manually
echo "1️⃣  Creating EC2 Key Pair manually..."

if aws ec2 describe-key-pairs --key-names "$KEY_NAME" &>/dev/null; then
    echo "⚠️   Key pair '$KEY_NAME' already exists!"
    read -p "   Delete and recreate? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        aws ec2 delete-key-pair --key-name "$KEY_NAME"
        echo "   ✓ Deleted existing key pair"
    else
        echo "   → Using existing key pair"
    fi
fi

if ! aws ec2 describe-key-pairs --key-names "$KEY_NAME" &>/dev/null; then
    echo "   Creating new key pair..."
    aws ec2 create-key-pair \
        --key-name "$KEY_NAME" \
        --key-type rsa \
        --key-format pem \
        --query 'KeyMaterial' \
        --output text > "${KEY_NAME}.pem"
    
    chmod 400 "${KEY_NAME}.pem"
    echo "   ✅ Key pair created and saved to: ${KEY_NAME}.pem"
else
    echo "   ✅ Using existing key pair: $KEY_NAME"
    echo "   ⚠️  Note: Private key file must already exist locally"
fi

# Step 2: Create Security Group via CloudFormation
echo ""
echo "2️⃣  Creating Security Group via CloudFormation..."

# Check if stack already exists
if aws cloudformation describe-stacks --stack-name "$STACK_NAME" &>/dev/null; then
    STACK_STATUS=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --query 'Stacks[0].StackStatus' --output text)
    echo "   Stack '$STACK_NAME' already exists with status: $STACK_STATUS"
    
    if [[ "$STACK_STATUS" == *"FAILED"* ]] || [[ "$STACK_STATUS" == "ROLLBACK_COMPLETE" ]]; then
        echo "   Deleting failed stack..."
        aws cloudformation delete-stack --stack-name "$STACK_NAME"
        echo "   Waiting for deletion..."
        aws cloudformation wait stack-delete-complete --stack-name "$STACK_NAME" 2>/dev/null || true
        echo "   ✓ Failed stack deleted"
    elif [[ "$STACK_STATUS" == "CREATE_COMPLETE" ]] || [[ "$STACK_STATUS" == "UPDATE_COMPLETE" ]]; then
        echo "   ✅ Stack already exists and is healthy"
        SG_ID=$(aws cloudformation describe-stacks \
            --stack-name "$STACK_NAME" \
            --query 'Stacks[0].Outputs[?OutputKey==`SecurityGroupId`].OutputValue' \
            --output text)
        echo ""
        echo "╔════════════════════════════════════════════════╗"
        echo "║              ✅  ALREADY SET UP!               ║"
        echo "╚════════════════════════════════════════════════╝"
        echo ""
        echo "Resources:"
        echo "  • Key Pair: $KEY_NAME"
        echo "  • Security Group: $SG_NAME (ID: $SG_ID)"
        echo ""
        exit 0
    fi
fi

# Create the stack
echo "   Creating CloudFormation stack..."
aws cloudformation create-stack \
    --stack-name "$STACK_NAME" \
    --template-body file://"$TEMPLATE_FILE" \
    --parameters \
        ParameterKey=Environment,ParameterValue=sandbox \
        ParameterKey=SecurityGroupName,ParameterValue="$SG_NAME"

echo "   ✓ Stack creation initiated"

# Wait for completion
echo ""
echo "3️⃣  Waiting for stack creation to complete..."
if aws cloudformation wait stack-create-complete --stack-name "$STACK_NAME" 2>&1; then
    echo "   ✅ Stack created successfully!"
else
    echo "   ❌ Stack creation failed!"
    echo ""
    echo "Checking stack events for errors..."
    aws cloudformation describe-stack-events \
        --stack-name "$STACK_NAME" \
        --max-items 5 \
        --query 'StackEvents[?ResourceStatus==`CREATE_FAILED`].[ResourceType,ResourceStatusReason]' \
        --output table
    exit 1
fi

# Get outputs
echo ""
echo "4️⃣  Retrieving resource information..."
SG_ID=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --query 'Stacks[0].Outputs[?OutputKey==`SecurityGroupId`].OutputValue' \
    --output text)

echo "   Security Group ID: $SG_ID"

# Success summary
echo ""
echo "╔════════════════════════════════════════════════╗"
echo "║              🎉  SUCCESS!  🎉                  ║"
echo "╚════════════════════════════════════════════════╝"
echo ""
echo "Your EC2 sandbox environment is ready!"
echo ""
echo "Resources created:"
echo "  • CloudFormation Stack: $STACK_NAME"
echo "  • Key Pair: $KEY_NAME (${KEY_NAME}.pem)"
echo "  • Security Group: $SG_NAME (ID: $SG_ID)"
echo ""
echo "Next steps:"
echo ""
echo "1. Launch an EC2 instance:"
echo "   aws ec2 run-instances \\"
echo "     --image-id ami-0c55b159cbfafe1f0 \\"
echo "     --instance-type t2.micro \\"
echo "     --key-name $KEY_NAME \\"
echo "     --security-group-ids $SG_ID \\"
echo "     --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=MyWebServer}]'"
echo ""
echo "2. SSH into your instance:"
echo "   ssh -i ${KEY_NAME}.pem ec2-user@<INSTANCE_PUBLIC_IP>"
echo ""
echo "3. Clean up when done:"
echo "   # Terminate instances first, then:"
echo "   aws cloudformation delete-stack --stack-name $STACK_NAME"
echo "   aws ec2 delete-key-pair --key-name $KEY_NAME"
echo ""
