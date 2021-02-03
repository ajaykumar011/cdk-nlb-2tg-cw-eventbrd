import * as cdk from '@aws-cdk/core';
// import autoscaling = require('@aws-cdk/aws-autoscaling');
import ec2 = require('@aws-cdk/aws-ec2');
import elbv2 = require('@aws-cdk/aws-elasticloadbalancingv2');
import elbtarget = require('@aws-cdk/aws-elasticloadbalancingv2-targets');
//import { Instance, Port } from '@aws-cdk/aws-ec2';
import s3asset = require('@aws-cdk/aws-s3-assets');
import * as path from 'path';
import * as lambda from '@aws-cdk/aws-lambda';
import { readFileSync } from 'fs';
import { eventNames } from 'process';
const busCdk = require('@aws-cdk/aws-events');
const ruleCdk = require('@aws-cdk/aws-events');
const targets = require('@aws-cdk/aws-events-targets');
import {Role, ServicePrincipal, ManagedPolicy} from '@aws-cdk/aws-iam';

export class NlbProjectStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // The code that defines your stack goes here
    //const vpc = new ec2.Vpc(this, 'VPC');
    //const vpc = new ec2.Vpc(this, 'VPC', { maxAzs: 2, natGateways: 0 });

    const vpc = new ec2.Vpc(this, 'VPC', {
      maxAzs: 2,
      cidr: "10.10.0.0/16",
      subnetConfiguration: [
         {
           cidrMask: 24,
           name: 'ingress',
           subnetType: ec2.SubnetType.PUBLIC,
         },
        //  {
        //    cidrMask: 24,
        //    name: 'application',
        //    subnetType: ec2.SubnetType.PRIVATE,
        //  },
         {
           cidrMask: 28,
           name: 'rds',
           subnetType: ec2.SubnetType.ISOLATED,
         }
      ],
      natGateways: 0,  //If you do not want NAT gateways (natGateways=0), make sure you don't configure any PRIVATE subnets in 'subnetConfiguration' (make them PUBLIC or ISOLATED instead)
   });
   new cdk.CfnOutput(this, "VPCID", {value: vpc.vpcId});
   new cdk.CfnOutput(this, "VPCCIDR", {value: vpc.vpcCidrBlock});
   


    //EC2 SG
    const ec2_security_group = new ec2.SecurityGroup(this, "SecurityGroup", {
      vpc: vpc,
      description: "Allow RDP acces to ec2",
      allowAllOutbound:true
    });

    ec2_security_group.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(3389), "allow RDP access from the world")
    ec2_security_group.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80), "Allow port 80")

    const key_name = "ajay_key"
    //const asset = new s3asset.Asset(this, 'Asset', {path: path.join(__dirname, 'userdata.ps1')});


    // const asg = new autoscaling.AutoScalingGroup(this, 'ASG', {
    //   vpc,
    //   instanceType: ec2.InstanceType.of(ec2.InstanceClass.T2, ec2.InstanceSize.MICRO),
    //   machineImage: new ec2.AmazonLinuxImage(),
    // });
    //Create Instance
    //Userdata

    

    const user_data = readFileSync('./userdata.ps1', 'utf-8');
    
    //Windows AMI       
    const windows_ami = ec2.MachineImage.latestWindows(ec2.WindowsVersion.WINDOWS_SERVER_2019_ENGLISH_FULL_BASE);
    const instance1 = new ec2.Instance(this, 'Instanceid1', {
                                          vpc: vpc, 
                                          instanceType: ec2.InstanceType.of(ec2.InstanceClass.BURSTABLE2, 
                            ec2.InstanceSize.MICRO), 
                            machineImage: windows_ami, 
                            allowAllOutbound: true,
                            securityGroup: ec2_security_group,
                            userData: ec2.UserData.custom(user_data), 
                            keyName: key_name});
      // const localPath = instance1.userData.addS3DownloadCommand({
      //                         bucket:asset.bucket,
      //                         bucketKey:asset.s3ObjectKey,
      //                       });
      // instance1.userData.addExecuteFileCommand({
      //                         filePath:localPath,
      //                         arguments: '--verbose -y'
      //                       });
      // asset.grantRead( instance1.role );

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
      // const localPath2 = instance2.userData.addS3DownloadCommand({
      //                         bucket:asset.bucket,
      //                         bucketKey:asset.s3ObjectKey,
      //                         });
      // instance2.userData.addExecuteFileCommand({
      //                         filePath:localPath2,
      //                         arguments: '--verbose -y'
      //                         });
      // asset.grantRead( instance2.role );
    //Create NLB
    const nlb =  new elbv2.NetworkLoadBalancer(this, "myNLB", {
      vpc : vpc,
      internetFacing: true,
      loadBalancerName: 'DemoLB'
    });
    const instance1_id=instance1.instanceId;
    const instance2_id=instance2.instanceId;

    const target1 = new elbv2.NetworkTargetGroup(this, "TGroup1", {
                                    vpc : vpc, 
                                    port:80, 
                                    targets: [new elbtarget.InstanceIdTarget(instance1_id, 80)],
                                    targetGroupName: "MyTg1"});
    const target2 = new elbv2.NetworkTargetGroup(this, "TGroup2", {
                                      vpc : vpc, 
                                      port:80, 
                                      targets: [new elbtarget.InstanceIdTarget(instance2_id, 80)],
                                      targetGroupName: "MyTg2"});

    //target2 = elb.NetworkTargetGroup(self, "TGroup2", vpc=vpc, port=80, targets=[elbtarget.InstanceIdTarget(instance_id=instance2_id, port=80)], target_group_name="MyTg2")
    
    const listener1 = nlb.addListener("Listener1", {
                            port: 443, defaultTargetGroups:[target1]});
    new cdk.CfnOutput(this, "ElbDomain", {value: nlb.loadBalancerDnsName});

    //Lambda Role
    const myRole = new Role(this, "MyRole", {
      assumedBy: new ServicePrincipal("lambda.amazonaws.com"),
      managedPolicies: [
        ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
        ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaVPCAccessExecutionRole')
      ]
    });

    myRole.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('AmazonEC2FullAccess'));
  

    //Lambda
    const srcPath = `${__dirname}/lambda_function.py`;

    const lambdaFunction = new lambda.Function(this, 'lambdafuncid', { 
      functionName: 'listener_modify_function',
      description: "A function which changes the target_group",
      code: new lambda.InlineCode(readFileSync(srcPath, { encoding: 'utf-8', })),
      handler: 'index.lambda_handler',
      //handler: 'lambda_function.lambda_handler',
      timeout: cdk.Duration.seconds(60),
      memorySize: 128,
      runtime: lambda.Runtime.PYTHON_3_7,
      reservedConcurrentExecutions: 1,
      retryAttempts: 1,
      maxEventAge: cdk.Duration.hours(1),
      vpc: vpc,
      role: myRole, // user-provided role
      environment: {
          "LOG_LEVEL": "INFO",
          "TARGET1_ARN": target1.targetGroupArn,
          "TARGET2_ARN": target2.targetGroupArn,
          "LISTENER_ARN": listener1.listenerArn,
          "NLB_ARN": nlb.loadBalancerArn
      }
    });
    //lambdaFunction.connections.allowDefaultPortFromAnyIpv4
    lambdaFunction.connections.allowFromAnyIpv4;

    //event bus
    const bus = new busCdk.EventBus(this,'ProfileEventBus',{
      eventBusName: "ProfileBus"
      
    })

    const rule = new ruleCdk.Rule(this, "newRule", {
      description: "description",
      eventPattern: {
        source: ["aws.ec2"]
      },
      eventBus: bus
    });

    //const func = lambda.Function.fromFunctionArn(this, 'testLambda', 'arn:aws:lambda:us-east-1:304962413949:function:helloworld')
    rule.addTarget(new targets.LambdaFunction(lambdaFunction));

  }
}
