import json
import urllib.parse
import boto3
import sys
import os

print('Loading function')

client = boto3.client('elbv2')
#target_arn='arn:aws:elasticloadbalancing:us-east-1:143787628822:targetgroup/MyTg2/3713c21f72e5cae1'
#listener_arn='arn:aws:elasticloadbalancing:us-east-1:143787628822:listener/net/Demo/221b0b3eb7587506/ef6d6f7ecb4a70fc'


#  # Get the object from the event and show its content type
#     bucket = event['Records'][0]['s3']['bucket']['name']
#     key = urllib.parse.unquote_plus(event['Records'][0]['s3']['object']['key'], encoding='utf-8')
#     try:
#         response = s3.get_object(Bucket=bucket, Key=key)
#         print("CONTENT TYPE: " + response['ContentType'])
#         return response['ContentType']
#     except Exception as e:
#         print(e)
#         print('Error getting object {} from bucket {}. Make sure they exist and your bucket is in the same region as this function.'.format(key, bucket))
#         raise e

def lambda_handler(event, context):
    #print("Received event: " + json.dumps(event, indent=2))
    target1_arn = os.environ['TARGET1_ARN']
    target2_arn = os.environ['TARGET2_ARN']
    listener_arn = os.environ['LISTENER_ARN']
    nlb_arn = os.environ['NLB_ARN']
    # print (target1_arn)
    # print (target2_arn)
    # print (listener_arn)
    try:
        response1 = client.describe_listeners(
        LoadBalancerArn=nlb_arn,
        ListenerArns=[listener_arn])
        print(response1)
        response2 = client.describe_target_groups(
        LoadBalancerArn=nlb_arn,
        TargetGroupArns=[
            target1_arn,
            target2_arn
        ])
        print(response2)
    except Exception as e:
        print(e)
        print('Error getting Resource from Load Balancer {}.'.format(nlb_arn))
        raise e
    # response = client.modify_listener(
    #     DefaultActions=[
    #         {
    #             'TargetGroupArn': target2_arn,
    #             'Type': 'forward',
    #         },
    #     ],
    #     ListenerArn=listener_arn,
    # )
    #return None