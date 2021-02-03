import json
import urllib.parse
import boto3
import sys
import os

print('Loading function')

client = boto3.client('elbv2')
def lambda_handler(event, context):
    #print("Received event: " + json.dumps(event, indent=2))
    target1_arn = os.environ['TARGET1_ARN']
    target2_arn = os.environ['TARGET2_ARN']
    listener_arn = os.environ['LISTENER_ARN']
    nlb_arn = os.environ['NLB_ARN']
    print (target1_arn)
    print (target2_arn)
    print (listener_arn)
    response = client.modify_listener(
        DefaultActions=[
             {
                 'TargetGroupArn': target2_arn,
                 'Type': 'forward',
             },
         ],
         ListenerArn=listener_arn,
     )