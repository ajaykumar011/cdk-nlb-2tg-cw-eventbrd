import * as cdk from '@aws-cdk/core';
import ec2 = require('@aws-cdk/aws-ec2');
import elbv2 = require('@aws-cdk/aws-elasticloadbalancingv2');
import elbtarget = require('@aws-cdk/aws-elasticloadbalancingv2-targets');
//import s3asset = require('@aws-cdk/aws-s3-assets');
//import * as path from 'path';
import * as lambda from '@aws-cdk/aws-lambda';
import { readFileSync } from 'fs';
//const busCdk = require('@aws-cdk/aws-events');
const ruleCdk = require('@aws-cdk/aws-events');
const targets = require('@aws-cdk/aws-events-targets');
import {Role, ServicePrincipal, ManagedPolicy} from '@aws-cdk/aws-iam';
import { EventBus } from '@aws-cdk/aws-events';

export class NlbProjectStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, 'VPC', {
      maxAzs: 2,
      cidr: "10.10.0.0/16",
      subnetConfiguration: [
         {
           cidrMask: 24,
           name: 'ingress',
           subnetType: ec2.SubnetType.PUBLIC,
         },
         {
           cidrMask: 28,
           name: 'rds',
           subnetType: ec2.SubnetType.ISOLATED,
         }
      ],
      natGateways: 0,  
   });
   new cdk.CfnOutput(this, "VPCID", {value: vpc.vpcId});
     
    //EC2 SG
    const ec2_security_group = new ec2.SecurityGroup(this, "SecurityGroup", {
      vpc: vpc,
      description: "Allow RDP acces to ec2",
      allowAllOutbound:true
    });
    ec2_security_group.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(3389), "allow RDP access from the world")
    ec2_security_group.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80), "Allow port 80")

    const key_name = this.node.tryGetContext('project')['key_name'];
    const user_data = readFileSync('./userdata.ps1', 'utf-8');       
    const windows_ami = ec2.MachineImage.latestWindows(ec2.WindowsVersion.WINDOWS_SERVER_2019_ENGLISH_FULL_BASE);
    //Instance1
    const instance1 = new ec2.Instance(this, 'Instanceid1', {
                                          vpc: vpc, 
                                          instanceType: ec2.InstanceType.of(ec2.InstanceClass.BURSTABLE2, 
                            ec2.InstanceSize.MICRO), 
                            machineImage: windows_ami, 
                            allowAllOutbound: true,
                            securityGroup: ec2_security_group,
                            userData: ec2.UserData.custom(user_data), 
                            keyName: key_name});
    //Instance2
    const instance2 = new ec2.Instance(this, 'Instanceid2', {
      vpc: vpc, 
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.BURSTABLE2, 
                              ec2.InstanceSize.MICRO), 
                              machineImage: windows_ami, 
                              allowAllOutbound: true,
                              securityGroup: ec2_security_group,
                              userData: ec2.UserData.custom(user_data), 
                              keyName: key_name});
    //Network Load Balancer
    const nlb_name = this.node.tryGetContext('project')['nlb_name'];
    const nlb =  new elbv2.NetworkLoadBalancer(this, "myNLB", {
      vpc : vpc,
      internetFacing: true,
      loadBalancerName: nlb_name
    });
    const instance1_id=instance1.instanceId;
    const instance2_id=instance2.instanceId;

    const target1 = new elbv2.NetworkTargetGroup(this, "TGroup1", {
                                    vpc : vpc, 
                                    port:80, 
                                    targets: [new elbtarget.InstanceIdTarget(instance1_id, 80)],
                                    targetGroupName: "PrimaryTg1"});
    const target2 = new elbv2.NetworkTargetGroup(this, "TGroup2", {
                                    vpc : vpc, 
                                    port:80, 
                                    targets: [new elbtarget.InstanceIdTarget(instance2_id, 80)],
                                    targetGroupName: "SecondaryTg2"});     
    const listener1 = nlb.addListener("Listener1", {
                            port: 443, defaultTargetGroups:[target1]});
    new cdk.CfnOutput(this, "ElbDomain", {value: nlb.loadBalancerDnsName});

    //Lambda Role
    const myRole = new Role(this, "MyRole", {
      assumedBy: new ServicePrincipal("lambda.amazonaws.com"),
      managedPolicies: [
        ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
        ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaVPCAccessExecutionRole')
      ]});
    myRole.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('AmazonEC2FullAccess'));
   
    //Lambda Function
    const srcPath = `${__dirname}/lambda_function.py`;

    const lambdaFunction = new lambda.Function(this, 'lambdafuncid', { 
      functionName: 'listener_modify_function',
      description: "A function which changes the target_group",
      code: new lambda.InlineCode(readFileSync(srcPath, { encoding: 'utf-8', })),
      handler: 'index.lambda_handler',
      timeout: cdk.Duration.seconds(30),
      memorySize: 128,
      runtime: lambda.Runtime.PYTHON_3_7,
      reservedConcurrentExecutions: 1,
      retryAttempts: 1,
      maxEventAge: cdk.Duration.hours(1),
      role: myRole, 
      environment: {
          "LOG_LEVEL": "INFO",
          "TARGET1_ARN": target1.targetGroupArn,
          "TARGET2_ARN": target2.targetGroupArn,
          "LISTENER_ARN": listener1.listenerArn,
          "NLB_ARN": nlb.loadBalancerArn
      }
    });

    //Cloudwatch Events Rule
    const event_bus = this.node.tryGetContext('project')['event_bus'];
    const defaultbus = EventBus.fromEventBusArn(this, "defaultid", event_bus);
    const rule = new ruleCdk.Rule(this, "newRule", {
      description: "Trigger Lamba when Instance1 goes down",
      eventPattern: {
        'source': ["aws.ec2"],
        'detail-type' : ["EC2 Instance State-change Notification"],
        'detail': {
          "state": ["stopping", "shutting-down"],
          "instance-id": [instance1_id],
        }},
      eventBus: defaultbus
    });   
    rule.addTarget(new targets.LambdaFunction(lambdaFunction));
  }
}
