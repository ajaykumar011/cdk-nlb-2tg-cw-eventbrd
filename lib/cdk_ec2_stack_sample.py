from aws_cdk import core
import aws_cdk.aws_ec2 as ec2
import aws_cdk.aws_elasticloadbalancingv2 as elb
import aws_cdk.aws_autoscaling as autoscaling
import aws_cdk.aws_certificatemanager as acm
import aws_cdk.aws_route53 as route53
import aws_cdk.aws_elasticloadbalancingv2_targets as elbtarget
from aws_cdk import aws_lambda as _lambda

class CdkEc2Stack(core.Stack):

    def __init__(self, scope: core.Construct, id: str, vpc, **kwargs) -> None:
        super().__init__(scope, id, **kwargs)
        arn = (self.node.try_get_context('project')['cert_arn'])  #arn
        #ec2_type = (self.node.try_get_context('project')['ec2_type']) #ec2_type
        key_name = (self.node.try_get_context('project')['key_name']) #key_name 

        certificate = acm.Certificate.from_certificate_arn(self, "Certificate", arn)

        #Windows AMI       
        windows_ami = ec2.MachineImage.latest_windows(ec2.WindowsVersion.WINDOWS_SERVER_2019_ENGLISH_FULL_BASE)
      
        #Reading Userdata from file to install IIS from userdata.ps1
        with open("./user_data/user_data.ps1") as f:
            user_data = f.read()
        
        #EC2 SG
        ec2_security_group = ec2.SecurityGroup(self, "SecurityGroup",
            vpc=vpc,
            description="Allow RDP access to ec2 instances",
            allow_all_outbound=True
        )
        ec2_security_group.add_ingress_rule(ec2.Peer.any_ipv4(), ec2.Port.tcp(3389), "allow RDP access from the world")
        ec2_security_group.add_ingress_rule(ec2.Peer.any_ipv4(), ec2.Port.tcp(80), "Allow port 80")

        # Create Instance
        instance1_id = ec2.Instance(self, "Instanceid1", instance_type=ec2.InstanceType.of(ec2.InstanceClass.BURSTABLE2, 
                                ec2.InstanceSize.MICRO), machine_image=windows_ami, 
                                vpc=vpc, allow_all_outbound=True ,security_group=ec2_security_group, 
                                user_data=ec2.UserData.custom(user_data), key_name=key_name).instance_id
        instance2_id = ec2.Instance(self, "Instanceid2", instance_type=ec2.InstanceType.of(ec2.InstanceClass.BURSTABLE2, 
                                ec2.InstanceSize.MICRO), machine_image=windows_ami, 
                                vpc=vpc, allow_all_outbound=True ,security_group=ec2_security_group, 
                                user_data=ec2.UserData.custom(user_data), key_name=key_name).instance_id

        #Create NLB
        nlb =  elb.NetworkLoadBalancer(self, "myNLB", vpc=vpc, internet_facing=True, load_balancer_name="Demo" )

       
        #listener1.add_targets('ec2_instance', port=80, targets=[elbtarget.InstanceIdTarget(instance_id=instance1_id, port=80)])

        target1 = elb.NetworkTargetGroup(self, "TGroup1", vpc=vpc, port=80, targets=[elbtarget.InstanceIdTarget(instance_id=instance1_id, port=80)], target_group_name="MyTg1")
        target2 = elb.NetworkTargetGroup(self, "TGroup2", vpc=vpc, port=80, targets=[elbtarget.InstanceIdTarget(instance_id=instance2_id, port=80)], target_group_name="MyTg2")
        
        listener1 = nlb.add_listener("Listener1", port=443, default_target_groups=[target1])
        #listener1.add_targets('ec2_instance', port=80, target_group_name=target1.target_group_arn)

        
        
        #Lambda code starts here


        # Read Lambda Code
        try:
            with open("lambda_fn/tgchange.py", mode="r") as f:
                tg_group_processor_fn_code = f.read()
        except OSError:
            print("Unable to read Lambda Function Code")

        # Deploy the lambda function
        tg_group_processor_fn = _lambda.Function(
            self,
            "TargetgroupProcessorFn",
            function_name="tg_group_processor_fn",
            description="Change the Target group when NLB Failes",
            runtime=_lambda.Runtime.PYTHON_3_7,
            
            handler="index.lambda_handler",
            code=_lambda.InlineCode(
                tg_group_processor_fn_code
            ),
            timeout=core.Duration.seconds(10),
            reserved_concurrent_executions=1,
            environment={
                "LOG_LEVEL": "INFO",
                "target_arn": target1.target_group_arn,
                "listener_arn": listener1.listener_arn
            }
        )
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        #Output
        core.CfnOutput(self, "ALB-DNSName", value=nlb.load_balancer_dns_name)




