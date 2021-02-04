import json
import urllib.parse
import boto3
import sys
import os

print('Loading function')

client = boto3.client('elbv2')
def lambda_handler(event, context):
    l1target2_arn = os.environ['L1TARGET2_ARN']
    listener1_arn = os.environ['LISTENER1_ARN']
    response = client.modify_listener(
        DefaultActions=[
             {
                 'TargetGroupArn': l1target2_arn,
                 'Type': 'forward',
             },
         ],
         ListenerArn=listener1_arn,
     )