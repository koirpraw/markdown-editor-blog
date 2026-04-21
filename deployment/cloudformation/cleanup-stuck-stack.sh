#!/bin/bash
# Script to clean up a stuck CloudFormation stack
# Usage: ./cleanup-stuck-stack.sh <stack-name>

STACK_NAME="${1:-ec2-sandbox-setup}"

echo "=== CloudFormation Stack Cleanup Script ==="
echo "Stack: $STACK_NAME"
echo ""

# Check current status
echo "1. Checking stack status..."
STATUS=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query 'Stacks[0].StackStatus' --output text 2>&1)

if [[ $STATUS == *"does not exist"* ]]; then
    echo "✅ Stack does not exist. Nothing to clean up."
    exit 0
fi

echo "   Current status: $STATUS"

# Try to delete with resource retention if stuck
if [[ $STATUS == "DELETE_FAILED" ]] || [[ $STATUS == "ROLLBACK_FAILED" ]]; then
    echo ""
    echo "2. Stack is stuck in $STATUS state. Attempting force delete with resource retention..."
    
    # Get list of resources in the stack
    RESOURCES=$(aws cloudformation list-stack-resources --stack-name $STACK_NAME --query 'StackResourceSummaries[].LogicalResourceId' --output text 2>&1)
    
    if [[ ! -z "$RESOURCES" ]]; then
        echo "   Retaining resources: $RESOURCES"
        aws cloudformation delete-stack --stack-name $STACK_NAME --retain-resources $RESOURCES
    else
        echo "   No resources to retain. Trying standard delete..."
        aws cloudformation delete-stack --stack-name $STACK_NAME
    fi
    
    echo "   Waiting 15 seconds..."
    sleep 15
    
    # Check if deleted
    aws cloudformation describe-stacks --stack-name $STACK_NAME 2>&1 | grep -q "does not exist"
    if [ $? -eq 0 ]; then
        echo "✅ Stack deleted successfully!"
        exit 0
    else
        NEW_STATUS=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query 'Stacks[0].StackStatus' --output text 2>&1)
        echo "⚠️  Stack still exists with status: $NEW_STATUS"
        echo ""
        echo "Manual steps required:"
        echo "1. Go to AWS CloudFormation Console"
        echo "2. Select the stack: $STACK_NAME"
        echo "3. Click 'Delete' and check 'Retain resources'"
        echo "4. Or use AWS CLI: aws cloudformation delete-stack --stack-name $STACK_NAME --region YOUR_REGION"
        exit 1
    fi
else
    echo ""
    echo "2. Attempting normal stack deletion..."
    aws cloudformation delete-stack --stack-name $STACK_NAME
    
    echo "   Waiting for deletion to complete (this may take a few minutes)..."
    aws cloudformation wait stack-delete-complete --stack-name $STACK_NAME 2>&1
    
    if [ $? -eq 0 ]; then
        echo "✅ Stack deleted successfully!"
    else
        echo "⚠️  Stack deletion may have failed. Check the AWS console for details."
    fi
fi
