#!/bin/bash
# EC2 Sandbox Setup - Using CloudFormation with Retain Policy for KeyPair
# This version creates both KeyPair and SG via CloudFormation but won't delete the KeyPair

set -e

STACK_NAME="ec2-sandbox-keypair"
KEY_NAME="sandbox-key"
SG_NAME="WebServer-SG"
TEMPLATE_FILE="ec2-sandbox-with-keypair.yaml"

echo "╔════════════════════════════════════════════════╗"
echo "║   EC2 Sandbox Setup (KeyPair with Retain)     ║"
echo "╚════════════════════════════════════════════════╝"
echo ""

# Check if template exists
if [ ! -f "$TEMPLATE_FILE" ]; then
    echo "❌ Error: Template file '$TEMPLATE_FILE' not found!"
    exit 1
fi

# Check for existing resources
echo "1️⃣  Checking for existing resources..."

if aws ec2 describe-key-pairs --key-names "$KEY_NAME" &>/dev/null; then
    echo "⚠️   Key pair '$KEY_NAME' already exists!"
    read -p "   Delete it and continue? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        aws ec2 delete-key-pair --key-name "$KEY_NAME"
        echo "   ✓ Deleted existing key pair"
    else
        echo "   ⛔ Aborted. Please delete the key pair manually or use a different name."
        exit 1
    fi
else
    echo "   ✓ No conflicting key pair found"
fi

# Check if stack exists
if aws cloudformation describe-stacks --stack-name "$STACK_NAME" &>/dev/null; then
    STACK_STATUS=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --query 'Stacks[0].StackStatus' --output text)
    echo "   Stack exists with status: $STACK_STATUS"
    
    if [[ "$STACK_STATUS" == *"FAILED"* ]] || [[ "$STACK_STATUS" == "ROLLBACK_COMPLETE" ]]; then
        echo "   Deleting failed stack..."
        aws cloudformation delete-stack --stack-name "$STACK_NAME"
        echo "   Waiting for deletion..."
        aws cloudformation wait stack-delete-complete --stack-name "$STACK_NAME" 2>/dev/null || true
    fi
fi

# Create the stack
echo ""
echo "2️⃣  Creating CloudFormation stack..."
aws cloudformation create-stack \
    --stack-name "$STACK_NAME" \
    --template-body file://"$TEMPLATE_FILE" \
    --parameters \
        ParameterKey=Environment,ParameterValue=sandbox \
        ParameterKey=KeyPairName,ParameterValue="$KEY_NAME" \
        ParameterKey=SecurityGroupName,ParameterValue="$SG_NAME"

echo "   ✓ Stack creation initiated"

# Wait for completion
echo ""
echo "3️⃣  Waiting for stack creation to complete..."
if aws cloudformation wait stack-create-complete --stack-name "$STACK_NAME" 2>&1; then
    echo "   ✅ Stack created successfully!"
else
    echo "   ❌ Stack creation failed!"
    aws cloudformation describe-stack-events \
        --stack-name "$STACK_NAME" \
        --max-items 10 \
        --query 'StackEvents[?ResourceStatus==`CREATE_FAILED`].[Timestamp,ResourceType,ResourceStatusReason]' \
        --output table
    exit 1
fi

# Get outputs
echo ""
echo "4️⃣  Retrieving stack outputs..."
KEY_PAIR_ID=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --query 'Stacks[0].Outputs[?OutputKey==`KeyPairId`].OutputValue' \
    --output text)

SG_ID=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --query 'Stacks[0].Outputs[?OutputKey==`SecurityGroupId`].OutputValue' \
    --output text)

echo "   Key Pair ID: $KEY_PAIR_ID"
echo "   Security Group ID: $SG_ID"

# Download private key
echo ""
echo "5️⃣  Downloading private key from Parameter Store..."
aws ssm get-parameter \
    --name "/ec2/keypair/${KEY_PAIR_ID}" \
    --with-decryption \
    --query Parameter.Value \
    --output text > "${KEY_NAME}.pem"

chmod 400 "${KEY_NAME}.pem"
echo "   ✓ Private key saved to: ${KEY_NAME}.pem"

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
echo "⚠️  IMPORTANT NOTE:"
echo "   The KeyPair has DeletionPolicy: Retain"
echo "   When you delete the stack, you must manually delete the key pair:"
echo "   aws ec2 delete-key-pair --key-name $KEY_NAME"
echo ""
echo "Launch an EC2 instance:"
echo "  aws ec2 run-instances \\"
echo "    --image-id ami-0c55b159cbfafe1f0 \\"
echo "    --instance-type t2.micro \\"
echo "    --key-name $KEY_NAME \\"
echo "    --security-group-ids $SG_ID \\"
echo "    --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=MyWebServer}]'"
echo ""
