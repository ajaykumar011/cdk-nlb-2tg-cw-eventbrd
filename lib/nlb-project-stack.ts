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
     //Instance3
     const instance3 = new ec2.Instance(this, 'Instanceid3', {
      vpc: vpc, 
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.BURSTABLE2, 
                              ec2.InstanceSize.MICRO), 
                              machineImage: windows_ami, 
                              allowAllOutbound: true,
                              securityGroup: ec2_security_group,
                              userData: ec2.UserData.custom(user_data), 
                              keyName: key_name});  
      //Instance4
      const instance4 = new ec2.Instance(this, 'Instanceid4', {
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
    const instance3_id=instance3.instanceId;
    const instance4_id=instance4.instanceId;

    const l1target1 = new elbv2.NetworkTargetGroup(this, "L1Primary", {
                                    vpc : vpc, 
                                    port:80, 
                                    targets: [new elbtarget.InstanceIdTarget(instance1_id, 80)],
                                    targetGroupName: "L1Primary"});
    const l1target2 = new elbv2.NetworkTargetGroup(this, "L1Secondary", {
                                    vpc : vpc, 
                                    port:80, 
                                    targets: [new elbtarget.InstanceIdTarget(instance2_id, 80)],
                                    targetGroupName: "L1Secondary"});     
    const listener1 = nlb.addListener("Listener1", {
                            port: 443, defaultTargetGroups:[l1target1]});

    const l2target1 = new elbv2.NetworkTargetGroup(this, "L2Primary", {
                                    vpc : vpc, 
                                    port:80, 
                                    targets: [new elbtarget.InstanceIdTarget(instance3_id, 80)],
                                    targetGroupName: "L2Primary"});
    const l2target2 = new elbv2.NetworkTargetGroup(this, "L2Secondary", {
                                     vpc : vpc, 
                                     port:80, 
                                     targets: [new elbtarget.InstanceIdTarget(instance4_id, 80)],
                                     targetGroupName: "L2Secondary"});     
    const listener2 = nlb.addListener("Listener2", {
                      port: 8080, defaultTargetGroups:[l2target1]});


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
    const funcPath1 = `${__dirname}/l1_lambda_function.py`;
    const funcPath2 = `${__dirname}/l2_lambda_function.py`;

    const lambdaFunction1 = new lambda.Function(this, 'lambdafuncid1', { 
      functionName: 'listener1_modify_function',
      description: "A function which changes the target_group of listner1",
      code: new lambda.InlineCode(readFileSync(funcPath1, { encoding: 'utf-8', })),
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
          "L1TARGET1_ARN": l1target1.targetGroupArn,
          "L1TARGET2_ARN": l1target2.targetGroupArn,
          "LISTENER1_ARN": listener1.listenerArn,
      }
    });
    const lambdaFunction2 = new lambda.Function(this, 'lambdafuncid2', { 
      functionName: 'listener2_modify_function',
      description: "A function which changes the target_group of listener2",
      code: new lambda.InlineCode(readFileSync(funcPath2, { encoding: 'utf-8', })),
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
          "L2TARGET1_ARN": l2target1.targetGroupArn,
          "L2TARGET2_ARN": l2target2.targetGroupArn,
          "LISTENER2_ARN": listener2.listenerArn,
      }
    });

   //Cloudwatch Events Bus
    const event_bus = this.node.tryGetContext('project')['event_bus'];
    const defaultbus = EventBus.fromEventBusArn(this, "defaultid", event_bus);
  //Rule1
    const rule1 = new ruleCdk.Rule(this, "newRule1", {
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
    rule1.addTarget(new targets.LambdaFunction(lambdaFunction1));
    //Rule2
    const rule2 = new ruleCdk.Rule(this, "newRule2", {
       description: "Trigger Lamba when Instance3 goes down",
       eventPattern: {
         'source': ["aws.ec2"],
         'detail-type' : ["EC2 Instance State-change Notification"],
         'detail': {
           "state": ["stopping", "shutting-down"],
           "instance-id": [instance3_id],
         }},
       eventBus: defaultbus
     });   
     rule2.addTarget(new targets.LambdaFunction(lambdaFunction2));

  }
}
