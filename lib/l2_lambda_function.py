import json
import urllib.parse
import boto3
import sys
import os

print('Loading function')

client = boto3.client('elbv2')
def lambda_handler(event, context):
    l2target2_arn = os.environ['L2TARGET2_ARN']
    listener2_arn = os.environ['LISTENER2_ARN']
    response = client.modify_listener(
        DefaultActions=[
             {
                 'TargetGroupArn': l2target2_arn,
                 'Type': 'forward',
             },
         ],
         ListenerArn=listener2_arn,
     )